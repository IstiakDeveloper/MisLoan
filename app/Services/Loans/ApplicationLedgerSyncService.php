<?php

namespace App\Services\Loans;

use App\Models\Branch;
use App\Models\LoanAccount;
use App\Models\LoanApplication;
use App\Models\SavingsAccount;
use App\Models\SavingsApplication;
use App\Services\Accounting\Money;
use App\Services\Accounting\PostingDefaults;
use App\Services\AccountingPeriodService;
use App\Services\Savings\SavingsLedgerService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class ApplicationLedgerSyncService
{
    public function __construct(
        private readonly LoanLedgerService $loanLedger,
        private readonly SavingsLedgerService $savingsLedger,
        private readonly AccountingPeriodService $periods,
        private readonly PostingDefaults $defaults
    ) {}

    public function syncLoanDisbursement(
        LoanApplication $application,
        string $disbursementDate,
        float $disbursedAmount,
        string $paymentMode,
        int $actorId
    ): ?LoanAccount {
        if (! Schema::hasTable('loan_accounts') || ! Schema::hasTable('branch_accounting_periods') || ! Schema::hasTable('gl_posting_defaults')) {
            return null;
        }

        $existing = LoanAccount::query()->where('loan_application_id', $application->id)->first();
        if ($existing) {
            return $existing;
        }

        $branchId = (int) $application->branch_id;
        if (! $this->isBranchAccountingEnabled($branchId)) {
            return null;
        }

        $dayState = $this->periods->getBranchDayState($branchId);
        if (! $dayState || ! ($dayState['has_open_day'] ?? false) || $dayState['business_date'] !== $disbursementDate) {
            return null;
        }

        if (! $this->defaults->resolveAccountId('loan_principal_portfolio') || ! $this->defaults->resolveAccountId($paymentMode === 'bank' ? 'bank_account' : 'cash_in_hand')) {
            return null;
        }

        $product = $application->loanProduct;
        if (! $product || ! $application->member_admission_id) {
            return null;
        }

        $frequency = strtolower((string) ($product->installment_type ?? 'weekly')) === 'monthly' ? 'monthly' : 'weekly';
        $pricing = strtolower((string) ($product->interest_calculation_type ?? 'flat')) === 'declining' ? 'declining' : 'flat';
        $annualRate = (float) ($product->interest_rate ?? $product->service_charge ?? 0);
        $installments = max(1, (int) ($application->number_of_installments ?: $product->number_of_installments ?: 45));
        $firstDueDate = $application->approved_start_date
            ? CarbonImmutable::parse($application->approved_start_date)->toDateString()
            : ($frequency === 'monthly'
                ? CarbonImmutable::parse($disbursementDate)->addMonth()->toDateString()
                : CarbonImmutable::parse($disbursementDate)->addWeek()->toDateString());

        try {
            return $this->loanLedger->createAndDisburse(
                $branchId,
                (int) $application->member_admission_id,
                (int) $product->id,
                Money::toPaisa(number_format($disbursedAmount, 2, '.', '')),
                $annualRate,
                $installments,
                $pricing,
                $frequency,
                $disbursementDate,
                $firstDueDate,
                $paymentMode === 'bank' ? 'bank' : 'cash',
                $actorId,
                $application->id
            );
        } catch (\Throwable $e) {
            Log::warning('Auto loan ledger sync skipped: '.$e->getMessage(), ['loan_application_id' => $application->id]);

            return null;
        }
    }

    public function syncSavingsActivation(SavingsApplication $application, int $actorId): ?SavingsAccount
    {
        if (! Schema::hasTable('savings_accounts')) {
            return null;
        }

        $existing = SavingsAccount::query()->where('savings_application_id', $application->id)->first();
        if ($existing) {
            return $existing;
        }

        if (! $application->member_admission_id || ! $application->savings_product_id || ! $application->branch_id) {
            return null;
        }

        if (! $this->isBranchAccountingEnabled((int) $application->branch_id)) {
            return null;
        }

        $product = $application->savingsProduct;
        $profitRate = (float) ($product?->interest_rate ?? 0);
        $openedDate = $application->account_opening_date
            ? CarbonImmutable::parse($application->account_opening_date)->toDateString()
            : CarbonImmutable::now('Asia/Dhaka')->toDateString();

        try {
            return $this->savingsLedger->openAccount(
                (int) $application->branch_id,
                (int) $application->member_admission_id,
                (int) $application->savings_product_id,
                $profitRate,
                $openedDate,
                $actorId,
                $application->id
            );
        } catch (\Throwable $e) {
            Log::warning('Auto savings ledger sync skipped: '.$e->getMessage(), ['savings_application_id' => $application->id]);

            return null;
        }
    }

    private function isBranchAccountingEnabled(int $branchId): bool
    {
        if (! Schema::hasColumn('branches', 'accounting_enabled')) {
            return true;
        }

        return (bool) Branch::whereKey($branchId)->value('accounting_enabled');
    }
}
