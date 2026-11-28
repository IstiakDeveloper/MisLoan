<?php

namespace App\Services\Loans;

use App\Models\BranchBankAccount;
use App\Models\GlPostingDefault;
use App\Models\LoanAccount;
use App\Models\LoanApplication;
use App\Models\LoanCorrectionRequest;
use App\Models\LoanInstallment;
use App\Models\LoanProduct;
use App\Models\LoanTransaction;
use App\Models\MemberAdmission;
use App\Models\SavingsAccount;
use App\Services\Accounting\JournalService;
use App\Services\Accounting\Money;
use App\Services\Accounting\PostingDefaults;
use App\Services\Savings\SavingsLedgerService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LoanLedgerService
{
    public function __construct(
        private readonly LoanScheduleService $schedules,
        private readonly JournalService $journals,
        private readonly PostingDefaults $defaults,
        private readonly SavingsLedgerService $savings
    ) {}

    public function createAndDisburse(
        int $branchId,
        int $memberAdmissionId,
        int $loanProductId,
        int $principalPaisa,
        float $annualRate,
        int $installmentCount,
        string $pricingMethod,
        string $frequency,
        string $disbursedDate,
        string $firstDueDate,
        string $paymentMode,
        int $actorId,
        ?int $loanApplicationId = null,
        ?int $branchBankAccountId = null,
        ?string $bankReference = null
    ): LoanAccount {
        return DB::transaction(function () use (
            $branchId,
            $memberAdmissionId,
            $loanProductId,
            $principalPaisa,
            $annualRate,
            $installmentCount,
            $pricingMethod,
            $frequency,
            $disbursedDate,
            $firstDueDate,
            $paymentMode,
            $actorId,
            $loanApplicationId,
            $branchBankAccountId,
            $bankReference
        ) {
            $this->journals->assertOpenBusinessDay($branchId, $disbursedDate);

            $member = MemberAdmission::query()->findOrFail($memberAdmissionId);
            LoanProduct::query()->findOrFail($loanProductId);

            $plan = $this->schedules->generate(
                $branchId,
                $principalPaisa,
                $annualRate,
                $installmentCount,
                $pricingMethod,
                $frequency,
                $firstDueDate
            );

            $accountNo = sprintf('LN-%d-%s', $branchId, strtoupper(Str::random(6)));
            $account = LoanAccount::create([
                'account_no' => $accountNo,
                'loan_application_id' => $loanApplicationId,
                'member_admission_id' => $memberAdmissionId,
                'branch_id' => $branchId,
                'samity_id' => $member->samity_id,
                'loan_product_id' => $loanProductId,
                'pricing_method' => $pricingMethod,
                'installment_frequency' => $frequency,
                'annual_rate' => $annualRate,
                'installment_count' => $installmentCount,
                'principal_paisa' => $principalPaisa,
                'service_charge_paisa' => $plan['total_service_charge_paisa'],
                'disbursed_date' => $disbursedDate,
                'first_due_date' => $firstDueDate,
                'status' => LoanAccount::STATUS_ACTIVE,
                'created_by' => $actorId,
            ]);

            foreach ($plan['installments'] as $row) {
                LoanInstallment::create([
                    'loan_account_id' => $account->id,
                    ...$row,
                ]);
            }

            $portfolioAccountId = $this->requireAccountId('loan_principal_portfolio', GlPostingDefault::SCOPE_LOAN_PRODUCT, $loanProductId, $branchId);
            [$cashOrBankId, $resolvedBankAccountId] = $this->resolvePaymentLedgerAccount(
                $branchId,
                $paymentMode,
                $branchBankAccountId
            );
            $resolvedBankRef = $paymentMode === 'bank' && filled($bankReference)
                ? trim((string) $bankReference)
                : null;

            $journal = $this->journals->postEntry(
                $branchId,
                $disbursedDate,
                "Loan disbursement {$accountNo}",
                [
                    ['ledger_account_id' => $portfolioAccountId, 'debit_paisa' => $principalPaisa, 'credit_paisa' => 0],
                    ['ledger_account_id' => $cashOrBankId, 'debit_paisa' => 0, 'credit_paisa' => $principalPaisa],
                ],
                "loan-disb:{$account->id}",
                $actorId
            );

            LoanTransaction::create([
                'reference' => (string) Str::uuid(),
                'loan_account_id' => $account->id,
                'branch_id' => $branchId,
                'kind' => LoanTransaction::KIND_DISBURSEMENT,
                'business_date' => $disbursedDate,
                'principal_paisa' => $principalPaisa,
                'service_charge_paisa' => 0,
                'total_paisa' => $principalPaisa,
                'payment_mode' => $paymentMode,
                'branch_bank_account_id' => $resolvedBankAccountId,
                'bank_reference' => $resolvedBankRef,
                'idempotency_key' => "loan-disb:{$account->id}",
                'journal_entry_id' => $journal->id,
                'created_by' => $actorId,
                'created_at' => now(),
            ]);

            return $account->load('installments');
        });
    }

    public function collect(
        int $loanAccountId,
        string $businessDate,
        int $amountPaisa,
        string $paymentMode,
        string $idempotencyKey,
        int $actorId,
        ?string $note = null
    ): LoanTransaction {
        if ($amountPaisa <= 0) {
            $this->reject('আদায়ের পরিমাণ শূন্যের বেশি হতে হবে।');
        }

        return DB::transaction(function () use ($loanAccountId, $businessDate, $amountPaisa, $paymentMode, $idempotencyKey, $actorId, $note) {
            $account = LoanAccount::query()->lockForUpdate()->findOrFail($loanAccountId);
            $this->journals->assertOpenBusinessDay((int) $account->branch_id, $businessDate);

            $existing = LoanTransaction::query()
                ->where('branch_id', $account->branch_id)
                ->where('idempotency_key', $idempotencyKey)
                ->first();
            if ($existing) {
                return $existing;
            }

            if ($account->status !== LoanAccount::STATUS_ACTIVE) {
                $this->reject('শুধুমাত্র সক্রিয় (Active) ঋণ অ্যাকাউন্টে কিস্তি আদায় করা যাবে।');
            }

            $totalRemaining = $account->remainingPrincipalPaisa() + $account->remainingServiceChargePaisa();
            if ($amountPaisa > $totalRemaining) {
                $maxStr = Money::format($totalRemaining);
                $this->reject("আদায়কৃত টাকা মোট বকেয়ার (৳{$maxStr}) চেয়ে বেশি হতে পারবে না।");
            }

            $remainingToAllocate = $amountPaisa;
            $principalCollected = 0;
            $scCollected = 0;

            $installments = $account->installments()
                ->whereIn('status', [LoanInstallment::STATUS_PENDING, LoanInstallment::STATUS_PARTIAL])
                ->lockForUpdate()
                ->get();

            foreach ($installments as $inst) {
                if ($remainingToAllocate <= 0) {
                    break;
                }

                $scRem = max(0, $inst->service_charge_due_paisa - $inst->service_charge_paid_paisa);
                $scAlloc = min($remainingToAllocate, $scRem);
                $remainingToAllocate -= $scAlloc;
                $scCollected += $scAlloc;

                $pRem = max(0, $inst->principal_due_paisa - $inst->principal_paid_paisa);
                $pAlloc = min($remainingToAllocate, $pRem);
                $remainingToAllocate -= $pAlloc;
                $principalCollected += $pAlloc;

                $newScPaid = $inst->service_charge_paid_paisa + $scAlloc;
                $newPPaid = $inst->principal_paid_paisa + $pAlloc;
                $fullyPaid = ($newScPaid >= $inst->service_charge_due_paisa) && ($newPPaid >= $inst->principal_due_paisa);

                $inst->update([
                    'service_charge_paid_paisa' => $newScPaid,
                    'principal_paid_paisa' => $newPPaid,
                    'status' => $fullyPaid ? LoanInstallment::STATUS_PAID : LoanInstallment::STATUS_PARTIAL,
                ]);
            }

            $cashOrBankId = $this->requireAccountId($paymentMode === 'bank' ? 'bank_account' : 'cash_in_hand', null, null, (int) $account->branch_id);
            $portfolioId = $this->requireAccountId('loan_principal_portfolio', GlPostingDefault::SCOPE_LOAN_PRODUCT, $account->loan_product_id, (int) $account->branch_id);
            $scIncomeId = $this->requireAccountId('loan_service_charge_income', GlPostingDefault::SCOPE_LOAN_PRODUCT, $account->loan_product_id, (int) $account->branch_id);

            $lines = [
                ['ledger_account_id' => $cashOrBankId, 'debit_paisa' => $amountPaisa, 'credit_paisa' => 0],
            ];
            if ($principalCollected > 0) {
                $lines[] = ['ledger_account_id' => $portfolioId, 'debit_paisa' => 0, 'credit_paisa' => $principalCollected];
            }
            if ($scCollected > 0) {
                $lines[] = ['ledger_account_id' => $scIncomeId, 'debit_paisa' => 0, 'credit_paisa' => $scCollected];
            }

            $journal = $this->journals->postEntry(
                (int) $account->branch_id,
                $businessDate,
                "Loan collection {$account->account_no}",
                $lines,
                $idempotencyKey,
                $actorId
            );

            $tx = LoanTransaction::create([
                'reference' => (string) Str::uuid(),
                'loan_account_id' => $account->id,
                'branch_id' => $account->branch_id,
                'kind' => LoanTransaction::KIND_COLLECTION,
                'business_date' => $businessDate,
                'principal_paisa' => $principalCollected,
                'service_charge_paisa' => $scCollected,
                'total_paisa' => $amountPaisa,
                'payment_mode' => $paymentMode,
                'idempotency_key' => $idempotencyKey,
                'journal_entry_id' => $journal->id,
                'created_by' => $actorId,
                'note' => $note,
                'created_at' => now(),
            ]);

            $account->update([
                'principal_paid_paisa' => $account->principal_paid_paisa + $principalCollected,
                'service_charge_paid_paisa' => $account->service_charge_paid_paisa + $scCollected,
            ]);

            $account->refresh();
            if ($account->remainingPrincipalPaisa() === 0 && $account->remainingServiceChargePaisa() === 0) {
                $account->update(['status' => LoanAccount::STATUS_REPAID]);
                if ($account->loan_application_id) {
                    LoanApplication::query()
                        ->where('id', $account->loan_application_id)
                        ->update([
                            'status' => LoanApplication::STATUS_REPAID,
                            'repaid_at' => now(),
                            'repaid_by' => $actorId,
                        ]);
                }
            }

            return $tx;
        });
    }

    public function requestCorrection(int $transactionId, string $reason, int $actorId): LoanCorrectionRequest
    {
        $tx = LoanTransaction::query()->findOrFail($transactionId);
        if ($tx->kind !== LoanTransaction::KIND_COLLECTION) {
            $this->reject('শুধুমাত্র কিস্তি আদায়ের (Collection) লেনদেনের সংশোধন আবেদন করা যাবে।');
        }

        $alreadyReversed = LoanTransaction::query()->where('reversal_of_id', $tx->id)->exists();
        if ($alreadyReversed) {
            $this->reject('এই লেনদেনটি ইতিমধ্যে রিভার্স করা হয়েছে।');
        }

        return LoanCorrectionRequest::create([
            'loan_transaction_id' => $tx->id,
            'branch_id' => $tx->branch_id,
            'reason' => $reason,
            'status' => LoanCorrectionRequest::STATUS_PENDING,
            'requested_by' => $actorId,
        ]);
    }

    public function reviewCorrection(int $correctionId, bool $approve, string $businessDate, ?string $note, int $reviewerId): LoanCorrectionRequest
    {
        return DB::transaction(function () use ($correctionId, $approve, $businessDate, $note, $reviewerId) {
            $req = LoanCorrectionRequest::query()->with('transaction.journalEntry.lines')->lockForUpdate()->findOrFail($correctionId);

            if ($req->status !== LoanCorrectionRequest::STATUS_PENDING) {
                $this->reject('এই সংশোধন আবেদনটি ইতিমধ্যে নিষ্পত্তি হয়েছে।');
            }

            if ((int) $req->requested_by === $reviewerId) {
                $this->reject('Maker-Checker নিয়ম অনুযায়ী আবেদনকারী নিজে অনুমোদন করতে পারবেন না।');
            }

            if ($approve) {
                $tx = $req->transaction;
                $account = LoanAccount::query()->lockForUpdate()->findOrFail($tx->loan_account_id);
                $this->journals->assertOpenBusinessDay((int) $account->branch_id, $businessDate);

                // Reverse installments LIFO
                $pToReverse = (int) $tx->principal_paisa;
                $scToReverse = (int) $tx->service_charge_paisa;
                $installments = $account->installments()->orderByDesc('installment_no')->lockForUpdate()->get();

                foreach ($installments as $inst) {
                    if ($pToReverse <= 0 && $scToReverse <= 0) {
                        break;
                    }
                    $pDeduct = min($pToReverse, $inst->principal_paid_paisa);
                    $scDeduct = min($scToReverse, $inst->service_charge_paid_paisa);
                    $pToReverse -= $pDeduct;
                    $scToReverse -= $scDeduct;

                    $newP = $inst->principal_paid_paisa - $pDeduct;
                    $newSc = $inst->service_charge_paid_paisa - $scDeduct;

                    $inst->update([
                        'principal_paid_paisa' => $newP,
                        'service_charge_paid_paisa' => $newSc,
                        'status' => ($newP === 0 && $newSc === 0)
                            ? LoanInstallment::STATUS_PENDING
                            : LoanInstallment::STATUS_PARTIAL,
                    ]);
                }

                $reverseLines = $tx->journalEntry->lines->map(fn ($line) => [
                    'ledger_account_id' => $line->ledger_account_id,
                    'debit_paisa' => $line->credit_paisa,
                    'credit_paisa' => $line->debit_paisa,
                ])->all();

                $revJournal = $this->journals->postEntry(
                    (int) $account->branch_id,
                    $businessDate,
                    "Reversal of loan collection {$account->account_no}",
                    $reverseLines,
                    "loan-rev:{$tx->id}",
                    $reviewerId,
                    $tx->journal_entry_id
                );

                LoanTransaction::create([
                    'reference' => (string) Str::uuid(),
                    'loan_account_id' => $account->id,
                    'branch_id' => $account->branch_id,
                    'kind' => LoanTransaction::KIND_REVERSAL,
                    'business_date' => $businessDate,
                    'principal_paisa' => $tx->principal_paisa,
                    'service_charge_paisa' => $tx->service_charge_paisa,
                    'total_paisa' => $tx->total_paisa,
                    'payment_mode' => $tx->payment_mode,
                    'idempotency_key' => "loan-rev:{$tx->id}",
                    'journal_entry_id' => $revJournal->id,
                    'reversal_of_id' => $tx->id,
                    'created_by' => $reviewerId,
                    'note' => $note ?? $req->reason,
                    'created_at' => now(),
                ]);

                $account->update([
                    'principal_paid_paisa' => max(0, $account->principal_paid_paisa - $tx->principal_paisa),
                    'service_charge_paid_paisa' => max(0, $account->service_charge_paid_paisa - $tx->service_charge_paisa),
                    'status' => LoanAccount::STATUS_ACTIVE,
                ]);
            }

            $req->update([
                'status' => $approve ? LoanCorrectionRequest::STATUS_APPROVED : LoanCorrectionRequest::STATUS_REJECTED,
                'reviewed_by' => $reviewerId,
                'reviewed_at' => now(),
                'decision_note' => $note,
            ]);

            return $req->fresh();
        });
    }

    /**
     * @return array{0: int, 1: int|null} [ledgerAccountId, branchBankAccountId]
     */
    private function resolvePaymentLedgerAccount(int $branchId, string $paymentMode, ?int $branchBankAccountId = null): array
    {
        if ($paymentMode !== 'bank') {
            return [$this->requireAccountId('cash_in_hand', null, null, $branchId), null];
        }

        if ($branchBankAccountId !== null) {
            $bank = BranchBankAccount::query()
                ->where('branch_id', $branchId)
                ->where('is_active', true)
                ->find($branchBankAccountId);

            if (! $bank) {
                $this->reject('নির্বাচিত ব্যাংক অ্যাকাউন্টটি এই শাখার জন্য সক্রিয় নয়।');
            }

            return [(int) $bank->ledger_account_id, (int) $bank->id];
        }

        $defaultBank = BranchBankAccount::query()
            ->where('branch_id', $branchId)
            ->where('is_active', true)
            ->orderByDesc('is_default')
            ->first();

        if ($defaultBank) {
            return [(int) $defaultBank->ledger_account_id, (int) $defaultBank->id];
        }

        return [$this->requireAccountId('bank_account', null, null, $branchId), null];
    }

    private function requireAccountId(string $eventKey, ?string $scope = null, ?int $productId = null, ?int $branchId = null): int
    {
        $id = $this->defaults->resolveAccountId($eventKey, $scope, $productId, $branchId);
        if (! $id) {
            $this->reject("GL Posting Default-এ '{$eventKey}' অ্যাকাউন্ট ম্যাপ করা নেই।");
        }

        return $id;
    }

    /**
     * Build Samity-wise Daily Collection Sheet (DCS) for the active business date.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getDailyCollectionSheet(int $branchId, string $businessDate, ?int $samityId = null): array
    {
        $loans = LoanAccount::query()
            ->with([
                'memberAdmission:id,applicant_name_bn,applicant_name_en,application_no,samity_id',
                'samity:id,samity_name,samity_code',
                'installments' => fn ($q) => $q->whereIn('status', [LoanInstallment::STATUS_PENDING, LoanInstallment::STATUS_PARTIAL])
                    ->where('due_date', '<=', $businessDate)
                    ->orderBy('installment_no'),
            ])
            ->where('branch_id', $branchId)
            ->where('status', LoanAccount::STATUS_ACTIVE)
            ->when($samityId, fn ($q) => $q->where('samity_id', $samityId))
            ->orderBy('samity_id')
            ->orderBy('account_no')
            ->get();

        $memberIds = $loans->pluck('member_admission_id')->unique()->all();
        $savingsByMember = SavingsAccount::query()
            ->where('branch_id', $branchId)
            ->whereIn('member_admission_id', $memberIds)
            ->where('status', SavingsAccount::STATUS_ACTIVE)
            ->get()
            ->keyBy('member_admission_id');

        return $loans->map(function (LoanAccount $loan) use ($businessDate, $savingsByMember) {
            $regularDue = 0;
            $overdue = 0;
            foreach ($loan->installments as $inst) {
                $rem = max(0, $inst->principal_due_paisa - $inst->principal_paid_paisa)
                    + max(0, $inst->service_charge_due_paisa - $inst->service_charge_paid_paisa);
                if ($inst->due_date->toDateString() < $businessDate) {
                    $overdue += $rem;
                } else {
                    $regularDue += $rem;
                }
            }

            $savings = $savingsByMember->get($loan->member_admission_id);

            return [
                'loan_account_id' => $loan->id,
                'account_no' => $loan->account_no,
                'samity_id' => $loan->samity_id,
                'samity_name' => $loan->samity?->samity_name ?? 'No Samity',
                'member_id' => $loan->member_admission_id,
                'member_code' => $loan->memberAdmission?->application_no ?? '-',
                'member_name' => $loan->memberAdmission?->applicant_name_bn ?: ($loan->memberAdmission?->applicant_name_en ?? '-'),
                'regular_due_paisa' => $regularDue,
                'overdue_paisa' => $overdue,
                'total_due_paisa' => $regularDue + $overdue,
                'remaining_balance_paisa' => $loan->remainingPrincipalPaisa() + $loan->remainingServiceChargePaisa(),
                'savings_account_id' => $savings?->id,
                'savings_account_no' => $savings?->account_no,
                'savings_balance_paisa' => $savings?->balance_paisa ?? 0,
            ];
        })->values()->all();
    }

    /**
     * Atomically post Samity-wise bulk collections (Loan + Savings) on an open business date.
     *
     * @param  array<int, array{loan_account_id?: int|null, loan_amount_paisa?: int, savings_account_id?: int|null, savings_amount_paisa?: int}>  $rows
     * @return array{loan_count: int, loan_total_paisa: int, savings_count: int, savings_total_paisa: int}
     */
    public function postBulkDcs(
        int $branchId,
        string $businessDate,
        string $paymentMode,
        array $rows,
        string $batchKey,
        int $actorId
    ): array {
        return DB::transaction(function () use ($branchId, $businessDate, $paymentMode, $rows, $batchKey, $actorId) {
            $this->journals->assertOpenBusinessDay($branchId, $businessDate);

            $loanCount = 0;
            $loanTotal = 0;
            $savingsCount = 0;
            $savingsTotal = 0;

            foreach ($rows as $idx => $row) {
                $loanId = isset($row['loan_account_id']) ? (int) $row['loan_account_id'] : 0;
                $loanAmt = (int) ($row['loan_amount_paisa'] ?? 0);
                if ($loanId > 0 && $loanAmt > 0) {
                    $this->collect(
                        $loanId,
                        $businessDate,
                        $loanAmt,
                        $paymentMode,
                        "dcs:{$batchKey}:loan:{$idx}:{$loanId}",
                        $actorId,
                        'Samity Bulk DCS Collection'
                    );
                    $loanCount++;
                    $loanTotal += $loanAmt;
                }

                $svId = isset($row['savings_account_id']) ? (int) $row['savings_account_id'] : 0;
                $svAmt = (int) ($row['savings_amount_paisa'] ?? 0);
                if ($svId > 0 && $svAmt > 0) {
                    $this->savings->deposit(
                        $svId,
                        $businessDate,
                        $svAmt,
                        $paymentMode,
                        "dcs:{$batchKey}:sv:{$idx}:{$svId}",
                        $actorId,
                        'Samity Bulk DCS Savings'
                    );
                    $savingsCount++;
                    $savingsTotal += $svAmt;
                }
            }

            if ($loanCount === 0 && $savingsCount === 0) {
                $this->reject('বাল্ক কালেকশনে কমপক্ষে একটি লোন বা সঞ্চয়ের টাকা দিতে হবে।');
            }

            return [
                'loan_count' => $loanCount,
                'loan_total_paisa' => $loanTotal,
                'savings_count' => $savingsCount,
                'savings_total_paisa' => $savingsTotal,
            ];
        });
    }

    /**
     * Early settlement of a loan with optional service charge rebate.
     */
    public function settleEarlyWithRebate(
        int $loanAccountId,
        string $businessDate,
        int $rebatePaisa,
        string $paymentMode,
        string $idempotencyKey,
        int $actorId,
        ?string $note = null
    ): LoanTransaction {
        return DB::transaction(function () use ($loanAccountId, $businessDate, $rebatePaisa, $paymentMode, $idempotencyKey, $actorId, $note) {
            $account = LoanAccount::query()->lockForUpdate()->findOrFail($loanAccountId);
            $this->journals->assertOpenBusinessDay((int) $account->branch_id, $businessDate);

            if ($account->status !== LoanAccount::STATUS_ACTIVE) {
                $this->reject('শুধুমাত্র সক্রিয় ঋণ অ্যাকাউন্ট নিষ্পত্তি করা যাবে।');
            }

            $remP = $account->remainingPrincipalPaisa();
            $remSc = $account->remainingServiceChargePaisa();
            if ($rebatePaisa < 0 || $rebatePaisa > $remSc) {
                $this->reject('রিবেট (মওকুফ) অবশিষ্ট সার্ভিস চার্জের চেয়ে বেশি বা ঋণাত্মক হতে পারবে না।');
            }

            $netCollected = $remP + ($remSc - $rebatePaisa);
            $cashOrBankId = $this->requireAccountId($paymentMode === 'bank' ? 'bank_account' : 'cash_in_hand', null, null, (int) $account->branch_id);
            $portfolioId = $this->requireAccountId('loan_principal_portfolio', GlPostingDefault::SCOPE_LOAN_PRODUCT, $account->loan_product_id, (int) $account->branch_id);
            $scIncomeId = $this->requireAccountId('loan_service_charge_income', GlPostingDefault::SCOPE_LOAN_PRODUCT, $account->loan_product_id, (int) $account->branch_id);

            $lines = [];
            if ($netCollected > 0) {
                $lines[] = ['ledger_account_id' => $cashOrBankId, 'debit_paisa' => $netCollected, 'credit_paisa' => 0];
            }
            if ($rebatePaisa > 0) {
                $rebateId = $this->requireAccountId('loan_rebate_expense', GlPostingDefault::SCOPE_LOAN_PRODUCT, $account->loan_product_id);
                $lines[] = ['ledger_account_id' => $rebateId, 'debit_paisa' => $rebatePaisa, 'credit_paisa' => 0];
            }
            if ($remP > 0) {
                $lines[] = ['ledger_account_id' => $portfolioId, 'debit_paisa' => 0, 'credit_paisa' => $remP];
            }
            if ($remSc > 0) {
                $lines[] = ['ledger_account_id' => $scIncomeId, 'debit_paisa' => 0, 'credit_paisa' => $remSc];
            }

            $journal = $this->journals->postEntry(
                (int) $account->branch_id,
                $businessDate,
                "Early settlement with rebate {$account->account_no}",
                $lines,
                $idempotencyKey,
                $actorId
            );

            $account->installments()
                ->whereIn('status', [LoanInstallment::STATUS_PENDING, LoanInstallment::STATUS_PARTIAL])
                ->update([
                    'principal_paid_paisa' => DB::raw('principal_due_paisa'),
                    'service_charge_paid_paisa' => DB::raw('service_charge_due_paisa'),
                    'status' => LoanInstallment::STATUS_PAID,
                ]);

            $tx = LoanTransaction::create([
                'reference' => (string) Str::uuid(),
                'loan_account_id' => $account->id,
                'branch_id' => $account->branch_id,
                'kind' => LoanTransaction::KIND_REBATE,
                'business_date' => $businessDate,
                'principal_paisa' => $remP,
                'service_charge_paisa' => $remSc - $rebatePaisa,
                'total_paisa' => $netCollected,
                'payment_mode' => $paymentMode,
                'idempotency_key' => $idempotencyKey,
                'journal_entry_id' => $journal->id,
                'created_by' => $actorId,
                'note' => $note ?: ('Rebate: ৳'.Money::format($rebatePaisa)),
                'created_at' => now(),
            ]);

            $account->update([
                'principal_paid_paisa' => $account->principal_paisa,
                'service_charge_paid_paisa' => $account->service_charge_paisa,
                'status' => LoanAccount::STATUS_REPAID,
            ]);

            if ($account->loan_application_id) {
                LoanApplication::query()
                    ->where('id', $account->loan_application_id)
                    ->update([
                        'status' => LoanApplication::STATUS_REPAID,
                        'repaid_at' => now(),
                        'repaid_by' => $actorId,
                    ]);
            }

            return $tx;
        });
    }

    private function reject(string $message): never
    {
        throw ValidationException::withMessages(['loan_ledger' => [$message]]);
    }
}
