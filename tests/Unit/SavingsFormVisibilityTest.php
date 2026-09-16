<?php

use App\Support\SavingsFormVisibility;

it('treats general and special savings as admission-only with no form', function () {
    $general = (object) ['category_code' => '21'];
    $special = (object) ['category_code' => '22'];

    expect(SavingsFormVisibility::isAdmissionOnly($general))->toBeTrue()
        ->and(SavingsFormVisibility::requiresApplicationForm($general))->toBeFalse()
        ->and(SavingsFormVisibility::isAdmissionOnly($special))->toBeTrue()
        ->and(SavingsFormVisibility::formType($special))->toBeNull();
});

it('uses the term savings paper form for monthly savings category 23', function () {
    $category = (object) ['category_code' => '23'];
    $product = (object) [
        'product_code' => '23.01',
        'savingsCategory' => $category,
    ];

    expect(SavingsFormVisibility::requiresApplicationForm($category))->toBeTrue()
        ->and(SavingsFormVisibility::formType($category, $product))->toBe(SavingsFormVisibility::FORM_TERM_SAVINGS)
        ->and(SavingsFormVisibility::isAdmissionOnly($category))->toBeFalse();
});

it('uses the profit savings paper form for every product in categories 24 and 25', function (string $categoryCode, string $productCode) {
    $category = (object) ['category_code' => $categoryCode];
    $product = (object) [
        'product_code' => $productCode,
        'savingsCategory' => $category,
    ];

    expect(SavingsFormVisibility::requiresApplicationForm($category))->toBeTrue()
        ->and(SavingsFormVisibility::formType($category, $product))->toBe(SavingsFormVisibility::FORM_PROFIT_SAVINGS)
        ->and(SavingsFormVisibility::formType(null, $product))->toBe(SavingsFormVisibility::FORM_PROFIT_SAVINGS)
        ->and(SavingsFormVisibility::isAdmissionOnly($category))->toBeFalse();
})->with([
    'mdbs' => ['24', '24.02'],
    'mstbs' => ['25', '25.03'],
]);

it('leaves an unknown category without a form', function () {
    $category = (object) ['category_code' => '26'];

    expect(SavingsFormVisibility::requiresApplicationForm($category))->toBeFalse()
        ->and(SavingsFormVisibility::formType($category))->toBeNull()
        ->and(SavingsFormVisibility::isAdmissionOnly($category))->toBeFalse();
});

it('resolves category code from a dotted product code when category is missing', function () {
    $product = (object) ['product_code' => '23.02'];

    expect(SavingsFormVisibility::categoryCode(null, $product))->toBe('23')
        ->and(SavingsFormVisibility::formType(null, $product))->toBe(SavingsFormVisibility::FORM_TERM_SAVINGS);
});

it('exposes frontend rules for the create modal', function () {
    $rules = SavingsFormVisibility::frontendRules();

    expect($rules['admission_only_codes'])->toBe(['21', '22'])
        ->and($rules['forms'])->toBe([
            '23' => SavingsFormVisibility::FORM_TERM_SAVINGS,
            '24' => SavingsFormVisibility::FORM_PROFIT_SAVINGS,
            '25' => SavingsFormVisibility::FORM_PROFIT_SAVINGS,
        ])
        ->and($rules['messages']['admission_only'])->toBe(SavingsFormVisibility::ADMISSION_ONLY_MESSAGE)
        ->and($rules['messages']['form_not_ready'])->toBe(SavingsFormVisibility::FORM_NOT_READY_MESSAGE);
});
