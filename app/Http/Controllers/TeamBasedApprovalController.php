<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Role;
use App\Models\TeamBasedApproval;
use App\Models\TeamBasedApprovalItem;
use App\Models\TeamBasedApprovalReview;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class TeamBasedApprovalController extends Controller
{
    /**
     * Show Team Based approval entry form for branch user.
     */
    public function create(Request $request)
    {
        $user = $request->user();
        $branch = $user->branch;

        if (! $branch) {
            abort(403, 'এই ফর্ম শুধু শাখা ব্যবহারকারীদের (branch_manager/branch_user/field_officer) জন্য।');
        }

        $branch->load(['area.zone']);

        // Area & Zone managers who can access this branch
        $areaZoneUsers = User::query()
            ->active()
            ->whereHas('role', function ($q) {
                $q->whereIn('name', [Role::AREA_MANAGER, Role::ZONE_MANAGER]);
            })
            ->canAccessBranch($branch->id)
            ->with('role:id,name,display_name')
            ->orderBy('name')
            ->get();

        $admfDmfEd = User::getApproversSelectableByBranch($branch->id)
            ->loadMissing('role:id,name,display_name');

        // Single approver list (১ জন নির্বাচন করবে) - area/zone + ADMF/DMF/ED
        $approverOptions = collect();
        $approverOptions = $approverOptions->merge(
            $areaZoneUsers->map(function (User $u) {
                return [
                    'id' => $u->id,
                    'name' => $u->name,
                    'role_name' => $u->role->display_name ?? $u->role->name,
                    'level' => $u->role->name,
                ];
            })
        );
        $approverOptions = $approverOptions->merge(
            $admfDmfEd->map(function (User $u) {
                return [
                    'id' => $u->id,
                    'name' => $u->name,
                    'role_name' => $u->role->display_name ?? $u->role->name,
                    'level' => $u->role->name,
                ];
            })
        );

        return Inertia::render('TeamBased/ApprovalForm', [
            'branch' => [
                'id' => $branch->id,
                'name' => $branch->name,
                'code' => $branch->code,
                'area_name' => $branch->area?->name,
                'zone_name' => $branch->area?->zone?->name,
            ],
            'approverOptions' => $approverOptions->values(),
            'today' => now()->toDateString(),
        ]);
    }

    /**
     * Save Team Based sheet as draft (branch can submit later).
     */
    public function saveDraft(Request $request)
    {
        $user = $request->user();
        $branch = $user->branch;

        if (! $branch) {
            abort(403, 'এই ফর্ম শুধু শাখা ব্যবহারকারীদের (branch_manager/branch_user/field_officer) জন্য।');
        }

        $validated = $request->validate([
            'sheet_date' => ['required', 'date'],
            'approver_user_id' => ['required', 'exists:users,id'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.member_name' => ['required', 'string', 'max:255'],
            'items.*.member_code' => ['nullable', 'string', 'max:50'],
            'items.*.samity_number' => ['nullable', 'string', 'max:50'],
            'items.*.savings_general' => ['nullable', 'numeric', 'min:0'],
            'items.*.savings_other' => ['nullable', 'numeric', 'min:0'],
            'items.*.savings_total' => ['nullable', 'numeric', 'min:0'],
            'items.*.repaid_loan_amount' => ['nullable', 'numeric', 'min:0'],
            'items.*.repaid_installment_no' => ['nullable', 'integer', 'min:0'],
            'items.*.other_institution_loan_amount' => ['nullable', 'numeric', 'min:0'],
            'items.*.proposed_loan_amount' => ['nullable', 'numeric', 'min:0'],
            'items.*.loan_term_years' => ['nullable', 'numeric', 'in:1,1.5,2,3'],
            'items.*.loan_type' => ['nullable', 'string', 'max:100'],
            'items.*.project_name' => ['nullable', 'string', 'max:255'],
        ], [
            'items.required' => 'কমপক্ষে ১ জন সদস্যের তথ্য দিতে হবে।',
            'items.*.member_name.required' => 'সদস্যের নাম ফাঁকা রাখা যাবে না।',
        ]);

        DB::transaction(function () use ($validated, $branch, $user) {
            // Determine selected approver role (Area/Zone/ADMF/DMF/ED) - only ONE approver
            $approver = User::with('role')->findOrFail($validated['approver_user_id']);

            $areaManagerId = null;
            $zoneManagerId = null;
            $admfId = null;
            $dmfId = null;
            $edId = null;

            switch ($approver->role?->name) {
                case Role::AREA_MANAGER:
                    $areaManagerId = $approver->id;
                    break;
                case Role::ZONE_MANAGER:
                    $zoneManagerId = $approver->id;
                    break;
                case Role::ADMF:
                    $admfId = $approver->id;
                    break;
                case Role::DMF:
                    $dmfId = $approver->id;
                    break;
                case Role::ED:
                    $edId = $approver->id;
                    break;
            }

            $approval = TeamBasedApproval::create([
                'branch_id' => $branch->id,
                'created_by' => $user->id,
                'sheet_date' => $validated['sheet_date'],
                'area_manager_id' => $areaManagerId,
                'zone_manager_id' => $zoneManagerId,
                'admf_id' => $admfId,
                'dmf_id' => $dmfId,
                'ed_id' => $edId,
                'status' => 'draft',
            ]);

            $items = [];
            foreach ($validated['items'] as $index => $item) {
                $items[] = new TeamBasedApprovalItem(array_merge($item, [
                    'serial_no' => $index + 1,
                ]));
            }

            $approval->items()->saveMany($items);
            // Keep a snapshot for future change-highlighting
            $approval->update([
                'last_items_snapshot' => $validated['items'],
            ]);
        });

        return redirect()
            ->back()
            ->with('success', 'টিম ভিত্তিক ঋণ তালিকা ড্রাফট হিসেবে সংরক্ষিত হয়েছে।');
    }

    /**
     * List ALL non-draft Team Based approvals for current branch (All Applications).
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $branch = $user->branch;
        if (! $branch) {
            abort(403, 'এই তালিকা শুধুমাত্র শাখা ব্যবহারকারীদের জন্য।');
        }

        $dateFrom = $request->input('date_from', now()->toDateString());
        $dateTo = $request->input('date_to', now()->toDateString());
        $approverId = $request->input('approver_id');
        $status = $request->input('status');

        $approvals = TeamBasedApproval::with(['branch', 'creator', 'areaManager', 'zoneManager', 'admf', 'dmf', 'ed', 'items', 'reviews'])
            ->where('branch_id', $branch->id)
            ->where('status', '!=', 'draft')
            ->when($dateFrom && $dateTo, function ($q) use ($dateFrom, $dateTo) {
                $q->whereBetween('sheet_date', [$dateFrom, $dateTo]);
            })
            ->when($status, function ($q) use ($status) {
                $q->where('status', $status);
            })
            ->when($approverId, function ($q) use ($approverId) {
                $q->where(function ($inner) use ($approverId) {
                    $inner->where('area_manager_id', $approverId)
                        ->orWhere('zone_manager_id', $approverId)
                        ->orWhere('admf_id', $approverId)
                        ->orWhere('dmf_id', $approverId)
                        ->orWhere('ed_id', $approverId);
                });
            })
            ->latest()
            ->paginate(20)
            ->through(function (TeamBasedApproval $approval) {
                $approverUser = $approval->areaManager
                    ?? $approval->zoneManager
                    ?? $approval->admf
                    ?? $approval->dmf
                    ?? $approval->ed;

                // Map reviews by item id for quick lookup
                $reviewsByItem = $approval->reviews
                    ->whereNotNull('team_based_approval_item_id')
                    ->keyBy('team_based_approval_item_id');

                return [
                    'id' => $approval->id,
                    'sheet_date' => optional($approval->sheet_date)->toDateString(),
                    'status' => $approval->status,
                    'created_at' => $approval->created_at?->toDateTimeString(),
                    'approver_name' => $approverUser?->name,
                    'items' => $approval->items->map(function (TeamBasedApprovalItem $item) use ($reviewsByItem, $approval) {
                        /** @var \Illuminate\Support\Collection $reviewsByItem */
                        $review = $reviewsByItem[$item->id] ?? null;

                        return [
                            'serial_no' => $item->serial_no,
                            'member_name' => $item->member_name,
                            'member_code' => $item->member_code,
                            'samity_number' => $item->samity_number,
                            'savings_general' => $item->savings_general,
                            'savings_other' => $item->savings_other,
                            'savings_total' => $item->savings_total,
                            'repaid_loan_amount' => $item->repaid_loan_amount,
                            'repaid_installment_no' => $item->repaid_installment_no,
                            'other_institution_loan_amount' => $item->other_institution_loan_amount,
                            'proposed_loan_amount' => $item->proposed_loan_amount,
                            'loan_term_years' => $item->loan_term_years,
                            'loan_type' => $item->loan_type,
                            'project_name' => $item->project_name,
                            // Per-loan approval info
                            'status' => $review?->status ?? $approval->status,
                            'approved_amount' => $item->approved_amount,
                            'review_comments' => $review?->comments,
                            'approver_signature' => $review?->approver_signature,
                            'decided_at' => optional($review?->decided_at)->toDateString(),
                        ];
                    })->values(),
                ];
            });

        // Draft count for badge on All Applications page
        $draftCount = TeamBasedApproval::where('branch_id', $branch->id)
            ->where('status', 'draft')
            ->count();

        // Build approver filter options (same logic as create)
        $branch->loadMissing(['area.zone']);

        $areaZoneUsers = User::query()
            ->active()
            ->whereHas('role', function ($q) {
                $q->whereIn('name', [Role::AREA_MANAGER, Role::ZONE_MANAGER]);
            })
            ->canAccessBranch($branch->id)
            ->with('role:id,name,display_name')
            ->orderBy('name')
            ->get();

        $admfDmfEd = User::getApproversSelectableByBranch($branch->id)
            ->loadMissing('role:id,name,display_name');

        $approverOptions = collect();
        $approverOptions = $approverOptions->merge(
            $areaZoneUsers->map(function (User $u) {
                return [
                    'id' => $u->id,
                    'name' => $u->name,
                    'role_name' => $u->role->display_name ?? $u->role->name,
                ];
            })
        );
        $approverOptions = $approverOptions->merge(
            $admfDmfEd->map(function (User $u) {
                return [
                    'id' => $u->id,
                    'name' => $u->name,
                    'role_name' => $u->role->display_name ?? $u->role->name,
                ];
            })
        );

        return Inertia::render('TeamBased/ApprovalIndex', [
            'approvals' => $approvals,
            'filters' => [
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'approver_id' => $approverId,
                'status' => $status,
            ],
            'draftCount' => $draftCount,
            'approverOptions' => $approverOptions->values(),
            'branch' => [
                'name' => $branch->name,
                'code' => $branch->code,
                'area_name' => $branch->area?->name,
                'zone_name' => $branch->area?->zone?->name,
            ],
        ]);
    }

    /**
     * Approver side index: list sheets assigned to logged-in approver.
     */
    public function approverIndex(Request $request)
    {
        $user = $request->user();
        $roleName = $user->role?->name;

        // Only Area/Zone/ADMF/DMF/ED can use this page
        if (! in_array($roleName, [
            Role::AREA_MANAGER,
            Role::ZONE_MANAGER,
            Role::ADMF,
            Role::DMF,
            Role::ED,
        ], true)) {
            abort(403, 'আপনার জন্য এই অনুমোদন তালিকা প্রযোজ্য নয়।');
        }

        $status = $request->input('status');
        $branchId = $request->input('branch_id');
        $approverId = $request->input('approver_id');
        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');

        // Reviews may be:
        // - new style: per-loan (team_based_approval_item_id set)
        // - old style: per-sheet (no item id) – still need to show them
        // For RM (area manager): only own reviews.
        // For higher levels (ZM/ADMF/DMF/ED): own reviews + RM reviews under their accessible branches (read-only).
        $reviewsQuery = TeamBasedApprovalReview::with(['approval.branch', 'approval.items', 'item', 'user.role']);

        if ($roleName === Role::AREA_MANAGER) {
            $reviewsQuery->where('user_id', $user->id);
        } else {
            $accessibleBranchIds = $user->getAccessibleBranches()->pluck('id');

            $reviewsQuery->where(function ($q) use ($user, $accessibleBranchIds) {
                $q->where('user_id', $user->id)
                    ->orWhere(function ($sub) use ($accessibleBranchIds) {
                        $sub->whereHas('user.role', function ($rq) {
                            $rq->where('name', Role::AREA_MANAGER);
                        })->whereHas('approval', function ($aq) use ($accessibleBranchIds) {
                            $aq->whereIn('branch_id', $accessibleBranchIds);
                        });
                    });
            });
        }

        // Base query with filters (no ordering/pagination yet)
        $baseQuery = $reviewsQuery
            ->when($status, function ($q) use ($status) {
                $q->where('status', $status);
            })
            ->when($branchId, function ($q) use ($branchId) {
                $q->whereHas('approval', function ($qa) use ($branchId) {
                    $qa->where('branch_id', $branchId);
                });
            })
            ->when($approverId, function ($q) use ($approverId) {
                $q->where('user_id', $approverId);
            })
            ->when($dateFrom && $dateTo, function ($q) use ($dateFrom, $dateTo) {
                $q->whereHas('approval', function ($qa) use ($dateFrom, $dateTo) {
                    $qa->whereBetween('sheet_date', [$dateFrom, $dateTo]);
                });
            });

        // Paginated reviews list for table
        $reviews = (clone $baseQuery)
            ->latest()
            ->paginate(20)
            ->through(function (TeamBasedApprovalReview $review) use ($user) {
                $approval = $review->approval;

                // New style: one review per loan item
                if ($review->team_based_approval_item_id && $review->item) {
                    $item = $review->item;

                    $itemsPayload = [[
                        'serial_no' => $item->serial_no,
                        'member_name' => $item->member_name,
                        'member_code' => $item->member_code,
                        'samity_number' => $item->samity_number,
                        'savings_general' => $item->savings_general,
                        'savings_other' => $item->savings_other,
                        'savings_total' => $item->savings_total,
                        'repaid_loan_amount' => $item->repaid_loan_amount,
                        'repaid_installment_no' => $item->repaid_installment_no,
                        'other_institution_loan_amount' => $item->other_institution_loan_amount,
                        'proposed_loan_amount' => $item->proposed_loan_amount,
                        'approved_amount' => $item->approved_amount,
                        'loan_term_years' => $item->loan_term_years,
                        'loan_type' => $item->loan_type,
                        'project_name' => $item->project_name,
                    ]];

                    $itemsCount = 1;
                    $proposedTotal = $item->proposed_loan_amount ?? 0;
                } else {
                    // Old style: one review per sheet – show all items under this sheet
                    $itemsPayload = $approval->items->map(function (TeamBasedApprovalItem $item) {
                        return [
                            'serial_no' => $item->serial_no,
                            'member_name' => $item->member_name,
                            'member_code' => $item->member_code,
                            'samity_number' => $item->samity_number,
                            'savings_general' => $item->savings_general,
                            'savings_other' => $item->savings_other,
                            'savings_total' => $item->savings_total,
                            'repaid_loan_amount' => $item->repaid_loan_amount,
                            'repaid_installment_no' => $item->repaid_installment_no,
                            'other_institution_loan_amount' => $item->other_institution_loan_amount,
                            'proposed_loan_amount' => $item->proposed_loan_amount,
                            'approved_amount' => $item->approved_amount,
                            'loan_term_years' => $item->loan_term_years,
                            'loan_type' => $item->loan_type,
                            'project_name' => $item->project_name,
                        ];
                    })->values();

                    $itemsCount = $approval->items->count();
                    $proposedTotal = $approval->items->sum('proposed_loan_amount');
                }

                return [
                    'review_id' => $review->id,
                    'status' => $review->status,
                    'comments' => $review->comments,
                    'approver_signature' => $review->approver_signature,
                    'decided_at' => $review->decided_at?->toDateTimeString(),
                    'can_act' => $review->user_id === $user->id,
                    'approver_name' => $review->user?->name,
                    'approver_role' => $review->user?->role?->display_name ?? $review->user?->role?->name,
                    'sheet' => [
                        'id' => $approval->id,
                        'sheet_date' => optional($approval->sheet_date)->toDateString(),
                        'status' => $approval->status,
                        'branch_name' => $approval->branch?->name,
                        'branch_code' => $approval->branch?->code,
                        'area_name' => $approval->branch?->area?->name,
                        'zone_name' => $approval->branch?->area?->zone?->name,
                        'items_count' => $itemsCount,
                        'proposed_total' => $proposedTotal,
                        'items' => $itemsPayload,
                    ],
                ];
            });

        // Branch list for this approver: all branches this user can access (for filtering)
        $branches = Branch::query()
            ->whereIn('id', $user->getAccessibleBranches()->pluck('id'))
            ->orderBy('name')
            ->get([
                'id',
                'name',
                'code',
            ]);

        // Approver list (RM + higher levels) appearing in these reviews, for filter dropdown
        // Distinct approvers from the same filtered dataset (no ORDER BY / LIMIT issues)
        $approverUserIds = (clone $baseQuery)
            ->select('user_id')
            ->distinct()
            ->pluck('user_id');

        $approverOptions = User::query()
            ->with('role')
            ->whereIn('id', $approverUserIds)
            ->orderBy('name')
            ->get()
            ->map(function (User $u) {
                return [
                    'id' => $u->id,
                    'name' => $u->name,
                    'role_name' => $u->role->display_name ?? $u->role->name,
                ];
            })
            ->values();

        return Inertia::render('TeamBased/ApprovalApproverIndex', [
            'reviews' => $reviews,
            'filters' => [
                'status' => $status,
                'branch_id' => $branchId,
                'approver_id' => $approverId,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
            ],
            'branches' => $branches,
            'approverOptions' => $approverOptions,
        ]);
    }

    /**
     * Approver decision: approve or reject with comments & optional approved amount.
     */
    public function decide(Request $request, TeamBasedApprovalReview $review)
    {
        $user = $request->user();

        if ($review->user_id !== $user->id) {
            abort(403, 'আপনি এই আবেদনটির অনুমোদনকারী নন।');
        }

        if ($review->status !== 'pending') {
            return redirect()
                ->back()
                ->with('error', 'এই আবেদনের সিদ্ধান্ত ইতিমধ্যে নেওয়া হয়েছে।');
        }

        $data = $request->validate([
            'decision' => ['required', 'in:approved,rejected'],
            // Reject korle obosshoi montobbo dibe
            'comments' => ['required_if:decision,rejected', 'nullable', 'string', 'max:1000'],
            // Approve korle obosshoi amount dite hobe
            'approved_amount' => ['required_if:decision,approved', 'numeric', 'min:0'],
        ]);

        $approval = $review->approval;
        $item = $review->item;

        DB::transaction(function () use ($data, $review, $approval, $item, $user) {
            $now = now();

            if ($data['decision'] === 'rejected') {
                $review->update([
                    'status' => 'rejected',
                    'comments' => $data['comments'] ?? null,
                    'approver_signature' => $user->signature,
                    'decided_at' => $now,
                ]);

                // Sheet status change optional; keep as-is for now
            } else {
                $approvedAmount = $data['approved_amount'];

                $review->update([
                    'status' => 'approved',
                    'comments' => $data['comments'] ?? null,
                    'approver_signature' => $user->signature,
                    'decided_at' => $now,
                ]);

                if ($item) {
                    // Store approved amount per loan row
                    $item->update([
                        'approved_amount' => $approvedAmount,
                    ]);
                }
            }
        });

        return redirect()
            ->route('team-based-approvals.approver-index')
            ->with('success', 'সিদ্ধান্ত সফলভাবে সংরক্ষণ হয়েছে।');
    }

    /**
     * List only drafts for current branch (Draft List page).
     */
    public function drafts(Request $request)
    {
        $user = $request->user();
        $branch = $user->branch;
        if (! $branch) {
            abort(403, 'Draft list শুধুমাত্র শাখা ব্যবহারকারীরা দেখতে পারবেন।');
        }

        $dateFrom = $request->input('date_from', now()->toDateString());
        $dateTo = $request->input('date_to', now()->toDateString());

        $approvals = TeamBasedApproval::with(['branch', 'creator', 'areaManager', 'zoneManager', 'admf', 'dmf', 'ed'])
            ->where('branch_id', $branch->id)
            ->where('status', 'draft')
            ->when($dateFrom && $dateTo, function ($q) use ($dateFrom, $dateTo) {
                $q->whereBetween('sheet_date', [$dateFrom, $dateTo]);
            })
            ->latest()
            ->paginate(20)
            ->through(function (TeamBasedApproval $approval) {
                $approverUser = $approval->areaManager
                    ?? $approval->zoneManager
                    ?? $approval->admf
                    ?? $approval->dmf
                    ?? $approval->ed;

                return [
                    'id' => $approval->id,
                    'sheet_date' => optional($approval->sheet_date)->toDateString(),
                    'status' => $approval->status,
                    'created_at' => $approval->created_at?->toDateTimeString(),
                    'approver_name' => $approverUser?->name,
                ];
            });

        return Inertia::render('TeamBased/ApprovalDraftIndex', [
            'approvals' => $approvals,
            'filters' => [
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
            ],
        ]);
    }

    /**
     * Edit a draft sheet.
     */
    public function edit(Request $request, TeamBasedApproval $teamBasedApproval)
    {
        $user = $request->user();
        if ($teamBasedApproval->branch_id !== $user->branch_id || $teamBasedApproval->status !== 'draft') {
            abort(403);
        }

        $branch = $user->branch;
        $branch->load(['area.zone']);

        // Reuse approver list
        $areaZoneUsers = User::query()
            ->active()
            ->whereHas('role', function ($q) {
                $q->whereIn('name', [Role::AREA_MANAGER, Role::ZONE_MANAGER]);
            })
            ->canAccessBranch($branch->id)
            ->with('role:id,name,display_name')
            ->orderBy('name')
            ->get();

        $admfDmfEd = User::getApproversSelectableByBranch($branch->id)
            ->loadMissing('role:id,name,display_name');

        $approverOptions = collect();
        $approverOptions = $approverOptions->merge(
            $areaZoneUsers->map(function (User $u) {
                return [
                    'id' => $u->id,
                    'name' => $u->name,
                    'role_name' => $u->role->display_name ?? $u->role->name,
                    'level' => $u->role->name,
                ];
            })
        );
        $approverOptions = $approverOptions->merge(
            $admfDmfEd->map(function (User $u) {
                return [
                    'id' => $u->id,
                    'name' => $u->name,
                    'role_name' => $u->role->display_name ?? $u->role->name,
                    'level' => $u->role->name,
                ];
            })
        );

        $teamBasedApproval->load('items');

        // Determine selected approver user id
        $approverUserId = $teamBasedApproval->area_manager_id
            ?? $teamBasedApproval->zone_manager_id
            ?? $teamBasedApproval->admf_id
            ?? $teamBasedApproval->dmf_id
            ?? $teamBasedApproval->ed_id;

        $existingApproval = [
            'id' => $teamBasedApproval->id,
            'sheet_date' => optional($teamBasedApproval->sheet_date)->toDateString(),
            'approver_user_id' => $approverUserId,
            'status' => $teamBasedApproval->status,
            'items' => $teamBasedApproval->items->map(function (TeamBasedApprovalItem $item) {
                return [
                    'member_name' => $item->member_name,
                    'member_code' => $item->member_code ?? '',
                    'samity_number' => $item->samity_number ?? '',
                    'savings_general' => $item->savings_general !== null ? (string) $item->savings_general : '',
                    'savings_other' => $item->savings_other !== null ? (string) $item->savings_other : '',
                    'savings_total' => $item->savings_total !== null ? (string) $item->savings_total : '',
                    'repaid_loan_amount' => $item->repaid_loan_amount !== null ? (string) $item->repaid_loan_amount : '',
                    'repaid_installment_no' => $item->repaid_installment_no !== null ? (string) $item->repaid_installment_no : '',
                    'other_institution_loan_amount' => $item->other_institution_loan_amount !== null
                        ? (string) $item->other_institution_loan_amount
                        : '',
                    'proposed_loan_amount' => $item->proposed_loan_amount !== null ? (string) $item->proposed_loan_amount : '',
                    'loan_term_years' => $item->loan_term_years !== null ? (string) $item->loan_term_years : '',
                    'loan_type' => $item->loan_type ?? '',
                    'project_name' => $item->project_name ?? '',
                ];
            })->values(),
        ];

        return Inertia::render('TeamBased/ApprovalForm', [
            'branch' => [
                'id' => $branch->id,
                'name' => $branch->name,
                'code' => $branch->code,
                'area_name' => $branch->area?->name,
                'zone_name' => $branch->area?->zone?->name,
            ],
            'approverOptions' => $approverOptions->values(),
            'today' => now()->toDateString(),
            'existingApproval' => $existingApproval,
        ]);
    }

    /**
     * Update a draft sheet.
     */
    public function updateDraft(Request $request, TeamBasedApproval $teamBasedApproval)
    {
        $user = $request->user();
        if ($teamBasedApproval->branch_id !== $user->branch_id || $teamBasedApproval->status !== 'draft') {
            abort(403);
        }

        $validated = $request->validate([
            'sheet_date' => ['required', 'date'],
            'approver_user_id' => ['required', 'exists:users,id'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.member_name' => ['required', 'string', 'max:255'],
            'items.*.member_code' => ['nullable', 'string', 'max:50'],
            'items.*.samity_number' => ['nullable', 'string', 'max:50'],
            'items.*.savings_general' => ['nullable', 'numeric', 'min:0'],
            'items.*.savings_other' => ['nullable', 'numeric', 'min:0'],
            'items.*.savings_total' => ['nullable', 'numeric', 'min:0'],
            'items.*.repaid_loan_amount' => ['nullable', 'numeric', 'min:0'],
            'items.*.repaid_installment_no' => ['nullable', 'integer', 'min:0'],
            'items.*.other_institution_loan_amount' => ['nullable', 'numeric', 'min:0'],
            'items.*.proposed_loan_amount' => ['nullable', 'numeric', 'min:0'],
            'items.*.loan_term_years' => ['nullable', 'numeric', 'in:1,1.5,2,3'],
            'items.*.loan_type' => ['nullable', 'string', 'max:100'],
            'items.*.project_name' => ['nullable', 'string', 'max:255'],
        ]);

        DB::transaction(function () use ($validated, $teamBasedApproval) {
            $approver = User::with('role')->findOrFail($validated['approver_user_id']);

            $areaManagerId = null;
            $zoneManagerId = null;
            $admfId = null;
            $dmfId = null;
            $edId = null;

            switch ($approver->role?->name) {
                case Role::AREA_MANAGER:
                    $areaManagerId = $approver->id;
                    break;
                case Role::ZONE_MANAGER:
                    $zoneManagerId = $approver->id;
                    break;
                case Role::ADMF:
                    $admfId = $approver->id;
                    break;
                case Role::DMF:
                    $dmfId = $approver->id;
                    break;
                case Role::ED:
                    $edId = $approver->id;
                    break;
            }

            $teamBasedApproval->update([
                'sheet_date' => $validated['sheet_date'],
                'area_manager_id' => $areaManagerId,
                'zone_manager_id' => $zoneManagerId,
                'admf_id' => $admfId,
                'dmf_id' => $dmfId,
                'ed_id' => $edId,
            ]);

            // Replace items
            $teamBasedApproval->items()->delete();

            $items = [];
            foreach ($validated['items'] as $index => $item) {
                $items[] = new TeamBasedApprovalItem(array_merge($item, [
                    'serial_no' => $index + 1,
                ]));
            }

            $teamBasedApproval->items()->saveMany($items);

            $teamBasedApproval->update([
                'last_items_snapshot' => $validated['items'],
            ]);
        });

        return redirect()
            ->route('team-based-approvals.index', ['view' => 'drafts'])
            ->with('success', 'Draft updated successfully.');
    }

    /**
     * Delete a draft sheet.
     */
    public function destroy(Request $request, TeamBasedApproval $teamBasedApproval)
    {
        $user = $request->user();
        if ($teamBasedApproval->branch_id !== $user->branch_id || $teamBasedApproval->status !== 'draft') {
            abort(403);
        }

        $teamBasedApproval->delete();

        return redirect()
            ->route('team-based-approvals.index', ['view' => 'drafts'])
            ->with('success', 'Draft deleted successfully.');
    }

    /**
     * Submit a draft for approval (status: pending).
     */
    public function submit(Request $request, TeamBasedApproval $teamBasedApproval)
    {
        $user = $request->user();
        if ($teamBasedApproval->branch_id !== $user->branch_id || $teamBasedApproval->status !== 'draft') {
            abort(403);
        }

        DB::transaction(function () use ($teamBasedApproval) {
            // Determine approver user (same approver for all items on this sheet)
            $approverUser = $teamBasedApproval->areaManager
                ?? $teamBasedApproval->zoneManager
                ?? $teamBasedApproval->admf
                ?? $teamBasedApproval->dmf
                ?? $teamBasedApproval->ed;

            if (! $approverUser) {
                throw new \RuntimeException('No approver selected for this sheet.');
            }

            $level = $approverUser->role->name ?? null;

            // Create a pending review entry per loan row (item)
            $teamBasedApproval->loadMissing('items');
            foreach ($teamBasedApproval->items as $item) {
                TeamBasedApprovalReview::create([
                    'team_based_approval_id' => $teamBasedApproval->id,
                    'team_based_approval_item_id' => $item->id,
                    'user_id' => $approverUser->id,
                    'level' => $level,
                    'status' => 'pending',
                ]);
            }

            // Mark sheet as pending (branch side list)
            $teamBasedApproval->update(['status' => 'pending']);
        });

        return redirect()
            ->route('team-based-approvals.index')
            ->with('success', 'Draft submitted successfully.');
    }
}

