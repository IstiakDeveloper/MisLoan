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

function createDuplicateLoanBlockTables(): void
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

/**
 * @return array{
 *     fo: User,
 *     branchUser: User,
 *     branch: Branch,
 *     admission: MemberAdmission,
 *     productA: LoanProduct,
 *     productB: LoanProduct,
 *     category: LoanCategory
 * }
 */
function createDuplicateLoanBlockContext(): array
{
    $foRole = Role::create(['name' => Role::FIELD_OFFICER, 'display_name' => 'Field Officer']);
    $buRole = Role::create(['name' => Role::BRANCH_USER, 'display_name' => 'Branch User']);
    $branch = Branch::create(['name' => 'Akkelpur', 'code' => '0037']);

    $fo = User::create([
        'name' => 'Field Officer',
        'email' => 'fo-dup-loan@test.com',
        'password' => Hash::make('password'),
        'role_id' => $foRole->id,
        'branch_id' => $branch->id,
        'has_all_access' => true,
        'is_active' => true,
        'pin' => '1234',
        'signature' => 'signed',
        'phone' => '01700000001',
        'email_verified_at' => now(),
    ]);

    $branchUser = User::create([
        'name' => 'Branch User',
        'email' => 'bu-dup-loan@test.com',
        'password' => Hash::make('password'),
        'role_id' => $buRole->id,
        'branch_id' => $branch->id,
        'has_all_access' => true,
        'is_active' => true,
        'pin' => '2345',
        'signature' => 'signed',
        'phone' => '01700000002',
        'email_verified_at' => now(),
    ]);

    $category = LoanCategory::create([
        'category_name' => 'Agriculture',
        'category_name_bn' => 'কৃষি',
        'category_code' => 'AGR',
        'is_active' => true,
    ]);

    $productA = LoanProduct::create([
        'loan_category_id' => $category->id,
        'product_name' => 'Agr_F/M1Yr',
        'product_name_bn' => 'Agr_F/M1Yr',
        'installment_type' => 'monthly',
        'duration_months' => 12,
        'min_amount' => 200000,
        'max_amount' => 6000000,
        'interest_rate' => 12,
        'is_active' => true,
    ]);

    $productB = LoanProduct::create([
        'loan_category_id' => $category->id,
        'product_name' => 'Agr_F/M1.5Yr',
        'product_name_bn' => 'Agr_F/M1.5Yr',
        'installment_type' => 'monthly',
        'duration_months' => 18,
        'min_amount' => 200000,
        'max_amount' => 6000000,
        'interest_rate' => 12,
        'is_active' => true,
    ]);

    $admission = MemberAdmission::create([
        'application_no' => '0037370345',
        'applicant_name_bn' => 'মোছা: রোকসানা পারভীন',
        'branch_id' => $branch->id,
        'created_by' => $fo->id,
        'assigned_officer_id' => $fo->id,
        'status' => 'approved',
        'is_legacy' => true,
        'loan_dofa' => 2,
    ]);

    return compact('fo', 'branchUser', 'branch', 'admission', 'productA', 'productB', 'category');
}

beforeEach(function () {
    createDuplicateLoanBlockTables();
});

it('blocks a second draft when only the product and amount differ', function () {
    $ctx = createDuplicateLoanBlockContext();

    $first = LoanApplication::create([
        'application_no' => 'LN-1',
        'member_admission_id' => $ctx['admission']->id,
        'loan_product_id' => $ctx['productA']->id,
        'loan_category_id' => $ctx['category']->id,
        'branch_id' => $ctx['branch']->id,
        'submitted_by' => $ctx['branchUser']->id,
        'status' => LoanApplication::STATUS_DRAFT,
        'requested_amount' => 250000,
    ]);

    $decision = $ctx['admission']->resolveActiveLoanCreate((int) $ctx['productB']->id, (int) $ctx['category']->id);

    expect($decision['action'])->toBe('block')
        ->and($decision['loan']->id)->toBe($first->id);
});

it('reuses the same draft when product is unchanged and allows a new form after delete', function () {
    $ctx = createDuplicateLoanBlockContext();

    $first = LoanApplication::create([
        'application_no' => 'LN-1',
        'member_admission_id' => $ctx['admission']->id,
        'loan_product_id' => $ctx['productA']->id,
        'loan_category_id' => $ctx['category']->id,
        'branch_id' => $ctx['branch']->id,
        'submitted_by' => $ctx['fo']->id,
        'status' => LoanApplication::STATUS_DRAFT,
        'requested_amount' => 200000,
    ]);

    $reuse = $ctx['admission']->resolveActiveLoanCreate((int) $ctx['productA']->id, (int) $ctx['category']->id);
    expect($reuse['action'])->toBe('reuse')->and($reuse['loan']->id)->toBe($first->id);

    $first->delete();
    $ctx['admission']->refresh();

    expect($ctx['admission']->hasExistingLoanForm())->toBeFalse()
        ->and($ctx['admission']->resolveActiveLoanCreate((int) $ctx['productB']->id, (int) $ctx['category']->id)['action'])->toBe('create');
});

it('does not insert a second form when the branch user changes product on the same draft', function () {
    $ctx = createDuplicateLoanBlockContext();

    $loan = LoanApplication::create([
        'application_no' => 'LN-1',
        'member_admission_id' => $ctx['admission']->id,
        'loan_product_id' => $ctx['productA']->id,
        'loan_category_id' => $ctx['category']->id,
        'branch_id' => $ctx['branch']->id,
        'submitted_by' => $ctx['branchUser']->id,
        'status' => LoanApplication::STATUS_DRAFT,
        'requested_amount' => 250000,
    ]);

    $loan->update([
        'loan_product_id' => $ctx['productB']->id,
        'requested_amount' => 200000,
    ]);

    $oldProduct = $ctx['admission']->resolveActiveLoanCreate((int) $ctx['productA']->id, (int) $ctx['category']->id);
    $newProduct = $ctx['admission']->resolveActiveLoanCreate((int) $ctx['productB']->id, (int) $ctx['category']->id);

    expect(LoanApplication::query()->count())->toBe(1)
        ->and($oldProduct['action'])->toBe('block')
        ->and($oldProduct['loan']->id)->toBe($loan->id)
        ->and($newProduct['action'])->toBe('reuse')
        ->and($newProduct['loan']->id)->toBe($loan->id);
});

it('allows a new form after the previous one is cancelled', function () {
    $ctx = createDuplicateLoanBlockContext();

    LoanApplication::create([
        'application_no' => 'LN-1',
        'member_admission_id' => $ctx['admission']->id,
        'loan_product_id' => $ctx['productA']->id,
        'loan_category_id' => $ctx['category']->id,
        'branch_id' => $ctx['branch']->id,
        'submitted_by' => $ctx['fo']->id,
        'status' => LoanApplication::STATUS_CANCELLED,
        'requested_amount' => 200000,
    ]);

    expect($ctx['admission']->resolveActiveLoanCreate((int) $ctx['productB']->id, (int) $ctx['category']->id)['action'])->toBe('create');
});
