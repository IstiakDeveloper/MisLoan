<?php

namespace App\Http\Controllers;

use App\Models\Area;
use App\Models\Branch;
use App\Models\SavingsApplication;
use App\Models\Zone;
use App\Services\MemberCodeService;
use App\Support\SavingsFormVisibility;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class HeadOfficeSavingsController extends Controller
{
    use Concerns\ScopesToAccessibleBranches;

    /**
     * Display savings applications (all for HO; assigned zone/area for approvers/managers).
     * Date range, zone/area/branch and status filters. Branch-wise summary.
     */
    public function index(Request $request)
    {
        $dateFrom = $request->filled('date_from') ? $request->date_from : null;
        $dateTo = $request->filled('date_to') ? $request->date_to : null;

        $startOfDay = $dateFrom ? Carbon::parse($dateFrom)->startOfDay() : null;
        $endOfDay = $dateTo ? Carbon::parse($dateTo)->endOfDay() : null;

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
                'account_no',
                'member_no',
                'member_admission_id',
                'savings_product_id',
                'branch_id',
                'status',
                'deposit_amount',
                'monthly_installment',
                'monthly_savings_amount',
                'maturity_amount',
                'duration_months',
                'account_opening_date',
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
            MemberCodeService::applySavingsSearch($query, $request->search);
        }

        $statsBaseQuery = SavingsApplication::query();
        $this->applyAccessibleBranchScope($statsBaseQuery);
        if ($dateFrom && $dateTo) {
            $statsBaseQuery->whereBetween('created_at', [$startOfDay, $endOfDay]);
        } elseif ($dateFrom) {
            $statsBaseQuery->where('created_at', '>=', $startOfDay);
        } elseif ($dateTo) {
            $statsBaseQuery->where('created_at', '<=', $endOfDay);
        }
        if ($request->filled('zone_id')) {
            $statsBaseQuery->whereHas('branch.area', function ($q) use ($request) {
                $q->where('zone_id', $request->zone_id);
            });
        }
        if ($request->filled('area_id')) {
            $statsBaseQuery->whereHas('branch', function ($q) use ($request) {
                $q->where('area_id', $request->area_id);
            });
        }
        if ($request->filled('branch_id')) {
            $statsBaseQuery->where('branch_id', $request->branch_id);
        }

        $totalDeposit = (float) (clone $statsBaseQuery)->where('status', '!=', 'cancelled')->sum('deposit_amount');

        // Calculate total withdrawn from closed applications
        $closedApps = (clone $statsBaseQuery)->where('status', 'closed')->get(['id', 'form_data', 'deposit_amount', 'maturity_amount']);
        $totalWithdrawn = 0.0;
        foreach ($closedApps as $cApp) {
            $wData = $cApp->form_data['withdrawal'] ?? null;
            if ($wData && isset($wData['total_payout'])) {
                $totalWithdrawn += (float) $wData['total_payout'];
            } else {
                $totalWithdrawn += (float) ($cApp->maturity_amount ?: $cApp->deposit_amount);
            }
        }
        $netBalance = max(0, $totalDeposit - $totalWithdrawn);

        $stats = [
            'total' => (clone $statsBaseQuery)->count(),
            'total_accounts' => (clone $statsBaseQuery)->count(),
            'total_deposit' => $totalDeposit,
            'total_withdrawn' => $totalWithdrawn,
            'net_balance' => $netBalance,
            'draft' => (clone $statsBaseQuery)->where('status', 'draft')->count(),
            'submitted' => (clone $statsBaseQuery)->where('status', 'submitted')->count(),
            'under_review' => (clone $statsBaseQuery)->where('status', 'under_review')->count(),
            'approved' => (clone $statsBaseQuery)->where('status', 'approved')->count(),
            'rejected' => (clone $statsBaseQuery)->where('status', 'rejected')->count(),
            'active' => (clone $statsBaseQuery)->where('status', 'active')->count(),
            'matured' => (clone $statsBaseQuery)->where('status', 'matured')->count(),
            'closed' => (clone $statsBaseQuery)->where('status', 'closed')->count(),
        ];

        $branchSummaryList = [];

        $applications = $query->orderBy('created_at', 'desc')->paginate(20)->withQueryString();

        $applications->through(function ($app) {
            $item = $app->toArray();
            $item['savingsProduct'] = $app->savingsProduct;
            $item['savings_product'] = $app->savingsProduct;
            $item['memberAdmission'] = $app->memberAdmission;
            $item['member_admission'] = $app->memberAdmission;
            $item['branch'] = $app->branch;
            return $item;
        });

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
            'savingsProduct.savingsCategory',
            'memberAdmission.samity',
            'branch.area',
            'samity',
        ])->findOrFail($id);

        $this->ensureCanAccessBranch($application->branch_id);

        $app = $application->toArray();
        $app['savings_product'] = $application->savingsProduct;
        $app['member_admission'] = $application->memberAdmission;

        return Inertia::render('Member/SavingsApplications/Show', [
            'application' => $app,
            'formType' => SavingsFormVisibility::formType(
                $application->savingsProduct?->savingsCategory,
                $application->savingsProduct
            ),
            'fromHeadOffice' => true,
            'backUrl' => '/head-office/savings-applications',
        ]);
    }
}
