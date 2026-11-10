<?php

namespace App\Services\Accounting;

use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/** The only application write boundary for posted journals. All amounts are integer paisa. */
final class JournalService
{
    private function authorize(User $actor, int $branchId): void
    {
        abort_unless($actor->is_active && ! $actor->isBranchAccount()
            && ($actor->isSuperAdmin() || $actor->hasPermission('accounting.post'))
            && $actor->canAccessBranch($branchId), 403);
    }

    /** @param array<int, array{account_id:int, debit_paisa:int, credit_paisa:int}> $lines */
    public function post(User $actor, int $branchId, string $date, string $key, string $description, array $lines, ?int $reversalOf = null): object
    {
        $this->authorize($actor, $branchId);
        if (! preg_match('/^[A-Za-z0-9_-]{8,100}$/D', $key) || trim($description) === '' || mb_strlen($description) > 1000) {
            throw ValidationException::withMessages(['journal' => 'A valid idempotency key and description are required.']);
        }
        try {
            $parsed = CarbonImmutable::createFromFormat('!Y-m-d', $date);
        } catch (\Throwable) {
            throw ValidationException::withMessages(['business_date' => 'Use a valid YYYY-MM-DD date.']);
        }
        if (! $parsed || $parsed->format('Y-m-d') !== $date || $parsed->isFuture()) {
            throw ValidationException::withMessages(['business_date' => 'Use a valid YYYY-MM-DD date.']);
        }
        $lines = $this->normalizeLines($lines);
        $hash = hash('sha256', json_encode([$branchId, $date, $description, $lines, $actor->id, $reversalOf], JSON_THROW_ON_ERROR));

        try {
            return DB::transaction(function () use ($actor, $branchId, $date, $key, $description, $lines, $hash, $reversalOf) {
                // Serialize period creation/closure and financial posting for this branch.
                abort_unless(DB::table('branches')->where('id', $branchId)->lockForUpdate()->first(), 404);
                $periods = DB::table('accounting_periods')->where('branch_id', $branchId)
                    ->where('starts_on', '<=', $date)->where('ends_on', '>=', $date)->lockForUpdate()->get();
                if ($existing = DB::table('journal_entries')->where('branch_id', $branchId)->where('idempotency_key', $key)->first()) {
                    return $this->replay($existing, $hash);
                }
                if ($periods->count() !== 1 || $periods->first()->closed_at !== null
                    || DB::table('accounting_periods')->where('branch_id', $branchId)->whereNotNull('closed_at')->where('ends_on', '>=', $date)->exists()) {
                    throw ValidationException::withMessages(['business_date' => 'Exactly one open accounting period must cover this date.']);
                }
                $ids = array_unique(array_column($lines, 'account_id'));
                $accounts = DB::table('ledger_accounts')->whereIn('id', $ids)->orderBy('id')->lockForUpdate()->get();
                if ($accounts->count() !== count($ids) || $accounts->contains(fn ($a) => ! $a->is_active)) {
                    throw ValidationException::withMessages(['lines' => 'All accounts must exist and be active.']);
                }
                if ($reversalOf !== null) {
                    $original = DB::table('journal_entries')->where('id', $reversalOf)->lockForUpdate()->first();
                    if (! $original || $original->branch_id !== $branchId || $original->reversal_of !== null
                        || DB::table('journal_entries')->where('reversal_of', $reversalOf)->exists()) {
                        throw ValidationException::withMessages(['reversal' => 'This entry cannot be reversed.']);
                    }
                    if ($date < $original->business_date) {
                        throw ValidationException::withMessages(['business_date' => 'A reversal cannot precede its original transaction.']);
                    }
                    $expected = DB::table('journal_lines')->where('journal_entry_id', $reversalOf)->get()
                        ->map(fn ($line) => ['account_id' => (int) $line->ledger_account_id, 'debit_paisa' => (int) $line->credit_paisa, 'credit_paisa' => (int) $line->debit_paisa])->all();
                    if ($this->normalizeLines($expected) !== $lines) {
                        throw ValidationException::withMessages(['reversal' => 'Reversal lines must exactly offset the original entry.']);
                    }
                }
                $id = DB::table('journal_entries')->insertGetId([
                    'reference' => (string) Str::uuid(), 'branch_id' => $branchId,
                    'accounting_period_id' => $periods->first()->id, 'idempotency_key' => $key,
                    'payload_hash' => $hash, 'business_date' => $date, 'description' => $description,
                    'created_by' => $actor->id, 'reversal_of' => $reversalOf, 'created_at' => now(),
                ]);
                DB::table('journal_lines')->insert(array_map(fn ($line) => [
                    'journal_entry_id' => $id, 'ledger_account_id' => $line['account_id'],
                    'debit_paisa' => $line['debit_paisa'], 'credit_paisa' => $line['credit_paisa'],
                ], $lines));

                return DB::table('journal_entries')->find($id);
            }, 3);
        } catch (QueryException $exception) {
            // A simultaneous retry may win the unique-key race in another period.
            $existing = DB::table('journal_entries')->where('branch_id', $branchId)->where('idempotency_key', $key)->first();
            if ($existing) {
                return $this->replay($existing, $hash);
            }
            throw $exception;
        }
    }

    public function reverse(User $actor, int $entryId, string $date, string $key, string $reason): object
    {
        $entry = DB::table('journal_entries')->find($entryId);
        abort_unless($entry, 404);
        $this->authorize($actor, $entry->branch_id);
        if (($entry->source_type ?? 'manual') !== 'manual') {
            throw ValidationException::withMessages(['reversal' => 'Reverse this transaction through its source ledger to preserve account balances.']);
        }
        $lines = DB::table('journal_lines')->where('journal_entry_id', $entryId)->get()
            ->map(fn ($line) => ['account_id' => (int) $line->ledger_account_id, 'debit_paisa' => (int) $line->credit_paisa, 'credit_paisa' => (int) $line->debit_paisa])->all();

        return $this->post($actor, $entry->branch_id, $date, $key, $reason, $lines, $entryId);
    }

    public function closePeriod(User $actor, int $periodId): void
    {
        DB::transaction(function () use ($actor, $periodId) {
            $period = DB::table('accounting_periods')->find($periodId);
            abort_unless($period, 404);
            DB::table('branches')->where('id', $period->branch_id)->lockForUpdate()->first();
            $period = DB::table('accounting_periods')->where('id', $periodId)->lockForUpdate()->first();
            abort_unless($period, 404);
            $this->authorize($actor, $period->branch_id);
            abort_unless($actor->isSuperAdmin() || $actor->hasPermission('accounting.close'), 403);
            DB::table('accounting_periods')->where('id', $periodId)->whereNull('closed_at')
                ->update(['closed_at' => now(), 'closed_by' => $actor->id, 'updated_at' => now()]);
        }, 3);
    }

    private function replay(object $entry, string $hash): object
    {
        if (! hash_equals($entry->payload_hash, $hash)) {
            throw ValidationException::withMessages(['idempotency_key' => 'This key was already used for a different journal.']);
        }

        return $entry;
    }

    public function normalizeLines(array $lines): array
    {
        if (count($lines) < 2 || count($lines) > 100) {
            throw ValidationException::withMessages(['lines' => 'A journal requires between 2 and 100 lines.']);
        }
        $debit = $credit = 0;
        $normalized = [];
        foreach ($lines as $line) {
            $account = $line['account_id'] ?? null;
            $dr = $line['debit_paisa'] ?? null;
            $cr = $line['credit_paisa'] ?? null;
            if (! is_int($account) || $account < 1 || ! is_int($dr) || ! is_int($cr)
                || $dr < 0 || $cr < 0 || max($dr, $cr) > Money::MAX_PAISA || (($dr > 0) === ($cr > 0))) {
                throw ValidationException::withMessages(['lines' => 'Use a valid account and exactly one positive integer paisa amount per line.']);
            }
            $debit += $dr;
            $credit += $cr;
            $normalized[] = ['account_id' => $account, 'debit_paisa' => $dr, 'credit_paisa' => $cr];
        }
        if ($debit !== $credit || $debit > Money::MAX_PAISA) {
            throw ValidationException::withMessages(['lines' => 'Debits and credits must balance within the supported limit.']);
        }
        usort($normalized, fn ($a, $b) => [$a['account_id'], $a['debit_paisa'], $a['credit_paisa']] <=> [$b['account_id'], $b['debit_paisa'], $b['credit_paisa']]);

        return $normalized;
    }
}
