<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Zone;
use App\Models\Area;
use App\Models\Branch;
use App\Models\Role;
use App\Models\LoanApplication;
use App\Models\LoanApplicationIssue;
use App\Models\MemberAdmission;
use App\Models\TeamBasedApproval;
use App\Models\TeamBasedApprovalItem;
use App\Models\TeamBasedApprovalReview;
use App\Services\ApprovalService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $user->loadMissing('role');
        $roleName = $user->role?->name;

        // Check if user is Area Manager
        if ($roleName === Role::AREA_MANAGER) {
            return $this->unifiedApproverDashboard($user, $request, 'area');
        }

        // Check if user is Zone Manager
        if ($roleName === Role::ZONE_MANAGER) {
            return $this->unifiedApproverDashboard($user, $request, 'zone');
        }

        // Check if user is an Approver (ADMF / DMF / ED)
        if (in_array($roleName, [Role::ADMF, Role::DMF, Role::ED], true)) {
            return $this->unifiedApproverDashboard($user, $request, 'financial');
        }

        // Check if user is Field Officer (or testing view=field_officer)
        if ($roleName === Role::FIELD_OFFICER || $roleName === 'field_officer' || $request->get('view') === 'field_officer') {
            return $this->fieldOfficerDashboard($user, $request);
        }

        // Check if user is Branch Manager (or testing view=branch_manager)
        if ($roleName === Role::BRANCH_MANAGER || $roleName === 'branch_manager' || $request->get('view') === 'branch_manager') {
            return $this->branchManagerDashboard($user, $request);
        }

        // Check if testing view=approver
        if ($request->get('view') === 'approver') {
            return $this->unifiedApproverDashboard($user, $request, 'general');
        }

        // Check if user is Head Office / SuperAdmin
        if ($user->has_all_access || $roleName === Role::SUPER_ADMIN || $roleName === Role::HEAD_OFFICE) {
            return $this->headOfficeDashboard($user, $request);
        }

        return $this->branchDashboard($user, $request);
    }

    /**
     * Unified Approver Dashboard
     * For Area Managers (RM), Zone Managers (ZM), Financial Approvers (ADMF, DMF, ED) & General Approvers
     */
    private function unifiedApproverDashboard($user, Request $request, string $approverType = 'area')
    {
        $roleName = $user->role?->name;

        // 1. Resolve jurisdiction branch IDs and labels
        if ($approverType === 'area' || $roleName === Role::AREA_MANAGER) {
            $areaIds = $user->area_id ? [$user->area_id] : $user->areas()->pluck('areas.id')->toArray();
            $branchIds = Branch::whereIn('area_id', $areaIds)->pluck('id')->toArray();
            $roleLabel = 'রিজিওনাল / এরিয়া ম্যানেজার (RM)';
            $scopeLabel = $user->area?->name ?? 'এরিয়া জুরিসডিকশন';
        } elseif ($approverType === 'zone' || $roleName === Role::ZONE_MANAGER) {
            $zoneIds = $user->zone_id ? [$user->zone_id] : $user->zones()->pluck('zones.id')->toArray();
            $branchIds = Branch::whereHas('area', fn ($q) => $q->whereIn('zone_id', $zoneIds))->pluck('id')->toArray();
            $roleLabel = 'জোনাল ম্যানেজার (ZM)';
            $scopeLabel = $user->zone?->name ?? 'জোন জুরিসডিকশন';
        } elseif ($approverType === 'financial' || in_array($roleName, [Role::ADMF, Role::DMF, Role::ED], true)) {
            $branchIds = Branch::pluck('id')->toArray();
            $roleLabel = 'উর্ধ্বতন আর্থিক অনুমোদক (' . strtoupper($roleName ?? 'APPROVER') . ')';
            $scopeLabel = 'সার্বিক আর্থিক অনুমোদন';
        } else {
            $branchIds = Branch::pluck('id')->toArray();
            $roleLabel = 'অনুমোদক ড্যাশবোর্ড';
            $scopeLabel = 'সার্বিক পরিধি';
        }

        // 2. Resolve Period
        $period = trim((string) $request->query('period', 'monthly'));
        if (! in_array($period, ['today', 'monthly', 'date_to_date'], true)) {
            $period = 'monthly';
        }
        $dateFrom = $request->query('from_date') ? trim((string) $request->query('from_date')) : null;
        $dateTo = $request->query('to_date') ? trim((string) $request->query('to_date')) : null;

        $now = Carbon::now();
        $today = Carbon::today();
        if ($period === 'today') {
            $start = $today->copy()->startOfDay();
            $end = $today->copy()->endOfDay();
        } elseif ($period === 'monthly') {
            $start = $today->copy()->startOfMonth();
            $end = $today->copy()->endOfDay();
        } elseif ($period === 'date_to_date' && $dateFrom && $dateTo) {
            $start = Carbon::parse($dateFrom)->startOfDay();
            $end = Carbon::parse($dateTo)->endOfDay();
        } else {
            $start = $today->copy()->startOfMonth();
            $end = $today->copy()->endOfDay();
            $period = 'monthly';
        }
        $startStr = $start->toDateTimeString();
        $endStr = $end->toDateTimeString();

        $myBranches = Branch::whereIn('id', $branchIds)
            ->with('area.zone')
            ->get(['id', 'name', 'code', 'area_id']);

        // 3. Pending in this jurisdiction vs assigned to THIS user (must match /approvals)
        $pendingAdmissions = MemberAdmission::whereIn('branch_id', $branchIds)
            ->whereIn('status', ['submitted', 'under_review', 'pending_head_office'])
            ->get(['id']);

        $pendingLoans = LoanApplication::whereIn('branch_id', $branchIds)
            ->whereIn('status', ['submitted', 'under_review', 'pending_head_office'])
            ->get(['id']);

        $approvalService = app(ApprovalService::class);
        $myAdmissionIds = array_values(array_intersect(
            $approvalService->pendingAdmissionIdsForUser($user),
            $pendingAdmissions->pluck('id')->all()
        ));
        $myLoanIds = array_values(array_intersect(
            $approvalService->pendingLoanApplicationIdsForUser($user),
            $pendingLoans->pluck('id')->all()
        ));

        $admMyPending = count($myAdmissionIds);
        $lnMyPending = count($myLoanIds);
        $admOtherPending = max(0, $pendingAdmissions->count() - $admMyPending);
        $lnOtherPending = max(0, $pendingLoans->count() - $lnMyPending);

        // 4. Team-Based Reviews Assigned to THIS User
        $personalReviewsQuery = \App\Models\TeamBasedApprovalReview::where('user_id', $user->id);
        $teamPendingCount = (clone $personalReviewsQuery)->where('status', 'pending')->count();
        $teamApprovedCount = (clone $personalReviewsQuery)->where('status', 'approved')->count();
        $teamRejectedCount = (clone $personalReviewsQuery)->where('status', 'rejected')->count();

        $teamPendingProposedAmount = (float) (clone $personalReviewsQuery)
            ->where('status', 'pending')
            ->whereHas('item')
            ->join('team_based_approval_items', 'team_based_approval_reviews.team_based_approval_item_id', '=', 'team_based_approval_items.id')
            ->sum('team_based_approval_items.proposed_loan_amount');

        $teamApprovedAmount = (float) (clone $personalReviewsQuery)
            ->where('status', 'approved')
            ->sum('approved_amount');

        // Total Team Based Sheets in Jurisdiction
        $teamBasedQuery = \App\Models\TeamBasedApproval::whereIn('branch_id', $branchIds);
        $teamBasedStats = [
            'my_pending_reviews' => $teamPendingCount,
            'my_pending_amount' => $teamPendingProposedAmount,
            'my_approved_reviews' => $teamApprovedCount,
            'my_approved_amount' => $teamApprovedAmount,
            'jurisdiction_draft' => (clone $teamBasedQuery)->where('status', 'draft')->count(),
            'jurisdiction_submitted' => (clone $teamBasedQuery)->where('status', 'submitted')->count(),
            'jurisdiction_approved' => (clone $teamBasedQuery)->where('status', 'approved')->count(),
            'jurisdiction_rejected' => (clone $teamBasedQuery)->where('status', 'rejected')->count(),
        ];

        // 5. Approved in Jurisdiction
        $admApproved = MemberAdmission::whereIn('branch_id', $branchIds)->where('status', 'approved')->count();
        $lnApproved = LoanApplication::whereIn('branch_id', $branchIds)->where('status', 'approved')->count();
        $lnApprovedAmount = (float) LoanApplication::whereIn('branch_id', $branchIds)->where('status', 'approved')->sum('approved_amount');

        // 6. Pending Disbursement
        $lnPendingDisbursement = LoanApplication::whereIn('branch_id', $branchIds)->where('status', 'pending_disbursement')->count();
        $lnPendingDisbursementAmount = (float) LoanApplication::whereIn('branch_id', $branchIds)->where('status', 'pending_disbursement')->sum('approved_amount');

        // 7. Disbursed & Active in Jurisdiction
        $lnDisbursed = LoanApplication::whereIn('branch_id', $branchIds)->where('status', 'disbursed')->count();
        $lnDisbursedAmount = (float) LoanApplication::whereIn('branch_id', $branchIds)->where('status', 'disbursed')->sum('disbursed_amount');

        // 8. Returned for Correction in Jurisdiction
        $admNeedsCorrection = MemberAdmission::whereIn('branch_id', $branchIds)->where('status', 'needs_revision')->count();
        $lnNeedsCorrection = LoanApplication::whereIn('branch_id', $branchIds)->where('status', 'needs_correction')->count();

        // 9. Drafts in Jurisdiction
        $admDraft = MemberAdmission::whereIn('branch_id', $branchIds)->where('status', 'draft')->count();
        $lnDraft = LoanApplication::whereIn('branch_id', $branchIds)->where('status', 'draft')->count();

        // 10. Rejected in Jurisdiction
        $admRejected = MemberAdmission::whereIn('branch_id', $branchIds)->where('status', 'rejected')->count();
        $lnRejected = LoanApplication::whereIn('branch_id', $branchIds)->where('status', 'rejected')->count();

        // 11. Immediate Decision Action Queue for this Approver
        $urgentLoans = LoanApplication::whereIn('branch_id', $branchIds)
            ->whereIn('status', ['submitted', 'under_review', 'pending_head_office'])
            ->with(['memberAdmission:id,applicant_name_en,applicant_name_bn', 'loanProduct:id,product_name,product_name_bn', 'branch:id,name,code'])
            ->latest('updated_at')
            ->take(5)
            ->get()
            ->map(function ($l) {
                $name = $l->memberAdmission?->applicant_name_bn ?: $l->memberAdmission?->applicant_name_en;
                if (! $name && is_array($l->legacy_member_snapshot)) {
                    $name = $l->legacy_member_snapshot['applicant_name_bn'] ?? $l->legacy_member_snapshot['applicant_name_en'] ?? 'সদস্য';
                }

                return [
                    'id' => $l->id,
                    'type' => 'loan',
                    'application_no' => $l->application_no,
                    'applicant_name' => $name ?: '—',
                    'detail' => $l->loanProduct?->product_name_bn ?: ($l->loanProduct?->product_name ?: 'সাধারণ ঋণ'),
                    'branch_name' => $l->branch?->name ?? 'শাখা',
                    'amount' => (float) $l->requested_amount,
                    'status' => $l->status,
                    'created_at' => $l->created_at?->diffForHumans() ?? 'আজ',
                    'url' => "/member/loan-applications/{$l->id}",
                ];
            });

        $urgentAdmissions = MemberAdmission::whereIn('branch_id', $branchIds)
            ->whereIn('status', ['submitted', 'under_review', 'pending_head_office'])
            ->with(['memberCategory:id,category_name,category_name_bn', 'branch:id,name,code'])
            ->latest('updated_at')
            ->take(5)
            ->get()
            ->map(function ($a) {
                return [
                    'id' => $a->id,
                    'type' => 'admission',
                    'application_no' => $a->application_no,
                    'applicant_name' => $a->applicant_name_bn ?: ($a->applicant_name_en ?: 'নতুন সদস্য'),
                    'detail' => $a->memberCategory?->category_name_bn ?: ($a->memberCategory?->category_name ?: 'সাধারণ সদস্য'),
                    'branch_name' => $a->branch?->name ?? 'শাখা',
                    'amount' => null,
                    'status' => $a->status,
                    'created_at' => $a->created_at?->diffForHumans() ?? 'আজ',
                    'url' => "/member-admissions/{$a->id}",
                ];
            });

        $urgentTeamReviews = \App\Models\TeamBasedApprovalReview::with(['approval.branch', 'item'])
            ->where('user_id', $user->id)
            ->where('status', 'pending')
            ->latest('id')
            ->take(5)
            ->get()
            ->map(function ($review) {
                $item = $review->item;
                return [
                    'id' => $review->id,
                    'type' => 'team_based',
                    'application_no' => $item?->member_code ?? ('TBA-' . $review->team_based_approval_id),
                    'applicant_name' => $item?->member_name ?? 'টিম-বেসড ঋণ অনুমোদন',
                    'detail' => 'টিম ভিত্তিক আর্থিক অনুমোদন',
                    'branch_name' => $review->approval?->branch?->name ?? 'শাখা',
                    'amount' => $item ? (float) $item->proposed_loan_amount : null,
                    'status' => 'pending',
                    'created_at' => $review->created_at?->diffForHumans() ?? 'আজ',
                    'url' => '/team-based-approvals/for-approver',
                ];
            });

        $approverActionQueue = $urgentTeamReviews->concat($urgentLoans)->concat($urgentAdmissions)
            ->values()
            ->take(7);

        $approverStats = [
            'my_pending' => [
                'admission' => $admMyPending,
                'loan' => $lnMyPending,
                'total' => $admMyPending + $lnMyPending,
            ],
            'team_pending' => [
                'count' => $teamPendingCount,
                'proposed_amount' => $teamPendingProposedAmount,
                'approved_count' => $teamApprovedCount,
                'approved_amount' => $teamApprovedAmount,
            ],
            'other_pending' => [
                'admission' => $admOtherPending,
                'loan' => $lnOtherPending,
                'total' => $admOtherPending + $lnOtherPending,
            ],
            'approved' => [
                'admission' => $admApproved,
                'loan' => $lnApproved,
                'total' => $admApproved + $lnApproved,
                'amount' => $lnApprovedAmount,
            ],
            'pending_disbursement' => [
                'admission' => 0,
                'loan' => $lnPendingDisbursement,
                'total' => $lnPendingDisbursement,
                'amount' => $lnPendingDisbursementAmount,
            ],
            'active_disbursed' => [
                'admission' => 0,
                'loan' => $lnDisbursed,
                'total' => $lnDisbursed,
                'amount' => $lnDisbursedAmount,
            ],
            'needs_correction' => [
                'admission' => $admNeedsCorrection,
                'loan' => $lnNeedsCorrection,
                'total' => $admNeedsCorrection + $lnNeedsCorrection,
            ],
            'draft' => [
                'admission' => $admDraft,
                'loan' => $lnDraft,
                'total' => $admDraft + $lnDraft,
            ],
            'rejected' => [
                'admission' => $admRejected,
                'loan' => $lnRejected,
                'total' => $admRejected + $lnRejected,
            ],
            'totals' => [
                'admission' => MemberAdmission::whereIn('branch_id', $branchIds)->count(),
                'loan' => LoanApplication::whereIn('branch_id', $branchIds)->count(),
                'total' => MemberAdmission::whereIn('branch_id', $branchIds)->count() + LoanApplication::whereIn('branch_id', $branchIds)->count(),
            ],
        ];

        // 12. Subordinate Managers Breakdown with Name & Pending Counts
        $subordinateList = [];
        $subordinateTitle = '';
        $subordinateType = '';

        if ($approverType === 'area' || $roleName === Role::AREA_MANAGER) {
            $subordinateType = 'branch_managers';
            $subordinateTitle = 'শাখা ব্যবস্থাপকগণের নামভিত্তিক পেন্ডিং তালিকা (Branch Managers Pending)';
            $branches = Branch::whereIn('id', $branchIds)->with('area')->get();
            foreach ($branches as $branch) {
                $bmUser = User::where('branch_id', $branch->id)
                    ->whereHas('role', fn ($q) => $q->where('name', Role::BRANCH_MANAGER))
                    ->first();
                if (! $bmUser) {
                    $bmUser = User::where('branch_id', $branch->id)->first();
                }

                $admPendingCount = MemberAdmission::where('branch_id', $branch->id)
                    ->whereIn('status', ['submitted', 'under_review', 'pending_head_office'])
                    ->count();

                $loanPendingQuery = LoanApplication::where('branch_id', $branch->id)
                    ->whereIn('status', ['submitted', 'under_review', 'pending_head_office']);

                $loanPendingCount = (clone $loanPendingQuery)->count();
                $loanPendingAmount = (float) (clone $loanPendingQuery)->sum('requested_amount');

                $subordinateList[] = [
                    'id' => $branch->id,
                    'manager_id' => $bmUser?->id,
                    'manager_name' => $bmUser?->name ?? 'নিযুক্ত নেই',
                    'manager_phone' => $bmUser?->phone,
                    'manager_role' => 'শাখা ব্যবস্থাপক (BM)',
                    'unit_name' => $branch->name,
                    'unit_code' => $branch->code,
                    'parent_name' => $branch->area?->name ?? '—',
                    'admission_pending' => $admPendingCount,
                    'loan_pending' => $loanPendingCount,
                    'total_pending' => $admPendingCount + $loanPendingCount,
                    'loan_amount' => $loanPendingAmount,
                    'branches_count' => 1,
                ];
            }
        } elseif ($approverType === 'zone' || $roleName === Role::ZONE_MANAGER) {
            $subordinateType = 'regional_managers';
            $subordinateTitle = 'আঞ্চলিক ব্যবস্থাপকগণের নামভিত্তিক পেন্ডিং তালিকা (Regional / Area Managers Pending)';
            $areas = Area::whereIn('zone_id', $zoneIds ?? ($user->zone_id ? [$user->zone_id] : []))->with(['branches', 'zone'])->get();
            foreach ($areas as $area) {
                $rmUser = User::where(function ($q) use ($area) {
                        $q->where('area_id', $area->id)
                          ->orWhereHas('areas', fn ($sq) => $sq->where('areas.id', $area->id));
                    })
                    ->whereHas('role', fn ($q) => $q->where('name', Role::AREA_MANAGER))
                    ->first();

                $areaBranchIds = $area->branches->pluck('id')->toArray();

                $admPendingCount = MemberAdmission::whereIn('branch_id', $areaBranchIds)
                    ->whereIn('status', ['submitted', 'under_review', 'pending_head_office'])
                    ->count();

                $loanPendingQuery = LoanApplication::whereIn('branch_id', $areaBranchIds)
                    ->whereIn('status', ['submitted', 'under_review', 'pending_head_office']);

                $loanPendingCount = (clone $loanPendingQuery)->count();
                $loanPendingAmount = (float) (clone $loanPendingQuery)->sum('requested_amount');

                $subordinateList[] = [
                    'id' => $area->id,
                    'manager_id' => $rmUser?->id,
                    'manager_name' => $rmUser?->name ?? 'নিযুক্ত নেই',
                    'manager_phone' => $rmUser?->phone,
                    'manager_role' => 'আঞ্চলিক ব্যবস্থাপক (RM)',
                    'unit_name' => $area->name,
                    'unit_code' => $area->code,
                    'parent_name' => $area->zone?->name ?? '—',
                    'admission_pending' => $admPendingCount,
                    'loan_pending' => $loanPendingCount,
                    'total_pending' => $admPendingCount + $loanPendingCount,
                    'loan_amount' => $loanPendingAmount,
                    'branches_count' => count($areaBranchIds),
                ];
            }
        } else {
            // Financial / Senior Approvers (ADMF, DMF, ED, General Approver)
            $subordinateType = 'zonal_and_regional_managers';
            $subordinateTitle = 'জোনাল ও আঞ্চলিক ব্যবস্থাপকগণের নামভিত্তিক পেন্ডিং তালিকা (Zonal & Regional Managers Pending)';
            $zones = Zone::with(['areas.branches'])->get();
            foreach ($zones as $zone) {
                $zmUser = User::where(function ($q) use ($zone) {
                        $q->where('zone_id', $zone->id)
                          ->orWhereHas('zones', fn ($sq) => $sq->where('zones.id', $zone->id));
                    })
                    ->whereHas('role', fn ($q) => $q->where('name', Role::ZONE_MANAGER))
                    ->first();

                $zoneBranchIds = Branch::whereHas('area', fn ($q) => $q->where('zone_id', $zone->id))->pluck('id')->toArray();

                $admPendingCount = MemberAdmission::whereIn('branch_id', $zoneBranchIds)
                    ->whereIn('status', ['submitted', 'under_review', 'pending_head_office'])
                    ->count();

                $loanPendingQuery = LoanApplication::whereIn('branch_id', $zoneBranchIds)
                    ->whereIn('status', ['submitted', 'under_review', 'pending_head_office']);

                $loanPendingCount = (clone $loanPendingQuery)->count();
                $loanPendingAmount = (float) (clone $loanPendingQuery)->sum('requested_amount');

                $subordinateList[] = [
                    'id' => $zone->id,
                    'manager_id' => $zmUser?->id,
                    'manager_name' => $zmUser?->name ?? 'নিযুক্ত নেই',
                    'manager_phone' => $zmUser?->phone,
                    'manager_role' => 'জোনাল ম্যানেজার (ZM)',
                    'unit_name' => $zone->name,
                    'unit_code' => $zone->code,
                    'parent_name' => 'হেড অফিস',
                    'admission_pending' => $admPendingCount,
                    'loan_pending' => $loanPendingCount,
                    'total_pending' => $admPendingCount + $loanPendingCount,
                    'loan_amount' => $loanPendingAmount,
                    'branches_count' => count($zoneBranchIds),
                ];
            }
        }

        // Sort by highest pending count first
        usort($subordinateList, fn ($a, $b) => $b['total_pending'] <=> $a['total_pending']);

        $subordinateSummary = [
            'type' => $subordinateType,
            'title' => $subordinateTitle,
            'list' => $subordinateList,
            'total_managers' => count($subordinateList),
            'total_pending_all' => array_sum(array_column($subordinateList, 'total_pending')),
            'total_amount_all' => array_sum(array_column($subordinateList, 'loan_amount')),
        ];

        return Inertia::render('Dashboard/ApproverIndex', [
            'period' => $period,
            'dateFrom' => $period === 'date_to_date' ? $dateFrom : null,
            'dateTo' => $period === 'date_to_date' ? $dateTo : null,
            'myBranches' => $myBranches,
            'dashboardType' => 'approver',
            'approverStats' => $approverStats,
            'teamBasedStats' => $teamBasedStats,
            'approverActionQueue' => $approverActionQueue,
            'subordinateSummary' => $subordinateSummary,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'role' => $roleLabel,
                'scope' => $scopeLabel,
            ],
        ]);
    }

    /**
     * Head Office / SuperAdmin Dashboard
     * Comprehensive organization-wide command center focusing on Head Office pending approvals, national pipeline & portfolio
     */
    private function headOfficeDashboard($user, Request $request)
    {
        $period = trim((string) $request->query('period', 'monthly'));
        if (! in_array($period, ['today', 'monthly', 'date_to_date'], true)) {
            $period = 'monthly';
        }
        $dateFrom = $request->query('from_date') ? trim((string) $request->query('from_date')) : null;
        $dateTo = $request->query('to_date') ? trim((string) $request->query('to_date')) : null;

        $today = Carbon::today();
        if ($period === 'today') {
            $start = $today->copy()->startOfDay();
            $end = $today->copy()->endOfDay();
        } elseif ($period === 'monthly') {
            $start = $today->copy()->startOfMonth();
            $end = $today->copy()->endOfDay();
        } elseif ($period === 'date_to_date' && $dateFrom && $dateTo) {
            $start = Carbon::parse($dateFrom)->startOfDay();
            $end = Carbon::parse($dateTo)->endOfDay();
        } else {
            $start = $today->copy()->startOfMonth();
            $end = $today->copy()->endOfDay();
            $period = 'monthly';
        }

        // 1. Head Office Pending Approvals (১ম ও প্রধান কাজ)
        $admPendingHO = MemberAdmission::where('status', 'pending_head_office')->count();
        $lnPendingHO = LoanApplication::where('status', 'pending_head_office')->count();

        // 2. Ready for Head Office (শাখা থেকে পাঠানো প্রস্তুত)
        $admReadyHO = MemberAdmission::where('status', 'ready_for_head_office')->count();
        $lnReadyHO = LoanApplication::where('status', 'ready_for_head_office')->count();

        // 3. Team-Based Approvals at Head Office
        $tbPendingReviews = TeamBasedApprovalReview::where('status', 'pending')->count();
        $tbProposedAmount = (float) TeamBasedApprovalItem::whereHas('approval', fn ($q) => $q->where('status', '!=', 'draft'))->sum('proposed_loan_amount');
        $tbApprovedAmount = (float) TeamBasedApprovalReview::where('status', 'approved')->sum('approved_amount');

        // 4. Approved & Completed Nationwide
        $admApproved = MemberAdmission::where('status', 'approved')->count();
        $lnApproved = LoanApplication::where('status', 'approved')->count();
        $lnApprovedAmount = (float) LoanApplication::where('status', 'approved')->sum('approved_amount');

        // 5. Pending Disbursement
        $lnPendingDisbursement = LoanApplication::where('status', 'pending_disbursement')->count();
        $lnPendingDisbursementAmount = (float) LoanApplication::where('status', 'pending_disbursement')->sum('approved_amount');

        // 6. Active Disbursed Portfolio
        $lnDisbursed = LoanApplication::where('status', 'disbursed')->count();
        $lnDisbursedAmount = (float) LoanApplication::where('status', 'disbursed')->sum('disbursed_amount');

        // 7. In Branch / Field Stage
        $admBranchLevel = MemberAdmission::where('status', 'submitted')->count();
        $lnBranchLevel = LoanApplication::where('status', 'submitted')->count();

        // 8. In Area / Zone Review Stage
        $admAreaZoneLevel = MemberAdmission::where('status', 'under_review')->count();
        $lnAreaZoneLevel = LoanApplication::where('status', 'under_review')->count();

        // 9. Returned for Correction / Needs Revision
        $admNeedsCorrection = MemberAdmission::where('status', 'needs_revision')->count();
        $lnNeedsCorrection = LoanApplication::where('status', 'needs_correction')->count();

        // 10. Drafts
        $admDraft = MemberAdmission::where('status', 'draft')->count();
        $lnDraft = LoanApplication::where('status', 'draft')->count();

        // 11. Rejected
        $admRejected = MemberAdmission::where('status', 'rejected')->count();
        $lnRejected = LoanApplication::where('status', 'rejected')->count();

        // System Network Scale
        $systemScale = [
            'total_zones' => Zone::where('is_active', true)->count(),
            'total_areas' => Area::where('is_active', true)->count(),
            'total_branches' => Branch::where('is_active', true)->count(),
            'total_users' => User::where('is_active', true)->count(),
            'total_admissions' => MemberAdmission::count(),
            'total_loans' => LoanApplication::count(),
        ];

        // Immediate Action Queue for Head Office
        $urgentLoans = LoanApplication::whereIn('status', ['pending_head_office', 'ready_for_head_office'])
            ->with(['memberAdmission:id,applicant_name_en,applicant_name_bn', 'loanProduct:id,product_name,product_name_bn', 'branch:id,name,code'])
            ->latest('updated_at')
            ->take(5)
            ->get()
            ->map(function ($l) {
                $name = $l->memberAdmission?->applicant_name_bn ?: $l->memberAdmission?->applicant_name_en;
                if (! $name && is_array($l->legacy_member_snapshot)) {
                    $name = $l->legacy_member_snapshot['applicant_name_bn'] ?? $l->legacy_member_snapshot['applicant_name_en'] ?? 'সদস্য';
                }

                return [
                    'id' => $l->id,
                    'type' => 'loan',
                    'application_no' => $l->application_no,
                    'applicant_name' => $name ?: '—',
                    'detail' => $l->loanProduct?->product_name_bn ?: ($l->loanProduct?->product_name ?: 'সাধারণ ঋণ'),
                    'branch_name' => $l->branch?->name ?? 'শাখা',
                    'amount' => (float) $l->requested_amount,
                    'status' => $l->status,
                    'created_at' => $l->created_at?->diffForHumans() ?? 'আজ',
                    'url' => "/member/loan-applications/{$l->id}",
                ];
            });

        $urgentAdmissions = MemberAdmission::whereIn('status', ['pending_head_office', 'ready_for_head_office'])
            ->with(['memberCategory:id,category_name,category_name_bn', 'branch:id,name,code'])
            ->latest('updated_at')
            ->take(5)
            ->get()
            ->map(function ($a) {
                return [
                    'id' => $a->id,
                    'type' => 'admission',
                    'application_no' => $a->application_no,
                    'applicant_name' => $a->applicant_name_bn ?: ($a->applicant_name_en ?: 'নতুন সদস্য'),
                    'detail' => $a->memberCategory?->category_name_bn ?: ($a->memberCategory?->category_name ?: 'সাধারণ সদস্য'),
                    'branch_name' => $a->branch?->name ?? 'শাখা',
                    'amount' => null,
                    'status' => $a->status,
                    'created_at' => $a->created_at?->diffForHumans() ?? 'আজ',
                    'url' => "/member-admissions/{$a->id}",
                ];
            });

        $hoActionQueue = $urgentLoans->concat($urgentAdmissions)
            ->sortByDesc('created_at')
            ->values()
            ->take(7);

        $hoStats = [
            'pending_head_office' => [
                'admission' => $admPendingHO,
                'loan' => $lnPendingHO,
                'total' => $admPendingHO + $lnPendingHO,
            ],
            'ready_for_head_office' => [
                'admission' => $admReadyHO,
                'loan' => $lnReadyHO,
                'total' => $admReadyHO + $lnReadyHO,
            ],
            'team_based' => [
                'count' => $tbPendingReviews,
                'proposed_amount' => $tbProposedAmount,
                'approved_amount' => $tbApprovedAmount,
            ],
            'approved' => [
                'admission' => $admApproved,
                'loan' => $lnApproved,
                'total' => $admApproved + $lnApproved,
                'amount' => $lnApprovedAmount,
            ],
            'pending_disbursement' => [
                'admission' => 0,
                'loan' => $lnPendingDisbursement,
                'total' => $lnPendingDisbursement,
                'amount' => $lnPendingDisbursementAmount,
            ],
            'active_disbursed' => [
                'admission' => 0,
                'loan' => $lnDisbursed,
                'total' => $lnDisbursed,
                'amount' => $lnDisbursedAmount,
            ],
            'branch_level' => [
                'admission' => $admBranchLevel,
                'loan' => $lnBranchLevel,
                'total' => $admBranchLevel + $lnBranchLevel,
            ],
            'region_zone_level' => [
                'admission' => $admAreaZoneLevel,
                'loan' => $lnAreaZoneLevel,
                'total' => $admAreaZoneLevel + $lnAreaZoneLevel,
            ],
            'needs_correction' => [
                'admission' => $admNeedsCorrection,
                'loan' => $lnNeedsCorrection,
                'total' => $admNeedsCorrection + $lnNeedsCorrection,
            ],
            'draft' => [
                'admission' => $admDraft,
                'loan' => $lnDraft,
                'total' => $admDraft + $lnDraft,
            ],
            'rejected' => [
                'admission' => $admRejected,
                'loan' => $lnRejected,
                'total' => $admRejected + $lnRejected,
            ],
            'system_scale' => $systemScale,
        ];

        // 12. Head Office All Tiers Managers & Approvers Breakdown (RM up to Senior Approvers & BM)
        // A. Regional Managers (RM)
        $rmList = [];
        $areas = Area::with(['branches', 'zone'])->get();
        foreach ($areas as $area) {
            $rmUser = User::where(function ($q) use ($area) {
                    $q->where('area_id', $area->id)
                      ->orWhereHas('areas', fn ($sq) => $sq->where('areas.id', $area->id));
                })
                ->whereHas('role', fn ($q) => $q->where('name', Role::AREA_MANAGER))
                ->first();

            $areaBranchIds = $area->branches->pluck('id')->toArray();

            $admPendingCount = MemberAdmission::whereIn('branch_id', $areaBranchIds)
                ->whereIn('status', ['submitted', 'under_review', 'pending_head_office'])
                ->count();

            $loanPendingQuery = LoanApplication::whereIn('branch_id', $areaBranchIds)
                ->whereIn('status', ['submitted', 'under_review', 'pending_head_office']);

            $loanPendingCount = (clone $loanPendingQuery)->count();
            $loanPendingAmount = (float) (clone $loanPendingQuery)->sum('requested_amount');

            $rmList[] = [
                'id' => $area->id,
                'tier' => 'rm',
                'manager_id' => $rmUser?->id,
                'manager_name' => $rmUser?->name ?? 'নিযুক্ত নেই',
                'manager_phone' => $rmUser?->phone,
                'manager_role' => 'আঞ্চলিক ব্যবস্থাপক (RM)',
                'unit_name' => $area->name,
                'unit_code' => $area->code,
                'parent_name' => $area->zone?->name ?? '—',
                'admission_pending' => $admPendingCount,
                'loan_pending' => $loanPendingCount,
                'total_pending' => $admPendingCount + $loanPendingCount,
                'loan_amount' => $loanPendingAmount,
                'branches_count' => count($areaBranchIds),
            ];
        }
        usort($rmList, fn ($a, $b) => $b['total_pending'] <=> $a['total_pending']);

        // B. Zonal Managers (ZM)
        $zmList = [];
        $zones = Zone::with(['areas.branches'])->get();
        foreach ($zones as $zone) {
            $zmUser = User::where(function ($q) use ($zone) {
                    $q->where('zone_id', $zone->id)
                      ->orWhereHas('zones', fn ($sq) => $sq->where('zones.id', $zone->id));
                })
                ->whereHas('role', fn ($q) => $q->where('name', Role::ZONE_MANAGER))
                ->first();

            $zoneBranchIds = Branch::whereHas('area', fn ($q) => $q->where('zone_id', $zone->id))->pluck('id')->toArray();

            $admPendingCount = MemberAdmission::whereIn('branch_id', $zoneBranchIds)
                ->whereIn('status', ['submitted', 'under_review', 'pending_head_office'])
                ->count();

            $loanPendingQuery = LoanApplication::whereIn('branch_id', $zoneBranchIds)
                ->whereIn('status', ['submitted', 'under_review', 'pending_head_office']);

            $loanPendingCount = (clone $loanPendingQuery)->count();
            $loanPendingAmount = (float) (clone $loanPendingQuery)->sum('requested_amount');

            $zmList[] = [
                'id' => $zone->id,
                'tier' => 'zm',
                'manager_id' => $zmUser?->id,
                'manager_name' => $zmUser?->name ?? 'নিযুক্ত নেই',
                'manager_phone' => $zmUser?->phone,
                'manager_role' => 'জোনাল ম্যানেজার (ZM)',
                'unit_name' => $zone->name,
                'unit_code' => $zone->code,
                'parent_name' => 'হেড অফিস',
                'admission_pending' => $admPendingCount,
                'loan_pending' => $loanPendingCount,
                'total_pending' => $admPendingCount + $loanPendingCount,
                'loan_amount' => $loanPendingAmount,
                'branches_count' => count($zoneBranchIds),
                'areas_count' => $zone->areas->count(),
            ];
        }
        usort($zmList, fn ($a, $b) => $b['total_pending'] <=> $a['total_pending']);

        // C. Senior Approvers (ADMF, DMF, ED)
        $seniorApprovers = User::whereHas('role', fn ($q) => $q->whereIn('name', [Role::ADMF, Role::DMF, Role::ED]))
            ->with('role')
            ->get();
        $seniorList = [];
        foreach ($seniorApprovers as $sa) {
            $pendingReviews = TeamBasedApprovalReview::where('user_id', $sa->id)
                ->where('status', 'pending')
                ->count();
            $pendingProposedAmount = (float) TeamBasedApprovalReview::where('user_id', $sa->id)
                ->where('status', 'pending')
                ->join('team_based_approval_items', 'team_based_approval_reviews.team_based_approval_item_id', '=', 'team_based_approval_items.id')
                ->sum('team_based_approval_items.proposed_loan_amount');

            $roleTitle = match ($sa->role?->name) {
                Role::ADMF => 'সহকারী পরিচালক (ADMF)',
                Role::DMF => 'পরিচালক ক্ষুদ্রঋণ (DMF)',
                Role::ED => 'নির্বাহী পরিচালক (ED)',
                default => strtoupper($sa->role?->name ?? 'APPROVER'),
            };

            $seniorList[] = [
                'id' => $sa->id,
                'tier' => 'senior',
                'manager_id' => $sa->id,
                'manager_name' => $sa->name,
                'manager_phone' => $sa->phone,
                'manager_role' => $roleTitle,
                'unit_name' => 'হেড অফিস অনুমোদন টিম',
                'unit_code' => 'HO-APP',
                'parent_name' => 'প্রধান কার্যালয়',
                'admission_pending' => 0,
                'loan_pending' => $pendingReviews,
                'total_pending' => $pendingReviews,
                'loan_amount' => $pendingProposedAmount,
                'branches_count' => null,
            ];
        }
        usort($seniorList, fn ($a, $b) => $b['total_pending'] <=> $a['total_pending']);

        // D. Branch Managers (BM)
        $bmList = [];
        $allBranches = Branch::with('area.zone')->get();
        foreach ($allBranches as $branch) {
            $bmUser = User::where('branch_id', $branch->id)
                ->whereHas('role', fn ($q) => $q->where('name', Role::BRANCH_MANAGER))
                ->first();
            if (! $bmUser) {
                $bmUser = User::where('branch_id', $branch->id)->first();
            }

            $admPendingCount = MemberAdmission::where('branch_id', $branch->id)
                ->whereIn('status', ['submitted', 'under_review', 'pending_head_office'])
                ->count();

            $loanPendingQuery = LoanApplication::where('branch_id', $branch->id)
                ->whereIn('status', ['submitted', 'under_review', 'pending_head_office']);

            $loanPendingCount = (clone $loanPendingQuery)->count();
            $loanPendingAmount = (float) (clone $loanPendingQuery)->sum('requested_amount');

            $bmList[] = [
                'id' => $branch->id,
                'tier' => 'bm',
                'manager_id' => $bmUser?->id,
                'manager_name' => $bmUser?->name ?? 'নিযুক্ত নেই',
                'manager_phone' => $bmUser?->phone,
                'manager_role' => 'শাখা ব্যবস্থাপক (BM)',
                'unit_name' => $branch->name,
                'unit_code' => $branch->code,
                'parent_name' => ($branch->area?->name ?? '') . ($branch->area?->zone ? ' • ' . $branch->area->zone->name : ''),
                'admission_pending' => $admPendingCount,
                'loan_pending' => $loanPendingCount,
                'total_pending' => $admPendingCount + $loanPendingCount,
                'loan_amount' => $loanPendingAmount,
                'branches_count' => 1,
            ];
        }
        usort($bmList, fn ($a, $b) => $b['total_pending'] <=> $a['total_pending']);

        $hoManagersSummary = [
            'rm_list' => $rmList,
            'zm_list' => $zmList,
            'senior_list' => $seniorList,
            'bm_list' => $bmList,
            'total_rm' => count($rmList),
            'total_zm' => count($zmList),
            'total_senior' => count($seniorList),
            'total_bm' => count($bmList),
            'rm_total_pending' => array_sum(array_column($rmList, 'total_pending')),
            'zm_total_pending' => array_sum(array_column($zmList, 'total_pending')),
            'senior_total_pending' => array_sum(array_column($seniorList, 'total_pending')),
            'bm_total_pending' => array_sum(array_column($bmList, 'total_pending')),
        ];

        return Inertia::render('Dashboard/Index', [
            'period' => $period,
            'dateFrom' => $period === 'date_to_date' ? $dateFrom : null,
            'dateTo' => $period === 'date_to_date' ? $dateTo : null,
            'dashboardType' => 'head_office',
            'hoStats' => $hoStats,
            'hoActionQueue' => $hoActionQueue,
            'hoManagersSummary' => $hoManagersSummary,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'role' => 'প্রধান কার্যালয় (Head Office)',
            ],
        ]);
    }

    /**
     * Branch User Dashboard
     * Branch-specific statistics: Today (default), Monthly, or Date to Date
     */
    private function branchDashboard($user, Request $request)
    {
        $branchIds = $this->getUserBranchIds($user);
        if (empty($branchIds)) {
            return Inertia::render('Dashboard/BranchIndex', [
                'stats' => ['my_branches' => 0],
                'periodStats' => [],
                'todayBadges' => ['today_loan_submitted' => false, 'today_admission_submitted' => false, 'today_admission_count' => 0, 'today_loan_count' => 0],
                'period' => 'today',
                'dateFrom' => null,
                'dateTo' => null,
                'myBranches' => [],
                'dashboardType' => 'branch',
                'workflowStats' => [
                    'ready_for_head_office' => ['admission' => 0, 'loan' => 0, 'total' => 0],
                    'pending_head_office' => ['admission' => 0, 'loan' => 0, 'total' => 0],
                    'pending_branch_manager' => ['admission' => 0, 'loan' => 0, 'total' => 0],
                    'pending_area_manager' => ['admission' => 0, 'loan' => 0, 'total' => 0],
                    'pending_zone_manager' => ['admission' => 0, 'loan' => 0, 'total' => 0],
                    'pending_other_approvers' => ['admission' => 0, 'loan' => 0, 'total' => 0],
                    'pending_disbursement' => ['admission' => 0, 'loan' => 0, 'total' => 0, 'amount' => 0],
                    'active_disbursed' => ['admission' => 0, 'loan' => 0, 'total' => 0, 'amount' => 0],
                    'completed_approved' => ['admission' => 0, 'loan' => 0, 'total' => 0],
                    'needs_correction' => ['admission' => 0, 'loan' => 0, 'total' => 0],
                    'draft' => ['admission' => 0, 'loan' => 0, 'total' => 0],
                    'rejected' => ['admission' => 0, 'loan' => 0, 'total' => 0],
                    'totals' => ['admission' => 0, 'loan' => 0, 'total' => 0],
                ],
            ]);
        }

        $period = trim((string) $request->query('period', 'monthly'));
        if (! in_array($period, ['today', 'monthly', 'date_to_date'], true)) {
            $period = 'monthly';
        }
        $dateFrom = $request->query('from_date') ? trim((string) $request->query('from_date')) : null;
        $dateTo = $request->query('to_date') ? trim((string) $request->query('to_date')) : null;

        $today = Carbon::today();

        if ($period === 'monthly') {
            $start = $today->copy()->startOfMonth();
            $end = $today->copy()->endOfDay();
        } elseif ($period === 'date_to_date' && $dateFrom !== '' && $dateFrom !== null && $dateTo !== '' && $dateTo !== null) {
            $start = Carbon::parse($dateFrom)->startOfDay();
            $end = Carbon::parse($dateTo)->endOfDay();
            if ($start->isAfter($end)) {
                $start = $end->copy()->startOfDay();
            }
        } else {
            $start = $today->copy()->startOfMonth();
            $end = $today->copy()->endOfDay();
            $period = 'monthly';
        }

        $startStr = $start->toDateTimeString();
        $endStr = $end->toDateTimeString();

        // Period stats: submitted in range (submitted_at between start and end)
        $loanApplicationsSubmitted = LoanApplication::whereIn('branch_id', $branchIds)
            ->whereNotNull('submitted_at')
            ->whereBetween('submitted_at', [$startStr, $endStr])
            ->count();

        $memberAdmissionsSubmitted = MemberAdmission::whereIn('branch_id', $branchIds)
            ->whereNotNull('submitted_at')
            ->whereBetween('submitted_at', [$startStr, $endStr])
            ->count();

        // Approved in period: status=approved and reviewed_at in range
        $approvedInPeriod = LoanApplication::whereIn('branch_id', $branchIds)
            ->where('status', 'approved')
            ->whereNotNull('reviewed_at')
            ->whereBetween('reviewed_at', [$startStr, $endStr])
            ->count();

        // Rejected in period
        $rejectedInPeriod = LoanApplication::whereIn('branch_id', $branchIds)
            ->where('status', 'rejected')
            ->whereNotNull('reviewed_at')
            ->whereBetween('reviewed_at', [$startStr, $endStr])
            ->count();

        // Open issues (pending) for loan applications of this branch
        $issuesCount = LoanApplicationIssue::whereHas('loanApplication', function ($q) use ($branchIds) {
            $q->whereIn('branch_id', $branchIds);
        })->where('status', 'pending')->count();

        $periodStats = [
            'loan_applications_submitted' => $loanApplicationsSubmitted,
            'member_admissions_submitted' => $memberAdmissionsSubmitted,
            'approved' => $approvedInPeriod,
            'rejected' => $rejectedInPeriod,
            'issues_count' => $issuesCount,
        ];

        // Today badges: ajker admission pathano / ajker loan pathano
        $todayAdmissionCount = MemberAdmission::whereIn('branch_id', $branchIds)
            ->whereNotNull('submitted_at')
            ->whereDate('submitted_at', $today)
            ->count();

        $todayLoanCount = LoanApplication::whereIn('branch_id', $branchIds)
            ->whereNotNull('submitted_at')
            ->whereDate('submitted_at', $today)
            ->count();

        $todayBadges = [
            'today_admission_submitted' => $todayAdmissionCount > 0,
            'today_loan_submitted' => $todayLoanCount > 0,
            'today_admission_count' => $todayAdmissionCount,
            'today_loan_count' => $todayLoanCount,
        ];

        // Only this user's branch(es) with their Area and Zone names
        $myBranches = Branch::whereIn('id', $branchIds)
            ->with('area:id,name,code,zone_id', 'area.zone:id,name,code')
            ->get(['id', 'name', 'code', 'area_id'])
            ->toArray();

        // Calculate Team-Based stats for branch Dashboard
        $teamBasedQuery = \App\Models\TeamBasedApproval::whereIn('branch_id', $branchIds);
        if ($period === 'monthly') {
            $teamBasedQuery->whereBetween('sheet_date', [$startStr, $endStr]);
        } elseif ($period === 'date_to_date' && $dateFrom && $dateTo) {
            $teamBasedQuery->whereBetween('sheet_date', [$startStr, $endStr]);
        } else {
            $teamBasedQuery->whereDate('sheet_date', $today);
        }

        $teamBasedStats = [
            'draft_count' => (clone $teamBasedQuery)->where('status', 'draft')->count(),
            'pending_count' => (clone $teamBasedQuery)->where('status', 'submitted')->count(),
            'approved_count' => (clone $teamBasedQuery)->where('status', 'approved')->count(),
            'rejected_count' => (clone $teamBasedQuery)->where('status', 'rejected')->count(),
        ];

        // === COMPREHENSIVE WORKFLOW & PORTFOLIO BREAKDOWN ===
        // 1. Ready for Head Office
        $admReadyHO = MemberAdmission::whereIn('branch_id', $branchIds)->where('status', 'ready_for_head_office')->count();
        $lnReadyHO = LoanApplication::whereIn('branch_id', $branchIds)->where('status', 'ready_for_head_office')->count();

        // 2. Pending at Head Office
        $admPendingHO = MemberAdmission::whereIn('branch_id', $branchIds)->where('status', 'pending_head_office')->count();
        $lnPendingHO = LoanApplication::whereIn('branch_id', $branchIds)->where('status', 'pending_head_office')->count();

        // 3. Pending by Stage (Branch Manager, Area Manager, Zone Manager, Other Approvers)
        $pendingAdmissions = MemberAdmission::whereIn('branch_id', $branchIds)
            ->whereIn('status', ['submitted', 'under_review'])
            ->with(['approvals' => function ($q) {
                $q->orderBy('sequence');
            }])
            ->get();

        $admByLevel = ['branch' => 0, 'area' => 0, 'zone' => 0, 'other' => 0];
        foreach ($pendingAdmissions as $adm) {
            $curr = null;
            if ($adm->relationLoaded('approvals') && $adm->approvals->isNotEmpty()) {
                $pendingApprovals = $adm->approvals->where('status', 'pending')->sortBy('sequence');
                foreach ($pendingApprovals as $p) {
                    $prev = $adm->approvals->where('sequence', '<', $p->sequence);
                    if ($prev->every(fn ($a) => $a->status === 'approved')) {
                        $curr = $p;
                        break;
                    }
                }
            }
            if (! $curr) {
                $curr = $adm->currentPendingApproval();
            }

            if (! $curr) {
                $admByLevel['branch']++;
            } else {
                $lvl = strtolower((string) $curr->level);
                if ($lvl === 'branch' || str_contains($lvl, 'branch')) {
                    $admByLevel['branch']++;
                } elseif ($lvl === 'area' || str_contains($lvl, 'area')) {
                    $admByLevel['area']++;
                } elseif ($lvl === 'zone' || str_contains($lvl, 'zone')) {
                    $admByLevel['zone']++;
                } else {
                    $admByLevel['other']++;
                }
            }
        }

        $pendingLoans = LoanApplication::whereIn('branch_id', $branchIds)
            ->whereIn('status', ['submitted', 'under_review'])
            ->with(['approvals' => function ($q) {
                $q->orderBy('sequence');
            }])
            ->get();

        $lnByLevel = ['branch' => 0, 'area' => 0, 'zone' => 0, 'other' => 0];
        foreach ($pendingLoans as $loan) {
            $curr = null;
            if ($loan->relationLoaded('approvals') && $loan->approvals->isNotEmpty()) {
                $pendingApprovals = $loan->approvals->where('status', 'pending')->sortBy('sequence');
                foreach ($pendingApprovals as $p) {
                    $prev = $loan->approvals->where('sequence', '<', $p->sequence);
                    if ($prev->every(fn ($a) => $a->status === 'approved')) {
                        $curr = $p;
                        break;
                    }
                }
            }
            if (! $curr) {
                $curr = $loan->approvals()->where('status', 'pending')->orderBy('sequence')->first();
            }

            if (! $curr) {
                $lnByLevel['branch']++;
            } else {
                $lvl = strtolower((string) $curr->level);
                if ($lvl === 'branch' || str_contains($lvl, 'branch')) {
                    $lnByLevel['branch']++;
                } elseif ($lvl === 'area' || str_contains($lvl, 'area')) {
                    $lnByLevel['area']++;
                } elseif ($lvl === 'zone' || str_contains($lvl, 'zone')) {
                    $lnByLevel['zone']++;
                } else {
                    $lnByLevel['other']++;
                }
            }
        }

        // 4. Pending Disbursement (Awaiting Disbursement)
        $lnPendingDisbursementCount = LoanApplication::whereIn('branch_id', $branchIds)
            ->where('status', 'pending_disbursement')
            ->count();
        $lnPendingDisbursementAmount = (float) LoanApplication::whereIn('branch_id', $branchIds)
            ->where('status', 'pending_disbursement')
            ->sum('approved_amount');

        // 5. Active / Disbursed Loans
        $lnDisbursedCount = LoanApplication::whereIn('branch_id', $branchIds)
            ->where('status', 'disbursed')
            ->count();
        $lnDisbursedAmount = (float) LoanApplication::whereIn('branch_id', $branchIds)
            ->where('status', 'disbursed')
            ->sum('disbursed_amount');

        // 6. Approved / Complete
        $admApprovedCount = MemberAdmission::whereIn('branch_id', $branchIds)
            ->where('status', 'approved')
            ->count();
        $lnApprovedCount = LoanApplication::whereIn('branch_id', $branchIds)
            ->whereIn('status', ['approved', 'disbursed'])
            ->count();

        // 7. Needs Revision / Correction
        $admNeedsRevision = MemberAdmission::whereIn('branch_id', $branchIds)
            ->where('status', 'needs_revision')
            ->count();
        $lnNeedsCorrection = LoanApplication::whereIn('branch_id', $branchIds)
            ->where('status', 'needs_correction')
            ->count();

        // 8. Drafts
        $admDrafts = MemberAdmission::whereIn('branch_id', $branchIds)
            ->where('status', 'draft')
            ->count();
        $lnDrafts = LoanApplication::whereIn('branch_id', $branchIds)
            ->where('status', 'draft')
            ->count();

        // 9. Rejected
        $admRejected = MemberAdmission::whereIn('branch_id', $branchIds)
            ->where('status', 'rejected')
            ->count();
        $lnRejected = LoanApplication::whereIn('branch_id', $branchIds)
            ->where('status', 'rejected')
            ->count();

        // Totals
        $totalMembers = MemberAdmission::whereIn('branch_id', $branchIds)->count();
        $totalLoans = LoanApplication::whereIn('branch_id', $branchIds)->count();

        $workflowStats = [
            'ready_for_head_office' => [
                'admission' => $admReadyHO,
                'loan' => $lnReadyHO,
                'total' => $admReadyHO + $lnReadyHO,
            ],
            'pending_head_office' => [
                'admission' => $admPendingHO,
                'loan' => $lnPendingHO,
                'total' => $admPendingHO + $lnPendingHO,
            ],
            'pending_branch_manager' => [
                'admission' => $admByLevel['branch'],
                'loan' => $lnByLevel['branch'],
                'total' => $admByLevel['branch'] + $lnByLevel['branch'],
            ],
            'pending_area_manager' => [
                'admission' => $admByLevel['area'],
                'loan' => $lnByLevel['area'],
                'total' => $admByLevel['area'] + $lnByLevel['area'],
            ],
            'pending_zone_manager' => [
                'admission' => $admByLevel['zone'],
                'loan' => $lnByLevel['zone'],
                'total' => $admByLevel['zone'] + $lnByLevel['zone'],
            ],
            'pending_other_approvers' => [
                'admission' => $admByLevel['other'],
                'loan' => $lnByLevel['other'],
                'total' => $admByLevel['other'] + $lnByLevel['other'],
            ],
            'pending_disbursement' => [
                'admission' => 0,
                'loan' => $lnPendingDisbursementCount,
                'total' => $lnPendingDisbursementCount,
                'amount' => $lnPendingDisbursementAmount,
            ],
            'active_disbursed' => [
                'admission' => 0,
                'loan' => $lnDisbursedCount,
                'total' => $lnDisbursedCount,
                'amount' => $lnDisbursedAmount,
            ],
            'completed_approved' => [
                'admission' => $admApprovedCount,
                'loan' => $lnApprovedCount,
                'total' => $admApprovedCount + $lnApprovedCount,
            ],
            'needs_correction' => [
                'admission' => $admNeedsRevision,
                'loan' => $lnNeedsCorrection,
                'total' => $admNeedsRevision + $lnNeedsCorrection,
            ],
            'draft' => [
                'admission' => $admDrafts,
                'loan' => $lnDrafts,
                'total' => $admDrafts + $lnDrafts,
            ],
            'rejected' => [
                'admission' => $admRejected,
                'loan' => $lnRejected,
                'total' => $admRejected + $lnRejected,
            ],
            'totals' => [
                'admission' => $totalMembers,
                'loan' => $totalLoans,
                'total' => $totalMembers + $totalLoans,
            ],
        ];

        // Recent Applications for this branch (both Loans and Admissions)
        $recentLoans = LoanApplication::whereIn('branch_id', $branchIds)
            ->with(['memberAdmission:id,applicant_name_en,applicant_name_bn', 'loanProduct:id,product_name,product_name_bn'])
            ->latest('created_at')
            ->take(5)
            ->get(['id', 'application_no', 'member_admission_id', 'loan_product_id', 'requested_amount', 'status', 'created_at', 'legacy_member_snapshot'])
            ->map(function ($l) {
                $name = $l->memberAdmission?->applicant_name_bn ?: $l->memberAdmission?->applicant_name_en;
                if (! $name && is_array($l->legacy_member_snapshot)) {
                    $name = $l->legacy_member_snapshot['applicant_name_bn'] ?? $l->legacy_member_snapshot['applicant_name_en'] ?? 'সদস্য';
                }

                return [
                    'id' => $l->id,
                    'type' => 'loan',
                    'application_no' => $l->application_no,
                    'applicant_name' => $name ?: '—',
                    'detail' => $l->loanProduct?->product_name_bn ?: ($l->loanProduct?->product_name ?: 'সাধারণ ঋণ'),
                    'amount' => (float) $l->requested_amount,
                    'status' => $l->status,
                    'created_at' => $l->created_at?->diffForHumans() ?? 'আজ',
                    'url' => "/member/loan-applications/{$l->id}",
                ];
            });

        $recentAdmissions = MemberAdmission::whereIn('branch_id', $branchIds)
            ->with(['memberCategory:id,category_name,category_name_bn'])
            ->latest('created_at')
            ->take(5)
            ->get(['id', 'application_no', 'applicant_name_bn', 'applicant_name_en', 'member_category_id', 'status', 'created_at'])
            ->map(function ($a) {
                return [
                    'id' => $a->id,
                    'type' => 'admission',
                    'application_no' => $a->application_no,
                    'applicant_name' => $a->applicant_name_bn ?: ($a->applicant_name_en ?: 'নতুন সদস্য'),
                    'detail' => $a->memberCategory?->category_name_bn ?: ($a->memberCategory?->category_name ?: 'সাধারণ সদস্য'),
                    'amount' => null,
                    'status' => $a->status,
                    'created_at' => $a->created_at?->diffForHumans() ?? 'আজ',
                    'url' => "/member-admissions/{$a->id}",
                ];
            });

        $recentApplications = $recentLoans->concat($recentAdmissions)
            ->sortByDesc('created_at')
            ->values()
            ->take(6);

        return Inertia::render('Dashboard/BranchIndex', [
            'stats' => ['my_branches' => count($branchIds)],
            'periodStats' => $periodStats,
            'todayBadges' => $todayBadges,
            'period' => $period,
            'dateFrom' => $period === 'date_to_date' ? $dateFrom : null,
            'dateTo' => $period === 'date_to_date' ? $dateTo : null,
            'myBranches' => $myBranches,
            'dashboardType' => 'branch',
            'teamBasedStats' => $teamBasedStats,
            'workflowStats' => $workflowStats,
            'recentApplications' => $recentApplications,
        ]);
    }

    /**
     * Field Officer (FO) Dashboard
     * Streamlined overview for loan proposal preparation, manager tracking, higher approvals & achievements
     */
    private function fieldOfficerDashboard($user, Request $request)
    {
        $branchIds = $this->getUserBranchIds($user);
        $period = $request->get('period', 'monthly');
        $dateFrom = $request->get('from_date');
        $dateTo = $request->get('to_date');

        $now = Carbon::now();
        $today = $now->toDateString();

        if ($period === 'today') {
            $start = $now->copy()->startOfDay();
            $end = $now->copy()->endOfDay();
        } elseif ($period === 'monthly') {
            $start = $now->copy()->startOfMonth();
            $end = $now->copy()->endOfMonth();
        } elseif ($period === 'date_to_date' && $dateFrom && $dateTo) {
            $start = Carbon::parse($dateFrom)->startOfDay();
            $end = Carbon::parse($dateTo)->endOfDay();
        } else {
            $start = $now->copy()->startOfMonth();
            $end = $now->copy()->endOfMonth();
        }

        $myBranches = Branch::whereIn('id', $branchIds)
            ->with(['area.zone'])
            ->get();

        // Check if there are applications explicitly tagged to this FO user
        $hasSpecificAdm = MemberAdmission::where(function ($q) use ($user) {
            $q->where('created_by', $user->id)
                ->orWhere('submitted_by', $user->id)
                ->orWhere('assigned_officer_id', $user->id);
        })->exists();

        $hasSpecificLoan = LoanApplication::where(function ($q) use ($user) {
            $q->where('submitted_by', $user->id);
        })->exists();

        // Scope queries: if FO has tagged applications, use their items; else scope to branch
        $applyAdmScope = function ($query) use ($user, $branchIds, $hasSpecificAdm) {
            if ($hasSpecificAdm) {
                return $query->where(function ($q) use ($user) {
                    $q->where('created_by', $user->id)
                        ->orWhere('submitted_by', $user->id)
                        ->orWhere('assigned_officer_id', $user->id);
                });
            }
            return ! empty($branchIds) ? $query->whereIn('branch_id', $branchIds) : $query;
        };

        $applyLoanScope = function ($query) use ($user, $branchIds, $hasSpecificLoan) {
            if ($hasSpecificLoan) {
                return $query->where(function ($q) use ($user) {
                    $q->where('submitted_by', $user->id);
                });
            }
            return ! empty($branchIds) ? $query->whereIn('branch_id', $branchIds) : $query;
        };

        // 1. Draft Applications (খসড়া আবেদন - জমা দেওয়ার অপেক্ষায়)
        $admDraft = $applyAdmScope(MemberAdmission::query())->where('status', 'draft')->count();
        $lnDraft = $applyLoanScope(LoanApplication::query())->where('status', 'draft')->count();

        // 2. Pending with Branch Manager (ম্যানেজারের কাছে পেন্ডিং)
        $admPendingBM = $applyAdmScope(MemberAdmission::query())->where('status', 'submitted')->count();
        $lnPendingBM = $applyLoanScope(LoanApplication::query())->where('status', 'submitted')->count();

        // 3. Higher Approvers (উর্ধ্বতন অনুমোদক - RM / ZM / ADMF / DMF / ED / HO)
        $higherStatuses = ['under_review', 'ready_for_head_office', 'pending_head_office'];
        $admHigher = $applyAdmScope(MemberAdmission::query())->whereIn('status', $higherStatuses)->count();
        $lnHigher = $applyLoanScope(LoanApplication::query())->whereIn('status', $higherStatuses)->count();

        // 4. Returned for Correction (সংশোধনের জন্য ফেরত)
        $admCorrection = $applyAdmScope(MemberAdmission::query())->whereIn('status', ['needs_correction', 'needs_revision'])->count();
        $lnCorrection = $applyLoanScope(LoanApplication::query())->whereIn('status', ['needs_correction', 'needs_revision'])->count();

        // 5. Approved & Ready for Disbursement (অনুমোদিত আবেদনসমূহ)
        $admApproved = $applyAdmScope(MemberAdmission::query())->where('status', 'approved')->count();
        $lnApproved = $applyLoanScope(LoanApplication::query())->whereIn('status', ['approved', 'pending_disbursement'])->count();
        $lnApprovedAmount = (float) $applyLoanScope(LoanApplication::query())->whereIn('status', ['approved', 'pending_disbursement'])->sum('approved_amount');

        // 6. Disbursed / Active Portfolio (বিতরণকৃত ও সক্রিয় ঋণ)
        $lnDisbursed = $applyLoanScope(LoanApplication::query())->where('status', 'disbursed')->count();
        $lnDisbursedAmount = (float) $applyLoanScope(LoanApplication::query())->where('status', 'disbursed')->sum('disbursed_amount');

        // 7. Rejected / Cancelled (বাতিল / প্রত্যাখ্যাত)
        $admRejected = $applyAdmScope(MemberAdmission::query())->where('status', 'rejected')->count();
        $lnRejected = $applyLoanScope(LoanApplication::query())->where('status', 'rejected')->count();

        // Total Counts
        $totalAdm = $applyAdmScope(MemberAdmission::query())->count();
        $totalLoan = $applyLoanScope(LoanApplication::query())->count();

        // Recent Applications for FO
        $recentLoans = $applyLoanScope(LoanApplication::query())
            ->with(['memberAdmission:id,applicant_name_en,applicant_name_bn', 'loanProduct:id,product_name,product_name_bn'])
            ->latest('created_at')
            ->take(5)
            ->get(['id', 'application_no', 'member_admission_id', 'loan_product_id', 'requested_amount', 'status', 'created_at', 'legacy_member_snapshot'])
            ->map(function ($l) {
                $name = $l->memberAdmission?->applicant_name_bn ?: $l->memberAdmission?->applicant_name_en;
                if (! $name && is_array($l->legacy_member_snapshot)) {
                    $name = $l->legacy_member_snapshot['applicant_name_bn'] ?? $l->legacy_member_snapshot['applicant_name_en'] ?? 'সদস্য';
                }

                return [
                    'id' => $l->id,
                    'type' => 'loan',
                    'application_no' => $l->application_no,
                    'applicant_name' => $name ?: '—',
                    'detail' => $l->loanProduct?->product_name_bn ?: ($l->loanProduct?->product_name ?: 'সাধারণ ঋণ'),
                    'amount' => (float) $l->requested_amount,
                    'status' => $l->status,
                    'created_at' => $l->created_at?->diffForHumans() ?? 'আজ',
                    'url' => "/member/loan-applications/{$l->id}",
                ];
            });

        $recentAdmissions = $applyAdmScope(MemberAdmission::query())
            ->with(['memberCategory:id,category_name,category_name_bn'])
            ->latest('created_at')
            ->take(5)
            ->get(['id', 'application_no', 'applicant_name_bn', 'applicant_name_en', 'member_category_id', 'status', 'created_at'])
            ->map(function ($a) {
                return [
                    'id' => $a->id,
                    'type' => 'admission',
                    'application_no' => $a->application_no,
                    'applicant_name' => $a->applicant_name_bn ?: ($a->applicant_name_en ?: 'নতুন সদস্য'),
                    'detail' => $a->memberCategory?->category_name_bn ?: ($a->memberCategory?->category_name ?: 'সাধারণ সদস্য'),
                    'amount' => null,
                    'status' => $a->status,
                    'created_at' => $a->created_at?->diffForHumans() ?? 'আজ',
                    'url' => "/member-admissions/{$a->id}",
                ];
            });

        $recentApplications = $recentLoans->concat($recentAdmissions)
            ->sortByDesc('created_at')
            ->values()
            ->take(6);

        $foStats = [
            'draft' => [
                'admission' => $admDraft,
                'loan' => $lnDraft,
                'total' => $admDraft + $lnDraft,
            ],
            'pending_manager' => [
                'admission' => $admPendingBM,
                'loan' => $lnPendingBM,
                'total' => $admPendingBM + $lnPendingBM,
            ],
            'higher_approvers' => [
                'admission' => $admHigher,
                'loan' => $lnHigher,
                'total' => $admHigher + $lnHigher,
            ],
            'needs_correction' => [
                'admission' => $admCorrection,
                'loan' => $lnCorrection,
                'total' => $admCorrection + $lnCorrection,
            ],
            'approved' => [
                'admission' => $admApproved,
                'loan' => $lnApproved,
                'total' => $admApproved + $lnApproved,
                'amount' => $lnApprovedAmount,
            ],
            'disbursed' => [
                'admission' => 0,
                'loan' => $lnDisbursed,
                'total' => $lnDisbursed,
                'amount' => $lnDisbursedAmount,
            ],
            'rejected' => [
                'admission' => $admRejected,
                'loan' => $lnRejected,
                'total' => $admRejected + $lnRejected,
            ],
            'totals' => [
                'admission' => $totalAdm,
                'loan' => $totalLoan,
                'total' => $totalAdm + $totalLoan,
            ],
        ];

        return Inertia::render('Dashboard/FieldOfficerIndex', [
            'period' => $period,
            'dateFrom' => $period === 'date_to_date' ? $dateFrom : null,
            'dateTo' => $period === 'date_to_date' ? $dateTo : null,
            'myBranches' => $myBranches,
            'dashboardType' => 'field_officer',
            'foStats' => $foStats,
            'recentApplications' => $recentApplications,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'role' => 'মাঠ কর্মকর্তা (Field Officer)',
                'branch' => $myBranches[0]->name ?? 'শাখা',
            ],
        ]);
    }

    /**
     * Branch Manager (BM) Dashboard
     * Focus on BM pending approvals first, higher hierarchy tracking (RM, ZM, ADMF, DMF, ED, HO), and branch operations
     */
    private function branchManagerDashboard($user, Request $request)
    {
        $branchIds = $this->getUserBranchIds($user);
        $period = $request->get('period', 'monthly');
        $dateFrom = $request->get('from_date');
        $dateTo = $request->get('to_date');

        $now = Carbon::now();
        $today = $now->toDateString();

        if ($period === 'today') {
            $startStr = $now->copy()->startOfDay()->toDateTimeString();
            $endStr = $now->copy()->endOfDay()->toDateTimeString();
        } elseif ($period === 'monthly') {
            $startStr = $now->copy()->startOfMonth()->toDateTimeString();
            $endStr = $now->copy()->endOfMonth()->toDateTimeString();
        } elseif ($period === 'date_to_date' && $dateFrom && $dateTo) {
            $startStr = Carbon::parse($dateFrom)->startOfDay()->toDateTimeString();
            $endStr = Carbon::parse($dateTo)->endOfDay()->toDateTimeString();
        } else {
            $startStr = $now->copy()->startOfMonth()->toDateTimeString();
            $endStr = $now->copy()->endOfMonth()->toDateTimeString();
        }

        $myBranches = Branch::whereIn('id', $branchIds)
            ->with(['area.zone'])
            ->get();

        // 1. Ready for Head Office
        $admReadyHO = MemberAdmission::whereIn('branch_id', $branchIds)->where('status', 'ready_for_head_office')->count();
        $lnReadyHO = LoanApplication::whereIn('branch_id', $branchIds)->where('status', 'ready_for_head_office')->count();

        // 2. Pending at Head Office
        $admPendingHO = MemberAdmission::whereIn('branch_id', $branchIds)->where('status', 'pending_head_office')->count();
        $lnPendingHO = LoanApplication::whereIn('branch_id', $branchIds)->where('status', 'pending_head_office')->count();

        // 3. Pending by Stage (Branch Manager, Area Manager, Zone Manager, Other Approvers)
        $pendingAdmissions = MemberAdmission::whereIn('branch_id', $branchIds)
            ->whereIn('status', ['submitted', 'under_review'])
            ->with(['approvals' => function ($q) {
                $q->orderBy('sequence');
            }])
            ->get();

        $admByLevel = ['branch' => 0, 'area' => 0, 'zone' => 0, 'other' => 0];
        foreach ($pendingAdmissions as $adm) {
            $curr = null;
            if ($adm->relationLoaded('approvals') && $adm->approvals->isNotEmpty()) {
                $pendingApprovals = $adm->approvals->where('status', 'pending')->sortBy('sequence');
                foreach ($pendingApprovals as $p) {
                    $prev = $adm->approvals->where('sequence', '<', $p->sequence);
                    if ($prev->every(fn ($a) => $a->status === 'approved')) {
                        $curr = $p;
                        break;
                    }
                }
            }
            if (! $curr) {
                $curr = $adm->currentPendingApproval();
            }

            if (! $curr) {
                $admByLevel['branch']++;
            } else {
                $lvl = strtolower((string) $curr->level);
                if ($lvl === 'branch' || str_contains($lvl, 'branch')) {
                    $admByLevel['branch']++;
                } elseif ($lvl === 'area' || str_contains($lvl, 'area')) {
                    $admByLevel['area']++;
                } elseif ($lvl === 'zone' || str_contains($lvl, 'zone')) {
                    $admByLevel['zone']++;
                } else {
                    $admByLevel['other']++;
                }
            }
        }

        $pendingLoans = LoanApplication::whereIn('branch_id', $branchIds)
            ->whereIn('status', ['submitted', 'under_review'])
            ->with(['approvals' => function ($q) {
                $q->orderBy('sequence');
            }])
            ->get();

        $lnByLevel = ['branch' => 0, 'area' => 0, 'zone' => 0, 'other' => 0];
        foreach ($pendingLoans as $loan) {
            $curr = null;
            if ($loan->relationLoaded('approvals') && $loan->approvals->isNotEmpty()) {
                $pendingApprovals = $loan->approvals->where('status', 'pending')->sortBy('sequence');
                foreach ($pendingApprovals as $p) {
                    $prev = $loan->approvals->where('sequence', '<', $p->sequence);
                    if ($prev->every(fn ($a) => $a->status === 'approved')) {
                        $curr = $p;
                        break;
                    }
                }
            }
            if (! $curr) {
                $curr = $loan->approvals()->where('status', 'pending')->orderBy('sequence')->first();
            }

            if (! $curr) {
                $lnByLevel['branch']++;
            } else {
                $lvl = strtolower((string) $curr->level);
                if ($lvl === 'branch' || str_contains($lvl, 'branch')) {
                    $lnByLevel['branch']++;
                } elseif ($lvl === 'area' || str_contains($lvl, 'area')) {
                    $lnByLevel['area']++;
                } elseif ($lvl === 'zone' || str_contains($lvl, 'zone')) {
                    $lnByLevel['zone']++;
                } else {
                    $lnByLevel['other']++;
                }
            }
        }

        // 4. Pending Disbursement
        $lnPendingDisbursementCount = LoanApplication::whereIn('branch_id', $branchIds)
            ->where('status', 'pending_disbursement')
            ->count();
        $lnPendingDisbursementAmount = (float) LoanApplication::whereIn('branch_id', $branchIds)
            ->where('status', 'pending_disbursement')
            ->sum('approved_amount');

        // 5. Active Disbursed Loans
        $lnDisbursedCount = LoanApplication::whereIn('branch_id', $branchIds)
            ->where('status', 'disbursed')
            ->count();
        $lnDisbursedAmount = (float) LoanApplication::whereIn('branch_id', $branchIds)
            ->where('status', 'disbursed')
            ->sum('disbursed_amount');

        // 6. Fully Completed / Approved
        $admApprovedCount = MemberAdmission::whereIn('branch_id', $branchIds)
            ->where('status', 'approved')
            ->count();
        $lnApprovedCount = LoanApplication::whereIn('branch_id', $branchIds)
            ->where('status', 'approved')
            ->count();

        // 7. Needs Correction / Revision
        $admNeedsRevision = MemberAdmission::whereIn('branch_id', $branchIds)
            ->where('status', 'needs_revision')
            ->count();
        $lnNeedsCorrection = LoanApplication::whereIn('branch_id', $branchIds)
            ->where('status', 'needs_correction')
            ->count();

        // 8. Drafts
        $admDrafts = MemberAdmission::whereIn('branch_id', $branchIds)
            ->where('status', 'draft')
            ->count();
        $lnDrafts = LoanApplication::whereIn('branch_id', $branchIds)
            ->where('status', 'draft')
            ->count();

        // 9. Rejected
        $admRejected = MemberAdmission::whereIn('branch_id', $branchIds)
            ->where('status', 'rejected')
            ->count();
        $lnRejected = LoanApplication::whereIn('branch_id', $branchIds)
            ->where('status', 'rejected')
            ->count();

        // Total Counts
        $totalMembers = MemberAdmission::whereIn('branch_id', $branchIds)->count();
        $totalLoans = LoanApplication::whereIn('branch_id', $branchIds)->count();

        // Team-Based Approval stats for Branch Manager
        $teamBasedQuery = \App\Models\TeamBasedApproval::whereIn('branch_id', $branchIds);
        $teamBasedStats = [
            'draft_count' => (clone $teamBasedQuery)->where('status', 'draft')->count(),
            'pending_count' => (clone $teamBasedQuery)->where('status', 'submitted')->count(),
            'approved_count' => (clone $teamBasedQuery)->where('status', 'approved')->count(),
            'rejected_count' => (clone $teamBasedQuery)->where('status', 'rejected')->count(),
        ];

        // Specific urgent queue for Branch Manager to review right now
        $bmUrgentLoans = LoanApplication::whereIn('branch_id', $branchIds)
            ->where('status', 'submitted')
            ->with(['memberAdmission:id,applicant_name_en,applicant_name_bn', 'loanProduct:id,product_name,product_name_bn'])
            ->latest('created_at')
            ->take(5)
            ->get(['id', 'application_no', 'member_admission_id', 'loan_product_id', 'requested_amount', 'status', 'created_at', 'legacy_member_snapshot'])
            ->map(function ($l) {
                $name = $l->memberAdmission?->applicant_name_bn ?: $l->memberAdmission?->applicant_name_en;
                if (! $name && is_array($l->legacy_member_snapshot)) {
                    $name = $l->legacy_member_snapshot['applicant_name_bn'] ?? $l->legacy_member_snapshot['applicant_name_en'] ?? 'সদস্য';
                }

                return [
                    'id' => $l->id,
                    'type' => 'loan',
                    'application_no' => $l->application_no,
                    'applicant_name' => $name ?: '—',
                    'detail' => $l->loanProduct?->product_name_bn ?: ($l->loanProduct?->product_name ?: 'সাধারণ ঋণ'),
                    'amount' => (float) $l->requested_amount,
                    'status' => $l->status,
                    'created_at' => $l->created_at?->diffForHumans() ?? 'আজ',
                    'url' => "/member/loan-applications/{$l->id}",
                ];
            });

        $bmUrgentAdmissions = MemberAdmission::whereIn('branch_id', $branchIds)
            ->where('status', 'submitted')
            ->with(['memberCategory:id,category_name,category_name_bn'])
            ->latest('created_at')
            ->take(5)
            ->get(['id', 'application_no', 'applicant_name_bn', 'applicant_name_en', 'member_category_id', 'status', 'created_at'])
            ->map(function ($a) {
                return [
                    'id' => $a->id,
                    'type' => 'admission',
                    'application_no' => $a->application_no,
                    'applicant_name' => $a->applicant_name_bn ?: ($a->applicant_name_en ?: 'নতুন সদস্য'),
                    'detail' => $a->memberCategory?->category_name_bn ?: ($a->memberCategory?->category_name ?: 'সাধারণ সদস্য'),
                    'amount' => null,
                    'status' => $a->status,
                    'created_at' => $a->created_at?->diffForHumans() ?? 'আজ',
                    'url' => "/member-admissions/{$a->id}",
                ];
            });

        $bmActionQueue = $bmUrgentLoans->concat($bmUrgentAdmissions)
            ->sortByDesc('created_at')
            ->values()
            ->take(6);

        $bmStats = [
            'my_pending' => [
                'admission' => $admByLevel['branch'],
                'loan' => $lnByLevel['branch'],
                'total' => $admByLevel['branch'] + $lnByLevel['branch'],
            ],
            'pending_area_manager' => [
                'admission' => $admByLevel['area'],
                'loan' => $lnByLevel['area'],
                'total' => $admByLevel['area'] + $lnByLevel['area'],
            ],
            'pending_zone_manager' => [
                'admission' => $admByLevel['zone'],
                'loan' => $lnByLevel['zone'],
                'total' => $admByLevel['zone'] + $lnByLevel['zone'],
            ],
            'pending_other_approvers' => [
                'admission' => $admByLevel['other'],
                'loan' => $lnByLevel['other'],
                'total' => $admByLevel['other'] + $lnByLevel['other'],
            ],
            'pending_head_office' => [
                'admission' => $admPendingHO,
                'loan' => $lnPendingHO,
                'total' => $admPendingHO + $lnPendingHO,
            ],
            'ready_for_head_office' => [
                'admission' => $admReadyHO,
                'loan' => $lnReadyHO,
                'total' => $admReadyHO + $lnReadyHO,
            ],
            'pending_disbursement' => [
                'admission' => 0,
                'loan' => $lnPendingDisbursementCount,
                'total' => $lnPendingDisbursementCount,
                'amount' => $lnPendingDisbursementAmount,
            ],
            'active_disbursed' => [
                'admission' => 0,
                'loan' => $lnDisbursedCount,
                'total' => $lnDisbursedCount,
                'amount' => $lnDisbursedAmount,
            ],
            'completed_approved' => [
                'admission' => $admApprovedCount,
                'loan' => $lnApprovedCount,
                'total' => $admApprovedCount + $lnApprovedCount,
            ],
            'needs_correction' => [
                'admission' => $admNeedsRevision,
                'loan' => $lnNeedsCorrection,
                'total' => $admNeedsRevision + $lnNeedsCorrection,
            ],
            'draft' => [
                'admission' => $admDrafts,
                'loan' => $lnDrafts,
                'total' => $admDrafts + $lnDrafts,
            ],
            'rejected' => [
                'admission' => $admRejected,
                'loan' => $lnRejected,
                'total' => $admRejected + $lnRejected,
            ],
            'totals' => [
                'admission' => $totalMembers,
                'loan' => $totalLoans,
                'total' => $totalMembers + $totalLoans,
            ],
        ];

        return Inertia::render('Dashboard/BranchManagerIndex', [
            'period' => $period,
            'dateFrom' => $period === 'date_to_date' ? $dateFrom : null,
            'dateTo' => $period === 'date_to_date' ? $dateTo : null,
            'myBranches' => $myBranches,
            'dashboardType' => 'branch_manager',
            'bmStats' => $bmStats,
            'bmActionQueue' => $bmActionQueue,
            'teamBasedStats' => $teamBasedStats,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'role' => 'শাখা ব্যবস্থাপক (Branch Manager)',
                'branch' => $myBranches[0]->name ?? 'শাখা',
            ],
        ]);
    }

    /**
     * Get user's accessible branch IDs
     */
    private function getUserBranchIds($user)
    {
        if ($user->branch_id) {
            return [$user->branch_id];
        } elseif ($user->branches()->exists()) {
            return $user->branches()->pluck('branches.id')->toArray();
        }

        return [];
    }
}
