<?php

namespace App\Services\Loans;

use App\Models\Holiday;
use App\Models\LoanInstallment;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

class LoanScheduleService
{
    /**
     * Generate exact paisa installment schedule with holiday adjustment.
     *
     * @return array{total_service_charge_paisa: int, installments: array<int, array{installment_no: int, due_date: string, principal_due_paisa: int, service_charge_due_paisa: int}>}
     */
    public function generate(
        int $branchId,
        int $principalPaisa,
        float $annualRatePercent,
        int $installmentCount,
        string $pricingMethod,
        string $frequency,
        string $firstDueDate
    ): array {
        $count = max(1, $installmentCount);
        $holidays = Holiday::query()
            ->where('holiday_date', '>=', $firstDueDate)
            ->where(fn ($q) => $q->whereNull('branch_id')->orWhere('branch_id', $branchId))
            ->pluck('holiday_date')
            ->map(fn ($d) => is_string($d) ? $d : $d->toDateString())
            ->flip()
            ->all();

        $periodsPerYear = $frequency === 'monthly' ? 12 : 52;
        $periodRate = ($annualRatePercent / 100) / $periodsPerYear;

        $rows = [];
        $totalServiceCharge = 0;

        if ($pricingMethod === 'declining') {
            $basePrincipal = intdiv($principalPaisa, $count);
            $principalRem = $principalPaisa % $count;
            $remainingPrincipal = $principalPaisa;

            for ($i = 1; $i <= $count; $i++) {
                $pDue = $basePrincipal + ($i === $count ? $principalRem : 0);
                $scDue = (int) round($remainingPrincipal * $periodRate);
                $remainingPrincipal -= $pDue;
                $totalServiceCharge += $scDue;

                $rows[] = [
                    'installment_no' => $i,
                    'due_date' => $this->resolveWorkingDate($firstDueDate, $i - 1, $frequency, $holidays),
                    'principal_due_paisa' => $pDue,
                    'service_charge_due_paisa' => $scDue,
                ];
            }
        } else {
            // Flat rate over duration
            $totalServiceCharge = (int) round($principalPaisa * $periodRate * $count);
            $basePrincipal = intdiv($principalPaisa, $count);
            $principalRem = $principalPaisa % $count;
            $baseSc = intdiv($totalServiceCharge, $count);
            $scRem = $totalServiceCharge % $count;

            for ($i = 1; $i <= $count; $i++) {
                $rows[] = [
                    'installment_no' => $i,
                    'due_date' => $this->resolveWorkingDate($firstDueDate, $i - 1, $frequency, $holidays),
                    'principal_due_paisa' => $basePrincipal + ($i === $count ? $principalRem : 0),
                    'service_charge_due_paisa' => $baseSc + ($i === $count ? $scRem : 0),
                ];
            }
        }

        return [
            'total_service_charge_paisa' => $totalServiceCharge,
            'installments' => $rows,
        ];
    }

    /** @param array<string, int> $holidaySet */
    private function resolveWorkingDate(string $firstDueDate, int $offset, string $frequency, array $holidaySet): string
    {
        $base = CarbonImmutable::parse($firstDueDate);
        $date = $frequency === 'monthly'
            ? $base->addMonthsNoOverflow($offset)
            : $base->addWeeks($offset);

        for ($tries = 0; $tries < 14; $tries++) {
            $str = $date->toDateString();
            if (! isset($holidaySet[$str])) {
                return $str;
            }
            $date = $date->addDay();
        }

        return $date->toDateString();
    }

    /**
     * Shift any pending installments on a newly declared holiday to the next working date.
     */
    public function rescheduleForHoliday(string $holidayDate, ?int $branchId = null): int
    {
        return DB::transaction(function () use ($holidayDate, $branchId) {
            $installments = LoanInstallment::query()
                ->with('loanAccount:id,branch_id')
                ->where('due_date', $holidayDate)
                ->whereIn('status', [LoanInstallment::STATUS_PENDING, LoanInstallment::STATUS_PARTIAL])
                ->when($branchId !== null, fn ($q) => $q->whereHas('loanAccount', fn ($aq) => $aq->where('branch_id', $branchId)))
                ->get();

            if ($installments->isEmpty()) {
                return 0;
            }

            $holidaysByBranch = [];
            $updated = 0;

            foreach ($installments as $inst) {
                $bId = (int) ($inst->loanAccount?->branch_id ?? 0);
                if (! isset($holidaysByBranch[$bId])) {
                    $holidaysByBranch[$bId] = Holiday::query()
                        ->where('holiday_date', '>=', $holidayDate)
                        ->where(fn ($q) => $q->whereNull('branch_id')->orWhere('branch_id', $bId))
                        ->pluck('holiday_date')
                        ->map(fn ($d) => is_string($d) ? $d : $d->toDateString())
                        ->flip()
                        ->all();
                }

                $nextDate = CarbonImmutable::parse($holidayDate)->addDay();
                for ($tries = 0; $tries < 14; $tries++) {
                    $str = $nextDate->toDateString();
                    if (! isset($holidaysByBranch[$bId][$str])) {
                        break;
                    }
                    $nextDate = $nextDate->addDay();
                }

                $inst->update(['due_date' => $nextDate->toDateString()]);
                $updated++;
            }

            return $updated;
        });
    }
}
