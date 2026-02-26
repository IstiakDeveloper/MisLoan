<?php

namespace App\Console\Commands;

use App\Models\MemberAdmission;
use App\Models\MemberAdmissionApproval;
use App\Models\User;
use Illuminate\Console\Command;

/**
 * একবার চালান: যে Member Admissions ইতিমধ্যে submitted/under_review সেগুলোর
 * branch-level approval Branch User এর বদলে সব Branch Manager দের কাছে পাঠায়।
 *
 *   php artisan member-admissions:send-to-branch-managers
 */
class SendMemberAdmissionsToBranchManagers extends Command
{
    protected $signature = 'member-admissions:send-to-branch-managers';

    protected $description = 'Submitted/under_review Member Admissions এর approval সব Branch Manager দের কাছে পাঠান';

    public function handle(): int
    {
        $admissions = MemberAdmission::whereIn('status', ['submitted', 'under_review'])
            ->with('branch')
            ->get();

        $updated = 0;

        foreach ($admissions as $admission) {
            $branch = $admission->branch;
            if (!$branch) {
                continue;
            }

            $branchManagers = User::where('branch_id', $branch->id)
                ->where('is_active', 1)
                ->whereHas('role', fn ($q) => $q->where('name', 'branch_manager'))
                ->get();

            if ($branchManagers->isEmpty()) {
                $this->warn("No Branch Manager for branch {$branch->name} (admission #{$admission->id}).");
                continue;
            }

            // পুরনো branch-level (sequence 1) approval গুলো সরিয়ে দিয়ে নতুন করে সব BM দের জন্য তৈরি করুন
            $admission->approvals()
                ->where('level', 'branch')
                ->where('sequence', 1)
                ->delete();

            foreach ($branchManagers as $bm) {
                MemberAdmissionApproval::create([
                    'member_admission_id' => $admission->id,
                    'user_id' => $bm->id,
                    'level' => 'branch',
                    'sequence' => 1,
                    'status' => 'pending',
                ]);
            }

            $updated++;
            $this->line("Admission {$admission->application_no} → {$branchManagers->count()} Branch Manager(s).");
        }

        $this->info("Done. Updated {$updated} admission(s).");
        return 0;
    }
}
