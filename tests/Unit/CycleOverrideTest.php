<?php

namespace Tests\Unit;

use App\Http\Controllers\Member\CycleOverrideController;
use App\Models\Branch;
use App\Models\LoanApplication;
use App\Models\LoanCategory;
use App\Models\LoanProduct;
use App\Models\MemberAdmission;
use App\Models\MemberCategory;
use App\Models\Role;
use App\Models\Samity;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class CycleOverrideTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('loan_applications');
        Schema::dropIfExists('loan_members');
        Schema::dropIfExists('member_family_members');
        Schema::dropIfExists('member_other_assets');
        Schema::dropIfExists('member_admissions');
        Schema::dropIfExists('member_categories');
        Schema::dropIfExists('loan_products');
        Schema::dropIfExists('loan_categories');
        Schema::dropIfExists('samities');
        Schema::dropIfExists('users');
        Schema::dropIfExists('roles');
        Schema::dropIfExists('branches');

        Schema::create('branches', function (Blueprint $table) {
            $table->id();
            $table->string('name')->default('Main Branch');
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
            $table->string('password');
            $table->string('pin')->nullable();
            $table->unsignedBigInteger('role_id')->nullable();
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->boolean('has_all_access')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('member_categories', function (Blueprint $table) {
            $table->id();
            $table->string('category_name');
            $table->string('category_name_bn')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('loan_categories', function (Blueprint $table) {
            $table->id();
            $table->string('category_name');
            $table->string('category_name_bn')->nullable();
            $table->string('category_code')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('loan_products', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('loan_category_id');
            $table->string('product_name');
            $table->string('product_name_bn')->nullable();
            $table->string('product_code')->nullable();
            $table->integer('duration_months')->default(12);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('samities', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('branch_id');
            $table->string('samity_name');
            $table->string('samity_name_bn')->nullable();
            $table->string('samity_code')->nullable();
            $table->timestamps();
        });

        Schema::create('member_admissions', function (Blueprint $table) {
            $table->id();
            $table->string('application_no')->nullable();
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->unsignedBigInteger('samity_id')->nullable();
            $table->unsignedBigInteger('member_category_id')->nullable();
            $table->unsignedBigInteger('previous_admission_id')->nullable();
            $table->integer('loan_dofa')->default(1);
            $table->string('applicant_name_bn')->nullable();
            $table->string('applicant_name_en')->nullable();
            $table->string('father_name_bn')->nullable();
            $table->string('father_name_en')->nullable();
            $table->string('mother_name_bn')->nullable();
            $table->string('mother_name_en')->nullable();
            $table->string('spouse_name_bn')->nullable();
            $table->string('spouse_name_en')->nullable();
            $table->string('mobile_number')->nullable();
            $table->string('alternative_mobile')->nullable();
            $table->string('nid_number')->nullable();
            $table->string('smart_card_number')->nullable();
            $table->string('birth_certificate_number')->nullable();
            $table->date('date_of_birth')->nullable();
            $table->string('gender')->nullable();
            $table->string('marital_status')->nullable();
            $table->string('present_village_road')->nullable();
            $table->string('present_union')->nullable();
            $table->string('present_upazila')->nullable();
            $table->string('present_district')->nullable();
            $table->string('present_post_code')->nullable();
            $table->string('permanent_village_road')->nullable();
            $table->string('permanent_union')->nullable();
            $table->string('permanent_upazila')->nullable();
            $table->string('permanent_district')->nullable();
            $table->string('permanent_post_code')->nullable();
            $table->decimal('monthly_income', 12, 2)->nullable();
            $table->decimal('monthly_expense', 12, 2)->nullable();
            $table->decimal('monthly_savings', 12, 2)->nullable();
            $table->decimal('total_land_amount', 12, 2)->nullable();
            $table->decimal('total_land_value', 12, 2)->nullable();
            $table->decimal('cultivable_land_amount', 12, 2)->nullable();
            $table->decimal('cultivable_land_value', 12, 2)->nullable();
            $table->decimal('non_cultivable_land_amount', 12, 2)->nullable();
            $table->decimal('non_cultivable_land_value', 12, 2)->nullable();
            $table->string('house_type')->nullable();
            $table->integer('mud_house_count')->nullable();
            $table->integer('tin_house_count')->nullable();
            $table->integer('brick_house_count')->nullable();
            $table->integer('semi_brick_house_count')->nullable();
            $table->integer('cow_buffalo_count')->nullable();
            $table->integer('goat_sheep_count')->nullable();
            $table->integer('duck_chicken_count')->nullable();
            $table->string('project_name')->nullable();
            $table->decimal('estimated_annual_project_income', 12, 2)->nullable();
            $table->text('business_details')->nullable();
            $table->text('job_details')->nullable();
            $table->text('other_income_details')->nullable();
            $table->string('status')->default('draft');
            $table->date('admission_date')->nullable();
            $table->date('survey_date')->nullable();
            $table->string('customer_photo_path')->nullable();
            $table->string('guardian_photo_path')->nullable();
            $table->string('applicant_signature_path')->nullable();
            $table->string('other_loan_info')->nullable();
            $table->text('collector_comment')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('member_family_members', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('member_admission_id');
            $table->string('member_name')->nullable();
            $table->string('relation_with_head')->nullable();
            $table->string('gender')->nullable();
            $table->integer('age_years')->nullable();
            $table->integer('age_months')->nullable();
            $table->string('marital_status')->nullable();
            $table->string('education_level')->nullable();
            $table->string('occupation')->nullable();
            $table->decimal('monthly_income', 10, 2)->nullable();
            $table->timestamps();
        });

        Schema::create('member_other_assets', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('member_admission_id');
            $table->integer('sl_no')->default(1);
            $table->string('asset_description')->nullable();
            $table->string('quantity_amount')->nullable();
            $table->decimal('estimated_value', 12, 2)->nullable();
            $table->timestamps();
        });

        Schema::create('loan_applications', function (Blueprint $table) {
            $table->id();
            $table->string('application_no')->nullable();
            $table->unsignedBigInteger('member_admission_id');
            $table->unsignedBigInteger('loan_product_id')->nullable();
            $table->unsignedBigInteger('loan_category_id')->nullable();
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->unsignedBigInteger('samity_id')->nullable();
            $table->decimal('requested_amount', 12, 2)->nullable();
            $table->decimal('approved_amount', 12, 2)->nullable();
            $table->decimal('disbursed_amount', 12, 2)->nullable();
            $table->decimal('installment_amount', 12, 2)->nullable();
            $table->integer('number_of_installments')->nullable();
            $table->integer('loan_term_months')->nullable();
            $table->string('purpose_of_loan')->nullable();
            $table->string('status')->default('draft');
            $table->json('business_plan')->nullable();
            $table->json('loan_agreement_data')->nullable();
            $table->json('guarantor_info')->nullable();
            $table->json('nominee_info')->nullable();
            $table->json('asset_info')->nullable();
            $table->json('family_members')->nullable();
            $table->json('legacy_member_snapshot')->nullable();
            $table->decimal('monthly_income', 12, 2)->nullable();
            $table->decimal('monthly_expense', 12, 2)->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('loan_members', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('loan_application_id');
            $table->string('member_code')->nullable();
            $table->string('member_name')->nullable();
            $table->string('member_mobile')->nullable();
            $table->string('somiti_name')->nullable();
            $table->string('somiti_code')->nullable();
            $table->string('project_name')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function test_superadmin_can_update_admission_category_and_auto_sync_to_loan(): void
    {
        $superRole = Role::create(['name' => Role::SUPER_ADMIN]);
        $superAdmin = User::create([
            'name' => 'Super Admin',
            'email' => 'admin@test.local',
            'password' => Hash::make('password123'),
            'pin' => '1234',
            'role_id' => $superRole->id,
            'has_all_access' => true,
        ]);

        $catAgrosor = MemberCategory::create(['category_name' => 'Agrosor', 'category_name_bn' => 'অগ্রসর']);
        $catShopan = MemberCategory::create(['category_name' => 'Shopon Agri', 'category_name_bn' => 'সোপান কৃষি']);

        $loanCatAgrosor = LoanCategory::create(['category_name' => 'Agrosor', 'category_name_bn' => 'অগ্রসর', 'category_code' => 'AGR']);
        $loanCatShopan = LoanCategory::create(['category_name' => 'Shopon Agri', 'category_name_bn' => 'সোপান কৃষি', 'category_code' => 'SHP-AGR']);

        $prodShopan = LoanProduct::create([
            'loan_category_id' => $loanCatShopan->id,
            'product_name' => 'Shopon Monthly',
            'product_name_bn' => 'সোপান মাসিক',
            'product_code' => 'SHP-01',
            'duration_months' => 12,
        ]);

        $branch = Branch::create(['name' => 'Dhaka Branch', 'code' => '0001']);
        $samity = Samity::create(['branch_id' => $branch->id, 'samity_name' => 'Samity A', 'samity_code' => '01']);

        // Create member admission with Agrosor category
        $admission = MemberAdmission::create([
            'application_no' => '0001000001',
            'branch_id' => $branch->id,
            'samity_id' => $samity->id,
            'member_category_id' => $catAgrosor->id,
            'applicant_name_bn' => 'রহিমা খাতুন',
            'mobile_number' => '01711111111',
            'nid_number' => '1234567890',
            'status' => 'approved',
        ]);

        // Create a disbursed loan for this member
        $loan = LoanApplication::create([
            'application_no' => 'LA-101',
            'member_admission_id' => $admission->id,
            'loan_category_id' => $loanCatAgrosor->id,
            'branch_id' => $branch->id,
            'samity_id' => $samity->id,
            'requested_amount' => 50000,
            'approved_amount' => 50000,
            'disbursed_amount' => 50000,
            'status' => LoanApplication::STATUS_DISBURSED,
            'business_plan' => ['category_name' => 'অগ্রসর', 'member_name_detail' => 'রহিমা খাতুন'],
        ]);

        // Now test override via CycleOverrideController:
        // Update member category from Agrosor to Shopan (id 2 -> id 8)
        $controller = new CycleOverrideController();
        $request = Request::create("/member/cycle-hub/override/{$admission->id}", 'POST', [
            'pin' => '1234',
            'admission' => [
                'member_category_id' => $catShopan->id,
                'applicant_name_bn' => 'রহিমা বেগম', // also change name
            ],
            'auto_sync_category' => true,
        ]);
        $request->setUserResolver(fn () => $superAdmin);

        $response = $controller->update($request, $admission->id);
        $this->assertEquals(200, $response->getStatusCode(), $response->getContent());

        // Verify MemberAdmission updated
        $admission->refresh();
        $this->assertEquals($catShopan->id, $admission->member_category_id);
        $this->assertEquals('রহিমা বেগম', $admission->applicant_name_bn);

        // Verify LoanApplication auto-synced to Shopan category even though it is DISBURSED!
        $loan->refresh();
        $this->assertEquals($loanCatShopan->id, $loan->loan_category_id);
        $this->assertEquals($prodShopan->id, $loan->loan_product_id);
        $this->assertEquals('সোপান কৃষি', $loan->business_plan['category_name']);
        $this->assertEquals('রহিমা বেগম', $loan->business_plan['member_name_detail']);
    }

    public function test_non_authorized_user_is_forbidden(): void
    {
        $csoRole = Role::create(['name' => Role::CSO]);
        $csoUser = User::create([
            'name' => 'CSO User',
            'email' => 'cso@test.local',
            'password' => Hash::make('password123'),
            'role_id' => $csoRole->id,
        ]);

        $admission = MemberAdmission::create([
            'application_no' => '0001000002',
            'applicant_name_bn' => 'টেস্ট সদস্য',
            'status' => 'approved',
        ]);

        $controller = new CycleOverrideController();
        $request = Request::create("/member/cycle-hub/override/{$admission->id}", 'POST', [
            'pin' => 'password123',
            'admission' => ['applicant_name_bn' => 'নতুন নাম'],
        ]);
        $request->setUserResolver(fn () => $csoUser);

        $response = $controller->update($request, $admission->id);
        $this->assertEquals(403, $response->getStatusCode());
    }

    public function test_wrong_pin_fails(): void
    {
        $superRole = Role::create(['name' => Role::SUPER_ADMIN]);
        $superAdmin = User::create([
            'name' => 'Super Admin',
            'email' => 'admin2@test.local',
            'password' => Hash::make('password123'),
            'pin' => '1234',
            'role_id' => $superRole->id,
        ]);

        $admission = MemberAdmission::create([
            'application_no' => '0001000003',
            'applicant_name_bn' => 'টেস্ট সদস্য',
            'status' => 'approved',
        ]);

        $controller = new CycleOverrideController();
        $request = Request::create("/member/cycle-hub/override/{$admission->id}", 'POST', [
            'pin' => 'wrong_pin_9999',
            'admission' => ['applicant_name_bn' => 'নতুন নাম'],
        ]);
        $request->setUserResolver(fn () => $superAdmin);

        $response = $controller->update($request, $admission->id);
        $this->assertEquals(422, $response->getStatusCode());
    }

    public function test_superadmin_can_update_loan_directly_in_any_status_and_sync(): void
    {
        $superRole = Role::create(['name' => Role::SUPER_ADMIN]);
        $superAdmin = User::create([
            'name' => 'Super Admin',
            'email' => 'admin3@test.local',
            'password' => Hash::make('secretpass'),
            'pin' => '5555',
            'role_id' => $superRole->id,
            'has_all_access' => true,
        ]);

        $catAgrosor = MemberCategory::create(['category_name' => 'Agrosor', 'category_name_bn' => 'অগ্রসর']);
        $loanCatAgrosor = LoanCategory::create(['category_name' => 'Agrosor', 'category_name_bn' => 'অগ্রসর', 'category_code' => 'AGR']);
        $prodAgrosor = LoanProduct::create([
            'loan_category_id' => $loanCatAgrosor->id,
            'product_name' => 'Agrosor Monthly',
            'product_name_bn' => 'অগ্রসর মাসিক',
            'duration_months' => 24,
        ]);

        $branch = Branch::create(['name' => 'Branch B', 'code' => '0002']);
        $samity = Samity::create(['branch_id' => $branch->id, 'samity_name' => 'Samity B', 'samity_code' => '02']);

        $admission = MemberAdmission::create([
            'application_no' => '0002000010',
            'branch_id' => $branch->id,
            'samity_id' => $samity->id,
            'member_category_id' => $catAgrosor->id,
            'applicant_name_bn' => 'করিম মিয়া',
            'status' => 'approved',
        ]);

        $loan = LoanApplication::create([
            'application_no' => 'LA-202',
            'member_admission_id' => $admission->id,
            'loan_category_id' => $loanCatAgrosor->id,
            'loan_product_id' => $prodAgrosor->id,
            'branch_id' => $branch->id,
            'samity_id' => $samity->id,
            'requested_amount' => 100000,
            'approved_amount' => 100000,
            'status' => LoanApplication::STATUS_APPROVED,
        ]);

        $controller = new CycleOverrideController();
        $request = Request::create("/member/cycle-hub/override/{$admission->id}", 'POST', [
            'pin' => '5555',
            'loan' => [
                'id' => $loan->id,
                'approved_amount' => 150000,
                'status' => LoanApplication::STATUS_DISBURSED,
                'disbursed_amount' => 150000,
                'loan_term_months' => 36,
            ],
        ]);
        $request->setUserResolver(fn () => $superAdmin);

        $response = $controller->update($request, $admission->id);
        $this->assertEquals(200, $response->getStatusCode(), $response->getContent());

        $loan->refresh();
        $this->assertEquals(150000, (float) $loan->approved_amount);
        $this->assertEquals(150000, (float) $loan->disbursed_amount);
        $this->assertEquals(LoanApplication::STATUS_DISBURSED, $loan->status);
        $this->assertEquals(36, $loan->loan_term_months);
    }
}
