<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Role;
use App\Services\Accounting\FinancialReportsService;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FinancialReportsController extends Controller
{
    public function __construct(private readonly FinancialReportsService $reports) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        $canSelectBranch = $this->isHeadOfficeOrAdmin($user);
        $branchId = $canSelectBranch
            ? ($request->integer('branch_id') ?: null)
            : ($user->branch_id ? (int) $user->branch_id : null);

        $today = CarbonImmutable::now('Asia/Dhaka')->toDateString();
        $fromDate = $request->input('from_date', CarbonImmutable::now('Asia/Dhaka')->startOfMonth()->toDateString());
        $toDate = $request->input('to_date', $today);

        return Inertia::render('FinancialReports/Index', [
            'branchId' => $branchId,
            'branches' => $canSelectBranch
                ? Branch::operational()->orderedByCode()->get(['id', 'name', 'code'])
                : [],
            'canSelectBranch' => $canSelectBranch,
            'filters' => [
                'from_date' => $fromDate,
                'to_date' => $toDate,
            ],
            'trialBalance' => $this->reports->trialBalance($branchId, $fromDate, $toDate),
            'statements' => $this->reports->incomeAndBalanceSheet($branchId, $toDate),
            'portfolio' => $this->reports->portfolioParAndPomis($branchId, $toDate),
        ]);
    }

    private function isHeadOfficeOrAdmin($user): bool
    {
        $role = $user?->role?->name;

        return (bool) ($user?->has_all_access || in_array($role, [Role::SUPER_ADMIN, Role::HEAD_OFFICE, Role::ED], true));
    }
}
