<?php

use App\Models\Area;
use App\Models\Branch;
use App\Models\LoanApplication;
use App\Models\MemberAdmission;
use App\Models\Role;
use App\Models\Samity;
use App\Models\SavingsApplication;
use App\Models\SavingsProduct;
use App\Models\User;
use App\Models\Zone;
use App\Services\ImageCompressionService;
use App\Services\Loans\LoanLedger;
use App\Services\Savings\SavingsLedger;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpKernel\Exception\HttpException;

beforeEach(function () {
    $adminRole = Role::create(['name' => Role::SUPER_ADMIN, 'display_name' => 'Admin']);
    $managerRole = Role::create(['name' => Role::BRANCH_MANAGER, 'display_name' => 'Branch manager']);
    $this->admin = User::factory()->create(['role_id' => $adminRole->id]);
    $zone = Zone::create(['name' => 'Zone', 'code' => 'Z1']);
    $area = Area::create(['name' => 'Area', 'code' => 'A1', 'zone_id' => $zone->id]);
    $this->branch = Branch::create(['name' => 'Branch', 'code' => '0001', 'area_id' => $area->id]);
    $this->otherBranch = Branch::create(['name' => 'Other', 'code' => '0002', 'area_id' => $area->id]);
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
    $this->cashier = User::factory()->create(['role_id' => $managerRole->id, 'branch_id' => $this->branch->id, 'account_type' => 'staff']);
    $this->otherCashier = User::factory()->create(['role_id' => $managerRole->id, 'branch_id' => $this->otherBranch->id, 'account_type' => 'staff']);
    $this->receiver = User::factory()->create(['role_id' => $managerRole->id, 'branch_id' => $this->branch->id, 'account_type' => 'staff']);
    $this->loan = app(LoanLedger::class)->open($this->admin, $this->application->id, 1, 3, 4, 'opening_balance', $this->date, $this->date, '50000', '6350', 'Verified signed contract');
});

it('lets a branch cashier collect with a saved cash default and keeps administration closed', function () {
    $this->actingAs($this->cashier)->get('/accounting')->assertForbidden();
    $this->get('/loan-ledger')->assertForbidden();
    $this->post('/loan-ledger/accounts/'.$this->loan->id.'/repayments', [
        'principal_amount' => '100.00', 'charge_amount' => '10.00', 'cash_account_id' => 2,
        'business_date' => $this->date, 'idempotency_key' => 'blocked-cashier', 'description' => 'Blocked direct ledger',
    ])->assertForbidden();

    $this->actingAs($this->admin)->post('/accounting/posting-defaults', [
        'branch_id' => $this->branch->id, 'loan_cash_account_id' => 2, 'savings_cash_account_id' => 2,
    ])->assertSessionHasNoErrors()->assertRedirect();

    $this->actingAs($this->cashier)->post('/cash-desk/loans/'.$this->loan->id.'/repayments', [
        'principal_amount' => '100.00', 'charge_amount' => '10.00', 'business_date' => $this->date,
        'idempotency_key' => 'cashier-receipt', 'description' => 'Branch collection',
    ])->assertSessionHasNoErrors()->assertRedirect();

    expect(DB::table('loan_transactions')->where('kind', 'repayment')->count())->toBe(1)
        ->and((int) DB::table('journal_lines')->where('ledger_account_id', 2)->sum('debit_paisa'))->toBe(11000);
    $this->actingAs($this->otherCashier)->post('/cash-desk/loans/'.$this->loan->id.'/repayments', [
        'principal_amount' => '1.00', 'charge_amount' => '0.00', 'cash_account_id' => 2,
        'business_date' => $this->date, 'idempotency_key' => 'other-branch', 'description' => 'Wrong branch',
    ])->assertForbidden();
});

it('requires another administrator to approve a counted day-end and can match a bank line', function () {
    $this->actingAs($this->cashier)->post('/cash-desk/sessions', [
        'branch_id' => $this->branch->id, 'cash_account_id' => 2, 'business_date' => today()->toDateString(),
        'opening_count' => '0.00', 'idempotency_key' => 'session-open',
    ])->assertSessionHasNoErrors();
    $session = DB::table('cashier_sessions')->first();
    $this->post('/cash-desk/sessions/'.$session->id.'/submit', ['counted_cash' => '1.00'])->assertSessionHasErrors('cash_desk');
    expect(DB::table('cashier_sessions')->find($session->id)->status)->toBe('open');
    $this->post('/cash-desk/sessions/'.$session->id.'/submit', ['counted_cash' => '0.00'])->assertSessionHasNoErrors();
    $this->post('/cash-desk/sessions/'.$session->id.'/review', [
        'decision' => 'approved', 'note' => 'Self approval', 'handed_over_to' => $this->receiver->id,
    ])->assertForbidden();

    $this->actingAs($this->admin)->post('/cash-desk/sessions/'.$session->id.'/review', [
        'decision' => 'approved', 'note' => 'Count matches the book', 'handed_over_to' => $this->receiver->id,
    ])->assertSessionHasNoErrors();
    $approved = DB::table('cashier_sessions')->find($session->id);
    expect($approved->status)->toBe('approved')->and((int) $approved->handed_over_to)->toBe($this->receiver->id)
        ->and(DB::table('journal_entries')->count())->toBe(1);

    $line = DB::table('journal_lines')->where('ledger_account_id', 1)->first();
    $this->post('/cash-desk/statements', [
        'branch_id' => $this->branch->id, 'bank_account_id' => 1, 'business_date' => $this->date,
        'amount' => '50000.00', 'reference' => 'BANK-1', 'description' => 'Opening principal',
    ])->assertSessionHasNoErrors();
    $statement = DB::table('bank_statement_lines')->first();
    $this->post('/cash-desk/statements/'.$statement->id.'/match', ['journal_line_id' => $line->id])->assertSessionHasNoErrors();
    expect((int) DB::table('bank_statement_lines')->first()->matched_journal_line_id)->toBe((int) $line->id);
});

it('serves a member file only to an active user of that branch', function () {
    Storage::fake('local');
    Storage::disk('local')->put('admissions/member.webp', 'secret-photo');
    $this->member->update(['customer_photo_path' => 'admissions/member.webp']);

    $this->get('/documents?path=admissions/member.webp')->assertRedirect(route('login'));
    $response = $this->actingAs($this->cashier)->get('/documents?path=admissions/member.webp');
    $response->assertOk()->assertHeader('Cache-Control', 'no-store, private');
    expect($response->streamedContent())->toBe('secret-photo');
    $this->actingAs($this->otherCashier)->get('/documents?path=admissions/member.webp')->assertForbidden();
    $this->actingAs($this->cashier)->get('/documents?path=../.env')->assertNotFound();
    $this->cashier->update(['is_active' => false]);
    $this->actingAs($this->cashier->fresh())->get('/documents?path=admissions/member.webp')->assertForbidden();
});

it('stores new uploads on the private disk', function () {
    Storage::fake('local');
    Storage::fake('public');
    $path = app(ImageCompressionService::class)->compressPhoto(UploadedFile::fake()->image('member.png', 40, 40), 'admissions/customer_photos');

    expect($path)->toBeString();
    Storage::disk('local')->assertExists($path);
    Storage::disk('public')->assertMissing($path);
});

it('lets a cashier post a savings deposit from the cash default and blocks manual profit', function () {
    $product = SavingsProduct::factory()->create();
    $savingsApplication = SavingsApplication::create([
        'application_no' => 'SAV-001', 'member_admission_id' => $this->member->id, 'savings_product_id' => $product->id,
        'branch_id' => $this->branch->id, 'samity_id' => $this->application->samity_id, 'deposit_amount' => '100.00',
        'duration_months' => 12, 'status' => 'active',
    ]);
    $account = app(SavingsLedger::class)->open($this->admin, $savingsApplication->id, 6, today()->toDateString(), '0.00', 'Verified new account');
    $this->actingAs($this->admin)->post('/accounting/posting-defaults', [
        'branch_id' => $this->branch->id, 'savings_cash_account_id' => 2,
    ])->assertSessionHasNoErrors();
    $this->actingAs($this->cashier)->post('/cash-desk/savings/'.$account->id.'/transactions', [
        'kind' => 'deposit', 'amount' => '25.00', 'business_date' => today()->toDateString(),
        'idempotency_key' => 'sav-deposit', 'description' => 'Cash deposit',
    ])->assertSessionHasNoErrors();
    expect(app(SavingsLedger::class)->balances($account->id)['balance_paisa'])->toBe(2500);
    expect(fn () => app(SavingsLedger::class)->transact($this->cashier, $account->id, 'profit', '1.00', 5, today()->toDateString(), 'profit-block', 'Manual profit'))
        ->toThrow(HttpException::class);
});
