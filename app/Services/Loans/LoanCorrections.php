<?php

namespace App\Services\Loans;

use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** Public reversal workflow: preserve the proposal and require a distinct reviewer. */
final class LoanCorrections
{
    public function __construct(private readonly LoanLedger $ledger) {}

    private function authorize(User $actor, int $branch): void
    {
        abort_unless($actor->is_active && $actor->isSuperAdmin() && ! $actor->isBranchAccount() && $actor->canAccessBranch($branch), 403);
    }

    private function fail(string $message): never
    {
        throw ValidationException::withMessages(['correction' => $message]);
    }

    public function request(User $actor, int $transaction, string $date, string $key, string $reason): object
    {
        // Receipts are immutable. Read outside the write transaction so its first
        // consistent read occurs after the account lock (including on MySQL).
        $receipt = DB::table('loan_transactions')->find($transaction);
        abort_unless($receipt, 404);
        try {
            return DB::transaction(function () use ($actor, $transaction, $date, $key, $reason, $receipt) {
                $account = DB::table('loan_accounts')->where('id', $receipt->loan_account_id)->lockForUpdate()->first();
                $this->authorize($actor, (int) $account->branch_id);
                if (! preg_match('/^[A-Za-z0-9_-]{8,100}$/D', $key) || trim($reason) === '' || mb_strlen($reason) > 1000) {
                    $this->fail('A valid request key and correction reason are required.');
                }
                try {
                    $parsed = CarbonImmutable::createFromFormat('!Y-m-d', $date);
                } catch (\Throwable) {
                    $parsed = null;
                }
                if (! $parsed || $parsed->format('Y-m-d') !== $date || $parsed->isFuture() || $date < $receipt->business_date) {
                    $this->fail('The correction date must be valid, no earlier than the receipt, and not in the future.');
                }
                $hash = hash('sha256', json_encode([$transaction, $date, $reason], JSON_THROW_ON_ERROR));
                $existing = DB::table('loan_correction_requests')->where('requested_by', $actor->id)->where('idempotency_key', $key)->first();
                if ($existing) {
                    if (! hash_equals($existing->payload_hash, $hash)) {
                        $this->fail('This request key belongs to a different correction.');
                    }

                    return $existing;
                }
                if ($receipt->kind !== 'repayment' || DB::table('loan_transactions')->where('reversal_of', $receipt->id)->exists()) {
                    $this->fail('Only an unreversed collection receipt can be proposed for correction.');
                }
                if (DB::table('loan_correction_requests')->where('loan_transaction_id', $receipt->id)->where('status', 'pending')->exists()) {
                    $this->fail('A correction for this receipt is already awaiting review.');
                }
                $id = DB::table('loan_correction_requests')->insertGetId(['loan_transaction_id' => $receipt->id, 'loan_account_id' => $account->id, 'requested_by' => $actor->id, 'idempotency_key' => $key, 'payload_hash' => $hash, 'business_date' => $date, 'reason' => $reason, 'created_at' => now()]);

                return DB::table('loan_correction_requests')->find($id);
            }, 3);
        } catch (QueryException $exception) {
            // Concurrent requests on different accounts can still share an actor/request key.
            $existing = DB::table('loan_correction_requests')->where('requested_by', $actor->id)->where('idempotency_key', $key)->first();
            if (! $existing) {
                throw $exception;
            }
            $hash = hash('sha256', json_encode([$transaction, $date, $reason], JSON_THROW_ON_ERROR));
            if (! hash_equals($existing->payload_hash, $hash)) {
                $this->fail('This request key belongs to a different correction.');
            }

            return $existing;
        }
    }

    public function decide(User $actor, int $id, string $decision, string $note): object
    {
        return DB::transaction(function () use ($actor, $id, $decision, $note) {
            $request = DB::table('loan_correction_requests')->where('id', $id)->lockForUpdate()->first();
            abort_unless($request, 404);
            $account = DB::table('loan_accounts')->where('id', $request->loan_account_id)->lockForUpdate()->first();
            $this->authorize($actor, (int) $account->branch_id);
            if ((int) $request->requested_by === (int) $actor->id) {
                $this->fail('A different personal administrator must review this correction.');
            }
            if (! in_array($decision, ['approved', 'rejected'], true) || trim($note) === '' || mb_strlen($note) > 1000) {
                $this->fail('Choose an approval/rejection and record a decision note.');
            }
            if ($request->status !== 'pending') {
                if ($request->status === $decision && (int) $request->reviewed_by === (int) $actor->id && $request->decision_note === $note) {
                    return $request;
                }
                $this->fail('This correction already has a final decision.');
            }
            $reversal = $decision === 'approved' ? $this->ledger->reverse($actor, (int) $request->loan_transaction_id, $request->business_date, 'approved-correction-'.$id, $request->reason) : null;
            DB::table('loan_correction_requests')->where('id', $id)->update(['status' => $decision, 'reviewed_by' => $actor->id, 'reviewed_at' => now(), 'decision_note' => $note, 'reversal_transaction_id' => $reversal?->id]);

            return DB::table('loan_correction_requests')->find($id);
        }, 3);
    }
}
