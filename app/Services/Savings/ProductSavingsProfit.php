<?php

namespace App\Services\Savings;

use Brick\Math\BigDecimal;
use Brick\Math\RoundingMode;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

/** Profit from the savings product and the same month-count rules as the savings calculator. */
final class ProductSavingsProfit
{
    /** Premature tiers from the savings calculator, annual basis points. */
    private const TIERS = [
        [144, 1200],
        [120, 1200],
        [84, 1000],
        [60, 900],
        [36, 700],
        [1, 600],
    ];

    public function duePaisa(object $account, string $date): int
    {
        $snapshot = json_decode($account->product_snapshot, true, 512, JSON_THROW_ON_ERROR);
        $months = $this->elapsedMonths($account->opened_on, $date);
        if ($months < 1) {
            return 0;
        }
        $deposit = $this->depositPaisa((int) $account->id, $date);
        if ($deposit <= 0) {
            return 0;
        }
        $earned = $this->earned(is_array($snapshot) ? $snapshot : [], $deposit, $months);

        return max(0, $earned - $this->postedProfit((int) $account->id, $date));
    }

    /** @param  array<string, mixed>  $snapshot */
    private function earned(array $snapshot, int $deposit, int $months): int
    {
        $target = (int) ($snapshot['duration_months'] ?? 0);
        $name = strtolower(trim((string) ($snapshot['product_name'] ?? '').' '.(string) ($snapshot['product_name_bn'] ?? '').' '.(string) ($snapshot['product_code'] ?? '')));
        $distribution = (string) ($snapshot['profit_distribution_type'] ?? 'maturity');
        $productBps = $this->bps($snapshot['interest_rate'] ?? 0);

        if (str_contains($name, 'double') || str_contains($name, 'দ্বিগুণ')) {
            if ($target > 0 && $months >= $target) {
                return $deposit;
            }

            return $this->simple($deposit, 900, $months);
        }
        if ($distribution === 'monthly' || str_contains($name, 'voluntary') || str_contains($name, 'স্বেচ্ছা')) {
            return $this->simple($deposit, $productBps, $months);
        }
        if ($target > 0 && $months >= $target) {
            return $this->simple($deposit, $productBps, $target);
        }
        $bps = 600;
        foreach (self::TIERS as [$minimum, $rate]) {
            if ($months >= $minimum) {
                $bps = $rate;
                break;
            }
        }

        return $this->simple($deposit, $bps, $months);
    }

    private function simple(int $deposit, int $bps, int $months): int
    {
        return intdiv($deposit * $bps * $months, 120000);
    }

    private function bps(mixed $rate): int
    {
        return (int) BigDecimal::of((string) ($rate === '' || $rate === null ? '0' : $rate))->multipliedBy(100)->toScale(0, RoundingMode::HALF_UP)->toInt();
    }

    private function elapsedMonths(string $openedOn, string $date): int
    {
        $opened = CarbonImmutable::createFromFormat('!Y-m-d', $openedOn);
        $asOf = CarbonImmutable::createFromFormat('!Y-m-d', $date);
        if (! $opened || ! $asOf) {
            return 0;
        }
        $months = ($asOf->year - $opened->year) * 12 + ($asOf->month - $opened->month);
        if ($asOf->day < $opened->day) {
            $months--;
        }

        return max(0, $months);
    }

    private function depositPaisa(int $accountId, string $date): int
    {
        return $this->component($accountId, $date, false);
    }

    private function postedProfit(int $accountId, string $date): int
    {
        return $this->component($accountId, $date, true);
    }

    private function component(int $accountId, string $date, bool $profit): int
    {
        $rows = DB::table('savings_transactions as movement')
            ->leftJoin('savings_transactions as original', 'original.id', '=', 'movement.reversal_of')
            ->where('movement.savings_account_id', $accountId)
            ->where('movement.business_date', '<=', $date)
            ->get(['movement.kind', 'movement.amount_paisa', 'original.kind as original_kind']);
        $total = 0;
        foreach ($rows as $row) {
            $kind = $row->kind === 'reversal' ? $row->original_kind : $row->kind;
            if (($kind === 'profit') === $profit) {
                $total += (int) $row->amount_paisa;
            }
        }

        return $total;
    }
}
