<?php

namespace App\Console\Commands;

use App\Models\Notification;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;

class PruneStaleNotificationsCommand extends Command
{
    protected $signature = 'notifications:prune
                            {--days=15 : Delete in-app notifications older than this many days}';

    protected $description = 'Delete notifications older than the retention window and discard queued or failed mail jobs';

    public function handle(): int
    {
        $days = max(1, (int) $this->option('days'));
        $cutoff = now()->subDays($days);

        $notificationsDeleted = Notification::query()
            ->where('created_at', '<', $cutoff)
            ->delete();

        $queuedMailDeleted = $this->deleteMailRows('jobs');
        $failedMailDeleted = $this->deleteMailRows('failed_jobs');

        $this->info("Deleted {$notificationsDeleted} notifications older than {$days} days.");
        $this->info("Removed {$queuedMailDeleted} queued mail jobs and {$failedMailDeleted} failed mail jobs.");

        return self::SUCCESS;
    }

    private function deleteMailRows(string $table): int
    {
        if (! Schema::hasTable($table)) {
            return 0;
        }

        $names = collect(File::files(app_path('Mail')))
            ->map(fn ($file) => $file->getFilenameWithoutExtension())
            ->filter()
            ->values();

        if ($names->isEmpty()) {
            return 0;
        }

        return DB::table($table)
            ->where(function ($query) use ($names) {
                foreach ($names as $name) {
                    $query->orWhere('payload', 'like', '%'.$name.'%');
                }
            })
            ->delete();
    }
}
