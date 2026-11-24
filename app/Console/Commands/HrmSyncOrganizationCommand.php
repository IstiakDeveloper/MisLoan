<?php

namespace App\Console\Commands;

use App\Services\HrmOrganizationSyncService;
use Illuminate\Console\Command;

class HrmSyncOrganizationCommand extends Command
{
    protected $signature = 'hrm:sync-organization';

    protected $description = 'Synchronize organization hierarchy (Zones, Areas, Branches, and Seat Users) from HRM';

    public function handle(HrmOrganizationSyncService $service): int
    {
        $this->info('Starting organization hierarchy synchronization from HRM...');

        try {
            $stats = $service->sync();
        } catch (\Throwable $e) {
            $this->error('Organization sync failed: ' . $e->getMessage());

            return self::FAILURE;
        }

        $this->info('Organization sync completed successfully!');
        $this->line(sprintf('  Zones: %d updated, %d created', $stats['zones']['updated'], $stats['zones']['created']));
        $this->line(sprintf('  Areas: %d updated, %d created', $stats['areas']['updated'], $stats['areas']['created']));
        $this->line(sprintf('  Branches: %d updated, %d created', $stats['branches']['updated'], $stats['branches']['created']));
        $this->line(sprintf('  Seat Users: %d updated, %d created', $stats['users']['updated'] ?? 0, $stats['users']['created'] ?? 0));

        return self::SUCCESS;
    }
}
