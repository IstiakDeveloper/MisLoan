<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Zone;
use App\Models\Area;
use App\Models\Branch;
use App\Models\Role;
use App\Models\LoanApplication;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        $user = Auth::user();

        // Check if user is Head Office/SuperAdmin or Branch User
        $isHeadOffice = $user->has_all_access;

        if ($isHeadOffice) {
            return $this->headOfficeDashboard($user);
        } else {
            return $this->branchDashboard($user);
        }
    }

    /**
     * Head Office / SuperAdmin Dashboard
     * Full system statistics and management overview
     */
    private function headOfficeDashboard($user)
    {
        // System-wide statistics
        $stats = [
            'total_users' => User::where('is_active', true)->count(),
            'total_zones' => Zone::where('is_active', true)->count(),
            'total_areas' => Area::where('is_active', true)->count(),
            'total_branches' => Branch::where('is_active', true)->count(),
            'total_roles' => Role::count(),
            'total_applications' => LoanApplication::count(),
            'pending_applications' => LoanApplication::where('status', 'submitted')->count(),
            'approved_applications' => LoanApplication::where('status', 'approved')->count(),
        ];

        // Today date
        $today = now()->toDateString();

        // All active branches, areas, zones
        $allBranches = Branch::where('is_active', true)->get(['id', 'name', 'area_id']);
        $allAreas = Area::where('is_active', true)->get(['id', 'name', 'zone_id']);
        $allZones = Zone::where('is_active', true)->get(['id', 'name']);

        // Branches submitted today
        $submittedBranchIds = LoanApplication::whereDate('submitted_at', $today)
            ->distinct('branch_id')
            ->pluck('branch_id')
            ->toArray();
        $submittedBranches = $allBranches->whereIn('id', $submittedBranchIds)->values();
        $missingBranches = $allBranches->whereNotIn('id', $submittedBranchIds)->values();

        // Areas submitted today
        $submittedAreaIds = $allBranches->whereIn('id', $submittedBranchIds)->pluck('area_id')->unique()->toArray();
        $submittedAreas = $allAreas->whereIn('id', $submittedAreaIds)->values();
        $missingAreas = $allAreas->whereNotIn('id', $submittedAreaIds)->values();

        // Zones submitted today
        $submittedZoneIds = $allAreas->whereIn('id', $submittedAreaIds)->pluck('zone_id')->unique()->toArray();
        $submittedZones = $allZones->whereIn('id', $submittedZoneIds)->values();
        $missingZones = $allZones->whereNotIn('id', $submittedZoneIds)->values();

        // Recent users (last 5)
        $recentUsers = User::with(['role', 'branch'])
            ->latest()
            ->take(5)
            ->get(['id', 'name', 'email', 'role_id', 'branch_id', 'created_at']);

        // All organizational data
        $accessibleData = [
            'zones' => $allZones,
            'areas' => $allAreas,
            'branches' => $allBranches,
        ];

        // Add today submission stats
        $todaySubmissionStats = [
            'submitted_branches_today' => $submittedBranches->values(),
            'missing_branches_today' => $missingBranches->values(),
            'submitted_areas_today' => $submittedAreas->values(),
            'missing_areas_today' => $missingAreas->values(),
            'submitted_zones_today' => $submittedZones->values(),
            'missing_zones_today' => $missingZones->values(),
        ];

        return Inertia::render('Dashboard/Index', [
            'stats' => $stats,
            'recentUsers' => $recentUsers,
            'accessibleData' => $accessibleData,
            'dashboardType' => 'head_office',
            'todaySubmissionStats' => $todaySubmissionStats,
        ]);
    }

    /**
     * Branch User Dashboard
     * Branch-specific statistics and loan overview
     */
    private function branchDashboard($user)
    {
        // Get user's accessible branch IDs
        $branchIds = $this->getUserBranchIds($user);

        // Branch-specific statistics
        $stats = [
            'my_branches' => count($branchIds),
            'total_applications' => LoanApplication::whereIn('branch_id', $branchIds)->count(),
            'pending_applications' => LoanApplication::whereIn('branch_id', $branchIds)->where('status', 'submitted')->count(),
            'approved_applications' => LoanApplication::whereIn('branch_id', $branchIds)->where('status', 'approved')->count(),
            'rejected_applications' => LoanApplication::whereIn('branch_id', $branchIds)->where('status', 'rejected')->count(),
            'under_review_applications' => LoanApplication::whereIn('branch_id', $branchIds)->where('status', 'under_review')->count(),
            'total_loan_amount' => LoanApplication::whereIn('branch_id', $branchIds)
                ->where('status', 'approved')
                ->sum('approved_amount'),
        ];

        // Recent loan applications from user's branches
        $recentApplications = LoanApplication::with(['branch', 'submittedBy', 'memberAdmission'])
            ->whereIn('branch_id', $branchIds)
            ->latest()
            ->take(5)
            ->get(['id', 'application_no', 'branch_id', 'member_admission_id', 'submitted_by', 'status', 'requested_amount', 'submitted_at']);

        // User's accessible branches
        $accessibleData = [
            'branches' => Branch::whereIn('id', $branchIds)->with('area.zone')->get(['id', 'name', 'code', 'area_id']),
        ];

        return Inertia::render('Dashboard/BranchIndex', [
            'stats' => $stats,
            'recentApplications' => $recentApplications,
            'accessibleData' => $accessibleData,
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
