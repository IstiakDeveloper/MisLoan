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

        // Check if user is Head Office/SuperAdmin or Branch User
        $isHeadOffice = $user->has_all_access;

        if ($isHeadOffice) {
            return $this->headOfficeDashboard($user, $request);
        } else {
            return $this->branchDashboard($user, $request);
        }
    }

    /**
     * Head Office / SuperAdmin Dashboard
     * Period filter (Today / Monthly / Date to Date), branch submission summary, system stats
     */
    private function headOfficeDashboard($user, Request $request)
    {
        $period = trim((string) $request->query('period', 'today'));
        if (! in_array($period, ['today', 'monthly', 'date_to_date'], true)) {
            $period = 'today';
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
            $start = $today->copy()->startOfDay();
            $end = $today->copy()->endOfDay();
            $period = 'today';
        }
        $startStr = $start->toDateTimeString();
        $endStr = $end->toDateTimeString();

        // System-wide stats (all time)
        $totalBranches = Branch::where('is_active', true)->count();
        $stats = [
            'total_users' => User::where('is_active', true)->count(),
            'total_zones' => Zone::where('is_active', true)->count(),
            'total_areas' => Area::where('is_active', true)->count(),
            'total_branches' => $totalBranches,
            'total_roles' => Role::count(),
            'total_applications' => LoanApplication::count(),
            'pending_applications' => LoanApplication::whereIn('status', ['submitted', 'under_review', 'pending_head_office'])->count(),
            'approved_applications' => LoanApplication::where('status', 'approved')->count(),
        ];

        // Branches that submitted at least one loan application in the period
        $submittedBranchIds = LoanApplication::whereNotNull('submitted_at')
            ->whereBetween('submitted_at', [$startStr, $endStr])
            ->distinct()
            ->pluck('branch_id')
            ->toArray();

        $branchesSubmittedCount = count(array_filter($submittedBranchIds));
        $branchesPendingCount = $totalBranches - $branchesSubmittedCount;

        $allBranches = Branch::where('is_active', true)->with('area:id,name,zone_id', 'area.zone:id,name')->get(['id', 'name', 'code', 'area_id']);
        $submittedBranches = $allBranches->whereIn('id', $submittedBranchIds)->values()->toArray();
        $missingBranches = $allBranches->whereNotIn('id', $submittedBranchIds)->values()->toArray();

        // Period stats (system-wide, in date range)
        $periodStats = [
            'loan_applications_submitted' => LoanApplication::whereNotNull('submitted_at')->whereBetween('submitted_at', [$startStr, $endStr])->count(),
            'member_admissions_submitted' => MemberAdmission::whereNotNull('submitted_at')->whereBetween('submitted_at', [$startStr, $endStr])->count(),
            'approved' => LoanApplication::where('status', 'approved')->whereNotNull('reviewed_at')->whereBetween('reviewed_at', [$startStr, $endStr])->count(),
            'rejected' => LoanApplication::where('status', 'rejected')->whereNotNull('reviewed_at')->whereBetween('reviewed_at', [$startStr, $endStr])->count(),
            'issues_pending' => LoanApplicationIssue::where('status', 'pending')->count(),
        ];

        $recentUsers = User::with(['role', 'branch'])
            ->latest()
            ->take(5)
            ->get(['id', 'name', 'email', 'role_id', 'branch_id', 'created_at']);

        $accessibleData = [
            'zones' => Zone::where('is_active', true)->get(['id', 'name', 'code']),
            'areas' => Area::where('is_active', true)->get(['id', 'name', 'code', 'zone_id']),
            'branches' => $allBranches->toArray(),
        ];

        return Inertia::render('Dashboard/Index', [
            'stats' => $stats,
            'periodStats' => $periodStats,
            'period' => $period,
            'dateFrom' => $period === 'date_to_date' ? $dateFrom : null,
            'dateTo' => $period === 'date_to_date' ? $dateTo : null,
            'branchSummary' => [
                'total_branches' => $totalBranches,
                'submitted_in_period' => $branchesSubmittedCount,
                'pending_in_period' => $branchesPendingCount,
                'submitted_branches' => $submittedBranches,
                'missing_branches' => $missingBranches,
            ],
            'recentUsers' => $recentUsers,
            'accessibleData' => $accessibleData,
            'dashboardType' => 'head_office',
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
            ]);
        }

        $period = trim((string) $request->query('period', 'today'));
        if (! in_array($period, ['today', 'monthly', 'date_to_date'], true)) {
            $period = 'today';
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
            $start = $today->copy()->startOfDay();
            $end = $today->copy()->endOfDay();
            $period = 'today';
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

        return Inertia::render('Dashboard/BranchIndex', [
            'stats' => ['my_branches' => count($branchIds)],
            'periodStats' => $periodStats,
            'todayBadges' => $todayBadges,
            'period' => $period,
            'dateFrom' => $period === 'date_to_date' ? $dateFrom : null,
            'dateTo' => $period === 'date_to_date' ? $dateTo : null,
            'myBranches' => $myBranches,
            'dashboardType' => 'branch',
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
