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
use App\Services\Loans\LoanContract;
use App\Services\Loans\TestLoanSetup;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->travelTo(now()->setDate(2026, 11, 10)->startOfDay());
    Storage::fake('local');
    $role = Role::create(['name' => 'super_admin', 'display_name' => 'Administrator']);
    $this->actor = User::factory()->create(['role_id' => $role->id, 'is_active' => true, 'account_type' => 'staff']);
    $zone = Zone::create(['code' => 'Z1', 'name' => 'Zone']);
    $area = Area::create(['code' => 'A1', 'name' => 'Area', 'zone_id' => $zone->id]);
    $this->branch = Branch::create(['code' => '0001', 'name' => 'Branch', 'area_id' => $area->id]);
    $samity = Samity::create(['branch_id' => $this->branch->id, 'samity_code' => 'S1', 'samity_name' => 'Samity']);
    $member = MemberAdmission::create(['application_no' => '0001000001', 'branch_id' => $this->branch->id, 'samity_id' => $samity->id, 'status' => 'approved']);
    $category = LoanCategory::create(['category_code' => 'TEST', 'category_name' => 'Test loans']);
    $this->product = LoanProduct::create(['loan_category_id' => $category->id, 'product_code' => 'TEST-12', 'product_name' => 'Monthly test', 'installment_type' => 'monthly', 'duration_months' => 12, 'number_of_installments' => 12, 'min_amount' => '1000', 'max_amount' => '1000000', 'interest_rate' => '13.30', 'interest_calculation_type' => 'flat', 'service_charge_per_thousand' => '133', 'installment_amount_per_thousand' => '95', 'last_installment_per_thousand' => '88']);
    $base = ['branch_id' => $this->branch->id, 'samity_id' => $samity->id, 'member_admission_id' => $member->id, 'loan_category_id' => $category->id, 'loan_product_id' => $this->product->id, 'requested_amount' => '50000', 'approved_amount' => '50000', 'disbursed_amount' => '50000', 'disbursed_at' => '2026-10-04', 'status' => 'disbursed', 'loan_agreement_data' => null, 'business_plan' => ['custom_field' => 'preserve'], 'installment_amount' => '1', 'number_of_installments' => 1];
    $this->loan = LoanApplication::create(['application_no' => 'TEST-OCT-1', ...$base]);
    $this->other = LoanApplication::create(['application_no' => 'TEST-SEP-1', ...$base, 'disbursed_at' => '2026-09-04']);
    $this->pending = LoanApplication::create(['application_no' => 'TEST-PENDING', ...$base, 'status' => 'pending_disbursement']);
    $this->repaid = LoanApplication::create(['application_no' => 'TEST-REPAID', ...$base, 'status' => 'repaid']);
    $this->setup = app(TestLoanSetup::class);
});

it('previews only disbursed unposted loans in the selected month without changing data', function () {
    $plan = $this->setup->plan('2026-10');
    expect(array_column($plan['loans'], 'id'))->toBe([$this->loan->id])
        ->and($plan['errors'])->toBe([])
        ->and($plan['loans'][0]['first_due_date'])->toBe('2026-11-04')
        ->and(DB::table('ledger_accounts')->count())->toBe(0)
        ->and($this->loan->fresh()->loan_agreement_data)->toBeNull();
});

it('backs up original forms and atomically seeds reconciled funded test disbursement without changing payout or approvals', function () {
    $before = $this->loan->getRawOriginal();
    $result = $this->setup->apply($this->setup->plan('2026-10'));
    Storage::disk('local')->assertExists($result['backup']);
    $backup = array_map(fn ($line) => json_decode($line, true), explode("\n", trim(Storage::disk('local')->get($result['backup']))));
    expect($backup[1]['record']['loan_agreement_data'])->toBeNull();
    $loan = $this->loan->fresh();
    $contract = app(LoanContract::class)->read($loan);
    expect($result['posted'])->toBe(1)
        ->and($loan->disbursed_amount)->toBe('50000.00')
        ->and($loan->disbursed_at->toDateString())->toBe('2026-10-04')
        ->and($loan->approved_amount)->toBe('50000.00')
        ->and($loan->business_plan['custom_field'])->toBe('preserve')
        ->and($loan->loan_agreement_data['test_rebuild']['notice'])->toContain('TEST ONLY')
        ->and($contract['charge_paisa'])->toBe(665000)
        ->and(DB::table('loan_installments')->sum('due_paisa'))->toBe(5665000)
        ->and(DB::table('loan_accounts')->count())->toBe(1)
        ->and(DB::table('journal_entries')->count())->toBe(2)
        ->and(DB::table('accounting_periods')->count())->toBe(2)
        ->and($this->other->fresh()->loan_agreement_data)->toBeNull()
        ->and($this->pending->fresh()->status)->toBe('pending_disbursement')
        ->and($this->repaid->fresh()->status)->toBe('repaid');
    $next = $this->setup->apply($this->setup->plan('2026-10'));
    expect($next['posted'])->toBe(0)->and($next['already_posted'])->toBe(1)
        ->and(DB::table('journal_entries')->count())->toBe(2)
        ->and((string) $loan->getRawOriginal('disbursed_amount'))->toBe((string) $before['disbursed_amount']);
});

it('rolls the whole seed back when a source changes or a closed period blocks posting', function () {
    $plan = $this->setup->plan('2026-10');
    $this->loan->update(['remarks' => 'Changed after preflight']);
    expect(fn () => $this->setup->apply($plan))->toThrow(RuntimeException::class, 'source loan changed');
    expect(DB::table('ledger_accounts')->count())->toBe(0)->and(DB::table('journal_entries')->count())->toBe(0)->and(DB::table('loan_accounts')->count())->toBe(0);
    DB::table('accounting_periods')->insert(['branch_id' => $this->branch->id, 'starts_on' => '2026-10-01', 'ends_on' => '2026-10-31', 'closed_at' => now()]);
    expect(fn () => $this->setup->apply($this->setup->plan('2026-10')))->toThrow(RuntimeException::class, 'closed accounting period');
    expect($this->loan->fresh()->loan_agreement_data)->toBeNull()->and(DB::table('journal_entries')->count())->toBe(0);
});

it('rejects production environments and malformed or future months', function () {
    foreach (['bad', '2026-13', '2026-12'] as $month) {
        expect(fn () => $this->setup->plan($month))->toThrow(RuntimeException::class);
    }
    app()->instance('env', 'production');
    expect(fn () => $this->setup->plan('2026-10'))->toThrow(RuntimeException::class, 'restricted to local/testing');
});
