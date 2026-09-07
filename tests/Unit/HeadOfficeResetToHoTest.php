<?php

use App\Models\Branch;
use App\Models\LoanApplication;
use App\Models\MemberAdmission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

function createResetToHoTables(): void
{
    Schema::dropIfExists('notifications');
    Schema::dropIfExists('loan_application_approvals');
    Schema::dropIfExists('member_admission_approvals');
    Schema::dropIfExists('loan_application_issues');
    Schema::dropIfExists('loan_applications');
    Schema::dropIfExists('member_admission_issues');
    Schema::dropIfExists('member_admissions');
    Schema::dropIfExists('user_zones');
    Schema::dropIfExists('user_areas');
    Schema::dropIfExists('user_branches');
    Schema::dropIfExists('users');
    Schema::dropIfExists('roles');
    Schema::dropIfExists('branches');
    Schema::dropIfExists('areas');
    Schema::dropIfExists('zones');
    Schema::dropIfExists('settings');

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
        $table->string('name')->default('Main Branch');
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
        $table->timestamp('read_at')->nullable();
        $table->timestamps();
    });

    Schema::create('member_admissions', function (Blueprint $table) {
        $table->id();
        $table->string('application_no')->nullable();
        $table->string('applicant_name_en')->nullable();
        $table->string('applicant_name_bn')->nullable();
        $table->unsignedBigInteger('branch_id')->nullable();
        $table->unsignedBigInteger('created_by')->nullable();
        $table->unsignedBigInteger('submitted_by')->nullable();
        $table->unsignedBigInteger('reviewed_by')->nullable();
        $table->dateTime('reviewed_at')->nullable();
        $table->dateTime('submitted_at')->nullable();
        $table->string('status')->default('submitted');
        $table->text('rejection_reason')->nullable();
        $table->text('revision_comments')->nullable();
        $table->integer('revision_count')->default(0);
        $table->boolean('is_legacy')->default(false);
        $table->unsignedInteger('loan_dofa')->nullable();
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('member_admission_issues', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('member_admission_id');
        $table->unsignedBigInteger('reported_by');
        $table->text('issue_description');
        $table->string('status')->default('pending');
        $table->text('resolution_note')->nullable();
        $table->dateTime('zm_approved_at')->nullable();
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
        $table->string('status')->default('pending');
        $table->timestamps();
    });

    Schema::create('loan_applications', function (Blueprint $table) {
        $table->id();
        $table->string('application_no')->nullable();
        $table->unsignedBigInteger('member_admission_id')->nullable();
        $table->unsignedBigInteger('branch_id')->nullable();
        $table->unsignedBigInteger('submitted_by')->nullable();
        $table->unsignedBigInteger('reviewed_by')->nullable();
        $table->dateTime('reviewed_at')->nullable();
        $table->dateTime('submitted_at')->nullable();
        $table->string('status')->default('pending_head_office');
        $table->decimal('requested_amount', 12, 2)->default(0);
        $table->decimal('approved_amount', 12, 2)->nullable();
        $table->text('rejection_reason')->nullable();
        $table->text('revision_comments')->nullable();
        $table->json('business_plan')->nullable();
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('loan_application_issues', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('loan_application_id');
        $table->unsignedBigInteger('reported_by');
        $table->text('issue_description');
        $table->string('status')->default('pending');
        $table->text('response_message')->nullable();
        $table->unsignedBigInteger('responded_by')->nullable();
        $table->dateTime('responded_at')->nullable();
        $table->dateTime('zm_approved_at')->nullable();
        $table->unsignedBigInteger('zm_approved_by')->nullable();
        $table->text('zm_approval_note')->nullable();
        $table->timestamps();
    });
}

function createHoUser(string $roleName, string $email, bool $hasAllAccess = false): User
{
    $role = Role::firstOrCreate(
        ['name' => $roleName],
        ['display_name' => $roleName]
    );

    return User::create([
        'name' => $roleName.' User',
        'email' => $email,
        'password' => Hash::make('password'),
        'role_id' => $role->id,
        'is_active' => true,
        'has_all_access' => $hasAllAccess,
        'pin' => '1234',
        'signature' => 'signed',
        'email_verified_at' => now(),
    ]);
}

beforeEach(function () {
    createResetToHoTables();
});

it('lets a head office officer reset an approved member admission to pending_head_office', function () {
    $hoUser = createHoUser(Role::HEAD_OFFICE, 'ho_adm@test.com', true);
    $branch = Branch::create(['name' => 'Dhaka Branch', 'code' => '0001']);

    $admission = MemberAdmission::create([
        'application_no' => '0001000001',
        'branch_id' => $branch->id,
        'applicant_name_bn' => 'রহিমা খাতুন',
        'status' => 'approved',
        'reviewed_by' => $hoUser->id,
        'reviewed_at' => now(),
    ]);

    $this->actingAs($hoUser)
        ->patch("/head-office/admissions/{$admission->id}/reset-to-head-office")
        ->assertRedirect()
        ->assertSessionHas('success');

    $fresh = $admission->fresh();
    expect($fresh->status)->toBe('pending_head_office')
        ->and($fresh->reviewed_by)->toBeNull()
        ->and($fresh->reviewed_at)->toBeNull();
});

it('lets a cso user reset an approved member admission to pending_head_office', function () {
    $csoUser = createHoUser(Role::CSO, 'cso_adm@test.com', true);
    $branch = Branch::create(['name' => 'Khulna Branch', 'code' => '0002']);

    $admission = MemberAdmission::create([
        'application_no' => '0002000001',
        'branch_id' => $branch->id,
        'applicant_name_bn' => 'আকলিমা বেগম',
        'status' => 'approved',
        'reviewed_by' => $csoUser->id,
        'reviewed_at' => now(),
    ]);

    $this->actingAs($csoUser)
        ->patch("/head-office/admissions/{$admission->id}/reset-to-head-office")
        ->assertRedirect()
        ->assertSessionHas('success');

    $fresh = $admission->fresh();
    expect($fresh->status)->toBe('pending_head_office')
        ->and($fresh->reviewed_by)->toBeNull()
        ->and($fresh->reviewed_at)->toBeNull();
});

it('lets a head office officer reset an approved loan application to pending_head_office', function () {
    $hoUser = createHoUser(Role::HEAD_OFFICE, 'ho_loan@test.com', true);
    $branch = Branch::create(['name' => 'Dhaka Branch', 'code' => '0001']);

    $loan = LoanApplication::create([
        'application_no' => 'LA-0001',
        'branch_id' => $branch->id,
        'status' => LoanApplication::STATUS_PENDING_DISBURSEMENT,
        'requested_amount' => 50000,
        'approved_amount' => 50000,
        'reviewed_by' => $hoUser->id,
        'reviewed_at' => now(),
    ]);

    $this->actingAs($hoUser)
        ->patch("/head-office/loans/{$loan->id}/reset-to-head-office")
        ->assertRedirect()
        ->assertSessionHas('success');

    $fresh = $loan->fresh();
    expect($fresh->status)->toBe(LoanApplication::STATUS_PENDING_HEAD_OFFICE)
        ->and($fresh->reviewed_by)->toBeNull()
        ->and($fresh->reviewed_at)->toBeNull();
});

it('lets a cso user reset an approved loan application to pending_head_office', function () {
    $csoUser = createHoUser(Role::CSO, 'cso_loan@test.com', true);
    $branch = Branch::create(['name' => 'Barisal Branch', 'code' => '0003']);

    $loan = LoanApplication::create([
        'application_no' => 'LA-0002',
        'branch_id' => $branch->id,
        'status' => LoanApplication::STATUS_PENDING_DISBURSEMENT,
        'requested_amount' => 40000,
        'approved_amount' => 40000,
        'reviewed_by' => $csoUser->id,
        'reviewed_at' => now(),
    ]);

    $this->actingAs($csoUser)
        ->patch("/head-office/loans/{$loan->id}/reset-to-head-office")
        ->assertRedirect()
        ->assertSessionHas('success');

    $fresh = $loan->fresh();
    expect($fresh->status)->toBe(LoanApplication::STATUS_PENDING_HEAD_OFFICE)
        ->and($fresh->reviewed_by)->toBeNull()
        ->and($fresh->reviewed_at)->toBeNull();
});

it('does not allow resetting disbursed loan applications to pending_head_office', function () {
    $hoUser = createHoUser(Role::HEAD_OFFICE, 'ho_disb@test.com', true);
    $branch = Branch::create(['name' => 'Dhaka Branch', 'code' => '0001']);

    $loan = LoanApplication::create([
        'application_no' => 'LA-DISB',
        'branch_id' => $branch->id,
        'status' => LoanApplication::STATUS_DISBURSED,
        'requested_amount' => 50000,
        'approved_amount' => 50000,
    ]);

    $this->actingAs($hoUser)
        ->patch("/head-office/loans/{$loan->id}/reset-to-head-office")
        ->assertRedirect()
        ->assertSessionHas('error');

    expect($loan->fresh()->status)->toBe(LoanApplication::STATUS_DISBURSED);
});

it('does not allow resetting draft member admission to pending_head_office', function () {
    $hoUser = createHoUser(Role::HEAD_OFFICE, 'ho_draft@test.com', true);
    $branch = Branch::create(['name' => 'Dhaka Branch', 'code' => '0001']);

    $admission = MemberAdmission::create([
        'application_no' => '0001000099',
        'branch_id' => $branch->id,
        'applicant_name_bn' => 'খসড়া সদস্য',
        'status' => 'draft',
    ]);

    $this->actingAs($hoUser)
        ->patch("/head-office/admissions/{$admission->id}/reset-to-head-office")
        ->assertRedirect()
        ->assertSessionHas('error');

    expect($admission->fresh()->status)->toBe('draft');
});
