<?php

use App\Models\Area;
use App\Models\Branch;
use App\Models\Role;
use App\Models\User;
use App\Models\Zone;
use App\Services\Accounting\VoucherService;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();
    $role = Role::create(['name' => Role::SUPER_ADMIN, 'display_name' => 'Administrator']);
    $this->maker = User::factory()->create(['role_id' => $role->id]);
    $this->checker = User::factory()->create(['role_id' => $role->id]);
    $zone = Zone::create(['name' => 'Zone', 'code' => 'Z1']);
    $area = Area::create(['name' => 'Area', 'code' => 'A1', 'zone_id' => $zone->id]);
    $this->branch = Branch::create(['name' => 'Branch', 'code' => '0001', 'area_id' => $area->id]);
    DB::table('ledger_accounts')->insert([
        ['id' => 1, 'code' => '101', 'name' => 'Cash', 'type' => 'asset'],
        ['id' => 2, 'code' => '301', 'name' => 'Capital', 'type' => 'equity'],
    ]);
    DB::table('accounting_periods')->insert(['branch_id' => $this->branch->id, 'starts_on' => today()->startOfYear()->toDateString(), 'ends_on' => today()->endOfYear()->toDateString()]);
    $this->voucher = app(VoucherService::class)->propose($this->maker, $this->branch->id, today()->toDateString(), 'workspace-test', 'Opening capital', [
        ['account_id' => 1, 'debit_paisa' => 12345, 'credit_paisa' => 0], ['account_id' => 2, 'debit_paisa' => 0, 'credit_paisa' => 12345],
    ]);
    $this->actingAs($this->maker);
});

it('serves separate accounting tasks with branch context and readable voucher totals', function (string $path, string $section) {
    $this->get($path.'?branch_id='.$this->branch->id)->assertOk()->assertInertia(fn (Assert $page) => $page->component('Accounting/Index')->where('section', $section)->where('branchId', $this->branch->id)->where('vouchers.data.0.total_paisa', '12345')->missing('vouchers.data.0.lines')->missing('vouchers.data.0.idempotency_key'));
})->with([
    ['/accounting', 'overview'], ['/accounting/vouchers', 'vouchers'], ['/accounting/vouchers/create', 'create'], ['/accounting/journals', 'journals'], ['/accounting/accounts', 'accounts'], ['/accounting/periods', 'periods'],
]);

it('shows human account names in private details without exposing retry keys', function () {
    $this->getJson('/accounting/vouchers/'.$this->voucher->id)->assertOk()->assertJsonPath('record.lines.0.name', 'Cash')->assertJsonPath('record.lines.0.debit_paisa', '12345')->assertJsonMissingPath('record.idempotency_key')->assertHeader('Cache-Control', 'no-store, private');
    expect(DB::table('journal_entries')->count())->toBe(0);
    app(VoucherService::class)->decide($this->checker, $this->voucher->id, 'approved', 'Verified');
    $entry = DB::table('journal_entries')->first();
    $this->getJson('/accounting/journals/'.$entry->id)->assertOk()->assertJsonPath('record.lines.0.code', '101')->assertJsonPath('record.lines.0.debit_paisa', '12345')->assertJsonPath('record.reversal_pending', false)->assertJsonMissingPath('record.payload_hash');
});

it('filters voucher status and text without changing the ledger', function () {
    $this->get('/accounting/vouchers?voucher_status=approved')->assertOk()->assertInertia(fn (Assert $page) => $page->has('vouchers.data', 0));
    $this->get('/accounting/vouchers?q=Opening')->assertOk()->assertInertia(fn (Assert $page) => $page->has('vouchers.data', 1));
    $this->get('/accounting/vouchers?q=Missing')->assertOk()->assertInertia(fn (Assert $page) => $page->has('vouchers.data', 0));
    expect(DB::table('journal_entries')->count())->toBe(0);
});

it('rejects invalid filters and supports a single report selection', function () {
    $this->get('/accounting/journals?source=invalid')->assertSessionHasErrors('source');
    $this->get('/accounting/reports?report=income')->assertOk()->assertInertia(fn (Assert $page) => $page->component('FinancialReports/Index')->where('report', 'income'));
    $this->get('/accounting/reports?report=invalid')->assertSessionHasErrors('report');
});

it('protects every new accounting screen and details from inactive users', function () {
    $this->maker->update(['is_active' => false]);
    foreach (['/accounting/vouchers', '/accounting/vouchers/create', '/accounting/journals', '/accounting/accounts', '/accounting/periods', '/accounting/vouchers/'.$this->voucher->id, '/accounting/journals/1'] as $path) {
        $this->get($path)->assertForbidden();
    }
});

it('does not grant the new tasks to nonfinancial roles with organizational access', function () {
    $role = Role::create(['name' => 'head_office', 'display_name' => 'Head Office']);
    $this->maker->update(['role_id' => $role->id, 'has_all_access' => true]);
    $this->maker->unsetRelation('role');
    foreach (['/accounting/vouchers', '/accounting/vouchers/create', '/accounting/journals', '/accounting/accounts', '/accounting/periods', '/accounting/vouchers/'.$this->voucher->id] as $path) {
        $this->get($path)->assertForbidden();
    }
});

it('keeps branch filters isolated and invalid detail identifiers return not found', function () {
    $other = Branch::create(['name' => 'Other', 'code' => '0002', 'area_id' => $this->branch->area_id]);
    $this->get('/accounting/vouchers?branch_id='.$other->id)->assertOk()->assertInertia(fn (Assert $page) => $page->where('branchId', $other->id)->has('vouchers.data', 0)->where('summary.pending', 0));
    $this->get('/accounting/vouchers/not-a-number')->assertNotFound();
    $this->getJson('/accounting/journals/9999')->assertNotFound();
});
