<?php

namespace App\Console\Commands;

use App\Services\LostHeadOfficeIssueRestorer;
use Illuminate\Console\Command;

class RestoreLostHeadOfficeIssuesCommand extends Command
{
    protected $signature = 'verification:restore-lost-ho-issues
                            {--dry-run : শুধু দেখাবে, ডেটাবেজ বদলাবে না}
                            {--application= : নির্দিষ্ট আবেদন নং (যেমন 0017888834)}';

    protected $description = 'নোটিফিকেশন থেকে হারানো হেড অফিস আপত্তি ফিরিয়ে আনে; শাখার জবাব আলাদা রাখে';

    public function handle(LostHeadOfficeIssueRestorer $restorer): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $applicationNo = $this->option('application');
        $applicationNo = filled($applicationNo) ? (string) $applicationNo : null;

        if ($dryRun) {
            $this->warn('Dry-run: কোনো রেকর্ড পরিবর্তন হবে না।');
        }

        $report = $restorer->restore($dryRun, $applicationNo);

        $rows = collect($report['items'])->map(fn (array $item) => [
            $item['application_no'] ?? '—',
            $item['action'] ?? '',
            $item['reason'] ?? ($item['reply_preview'] ?? ''),
        ]);

        if ($rows->isNotEmpty()) {
            $this->table(
                ['আবেদন নং', 'অ্যাকশন', 'নোট'],
                $rows->all()
            );
        }

        $this->info("Restored issues: {$report['restored']}");
        $this->info("Replies filled: {$report['replies_filled']}");
        $this->info("Revision comments fixed: {$report['comments_fixed']}");
        $this->info("Skipped: {$report['skipped']}");

        if ($dryRun && $report['restored'] + $report['replies_filled'] + $report['comments_fixed'] > 0) {
            $this->comment('প্রোডাকশনে আসল রান: php artisan verification:restore-lost-ho-issues');
        }

        return self::SUCCESS;
    }
}
