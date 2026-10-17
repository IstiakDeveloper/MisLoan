<?php

use App\Models\LoanApplication;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

beforeEach(function () {
    Schema::dropIfExists('loan_applications');

    Schema::create('loan_applications', function (Blueprint $table) {
        $table->id();
        $table->string('application_no')->nullable();
        $table->unsignedBigInteger('loan_product_id')->nullable();
        $table->string('status')->default('draft');
        $table->integer('loan_term_months')->nullable();
        $table->timestamp('disbursed_at')->nullable();
        $table->json('loan_agreement_data')->nullable();
        $table->json('business_plan')->nullable();
        $table->timestamps();
        $table->softDeletes();
    });
});

it('rewrites end dates from the disbursement date already stored on the forms', function () {
    $loan = LoanApplication::create([
        'application_no' => 'LN-OLD-1',
        'status' => LoanApplication::STATUS_DISBURSED,
        'loan_term_months' => 12,
        'disbursed_at' => '2026-10-17 15:30:00',
        'loan_agreement_data' => [
            'disbursement_date' => '2026-10-17',
            'last_installment_date' => '2027-10-17',
            'loan_amount' => 15000,
        ],
        'business_plan' => [
            'loan_disbursement_date' => '2026-10-17',
            'disbursement_date' => '2026-10-17',
            'loan_repayment_date' => '2027-10-17',
            'repayment_date' => '2027-10-17',
            'loan_approval_date' => '2026-10-01',
        ],
    ]);

    $this->artisan('loans:fix-tenure-end-dates', ['--force' => true])
        ->expectsOutputToContain('Updated: 1')
        ->assertSuccessful();

    $loan->refresh();

    expect($loan->loan_agreement_data['disbursement_date'])->toBe('2026-10-17')
        ->and($loan->loan_agreement_data['last_installment_date'])->toBe('2027-10-16')
        ->and($loan->loan_agreement_data['loan_amount'])->toBe(15000)
        ->and($loan->business_plan['loan_disbursement_date'])->toBe('2026-10-17')
        ->and($loan->business_plan['loan_repayment_date'])->toBe('2027-10-16')
        ->and($loan->business_plan['repayment_date'])->toBe('2027-10-16')
        ->and($loan->business_plan['loan_approval_date'])->toBe('2026-10-01');
});

it('uses disbursed_at when a saved form has no disbursement date of its own', function () {
    $loan = LoanApplication::create([
        'application_no' => 'LN-OLD-2',
        'status' => LoanApplication::STATUS_DISBURSED,
        'loan_term_months' => 6,
        'disbursed_at' => '2026-08-20 09:00:00',
        'loan_agreement_data' => [
            'loan_amount' => 8000,
            'last_installment_date' => '2027-02-20',
        ],
        'business_plan' => [
            'loan_repayment_date' => '2027-02-20',
        ],
    ]);

    $this->artisan('loans:fix-tenure-end-dates', ['--force' => true])
        ->assertSuccessful();

    $loan->refresh();

    expect($loan->loan_agreement_data['last_installment_date'])->toBe('2027-02-19')
        ->and($loan->loan_agreement_data['disbursement_date'] ?? null)->toBeNull()
        ->and($loan->business_plan['loan_repayment_date'])->toBe('2027-02-19')
        ->and($loan->business_plan['repayment_date'])->toBe('2027-02-19');
});

it('does not save during a dry run and leaves correct dates alone', function () {
    $correct = LoanApplication::create([
        'application_no' => 'LN-OK',
        'status' => LoanApplication::STATUS_DISBURSED,
        'loan_term_months' => 12,
        'disbursed_at' => '2026-10-17 10:00:00',
        'loan_agreement_data' => [
            'disbursement_date' => '2026-10-17',
            'last_installment_date' => '2027-10-16',
        ],
        'business_plan' => [
            'disbursement_date' => '2026-10-17',
            'loan_repayment_date' => '2027-10-16',
            'repayment_date' => '2027-10-16',
        ],
    ]);
    $pending = LoanApplication::create([
        'application_no' => 'LN-WRONG',
        'status' => LoanApplication::STATUS_PENDING_DISBURSEMENT,
        'loan_term_months' => 12,
        'loan_agreement_data' => [
            'disbursement_date' => '2026-09-15',
            'last_installment_date' => '2027-09-15',
        ],
    ]);

    $this->artisan('loans:fix-tenure-end-dates', ['--dry-run' => true])
        ->expectsOutputToContain('Would update: 1')
        ->expectsOutputToContain('Already correct: 1')
        ->expectsOutputToContain('Dry-run — nothing saved.')
        ->assertSuccessful();

    expect($correct->fresh()->loan_agreement_data['last_installment_date'])->toBe('2027-10-16')
        ->and($pending->fresh()->loan_agreement_data['last_installment_date'])->toBe('2027-09-15');
});

it('skips a loan that has no disbursement date', function () {
    $loan = LoanApplication::create([
        'application_no' => 'LN-NONE',
        'status' => LoanApplication::STATUS_DRAFT,
        'loan_term_months' => 12,
        'loan_agreement_data' => [
            'loan_amount' => 5000,
            'last_installment_date' => '2027-01-01',
        ],
    ]);

    $this->artisan('loans:fix-tenure-end-dates', ['--force' => true])
        ->expectsOutputToContain('Skipped (no disbursement date): 1')
        ->expectsOutputToContain('To update: 0')
        ->assertSuccessful();

    expect($loan->fresh()->loan_agreement_data['last_installment_date'])->toBe('2027-01-01');
});
