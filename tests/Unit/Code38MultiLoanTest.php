<?php

use App\Models\Branch;
use App\Models\LoanApplication;
use App\Models\LoanCategory;
use App\Models\LoanProduct;
use App\Models\MemberAdmission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

function createCode38TestTables(): void
{
    Schema::dropIfExists('member_other_assets');
    Schema::dropIfExists('member_family_members');
    Schema::dropIfExists('loan_applications');
    Schema::dropIfExists('loan_products');
    Schema::dropIfExists('loan_categories');
    Schema::dropIfExists('member_admissions');
    Schema::dropIfExists('users');
    Schema::dropIfExists('roles');
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

    Schema::create('users', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->string('email')->unique();
        $table->string('password')->default('secret');
        $table->unsignedBigInteger('role_id')->nullable();
        $table->unsignedBigInteger('branch_id')->nullable();
        $table->boolean('is_active')->default(true);
        $table->boolean('has_all_access')->default(false);
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
        $table->unsignedBigInteger('branch_id')->nullable();
        $table->unsignedBigInteger('samity_id')->nullable();
        $table->unsignedBigInteger('previous_admission_id')->nullable();
        $table->unsignedBigInteger('created_by')->nullable();
        $table->unsignedBigInteger('assigned_officer_id')->nullable();
        $table->boolean('is_legacy')->default(false);
        $table->unsignedInteger('loan_dofa')->nullable();
        $table->string('status')->default('approved');
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('loan_categories', function (Blueprint $table) {
        $table->id();
        $table->string('category_name')->nullable();
        $table->string('category_name_bn')->nullable();
        $table->string('category_code')->nullable();
        $table->boolean('is_active')->default(true);
        $table->integer('display_order')->default(0);
        $table->timestamps();
    });

    Schema::create('loan_products', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('loan_category_id')->nullable();
        $table->string('product_name')->nullable();
        $table->string('product_name_bn')->nullable();
        $table->string('product_code')->nullable();
        $table->string('main_product_code')->nullable();
        $table->string('installment_type')->nullable();
        $table->unsignedInteger('duration_months')->nullable();
        $table->decimal('min_amount', 12, 2)->nullable();
        $table->decimal('max_amount', 12, 2)->nullable();
        $table->decimal('interest_rate', 8, 2)->nullable();
        $table->boolean('is_active')->default(true);
        $table->integer('display_order')->default(0);
        $table->timestamps();
    });

    Schema::create('loan_applications', function (Blueprint $table) {
        $table->id();
        $table->string('application_no')->nullable();
        $table->unsignedBigInteger('member_admission_id')->nullable();
        $table->unsignedBigInteger('loan_product_id')->nullable();
        $table->unsignedBigInteger('loan_category_id')->nullable();
        $table->unsignedBigInteger('branch_id')->nullable();
        $table->unsignedBigInteger('samity_id')->nullable();
        $table->unsignedBigInteger('submitted_by')->nullable();
        $table->string('status')->default('draft');
        $table->string('form_type')->nullable();
        $table->decimal('requested_amount', 12, 2)->nullable();
        $table->integer('number_of_installments')->nullable();
        $table->integer('loan_term_months')->nullable();
        $table->string('repayment_frequency')->nullable();
        $table->string('purpose_of_loan')->nullable();
        $table->date('proposed_start_date')->nullable();
        $table->json('loan_agreement_data')->nullable();
        $table->json('business_plan')->nullable();
        $table->json('guarantor_info')->nullable();
        $table->json('nominee_info')->nullable();
        $table->json('asset_info')->nullable();
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('member_family_members', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('member_admission_id');
        $table->timestamps();
    });

    Schema::create('member_other_assets', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('member_admission_id');
        $table->timestamps();
    });
}

function createCode38TestContext(): array
{
    $foRole = Role::create(['name' => Role::FIELD_OFFICER, 'display_name' => 'Field Officer']);
    $branch = Branch::create(['name' => 'Akkelpur', 'code' => '0037']);

    $fo = User::create([
        'name' => 'Field Officer',
        'email' => 'fo-c38@test.com',
        'password' => Hash::make('password'),
        'role_id' => $foRole->id,
        'branch_id' => $branch->id,
        'has_all_access' => true,
        'is_active' => true,
        'phone' => '01700000001',
        'email_verified_at' => now(),
    ]);

    $category = LoanCategory::create([
        'category_name' => 'Agrosor',
        'category_name_bn' => 'আগ্রসর',
        'category_code' => 'AGR',
    ]);

    $regularProductA = LoanProduct::create([
        'loan_category_id' => $category->id,
        'product_name' => 'Jagoron Monthly',
        'product_name_bn' => 'জাগরণ মাসিক',
        'product_code' => '01.01',
        'main_product_code' => '01',
        'duration_months' => 12,
        'min_amount' => 50000,
        'max_amount' => 200000,
        'interest_rate' => 24,
    ]);

    $regularProductB = LoanProduct::create([
        'loan_category_id' => $category->id,
        'product_name' => 'Agrosor General',
        'product_name_bn' => 'আগ্রসর সাধারণ',
        'product_code' => '02.01',
        'main_product_code' => '02',
        'duration_months' => 12,
        'min_amount' => 100000,
        'max_amount' => 500000,
        'interest_rate' => 24,
    ]);

    $product38A = LoanProduct::create([
        'loan_category_id' => $category->id,
        'product_name' => 'CSL_SMART_F/M1Yr',
        'product_name_bn' => 'সিএসএল স্মার্ট ১ বছর',
        'product_code' => '38.01',
        'main_product_code' => '38',
        'duration_months' => 12,
        'min_amount' => 10000,
        'max_amount' => 100000,
        'interest_rate' => 20,
    ]);

    $product38B = LoanProduct::create([
        'loan_category_id' => $category->id,
        'product_name' => 'CSL_SMART_F/M1.5Yr',
        'product_name_bn' => 'সিএসএল স্মার্ট দেড় বছর',
        'product_code' => '38.02',
        'main_product_code' => '38',
        'duration_months' => 18,
        'min_amount' => 10000,
        'max_amount' => 100000,
        'interest_rate' => 20,
    ]);

    $admission = MemberAdmission::create([
        'application_no' => '0037000101',
        'applicant_name_bn' => 'রহিমা বেগম',
        'branch_id' => $branch->id,
        'status' => 'approved',
        'created_by' => $fo->id,
        'assigned_officer_id' => $fo->id,
    ]);

    return compact('fo', 'branch', 'category', 'regularProductA', 'regularProductB', 'product38A', 'product38B', 'admission');
}

beforeEach(function () {
    createCode38TestTables();
});

it('correctly identifies Code 38 products via isCode38 and isCode38ProductId', function () {
    $ctx = createCode38TestContext();

    expect($ctx['regularProductA']->isCode38())->toBeFalse()
        ->and($ctx['regularProductB']->isCode38())->toBeFalse()
        ->and($ctx['product38A']->isCode38())->toBeTrue()
        ->and($ctx['product38B']->isCode38())->toBeTrue()
        ->and(LoanProduct::isCode38ProductId($ctx['regularProductA']->id))->toBeFalse()
        ->and(LoanProduct::isCode38ProductId($ctx['product38A']->id))->toBeTrue();
});

it('allows a member with no loans to apply for regular or 38 product', function () {
    $ctx = createCode38TestContext();

    $reg = $ctx['admission']->resolveActiveLoanCreate((int) $ctx['regularProductA']->id, (int) $ctx['category']->id);
    $c38 = $ctx['admission']->resolveActiveLoanCreate((int) $ctx['product38A']->id, (int) $ctx['category']->id);

    expect($reg['action'])->toBe('create')
        ->and($c38['action'])->toBe('create');
});

it('allows a member with an active regular loan to take a Code 38 loan, but blocks another regular loan', function () {
    $ctx = createCode38TestContext();

    // Create an active regular loan
    LoanApplication::create([
        'application_no' => 'LN-REG-1',
        'member_admission_id' => $ctx['admission']->id,
        'loan_product_id' => $ctx['regularProductA']->id,
        'loan_category_id' => $ctx['category']->id,
        'branch_id' => $ctx['branch']->id,
        'submitted_by' => $ctx['fo']->id,
        'status' => LoanApplication::STATUS_SUBMITTED,
        'requested_amount' => 150000,
    ]);

    // Another regular loan must be BLOCKED
    $secondRegular = $ctx['admission']->resolveActiveLoanCreate((int) $ctx['regularProductB']->id, (int) $ctx['category']->id);
    expect($secondRegular['action'])->toBe('block');

    // Code 38 loan must be ALLOWED
    $code38 = $ctx['admission']->resolveActiveLoanCreate((int) $ctx['product38A']->id, (int) $ctx['category']->id);
    expect($code38['action'])->toBe('create');
});

it('allows a member with an active Code 38 loan to take another Code 38 loan and 1 regular loan', function () {
    $ctx = createCode38TestContext();

    // Create active 38.01 loan
    LoanApplication::create([
        'application_no' => 'LN-38-1',
        'member_admission_id' => $ctx['admission']->id,
        'loan_product_id' => $ctx['product38A']->id,
        'loan_category_id' => $ctx['category']->id,
        'branch_id' => $ctx['branch']->id,
        'submitted_by' => $ctx['fo']->id,
        'status' => LoanApplication::STATUS_SUBMITTED,
        'requested_amount' => 50000,
    ]);

    // Can take another Code 38 loan (38.02)
    $second38 = $ctx['admission']->resolveActiveLoanCreate((int) $ctx['product38B']->id, (int) $ctx['category']->id);
    expect($second38['action'])->toBe('create');

    // Can take 1 regular loan
    $regular = $ctx['admission']->resolveActiveLoanCreate((int) $ctx['regularProductA']->id, (int) $ctx['category']->id);
    expect($regular['action'])->toBe('create');
});

it('allows multiple Code 38 loans alongside 1 regular loan concurrently', function () {
    $ctx = createCode38TestContext();

    // Create active regular loan
    LoanApplication::create([
        'application_no' => 'LN-REG-1',
        'member_admission_id' => $ctx['admission']->id,
        'loan_product_id' => $ctx['regularProductA']->id,
        'loan_category_id' => $ctx['category']->id,
        'branch_id' => $ctx['branch']->id,
        'submitted_by' => $ctx['fo']->id,
        'status' => LoanApplication::STATUS_APPROVED,
        'requested_amount' => 100000,
    ]);

    // Create active 38 loan
    LoanApplication::create([
        'application_no' => 'LN-38-1',
        'member_admission_id' => $ctx['admission']->id,
        'loan_product_id' => $ctx['product38A']->id,
        'loan_category_id' => $ctx['category']->id,
        'branch_id' => $ctx['branch']->id,
        'submitted_by' => $ctx['fo']->id,
        'status' => LoanApplication::STATUS_SUBMITTED,
        'requested_amount' => 30000,
    ]);

    // Another regular loan is BLOCKED
    $secondRegular = $ctx['admission']->resolveActiveLoanCreate((int) $ctx['regularProductB']->id, (int) $ctx['category']->id);
    expect($secondRegular['action'])->toBe('block');

    // Another Code 38 loan is ALLOWED
    $second38 = $ctx['admission']->resolveActiveLoanCreate((int) $ctx['product38B']->id, (int) $ctx['category']->id);
    expect($second38['action'])->toBe('create');
});

it('reuses the exact same Code 38 draft when still unsubmitted', function () {
    $ctx = createCode38TestContext();

    $draft38 = LoanApplication::create([
        'application_no' => 'LN-38-DRAFT',
        'member_admission_id' => $ctx['admission']->id,
        'loan_product_id' => $ctx['product38A']->id,
        'loan_category_id' => $ctx['category']->id,
        'branch_id' => $ctx['branch']->id,
        'submitted_by' => $ctx['fo']->id,
        'status' => LoanApplication::STATUS_DRAFT,
        'requested_amount' => 40000,
    ]);

    // Opening the same 38.01 product reuses the draft
    $decision = $ctx['admission']->resolveActiveLoanCreate((int) $ctx['product38A']->id, (int) $ctx['category']->id);
    expect($decision['action'])->toBe('reuse')
        ->and($decision['loan']->id)->toBe($draft38->id);

    // Opening 38.02 allows create
    $decisionOther = $ctx['admission']->resolveActiveLoanCreate((int) $ctx['product38B']->id, (int) $ctx['category']->id);
    expect($decisionOther['action'])->toBe('create');
});

it('allows a member with an active Code 37 Agr_SMART loan to take 1 regular loan', function () {
    $ctx = createCode38TestContext();

    $smart37 = LoanProduct::create([
        'loan_category_id' => $ctx['category']->id,
        'product_name' => 'Agr_SMART_F/M1Yr',
        'product_code' => '37.01',
        'main_product_code' => '37',
        'duration_months' => 12,
        'interest_rate' => 20,
    ]);

    expect($smart37->isCode38())->toBeTrue()
        ->and(LoanProduct::isCode38ProductId($smart37->id))->toBeTrue();

    // Give active Code 37 loan
    LoanApplication::create([
        'application_no' => 'LN-SMART-37',
        'member_admission_id' => $ctx['admission']->id,
        'loan_product_id' => $smart37->id,
        'loan_category_id' => $ctx['category']->id,
        'branch_id' => $ctx['branch']->id,
        'submitted_by' => $ctx['fo']->id,
        'status' => LoanApplication::STATUS_APPROVED,
        'requested_amount' => 50000,
    ]);

    // Member has NO active regular loan
    expect($ctx['admission']->hasExistingRegularLoanForm())->toBeFalse()
        ->and($ctx['admission']->existingRegularLoanForm())->toBeNull();

    // Applying for regular loan is ALLOWED (action: create)
    $regDecision = $ctx['admission']->resolveActiveLoanCreate((int) $ctx['regularProductA']->id, (int) $ctx['category']->id);
    expect($regDecision['action'])->toBe('create');

    // Create the regular loan
    LoanApplication::create([
        'application_no' => 'LN-REG-FROM-SMART',
        'member_admission_id' => $ctx['admission']->id,
        'loan_product_id' => $ctx['regularProductA']->id,
        'loan_category_id' => $ctx['category']->id,
        'branch_id' => $ctx['branch']->id,
        'submitted_by' => $ctx['fo']->id,
        'status' => LoanApplication::STATUS_DRAFT,
        'requested_amount' => 80000,
    ]);

    // Now member has 1 active regular loan
    expect($ctx['admission']->hasExistingRegularLoanForm())->toBeTrue();

    // A second regular loan is BLOCKED
    $secondReg = $ctx['admission']->resolveActiveLoanCreate((int) $ctx['regularProductB']->id, (int) $ctx['category']->id);
    expect($secondReg['action'])->toBe('block');

    // But another SMART/38 loan is still ALLOWED
    $anotherSmart = $ctx['admission']->resolveActiveLoanCreate((int) $ctx['product38A']->id, (int) $ctx['category']->id);
    expect($anotherSmart['action'])->toBe('create');
});
