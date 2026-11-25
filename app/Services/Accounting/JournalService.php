<?php

namespace App\Services\Accounting;

use App\Models\BranchAccountingPeriod;
use App\Models\JournalEntry;
use App\Models\JournalLine;
use App\Models\LedgerAccount;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class JournalService
{
    /**
     * @param  array<int, array{ledger_account_id: int, debit_paisa: int, credit_paisa: int}>  $lines
     */
    public function postEntry(
        int $branchId,
        string $businessDate,
        string $description,
        array $lines,
        string $idempotencyKey,
        int $actorId,
        ?int $reversalOfId = null
    ): JournalEntry {
        $normalizedLines = $this->validateAndNormalizeLines($lines);
        $payloadHash = hash('sha256', json_encode([
            'branch_id' => $branchId,
            'business_date' => $businessDate,
            'description' => trim($description),
            'lines' => $normalizedLines,
            'reversal_of' => $reversalOfId,
        ], JSON_THROW_ON_ERROR));

        return DB::transaction(function () use ($branchId, $businessDate, $description, $normalizedLines, $idempotencyKey, $payloadHash, $actorId, $reversalOfId) {
            $existing = JournalEntry::query()
                ->where('branch_id', $branchId)
                ->where('idempotency_key', $idempotencyKey)
                ->first();

            if ($existing) {
                if ($existing->payload_hash !== $payloadHash) {
                    $this->reject('একই Idempotency Key দিয়ে ভিন্ন তথ্য পোস্ট করা যাবে না।');
                }

                return $existing->load('lines.ledgerAccount');
            }

            $dayPeriod = $this->assertOpenBusinessDay($branchId, $businessDate);

            $accountIds = array_values(array_unique(array_column($normalizedLines, 'ledger_account_id')));
            $activeCount = LedgerAccount::query()
                ->whereIn('id', $accountIds)
                ->where('is_active', true)
                ->count();

            if ($activeCount !== count($accountIds)) {
                $this->reject('নির্বাচিত এক বা একাধিক লেজার অ্যাকাউন্ট নিষ্ক্রিয় বা অকার্যকর।');
            }

            $entry = JournalEntry::create([
                'reference' => (string) Str::uuid(),
                'branch_id' => $branchId,
                'branch_accounting_period_id' => $dayPeriod->id,
                'idempotency_key' => $idempotencyKey,
                'payload_hash' => $payloadHash,
                'business_date' => $businessDate,
                'description' => trim($description),
                'created_by' => $actorId,
                'reversal_of' => $reversalOfId,
                'created_at' => now(),
            ]);

            foreach ($normalizedLines as $line) {
                JournalLine::create([
                    'journal_entry_id' => $entry->id,
                    'ledger_account_id' => $line['ledger_account_id'],
                    'debit_paisa' => $line['debit_paisa'],
                    'credit_paisa' => $line['credit_paisa'],
                ]);
            }

            return $entry->load('lines.ledgerAccount');
        });
    }

    public function assertOpenBusinessDay(int $branchId, string $businessDate): BranchAccountingPeriod
    {
        $monthEnd = CarbonImmutable::parse($businessDate)->endOfMonth()->toDateString();

        $monthClosed = BranchAccountingPeriod::query()
            ->where('branch_id', $branchId)
            ->where('kind', BranchAccountingPeriod::KIND_MONTH)
            ->where('period_date', $monthEnd)
            ->where('status', BranchAccountingPeriod::STATUS_CLOSED)
            ->exists();

        if ($monthClosed) {
            $this->reject('এই মাসের হিসাব ইতিমধ্যে বন্ধ (Month Closed) হয়ে গেছে।');
        }

        $day = BranchAccountingPeriod::query()
            ->where('branch_id', $branchId)
            ->where('kind', BranchAccountingPeriod::KIND_DAY)
            ->where('period_date', $businessDate)
            ->where('status', BranchAccountingPeriod::STATUS_OPEN)
            ->lockForUpdate()
            ->first();

        if (! $day) {
            $this->reject("শাখার {$businessDate} তারিখের কর্মদিবস খোলা (Day Open) নেই।");
        }

        return $day;
    }

    /**
     * @param  array<int, array{ledger_account_id: int|string, debit_paisa?: int|string, credit_paisa?: int|string}>  $lines
     * @return array<int, array{ledger_account_id: int, debit_paisa: int, credit_paisa: int}>
     */
    public function validateAndNormalizeLines(array $lines): array
    {
        if (count($lines) < 2) {
            $this->reject('ডাবল-এন্ট্রি জার্নালে কমপক্ষে ২টি লাইন (Debit ও Credit) থাকতে হবে।');
        }

        $normalized = [];
        $totalDebit = 0;
        $totalCredit = 0;

        foreach ($lines as $line) {
            $accountId = (int) ($line['ledger_account_id'] ?? 0);
            $debit = (int) ($line['debit_paisa'] ?? 0);
            $credit = (int) ($line['credit_paisa'] ?? 0);

            if ($accountId <= 0 || $debit < 0 || $credit < 0 || ($debit === 0 && $credit === 0) || ($debit > 0 && $credit > 0)) {
                $this->reject('প্রতিটি জার্নাল লাইনে সঠিক অ্যাকাউন্ট এবং শুধুমাত্র একটি পাশে (Debit অথবা Credit) ধনাত্মক টাকা থাকতে হবে।');
            }

            $totalDebit += $debit;
            $totalCredit += $credit;

            $normalized[] = [
                'ledger_account_id' => $accountId,
                'debit_paisa' => $debit,
                'credit_paisa' => $credit,
            ];
        }

        if ($totalDebit <= 0 || $totalDebit !== $totalCredit) {
            $this->reject('মোট Debit এবং মোট Credit অবশ্যই সমান হতে হবে।');
        }

        return $normalized;
    }

    private function reject(string $message): never
    {
        throw ValidationException::withMessages(['accounting' => [$message]]);
    }
}
