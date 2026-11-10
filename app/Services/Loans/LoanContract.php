<?php

namespace App\Services\Loans;

use App\Models\LoanApplication;
use App\Services\Accounting\Money;
use Brick\Math\BigDecimal;
use Brick\Math\RoundingMode;
use Carbon\CarbonImmutable;
use Illuminate\Validation\ValidationException;

/** Read the saved contract; never reprice a disbursed loan using today's product settings. */
final class LoanContract
{
    private function paisa(mixed $amount, string $field): int
    {
        if ($amount === null || $amount === '') {
            throw ValidationException::withMessages(['contract' => 'The saved contract is missing '.$field.'.']);
        }
        try {
            return Money::toPaisa((string) BigDecimal::of((string) $amount)->toScale(2, RoundingMode::UNNECESSARY));
        } catch (\Throwable) {
            throw ValidationException::withMessages(['contract' => 'The saved '.$field.' is not an exact, non-negative monetary amount.']);
        }
    }

    public function read(LoanApplication $loan): array
    {
        $agreement = is_array($loan->loan_agreement_data) ? $loan->loan_agreement_data : [];
        $plan = is_array($loan->business_plan) ? $loan->business_plan : [];
        $principal = $this->paisa($loan->disbursed_amount, 'disbursed principal');
        $charge = $this->paisa($agreement['service_charge'] ?? $plan['total_service_charge'] ?? null, 'total service charge');
        $regular = $this->paisa($agreement['installment_amount'] ?? $plan['installment_total'] ?? $loan->installment_amount, 'installment');
        $last = $this->paisa($agreement['last_installment_amount'] ?? $plan['last_installment_amount'] ?? null, 'last installment');
        $rawCount = $agreement['number_of_installments'] ?? $plan['number_of_installments'] ?? $loan->number_of_installments;
        $count = filter_var($rawCount, FILTER_VALIDATE_INT);
        if ($count === false) {
            throw ValidationException::withMessages(['contract' => 'The saved installment count must be an integer.']);
        }
        if ($principal <= 0 || $count < 1 || $count > 2600 || $regular <= 0 || $last <= 0 || $principal + $charge > Money::MAX_PAISA) {
            throw ValidationException::withMessages(['contract' => 'The saved contractual terms are invalid.']);
        }
        if ($regular * ($count - 1) + $last !== $principal + $charge) {
            throw ValidationException::withMessages(['contract' => 'The saved installments do not reconcile with principal plus service charge. Verify the signed contract before opening its financial ledger.']);
        }
        $frequency = $count === 1 ? 'lump_sum' : (string) $loan->repayment_frequency;
        if (! in_array($frequency, ['weekly', 'monthly', 'lump_sum'], true)) {
            throw ValidationException::withMessages(['contract' => 'The saved repayment frequency is missing.']);
        }
        if (! $loan->disbursed_at) {
            throw ValidationException::withMessages(['contract' => 'The original disbursement date is missing.']);
        }
        $pricing = $agreement['product_pricing'] ?? null;
        if ($pricing !== null) {
            $expected = ['principal_paisa' => $principal, 'service_charge_paisa' => $charge, 'installment_paisa' => $regular, 'last_installment_paisa' => $last, 'number_of_installments' => $count, 'repayment_frequency' => $frequency];
            foreach ($expected as $key => $value) {
                if (! is_array($pricing) || (string) ($pricing[$key] ?? '') !== (string) $value) {
                    throw ValidationException::withMessages(['contract' => 'The saved product pricing does not match the signed contractual terms.']);
                }
            }
            if (($split = $pricing['installment_split'] ?? null) !== null) {
                $keys = ['regular_principal_paisa', 'regular_charge_paisa', 'last_principal_paisa', 'last_charge_paisa'];
                foreach ($keys as $key) {
                    if (! isset($split[$key]) || filter_var($split[$key], FILTER_VALIDATE_INT) === false || $split[$key] < 0 || $split[$key] > Money::MAX_PAISA) {
                        throw ValidationException::withMessages(['contract' => 'The saved installment component split is invalid.']);
                    }
                }
                [$p, $c, $lp, $lc] = array_map(fn ($key) => (int) $split[$key], $keys);
                if ($p + $c !== $regular || $lp + $lc !== $last || $p * ($count - 1) + $lp !== $principal || $c * ($count - 1) + $lc !== $charge) {
                    throw ValidationException::withMessages(['contract' => 'The saved principal and charge split does not reconcile with the contract.']);
                }
            }
        }

        return [
            'principal_paisa' => $principal, 'charge_paisa' => $charge,
            'regular_paisa' => $regular, 'last_paisa' => $last,
            'count' => $count, 'frequency' => $frequency, 'disbursed_on' => $loan->disbursed_at->toDateString(),
            'agreement' => $agreement, 'business_plan' => $plan,
            'product' => $agreement['product_pricing']['product_snapshot'] ?? $loan->loanProduct?->getAttributes(),
            'pricing' => $pricing,
        ];
    }

    public function schedule(array $contract, string $firstDueDate): array
    {
        try {
            $first = CarbonImmutable::createFromFormat('!Y-m-d', $firstDueDate);
        } catch (\Throwable) {
            $first = null;
        }
        if (! $first || $first->format('Y-m-d') !== $firstDueDate || $firstDueDate < $contract['disbursed_on']) {
            throw ValidationException::withMessages(['first_due_date' => 'The first due date must be valid and cannot precede disbursement.']);
        }
        $rows = [];
        for ($i = 0; $i < $contract['count']; $i++) {
            $due = match ($contract['frequency']) {
                'weekly' => $first->addWeeks($i),
                'monthly' => $first->addMonthsNoOverflow($i),
                default => $first,
            };
            $rows[] = ['sequence' => $i + 1, 'due_on' => $due->toDateString(), 'due_paisa' => $i === $contract['count'] - 1 ? $contract['last_paisa'] : $contract['regular_paisa']];
        }

        return $rows;
    }
}
