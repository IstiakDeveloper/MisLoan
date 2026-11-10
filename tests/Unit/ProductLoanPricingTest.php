<?php

use App\Models\LoanApplication;
use App\Models\LoanProduct;
use App\Services\Loans\FinalLoanTerms;
use App\Services\Loans\ProductLoanPricing;
use Illuminate\Validation\ValidationException;

it('uses the approved reducing tariff rather than applying its annual rate as flat interest', function () {
    $product = new LoanProduct([
        'product_code' => '01.01', 'interest_calculation_type' => 'reducing', 'interest_rate' => '23.92',
        'service_charge_per_thousand' => '127', 'installment_type' => 'weekly', 'duration_months' => 12,
        'number_of_installments' => 46, 'installment_amount_per_thousand' => '25', 'last_installment_per_thousand' => '2',
    ]);
    expect($product->calculateEMI('50000'))->toBe(1250.0);
    $quote = app(ProductLoanPricing::class)->quote($product, '50000');
    expect($quote['principal_paisa'])->toBe(5_000_000)
        ->and($quote['service_charge_paisa'])->toBe(635_000)
        ->and($quote['installment_paisa'])->toBe(125_000)
        ->and($quote['last_installment_paisa'])->toBe(10_000)
        ->and($quote['last_installment_adjusted'])->toBeFalse()
        ->and($quote['pricing_source'])->toBe('service_charge_per_thousand');
    expect($quote['installment_paisa'] * 45 + $quote['last_installment_paisa'])->toBe($quote['total_payable_paisa']);
});

it('adjusts the final installment so rounded tariffs reconcile exactly', function () {
    $product = new LoanProduct([
        'service_charge_per_thousand' => '127', 'installment_type' => 'weekly', 'duration_months' => 12,
        'number_of_installments' => 46, 'installment_amount_per_thousand' => '25', 'last_installment_per_thousand' => '2',
    ]);
    $q = app(ProductLoanPricing::class)->quote($product, '10001');
    expect($q['installment_paisa'] * 45 + $q['last_installment_paisa'])->toBe($q['total_payable_paisa'])
        ->and($q['last_installment_adjusted'])->toBeTrue();
});

it('uses configured factors with exact decimal arithmetic', function () {
    $product = new LoanProduct([
        'interest_calculation_type' => 'reducing', 'interest_rate' => '24', 'duration_months' => 12,
        'number_of_installments' => 12, 'loan_installment_factor' => '0.08333333',
        'interest_installment_factor' => '0.01108333', 'installment_type' => 'monthly',
    ]);
    $q = app(ProductLoanPricing::class)->quote($product, '30000');
    expect($q['pricing_source'])->toBe('interest_installment_factor')
        ->and($q['service_charge_paisa'])->toBe(399_000)
        ->and($q['installment_paisa'])->toBe(283_200)
        ->and($q['last_installment_paisa'])->toBe(283_800);
});

it('does not invent a flat tariff for an annual reducing rate without product factors', function () {
    $product = new LoanProduct(['interest_calculation_type' => 'reducing', 'interest_rate' => '24', 'duration_months' => 12, 'number_of_installments' => 12]);
    expect(fn () => app(ProductLoanPricing::class)->quote($product, '30000'))->toThrow(ValidationException::class);
});

it('supports zero charge products and exact paisa principal', function () {
    $product = new LoanProduct(['duration_months' => 3, 'number_of_installments' => 3, 'installment_type' => 'monthly']);
    $q = app(ProductLoanPricing::class)->quote($product, '100.01');
    expect($q['service_charge_paisa'])->toBe(0)
        ->and($q['installment_paisa'])->toBe(3400)
        ->and($q['last_installment_paisa'])->toBe(3201);
});

it('rejects inconsistent tariffs instead of creating negative last installments', function () {
    $product = new LoanProduct(['duration_months' => 12, 'number_of_installments' => 12, 'installment_amount_per_thousand' => '500']);
    expect(fn () => app(ProductLoanPricing::class)->quote($product, '10000'))->toThrow(ValidationException::class);
});

it('uses the configured form tariffs for flat-labelled products without multiplying the rate by tenure again', function () {
    $product = new LoanProduct(['interest_calculation_type' => 'flat', 'interest_rate' => '26.60', 'duration_months' => 24, 'number_of_installments' => 24, 'installment_type' => 'monthly', 'loan_installment_factor' => '0.0418', 'interest_installment_factor' => '0.0112']);
    $q = app(ProductLoanPricing::class)->quote($product, '50000');
    expect($product->calculateEMI('50000'))->toBe(2650.0)
        ->and($q['service_charge_paisa'])->toBe(1_330_000)
        ->and($q['installment_paisa'] * 23 + $q['last_installment_paisa'])->toBe(6_330_000);
});

it('preserves the form principal factor and reconciles the final principal and charge separately', function () {
    $product = new LoanProduct(['installment_type' => 'weekly', 'duration_months' => 12, 'number_of_installments' => 46, 'service_charge_per_thousand' => '127', 'installment_amount_per_thousand' => '25', 'loan_installment_factor' => '0.0222', 'interest_installment_factor' => '0.0028']);
    $q = app(ProductLoanPricing::class)->quote($product, '50000');
    expect($q['installment_split'])->toBe(['regular_principal_paisa' => 111000, 'regular_charge_paisa' => 14000, 'last_principal_paisa' => 5000, 'last_charge_paisa' => 5000]);
});

it('uses the existing Sufolon form annual rate over the configured lump-sum tenure', function () {
    $product = new LoanProduct(['product_code' => '4.04', 'interest_calculation_type' => 'reducing', 'interest_rate' => '24', 'duration_months' => 6, 'number_of_installments' => 6, 'installment_type' => 'monthly']);
    $q = app(ProductLoanPricing::class)->quote($product, '50000');
    expect($q['number_of_installments'])->toBe(1)->and($q['service_charge_paisa'])->toBe(600000)->and($q['last_installment_paisa'])->toBe(5600000);
});

it('never produces a negative component split when a product only defines total dues', function () {
    $product = new LoanProduct(['installment_type' => 'weekly', 'number_of_installments' => 46, 'service_charge_per_thousand' => '127', 'installment_amount_per_thousand' => '25']);
    expect(app(ProductLoanPricing::class)->quote($product, '50000')['installment_split'])->toBeNull();
});

it('caps final disbursement at the approved amount and snapshots product terms', function () {
    $product = new LoanProduct(['id' => 5, 'is_active' => true, 'installment_type' => 'weekly', 'number_of_installments' => 46, 'service_charge_per_thousand' => '127', 'installment_amount_per_thousand' => '25']);
    $loan = new LoanApplication(['approved_amount' => '50000', 'requested_amount' => '60000']);
    $loan->setRelation('loanProduct', $product);
    $terms = app(FinalLoanTerms::class);
    $q = $terms->quote($loan);
    expect($q['repayment_frequency'])->toBe('weekly')->and($q['principal_paisa'])->toBe(5000000)->and($q['product_snapshot']['service_charge_per_thousand'])->toBe('127');
    expect(fn () => $terms->quote($loan, '50000.01'))->toThrow(ValidationException::class);
});
