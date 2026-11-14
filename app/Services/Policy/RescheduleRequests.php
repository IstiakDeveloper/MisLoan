<?php

namespace App\Services\Policy;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** Records a reschedule decision. The signed installment schedule is not rewritten. */
final class RescheduleRequests
{
    public function request(User $actor, int $accountId, string $reason, string $key): object
    {
        abort_unless($actor->isFinancialAdministrator(), 403);
        if (! app(InstitutionPolicy::class)->row()->reschedule_enabled) {
            $this->fail('Reschedule is turned off.');
        }
        if (! preg_match('/^[A-Za-z0-9_-]{8,100}$/D', $key) || trim($reason) === '' || mb_strlen($reason) > 1000) {
            $this->fail('A valid request key and reason are required.');
        }
        $account = DB::table('loan_accounts')->find($accountId);
        abort_unless($account, 404);
        abort_unless($actor->canAccessBranch((int) $account->branch_id), 403);
        $existing = DB::table('loan_reschedule_requests')->where('idempotency_key', $key)->first();
        if ($existing) {
            return $existing;
        }
        $id = DB::table('loan_reschedule_requests')->insertGetId([
            'loan_account_id' => $accountId, 'idempotency_key' => $key, 'reason' => $reason,
            'status' => 'pending', 'requested_by' => $actor->id, 'created_at' => now(), 'updated_at' => now(),
        ]);

        return DB::table('loan_reschedule_requests')->find($id);
    }

    public function decide(User $actor, int $requestId, string $decision, string $note): object
    {
        abort_unless($actor->isFinancialAdministrator(), 403);
        if (! in_array($decision, ['approved', 'rejected'], true) || trim($note) === '' || mb_strlen($note) > 1000) {
            $this->fail('A decision and a review note are required.');
        }

        return DB::transaction(function () use ($actor, $requestId, $decision, $note) {
            $request = DB::table('loan_reschedule_requests')->where('id', $requestId)->lockForUpdate()->first();
            abort_unless($request, 404);
            if ((int) $request->requested_by === (int) $actor->id) {
                $this->fail('A different administrator must review this reschedule.');
            }
            if ($request->status === $decision && (string) $request->review_note === $note) {
                return $request;
            }
            if ($request->status !== 'pending') {
                $this->fail('Review a pending reschedule request.');
            }
            DB::table('loan_reschedule_requests')->where('id', $requestId)->update([
                'status' => $decision, 'reviewed_by' => $actor->id, 'review_note' => $note,
                'reviewed_at' => now(), 'updated_at' => now(),
            ]);

            return DB::table('loan_reschedule_requests')->find($requestId);
        });
    }

    private function fail(string $message): never
    {
        throw ValidationException::withMessages(['reschedule' => $message]);
    }
}
