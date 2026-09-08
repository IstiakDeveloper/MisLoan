<?php

use App\Models\LoanApplication;
use App\Models\MemberAdmission;
use App\Models\MemberOtherAsset;
use App\Services\MemberAdmissionLoanSyncService;
use Illuminate\Support\Collection;

it('maps admission cultivable and non-cultivable land as named family assets', function () {
    $member = new MemberAdmission([
        'application_no' => '0001000099',
        'applicant_name_bn' => 'মৌসুমি',
        'cultivable_land_amount' => 99,
        'cultivable_land_value' => 150000,
        'non_cultivable_land_amount' => 12.5,
        'non_cultivable_land_value' => 40000,
    ]);
    $member->setRelation('familyMembers', new Collection);
    $member->setRelation('otherAssets', new Collection([
        new MemberOtherAsset([
            'asset_description' => 'গরু',
            'estimated_value' => 50000,
        ]),
    ]));

    $loan = new LoanApplication([
        'business_plan' => [
            'member_code' => '0001000001',
            'family_assets' => [
                ['fixed_quantity' => '10', 'fixed_value' => '1'],
            ],
        ],
    ]);

    $changed = (new MemberAdmissionLoanSyncService)->overlayOnLoan($loan, $member);

    expect($changed)->toBeTrue();

    $assets = $loan->business_plan['family_assets'];
    expect($assets)->toHaveCount(2);
    expect($assets[0]['fixed_desc'])->toBe('আবাদী');
    expect($assets[0]['fixed_quantity'])->toBe('99');
    expect($assets[0]['from_admission'])->toBeTrue();
    expect($assets[0]['movable_desc'])->toBe('গরু');
    expect($assets[1]['fixed_desc'])->toBe('অনাবাদী');
    expect((float) $assets[1]['fixed_quantity'])->toBe(12.5);
    expect($assets[1]['from_admission'])->toBeTrue();
});

it('keeps extra family assets added on the loan form when admission land is refreshed', function () {
    $member = new MemberAdmission([
        'application_no' => '0001000099',
        'applicant_name_bn' => 'মৌসুমি',
        'cultivable_land_amount' => 99,
        'cultivable_land_value' => 150000,
        'non_cultivable_land_amount' => 20,
        'non_cultivable_land_value' => 50000,
    ]);
    $member->setRelation('familyMembers', new Collection);
    $member->setRelation('otherAssets', new Collection);

    $loan = new LoanApplication([
        'business_plan' => [
            'member_code' => '0001000001',
            'family_assets' => [
                [
                    'fixed_desc' => 'আবাদী',
                    'fixed_quantity' => '1',
                    'from_admission' => true,
                ],
                [
                    'fixed_desc' => 'দালান',
                    'fixed_value' => '20000',
                    'movable_desc' => 'মোটরসাইকেল',
                    'movable_value' => '80000',
                    'from_admission' => false,
                ],
            ],
        ],
    ]);

    $changed = (new MemberAdmissionLoanSyncService)->overlayOnLoan($loan, $member);

    expect($changed)->toBeTrue();

    $assets = $loan->business_plan['family_assets'];
    expect($assets)->toHaveCount(3);
    expect($assets[0]['fixed_desc'])->toBe('আবাদী');
    expect($assets[0]['fixed_quantity'])->toBe('99');
    expect($assets[1]['fixed_desc'])->toBe('অনাবাদী');
    expect($assets[1]['fixed_quantity'])->toBe('20');
    expect($assets[2])->toMatchArray([
        'fixed_desc' => 'দালান',
        'fixed_value' => '20000',
        'movable_desc' => 'মোটরসাইকেল',
        'movable_value' => '80000',
        'from_admission' => false,
    ]);
});
