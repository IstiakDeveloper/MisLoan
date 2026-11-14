<?php

namespace App\Services\Cash;

use App\Models\User;
use App\Services\Accounting\Money;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** Cashier session, physical count, handover, and bank-statement matching. Counts do not post journals. */
final class CashDesk
{
    public function open(User $actor, int $branchId, int $cashAccountId, string $date, string $openingCount, string $key): object
    {
        $this->guard($actor, $branchId);
        $this->date($date);
        $this->key($key);
        $opening = $this->amount($openingCount);
        $this->asset($cashAccountId);
        $hash = hash('sha256', json_encode([$branchId, $cashAccountId, $date, $opening, $actor->id], JSON_THROW_ON_ERROR));

        return DB::transaction(function () use ($actor, $branchId, $cashAccountId, $date, $opening, $key, $hash) {
            $existing = DB::table('cashier_sessions')->where('open_key', $key)->first();
            if ($existing) {
                abort_unless(hash_equals($existing->open_hash, $hash), 409);

                return $existing;
            }
            $open = DB::table('cashier_sessions')->where('branch_id', $branchId)->where('cash_account_id', $cashAccountId)
                ->where('business_date', $date)->whereIn('status', ['open', 'submitted', 'approved'])->lockForUpdate()->exists();
            if ($open) {
                $this->fail('This cash account already has a session for that date.');
            }
            $id = DB::table('cashier_sessions')->insertGetId([
                'branch_id' => $branchId, 'cash_account_id' => $cashAccountId, 'business_date' => $date,
                'opening_count_paisa' => $opening, 'status' => 'open', 'opened_by' => $actor->id,
                'open_key' => $key, 'open_hash' => $hash, 'created_at' => now(), 'updated_at' => now(),
            ]);

            return DB::table('cashier_sessions')->find($id);
        });
    }

    public function submit(User $actor, int $sessionId, string $countedCash, ?string $note): object
    {
        $counted = $this->amount($countedCash);

        return DB::transaction(function () use ($actor, $sessionId, $counted, $note) {
            $session = DB::table('cashier_sessions')->where('id', $sessionId)->lockForUpdate()->first();
            abort_unless($session, 404);
            $this->guard($actor, (int) $session->branch_id);
            if ($session->status === 'submitted' && (int) $session->counted_close_paisa === $counted && (string) $session->variance_note === (string) $note) {
                return $session;
            }
            if ($session->status !== 'open') {
                $this->fail('Only an open session can be submitted.');
            }
            $gl = $this->balance((int) $session->branch_id, (int) $session->cash_account_id, $session->business_date);
            $variance = $counted - $gl;
            if ($variance !== 0 && trim((string) $note) === '') {
                $this->fail('Explain the difference between counted cash and the posted cash balance.');
            }
            if ($note !== null && mb_strlen($note) > 1000) {
                $this->fail('Keep the variance note within 1000 characters.');
            }
            DB::table('cashier_sessions')->where('id', $sessionId)->update([
                'counted_close_paisa' => $counted, 'gl_balance_paisa' => $gl, 'variance_paisa' => $variance,
                'variance_note' => $note, 'status' => 'submitted', 'submitted_by' => $actor->id,
                'submitted_at' => now(), 'updated_at' => now(),
            ]);

            return DB::table('cashier_sessions')->find($sessionId);
        });
    }

    public function review(User $actor, int $sessionId, string $decision, string $note, ?int $handoverTo): object
    {
        abort_unless($actor->isFinancialAdministrator(), 403);
        if (! in_array($decision, ['approved', 'rejected'], true) || trim($note) === '' || mb_strlen($note) > 1000) {
            $this->fail('A decision and a review note are required.');
        }

        return DB::transaction(function () use ($actor, $sessionId, $decision, $note, $handoverTo) {
            $session = DB::table('cashier_sessions')->where('id', $sessionId)->lockForUpdate()->first();
            abort_unless($session, 404);
            abort_unless($actor->canAccessBranch((int) $session->branch_id), 403);
            if ((int) $session->opened_by === (int) $actor->id || (int) $session->submitted_by === (int) $actor->id) {
                $this->fail('A different administrator must review this day-end.');
            }
            if ($session->status === $decision && (string) $session->review_note === $note) {
                return $session;
            }
            if ($session->status !== 'submitted') {
                $this->fail('Review a submitted day-end.');
            }
            if ($decision === 'approved') {
                $receiver = $handoverTo ? User::query()->find($handoverTo) : null;
                if (! $receiver || ! $receiver->is_active || (int) $receiver->id === (int) $actor->id || ! $receiver->canAccessBranch((int) $session->branch_id)) {
                    $this->fail('Hand the cash to another active user of this branch.');
                }
            }
            DB::table('cashier_sessions')->where('id', $sessionId)->update([
                'status' => $decision, 'reviewed_by' => $actor->id, 'reviewed_at' => now(), 'review_note' => $note,
                'handed_over_to' => $decision === 'approved' ? $handoverTo : null, 'updated_at' => now(),
            ]);

            return DB::table('cashier_sessions')->find($sessionId);
        });
    }

    /** @param  array{branch_id: int, bank_account_id: int, business_date: string, amount: string, reference: string, description: string}  $input */
    public function addStatement(User $actor, array $input): object
    {
        $this->guard($actor, $input['branch_id']);
        $this->date($input['business_date']);
        $this->asset($input['bank_account_id']);
        if (trim($input['reference']) === '' || trim($input['description']) === '') {
            $this->fail('A bank reference and description are required.');
        }
        $id = DB::table('bank_statement_lines')->insertGetId([
            'branch_id' => $input['branch_id'], 'bank_account_id' => $input['bank_account_id'],
            'business_date' => $input['business_date'], 'amount_paisa' => $this->signed($input['amount']),
            'reference' => $input['reference'], 'description' => $input['description'],
            'created_by' => $actor->id, 'created_at' => now(), 'updated_at' => now(),
        ]);

        return DB::table('bank_statement_lines')->find($id);
    }

    public function match(User $actor, int $lineId, int $journalLineId): object
    {
        return DB::transaction(function () use ($actor, $lineId, $journalLineId) {
            $line = DB::table('bank_statement_lines')->where('id', $lineId)->lockForUpdate()->first();
            abort_unless($line, 404);
            $this->guard($actor, (int) $line->branch_id);
            if ($line->matched_journal_line_id) {
                abort_unless((int) $line->matched_journal_line_id === $journalLineId, 409);

                return $line;
            }
            $journal = DB::table('journal_lines as line')->join('journal_entries as entry', 'entry.id', '=', 'line.journal_entry_id')
                ->where('line.id', $journalLineId)->first(['line.id', 'line.debit_paisa', 'line.credit_paisa', 'line.ledger_account_id', 'entry.branch_id', 'entry.business_date']);
            abort_unless($journal, 404);
            $movement = (int) $journal->debit_paisa - (int) $journal->credit_paisa;
            if ((int) $journal->branch_id !== (int) $line->branch_id || (int) $journal->ledger_account_id !== (int) $line->bank_account_id || $journal->business_date !== $line->business_date || $movement !== (int) $line->amount_paisa) {
                $this->fail('Match a journal line with the same branch, bank account, date, and amount.');
            }
            if (DB::table('bank_statement_lines')->where('matched_journal_line_id', $journalLineId)->exists()) {
                $this->fail('That journal line is already matched.');
            }
            DB::table('bank_statement_lines')->where('id', $lineId)->update([
                'matched_journal_line_id' => $journalLineId, 'matched_by' => $actor->id, 'matched_at' => now(), 'updated_at' => now(),
            ]);

            return DB::table('bank_statement_lines')->find($lineId);
        });
    }

    public function balance(int $branchId, int $accountId, string $date): int
    {
        $row = DB::table('journal_lines as line')->join('journal_entries as entry', 'entry.id', '=', 'line.journal_entry_id')
            ->where('entry.branch_id', $branchId)->where('line.ledger_account_id', $accountId)->where('entry.business_date', '<=', $date)
            ->selectRaw('COALESCE(SUM(line.debit_paisa), 0) as debit, COALESCE(SUM(line.credit_paisa), 0) as credit')->first();

        return (int) $row->debit - (int) $row->credit;
    }

    private function guard(User $actor, int $branchId): void
    {
        abort_unless($actor->canPostBranchCash($branchId), 403);
    }

    private function asset(int $accountId): void
    {
        $account = DB::table('ledger_accounts')->find($accountId);
        if (! $account || ! $account->is_active || $account->type !== 'asset') {
            $this->fail('Select an active cash or bank asset account.');
        }
    }

    private function amount(string $amount): int
    {
        try {
            return Money::toPaisa($amount);
        } catch (\InvalidArgumentException $exception) {
            $this->fail($exception->getMessage());
        }
    }

    private function signed(string $amount): int
    {
        $negative = str_starts_with($amount, '-');

        return ($negative ? -1 : 1) * $this->amount(ltrim($amount, '-'));
    }

    private function date(string $date): void
    {
        try {
            $parsed = CarbonImmutable::createFromFormat('!Y-m-d', $date);
        } catch (\Throwable) {
            $this->fail('Use a valid YYYY-MM-DD date.');
        }
        if (! $parsed || $parsed->format('Y-m-d') !== $date || $parsed->isFuture()) {
            $this->fail('Use a valid YYYY-MM-DD date.');
        }
    }

    private function key(string $key): void
    {
        if (! preg_match('/^[A-Za-z0-9_-]{8,100}$/D', $key)) {
            $this->fail('A valid request key is required.');
        }
    }

    private function fail(string $message): never
    {
        throw ValidationException::withMessages(['cash_desk' => $message]);
    }
}
