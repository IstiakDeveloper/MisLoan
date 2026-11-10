<?php

namespace App\Services\Loans;

use App\Models\LoanApplication;
use App\Services\Accounting\Money;
use Illuminate\Validation\ValidationException;

/** Freeze one exact product quote when an approved application is disbursed. */
final class FinalLoanTerms
{
    public function __construct(private readonly ProductLoanPricing $pricing) {}

    public function quote(LoanApplication $loan, mixed $requestedAmount = null): array
    {
        $product = $loan->loanProduct;
        if (! $product || $product->is_active === false) {
            throw ValidationException::withMessages(['loan_product_id' => 'Select an active loan product before disbursement.']);
        }
        if ($loan->approved_amount === null) {
            throw ValidationException::withMessages(['approved_amount' => 'A final approved amount is required before disbursement.']);
        }
        try {
            $approved = Money::toPaisa((string) ($loan->approved_amount ?? $loan->requested_amount));
            $principal = Money::toPaisa((string) ($requestedAmount ?? $loan->approved_amount ?? $loan->requested_amount));
        } catch (\InvalidArgumentException) {
            throw ValidationException::withMessages(['disbursed_amount' => 'Enter an exact amount with at most two decimal places.']);
        }
        if ($principal <= 0 || $principal > $approved) {
            throw ValidationException::withMessages(['disbursed_amount' => 'Disbursement must be positive and cannot exceed the approved amount. Request reapproval to increase it.']);
        }
        foreach (['min_amount' => 'minimum', 'max_amount' => 'maximum'] as $field => $label) {
            $limit = $product->{$field};
            if ($limit !== null && (float) $limit > 0) {
                $bound = Money::toPaisa((string) $limit);
                if (($field === 'min_amount' && $principal < $bound) || ($field === 'max_amount' && $principal > $bound)) {
                    throw ValidationException::withMessages(['disbursed_amount' => 'The amount is outside the product '.$label.' limit.']);
                }
            }
        }
        $quote = $this->pricing->quote($product, Money::format($principal));
        $frequency = $quote['number_of_installments'] === 1 ? 'lump_sum' : (string) $product->installment_type;
        if (! in_array($frequency, ['weekly', 'monthly', 'lump_sum'], true)) {
            throw ValidationException::withMessages(['loan_product_id' => 'Configure a supported repayment frequency for this product.']);
        }

        return ['version' => 1, 'repayment_frequency' => $frequency, ...$quote];
    }
}
