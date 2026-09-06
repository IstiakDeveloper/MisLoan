<?php

use App\Models\LoanApplication;
use App\Models\MemberAdmission;

it('returns the member admission application_no as member code', function () {
    $loan = new LoanApplication([
        'application_no' => 'LN20260900001',
    ]);
    $loan->setRelation('memberAdmission', new MemberAdmission([
        'application_no' => '0001000065',
    ]));

    expect($loan->memberCode())->toBe('0001000065');
});

it('falls back to the legacy snapshot member code', function () {
    $loan = new LoanApplication([
        'application_no' => 'LN20260900002',
        'legacy_member_snapshot' => [
            'application_no' => '0001000099',
        ],
    ]);

    expect($loan->memberCode())->toBe('0001000099');
});

it('does not use the loan application number as member code', function () {
    $loan = new LoanApplication([
        'application_no' => 'LN20260900003',
    ]);

    expect($loan->memberCode())->toBeNull();
});

it('allows an approved amount change only after approval and not while one is pending', function () {
    $loan = new LoanApplication([
        'status' => LoanApplication::STATUS_PENDING_DISBURSEMENT,
        'approved_amount' => 15000,
    ]);
    expect($loan->canRequestApprovedAmountChange())->toBeTrue();

    $loan->status = LoanApplication::STATUS_APPROVED;
    expect($loan->canRequestApprovedAmountChange())->toBeTrue();

    $loan->status = LoanApplication::STATUS_PENDING_AMOUNT_APPROVAL;
    $loan->pending_approved_amount = 12000;
    expect($loan->canRequestApprovedAmountChange())->toBeFalse()
        ->and($loan->hasPendingAmountChange())->toBeTrue();

    $loan->status = LoanApplication::STATUS_SUBMITTED;
    $loan->pending_approved_amount = null;
    expect($loan->canRequestApprovedAmountChange())->toBeFalse();
});
