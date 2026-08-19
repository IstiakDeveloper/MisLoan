<?php

namespace App\Http\Controllers;

use App\Models\MemberAdmission;
use App\Models\MemberAdmissionIssue;
use App\Models\LoanApplication;
use App\Models\LoanApplicationIssue;
use App\Models\Branch;
use App\Models\User;
use App\Models\Role;
use App\Services\ApprovalService;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class HeadOfficeVerificationController extends Controller
{
    use Concerns\ScopesToAccessibleBranches;
    use Concerns\ResolvesListPerPage;

    /**
     * Display Verification list (Admissions & Loans with inquiries/issues)
     * Accessible to Branch Users, Approvers, and Head Office
     */
    public function index(Request $request)
    {
        $authUser = auth()->user();
        $authUser->loadMissing('role');
        $roleName = strtolower($authUser->role->name ?? '');

        $isBranchOrApprover = in_array($roleName, ['branch_user', 'branch_manager', 'field_officer', 'area_manager', 'zone_manager', 'admf', 'dmf'], true);
        $today = now()->toDateString();
        $dateFrom = $request->has('date_from') ? $request->input('date_from') : ($isBranchOrApprover ? null : $today);
        $dateTo = $request->has('date_to') ? $request->input('date_to') : ($isBranchOrApprover ? null : $today);
        $startOfDay = $dateFrom ? Carbon::parse($dateFrom)->startOfDay() : null;
        $endOfDay = $dateTo ? Carbon::parse($dateTo)->endOfDay() : null;

        $search = $request->input('search');
        $type = $request->input('type', 'all'); // 'all', 'admission', 'loan'
        $issueStatus = $request->input('issue_status', 'all'); // 'all', 'pending', 'replied', 'resolved', 'approved', 'rejected'
        $zoneId = $request->input('zone_id');
        $areaId = $request->input('area_id');
        $branchId = $request->input('branch_id');

        // 1. Query Member Admissions with issues or revisions
        $admissionQuery = MemberAdmission::with([
            'branch' => fn ($q) => $q->withTrashed()->with(['area.zone']),
            'samity:id,samity_name',
            'memberCategory:id,category_name',
            'submittedBy:id,name',
            'createdBy:id,name',
            'issues' => fn ($q) => $q->with(['reporter:id,name', 'resolver:id,name'])->orderBy('created_at', 'desc'),
        ])
        ->where(function ($q) {
            $q->whereHas('issues')
              ->orWhere('revision_count', '>', 0)
              ->orWhere('status', 'needs_revision');
        });

        $this->applyAccessibleBranchScope($admissionQuery);

        if ($roleName === 'field_officer') {
            $admissionQuery->assignedToOfficer((int) $authUser->id);
        }

        // Date filter - checks latest action / submission / issue / reply / returned dates
        if ($dateFrom && $dateTo) {
            $admissionQuery->where(function ($q) use ($startOfDay, $endOfDay) {
                $q->whereBetween('submitted_at', [$startOfDay, $endOfDay])
                  ->orWhereBetween('created_at', [$startOfDay, $endOfDay])
                  ->orWhereBetween('returned_at', [$startOfDay, $endOfDay])
                  ->orWhereBetween('reviewed_at', [$startOfDay, $endOfDay])
                  ->orWhereHas('issues', function ($iq) use ($startOfDay, $endOfDay) {
                      $iq->whereBetween('created_at', [$startOfDay, $endOfDay])
                         ->orWhereBetween('resolved_at', [$startOfDay, $endOfDay]);
                  });
            });
        } elseif ($dateFrom) {
            $admissionQuery->where(function ($q) use ($startOfDay) {
                $q->where('submitted_at', '>=', $startOfDay)
                  ->orWhere('created_at', '>=', $startOfDay)
                  ->orWhere('returned_at', '>=', $startOfDay)
                  ->orWhere('reviewed_at', '>=', $startOfDay)
                  ->orWhereHas('issues', function ($iq) use ($startOfDay) {
                      $iq->where('created_at', '>=', $startOfDay)
                         ->orWhere('resolved_at', '>=', $startOfDay);
                  });
            });
        } elseif ($dateTo) {
            $admissionQuery->where(function ($q) use ($endOfDay) {
                $q->where('submitted_at', '<=', $endOfDay)
                  ->orWhere('created_at', '<=', $endOfDay)
                  ->orWhere('returned_at', '<=', $endOfDay)
                  ->orWhere('reviewed_at', '<=', $endOfDay)
                  ->orWhereHas('issues', function ($iq) use ($endOfDay) {
                      $iq->where('created_at', '<=', $endOfDay)
                         ->orWhere('resolved_at', '<=', $endOfDay);
                  });
            });
        }

        // Branch / Area / Zone filters
        if ($zoneId) {
            $admissionQuery->whereHas('branch.area', fn ($q) => $q->where('zone_id', $zoneId));
        }
        if ($areaId) {
            $admissionQuery->whereHas('branch', fn ($q) => $q->where('area_id', $areaId));
        }
        if ($branchId) {
            $admissionQuery->where('branch_id', $branchId);
        }

        // Search filter
        if ($search) {
            $admissionQuery->where(function ($q) use ($search) {
                $q->where('application_no', 'like', "%{$search}%")
                  ->orWhere('applicant_name_en', 'like', "%{$search}%")
                  ->orWhere('applicant_name_bn', 'like', "%{$search}%")
                  ->orWhere('mobile_number', 'like', "%{$search}%")
                  ->orWhere('nid_number', 'like', "%{$search}%");
            });
        }

        // Issue status filter for Admissions
        if ($issueStatus === 'pending') {
            $admissionQuery->whereHas('issues', fn ($q) => $q->where('status', 'pending'));
        } elseif ($issueStatus === 'resolved') {
            $admissionQuery->whereDoesntHave('issues', fn ($q) => $q->where('status', 'pending'))
                           ->whereHas('issues', fn ($q) => $q->where('status', 'resolved'));
        } elseif ($issueStatus === 'replied') {
            $admissionQuery->whereHas('issues', fn ($q) => $q->whereNotNull('resolution_note'));
        } elseif ($issueStatus === 'approved') {
            $admissionQuery->where('status', 'approved');
        } elseif ($issueStatus === 'rejected') {
            $admissionQuery->where('status', 'rejected');
        }

        // 2. Query Loan Applications with issues or revisions
        $loanQuery = LoanApplication::with([
            'branch' => fn ($q) => $q->withTrashed()->with(['area.zone']),
            'samity:id,samity_name',
            'loanProduct:id,product_name,product_name_bn,product_code',
            'loanCategory:id,category_name,category_name_bn',
            'memberAdmission:id,applicant_name_en,applicant_name_bn,nid_number,mobile_number,application_no,is_legacy,loan_dofa',
            'submittedBy:id,name',
            'issues' => fn ($q) => $q->with(['reporter:id,name', 'responder:id,name'])->orderBy('created_at', 'desc'),
        ])
        ->where(function ($q) {
            $q->whereHas('issues')
              ->orWhere('status', LoanApplication::STATUS_NEEDS_CORRECTION);
        });

        $this->applyAccessibleBranchScope($loanQuery);

        if ($roleName === 'field_officer') {
            $loanQuery->where('submitted_by', $authUser->id);
        }

        // Date filter - checks latest action / submission / issue / reply dates
        if ($dateFrom && $dateTo) {
            $loanQuery->where(function ($q) use ($startOfDay, $endOfDay) {
                $q->whereBetween('submitted_at', [$startOfDay, $endOfDay])
                  ->orWhereBetween('created_at', [$startOfDay, $endOfDay])
                  ->orWhereBetween('reviewed_at', [$startOfDay, $endOfDay])
                  ->orWhereHas('issues', function ($iq) use ($startOfDay, $endOfDay) {
                      $iq->whereBetween('created_at', [$startOfDay, $endOfDay])
                         ->orWhereBetween('responded_at', [$startOfDay, $endOfDay]);
                  });
            });
        } elseif ($dateFrom) {
            $loanQuery->where(function ($q) use ($startOfDay) {
                $q->where('submitted_at', '>=', $startOfDay)
                  ->orWhere('created_at', '>=', $startOfDay)
                  ->orWhere('reviewed_at', '>=', $startOfDay)
                  ->orWhereHas('issues', function ($iq) use ($startOfDay) {
                      $iq->where('created_at', '>=', $startOfDay)
                         ->orWhere('responded_at', '>=', $startOfDay);
                  });
            });
        } elseif ($dateTo) {
            $loanQuery->where(function ($q) use ($endOfDay) {
                $q->where('submitted_at', '<=', $endOfDay)
                  ->orWhere('created_at', '<=', $endOfDay)
                  ->orWhere('reviewed_at', '<=', $endOfDay)
                  ->orWhereHas('issues', function ($iq) use ($endOfDay) {
                      $iq->where('created_at', '<=', $endOfDay)
                         ->orWhere('responded_at', '<=', $endOfDay);
                  });
            });
        }

        // Branch / Area / Zone filters
        if ($zoneId) {
            $loanQuery->whereHas('branch.area', fn ($q) => $q->where('zone_id', $zoneId));
        }
        if ($areaId) {
            $loanQuery->whereHas('branch', fn ($q) => $q->where('area_id', $areaId));
        }
        if ($branchId) {
            $loanQuery->where('branch_id', $branchId);
        }

        // Search filter
        if ($search) {
            $loanQuery->where(function ($q) use ($search) {
                $q->where('application_no', 'like', "%{$search}%")
                  ->orWhereHas('memberAdmission', function ($mq) use ($search) {
                      $mq->where('applicant_name_en', 'like', "%{$search}%")
                        ->orWhere('applicant_name_bn', 'like', "%{$search}%")
                        ->orWhere('mobile_number', 'like', "%{$search}%")
                        ->orWhere('nid_number', 'like', "%{$search}%")
                        ->orWhere('application_no', 'like', "%{$search}%");
                  });
            });
        }

        // Issue status filter for Loans
        if ($issueStatus === 'pending') {
            $loanQuery->whereHas('issues', fn ($q) => $q->where('status', 'pending'));
        } elseif ($issueStatus === 'resolved') {
            $loanQuery->whereDoesntHave('issues', fn ($q) => $q->where('status', 'pending'))
                      ->whereHas('issues', fn ($q) => $q->where('status', 'resolved'));
        } elseif ($issueStatus === 'replied') {
            $loanQuery->whereHas('issues', fn ($q) => $q->whereNotNull('response_message'));
        } elseif ($issueStatus === 'approved') {
            $loanQuery->whereIn('status', [
                LoanApplication::STATUS_APPROVED,
                LoanApplication::STATUS_PENDING_DISBURSEMENT,
                LoanApplication::STATUS_DISBURSED
            ]);
        } elseif ($issueStatus === 'rejected') {
            $loanQuery->where('status', LoanApplication::STATUS_REJECTED);
        }

        $admissionList = ($type === 'loan') ? collect() : $admissionQuery->get();
        $loanList = ($type === 'admission') ? collect() : $loanQuery->get();

        // Permissions
        $canApprove = $authUser->has_all_access || $authUser->isSuperAdmin() || $authUser->isHeadOffice() || $authUser->isEd();
        $canReject = $canApprove || in_array($roleName, ['branch_manager', 'area_manager', 'zone_manager', 'admf', 'dmf'], true);
        $canReply = true;
        $isHoAdmin = $canApprove;

        // Standardize into unified Verification Items
        $verificationItems = collect();

        foreach ($admissionList as $admission) {
            $latestIssue = $admission->issues->first();
            $hasPendingIssue = $admission->issues->contains(fn ($i) => $i->status === 'pending');
            $hasReplied = $admission->issues->contains(fn ($i) => !empty($i->resolution_note) || $i->status === 'resolved');

            $branchCode = (string) ($admission->branch?->code ?? $admission->branch?->branch_code ?? '0000');
            $branchCodeInt = is_numeric($branchCode) ? (int)$branchCode : 999999;

            $viewUrl = $isHoAdmin
                ? "/head-office/admissions/{$admission->id}"
                : "/member-admissions/{$admission->id}";

            $parsed = $this->parseObjectionAndReply(
                $latestIssue?->issue_description,
                $latestIssue?->resolution_note,
                $admission->revision_comments
            );

            $latestActionAt = collect([
                $admission->submitted_at,
                $admission->created_at,
                $admission->returned_at,
                $admission->reviewed_at,
                $latestIssue?->created_at,
                $latestIssue?->resolved_at,
            ])->filter()->max();

            $verificationItems->push([
                'id' => 'admission_' . $admission->id,
                'raw_id' => $admission->id,
                'item_type' => 'admission',
                'application_no' => $admission->application_no,
                'applicant_name' => $admission->applicant_name_bn ?: $admission->applicant_name_en,
                'applicant_name_en' => $admission->applicant_name_en,
                'mobile_number' => $admission->mobile_number,
                'nid_number' => $admission->nid_number,
                'category_name' => $admission->memberCategory?->category_name ?? '—',
                'branch_id' => $admission->branch_id,
                'branch_name' => $admission->branch?->name ?? '—',
                'branch_code' => $branchCode,
                'branch_code_int' => $branchCodeInt,
                'area_name' => $admission->branch?->area?->name ?? '—',
                'zone_name' => $admission->branch?->area?->zone?->name ?? '—',
                'samity_name' => $admission->samity?->samity_name ?? '—',
                'status' => $admission->status,
                'submitted_at' => $latestActionAt ? Carbon::parse($latestActionAt)->toIso8601String() : null,
                'created_at' => $admission->created_at->toIso8601String(),
                'latest_action_at' => $latestActionAt ? Carbon::parse($latestActionAt)->toIso8601String() : $admission->created_at->toIso8601String(),
                'has_pending_issue' => $hasPendingIssue,
                'has_replied' => $hasReplied || !empty($parsed['branch_reply']),
                'issues' => $admission->issues->map(function ($i) use ($admission) {
                    $itemParsed = $this->parseObjectionAndReply($i->issue_description, $i->resolution_note, $admission->revision_comments);
                    return [
                        'id' => $i->id,
                        'issue_description' => $itemParsed['ho_objection'],
                        'reporter_name' => $i->reporter?->name ?? 'Head Office',
                        'status' => $i->status,
                        'reply_message' => $itemParsed['branch_reply'],
                        'responder_name' => $i->resolver?->name ?? null,
                        'created_at' => $i->created_at ? $i->created_at->toIso8601String() : null,
                        'replied_at' => $i->resolved_at ? $i->resolved_at->toIso8601String() : null,
                    ];
                }),
                'latest_issue_id' => $latestIssue?->id ?? null,
                'latest_issue_description' => $parsed['ho_objection'],
                'latest_reply_message' => $parsed['branch_reply'],
                'view_url' => $viewUrl,
                'amount' => null,
            ]);
        }

        foreach ($loanList as $loan) {
            $latestIssue = $loan->issues->first();
            $hasPendingIssue = $loan->issues->contains(fn ($i) => $i->status === 'pending');
            $hasReplied = $loan->issues->contains(fn ($i) => !empty($i->response_message));

            $branchCode = (string) ($loan->branch?->code ?? $loan->branch?->branch_code ?? '0000');
            $branchCodeInt = is_numeric($branchCode) ? (int)$branchCode : 999999;

            $viewUrl = $isHoAdmin
                ? "/head-office/loans/{$loan->id}"
                : "/member/loan-applications/{$loan->id}";

            $parsed = $this->parseObjectionAndReply(
                $latestIssue?->issue_description,
                $latestIssue?->response_message,
                $loan->revision_comments
            );

            $latestActionAt = collect([
                $loan->submitted_at,
                $loan->created_at,
                $loan->reviewed_at,
                $latestIssue?->created_at,
                $latestIssue?->responded_at,
            ])->filter()->max();

            $verificationItems->push([
                'id' => 'loan_' . $loan->id,
                'raw_id' => $loan->id,
                'item_type' => 'loan',
                'application_no' => $loan->application_no,
                'applicant_name' => $loan->memberAdmission?->applicant_name_bn ?: ($loan->memberAdmission?->applicant_name_en ?? '—'),
                'applicant_name_en' => $loan->memberAdmission?->applicant_name_en ?? '',
                'mobile_number' => $loan->memberAdmission?->mobile_number ?? '',
                'nid_number' => $loan->memberAdmission?->nid_number ?? '',
                'category_name' => $loan->loanProduct?->product_name_bn ?? ($loan->loanProduct?->product_name ?? '—'),
                'branch_id' => $loan->branch_id,
                'branch_name' => $loan->branch?->name ?? '—',
                'branch_code' => $branchCode,
                'branch_code_int' => $branchCodeInt,
                'area_name' => $loan->branch?->area?->name ?? '—',
                'zone_name' => $loan->branch?->area?->zone?->name ?? '—',
                'samity_name' => $loan->samity?->samity_name ?? '—',
                'status' => $loan->status,
                'submitted_at' => $latestActionAt ? Carbon::parse($latestActionAt)->toIso8601String() : null,
                'created_at' => $loan->created_at->toIso8601String(),
                'latest_action_at' => $latestActionAt ? Carbon::parse($latestActionAt)->toIso8601String() : $loan->created_at->toIso8601String(),
                'has_pending_issue' => $hasPendingIssue,
                'has_replied' => $hasReplied || !empty($parsed['branch_reply']),
                'issues' => $loan->issues->map(function ($i) use ($loan) {
                    $itemParsed = $this->parseObjectionAndReply($i->issue_description, $i->response_message, $loan->revision_comments ?? null);
                    return [
                        'id' => $i->id,
                        'issue_description' => $itemParsed['ho_objection'],
                        'reporter_name' => $i->reporter?->name ?? 'Head Office',
                        'status' => $i->status,
                        'reply_message' => $itemParsed['branch_reply'],
                        'responder_name' => $i->responder?->name ?? null,
                        'created_at' => $i->created_at ? $i->created_at->toIso8601String() : null,
                        'replied_at' => $i->responded_at ? $i->responded_at->toIso8601String() : null,
                    ];
                }),
                'latest_issue_id' => $latestIssue?->id ?? null,
                'latest_issue_description' => $parsed['ho_objection'],
                'latest_reply_message' => $parsed['branch_reply'],
                'view_url' => $viewUrl,
                'amount' => $loan->approved_amount ?: $loan->requested_amount,
            ]);
        }

        // Sort items by Branch Code in branch serial order, then by latest action date
        $sortedItems = $verificationItems->sort(function ($a, $b) {
            if ($a['branch_code_int'] !== $b['branch_code_int']) {
                return $a['branch_code_int'] <=> $b['branch_code_int'];
            }
            return strcmp($b['latest_action_at'], $a['latest_action_at']);
        })->values();

        // Calculate statistics
        $stats = [
            'total' => $sortedItems->count(),
            'admission_count' => $sortedItems->where('item_type', 'admission')->count(),
            'loan_count' => $sortedItems->where('item_type', 'loan')->count(),
            'pending_issues' => $sortedItems->where('has_pending_issue', true)->count(),
            'branch_replied' => $sortedItems->where('has_replied', true)->count(),
            'approved' => $sortedItems->whereIn('status', ['approved', 'pending_disbursement', 'disbursed'])->count(),
        ];

        // Paginate in memory or return sorted collection
        $page = (int) $request->input('page', 1);
        $perPage = $this->resolvePerPage($request);
        $totalItems = $sortedItems->count();
        $pagedItems = $sortedItems->slice(($page - 1) * $perPage, $perPage)->values();

        $paginatedData = [
            'data' => $pagedItems,
            'current_page' => $page,
            'last_page' => (int) ceil($totalItems / max($perPage, 1)) ?: 1,
            'per_page' => $perPage,
            'total' => $totalItems,
            'from' => $totalItems > 0 ? (($page - 1) * $perPage) + 1 : 0,
            'to' => min($page * $perPage, $totalItems),
        ];

        $orgFilters = $this->organizationFilterOptions();

        return Inertia::render('HeadOffice/Verification/Index', [
            'items' => $paginatedData,
            'stats' => $stats,
            'filters' => [
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'search' => $search,
                'type' => $type,
                'issue_status' => $issueStatus,
                'zone_id' => $zoneId ? (int)$zoneId : null,
                'area_id' => $areaId ? (int)$areaId : null,
                'branch_id' => $branchId ? (int)$branchId : null,
                'per_page' => $perPage,
            ],
            'permissions' => [
                'can_approve' => $canApprove,
                'can_reject' => $canReject,
                'can_reply' => $canReply,
                'is_head_office' => $isHoAdmin,
                'role' => $roleName,
            ],
            'zones' => $orgFilters['zones'],
            'areas' => $orgFilters['areas'],
            'branches' => $orgFilters['branches'],
        ]);
    }

    /**
     * Branch user / Approver reply to an issue
     */
    public function replyIssue(Request $request)
    {
        $validated = $request->validate([
            'item_type' => 'required|in:admission,loan',
            'raw_id' => 'required|integer',
            'issue_id' => 'nullable|integer',
            'reply_message' => 'required|string|max:2000',
        ]);

        $authUser = auth()->user();

        if ($validated['item_type'] === 'admission') {
            $admission = MemberAdmission::findOrFail($validated['raw_id']);
            $this->ensureCanAccessBranch($admission->branch_id);

            if (!empty($validated['issue_id'])) {
                $issue = MemberAdmissionIssue::where('member_admission_id', $admission->id)
                    ->where('id', $validated['issue_id'])
                    ->first();
                if ($issue) {
                    $issue->update([
                        'resolution_note' => $validated['reply_message'],
                        'resolved_at' => now(),
                        'resolved_by' => $authUser->id,
                    ]);
                }
            } else {
                $latestIssue = $admission->issues()->where('status', 'pending')->latest()->first();
                if ($latestIssue) {
                    $latestIssue->update([
                        'resolution_note' => $validated['reply_message'],
                        'resolved_at' => now(),
                        'resolved_by' => $authUser->id,
                    ]);
                }
            }

            // Update admission revision note and refresh submitted_at to now
            $admission->update([
                'revision_comments' => $validated['reply_message'],
                'submitted_at' => now(),
                'submitted_by' => $authUser->id,
            ]);

            // Notify Head Office
            $headOfficeUsers = User::where('is_active', 1)
                ->where(function ($q) {
                    $q->where('has_all_access', 1)
                      ->orWhereHas('role', fn ($r) => $r->whereIn('name', ['super_admin', 'head_office', 'ed']));
                })->get();

            if ($headOfficeUsers->isNotEmpty()) {
                app(NotificationService::class)->send(
                    users: $headOfficeUsers,
                    type: 'member_admission',
                    title: 'সদস্য ভর্তির আপত্তিতে শাখার জবাব এসেছে',
                    message: "সদস্য আবেদন নং {$admission->application_no} ({$admission->applicant_name_bn}) এর আপত্তিতে শাখা থেকে জবাব প্রদান করা হয়েছে: \"{$validated['reply_message']}\"",
                    notifiable: $admission,
                    actionUrl: "/head-office/verifications",
                    details: [
                        'আবেদন নং' => $admission->application_no,
                        'শাখা' => $admission->branch?->name ?? 'N/A',
                        'জবাবদাতা' => $authUser->name,
                        'জবাব' => $validated['reply_message'],
                    ]
                );
            }
        } else {
            $loan = LoanApplication::findOrFail($validated['raw_id']);
            $this->ensureCanAccessBranch($loan->branch_id);

            if (!empty($validated['issue_id'])) {
                $issue = LoanApplicationIssue::where('loan_application_id', $loan->id)
                    ->where('id', $validated['issue_id'])
                    ->first();
                if ($issue) {
                    $issue->update([
                        'response_message' => $validated['reply_message'],
                        'responded_by' => $authUser->id,
                        'responded_at' => now(),
                    ]);
                }
            } else {
                $latestIssue = $loan->issues()->where('status', 'pending')->latest()->first();
                if ($latestIssue) {
                    $latestIssue->update([
                        'response_message' => $validated['reply_message'],
                        'responded_by' => $authUser->id,
                        'responded_at' => now(),
                    ]);
                }
            }

            // Update loan submission timestamp
            $loan->update([
                'submitted_at' => now(),
                'submitted_by' => $authUser->id,
            ]);

            // Notify Head Office
            $headOfficeUsers = User::where('is_active', 1)
                ->where(function ($q) {
                    $q->where('has_all_access', 1)
                      ->orWhereHas('role', fn ($r) => $r->whereIn('name', ['super_admin', 'head_office', 'ed']));
                })->get();

            if ($headOfficeUsers->isNotEmpty()) {
                app(NotificationService::class)->send(
                    users: $headOfficeUsers,
                    type: 'loan_application',
                    title: 'ঋণ আবেদনের আপত্তিতে শাখার জবাব এসেছে',
                    message: "ঋণ আবেদন নং {$loan->application_no} ({$loan->memberAdmission?->applicant_name_bn}) এর আপত্তিতে শাখা থেকে জবাব প্রদান করা হয়েছে: \"{$validated['reply_message']}\"",
                    notifiable: $loan,
                    actionUrl: "/head-office/verifications",
                    details: [
                        'আবেদন নং' => $loan->application_no,
                        'শাখা' => $loan->branch?->name ?? 'N/A',
                        'জবাবদাতা' => $authUser->name,
                        'জবাব' => $validated['reply_message'],
                    ]
                );
            }
        }

        return back()->with('success', 'আপনার জবাব সফলভাবে প্রেরণ করা হয়েছে।');
    }

    /**
     * Reject application from Verification
     */
    public function rejectApplication(Request $request)
    {
        $validated = $request->validate([
            'item_type' => 'required|in:admission,loan',
            'raw_id' => 'required|integer',
            'rejection_reason' => 'required|string|max:2000',
        ]);

        $authUser = auth()->user();

        if ($validated['item_type'] === 'admission') {
            $admission = MemberAdmission::findOrFail($validated['raw_id']);
            $this->ensureCanAccessBranch($admission->branch_id);

            DB::transaction(function () use ($admission, $validated, $authUser) {
                $admission->update([
                    'status' => 'rejected',
                    'rejection_reason' => $validated['rejection_reason'],
                    'reviewed_by' => $authUser->id,
                    'reviewed_at' => now(),
                ]);

                $this->closePendingAdmissionIssues($admission, $authUser->id);
            });

            return back()->with('success', 'সদস্য ভর্তি আবেদনটি বাতিল করা হয়েছে।');
        } else {
            $loan = LoanApplication::findOrFail($validated['raw_id']);
            $this->ensureCanAccessBranch($loan->branch_id);

            DB::transaction(function () use ($loan, $validated, $authUser) {
                $loan->update([
                    'status' => LoanApplication::STATUS_REJECTED,
                    'rejection_reason' => $validated['rejection_reason'],
                    'reviewed_by' => $authUser->id,
                    'reviewed_at' => now(),
                ]);

                $this->closePendingLoanIssues($loan, $authUser->id);
            });

            return back()->with('success', 'ঋণ আবেদনটি বাতিল করা হয়েছে।');
        }
    }

    /**
     * One-click approve Member Admission from Verification
     */
    public function approveAdmission(Request $request, MemberAdmission $admission)
    {
        $this->ensureCanAccessBranch($admission->branch_id);

        $latestIssue = $admission->issues()->latest()->first();
        $parsed = $this->parseObjectionAndReply(
            $latestIssue?->issue_description,
            $latestIssue?->resolution_note,
            $admission->revision_comments
        );
        $hasBranchReply = !empty($parsed['branch_reply']) || $admission->issues()->whereNotNull('resolution_note')->exists();

        if (!$hasBranchReply && $admission->issues()->where('status', 'pending')->exists()) {
            return back()->with('error', 'ব্রাঞ্চ থেকে জবাব না পাওয়া পর্যন্ত অনুমোদন করা যাবে না।');
        }

        $authUser = auth()->user();

        DB::transaction(function () use ($admission, $authUser) {
            $this->closePendingAdmissionIssues($admission, $authUser->id);

            // Update admission status to approved
            $admission->update([
                'status' => 'approved',
                'reviewed_at' => now(),
                'reviewed_by' => $authUser->id,
                'rejection_reason' => null,
            ]);

            // Approve any pending approval chains
            $admission->approvals()
                ->where('status', 'pending')
                ->update([
                    'status' => 'approved',
                    'approved_at' => now(),
                    'comments' => 'হেড অফিস ভেরিফিকেশন থেকে স্বয়ংক্রিয় অনুমোদন',
                ]);
        });

        // Notify branch
        $admission->refresh()->loadMissing(['createdBy', 'submittedBy', 'branch']);
        $branchManagers = User::where('branch_id', $admission->branch_id)
            ->where('is_active', 1)
            ->whereHas('role', fn ($q) => $q->where('name', Role::BRANCH_MANAGER))
            ->get();

        $recipients = collect([$admission->createdBy, $admission->submittedBy])
            ->concat($branchManagers)
            ->filter()
            ->unique('id');

        if ($recipients->isNotEmpty()) {
            app(NotificationService::class)->send(
                users: $recipients,
                type: 'member_admission',
                title: 'সদস্য ভর্তি আবেদন অনুমোদিত (যাচাই সম্পন্ন)',
                message: "সদস্য আবেদন নং {$admission->application_no} ({$admission->applicant_name_bn}) হেড অফিস যাচাই থেকে চূড়ান্ত অনুমোদিত হয়েছে।",
                notifiable: $admission,
                actionUrl: "/member-admissions/{$admission->id}",
                details: [
                    'আবেদন নং' => $admission->application_no,
                    'আবেদনকারীর নাম' => $admission->applicant_name_bn ?: $admission->applicant_name_en,
                    'শাখা' => $admission->branch?->name ?? 'N/A',
                    'অনুমোদন তারিখ' => now()->format('Y-m-d H:i'),
                ]
            );
        }

        return back()->with('success', 'সদস্য ভর্তি আবেদনটি সফলভাবে অনুমোদিত হয়েছে।');
    }

    /**
     * One-click approve Loan Application from Verification
     */
    public function approveLoan(Request $request, LoanApplication $loanApplication)
    {
        $this->ensureCanAccessBranch($loanApplication->branch_id);

        $latestIssue = $loanApplication->issues()->latest()->first();
        $parsed = $this->parseObjectionAndReply(
            $latestIssue?->issue_description,
            $latestIssue?->response_message,
            $loanApplication->revision_comments
        );
        $hasBranchReply = !empty($parsed['branch_reply']) || $loanApplication->issues()->whereNotNull('response_message')->exists();

        if (!$hasBranchReply && $loanApplication->issues()->where('status', 'pending')->exists()) {
            return back()->with('error', 'ব্রাঞ্চ থেকে জবাব না পাওয়া পর্যন্ত অনুমোদন করা যাবে না।');
        }

        $authUser = auth()->user();

        DB::transaction(function () use ($loanApplication, $authUser) {
            $this->closePendingLoanIssues($loanApplication, $authUser->id);

            // Update loan application status to pending_disbursement
            $loanApplication->update([
                'status' => LoanApplication::STATUS_PENDING_DISBURSEMENT,
                'reviewed_at' => now(),
                'reviewed_by' => $authUser->id,
                'approved_amount' => $loanApplication->approved_amount ?: $loanApplication->requested_amount,
            ]);
        });

        // Notify branch
        $loanApplication->refresh()->loadMissing(['submittedBy', 'memberAdmission', 'branch']);
        $branchManagers = User::where('branch_id', $loanApplication->branch_id)
            ->where('is_active', 1)
            ->whereHas('role', fn ($q) => $q->where('name', Role::BRANCH_MANAGER))
            ->get();

        $recipients = collect([$loanApplication->submittedBy])
            ->concat($branchManagers)
            ->filter()
            ->unique('id');

        if ($recipients->isNotEmpty()) {
            app(NotificationService::class)->send(
                users: $recipients,
                type: 'loan_application',
                title: 'ঋণ আবেদন অনুমোদিত (যাচাই সম্পন্ন)',
                message: "ঋণ আবেদন নং {$loanApplication->application_no} ({$loanApplication->memberAdmission?->applicant_name_bn}) হেড অফিস যাচাই থেকে অনুমোদিত হয়েছে। বিতরণের জন্য শাখায় পাঠানো হয়েছে।",
                notifiable: $loanApplication,
                actionUrl: "/member/loan-applications/{$loanApplication->id}",
                details: [
                    'আবেদন নং' => $loanApplication->application_no,
                    'সদস্যের নাম' => $loanApplication->memberAdmission?->applicant_name_bn ?: ($loanApplication->memberAdmission?->applicant_name_en ?? 'N/A'),
                    'শাখা' => $loanApplication->branch?->name ?? 'N/A',
                    'অনুমোদিত পরিমাণ' => '৳ ' . number_format($loanApplication->approved_amount ?: $loanApplication->requested_amount, 2),
                ]
            );
        }

        return back()->with('success', 'ঋণ আবেদনটি সফলভাবে অনুমোদিত হয়েছে।');
    }

    /**
     * Store new issue / inquiry from Verification
     */
    public function storeIssue(Request $request)
    {
        $validated = $request->validate([
            'item_type' => 'required|in:admission,loan',
            'raw_id' => 'required|integer',
            'issue_description' => 'required|string|max:2000',
        ]);

        if ($validated['item_type'] === 'admission') {
            $admission = MemberAdmission::findOrFail($validated['raw_id']);
            $this->ensureCanAccessBranch($admission->branch_id);

            MemberAdmissionIssue::create([
                'member_admission_id' => $admission->id,
                'reported_by' => auth()->id(),
                'issue_description' => $validated['issue_description'],
                'status' => 'pending',
            ]);
        } else {
            $loan = LoanApplication::findOrFail($validated['raw_id']);
            $this->ensureCanAccessBranch($loan->branch_id);

            LoanApplicationIssue::create([
                'loan_application_id' => $loan->id,
                'reported_by' => auth()->id(),
                'issue_description' => $validated['issue_description'],
                'status' => 'pending',
            ]);
        }

        return back()->with('success', 'নতুন আপত্তি/অনুসন্ধান সফলভাবে যুক্ত করা হয়েছে।');
    }

    /**
     * Resolve issue from Verification
     */
    public function resolveIssue(Request $request)
    {
        $validated = $request->validate([
            'item_type' => 'required|in:admission,loan',
            'issue_id' => 'required|integer',
            'note' => 'nullable|string|max:2000',
        ]);

        if ($validated['item_type'] === 'admission') {
            $issue = MemberAdmissionIssue::findOrFail($validated['issue_id']);
            $issue->update([
                'status' => 'resolved',
                'resolved_at' => now(),
                'resolved_by' => auth()->id(),
                'resolution_note' => $validated['note'] ?: ($issue->resolution_note ?? 'সমাধান করা হয়েছে'),
            ]);
        } else {
            $issue = LoanApplicationIssue::findOrFail($validated['issue_id']);
            $issue->update([
                'status' => 'resolved',
                'responded_at' => now(),
                'responded_by' => auth()->id(),
                'response_message' => $validated['note'] ?: ($issue->response_message ?? 'সমাধান করা হয়েছে'),
            ]);
        }

        return back()->with('success', 'আপত্তিটি সফলভাবে সমাধান করা হয়েছে।');
    }

    /**
     * Parse text to separate HO objection from Branch reply if they are combined in revision_comments.
     * Head Office auto-notes that previously overwrote the branch reply are ignored.
     */
    private function parseObjectionAndReply(?string $issueText, ?string $replyText, ?string $revisionComments): array
    {
        $hoObjection = $issueText;
        $branchReply = $this->isHeadOfficeAutoNote($replyText) ? null : $replyText;

        $combinedText = $issueText ?: $revisionComments;

        if ($combinedText && preg_match('/^(.*?)(?:\n+|\s*)(?:---+\s*Branch\s*Revision\s*Note(?:\s*\([^)]*\))?\s*---+)(.*)$/si', $combinedText, $matches)) {
            $hoObjection = trim($matches[1]);
            $parsedBranchReply = trim($matches[2]);
            if (empty($branchReply) && ! empty($parsedBranchReply) && ! $this->isHeadOfficeAutoNote($parsedBranchReply)) {
                $branchReply = $parsedBranchReply;
            }
        } elseif (! $hoObjection && $revisionComments && ! $this->isHeadOfficeAutoNote($revisionComments)) {
            $hoObjection = trim($revisionComments);
        }

        $fallback = trim((string) $revisionComments);
        if (empty($branchReply) && $fallback !== '' && ! $this->isHeadOfficeAutoNote($fallback)) {
            if (! $combinedText || ! preg_match('/---+\s*Branch\s*Revision\s*Note/si', $fallback)) {
                $branchReply = $fallback;
            }
        }

        return [
            'ho_objection' => $hoObjection ?: 'তদন্তাধীন',
            'branch_reply' => $branchReply ?: null,
        ];
    }

    private function isHeadOfficeAutoNote(?string $text): bool
    {
        $text = trim((string) $text);
        if ($text === '') {
            return false;
        }

        return $text === 'হেড অফিস ভেরিফিকেশন থেকে অনুমোদিত'
            || str_starts_with($text, 'আবেদন বাতিল:');
    }

    /**
     * Close pending admission issues without overwriting the branch reply.
     * Status must stay within ENUM('pending','resolved') — 'rejected' causes data truncated.
     */
    private function closePendingAdmissionIssues(MemberAdmission $admission, int $userId): void
    {
        $admission->issues()
            ->where('status', 'pending')
            ->update([
                'status' => 'resolved',
                'resolved_at' => now(),
                'resolved_by' => $userId,
            ]);
    }

    /**
     * Close pending loan issues without overwriting the branch reply.
     */
    private function closePendingLoanIssues(LoanApplication $loan, int $userId): void
    {
        $loan->issues()
            ->where('status', 'pending')
            ->update([
                'status' => 'resolved',
                'responded_at' => now(),
                'responded_by' => $userId,
            ]);
    }
}
