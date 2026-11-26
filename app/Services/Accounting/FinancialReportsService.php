<?php

namespace App\Services\Accounting;

use App\Models\JournalLine;
use App\Models\LedgerAccount;
use App\Models\LoanAccount;
use App\Models\MemberAdmission;
use App\Models\SavingsAccount;
use Carbon\CarbonImmutable;

class FinancialReportsService
{
    /** @return array<int, array<string, mixed>> */
    public function trialBalance(?int $branchId, string $fromDate, string $toDate): array
    {
        $rows = JournalLine::query()
            ->join('journal_entries', 'journal_entries.id', '=', 'journal_lines.journal_entry_id')
            ->join('ledger_accounts', 'ledger_accounts.id', '=', 'journal_lines.ledger_account_id')
            ->when($branchId, fn ($q) => $q->where('journal_entries.branch_id', $branchId))
            ->whereBetween('journal_entries.business_date', [$fromDate, $toDate])
            ->groupBy('ledger_accounts.id', 'ledger_accounts.code', 'ledger_accounts.name', 'ledger_accounts.type')
            ->orderBy('ledger_accounts.code')
            ->selectRaw('ledger_accounts.id, ledger_accounts.code, ledger_accounts.name, ledger_accounts.type, SUM(journal_lines.debit_paisa) as debit_paisa, SUM(journal_lines.credit_paisa) as credit_paisa')
            ->get();

        return $rows->map(fn ($r) => [
            'id' => (int) $r->id,
            'code' => $r->code,
            'name' => $r->name,
            'type' => $r->type,
            'debit_paisa' => (int) $r->debit_paisa,
            'credit_paisa' => (int) $r->credit_paisa,
            'net_paisa' => (int) $r->debit_paisa - (int) $r->credit_paisa,
        ])->all();
    }

    /** @return array<string, mixed> */
    public function incomeAndBalanceSheet(?int $branchId, string $asOfDate): array
    {
        $tb = $this->trialBalance($branchId, '1900-01-01', $asOfDate);

        $assets = [];
        $liabilities = [];
        $equity = [];
        $income = [];
        $expense = [];

        $totalAssets = 0;
        $totalLiabilities = 0;
        $totalEquity = 0;
        $totalIncome = 0;
        $totalExpense = 0;

        foreach ($tb as $row) {
            $debit = $row['debit_paisa'];
            $credit = $row['credit_paisa'];

            switch ($row['type']) {
                case LedgerAccount::TYPE_ASSET:
                    $bal = $debit - $credit;
                    $totalAssets += $bal;
                    $assets[] = [...$row, 'balance_paisa' => $bal];
                    break;
                case LedgerAccount::TYPE_LIABILITY:
                    $bal = $credit - $debit;
                    $totalLiabilities += $bal;
                    $liabilities[] = [...$row, 'balance_paisa' => $bal];
                    break;
                case LedgerAccount::TYPE_EQUITY:
                    $bal = $credit - $debit;
                    $totalEquity += $bal;
                    $equity[] = [...$row, 'balance_paisa' => $bal];
                    break;
                case LedgerAccount::TYPE_INCOME:
                    $bal = $credit - $debit;
                    $totalIncome += $bal;
                    $income[] = [...$row, 'balance_paisa' => $bal];
                    break;
                case LedgerAccount::TYPE_EXPENSE:
                    $bal = $debit - $credit;
                    $totalExpense += $bal;
                    $expense[] = [...$row, 'balance_paisa' => $bal];
                    break;
            }
        }

        $netSurplus = $totalIncome - $totalExpense;

        return [
            'assets' => $assets,
            'liabilities' => $liabilities,
            'equity' => $equity,
            'income' => $income,
            'expense' => $expense,
            'totals' => [
                'assets_paisa' => $totalAssets,
                'liabilities_paisa' => $totalLiabilities,
                'equity_paisa' => $totalEquity,
                'income_paisa' => $totalIncome,
                'expense_paisa' => $totalExpense,
                'net_surplus_paisa' => $netSurplus,
                'liabilities_plus_equity_paisa' => $totalLiabilities + $totalEquity + $netSurplus,
            ],
        ];
    }

    /** @return array<string, mixed> */
    public function portfolioParAndPomis(?int $branchId, string $asOfDate): array
    {
        $activeLoans = LoanAccount::query()
            ->with(['installments' => fn ($q) => $q->whereIn('status', ['pending', 'partial'])->orderBy('due_date')])
            ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
            ->where('status', LoanAccount::STATUS_ACTIVE)
            ->get();

        $buckets = [
            'regular' => ['count' => 0, 'outstanding_paisa' => 0],
            'par_1_30' => ['count' => 0, 'outstanding_paisa' => 0],
            'par_31_60' => ['count' => 0, 'outstanding_paisa' => 0],
            'par_61_90' => ['count' => 0, 'outstanding_paisa' => 0],
            'par_91_180' => ['count' => 0, 'outstanding_paisa' => 0],
            'par_180_plus' => ['count' => 0, 'outstanding_paisa' => 0],
        ];

        $asOf = CarbonImmutable::parse($asOfDate);

        foreach ($activeLoans as $loan) {
            $outstanding = $loan->remainingPrincipalPaisa();
            $oldestOverdue = $loan->installments->first(fn ($i) => $i->due_date->toDateString() < $asOfDate);
            $days = $oldestOverdue ? CarbonImmutable::parse($oldestOverdue->due_date)->diffInDays($asOf) : 0;

            $key = match (true) {
                $days > 180 => 'par_180_plus',
                $days >= 91 => 'par_91_180',
                $days >= 61 => 'par_61_90',
                $days >= 31 => 'par_31_60',
                $days >= 1 => 'par_1_30',
                default => 'regular',
            };

            $buckets[$key]['count']++;
            $buckets[$key]['outstanding_paisa'] += $outstanding;
        }

        $totalMembers = MemberAdmission::query()
            ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
            ->where('status', 'approved')
            ->count();

        $totalSavingsPaisa = (int) SavingsAccount::query()
            ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
            ->where('status', SavingsAccount::STATUS_ACTIVE)
            ->sum('balance_paisa');

        return [
            'pomis' => [
                'approved_members' => $totalMembers,
                'active_borrowers' => $activeLoans->count(),
                'total_loan_outstanding_paisa' => $activeLoans->sum(fn ($l) => $l->remainingPrincipalPaisa()),
                'total_savings_balance_paisa' => $totalSavingsPaisa,
            ],
            'par_buckets' => $buckets,
        ];
    }
}
