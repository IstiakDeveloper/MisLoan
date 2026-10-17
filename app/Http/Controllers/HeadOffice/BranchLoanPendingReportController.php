<?php

namespace App\Http\Controllers\HeadOffice;

use App\Http\Controllers\Concerns\ScopesToAccessibleBranches;
use App\Http\Controllers\Controller;
use App\Services\BranchLoanPendingReportService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BranchLoanPendingReportController extends Controller
{
    use ScopesToAccessibleBranches;

    public function __construct(private BranchLoanPendingReportService $report) {}

    public function index(Request $request): Response
    {
        return Inertia::render(
            'HeadOffice/Reports/BranchLoanPendingReport',
            $this->pageProps($request),
        );
    }

    public function print(Request $request): Response
    {
        return Inertia::render(
            'HeadOffice/Reports/BranchLoanPendingPrint',
            $this->pageProps($request),
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function pageProps(Request $request): array
    {
        $dateFrom = $this->dateOrDefault(
            $request->input('date_from'),
            Carbon::today()->startOfMonth()->toDateString(),
        );
        $dateTo = $this->dateOrDefault(
            $request->input('date_to'),
            Carbon::today()->toDateString(),
        );

        if ($dateFrom > $dateTo) {
            [$dateFrom, $dateTo] = [$dateTo, $dateFrom];
        }

        $zoneId = $request->filled('zone_id') ? (int) $request->input('zone_id') : null;
        $areaId = $request->filled('area_id') ? (int) $request->input('area_id') : null;
        $branchId = $request->filled('branch_id') ? (int) $request->input('branch_id') : null;

        if ($branchId) {
            $this->ensureCanAccessBranch($branchId);
        }

        $built = $this->report->build(
            $this->viewerBranchIds(),
            $dateFrom,
            $dateTo,
            $zoneId,
            $areaId,
            $branchId,
        );

        $orgOptions = $this->organizationFilterOptions();

        return [
            'rows' => $built['rows'],
            'totals' => $built['totals'],
            'columns' => $built['columns'],
            'filters' => [
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'zone_id' => $zoneId ? (string) $zoneId : '',
                'area_id' => $areaId ? (string) $areaId : '',
                'branch_id' => $branchId ? (string) $branchId : '',
            ],
            'zones' => $orgOptions['zones']->toArray(),
            'areas' => $orgOptions['areas']->toArray(),
            'branches' => $orgOptions['branches']->toArray(),
            'printed_at' => now()->toDateTimeString(),
        ];
    }

    /**
     * @return list<int>|null
     */
    private function viewerBranchIds(): ?array
    {
        if (! $this->shouldRestrictToAccessibleBranches()) {
            return null;
        }

        return $this->accessibleBranchIds();
    }

    private function dateOrDefault(mixed $value, string $default): string
    {
        if (! is_string($value) || ! preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
            return $default;
        }

        return $value;
    }
}
