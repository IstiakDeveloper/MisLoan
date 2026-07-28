<?php

namespace App\Console\Commands;

use App\Models\Branch;
use App\Services\BranchAccountService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class MigrateBranchAccountsCommand extends Command
{
    protected $signature = 'branch-accounts:migrate {--default-pin=12345678 : Default branch login PIN when none is set}';

    protected $description = 'Migrate legacy branch users (username=branch code) to HRM-style branch accounts (branch_{code})';

    public function handle(BranchAccountService $branchAccountService): int
    {
        $defaultPin = (string) $this->option('default-pin');

        $count = 0;
        Branch::query()->with('area')->orderBy('code')->each(function (Branch $branch) use ($branchAccountService, $defaultPin, &$count) {
            if (! $branch->login_pin) {
                $branch->login_pin = Hash::make($defaultPin);
                $branch->saveQuietly();
            }

            $branchAccountService->ensureForBranch($branch->fresh(['area']));
            $count++;
        });

        $this->info("Migrated {$count} branch account(s). Default branch PIN: {$defaultPin} (where PIN was not set).");

        return self::SUCCESS;
    }
}
