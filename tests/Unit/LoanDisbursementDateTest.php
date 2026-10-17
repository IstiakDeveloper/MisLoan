<?php

use App\Models\Branch;
use App\Models\LoanApplication;
use App\Models\LoanProduct;
use App\Models\MemberAdmission;
use App\Models\Notification;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

function createDisbursementDateTables(): void
{
    Schema::dropIfExists('notifications');
    Schema::dropIfExists('settings');
    Schema::dropIfExists('member_admission_approvals');
    Schema::dropIfExists('loan_application_approvals');
    Schema::dropIfExists('loan_application_issues');
    Schema::dropIfExists('member_admission_issues');
    Schema::dropIfExists('loan_applications');
    Schema::dropIfExists('loan_products');
    Schema::dropIfExists('member_admissions');
    Schema::dropIfExists('user_zones');
    Schema::dropIfExists('user_areas');
    Schema::dropIfExists('user_branches');
    Schema::dropIfExists('users');
    Schema::dropIfExists('roles');
    Schema::dropIfExists('branches');

    Schema::create('branches', function (Blueprint $table) {
        $table->id();
        $table->string('name')->default('Test Branch');
        $table->string('code')->nullable();
        $table->unsignedBigInteger('area_id')->nullable();
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('roles', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->string('display_name')->nullable();
        $table->text('description')->nullable();
        $table->text('permissions')->nullable();
        $table->timestamps();
    });

    Schema::create('users', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->string('email')->unique();
        $table->string('username')->nullable();
        $table->string('password')->default('secret');
        $table->unsignedBigInteger('role_id')->nullable();
        $table->unsignedBigInteger('branch_id')->nullable();
        $table->unsignedBigInteger('area_id')->nullable();
        $table->unsignedBigInteger('zone_id')->nullable();
        $table->boolean('is_active')->default(true);
        $table->boolean('has_all_access')->default(false);
        $table->string('account_type')->nullable();
        $table->string('signature')->nullable();
        $table->string('pin')->nullable();
        $table->string('phone')->nullable();
        $table->string('profile_photo')->nullable();
        $table->timestamp('email_verified_at')->nullable();
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('user_branches', function (Blueprint $table) {
        $table->unsignedBigInteger('user_id');
        $table->unsignedBigInteger('branch_id');
    });

    Schema::create('user_areas', function (Blueprint $table) {
        $table->unsignedBigInteger('user_id');
        $table->unsignedBigInteger('area_id');
    });

    Schema::create('user_zones', function (Blueprint $table) {
        $table->unsignedBigInteger('user_id');
        $table->unsignedBigInteger('zone_id');
    });

    Schema::create('member_admissions', function (Blueprint $table) {
        $table->id();
        $table->string('application_no')->nullable();
        $table->string('applicant_name_bn')->nullable();
        $table->unsignedBigInteger('branch_id')->nullable();
        $table->unsignedBigInteger('assigned_officer_id')->nullable();
        $table->unsignedBigInteger('created_by')->nullable();
        $table->string('status')->default('approved');
        $table->timestamp('submitted_at')->nullable();
        $table->text('revision_comments')->nullable();
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('member_admission_issues', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('member_admission_id');
        $table->string('status')->default('pending');
        $table->text('resolution_note')->nullable();
        $table->dateTime('zm_approved_at')->nullable();
        $table->timestamps();
    });

    Schema::create('loan_products', function (Blueprint $table) {
        $table->id();
        $table->string('product_name')->nullable();
        $table->string('product_name_bn')->nullable();
        $table->string('product_code')->nullable();
        $table->string('main_product_code')->nullable();
        $table->string('installment_type')->default('monthly');
        $table->integer('duration_months')->default(12);
        $table->integer('number_of_installments')->default(12);
        $table->decimal('max_amount', 12, 2)->default(100000);
        $table->decimal('interest_rate', 8, 2)->default(0);
        $table->decimal('service_charge', 8, 2)->default(0);
        $table->decimal('service_charge_per_thousand', 8, 2)->default(0);
        $table->timestamps();
    });

    Schema::create('loan_applications', function (Blueprint $table) {
        $table->id();
        $table->string('application_no')->nullable();
        $table->unsignedBigInteger('member_admission_id')->nullable();
        $table->unsignedBigInteger('loan_product_id')->nullable();
        $table->unsignedBigInteger('loan_category_id')->nullable();
        $table->unsignedBigInteger('branch_id')->nullable();
        $table->unsignedBigInteger('submitted_by')->nullable();
        $table->string('status')->default('draft');
        $table->decimal('requested_amount', 12, 2)->nullable();
        $table->decimal('approved_amount', 12, 2)->nullable();
        $table->decimal('pending_approved_amount', 12, 2)->nullable();
        $table->decimal('disbursed_amount', 12, 2)->nullable();
        $table->decimal('installment_amount', 12, 2)->nullable();
        $table->integer('number_of_installments')->nullable();
        $table->integer('loan_term_months')->nullable();
        $table->timestamp('reviewed_at')->nullable();
        $table->timestamp('submitted_at')->nullable();
        $table->unsignedBigInteger('disbursed_by')->nullable();
        $table->timestamp('disbursed_at')->nullable();
        $table->string('disbursement_method')->nullable();
        $table->string('disbursement_reference')->nullable();
        $table->json('loan_agreement_data')->nullable();
        $table->json('guarantor_info')->nullable();
        $table->json('nominee_info')->nullable();
        $table->json('asset_info')->nullable();
        $table->json('business_plan')->nullable();
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('loan_application_issues', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('loan_application_id');
        $table->string('status')->default('pending');
        $table->text('response_message')->nullable();
        $table->dateTime('zm_approved_at')->nullable();
        $table->timestamps();
    });

    Schema::create('member_admission_approvals', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('member_admission_id')->nullable();
        $table->unsignedBigInteger('user_id')->nullable();
        $table->string('status')->default('pending');
        $table->timestamps();
    });

    Schema::create('loan_application_approvals', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('loan_application_id')->nullable();
        $table->unsignedBigInteger('user_id')->nullable();
        $table->string('status')->default('pending');
        $table->string('level')->nullable();
        $table->integer('sequence')->default(1);
        $table->text('comments')->nullable();
        $table->timestamp('approved_at')->nullable();
        $table->timestamps();
    });

    Schema::create('settings', function (Blueprint $table) {
        $table->id();
        $table->string('key')->unique();
        $table->text('value')->nullable();
        $table->timestamps();
    });

    Schema::create('notifications', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('user_id');
        $table->string('type')->nullable();
        $table->string('title')->nullable();
        $table->text('message')->nullable();
        $table->string('notifiable_type')->nullable();
        $table->unsignedBigInteger('notifiable_id')->nullable();
        $table->json('data')->nullable();
        $table->string('action_url')->nullable();
        $table->boolean('is_read')->default(false);
        $table->timestamp('read_at')->nullable();
        $table->boolean('is_sent_email')->default(false);
        $table->timestamp('email_sent_at')->nullable();
        $table->timestamps();
    });
}

/**
 * @return array{0: User, 1: Branch, 2: LoanApplication}
 */
function createPendingDisbursementLoan(): array
{
    $role = Role::create([
        'name' => Role::BRANCH_USER,
        'display_name' => 'Branch User',
    ]);

    $branch = Branch::create(['name' => 'Dhaka', 'code' => '0001']);

    $user = User::create([
        'name' => 'Branch User',
        'email' => 'branch-disburse-'.uniqid().'@test.com',
        'password' => Hash::make('password'),
        'role_id' => $role->id,
        'branch_id' => $branch->id,
        'has_all_access' => true,
        'is_active' => true,
        'email_verified_at' => now(),
    ]);

    $admission = MemberAdmission::create([
        'application_no' => 'ADM-'.uniqid(),
        'applicant_name_bn' => 'রহিমা',
        'branch_id' => $branch->id,
        'status' => 'approved',
    ]);

    $product = LoanProduct::create([
        'product_name' => 'Jagoron',
        'product_code' => 'JAG-'.uniqid(),
        'installment_type' => 'monthly',
        'duration_months' => 12,
        'number_of_installments' => 12,
        'max_amount' => 100000,
        'interest_rate' => 0,
    ]);

    $loan = LoanApplication::create([
        'application_no' => 'LN-DISB-'.uniqid(),
        'member_admission_id' => $admission->id,
        'loan_product_id' => $product->id,
        'branch_id' => $branch->id,
        'submitted_by' => $user->id,
        'status' => LoanApplication::STATUS_PENDING_DISBURSEMENT,
        'requested_amount' => 15000,
        'approved_amount' => 15000,
        'number_of_installments' => 12,
        'loan_term_months' => 12,
        'reviewed_at' => '2026-08-01 10:00:00',
        'loan_agreement_data' => [
            'disbursement_date' => '2026-01-01',
            'last_installment_date' => '2027-01-01',
            'loan_amount' => 15000,
        ],
        'guarantor_info' => [
            'loan_date' => '2026-01-01',
            'loan_amount' => 15000,
        ],
        'nominee_info' => [
            'date' => '2026-01-10',
            'loan_sanction_date' => '2026-01-01',
            'loan_amount_received' => 15000,
        ],
        'asset_info' => [
            'field_visit_date' => '2026-01-10',
            'loan_disbursement_date' => '2026-01-01',
            'current_loan_demand' => 15000,
        ],
        'business_plan' => [
            'loan_approval_date' => '2026-08-01',
            'loan_disbursement_date' => '2026-01-01',
            'disbursement_date' => '2026-01-01',
            'loan_repayment_date' => '2027-01-01',
        ],
    ]);

    return [$user, $branch, $loan];
}

beforeEach(function () {
    createDisbursementDateTables();
});

it('stamps the selected past disbursement date onto the loan and every form', function () {
    [$user, , $loan] = createPendingDisbursementLoan();

    $this->actingAs($user)
        ->from('/member/loan-applications/'.$loan->id)
        ->patch(route('member.loan-applications.disburse', $loan->id), [
            'disbursed_amount' => 15000,
            'disbursement_date' => '2026-09-15',
            'disbursement_method' => 'cash',
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    $loan->refresh();

    expect($loan->status)->toBe(LoanApplication::STATUS_DISBURSED)
        ->and($loan->disbursed_at?->toDateString())->toBe('2026-09-15')
        ->and($loan->loan_agreement_data['disbursement_date'])->toBe('2026-09-15')
        ->and($loan->loan_agreement_data['last_installment_date'])->toBe('2027-09-14')
        ->and($loan->guarantor_info['loan_date'])->toBe('2026-09-15')
        ->and($loan->nominee_info['loan_sanction_date'])->toBe('2026-09-15')
        ->and($loan->nominee_info['date'])->toBe('2026-01-10')
        ->and($loan->asset_info['loan_disbursement_date'])->toBe('2026-09-15')
        ->and($loan->asset_info['field_visit_date'])->toBe('2026-01-10')
        ->and($loan->business_plan['loan_disbursement_date'])->toBe('2026-09-15')
        ->and($loan->business_plan['disbursement_date'])->toBe('2026-09-15')
        ->and($loan->business_plan['loan_repayment_date'])->toBe('2027-09-14')
        ->and($loan->business_plan['loan_approval_date'])->toBe('2026-08-01');

    $notice = Notification::query()->first();
    expect($notice)->not->toBeNull()
        ->and($notice->data['details']['বিতরণের তারিখ'] ?? null)->toBe('2026-09-15');
});

it('rejects a future disbursement date and leaves the forms unchanged', function () {
    [$user, , $loan] = createPendingDisbursementLoan();

    $this->actingAs($user)
        ->from('/member/loan-applications/'.$loan->id)
        ->patch(route('member.loan-applications.disburse', $loan->id), [
            'disbursed_amount' => 15000,
            'disbursement_date' => now()->addDay()->toDateString(),
        ])
        ->assertRedirect()
        ->assertSessionHasErrors('disbursement_date');

    $loan->refresh();

    expect($loan->status)->toBe(LoanApplication::STATUS_PENDING_DISBURSEMENT)
        ->and($loan->disbursed_at)->toBeNull()
        ->and($loan->loan_agreement_data['disbursement_date'])->toBe('2026-01-01');
});

it('requires a disbursement date', function () {
    [$user, , $loan] = createPendingDisbursementLoan();

    $this->actingAs($user)
        ->from('/member/loan-applications/'.$loan->id)
        ->patch(route('member.loan-applications.disburse', $loan->id), [
            'disbursed_amount' => 15000,
        ])
        ->assertRedirect()
        ->assertSessionHasErrors('disbursement_date');

    expect($loan->fresh()->status)->toBe(LoanApplication::STATUS_PENDING_DISBURSEMENT);
});

it('ends the loan one day before the disbursement anniversary', function () {
    $yearly = new LoanApplication([
        'number_of_installments' => 46,
        'loan_term_months' => 12,
    ]);
    $yearlyProduct = new LoanProduct([
        'installment_type' => 'weekly',
        'duration_months' => 12,
        'number_of_installments' => 46,
        'product_name' => 'Weekly',
    ]);
    $yearly->setRelation('loanProduct', $yearlyProduct);
    $yearly->setRelation('loanCategory', null);
    $yearlyProduct->setRelation('loanCategory', null);

    $lump = new LoanApplication([
        'number_of_installments' => 1,
        'loan_term_months' => 6,
    ]);
    $lumpProduct = new LoanProduct([
        'installment_type' => 'lump_sum',
        'duration_months' => 6,
        'number_of_installments' => 1,
        'product_name' => 'Sufolon',
    ]);
    $lump->setRelation('loanProduct', $lumpProduct);
    $lump->setRelation('loanCategory', null);
    $lumpProduct->setRelation('loanCategory', null);

    expect($yearly->lastInstallmentDateFrom('2026-10-17'))->toBe('2027-10-16')
        ->and($yearly->repaymentDateFrom('2026-10-17'))->toBe('2027-10-16')
        ->and($lump->lastInstallmentDateFrom('2026-08-20'))->toBe('2027-02-19')
        ->and($lump->repaymentDateFrom('2026-08-20'))->toBe('2027-02-19');
});
