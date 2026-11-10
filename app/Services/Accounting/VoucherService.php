<?php

namespace App\Services\Accounting;

use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/** Frozen manual proposals; only an independent decision may create their journal. */
final class VoucherService
{
    public function __construct(private readonly JournalService $journals) {}

    private function authorize(User $actor, int $branch): void
    {
        abort_unless($actor->is_active && $actor->isSuperAdmin() && ! $actor->isBranchAccount() && $actor->canAccessBranch($branch), 403);
    }

    private function fail(string $message): never
    {
        throw ValidationException::withMessages(['voucher' => $message]);
    }

    public function propose(User $actor, int $branch, string $date, string $key, string $description, array $lines, ?int $reversalOf = null): object
    {
        $this->authorize($actor, $branch);
        try {
            $parsed = CarbonImmutable::createFromFormat('!Y-m-d', $date);
        } catch (\Throwable) {
            $parsed = null;
        }
        if (! $parsed || $parsed->format('Y-m-d') !== $date || $parsed->isFuture()) {
            $this->fail('Choose a valid business date that is not in the future.');
        }
        if (! preg_match('/^[A-Za-z0-9_-]{8,100}$/D', $key) || trim($description) === '' || mb_strlen($description) > 1000) {
            $this->fail('A valid request key and description are required.');
        }
        $lines = $this->journals->normalizeLines($lines);
        $hash = hash('sha256', json_encode([$branch, $date, $description, $lines, $actor->id, $reversalOf], JSON_THROW_ON_ERROR));

        return DB::transaction(function () use ($actor, $branch, $date, $key, $description, $lines, $reversalOf, $hash) {
            // First consistent reads occur after the branch lock, including on MySQL.
            abort_unless(DB::table('branches')->where('id', $branch)->lockForUpdate()->first(), 404);
            $existing = DB::table('accounting_vouchers')->where('branch_id', $branch)->where('idempotency_key', $key)->first();
            if ($existing) {
                if (! hash_equals($existing->payload_hash, $hash)) {
                    $this->fail('This voucher request key was used with different content or identity.');
                }

                return $existing;
            }
            $periods = DB::table('accounting_periods')->where('branch_id', $branch)->where('starts_on', '<=', $date)->where('ends_on', '>=', $date)->get();
            if ($periods->count() !== 1 || $periods->first()->closed_at !== null || DB::table('accounting_periods')->where('branch_id', $branch)->whereNotNull('closed_at')->where('ends_on', '>=', $date)->exists()) {
                $this->fail('Exactly one open accounting period must cover the proposed date.');
            }
            $ids = array_unique(array_column($lines, 'account_id'));
            if (DB::table('ledger_accounts')->whereIn('id', $ids)->where('is_active', true)->count() !== count($ids)) {
                $this->fail('Every proposed account must exist and be active.');
            }
            if ($reversalOf !== null) {
                $original = DB::table('journal_entries')->where('id', $reversalOf)->first();
                if (! $original || (int) $original->branch_id !== $branch || ($original->source_type ?? 'manual') !== 'manual' || $original->reversal_of !== null || $date < $original->business_date
                    || DB::table('journal_entries')->where('reversal_of', $reversalOf)->exists()) {
                    $this->fail('Only an unreversed original manual journal can be proposed here. Use the source ledger for loan or savings corrections.');
                }
                if (DB::table('accounting_vouchers')->where('reversal_of', $reversalOf)->where('status', 'pending')->exists()) {
                    $this->fail('A reversal proposal for this journal is already pending.');
                }
                $expected = DB::table('journal_lines')->where('journal_entry_id', $reversalOf)->get()->map(fn ($row) => ['account_id' => (int) $row->ledger_account_id, 'debit_paisa' => (int) $row->credit_paisa, 'credit_paisa' => (int) $row->debit_paisa])->all();
                if ($this->journals->normalizeLines($expected) !== $lines) {
                    $this->fail('Proposed reversal lines must exactly offset the original journal.');
                }
            }
            $id = DB::table('accounting_vouchers')->insertGetId(['reference' => (string) Str::uuid(), 'branch_id' => $branch, 'kind' => $reversalOf === null ? 'posting' : 'reversal', 'reversal_of' => $reversalOf, 'business_date' => $date, 'description' => $description, 'lines' => json_encode($lines, JSON_THROW_ON_ERROR), 'idempotency_key' => $key, 'payload_hash' => $hash, 'requested_by' => $actor->id, 'created_at' => now()]);

            return DB::table('accounting_vouchers')->find($id);
        }, 3);
    }

    public function proposeReversal(User $actor, int $entry, string $date, string $key, string $reason): object
    {
        $original = DB::table('journal_entries')->find($entry);
        abort_unless($original, 404);
        $this->authorize($actor, (int) $original->branch_id);
        $lines = DB::table('journal_lines')->where('journal_entry_id', $entry)->get()->map(fn ($row) => ['account_id' => (int) $row->ledger_account_id, 'debit_paisa' => (int) $row->credit_paisa, 'credit_paisa' => (int) $row->debit_paisa])->all();

        return $this->propose($actor, (int) $original->branch_id, $date, $key, $reason, $lines, $entry);
    }

    public function decide(User $actor, int $id, string $decision, string $note): object
    {
        return DB::transaction(function () use ($actor, $id, $decision, $note) {
            $voucher = DB::table('accounting_vouchers')->where('id', $id)->lockForUpdate()->first();
            abort_unless($voucher, 404);
            $this->authorize($actor, (int) $voucher->branch_id);
            if ((int) $voucher->requested_by === (int) $actor->id) {
                $this->fail('A different personal administrator must review this voucher.');
            }
            if (! in_array($decision, ['approved', 'rejected'], true) || trim($note) === '' || mb_strlen($note) > 1000) {
                $this->fail('A decision and review note are required.');
            }
            if ($voucher->status !== 'pending') {
                if ($voucher->status === $decision && (int) $voucher->reviewed_by === (int) $actor->id && $voucher->decision_note === $note) {
                    return $voucher;
                }
                $this->fail('This voucher has a final decision.');
            }
            // Serialize approval with postings and period closure before any consistent read.
            DB::table('branches')->where('id', $voucher->branch_id)->lockForUpdate()->first();
            $entry = null;
            if ($decision === 'approved') {
                $lines = json_decode($voucher->lines, true, 512, JSON_THROW_ON_ERROR);
                if ($voucher->reversal_of !== null) {
                    $original = DB::table('journal_entries')->find($voucher->reversal_of);
                    if (($original->source_type ?? 'manual') !== 'manual') {
                        $this->fail('Correct source transactions through their own ledger.');
                    }
                }
                $entry = $this->journals->post($actor, (int) $voucher->branch_id, $voucher->business_date, 'approved-voucher-'.$voucher->id, $voucher->description, $lines, $voucher->reversal_of === null ? null : (int) $voucher->reversal_of);
            }
            DB::table('accounting_vouchers')->where('id', $id)->update(['status' => $decision, 'reviewed_by' => $actor->id, 'reviewed_at' => now(), 'decision_note' => $note, 'journal_entry_id' => $entry?->id]);

            return DB::table('accounting_vouchers')->find($id);
        }, 3);
    }
}
