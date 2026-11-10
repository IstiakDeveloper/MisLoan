<?php

use App\Models\Area;
use App\Models\Branch;
use App\Models\LoanApplication;
use App\Models\MemberAdmission;
use App\Models\Role;
use App\Models\Samity;
use App\Models\User;
use App\Models\Zone;
use App\Services\Accounting\JournalService;
use App\Services\Loans\LoanContract;
use App\Services\Loans\LoanLedger;
use App\Services\Loans\LoanPortfolio;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Testing\AssertableInertia;
use Symfony\Component\HttpKernel\Exception\HttpException;

beforeEach(function () {
    $role = Role::create(['name' => Role::SUPER_ADMIN, 'display_name' => 'Admin']);
    $this->actor = User::factory()->create(['role_id' => $role->id]);
    $zone = Zone::create(['name' => 'Zone', 'code' => 'Z1']);
    $area = Area::create(['name' => 'Area', 'code' => 'A1', 'zone_id' => $zone->id]);
    $this->branch = Branch::create(['name' => 'Branch', 'code' => '0001', 'area_id' => $area->id]);
    $samity = Samity::create(['samity_code' => 'S1', 'samity_name' => 'Test', 'branch_id' => $this->branch->id]);
    $member = MemberAdmission::create(['application_no' => '0001000001', 'branch_id' => $this->branch->id, 'samity_id' => $samity->id, 'status' => 'draft']);
    $this->date = today()->subDays(10)->toDateString();
    $this->application = LoanApplication::create([
        'application_no' => 'LOAN-001', 'member_admission_id' => $member->id, 'branch_id' => $this->branch->id, 'samity_id' => $samity->id,
        'status' => LoanApplication::STATUS_DISBURSED, 'disbursed_amount' => '50000', 'approved_amount' => '50000', 'requested_amount' => '50000',
        'disbursed_at' => $this->date, 'repayment_frequency' => 'weekly', 'installment_amount' => '1250', 'number_of_installments' => 46,
        'loan_agreement_data' => ['service_charge' => '6350', 'installment_amount' => '1250', 'last_installment_amount' => '100', 'number_of_installments' => 46],
    ]);
    foreach (['asset', 'asset', 'income', 'equity'] as $i => $type) {
        DB::table('ledger_accounts')->insert(['id' => $i + 1, 'code' => 'GL'.$i, 'name' => $type, 'type' => $type, 'created_at' => now(), 'updated_at' => now()]);
    }
    DB::table('accounting_periods')->insert(['branch_id' => $this->branch->id, 'starts_on' => today()->subYear()->toDateString(), 'ends_on' => today()->addYear()->toDateString(), 'created_at' => now(), 'updated_at' => now()]);
    $this->ledger = app(LoanLedger::class);
    $this->open = fn ($p = '50000', $c = '6350', $mode = 'disbursement') => $this->ledger->open($this->actor, $this->application->id, 1, 3, $mode === 'disbursement' ? 2 : 4, $mode, $this->date, $this->date, $p, $c, 'Verified signed contract');
});

it('opens the original contract with reconciled schedule and principal GL only', function () {
    $a = ($this->open)();
    expect($this->ledger->balances($a->id))->toBe(['principal_paisa' => 5000000, 'charge_paisa' => 635000, 'total_paisa' => 5635000])
        ->and(DB::table('loan_installments')->count())->toBe(46)
        ->and((int) DB::table('loan_installments')->sum('due_paisa'))->toBe(5635000)
        ->and(DB::table('journal_lines')->where('ledger_account_id', 3)->count())->toBe(0)
        ->and($this->ledger->reconciliation($this->actor, $a->id)['matches'])->toBeTrue();
    expect(($this->open)()->id)->toBe($a->id)->and(DB::table('journal_entries')->count())->toBe(1);
});

it('imports declared outstanding balances without manufacturing historic receipts', function () {
    $a = ($this->open)('40000', '5000', 'opening_balance');
    expect((int) $a->pre_opening_paid_paisa)->toBe(1135000)->and(DB::table('loan_transactions')->count())->toBe(1);
    $schedule = $this->ledger->schedule($a->id, $this->date);
    expect($schedule[0]['outstanding_paisa'])->toBe(0)->and($this->ledger->reconciliation($this->actor, $a->id)['matches'])->toBeTrue();
});

it('posts a split receipt atomically and derives FIFO dues', function () {
    $a = ($this->open)();
    $t = $this->ledger->repay($this->actor, $a->id, '1000', '250', 2, $this->date, 'receipt-0001', 'Collection');
    expect((int) $t->principal_paisa)->toBe(-100000)->and((int) $t->charge_paisa)->toBe(-25000)
        ->and($this->ledger->schedule($a->id, $this->date)[0]['outstanding_paisa'])->toBe(0)
        ->and($this->ledger->reconciliation($this->actor, $a->id)['matches'])->toBeTrue()
        ->and(DB::table('journal_entries')->find($t->journal_entry_id)->source_type)->toBe('loan');
    expect($this->ledger->repay($this->actor, $a->id, '1000.00', '250.00', 2, $this->date, 'receipt-0001', 'Collection')->id)->toBe($t->id);
    expect(fn () => $this->ledger->repay($this->actor, $a->id, '1001', '250', 2, $this->date, 'receipt-0001', 'Collection'))->toThrow(ValidationException::class);
});

it('settles and reopens source and ledger together on correction', function () {
    $a = ($this->open)();
    $t = $this->ledger->repay($this->actor, $a->id, '50000', '6350', 2, $this->date, 'receipt-full', 'Full settlement');
    expect($this->application->fresh()->status)->toBe(LoanApplication::STATUS_REPAID)->and(DB::table('loan_accounts')->find($a->id)->status)->toBe('closed');
    expect(fn () => app(JournalService::class)->reverse($this->actor, $t->journal_entry_id, $this->date, 'direct-00001', 'Bypass'))->toThrow(ValidationException::class);
    $r = $this->ledger->reverse($this->actor, $t->id, $this->date, 'reverse-0001', 'Wrong receipt');
    expect($this->application->fresh()->status)->toBe(LoanApplication::STATUS_DISBURSED)->and($this->ledger->balances($a->id)['total_paisa'])->toBe(5635000)
        ->and($this->ledger->reconciliation($this->actor, $a->id)['matches'])->toBeTrue();
    expect($this->ledger->reverse($this->actor, $t->id, $this->date, 'reverse-0001', 'Wrong receipt')->id)->toBe($r->id);
    expect(fn () => $this->ledger->reverse($this->actor, $t->id, $this->date, 'reverse-0002', 'Again'))->toThrow(ValidationException::class);
});

it('rejects component overpayment and leaves both ledgers intact', function () {
    $a = ($this->open)();
    expect(fn () => $this->ledger->repay($this->actor, $a->id, '0', '6350.01', 2, $this->date, 'receipt-0001', 'Overcharge'))->toThrow(ValidationException::class);
    expect(DB::table('journal_entries')->count())->toBe(1)->and(DB::table('loan_transactions')->count())->toBe(1);
});

it('rolls back collection in a closed accounting period', function () {
    $a = ($this->open)();
    DB::table('accounting_periods')->update(['closed_at' => now(), 'closed_by' => $this->actor->id]);
    expect(fn () => $this->ledger->repay($this->actor, $a->id, '10', '0', 2, $this->date, 'receipt-0001', 'Closed'))->toThrow(ValidationException::class);
    expect(DB::table('loan_transactions')->count())->toBe(1)->and($this->ledger->balances($a->id)['total_paisa'])->toBe(5635000);
});

it('requires an open period even for charge-only audited opening', function () {
    DB::table('accounting_periods')->update(['closed_at' => now(), 'closed_by' => $this->actor->id]);
    expect(fn () => ($this->open)('0', '100', 'opening_balance'))->toThrow(ValidationException::class);
    expect(DB::table('loan_accounts')->count())->toBe(0);
});

it('blocks source financial edits deletion and manual settlement', function () {
    ($this->open)();
    foreach ([['disbursed_amount' => '40000'], ['status' => LoanApplication::STATUS_REPAID], ['loan_agreement_data' => ['service_charge' => '1']]] as $changes) {
        expect(fn () => $this->application->fresh()->update($changes))->toThrow(ValidationException::class);
    }
    expect(fn () => $this->application->fresh()->delete())->toThrow(ValidationException::class);
    $this->application->fresh()->update(['loan_agreement_data' => [...$this->application->loan_agreement_data, 'note' => 'Signature verified']]);
    expect($this->application->fresh()->loan_agreement_data['note'])->toBe('Signature verified');
});

it('rejects inconsistent saved totals without creating a financial account', function () {
    $this->application->update(['loan_agreement_data' => [...$this->application->loan_agreement_data, 'last_installment_amount' => '101']]);
    expect(fn () => ($this->open)())->toThrow(ValidationException::class);
    expect(DB::table('loan_accounts')->count())->toBe(0);
});

it('preserves month-end anchor for monthly installments', function () {
    $rows = app(LoanContract::class)->schedule(['count' => 3, 'frequency' => 'monthly', 'disbursed_on' => '2026-01-01', 'regular_paisa' => 100, 'last_paisa' => 101], '2026-01-31');
    expect(array_column($rows, 'due_on'))->toBe(['2026-01-31', '2026-02-28', '2026-03-31']);
});

it('serves loan ledger and saved contract only to authorized users', function () {
    $a = ($this->open)();
    $this->actingAs($this->actor)->get('/loan-ledger?account_id='.$a->id)->assertOk()->assertInertia(fn (AssertableInertia $p) => $p->component('LoanLedger/Index')->where('balances.total_paisa', 5635000));
    $this->get('/loan-ledger/contracts/'.$this->application->id)->assertOk()->assertJsonPath('charge_paisa', 635000);
    $this->actor->update(['is_active' => false]);
    $this->get('/loan-ledger')->assertForbidden();
});

it('checks future balances when backdating a receipt', function () {
    $a = ($this->open)();
    $this->ledger->repay($this->actor, $a->id, '49999', '0', 2, today()->toDateString(), 'receipt-later', 'Later');
    expect(fn () => $this->ledger->repay($this->actor, $a->id, '2', '0', 2, $this->date, 'receipt-early', 'Earlier'))->toThrow(ValidationException::class);
    expect($this->ledger->balances($a->id, $this->date)['principal_paisa'])->toBe(5000000);
});

it('rejects invalid receipt money without posting', function (string $amount) {
    $a = ($this->open)();
    expect(fn () => $this->ledger->repay($this->actor, $a->id, $amount, '0', 2, $this->date, 'receipt-0001', 'Invalid'))->toThrow(ValidationException::class);
    expect(DB::table('loan_transactions')->count())->toBe(1);
})->with(['-1', '1.001', '1e3', '1000000000001']);

it('forbids opening for an ordinary staff identity', function () {
    $this->actor = User::factory()->create();
    expect(fn () => ($this->open)())->toThrow(HttpException::class);
    expect(DB::table('loan_accounts')->count())->toBe(0);
});

it('rejects partial balances in disbursement mode', function () {
    expect(fn () => ($this->open)('40000', '5000'))->toThrow(ValidationException::class);
    expect(DB::table('journal_entries')->count())->toBe(0);
});

it('posts collection and reversal through authenticated HTTP endpoints', function () {
    $a = ($this->open)();
    $this->actingAs($this->actor)->post('/loan-ledger/accounts/'.$a->id.'/repayments', ['principal_amount' => '100', 'charge_amount' => '10', 'cash_account_id' => 2, 'business_date' => $this->date, 'idempotency_key' => 'http-receipt', 'description' => 'HTTP receipt'])->assertSessionHasNoErrors()->assertRedirect();
    $receipt = DB::table('loan_transactions')->where('kind', 'repayment')->first();
    expect($receipt)->not->toBeNull();
    $this->post('/loan-ledger/transactions/'.$receipt->id.'/reverse', ['business_date' => $this->date, 'idempotency_key' => 'http-reverse', 'reason' => 'Correct HTTP receipt'])->assertSessionHasNoErrors()->assertRedirect();
    expect($this->ledger->balances($a->id)['total_paisa'])->toBe(5635000);
});

it('reports historical portfolio even after a loan is settled today', function () {
    $a = ($this->open)();
    $this->ledger->repay($this->actor, $a->id, '50000', '6350', 2, today()->toDateString(), 'portfolio-paid', 'Settlement');
    $portfolio = app(LoanPortfolio::class);
    $report = $portfolio->summary($portfolio->accounts($this->actor, $this->date), $this->date);
    expect($report['totals']['principal_paisa'])->toBe('5000000')->and($report['totals']['overdue_paisa'])->toBe('0');
    $current = $portfolio->summary($portfolio->accounts($this->actor, today()->toDateString()), today()->toDateString());
    expect($current['totals']['principal_paisa'])->toBe('0')->and($current['totals']['outstanding_count'])->toBe(0);
});

it('uses the entire outstanding principal for PAR and respects exact aging boundaries', function () {
    $date = today()->subDays(100)->toDateString();
    $this->application->update(['disbursed_at' => $date]);
    $a = $this->ledger->open($this->actor, $this->application->id, 1, 3, 2, 'disbursement', $date, $date, '50000', '6350', 'PAR fixture');
    $portfolio = app(LoanPortfolio::class);
    foreach ([30 => '0', 31 => '5000000', 90 => '5000000', 91 => '5000000'] as $days => $expected) {
        $asOf = CarbonImmutable::parse($date)->addDays($days)->toDateString();
        $summary = $portfolio->summary($portfolio->accounts($this->actor, $asOf), $asOf)['totals'];
        expect($summary['par30_paisa'])->toBe($expected)->and($summary['par90_paisa'])->toBe($days > 90 ? '5000000' : '0');
    }
    $this->ledger->repay($this->actor, $a->id, '1000', '250', 2, $date, 'portfolio-pay', 'First due');
    $asOf = CarbonImmutable::parse($date)->addDays(31)->toDateString();
    $summary = $portfolio->summary($portfolio->accounts($this->actor, $asOf), $asOf)['totals'];
    expect($summary['par30_paisa'])->toBe('0')->and($summary['principal_paisa'])->toBe('4900000')->and($summary['aged_1_30_paisa'])->toBe('4900000');
});

it('excludes accounts before audited opening and isolates branch filters', function () {
    ($this->open)('40000', '5000', 'opening_balance');
    $portfolio = app(LoanPortfolio::class);
    $before = today()->subDays(11)->toDateString();
    expect($portfolio->summary($portfolio->accounts($this->actor, $before), $before)['totals']['account_count'])->toBe(0);
    expect($portfolio->summary($portfolio->accounts($this->actor, $this->date, $this->branch->id), $this->date)['totals']['principal_paisa'])->toBe('4000000');
    expect($portfolio->summary($portfolio->accounts($this->actor, $this->date, $this->branch->id + 999), $this->date)['totals']['account_count'])->toBe(0);
});

it('restores portfolio arrears after receipt reversal', function () {
    $a = ($this->open)();
    $t = $this->ledger->repay($this->actor, $a->id, '1000', '250', 2, $this->date, 'portfolio-pay', 'First due');
    $portfolio = app(LoanPortfolio::class);
    $today = today()->toDateString();
    $before = $portfolio->summary($portfolio->accounts($this->actor, $today), $today)['totals'];
    $this->ledger->reverse($this->actor, $t->id, $today, 'portfolio-reverse', 'Reverse');
    $after = $portfolio->summary($portfolio->accounts($this->actor, $today), $today)['totals'];
    expect((int) $after['overdue_paisa'] - (int) $before['overdue_paisa'])->toBe(125000);
});

it('reports incomplete coverage and validates portfolio HTTP filters', function () {
    $this->withoutVite();
    $this->actingAs($this->actor)->get('/loan-portfolio')->assertOk()->assertInertia(fn (AssertableInertia $p) => $p->component('LoanPortfolio/Index')->where('unlinkedDisbursedCount', 1)->where('totals.account_count', 0));
    ($this->open)();
    $this->get('/loan-portfolio?branch_id='.$this->branch->id)->assertOk()->assertInertia(fn (AssertableInertia $p) => $p->where('unlinkedDisbursedCount', 0)->where('totals.account_count', 1));
    $this->get('/loan-portfolio?as_of=2099-01-01')->assertSessionHasErrors('as_of');
    $this->actor->update(['is_active' => false]);
    $this->get('/loan-portfolio')->assertForbidden();
});

it('combines branches without multiplying balances by installment rows', function () {
    ($this->open)();
    $branch = Branch::create(['name' => 'Second branch', 'code' => '0002', 'area_id' => $this->branch->area_id]);
    $samity = Samity::create(['samity_code' => 'S2', 'samity_name' => 'Second', 'branch_id' => $branch->id]);
    $member = MemberAdmission::create(['application_no' => '0002000001', 'branch_id' => $branch->id, 'samity_id' => $samity->id, 'status' => 'draft']);
    $loan = $this->application->replicate();
    $loan->fill(['application_no' => 'LOAN-002', 'branch_id' => $branch->id, 'samity_id' => $samity->id, 'member_admission_id' => $member->id]);
    $loan->save();
    DB::table('accounting_periods')->insert(['branch_id' => $branch->id, 'starts_on' => today()->subYear()->toDateString(), 'ends_on' => today()->addYear()->toDateString(), 'created_at' => now(), 'updated_at' => now()]);
    $this->ledger->open($this->actor, $loan->id, 1, 3, 4, 'opening_balance', $this->date, $this->date, '40000', '5000', 'Second branch audited opening');
    $portfolio = app(LoanPortfolio::class);
    $date = today()->toDateString();
    $all = $portfolio->summary($portfolio->accounts($this->actor, $date), $date);
    $single = $portfolio->summary($portfolio->accounts($this->actor, $date, $branch->id), $date);
    expect($all['totals']['principal_paisa'])->toBe('9000000')->and($all['totals']['account_count'])->toBe(2)
        ->and($all['branches'])->toHaveCount(2)->and($single['totals']['principal_paisa'])->toBe('4000000');
});
