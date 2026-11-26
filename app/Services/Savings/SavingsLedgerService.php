<?php

namespace App\Services\Savings;

use App\Models\GlPostingDefault;
use App\Models\MemberAdmission;
use App\Models\SavingsAccount;
use App\Models\SavingsHold;
use App\Models\SavingsProduct;
use App\Models\SavingsTransaction;
use App\Services\Accounting\JournalService;
use App\Services\Accounting\Money;
use App\Services\Accounting\PostingDefaults;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class SavingsLedgerService
{
    public function __construct(
        private readonly JournalService $journals,
        private readonly PostingDefaults $defaults
    ) {}

    public function openAccount(
        int $branchId,
        int $memberAdmissionId,
        int $savingsProductId,
        float $profitRate,
        string $openedDate,
        int $actorId,
        ?int $savingsApplicationId = null
    ): SavingsAccount {
        $member = MemberAdmission::query()->findOrFail($memberAdmissionId);
        SavingsProduct::query()->findOrFail($savingsProductId);

        return SavingsAccount::create([
            'account_no' => sprintf('SV-%d-%s', $branchId, strtoupper(Str::random(6))),
            'savings_application_id' => $savingsApplicationId,
            'member_admission_id' => $memberAdmissionId,
            'branch_id' => $branchId,
            'samity_id' => $member->samity_id,
            'savings_product_id' => $savingsProductId,
            'profit_rate' => $profitRate,
            'balance_paisa' => 0,
            'held_paisa' => 0,
            'opened_date' => $openedDate,
            'status' => SavingsAccount::STATUS_ACTIVE,
            'created_by' => $actorId,
        ]);
    }

    public function deposit(
        int $savingsAccountId,
        string $businessDate,
        int $amountPaisa,
        string $paymentMode,
        string $idempotencyKey,
        int $actorId,
        ?string $note = null
    ): SavingsTransaction {
        if ($amountPaisa <= 0) {
            $this->reject('জমার পরিমাণ শূন্যের বেশি হতে হবে।');
        }

        return DB::transaction(function () use ($savingsAccountId, $businessDate, $amountPaisa, $paymentMode, $idempotencyKey, $actorId, $note) {
            $account = SavingsAccount::query()->lockForUpdate()->findOrFail($savingsAccountId);
            $this->journals->assertOpenBusinessDay((int) $account->branch_id, $businessDate);

            $existing = SavingsTransaction::query()
                ->where('branch_id', $account->branch_id)
                ->where('idempotency_key', $idempotencyKey)
                ->first();
            if ($existing) {
                return $existing;
            }

            if ($account->status !== SavingsAccount::STATUS_ACTIVE) {
                $this->reject('বন্ধ হওয়া সঞ্চয় অ্যাকাউন্টে জমা দেওয়া যাবে না।');
            }

            $cashOrBankId = $this->requireAccountId($paymentMode === 'bank' ? 'bank_account' : 'cash_in_hand');
            $savingsLiabilityId = $this->requireAccountId('savings_liability', GlPostingDefault::SCOPE_SAVINGS_PRODUCT, $account->savings_product_id);

            $journal = $this->journals->postEntry(
                (int) $account->branch_id,
                $businessDate,
                "Savings deposit {$account->account_no}",
                [
                    ['ledger_account_id' => $cashOrBankId, 'debit_paisa' => $amountPaisa, 'credit_paisa' => 0],
                    ['ledger_account_id' => $savingsLiabilityId, 'debit_paisa' => 0, 'credit_paisa' => $amountPaisa],
                ],
                $idempotencyKey,
                $actorId
            );

            $tx = SavingsTransaction::create([
                'reference' => (string) Str::uuid(),
                'savings_account_id' => $account->id,
                'branch_id' => $account->branch_id,
                'kind' => SavingsTransaction::KIND_DEPOSIT,
                'business_date' => $businessDate,
                'amount_paisa' => $amountPaisa,
                'payment_mode' => $paymentMode,
                'idempotency_key' => $idempotencyKey,
                'journal_entry_id' => $journal->id,
                'created_by' => $actorId,
                'note' => $note,
                'created_at' => now(),
            ]);

            $account->update(['balance_paisa' => $account->balance_paisa + $amountPaisa]);

            return $tx;
        });
    }

    public function withdraw(
        int $savingsAccountId,
        string $businessDate,
        int $amountPaisa,
        string $paymentMode,
        string $idempotencyKey,
        int $actorId,
        ?string $note = null
    ): SavingsTransaction {
        if ($amountPaisa <= 0) {
            $this->reject('উত্তোলনের পরিমাণ শূন্যের বেশি হতে হবে।');
        }

        return DB::transaction(function () use ($savingsAccountId, $businessDate, $amountPaisa, $paymentMode, $idempotencyKey, $actorId, $note) {
            $account = SavingsAccount::query()->lockForUpdate()->findOrFail($savingsAccountId);
            $this->journals->assertOpenBusinessDay((int) $account->branch_id, $businessDate);

            $existing = SavingsTransaction::query()
                ->where('branch_id', $account->branch_id)
                ->where('idempotency_key', $idempotencyKey)
                ->first();
            if ($existing) {
                return $existing;
            }

            $available = $account->availableBalancePaisa();
            if ($amountPaisa > $available) {
                $availStr = Money::format($available);
                $this->reject("উত্তোলনযোগ্য স্থিতি (৳{$availStr}) পর্যাপ্ত নয়।");
            }

            $cashOrBankId = $this->requireAccountId($paymentMode === 'bank' ? 'bank_account' : 'cash_in_hand');
            $savingsLiabilityId = $this->requireAccountId('savings_liability', GlPostingDefault::SCOPE_SAVINGS_PRODUCT, $account->savings_product_id);

            $journal = $this->journals->postEntry(
                (int) $account->branch_id,
                $businessDate,
                "Savings withdrawal {$account->account_no}",
                [
                    ['ledger_account_id' => $savingsLiabilityId, 'debit_paisa' => $amountPaisa, 'credit_paisa' => 0],
                    ['ledger_account_id' => $cashOrBankId, 'debit_paisa' => 0, 'credit_paisa' => $amountPaisa],
                ],
                $idempotencyKey,
                $actorId
            );

            $tx = SavingsTransaction::create([
                'reference' => (string) Str::uuid(),
                'savings_account_id' => $account->id,
                'branch_id' => $account->branch_id,
                'kind' => SavingsTransaction::KIND_WITHDRAWAL,
                'business_date' => $businessDate,
                'amount_paisa' => $amountPaisa,
                'payment_mode' => $paymentMode,
                'idempotency_key' => $idempotencyKey,
                'journal_entry_id' => $journal->id,
                'created_by' => $actorId,
                'note' => $note,
                'created_at' => now(),
            ]);

            $account->update(['balance_paisa' => $account->balance_paisa - $amountPaisa]);

            return $tx;
        });
    }

    public function postMonthlyProfit(int $savingsAccountId, string $businessDate, int $actorId): ?SavingsTransaction
    {
        return DB::transaction(function () use ($savingsAccountId, $businessDate, $actorId) {
            $account = SavingsAccount::query()->lockForUpdate()->findOrFail($savingsAccountId);
            if ($account->balance_paisa <= 0 || (float) $account->profit_rate <= 0) {
                return null;
            }

            $profitPaisa = (int) round($account->balance_paisa * (((float) $account->profit_rate / 100) / 12));
            if ($profitPaisa <= 0) {
                return null;
            }

            $this->journals->assertOpenBusinessDay((int) $account->branch_id, $businessDate);

            $expenseId = $this->requireAccountId('savings_profit_expense', GlPostingDefault::SCOPE_SAVINGS_PRODUCT, $account->savings_product_id);
            $liabilityId = $this->requireAccountId('savings_liability', GlPostingDefault::SCOPE_SAVINGS_PRODUCT, $account->savings_product_id);
            $idem = "sv-profit:{$account->id}:{$businessDate}";

            $journal = $this->journals->postEntry(
                (int) $account->branch_id,
                $businessDate,
                "Monthly savings profit {$account->account_no}",
                [
                    ['ledger_account_id' => $expenseId, 'debit_paisa' => $profitPaisa, 'credit_paisa' => 0],
                    ['ledger_account_id' => $liabilityId, 'debit_paisa' => 0, 'credit_paisa' => $profitPaisa],
                ],
                $idem,
                $actorId
            );

            $tx = SavingsTransaction::create([
                'reference' => (string) Str::uuid(),
                'savings_account_id' => $account->id,
                'branch_id' => $account->branch_id,
                'kind' => SavingsTransaction::KIND_PROFIT,
                'business_date' => $businessDate,
                'amount_paisa' => $profitPaisa,
                'payment_mode' => 'journal',
                'idempotency_key' => $idem,
                'journal_entry_id' => $journal->id,
                'created_by' => $actorId,
                'created_at' => now(),
            ]);

            $account->update(['balance_paisa' => $account->balance_paisa + $profitPaisa]);

            return $tx;
        });
    }

    public function placeHold(int $savingsAccountId, int $amountPaisa, string $reason, int $actorId): SavingsHold
    {
        return DB::transaction(function () use ($savingsAccountId, $amountPaisa, $reason, $actorId) {
            $account = SavingsAccount::query()->lockForUpdate()->findOrFail($savingsAccountId);
            if ($amountPaisa > $account->availableBalancePaisa()) {
                $this->reject('সঞ্চয়ের স্থিতির চেয়ে বেশি টাকা লিন/হোল্ড করা যাবে না।');
            }

            $hold = SavingsHold::create([
                'savings_account_id' => $account->id,
                'amount_paisa' => $amountPaisa,
                'reason' => $reason,
                'is_active' => true,
                'created_by' => $actorId,
            ]);

            $account->update(['held_paisa' => $account->held_paisa + $amountPaisa]);

            return $hold;
        });
    }

    private function requireAccountId(string $eventKey, ?string $scope = null, ?int $productId = null): int
    {
        $id = $this->defaults->resolveAccountId($eventKey, $scope, $productId);
        if (! $id) {
            $this->reject("GL Posting Default-এ '{$eventKey}' অ্যাকাউন্ট ম্যাপ করা নেই।");
        }

        return $id;
    }

    private function reject(string $message): never
    {
        throw ValidationException::withMessages(['savings_ledger' => [$message]]);
    }
}
