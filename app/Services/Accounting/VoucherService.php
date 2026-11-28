<?php

namespace App\Services\Accounting;

use App\Models\AccountingVoucher;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class VoucherService
{
    public function __construct(private readonly JournalService $journals) {}

    /**
     * @param  array<int, array{ledger_account_id: int|string, debit_paisa?: int|string, credit_paisa?: int|string}>  $lines
     */
    public function submitVoucher(
        int $branchId,
        string $kind,
        string $businessDate,
        string $description,
        array $lines,
        string $idempotencyKey,
        int $actorId,
        ?int $reversalOfId = null
    ): AccountingVoucher {
        $normalizedLines = $this->journals->validateAndNormalizeLines($lines);

        $payloadHash = hash('sha256', json_encode([
            'branch_id' => $branchId,
            'kind' => $kind,
            'business_date' => $businessDate,
            'description' => trim($description),
            'lines' => $normalizedLines,
            'reversal_of' => $reversalOfId,
        ], JSON_THROW_ON_ERROR));

        return DB::transaction(function () use ($branchId, $kind, $businessDate, $description, $normalizedLines, $idempotencyKey, $payloadHash, $actorId, $reversalOfId) {
            $existing = AccountingVoucher::query()
                ->where('branch_id', $branchId)
                ->where('idempotency_key', $idempotencyKey)
                ->first();

            if ($existing) {
                if ($existing->payload_hash !== $payloadHash) {
                    $this->reject('একই Idempotency Key দিয়ে ভিন্ন ভাউচার তৈরি করা যাবে না।');
                }

                return $existing;
            }

            $this->journals->assertOpenBusinessDay($branchId, $businessDate);

            return AccountingVoucher::create([
                'reference' => (string) Str::uuid(),
                'branch_id' => $branchId,
                'kind' => $kind,
                'reversal_of' => $reversalOfId,
                'business_date' => $businessDate,
                'description' => trim($description),
                'lines' => $normalizedLines,
                'idempotency_key' => $idempotencyKey,
                'payload_hash' => $payloadHash,
                'requested_by' => $actorId,
                'status' => AccountingVoucher::STATUS_PENDING,
                'created_at' => now(),
            ]);
        });
    }

    /**
     * Super Admin CRUD: update an existing voucher and its linked journal entry/lines.
     *
     * @param  array<int, array{ledger_account_id: int|string, debit_paisa?: int|string, credit_paisa?: int|string}>  $lines
     */
    public function updateDirectVoucher(
        int $voucherId,
        string $kind,
        string $businessDate,
        string $description,
        array $lines,
        int $actorId
    ): AccountingVoucher {
        $normalizedLines = $this->journals->validateAndNormalizeLines($lines);

        return DB::transaction(function () use ($voucherId, $kind, $businessDate, $description, $normalizedLines, $actorId) {
            $voucher = AccountingVoucher::query()->lockForUpdate()->findOrFail($voucherId);
            $branchId = (int) $voucher->branch_id;

            $this->journals->assertOpenBusinessDay($branchId, $businessDate);

            $payloadHash = hash('sha256', json_encode([
                'branch_id' => $branchId,
                'kind' => $kind,
                'business_date' => $businessDate,
                'description' => trim($description),
                'lines' => $normalizedLines,
                'reversal_of' => $voucher->reversal_of,
            ], JSON_THROW_ON_ERROR));

            if ($voucher->journal_entry_id) {
                $journal = $voucher->journalEntry()->lockForUpdate()->first();
                if ($journal) {
                    $journal->update([
                        'business_date' => $businessDate,
                        'description' => trim($description),
                        'payload_hash' => $payloadHash,
                    ]);
                    $journal->lines()->delete();
                    foreach ($normalizedLines as $line) {
                        $journal->lines()->create($line);
                    }
                }
            } else {
                $journal = $this->journals->postEntry(
                    $branchId,
                    $businessDate,
                    trim($description),
                    $normalizedLines,
                    'voucher:'.$voucher->reference,
                    $actorId,
                    $voucher->reversal_of ? (int) $voucher->reversal_of : null
                );
                $voucher->journal_entry_id = $journal->id;
            }

            $voucher->update([
                'kind' => $kind,
                'business_date' => $businessDate,
                'description' => trim($description),
                'lines' => $normalizedLines,
                'payload_hash' => $payloadHash,
                'status' => AccountingVoucher::STATUS_APPROVED,
                'reviewed_by' => $actorId,
                'reviewed_at' => now(),
                'journal_entry_id' => $voucher->journal_entry_id,
            ]);

            return $voucher->fresh();
        });
    }

    /**
     * Super Admin CRUD: delete a voucher and its linked journal entry/lines.
     */
    public function deleteDirectVoucher(int $voucherId): void
    {
        DB::transaction(function () use ($voucherId) {
            $voucher = AccountingVoucher::query()->lockForUpdate()->findOrFail($voucherId);
            $journal = $voucher->journal_entry_id
                ? $voucher->journalEntry()->lockForUpdate()->first()
                : null;

            $voucher->delete();

            if ($journal) {
                $journal->lines()->delete();
                $journal->delete();
            }
        });
    }

    /**
     * Direct-post voucher without maker-checker queue: creates approved voucher and posts journal immediately.
     *
     * @param  array<int, array{ledger_account_id: int|string, debit_paisa?: int|string, credit_paisa?: int|string}>  $lines
     */
    public function submitDirectVoucher(
        int $branchId,
        string $kind,
        string $businessDate,
        string $description,
        array $lines,
        string $idempotencyKey,
        int $actorId,
        ?int $reversalOfId = null
    ): AccountingVoucher {
        $normalizedLines = $this->journals->validateAndNormalizeLines($lines);

        $payloadHash = hash('sha256', json_encode([
            'branch_id' => $branchId,
            'kind' => $kind,
            'business_date' => $businessDate,
            'description' => trim($description),
            'lines' => $normalizedLines,
            'reversal_of' => $reversalOfId,
        ], JSON_THROW_ON_ERROR));

        return DB::transaction(function () use ($branchId, $kind, $businessDate, $description, $normalizedLines, $idempotencyKey, $payloadHash, $actorId, $reversalOfId) {
            $existing = AccountingVoucher::query()
                ->where('branch_id', $branchId)
                ->where('idempotency_key', $idempotencyKey)
                ->first();

            if ($existing) {
                if ($existing->payload_hash !== $payloadHash) {
                    $this->reject('একই Idempotency Key দিয়ে ভিন্ন ভাউচার তৈরি করা যাবে না।');
                }

                return $existing;
            }

            $this->journals->assertOpenBusinessDay($branchId, $businessDate);

            $reference = (string) Str::uuid();
            $journal = $this->journals->postEntry(
                $branchId,
                $businessDate,
                trim($description),
                $normalizedLines,
                'voucher:'.$reference,
                $actorId,
                $reversalOfId
            );

            return AccountingVoucher::create([
                'reference' => $reference,
                'branch_id' => $branchId,
                'kind' => $kind,
                'reversal_of' => $reversalOfId,
                'business_date' => $businessDate,
                'description' => trim($description),
                'lines' => $normalizedLines,
                'idempotency_key' => $idempotencyKey,
                'payload_hash' => $payloadHash,
                'requested_by' => $actorId,
                'status' => AccountingVoucher::STATUS_APPROVED,
                'reviewed_by' => $actorId,
                'reviewed_at' => now(),
                'decision_note' => 'Direct save',
                'journal_entry_id' => $journal->id,
                'created_at' => now(),
            ]);
        });
    }

    public function approveVoucher(int $voucherId, int $reviewerId, ?string $note = null): AccountingVoucher
    {
        return DB::transaction(function () use ($voucherId, $reviewerId, $note) {
            $voucher = AccountingVoucher::query()->lockForUpdate()->findOrFail($voucherId);

            if ($voucher->status !== AccountingVoucher::STATUS_PENDING) {
                $this->reject('শুধুমাত্র Pending অবস্থায় থাকা ভাউচার অনুমোদন করা যাবে।');
            }

            if ((int) $voucher->requested_by === $reviewerId) {
                $this->reject('Maker-Checker নিয়ম অনুযায়ী ভাউচার প্রস্তুতকারী নিজেই তা অনুমোদন করতে পারবেন না।');
            }

            $journal = $this->journals->postEntry(
                (int) $voucher->branch_id,
                $voucher->business_date->toDateString(),
                $voucher->description,
                $voucher->lines,
                'voucher:'.$voucher->reference,
                $reviewerId,
                $voucher->reversal_of ? (int) $voucher->reversal_of : null
            );

            $voucher->update([
                'status' => AccountingVoucher::STATUS_APPROVED,
                'reviewed_by' => $reviewerId,
                'reviewed_at' => now(),
                'decision_note' => $note,
                'journal_entry_id' => $journal->id,
            ]);

            return $voucher->fresh(['journalEntry.lines.ledgerAccount', 'requester:id,name', 'reviewer:id,name']);
        });
    }

    public function rejectVoucher(int $voucherId, int $reviewerId, string $reason): AccountingVoucher
    {
        return DB::transaction(function () use ($voucherId, $reviewerId, $reason) {
            $voucher = AccountingVoucher::query()->lockForUpdate()->findOrFail($voucherId);

            if ($voucher->status !== AccountingVoucher::STATUS_PENDING) {
                $this->reject('শুধুমাত্র Pending অবস্থায় থাকা ভাউচার বাতিল করা যাবে।');
            }

            $voucher->update([
                'status' => AccountingVoucher::STATUS_REJECTED,
                'reviewed_by' => $reviewerId,
                'reviewed_at' => now(),
                'decision_note' => $reason,
            ]);

            return $voucher->fresh();
        });
    }

    private function reject(string $message): never
    {
        throw ValidationException::withMessages(['voucher' => [$message]]);
    }
}
