<?php

namespace App\Services\Accounting;

use App\Models\User;
use Brick\Math\BigInteger;
use Carbon\CarbonImmutable;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class FinancialReports
{
    public function authorize(User $actor, ?int $branch): void
    {
        abort_unless($actor->is_active && $actor->isSuperAdmin() && ! $actor->isBranchAccount() && ($branch === null || $actor->canAccessBranch($branch)), 403);
    }

    public function dates(string $from, string $to): void
    {
        foreach ([$from, $to] as $value) {
            try {
                $date = CarbonImmutable::createFromFormat('!Y-m-d', $value);
            } catch (\Throwable) {
                $date = null;
            }
            if (! $date || $date->format('Y-m-d') !== $value || $date->isFuture()) {
                throw ValidationException::withMessages(['report' => 'Use valid report dates that are not in the future.']);
            }
        }
        if ($from > $to) {
            throw ValidationException::withMessages(['report' => 'The start date must not follow the end date.']);
        }
    }

    public function lines(string $to, ?int $branch): Builder
    {
        return DB::table('journal_lines as l')->join('journal_entries as j', 'j.id', '=', 'l.journal_entry_id')
            ->where('j.business_date', '<=', $to)->when($branch !== null, fn ($q) => $q->where('j.branch_id', $branch));
    }

    public function balances(User $actor, string $from, string $to, ?int $branch = null): array
    {
        $this->authorize($actor, $branch);
        $this->dates($from, $to);
        $movements = $this->lines($to, $branch)->select('l.ledger_account_id')
            ->selectRaw('SUM(CASE WHEN j.business_date < ? THEN l.debit_paisa ELSE 0 END) AS opening_debit, SUM(CASE WHEN j.business_date < ? THEN l.credit_paisa ELSE 0 END) AS opening_credit', [$from, $from])
            ->selectRaw('SUM(CASE WHEN j.business_date >= ? THEN l.debit_paisa ELSE 0 END) AS debit, SUM(CASE WHEN j.business_date >= ? THEN l.credit_paisa ELSE 0 END) AS credit', [$from, $from])->groupBy('l.ledger_account_id');
        $rows = DB::table('ledger_accounts as a')->joinSub($movements, 'm', 'm.ledger_account_id', '=', 'a.id')->orderBy('a.code')->get(['a.id', 'a.code', 'a.name', 'a.type', 'a.is_active', 'm.*']);
        $totals = array_fill_keys(['opening_debit_paisa', 'opening_credit_paisa', 'debit_paisa', 'credit_paisa', 'closing_debit_paisa', 'closing_credit_paisa', 'asset_paisa', 'liability_paisa', 'equity_paisa', 'income_paisa', 'expense_paisa', 'period_income_paisa', 'period_expense_paisa'], '0');
        foreach ($rows as $row) {
            $opening = BigInteger::of((string) $row->opening_debit)->minus((string) $row->opening_credit);
            $movement = BigInteger::of((string) $row->debit)->minus((string) $row->credit);
            $closing = $opening->plus($movement);
            $row->opening_paisa = (string) $opening;
            $row->debit_paisa = (string) $row->debit;
            $row->credit_paisa = (string) $row->credit;
            $row->closing_paisa = (string) $closing;
            foreach (['opening' => $opening, 'closing' => $closing] as $prefix => $net) {
                $side = $net->isNegative() ? 'credit' : 'debit';
                $key = $prefix.'_'.$side.'_paisa';
                $totals[$key] = (string) BigInteger::of($totals[$key])->plus($net->abs());
            }
            foreach (['debit', 'credit'] as $side) {
                $totals[$side.'_paisa'] = (string) BigInteger::of($totals[$side.'_paisa'])->plus($row->{$side.'_paisa'});
            }
            $normal = in_array($row->type, ['asset', 'expense'], true) ? $closing : $closing->negated();
            $row->normal_balance_paisa = (string) $normal;
            $row->period_normal_paisa = (string) (in_array($row->type, ['asset', 'expense'], true) ? $movement : $movement->negated());
            $key = $row->type.'_paisa';
            $totals[$key] = (string) BigInteger::of($totals[$key])->plus($normal);
            if (in_array($row->type, ['income', 'expense'], true)) {
                $key = 'period_'.$row->type.'_paisa';
                $totals[$key] = (string) BigInteger::of($totals[$key])->plus($row->type === 'income' ? $movement->negated() : $movement);
            }
            unset($row->opening_debit, $row->opening_credit, $row->debit, $row->credit);
        }
        $totals['cumulative_surplus_paisa'] = (string) BigInteger::of($totals['income_paisa'])->minus($totals['expense_paisa']);
        $totals['period_surplus_paisa'] = (string) BigInteger::of($totals['period_income_paisa'])->minus($totals['period_expense_paisa']);
        $totals['balance_sheet_difference_paisa'] = (string) BigInteger::of($totals['asset_paisa'])->minus($totals['liability_paisa'])->minus($totals['equity_paisa'])->minus($totals['cumulative_surplus_paisa']);
        $totals['trial_difference_paisa'] = (string) BigInteger::of($totals['closing_debit_paisa'])->minus($totals['closing_credit_paisa']);

        return ['rows' => $rows, 'totals' => $totals];
    }

    public function accountLedger(User $actor, int $account, string $from, string $to, ?int $branch = null): array
    {
        $this->authorize($actor, $branch);
        $this->dates($from, $to);
        abort_unless(DB::table('ledger_accounts')->where('id', $account)->exists(), 404);
        $opening = $this->lines($to, $branch)->where('l.ledger_account_id', $account)->where('j.business_date', '<', $from)
            ->selectRaw('COALESCE(SUM(l.debit_paisa),0) AS debit, COALESCE(SUM(l.credit_paisa),0) AS credit')->first();
        $net = (string) BigInteger::of((string) $opening->debit)->minus((string) $opening->credit);
        $query = $this->lines($to, $branch)->where('l.ledger_account_id', $account)->where('j.business_date', '>=', $from)
            ->join('branches as b', 'b.id', '=', 'j.branch_id')->select('l.id', 'j.id as journal_id', 'j.reference', 'j.business_date', 'j.description', 'j.source_type', 'j.reversal_of', 'b.code as branch_code')
            ->selectRaw('CAST(l.debit_paisa AS CHAR) AS debit_paisa, CAST(l.credit_paisa AS CHAR) AS credit_paisa, CAST(CAST(? AS DECIMAL(65,0)) + SUM(l.debit_paisa - l.credit_paisa) OVER (ORDER BY j.business_date, j.id, l.id ROWS UNBOUNDED PRECEDING) AS CHAR) AS running_paisa', [$net]);

        return ['opening_paisa' => $net, 'query' => DB::query()->fromSub($query, 'statement')->orderBy('business_date')->orderBy('journal_id')->orderBy('id')];
    }
}
