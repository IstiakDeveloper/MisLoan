<?php

namespace App\Console\Commands;

use App\Models\LoanApplication;
use App\Models\LoanApplicationApproval;
use App\Models\TeamBasedApproval;
use App\Models\TeamBasedApprovalReview;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class SyncStuckTeamBasedApprovalsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'team-based-approvals:sync-stuck {--dry-run : শুধুমাত্র আটকে থাকা রেকর্ডগুলো দেখাবে, ডাটাবেজ আপডেট করবে না}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'মূল ঋণ আবেদন অনুমোদিত হওয়ার পরও টিম-বেসডে আটকে থাকা পেন্ডিং রিভিউগুলো স্বয়ংক্রিয়ভাবে অনুমোদন ও সিঙ্ক করে';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $isDryRun = (bool) $this->option('dry-run');

        $completedStatuses = [
            LoanApplication::STATUS_APPROVED,
            LoanApplication::STATUS_READY_FOR_HEAD_OFFICE,
            LoanApplication::STATUS_PENDING_HEAD_OFFICE,
            LoanApplication::STATUS_PENDING_DISBURSEMENT,
            LoanApplication::STATUS_DISBURSED,
        ];

        $pendingReviews = TeamBasedApprovalReview::query()
            ->whereIn('status', ['pending', 'waiting'])
            ->whereHas('approval.loanApplication', function ($q) use ($completedStatuses) {
                $q->whereIn('status', $completedStatuses);
            })
            ->with(['approval.loanApplication', 'approval.branch', 'item', 'user.role'])
            ->get();

        if ($pendingReviews->isEmpty()) {
            $this->info('কোনো আটকে থাকা পেন্ডিং টিম-বেসড রিভিউ পাওয়া যায়নি।');

            return 0;
        }

        $this->info('মোট ' . $pendingReviews->count() . ' টি আটকে থাকা রিভিউ পাওয়া গেছে।');
        if ($isDryRun) {
            $this->warn('--- DRY RUN মোড চালু: ডাটাবেজে কোনো পরিবর্তন করা হবে না ---');
        }

        $tableRows = [];
        $directMatchCount = 0;
        $orphanCount = 0;

        DB::beginTransaction();

        try {
            foreach ($pendingReviews as $review) {
                $loan = $review->approval?->loanApplication;
                if (! $loan) {
                    continue;
                }

                $loanApproval = LoanApplicationApproval::query()
                    ->where('loan_application_id', $loan->id)
                    ->where('user_id', $review->user_id)
                    ->where('status', 'approved')
                    ->latest('id')
                    ->first();

                $approvedAmount = (int) round((float) ($loan->approved_amount ?? $loan->requested_amount ?? 0));
                $memberCode = $loan->memberCode() ?? 'N/A';
                $approverName = $review->user?->name ?? 'N/A';
                $roleName = $review->user?->role?->name ?? 'N/A';

                if ($loanApproval) {
                    $type = 'সরাসরি অনুমোদনকারী (Direct Match)';
                    $comments = $loanApproval->comments ?: 'ঋণ অনুমোদনকারী কর্তৃক অনুমোদিত';
                    $signature = $review->user?->signature ?? $loanApproval->approver_signature;
                    $decidedAt = $loanApproval->approved_at ?? now();
                    $directMatchCount++;
                } else {
                    $type = 'পুরনো শিট রিভিউ (Orphaned Sheet)';
                    $comments = 'উচ্চতর কর্মকর্তা কর্তৃক ঋণ অনুমোদিত হওয়ায় স্বয়ংক্রিয়ভাবে নিষ্পন্ন';
                    $signature = null;
                    $decidedAt = $loan->updated_at ?? now();
                    $orphanCount++;
                }

                $tableRows[] = [
                    $loan->id,
                    $loan->application_no,
                    $memberCode,
                    $review->team_based_approval_id,
                    $review->id,
                    $approverName . ' (' . $roleName . ')',
                    $loan->status,
                    $type,
                ];

                if (! $isDryRun) {
                    $review->update([
                        'status' => 'approved',
                        'comments' => $comments,
                        'approved_amount' => $approvedAmount,
                        'approver_signature' => $signature,
                        'decided_at' => $decidedAt,
                    ]);

                    if ($review->item) {
                        $review->item->update(['approved_amount' => $approvedAmount]);
                    }

                    // Check if parent sheet still has any pending reviews
                    $parentSheet = $review->approval;
                    if ($parentSheet) {
                        $hasOtherPending = $parentSheet->reviews()
                            ->where('id', '!=', $review->id)
                            ->whereIn('status', ['pending', 'waiting'])
                            ->exists();

                        if (! $hasOtherPending) {
                            $parentSheet->update([
                                'status' => 'approved',
                                'approved_total_amount' => $approvedAmount,
                            ]);
                        }
                    }
                }
            }

            if ($isDryRun) {
                DB::rollBack();
            } else {
                DB::commit();
            }

            $this->table(
                ['Loan ID', 'App No', 'Member Code', 'Sheet ID', 'Review ID', 'Approver', 'Loan Status', 'Type'],
                $tableRows
            );

            $this->newLine();
            $this->info("সরাসরি অনুমোদনকারী ম্যাচ: {$directMatchCount} টি");
            $this->info("পুরনো শিট ম্যাচ: {$orphanCount} টি");
            $this->info("মোট সমন্বিত: " . ($directMatchCount + $orphanCount) . " টি");

            if ($isDryRun) {
                $this->warn('প্রকৃত ডাটাবেজে আপডেট করতে কমান্ডটি --dry-run অপশন ছাড়া চালান:');
                $this->comment('php artisan team-based-approvals:sync-stuck');
            } else {
                $this->info('সবগুলো আটকে থাকা টিম-বেসড রিভিউ সফলভাবে সম্পন্ন (approved) করা হয়েছে!');
            }

            return 0;
        } catch (\Throwable $e) {
            DB::rollBack();
            $this->error('ত্রুটি ঘটেছে: ' . $e->getMessage());

            return 1;
        }
    }
}
