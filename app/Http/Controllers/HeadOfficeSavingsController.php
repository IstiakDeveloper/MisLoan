<?php

namespace App\Http\Controllers;

use App\Models\SavingsApplication;
use App\Models\Zone;
use App\Models\Area;
use App\Models\Branch;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;

class HeadOfficeSavingsController extends Controller
{
    use Concerns\ScopesToAccessibleBranches;

    /**
     * Display savings applications (all for HO; assigned zone/area for approvers/managers).
     * Date range, zone/area/branch and status filters. Branch-wise summary.
     */
    public function index(Request $request)
    {
        $dateFrom = $request->date_from ?? now()->toDateString();
        $dateTo = $request->date_to ?? now()->toDateString();

        $startOfDay = Carbon::parse($dateFrom)->startOfDay();
        $endOfDay = Carbon::parse($dateTo)->endOfDay();

        $query = SavingsApplication::with([
            'branch:id,name,area_id',
            'branch.area:id,name,zone_id',
            'branch.area.zone:id,name',
            'savingsProduct:id,product_name,product_name_bn,product_code',
            'memberAdmission:id,applicant_name_en,applicant_name_bn,nid_number,mobile_number,application_no',
        ])
            ->select([
                'id',
                'application_no',
                'member_admission_id',
                'savings_product_id',
                'branch_id',
                'status',
                'deposit_amount',
                'monthly_installment',
                'monthly_savings_amount',
                'maturity_amount',
                'duration_months',
                'created_at',
                'submitted_at',
                'reviewed_at',
            ]);

        $this->applyAccessibleBranchScope($query);

        if ($dateFrom && $dateTo) {
            $query->whereBetween('created_at', [$startOfDay, $endOfDay]);
        } elseif ($dateFrom) {
            $query->where('created_at', '>=', $startOfDay);
        } elseif ($dateTo) {
            $query->where('created_at', '<=', $endOfDay);
        }

        if ($request->filled('zone_id')) {
            $query->whereHas('branch.area', function ($q) use ($request) {
                $q->where('zone_id', $request->zone_id);
            });
        }

        if ($request->filled('area_id')) {
            $query->whereHas('branch', function ($q) use ($request) {
                $q->where('area_id', $request->area_id);
            });
        }

        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            \App\Services\MemberCodeService::applySavingsSearch($query, $request->search);
        }

        $statsQuery = SavingsApplication::select('id', 'status', 'created_at', 'branch_id');
        $this->applyAccessibleBranchScope($statsQuery);
        if ($dateFrom && $dateTo) {
            $statsQuery->whereBetween('created_at', [$startOfDay, $endOfDay]);
        } elseif ($dateFrom) {
            $statsQuery->where('created_at', '>=', $startOfDay);
        } elseif ($dateTo) {
            $statsQuery->where('created_at', '<=', $endOfDay);
        }
        if ($request->filled('zone_id')) {
            $statsQuery->whereHas('branch.area', function ($q) use ($request) {
                $q->where('zone_id', $request->zone_id);
            });
        }
        if ($request->filled('area_id')) {
            $statsQuery->whereHas('branch', function ($q) use ($request) {
                $q->where('area_id', $request->area_id);
            });
        }
        if ($request->filled('branch_id')) {
            $statsQuery->where('branch_id', $request->branch_id);
        }

        $stats = [
            'total' => (clone $statsQuery)->count(),
            'draft' => (clone $statsQuery)->where('status', 'draft')->count(),
            'submitted' => (clone $statsQuery)->where('status', 'submitted')->count(),
            'under_review' => (clone $statsQuery)->where('status', 'under_review')->count(),
            'approved' => (clone $statsQuery)->where('status', 'approved')->count(),
            'rejected' => (clone $statsQuery)->where('status', 'rejected')->count(),
            'active' => (clone $statsQuery)->where('status', 'active')->count(),
            'matured' => (clone $statsQuery)->where('status', 'matured')->count(),
        ];

        // Branch-wise summary: কতগুলো সেভিংস কোন ব্রাঞ্চ থেকে (same filters)
        $branchSummaryQuery = SavingsApplication::query()
            ->selectRaw('branch_id, count(*) as count')
            ->whereBetween('created_at', [$startOfDay, $endOfDay]);
        $this->applyAccessibleBranchScope($branchSummaryQuery);
        if ($request->filled('zone_id')) {
            $branchSummaryQuery->whereHas('branch.area', function ($q) use ($request) {
                $q->where('zone_id', $request->zone_id);
            });
        }
        if ($request->filled('area_id')) {
            $branchSummaryQuery->whereHas('branch', function ($q) use ($request) {
                $q->where('area_id', $request->area_id);
            });
        }
        if ($request->filled('branch_id')) {
            $branchSummaryQuery->where('branch_id', $request->branch_id);
        }
        if ($request->filled('status')) {
            $branchSummaryQuery->where('status', $request->status);
        }
        $branchSummary = $branchSummaryQuery->groupBy('branch_id')->get();
        $branchIds = $branchSummary->pluck('branch_id')->filter()->unique()->values()->all();
        $branchesForSummary = Branch::whereIn('id', $branchIds)->with('area:id,name,zone_id', 'area.zone:id,name')->get()->keyBy('id');
        $branchSummaryList = $branchSummary->map(function ($row) use ($branchesForSummary) {
            $branch = $branchesForSummary->get($row->branch_id);
            return [
                'branch_id' => $row->branch_id,
                'branch_name' => $branch ? $branch->name : '—',
                'area_name' => $branch && $branch->area ? $branch->area->name : '—',
                'zone_name' => $branch && $branch->area && $branch->area->zone ? $branch->area->zone->name : '—',
                'count' => (int) $row->count,
            ];
        })->sortByDesc('count')->values()->all();

        $applications = $query->orderBy('created_at', 'desc')->paginate(20);

        $orgFilters = $this->organizationFilterOptions();

        return Inertia::render('HeadOffice/SavingsApplications', [
            'applications' => $applications,
            'filters' => array_merge(
                $request->only(['status', 'search', 'zone_id', 'area_id', 'branch_id', 'date_from', 'date_to']),
                ['date_from' => $dateFrom, 'date_to' => $dateTo]
            ),
            'stats' => $stats,
            'branchSummary' => $branchSummaryList,
            'zones' => $orgFilters['zones'],
            'areas' => $orgFilters['areas'],
            'branches' => $orgFilters['branches'],
        ]);
    }

    /**
     * Show single savings application (read-only for head office).
     */
    public function show($id)
    {
        $application = SavingsApplication::with([
            'savingsProduct',
            'memberAdmission',
            'branch.area',
            'samity',
        ])->findOrFail($id);

        $this->ensureCanAccessBranch($application->branch_id);

        $app = $application->toArray();
        $app['savings_product'] = $application->savingsProduct;
        $app['member_admission'] = $application->memberAdmission;

        return Inertia::render('Member/SavingsApplications/Show', [
            'application' => $app,
            'fromHeadOffice' => true,
            'backUrl' => '/head-office/savings-applications',
        ]);
    }
}
