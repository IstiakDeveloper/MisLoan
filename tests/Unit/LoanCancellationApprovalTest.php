<?php

use App\Models\LoanApplication;
use App\Models\LoanApplicationApproval;
use App\Models\Role;
use App\Models\User;
use App\Services\ApprovalService;
use App\Services\NotificationService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

function createLoanCancellationTables(): void
{
    if (DB::connection()->getDriverName() === 'sqlite') {
        DB::connection()->getPdo()->sqliteCreateFunction('REGEXP', function ($pattern, $value) {
            return (int) (preg_match('/'.$pattern.'/', (string) $value) === 1);
        });
    }

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
        $table->string('status')->default('awaiting_takeup');
        $table->decimal('requested_amount', 12, 2)->default(0);
        $table->decimal('approved_amount', 12, 2)->nullable();
        $table->text('cancellation_reason')->nullable();
        $table->unsignedBigInteger('cancellation_requested_by')->nullable();
        $table->timestamp('cancellation_requested_at')->nullable();
        $table->string('cancellation_from_status', 40)->nullable();
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
}

function mockCancellationNotifications(): void
{
    $notificationMock = Mockery::mock(NotificationService::class);
    $notificationMock->shouldReceive('send')->atLeast()->once();
    app()->instance(NotificationService::class, $notificationMock);
}

it('sends a cancellation request from awaiting take-up to the branch manager who approved', function () {
    createLoanCancellationTables();

    $bmRole = Role::create(['name' => Role::BRANCH_MANAGER, 'display_name' => 'Branch Manager']);
    $buRole = Role::create(['name' => Role::BRANCH_USER, 'display_name' => 'Branch User']);

    $bm = User::create([
        'name' => 'Branch Manager',
        'email' => 'bm-cancel@test.com',
        'role_id' => $bmRole->id,
        'is_active' => true,
    ]);
    $accountant = User::create([
        'name' => 'Accountant',
        'email' => 'acc-cancel@test.com',
        'role_id' => $buRole->id,
        'is_active' => true,
    ]);

    $loan = LoanApplication::create([
        'application_no' => 'LN-CAN-BM',
        'status' => LoanApplication::STATUS_AWAITING_TAKEUP,
        'requested_amount' => 15000,
        'approved_amount' => 15000,
        'submitted_by' => $accountant->id,
    ]);

    LoanApplicationApproval::create([
        'loan_application_id' => $loan->id,
        'user_id' => $bm->id,
        'level' => 'branch',
        'sequence' => 1,
        'status' => 'approved',
        'approved_at' => now(),
    ]);

    mockCancellationNotifications();

    app(ApprovalService::class)->requestLoanCancellation($loan, $accountant, 'সদস্য আর ঋণ নেবেন না');

    $loan->refresh();
    expect($loan->status)->toBe(LoanApplication::STATUS_PENDING_CANCELLATION)
        ->and($loan->cancellation_reason)->toBe('সদস্য আর ঋণ নেবেন না')
        ->and((int) $loan->cancellation_requested_by)->toBe($accountant->id)
        ->and($loan->canBeDisbursed())->toBeFalse()
        ->and($loan->canRequestCancellation())->toBeFalse();

    $pending = LoanApplicationApproval::query()
        ->where('loan_application_id', $loan->id)
        ->where('status', 'pending')
        ->first();

    expect($pending)->not->toBeNull()
        ->and((int) $pending->user_id)->toBe($bm->id)
        ->and($pending->level)->toBe('branch')
        ->and((int) $pending->sequence)->toBe(2);

    $inbox = app(ApprovalService::class)->getPendingLoanApprovalsForUser($bm);
    expect($inbox->pluck('loan_application_id')->all())->toContain($loan->id);
});

it('sends a cancellation request to the area manager when they gave the final approval', function () {
    createLoanCancellationTables();

    $bmRole = Role::create(['name' => Role::BRANCH_MANAGER, 'display_name' => 'Branch Manager']);
    $rmRole = Role::create(['name' => Role::AREA_MANAGER, 'display_name' => 'Area Manager']);
    $buRole = Role::create(['name' => Role::BRANCH_USER, 'display_name' => 'Branch User']);

    $bm = User::create([
        'name' => 'Branch Manager',
        'email' => 'bm-cancel-rm@test.com',
        'role_id' => $bmRole->id,
        'is_active' => true,
    ]);
    $rm = User::create([
        'name' => 'Area Manager',
        'email' => 'rm-cancel@test.com',
        'role_id' => $rmRole->id,
        'is_active' => true,
    ]);
    $accountant = User::create([
        'name' => 'Accountant',
        'email' => 'acc-cancel-rm@test.com',
        'role_id' => $buRole->id,
        'is_active' => true,
    ]);

    $loan = LoanApplication::create([
        'application_no' => 'LN-CAN-RM',
        'status' => LoanApplication::STATUS_AWAITING_TAKEUP,
        'requested_amount' => 80000,
        'approved_amount' => 80000,
        'submitted_by' => $accountant->id,
    ]);

    LoanApplicationApproval::create([
        'loan_application_id' => $loan->id,
        'user_id' => $bm->id,
        'level' => 'branch',
        'sequence' => 1,
        'status' => 'approved',
        'comments' => 'Forwarded to higher-level approver',
        'approved_at' => now()->subDay(),
    ]);

    LoanApplicationApproval::create([
        'loan_application_id' => $loan->id,
        'user_id' => $rm->id,
        'level' => 'area',
        'sequence' => 2,
        'status' => 'approved',
        'approved_at' => now(),
    ]);

    mockCancellationNotifications();

    app(ApprovalService::class)->requestLoanCancellation($loan, $accountant, 'সদস্য এলাকা ছেড়ে গেছেন');

    $pending = LoanApplicationApproval::query()
        ->where('loan_application_id', $loan->id)
        ->where('status', 'pending')
        ->first();

    expect($pending)->not->toBeNull()
        ->and((int) $pending->user_id)->toBe($rm->id)
        ->and($pending->level)->toBe('area');

    $rmInbox = app(ApprovalService::class)->getPendingLoanApprovalsForUser($rm);
    $bmInbox = app(ApprovalService::class)->getPendingLoanApprovalsForUser($bm);

    expect($rmInbox->pluck('id')->all())->toContain($pending->id)
        ->and($bmInbox->pluck('id')->all())->not->toContain($pending->id);
});

it('cancels the loan when the approver accepts the cancellation request', function () {
    createLoanCancellationTables();

    $bmRole = Role::create(['name' => Role::BRANCH_MANAGER, 'display_name' => 'Branch Manager']);
    $bm = User::create([
        'name' => 'Branch Manager',
        'email' => 'bm-cancel-yes@test.com',
        'role_id' => $bmRole->id,
        'is_active' => true,
    ]);
    $accountant = User::create([
        'name' => 'Accountant',
        'email' => 'acc-cancel-yes@test.com',
        'role_id' => Role::create(['name' => Role::BRANCH_USER, 'display_name' => 'Branch User'])->id,
        'is_active' => true,
    ]);

    $loan = LoanApplication::create([
        'application_no' => 'LN-CAN-YES',
        'status' => LoanApplication::STATUS_PENDING_CANCELLATION,
        'requested_amount' => 20000,
        'approved_amount' => 20000,
        'cancellation_reason' => 'সদস্য নিচ্ছেন না',
        'cancellation_requested_by' => $accountant->id,
        'cancellation_requested_at' => now(),
        'submitted_by' => $accountant->id,
    ]);

    LoanApplicationApproval::create([
        'loan_application_id' => $loan->id,
        'user_id' => $bm->id,
        'level' => 'branch',
        'sequence' => 1,
        'status' => 'approved',
        'approved_at' => now()->subDay(),
    ]);

    $pending = LoanApplicationApproval::create([
        'loan_application_id' => $loan->id,
        'user_id' => $bm->id,
        'level' => 'branch',
        'sequence' => 2,
        'status' => 'pending',
    ]);

    mockCancellationNotifications();

    $result = app(ApprovalService::class)->approveLoan($pending, 'বাতিল ঠিক আছে');

    $loan->refresh();
    $pending->refresh();

    expect($result)->toBeTrue()
        ->and($loan->status)->toBe(LoanApplication::STATUS_CANCELLED)
        ->and($pending->status)->toBe('approved')
        ->and((float) $loan->approved_amount)->toBe(20000.0);
});

it('returns the loan to awaiting take-up when the approver rejects the cancellation', function () {
    createLoanCancellationTables();

    $rmRole = Role::create(['name' => Role::AREA_MANAGER, 'display_name' => 'Area Manager']);
    $rm = User::create([
        'name' => 'Area Manager',
        'email' => 'rm-cancel-no@test.com',
        'role_id' => $rmRole->id,
        'is_active' => true,
    ]);
    $accountant = User::create([
        'name' => 'Accountant',
        'email' => 'acc-cancel-no@test.com',
        'role_id' => Role::create(['name' => Role::BRANCH_USER, 'display_name' => 'Branch User'])->id,
        'is_active' => true,
    ]);

    $loan = LoanApplication::create([
        'application_no' => 'LN-CAN-NO',
        'status' => LoanApplication::STATUS_PENDING_CANCELLATION,
        'requested_amount' => 25000,
        'approved_amount' => 25000,
        'cancellation_reason' => 'ভুল অনুরোধ',
        'cancellation_requested_by' => $accountant->id,
        'cancellation_requested_at' => now(),
        'submitted_by' => $accountant->id,
    ]);

    LoanApplicationApproval::create([
        'loan_application_id' => $loan->id,
        'user_id' => $rm->id,
        'level' => 'area',
        'sequence' => 1,
        'status' => 'approved',
        'approved_at' => now()->subDay(),
    ]);

    $pending = LoanApplicationApproval::create([
        'loan_application_id' => $loan->id,
        'user_id' => $rm->id,
        'level' => 'area',
        'sequence' => 2,
        'status' => 'pending',
    ]);

    mockCancellationNotifications();

    $result = app(ApprovalService::class)->rejectLoan($pending, 'এখনো নেবেন');

    $loan->refresh();
    $pending->refresh();

    expect($result)->toBeTrue()
        ->and($loan->status)->toBe(LoanApplication::STATUS_AWAITING_TAKEUP)
        ->and($loan->status)->not->toBe(LoanApplication::STATUS_REJECTED)
        ->and($loan->cancellation_reason)->toBeNull()
        ->and($loan->cancellation_requested_by)->toBeNull()
        ->and($pending->status)->toBe('rejected')
        ->and($loan->canRequestCancellation())->toBeTrue();
});

it('refuses a cancellation request unless the loan is awaiting take-up', function () {
    createLoanCancellationTables();

    $bm = User::create([
        'name' => 'Branch Manager',
        'email' => 'bm-cancel-bad@test.com',
        'role_id' => Role::create(['name' => Role::BRANCH_MANAGER, 'display_name' => 'Branch Manager'])->id,
        'is_active' => true,
    ]);
    $accountant = User::create([
        'name' => 'Accountant',
        'email' => 'acc-cancel-bad@test.com',
        'role_id' => Role::create(['name' => Role::BRANCH_USER, 'display_name' => 'Branch User'])->id,
        'is_active' => true,
    ]);

    $loan = LoanApplication::create([
        'application_no' => 'LN-CAN-BAD',
        'status' => LoanApplication::STATUS_PENDING_DISBURSEMENT,
        'requested_amount' => 10000,
        'approved_amount' => 10000,
        'submitted_by' => $accountant->id,
    ]);

    LoanApplicationApproval::create([
        'loan_application_id' => $loan->id,
        'user_id' => $bm->id,
        'level' => 'branch',
        'sequence' => 1,
        'status' => 'approved',
        'approved_at' => now(),
    ]);

    expect(fn () => app(ApprovalService::class)->requestLoanCancellation($loan, $accountant, 'এখন বাতিল'))
        ->toThrow(Exception::class, 'পরে নেবে');

    expect($loan->fresh()->status)->toBe(LoanApplication::STATUS_PENDING_DISBURSEMENT)
        ->and(LoanApplicationApproval::query()->where('status', 'pending')->count())->toBe(0);
});

it('accepts a cancellation from head office pending and returns there if rejected', function () {
    createLoanCancellationTables();

    $bm = User::create([
        'name' => 'Branch Manager',
        'email' => 'bm-cancel-ho@test.com',
        'role_id' => Role::create(['name' => Role::BRANCH_MANAGER, 'display_name' => 'Branch Manager'])->id,
        'is_active' => true,
    ]);
    $accountant = User::create([
        'name' => 'Accountant',
        'email' => 'acc-cancel-ho@test.com',
        'role_id' => Role::create(['name' => Role::BRANCH_USER, 'display_name' => 'Branch User'])->id,
        'is_active' => true,
    ]);

    $loan = LoanApplication::create([
        'application_no' => 'LN-CAN-HO',
        'status' => LoanApplication::STATUS_PENDING_HEAD_OFFICE,
        'requested_amount' => 18000,
        'approved_amount' => 18000,
        'submitted_by' => $accountant->id,
    ]);

    LoanApplicationApproval::create([
        'loan_application_id' => $loan->id,
        'user_id' => $bm->id,
        'level' => 'branch',
        'sequence' => 1,
        'status' => 'approved',
        'approved_at' => now(),
    ]);

    mockCancellationNotifications();

    app(ApprovalService::class)->requestLoanCancellation($loan, $accountant, 'হেড অফিসে থাকতে বাতিল');

    $loan->refresh();
    expect($loan->status)->toBe(LoanApplication::STATUS_PENDING_CANCELLATION)
        ->and($loan->cancellation_from_status)->toBe(LoanApplication::STATUS_PENDING_HEAD_OFFICE)
        ->and($loan->isHoPendingCancellation())->toBeTrue();

    $pending = LoanApplicationApproval::query()
        ->where('loan_application_id', $loan->id)
        ->where('status', 'pending')
        ->first();

    expect($pending)->not->toBeNull()
        ->and((int) $pending->user_id)->toBe($bm->id);

    app(ApprovalService::class)->rejectLoan($pending, 'হেড অফিসেই থাক');

    $loan->refresh();
    expect($loan->status)->toBe(LoanApplication::STATUS_PENDING_HEAD_OFFICE)
        ->and($loan->cancellation_from_status)->toBeNull()
        ->and($loan->cancellation_reason)->toBeNull();
});
