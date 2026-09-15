<?php

namespace App\Console\Commands;

use App\Models\LoanApplication;
use App\Models\MemberAdmission;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class RemoveDuplicateLoanFormsCommand extends Command
{
    protected $signature = 'loans:remove-duplicate-forms
                            {--dry-run : Show what would be removed without deleting}
                            {--force : Run without confirmation}';

    protected $description = 'Keep one open loan per member (latest submitted); never delete disbursed loans';

    public function handle(): int
    {
        $groups = $this->duplicateGroups();
        if ($groups->isEmpty()) {
            $this->info('No duplicate open loan forms found.');

            return self::SUCCESS;
        }

        $keep = collect();
        $remove = collect();

        foreach ($groups as $group) {
            [$keepRows, $removeRows] = $this->splitGroup($group);
            $keep = $keep->concat($keepRows);
            $remove = $remove->concat($removeRows);
        }

        $this->info('Duplicate members: '.$groups->count());
        $this->info('Will keep: '.$keep->count());
        $this->info('Will remove: '.$remove->count());
        $this->table(
            ['Status', 'Count'],
            $remove->countBy(fn (LoanApplication $loan) => $loan->status)
                ->map(fn (int $count, string $status) => [$status, $count])
                ->values()
                ->all()
        );

        if ($remove->contains(fn (LoanApplication $loan) => $loan->status === LoanApplication::STATUS_DISBURSED)) {
            $this->error('Safety check failed: disbursed loan was selected for delete.');

            return self::FAILURE;
        }

        if ($this->option('dry-run')) {
            $this->warn('Dry-run — nothing deleted. Real run: php artisan loans:remove-duplicate-forms --force');

            return self::SUCCESS;
        }

        if (! $this->option('force') && ! $this->confirm('Soft-delete these extra forms? Disbursed loans will be kept.', false)) {
            $this->warn('Cancelled.');

            return self::SUCCESS;
        }

        $ids = $remove->pluck('id')->map(fn ($id) => (int) $id)->all();

        $deleted = DB::transaction(function () use ($ids) {
            return LoanApplication::query()
                ->whereIn('id', $ids)
                ->where('status', '!=', LoanApplication::STATUS_DISBURSED)
                ->delete();
        });

        $this->info("Soft-deleted {$deleted} extra loan form(s).");

        return self::SUCCESS;
    }

    /**
     * @return Collection<string, Collection<int, LoanApplication>>
     */
    private function duplicateGroups(): Collection
    {
        $loans = LoanApplication::query()
            ->with(['memberAdmission:id,application_no,branch_id,applicant_name_bn'])
            ->whereNotNull('member_admission_id')
            ->whereNotIn('status', MemberAdmission::closedLoanFormStatuses())
            ->get();

        return $loans
            ->filter(fn (LoanApplication $loan) => filled($loan->memberAdmission?->application_no))
            ->groupBy(fn (LoanApplication $loan) => $loan->memberAdmission->application_no.'|'.$loan->memberAdmission->branch_id)
            ->filter(fn (Collection $group) => $group->count() > 1);
    }

    /**
     * @param  Collection<int, LoanApplication>  $group
     * @return array{0: Collection<int, LoanApplication>, 1: Collection<int, LoanApplication>}
     */
    private function splitGroup(Collection $group): array
    {
        $disbursed = $group->where('status', LoanApplication::STATUS_DISBURSED)->values();
        if ($disbursed->isNotEmpty()) {
            return [$disbursed, $group->where('status', '!=', LoanApplication::STATUS_DISBURSED)->values()];
        }

        $winner = $group
            ->sortByDesc(function (LoanApplication $loan) {
                $submitted = optional($loan->submitted_at)?->format('Y-m-d H:i:s.u') ?: '0000-00-00 00:00:00.000000';
                $created = optional($loan->created_at)?->format('Y-m-d H:i:s.u') ?: '0000-00-00 00:00:00.000000';

                return sprintf('%s|%s|%020d', $submitted, $created, (int) $loan->id);
            })
            ->first();

        return [
            collect([$winner]),
            $group->reject(fn (LoanApplication $loan) => (int) $loan->id === (int) $winner->id)->values(),
        ];
    }
}
