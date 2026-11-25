<?php

namespace App\Services\Cash;

use App\Models\BankStatementLine;
use App\Models\CashierSession;
use App\Models\JournalEntry;
use App\Models\JournalLine;
use App\Services\Accounting\JournalService;
use App\Services\Accounting\PostingDefaults;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CashDesk
{
    public function __construct(
        private readonly JournalService $journals,
        private readonly PostingDefaults $defaults
    ) {}

    public function openSession(int $branchId, string $businessDate, int $openingCashPaisa, int $actorId): CashierSession
    {
        return DB::transaction(function () use ($branchId, $businessDate, $openingCashPaisa, $actorId) {
            $this->journals->assertOpenBusinessDay($branchId, $businessDate);

            $existing = CashierSession::query()
                ->where('branch_id', $branchId)
                ->where('business_date', $businessDate)
                ->first();

            if ($existing) {
                $this->reject('এই তারিখের ক্যাশ সেশন ইতিমধ্যে খোলা হয়েছে।');
            }

            return CashierSession::create([
                'branch_id' => $branchId,
                'business_date' => $businessDate,
                'opened_by' => $actorId,
                'opened_at' => now(),
                'opening_cash_paisa' => $openingCashPaisa,
                'status' => CashierSession::STATUS_OPEN,
            ]);
        });
    }

    public function computeExpectedClosingPaisa(int $branchId, string $businessDate, int $openingCashPaisa): int
    {
        $cashAccountId = $this->defaults->resolveAccountId('cash_in_hand');
        if (! $cashAccountId) {
            return $openingCashPaisa;
        }

        $totals = JournalLine::query()
            ->join('journal_entries', 'journal_entries.id', '=', 'journal_lines.journal_entry_id')
            ->where('journal_entries.branch_id', $branchId)
            ->where('journal_entries.business_date', $businessDate)
            ->where('journal_lines.ledger_account_id', $cashAccountId)
            ->selectRaw('COALESCE(SUM(debit_paisa), 0) as total_debit, COALESCE(SUM(credit_paisa), 0) as total_credit')
            ->first();

        $netMovement = (int) ($totals->total_debit ?? 0) - (int) ($totals->total_credit ?? 0);

        return $openingCashPaisa + $netMovement;
    }

    public function submitSession(int $sessionId, int $actualClosingPaisa, ?string $note, int $actorId): CashierSession
    {
        return DB::transaction(function () use ($sessionId, $actualClosingPaisa, $note) {
            $session = CashierSession::query()->lockForUpdate()->findOrFail($sessionId);

            if (! in_array($session->status, [CashierSession::STATUS_OPEN, CashierSession::STATUS_REJECTED], true)) {
                $this->reject('শুধুমাত্র Open বা Rejected ক্যাশ সেশন সাবমিট করা যাবে।');
            }

            $expected = $this->computeExpectedClosingPaisa(
                (int) $session->branch_id,
                $session->business_date->toDateString(),
                (int) $session->opening_cash_paisa
            );

            $session->update([
                'expected_closing_paisa' => $expected,
                'actual_closing_paisa' => $actualClosingPaisa,
                'variance_paisa' => $actualClosingPaisa - $expected,
                'status' => CashierSession::STATUS_SUBMITTED,
                'submitted_at' => now(),
                'note' => $note,
            ]);

            return $session->fresh();
        });
    }

    public function reviewSession(int $sessionId, bool $approve, ?string $note, int $reviewerId): CashierSession
    {
        return DB::transaction(function () use ($sessionId, $approve, $note, $reviewerId) {
            $session = CashierSession::query()->lockForUpdate()->findOrFail($sessionId);

            if ($session->status !== CashierSession::STATUS_SUBMITTED) {
                $this->reject('শুধুমাত্র Submitted ক্যাশ সেশন রিভিউ করা যাবে।');
            }

            if ((int) $session->opened_by === $reviewerId) {
                $this->reject('Maker-Checker নিয়ম অনুযায়ী যিনি ক্যাশ সেশন খুলেছেন তিনি নিজে তা অনুমোদন করতে পারবেন না।');
            }

            if ($approve && (int) $session->variance_paisa !== 0) {
                $this->reject('হাতে থাকা নগদ এবং ক্যাশবুকের হিসেবে গরমিল (Variance) থাকায় সেশন অনুমোদন করা যাবে না।');
            }

            $session->update([
                'status' => $approve ? CashierSession::STATUS_APPROVED : CashierSession::STATUS_REJECTED,
                'reviewed_by' => $reviewerId,
                'reviewed_at' => now(),
                'note' => $note ?? $session->note,
            ]);

            return $session->fresh();
        });
    }

    public function addBankStatementLine(
        int $branchId,
        int $ledgerAccountId,
        string $statementDate,
        string $description,
        int $debitPaisa,
        int $creditPaisa,
        ?string $referenceNo,
        int $actorId
    ): BankStatementLine {
        return BankStatementLine::create([
            'branch_id' => $branchId,
            'ledger_account_id' => $ledgerAccountId,
            'statement_date' => $statementDate,
            'reference_no' => $referenceNo,
            'description' => $description,
            'debit_paisa' => $debitPaisa,
            'credit_paisa' => $creditPaisa,
            'created_by' => $actorId,
        ]);
    }

    public function matchBankLine(int $lineId, int $journalEntryId): BankStatementLine
    {
        $line = BankStatementLine::query()->findOrFail($lineId);
        $entry = JournalEntry::query()->findOrFail($journalEntryId);

        if ((int) $line->branch_id !== (int) $entry->branch_id) {
            $this->reject('ভিন্ন শাখার জার্নালের সাথে ব্যাংক স্টেটমেন্ট ম্যাচ করা যাবে না।');
        }

        $line->update(['matched_journal_entry_id' => $entry->id]);

        return $line->fresh();
    }

    private function reject(string $message): never
    {
        throw ValidationException::withMessages(['cash_desk' => [$message]]);
    }
}
