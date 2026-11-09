<?php

use App\Models\Branch;
use App\Models\LoanApplication;
use App\Models\MemberAdmission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

function createAwaitingTakeupTables(): void
{
    Schema::dropIfExists('loan_categories');
    Schema::dropIfExists('member_other_assets');
    Schema::dropIfExists('member_family_members');
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
        $table->timestamp('read_at')->nullable();
        $table->timestamps();
    });

    Schema::create('loan_categories', function (Blueprint $table) {
        $table->id();
        $table->string('name')->nullable();
        $table->boolean('is_active')->default(true);
        $table->integer('display_order')->default(0);
        $table->timestamps();
    });

    Schema::create('loan_products', function (Blueprint $table) {
        $table->id();
        $table->string('product_name')->nullable();
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
        $table->boolean('is_legacy')->default(false);
        $table->unsignedInteger('loan_dofa')->nullable();
        $table->string('status')->default('approved');
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('member_family_members', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('member_admission_id');
        $table->string('name')->nullable();
        $table->integer('sl_no')->default(1);
        $table->timestamps();
    });

    Schema::create('member_other_assets', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('member_admission_id');
        $table->string('asset_name')->nullable();
        $table->integer('sl_no')->default(1);
        $table->timestamps();
    });

    Schema::create('member_admission_issues', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('member_admission_id');
        $table->unsignedBigInteger('reported_by');
        $table->text('issue_description')->nullable();
        $table->string('status')->default('pending');
        $table->text('resolution_note')->nullable();
        $table->dateTime('zm_approved_at')->nullable();
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
        $table->decimal('approved_amount', 12, 2)->nullable();
        $table->decimal('pending_approved_amount', 12, 2)->nullable();
        $table->unsignedBigInteger('amount_change_requested_by')->nullable();
        $table->timestamp('amount_change_requested_at')->nullable();
        $table->timestamp('awaiting_takeup_at')->nullable();
        $table->unsignedBigInteger('awaiting_takeup_by')->nullable();
        $table->string('awaiting_note', 500)->nullable();
        $table->timestamp('reviewed_at')->nullable();
        $table->unsignedBigInteger('reviewed_by')->nullable();
        $table->string('form_type')->nullable();
        $table->text('guarantor_info')->nullable();
        $table->text('nominee_info')->nullable();
        $table->text('asset_info')->nullable();
        $table->text('business_plan')->nullable();
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('loan_application_issues', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('loan_application_id');
        $table->unsignedBigInteger('reported_by');
        $table->text('issue_description')->nullable();
        $table->string('status')->default('pending');
        $table->text('response_message')->nullable();
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
}

/**
 * @return array{0: User, 1: Branch, 2: MemberAdmission}
 */
function createAwaitingBranchContext(string $roleName = Role::BRANCH_USER): array
{
    $role = Role::create([
        'name' => $roleName,
        'display_name' => $roleName,
    ]);

    $branch = Branch::create(['name' => 'Dhaka', 'code' => '0001']);

    $user = User::create([
        'name' => 'Test '.$roleName,
        'email' => $roleName.'-awaiting-'.uniqid().'@test.com',
        'password' => Hash::make('password'),
        'role_id' => $role->id,
        'branch_id' => $branch->id,
        'has_all_access' => true,
        'is_active' => true,
        'pin' => '1234',
        'signature' => 'signed',
        'phone' => '01700000000',
        'email_verified_at' => now(),
    ]);

    $admission = MemberAdmission::create([
        'application_no' => '0001008703',
        'applicant_name_bn' => 'রহিমা',
        'nid_number' => '1990123456789',
        'mobile_number' => '01711111111',
        'branch_id' => $branch->id,
        'status' => 'approved',
    ]);

    return [$user, $branch, $admission];
}

function createAwaitingLoan(MemberAdmission $admission, Branch $branch, string $status): LoanApplication
{
    return LoanApplication::create([
        'application_no' => 'LN-AWAIT-'.uniqid(),
        'member_admission_id' => $admission->id,
        'branch_id' => $branch->id,
        'status' => $status,
        'requested_amount' => 20000,
        'approved_amount' => 20000,
    ]);
}

beforeEach(function () {
    createAwaitingTakeupTables();
});

it('excludes awaiting takeup from disbursement and amount-change guards', function () {
    [$user, $branch, $admission] = createAwaitingBranchContext();
    $loan = createAwaitingLoan($admission, $branch, LoanApplication::STATUS_AWAITING_TAKEUP);

    expect($loan->canBeDisbursed())->toBeFalse()
        ->and($loan->canRequestApprovedAmountChange())->toBeFalse()
        ->and($loan->getTrackingState()['label'])->toBe('পরে নেবে (শাখা কিউ)');
});

it('defers takeup only from pending disbursement', function () {
    [$user, $branch, $admission] = createAwaitingBranchContext();
    $loan = createAwaitingLoan($admission, $branch, LoanApplication::STATUS_PENDING_DISBURSEMENT);

    $this->actingAs($user)
        ->from('/member/loan-applications')
        ->patch(route('member.loan-applications.defer-takeup', $loan->id), [
            'awaiting_note' => 'সদস্য পরে নিবেন',
        ])
        ->assertRedirect();

    $loan->refresh();

    expect($loan->status)->toBe(LoanApplication::STATUS_AWAITING_TAKEUP)
        ->and((int) $loan->awaiting_takeup_by)->toBe($user->id)
        ->and($loan->awaiting_takeup_at)->not->toBeNull()
        ->and($loan->awaiting_note)->toBe('সদস্য পরে নিবেন');
});

it('rejects defer takeup when the loan is not pending disbursement', function () {
    [$user, $branch, $admission] = createAwaitingBranchContext();
    $loan = createAwaitingLoan($admission, $branch, LoanApplication::STATUS_READY_FOR_HEAD_OFFICE);

    $this->actingAs($user)
        ->from('/member/loan-applications')
        ->patch(route('member.loan-applications.defer-takeup', $loan->id))
        ->assertRedirect()
        ->assertSessionHasErrors('error');

    expect($loan->fresh()->status)->toBe(LoanApplication::STATUS_READY_FOR_HEAD_OFFICE);
});

it('forbids field officers from deferring takeup', function () {
    [$user, $branch, $admission] = createAwaitingBranchContext(Role::FIELD_OFFICER);
    $loan = createAwaitingLoan($admission, $branch, LoanApplication::STATUS_PENDING_DISBURSEMENT);

    $this->actingAs($user)
        ->from('/member/loan-applications')
        ->patch(route('member.loan-applications.defer-takeup', $loan->id))
        ->assertForbidden();
});

it('moves awaiting takeup back to ready for head office', function () {
    [$user, $branch, $admission] = createAwaitingBranchContext();
    $loan = createAwaitingLoan($admission, $branch, LoanApplication::STATUS_AWAITING_TAKEUP);

    $this->actingAs($user)
        ->from('/member/loan-applications')
        ->patch(route('member.loan-applications.ready-from-awaiting', $loan->id))
        ->assertRedirect()
        ->assertSessionHas('success');

    expect($loan->fresh()->status)->toBe(LoanApplication::STATUS_READY_FOR_HEAD_OFFICE);
});

it('rejects ready-from-awaiting unless the loan is awaiting takeup', function () {
    [$user, $branch, $admission] = createAwaitingBranchContext();
    $loan = createAwaitingLoan($admission, $branch, LoanApplication::STATUS_PENDING_DISBURSEMENT);

    $this->actingAs($user)
        ->from('/member/loan-applications')
        ->patch(route('member.loan-applications.ready-from-awaiting', $loan->id))
        ->assertRedirect()
        ->assertSessionHasErrors('error');

    expect($loan->fresh()->status)->toBe(LoanApplication::STATUS_PENDING_DISBURSEMENT);
});

it('rejects head office send and disbursement while awaiting takeup', function () {
    [$user, $branch, $admission] = createAwaitingBranchContext();
    $loan = createAwaitingLoan($admission, $branch, LoanApplication::STATUS_AWAITING_TAKEUP);

    $this->actingAs($user)
        ->from('/member/loan-applications')
        ->patch(route('member.loan-applications.send-to-head-office', $loan->id))
        ->assertRedirect()
        ->assertSessionHasErrors('error');

    $this->actingAs($user)
        ->from('/member/loan-applications')
        ->patch(route('member.loan-applications.disburse', $loan->id), [
            'disbursed_amount' => 20000,
            'disbursement_date' => now()->toDateString(),
            'disbursement_method' => 'cash',
        ])
        ->assertRedirect()
        ->assertSessionHasErrors('error');

    expect($loan->fresh()->status)->toBe(LoanApplication::STATUS_AWAITING_TAKEUP);
});

it('keeps a sister loan form blocked while awaiting takeup', function () {
    [, $branch, $admission] = createAwaitingBranchContext();
    $loan = createAwaitingLoan($admission, $branch, LoanApplication::STATUS_AWAITING_TAKEUP);

    $clone = MemberAdmission::create([
        'application_no' => $admission->application_no,
        'nid_number' => $admission->nid_number,
        'mobile_number' => $admission->mobile_number,
        'branch_id' => $branch->id,
        'previous_admission_id' => $admission->id,
        'status' => 'approved',
        'loan_dofa' => 2,
        'is_legacy' => true,
    ]);

    expect($admission->hasExistingLoanForm())->toBeTrue()
        ->and($clone->hasExistingLoanForm())->toBeTrue()
        ->and($admission->existingLoanForm()?->id)->toBe($loan->id)
        ->and(MemberAdmission::alreadyLoanFormMessage($loan))->toContain('Already Loan Form আছে')
        ->and($admission->mustUseCycleHubForNextLoan())->toBeFalse();
});

it('forbids non-branch-user roles from marking ready-from-awaiting', function (string $roleName) {
    [$user, $branch, $admission] = createAwaitingBranchContext($roleName);
    $loan = createAwaitingLoan($admission, $branch, LoanApplication::STATUS_AWAITING_TAKEUP);

    $this->actingAs($user)
        ->from('/member/loan-applications')
        ->patch(route('member.loan-applications.ready-from-awaiting', $loan->id))
        ->assertForbidden();

    expect($loan->fresh()->status)->toBe(LoanApplication::STATUS_AWAITING_TAKEUP);
})->with([
    Role::BRANCH_MANAGER,
    Role::FIELD_OFFICER,
    Role::HEAD_OFFICE,
    Role::SUPER_ADMIN,
]);

it('ensures show routes include readyFromAwaiting and deferTakeup for branch user', function () {
    [$branchUser, $branch, $admission] = createAwaitingBranchContext(Role::BRANCH_USER);
    $loan = createAwaitingLoan($admission, $branch, LoanApplication::STATUS_AWAITING_TAKEUP);

    $branchRes = $this->actingAs($branchUser)->get(route('member.loan-applications.show', $loan->id));
    $branchRes->assertOk();
    $branchRoutes = $branchRes->original->getData()['page']['props']['routes'] ?? [];
    expect($branchRoutes['readyFromAwaiting'])->not->toBeNull()
        ->and($branchRoutes['deferTakeup'])->not->toBeNull();
});

it('ensures show routes exclude readyFromAwaiting and deferTakeup for non-branch-user', function () {
    [$bmUser, $branch, $admission] = createAwaitingBranchContext(Role::BRANCH_MANAGER);
    $loan = createAwaitingLoan($admission, $branch, LoanApplication::STATUS_AWAITING_TAKEUP);

    $bmRes = $this->actingAs($bmUser)->get(route('member.loan-applications.show', $loan->id));
    $bmRes->assertOk();
    $bmRoutes = $bmRes->original->getData()['page']['props']['routes'] ?? [];
    expect($bmRoutes['readyFromAwaiting'])->toBeNull()
        ->and($bmRoutes['deferTakeup'])->toBeNull();
});

it('skips awaiting takeup loans in head office approveBulk', function () {
    [$hoUser, $branch, $admission] = createAwaitingBranchContext(Role::HEAD_OFFICE);
    $awaitingLoan = createAwaitingLoan($admission, $branch, LoanApplication::STATUS_AWAITING_TAKEUP);
    $pendingHoLoan = createAwaitingLoan($admission, $branch, LoanApplication::STATUS_PENDING_HEAD_OFFICE);

    $this->actingAs($hoUser)
        ->post(route('head-office.loans.approve-bulk'), [
            'ids' => [$awaitingLoan->id, $pendingHoLoan->id],
        ])
        ->assertRedirect();

    // The awaiting takeup loan MUST NOT be touched
    expect($awaitingLoan->fresh()->status)->toBe(LoanApplication::STATUS_AWAITING_TAKEUP)
        // Only pending_head_office should be approved to pending_disbursement
        ->and($pendingHoLoan->fresh()->status)->toBe(LoanApplication::STATUS_PENDING_DISBURSEMENT);
});

it('excludes awaiting takeup loans with issues from head office verification index', function () {
    [$hoUser, $branch, $admission] = createAwaitingBranchContext(Role::HEAD_OFFICE);
    $awaitingLoan = createAwaitingLoan($admission, $branch, LoanApplication::STATUS_AWAITING_TAKEUP);
    \App\Models\LoanApplicationIssue::create([
        'loan_application_id' => $awaitingLoan->id,
        'reported_by' => $hoUser->id,
        'issue_description' => 'Test objection',
        'status' => 'resolved',
        'zm_approved_at' => now(),
    ]);

    $pendingHoLoan = createAwaitingLoan($admission, $branch, LoanApplication::STATUS_PENDING_HEAD_OFFICE);
    \App\Models\LoanApplicationIssue::create([
        'loan_application_id' => $pendingHoLoan->id,
        'reported_by' => $hoUser->id,
        'issue_description' => 'Active objection',
        'status' => 'pending',
    ]);

    $res = $this->actingAs($hoUser)->get(route('verifications.index'));
    $res->assertOk();

    $items = collect($res->original->getData()['page']['props']['items']['data'] ?? []);
    $loanIds = $items->where('item_type', 'loan')->pluck('raw_id')->all();

    expect($loanIds)->toContain($pendingHoLoan->id)
        ->and($loanIds)->not->toContain($awaitingLoan->id);
});
