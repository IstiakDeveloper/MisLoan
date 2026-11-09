<?php

namespace App\Services\Loans;

use App\Models\LoanProduct;
use App\Services\Accounting\Money;
use Brick\Math\BigRational;
use Brick\Math\RoundingMode;
use Illuminate\Validation\ValidationException;

/** Existing product tariff pricing; annual reducing rates are not reinterpreted as flat rates. */
final class ProductLoanPricing
{
    public function quote(LoanProduct $product, string $amount, ?int $months = null): array
    {
        $principalPaisa = Money::toPaisa($amount);
        $principal = BigRational::of($amount);
        if ($principalPaisa <= 0) {
            throw ValidationException::withMessages(['amount' => 'Loan amount must be positive.']);
        }
        $months ??= (int) ($product->duration_months ?: 12);
        if ($months < 1 || $months > 600) {
            throw ValidationException::withMessages(['duration_months' => 'Duration must be between 1 and 600 months.']);
        }
        $lump = $this->isLumpSum($product);
        $count = $lump ? 1 : (int) ($product->number_of_installments ?: ($product->installment_type === 'weekly' ? 46 : $months));
        if ($count < 1 || $count > 2600) {
            throw ValidationException::withMessages(['product' => 'Invalid installment count.']);
        }
        $perThousand = BigRational::of($product->service_charge_per_thousand ?? '0');
        $rate = BigRational::of($product->interest_rate ?? $product->service_charge ?? '0');
        $interestFactor = BigRational::of($product->interest_installment_factor ?? '0');
        $principalFactor = BigRational::of($product->loan_installment_factor ?? '0');
        foreach ([$perThousand, $rate, $interestFactor, $principalFactor] as $factor) {
            if ($factor->isNegative()) {
                throw ValidationException::withMessages(['product' => 'Product rates cannot be negative.']);
            }
        }
        if ($perThousand->isPositive()) {
            $charge = $principal->multipliedBy($perThousand)->dividedBy(1000);
            $source = 'service_charge_per_thousand';
        } elseif ($rate->isPositive() && $product->interest_calculation_type === 'reducing') {
            // The annual reducing rate does not encode a flat total tariff.
            // Require the product's approved tariff/factors rather than inventing an amortization convention.
            if (! $interestFactor->isPositive()) {
                throw ValidationException::withMessages(['product' => 'This reducing product needs its approved service-charge tariff or installment factor.']);
            }
            $charge = $principal->multipliedBy($interestFactor)->multipliedBy($count);
            $source = 'interest_installment_factor';
        } elseif ($rate->isPositive()) {
            $charge = $principal->multipliedBy($rate)->dividedBy(100);
            if ($lump) {
                $charge = $charge->multipliedBy($months)->dividedBy(12);
            }
            $source = 'rate';
        } else {
            $charge = $principal->multipliedBy($interestFactor)->multipliedBy($count);
            $source = 'interest_installment_factor';
        }
        // Preserve existing application forms' whole-taka tariff rounding.
        $charge = $charge->toScale(0, RoundingMode::HALF_UP);
        $total = $principal->plus($charge);
        if ($count === 1) {
            $regular = $total->toScale(2, RoundingMode::UNNECESSARY);
        } elseif (BigRational::of($product->installment_amount_per_thousand ?? '0')->isPositive()) {
            $regular = $principal->multipliedBy($product->installment_amount_per_thousand)->dividedBy(1000)->toScale(0, RoundingMode::HALF_UP);
        } elseif ($principalFactor->isPositive() || $interestFactor->isPositive()) {
            $p = $principalFactor->isPositive() ? $principal->multipliedBy($principalFactor) : $principal->dividedBy($count);
            $i = $interestFactor->isPositive() ? $principal->multipliedBy($interestFactor) : BigRational::of($charge)->dividedBy($count);
            $regular = $p->plus($i)->toScale(0, RoundingMode::HALF_UP);
        } else {
            $regular = $total->dividedBy($count)->toScale(0, RoundingMode::CEILING);
        }
        $last = $total->minus($regular->multipliedBy($count - 1))->toScale(2, RoundingMode::UNNECESSARY);
        if (! $last->isPositive() || ! $regular->isPositive()) {
            throw ValidationException::withMessages(['product' => 'The product installment tariff exceeds the total repayable amount.']);
        }
        $configuredLast = BigRational::of($product->last_installment_per_thousand ?? '0');
        $configuredLast = $configuredLast->isPositive()
            ? $principal->multipliedBy($configuredLast)->dividedBy(1000)->toScale(0, RoundingMode::HALF_UP)->toScale(2)
            : null;
        $totalPaisa = Money::toPaisa((string) $total->toScale(2));

        return [
            'product_id' => $product->id,
            'calculation_method' => $product->interest_calculation_type,
            'pricing_source' => $source,
            'duration_months' => $months,
            'number_of_installments' => $count,
            'principal_paisa' => $principalPaisa,
            'service_charge_paisa' => Money::toPaisa((string) $charge->toScale(2)),
            'total_payable_paisa' => $totalPaisa,
            'installment_paisa' => Money::toPaisa((string) $regular->toScale(2)),
            'last_installment_paisa' => Money::toPaisa((string) $last),
            'configured_last_installment_paisa' => $configuredLast === null ? null : Money::toPaisa((string) $configuredLast),
            'last_installment_adjusted' => $configuredLast !== null && ! $configuredLast->isEqualTo($last),
            'product_snapshot' => array_intersect_key($product->getAttributes(), array_flip([
                'id', 'product_code', 'interest_calculation_type', 'duration_months', 'number_of_installments',
                'installment_type', 'service_charge_per_thousand', 'interest_rate', 'service_charge',
                'loan_installment_factor', 'interest_installment_factor', 'installment_amount_per_thousand', 'last_installment_per_thousand',
            ])),
        ];
    }

    private function isLumpSum(LoanProduct $product): bool
    {
        $type = strtolower((string) $product->installment_type);
        $code = strtoupper(trim((string) $product->product_code));
        $name = strtolower((string) $product->product_name.' '.(string) $product->product_name_bn);

        return str_contains($type, 'lump') || $code === 'SFL' || str_starts_with($code, '4.')
            || trim((string) $product->main_product_code) === '4'
            || str_contains($name, 'sufolon') || str_contains($name, 'সুফলন') || str_contains($name, 'শুফলন');
    }
}
