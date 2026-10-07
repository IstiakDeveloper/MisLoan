<?php

namespace Tests\Unit;

use App\Models\Branch;
use App\Models\MemberAdmission;
use App\Models\MemberCategory;
use App\Models\Role;
use App\Models\Samity;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class MemberAdmissionSubmitValidationTest extends TestCase
{
    private function createDummyTables(): void
    {
        if (DB::connection()->getDriverName() === 'sqlite') {
            DB::connection()->getPdo()->sqliteCreateFunction('REGEXP', function ($pattern, $value) {
                return (int) (preg_match('/'.$pattern.'/', (string) $value) === 1);
            });
        }

        Schema::dropIfExists('loan_application_approvals');
        Schema::dropIfExists('member_admission_approvals');
        Schema::dropIfExists('loan_application_issues');
        Schema::dropIfExists('member_admission_issues');
        Schema::dropIfExists('loan_applications');
        Schema::dropIfExists('loan_products');
        Schema::dropIfExists('member_other_assets');
        Schema::dropIfExists('member_family_members');
        Schema::dropIfExists('member_admissions');
        Schema::dropIfExists('samities');
        Schema::dropIfExists('member_categories');
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('settings');
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
            $table->string('name')->default('Main Branch');
            $table->string('code')->nullable();
            $table->unsignedBigInteger('area_id')->nullable();
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
            $table->unsignedBigInteger('area_id')->nullable();
            $table->unsignedBigInteger('zone_id')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('has_all_access')->default(false);
            $table->string('signature')->nullable();
            $table->string('pin')->nullable();
            $table->timestamps();
            $table->softDeletes();
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

        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->string('type')->nullable();
            $table->string('title')->nullable();
            $table->text('message')->nullable();
            $table->string('notifiable_type')->nullable();
            $table->unsignedBigInteger('notifiable_id')->nullable();
            $table->text('data')->nullable();
            $table->string('action_url')->nullable();
            $table->boolean('is_read')->default(false);
            $table->boolean('is_sent_email')->default(false);
            $table->timestamp('read_at')->nullable();
            $table->timestamp('email_sent_at')->nullable();
            $table->timestamps();
        });

        Schema::create('samities', function (Blueprint $table) {
            $table->id();
            $table->string('samity_name')->nullable();
            $table->string('samity_name_bn')->nullable();
            $table->string('samity_code')->nullable();
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('member_categories', function (Blueprint $table) {
            $table->id();
            $table->string('category_name');
            $table->timestamps();
        });

        Schema::create('member_admissions', function (Blueprint $table) {
            $table->id();
            $table->string('application_no')->nullable();
            $table->string('member_code')->nullable();
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->unsignedBigInteger('samity_id')->nullable();
            $table->unsignedBigInteger('member_category_id')->nullable();
            $table->date('survey_date')->nullable();
            $table->date('admission_date')->nullable();
            $table->string('applicant_name_en')->nullable();
            $table->string('applicant_name_bn')->nullable();
            $table->string('father_name_en')->nullable();
            $table->string('father_name_bn')->nullable();
            $table->string('mother_name_en')->nullable();
            $table->string('mother_name_bn')->nullable();
            $table->string('marital_status')->nullable();
            $table->string('mobile_number')->nullable();
            $table->string('present_division')->nullable();
            $table->string('present_district')->nullable();
            $table->string('present_upazila')->nullable();
            $table->string('nid_number')->nullable();
            $table->string('smart_card_number')->nullable();
            $table->date('date_of_birth')->nullable();
            $table->string('gender')->nullable();
            $table->string('customer_nid_photo_path')->nullable();
            $table->decimal('total_asset_value', 12, 2)->default(0);
            $table->decimal('cultivable_land_value', 12, 2)->default(0);
            $table->decimal('non_cultivable_land_value', 12, 2)->default(0);
            $table->boolean('nid_both_sides')->default(false);
            $table->string('customer_nid_back_photo_path')->nullable();
            $table->boolean('is_legacy')->default(false);
            $table->integer('loan_dofa')->nullable();
            $table->unsignedBigInteger('previous_admission_id')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('assigned_officer_id')->nullable();
            $table->unsignedBigInteger('submitted_by')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->unsignedBigInteger('reviewed_by')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->string('status')->default('draft');
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('member_family_members', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('member_admission_id');
            $table->integer('sl_no')->default(1);
            $table->string('member_name');
            $table->string('relation_with_head');
            $table->string('gender')->default('other');
            $table->integer('age_years')->nullable();
            $table->integer('age_months')->nullable();
            $table->string('education_level')->nullable();
            $table->string('occupation')->nullable();
            $table->decimal('monthly_income', 12, 2)->nullable();
            $table->timestamps();
        });

        Schema::create('member_other_assets', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('member_admission_id');
            $table->integer('sl_no')->default(1);
            $table->string('asset_description');
            $table->string('quantity_amount')->nullable();
            $table->decimal('estimated_value', 12, 2)->nullable();
            $table->timestamps();
        });

        Schema::create('member_admission_issues', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('member_admission_id');
            $table->unsignedBigInteger('reported_by')->nullable();
            $table->text('issue_description')->nullable();
            $table->text('resolution_note')->nullable();
            $table->string('status')->default('pending');
            $table->timestamps();
        });

        Schema::create('member_admission_approvals', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('member_admission_id');
            $table->unsignedBigInteger('user_id');
            $table->string('level')->default('branch');
            $table->integer('sequence')->default(1);
            $table->string('status')->default('pending');
            $table->text('comments')->nullable();
            $table->dateTime('approved_at')->nullable();
            $table->timestamps();
        });

        Schema::create('loan_products', function (Blueprint $table) {
            $table->id();
            $table->string('product_name')->nullable();
            $table->string('installment_type')->nullable();
            $table->timestamps();
        });

        Schema::create('loan_applications', function (Blueprint $table) {
            $table->id();
            $table->string('application_no')->nullable();
            $table->unsignedBigInteger('member_admission_id')->nullable();
            $table->unsignedBigInteger('loan_product_id')->nullable();
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->unsignedBigInteger('submitted_by')->nullable();
            $table->string('status')->default('draft');
            $table->decimal('requested_amount', 12, 2)->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('loan_application_issues', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('loan_application_id');
            $table->unsignedBigInteger('reported_by')->nullable();
            $table->text('issue_description')->nullable();
            $table->text('resolution_note')->nullable();
            $table->text('response_message')->nullable();
            $table->string('status')->default('pending');
            $table->timestamps();
        });

        Schema::create('loan_application_approvals', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('loan_application_id');
            $table->unsignedBigInteger('user_id');
            $table->string('level')->default('branch');
            $table->unsignedTinyInteger('sequence')->default(1);
            $table->string('status')->default('pending');
            $table->text('comments')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
        });
    }

    private function createValidDraftMember(Branch $branch, array $overrides = []): MemberAdmission
    {
        $samity = Samity::create(['samity_name' => 'Samity 1', 'branch_id' => $branch->id]);
        $cat = MemberCategory::create(['category_name' => 'General']);

        $admission = MemberAdmission::create(array_merge([
            'application_no' => 'APP-'.rand(1000, 9999),
            'branch_id' => $branch->id,
            'samity_id' => $samity->id,
            'member_category_id' => $cat->id,
            'survey_date' => '2026-01-01',
            'admission_date' => '2026-01-02',
            'applicant_name_en' => 'Karim Rahman',
            'applicant_name_bn' => 'করিম রহমান',
            'father_name_en' => 'Rahim Rahman',
            'father_name_bn' => 'রহিম রহমান',
            'mother_name_en' => 'Fatema Begum',
            'mother_name_bn' => 'ফাতেমা বেগম',
            'marital_status' => 'married',
            'mobile_number' => '01712345678',
            'present_division' => 'Dhaka',
            'present_district' => 'Dhaka',
            'present_upazila' => 'Mirpur',
            'nid_number' => '1234567890123',
            'date_of_birth' => '1995-05-15',
            'gender' => 'male',
            'customer_nid_photo_path' => 'admissions/customer_nids/test.jpg',
            'total_asset_value' => 50000.00,
            'status' => 'draft',
        ], $overrides));

        $admission->familyMembers()->create([
            'sl_no' => 1,
            'member_name' => 'Karim Rahman',
            'relation_with_head' => 'নিজ',
            'gender' => 'male',
            'age_years' => 31,
        ]);

        return $admission;
    }

    public function test_submit_fails_when_date_of_birth_is_missing(): void
    {
        $this->createDummyTables();

        $foRole = Role::create(['name' => Role::FIELD_OFFICER, 'display_name' => 'Field Officer']);
        $branch = Branch::create(['name' => 'Dhaka Branch']);
        $user = User::create([
            'name' => 'Field Officer 1',
            'email' => 'fo@example.com',
            'role_id' => $foRole->id,
            'branch_id' => $branch->id,
            'has_all_access' => true,
        ]);

        $this->actingAs($user);

        $admission = $this->createValidDraftMember($branch, [
            'date_of_birth' => null,
            'total_asset_value' => 100000,
        ]);

        $response = $this->patch(route('member-admissions.submit', $admission));

        $response->assertRedirect(route('member-admissions.edit', [
            'memberAdmission' => $admission->id,
            'for_submit' => 1,
        ]));
        $response->assertSessionHasErrors(['date_of_birth']);
    }

    public function test_submit_fails_when_total_asset_value_is_zero(): void
    {
        $this->createDummyTables();

        $foRole = Role::create(['name' => Role::FIELD_OFFICER, 'display_name' => 'Field Officer']);
        $branch = Branch::create(['name' => 'Dhaka Branch']);
        $user = User::create([
            'name' => 'Field Officer 1',
            'email' => 'fo2@example.com',
            'role_id' => $foRole->id,
            'branch_id' => $branch->id,
            'has_all_access' => true,
        ]);

        $this->actingAs($user);

        $admission = $this->createValidDraftMember($branch, [
            'date_of_birth' => '1990-01-01',
            'total_asset_value' => 0,
            'cultivable_land_value' => 0,
            'non_cultivable_land_value' => 0,
        ]);

        $response = $this->patch(route('member-admissions.submit', $admission));

        $response->assertRedirect(route('member-admissions.edit', [
            'memberAdmission' => $admission->id,
            'for_submit' => 1,
        ]));
        $response->assertSessionHasErrors(['total_asset_value']);
    }

    public function test_submit_succeeds_when_both_date_of_birth_and_total_asset_value_are_valid(): void
    {
        $this->createDummyTables();

        $bmRole = Role::create(['name' => Role::BRANCH_MANAGER, 'display_name' => 'Branch Manager']);
        $foRole = Role::create(['name' => Role::FIELD_OFFICER, 'display_name' => 'Field Officer']);
        $branch = Branch::create(['name' => 'Dhaka Branch']);
        User::create([
            'name' => 'Branch Manager',
            'email' => 'bm@example.com',
            'role_id' => $bmRole->id,
            'branch_id' => $branch->id,
            'is_active' => true,
            'has_all_access' => true,
        ]);
        $user = User::create([
            'name' => 'Field Officer',
            'email' => 'fo3@example.com',
            'role_id' => $foRole->id,
            'branch_id' => $branch->id,
            'is_active' => true,
            'has_all_access' => true,
        ]);

        $this->actingAs($user);

        $admission = $this->createValidDraftMember($branch, [
            'date_of_birth' => '1992-04-10',
            'total_asset_value' => 75000,
        ]);

        $response = $this->patch(route('member-admissions.submit', $admission));

        $response->assertSessionHasNoErrors();
        $this->assertEquals('submitted', $admission->fresh()->status);
    }

    public function test_submit_automatically_computes_asset_value_from_land_or_other_assets(): void
    {
        $this->createDummyTables();

        $bmRole = Role::create(['name' => Role::BRANCH_MANAGER, 'display_name' => 'Branch Manager']);
        $foRole = Role::create(['name' => Role::FIELD_OFFICER, 'display_name' => 'Field Officer']);
        $branch = Branch::create(['name' => 'Dhaka Branch']);
        User::create([
            'name' => 'Branch Manager',
            'email' => 'bm2@example.com',
            'role_id' => $bmRole->id,
            'branch_id' => $branch->id,
            'is_active' => true,
            'has_all_access' => true,
        ]);
        $user = User::create([
            'name' => 'Field Officer',
            'email' => 'fo4@example.com',
            'role_id' => $foRole->id,
            'branch_id' => $branch->id,
            'is_active' => true,
            'has_all_access' => true,
        ]);

        $this->actingAs($user);

        $admission = $this->createValidDraftMember($branch, [
            'date_of_birth' => '1993-08-20',
            'total_asset_value' => 0,
            'cultivable_land_value' => 60000,
        ]);

        $response = $this->patch(route('member-admissions.submit', $admission));

        $response->assertSessionHasNoErrors();
        $this->assertEquals('submitted', $admission->fresh()->status);
        $this->assertEquals(60000, (float) $admission->fresh()->total_asset_value);
    }
}
