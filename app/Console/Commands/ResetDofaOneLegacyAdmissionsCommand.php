<?php

namespace App\Console\Commands;

use App\Models\MemberAdmission;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class ResetDofaOneLegacyAdmissionsCommand extends Command
{
    protected $signature = 'member-admissions:reset-dofa-one-legacy
                            {--dry-run : Show which admissions would change without saving}
                            {--force : Run without confirmation}';

    protected $description = 'Turn dofa-1 old admissions back into new members. Status and loans stay unchanged';

    public function handle(): int
    {
        $query = $this->targets();
        $count = (clone $query)->count();

        if ($count === 0) {
            $this->info('No dofa-1 old admissions to reset.');

            return self::SUCCESS;
        }

        $byStatus = (clone $query)
            ->select('status', DB::raw('count(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status');

        $this->info("Dofa-1 old admissions: {$count}");
        $this->table(
            ['Status (unchanged)', 'Count'],
            $byStatus->map(fn ($total, $status) => [$status, $total])->values()->all()
        );

        if ($this->option('dry-run')) {
            $this->warn('Dry-run — nothing saved. Real run: php artisan member-admissions:reset-dofa-one-legacy --force');

            return self::SUCCESS;
        }

        if (! $this->option('force') && ! $this->confirm('Set these admissions back to new? Status will not change.', false)) {
            $this->warn('Cancelled.');

            return self::SUCCESS;
        }

        $updated = DB::transaction(function () use ($query) {
            return $query->update([
                'is_legacy' => false,
                'loan_dofa' => null,
            ]);
        });

        $this->info("Reset {$updated} admission(s) to new. Status was left as it was.");

        return self::SUCCESS;
    }

    /**
     * First-cycle admissions that were marked old at dofa 1.
     * Later dofa and cycle copies are left alone.
     */
    private function targets(): Builder
    {
        return MemberAdmission::query()
            ->where('is_legacy', true)
            ->where('loan_dofa', 1)
            ->whereNull('previous_admission_id');
    }
}
