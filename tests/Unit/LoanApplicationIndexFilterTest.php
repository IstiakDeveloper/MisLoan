<?php

use App\Http\Controllers\Member\LoanApplicationController;
use App\Models\Area;
use App\Models\Branch;
use App\Models\LoanApplication;
use App\Models\LoanCategory;
use App\Models\LoanProduct;
use App\Models\Role;
use App\Models\Samity;
use App\Models\User;
use App\Models\Zone;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use PhpOffice\PhpSpreadsheet\IOFactory;

beforeEach(function () {
    Schema::dropIfExists('settings');
    Schema::dropIfExists('loan_application_issues');
    Schema::dropIfExists('loan_application_approvals');
    Schema::dropIfExists('loan_applications');
    Schema::dropIfExists('loan_products');
    Schema::dropIfExists('loan_categories');
    Schema::dropIfExists('member_admissions');
    Schema::dropIfExists('samities');
    Schema::dropIfExists('user_zones');
    Schema::dropIfExists('user_areas');
    Schema::dropIfExists('user_branches');
    Schema::dropIfExists('users');
    Schema::dropIfExists('roles');
    Schema::dropIfExists('branches');
    Schema::dropIfExists('areas');
    Schema::dropIfExists('zones');

    Schema::create('zones', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->string('code')->nullable();
        $table->boolean('is_active')->default(true);
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('areas', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('zone_id')->nullable();
        $table->string('name');
        $table->string('code')->nullable();
        $table->boolean('is_active')->default(true);
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('branches', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('area_id')->nullable();
        $table->string('name');
        $table->string('code')->nullable();
        $table->boolean('is_active')->default(true);
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
        $table->string('email')->nullable();
        $table->string('username')->nullable();
        $table->string('password');
        $table->unsignedBigInteger('role_id')->nullable();
        $table->unsignedBigInteger('branch_id')->nullable();
        $table->unsignedBigInteger('area_id')->nullable();
        $table->unsignedBigInteger('zone_id')->nullable();
        $table->boolean('has_all_access')->default(false);
        $table->boolean('is_active')->default(true);
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
        $table->timestamps();
    });

    Schema::create('user_zones', function (Blueprint $table) {
        $table->unsignedBigInteger('user_id');
        $table->unsignedBigInteger('zone_id');
        $table->timestamps();
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
        $table->string('status')->nullable();
        $table->timestamps();
    });

    Schema::create('loan_categories', function (Blueprint $table) {
        $table->id();
        $table->string('category_name');
        $table->string('category_name_bn')->nullable();
        $table->string('category_code');
        $table->boolean('is_active')->default(true);
        $table->integer('display_order')->default(0);
        $table->timestamps();
    });

    Schema::create('loan_products', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('loan_category_id');
        $table->string('product_name');
        $table->string('product_name_bn')->nullable();
        $table->string('product_code');
        $table->string('main_product_code')->nullable();
        $table->string('installment_type')->nullable();
        $table->integer('duration_months')->nullable();
        $table->integer('number_of_installments')->nullable();
        $table->decimal('min_amount', 15, 2)->nullable();
        $table->decimal('max_amount', 15, 2)->nullable();
        $table->decimal('interest_rate', 8, 2)->nullable();
        $table->boolean('is_active')->default(true);
        $table->timestamps();
    });

    Schema::create('loan_applications', function (Blueprint $table) {
        $table->id();
        $table->string('application_no');
        $table->unsignedBigInteger('member_admission_id')->nullable();
        $table->unsignedBigInteger('loan_product_id')->nullable();
        $table->unsignedBigInteger('loan_category_id')->nullable();
        $table->unsignedBigInteger('branch_id');
        $table->unsignedBigInteger('samity_id')->nullable();
        $table->string('form_type')->nullable();
        $table->string('status')->default('draft');
        $table->decimal('requested_amount', 15, 2)->nullable();
        $table->decimal('approved_amount', 15, 2)->nullable();
        $table->decimal('pending_approved_amount', 15, 2)->nullable();
        $table->decimal('disbursed_amount', 15, 2)->nullable();
        $table->text('purpose_of_loan')->nullable();
        $table->text('legacy_member_snapshot')->nullable();
        $table->text('cancellation_from_status')->nullable();
        $table->text('loan_agreement_data')->nullable();
        $table->text('guarantor_info')->nullable();
        $table->text('nominee_info')->nullable();
        $table->text('asset_info')->nullable();
        $table->text('business_plan')->nullable();
        $table->timestamp('submitted_at')->nullable();
        $table->timestamp('reviewed_at')->nullable();
        $table->timestamp('disbursed_at')->nullable();
        $table->unsignedBigInteger('submitted_by')->nullable();
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('loan_application_approvals', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('loan_application_id');
        $table->unsignedBigInteger('user_id')->nullable();
        $table->string('level')->nullable();
        $table->integer('sequence')->nullable();
        $table->string('status')->nullable();
        $table->text('comments')->nullable();
        $table->timestamps();
    });

    Schema::create('settings', function (Blueprint $table) {
        $table->id();
        $table->string('key')->unique();
        $table->text('value')->nullable();
        $table->timestamps();
    });

    Schema::create('loan_application_issues', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('loan_application_id');
        $table->unsignedBigInteger('reported_by')->nullable();
        $table->text('issue_description')->nullable();
        $table->string('status')->nullable();
        $table->timestamps();
    });
});

function loanFilterProduct(LoanCategory $category, string $code, string $name, bool $active = true): LoanProduct
{
    return LoanProduct::query()->create([
        'loan_category_id' => $category->id,
        'product_name' => $name,
        'product_name_bn' => $name,
        'product_code' => $code,
        'installment_type' => 'weekly',
        'duration_months' => 12,
        'number_of_installments' => 46,
        'min_amount' => 5000,
        'max_amount' => 50000,
        'interest_rate' => 12,
        'is_active' => $active,
    ]);
}

function loanFilterApplication(Branch $branch, Samity $samity, LoanCategory $category, LoanProduct $product, string $number): LoanApplication
{
    return LoanApplication::query()->create([
        'application_no' => $number,
        'branch_id' => $branch->id,
        'samity_id' => $samity->id,
        'loan_category_id' => $category->id,
        'loan_product_id' => $product->id,
        'status' => LoanApplication::STATUS_SUBMITTED,
        'requested_amount' => 10000,
        'submitted_at' => now(),
    ]);
}

function loanIndexProps(User $user, array $query = []): array
{
    test()->actingAs($user);

    $request = Request::create('/member/loan-applications', 'GET', $query);
    app()->instance('request', $request);
    $request->setUserResolver(fn () => $user);

    $response = app(LoanApplicationController::class)->index($request);
    $property = new ReflectionProperty($response, 'props');

    return $property->getValue($response);
}

it('filters the loan application index by samity, category, and product', function () {
    $role = Role::query()->create([
        'name' => Role::SUPER_ADMIN,
        'display_name' => 'Super Admin',
    ]);
    $user = User::query()->create([
        'name' => 'Filter Admin',
        'email' => 'filter-admin@example.com',
        'username' => 'loan-filter-admin',
        'password' => 'password',
        'role_id' => $role->id,
        'has_all_access' => true,
    ]);

    $zone = Zone::query()->create(['name' => 'North', 'code' => 'ZN-F']);
    $area = Area::query()->create(['zone_id' => $zone->id, 'name' => 'Area F', 'code' => 'AR-F']);
    $branch = Branch::query()->create(['area_id' => $area->id, 'name' => 'Branch F', 'code' => 'BR-F']);
    $otherBranch = Branch::query()->create(['area_id' => $area->id, 'name' => 'Branch G', 'code' => 'BR-G']);

    $samityA = Samity::query()->create([
        'branch_id' => $branch->id,
        'samity_code' => 'S-ALPHA',
        'samity_name' => 'Samity Alpha',
        'samity_name_bn' => 'সমিতি আলফা',
    ]);
    $samityB = Samity::query()->create([
        'branch_id' => $otherBranch->id,
        'samity_code' => 'S-BETA',
        'samity_name' => 'Samity Beta',
        'samity_name_bn' => 'সমিতি বিটা',
    ]);
    Samity::query()->create([
        'branch_id' => $branch->id,
        'samity_code' => 'S-OLD',
        'samity_name' => 'Samity Old',
        'is_active' => false,
    ]);

    $jagoron = LoanCategory::query()->create([
        'category_name' => 'Jagoron',
        'category_name_bn' => 'জাগরণ',
        'category_code' => 'JAG-F',
    ]);
    $agrosor = LoanCategory::query()->create([
        'category_name' => 'Agrosor',
        'category_name_bn' => 'অগ্রসর',
        'category_code' => 'AGR-F',
    ]);
    $productA = loanFilterProduct($jagoron, 'P-ALPHA', 'Alpha Product');
    $productB = loanFilterProduct($agrosor, 'P-BETA', 'Beta Product');
    loanFilterProduct($jagoron, 'P-HIDDEN', 'Hidden Product', false);

    loanFilterApplication($branch, $samityA, $jagoron, $productA, 'LN-FILTER-A');
    loanFilterApplication($otherBranch, $samityB, $agrosor, $productB, 'LN-FILTER-B');

    $open = loanIndexProps($user, ['status' => 'all']);

    expect($open['applications']->total())->toBe(2)
        ->and($open['samities'])->toHaveCount(2)
        ->and($open['samities']->first()->samity_code)->toBe('S-ALPHA')
        ->and($open['stats']['total'])->toBe(2);

    $jagoronProp = $open['categories']->firstWhere('category_code', 'JAG-F');
    expect(collect($jagoronProp->loan_products)->pluck('product_code')->all())->toBe(['P-ALPHA']);

    $filtered = loanIndexProps($user, [
        'status' => 'all',
        'samity_id' => $samityA->id,
        'loan_category_id' => $jagoron->id,
        'loan_product_id' => $productA->id,
    ]);

    expect($filtered['applications']->total())->toBe(1)
        ->and($filtered['applications']->items()[0]->application_no)->toBe('LN-FILTER-A')
        ->and($filtered['filters']['samity_id'])->toBe((string) $samityA->id)
        ->and($filtered['filters']['loan_category_id'])->toBe((string) $jagoron->id)
        ->and($filtered['filters']['loan_product_id'])->toBe((string) $productA->id)
        ->and($filtered['stats']['total'])->toBe(1);

    $mismatch = loanIndexProps($user, [
        'status' => 'all',
        'loan_category_id' => $jagoron->id,
        'loan_product_id' => $productB->id,
    ]);

    expect($mismatch['applications']->total())->toBe(0)
        ->and($mismatch['stats']['total'])->toBe(0);

    $request = Request::create('/member/loan-applications/export/excel', 'GET', [
        'status' => 'all',
        'samity_id' => $samityA->id,
    ]);
    app()->instance('request', $request);
    $request->setUserResolver(fn () => $user);
    $export = app(LoanApplicationController::class)->exportExcel($request);
    ob_start();
    $export->sendContent();
    $binary = ob_get_clean();
    $temporary = tempnam(sys_get_temp_dir(), 'loan-filter');
    file_put_contents($temporary, $binary);
    $rows = IOFactory::load($temporary)->getActiveSheet()->toArray();
    @unlink($temporary);
    $flat = collect($rows)->flatten()->filter()->implode(' ');

    expect($flat)->toContain('Samity Alpha')
        ->and($flat)->not->toContain('Samity Beta');
});

it('limits samity choices to the branches a user can access', function () {
    $role = Role::query()->create([
        'name' => Role::BRANCH_USER,
        'display_name' => 'Branch User',
    ]);
    $zone = Zone::query()->create(['name' => 'South', 'code' => 'ZN-S']);
    $area = Area::query()->create(['zone_id' => $zone->id, 'name' => 'Area S', 'code' => 'AR-S']);
    $ownBranch = Branch::query()->create(['area_id' => $area->id, 'name' => 'Own Branch', 'code' => 'BR-OWN']);
    $otherBranch = Branch::query()->create(['area_id' => $area->id, 'name' => 'Other Branch', 'code' => 'BR-OTH']);
    $user = User::query()->create([
        'name' => 'Branch User',
        'email' => 'branch-filter@example.com',
        'username' => 'loan-filter-branch',
        'password' => 'password',
        'role_id' => $role->id,
        'branch_id' => $ownBranch->id,
        'has_all_access' => false,
    ]);

    Samity::query()->create([
        'branch_id' => $ownBranch->id,
        'samity_code' => 'S-OWN',
        'samity_name' => 'Own Samity',
    ]);
    Samity::query()->create([
        'branch_id' => $otherBranch->id,
        'samity_code' => 'S-OTHER',
        'samity_name' => 'Other Samity',
    ]);

    $props = loanIndexProps($user, ['status' => 'all']);

    expect($props['samities'])->toHaveCount(1)
        ->and($props['samities']->first()->samity_code)->toBe('S-OWN');
});
