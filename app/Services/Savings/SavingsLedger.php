<?php

namespace App\Services\Savings;

use App\Models\SavingsApplication;
use App\Models\User;
use App\Services\Accounting\JournalService;
use App\Services\Accounting\Money;
use App\Services\Accounting\PostingDefaults;
use Brick\Math\BigInteger;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/** Serializes every account operation and posts its GL entry in the same transaction. */
final class SavingsLedger
{
    public function __construct(private readonly JournalService $journals) {}

    private function authorize(User $actor, int $branch, bool $cashierAllowed = false): void
    {
        $allowed = $actor->isFinancialAdministrator()
            || ($cashierAllowed && $actor->isBranchCashier() && (int) $actor->branch_id === $branch);
        abort_unless($allowed, 403);
    }

    private function fail(string $message): never
    {
        throw ValidationException::withMessages(['ledger' => $message]);
    }

    private function amount(string $value, bool $allowZero = false): int
    {
        try {
            $amount = Money::toPaisa($value);
        } catch (\InvalidArgumentException $e) {
            $this->fail($e->getMessage());
        }
        if (! $allowZero && $amount === 0) {
            $this->fail('Amount must be positive.');
        }

        return $amount;
    }

    private function validateDate(string $date): void
    {
        try {
            $parsed = CarbonImmutable::createFromFormat('!Y-m-d', $date);
        } catch (\Throwable) {
            $this->fail('Use a valid business date.');
        }
        if (! $parsed || $parsed->format('Y-m-d') !== $date || $parsed->isFuture()) {
            $this->fail('Use a valid business date that is not in the future.');
        }
    }

    public function open(User $actor, int $applicationId, int $liabilityId, string $date, string $openingBalance, string $reference, ?int $offsetId = null): object
    {
        $opening = $this->amount($openingBalance, true);
        $this->validateDate($date);
        if (trim($reference) === '' || mb_strlen($reference) > 255) {
            $this->fail('An opening-balance reference is required, including for a zero opening balance.');
        }

        return DB::transaction(function () use ($actor, $applicationId, $liabilityId, $date, $opening, $reference, $offsetId) {
            $application = SavingsApplication::query()->lockForUpdate()->findOrFail($applicationId);
            $this->authorize($actor, (int) $application->branch_id);
            $hash = hash('sha256', json_encode([$applicationId, $liabilityId, $date, $opening, $reference, $offsetId], JSON_THROW_ON_ERROR));
            if ($existing = DB::table('savings_accounts')->where('savings_application_id', $applicationId)->first()) {
                if (! hash_equals($existing->opening_hash, $hash)) {
                    $this->fail('This application already has a different ledger opening.');
                }

                return $existing;
            }
            if (! in_array($application->status, ['active', 'matured'], true)) {
                $this->fail('Activate the savings application before opening its ledger.');
            }
            $this->checkCounter($liabilityId, 'liability');
            $product = $application->savingsProduct;
            if (! $product) {
                $this->fail('The savings product is missing.');
            }
            $id = DB::table('savings_accounts')->insertGetId([
                'reference' => (string) Str::uuid(), 'savings_application_id' => $applicationId,
                'branch_id' => $application->branch_id, 'liability_account_id' => $liabilityId,
                'product_snapshot' => json_encode([...$product->getAttributes(), 'maturity_date' => $application->maturity_date?->toDateString()], JSON_THROW_ON_ERROR),
                'opening_hash' => $hash, 'opening_reference' => $reference, 'opened_on' => $date,
                'created_by' => $actor->id, 'created_at' => now(), 'updated_at' => now(),
            ]);
            if ($opening > 0) {
                if (! $offsetId) {
                    $this->fail('A verified opening offset account is required.');
                }
                $this->checkCounter($offsetId, 'equity');
                $this->write($actor, DB::table('savings_accounts')->find($id), 'opening', $opening, $offsetId, $date, 'opening-balance', $reference);
            }

            return DB::table('savings_accounts')->find($id);
        }, 3);
    }

    public function transact(User $actor, int $accountId, string $kind, string $amount, int $counterId, string $date, string $key, string $description): object
    {
        if (! in_array($kind, ['deposit', 'withdrawal', 'profit'], true)) {
            $this->fail('Unsupported savings transaction.');
        }
        $value = $this->amount($amount);

        return DB::transaction(function () use ($actor, $accountId, $kind, $value, $counterId, $date, $key, $description) {
            if ($kind === 'profit') {
                abort_unless($actor->isFinancialAdministrator(), 403);
            }
            $account = $this->lockedAccount($actor, $accountId, $kind !== 'profit');

            return $this->write($actor, $account, $kind, $kind === 'withdrawal' ? -$value : $value, $counterId, $date, $key, $description);
        }, 3);
    }

    private function lockedAccount(User $actor, int $id, bool $cashierAllowed = false): object
    {
        $account = DB::table('savings_accounts')->where('id', $id)->lockForUpdate()->first();
        abort_unless($account, 404);
        $this->authorize($actor, (int) $account->branch_id, $cashierAllowed);

        return $account;
    }

    private function checkCounter(int $id, string $type): void
    {
        $counter = DB::table('ledger_accounts')->find($id);
        if (! $counter || ! $counter->is_active || $counter->type !== $type) {
            $this->fail('Select an active '.$type.' ledger account.');
        }
    }

    public function balances(int $accountId): array
    {
        return DB::transaction(function () use ($accountId) {
            $book = (int) DB::table('savings_transactions')->where('savings_account_id', $accountId)->sum('amount_paisa');
            $held = (int) DB::table('savings_holds')->where('savings_account_id', $accountId)->whereNull('released_at')->sum('amount_paisa');

            return ['balance_paisa' => $book, 'held_paisa' => $held, 'available_paisa' => $book - $held];
        });
    }

    public function reconciliation(User $actor, int $accountId): array
    {
        return DB::transaction(function () use ($actor, $accountId) {
            $account = DB::table('savings_accounts')->find($accountId);
            abort_unless($account, 404);
            $this->authorize($actor, (int) $account->branch_id);
            $gl = DB::table('journal_lines as l')->join('journal_entries as j', 'j.id', '=', 'l.journal_entry_id')
                ->where('j.branch_id', $account->branch_id)->where('l.ledger_account_id', $account->liability_account_id)
                ->selectRaw('COALESCE(SUM(l.credit_paisa), 0) as credit, COALESCE(SUM(l.debit_paisa), 0) as debit')->first();
            $subledger = DB::table('savings_transactions as t')->join('savings_accounts as a', 'a.id', '=', 't.savings_account_id')
                ->where('a.branch_id', $account->branch_id)->where('a.liability_account_id', $account->liability_account_id)->sum('t.amount_paisa');
            $glBalance = BigInteger::of((string) $gl->credit)->minus((string) $gl->debit);
            $difference = $glBalance->minus((string) $subledger);

            return ['gl_liability_paisa' => (string) $glBalance, 'subledger_liability_paisa' => (string) $subledger,
                'difference_paisa' => (string) $difference, 'matches' => $difference->isZero()];
        });
    }

    private function write(User $actor, object $account, string $kind, int $signed, int $counterId, string $date, string $key, string $description, ?object $original = null): object
    {
        if (! preg_match('/^[A-Za-z0-9_-]{8,100}$/D', $key) || trim($description) === '' || mb_strlen($description) > 1000) {
            $this->fail('A valid request key and description are required.');
        }
        $this->validateDate($date);
        $hash = hash('sha256', json_encode([$kind, $signed, $counterId, $date, $description, $original?->id, $actor->id], JSON_THROW_ON_ERROR));
        $existing = DB::table('savings_transactions')->where('savings_account_id', $account->id)->where('idempotency_key', $key)->first();
        if ($existing) {
            if (! hash_equals($existing->payload_hash, $hash)) {
                $this->fail('This request key was used for another transaction.');
            }

            return $existing;
        }
        if ($account->status !== 'active' || $date < $account->opened_on) {
            $this->fail('The account must be active and the date cannot precede its opening.');
        }
        if ($kind === 'withdrawal') {
            $policy = json_decode($account->product_snapshot, true, 512, JSON_THROW_ON_ERROR);
            if (! empty($policy['maturity_date']) && $date < $policy['maturity_date']) {
                if (empty($policy['premature_withdrawal_allowed'])) {
                    $this->fail('This product does not allow withdrawals before maturity.');
                }
                if ((float) ($policy['premature_withdrawal_penalty'] ?? 0) > 0) {
                    $this->fail('A premature settlement with the product penalty is required before this withdrawal.');
                }
            }
        }
        $balance = $this->balances($account->id);
        if ($balance['available_paisa'] + $signed < 0) {
            $this->fail('Insufficient available savings balance.');
        }
        if ($balance['balance_paisa'] + $signed > Money::MAX_PAISA) {
            $this->fail('Account balance exceeds the supported limit.');
        }
        if ($signed < 0) {
            $asOf = (int) DB::table('savings_transactions')->where('savings_account_id', $account->id)
                ->where('business_date', '<=', $date)->sum('amount_paisa') + $signed;
            if ($asOf < 0) {
                $this->fail('This backdated transaction would overdraw the savings account.');
            }
            $days = DB::table('savings_transactions')->where('savings_account_id', $account->id)->where('business_date', '>', $date)
                ->selectRaw('business_date, SUM(amount_paisa) as movement')->groupBy('business_date')->orderBy('business_date')->get();
            foreach ($days as $day) {
                $asOf += (int) $day->movement;
                if ($asOf < 0) {
                    $this->fail('This correction would overdraw a later business date.');
                }
            }
        }
        if ($original) {
            if ($original->kind === 'reversal' || DB::table('savings_transactions')->where('reversal_of', $original->id)->exists()) {
                $this->fail('This transaction has already been reversed or is itself a reversal.');
            }
        } else {
            $this->checkCounter($counterId, match ($kind) {
                'opening' => 'equity', 'profit' => 'expense', default => 'asset'
            });
        }
        $value = abs($signed);
        $lines = [
            ['account_id' => $counterId, 'debit_paisa' => $signed > 0 ? $value : 0, 'credit_paisa' => $signed > 0 ? 0 : $value],
            ['account_id' => (int) $account->liability_account_id, 'debit_paisa' => $signed > 0 ? 0 : $value, 'credit_paisa' => $signed > 0 ? $value : 0],
        ];
        $journal = $this->journals->post($actor, $account->branch_id, $date,
            'savings-'.hash('sha256', $account->id.'|'.$key), $description, $lines, $original?->journal_entry_id);
        DB::table('journal_entries')->where('id', $journal->id)->update(['source_type' => 'savings']);
        $id = DB::table('savings_transactions')->insertGetId([
            'reference' => (string) Str::uuid(), 'savings_account_id' => $account->id,
            'idempotency_key' => $key, 'payload_hash' => $hash, 'kind' => $kind,
            'amount_paisa' => $signed, 'counter_account_id' => $counterId, 'journal_entry_id' => $journal->id,
            'reversal_of' => $original?->id, 'business_date' => $date, 'description' => $description,
            'created_by' => $actor->id, 'created_at' => now(),
        ]);

        return DB::table('savings_transactions')->find($id);
    }

    public function reverse(User $actor, int $transactionId, string $date, string $key, string $reason): object
    {
        $original = DB::table('savings_transactions')->find($transactionId);
        abort_unless($original, 404);

        return DB::transaction(function () use ($actor, $original, $date, $key, $reason) {
            $account = $this->lockedAccount($actor, $original->savings_account_id);

            return $this->write($actor, $account, 'reversal', -$original->amount_paisa, $original->counter_account_id, $date, $key, $reason, $original);
        }, 3);
    }

    public function hold(User $actor, int $accountId, string $amount, string $key, string $reason): object
    {
        $value = $this->amount($amount);
        if (! preg_match('/^[A-Za-z0-9_-]{8,100}$/D', $key) || trim($reason) === '' || mb_strlen($reason) > 255) {
            $this->fail('A valid hold reference and reason are required.');
        }

        return DB::transaction(function () use ($actor, $accountId, $value, $key, $reason) {
            $account = $this->lockedAccount($actor, $accountId);
            $existing = DB::table('savings_holds')->where('savings_account_id', $accountId)->where('request_key', $key)->first();
            if ($existing) {
                if ((int) $existing->amount_paisa !== $value || $existing->reason !== $reason || $existing->created_by !== $actor->id) {
                    $this->fail('This hold reference was already used.');
                }

                return $existing;
            }
            if ($account->status !== 'active' || $value > $this->balances($accountId)['available_paisa']) {
                $this->fail('Insufficient available funds for this hold.');
            }
            $id = DB::table('savings_holds')->insertGetId(['savings_account_id' => $accountId, 'request_key' => $key, 'amount_paisa' => $value, 'reason' => $reason, 'created_by' => $actor->id, 'created_at' => now()]);

            return DB::table('savings_holds')->find($id);
        }, 3);
    }

    public function release(User $actor, int $holdId): void
    {
        $hold = DB::table('savings_holds')->find($holdId);
        abort_unless($hold, 404);
        DB::transaction(function () use ($actor, $hold) {
            $this->lockedAccount($actor, $hold->savings_account_id);
            DB::table('savings_holds')->where('id', $hold->id)->whereNull('released_at')->update(['released_at' => now(), 'released_by' => $actor->id]);
        }, 3);
    }

    public function configuredProfit(User $actor, int $accountId, string $date, string $key, string $description): object
    {
        $account = DB::table('savings_accounts')->find($accountId);
        abort_unless($account, 404);
        $snapshot = json_decode($account->product_snapshot, true, 512, JSON_THROW_ON_ERROR);
        $productId = (int) (is_array($snapshot) ? ($snapshot['id'] ?? 0) : 0);
        if ($productId < 1) {
            $this->fail('This savings account has no product, so its profit cannot be calculated.');
        }
        $expense = app(PostingDefaults::class)->resolve((int) $account->branch_id, null, $productId)['savings_profit_expense_account_id'];
        if (! $expense || (int) $expense === (int) $account->liability_account_id) {
            $this->fail('Map this savings product’s own profit expense account before posting.');
        }
        $amount = app(ProductSavingsProfit::class)->duePaisa($account, $date);
        if ($amount <= 0) {
            $this->fail('No product profit is due. Profit follows the savings calculator and is zero before one month.');
        }

        return $this->transact($actor, $accountId, 'profit', Money::format($amount), (int) $expense, $date, $key, $description);
    }

    public function close(User $actor, int $accountId): void
    {
        DB::transaction(function () use ($actor, $accountId) {
            $this->lockedAccount($actor, $accountId);
            $balance = $this->balances($accountId);
            if ($balance['balance_paisa'] !== 0 || $balance['held_paisa'] !== 0) {
                $this->fail('Settle all savings and release all holds before closing.');
            }
            DB::table('savings_accounts')->where('id', $accountId)->where('status', 'active')->update(['status' => 'closed', 'closed_at' => now(), 'closed_by' => $actor->id, 'updated_at' => now()]);
        }, 3);
    }
}
