<?php

namespace App\Services\Loans;

use App\Models\LoanApplication;
use App\Models\User;
use App\Services\Accounting\JournalService;
use App\Services\Accounting\Money;
use Brick\Math\BigInteger;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class LoanLedger
{
    public function __construct(private readonly JournalService $journals, private readonly LoanContract $contracts) {}

    private function fail(string $message): never
    {
        throw ValidationException::withMessages(['ledger' => $message]);
    }

    private function authorize(User $actor, int $branch): void
    {
        abort_unless($actor->is_active && ! $actor->isBranchAccount() && $actor->isSuperAdmin() && $actor->canAccessBranch($branch), 403);
    }

    private function amount(string $amount): int
    {
        try {
            return Money::toPaisa($amount);
        } catch (\InvalidArgumentException $e) {
            $this->fail($e->getMessage());
        }
    }

    private function date(string $date): void
    {
        try {
            $parsed = CarbonImmutable::createFromFormat('!Y-m-d', $date);
        } catch (\Throwable) {
            $parsed = null;
        }
        if (! $parsed || $parsed->format('Y-m-d') !== $date || $parsed->isFuture()) {
            $this->fail('Use a valid business date that is not in the future.');
        }
    }

    private function counter(int $id, string $type): void
    {
        $account = DB::table('ledger_accounts')->find($id);
        if (! $account || ! $account->is_active || $account->type !== $type) {
            $this->fail('Select an active '.$type.' ledger account.');
        }
    }

    public function open(User $actor, int $applicationId, int $principalAccount, int $incomeAccount, int $counterAccount, string $mode, string $date, string $firstDueDate, string $outstandingPrincipal, string $outstandingCharge, string $reference): object
    {
        $this->date($date);
        $principal = $this->amount($outstandingPrincipal);
        $charge = $this->amount($outstandingCharge);
        if ($principal + $charge <= 0 || $principal + $charge > Money::MAX_PAISA) {
            $this->fail('Declare a positive outstanding balance within the supported limit.');
        }
        if (! in_array($mode, ['disbursement', 'opening_balance'], true) || trim($reference) === '' || mb_strlen($reference) > 255) {
            $this->fail('A posting mode and verification reference are required.');
        }
        $hash = hash('sha256', json_encode([$applicationId, $principalAccount, $incomeAccount, $counterAccount, $mode, $date, $firstDueDate, $principal, $charge, $reference], JSON_THROW_ON_ERROR));

        return DB::transaction(function () use ($actor, $applicationId, $principalAccount, $incomeAccount, $counterAccount, $mode, $date, $firstDueDate, $principal, $charge, $reference, $hash) {
            $loan = LoanApplication::query()->lockForUpdate()->findOrFail($applicationId);
            $this->authorize($actor, (int) $loan->branch_id);
            if ($existing = DB::table('loan_accounts')->where('loan_application_id', $applicationId)->first()) {
                if (! hash_equals($existing->opening_hash, $hash)) {
                    $this->fail('This loan already has a different ledger opening.');
                }

                return $existing;
            }
            if ($loan->status !== LoanApplication::STATUS_DISBURSED || $loan->hasPendingAmountChange()) {
                $this->fail('Complete the existing approval and disbursement workflow first.');
            }
            if ($principal === 0) {
                DB::table('branches')->where('id', $loan->branch_id)->lockForUpdate()->first();
                $periods = DB::table('accounting_periods')->where('branch_id', $loan->branch_id)->where('starts_on', '<=', $date)->where('ends_on', '>=', $date)->lockForUpdate()->get();
                if ($periods->count() !== 1 || $periods->first()->closed_at !== null || DB::table('accounting_periods')->where('branch_id', $loan->branch_id)->whereNotNull('closed_at')->where('ends_on', '>=', $date)->exists()) {
                    $this->fail('Exactly one open accounting period must cover the opening date.');
                }
            }
            $contract = $this->contracts->read($loan);
            if ($date < $contract['disbursed_on'] || $principal > $contract['principal_paisa'] || $charge > $contract['charge_paisa']) {
                $this->fail('Opening balances/date conflict with the saved contract.');
            }
            if ($mode === 'disbursement' && ($date !== $contract['disbursed_on'] || $principal !== $contract['principal_paisa'] || $charge !== $contract['charge_paisa'])) {
                $this->fail('Disbursement posting must use the full original amount and original disbursement date. Use an audited opening for a partly repaid loan.');
            }
            $this->counter($principalAccount, 'asset');
            if ($principalAccount === $counterAccount) {
                $this->fail('The cash/bank offset must differ from the loan principal control account.');
            }
            $this->counter($incomeAccount, 'income');
            $this->counter($counterAccount, $mode === 'disbursement' ? 'asset' : 'equity');
            if ($counterAccount === $principalAccount) {
                $this->fail('The cash/bank account cannot be the loan principal control account.');
            }
            $schedule = $this->contracts->schedule($contract, $firstDueDate);
            $contract['branch_id'] = (int) $loan->branch_id;
            $contract['member_admission_id'] = $loan->member_admission_id;
            $id = DB::table('loan_accounts')->insertGetId([
                'reference' => (string) Str::uuid(), 'loan_application_id' => $applicationId, 'branch_id' => $loan->branch_id,
                'principal_account_id' => $principalAccount, 'charge_income_account_id' => $incomeAccount,
                'terms_snapshot' => json_encode($contract, JSON_THROW_ON_ERROR), 'opening_hash' => $hash,
                'opening_reference' => $reference, 'opening_mode' => $mode, 'opened_on' => $date, 'disbursed_on' => $contract['disbursed_on'],
                'contract_principal_paisa' => $contract['principal_paisa'], 'contract_charge_paisa' => $contract['charge_paisa'],
                'opening_principal_paisa' => $principal, 'opening_charge_paisa' => $charge,
                'pre_opening_paid_paisa' => $contract['principal_paisa'] + $contract['charge_paisa'] - $principal - $charge,
                'created_by' => $actor->id, 'created_at' => now(), 'updated_at' => now(),
            ]);
            foreach (array_chunk($schedule, 200) as $chunk) {
                DB::table('loan_installments')->insert(array_map(fn ($row) => ['loan_account_id' => $id, ...$row], $chunk));
            }
            $account = DB::table('loan_accounts')->find($id);
            $journal = $principal > 0 ? $this->journals->post($actor, $account->branch_id, $date, 'loan-opening-'.$id, $reference, [
                ['account_id' => $principalAccount, 'debit_paisa' => $principal, 'credit_paisa' => 0],
                ['account_id' => $counterAccount, 'debit_paisa' => 0, 'credit_paisa' => $principal],
            ]) : null;
            $this->insert($actor, $account, $mode, $principal, $charge, $counterAccount, $date, 'opening-balance', $hash, $reference, $journal);

            return $account;
        }, 3);
    }

    private function locked(User $actor, int $id): array
    {
        $account = DB::table('loan_accounts')->where('id', $id)->lockForUpdate()->first();
        abort_unless($account, 404);
        $this->authorize($actor, (int) $account->branch_id);
        $loan = LoanApplication::query()->lockForUpdate()->findOrFail($account->loan_application_id);
        if (! in_array($loan->status, [LoanApplication::STATUS_DISBURSED, LoanApplication::STATUS_REPAID], true)) {
            $this->fail('The source loan is in a conflicting workflow state.');
        }
        $current = $this->contracts->read($loan);
        $saved = json_decode($account->terms_snapshot, true, 512, JSON_THROW_ON_ERROR);
        foreach (['principal_paisa', 'charge_paisa', 'regular_paisa', 'last_paisa', 'count', 'frequency', 'disbursed_on', 'pricing'] as $key) {
            if (($current[$key] ?? null) !== ($saved[$key] ?? null)) {
                $this->fail('The source loan terms changed after ledger opening. Reconcile the signed contract before posting.');
            }
        }
        if ((int) $loan->branch_id !== (int) $account->branch_id || $loan->member_admission_id !== $saved['member_admission_id']) {
            $this->fail('The source branch/member changed after ledger opening.');
        }

        return [$account, $loan];
    }

    public function balances(int $accountId, ?string $asOf = null): array
    {
        return DB::transaction(function () use ($accountId, $asOf) {
            $account = DB::table('loan_accounts')->find($accountId);
            abort_unless($account, 404);
            if ($asOf !== null) {
                $this->date($asOf);
                if ($asOf < $account->opened_on) {
                    $this->fail('Historical balances before the audited opening are unavailable.');
                }
            }
            $query = DB::table('loan_transactions')->where('loan_account_id', $accountId)->when($asOf, fn ($q) => $q->where('business_date', '<=', $asOf));
            $amounts = $query->selectRaw('COALESCE(SUM(principal_paisa),0) as principal, COALESCE(SUM(charge_paisa),0) as charge')->first();

            return ['principal_paisa' => (int) $amounts->principal, 'charge_paisa' => (int) $amounts->charge, 'total_paisa' => (int) $amounts->principal + (int) $amounts->charge];
        });
    }

    /** FIFO due allocation is derived from immutable receipts, not independently editable balances. */
    public function schedule(int $accountId, string $asOf): array
    {
        return DB::transaction(function () use ($accountId, $asOf) {
            $account = DB::table('loan_accounts')->find($accountId);
            abort_unless($account, 404);
            $balance = $this->balances($accountId, $asOf);
            $credit = $account->contract_principal_paisa + $account->contract_charge_paisa - $balance['total_paisa'];
            $saved = json_decode($account->terms_snapshot, true, 512, JSON_THROW_ON_ERROR);
            $split = $saved['pricing']['installment_split'] ?? null;

            return DB::table('loan_installments')->where('loan_account_id', $accountId)->orderBy('sequence')->get()->map(function ($row) use (&$credit, $asOf, $saved, $split) {
                $paid = min((int) $row->due_paisa, max(0, $credit));
                $credit -= $paid;

                $last = (int) $row->sequence === (int) $saved['count'];

                return ['sequence' => $row->sequence, 'due_on' => $row->due_on, 'due_paisa' => (int) $row->due_paisa,
                    'principal_due_paisa' => $split[$last ? 'last_principal_paisa' : 'regular_principal_paisa'] ?? null,
                    'charge_due_paisa' => $split[$last ? 'last_charge_paisa' : 'regular_charge_paisa'] ?? null,
                    'paid_paisa' => $paid, 'outstanding_paisa' => (int) $row->due_paisa - $paid,
                    'overdue_paisa' => $row->due_on < $asOf ? (int) $row->due_paisa - $paid : 0];
            })->all();
        });
    }

    public function repay(User $actor, int $accountId, string $principalAmount, string $chargeAmount, int $cashAccount, string $date, string $key, string $description): object
    {
        $principal = $this->amount($principalAmount);
        $charge = $this->amount($chargeAmount);
        if ($principal + $charge <= 0 || $principal + $charge > Money::MAX_PAISA) {
            $this->fail('Enter a positive collection amount within the supported limit.');
        }

        return DB::transaction(function () use ($actor, $accountId, $principal, $charge, $cashAccount, $date, $key, $description) {
            [$account, $loan] = $this->locked($actor, $accountId);

            return $this->payment($actor, $account, $loan, -$principal, -$charge, $cashAccount, $date, $key, $description);
        }, 3);
    }

    public function reverse(User $actor, int $transactionId, string $date, string $key, string $reason): object
    {
        $original = DB::table('loan_transactions')->find($transactionId);
        abort_unless($original, 404);
        if ($original->kind !== 'repayment') {
            $this->fail('Only collection receipts can be reversed in this workflow.');
        }

        return DB::transaction(function () use ($actor, $original, $date, $key, $reason) {
            [$account, $loan] = $this->locked($actor, $original->loan_account_id);

            return $this->payment($actor, $account, $loan, -$original->principal_paisa, -$original->charge_paisa, $original->counter_account_id, $date, $key, $reason, $original);
        }, 3);
    }

    private function payment(User $actor, object $account, LoanApplication $loan, int $principal, int $charge, int $cash, string $date, string $key, string $description, ?object $original = null): object
    {
        $this->date($date);
        if (! preg_match('/^[A-Za-z0-9_-]{8,100}$/D', $key) || trim($description) === '' || mb_strlen($description) > 1000) {
            $this->fail('A valid request key and receipt description are required.');
        }
        $kind = $original ? 'reversal' : 'repayment';
        $hash = hash('sha256', json_encode([$principal, $charge, $cash, $date, $description, $original?->id, $actor->id], JSON_THROW_ON_ERROR));
        $existing = DB::table('loan_transactions')->where('loan_account_id', $account->id)->where('idempotency_key', $key)->first();
        if ($existing) {
            if (! hash_equals($existing->payload_hash, $hash)) {
                $this->fail('This request key was already used for another collection.');
            }

            return $existing;
        }
        if ($date < $account->opened_on) {
            $this->fail('Collection cannot precede the audited ledger opening.');
        }
        if (! $original && $account->status !== 'active') {
            $this->fail('This loan is already settled.');
        }
        if ($original && (DB::table('loan_transactions')->where('reversal_of', $original->id)->exists() || $date < $original->business_date)) {
            $this->fail('The receipt was already reversed or its correction date is invalid.');
        }
        $this->counter($cash, 'asset');
        if ($cash === (int) $account->principal_account_id) {
            $this->fail('Choose a cash/bank account distinct from loan principal.');
        }
        $this->checkHistory($account, $principal, $charge, $date);
        $value = abs($principal) + abs($charge);
        $lines = [['account_id' => $cash, 'debit_paisa' => $original ? 0 : $value, 'credit_paisa' => $original ? $value : 0]];
        if ($principal !== 0) {
            $lines[] = ['account_id' => (int) $account->principal_account_id, 'debit_paisa' => $original ? $principal : 0, 'credit_paisa' => $original ? 0 : -$principal];
        }
        if ($charge !== 0) {
            $lines[] = ['account_id' => (int) $account->charge_income_account_id, 'debit_paisa' => $original ? $charge : 0, 'credit_paisa' => $original ? 0 : -$charge];
        }
        $journal = $this->journals->post($actor, $account->branch_id, $date, 'loan-'.hash('sha256', $account->id.'|'.$key), $description, $lines, $original?->journal_entry_id);
        $transaction = $this->insert($actor, $account, $kind, $principal, $charge, $cash, $date, $key, $hash, $description, $journal, $original);
        $balance = $this->balances($account->id);
        if ($balance['total_paisa'] === 0) {
            DB::table('loan_accounts')->where('id', $account->id)->update(['status' => 'closed', 'closed_at' => now(), 'closed_by' => $actor->id, 'updated_at' => now()]);
            $loan->updateQuietly(['status' => LoanApplication::STATUS_REPAID, 'repaid_at' => $date, 'repaid_by' => $actor->id]);
        } elseif ($account->status === 'closed') {
            DB::table('loan_accounts')->where('id', $account->id)->update(['status' => 'active', 'closed_at' => null, 'closed_by' => null, 'updated_at' => now()]);
            $loan->updateQuietly(['status' => LoanApplication::STATUS_DISBURSED, 'repaid_at' => null, 'repaid_by' => null]);
        }

        return $transaction;
    }

    private function checkHistory(object $account, int $principal, int $charge, string $date): void
    {
        $running = $this->balances($account->id, $date);
        $running['principal_paisa'] += $principal;
        $running['charge_paisa'] += $charge;
        $check = function () use (&$running, $account) {
            if ($running['principal_paisa'] < 0 || $running['charge_paisa'] < 0
                || $running['principal_paisa'] > $account->opening_principal_paisa || $running['charge_paisa'] > $account->opening_charge_paisa) {
                $this->fail('This collection/correction exceeds the principal or service-charge balance on a business date.');
            }
        };
        $check();
        $days = DB::table('loan_transactions')->where('loan_account_id', $account->id)->where('business_date', '>', $date)
            ->selectRaw('business_date, SUM(principal_paisa) as principal, SUM(charge_paisa) as charge')->groupBy('business_date')->orderBy('business_date')->get();
        foreach ($days as $day) {
            $running['principal_paisa'] += (int) $day->principal;
            $running['charge_paisa'] += (int) $day->charge;
            $check();
        }
    }

    private function insert(User $actor, object $account, string $kind, int $principal, int $charge, int $counter, string $date, string $key, string $hash, string $description, ?object $journal, ?object $original = null): object
    {
        if ($journal) {
            DB::table('journal_entries')->where('id', $journal->id)->update(['source_type' => 'loan']);
        }
        $id = DB::table('loan_transactions')->insertGetId([
            'reference' => (string) Str::uuid(), 'loan_account_id' => $account->id,
            'kind' => $kind, 'principal_paisa' => $principal, 'charge_paisa' => $charge,
            'counter_account_id' => $counter, 'journal_entry_id' => $journal?->id, 'reversal_of' => $original?->id,
            'business_date' => $date, 'idempotency_key' => $key, 'payload_hash' => $hash,
            'description' => $description, 'created_by' => $actor->id, 'created_at' => now(),
        ]);

        return DB::table('loan_transactions')->find($id);
    }

    public function reconciliation(User $actor, int $accountId): array
    {
        return DB::transaction(function () use ($actor, $accountId) {
            $account = DB::table('loan_accounts')->find($accountId);
            abort_unless($account, 404);
            $this->authorize($actor, (int) $account->branch_id);
            $gl = DB::table('journal_lines as l')->join('journal_entries as j', 'j.id', '=', 'l.journal_entry_id')
                ->where('j.branch_id', $account->branch_id)->where('l.ledger_account_id', $account->principal_account_id)
                ->selectRaw('COALESCE(SUM(l.debit_paisa),0) as debit, COALESCE(SUM(l.credit_paisa),0) as credit')->first();
            $subledger = DB::table('loan_transactions as t')->join('loan_accounts as a', 'a.id', '=', 't.loan_account_id')
                ->where('a.branch_id', $account->branch_id)->where('a.principal_account_id', $account->principal_account_id)->sum('t.principal_paisa');
            $control = BigInteger::of((string) $gl->debit)->minus((string) $gl->credit);
            $difference = $control->minus((string) $subledger);

            return ['gl_principal_paisa' => (string) $control, 'subledger_principal_paisa' => (string) $subledger, 'difference_paisa' => (string) $difference, 'matches' => $difference->isZero()];
        });
    }
}
