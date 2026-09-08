<?php

use App\Models\LoanApplication;
use App\Models\LoanApplicationApproval;
use App\Models\Role;
use App\Models\TeamBasedApproval;
use App\Models\TeamBasedApprovalItem;
use App\Models\TeamBasedApprovalReview;
use App\Models\User;
use App\Services\ApprovalService;
use App\Services\NotificationService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

function createLoanHigherApproverForwardTables(): void
{
    if (DB::connection()->getDriverName() === 'sqlite') {
        DB::connection()->getPdo()->sqliteCreateFunction('REGEXP', function ($pattern, $value) {
            return (int) (preg_match('/'.$pattern.'/', (string) $value) === 1);
        });
    }

    Schema::dropIfExists('team_based_approval_reviews');
    Schema::dropIfExists('team_based_approval_items');
    Schema::dropIfExists('team_based_approvals');
    Schema::dropIfExists('loan_application_approvals');
    Schema::dropIfExists('loan_applications');
    Schema::dropIfExists('users');
    Schema::dropIfExists('roles');

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
        $table->boolean('is_active')->default(true);
        $table->boolean('has_all_access')->default(false);
        $table->string('signature')->nullable();
        $table->string('pin')->nullable();
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('loan_applications', function (Blueprint $table) {
        $table->id();
        $table->string('application_no')->nullable();
        $table->unsignedBigInteger('member_admission_id')->nullable();
        $table->unsignedBigInteger('loan_product_id')->nullable();
        $table->unsignedBigInteger('branch_id')->nullable();
        $table->unsignedBigInteger('submitted_by')->nullable();
        $table->string('status')->default('under_review');
        $table->decimal('requested_amount', 12, 2)->default(0);
        $table->decimal('approved_amount', 12, 2)->nullable();
        $table->decimal('pending_approved_amount', 12, 2)->nullable();
        $table->unsignedBigInteger('amount_change_requested_by')->nullable();
        $table->timestamp('amount_change_requested_at')->nullable();
        $table->json('business_plan')->nullable();
        $table->timestamps();
        $table->softDeletes();
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
        $table->text('approver_signature')->nullable();
        $table->timestamps();
    });

    Schema::create('team_based_approvals', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('branch_id')->nullable();
        $table->unsignedBigInteger('loan_application_id')->nullable();
        $table->unsignedBigInteger('created_by')->nullable();
        $table->date('sheet_date')->nullable();
        $table->unsignedBigInteger('area_manager_id')->nullable();
        $table->unsignedBigInteger('zone_manager_id')->nullable();
        $table->unsignedBigInteger('admf_id')->nullable();
        $table->unsignedBigInteger('dmf_id')->nullable();
        $table->unsignedBigInteger('ed_id')->nullable();
        $table->string('status')->default('pending');
        $table->decimal('approved_total_amount', 15, 2)->nullable();
        $table->json('last_items_snapshot')->nullable();
        $table->timestamps();
    });

    Schema::create('team_based_approval_items', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('team_based_approval_id');
        $table->unsignedInteger('serial_no')->default(1);
        $table->string('member_name')->nullable();
        $table->string('member_code')->nullable();
        $table->string('proposed_loan_amount')->nullable();
        $table->integer('approved_amount')->nullable();
        $table->timestamps();
    });

    Schema::create('team_based_approval_reviews', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('team_based_approval_id');
        $table->unsignedBigInteger('team_based_approval_item_id')->nullable();
        $table->unsignedBigInteger('user_id');
        $table->string('level')->nullable();
        $table->string('status')->default('pending');
        $table->text('comments')->nullable();
        $table->decimal('approved_amount', 15, 2)->nullable();
        $table->string('approver_signature')->nullable();
        $table->timestamp('decided_at')->nullable();
        $table->timestamps();
    });
}

function mockLoanForwardNotifications(): void
{
    $notificationMock = Mockery::mock(NotificationService::class);
    $notificationMock->shouldReceive('send')->atLeast()->once();
    app()->instance(NotificationService::class, $notificationMock);
}

it('lets an area manager forward to a higher approver without finalizing the loan', function () {
    createLoanHigherApproverForwardTables();

    $amRole = Role::create(['name' => Role::AREA_MANAGER, 'display_name' => 'Area Manager']);
    $admfRole = Role::create(['name' => Role::ADMF, 'display_name' => 'ADMF']);

    $am = User::create([
        'name' => 'Area Manager',
        'email' => 'am-forward@test.com',
        'role_id' => $amRole->id,
        'is_active' => true,
    ]);
    $admf = User::create([
        'name' => 'ADMF User',
        'email' => 'admf-forward@test.com',
        'role_id' => $admfRole->id,
        'is_active' => true,
    ]);

    $loan = LoanApplication::create([
        'application_no' => 'LN-FWD-1',
        'status' => LoanApplication::STATUS_UNDER_REVIEW,
        'requested_amount' => 150000,
        'submitted_by' => $am->id,
    ]);

    LoanApplicationApproval::create([
        'loan_application_id' => $loan->id,
        'user_id' => $am->id,
        'level' => 'branch',
        'sequence' => 1,
        'status' => 'approved',
        'comments' => 'Forwarded to higher-level approver',
        'approved_at' => now(),
    ]);

    $amApproval = LoanApplicationApproval::create([
        'loan_application_id' => $loan->id,
        'user_id' => $am->id,
        'level' => 'area',
        'sequence' => 2,
        'status' => 'pending',
    ]);

    mockLoanForwardNotifications();

    $result = app(ApprovalService::class)->forwardLoanToApprover(
        $amApproval,
        $admf->id,
        'আরও একজনের অনুমোদন প্রয়োজন'
    );

    expect($result)->toBeTrue();

    $loan->refresh();
    $amApproval->refresh();
    $next = LoanApplicationApproval::query()
        ->where('loan_application_id', $loan->id)
        ->where('status', 'pending')
        ->first();

    expect($loan->status)->toBe(LoanApplication::STATUS_UNDER_REVIEW)
        ->and($amApproval->status)->toBe('approved')
        ->and($amApproval->comments)->toBe('আরও একজনের অনুমোদন প্রয়োজন')
        ->and($next)->not->toBeNull()
        ->and((int) $next->user_id)->toBe($admf->id)
        ->and($next->level)->toBe('escalation')
        ->and((int) $next->sequence)->toBe(3);
});

it('lets an area manager forward to another area manager', function () {
    createLoanHigherApproverForwardTables();

    $amRole = Role::create(['name' => Role::AREA_MANAGER, 'display_name' => 'Area Manager']);

    $am = User::create([
        'name' => 'Area Manager One',
        'email' => 'am-one@test.com',
        'role_id' => $amRole->id,
        'is_active' => true,
    ]);
    $otherAm = User::create([
        'name' => 'Area Manager Two',
        'email' => 'am-two@test.com',
        'role_id' => $amRole->id,
        'is_active' => true,
    ]);

    $loan = LoanApplication::create([
        'application_no' => 'LN-FWD-2',
        'status' => LoanApplication::STATUS_UNDER_REVIEW,
        'requested_amount' => 150000,
        'submitted_by' => $am->id,
    ]);

    $amApproval = LoanApplicationApproval::create([
        'loan_application_id' => $loan->id,
        'user_id' => $am->id,
        'level' => 'area',
        'sequence' => 1,
        'status' => 'pending',
    ]);

    mockLoanForwardNotifications();

    $result = app(ApprovalService::class)->forwardLoanToApprover($amApproval, $otherAm->id, 'আরেকজন এরিয়া ম্যানেজার দেখুন');

    expect($result)->toBeTrue();

    $next = LoanApplicationApproval::query()
        ->where('loan_application_id', $loan->id)
        ->where('status', 'pending')
        ->first();

    expect($amApproval->fresh()->status)->toBe('approved')
        ->and($loan->fresh()->status)->toBe(LoanApplication::STATUS_UNDER_REVIEW)
        ->and($next)->not->toBeNull()
        ->and((int) $next->user_id)->toBe($otherAm->id)
        ->and($next->level)->toBe('area');
});

it('lets admf forward to a zone manager or area manager', function () {
    createLoanHigherApproverForwardTables();

    $admfRole = Role::create(['name' => Role::ADMF, 'display_name' => 'ADMF']);
    $zmRole = Role::create(['name' => Role::ZONE_MANAGER, 'display_name' => 'Zone Manager']);
    $amRole = Role::create(['name' => Role::AREA_MANAGER, 'display_name' => 'Area Manager']);

    $admf = User::create([
        'name' => 'ADMF User',
        'email' => 'admf-any@test.com',
        'role_id' => $admfRole->id,
        'is_active' => true,
    ]);
    $zm = User::create([
        'name' => 'Zone Manager',
        'email' => 'zm-any@test.com',
        'role_id' => $zmRole->id,
        'is_active' => true,
    ]);
    $am = User::create([
        'name' => 'Area Manager',
        'email' => 'am-any@test.com',
        'role_id' => $amRole->id,
        'is_active' => true,
    ]);

    $loan = LoanApplication::create([
        'application_no' => 'LN-FWD-ADMF',
        'status' => LoanApplication::STATUS_UNDER_REVIEW,
        'requested_amount' => 150000,
        'submitted_by' => $admf->id,
    ]);

    $admfApproval = LoanApplicationApproval::create([
        'loan_application_id' => $loan->id,
        'user_id' => $admf->id,
        'level' => 'escalation',
        'sequence' => 2,
        'status' => 'pending',
    ]);

    mockLoanForwardNotifications();

    $result = app(ApprovalService::class)->forwardLoanToApprover($admfApproval, $zm->id, 'জোন ম্যানেজার দেখুন');

    expect($result)->toBeTrue();

    $next = LoanApplicationApproval::query()
        ->where('loan_application_id', $loan->id)
        ->where('status', 'pending')
        ->first();

    expect($admfApproval->fresh()->status)->toBe('approved')
        ->and($next)->not->toBeNull()
        ->and((int) $next->user_id)->toBe($zm->id)
        ->and($next->level)->toBe('zone');

    $zmApproval = $next;
    $resultToArea = app(ApprovalService::class)->forwardLoanToApprover($zmApproval, $am->id, 'এরিয়া ম্যানেজার দেখুন');

    expect($resultToArea)->toBeTrue();

    $areaPending = LoanApplicationApproval::query()
        ->where('loan_application_id', $loan->id)
        ->where('status', 'pending')
        ->first();

    expect($areaPending)->not->toBeNull()
        ->and((int) $areaPending->user_id)->toBe($am->id)
        ->and($areaPending->level)->toBe('area');
});

it('lets the executive director forward to another approver', function () {
    createLoanHigherApproverForwardTables();

    $edRole = Role::create(['name' => Role::ED, 'display_name' => 'ED']);
    $dmfRole = Role::create(['name' => Role::DMF, 'display_name' => 'DMF']);

    $ed = User::create([
        'name' => 'Executive Director',
        'email' => 'ed-forward@test.com',
        'role_id' => $edRole->id,
        'is_active' => true,
    ]);
    $dmf = User::create([
        'name' => 'DMF User',
        'email' => 'dmf-lower@test.com',
        'role_id' => $dmfRole->id,
        'is_active' => true,
    ]);

    $loan = LoanApplication::create([
        'application_no' => 'LN-FWD-ED',
        'status' => LoanApplication::STATUS_UNDER_REVIEW,
        'requested_amount' => 150000,
        'submitted_by' => $ed->id,
    ]);

    $edApproval = LoanApplicationApproval::create([
        'loan_application_id' => $loan->id,
        'user_id' => $ed->id,
        'level' => 'escalation',
        'sequence' => 2,
        'status' => 'pending',
    ]);

    mockLoanForwardNotifications();

    $result = app(ApprovalService::class)->forwardLoanToApprover($edApproval, $dmf->id, 'DMF দেখুন');

    expect($result)->toBeTrue();

    $next = LoanApplicationApproval::query()
        ->where('loan_application_id', $loan->id)
        ->where('status', 'pending')
        ->first();

    expect($edApproval->fresh()->status)->toBe('approved')
        ->and($next)->not->toBeNull()
        ->and((int) $next->user_id)->toBe($dmf->id)
        ->and($next->level)->toBe('escalation');
});

it('does not forward a pending amount-change approval', function () {
    createLoanHigherApproverForwardTables();

    $amRole = Role::create(['name' => Role::AREA_MANAGER, 'display_name' => 'Area Manager']);
    $admfRole = Role::create(['name' => Role::ADMF, 'display_name' => 'ADMF']);

    $am = User::create([
        'name' => 'Area Manager',
        'email' => 'am-amount@test.com',
        'role_id' => $amRole->id,
        'is_active' => true,
    ]);
    $admf = User::create([
        'name' => 'ADMF User',
        'email' => 'admf-amount@test.com',
        'role_id' => $admfRole->id,
        'is_active' => true,
    ]);

    $loan = LoanApplication::create([
        'application_no' => 'LN-FWD-AMT',
        'status' => LoanApplication::STATUS_PENDING_AMOUNT_APPROVAL,
        'requested_amount' => 150000,
        'approved_amount' => 120000,
        'pending_approved_amount' => 130000,
    ]);

    $amApproval = LoanApplicationApproval::create([
        'loan_application_id' => $loan->id,
        'user_id' => $am->id,
        'level' => 'area',
        'sequence' => 2,
        'status' => 'pending',
    ]);

    $result = app(ApprovalService::class)->forwardLoanToApprover($amApproval, $admf->id);

    expect($result)->toBeFalse()
        ->and($amApproval->fresh()->status)->toBe('pending');
});

it('moves the linked team based review when a higher approver forwards', function () {
    createLoanHigherApproverForwardTables();

    $amRole = Role::create(['name' => Role::AREA_MANAGER, 'display_name' => 'Area Manager']);
    $admfRole = Role::create(['name' => Role::ADMF, 'display_name' => 'ADMF']);

    $am = User::create([
        'name' => 'Area Manager',
        'email' => 'am-tba@test.com',
        'role_id' => $amRole->id,
        'is_active' => true,
    ]);
    $admf = User::create([
        'name' => 'ADMF User',
        'email' => 'admf-tba@test.com',
        'role_id' => $admfRole->id,
        'is_active' => true,
    ]);

    $loan = LoanApplication::create([
        'application_no' => 'LN-FWD-TBA',
        'status' => LoanApplication::STATUS_UNDER_REVIEW,
        'requested_amount' => 150000,
        'submitted_by' => $am->id,
    ]);

    $amApproval = LoanApplicationApproval::create([
        'loan_application_id' => $loan->id,
        'user_id' => $am->id,
        'level' => 'area',
        'sequence' => 2,
        'status' => 'pending',
    ]);

    $tba = TeamBasedApproval::create([
        'loan_application_id' => $loan->id,
        'created_by' => $am->id,
        'sheet_date' => now()->toDateString(),
        'area_manager_id' => $am->id,
        'status' => 'pending',
    ]);

    $item = new TeamBasedApprovalItem([
        'serial_no' => 1,
        'member_name' => 'Test Member',
        'member_code' => 'M-1',
        'proposed_loan_amount' => '150000',
    ]);
    $tba->items()->save($item);

    $review = TeamBasedApprovalReview::create([
        'team_based_approval_id' => $tba->id,
        'team_based_approval_item_id' => $item->id,
        'user_id' => $am->id,
        'level' => Role::AREA_MANAGER,
        'status' => 'pending',
    ]);

    mockLoanForwardNotifications();

    $result = app(ApprovalService::class)->forwardLoanToApprover($amApproval, $admf->id, 'ADMF দেখুন');

    expect($result)->toBeTrue();

    $review->refresh();
    $tba->refresh();
    $nextReview = TeamBasedApprovalReview::query()
        ->where('team_based_approval_id', $tba->id)
        ->where('user_id', $admf->id)
        ->where('status', 'pending')
        ->first();

    expect($review->status)->toBe('forwarded')
        ->and($tba->status)->toBe('pending')
        ->and((int) $tba->admf_id)->toBe($admf->id)
        ->and($nextReview)->not->toBeNull();
});

it('approves the linked team based sheet when a higher approver approves the loan', function () {
    createLoanHigherApproverForwardTables();

    $amRole = Role::create(['name' => Role::AREA_MANAGER, 'display_name' => 'Area Manager']);

    $am = User::create([
        'name' => 'Area Manager',
        'email' => 'am-loan-approve@test.com',
        'role_id' => $amRole->id,
        'is_active' => true,
    ]);

    $loan = LoanApplication::create([
        'application_no' => 'LN-APR-TBA',
        'status' => LoanApplication::STATUS_UNDER_REVIEW,
        'requested_amount' => 150000,
        'submitted_by' => $am->id,
    ]);

    $amApproval = LoanApplicationApproval::create([
        'loan_application_id' => $loan->id,
        'user_id' => $am->id,
        'level' => 'area',
        'sequence' => 2,
        'status' => 'pending',
    ]);

    $tba = TeamBasedApproval::create([
        'loan_application_id' => $loan->id,
        'created_by' => $am->id,
        'sheet_date' => now()->toDateString(),
        'area_manager_id' => $am->id,
        'status' => 'pending',
    ]);

    $item = new TeamBasedApprovalItem([
        'serial_no' => 1,
        'member_name' => 'Test Member',
        'member_code' => 'M-APR',
        'proposed_loan_amount' => '150000',
    ]);
    $tba->items()->save($item);

    $review = TeamBasedApprovalReview::create([
        'team_based_approval_id' => $tba->id,
        'team_based_approval_item_id' => $item->id,
        'user_id' => $am->id,
        'level' => Role::AREA_MANAGER,
        'status' => 'pending',
    ]);

    $service = app(ApprovalService::class);

    mockLoanForwardNotifications();

    $result = $service->approveLoan($amApproval, 'ঋণ অনুমোদন করুন', 150000);

    expect($result)->toBeTrue();

    $loan->refresh();
    $review->refresh();
    $tba->refresh();
    $item->refresh();

    expect($loan->status)->toBe(LoanApplication::STATUS_READY_FOR_HEAD_OFFICE)
        ->and((int) $loan->approved_amount)->toBe(150000)
        ->and($amApproval->fresh()->status)->toBe('approved')
        ->and($review->status)->toBe('approved')
        ->and((int) $review->approved_amount)->toBe(150000)
        ->and($tba->status)->toBe('approved')
        ->and((int) $tba->approved_total_amount)->toBe(150000)
        ->and((int) $item->approved_amount)->toBe(150000);
});

it('rejects the linked team based sheet when a higher approver rejects the loan', function () {
    createLoanHigherApproverForwardTables();

    $amRole = Role::create(['name' => Role::AREA_MANAGER, 'display_name' => 'Area Manager']);

    $am = User::create([
        'name' => 'Area Manager',
        'email' => 'am-loan-reject@test.com',
        'role_id' => $amRole->id,
        'is_active' => true,
    ]);

    $loan = LoanApplication::create([
        'application_no' => 'LN-REJ-TBA',
        'status' => LoanApplication::STATUS_UNDER_REVIEW,
        'requested_amount' => 150000,
        'submitted_by' => $am->id,
    ]);

    $amApproval = LoanApplicationApproval::create([
        'loan_application_id' => $loan->id,
        'user_id' => $am->id,
        'level' => 'area',
        'sequence' => 2,
        'status' => 'pending',
    ]);

    $tba = TeamBasedApproval::create([
        'loan_application_id' => $loan->id,
        'created_by' => $am->id,
        'sheet_date' => now()->toDateString(),
        'area_manager_id' => $am->id,
        'status' => 'pending',
    ]);

    $item = new TeamBasedApprovalItem([
        'serial_no' => 1,
        'member_name' => 'Test Member',
        'member_code' => 'M-REJ',
        'proposed_loan_amount' => '150000',
    ]);
    $tba->items()->save($item);

    $review = TeamBasedApprovalReview::create([
        'team_based_approval_id' => $tba->id,
        'team_based_approval_item_id' => $item->id,
        'user_id' => $am->id,
        'level' => Role::AREA_MANAGER,
        'status' => 'waiting',
    ]);

    mockLoanForwardNotifications();

    $result = app(ApprovalService::class)->rejectLoan($amApproval, 'প্রয়োজন নেই');

    expect($result)->toBeTrue();

    $loan->refresh();
    $review->refresh();
    $tba->refresh();

    expect($loan->status)->toBe(LoanApplication::STATUS_REJECTED)
        ->and($review->status)->toBe('rejected')
        ->and($tba->status)->toBe('rejected');
});
