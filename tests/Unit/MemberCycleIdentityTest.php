<?php

use App\Http\Controllers\Member\MemberCycleHubController;
use App\Models\Branch;
use App\Models\LoanApplication;
use App\Models\MemberAdmission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

function createCycleIdentityTables(): void
{
    Schema::dropIfExists('loan_applications');
    Schema::dropIfExists('member_family_members');
    Schema::dropIfExists('member_other_assets');
    Schema::dropIfExists('member_admissions');
    Schema::dropIfExists('users');
    Schema::dropIfExists('roles');
    Schema::dropIfExists('user_branches');
    Schema::dropIfExists('user_areas');
    Schema::dropIfExists('user_zones');
    Schema::dropIfExists('settings');
    Schema::dropIfExists('branches');

    Schema::create('branches', function (Blueprint $table) {
        $table->id();
        $table->string('name')->default('Test Branch');
        $table->string('code')->nullable();
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('roles', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->string('display_name')->nullable();
        $table->text('description')->nullable();
        $table->text('permissions')->nullable();
        $table->timestamps();
    });

    Schema::create('user_branches', function (Blueprint $table) {
        $table->unsignedBigInteger('user_id');
        $table->unsignedBigInteger('branch_id');
    });

    Schema::create('user_areas', function (Blueprint $table) {
        $table->unsignedBigInteger('user_id');
        $table->unsignedBigInteger('area_id');
    });

    Schema::create('user_zones', function (Blueprint $table) {
        $table->unsignedBigInteger('user_id');
        $table->unsignedBigInteger('zone_id');
    });

    Schema::create('settings', function (Blueprint $table) {
        $table->id();
        $table->string('key')->unique();
        $table->text('value')->nullable();
        $table->timestamps();
    });

    Schema::create('users', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->string('email')->unique();
        $table->string('password')->default('secret');
        $table->unsignedBigInteger('role_id')->nullable();
        $table->unsignedBigInteger('branch_id')->nullable();
        $table->boolean('is_active')->default(true);
        $table->boolean('has_all_access')->default(false);
        $table->string('account_type')->nullable();
        $table->string('signature')->nullable();
        $table->string('pin')->nullable();
        $table->string('phone')->nullable();
        $table->timestamp('email_verified_at')->nullable();
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('member_admissions', function (Blueprint $table) {
        $table->id();
        $table->string('application_no')->nullable();
        $table->string('applicant_name_bn')->nullable();
        $table->string('applicant_name_en')->nullable();
        $table->string('nid_number')->nullable();
        $table->string('smart_card_number')->nullable();
        $table->string('mobile_number')->nullable();
        $table->unsignedBigInteger('branch_id')->nullable();
        $table->unsignedBigInteger('previous_admission_id')->nullable();
        $table->boolean('is_legacy')->default(false);
        $table->unsignedInteger('loan_dofa')->nullable();
        $table->string('status')->default('approved');
        $table->date('survey_date')->nullable();
        $table->date('admission_date')->nullable();
        $table->unsignedBigInteger('created_by')->nullable();
        $table->unsignedBigInteger('assigned_officer_id')->nullable();
        $table->decimal('monthly_income', 12, 2)->nullable();
        $table->decimal('monthly_expense', 12, 2)->nullable();
        $table->timestamps();
    });

    Schema::create('member_family_members', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('member_admission_id');
        $table->unsignedInteger('sl_no')->nullable();
        $table->string('member_name')->nullable();
        $table->timestamps();
    });

    Schema::create('member_other_assets', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('member_admission_id');
        $table->unsignedInteger('sl_no')->nullable();
        $table->string('asset_description')->nullable();
        $table->timestamps();
    });

    Schema::create('loan_applications', function (Blueprint $table) {
        $table->id();
        $table->string('application_no')->nullable();
        $table->unsignedBigInteger('member_admission_id')->nullable();
        $table->unsignedBigInteger('branch_id')->nullable();
        $table->string('status')->default('draft');
        $table->decimal('requested_amount', 12, 2)->nullable();
        $table->timestamps();
        $table->softDeletes();
    });
}

function createCycleHubOfficer(Branch $branch): User
{
    $role = Role::create([
        'name' => Role::BRANCH_USER,
        'display_name' => 'Branch User',
    ]);

    return User::create([
        'name' => 'Branch Officer',
        'email' => 'cycle-hub@test.com',
        'password' => Hash::make('password'),
        'role_id' => $role->id,
        'branch_id' => $branch->id,
        'is_active' => true,
        'pin' => '1234',
        'signature' => 'signed',
        'phone' => '01700000000',
        'email_verified_at' => now(),
    ]);
}

beforeEach(function () {
    createCycleIdentityTables();
});

it('keeps member code nid and phone unique fields on the identity list', function () {
    expect(MemberAdmission::identitySyncFields())
        ->toContain('application_no', 'nid_number', 'mobile_number', 'applicant_name_bn')
        ->and(MemberAdmission::identitySyncFields())->not->toContain('monthly_income')
        ->and(MemberAdmission::identitySyncFields())->not->toContain('present_village_road');
});

it('clones one cycle survey with the same member code nid and phone', function () {
    $branch = Branch::create(['name' => 'Dhaka', 'code' => '0001']);
    $user = createCycleHubOfficer($branch);

    $admission = MemberAdmission::create([
        'application_no' => '0001000055',
        'applicant_name_bn' => 'রহিমা',
        'nid_number' => '1990123456789',
        'mobile_number' => '01711111111',
        'branch_id' => $branch->id,
        'status' => 'approved',
        'loan_dofa' => 1,
        'monthly_income' => 8000,
        'monthly_expense' => 5000,
    ]);

    LoanApplication::create([
        'application_no' => 'LN-1',
        'member_admission_id' => $admission->id,
        'branch_id' => $branch->id,
        'status' => LoanApplication::STATUS_REPAID,
        'requested_amount' => 50000,
    ]);

    $request = Request::create('/', 'POST');
    $request->setUserResolver(fn () => $user);

    $response = app(MemberCycleHubController::class)->startNextCycle($request, $admission);
    $payload = $response->getData(true);
    $cycle = MemberAdmission::find($payload['new_admission_id']);

    expect($response->getStatusCode())->toBe(200)
        ->and($payload['success'])->toBeTrue()
        ->and($payload['cloned'])->toBeTrue()
        ->and(MemberAdmission::count())->toBe(2)
        ->and($cycle)->not->toBeNull()
        ->and($cycle->id)->not->toBe($admission->id)
        ->and($cycle->previous_admission_id)->toBe($admission->id)
        ->and($cycle->application_no)->toBe('0001000055')
        ->and($cycle->nid_number)->toBe('1990123456789')
        ->and($cycle->mobile_number)->toBe('01711111111')
        ->and((int) $cycle->loan_dofa)->toBe(2)
        ->and((float) $cycle->monthly_income)->toBe(8000.0)
        ->and($payload['edit_admission_url'])->toContain('cycle_renewal=1');
});

it('reuses an open draft cycle instead of cloning again', function () {
    $branch = Branch::create(['name' => 'Dhaka', 'code' => '0001']);
    $user = createCycleHubOfficer($branch);

    $admission = MemberAdmission::create([
        'application_no' => '0001000055',
        'nid_number' => '1990123456789',
        'mobile_number' => '01711111111',
        'branch_id' => $branch->id,
        'status' => 'approved',
        'loan_dofa' => 1,
    ]);

    LoanApplication::create([
        'application_no' => 'LN-1',
        'member_admission_id' => $admission->id,
        'branch_id' => $branch->id,
        'status' => LoanApplication::STATUS_REPAID,
    ]);

    $request = Request::create('/', 'POST');
    $request->setUserResolver(fn () => $user);
    $controller = app(MemberCycleHubController::class);

    $first = $controller->startNextCycle($request, $admission)->getData(true);
    $second = $controller->startNextCycle($request, $admission)->getData(true);

    expect(MemberAdmission::count())->toBe(2)
        ->and($second['cloned'])->toBeFalse()
        ->and($second['new_admission_id'])->toBe($first['new_admission_id']);
});

it('keeps nid when cycle income and expense change', function () {
    $branch = Branch::create(['name' => 'Dhaka', 'code' => '0001']);

    $original = MemberAdmission::create([
        'application_no' => '0001000055',
        'applicant_name_bn' => 'রহিমা',
        'nid_number' => '1990123456789',
        'mobile_number' => '01711111111',
        'branch_id' => $branch->id,
        'status' => 'approved',
        'loan_dofa' => 1,
        'monthly_income' => 8000,
        'monthly_expense' => 5000,
    ]);

    $cycle = MemberAdmission::create([
        'application_no' => '0001000055',
        'applicant_name_bn' => 'রহিমা',
        'nid_number' => '1990123456789',
        'mobile_number' => '01711111111',
        'branch_id' => $branch->id,
        'previous_admission_id' => $original->id,
        'status' => 'draft',
        'loan_dofa' => 2,
        'is_legacy' => true,
        'monthly_income' => 8000,
        'monthly_expense' => 5000,
    ]);

    $cycle->update([
        'monthly_income' => 15000,
        'monthly_expense' => 9000,
        'nid_number' => '0000000000',
        'mobile_number' => '01999999999',
    ]);
    $cycle->applyLockedIdentityFrom($original);
    $cycle->save();

    expect((float) $cycle->fresh()->monthly_income)->toBe(15000.0)
        ->and((float) $cycle->fresh()->monthly_expense)->toBe(9000.0)
        ->and($cycle->fresh()->nid_number)->toBe('1990123456789')
        ->and($cycle->fresh()->mobile_number)->toBe('01711111111')
        ->and((float) $original->fresh()->monthly_income)->toBe(8000.0);
});

it('blocks next cycle while an active loan exists', function () {
    $branch = Branch::create(['name' => 'Dhaka', 'code' => '0001']);
    $user = createCycleHubOfficer($branch);

    $admission = MemberAdmission::create([
        'application_no' => '0001000055',
        'nid_number' => '1990123456789',
        'mobile_number' => '01711111111',
        'branch_id' => $branch->id,
        'status' => 'approved',
        'loan_dofa' => 1,
    ]);

    LoanApplication::create([
        'application_no' => 'LN-1',
        'member_admission_id' => $admission->id,
        'branch_id' => $branch->id,
        'status' => LoanApplication::STATUS_DISBURSED,
        'requested_amount' => 50000,
    ]);

    $request = Request::create('/', 'POST');
    $request->setUserResolver(fn () => $user);

    $response = app(MemberCycleHubController::class)->startNextCycle($request, $admission);

    expect($response->getStatusCode())->toBe(422)
        ->and(MemberAdmission::count())->toBe(1);
});

it('treats a draft loan form as already existing so a second form cannot start', function () {
    $branch = Branch::create(['name' => 'Dhaka', 'code' => '0001']);

    $admission = MemberAdmission::create([
        'application_no' => '0001008703',
        'nid_number' => '1990123456789',
        'mobile_number' => '01711111111',
        'branch_id' => $branch->id,
        'status' => 'approved',
    ]);

    $draft = LoanApplication::create([
        'application_no' => 'LN20260900808',
        'member_admission_id' => $admission->id,
        'branch_id' => $branch->id,
        'status' => LoanApplication::STATUS_DRAFT,
    ]);

    expect($admission->hasExistingLoanForm())->toBeTrue()
        ->and($admission->existingLoanForm()?->id)->toBe($draft->id)
        ->and($admission->mustUseCycleHubForNextLoan())->toBeFalse()
        ->and(MemberAdmission::alreadyLoanFormMessage($draft))->toContain('Already Loan Form আছে')
        ->and(MemberAdmission::alreadyLoanFormMessage($draft))->toContain('LN20260900808');
});

it('blocks next cycle while a draft loan form exists', function () {
    $branch = Branch::create(['name' => 'Dhaka', 'code' => '0001']);
    $user = createCycleHubOfficer($branch);

    $admission = MemberAdmission::create([
        'application_no' => '0001000055',
        'nid_number' => '1990123456789',
        'mobile_number' => '01711111111',
        'branch_id' => $branch->id,
        'status' => 'approved',
    ]);

    LoanApplication::create([
        'application_no' => 'LN-DRAFT',
        'member_admission_id' => $admission->id,
        'branch_id' => $branch->id,
        'status' => LoanApplication::STATUS_DRAFT,
    ]);

    $request = Request::create('/', 'POST');
    $request->setUserResolver(fn () => $user);

    $response = app(MemberCycleHubController::class)->startNextCycle($request, $admission);

    expect($response->getStatusCode())->toBe(422)
        ->and($response->getData(true)['message'])->toContain('Already Loan Form আছে')
        ->and(MemberAdmission::count())->toBe(1);
});

it('requires cycle hub for the next loan after repayment', function () {
    $branch = Branch::create(['name' => 'Dhaka', 'code' => '0001']);

    $admission = MemberAdmission::create([
        'application_no' => '0001008703',
        'nid_number' => '1990123456789',
        'mobile_number' => '01711111111',
        'branch_id' => $branch->id,
        'status' => 'approved',
    ]);

    LoanApplication::create([
        'application_no' => 'LN-REPAID',
        'member_admission_id' => $admission->id,
        'branch_id' => $branch->id,
        'status' => LoanApplication::STATUS_REPAID,
    ]);

    $cycleSurvey = MemberAdmission::create([
        'application_no' => '0001008703',
        'nid_number' => '1990123456789',
        'mobile_number' => '01711111111',
        'branch_id' => $branch->id,
        'previous_admission_id' => $admission->id,
        'status' => 'approved',
        'loan_dofa' => 2,
    ]);

    expect($admission->hasExistingLoanForm())->toBeFalse()
        ->and($admission->mustUseCycleHubForNextLoan())->toBeTrue()
        ->and($cycleSurvey->mustUseCycleHubForNextLoan())->toBeFalse()
        ->and($cycleSurvey->hasExistingLoanForm())->toBeFalse();
});

it('sees a loan on a cycle clone as the same members existing form', function () {
    $branch = Branch::create(['name' => 'Dhaka', 'code' => '0001']);

    $master = MemberAdmission::create([
        'application_no' => '0001008703',
        'nid_number' => '1990123456789',
        'mobile_number' => '01711111111',
        'branch_id' => $branch->id,
        'status' => 'approved',
    ]);

    $clone = MemberAdmission::create([
        'application_no' => '0001008703',
        'nid_number' => '1990123456789',
        'mobile_number' => '01711111111',
        'branch_id' => $branch->id,
        'previous_admission_id' => $master->id,
        'status' => 'approved',
        'loan_dofa' => 2,
    ]);

    LoanApplication::create([
        'application_no' => 'LN-HO',
        'member_admission_id' => $clone->id,
        'branch_id' => $branch->id,
        'status' => LoanApplication::STATUS_PENDING_HEAD_OFFICE,
    ]);

    expect($master->hasExistingLoanForm())->toBeTrue()
        ->and($master->existingLoanForm()?->application_no)->toBe('LN-HO')
        ->and($clone->hasExistingLoanForm())->toBeTrue();
});

it('syncs nid phone and names onto leftover cloned admissions', function () {
    $branch = Branch::create(['name' => 'Dhaka', 'code' => '0001']);

    $original = MemberAdmission::create([
        'application_no' => '0001000055',
        'applicant_name_bn' => 'রহিমা',
        'nid_number' => '1111111111',
        'mobile_number' => '01711111111',
        'branch_id' => $branch->id,
        'status' => 'approved',
        'loan_dofa' => 1,
    ]);

    $clone = MemberAdmission::create([
        'application_no' => '0001000055',
        'applicant_name_bn' => 'পুরনো নাম',
        'nid_number' => '1111111111',
        'mobile_number' => '01711111111',
        'branch_id' => $branch->id,
        'previous_admission_id' => $original->id,
        'status' => 'draft',
        'loan_dofa' => 2,
        'is_legacy' => true,
    ]);

    $original->update([
        'applicant_name_bn' => 'রহিমা বেগম',
        'nid_number' => '1990999888777',
        'mobile_number' => '01822222222',
    ]);
    $original->syncIdentityToSisterCycles();

    $clone->refresh();

    expect($clone->applicant_name_bn)->toBe('রহিমা বেগম')
        ->and($clone->nid_number)->toBe('1990999888777')
        ->and($clone->mobile_number)->toBe('01822222222')
        ->and($clone->application_no)->toBe('0001000055');
});

it('still treats another person with the same nid as a duplicate', function () {
    $branch = Branch::create(['name' => 'Dhaka', 'code' => '0001']);

    MemberAdmission::create([
        'application_no' => '0001000055',
        'nid_number' => '1990123456789',
        'mobile_number' => '01711111111',
        'branch_id' => $branch->id,
        'status' => 'approved',
    ]);

    expect(MemberAdmission::findDuplicateByIdentity('1990123456789'))->not->toBeNull()
        ->and(MemberAdmission::findDuplicateByIdentity('1990123456789', null, '0001000055'))->toBeNull()
        ->and(MemberAdmission::findDuplicateByMobile('01711111111'))->not->toBeNull()
        ->and(MemberAdmission::findDuplicateByMobile('01711111111', null, '0001000055'))->toBeNull();
});

it('raises loan dofa when a second loan exists on the same member', function () {
    $branch = Branch::create(['name' => 'Dhaka', 'code' => '0001']);

    $admission = MemberAdmission::create([
        'application_no' => '0001000055',
        'nid_number' => '1990123456789',
        'mobile_number' => '01711111111',
        'branch_id' => $branch->id,
        'status' => 'approved',
        'loan_dofa' => 1,
    ]);

    LoanApplication::create([
        'application_no' => 'LN-1',
        'member_admission_id' => $admission->id,
        'branch_id' => $branch->id,
        'status' => LoanApplication::STATUS_REPAID,
    ]);
    LoanApplication::create([
        'application_no' => 'LN-2',
        'member_admission_id' => $admission->id,
        'branch_id' => $branch->id,
        'status' => LoanApplication::STATUS_DRAFT,
    ]);

    $admission->refreshCycleDofaFromLoans();

    expect((int) $admission->fresh()->loan_dofa)->toBe(2)
        ->and((bool) $admission->fresh()->is_legacy)->toBeTrue();
});

it('lists both cycle surveys so each jorip form can be printed', function () {
    $branch = Branch::create(['name' => 'Dhaka', 'code' => '0001']);

    $original = MemberAdmission::create([
        'application_no' => '0001000055',
        'nid_number' => '1990123456789',
        'mobile_number' => '01711111111',
        'branch_id' => $branch->id,
        'status' => 'approved',
        'loan_dofa' => 1,
    ]);

    MemberAdmission::create([
        'application_no' => '0001000055',
        'nid_number' => '1990123456789',
        'mobile_number' => '01711111111',
        'branch_id' => $branch->id,
        'previous_admission_id' => $original->id,
        'status' => 'draft',
        'loan_dofa' => 2,
        'is_legacy' => true,
    ]);

    $surveys = $original->cycleSurveyList();

    expect($surveys)->toHaveCount(2)
        ->and($surveys[0]['dofa'])->toBe(1)
        ->and($surveys[0]['is_cycle_survey'])->toBeFalse()
        ->and($surveys[1]['dofa'])->toBe(2)
        ->and($surveys[1]['is_cycle_survey'])->toBeTrue();
});

it('keeps cycle survey clones off member master lists', function () {
    $branch = Branch::create(['name' => 'Dhaka', 'code' => '0001']);

    $original = MemberAdmission::create([
        'application_no' => '0001008703',
        'nid_number' => '1990123456789',
        'mobile_number' => '01711111111',
        'branch_id' => $branch->id,
        'status' => 'approved',
        'loan_dofa' => 2,
    ]);

    MemberAdmission::create([
        'application_no' => '0001008703',
        'nid_number' => '1990123456789',
        'mobile_number' => '01711111111',
        'branch_id' => $branch->id,
        'previous_admission_id' => $original->id,
        'status' => 'approved',
        'loan_dofa' => 3,
        'is_legacy' => true,
    ]);

    expect(MemberAdmission::query()->pluck('id'))->toHaveCount(2)
        ->and(MemberAdmission::query()->masterMembers()->pluck('id')->all())->toBe([$original->id]);
});

it('shows only one master row when two admissions share a member code', function () {
    $branch = Branch::create(['name' => 'Dhaka', 'code' => '0001']);

    $first = MemberAdmission::create([
        'application_no' => '0001008703',
        'nid_number' => '1990123456789',
        'mobile_number' => '০১৭৫৫২২১৪১৪',
        'branch_id' => $branch->id,
        'status' => 'approved',
        'loan_dofa' => 2,
    ]);

    MemberAdmission::create([
        'application_no' => '0001008703',
        'nid_number' => '1990123456789',
        'mobile_number' => '০১৭৫৫২২১৪১৪',
        'branch_id' => $branch->id,
        'status' => 'approved',
        'loan_dofa' => 3,
    ]);

    expect(MemberAdmission::query()->masterMembers()->pluck('id')->all())->toBe([$first->id]);
});

it('blocks a new person from reusing member code, nid, or bengali mobile', function () {
    $branch = Branch::create(['name' => 'Dhaka', 'code' => '0001']);

    MemberAdmission::create([
        'application_no' => '0001008703',
        'applicant_name_bn' => 'মোসাঃ সুমাইয়া খাতুন',
        'nid_number' => null,
        'smart_card_number' => '1032783472',
        'mobile_number' => '০১৭৫৫২২১৪১৪',
        'branch_id' => $branch->id,
        'status' => 'approved',
    ]);

    expect(MemberAdmission::findDuplicateByMemberCode('0001008703', null, null, $branch->id))->not->toBeNull()
        ->and(MemberAdmission::findDuplicateByIdentity('1032783472'))->not->toBeNull()
        ->and(MemberAdmission::findDuplicateByMobile('01755221414'))->not->toBeNull()
        ->and(MemberAdmission::findDuplicateByMobile('০১৭৫৫২২১৪১৪'))->not->toBeNull();
});
