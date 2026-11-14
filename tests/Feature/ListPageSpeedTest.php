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

beforeEach(function () {
    $this->withoutVite();
    $role = Role::create(['name' => Role::SUPER_ADMIN, 'display_name' => 'Admin']);
    $this->admin = User::factory()->create(['role_id' => $role->id, 'has_all_access' => true]);
    $zone = Zone::create(['name' => 'Zone', 'code' => 'Z1']);
    $area = Area::create(['name' => 'Area', 'code' => 'A1', 'zone_id' => $zone->id]);
    $this->branch = Branch::create(['name' => 'Branch', 'code' => '0001', 'area_id' => $area->id]);
    $this->samity = Samity::create(['samity_code' => 'S1', 'samity_name' => 'One', 'branch_id' => $this->branch->id, 'is_active' => true]);
    Samity::create(['samity_code' => 'S2', 'samity_name' => 'Two', 'branch_id' => $this->branch->id, 'is_active' => true]);
    $this->member = MemberAdmission::create([
        'application_no' => '0001000001', 'branch_id' => $this->branch->id, 'samity_id' => $this->samity->id, 'status' => 'approved',
    ]);
});

it('counts loan statuses once and loads samities only after a location is chosen', function () {
    $loan = fn (string $number, string $status, array $extra = []) => LoanApplication::create([
        'application_no' => $number, 'member_admission_id' => $this->member->id, 'branch_id' => $this->branch->id, 'samity_id' => $this->samity->id,
        'status' => $status, 'requested_amount' => '1000', ...$extra,
    ]);
    $loan('LOAN-DRAFT', LoanApplication::STATUS_DRAFT);
    $loan('LOAN-OUT', LoanApplication::STATUS_DISBURSED);
    $loan('LOAN-STOP', LoanApplication::STATUS_PENDING_CANCELLATION, [
        'cancellation_from_status' => LoanApplication::STATUS_PENDING_HEAD_OFFICE,
        'legacy_member_snapshot' => ['secret' => 'SNAPSHOT-SECRET'],
    ]);

    $this->actingAs($this->admin)->get('/member/loan-applications')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('stats.total', 2)
            ->where('stats.draft', 1)
            ->where('stats.disbursed', 1)
            ->where('stats.pending_cancellation', 1)
            ->where('stats.ho_pending_cancellation', 1)
            ->has('samities', 0)
            ->missing('applications.data.0.legacy_member_snapshot'));

    $this->get('/member/loan-applications?branch_id='.$this->branch->id)
        ->assertOk()
        ->assertInertia(fn ($page) => $page->has('samities', 2));
});

it('sums savings totals without sending stored form photos', function () {
    $product = SavingsProduct::factory()->create();
    $base = [
        'member_admission_id' => $this->member->id, 'savings_product_id' => $product->id,
        'branch_id' => $this->branch->id, 'samity_id' => $this->samity->id, 'duration_months' => 12,
    ];
    SavingsApplication::create([...$base, 'application_no' => 'SAV-1', 'status' => 'active', 'deposit_amount' => '100.00']);
    SavingsApplication::create([...$base, 'application_no' => 'SAV-2', 'status' => 'closed', 'deposit_amount' => '40.00', 'form_data' => [
        'withdrawal' => ['total_payout' => 50],
        'photo' => 'SECRETPHOTO',
    ]]);
    SavingsApplication::create([...$base, 'application_no' => 'SAV-3', 'status' => 'closed', 'deposit_amount' => '5.00', 'maturity_amount' => '10.00']);

    $this->actingAs($this->admin)->get('/member/savings-applications')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('stats.total', 3)
            ->where('stats.active', 1)
            ->where('stats.closed', 2)
            ->where('stats.total_deposit', 145)
            ->where('stats.total_withdrawn', 60)
            ->where('stats.net_balance', 85));

    expect($this->get('/member/savings-applications')->getContent())->not->toContain('SECRETPHOTO');
});

it('shows a sister admission open loan without a query per member', function () {
    $sister = MemberAdmission::create([
        'application_no' => '0001000001', 'branch_id' => $this->branch->id, 'samity_id' => $this->samity->id,
        'status' => 'approved', 'previous_admission_id' => $this->member->id,
    ]);
    LoanApplication::create([
        'application_no' => 'LOAN-SISTER', 'member_admission_id' => $sister->id, 'branch_id' => $this->branch->id,
        'samity_id' => $this->samity->id, 'status' => LoanApplication::STATUS_SUBMITTED, 'requested_amount' => '1000',
    ]);

    $this->actingAs($this->admin)->get('/member-admissions?status=all')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('stats.total', 1)
            ->where('stats.approved', 1)
            ->where('admissions.data.0.existing_loan_form.application_no', 'LOAN-SISTER')
            ->where('admissions.data.0.has_active_loan', true));
});
