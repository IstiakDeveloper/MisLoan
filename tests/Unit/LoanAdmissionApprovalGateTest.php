<?php

use App\Models\Branch;
use App\Models\LoanApplication;
use App\Models\LoanProduct;
use App\Models\MemberAdmission;
use App\Models\Role;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

function createLoanAdmissionGateTables(): void
{
    Schema::dropIfExists('loan_application_approvals');
    Schema::dropIfExists('member_admission_approvals');
    Schema::dropIfExists('loan_application_issues');
    Schema::dropIfExists('member_admission_issues');
    Schema::dropIfExists('loan_applications');
    Schema::dropIfExists('loan_products');
    Schema::dropIfExists('member_admissions');
    Schema::dropIfExists('notifications');
    Schema::dropIfExists('settings');
    Schema::dropIfExists('user_zones');
    Schema::dropIfExists('user_areas');
    Schema::dropIfExists('user_branches');
    Schema::dropIfExists('users');
    Schema::dropIfExists('roles');
    Schema::dropIfExists('branches');
    Schema::dropIfExists('areas');
    Schema::dropIfExists('zones');

    Schema::create('zones', function (Blueprint $table) {
        $table->id();
        $table->string('name')->nullable();
        $table->string('code')->nullable();
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('areas', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('zone_id')->nullable();
        $table->string('name')->nullable();
        $table->string('code')->nullable();
        $table->timestamps();
        $table->softDeletes();
    });

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
        $table->text('data')->nullable();
        $table->string('action_url')->nullable();
        $table->boolean('is_read')->default(false);
        $table->boolean('is_sent_email')->default(false);
        $table->timestamp('read_at')->nullable();
        $table->timestamp('email_sent_at')->nullable();
        $table->timestamps();
    });

    Schema::create('loan_products', function (Blueprint $table) {
        $table->id();
        $table->string('product_name')->nullable();
        $table->string('installment_type')->nullable();
        $table->timestamps();
    });

    Schema::create('member_admissions', function (Blueprint $table) {
        $table->id();
        $table->string('application_no')->nullable();
        $table->string('applicant_name_bn')->nullable();
        $table->string('nid_number')->nullable();
        $table->string('mobile_number')->nullable();
        $table->unsignedBigInteger('branch_id')->nullable();
        $table->unsignedBigInteger('previous_admission_id')->nullable();
        $table->unsignedBigInteger('created_by')->nullable();
        $table->unsignedBigInteger('assigned_officer_id')->nullable();
        $table->unsignedBigInteger('submitted_by')->nullable();
        $table->unsignedBigInteger('reviewed_by')->nullable();
        $table->timestamp('submitted_at')->nullable();
        $table->timestamp('reviewed_at')->nullable();
        $table->boolean('is_legacy')->default(false);
        $table->unsignedInteger('loan_dofa')->nullable();
        $table->string('status')->default('draft');
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('member_admission_issues', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('member_admission_id');
        $table->unsignedBigInteger('reported_by');
        $table->text('issue_description')->nullable();
        $table->string('status')->default('pending');
        $table->timestamps();
    });

    Schema::create('loan_applications', function (Blueprint $table) {
        $table->id();
        $table->string('application_no')->nullable();
        $table->unsignedBigInteger('member_admission_id')->nullable();
        $table->unsignedBigInteger('loan_product_id')->nullable();
        $table->unsignedBigInteger('branch_id')->nullable();
        $table->unsignedBigInteger('submitted_by')->nullable();
        $table->string('status')->default('draft');
        $table->decimal('requested_amount', 12, 2)->nullable();
        $table->json('loan_agreement_data')->nullable();
        $table->json('business_plan')->nullable();
        $table->json('guarantor_info')->nullable();
        $table->json('nominee_info')->nullable();
        $table->json('asset_info')->nullable();
        $table->json('selected_approvers')->nullable();
        $table->timestamp('submitted_at')->nullable();
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('loan_application_issues', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('loan_application_id');
        $table->unsignedBigInteger('reported_by');
        $table->text('issue_description')->nullable();
        $table->string('status')->default('pending');
        $table->timestamps();
    });

    Schema::create('member_admission_approvals', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('member_admission_id');
        $table->unsignedBigInteger('user_id');
        $table->string('status')->default('pending');
        $table->string('level')->nullable();
        $table->timestamps();
    });

    Schema::create('loan_application_approvals', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('loan_application_id');
        $table->unsignedBigInteger('user_id');
        $table->string('level')->default('branch');
        $table->unsignedTinyInteger('sequence')->default(1);
        $table->string('status')->default('pending');
        $table->text('comments')->nullable();
        $table->timestamp('approved_at')->nullable();
        $table->string('approver_signature')->nullable();
        $table->timestamps();
    });
}

/**
 * @return array{fo: User, branchUser: User, branch: Branch, admission: MemberAdmission, product: LoanProduct}
 */
function createLoanAdmissionGateContext(string $admissionStatus = 'submitted'): array
{
    $foRole = Role::create(['name' => Role::FIELD_OFFICER, 'display_name' => 'Field Officer']);
    $buRole = Role::create(['name' => Role::BRANCH_USER, 'display_name' => 'Branch User']);
    $bmRole = Role::create(['name' => Role::BRANCH_MANAGER, 'display_name' => 'Branch Manager']);

    $branch = Branch::create(['name' => 'Dhaka', 'code' => '0001']);

    $fo = User::create([
        'name' => 'Field Officer',
        'email' => 'fo-admission-gate@test.com',
        'password' => Hash::make('password'),
        'role_id' => $foRole->id,
        'branch_id' => $branch->id,
        'has_all_access' => true,
        'is_active' => true,
        'pin' => '1234',
        'signature' => 'signed',
        'phone' => '01700000001',
        'email_verified_at' => now(),
    ]);

    $branchUser = User::create([
        'name' => 'Branch User',
        'email' => 'bu-admission-gate@test.com',
        'password' => Hash::make('password'),
        'role_id' => $buRole->id,
        'branch_id' => $branch->id,
        'has_all_access' => true,
        'is_active' => true,
        'pin' => '2345',
        'signature' => 'signed',
        'phone' => '01700000002',
        'email_verified_at' => now(),
    ]);

    User::create([
        'name' => 'Branch Manager',
        'email' => 'bm-admission-gate@test.com',
        'password' => Hash::make('password'),
        'role_id' => $bmRole->id,
        'branch_id' => $branch->id,
        'has_all_access' => true,
        'is_active' => true,
        'pin' => '3456',
        'signature' => 'signed',
        'phone' => '01700000003',
        'email_verified_at' => now(),
    ]);

    $admission = MemberAdmission::create([
        'application_no' => '0001008703',
        'applicant_name_bn' => 'রহিমা',
        'nid_number' => '1990123456789',
        'mobile_number' => '01711111111',
        'branch_id' => $branch->id,
        'created_by' => $fo->id,
        'assigned_officer_id' => $fo->id,
        'status' => $admissionStatus,
    ]);

    $product = LoanProduct::create([
        'product_name' => 'Weekly Loan',
        'installment_type' => 'weekly',
    ]);

    return [
        'fo' => $fo,
        'branchUser' => $branchUser,
        'branch' => $branch,
        'admission' => $admission,
        'product' => $product,
    ];
}

beforeEach(function () {
    Cache::flush();
    createLoanAdmissionGateTables();
});

afterEach(function () {
    Carbon::setTestNow();
});

it('does not allow head office send until a new member admission is approved', function () {
    $admission = new MemberAdmission([
        'status' => 'submitted',
        'is_legacy' => false,
        'loan_dofa' => 1,
    ]);

    expect($admission->allowsLoanHeadOfficeSend())->toBeFalse();
});

it('allows head office send for approved or repeat/legacy members', function () {
    expect((new MemberAdmission(['status' => 'approved']))->allowsLoanHeadOfficeSend())->toBeTrue()
        ->and((new MemberAdmission(['status' => 'submitted', 'is_legacy' => true]))->allowsLoanHeadOfficeSend())->toBeTrue()
        ->and((new MemberAdmission(['status' => 'draft', 'loan_dofa' => 2]))->allowsLoanHeadOfficeSend())->toBeTrue()
        ->and((new MemberAdmission(['status' => 'under_review', 'previous_admission_id' => 9]))->allowsLoanHeadOfficeSend())->toBeTrue();
});

it('lets a field officer submit a loan before member admission is approved', function () {
    $ctx = createLoanAdmissionGateContext('submitted');

    $loan = LoanApplication::create([
        'application_no' => 'LN-GATE-SUBMIT',
        'member_admission_id' => $ctx['admission']->id,
        'loan_product_id' => $ctx['product']->id,
        'branch_id' => $ctx['branch']->id,
        'submitted_by' => $ctx['fo']->id,
        'status' => LoanApplication::STATUS_DRAFT,
        'requested_amount' => 15000,
        'loan_agreement_data' => ['agreement_text' => 'weekly agreement filled'],
    ]);

    $this->actingAs($ctx['fo'])
        ->from('/member/loan-applications/'.$loan->id)
        ->patch(route('member.loan-applications.submit', $loan->id))
        ->assertRedirect()
        ->assertSessionHas('success');

    expect($loan->fresh()->status)->toBe(LoanApplication::STATUS_SUBMITTED)
        ->and($ctx['admission']->fresh()->status)->toBe('submitted');
});

it('blocks a branch user from sending a loan to head office before admission approval', function () {
    $ctx = createLoanAdmissionGateContext('submitted');

    $loan = LoanApplication::create([
        'application_no' => 'LN-GATE-HO-BLOCK',
        'member_admission_id' => $ctx['admission']->id,
        'loan_product_id' => $ctx['product']->id,
        'branch_id' => $ctx['branch']->id,
        'submitted_by' => $ctx['fo']->id,
        'status' => LoanApplication::STATUS_READY_FOR_HEAD_OFFICE,
        'requested_amount' => 15000,
    ]);

    $this->travelTo(Carbon::parse('2026-09-14 10:00:00', 'Asia/Dhaka'));

    $this->actingAs($ctx['branchUser'])
        ->from('/member/loan-applications')
        ->patch(route('member.loan-applications.send-to-head-office', $loan->id))
        ->assertRedirect()
        ->assertSessionHasErrors('error');

    expect($loan->fresh()->status)->toBe(LoanApplication::STATUS_READY_FOR_HEAD_OFFICE);
});

it('lets a branch user send a loan to head office after admission is approved', function () {
    $ctx = createLoanAdmissionGateContext('approved');

    $loan = LoanApplication::create([
        'application_no' => 'LN-GATE-HO-OK',
        'member_admission_id' => $ctx['admission']->id,
        'loan_product_id' => $ctx['product']->id,
        'branch_id' => $ctx['branch']->id,
        'submitted_by' => $ctx['fo']->id,
        'status' => LoanApplication::STATUS_READY_FOR_HEAD_OFFICE,
        'requested_amount' => 15000,
    ]);

    $this->travelTo(Carbon::parse('2026-09-14 10:00:00', 'Asia/Dhaka'));

    $this->actingAs($ctx['branchUser'])
        ->patch(route('member.loan-applications.send-to-head-office', $loan->id))
        ->assertRedirect()
        ->assertSessionHas('success');

    expect($loan->fresh()->status)->toBe(LoanApplication::STATUS_PENDING_HEAD_OFFICE);
});

it('blocks bulk head office send when selected loans still have unapproved admissions', function () {
    $ctx = createLoanAdmissionGateContext('under_review');

    $loan = LoanApplication::create([
        'application_no' => 'LN-GATE-HO-BULK',
        'member_admission_id' => $ctx['admission']->id,
        'loan_product_id' => $ctx['product']->id,
        'branch_id' => $ctx['branch']->id,
        'submitted_by' => $ctx['fo']->id,
        'status' => LoanApplication::STATUS_READY_FOR_HEAD_OFFICE,
        'requested_amount' => 15000,
    ]);

    $this->travelTo(Carbon::parse('2026-09-14 10:00:00', 'Asia/Dhaka'));

    $this->actingAs($ctx['branchUser'])
        ->from('/member/loan-applications')
        ->post(route('member.loan-applications.send-to-head-office-bulk'), [
            'ids' => [$loan->id],
        ])
        ->assertRedirect()
        ->assertSessionHasErrors('error');

    expect($loan->fresh()->status)->toBe(LoanApplication::STATUS_READY_FOR_HEAD_OFFICE);
});
