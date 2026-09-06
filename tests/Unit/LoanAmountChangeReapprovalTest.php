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

function createLoanAmountChangeTables(): void
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
        $table->string('status')->default('pending_disbursement');
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
}

it('sends a changed approved amount back to the original approver', function () {
    createLoanAmountChangeTables();

    $bmRole = Role::create(['name' => Role::BRANCH_MANAGER, 'display_name' => 'Branch Manager']);
    $buRole = Role::create(['name' => Role::BRANCH_USER, 'display_name' => 'Branch User']);

    $bm = User::create([
        'name' => 'Branch Manager',
        'email' => 'bm-amount@test.com',
        'role_id' => $bmRole->id,
        'is_active' => true,
    ]);
    $accountant = User::create([
        'name' => 'Accountant',
        'email' => 'acc-amount@test.com',
        'role_id' => $buRole->id,
        'is_active' => true,
    ]);

    $loan = LoanApplication::create([
        'application_no' => 'LN-CHG-1',
        'status' => LoanApplication::STATUS_PENDING_DISBURSEMENT,
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

    $notificationMock = Mockery::mock(NotificationService::class);
    $notificationMock->shouldReceive('send')->atLeast()->once();
    app()->instance(NotificationService::class, $notificationMock);

    app(ApprovalService::class)->requestLoanAmountChange($loan, $accountant, 12000);

    $loan->refresh();
    expect($loan->status)->toBe(LoanApplication::STATUS_PENDING_AMOUNT_APPROVAL)
        ->and((float) $loan->pending_approved_amount)->toBe(12000.0)
        ->and((float) $loan->approved_amount)->toBe(15000.0)
        ->and($loan->canBeDisbursed())->toBeFalse();

    $pending = LoanApplicationApproval::query()
        ->where('loan_application_id', $loan->id)
        ->where('status', 'pending')
        ->first();

    expect($pending)->not->toBeNull()
        ->and((int) $pending->user_id)->toBe($bm->id)
        ->and((int) $pending->sequence)->toBe(2);
});

it('sends a changed amount to the forwarded final approver not the branch manager', function () {
    createLoanAmountChangeTables();

    $bmRole = Role::create(['name' => Role::BRANCH_MANAGER, 'display_name' => 'Branch Manager']);
    $admfRole = Role::create(['name' => Role::ADMF, 'display_name' => 'ADMF']);
    $buRole = Role::create(['name' => Role::BRANCH_USER, 'display_name' => 'Branch User']);

    $bm = User::create([
        'name' => 'Branch Manager',
        'email' => 'bm-forward@test.com',
        'role_id' => $bmRole->id,
        'is_active' => true,
    ]);
    $admf = User::create([
        'name' => 'ADMF Approver',
        'email' => 'admf-forward@test.com',
        'role_id' => $admfRole->id,
        'is_active' => true,
    ]);
    $accountant = User::create([
        'name' => 'Accountant',
        'email' => 'acc-forward@test.com',
        'role_id' => $buRole->id,
        'is_active' => true,
    ]);

    $loan = LoanApplication::create([
        'application_no' => 'LN-CHG-FWD',
        'status' => LoanApplication::STATUS_PENDING_DISBURSEMENT,
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
        'user_id' => $admf->id,
        'level' => 'escalation',
        'sequence' => 2,
        'status' => 'approved',
        'approved_at' => now(),
    ]);

    $notificationMock = Mockery::mock(NotificationService::class);
    $notificationMock->shouldReceive('send')->atLeast()->once();
    app()->instance(NotificationService::class, $notificationMock);

    $final = app(ApprovalService::class)->lastLoanAmountApproval($loan);
    expect($final)->not->toBeNull()
        ->and((int) $final->user_id)->toBe($admf->id)
        ->and($final->level)->toBe('escalation');

    app(ApprovalService::class)->requestLoanAmountChange($loan, $accountant, 75000);

    $pending = LoanApplicationApproval::query()
        ->where('loan_application_id', $loan->id)
        ->where('status', 'pending')
        ->first();

    expect($pending)->not->toBeNull()
        ->and((int) $pending->user_id)->toBe($admf->id)
        ->and($pending->level)->toBe('escalation');
});

it('applies the new approved amount after the original approver confirms', function () {
    createLoanAmountChangeTables();

    $bmRole = Role::create(['name' => Role::BRANCH_MANAGER, 'display_name' => 'Branch Manager']);
    $bm = User::create([
        'name' => 'Branch Manager',
        'email' => 'bm-confirm@test.com',
        'role_id' => $bmRole->id,
        'is_active' => true,
    ]);
    $accountant = User::create([
        'name' => 'Accountant',
        'email' => 'acc-confirm@test.com',
        'role_id' => Role::create(['name' => Role::BRANCH_USER, 'display_name' => 'Branch User'])->id,
        'is_active' => true,
    ]);

    $loan = LoanApplication::create([
        'application_no' => 'LN-CHG-2',
        'status' => LoanApplication::STATUS_PENDING_AMOUNT_APPROVAL,
        'requested_amount' => 20000,
        'approved_amount' => 20000,
        'pending_approved_amount' => 18000,
        'amount_change_requested_by' => $accountant->id,
        'amount_change_requested_at' => now(),
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

    $notificationMock = Mockery::mock(NotificationService::class);
    $notificationMock->shouldReceive('send')->atLeast()->once();
    app()->instance(NotificationService::class, $notificationMock);

    $result = app(ApprovalService::class)->approveLoan($pending, 'নতুন পরিমাণ ঠিক আছে', 18000);

    $loan->refresh();
    expect($result)->toBeTrue()
        ->and($loan->status)->toBe(LoanApplication::STATUS_PENDING_DISBURSEMENT)
        ->and((float) $loan->approved_amount)->toBe(18000.0)
        ->and($loan->pending_approved_amount)->toBeNull()
        ->and($loan->canBeDisbursed())->toBeTrue();
});

it('keeps the old approved amount when the amount change is rejected', function () {
    createLoanAmountChangeTables();

    $bmRole = Role::create(['name' => Role::BRANCH_MANAGER, 'display_name' => 'Branch Manager']);
    $bm = User::create([
        'name' => 'Branch Manager',
        'email' => 'bm-reject@test.com',
        'role_id' => $bmRole->id,
        'is_active' => true,
    ]);
    $accountant = User::create([
        'name' => 'Accountant',
        'email' => 'acc-reject@test.com',
        'role_id' => Role::create(['name' => Role::BRANCH_USER, 'display_name' => 'Branch User'])->id,
        'is_active' => true,
    ]);

    $loan = LoanApplication::create([
        'application_no' => 'LN-CHG-3',
        'status' => LoanApplication::STATUS_PENDING_AMOUNT_APPROVAL,
        'requested_amount' => 25000,
        'approved_amount' => 25000,
        'pending_approved_amount' => 22000,
        'amount_change_requested_by' => $accountant->id,
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

    $notificationMock = Mockery::mock(NotificationService::class);
    $notificationMock->shouldReceive('send')->atLeast()->once();
    app()->instance(NotificationService::class, $notificationMock);

    $result = app(ApprovalService::class)->rejectLoan($pending, 'পরিমাণ কমানো যাবে না');

    $loan->refresh();
    expect($result)->toBeTrue()
        ->and($loan->status)->toBe(LoanApplication::STATUS_PENDING_DISBURSEMENT)
        ->and((float) $loan->approved_amount)->toBe(25000.0)
        ->and($loan->pending_approved_amount)->toBeNull();
});
