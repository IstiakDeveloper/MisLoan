<?php

namespace App\Http\Controllers;

use App\Models\Area;
use App\Models\Branch;
use App\Models\RecentDeletion;
use App\Models\Zone;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class HeadOfficeRecentDeletionController extends Controller
{
    use Concerns\ResolvesListPerPage;
    use Concerns\ScopesToAccessibleBranches;

    public function index(Request $request)
    {
        $user = $request->user();

        // 1. Date filter: default to last 7 days as requested
        $daysPreset = $request->input('days', '7');
        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');

        if (! $dateFrom && ! $dateTo) {
            if ($daysPreset === '7') {
                $dateFrom = Carbon::now()->subDays(7)->startOfDay()->format('Y-m-d');
                $dateTo = Carbon::now()->endOfDay()->format('Y-m-d');
            } elseif ($daysPreset === '15') {
                $dateFrom = Carbon::now()->subDays(15)->startOfDay()->format('Y-m-d');
                $dateTo = Carbon::now()->endOfDay()->format('Y-m-d');
            } elseif ($daysPreset === '30') {
                $dateFrom = Carbon::now()->subDays(30)->startOfDay()->format('Y-m-d');
                $dateTo = Carbon::now()->endOfDay()->format('Y-m-d');
            }
        }

        $typeFilter = $request->input('type', 'all');
        $search = trim((string) $request->input('search', ''));
        $branchId = $request->input('branch_id');
        $areaId = $request->input('area_id');
        $zoneId = $request->input('zone_id');

        $query = RecentDeletion::with(['branch.area.zone', 'deletedByUser:id,name,username,pin,role_id']);

        // Scope to user's accessible branches
        if (! ($user->has_all_access || $user->isSuperAdmin() || $user->isHeadOffice())) {
            $accessibleBranchIds = $user->getAccessibleBranches()->pluck('id')->toArray();
            $query->whereIn('branch_id', $accessibleBranchIds);
        }

        // Apply type filter
        if ($typeFilter && $typeFilter !== 'all') {
            $query->where('deletable_type', $typeFilter);
        }

        // Apply date range
        if ($dateFrom) {
            $query->where('deleted_at', '>=', Carbon::parse($dateFrom)->startOfDay());
        }
        if ($dateTo) {
            $query->where('deleted_at', '<=', Carbon::parse($dateTo)->endOfDay());
        }

        // Branch / Area / Zone filter
        if ($branchId) {
            $query->where('branch_id', $branchId);
        } elseif ($areaId) {
            $query->whereHas('branch', fn ($q) => $q->where('area_id', $areaId));
        } elseif ($zoneId) {
            $query->whereHas('branch.area', fn ($q) => $q->where('zone_id', $zoneId));
        }

        // Search filter
        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('application_no', 'like', "%{$search}%")
                    ->orWhere('applicant_name', 'like', "%{$search}%")
                    ->orWhere('applicant_phone', 'like', "%{$search}%")
                    ->orWhere('deleted_by_name', 'like', "%{$search}%")
                    ->orWhere('deleted_by_username', 'like', "%{$search}%");
            });
        }

        // Stats calculation for the past 7 days
        $sevenDaysAgo = Carbon::now()->subDays(7)->startOfDay();
        $statsBaseQuery = RecentDeletion::query();
        if (! ($user->has_all_access || $user->isSuperAdmin() || $user->isHeadOffice())) {
            $accessibleBranchIds = $user->getAccessibleBranches()->pluck('id')->toArray();
            $statsBaseQuery->whereIn('branch_id', $accessibleBranchIds);
        }

        $sevenDaysQuery = (clone $statsBaseQuery)->where('deleted_at', '>=', $sevenDaysAgo);
        $stats = [
            'total_last_7_days' => (clone $sevenDaysQuery)->count(),
            'admissions_last_7_days' => (clone $sevenDaysQuery)->where('deletable_type', 'member_admission')->count(),
            'loans_last_7_days' => (clone $sevenDaysQuery)->where('deletable_type', 'loan_application')->count(),
            'savings_last_7_days' => (clone $sevenDaysQuery)->where('deletable_type', 'savings_application')->count(),
            'unique_users_last_7_days' => (clone $sevenDaysQuery)->distinct('deleted_by_user_id')->count('deleted_by_user_id'),
        ];

        $perPage = $this->resolvePerPage($request, 20);
        $deletions = $query->orderBy('deleted_at', 'desc')->paginate($perPage)->withQueryString();

        $zones = Zone::orderBy('name')->get(['id', 'name']);
        $areas = Area::with('zone:id,name')->orderBy('name')->get(['id', 'name', 'zone_id']);
        $branches = Branch::with('area:id,name,zone_id')->orderBy('name')->get(['id', 'name', 'code', 'area_id']);

        return Inertia::render('HeadOffice/RecentDeletions', [
            'deletions' => $deletions,
            'stats' => $stats,
            'filters' => [
                'type' => $typeFilter,
                'days' => $daysPreset,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'search' => $search,
                'branch_id' => $branchId,
                'area_id' => $areaId,
                'zone_id' => $zoneId,
                'per_page' => $perPage,
            ],
            'zones' => $zones,
            'areas' => $areas,
            'branches' => $branches,
        ]);
    }

    public function show(RecentDeletion $recentDeletion)
    {
        $recentDeletion->load(['branch.area.zone', 'deletedByUser']);

        return response()->json([
            'deletion' => $recentDeletion,
        ]);
    }
}
