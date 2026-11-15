<?php

namespace App\Services\Dashboard;

use App\Models\LoanApplication;
use App\Models\MemberAdmission;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;

class PipelineRollup
{
    /**
     * @param  list<int>|null  $branchIds  null means every branch
     * @return array<string, int>
     */
    public function admissionCounts(?array $branchIds = null): array
    {
        return $this->countsByStatus($this->scoped(MemberAdmission::query(), $branchIds));
    }

    /**
     * @param  list<int>|null  $branchIds
     * @return array<string, array{count: int, approved_amount: float, disbursed_amount: float, requested_amount: float}>
     */
    public function loanRollup(?array $branchIds = null): array
    {
        return $this->loanRollupFrom($this->scoped(LoanApplication::query(), $branchIds));
    }

    /**
     * @param  Builder<LoanApplication>  $query
     * @return array<string, array{count: int, approved_amount: float, disbursed_amount: float, requested_amount: float}>
     */
    public function loanRollupFrom(Builder $query): array
    {
        $rows = $query
            ->selectRaw('status')
            ->selectRaw('COUNT(*) as aggregate')
            ->selectRaw('COALESCE(SUM(approved_amount), 0) as approved_amount')
            ->selectRaw('COALESCE(SUM(disbursed_amount), 0) as disbursed_amount')
            ->selectRaw('COALESCE(SUM(requested_amount), 0) as requested_amount')
            ->groupBy('status')
            ->get();

        $out = [];
        foreach ($rows as $row) {
            $out[(string) $row->status] = [
                'count' => (int) $row->aggregate,
                'approved_amount' => (float) $row->approved_amount,
                'disbursed_amount' => (float) $row->disbursed_amount,
                'requested_amount' => (float) $row->requested_amount,
            ];
        }

        return $out;
    }

    /**
     * Pending workload grouped by branch. Two queries for the whole organization.
     *
     * @param  list<int>|null  $branchIds
     * @return array<int, array{admission_pending: int, loan_pending: int, loan_amount: float}>
     */
    public function pendingByBranch(?array $branchIds = null): array
    {
        $statuses = ['submitted', 'under_review', 'pending_head_office'];

        $admissions = $this->scoped(MemberAdmission::query(), $branchIds)
            ->whereIn('status', $statuses)
            ->selectRaw('branch_id, COUNT(*) as aggregate')
            ->groupBy('branch_id')
            ->pluck('aggregate', 'branch_id');

        $loans = $this->scoped(LoanApplication::query(), $branchIds)
            ->whereIn('status', $statuses)
            ->selectRaw('branch_id, COUNT(*) as aggregate, COALESCE(SUM(requested_amount), 0) as amount')
            ->groupBy('branch_id')
            ->get()
            ->keyBy('branch_id');

        $out = [];
        foreach ($admissions as $branchId => $count) {
            $id = (int) $branchId;
            $out[$id] = [
                'admission_pending' => (int) $count,
                'loan_pending' => 0,
                'loan_amount' => 0.0,
            ];
        }

        foreach ($loans as $branchId => $row) {
            $id = (int) $branchId;
            $out[$id] ??= [
                'admission_pending' => 0,
                'loan_pending' => 0,
                'loan_amount' => 0.0,
            ];
            $out[$id]['loan_pending'] = (int) $row->aggregate;
            $out[$id]['loan_amount'] = (float) $row->amount;
        }

        return $out;
    }

    /**
     * @param  Builder<Model>  $query
     * @return array<string, int>
     */
    public function countsByStatus(Builder $query): array
    {
        return $query
            ->selectRaw('status, COUNT(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status')
            ->map(fn ($count) => (int) $count)
            ->all();
    }

    public function countOf(array $counts, string ...$statuses): int
    {
        $total = 0;
        foreach ($statuses as $status) {
            $total += (int) ($counts[$status] ?? 0);
        }

        return $total;
    }

    public function loanCount(array $rollup, string ...$statuses): int
    {
        $total = 0;
        foreach ($statuses as $status) {
            $total += (int) ($rollup[$status]['count'] ?? 0);
        }

        return $total;
    }

    public function loanSum(array $rollup, string $field, string ...$statuses): float
    {
        $total = 0.0;
        foreach ($statuses as $status) {
            $total += (float) ($rollup[$status][$field] ?? 0);
        }

        return $total;
    }

    /**
     * @param  array<int, array{admission_pending: int, loan_pending: int, loan_amount: float}>  $byBranch
     * @param  Collection<int, mixed>|array<int, int>  $branchIds
     * @return array{admission_pending: int, loan_pending: int, loan_amount: float}
     */
    public function sumBranches(array $byBranch, Collection|array $branchIds): array
    {
        $totals = [
            'admission_pending' => 0,
            'loan_pending' => 0,
            'loan_amount' => 0.0,
        ];

        foreach ($branchIds as $branchId) {
            $stats = $byBranch[(int) $branchId] ?? null;
            if ($stats === null) {
                continue;
            }
            $totals['admission_pending'] += $stats['admission_pending'];
            $totals['loan_pending'] += $stats['loan_pending'];
            $totals['loan_amount'] += $stats['loan_amount'];
        }

        return $totals;
    }

    /**
     * @param  Builder<Model>  $query
     * @param  list<int>|null  $branchIds
     * @return Builder<Model>
     */
    private function scoped(Builder $query, ?array $branchIds): Builder
    {
        if ($branchIds === null) {
            return $query;
        }

        if ($branchIds === []) {
            return $query->whereRaw('0 = 1');
        }

        return $query->whereIn('branch_id', $branchIds);
    }
}
