<?php

use App\Models\Area;
use App\Models\Branch;
use App\Models\LoanApplication;
use App\Models\LoanCategory;
use App\Models\LoanProduct;
use App\Models\MemberAdmission;
use App\Models\Role;
use App\Models\Samity;
use App\Models\User;
use App\Models\Zone;
use App\Services\Accounting\FinancialReports;
use App\Services\Accounting\JournalService;
use App\Services\Accounting\VoucherService;
use App\Services\Loans\LoanContract;
use App\Services\Loans\LoanCorrections;
use App\Services\Loans\LoanLedger;
use App\Services\Loans\LoanPortfolio;
use App\Services\Reporting\LedgerStatements;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
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

function prepareWorkspaceDisbursement(object $test): array
{
    $category = LoanCategory::create(['category_name' => 'Test loans', 'category_code' => 'TEST', 'is_active' => true]);
    $product = LoanProduct::create([
        'loan_category_id' => $category->id, 'product_name' => 'Weekly loan', 'product_code' => '1.01',
        'installment_type' => 'weekly', 'duration_months' => 12, 'number_of_installments' => 46,
        'min_amount' => '1000', 'max_amount' => '100000', 'interest_rate' => '12.70', 'interest_calculation_type' => 'flat',
        'service_charge_per_thousand' => '127', 'installment_amount_per_thousand' => '25', 'last_installment_per_thousand' => '2',
        'loan_installment_factor' => '0.0222', 'interest_installment_factor' => '0.0028', 'is_active' => true,
    ]);
    $test->application->update([
        'status' => LoanApplication::STATUS_PENDING_DISBURSEMENT, 'loan_product_id' => $product->id, 'loan_category_id' => $category->id,
        'disbursed_at' => null, 'disbursed_amount' => null, 'number_of_installments' => 12, 'repayment_frequency' => 'monthly',
        'loan_agreement_data' => ['loan_amount' => '50000'], 'guarantor_info' => ['loan_amount' => '50000'],
        'nominee_info' => ['loan_amount_received' => '50000'], 'business_plan' => ['applied_loan_amount' => '50000'],
    ]);

    return ['disbursed_amount' => '50000', 'disbursement_date' => $test->date, 'first_due_date' => $test->date,
        'principal_account_id' => 1, 'charge_income_account_id' => 3, 'counter_account_id' => 2, 'posting_reference' => 'Approved application and cash payout verified'];
}

it('posts an approved admin disbursement and its exact form contract schedule and GL atomically', function () {
    $payload = prepareWorkspaceDisbursement($this);
    $url = '/loan-ledger/applications/'.$this->application->id.'/disburse';
    $this->actingAs($this->actor)->patch($url, $payload)->assertSessionHasNoErrors()->assertRedirect();
    $loan = $this->application->fresh();
    $account = DB::table('loan_accounts')->first();
    expect($loan->status)->toBe(LoanApplication::STATUS_DISBURSED)
        ->and($loan->number_of_installments)->toBe(46)->and($loan->repayment_frequency)->toBe('weekly')
        ->and($loan->loan_agreement_data['product_pricing']['service_charge_paisa'])->toBe(635000)
        ->and($loan->business_plan['installment_principal'])->toBe('1110.00')
        ->and($loan->business_plan['last_installment_principal'])->toBe('50.00')
        ->and((int) DB::table('loan_installments')->sum('due_paisa'))->toBe(5635000)
        ->and(DB::table('journal_entries')->count())->toBe(1);
    expect($this->ledger->reconciliation($this->actor, $account->id)['matches'])->toBeTrue();
    $schedule = $this->ledger->schedule($account->id, $this->date);
    expect($schedule[0]['principal_due_paisa'])->toBe(111000)->and($schedule[45]['charge_due_paisa'])->toBe(5000);
    $this->patch($url, $payload)->assertSessionHasNoErrors()->assertRedirect();
    expect(DB::table('loan_accounts')->count())->toBe(1)->and(DB::table('loan_transactions')->count())->toBe(1)->and(DB::table('journal_entries')->count())->toBe(1);
});

it('rolls back application disbursement and form changes when financial posting fails', function () {
    $payload = prepareWorkspaceDisbursement($this);
    $before = $this->application->fresh()->loan_agreement_data;
    DB::table('accounting_periods')->update(['closed_at' => now()]);
    $this->actingAs($this->actor)->patch('/loan-ledger/applications/'.$this->application->id.'/disburse', $payload)->assertSessionHasErrors();
    expect($this->application->fresh()->status)->toBe(LoanApplication::STATUS_PENDING_DISBURSEMENT)
        ->and($this->application->fresh()->loan_agreement_data)->toBe($before)
        ->and(DB::table('loan_accounts')->count())->toBe(0)->and(DB::table('journal_entries')->count())->toBe(0);
});

it('does not disburse above approval or without the required saved forms', function () {
    $payload = prepareWorkspaceDisbursement($this);
    $this->actingAs($this->actor)->patch('/loan-ledger/applications/'.$this->application->id.'/disburse', [...$payload, 'disbursed_amount' => '60000'])->assertSessionHasErrors('disbursed_amount');
    $this->application->update(['nominee_info' => null]);
    $this->patch('/loan-ledger/applications/'.$this->application->id.'/disburse', $payload)->assertSessionHasErrors();
    expect(DB::table('loan_accounts')->count())->toBe(0)->and($this->application->fresh()->disbursed_at)->toBeNull();
});

it('keeps the product snapshot fixed and prevents editing its form pricing after posting', function () {
    $payload = prepareWorkspaceDisbursement($this);
    $this->actingAs($this->actor)->patch('/loan-ledger/applications/'.$this->application->id.'/disburse', $payload)->assertSessionHasNoErrors();
    $loan = $this->application->fresh();
    $loan->loanProduct->update(['service_charge_per_thousand' => '150']);
    $contract = app(LoanContract::class)->read($loan->fresh());
    expect((string) $contract['product']['service_charge_per_thousand'])->toBe('127')->and($contract['charge_paisa'])->toBe(635000);
    $agreement = $loan->loan_agreement_data;
    $agreement['product_pricing']['installment_split']['regular_principal_paisa'] = 100;
    expect(fn () => $loan->update(['loan_agreement_data' => $agreement]))->toThrow(ValidationException::class);
});

it('searches loans by member identity and separates final-approved and unposted work queues', function () {
    $payload = prepareWorkspaceDisbursement($this);
    $this->application->memberAdmission->update(['applicant_name_bn' => 'পরীক্ষা সদস্য']);
    $this->actingAs($this->actor)->get('/loan-ledger?q='.urlencode('পরীক্ষা'))
        ->assertOk()->assertInertia(fn (AssertableInertia $p) => $p->where('workspaceCounts.ready', 1)->where('workspaceCounts.unposted', 0)->where('readyApplications.data.0.application_no', 'LOAN-001'));
    $this->get('/loan-ledger/contracts/'.$this->application->id)->assertOk()->assertJsonPath('missing_forms', [])->assertJsonPath('count', 46);
    $this->patch('/loan-ledger/applications/'.$this->application->id.'/disburse', $payload)->assertSessionHasNoErrors();
    $this->get('/loan-ledger?product_id='.$this->application->loan_product_id)->assertOk()->assertInertia(fn (AssertableInertia $p) => $p->where('workspaceCounts.ready', 0)->where('workspaceCounts.active', 1)->where('accounts.data.0.member_name_bn', 'পরীক্ষা সদস্য'));
});

it('rejects an invalid payout account and ordinary staff without leaving a partial disbursement', function () {
    $payload = prepareWorkspaceDisbursement($this);
    $url = '/loan-ledger/applications/'.$this->application->id.'/disburse';
    $this->actingAs(User::factory()->create())->patch($url, $payload)->assertForbidden();
    $this->actingAs($this->actor)->patch($url, [...$payload, 'counter_account_id' => 1])->assertSessionHasErrors('ledger');
    expect($this->application->fresh()->status)->toBe(LoanApplication::STATUS_PENDING_DISBURSEMENT)
        ->and(DB::table('loan_accounts')->count())->toBe(0)->and(DB::table('journal_entries')->count())->toBe(0);
});

it('rejects a saved pricing snapshot whose components do not reconcile with the contract', function () {
    $loan = $this->application;
    $agreement = $loan->loan_agreement_data;
    $agreement['product_pricing'] = ['principal_paisa' => 5000000, 'service_charge_paisa' => 635000, 'installment_paisa' => 125000, 'last_installment_paisa' => 10000, 'number_of_installments' => 46, 'repayment_frequency' => 'weekly',
        'installment_split' => ['regular_principal_paisa' => 111000, 'regular_charge_paisa' => 14000, 'last_principal_paisa' => 6000, 'last_charge_paisa' => 4000]];
    $loan->loan_agreement_data = $agreement;
    expect(fn () => app(LoanContract::class)->read($loan))->toThrow(ValidationException::class);
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
    expect($this->ledger->balances($a->id)['total_paisa'])->toBe(5624000);
    $request = DB::table('loan_correction_requests')->first();
    $checker = User::factory()->create(['role_id' => $this->actor->role_id]);
    $this->actingAs($checker)->post('/loan-ledger/corrections/'.$request->id.'/review', ['decision' => 'approved', 'note' => 'Verified correction'])->assertSessionHasNoErrors()->assertRedirect();
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

it('requires a distinct reviewer and posts an approved correction exactly once', function () {
    $a = ($this->open)();
    $receipt = $this->ledger->repay($this->actor, $a->id, '100', '10', 2, $this->date, 'review-receipt', 'Receipt');
    $service = app(LoanCorrections::class);
    $request = $service->request($this->actor, $receipt->id, $this->date, 'review-request', 'Wrong member receipt');
    expect($this->ledger->balances($a->id)['total_paisa'])->toBe(5624000);
    expect($service->request($this->actor, $receipt->id, $this->date, 'review-request', 'Wrong member receipt')->id)->toBe($request->id);
    expect(fn () => $service->request($this->actor, $receipt->id, $this->date, 'review-request', 'Different reason'))->toThrow(ValidationException::class);
    expect(fn () => $service->request($this->actor, $receipt->id, $this->date, 'another-request', 'Duplicate pending'))->toThrow(ValidationException::class);
    expect(fn () => $service->decide($this->actor, $request->id, 'approved', 'Self review'))->toThrow(ValidationException::class);
    $checker = User::factory()->create(['role_id' => $this->actor->role_id]);
    $approved = $service->decide($checker, $request->id, 'approved', 'Verified original receipt');
    expect($approved->status)->toBe('approved')->and((int) $approved->reviewed_by)->toBe($checker->id)
        ->and($this->ledger->balances($a->id)['total_paisa'])->toBe(5635000);
    expect($service->decide($checker, $request->id, 'approved', 'Verified original receipt')->id)->toBe($request->id);
    expect(DB::table('loan_transactions')->where('kind', 'reversal')->count())->toBe(1);
    expect(fn () => $service->decide($checker, $request->id, 'rejected', 'Changed mind'))->toThrow(ValidationException::class);
});

it('retains rejected requests and permits a new independently reviewed proposal', function () {
    $a = ($this->open)();
    $receipt = $this->ledger->repay($this->actor, $a->id, '100', '0', 2, $this->date, 'review-receipt', 'Receipt');
    $service = app(LoanCorrections::class);
    $r = $service->request($this->actor, $receipt->id, $this->date, 'review-request', 'Please reverse');
    $checker = User::factory()->create(['role_id' => $this->actor->role_id]);
    $service->decide($checker, $r->id, 'rejected', 'Evidence missing');
    expect(DB::table('loan_transactions')->count())->toBe(2)->and(DB::table('loan_correction_requests')->find($r->id)->status)->toBe('rejected');
    $new = $service->request($this->actor, $receipt->id, $this->date, 'new-request-key', 'Evidence attached to reference ABC');
    expect($new->id)->not->toBe($r->id);
});

it('leaves a correction pending when its posting cannot pass accounting controls', function () {
    $a = ($this->open)();
    $receipt = $this->ledger->repay($this->actor, $a->id, '100', '0', 2, $this->date, 'review-receipt', 'Receipt');
    $service = app(LoanCorrections::class);
    $r = $service->request($this->actor, $receipt->id, $this->date, 'review-request', 'Please reverse');
    $checker = User::factory()->create(['role_id' => $this->actor->role_id]);
    DB::table('accounting_periods')->update(['closed_at' => now(), 'closed_by' => $checker->id]);
    expect(fn () => $service->decide($checker, $r->id, 'approved', 'Verified'))->toThrow(ValidationException::class);
    expect(DB::table('loan_correction_requests')->find($r->id)->status)->toBe('pending')->and(DB::table('loan_transactions')->count())->toBe(2);
});

it('blocks ordinary or inactive reviewers and proposals against opening transactions', function () {
    $a = ($this->open)();
    $service = app(LoanCorrections::class);
    $opening = DB::table('loan_transactions')->first();
    expect(fn () => $service->request($this->actor, $opening->id, $this->date, 'review-opening', 'Reverse opening'))->toThrow(ValidationException::class);
    $receipt = $this->ledger->repay($this->actor, $a->id, '100', '0', 2, $this->date, 'review-receipt', 'Receipt');
    $r = $service->request($this->actor, $receipt->id, $this->date, 'review-request', 'Please reverse');
    foreach ([User::factory()->create(), User::factory()->create(['role_id' => $this->actor->role_id, 'is_active' => false])] as $checker) {
        expect(fn () => $service->decide($checker, $r->id, 'approved', 'Verified'))->toThrow(HttpException::class);
    }
    expect(DB::table('loan_transactions')->where('kind', 'reversal')->count())->toBe(0);
});

it('reconciles posted financial statements with loan collections and historical opening', function () {
    $a = ($this->open)('50000', '6350', 'opening_balance');
    $this->ledger->repay($this->actor, $a->id, '1000', '250', 2, today()->toDateString(), 'financial-report', 'Collection');
    $reports = app(FinancialReports::class);
    $all = $reports->balances($this->actor, $this->date, today()->toDateString(), $this->branch->id);
    expect($all['totals']['asset_paisa'])->toBe('5025000')->and($all['totals']['equity_paisa'])->toBe('5000000')
        ->and($all['totals']['period_income_paisa'])->toBe('25000')->and($all['totals']['balance_sheet_difference_paisa'])->toBe('0')->and($all['totals']['trial_difference_paisa'])->toBe('0');
    $today = $reports->balances($this->actor, today()->toDateString(), today()->toDateString());
    $principal = $today['rows']->firstWhere('id', 1);
    expect($principal->opening_paisa)->toBe('5000000')->and($principal->credit_paisa)->toBe('100000')->and($principal->closing_paisa)->toBe('4900000');
    $historic = $reports->balances($this->actor, $this->date, $this->date);
    expect($historic['totals']['income_paisa'])->toBe('0');
});

it('computes account running balances before pagination including opening and reversals', function () {
    $a = ($this->open)('50000', '6350', 'opening_balance');
    $t = $this->ledger->repay($this->actor, $a->id, '1000', '250', 2, today()->toDateString(), 'financial-report', 'Collection');
    $this->ledger->reverse($this->actor, $t->id, today()->toDateString(), 'report-reverse', 'Reverse collection');
    $reports = app(FinancialReports::class);
    $ledger = $reports->accountLedger($this->actor, 1, today()->toDateString(), today()->toDateString(), $this->branch->id);
    expect($ledger['opening_paisa'])->toBe('5000000');
    $second = $ledger['query']->paginate(1, ['*'], 'page', 2)->items()[0];
    expect((string) $second->running_paisa)->toBe('5000000')->and((string) $second->debit_paisa)->toBe('100000');
});

it('serves financial reports and formula-safe exact CSV exports', function () {
    $this->withoutVite();
    ($this->open)('50000', '6350', 'opening_balance');
    DB::table('ledger_accounts')->where('id', 1)->update(['name' => '=HYPERLINK("bad")']);
    $this->actingAs($this->actor)->get('/accounting/reports?account_id=1')->assertOk()->assertInertia(fn (AssertableInertia $p) => $p->component('FinancialReports/Index')->where('totals.trial_difference_paisa', '0'));
    $csv = $this->get('/accounting/reports?download=balances')->assertOk()->assertHeader('Cache-Control', 'no-store, private')->streamedContent();
    expect($csv)->toContain("'=HYPERLINK")->toContain('50000.00');
    $ledger = $this->get('/accounting/reports?download=ledger&account_id=1')->assertOk()->streamedContent();
    expect($ledger)->toContain('Verified signed contract');
    $this->get('/accounting/reports?download=ledger')->assertStatus(422);
    $this->actor->update(['is_active' => false]);
    $this->get('/accounting/reports')->assertForbidden();
});

it('validates financial report dates and preserves inactive account history', function () {
    ($this->open)();
    DB::table('ledger_accounts')->where('id', 1)->update(['is_active' => false]);
    $reports = app(FinancialReports::class);
    expect($reports->balances($this->actor, $this->date, $this->date)['rows']->firstWhere('id', 1)->closing_paisa)->toBe('5000000');
    expect(fn () => $reports->balances($this->actor, '2026-02-30', $this->date))->toThrow(ValidationException::class);
    expect(fn () => $reports->balances($this->actor, today()->toDateString(), $this->date))->toThrow(ValidationException::class);
});

it('exports loan statements with as-of reversal history and safe descriptions', function () {
    $a = ($this->open)('50000', '6350', 'opening_balance');
    $t = $this->ledger->repay($this->actor, $a->id, '100', '10', 2, $this->date, 'export-statement', '=SUM(1,2)');
    $this->ledger->reverse($this->actor, $t->id, today()->toDateString(), 'export-reverse', '<script>alert(1)</script>');
    $statements = app(LedgerStatements::class);
    expect($statements->read($this->actor, 'loan', $a->id, null, $this->date)['closing_paisa'])->toBe('5624000');
    $this->actingAs($this->actor)->get('/loan-ledger/accounts/'.$a->id.'/statement')->assertOk()->assertHeader('Cache-Control', 'no-store, private')->assertSee('&lt;script&gt;alert(1)&lt;/script&gt;', false)->assertDontSee('<script>alert(1)</script>', false);
    $csv = $this->get('/loan-ledger/accounts/'.$a->id.'/statement?format=csv')->assertOk()->streamedContent();
    expect($csv)->toContain("'=SUM(1,2)")->toContain('56350.00');
    $this->get('/loan-ledger/accounts/'.$a->id.'/statement?from=2000-01-01')->assertSessionHasErrors('from');
    $this->actingAs(User::factory()->create())->get('/loan-ledger/accounts/'.$a->id.'/statement')->assertForbidden();
});

it('keeps financial report totals and running balances exact above JavaScript safe integers', function () {
    $entry = app(JournalService::class)->post($this->actor, $this->branch->id, $this->date, 'precision-seed', 'Precision seed', [
        ['account_id' => 1, 'debit_paisa' => 99999999999999, 'credit_paisa' => 0],
        ['account_id' => 4, 'debit_paisa' => 0, 'credit_paisa' => 99999999999999],
    ]);
    $template = (array) DB::table('journal_entries')->find($entry->id);
    unset($template['id']);
    // Create immutable test rows in bulk to exercise aggregation beyond an individual posting limit.
    for ($i = 0; $i < 100; $i++) {
        $id = DB::table('journal_entries')->insertGetId([...$template, 'reference' => (string) Str::uuid(), 'idempotency_key' => 'precision-'.$i]);
        DB::table('journal_lines')->insert([
            ['journal_entry_id' => $id, 'ledger_account_id' => 1, 'debit_paisa' => 99999999999999, 'credit_paisa' => 0],
            ['journal_entry_id' => $id, 'ledger_account_id' => 4, 'debit_paisa' => 0, 'credit_paisa' => 99999999999999],
        ]);
    }
    $reports = app(FinancialReports::class);
    expect($reports->balances($this->actor, $this->date, $this->date)['totals']['asset_paisa'])->toBe('10099999999999899');
    $last = $reports->accountLedger($this->actor, 1, $this->date, $this->date)['query']->get()->last();
    expect((string) $last->running_paisa)->toBe('10099999999999899');
});

it('checks ledger coverage and catches unmatched manual control-account adjustments', function () {
    $this->artisan('misloan:check-ledgers', ['--json' => true])->assertExitCode(1);
    ($this->open)();
    $this->artisan('misloan:check-ledgers', ['--json' => true])->assertExitCode(0);
    app(JournalService::class)->post($this->actor, $this->branch->id, $this->date, 'unmatched-control', 'Unmatched manual adjustment', [
        ['account_id' => 1, 'debit_paisa' => 1, 'credit_paisa' => 0], ['account_id' => 4, 'debit_paisa' => 0, 'credit_paisa' => 1],
    ]);
    $this->artisan('misloan:check-ledgers', ['--json' => true])->assertExitCode(1);
});

it('separates period income and expenses from earlier cumulative results', function () {
    DB::table('ledger_accounts')->insert(['id' => 5, 'code' => 'EXP', 'name' => 'Expense', 'type' => 'expense', 'created_at' => now(), 'updated_at' => now()]);
    $journals = app(JournalService::class);
    $journals->post($this->actor, $this->branch->id, $this->date, 'earlier-income', 'Prior income', [
        ['account_id' => 2, 'debit_paisa' => 10000, 'credit_paisa' => 0], ['account_id' => 3, 'debit_paisa' => 0, 'credit_paisa' => 10000],
    ]);
    $journals->post($this->actor, $this->branch->id, today()->toDateString(), 'current-expense', 'Current expense', [
        ['account_id' => 5, 'debit_paisa' => 2000, 'credit_paisa' => 0], ['account_id' => 2, 'debit_paisa' => 0, 'credit_paisa' => 2000],
    ]);
    $reports = app(FinancialReports::class);
    $result = $reports->balances($this->actor, today()->toDateString(), today()->toDateString(), $this->branch->id);
    expect($result['totals']['period_surplus_paisa'])->toBe('-2000')->and($result['totals']['cumulative_surplus_paisa'])->toBe('8000')
        ->and($result['rows']->firstWhere('id', 3)->period_normal_paisa)->toBe('0')->and($result['rows']->firstWhere('id', 5)->period_normal_paisa)->toBe('2000');
    expect($reports->balances($this->actor, $this->date, today()->toDateString(), $this->branch->id + 100)['rows'])->toHaveCount(0);
});

it('requires a different reviewer before manual voucher posting and retains the proposed content', function () {
    $service = app(VoucherService::class);
    $lines = [['account_id' => 1, 'debit_paisa' => 10501, 'credit_paisa' => 0], ['account_id' => 4, 'debit_paisa' => 0, 'credit_paisa' => 10501]];
    $v = $service->propose($this->actor, $this->branch->id, $this->date, 'voucher-0001', 'Opening', $lines);
    expect(DB::table('journal_entries')->count())->toBe(0)->and($v->status)->toBe('pending');
    expect($service->propose($this->actor, $this->branch->id, $this->date, 'voucher-0001', 'Opening', array_reverse($lines))->id)->toBe($v->id);
    expect(fn () => $service->propose($this->actor, $this->branch->id, $this->date, 'voucher-0001', 'Changed', $lines))->toThrow(ValidationException::class);
    expect(fn () => $service->decide($this->actor, $v->id, 'approved', 'Self approved'))->toThrow(ValidationException::class);
    $checker = User::factory()->create(['role_id' => $this->actor->role_id]);
    $approved = $service->decide($checker, $v->id, 'approved', 'Verified source');
    expect($approved->status)->toBe('approved')->and(DB::table('journal_entries')->count())->toBe(1)
        ->and(DB::table('journal_entries')->find($approved->journal_entry_id)->created_by)->toBe($checker->id);
    expect($service->decide($checker, $v->id, 'approved', 'Verified source')->id)->toBe($v->id);
    expect(fn () => $service->decide($checker, $v->id, 'rejected', 'Changed mind'))->toThrow(ValidationException::class);
});

it('revalidates voucher posting controls on approval and rolls back the decision', function () {
    $service = app(VoucherService::class);
    $lines = [['account_id' => 1, 'debit_paisa' => 100, 'credit_paisa' => 0], ['account_id' => 4, 'debit_paisa' => 0, 'credit_paisa' => 100]];
    $v = $service->propose($this->actor, $this->branch->id, $this->date, 'voucher-0001', 'Opening', $lines);
    $checker = User::factory()->create(['role_id' => $this->actor->role_id]);
    DB::table('accounting_periods')->update(['closed_at' => now(), 'closed_by' => $checker->id]);
    expect(fn () => $service->decide($checker, $v->id, 'approved', 'Verified'))->toThrow(ValidationException::class);
    expect(DB::table('accounting_vouchers')->find($v->id)->status)->toBe('pending')->and(DB::table('journal_entries')->count())->toBe(0);
    $service->decide($checker, $v->id, 'rejected', 'Period closed; resubmit for an open date');
    expect(DB::table('accounting_vouchers')->find($v->id)->status)->toBe('rejected');
});

it('routes manual reversal through approval and refuses source-ledger bypasses', function () {
    $service = app(VoucherService::class);
    $original = app(JournalService::class)->post($this->actor, $this->branch->id, $this->date, 'manual-original', 'Manual opening', [['account_id' => 1, 'debit_paisa' => 100, 'credit_paisa' => 0], ['account_id' => 4, 'debit_paisa' => 0, 'credit_paisa' => 100]]);
    $v = $service->proposeReversal($this->actor, $original->id, $this->date, 'reverse-proposal', 'Correct manual opening');
    expect(DB::table('journal_entries')->count())->toBe(1);
    expect(fn () => $service->proposeReversal($this->actor, $original->id, $this->date, 'another-proposal', 'Duplicate'))->toThrow(ValidationException::class);
    $checker = User::factory()->create(['role_id' => $this->actor->role_id]);
    $approved = $service->decide($checker, $v->id, 'approved', 'Verified');
    expect(DB::table('journal_entries')->find($approved->journal_entry_id)->reversal_of)->toBe($original->id);
    $a = ($this->open)();
    $source = DB::table('loan_transactions')->where('loan_account_id', $a->id)->first();
    expect(fn () => $service->proposeReversal($this->actor, $source->journal_entry_id, $this->date, 'bypass-proposal', 'Bypass loan ledger'))->toThrow(ValidationException::class);
});

it('serves voucher proposals and review through the accounting workspace', function () {
    $this->withoutVite();
    $this->actingAs($this->actor)->post('/accounting/journals', ['branch_id' => $this->branch->id, 'business_date' => $this->date, 'idempotency_key' => 'http-voucher-001', 'description' => 'HTTP voucher', 'lines' => [['account_id' => 1, 'debit_paisa' => 100, 'credit_paisa' => 0], ['account_id' => 4, 'debit_paisa' => 0, 'credit_paisa' => 100]]])->assertSessionHasNoErrors()->assertRedirect();
    expect(DB::table('journal_entries')->count())->toBe(0);
    $v = DB::table('accounting_vouchers')->first();
    $this->get('/accounting?branch_id='.$this->branch->id)->assertOk()->assertInertia(fn (AssertableInertia $p) => $p->component('Accounting/Index')->where('vouchers.data.0.status', 'pending'));
    $checker = User::factory()->create(['role_id' => $this->actor->role_id]);
    $this->actingAs($checker)->post('/accounting/vouchers/'.$v->id.'/review', ['decision' => 'approved', 'note' => 'HTTP verified'])->assertSessionHasNoErrors()->assertRedirect();
    expect(DB::table('journal_entries')->count())->toBe(1);
    $this->actor->update(['is_active' => false]);
    $this->actingAs($this->actor)->post('/accounting/vouchers/'.$v->id.'/review', ['decision' => 'approved', 'note' => 'Unauthorized'])->assertForbidden();
});
