<?php

use App\Models\Area;
use App\Models\Branch;
use App\Models\MemberAdmission;
use App\Models\Role;
use App\Models\Samity;
use App\Models\SavingsApplication;
use App\Models\SavingsProduct;
use App\Models\User;
use App\Models\Zone;
use App\Services\Accounting\JournalService;
use App\Services\Savings\SavingsLedger;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Testing\AssertableInertia;
use Symfony\Component\HttpKernel\Exception\HttpException;

beforeEach(function () {
    $role = Role::create(['name' => Role::SUPER_ADMIN, 'display_name' => 'Admin']);
    $this->actor = User::factory()->create(['role_id' => $role->id]);
    $zone = Zone::create(['name' => 'Test zone', 'code' => 'Z1']);
    $area = Area::create(['name' => 'Test area', 'code' => 'A1', 'zone_id' => $zone->id]);
    $this->branch = Branch::create(['name' => 'Test branch', 'code' => '0001', 'area_id' => $area->id]);
    $samity = Samity::create(['samity_code' => 'S1', 'samity_name' => 'Test', 'branch_id' => $this->branch->id]);
    $member = MemberAdmission::create(['application_no' => '0001000001', 'branch_id' => $this->branch->id, 'samity_id' => $samity->id, 'status' => 'draft']);
    $product = SavingsProduct::factory()->create();
    $this->application = SavingsApplication::create([
        'application_no' => 'SAV-001', 'member_admission_id' => $member->id,
        'savings_product_id' => $product->id, 'branch_id' => $this->branch->id,
        'samity_id' => $samity->id, 'deposit_amount' => '999999.00', 'duration_months' => 12, 'status' => 'active',
    ]);
    foreach (['asset', 'liability', 'equity', 'expense'] as $i => $type) {
        DB::table('ledger_accounts')->insert(['id' => $i + 1, 'code' => 'GL'.$i, 'name' => $type, 'type' => $type, 'created_at' => now(), 'updated_at' => now()]);
    }
    $this->date = today()->toDateString();
    DB::table('accounting_periods')->insert(['branch_id' => $this->branch->id, 'starts_on' => today()->startOfYear()->toDateString(), 'ends_on' => today()->endOfYear()->toDateString(), 'created_at' => now(), 'updated_at' => now()]);
    $this->ledger = app(SavingsLedger::class);
    $this->account = $this->ledger->open($this->actor, $this->application->id, 2, $this->date, '0.00', 'Verified new account');
});

it('never infers opening money from an application form', function () {
    expect($this->ledger->balances($this->account->id)['balance_paisa'])->toBe(0)
        ->and(DB::table('savings_transactions')->count())->toBe(0)
        ->and(DB::table('journal_entries')->count())->toBe(0);
});

it('posts deposits and withdrawals atomically to the savings and general ledgers', function () {
    $deposit = $this->ledger->transact($this->actor, $this->account->id, 'deposit', '105.01', 1, $this->date, 'deposit-0001', 'Cash deposit');
    $withdrawal = $this->ledger->transact($this->actor, $this->account->id, 'withdrawal', '5.01', 1, $this->date, 'withdraw-001', 'Cash withdrawal');
    expect($this->ledger->balances($this->account->id)['balance_paisa'])->toBe(10000)
        ->and(DB::table('journal_entries')->count())->toBe(2)
        ->and(DB::table('journal_entries')->find($deposit->journal_entry_id)->source_type)->toBe('savings')
        ->and(DB::table('journal_lines')->sum('debit_paisa'))->toEqual(DB::table('journal_lines')->sum('credit_paisa'));
    $liability = DB::table('journal_lines')->where('ledger_account_id', 2);
    expect((int) (clone $liability)->sum('credit_paisa') - (int) $liability->sum('debit_paisa'))->toBe(10000)
        ->and((int) $withdrawal->amount_paisa)->toBe(-501);
});

it('replays identical requests without duplicate money and rejects changed requests', function () {
    $first = $this->ledger->transact($this->actor, $this->account->id, 'deposit', '100', 1, $this->date, 'deposit-0001', 'Deposit');
    $again = $this->ledger->transact($this->actor, $this->account->id, 'deposit', '100.00', 1, $this->date, 'deposit-0001', 'Deposit');
    expect($first->id)->toBe($again->id)->and(DB::table('journal_entries')->count())->toBe(1);
    expect(fn () => $this->ledger->transact($this->actor, $this->account->id, 'deposit', '101', 1, $this->date, 'deposit-0001', 'Deposit'))->toThrow(ValidationException::class);
});

it('prevents overdrafts without partial journal entries', function () {
    expect(fn () => $this->ledger->transact($this->actor, $this->account->id, 'withdrawal', '0.01', 1, $this->date, 'withdraw-001', 'No money'))->toThrow(ValidationException::class);
    expect(DB::table('journal_entries')->count())->toBe(0)->and(DB::table('savings_transactions')->count())->toBe(0);
});

it('respects holds and allows withdrawals after release', function () {
    $this->ledger->transact($this->actor, $this->account->id, 'deposit', '100', 1, $this->date, 'deposit-0001', 'Deposit');
    $hold = $this->ledger->hold($this->actor, $this->account->id, '80', 'hold-000001', 'Guarantee hold');
    expect($this->ledger->balances($this->account->id)['available_paisa'])->toBe(2000);
    expect(fn () => $this->ledger->transact($this->actor, $this->account->id, 'withdrawal', '21', 1, $this->date, 'withdraw-001', 'Held money'))->toThrow(ValidationException::class);
    $this->ledger->release($this->actor, $hold->id);
    $this->ledger->transact($this->actor, $this->account->id, 'withdrawal', '100', 1, $this->date, 'withdraw-002', 'Settlement');
    expect($this->ledger->balances($this->account->id)['balance_paisa'])->toBe(0);
});

it('reverses subledger and GL together and blocks direct journal reversals', function () {
    $deposit = $this->ledger->transact($this->actor, $this->account->id, 'deposit', '100', 1, $this->date, 'deposit-0001', 'Deposit');
    expect(fn () => app(JournalService::class)->reverse($this->actor, $deposit->journal_entry_id, $this->date, 'direct-00001', 'Bypass'))->toThrow(ValidationException::class);
    $reversal = $this->ledger->reverse($this->actor, $deposit->id, $this->date, 'reverse-0001', 'Correct receipt');
    expect($this->ledger->balances($this->account->id)['balance_paisa'])->toBe(0)
        ->and($reversal->reversal_of)->toBe($deposit->id)
        ->and(DB::table('journal_entries')->count())->toBe(2);
    expect($this->ledger->reverse($this->actor, $deposit->id, $this->date, 'reverse-0001', 'Correct receipt')->id)->toBe($reversal->id);
    expect(fn () => $this->ledger->reverse($this->actor, $deposit->id, $this->date, 'reverse-0002', 'Again'))->toThrow(ValidationException::class);
});

it('does not reverse already spent or held deposits', function () {
    $deposit = $this->ledger->transact($this->actor, $this->account->id, 'deposit', '100', 1, $this->date, 'deposit-0001', 'Deposit');
    $this->ledger->transact($this->actor, $this->account->id, 'withdrawal', '1', 1, $this->date, 'withdraw-001', 'Withdrawal');
    expect(fn () => $this->ledger->reverse($this->actor, $deposit->id, $this->date, 'reverse-0001', 'Spent'))->toThrow(ValidationException::class);
});

it('rolls back the subledger when the accounting period is closed', function () {
    DB::table('accounting_periods')->update(['closed_at' => now(), 'closed_by' => $this->actor->id]);
    expect(fn () => $this->ledger->transact($this->actor, $this->account->id, 'deposit', '10', 1, $this->date, 'deposit-0001', 'Closed period'))->toThrow(ValidationException::class);
    expect(DB::table('journal_entries')->count())->toBe(0)->and($this->ledger->balances($this->account->id)['balance_paisa'])->toBe(0);
});

it('requires the right counter-account classification for profit', function () {
    expect(fn () => $this->ledger->transact($this->actor, $this->account->id, 'profit', '10', 1, $this->date, 'profit-00001', 'Wrong expense'))->toThrow(ValidationException::class);
    $this->ledger->transact($this->actor, $this->account->id, 'profit', '10', 4, $this->date, 'profit-00002', 'Approved profit');
    expect($this->ledger->balances($this->account->id)['balance_paisa'])->toBe(1000);
});

it('closes only fully settled accounts and disallows new deposits after closure', function () {
    $this->ledger->transact($this->actor, $this->account->id, 'deposit', '10', 1, $this->date, 'deposit-0001', 'Deposit');
    expect(fn () => $this->ledger->close($this->actor, $this->account->id))->toThrow(ValidationException::class);
    $this->ledger->transact($this->actor, $this->account->id, 'withdrawal', '10', 1, $this->date, 'withdraw-001', 'Settlement');
    $this->ledger->close($this->actor, $this->account->id);
    expect(DB::table('savings_accounts')->find($this->account->id)->status)->toBe('closed');
    expect(fn () => $this->ledger->transact($this->actor, $this->account->id, 'deposit', '1', 1, $this->date, 'deposit-0002', 'Closed'))->toThrow(ValidationException::class);
});

it('blocks shared and unprivileged accounts at the service and HTTP boundaries', function () {
    $user = User::factory()->create();
    expect(fn () => $this->ledger->transact($user, $this->account->id, 'deposit', '10', 1, $this->date, 'deposit-0001', 'Unauthorized'))->toThrow(HttpException::class);
    $this->actingAs($user)->getJson('/savings-ledger')->assertForbidden();
    $this->actor->account_type = 'branch';
    expect(fn () => $this->ledger->transact($this->actor, $this->account->id, 'deposit', '10', 1, $this->date, 'deposit-0001', 'Shared'))->toThrow(HttpException::class);
});

it('opens audited balances with matching GL entries and preserves the product snapshot', function () {
    $this->application->application_no = 'SAV-002';
    $other = $this->application->replicate();
    $other->save();
    $account = $this->ledger->open($this->actor, $other->id, 2, $this->date, '25.50', 'Signed opening schedule', 3);
    $other->savingsProduct->update(['interest_rate' => '9.00']);
    expect($this->ledger->balances($account->id)['balance_paisa'])->toBe(2550)
        ->and(json_decode($account->product_snapshot, true)['interest_rate'])->not->toBe('9.00')
        ->and($this->ledger->open($this->actor, $other->id, 2, $this->date, '25.50', 'Signed opening schedule', 3)->id)->toBe($account->id);
});

it('enforces the snapshotted maturity policy even after the live product changes', function () {
    $other = $this->application->replicate();
    $other->application_no = 'SAV-MATURITY';
    $other->maturity_date = today()->addMonth();
    $other->save();
    $account = $this->ledger->open($this->actor, $other->id, 2, $this->date, '100.00', 'Verified opening', 3);
    $other->savingsProduct->update(['premature_withdrawal_allowed' => true]);
    expect(fn () => $this->ledger->transact($this->actor, $account->id, 'withdrawal', '1', 1, $this->date, 'withdraw-001', 'Too early'))->toThrow(ValidationException::class);
    expect($this->ledger->balances($account->id)['balance_paisa'])->toBe(10000);
});

it('detects an unmatched manual adjustment in the branch savings control account', function () {
    $this->ledger->transact($this->actor, $this->account->id, 'deposit', '100', 1, $this->date, 'deposit-0001', 'Deposit');
    expect($this->ledger->reconciliation($this->actor, $this->account->id)['matches'])->toBeTrue();
    app(JournalService::class)->post($this->actor, $this->branch->id, $this->date, 'manual-00001', 'Unmatched control adjustment', [
        ['account_id' => 1, 'debit_paisa' => 500, 'credit_paisa' => 0],
        ['account_id' => 2, 'debit_paisa' => 0, 'credit_paisa' => 500],
    ]);
    $report = $this->ledger->reconciliation($this->actor, $this->account->id);
    expect($report['matches'])->toBeFalse()->and($report['difference_paisa'])->toBe('500');
});

it('prevents a backdated correction from overdrawing an intervening business date', function () {
    $other = $this->application->replicate();
    $other->application_no = 'SAV-HISTORY';
    $other->save();
    DB::table('accounting_periods')->update(['starts_on' => today()->subYear()->startOfYear()->toDateString()]);
    $firstDay = today()->subDays(3)->toDateString();
    $secondDay = today()->subDays(2)->toDateString();
    $thirdDay = today()->subDay()->toDateString();
    $account = $this->ledger->open($this->actor, $other->id, 2, $firstDay, '0', 'New historical account');
    $first = $this->ledger->transact($this->actor, $account->id, 'deposit', '100', 1, $firstDay, 'deposit-0001', 'First deposit');
    $this->ledger->transact($this->actor, $account->id, 'withdrawal', '100', 1, $secondDay, 'withdraw-001', 'Withdrawal');
    $this->ledger->transact($this->actor, $account->id, 'deposit', '100', 1, $thirdDay, 'deposit-0002', 'Later deposit');
    expect(fn () => $this->ledger->reverse($this->actor, $first->id, $firstDay, 'reverse-0001', 'Backdated correction'))->toThrow(ValidationException::class);
    expect($this->ledger->balances($account->id)['balance_paisa'])->toBe(10000);
});

it('validates decimal strings at the HTTP boundary and renders the reconciled statement', function () {
    $this->actingAs($this->actor)->postJson('/savings-ledger/accounts/'.$this->account->id.'/transactions', [
        'kind' => 'deposit', 'amount' => '12.34', 'counter_account_id' => 1,
        'business_date' => $this->date, 'idempotency_key' => 'http-deposit-01', 'description' => 'Receipt',
    ])->assertRedirect();
    $this->postJson('/savings-ledger/accounts/'.$this->account->id.'/transactions', [
        'kind' => 'deposit', 'amount' => 12.34, 'counter_account_id' => 1,
        'business_date' => $this->date, 'idempotency_key' => 'http-deposit-02', 'description' => 'Float rejected',
    ])->assertUnprocessable();
    $this->get('/savings-ledger?account_id='.$this->account->id)->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page->component('SavingsLedger/Index')
            ->where('balances.balance_paisa', 1234)->where('reconciliation.matches', true));
});
