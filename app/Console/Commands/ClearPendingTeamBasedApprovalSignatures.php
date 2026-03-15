<?php

namespace App\Console\Commands;

use App\Models\TeamBasedApprovalReview;
use Illuminate\Console\Command;

/**
 * শুধু pending রিভিউগুলো থেকে approver_signature সরিয়ে দেয়।
 * Pending = এখনো approve/reject/forward হয়নি – এগুলোতে সাইনেচার থাকা উচিত নয়।
 *
 *   php artisan team-based-approvals:clear-pending-signatures
 */
class ClearPendingTeamBasedApprovalSignatures extends Command
{
    protected $signature = 'team-based-approvals:clear-pending-signatures';

    protected $description = 'শুধু pending রিভিউগুলো থেকে সাইনেচার সরিয়ে দাও';

    public function handle(): int
    {
        $cleared = TeamBasedApprovalReview::query()
            ->where('status', 'pending')
            ->whereNotNull('approver_signature')
            ->update(['approver_signature' => null]);

        $this->info("Pending {$cleared} টি review থেকে সাইনেচার সরানো হয়েছে।");

        return 0;
    }
}
