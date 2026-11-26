<?php

namespace App\Console\Commands;

use App\Models\LoanApplication;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class RepairRevertedRepaidLoansCommand extends Command
{
    protected $signature = 'loans:repair-reverted-repaid
        {--apply : Persist changes to the database (dry-run by default)}
        {--branch_id= : Limit scan/repair to a single branch ID}
        {--skip-disbursed : Skip loans currently in disbursed status}';

    protected $description = 'Find and restore loans with repaid_at set whose status was overwritten away from repaid';

    public function handle(): int
    {
        $apply = (bool) $this->option('apply');
        $branchId = $this->option('branch_id');
        $skipDisbursed = (bool) $this->option('skip-disbursed');

        $query = LoanApplication::query()
            ->with([
                'memberAdmission:id,branch_id,application_no,loan_dofa,applicant_name_bn,applicant_name_en',
                'branch:id,name,code',
            ])
            ->whereNotNull('repaid_at')
            ->where('status', '!=', LoanApplication::STATUS_REPAID)
            ->orderBy('id');

        if ($branchId !== null && $branchId !== '') {
            $query->where('branch_id', (int) $branchId);
        }

        if ($skipDisbursed) {
            $query->where('status', '!=', LoanApplication::STATUS_DISBURSED);
        }

        $candidates = $query->get();

        if ($candidates->isEmpty()) {
            $this->info('No reverted repaid loans found.');

            return self::SUCCESS;
        }

        $rows = [];
        foreach ($candidates as $loan) {
            $admission = $loan->memberAdmission;
            $siblingStatuses = '';
            if ($admission) {
                $siblingStatuses = LoanApplication::query()
                    ->whereIn('member_admission_id', $admission->sisterAdmissionIds())
                    ->where('id', '!=', $loan->id)
                    ->orderBy('id')
                    ->get(['id', 'status'])
                    ->map(fn (LoanApplication $s) => "#{$s->id}:{$s->status}")
                    ->implode(', ');
            }

            $rows[] = [
                'id' => $loan->id,
                'app_no' => $loan->application_no,
                'branch' => $loan->branch?->code ?? $loan->branch_id,
                'member_code' => $admission?->application_no ?? '—',
                'dofa' => $admission?->loan_dofa ?? '—',
                'status' => $loan->status,
                'repaid_at' => $loan->repaid_at?->format('Y-m-d') ?? '—',
                'reviewed_at' => $loan->reviewed_at?->format('Y-m-d H:i:s') ?? '—',
                'siblings' => $siblingStatuses ?: '—',
            ];
        }

        $this->table(
            ['ID', 'Loan No', 'Branch', 'Member Code', 'Dofa', 'Current Status', 'Repaid At', 'Reviewed At', 'Other Dofa Loans'],
            $rows
        );

        $byStatus = $candidates->groupBy('status')->map->count()->all();
        $summaryParts = [];
        foreach ($byStatus as $status => $count) {
            $summaryParts[] = "{$status}: {$count}";
        }
        $this->line('Found '.$candidates->count().' affected loan(s) ['.implode(', ', $summaryParts).'].');

        if (! $apply) {
            $this->warn('Dry-run only. Re-run with --apply to restore their status to "repaid".');

            return self::SUCCESS;
        }

        $restoredCount = 0;
        $closedIssuesCount = 0;

        DB::transaction(function () use ($candidates, &$restoredCount, &$closedIssuesCount) {
            foreach ($candidates as $candidate) {
                $locked = LoanApplication::query()->whereKey($candidate->id)->lockForUpdate()->first();
                if (! $locked || $locked->repaid_at === null || $locked->status === LoanApplication::STATUS_REPAID) {
                    continue;
                }

                $locked->update([
                    'status' => LoanApplication::STATUS_REPAID,
                    'pending_approved_amount' => null,
                    'amount_change_requested_at' => null,
                    'amount_change_requested_by' => null,
                    'cancellation_from_status' => null,
                    'cancellation_requested_at' => null,
                    'cancellation_requested_by' => null,
                ]);
                $restoredCount++;

                $pendingIssues = $locked->issues()->where('status', 'pending')->get();
                foreach ($pendingIssues as $issue) {
                    $issueUpdate = ['status' => 'resolved'];
                    if (! $issue->responded_at) {
                        $issueUpdate['responded_at'] = $locked->repaid_at;
                        $issueUpdate['responded_by'] = $locked->repaid_by;
                    }
                    if (! $issue->response_message) {
                        $issueUpdate['response_message'] = 'ঋণ পূর্বেই পরিশোধিত (Repaid) থাকায় সিস্টেম কর্তৃক বন্ধ করা হয়েছে';
                    }
                    $issue->update($issueUpdate);
                    $closedIssuesCount++;
                }
            }
        });

        $this->info("Restored {$restoredCount} loan(s) back to \"repaid\" and closed {$closedIssuesCount} dangling pending issue(s).");

        return self::SUCCESS;
    }
}
