<?php

use App\Models\Role;
use App\Models\User;
use App\Services\Accounting\JournalService;
use App\Services\Accounting\Money;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

beforeEach(function () {
    // Isolate this subsystem while exercising its real migration and write service.
    Schema::disableForeignKeyConstraints();
    foreach (['accounting_vouchers', 'journal_lines', 'journal_entries', 'accounting_periods', 'ledger_accounts', 'users', 'branches', 'roles'] as $table) {
        Schema::dropIfExists($table);
    }
    Schema::enableForeignKeyConstraints();
    Schema::create('branches', function (Blueprint $t) {
        $t->id();
    });
    Schema::create('roles', function (Blueprint $t) {
        $t->id();
        $t->string('name');
        $t->text('permissions')->nullable();
    });
    Schema::create('users', function (Blueprint $t) {
        $t->id();
    });
    (require database_path('migrations/2026_11_09_000001_create_accounting_foundation.php'))->up();
    (require database_path('migrations/2026_11_10_000004_create_accounting_vouchers.php'))->up();
    DB::table('branches')->insert(['id' => 1]);
    DB::table('users')->insert([['id' => 1], ['id' => 2]]);
    foreach ([['code' => '100', 'name' => 'Cash', 'type' => 'asset'], ['code' => '300', 'name' => 'Capital', 'type' => 'equity']] as $a) {
        DB::table('ledger_accounts')->insert([...$a, 'created_at' => now(), 'updated_at' => now()]);
    }
    DB::table('accounting_periods')->insert(['branch_id' => 1, 'starts_on' => '2026-01-01', 'ends_on' => '2026-12-31', 'created_at' => now(), 'updated_at' => now()]);
    $this->actor = new User(['is_active' => true, 'account_type' => 'staff']);
    $this->actor->id = 1;
    $this->actor->setRelation('role', new Role(['name' => Role::SUPER_ADMIN]));
    $this->journals = app(JournalService::class);
    $this->lines = [
        ['account_id' => 1, 'debit_paisa' => 10501, 'credit_paisa' => 0],
        ['account_id' => 2, 'debit_paisa' => 0, 'credit_paisa' => 10501],
    ];
});

afterEach(function () {
    Schema::disableForeignKeyConstraints();
    foreach (['accounting_vouchers', 'journal_lines', 'journal_entries', 'accounting_periods', 'ledger_accounts'] as $table) {
        Schema::dropIfExists($table);
    }
    Schema::enableForeignKeyConstraints();
});

it('converts money exactly without floating point', function () {
    expect(Money::toPaisa('0.29'))->toBe(29)
        ->and(Money::toPaisa('105.01'))->toBe(10501)
        ->and(Money::format(-10501))->toBe('-105.01');
    foreach (['1.001', '-1', '1e3', '01', 'NaN', '1000000000001'] as $invalid) {
        expect(fn () => Money::toPaisa($invalid))->toThrow(InvalidArgumentException::class);
    }
});

it('posts balanced journals and replays the same request once', function () {
    $a = $this->journals->post($this->actor, 1, '2026-11-08', 'request-0001', 'Opening capital', $this->lines);
    $b = $this->journals->post($this->actor, 1, '2026-11-08', 'request-0001', 'Opening capital', array_reverse($this->lines));
    expect($a->id)->toBe($b->id)
        ->and(DB::table('journal_entries')->count())->toBe(1)
        ->and(DB::table('journal_lines')->sum('debit_paisa'))->toEqual(10501)
        ->and(DB::table('journal_lines')->sum('credit_paisa'))->toEqual(10501);
});

it('rejects a reused key with changed data', function () {
    $this->journals->post($this->actor, 1, '2026-11-08', 'request-0001', 'Opening', $this->lines);
    expect(fn () => $this->journals->post($this->actor, 1, '2026-11-08', 'request-0001', 'Different', $this->lines))->toThrow(ValidationException::class);
    expect(DB::table('journal_entries')->count())->toBe(1);
});

it('rejects invalid and unbalanced lines without partial posting', function () {
    foreach ([
        [['account_id' => 1, 'debit_paisa' => 100, 'credit_paisa' => 0], ['account_id' => 2, 'debit_paisa' => 0, 'credit_paisa' => 99]],
        [['account_id' => 1, 'debit_paisa' => 1.5, 'credit_paisa' => 0], ['account_id' => 2, 'debit_paisa' => 0, 'credit_paisa' => 1.5]],
        [['account_id' => 1, 'debit_paisa' => 10, 'credit_paisa' => 10], ['account_id' => 2, 'debit_paisa' => 0, 'credit_paisa' => 10]],
        [['account_id' => 999, 'debit_paisa' => 100, 'credit_paisa' => 0], ['account_id' => 2, 'debit_paisa' => 0, 'credit_paisa' => 100]],
    ] as $lines) {
        expect(fn () => $this->journals->post($this->actor, 1, '2026-11-08', 'invalid-key', 'Invalid', $lines))->toThrow(ValidationException::class);
    }
    expect(DB::table('journal_entries')->count())->toBe(0)->and(DB::table('journal_lines')->count())->toBe(0);
});

it('rejects inactive accounts and missing periods', function () {
    DB::table('ledger_accounts')->where('id', 1)->update(['is_active' => false]);
    expect(fn () => $this->journals->post($this->actor, 1, '2026-11-08', 'request-0001', 'Inactive', $this->lines))->toThrow(ValidationException::class);
    expect(fn () => $this->journals->post($this->actor, 1, '2027-01-01', 'request-0002', 'No period', $this->lines))->toThrow(ValidationException::class);
});

it('closes a period and permits only exact replay after closing', function () {
    $entry = $this->journals->post($this->actor, 1, '2026-11-08', 'request-0001', 'Opening', $this->lines);
    $this->journals->closePeriod($this->actor, 1);
    expect(DB::table('accounting_periods')->find(1)->closed_by)->toBe(1)
        ->and($this->journals->post($this->actor, 1, '2026-11-08', 'request-0001', 'Opening', $this->lines)->id)->toBe($entry->id);
    expect(fn () => $this->journals->post($this->actor, 1, '2026-11-08', 'request-0002', 'New posting', $this->lines))->toThrow(ValidationException::class);
});

it('reverses once while preserving the original', function () {
    $entry = $this->journals->post($this->actor, 1, '2026-11-08', 'request-0001', 'Opening', $this->lines);
    $reverse = $this->journals->reverse($this->actor, $entry->id, '2026-11-09', 'reverse-0001', 'Correct mistake');
    expect($reverse->reversal_of)->toBe($entry->id)
        ->and(DB::table('journal_entries')->count())->toBe(2)
        ->and(DB::table('journal_lines')->sum('debit_paisa'))->toEqual(DB::table('journal_lines')->sum('credit_paisa'));
    expect($this->journals->reverse($this->actor, $entry->id, '2026-11-09', 'reverse-0001', 'Correct mistake')->id)->toBe($reverse->id);
    expect(fn () => $this->journals->reverse($this->actor, $entry->id, '2026-11-09', 'reverse-0002', 'Again'))->toThrow(ValidationException::class);
    expect(fn () => $this->journals->reverse($this->actor, $reverse->id, '2026-11-09', 'reverse-0003', 'Again'))->toThrow(ValidationException::class);
});

it('rejects shared branch and inactive identities', function () {
    $this->actor->account_type = 'branch';
    expect(fn () => $this->journals->post($this->actor, 1, '2026-11-08', 'request-0001', 'Shared login', $this->lines))->toThrow(HttpException::class);
    $this->actor->account_type = 'staff';
    $this->actor->is_active = false;
    expect(fn () => $this->journals->post($this->actor, 1, '2026-11-08', 'request-0001', 'Inactive', $this->lines))->toThrow(HttpException::class);
});

it('denies staff without financial permissions', function () {
    $this->actor->setRelation('role', new Role(['name' => Role::FIELD_OFFICER, 'permissions' => []]));
    expect(fn () => $this->journals->post($this->actor, 1, '2026-11-08', 'request-0001', 'Unauthorized', $this->lines))->toThrow(HttpException::class);
});

it('validates financial requests through the HTTP boundary', function () {
    $this->withoutMiddleware();
    $this->actingAs($this->actor)->postJson('/accounting/journals', [
        'branch_id' => 1, 'business_date' => '2026-11-08', 'idempotency_key' => 'http-key-001',
        'description' => 'HTTP journal', 'lines' => $this->lines,
    ])->assertRedirect();
    expect(DB::table('journal_entries')->count())->toBe(0)->and(DB::table('accounting_vouchers')->count())->toBe(1);
    $checker = new User(['is_active' => true, 'account_type' => 'staff']);
    $checker->id = 2;
    $checker->setRelation('role', new Role(['name' => Role::SUPER_ADMIN]));
    $this->actingAs($checker)->postJson('/accounting/vouchers/1/review', ['decision' => 'approved', 'note' => 'Verified'])->assertRedirect();
    expect(DB::table('journal_entries')->count())->toBe(1);
    $this->postJson('/accounting/journals', [
        'branch_id' => 1, 'business_date' => '2026-11-08', 'idempotency_key' => 'http-key-002',
        'description' => 'Invalid journal', 'lines' => [
            ['account_id' => 1, 'debit_paisa' => '1.25', 'credit_paisa' => 0],
            ['account_id' => 2, 'debit_paisa' => 0, 'credit_paisa' => '1.25'],
        ],
    ])->assertUnprocessable();
    expect(DB::table('journal_entries')->count())->toBe(1);
});

it('rejects overlapping periods through the HTTP boundary', function () {
    $this->withoutMiddleware();
    $this->actingAs($this->actor)->postJson('/accounting/periods', [
        'branch_id' => 1, 'starts_on' => '2026-12-31', 'ends_on' => '2027-01-31',
    ])->assertUnprocessable();
    expect(DB::table('accounting_periods')->count())->toBe(1);
});

it('denies accounting HTTP access to non-administrators', function () {
    $this->withoutMiddleware();
    $this->actor->setRelation('role', new Role(['name' => Role::FIELD_OFFICER]));
    $this->actingAs($this->actor)->getJson('/accounting')->assertForbidden();
    $this->postJson('/accounting/accounts', ['code' => '200', 'name' => 'Test', 'type' => 'asset'])->assertForbidden();
});

it('does not restate a closed later period by posting into an earlier open period', function () {
    DB::table('accounting_periods')->insert(['branch_id' => 1, 'starts_on' => '2025-01-01', 'ends_on' => '2025-12-31', 'created_at' => now(), 'updated_at' => now()]);
    $this->journals->closePeriod($this->actor, 1);
    expect(fn () => $this->journals->post($this->actor, 1, '2025-11-09', 'historic-001', 'Cannot restate closed reporting', $this->lines))->toThrow(ValidationException::class);
    expect(DB::table('journal_entries')->count())->toBe(0);
});
