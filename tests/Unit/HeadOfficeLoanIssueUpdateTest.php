<?php

use App\Models\Branch;
use App\Models\LoanApplication;
use App\Models\LoanApplicationIssue;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

function createLoanIssueUpdateTables(): void
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

function createLoanIssueUser(string $roleName, string $email, bool $hasAllAccess = false): User
{
    $role = Role::create([
        'name' => $roleName,
        'display_name' => $roleName,
    ]);

    return User::create([
        'name' => $roleName.' Officer',
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

function createPendingLoanIssue(User $reporter, string $description = 'NID অস্পষ্ট'): LoanApplicationIssue
{
    $branch = Branch::create(['name' => 'Test Branch', 'code' => '0001']);

    $loan = LoanApplication::create([
        'application_no' => 'LN-ISSUE-1',
        'branch_id' => $branch->id,
        'status' => LoanApplication::STATUS_PENDING_HEAD_OFFICE,
        'requested_amount' => 10000,
    ]);

    return LoanApplicationIssue::create([
        'loan_application_id' => $loan->id,
        'reported_by' => $reporter->id,
        'issue_description' => $description,
        'status' => 'pending',
    ]);
}

beforeEach(function () {
    createLoanIssueUpdateTables();
});

it('lets a head office officer update a pending loan issue', function () {
    $user = createLoanIssueUser(Role::HEAD_OFFICE, 'ho@test.com');
    $issue = createPendingLoanIssue($user, 'পুরনো সমস্যা');

    $this->actingAs($user)
        ->from('/head-office/process-loans')
        ->patch("/head-office/loan-issues/{$issue->id}", [
            'issue_description' => 'সংশোধিত সমস্যা: গ্যারান্টরের তথ্য অসম্পূর্ণ',
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    expect($issue->fresh()->issue_description)->toBe('সংশোধিত সমস্যা: গ্যারান্টরের তথ্য অসম্পূর্ণ');
});

it('lets a cso officer update a pending loan issue', function () {
    $user = createLoanIssueUser(Role::CSO, 'cso@test.com', true);
    $issue = createPendingLoanIssue($user);

    $this->actingAs($user)
        ->from('/head-office/process-loans')
        ->patch("/head-office/loan-issues/{$issue->id}", [
            'issue_description' => 'CSO কর্তৃক সংশোধিত সমস্যা',
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    expect($issue->fresh()->issue_description)->toBe('CSO কর্তৃক সংশোধিত সমস্যা');
});

it('rejects an empty issue description on update', function () {
    $user = createLoanIssueUser(Role::HEAD_OFFICE, 'ho-empty@test.com');
    $issue = createPendingLoanIssue($user, 'আসল সমস্যা');

    $this->actingAs($user)
        ->from('/head-office/process-loans')
        ->patch("/head-office/loan-issues/{$issue->id}", [
            'issue_description' => '',
        ])
        ->assertRedirect()
        ->assertSessionHasErrors('issue_description');

    expect($issue->fresh()->issue_description)->toBe('আসল সমস্যা');
});

it('does not allow updating an issue after the branch has replied', function () {
    $user = createLoanIssueUser(Role::HEAD_OFFICE, 'ho-replied@test.com');
    $issue = createPendingLoanIssue($user, 'আসল সমস্যা');
    $issue->update([
        'response_message' => 'শাখা থেকে জবাব দেওয়া হয়েছে',
        'responded_at' => now(),
        'responded_by' => $user->id,
    ]);

    $this->actingAs($user)
        ->from('/head-office/process-loans')
        ->patch("/head-office/loan-issues/{$issue->id}", [
            'issue_description' => 'এটি আর বদলানো যাবে না',
        ])
        ->assertRedirect()
        ->assertSessionHas('error');

    expect($issue->fresh()->issue_description)->toBe('আসল সমস্যা');
});

it('forbids a branch manager from updating a loan issue', function () {
    $user = createLoanIssueUser(Role::BRANCH_MANAGER, 'bm@test.com');
    $issue = createPendingLoanIssue($user);

    $this->actingAs($user)
        ->patch("/head-office/loan-issues/{$issue->id}", [
            'issue_description' => 'শাখা থেকে পরিবর্তন',
        ])
        ->assertForbidden();
});

it('lets a head office officer delete a pending unanswered loan issue', function () {
    $user = createLoanIssueUser(Role::HEAD_OFFICE, 'ho-delete@test.com');
    $issue = createPendingLoanIssue($user);

    $this->actingAs($user)
        ->from('/head-office/process-loans')
        ->delete("/head-office/loan-issues/{$issue->id}")
        ->assertRedirect()
        ->assertSessionHas('success');

    expect(LoanApplicationIssue::query()->find($issue->id))->toBeNull();
});

it('does not allow deleting an issue after the branch has replied', function () {
    $user = createLoanIssueUser(Role::HEAD_OFFICE, 'ho-delete-replied@test.com');
    $issue = createPendingLoanIssue($user, 'মুছা যাবে না');
    $issue->update([
        'response_message' => 'জোনাল জবাব',
        'responded_at' => now(),
    ]);

    $this->actingAs($user)
        ->from('/head-office/process-loans')
        ->delete("/head-office/loan-issues/{$issue->id}")
        ->assertRedirect()
        ->assertSessionHas('error');

    expect(LoanApplicationIssue::query()->find($issue->id))->not->toBeNull();
});
