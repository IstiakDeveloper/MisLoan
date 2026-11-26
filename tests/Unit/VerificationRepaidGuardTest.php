<?php

use App\Http\Controllers\HeadOfficeLoanController;
use App\Http\Controllers\HeadOfficeVerificationController;
use App\Models\Branch;
use App\Models\LoanApplication;
use App\Models\LoanApplicationIssue;
use App\Models\MemberAdmission;
use App\Models\Role;
use App\Models\User;
use App\Services\MemberAdmissionLoanSyncService;
use App\Services\NavBadgeService;
use App\Services\VerificationIndexQuery;
use App\Support\LoanFormVisibility;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

function createVerificationRepaidGuardTables(): void
{
    Schema::dropIfExists('member_other_assets');
    Schema::dropIfExists('member_family_members');
    Schema::dropIfExists('loan_application_approvals');
    Schema::dropIfExists('member_admission_approvals');
    Schema::dropIfExists('loan_members');
    Schema::dropIfExists('notifications');
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
        $table->unsignedBigInteger('previous_admission_id')->nullable();
        $table->unsignedInteger('loan_dofa')->nullable();
        $table->string('status')->default('approved');
        $table->text('revision_comments')->nullable();
        $table->integer('revision_count')->default(0);
        $table->dateTime('submitted_at')->nullable();
        $table->dateTime('reviewed_at')->nullable();
        $table->unsignedBigInteger('reviewed_by')->nullable();
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
        $table->dateTime('disbursed_at')->nullable();
        $table->unsignedBigInteger('disbursed_by')->nullable();
        $table->dateTime('repaid_at')->nullable();
        $table->unsignedBigInteger('repaid_by')->nullable();
        $table->string('status')->default('pending_head_office');
        $table->decimal('requested_amount', 12, 2)->default(50000);
        $table->decimal('approved_amount', 12, 2)->nullable();
        $table->decimal('pending_approved_amount', 12, 2)->nullable();
        $table->unsignedBigInteger('amount_change_requested_by')->nullable();
        $table->dateTime('amount_change_requested_at')->nullable();
        $table->string('cancellation_from_status')->nullable();
        $table->unsignedBigInteger('cancellation_requested_by')->nullable();
        $table->dateTime('cancellation_requested_at')->nullable();
        $table->text('rejection_reason')->nullable();
        $table->text('revision_comments')->nullable();
        $table->json('selected_approvers')->nullable();
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

    Schema::create('loan_members', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('loan_application_id');
        $table->string('applicant_name_bn')->nullable();
        $table->string('applicant_name_en')->nullable();
        $table->timestamps();
    });

    Schema::create('loan_application_approvals', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('loan_application_id');
        $table->unsignedBigInteger('user_id');
        $table->string('status')->default('pending');
        $table->timestamps();
    });

    Schema::create('member_admission_approvals', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('member_admission_id');
        $table->unsignedBigInteger('user_id');
        $table->string('status')->default('pending');
        $table->timestamps();
    });

    Schema::create('member_family_members', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('member_admission_id');
        $table->unsignedInteger('sl_no')->default(1);
        $table->timestamps();
    });

    Schema::create('member_other_assets', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('member_admission_id');
        $table->unsignedInteger('sl_no')->default(1);
        $table->timestamps();
    });
}

it('excludes repaid loans from verification pending queues and keeps only active dofa actionable', function () {
    createVerificationRepaidGuardTables();

    $hoRole = Role::create(['name' => Role::HEAD_OFFICE, 'display_name' => 'Head Office']);
    $zmRole = Role::create(['name' => Role::ZONE_MANAGER, 'display_name' => 'Zone Manager']);
    $branch = Branch::create(['name' => 'Test Branch', 'code' => '0015']);

    $hoUser = User::create([
        'name' => 'HO User',
        'email' => 'ho-guard@test.local',
        'role_id' => $hoRole->id,
        'has_all_access' => true,
        'is_active' => true,
    ]);
    $zmUser = User::create([
        'name' => 'ZM User',
        'email' => 'zm-guard@test.local',
        'role_id' => $zmRole->id,
        'branch_id' => $branch->id,
        'is_active' => true,
    ]);

    $admDofa1 = MemberAdmission::create([
        'application_no' => '0015001001',
        'applicant_name_bn' => 'সদস্য ১',
        'branch_id' => $branch->id,
        'loan_dofa' => 1,
        'status' => 'approved',
    ]);
    $repaidLoan = LoanApplication::create([
        'application_no' => 'LN-DOFA-1',
        'member_admission_id' => $admDofa1->id,
        'branch_id' => $branch->id,
        'status' => LoanApplication::STATUS_REPAID,
        'repaid_at' => now()->subDays(5),
        'repaid_by' => $hoUser->id,
        'reviewed_at' => now()->subDays(20),
        'submitted_at' => now()->subDays(25),
    ]);
    LoanApplicationIssue::create([
        'loan_application_id' => $repaidLoan->id,
        'reported_by' => $hoUser->id,
        'issue_description' => 'আগের দফার পুরোনো আপত্তি',
        'response_message' => 'আগে সমাধান হয়েছিল',
        'responded_by' => $zmUser->id,
        'responded_at' => now()->subDays(22),
        'zm_approved_at' => now()->subDays(21),
        'zm_approved_by' => $zmUser->id,
        'status' => 'resolved',
    ]);

    $admDofa2 = MemberAdmission::create([
        'application_no' => '0015001001',
        'applicant_name_bn' => 'সদস্য ১',
        'branch_id' => $branch->id,
        'previous_admission_id' => $admDofa1->id,
        'loan_dofa' => 2,
        'status' => 'approved',
    ]);
    $nextDofaLoan = LoanApplication::create([
        'application_no' => 'LN-DOFA-2',
        'member_admission_id' => $admDofa2->id,
        'branch_id' => $branch->id,
        'status' => LoanApplication::STATUS_PENDING_HEAD_OFFICE,
        'submitted_at' => now()->subHour(),
    ]);
    LoanApplicationIssue::create([
        'loan_application_id' => $nextDofaLoan->id,
        'reported_by' => $hoUser->id,
        'issue_description' => 'নতুন দফার আপত্তি',
        'response_message' => 'শাখার জবাব',
        'responded_by' => $zmUser->id,
        'responded_at' => now()->subMinutes(30),
        'zm_approved_at' => now()->subMinutes(10),
        'zm_approved_by' => $zmUser->id,
        'status' => 'pending',
    ]);

    $query = app(VerificationIndexQuery::class);
    $loanQuery = LoanApplication::where(function ($q) {
        $q->whereHas('issues')->orWhere('status', LoanApplication::STATUS_NEEDS_CORRECTION);
    })->whereNotIn('status', [
        LoanApplication::STATUS_AWAITING_TAKEUP,
        LoanApplication::STATUS_PENDING_CANCELLATION,
        LoanApplication::STATUS_CANCELLED,
    ]);

    $pendingAction = $query->page(MemberAdmission::whereRaw('0 = 1'), clone $loanQuery, 'loan', 'pending_action', null, null, 1, 25);
    expect($pendingAction['rows']->pluck('raw_id')->all())->toBe([$nextDofaLoan->id]);
    expect($pendingAction['stats']['pending_action'])->toBe(1);
    expect($pendingAction['stats']['zm_approved'])->toBe(1);
    expect($pendingAction['stats']['approved'])->toBe(1);

    $zmApproved = $query->page(MemberAdmission::whereRaw('0 = 1'), clone $loanQuery, 'loan', 'zm_approved', null, null, 1, 25);
    expect($zmApproved['rows']->pluck('raw_id')->all())->toBe([$nextDofaLoan->id]);

    $approvedHistory = $query->page(MemberAdmission::whereRaw('0 = 1'), clone $loanQuery, 'loan', 'approved', null, null, 1, 25);
    expect($approvedHistory['rows']->pluck('raw_id')->all())->toBe([$repaidLoan->id]);

    $badges = app(NavBadgeService::class)->forUser($hoUser);
    expect($badges['pendingVerifications'])->toBe(1);
});

it('blocks HeadOfficeVerificationController and HeadOfficeLoanController from overwriting repaid loans', function () {
    createVerificationRepaidGuardTables();

    $hoRole = Role::create(['name' => Role::HEAD_OFFICE, 'display_name' => 'Head Office']);
    $zmRole = Role::create(['name' => Role::ZONE_MANAGER, 'display_name' => 'Zone Manager']);
    $branch = Branch::create(['name' => 'Test Branch', 'code' => '0015']);

    $hoUser = User::create([
        'name' => 'HO User',
        'email' => 'ho-lock@test.local',
        'role_id' => $hoRole->id,
        'has_all_access' => true,
        'is_active' => true,
    ]);
    $zmUser = User::create([
        'name' => 'ZM User',
        'email' => 'zm-lock@test.local',
        'role_id' => $zmRole->id,
        'branch_id' => $branch->id,
        'is_active' => true,
    ]);

    $adm = MemberAdmission::create([
        'application_no' => '0015002002',
        'applicant_name_bn' => 'সদস্য ২',
        'branch_id' => $branch->id,
        'loan_dofa' => 1,
        'status' => 'approved',
    ]);
    $originalReviewedAt = now()->subDays(15)->startOfSecond();
    $repaidLoan = LoanApplication::create([
        'application_no' => 'LN-REPAID-LOCK',
        'member_admission_id' => $adm->id,
        'branch_id' => $branch->id,
        'status' => LoanApplication::STATUS_REPAID,
        'repaid_at' => now()->subDays(3),
        'repaid_by' => $hoUser->id,
        'reviewed_at' => $originalReviewedAt,
        'submitted_at' => now()->subDays(20),
    ]);
    LoanApplicationIssue::create([
        'loan_application_id' => $repaidLoan->id,
        'reported_by' => $hoUser->id,
        'issue_description' => 'পুরোনো আপত্তি',
        'response_message' => 'জবাব',
        'responded_by' => $zmUser->id,
        'responded_at' => now()->subDays(16),
        'zm_approved_at' => now()->subDays(15),
        'zm_approved_by' => $zmUser->id,
        'status' => 'resolved',
    ]);

    $adm2 = MemberAdmission::create([
        'application_no' => '0015002002',
        'applicant_name_bn' => 'সদস্য ২',
        'branch_id' => $branch->id,
        'previous_admission_id' => $adm->id,
        'loan_dofa' => 2,
        'status' => 'approved',
    ]);
    $nextLoan = LoanApplication::create([
        'application_no' => 'LN-NEXT-DOFA',
        'member_admission_id' => $adm2->id,
        'branch_id' => $branch->id,
        'status' => LoanApplication::STATUS_PENDING_HEAD_OFFICE,
        'submitted_at' => now()->subHour(),
    ]);
    LoanApplicationIssue::create([
        'loan_application_id' => $nextLoan->id,
        'reported_by' => $hoUser->id,
        'issue_description' => 'দফা ২ আপত্তি',
        'response_message' => 'জবাব',
        'responded_by' => $zmUser->id,
        'responded_at' => now()->subMinutes(20),
        'zm_approved_at' => now()->subMinutes(10),
        'zm_approved_by' => $zmUser->id,
        'status' => 'pending',
    ]);

    $this->actingAs($hoUser);

    // Single approve & bulk approve must skip/block repaidLoan while approving nextLoan
    $this->post("/verifications/loans/{$repaidLoan->id}/approve")
        ->assertRedirect()
        ->assertSessionHas('error');
    expect($repaidLoan->fresh()->status)->toBe(LoanApplication::STATUS_REPAID);
    expect($repaidLoan->fresh()->reviewed_at->equalTo($originalReviewedAt))->toBeTrue();

    $this->post('/verifications/bulk-ho-approve', [
        'items' => [
            ['item_type' => 'loan', 'raw_id' => $repaidLoan->id],
            ['item_type' => 'loan', 'raw_id' => $nextLoan->id],
        ],
    ])->assertRedirect();
    expect($repaidLoan->fresh()->status)->toBe(LoanApplication::STATUS_REPAID);
    expect($nextLoan->fresh()->status)->toBe(LoanApplication::STATUS_PENDING_DISBURSEMENT);

    // Reject & storeIssue & resetApproval & resetToHeadOffice must all leave repaidLoan untouched
    $this->post('/verifications/reject-application', [
        'item_type' => 'loan',
        'raw_id' => $repaidLoan->id,
        'rejection_reason' => 'Should be blocked',
    ])->assertRedirect()->assertSessionHas('error');
    expect($repaidLoan->fresh()->status)->toBe(LoanApplication::STATUS_REPAID);

    $this->post('/verifications/store-issue', [
        'item_type' => 'loan',
        'raw_id' => $repaidLoan->id,
        'issue_description' => 'Should be blocked',
    ])->assertRedirect()->assertSessionHas('error');
    expect($repaidLoan->issues()->count())->toBe(1);

    $this->patch("/head-office/loans/{$repaidLoan->id}/reset-approval")
        ->assertRedirect()
        ->assertSessionHas('error');
    $this->patch("/head-office/loans/{$repaidLoan->id}/reset-to-head-office")
        ->assertRedirect()
        ->assertSessionHas('error');
    $this->patch("/head-office/loans/{$repaidLoan->id}/reject", [
        'rejection_reason' => 'Blocked',
    ])->assertRedirect()->assertSessionHas('error');
    $this->post("/head-office/loans/{$repaidLoan->id}/issue", [
        'issue_description' => 'Blocked',
    ])->assertRedirect()->assertSessionHas('error');
    expect($repaidLoan->fresh()->status)->toBe(LoanApplication::STATUS_REPAID);
    expect(LoanFormVisibility::canEditLoanDetails(Role::BRANCH_USER, LoanApplication::STATUS_REPAID, false))->toBeFalse();
});

it('skips repaid loans in MemberAdmissionLoanSyncService and restores reverted repaid loans via artisan command', function () {
    createVerificationRepaidGuardTables();

    $branch = Branch::create(['name' => 'Main', 'code' => '001']);
    $adm = MemberAdmission::create([
        'application_no' => '0001003003',
        'applicant_name_bn' => 'নতুন নাম',
        'branch_id' => $branch->id,
        'loan_dofa' => 1,
        'status' => 'approved',
    ]);

    $repaidWithJson = LoanApplication::create([
        'application_no' => 'LN-OLD-JSON',
        'member_admission_id' => $adm->id,
        'branch_id' => $branch->id,
        'status' => LoanApplication::STATUS_REPAID,
        'repaid_at' => now()->subDays(5),
        'loan_agreement_data' => ['applicant_name_bn' => 'পুরোনো নাম'],
    ]);

    app(MemberAdmissionLoanSyncService::class)->syncBoundLoans($adm);
    expect($repaidWithJson->fresh()->loan_agreement_data['applicant_name_bn'])->toBe('পুরোনো নাম');

    $revertedPending = LoanApplication::create([
        'application_no' => 'LN-REV-PD',
        'member_admission_id' => $adm->id,
        'branch_id' => $branch->id,
        'status' => LoanApplication::STATUS_PENDING_DISBURSEMENT,
        'repaid_at' => now()->subDays(6),
        'repaid_by' => 1,
        'reviewed_at' => now()->subDay(),
    ]);
    LoanApplicationIssue::create([
        'loan_application_id' => $revertedPending->id,
        'reported_by' => 1,
        'issue_description' => 'Pending dangling issue',
        'status' => 'pending',
    ]);

    $revertedDisbursed = LoanApplication::create([
        'application_no' => 'LN-REV-DISB',
        'member_admission_id' => $adm->id,
        'branch_id' => $branch->id,
        'status' => LoanApplication::STATUS_DISBURSED,
        'repaid_at' => now()->subDays(6),
        'repaid_by' => 1,
        'reviewed_at' => now()->subDay(),
    ]);

    $legitNextDofa = LoanApplication::create([
        'application_no' => 'LN-LEGIT-NEXT',
        'member_admission_id' => $adm->id,
        'branch_id' => $branch->id,
        'status' => LoanApplication::STATUS_PENDING_DISBURSEMENT,
        'repaid_at' => null,
        'reviewed_at' => now()->subDay(),
    ]);

    // Dry-run does not modify anything
    $this->artisan('loans:repair-reverted-repaid')->assertExitCode(0);
    expect($revertedPending->fresh()->status)->toBe(LoanApplication::STATUS_PENDING_DISBURSEMENT);

    // Apply restores both reverted loans and closes dangling issues, leaving legitNextDofa untouched
    $this->artisan('loans:repair-reverted-repaid --apply')->assertExitCode(0);
    expect($revertedPending->fresh()->status)->toBe(LoanApplication::STATUS_REPAID);
    expect($revertedDisbursed->fresh()->status)->toBe(LoanApplication::STATUS_REPAID);
    expect($revertedPending->issues()->first()->status)->toBe('resolved');
    expect($legitNextDofa->fresh()->status)->toBe(LoanApplication::STATUS_PENDING_DISBURSEMENT);
});
