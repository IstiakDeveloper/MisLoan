<?php

use App\Models\Area;
use App\Models\Branch;
use App\Models\LoanApplication;
use App\Models\LoanCategory;
use App\Models\LoanProduct;
use App\Models\MemberAdmission;
use App\Models\Role;
use App\Models\Samity;
use App\Models\SavingsApplication;
use App\Models\SavingsProduct;
use App\Models\User;
use App\Models\Zone;
use App\Services\Loans\LoanLedger;
use App\Services\Loans\ProductLoanPricing;
use App\Services\Savings\SavingsLedger;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

beforeEach(function () {
    $this->withoutVite();
    $role = Role::create(['name' => Role::SUPER_ADMIN, 'display_name' => 'Admin']);
    $manager = Role::create(['name' => Role::BRANCH_MANAGER, 'display_name' => 'Manager']);
    $this->admin = User::factory()->create(['role_id' => $role->id]);
    $this->reviewer = User::factory()->create(['role_id' => $role->id]);
    $zone = Zone::create(['name' => 'Zone', 'code' => 'Z1']);
    $area = Area::create(['name' => 'Area', 'code' => 'A1', 'zone_id' => $zone->id]);
    $this->branch = Branch::create(['name' => 'Branch', 'code' => '0001', 'area_id' => $area->id]);
    $other = Branch::create(['name' => 'Other', 'code' => '0002', 'area_id' => $area->id]);
    $samity = Samity::create(['samity_code' => 'S1', 'samity_name' => 'Test', 'branch_id' => $this->branch->id]);
    $this->member = MemberAdmission::create(['application_no' => '0001000001', 'branch_id' => $this->branch->id, 'samity_id' => $samity->id, 'status' => 'draft']);
    $this->date = today()->subDays(10)->toDateString();
    $this->application = LoanApplication::create([
        'application_no' => 'LOAN-001', 'member_admission_id' => $this->member->id, 'branch_id' => $this->branch->id, 'samity_id' => $samity->id,
        'status' => LoanApplication::STATUS_DISBURSED, 'disbursed_amount' => '50000', 'approved_amount' => '50000', 'requested_amount' => '50000',
        'disbursed_at' => $this->date, 'repayment_frequency' => 'weekly', 'installment_amount' => '1250', 'number_of_installments' => 46,
        'loan_agreement_data' => ['service_charge' => '6350', 'installment_amount' => '1250', 'last_installment_amount' => '100', 'number_of_installments' => 46],
    ]);
    foreach (['asset', 'asset', 'income', 'equity', 'expense', 'liability'] as $i => $type) {
        DB::table('ledger_accounts')->insert(['id' => $i + 1, 'code' => 'GL'.$i, 'name' => $type, 'type' => $type, 'created_at' => now(), 'updated_at' => now()]);
    }
    DB::table('accounting_periods')->insert(['branch_id' => $this->branch->id, 'starts_on' => today()->subYear()->toDateString(), 'ends_on' => today()->addYear()->toDateString(), 'created_at' => now(), 'updated_at' => now()]);
    $this->cashier = User::factory()->create(['role_id' => $manager->id, 'branch_id' => $this->branch->id, 'account_type' => 'staff']);
    $this->otherCashier = User::factory()->create(['role_id' => $manager->id, 'branch_id' => $other->id, 'account_type' => 'staff']);
    $this->loan = app(LoanLedger::class)->open($this->admin, $this->application->id, 1, 3, 4, 'opening_balance', $this->date, $this->date, '50000', '6350', 'Verified signed contract');
});

it('gives each new admission its own identity and leaves schedules unchanged when reschedule is approved', function () {
    expect($this->member->fresh()->member_identity_id)->not->toBeNull();
    $second = MemberAdmission::create(['application_no' => '0001000002', 'branch_id' => $this->branch->id, 'samity_id' => $this->application->samity_id, 'status' => 'draft']);
    expect($second->member_identity_id)->not->toBe($this->member->fresh()->member_identity_id);

    $installments = DB::table('loan_installments')->where('loan_account_id', $this->loan->id)->count();
    $this->actingAs($this->admin)->post('/loan-ledger/accounts/'.$this->loan->id.'/reschedule', [
        'reason' => 'Member asked for a longer term', 'idempotency_key' => 'reschedule-1',
    ])->assertSessionHasErrors('reschedule');
    $this->post('/accounting/institution-policy', ['reschedule_enabled' => true])->assertSessionHasNoErrors();
    $this->post('/loan-ledger/accounts/'.$this->loan->id.'/reschedule', [
        'reason' => 'Member asked for a longer term', 'idempotency_key' => 'reschedule-1',
    ])->assertSessionHasNoErrors();
    $request = DB::table('loan_reschedule_requests')->first();
    $this->actingAs($this->reviewer)->post('/loan-ledger/reschedules/'.$request->id.'/review', [
        'decision' => 'approved', 'note' => 'Decision only',
    ])->assertSessionHasNoErrors();
    expect(DB::table('loan_installments')->where('loan_account_id', $this->loan->id)->count())->toBe($installments)
        ->and(DB::table('loan_reschedule_requests')->value('status'))->toBe('approved');
});

it('refuses automatic postings until the rule and account are saved', function () {
    expect(fn () => app(LoanLedger::class)->writeOff($this->admin, $this->loan->id, '100.00', $this->date, 'writeoff-1', 'Unconfigured write-off'))
        ->toThrow(ValidationException::class);
    expect(fn () => app(LoanLedger::class)->rebate($this->admin, $this->loan->id, $this->date, 'rebate-1', 'Unconfigured rebate'))
        ->toThrow(ValidationException::class);

    $category = LoanCategory::create(['category_name' => 'Rebate', 'category_code' => 'RB', 'is_active' => true]);
    $product = LoanProduct::create([
        'loan_category_id' => $category->id, 'product_name' => 'Weekly', 'product_code' => '9.02',
        'installment_type' => 'weekly', 'duration_months' => 12, 'number_of_installments' => 46,
        'min_amount' => '1000', 'max_amount' => '100000', 'interest_rate' => '12.50', 'interest_calculation_type' => 'flat',
        'service_charge' => '12.70', 'is_active' => true,
    ]);
    DB::table('loan_applications')->where('id', $this->application->id)->update(['loan_product_id' => $product->id]);
    $this->actingAs($this->admin)->post('/accounting/institution-policy', [
        'partial_priority' => 'principal_first', 'write_off_expense_account_id' => 5, 'reschedule_enabled' => false,
    ])->assertSessionHasNoErrors();
    $this->post('/accounting/posting-defaults', [
        'loan_product_id' => $product->id, 'loan_principal_account_id' => 1, 'loan_charge_income_account_id' => 3,
        'loan_rebate_expense_account_id' => 5,
    ])->assertSessionHasNoErrors();

    $this->actingAs($this->cashier)->post('/cash-desk/loans/'.$this->loan->id.'/repayments', [
        'amount' => '100.00', 'business_date' => $this->date, 'idempotency_key' => 'split-receipt', 'description' => 'Policy split',
        'cash_account_id' => 2,
    ])->assertSessionHasNoErrors();
    $receipt = DB::table('loan_transactions')->where('kind', 'repayment')->first();
    expect((int) $receipt->principal_paisa)->toBe(-10000)->and((int) $receipt->charge_paisa)->toBe(0);
    $this->actingAs($this->cashier)->get('/cash-desk/receipts/loans/'.$receipt->id)->assertOk();
    $this->actingAs($this->otherCashier)->get('/cash-desk/receipts/loans/'.$receipt->id)->assertForbidden();

    app(LoanLedger::class)->writeOff($this->admin, $this->loan->id, '50.00', $this->date, 'writeoff-1', 'Configured write-off');
    app(LoanLedger::class)->rebate($this->admin, $this->loan->id, $this->date, 'rebate-1', 'Unearned product charge');
    $rebate = DB::table('loan_transactions')->where('kind', 'rebate')->first();
    $rebateLines = DB::table('journal_lines')->where('journal_entry_id', $rebate->journal_entry_id)->orderBy('id')->get();
    expect(DB::table('loan_transactions')->where('kind', 'write_off')->count())->toBe(1)
        ->and((int) $rebate->charge_paisa)->toBe(-621195)
        ->and((int) $rebate->principal_paisa)->toBe(0)
        ->and($rebateLines->pluck('ledger_account_id')->sort()->values()->all())->toBe([3, 5]);
});

it('keeps a signed quote on the policy version after the live product rate changes', function () {
    $category = LoanCategory::create(['category_name' => 'Test', 'category_code' => 'T', 'is_active' => true]);
    $product = LoanProduct::create([
        'loan_category_id' => $category->id, 'product_name' => 'Weekly', 'product_code' => '9.01',
        'installment_type' => 'monthly', 'duration_months' => 12, 'number_of_installments' => 1,
        'min_amount' => '1000', 'max_amount' => '100000', 'interest_rate' => '0', 'interest_calculation_type' => 'flat',
        'service_charge_per_thousand' => '100', 'is_active' => true,
    ]);
    $this->actingAs($this->admin)->post('/accounting/product-policies', [
        'product_type' => 'loan', 'product_id' => $product->id, 'effective_on' => today()->subDay()->toDateString(),
    ])->assertSessionHasNoErrors();
    $product->update(['service_charge_per_thousand' => '200']);
    $quote = app(ProductLoanPricing::class)->quote($product->fresh(), '1000.00');
    expect($quote['service_charge_paisa'])->toBe(10000);
    expect(app(ProductLoanPricing::class)->quote($product->fresh(), '1000.00', null, today()->subDays(3)->toDateString())['service_charge_paisa'])->toBe(20000);
});

it('posts configured savings profit and a mapped regulatory balance', function () {
    DB::table('ledger_accounts')->insert(['id' => 7, 'code' => 'GL6', 'name' => 'second expense', 'type' => 'expense', 'created_at' => now(), 'updated_at' => now()]);
    $product = SavingsProduct::factory()->create(['interest_rate' => 10, 'duration_months' => 12, 'profit_distribution_type' => 'maturity']);
    $application = SavingsApplication::create([
        'application_no' => 'SAV-001', 'member_admission_id' => $this->member->id, 'savings_product_id' => $product->id,
        'branch_id' => $this->branch->id, 'samity_id' => $this->application->samity_id, 'deposit_amount' => '100.00',
        'duration_months' => 12, 'status' => 'active',
    ]);
    $opened = today()->subYear()->toDateString();
    $account = app(SavingsLedger::class)->open($this->admin, $application->id, 6, $opened, '0.00', 'Verified new account');
    $this->actingAs($this->admin)->post('/accounting/posting-defaults', [
        'branch_id' => $this->branch->id, 'savings_cash_account_id' => 2,
    ])->assertSessionHasNoErrors();
    $this->actingAs($this->cashier)->post('/cash-desk/savings/'.$account->id.'/transactions', [
        'kind' => 'deposit', 'amount' => '365.00', 'business_date' => today()->toDateString(),
        'idempotency_key' => 'profit-base', 'description' => 'Deposit',
    ])->assertSessionHasNoErrors();
    expect(fn () => app(SavingsLedger::class)->configuredProfit($this->admin, $account->id, today()->toDateString(), 'profit-1', 'Unconfigured profit'))
        ->toThrow(ValidationException::class);
    $this->actingAs($this->admin)->post('/accounting/posting-defaults', [
        'savings_product_id' => $product->id, 'savings_profit_expense_account_id' => 5,
    ])->assertSessionHasNoErrors();
    app(SavingsLedger::class)->configuredProfit($this->admin, $account->id, today()->toDateString(), 'profit-1', 'One year at the product rate');
    $profit = DB::table('savings_transactions')->where('savings_account_id', $account->id)->where('kind', 'profit')->first();
    expect(app(SavingsLedger::class)->balances($account->id)['balance_paisa'])->toBe(36500 + 3650)
        ->and((int) $profit->counter_account_id)->toBe(5);

    $early = SavingsProduct::factory()->create(['interest_rate' => 9, 'duration_months' => 60, 'profit_distribution_type' => 'maturity', 'product_code' => '24.02']);
    $earlyApplication = SavingsApplication::create([
        'application_no' => 'SAV-002', 'member_admission_id' => $this->member->id, 'savings_product_id' => $early->id,
        'branch_id' => $this->branch->id, 'samity_id' => $this->application->samity_id, 'deposit_amount' => '120.00',
        'duration_months' => 60, 'status' => 'active',
    ]);
    $earlyAccount = app(SavingsLedger::class)->open($this->admin, $earlyApplication->id, 6, today()->subMonths(2)->toDateString(), '0.00', 'Verified early account');
    $this->actingAs($this->cashier)->post('/cash-desk/savings/'.$earlyAccount->id.'/transactions', [
        'kind' => 'deposit', 'amount' => '120.00', 'business_date' => today()->toDateString(),
        'idempotency_key' => 'profit-early-base', 'description' => 'Deposit',
    ])->assertSessionHasNoErrors();
    $this->actingAs($this->admin)->post('/accounting/posting-defaults', [
        'savings_product_id' => $early->id, 'savings_profit_expense_account_id' => 7,
    ])->assertSessionHasNoErrors();
    app(SavingsLedger::class)->configuredProfit($this->admin, $earlyAccount->id, today()->toDateString(), 'profit-early', 'Two months on the calculator tier');
    $earlyProfit = DB::table('savings_transactions')->where('savings_account_id', $earlyAccount->id)->where('kind', 'profit')->first();
    expect((int) $earlyProfit->amount_paisa)->toBe(120)->and((int) $earlyProfit->counter_account_id)->toBe(7);

    $this->post('/accounting/regulatory-mappings', [
        'framework' => 'mra', 'line_code' => 'L1', 'line_name' => 'Loan principal', 'ledger_account_id' => 1,
    ])->assertSessionHasNoErrors();
    $this->get('/accounting/regulatory-mappings?as_of='.$this->date)->assertOk()->assertInertia(fn ($page) => $page
        ->where('mappings.0.balance_paisa', 5000000));
});
