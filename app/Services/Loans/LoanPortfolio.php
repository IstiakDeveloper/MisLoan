<?php

namespace App\Services\Loans;

use App\Models\User;
use Brick\Math\BigInteger;
use Carbon\CarbonImmutable;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** Operational FIFO delinquency, not a regulator-approved provision classification. */
final class LoanPortfolio
{
    public function accounts(User $actor, string $asOf, ?int $branch = null): Builder
    {
        abort_unless($actor->is_active && $actor->isSuperAdmin() && ! $actor->isBranchAccount(), 403);
        try {
            $date = CarbonImmutable::createFromFormat('!Y-m-d', $asOf);
        } catch (\Throwable) {
            $date = null;
        }
        if (! $date || $date->format('Y-m-d') !== $asOf || $date->isFuture()) {
            throw ValidationException::withMessages(['as_of' => 'Use a valid report date that is not in the future.']);
        }
        if ($branch !== null) {
            abort_unless($actor->canAccessBranch($branch), 403);
        }

        $scope = fn () => DB::table('loan_accounts')->select('id')->where('branch_id', $branch);
        $movements = DB::table('loan_transactions')->where('business_date', '<=', $asOf)
            ->when($branch !== null, fn ($q) => $q->whereIn('loan_account_id', $scope()))
            ->selectRaw('loan_account_id, SUM(principal_paisa) AS principal_paisa, SUM(charge_paisa) AS charge_paisa')
            ->groupBy('loan_account_id');
        $balances = DB::table('loan_accounts as a')->joinSub($movements, 'm', 'm.loan_account_id', '=', 'a.id')
            ->where('a.opened_on', '<=', $asOf)->when($branch !== null, fn ($q) => $q->where('a.branch_id', $branch))
            ->selectRaw('a.id, a.branch_id, a.loan_application_id, a.opened_on, m.principal_paisa, m.charge_paisa, a.contract_principal_paisa + a.contract_charge_paisa - m.principal_paisa - m.charge_paisa AS paid_paisa');
        // A running total identifies the first unpaid contractual due without loading every schedule into PHP.
        $installments = DB::table('loan_installments')->where('due_on', '<', $asOf)
            ->when($branch !== null, fn ($q) => $q->whereIn('loan_account_id', $scope()))
            ->selectRaw('loan_account_id, due_on, due_paisa, SUM(due_paisa) OVER (PARTITION BY loan_account_id ORDER BY sequence ROWS UNBOUNDED PRECEDING) AS cumulative_paisa');
        $arrears = DB::query()->fromSub($balances, 'b')->leftJoinSub($installments, 's', 's.loan_account_id', '=', 'b.id')
            ->selectRaw('b.id, b.branch_id, b.loan_application_id, b.opened_on, b.principal_paisa, b.charge_paisa, CASE WHEN COALESCE(SUM(s.due_paisa), 0) > b.paid_paisa THEN COALESCE(SUM(s.due_paisa), 0) - b.paid_paisa ELSE 0 END AS overdue_paisa, MIN(CASE WHEN s.cumulative_paisa > b.paid_paisa THEN s.due_on ELSE NULL END) AS oldest_unpaid_on')
            ->groupBy('b.id', 'b.branch_id', 'b.loan_application_id', 'b.opened_on', 'b.principal_paisa', 'b.charge_paisa', 'b.paid_paisa');

        return DB::query()->fromSub($arrears, 'p')->join('branches as branch', 'branch.id', '=', 'p.branch_id')
            ->join('loan_applications as application', 'application.id', '=', 'p.loan_application_id')
            ->select('p.*', 'branch.name as branch_name', 'branch.code as branch_code', 'application.application_no');
    }

    public function summary(Builder $accounts, string $asOf): array
    {
        $date = CarbonImmutable::parse($asOf);
        $query = DB::query()->fromSub($accounts, 'portfolio')->selectRaw('branch_id, branch_name, branch_code, COUNT(*) AS account_count, SUM(CASE WHEN principal_paisa + charge_paisa > 0 THEN 1 ELSE 0 END) AS outstanding_count, SUM(principal_paisa) AS principal_paisa, SUM(charge_paisa) AS charge_paisa, SUM(overdue_paisa) AS overdue_paisa');
        foreach ([30, 90] as $days) {
            $query->selectRaw('SUM(CASE WHEN oldest_unpaid_on < ? THEN principal_paisa ELSE 0 END) AS par'.$days.'_paisa', [$date->subDays($days)->toDateString()]);
        }
        foreach (['1_30' => [1, 30], '31_60' => [31, 60], '61_90' => [61, 90], '91_plus' => [91, null]] as $bucket => [$start, $end]) {
            $condition = 'oldest_unpaid_on <= ?';
            $bindings = [$date->subDays($start)->toDateString()];
            if ($end !== null) {
                $condition .= ' AND oldest_unpaid_on >= ?';
                $bindings[] = $date->subDays($end)->toDateString();
            }
            $query->selectRaw('SUM(CASE WHEN '.$condition.' THEN principal_paisa ELSE 0 END) AS aged_'.$bucket.'_paisa', $bindings);
        }
        $branches = $query->groupBy('branch_id', 'branch_name', 'branch_code')->orderBy('branch_code')->get();
        $fields = ['principal_paisa', 'charge_paisa', 'overdue_paisa', 'par30_paisa', 'par90_paisa', 'aged_1_30_paisa', 'aged_31_60_paisa', 'aged_61_90_paisa', 'aged_91_plus_paisa'];
        $totals = array_fill_keys($fields, '0');
        $totals['account_count'] = $totals['outstanding_count'] = 0;
        foreach ($branches as $row) {
            foreach ($fields as $field) {
                $row->$field = (string) $row->$field;
                $totals[$field] = (string) BigInteger::of($totals[$field])->plus($row->$field);
            }
            $row->account_count = (int) $row->account_count;
            $row->outstanding_count = (int) $row->outstanding_count;
            $totals['account_count'] += $row->account_count;
            $totals['outstanding_count'] += $row->outstanding_count;
        }

        return ['branches' => $branches, 'totals' => $totals];
    }
}
