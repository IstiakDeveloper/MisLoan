<?php

use App\Models\Area;
use App\Models\Branch;
use App\Models\LoanAccount;
use App\Models\LoanApplication;
use App\Models\LoanInstallment;
use App\Models\LoanProduct;
use App\Models\MemberAdmission;
use App\Models\Role;
use App\Models\Samity;
use App\Models\SavingsAccount;
use App\Models\SavingsApplication;
use App\Models\SavingsProduct;
use App\Models\User;
use App\Models\Zone;
use App\Services\Accounting\PostingDefaults;
use App\Services\AccountingPeriodService;
use App\Services\Loans\ApplicationLedgerSyncService;
use App\Services\Loans\LoanLedgerService;
use App\Services\Loans\LoanScheduleService;
use App\Services\Migration\LegacyBalanceImportService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schema;

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
        $table->string('samity_code')->nullable();
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
        $table->decimal('interest_rate', 8, 2)->default(24);
        $table->string('installment_type')->default('weekly');
        $table->integer('number_of_installments')->default(45);
        $table->string('interest_calculation_type')->default('flat');
        $table->timestamps();
    });
    Schema::create('savings_products', function (Blueprint $table) {
        $table->id();
        $table->string('product_name');
        $table->string('product_code')->nullable();
        $table->decimal('interest_rate', 8, 2)->default(6);
        $table->timestamps();
    });
    Schema::create('loan_applications', function (Blueprint $table) {
        $table->id();
        $table->string('application_no')->nullable();
        $table->unsignedBigInteger('member_admission_id')->nullable();
        $table->unsignedBigInteger('loan_product_id')->nullable();
        $table->unsignedBigInteger('branch_id');
        $table->unsignedBigInteger('samity_id')->nullable();
        $table->string('status')->default('disbursed');
        $table->integer('number_of_installments')->default(10);
        $table->decimal('disbursed_amount', 15, 2)->default(0);
        $table->timestamp('disbursed_at')->nullable();
        $table->timestamp('repaid_at')->nullable();
        $table->unsignedBigInteger('repaid_by')->nullable();
        $table->timestamps();
        $table->softDeletes();
    });
    Schema::create('savings_applications', function (Blueprint $table) {
        $table->id();
        $table->string('application_no')->nullable();
        $table->unsignedBigInteger('member_admission_id')->nullable();
        $table->unsignedBigInteger('savings_product_id')->nullable();
        $table->unsignedBigInteger('branch_id');
        $table->string('status')->default('active');
        $table->date('account_opening_date')->nullable();
        $table->timestamps();
    });
    Schema::create('notifications', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('user_id');
        $table->string('type')->nullable();
        $table->string('title')->nullable();
        $table->text('message')->nullable();
        $table->string('action_url')->nullable();
        $table->boolean('is_read')->default(false);
        $table->timestamps();
    });

    (require database_path('migrations/2026_11_25_181000_create_accounting_period_tables.php'))->up();
    (require database_path('migrations/2026_11_25_184000_make_period_reopen_logs_branch_nullable.php'))->up();
    (require database_path('migrations/2026_11_25_190000_create_accounting_core_tables.php'))->up();
    (require database_path('migrations/2026_11_25_200000_create_cash_desk_tables.php'))->up();
    (require database_path('migrations/2026_11_25_210000_create_loan_subledger_tables.php'))->up();
    (require database_path('migrations/2026_11_25_220000_create_savings_subledger_tables.php'))->up();
});

function setupAutomationContext(): array
{
    $hoRole = Role::create(['name' => Role::HEAD_OFFICE, 'display_name' => 'Head Office', 'permissions' => []]);
    $bmRole = Role::create(['name' => Role::BRANCH_MANAGER, 'display_name' => 'Branch Manager', 'permissions' => []]);
    $zone = Zone::create(['name' => 'Zone 1', 'code' => 'Z1']);
    $area = Area::create(['zone_id' => $zone->id, 'name' => 'Area 1', 'code' => 'A1']);
    $branch = Branch::create(['area_id' => $area->id, 'name' => 'Branch 1', 'code' => 'B001', 'is_active' => true]);
    $samity = Samity::create(['branch_id' => $branch->id, 'samity_name' => 'Shapla Samity', 'samity_code' => 'S01']);

    $ho = User::factory()->create(['role_id' => $hoRole->id, 'has_all_access' => true, 'is_active' => true]);
    $bm = User::factory()->create(['role_id' => $bmRole->id, 'branch_id' => $branch->id, 'is_active' => true]);

    $member = MemberAdmission::create([
        'application_no' => 'APP-101',
        'branch_id' => $branch->id,
        'samity_id' => $samity->id,
        'applicant_name_en' => 'Karim',
        'member_code' => 'M101',
        'status' => 'approved',
    ]);
    $loanProduct = LoanProduct::create([
        'product_name' => 'Jagoron',
        'product_code' => 'JAG',
        'interest_rate' => 24,
        'installment_type' => 'weekly',
        'number_of_installments' => 10,
    ]);
    $savingsProduct = SavingsProduct::create([
        'product_name' => 'General Savings',
        'product_code' => 'GS',
        'interest_rate' => 6,
    ]);

    $periods = app(AccountingPeriodService::class);
    $fy = $periods->openFinancialYear(2026, $ho->id);
    $periods->setBranchDayInitial($fy->id, $branch->id, '2026-11-26', $ho->id);
    $periods->startWorkProcess($branch->id, '2026-11-26', $bm->id);
    app(PostingDefaults::class)->seedStandardChartOfAccounts($ho->id);

    return compact('ho', 'bm', 'branch', 'samity', 'member', 'loanProduct', 'savingsProduct');
}

it('auto syncs loan disbursement and savings activation to subledgers and gl', function () {
    ['bm' => $bm, 'branch' => $branch, 'samity' => $samity, 'member' => $member, 'loanProduct' => $loanProduct, 'savingsProduct' => $savingsProduct] = setupAutomationContext();
    $sync = app(ApplicationLedgerSyncService::class);

    $loanApp = LoanApplication::create([
        'application_no' => 'LN-APP-1',
        'member_admission_id' => $member->id,
        'loan_product_id' => $loanProduct->id,
        'branch_id' => $branch->id,
        'samity_id' => $samity->id,
        'number_of_installments' => 10,
        'disbursed_amount' => 10000,
        'status' => 'disbursed',
    ]);

    $loanAccount = $sync->syncLoanDisbursement($loanApp->fresh(['loanProduct', 'memberAdmission']), '2026-11-26', 10000, 'cash', $bm->id);
    expect($loanAccount)->not->toBeNull()
        ->and($loanAccount->installments)->toHaveCount(10);

    $svApp = SavingsApplication::create([
        'application_no' => 'SV-APP-1',
        'member_admission_id' => $member->id,
        'savings_product_id' => $savingsProduct->id,
        'branch_id' => $branch->id,
        'account_opening_date' => '2026-11-26',
    ]);

    $svAccount = $sync->syncSavingsActivation($svApp->fresh('savingsProduct'), $bm->id);
    expect($svAccount)->not->toBeNull()
        ->and($svAccount->branch_id)->toBe($branch->id);
});

it('processes samity bulk dcs, early rebate settlement, holiday reschedule, and month-end auto batch', function () {
    ['ho' => $ho, 'bm' => $bm, 'branch' => $branch, 'samity' => $samity, 'member' => $member, 'loanProduct' => $loanProduct, 'savingsProduct' => $savingsProduct] = setupAutomationContext();

    $loanLedger = app(LoanLedgerService::class);
    $schedules = app(LoanScheduleService::class);
    $periods = app(AccountingPeriodService::class);
    $sync = app(ApplicationLedgerSyncService::class);

    $svApp = SavingsApplication::create([
        'application_no' => 'SV-APP-2',
        'member_admission_id' => $member->id,
        'savings_product_id' => $savingsProduct->id,
        'branch_id' => $branch->id,
        'account_opening_date' => '2026-11-26',
    ]);
    $svAcc = $sync->syncSavingsActivation($svApp->fresh('savingsProduct'), $bm->id);

    $loanAcc = $loanLedger->createAndDisburse(
        $branch->id,
        $member->id,
        $loanProduct->id,
        1_000_000,
        24.0,
        10,
        'flat',
        'weekly',
        '2026-11-26',
        '2026-11-26',
        'cash',
        $bm->id
    );

    // 1. Samity Bulk DCS
    $dcs = $loanLedger->getDailyCollectionSheet($branch->id, '2026-11-26', $samity->id);
    expect($dcs)->toHaveCount(1)
        ->and($dcs[0]['savings_account_id'])->toBe($svAcc->id);

    $bulkRes = $loanLedger->postBulkDcs($branch->id, '2026-11-26', 'cash', [[
        'loan_account_id' => $loanAcc->id,
        'loan_amount_paisa' => 104_615,
        'savings_account_id' => $svAcc->id,
        'savings_amount_paisa' => 50_000,
    ]], 'batch-1', $bm->id);

    expect($bulkRes['loan_count'])->toBe(1)
        ->and($bulkRes['savings_count'])->toBe(1)
        ->and($svAcc->fresh()->balance_paisa)->toBe(50_000);

    // 2. Holiday Auto-Reschedule on installment #2 due date
    $secondDue = $loanAcc->installments()->where('installment_no', 2)->value('due_date')->toDateString();
    $periods->addHoliday($secondDue, 'Victory Day', 'govt', $branch->id, $ho->id);
    $shifted = $schedules->rescheduleForHoliday($secondDue, $branch->id);
    expect($shifted)->toBe(1)
        ->and(LoanInstallment::query()->where('loan_account_id', $loanAcc->id)->where('installment_no', 2)->value('due_date')->toDateString())
        ->not->toBe($secondDue);

    // 3. Month-End Auto Batch (Auto Savings Profit + Auto LLP Voucher)
    $batch = $periods->runMonthEndAutoBatch($branch->id, '2026-11-26', $bm->id);
    expect($batch['savings_accounts_posted'])->toBe(1)
        ->and($batch['llp_voucher_submitted'])->toBeTrue();

    // 4. Early Settlement with Rebate
    $remSc = $loanAcc->fresh()->remainingServiceChargePaisa();
    $tx = $loanLedger->settleEarlyWithRebate($loanAcc->id, '2026-11-26', (int) floor($remSc / 2), 'cash', 'rebate-1', $bm->id);
    expect($tx->kind)->toBe('rebate')
        ->and($loanAcc->fresh()->status)->toBe(LoanAccount::STATUS_REPAID);

    expect(Artisan::call('finance:check-ledgers'))->toBe(0);
    expect(Artisan::call('finance:flag-overdue'))->toBe(0);
});

it('imports legacy opening loan and savings balances from csv', function () {
    ['ho' => $ho, 'branch' => $branch, 'member' => $member] = setupAutomationContext();
    $importer = app(LegacyBalanceImportService::class);

    $tmp = tempnam(sys_get_temp_dir(), 'leg');
    $csvPath = $tmp.'.csv';
    rename($tmp, $csvPath);

    $fh = fopen($csvPath, 'w');
    fputcsv($fh, ['type', 'member_code', 'product_code', 'opening_balance', 'remaining_installments', 'next_due_date']);
    fputcsv($fh, ['loan', $member->application_no, 'JAG', '5000.00', '5', '2026-12-03']);
    fputcsv($fh, ['savings', $member->application_no, 'GS', '1200.00', '', '']);
    fclose($fh);

    $res = $importer->importFile($branch->id, $csvPath, '2026-11-26', $ho->id);
    @unlink($csvPath);

    expect($res['loans_imported'])->toBe(1)
        ->and($res['savings_imported'])->toBe(1)
        ->and(SavingsAccount::query()->where('branch_id', $branch->id)->sum('balance_paisa'))->toBe(120000);
});

it('skips auto ledger sync when branch has accounting_enabled = false', function () {
    $toggleMigration = require base_path('database/migrations/2026_11_26_175000_add_accounting_enabled_to_branches_table.php');
    $toggleMigration->up();

    ['bm' => $bm, 'branch' => $branch, 'samity' => $samity, 'member' => $member, 'loanProduct' => $loanProduct, 'savingsProduct' => $savingsProduct] = setupAutomationContext();
    $sync = app(ApplicationLedgerSyncService::class);

    // Explicitly legacy OFF
    $branch->update(['accounting_enabled' => false]);

    $loanApp = LoanApplication::create([
        'application_no' => 'LN-LEG-1',
        'member_admission_id' => $member->id,
        'loan_product_id' => $loanProduct->id,
        'branch_id' => $branch->id,
        'samity_id' => $samity->id,
        'number_of_installments' => 10,
        'disbursed_amount' => 10000,
        'status' => 'disbursed',
    ]);

    expect($sync->syncLoanDisbursement($loanApp->fresh(['loanProduct', 'memberAdmission']), '2026-11-26', 10000, 'cash', $bm->id))->toBeNull();

    $svApp = SavingsApplication::create([
        'application_no' => 'SV-LEG-1',
        'member_admission_id' => $member->id,
        'savings_product_id' => $savingsProduct->id,
        'branch_id' => $branch->id,
        'account_opening_date' => '2026-11-26',
    ]);

    expect($sync->syncSavingsActivation($svApp->fresh('savingsProduct'), $bm->id))->toBeNull();

    // Now turn Pilot ON -> both sync properly
    $branch->update(['accounting_enabled' => true]);

    $loanAccount = $sync->syncLoanDisbursement($loanApp->fresh(['loanProduct', 'memberAdmission']), '2026-11-26', 10000, 'cash', $bm->id);
    $svAccount = $sync->syncSavingsActivation($svApp->fresh('savingsProduct'), $bm->id);

    expect($loanAccount)->not->toBeNull()
        ->and($svAccount)->not->toBeNull();
});
