<?php

use App\Models\Branch;
use App\Models\LoanApplication;
use App\Models\LoanMember;
use App\Models\MemberAdmission;
use App\Models\Role;
use App\Models\Samity;
use App\Models\SavingsApplication;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

beforeEach(function () {
    Schema::dropIfExists('loan_members');
    Schema::dropIfExists('savings_applications');
    Schema::dropIfExists('loan_applications');
    Schema::dropIfExists('member_other_assets');
    Schema::dropIfExists('member_family_members');
    Schema::dropIfExists('member_admissions');
    Schema::dropIfExists('samities');
    Schema::dropIfExists('loan_application_approvals');
    Schema::dropIfExists('member_admission_approvals');
    Schema::dropIfExists('loan_application_issues');
    Schema::dropIfExists('member_admission_issues');
    Schema::dropIfExists('user_zones');
    Schema::dropIfExists('user_areas');
    Schema::dropIfExists('user_branches');
    Schema::dropIfExists('users');
    Schema::dropIfExists('roles');
    Schema::dropIfExists('branches');
    Schema::dropIfExists('areas');
    Schema::dropIfExists('zones');
    Schema::dropIfExists('notifications');
    Schema::dropIfExists('settings');

    Schema::create('settings', function (Blueprint $table) {
        $table->id();
        $table->string('key')->unique();
        $table->text('value')->nullable();
        $table->timestamps();
    });

    Schema::create('notifications', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('user_id');
        $table->boolean('is_read')->default(false);
        $table->timestamps();
    });

    Schema::create('zones', function (Blueprint $table) {
        $table->id();
        $table->string('name')->nullable();
        $table->string('code')->nullable();
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('areas', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('zone_id')->nullable();
        $table->string('name')->nullable();
        $table->string('code')->nullable();
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('branches', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->string('code')->nullable();
        $table->unsignedBigInteger('area_id')->nullable();
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('roles', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->string('display_name')->nullable();
        $table->timestamps();
    });

    Schema::create('users', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->string('email')->unique();
        $table->string('password');
        $table->unsignedBigInteger('role_id')->nullable();
        $table->unsignedBigInteger('branch_id')->nullable();
        $table->unsignedBigInteger('area_id')->nullable();
        $table->unsignedBigInteger('zone_id')->nullable();
        $table->boolean('is_active')->default(true);
        $table->boolean('has_all_access')->default(false);
        $table->timestamp('email_verified_at')->nullable();
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('user_branches', function (Blueprint $table) {
        $table->unsignedBigInteger('user_id');
        $table->unsignedBigInteger('branch_id');
        $table->timestamps();
    });

    Schema::create('user_areas', function (Blueprint $table) {
        $table->unsignedBigInteger('user_id');
        $table->unsignedBigInteger('area_id');
    });

    Schema::create('user_zones', function (Blueprint $table) {
        $table->unsignedBigInteger('user_id');
        $table->unsignedBigInteger('zone_id');
    });

    Schema::create('samities', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('branch_id');
        $table->string('samity_code');
        $table->string('samity_name');
        $table->string('samity_name_bn')->nullable();
        $table->boolean('is_active')->default(true);
        $table->timestamps();
    });

    Schema::create('member_admissions', function (Blueprint $table) {
        $table->id();
        $table->string('application_no')->nullable();
        $table->string('applicant_name_bn')->nullable();
        $table->unsignedBigInteger('branch_id')->nullable();
        $table->unsignedBigInteger('samity_id')->nullable();
        $table->unsignedBigInteger('assigned_officer_id')->nullable();
        $table->unsignedBigInteger('created_by')->nullable();
        $table->string('status')->default('draft');
        $table->timestamps();
    });

    Schema::create('member_admission_issues', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('member_admission_id');
        $table->string('status')->default('pending');
        $table->text('resolution_note')->nullable();
        $table->timestamps();
    });

    Schema::create('member_admission_approvals', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('member_admission_id');
        $table->unsignedBigInteger('user_id');
        $table->string('status')->default('pending');
        $table->string('level')->nullable();
        $table->timestamps();
    });

    Schema::create('loan_application_issues', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('loan_application_id');
        $table->string('status')->default('pending');
        $table->text('response_message')->nullable();
        $table->timestamps();
    });

    Schema::create('loan_application_approvals', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('loan_application_id');
        $table->unsignedBigInteger('user_id');
        $table->string('status')->default('pending');
        $table->timestamps();
    });

    Schema::create('member_family_members', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('member_admission_id');
        $table->integer('sl_no')->nullable();
        $table->timestamps();
    });

    Schema::create('member_other_assets', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('member_admission_id');
        $table->integer('sl_no')->nullable();
        $table->timestamps();
    });

    Schema::create('loan_applications', function (Blueprint $table) {
        $table->id();
        $table->string('application_no')->nullable();
        $table->unsignedBigInteger('member_admission_id')->nullable();
        $table->unsignedBigInteger('branch_id')->nullable();
        $table->unsignedBigInteger('samity_id')->nullable();
        $table->string('status')->default('draft');
        $table->json('loan_agreement_data')->nullable();
        $table->json('guarantor_info')->nullable();
        $table->json('nominee_info')->nullable();
        $table->json('asset_info')->nullable();
        $table->json('business_plan')->nullable();
        $table->json('legacy_member_snapshot')->nullable();
        $table->json('family_members')->nullable();
        $table->decimal('monthly_income', 12, 2)->nullable();
        $table->decimal('monthly_expense', 12, 2)->nullable();
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('loan_members', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('loan_application_id');
        $table->integer('serial_no')->default(1);
        $table->string('member_name');
        $table->string('member_code')->nullable();
        $table->string('member_mobile')->nullable();
        $table->string('project_name')->nullable();
        $table->string('somiti_name')->nullable();
        $table->string('somiti_code')->nullable();
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('savings_applications', function (Blueprint $table) {
        $table->id();
        $table->string('application_no')->nullable();
        $table->unsignedBigInteger('member_admission_id');
        $table->unsignedBigInteger('branch_id')->nullable();
        $table->unsignedBigInteger('samity_id')->nullable();
        $table->string('status')->default('draft');
        $table->timestamps();
    });
});

/**
 * @return array{
 *     user: User,
 *     manager: User,
 *     branch: Branch,
 *     current: Samity,
 *     next: Samity,
 *     inactive: Samity,
 *     otherBranchSamity: Samity,
 *     member: MemberAdmission,
 *     sister: MemberAdmission,
 *     openLoan: LoanApplication,
 *     disbursedLoan: LoanApplication,
 *     draftSavings: SavingsApplication,
 *     activeSavings: SavingsApplication
 * }
 */
function memberSamityFixture(): array
{
    $branchRole = Role::query()->create([
        'name' => Role::BRANCH_USER,
        'display_name' => 'Branch User',
    ]);
    $managerRole = Role::query()->create([
        'name' => Role::BRANCH_MANAGER,
        'display_name' => 'Branch Manager',
    ]);

    $branch = Branch::query()->create(['name' => 'শাখা', 'code' => '0001']);
    $otherBranch = Branch::query()->create(['name' => 'অন্য শাখা', 'code' => '0002']);

    $user = User::query()->create([
        'name' => 'Branch User',
        'email' => 'branch-samity@test.com',
        'password' => Hash::make('password'),
        'role_id' => $branchRole->id,
        'branch_id' => $branch->id,
        'is_active' => true,
        'email_verified_at' => now(),
    ]);

    $manager = User::query()->create([
        'name' => 'Branch Manager',
        'email' => 'manager-samity@test.com',
        'password' => Hash::make('password'),
        'role_id' => $managerRole->id,
        'branch_id' => $branch->id,
        'is_active' => true,
        'email_verified_at' => now(),
    ]);

    $current = Samity::query()->create([
        'branch_id' => $branch->id,
        'samity_code' => 'S-01',
        'samity_name' => 'Old Samity',
        'samity_name_bn' => 'পুরাতন সমিতি',
        'is_active' => true,
    ]);
    $next = Samity::query()->create([
        'branch_id' => $branch->id,
        'samity_code' => 'S-02',
        'samity_name' => 'New Samity',
        'samity_name_bn' => 'নতুন সমিতি',
        'is_active' => true,
    ]);
    $inactive = Samity::query()->create([
        'branch_id' => $branch->id,
        'samity_code' => 'S-03',
        'samity_name' => 'Closed Samity',
        'samity_name_bn' => 'বন্ধ সমিতি',
        'is_active' => false,
    ]);
    $otherBranchSamity = Samity::query()->create([
        'branch_id' => $otherBranch->id,
        'samity_code' => 'S-09',
        'samity_name' => 'Other Branch',
        'samity_name_bn' => 'অন্য শাখার সমিতি',
        'is_active' => true,
    ]);

    $member = MemberAdmission::withoutEvents(fn () => MemberAdmission::query()->create([
        'application_no' => '0001000001',
        'applicant_name_bn' => 'মৌসুমি',
        'branch_id' => $branch->id,
        'samity_id' => $current->id,
        'status' => 'ready_for_head_office',
    ]));

    $sister = MemberAdmission::withoutEvents(fn () => MemberAdmission::query()->create([
        'application_no' => '0001000002',
        'applicant_name_bn' => 'অন্য দফা',
        'branch_id' => $branch->id,
        'samity_id' => $current->id,
        'status' => 'approved',
    ]));

    $openLoan = LoanApplication::query()->create([
        'application_no' => 'LN-OPEN',
        'member_admission_id' => $member->id,
        'branch_id' => $branch->id,
        'samity_id' => $current->id,
        'status' => LoanApplication::STATUS_DRAFT,
        'loan_agreement_data' => [
            'member_name_bn' => 'মৌসুমি',
            'samity_name' => 'পুরাতন সমিতি',
            'loan_amount' => 20000,
        ],
    ]);

    $disbursedLoan = LoanApplication::query()->create([
        'application_no' => 'LN-PAID',
        'member_admission_id' => $member->id,
        'branch_id' => $branch->id,
        'samity_id' => $current->id,
        'status' => LoanApplication::STATUS_DISBURSED,
        'loan_agreement_data' => [
            'samity_name' => 'পুরাতন সমিতি',
        ],
    ]);

    LoanMember::query()->create([
        'loan_application_id' => $openLoan->id,
        'serial_no' => 1,
        'member_name' => 'মৌসুমি',
        'somiti_name' => 'পুরাতন সমিতি',
        'somiti_code' => 'S-01',
    ]);

    $draftSavings = SavingsApplication::query()->create([
        'application_no' => 'SV-DRAFT',
        'member_admission_id' => $member->id,
        'branch_id' => $branch->id,
        'samity_id' => $current->id,
        'status' => SavingsApplication::STATUS_DRAFT,
    ]);

    $activeSavings = SavingsApplication::query()->create([
        'application_no' => 'SV-ACTIVE',
        'member_admission_id' => $member->id,
        'branch_id' => $branch->id,
        'samity_id' => $current->id,
        'status' => SavingsApplication::STATUS_ACTIVE,
    ]);

    return compact(
        'user',
        'manager',
        'branch',
        'current',
        'next',
        'inactive',
        'otherBranchSamity',
        'member',
        'sister',
        'openLoan',
        'disbursedLoan',
        'draftSavings',
        'activeSavings',
    );
}

it('lets a branch user move the member samity and syncs open loans and savings', function () {
    $data = memberSamityFixture();

    $this->actingAs($data['user'])
        ->from('/member/loan-applications/'.$data['openLoan']->id)
        ->patch(route('member.loan-applications.update-samity', $data['openLoan']->id), [
            'samity_id' => $data['next']->id,
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    expect($data['member']->fresh()->samity_id)->toBe($data['next']->id)
        ->and($data['sister']->fresh()->samity_id)->toBe($data['current']->id)
        ->and($data['openLoan']->fresh()->samity_id)->toBe($data['next']->id)
        ->and($data['openLoan']->fresh()->loan_agreement_data['samity_name'])->toBe('নতুন সমিতি (0002)')
        ->and($data['openLoan']->fresh()->loan_agreement_data['loan_amount'])->toBe(20000)
        ->and($data['disbursedLoan']->fresh()->samity_id)->toBe($data['current']->id)
        ->and($data['disbursedLoan']->fresh()->loan_agreement_data['samity_name'])->toBe('পুরাতন সমিতি')
        ->and($data['draftSavings']->fresh()->samity_id)->toBe($data['next']->id)
        ->and($data['activeSavings']->fresh()->samity_id)->toBe($data['current']->id);

    $loanMember = LoanMember::query()->where('loan_application_id', $data['openLoan']->id)->first();
    expect($loanMember?->somiti_name)->toBe('নতুন সমিতি')
        ->and($loanMember?->somiti_code)->toBe('S-02');
});

it('updates samity from the admission show route before head office', function () {
    $data = memberSamityFixture();

    $this->actingAs($data['user'])
        ->from('/member-admissions/'.$data['member']->id)
        ->patch(route('member-admissions.update-samity', $data['member']->id), [
            'samity_id' => $data['next']->id,
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    expect($data['member']->fresh()->samity_id)->toBe($data['next']->id);
});

it('rejects a samity from another branch', function () {
    $data = memberSamityFixture();

    $this->actingAs($data['user'])
        ->from('/member-admissions/'.$data['member']->id)
        ->patch(route('member-admissions.update-samity', $data['member']->id), [
            'samity_id' => $data['otherBranchSamity']->id,
        ])
        ->assertRedirect()
        ->assertSessionHasErrors('samity_id');

    expect($data['member']->fresh()->samity_id)->toBe($data['current']->id);
});

it('rejects an inactive samity', function () {
    $data = memberSamityFixture();

    $this->actingAs($data['user'])
        ->from('/member-admissions/'.$data['member']->id)
        ->patch(route('member-admissions.update-samity', $data['member']->id), [
            'samity_id' => $data['inactive']->id,
        ])
        ->assertRedirect()
        ->assertSessionHasErrors('samity_id');

    expect($data['member']->fresh()->samity_id)->toBe($data['current']->id);
});

it('rejects samity changes after the admission is sent to head office', function () {
    $data = memberSamityFixture();
    $data['member']->update(['status' => 'pending_head_office']);

    $this->actingAs($data['user'])
        ->from('/member-admissions/'.$data['member']->id)
        ->patch(route('member-admissions.update-samity', $data['member']->id), [
            'samity_id' => $data['next']->id,
        ])
        ->assertRedirect()
        ->assertSessionHasErrors('samity_id');

    expect($data['member']->fresh()->samity_id)->toBe($data['current']->id);
});

it('rejects samity changes after the loan is sent to head office', function () {
    $data = memberSamityFixture();
    $data['openLoan']->update(['status' => LoanApplication::STATUS_PENDING_HEAD_OFFICE]);

    $this->actingAs($data['user'])
        ->from('/member/loan-applications/'.$data['openLoan']->id)
        ->patch(route('member.loan-applications.update-samity', $data['openLoan']->id), [
            'samity_id' => $data['next']->id,
        ])
        ->assertRedirect()
        ->assertSessionHasErrors('samity_id');

    expect($data['member']->fresh()->samity_id)->toBe($data['current']->id);
});

it('rejects samity changes from a role other than branch user', function () {
    $data = memberSamityFixture();

    $this->actingAs($data['manager'])
        ->patch(route('member-admissions.update-samity', $data['member']->id), [
            'samity_id' => $data['next']->id,
        ])
        ->assertForbidden();

    expect($data['member']->fresh()->samity_id)->toBe($data['current']->id);
});
