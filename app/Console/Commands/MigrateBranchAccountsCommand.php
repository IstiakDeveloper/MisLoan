<?php

namespace App\Console\Commands;

use App\Models\Branch;
use App\Services\BranchAccountService;
use Illuminate\Console\Command;

class MigrateBranchAccountsCommand extends Command
{
    protected $signature = 'branch-accounts:migrate {--default-pin= : Deprecated; shared default PINs are refused}';

    protected $description = 'Migrate legacy branch users (username=branch code) to HRM-style branch accounts (branch_{code})';

    public function handle(BranchAccountService $branchAccountService): int
    {
        if (filled($this->option('default-pin'))) {
            $this->error('Shared default PINs are not allowed. Configure each branch PIN separately.');

            return self::FAILURE;
        }

        $count = 0;
        Branch::query()->with('area')->orderBy('code')->each(function (Branch $branch) use ($branchAccountService, &$count) {
            $branchAccountService->ensureForBranch($branch->fresh(['area']));
            $count++;
        });

        $this->info("Migrated {$count} branch account(s). Existing PINs preserved; branch login remains unavailable without a configured PIN.");

        return self::SUCCESS;
    }
}
