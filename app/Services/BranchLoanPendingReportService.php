<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\LoanApplication;
use App\Models\LoanApplicationApproval;
use App\Models\Role;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class BranchLoanPendingReportService
{
    /**
     * @var list<string>
     */
    public const COLUMN_KEYS = [
        'bm',
        'am',
        'zm',
        'admf',
        'dmf',
        'ed',
        'rh',
        'ho',
        'nc',
        'aa',
        'pc',
        'at',
        'dw',
    ];

    /**
     * Statuses that are counted. Each loan lands in exactly one column.
     *
     * @var array<string, string>
     */
    private const STATUS_BUCKETS = [
        LoanApplication::STATUS_READY_FOR_HEAD_OFFICE => 'rh',
        LoanApplication::STATUS_PENDING_HEAD_OFFICE => 'ho',
        LoanApplication::STATUS_NEEDS_CORRECTION => 'nc',
        LoanApplication::STATUS_AWAITING_TAKEUP => 'at',
        LoanApplication::STATUS_PENDING_DISBURSEMENT => 'dw',
        LoanApplication::STATUS_APPROVED => 'dw',
        LoanApplication::STATUS_PENDING_AMOUNT_APPROVAL => 'aa',
        LoanApplication::STATUS_PENDING_CANCELLATION => 'pc',
    ];

    /**
     * @return list<array{key: string, code: string, label: string}>
     */
    public static function columns(): array
    {
        return [
            ['key' => 'bm', 'code' => 'BM', 'label' => 'Branch Manager'],
            ['key' => 'am', 'code' => 'AM', 'label' => 'Area Manager'],
            ['key' => 'zm', 'code' => 'ZM', 'label' => 'Zone Manager'],
            ['key' => 'admf', 'code' => 'ADMF', 'label' => 'Assistant Director Microfinance'],
            ['key' => 'dmf', 'code' => 'DMF', 'label' => 'Director Microfinance'],
            ['key' => 'ed', 'code' => 'ED', 'label' => 'Executive Director'],
            ['key' => 'rh', 'code' => 'RH', 'label' => 'Ready for Head Office'],
            ['key' => 'ho', 'code' => 'HO', 'label' => 'Pending Head Office'],
            ['key' => 'nc', 'code' => 'NC', 'label' => 'Needs Correction'],
            ['key' => 'aa', 'code' => 'AA', 'label' => 'Amount Re-approval'],
            ['key' => 'pc', 'code' => 'PC', 'label' => 'Cancellation Approval'],
            ['key' => 'at', 'code' => 'AT', 'label' => 'Awaiting Take-up'],
            ['key' => 'dw', 'code' => 'DW', 'label' => 'Disburse Waiting'],
        ];
    }

    /**
     * @return list<string>
     */
    public static function countedStatuses(): array
    {
        return array_merge(
            [LoanApplication::STATUS_SUBMITTED, LoanApplication::STATUS_UNDER_REVIEW],
            array_keys(self::STATUS_BUCKETS),
        );
    }

    /**
     * @param  list<int>|null  $accessibleBranchIds  null = every active branch
     * @return array{
     *     rows: list<array<string, mixed>>,
     *     totals: array<string, int>,
     *     columns: list<array{key: string, code: string, label: string}>
     * }
     */
    public function build(
        ?array $accessibleBranchIds,
        string $dateFrom,
        string $dateTo,
        ?int $zoneId = null,
        ?int $areaId = null,
        ?int $branchId = null,
    ): array {
        $columns = self::columns();

        if ($accessibleBranchIds !== null && $accessibleBranchIds === []) {
            return [
                'rows' => [],
                'totals' => $this->blankCounts(),
                'columns' => $columns,
            ];
        }

        $branches = $this->branches($accessibleBranchIds, $zoneId, $areaId, $branchId);
        $counts = $this->countsByBranch($branches->pluck('id')->all(), $dateFrom, $dateTo);

        $rows = [];
        $serial = 1;
        foreach ($branches as $branch) {
            $countsForBranch = $counts[$branch->id] ?? $this->blankCounts();
            $rows[] = array_merge([
                'serial' => $serial,
                'branch_id' => $branch->id,
                'branch_name' => $branch->name,
                'branch_code' => $branch->code,
                'area_name' => $branch->area?->name ?? '',
                'zone_name' => $branch->area?->zone?->name ?? '',
            ], $countsForBranch);
            $serial++;
        }

        return [
            'rows' => $rows,
            'totals' => $this->sumRows($rows),
            'columns' => $columns,
        ];
    }

    /**
     * One pending loan, one column. Approval rows are never counted.
     * An escalation step whose role cannot be recognized stays in ED so the loan is not dropped.
     */
    public function bucketKey(LoanApplication $loan): string
    {
        if (isset(self::STATUS_BUCKETS[$loan->status])) {
            return self::STATUS_BUCKETS[$loan->status];
        }

        $current = $this->currentPendingApproval($loan);
        $level = $current?->level;
        $role = $current?->user?->role?->name;

        if ($level === 'branch' || $role === Role::BRANCH_MANAGER) {
            return 'bm';
        }

        if ($level === 'area' || $role === Role::AREA_MANAGER) {
            return 'am';
        }

        if ($level === 'zone' || $role === Role::ZONE_MANAGER) {
            return 'zm';
        }

        if ($role === Role::ADMF) {
            return 'admf';
        }

        if ($role === Role::DMF) {
            return 'dmf';
        }

        if ($role === Role::ED) {
            return 'ed';
        }

        if ($level === 'escalation') {
            return 'ed';
        }

        return 'bm';
    }

    /**
     * @param  list<int>|null  $accessibleBranchIds
     * @return Collection<int, Branch>
     */
    private function branches(?array $accessibleBranchIds, ?int $zoneId, ?int $areaId, ?int $branchId): Collection
    {
        $query = Branch::query()
            ->active()
            ->with('area.zone');

        if ($accessibleBranchIds !== null) {
            $query->whereIn('id', $accessibleBranchIds);
        }

        if ($branchId) {
            $query->where('id', $branchId);
        }

        if ($areaId) {
            $query->where('area_id', $areaId);
        }

        if ($zoneId) {
            $query->whereHas('area', function ($areaQuery) use ($zoneId) {
                $areaQuery->where('zone_id', $zoneId);
            });
        }

        return $query->get()
            ->sortBy(function (Branch $branch) {
                $code = trim((string) $branch->code);
                $numeric = $code === '' ? '9999999999' : str_pad((string) ((int) $code), 10, '0', STR_PAD_LEFT);

                return $numeric.'|'.$code.'|'.mb_strtolower((string) $branch->name);
            })
            ->values();
    }

    /**
     * @param  list<int>  $branchIds
     * @return array<int, array<string, int>>
     */
    private function countsByBranch(array $branchIds, string $dateFrom, string $dateTo): array
    {
        if ($branchIds === []) {
            return [];
        }

        $from = Carbon::parse($dateFrom)->startOfDay()->format('Y-m-d H:i:s');
        $to = Carbon::parse($dateTo)->endOfDay()->format('Y-m-d H:i:s');

        $loans = LoanApplication::query()
            ->whereIn('branch_id', $branchIds)
            ->whereIn('status', self::countedStatuses())
            ->whereRaw(
                'COALESCE(submitted_at, created_at) >= ? AND COALESCE(submitted_at, created_at) <= ?',
                [$from, $to],
            )
            ->with(['approvals.user.role'])
            ->get();

        $counts = [];
        foreach ($loans as $loan) {
            $branchId = (int) $loan->branch_id;
            if (! isset($counts[$branchId])) {
                $counts[$branchId] = $this->blankCounts();
            }

            $key = $this->bucketKey($loan);
            $counts[$branchId][$key]++;
            $counts[$branchId]['total']++;
        }

        return $counts;
    }

    public function currentPendingApproval(LoanApplication $loan): ?LoanApplicationApproval
    {
        $approvals = $loan->relationLoaded('approvals')
            ? $loan->approvals
            : $loan->approvals()->with('user.role')->get();

        $pending = $approvals->where('status', 'pending')->sortBy('sequence');

        foreach ($pending as $approval) {
            $previous = $approvals->where('sequence', '<', $approval->sequence);
            $previousDecided = $previous->every(
                fn (LoanApplicationApproval $row) => in_array($row->status, ['approved', 'rejected'], true)
            );

            if ($previousDecided) {
                return $approval;
            }
        }

        return null;
    }

    /**
     * @return array<string, int>
     */
    private function blankCounts(): array
    {
        $counts = ['total' => 0];
        foreach (self::COLUMN_KEYS as $key) {
            $counts[$key] = 0;
        }

        return $counts;
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @return array<string, int>
     */
    private function sumRows(array $rows): array
    {
        $totals = $this->blankCounts();

        foreach ($rows as $row) {
            foreach (self::COLUMN_KEYS as $key) {
                $totals[$key] += (int) ($row[$key] ?? 0);
            }
            $totals['total'] += (int) ($row['total'] ?? 0);
        }

        return $totals;
    }
}
