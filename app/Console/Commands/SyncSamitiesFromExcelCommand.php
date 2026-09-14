<?php

namespace App\Console\Commands;

use App\Services\SamityExcelSyncService;
use Illuminate\Console\Command;
use InvalidArgumentException;
use Throwable;

class SyncSamitiesFromExcelCommand extends Command
{
    protected $signature = 'samities:sync-from-excel
                            {--path= : Path to the Samities Excel file (default: docs/Samities.xlsx)}
                            {--dry-run : Show what would change without writing}
                            {--force : Skip the confirmation prompt}';

    protected $description = 'Sync branch samities from Excel: pad codes to 8 digits, update by code/name, or create missing ones';

    public function handle(SamityExcelSyncService $syncService): int
    {
        $path = $this->resolvePath((string) ($this->option('path') ?: ''));
        $dryRun = (bool) $this->option('dry-run');

        if (! is_file($path)) {
            $this->error("Excel file not found: {$path}");

            return self::FAILURE;
        }

        if (! $dryRun && ! $this->option('force') && $this->input->isInteractive()) {
            if (! $this->confirm("Sync samities from {$path} into the database?", true)) {
                $this->warn('Cancelled.');

                return self::SUCCESS;
            }
        }

        if ($dryRun) {
            $this->info('Dry run — no database changes will be written.');
        }

        try {
            $result = $syncService->sync($path, $dryRun);
        } catch (InvalidArgumentException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        } catch (Throwable $exception) {
            $this->error('Samity Excel sync failed: '.$exception->getMessage());

            return self::FAILURE;
        }

        $this->table(
            ['Metric', 'Count'],
            [
                ['Excel rows', $result['total_rows']],
                ['Created', $result['created']],
                ['Name updated', $result['name_updated']],
                ['Code updated', $result['code_updated']],
                ['Unchanged', $result['unchanged']],
                ['Skipped', $result['skipped']],
                ['Conflicts', $result['conflicts']],
            ]
        );

        $errors = array_slice($result['errors'], 0, 20);
        foreach ($errors as $error) {
            $this->warn($error);
        }

        if (count($result['errors']) > 20) {
            $this->warn('... and '.(count($result['errors']) - 20).' more issue(s).');
        }

        $this->info($dryRun ? 'Dry run complete.' : 'Samity Excel sync complete.');

        return self::SUCCESS;
    }

    private function resolvePath(string $path): string
    {
        if ($path === '') {
            return base_path('docs/Samities.xlsx');
        }

        if (is_file($path)) {
            return $path;
        }

        $fromBase = base_path($path);
        if (is_file($fromBase)) {
            return $fromBase;
        }

        return $path;
    }
}
