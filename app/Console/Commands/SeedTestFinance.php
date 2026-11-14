<?php

namespace App\Console\Commands;

use App\Services\Loans\TestLoanSetup;
use Illuminate\Console\Command;

final class SeedTestFinance extends Command
{
    protected $signature = 'demo:seed-finance {--month= : Disbursement month, YYYY-MM} {--apply : Back up and apply the local test-only rebuild}';

    protected $description = 'Preview or seed test accounting and rebuild unposted disbursed loans from current products (local/testing only)';

    public function handle(TestLoanSetup $setup): int
    {
        try {
            $plan = $setup->plan((string) $this->option('month'));
            $this->line(json_encode(['month' => $plan['month'], 'to_post' => count($plan['loans']), 'already_posted' => $plan['already_posted'], 'errors' => $plan['errors']], JSON_PRETTY_PRINT));
            if ($plan['errors']) {
                return self::FAILURE;
            }
            if (! $this->option('apply')) {
                $this->info('Preview only. No database changes made.');

                return self::SUCCESS;
            }
            $result = $setup->apply($plan, fn ($count, $total) => $this->line("Prepared {$count}/{$total} loan postings; transaction not yet committed."));
            $this->info(json_encode($result, JSON_PRETTY_PRINT));

            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }
    }
}
