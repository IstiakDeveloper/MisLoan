<?php

use App\Models\Area;
use App\Models\Branch;
use App\Models\CsoDailyAllocation;
use App\Models\LoanApplication;
use App\Models\MemberAdmission;
use App\Models\Role;
use App\Models\User;
use App\Models\Zone;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

function createCsoApproveAllScopeTables(): void
{
    Schema::dropIfExists('notifications');
    Schema::dropIfExists('cso_daily_allocations');
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
        $table->boolean('is_active')->default(true);
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('areas', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('zone_id')->nullable();
        $table->string('name')->nullable();
        $table->string('code')->nullable();
        $table->boolean('is_active')->default(true);
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('branches', function (Blueprint $table) {
        $table->id();
        $table->string('name')->default('Main Branch');
        $table->string('code')->nullable();
        $table->unsignedBigInteger('area_id')->nullable();
        $table->boolean('is_active')->default(true);
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
        $table->timestamp('email_verified_at')->nullable();
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('user_branches', function (Blueprint $table) {
        $table->unsignedBigInteger('user_id');
        $table->unsignedBigInteger('branch_id');
        $table->timestamps();
    });

    Schema::create('user_areas', function (Blueprint $table) {
        $table->unsignedBigInteger('user_id');
        $table->unsignedBigInteger('area_id');
    });

    Schema::create('user_zones', function (Blueprint $table) {
        $table->unsignedBigInteger('user_id');
        $table->unsignedBigInteger('zone_id');
    });

    Schema::create('cso_daily_allocations', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('user_id');
        $table->unsignedBigInteger('area_id');
        $table->date('duty_date');
        $table->unsignedBigInteger('assigned_by')->nullable();
        $table->string('notes')->nullable();
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
        $table->text('data')->nullable();
        $table->string('action_url')->nullable();
        $table->boolean('is_read')->default(false);
        $table->boolean('is_sent_email')->default(false);
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
        $table->dateTime('resolved_at')->nullable();
        $table->unsignedBigInteger('resolved_by')->nullable();
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
        $table->unsignedBigInteger('loan_product_id')->nullable();
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

function createCsoApproveAllScopeUser(string $roleName, string $email, bool $hasAllAccess = false): User
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

function createCsoApproveAllScopeOrg(): array
{
    $zone = Zone::create([
        'name' => 'Test Zone',
        'code' => 'TZ01',
        'is_active' => true,
    ]);

    $ownArea = Area::create([
        'zone_id' => $zone->id,
        'name' => 'Assigned Area',
        'code' => 'AA01',
        'is_active' => true,
    ]);

    $otherArea = Area::create([
        'zone_id' => $zone->id,
        'name' => 'Other CSO Area',
        'code' => 'OA01',
        'is_active' => true,
    ]);

    $ownBranch = Branch::create([
        'area_id' => $ownArea->id,
        'name' => 'Assigned Branch',
        'code' => 'BR01',
        'is_active' => true,
    ]);

    $otherBranch = Branch::create([
        'area_id' => $otherArea->id,
        'name' => 'Other Branch',
        'code' => 'BR02',
        'is_active' => true,
    ]);

    return compact('zone', 'ownArea', 'otherArea', 'ownBranch', 'otherBranch');
}

beforeEach(function () {
    createCsoApproveAllScopeTables();
});

it('does not let a cso approve-all loans from another cso assigned area', function () {
    $org = createCsoApproveAllScopeOrg();
    $cso = createCsoApproveAllScopeUser(Role::CSO, 'cso-loan-scope@test.com');

    CsoDailyAllocation::create([
        'user_id' => $cso->id,
        'area_id' => $org['ownArea']->id,
        'duty_date' => now()->toDateString(),
    ]);

    $ownLoan = LoanApplication::create([
        'application_no' => 'LN-OWN-001',
        'branch_id' => $org['ownBranch']->id,
        'status' => LoanApplication::STATUS_PENDING_HEAD_OFFICE,
        'requested_amount' => 10000,
        'submitted_at' => now(),
    ]);

    $otherLoan = LoanApplication::create([
        'application_no' => 'LN-OTHER-001',
        'branch_id' => $org['otherBranch']->id,
        'status' => LoanApplication::STATUS_PENDING_HEAD_OFFICE,
        'requested_amount' => 20000,
        'submitted_at' => now(),
    ]);

    $this->actingAs($cso)
        ->post('/head-office/loans/approve-all', [
            'date_from' => now()->toDateString(),
            'date_to' => now()->toDateString(),
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    expect($ownLoan->fresh()->status)->toBe(LoanApplication::STATUS_PENDING_DISBURSEMENT)
        ->and($otherLoan->fresh()->status)->toBe(LoanApplication::STATUS_PENDING_HEAD_OFFICE);
});

it('does not let a cso bulk-approve a loan from another cso assigned area', function () {
    $org = createCsoApproveAllScopeOrg();
    $cso = createCsoApproveAllScopeUser(Role::CSO, 'cso-loan-bulk@test.com');

    CsoDailyAllocation::create([
        'user_id' => $cso->id,
        'area_id' => $org['ownArea']->id,
        'duty_date' => now()->toDateString(),
    ]);

    $ownLoan = LoanApplication::create([
        'application_no' => 'LN-OWN-002',
        'branch_id' => $org['ownBranch']->id,
        'status' => LoanApplication::STATUS_PENDING_HEAD_OFFICE,
        'requested_amount' => 10000,
        'submitted_at' => now(),
    ]);

    $otherLoan = LoanApplication::create([
        'application_no' => 'LN-OTHER-002',
        'branch_id' => $org['otherBranch']->id,
        'status' => LoanApplication::STATUS_PENDING_HEAD_OFFICE,
        'requested_amount' => 20000,
        'submitted_at' => now(),
    ]);

    $this->actingAs($cso)
        ->post('/head-office/loans/approve-bulk', [
            'ids' => [$ownLoan->id, $otherLoan->id],
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    expect($ownLoan->fresh()->status)->toBe(LoanApplication::STATUS_PENDING_DISBURSEMENT)
        ->and($otherLoan->fresh()->status)->toBe(LoanApplication::STATUS_PENDING_HEAD_OFFICE);
});

it('still lets head office approve-all loans across every area', function () {
    $org = createCsoApproveAllScopeOrg();
    $ho = createCsoApproveAllScopeUser(Role::HEAD_OFFICE, 'ho-loan-all@test.com');

    $ownLoan = LoanApplication::create([
        'application_no' => 'LN-HO-OWN-001',
        'branch_id' => $org['ownBranch']->id,
        'status' => LoanApplication::STATUS_PENDING_HEAD_OFFICE,
        'requested_amount' => 10000,
        'submitted_at' => now(),
    ]);

    $otherLoan = LoanApplication::create([
        'application_no' => 'LN-HO-OTHER-001',
        'branch_id' => $org['otherBranch']->id,
        'status' => LoanApplication::STATUS_PENDING_HEAD_OFFICE,
        'requested_amount' => 20000,
        'submitted_at' => now(),
    ]);

    $this->actingAs($ho)
        ->post('/head-office/loans/approve-all', [
            'date_from' => now()->toDateString(),
            'date_to' => now()->toDateString(),
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    expect($ownLoan->fresh()->status)->toBe(LoanApplication::STATUS_PENDING_DISBURSEMENT)
        ->and($otherLoan->fresh()->status)->toBe(LoanApplication::STATUS_PENDING_DISBURSEMENT);
});

it('does not let a cso approve-all admissions from another cso assigned area', function () {
    $org = createCsoApproveAllScopeOrg();
    $cso = createCsoApproveAllScopeUser(Role::CSO, 'cso-adm-scope@test.com');

    CsoDailyAllocation::create([
        'user_id' => $cso->id,
        'area_id' => $org['ownArea']->id,
        'duty_date' => now()->toDateString(),
    ]);

    $ownAdmission = MemberAdmission::create([
        'application_no' => 'AD-OWN-001',
        'branch_id' => $org['ownBranch']->id,
        'applicant_name_bn' => 'নিজ এলাকার সদস্য',
        'status' => 'pending_head_office',
        'submitted_at' => now(),
    ]);

    $otherAdmission = MemberAdmission::create([
        'application_no' => 'AD-OTHER-001',
        'branch_id' => $org['otherBranch']->id,
        'applicant_name_bn' => 'অন্য এলাকার সদস্য',
        'status' => 'pending_head_office',
        'submitted_at' => now(),
    ]);

    $this->actingAs($cso)
        ->post('/head-office/admissions/approve-all', [
            'date_from' => now()->toDateString(),
            'date_to' => now()->toDateString(),
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    expect($ownAdmission->fresh()->status)->toBe('approved')
        ->and($otherAdmission->fresh()->status)->toBe('pending_head_office');
});
