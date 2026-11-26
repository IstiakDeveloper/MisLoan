<?php

use App\Models\Area;
use App\Models\Branch;
use App\Models\LoanAccount;
use App\Models\LoanProduct;
use App\Models\MemberAdmission;
use App\Models\Role;
use App\Models\SavingsProduct;
use App\Models\User;
use App\Models\Zone;
use App\Services\Accounting\FinancialReportsService;
use App\Services\Accounting\PostingDefaults;
use App\Services\AccountingPeriodService;
use App\Services\Cash\CashDesk;
use App\Services\Loans\LoanLedgerService;
use App\Services\Savings\SavingsLedgerService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

beforeEach(function () {
    Schema::create('zones', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->string('code')->nullable();
        $table->boolean('is_active')->default(true);
        $table->timestamps();
        $table->softDeletes();
    });
    Schema::create('areas', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('zone_id')->nullable();
        $table->string('name');
        $table->string('code')->nullable();
        $table->boolean('is_active')->default(true);
        $table->timestamps();
        $table->softDeletes();
    });
    Schema::create('branches', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('area_id')->nullable();
        $table->string('name');
        $table->string('code')->nullable();
        $table->boolean('is_active')->default(true);
        $table->timestamps();
        $table->softDeletes();
    });
    Schema::create('roles', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->string('display_name')->nullable();
        $table->text('permissions')->nullable();
        $table->timestamps();
    });
    Schema::create('users', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->string('username')->nullable();
        $table->string('email')->unique();
        $table->timestamp('email_verified_at')->nullable();
        $table->string('password');
        $table->text('two_factor_secret')->nullable();
        $table->text('two_factor_recovery_codes')->nullable();
        $table->timestamp('two_factor_confirmed_at')->nullable();
        $table->unsignedBigInteger('role_id')->nullable();
        $table->unsignedBigInteger('branch_id')->nullable();
        $table->unsignedBigInteger('area_id')->nullable();
        $table->unsignedBigInteger('zone_id')->nullable();
        $table->boolean('has_all_access')->default(false);
        $table->boolean('is_active')->default(true);
        $table->boolean('is_blocked')->default(false);
        $table->string('account_type')->default('staff');
        $table->rememberToken();
        $table->timestamps();
        $table->softDeletes();
    });
    Schema::create('samities', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('branch_id');
        $table->string('samity_name');
        $table->timestamps();
        $table->softDeletes();
    });
    Schema::create('member_admissions', function (Blueprint $table) {
        $table->id();
        $table->string('application_no')->nullable();
        $table->unsignedBigInteger('branch_id');
        $table->unsignedBigInteger('samity_id')->nullable();
        $table->string('applicant_name_bn')->nullable();
        $table->string('applicant_name_en')->nullable();
        $table->string('member_code')->nullable();
        $table->string('status')->default('approved');
        $table->timestamps();
        $table->softDeletes();
    });
    Schema::create('loan_products', function (Blueprint $table) {
        $table->id();
        $table->string('product_name');
        $table->string('product_code')->nullable();
        $table->timestamps();
    });
    Schema::create('savings_products', function (Blueprint $table) {
        $table->id();
        $table->string('product_name');
        $table->string('product_code')->nullable();
        $table->timestamps();
    });
    Schema::create('loan_applications', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('branch_id');
        $table->string('status')->default('draft');
        $table->decimal('disbursed_amount', 15, 2)->default(0);
        $table->timestamp('disbursed_at')->nullable();
        $table->timestamps();
        $table->softDeletes();
    });
    Schema::create('savings_applications', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('branch_id');
        $table->string('status')->default('draft');
        $table->timestamps();
    });

    (require database_path('migrations/2026_11_25_181000_create_accounting_period_tables.php'))->up();
    (require database_path('migrations/2026_11_25_184000_make_period_reopen_logs_branch_nullable.php'))->up();
    (require database_path('migrations/2026_11_25_190000_create_accounting_core_tables.php'))->up();
    (require database_path('migrations/2026_11_25_200000_create_cash_desk_tables.php'))->up();
    (require database_path('migrations/2026_11_25_210000_create_loan_subledger_tables.php'))->up();
    (require database_path('migrations/2026_11_25_220000_create_savings_subledger_tables.php'))->up();
});

function setupFullMfiContext(): array
{
    $hoRole = Role::create(['name' => Role::HEAD_OFFICE, 'display_name' => 'Head Office', 'permissions' => []]);
    $bmRole = Role::create(['name' => Role::BRANCH_MANAGER, 'display_name' => 'Branch Manager', 'permissions' => []]);
    $buRole = Role::create(['name' => Role::BRANCH_USER, 'display_name' => 'Branch User', 'permissions' => []]);

    $zone = Zone::create(['name' => 'Zone 1', 'code' => 'Z1']);
    $area = Area::create(['zone_id' => $zone->id, 'name' => 'Area 1', 'code' => 'A1']);
    $branch = Branch::create(['area_id' => $area->id, 'name' => 'Branch 1', 'code' => 'B001', 'is_active' => true]);

    $ho = User::factory()->create(['role_id' => $hoRole->id, 'has_all_access' => true, 'is_active' => true]);
    $maker = User::factory()->create(['role_id' => $buRole->id, 'branch_id' => $branch->id, 'is_active' => true]);
    $checker = User::factory()->create(['role_id' => $bmRole->id, 'branch_id' => $branch->id, 'is_active' => true]);

    $member = MemberAdmission::create(['application_no' => 'APP-001', 'branch_id' => $branch->id, 'applicant_name_en' => 'Rahim', 'member_code' => 'M001', 'status' => 'approved']);
    $loanProduct = LoanProduct::create(['product_name' => 'Jagoron', 'product_code' => 'JAG']);
    $savingsProduct = SavingsProduct::create(['product_name' => 'General Savings', 'product_code' => 'GS']);

    $periods = app(AccountingPeriodService::class);
    $fy = $periods->openFinancialYear(2026, $ho->id);
    $periods->setBranchDayInitial($fy->id, $branch->id, '2026-11-25', $ho->id);
    $periods->startWorkProcess($branch->id, '2026-11-25', $maker->id);

    app(PostingDefaults::class)->seedStandardChartOfAccounts($ho->id);

    return compact('ho', 'maker', 'checker', 'branch', 'member', 'loanProduct', 'savingsProduct');
}

it('enforces cash desk session reconciliation before day close', function () {
    ['maker' => $maker, 'checker' => $checker, 'branch' => $branch] = setupFullMfiContext();
    $cashDesk = app(CashDesk::class);
    $periods = app(AccountingPeriodService::class);

    $session = $cashDesk->openSession($branch->id, '2026-11-25', 100_000, $maker->id);

    // Day close blocked while cash session is open
    expect(fn () => $periods->completeWorkProcess($branch->id, '2026-11-25', null, $checker->id))
        ->toThrow(ValidationException::class);

    $cashDesk->submitSession($session->id, 100_000, 'Exact count', $maker->id);
    $approved = $cashDesk->reviewSession($session->id, true, 'Verified', $checker->id);
    expect($approved->status)->toBe('approved');

    // Now Day Close succeeds
    $closed = $periods->completeWorkProcess($branch->id, '2026-11-25', null, $checker->id);
    expect($closed->status)->toBe('closed');
});

it('handles loan disbursement, schedule, collection, correction, and savings ledger with balanced gl', function () {
    ['ho' => $ho, 'maker' => $maker, 'checker' => $checker, 'branch' => $branch, 'member' => $member, 'loanProduct' => $loanProduct, 'savingsProduct' => $savingsProduct] = setupFullMfiContext();

    $loanLedger = app(LoanLedgerService::class);
    $savingsLedger = app(SavingsLedgerService::class);
    $reports = app(FinancialReportsService::class);
    $periods = app(AccountingPeriodService::class);

    // 1. Disburse 10,000.00 BDT loan (10 installments, 10% flat)
    $loanAcc = $loanLedger->createAndDisburse(
        $branch->id,
        $member->id,
        $loanProduct->id,
        1_000_000,
        10.0,
        10,
        'flat',
        'weekly',
        '2026-11-25',
        '2026-12-02',
        'cash',
        $maker->id
    );
    expect($loanAcc->installments)->toHaveCount(10);

    // 2. Collect 200.00 BDT
    $tx = $loanLedger->collect($loanAcc->id, '2026-11-25', 20_000, 'cash', 'col-1', $maker->id);
    expect($tx->total_paisa)->toBe(20_000);

    // 3. Request & approve correction (Maker-Checker)
    $corr = $loanLedger->requestCorrection($tx->id, 'Wrong amount', $maker->id);
    $loanLedger->reviewCorrection($corr->id, true, '2026-11-25', 'Approved', $checker->id);
    expect($loanAcc->fresh()->principal_paid_paisa)->toBe(0);

    // 4. Savings account: open, deposit 500.00, place hold 200.00, withdraw 400.00 fails, withdraw 200.00 succeeds
    $svAcc = $savingsLedger->openAccount($branch->id, $member->id, $savingsProduct->id, 6.0, '2026-11-25', $maker->id);
    $savingsLedger->deposit($svAcc->id, '2026-11-25', 50_000, 'cash', 'sv-dep-1', $maker->id);
    $savingsLedger->placeHold($svAcc->id, 20_000, 'Loan lien', $maker->id);

    expect(fn () => $savingsLedger->withdraw($svAcc->id, '2026-11-25', 40_000, 'cash', 'sv-wd-fail', $maker->id))
        ->toThrow(ValidationException::class);

    $savingsLedger->withdraw($svAcc->id, '2026-11-25', 20_000, 'cash', 'sv-wd-ok', $maker->id);
    expect($svAcc->fresh()->balance_paisa)->toBe(30_000);

    // 5. Financial reports & LLP & Integrity command
    $llp = $periods->runLlpVoucherProcess($branch->id, '2026-11-25', $ho->id);
    expect($llp->llp_summary['active_loans'])->toBe(1);

    $tb = $reports->trialBalance($branch->id, '2026-11-01', '2026-11-30');
    $sumDr = array_sum(array_column($tb, 'debit_paisa'));
    $sumCr = array_sum(array_column($tb, 'credit_paisa'));
    expect($sumDr)->toBe($sumCr)->and($sumDr)->toBeGreaterThan(0);

    $exitCode = Artisan::call('finance:check-ledgers');
    expect($exitCode)->toBe(0);
});
