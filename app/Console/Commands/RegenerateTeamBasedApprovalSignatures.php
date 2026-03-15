<?php

namespace App\Console\Commands;

use App\Models\TeamBasedApprovalReview;
use Illuminate\Console\Command;

/**
 * Storage delete হওয়ার পর: যতগুলো Team Based Approval এ approve/reject/forward হয়েছে,
 * সেই সব review এর approver_signature approver এর বর্তমান profile signature দিয়ে আপডেট করে।
 *
 *   php artisan team-based-approvals:regenerate-signatures
 */
class RegenerateTeamBasedApprovalSignatures extends Command
{
    protected $signature = 'team-based-approvals:regenerate-signatures';

    protected $description = 'আজ পর্যন্ত যত approve/reject/forward হয়েছে, সেগুলোর signature approver এর profile থেকে পুনরায় সেট করুন';

    public function handle(): int
    {
        // আগে সব review থেকে সাইনেচার সরিয়ে দাও (পুরনো/ভাঙা path গুলো মুছে ফেলো)
        $allCleared = TeamBasedApprovalReview::query()
            ->whereNotNull('approver_signature')
            ->update(['approver_signature' => null]);

        $this->info("সব মিলিয়ে {$allCleared} টি review থেকে সাইনেচার সরানো হয়েছে।");

        // এরপর শুধু যেগুলো approve/reject/forward হয়েছে সেগুলোর সাইনেচার approver এর প্রোফাইল থেকে সেট করো
        $reviews = TeamBasedApprovalReview::query()
            ->whereIn('status', ['approved', 'rejected', 'forwarded'])
            ->with('user:id,signature')
            ->get();

        $updated = 0;
        $skippedNoSignature = 0;

        foreach ($reviews as $review) {
            $user = $review->user;
            if (! $user || ! filled($user->signature)) {
                $skippedNoSignature++;

                continue;
            }

            $review->update(['approver_signature' => $user->signature]);
            $updated++;
        }

        $this->info("আপডেট হয়েছে: {$updated} টি review।");
        if ($skippedNoSignature > 0) {
            $this->warn("প্রোফাইলে সাইনেচার নেই এমন approver এর {$skippedNoSignature} টি review অপরিবর্তিত রাখা হয়েছে।");
        }

        return 0;
    }
}
