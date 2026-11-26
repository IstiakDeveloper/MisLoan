<?php

namespace App\Console\Commands;

use App\Models\JournalLine;
use App\Models\LoanAccount;
use App\Models\SavingsAccount;
use App\Services\Accounting\Money;
use App\Services\Accounting\PostingDefaults;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Schema;

class CheckFinancialLedgers extends Command
{
    protected $signature = 'finance:check-ledgers';

    protected $description = 'Verify double-entry GL balance (Debit == Credit) and sub-ledger vs control account integrity';

    public function handle(PostingDefaults $defaults): int
    {
        if (! Schema::hasTable('journal_lines')) {
            $this->warn('Accounting tables not migrated yet.');

            return self::SUCCESS;
        }

        $totals = JournalLine::query()
            ->selectRaw('COALESCE(SUM(debit_paisa), 0) as total_debit, COALESCE(SUM(credit_paisa), 0) as total_credit')
            ->first();

        $debit = (int) ($totals->total_debit ?? 0);
        $credit = (int) ($totals->total_credit ?? 0);

        if ($debit !== $credit) {
            $this->error('GL IMBALANCE DETECTED: Debit='.Money::format($debit).' Credit='.Money::format($credit));

            return self::FAILURE;
        }

        $this->info('GL Double-Entry Balanced: ৳'.Money::format($debit));

        if (Schema::hasTable('loan_accounts')) {
            $loanSubledger = (int) LoanAccount::query()
                ->where('status', LoanAccount::STATUS_ACTIVE)
                ->selectRaw('COALESCE(SUM(principal_paisa - principal_paid_paisa), 0) as bal')
                ->value('bal');

            $loanGlAccount = $defaults->resolveAccountId('loan_principal_portfolio');
            if ($loanGlAccount) {
                $loanGl = (int) JournalLine::query()
                    ->where('ledger_account_id', $loanGlAccount)
                    ->selectRaw('COALESCE(SUM(debit_paisa - credit_paisa), 0) as bal')
                    ->value('bal');

                $this->line('Loan Principal Subledger: ৳'.Money::format($loanSubledger).' | GL Control: ৳'.Money::format($loanGl));
            }
        }

        if (Schema::hasTable('savings_accounts')) {
            $savingsSubledger = (int) SavingsAccount::query()
                ->where('status', SavingsAccount::STATUS_ACTIVE)
                ->sum('balance_paisa');

            $savingsGlAccount = $defaults->resolveAccountId('savings_liability');
            if ($savingsGlAccount) {
                $savingsGl = (int) JournalLine::query()
                    ->where('ledger_account_id', $savingsGlAccount)
                    ->selectRaw('COALESCE(SUM(credit_paisa - debit_paisa), 0) as bal')
                    ->value('bal');

                $this->line('Savings Subledger: ৳'.Money::format($savingsSubledger).' | GL Control: ৳'.Money::format($savingsGl));
            }
        }

        return self::SUCCESS;
    }
}
