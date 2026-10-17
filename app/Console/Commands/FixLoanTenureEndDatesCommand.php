<?php

namespace App\Console\Commands;

use App\Models\LoanApplication;
use Carbon\Carbon;
use Illuminate\Console\Command;

class FixLoanTenureEndDatesCommand extends Command
{
    protected $signature = 'loans:fix-tenure-end-dates
                            {--dry-run : Show what would change without saving}
                            {--force : Update without confirmation}';

    protected $description = 'Set last installment and repayment dates to one day before each loan\'s existing disbursement date anniversary';

    public function handle(): int
    {
        $preview = $this->scan(true);
        $checked = $preview['updated'] + $preview['unchanged'] + $preview['skipped'];

        $this->info('Checked loans with a disbursement date or saved form: '.$checked);
        $this->info(($this->option('dry-run') ? 'Would update: ' : 'To update: ').$preview['updated']);
        $this->info('Already correct: '.$preview['unchanged']);
        $this->info('Skipped (no disbursement date): '.$preview['skipped']);

        if ($this->option('dry-run')) {
            $this->warn('Dry-run — nothing saved. Real run: php artisan loans:fix-tenure-end-dates --force');

            return self::SUCCESS;
        }

        if ($preview['updated'] === 0) {
            $this->info('Nothing to update.');

            return self::SUCCESS;
        }

        if (! $this->option('force') && ! $this->confirm('Update these last installment and repayment dates?', false)) {
            $this->warn('Cancelled. No dates were saved.');

            return self::SUCCESS;
        }

        $saved = $this->scan(false);
        $this->info('Updated: '.$saved['updated']);

        return self::SUCCESS;
    }

    /**
     * @return array{updated: int, unchanged: int, skipped: int}
     */
    private function scan(bool $dryRun): array
    {
        $updated = 0;
        $unchanged = 0;
        $skipped = 0;

        LoanApplication::query()
            ->with('loanProduct')
            ->where(function ($query) {
                $query->whereNotNull('disbursed_at')
                    ->orWhereNotNull('loan_agreement_data')
                    ->orWhereNotNull('business_plan');
            })
            ->orderBy('id')
            ->chunkById(100, function ($loans) use ($dryRun, &$updated, &$unchanged, &$skipped) {
                foreach ($loans as $loan) {
                    $result = $this->syncLoan($loan, $dryRun);
                    if ($result === 'updated') {
                        $updated++;
                    } elseif ($result === 'unchanged') {
                        $unchanged++;
                    } else {
                        $skipped++;
                    }
                }
            });

        return [
            'updated' => $updated,
            'unchanged' => $unchanged,
            'skipped' => $skipped,
        ];
    }

    /**
     * @return 'updated'|'unchanged'|'skipped'
     */
    private function syncLoan(LoanApplication $loan, bool $dryRun): string
    {
        $agreement = is_array($loan->loan_agreement_data) ? $loan->loan_agreement_data : [];
        $plan = is_array($loan->business_plan) ? $loan->business_plan : [];
        $disbursedOn = $this->isoDate($loan->disbursed_at);

        $agreementSource = $this->isoDate($agreement['disbursement_date'] ?? null) ?? $disbursedOn;
        $planSource = $this->isoDate($plan['loan_disbursement_date'] ?? null)
            ?? $this->isoDate($plan['disbursement_date'] ?? null)
            ?? $disbursedOn;

        if ($agreementSource === null && $planSource === null) {
            return 'skipped';
        }

        $agreementChanged = false;
        if ($agreement !== [] && $agreementSource !== null) {
            $end = $loan->lastInstallmentDateFrom($agreementSource);
            if (($agreement['last_installment_date'] ?? null) !== $end) {
                $agreement['last_installment_date'] = $end;
                $agreementChanged = true;
            }
        }

        $planChanged = false;
        if ($plan !== [] && $planSource !== null) {
            $end = $loan->repaymentDateFrom($planSource);
            if (($plan['loan_repayment_date'] ?? null) !== $end) {
                $plan['loan_repayment_date'] = $end;
                $planChanged = true;
            }
            if (($plan['repayment_date'] ?? null) !== $end) {
                $plan['repayment_date'] = $end;
                $planChanged = true;
            }
        }

        if (! $agreementChanged && ! $planChanged) {
            return ($agreementSource !== null || $planSource !== null) && ($agreement !== [] || $plan !== [])
                ? 'unchanged'
                : 'skipped';
        }

        if (! $dryRun) {
            $changes = [];
            if ($agreementChanged) {
                $changes['loan_agreement_data'] = $agreement;
            }
            if ($planChanged) {
                $changes['business_plan'] = $plan;
            }
            $loan->update($changes);
        }

        return 'updated';
    }

    private function isoDate(mixed $value): ?string
    {
        if ($value instanceof \DateTimeInterface) {
            return Carbon::parse($value)->toDateString();
        }

        $text = trim((string) $value);
        if ($text === '') {
            return null;
        }

        if (preg_match('/^(\d{4})-(\d{2})-(\d{2})/', $text, $iso) === 1) {
            return $iso[1].'-'.$iso[2].'-'.$iso[3];
        }

        if (preg_match('/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/', $text, $local) === 1) {
            return $local[3].'-'.$local[2].'-'.$local[1];
        }

        try {
            return Carbon::parse($text)->toDateString();
        } catch (\Throwable) {
            return null;
        }
    }
}
