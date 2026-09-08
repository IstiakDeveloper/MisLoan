<?php

use App\Models\Branch;
use App\Models\LoanApplication;
use App\Models\LoanApplicationIssue;
use App\Models\MemberAdmission;
use App\Models\MemberAdmissionIssue;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

function createVerificationDateTables(): void
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

    Schema::create('settings', function (Blueprint $table) {
        $table->id();
        $table->string('key')->unique();
        $table->text('value')->nullable();
        $table->timestamps();
    });

    Schema::create('branches', function (Blueprint $table) {
        $table->id();
        $table->string('name')->default('Nazipur');
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
        $table->string('password')->default('secret');
        $table->unsignedBigInteger('role_id')->nullable();
        $table->unsignedBigInteger('branch_id')->nullable();
        $table->unsignedBigInteger('area_id')->nullable();
        $table->unsignedBigInteger('zone_id')->nullable();
        $table->boolean('is_active')->default(true);
        $table->boolean('has_all_access')->default(false);
        $table->string('account_type')->nullable();
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

    Schema::create('member_admissions', function (Blueprint $table) {
        $table->id();
        $table->string('application_no')->nullable();
        $table->string('applicant_name_en')->nullable();
        $table->string('applicant_name_bn')->nullable();
        $table->unsignedBigInteger('branch_id')->nullable();
        $table->unsignedBigInteger('submitted_by')->nullable();
        $table->dateTime('submitted_at')->nullable();
        $table->string('status')->default('pending_head_office');
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
        $table->unsignedBigInteger('zm_approved_by')->nullable();
        $table->text('zm_approval_note')->nullable();
        $table->timestamps();
    });

    Schema::create('loan_applications', function (Blueprint $table) {
        $table->id();
        $table->string('application_no')->nullable();
        $table->unsignedBigInteger('member_admission_id')->nullable();
        $table->unsignedBigInteger('branch_id')->nullable();
        $table->unsignedBigInteger('submitted_by')->nullable();
        $table->dateTime('submitted_at')->nullable();
        $table->string('status')->default('pending_head_office');
        $table->decimal('requested_amount', 12, 2)->default(0);
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

    Schema::create('member_admission_approvals', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('member_admission_id');
        $table->unsignedBigInteger('user_id')->nullable();
        $table->string('level')->nullable();
        $table->unsignedInteger('sequence')->default(1);
        $table->string('status')->default('pending');
        $table->timestamps();
    });

    Schema::create('loan_application_approvals', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('loan_application_id');
        $table->unsignedBigInteger('user_id')->nullable();
        $table->string('level')->nullable();
        $table->unsignedInteger('sequence')->default(1);
        $table->string('status')->default('pending');
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
        $table->timestamps();
    });
}

function createVerificationDateUser(string $roleName, string $email, int $branchId, bool $allAccess = false): User
{
    $role = Role::firstOrCreate(['name' => $roleName], ['display_name' => $roleName]);

    return User::create([
        'name' => $roleName,
        'email' => $email,
        'password' => Hash::make('password'),
        'role_id' => $role->id,
        'branch_id' => $branchId,
        'is_active' => true,
        'has_all_access' => $allAccess,
    ]);
}

beforeEach(function () {
    createVerificationDateTables();
});

it('does not move an admission to today when the branch replies on verification', function () {
    $branch = Branch::create(['name' => 'Nazipur', 'code' => '0017']);
    $user = createVerificationDateUser(Role::BRANCH_MANAGER, 'bm-date@test.com', $branch->id);
    $sentAt = now()->subDay()->startOfHour();

    $admission = MemberAdmission::withoutEvents(fn () => MemberAdmission::create([
        'application_no' => '0017888834',
        'applicant_name_bn' => 'মোসাঃ বিউটি খাতুন',
        'branch_id' => $branch->id,
        'status' => 'pending_head_office',
        'submitted_at' => $sentAt,
        'submitted_by' => $user->id,
    ]));

    $issue = MemberAdmissionIssue::create([
        'member_admission_id' => $admission->id,
        'reported_by' => $user->id,
        'issue_description' => 'সদস্য অতিরিক্ত ঋণগ্রস্থ',
        'status' => 'pending',
    ]);

    $this->actingAs($user)
        ->from('/verifications')
        ->post('/verifications/reply-issue', [
            'item_type' => 'admission',
            'raw_id' => $admission->id,
            'issue_id' => $issue->id,
            'reply_message' => 'সদস্যর মাঠে ৬বিঘা আবাদি জমি রয়েছে।',
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    $fresh = $admission->fresh();
    expect($fresh->submitted_at->toDateTimeString())->toBe($sentAt->toDateTimeString())
        ->and($fresh->submitted_by)->toBe($user->id)
        ->and($issue->fresh()->resolution_note)->toBe('সদস্যর মাঠে ৬বিঘা আবাদি জমি রয়েছে।');
});

it('does not move a loan to today when zonal manager approves a verification reply', function () {
    $branch = Branch::create(['name' => 'Nazipur', 'code' => '0017']);
    $zm = createVerificationDateUser(Role::ZONE_MANAGER, 'zm-date@test.com', $branch->id, true);
    $sentAt = now()->subDay()->startOfHour();

    $loan = LoanApplication::create([
        'application_no' => 'LN-001',
        'branch_id' => $branch->id,
        'status' => LoanApplication::STATUS_PENDING_HEAD_OFFICE,
        'submitted_at' => $sentAt,
        'submitted_by' => $zm->id,
        'requested_amount' => 50000,
    ]);

    $issue = LoanApplicationIssue::create([
        'loan_application_id' => $loan->id,
        'reported_by' => $zm->id,
        'issue_description' => 'কাগজপত্র অসম্পূর্ণ',
        'status' => 'pending',
        'response_message' => 'শাখা থেকে জবাব দেওয়া হয়েছে',
        'responded_by' => $zm->id,
        'responded_at' => $sentAt,
    ]);

    $this->actingAs($zm)
        ->from('/verifications')
        ->post('/verifications/zm-approve', [
            'item_type' => 'loan',
            'raw_id' => $loan->id,
            'issue_id' => $issue->id,
            'approval_note' => 'অনুমোদিত',
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    expect($loan->fresh()->submitted_at->toDateTimeString())->toBe($sentAt->toDateTimeString())
        ->and($issue->fresh()->zm_approved_at)->not->toBeNull();
});
