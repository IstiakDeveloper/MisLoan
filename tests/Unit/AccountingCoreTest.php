<?php

use App\Models\Area;
use App\Models\Branch;
use App\Models\GlPostingDefault;
use App\Models\LedgerAccount;
use App\Models\Role;
use App\Models\User;
use App\Models\Zone;
use App\Services\Accounting\JournalService;
use App\Services\Accounting\Money;
use App\Services\Accounting\PostingDefaults;
use App\Services\Accounting\VoucherService;
use App\Services\AccountingPeriodService;
use Illuminate\Database\Schema\Blueprint;
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
    Schema::create('member_admissions', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('branch_id');
        $table->string('status')->default('draft');
        $table->timestamps();
        $table->softDeletes();
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
});

function setupAccountingActors(): array
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

    return compact('ho', 'maker', 'checker', 'branch');
}

it('converts decimal strings to exact paisa and back', function () {
    expect(Money::toPaisa('1250.50'))->toBe(125050)
        ->and(Money::toPaisa('100'))->toBe(10000)
        ->and(Money::format(125050))->toBe('1250.50')
        ->and(Money::format(-505))->toBe('-5.05');
});

it('seeds standard mfi chart of accounts and resolves posting defaults', function () {
    ['ho' => $ho] = setupAccountingActors();
    $defaults = app(PostingDefaults::class);

    $created = $defaults->seedStandardChartOfAccounts($ho->id);
    expect($created)->toBe(12)
        ->and(LedgerAccount::query()->count())->toBe(12)
        ->and($defaults->resolveAccountId('cash_in_hand'))->not->toBeNull();

    $bankId = LedgerAccount::query()->where('code', '1020')->value('id');
    $defaults->setDefault(GlPostingDefault::SCOPE_LOAN_PRODUCT, 99, 'cash_in_hand', (int) $bankId, $ho->id);

    expect($defaults->resolveAccountId('cash_in_hand', GlPostingDefault::SCOPE_LOAN_PRODUCT, 99))->toBe((int) $bankId);
});

it('enforces open business day, double-entry balance, and idempotency on journal posting', function () {
    ['ho' => $ho, 'maker' => $maker, 'branch' => $branch] = setupAccountingActors();
    $periods = app(AccountingPeriodService::class);
    $journals = app(JournalService::class);
    app(PostingDefaults::class)->seedStandardChartOfAccounts($ho->id);

    $cashId = (int) LedgerAccount::query()->where('code', '1010')->value('id');
    $expenseId = (int) LedgerAccount::query()->where('code', '5040')->value('id');

    // Fails when day is not open
    expect(fn () => $journals->postEntry(
        $branch->id,
        '2026-11-25',
        'Office rent',
        [
            ['ledger_account_id' => $expenseId, 'debit_paisa' => 50000, 'credit_paisa' => 0],
            ['ledger_account_id' => $cashId, 'debit_paisa' => 0, 'credit_paisa' => 50000],
        ],
        'key-1',
        $maker->id
    ))->toThrow(ValidationException::class);

    $fy = $periods->openFinancialYear(2026, $ho->id);
    $periods->setBranchDayInitial($fy->id, $branch->id, '2026-11-25', $ho->id);
    $periods->startWorkProcess($branch->id, '2026-11-25', $maker->id);

    // Fails when unbalanced
    expect(fn () => $journals->postEntry(
        $branch->id,
        '2026-11-25',
        'Unbalanced',
        [
            ['ledger_account_id' => $expenseId, 'debit_paisa' => 50000, 'credit_paisa' => 0],
            ['ledger_account_id' => $cashId, 'debit_paisa' => 0, 'credit_paisa' => 40000],
        ],
        'key-unbalanced',
        $maker->id
    ))->toThrow(ValidationException::class);

    // Posts cleanly and is idempotent
    $entry1 = $journals->postEntry(
        $branch->id,
        '2026-11-25',
        'Office rent',
        [
            ['ledger_account_id' => $expenseId, 'debit_paisa' => 50000, 'credit_paisa' => 0],
            ['ledger_account_id' => $cashId, 'debit_paisa' => 0, 'credit_paisa' => 50000],
        ],
        'key-1',
        $maker->id
    );
    $entry2 = $journals->postEntry(
        $branch->id,
        '2026-11-25',
        'Office rent',
        [
            ['ledger_account_id' => $expenseId, 'debit_paisa' => 50000, 'credit_paisa' => 0],
            ['ledger_account_id' => $cashId, 'debit_paisa' => 0, 'credit_paisa' => 50000],
        ],
        'key-1',
        $maker->id
    );

    expect($entry1->id)->toBe($entry2->id)
        ->and($entry1->lines)->toHaveCount(2);
});

it('enforces maker-checker on vouchers and blocks day close while vouchers are pending', function () {
    ['ho' => $ho, 'maker' => $maker, 'checker' => $checker, 'branch' => $branch] = setupAccountingActors();
    $periods = app(AccountingPeriodService::class);
    $vouchers = app(VoucherService::class);
    app(PostingDefaults::class)->seedStandardChartOfAccounts($ho->id);

    $fy = $periods->openFinancialYear(2026, $ho->id);
    $periods->setBranchDayInitial($fy->id, $branch->id, '2026-11-25', $ho->id);
    $periods->startWorkProcess($branch->id, '2026-11-25', $maker->id);

    $cashId = (int) LedgerAccount::query()->where('code', '1010')->value('id');
    $expenseId = (int) LedgerAccount::query()->where('code', '5040')->value('id');

    $voucher = $vouchers->submitVoucher(
        $branch->id,
        'payment',
        '2026-11-25',
        'Stationery purchase',
        [
            ['ledger_account_id' => $expenseId, 'debit_paisa' => 15000, 'credit_paisa' => 0],
            ['ledger_account_id' => $cashId, 'debit_paisa' => 0, 'credit_paisa' => 15000],
        ],
        'v-1',
        $maker->id
    );

    // Day close blocked while voucher is pending
    expect(fn () => $periods->completeWorkProcess($branch->id, '2026-11-25', null, $checker->id))
        ->toThrow(ValidationException::class);

    // Maker cannot approve own voucher
    expect(fn () => $vouchers->approveVoucher($voucher->id, $maker->id))
        ->toThrow(ValidationException::class);

    // Checker approves voucher -> posts journal entry
    $approved = $vouchers->approveVoucher($voucher->id, $checker->id, 'Verified');
    expect($approved->status)->toBe('approved')
        ->and($approved->journal_entry_id)->not->toBeNull();

    // Now Day Close succeeds
    $closed = $periods->completeWorkProcess($branch->id, '2026-11-25', 'Balanced', $checker->id);
    expect($closed->status)->toBe('closed');
});
