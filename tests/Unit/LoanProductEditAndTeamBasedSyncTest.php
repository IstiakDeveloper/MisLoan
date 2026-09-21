<?php

namespace Tests\Unit;

use App\Models\Branch;
use App\Models\LoanApplication;
use App\Models\LoanCategory;
use App\Models\LoanProduct;
use App\Models\MemberAdmission;
use App\Models\Role;
use App\Models\TeamBasedApproval;
use App\Models\TeamBasedApprovalItem;
use App\Models\TeamBasedApprovalReview;
use App\Models\User;
use App\Services\ApprovalService;
use App\Support\LoanFormVisibility;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class LoanProductEditAndTeamBasedSyncTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpSchema();
    }

    private function setUpSchema(): void
    {
        Schema::dropIfExists('team_based_approval_reviews');
        Schema::dropIfExists('team_based_approval_items');
        Schema::dropIfExists('team_based_approvals');
        Schema::dropIfExists('loan_applications');
        Schema::dropIfExists('loan_products');
        Schema::dropIfExists('loan_categories');
        Schema::dropIfExists('member_admissions');
        Schema::dropIfExists('user_zones');
        Schema::dropIfExists('user_areas');
        Schema::dropIfExists('user_branches');
        Schema::dropIfExists('zones');
        Schema::dropIfExists('areas');
        Schema::dropIfExists('branches');
        Schema::dropIfExists('users');
        Schema::dropIfExists('roles');

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
        Schema::create('areas', function (Blueprint $table) {
            $table->id();
            $table->string('name')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
        Schema::create('zones', function (Blueprint $table) {
            $table->id();
            $table->string('name')->nullable();
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

        Schema::create('branches', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('branch_code')->nullable();
            $table->timestamps();
            $table->softDeletes();
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
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('member_admissions', function (Blueprint $table) {
            $table->id();
            $table->string('application_no')->nullable();
            $table->string('applicant_name_bn')->nullable();
            $table->string('applicant_name_en')->nullable();
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->timestamps();
        });

        Schema::create('loan_categories', function (Blueprint $table) {
            $table->id();
            $table->string('category_name');
            $table->string('category_name_bn')->nullable();
            $table->timestamps();
        });

        Schema::create('loan_products', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('loan_category_id');
            $table->string('product_name');
            $table->string('product_name_bn')->nullable();
            $table->decimal('interest_rate', 5, 2)->default(0);
            $table->integer('duration_months')->default(12);
            $table->string('installment_type')->default('weekly');
            $table->integer('number_of_installments')->default(46);
            $table->decimal('min_amount', 12, 2)->nullable();
            $table->decimal('max_amount', 12, 2)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('loan_applications', function (Blueprint $table) {
            $table->id();
            $table->string('application_no')->nullable();
            $table->unsignedBigInteger('member_admission_id')->nullable();
            $table->unsignedBigInteger('loan_category_id')->nullable();
            $table->unsignedBigInteger('loan_product_id')->nullable();
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->string('status')->default('draft');
            $table->decimal('requested_amount', 12, 2)->default(0);
            $table->decimal('approved_amount', 12, 2)->nullable();
            $table->decimal('pending_approved_amount', 12, 2)->nullable();
            $table->integer('loan_term_months')->default(12);
            $table->integer('number_of_installments')->default(46);
            $table->decimal('installment_amount', 12, 2)->default(0);
            $table->string('repayment_frequency')->default('weekly');
            $table->string('purpose_of_loan')->nullable();
            $table->string('form_type')->nullable();
            $table->json('business_plan')->nullable();
            $table->json('loan_agreement_data')->nullable();
            $table->json('guarantor_info')->nullable();
            $table->json('nominee_info')->nullable();
            $table->json('asset_info')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('team_based_approvals', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('branch_id');
            $table->unsignedBigInteger('loan_application_id')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->date('sheet_date')->nullable();
            $table->unsignedBigInteger('area_manager_id')->nullable();
            $table->unsignedBigInteger('zone_manager_id')->nullable();
            $table->unsignedBigInteger('admf_id')->nullable();
            $table->unsignedBigInteger('dmf_id')->nullable();
            $table->unsignedBigInteger('ed_id')->nullable();
            $table->string('status')->default('pending');
            $table->integer('approved_total_amount')->nullable();
            $table->json('last_items_snapshot')->nullable();
            $table->timestamps();
        });

        Schema::create('team_based_approval_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('team_based_approval_id');
            $table->integer('serial_no')->default(1);
            $table->string('member_name')->nullable();
            $table->string('name_bn')->nullable();
            $table->string('father_name')->nullable();
            $table->string('mother_name')->nullable();
            $table->string('spouse_name')->nullable();
            $table->date('dob')->nullable();
            $table->string('nid_number')->nullable();
            $table->string('address')->nullable();
            $table->string('member_code')->nullable();
            $table->string('member_phone')->nullable();
            $table->string('samity_number')->nullable();
            $table->integer('savings_general')->nullable();
            $table->integer('savings_other')->nullable();
            $table->integer('savings_total')->nullable();
            $table->string('repaid_loan_amount')->nullable();
            $table->string('repaid_installment_no')->nullable();
            $table->string('other_institution_loan_amount')->nullable();
            $table->string('proposed_loan_amount')->nullable();
            $table->integer('approved_amount')->nullable();
            $table->float('loan_term_years')->nullable();
            $table->string('loan_type')->nullable();
            $table->string('project_name')->nullable();
            $table->timestamps();
        });

        Schema::create('team_based_approval_reviews', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('team_based_approval_id');
            $table->unsignedBigInteger('team_based_approval_item_id')->nullable();
            $table->unsignedBigInteger('user_id');
            $table->string('level')->nullable();
            $table->string('status')->default('pending');
            $table->integer('approved_amount')->nullable();
            $table->text('comments')->nullable();
            $table->string('approver_signature')->nullable();
            $table->timestamp('decided_at')->nullable();
            $table->timestamps();
        });
    }

    public function test_branch_user_can_edit_loan_details_for_approved_loan(): void
    {
        $this->assertTrue(
            LoanFormVisibility::canEditLoanDetails(Role::BRANCH_USER, LoanApplication::STATUS_APPROVED)
        );
        $this->assertTrue(
            LoanFormVisibility::canEditLoanDetails(Role::BRANCH_USER, LoanApplication::STATUS_PENDING_DISBURSEMENT)
        );
        $this->assertFalse(
            LoanFormVisibility::canEditLoanDetails(Role::BRANCH_USER, LoanApplication::STATUS_DISBURSED)
        );
        $this->assertFalse(
            LoanFormVisibility::canEditLoanDetails(Role::BRANCH_USER, LoanApplication::STATUS_CANCELLED)
        );
    }

    public function test_team_based_syncs_when_loan_product_and_amount_are_updated(): void
    {
        $branch = Branch::create(['name' => 'Dhaka Branch', 'branch_code' => '0101']);
        $member = MemberAdmission::create([
            'application_no' => '0101000001',
            'applicant_name_bn' => 'রহিম উদ্দিন',
            'branch_id' => $branch->id,
        ]);

        $cat1 = LoanCategory::create(['category_name' => 'Jagoron', 'category_name_bn' => 'জাগরণ']);
        $prod1 = LoanProduct::create([
            'loan_category_id' => $cat1->id,
            'product_name' => 'Jagoron Weekly',
            'product_name_bn' => 'জাগরণ সাপ্তাহিক',
            'duration_months' => 12,
            'installment_type' => 'weekly',
            'number_of_installments' => 46,
            'min_amount' => 1000,
            'max_amount' => 100000,
        ]);

        $cat2 = LoanCategory::create(['category_name' => 'Agrosor', 'category_name_bn' => 'অগ্রসর']);
        $prod2 = LoanProduct::create([
            'loan_category_id' => $cat2->id,
            'product_name' => 'Agrosor Monthly',
            'product_name_bn' => 'অগ্রসর মাসিক',
            'duration_months' => 24,
            'installment_type' => 'monthly',
            'number_of_installments' => 24,
            'min_amount' => 50000,
            'max_amount' => 500000,
        ]);

        $loan = LoanApplication::create([
            'application_no' => 'LN-001',
            'member_admission_id' => $member->id,
            'loan_category_id' => $cat1->id,
            'loan_product_id' => $prod1->id,
            'branch_id' => $branch->id,
            'status' => LoanApplication::STATUS_APPROVED,
            'requested_amount' => 50000,
            'approved_amount' => 50000,
            'loan_term_months' => 12,
        ]);

        $teamBased = TeamBasedApproval::create([
            'branch_id' => $branch->id,
            'loan_application_id' => $loan->id,
            'status' => 'approved',
            'approved_total_amount' => 50000,
        ]);

        $item = TeamBasedApprovalItem::create([
            'team_based_approval_id' => $teamBased->id,
            'member_code' => $member->application_no,
            'proposed_loan_amount' => '50000',
            'approved_amount' => 50000,
            'loan_type' => 'জাগরণ সাপ্তাহিক',
            'loan_term_years' => 1.0,
        ]);

        $review = TeamBasedApprovalReview::create([
            'team_based_approval_id' => $teamBased->id,
            'team_based_approval_item_id' => $item->id,
            'user_id' => 1,
            'status' => 'approved',
            'approved_amount' => 50000,
        ]);

        // Now update loan product, duration, and approved amount to 80,000
        $loan->update([
            'loan_category_id' => $cat2->id,
            'loan_product_id' => $prod2->id,
            'requested_amount' => 80000,
            'approved_amount' => 80000,
            'loan_term_months' => 24,
        ]);

        // Team based sync should have occurred automatically via model event
        $freshItem = $item->fresh();
        $this->assertSame('80000', $freshItem->proposed_loan_amount);
        $this->assertEquals(80000, $freshItem->approved_amount);
        $this->assertSame('অগ্রসর মাসিক', $freshItem->loan_type);
        $this->assertEquals(2.0, (float) $freshItem->loan_term_years);

        $freshReview = $review->fresh();
        $this->assertEquals(80000, $freshReview->approved_amount);

        $freshTeamBased = $teamBased->fresh();
        $this->assertEquals(80000, $freshTeamBased->approved_total_amount);
    }

    public function test_branch_user_cannot_change_amount_if_already_approved(): void
    {
        $branch = Branch::create(['name' => 'Dhaka Branch 2', 'branch_code' => '0102']);
        $buRole = Role::create(['name' => Role::BRANCH_USER, 'display_name' => 'Branch User']);
        $user = User::create([
            'name' => 'Accountant',
            'email' => 'acc@test.com',
            'role_id' => $buRole->id,
            'branch_id' => $branch->id,
            'is_active' => true,
        ]);

        $cat = LoanCategory::create(['category_name' => 'Jagoron 2', 'category_name_bn' => 'জাগরণ']);
        $prod = LoanProduct::create([
            'loan_category_id' => $cat->id,
            'product_name' => 'Jagoron Weekly',
            'product_name_bn' => 'জাগরণ সাপ্তাহিক',
            'duration_months' => 12,
            'installment_type' => 'weekly',
            'number_of_installments' => 46,
            'min_amount' => 1000,
            'max_amount' => 100000,
        ]);

        $loan = LoanApplication::create([
            'application_no' => 'LN-002',
            'loan_category_id' => $cat->id,
            'loan_product_id' => $prod->id,
            'branch_id' => $branch->id,
            'status' => LoanApplication::STATUS_APPROVED,
            'requested_amount' => 50000,
            'approved_amount' => 50000,
            'loan_term_months' => 12,
        ]);

        $controller = app(\App\Http\Controllers\Member\LoanApplicationController::class);
        $request = \Illuminate\Http\Request::create(
            "/member/loan-applications/{$loan->id}/update-loan-product",
            'PATCH',
            [
                'loan_category_id' => $cat->id,
                'loan_product_id' => $prod->id,
                'requested_amount' => 60000,
                'number_of_installments' => 46,
                'loan_term_months' => 12,
                'repayment_frequency' => 'weekly',
            ]
        );
        $request->setUserResolver(fn () => $user);

        $controller->updateLoanProduct($request, $loan->id);
        $this->assertTrue(session()->has('errors'));
        $errors = session('errors')->getBag('default');
        $this->assertTrue($errors->has('requested_amount'));
        $this->assertSame(
            'ঋণের পরিমাণ ইতিমধ্যে অনুমোদিত হওয়ায় শাখা থেকে পরিমাণ পরিবর্তন করা যাবে না। কেবল ঋণ প্রোডাক্ট ও সংশ্লিষ্ট শর্তাবলী পরিবর্তন করা যাবে।',
            $errors->first('requested_amount')
        );
    }

    public function test_branch_user_can_change_amount_if_not_yet_approved(): void
    {
        $branch = Branch::create(['name' => 'Dhaka Branch 3', 'branch_code' => '0103']);
        $buRole = Role::create(['name' => Role::BRANCH_USER, 'display_name' => 'Branch User']);
        $user = User::create([
            'name' => 'Accountant 3',
            'email' => 'acc3@test.com',
            'role_id' => $buRole->id,
            'branch_id' => $branch->id,
            'is_active' => true,
        ]);

        $cat = LoanCategory::create(['category_name' => 'Jagoron 3', 'category_name_bn' => 'জাগরণ']);
        $prod = LoanProduct::create([
            'loan_category_id' => $cat->id,
            'product_name' => 'Jagoron Weekly 3',
            'product_name_bn' => 'জাগরণ সাপ্তাহিক',
            'duration_months' => 12,
            'installment_type' => 'weekly',
            'number_of_installments' => 46,
            'min_amount' => 1000,
            'max_amount' => 100000,
        ]);

        $loan = LoanApplication::create([
            'application_no' => 'LN-003',
            'loan_category_id' => $cat->id,
            'loan_product_id' => $prod->id,
            'branch_id' => $branch->id,
            'status' => LoanApplication::STATUS_PENDING_HEAD_OFFICE,
            'requested_amount' => 40000,
            'approved_amount' => null,
            'loan_term_months' => 12,
        ]);

        $controller = app(\App\Http\Controllers\Member\LoanApplicationController::class);
        $request = \Illuminate\Http\Request::create(
            "/member/loan-applications/{$loan->id}/update-loan-product",
            'PATCH',
            [
                'loan_category_id' => $cat->id,
                'loan_product_id' => $prod->id,
                'requested_amount' => 45000,
                'number_of_installments' => 46,
                'loan_term_months' => 12,
                'repayment_frequency' => 'weekly',
            ]
        );
        $request->setUserResolver(fn () => $user);

        $controller->updateLoanProduct($request, $loan->id);
        $this->assertEquals(45000, (float) $loan->fresh()->requested_amount);
    }

    public function test_super_admin_can_change_amount_even_if_already_approved(): void
    {
        $branch = Branch::create(['name' => 'Dhaka Branch 4', 'branch_code' => '0104']);
        $saRole = Role::create(['name' => Role::SUPER_ADMIN, 'display_name' => 'Super Admin']);
        $admin = User::create([
            'name' => 'Super Admin',
            'email' => 'admin@test.com',
            'role_id' => $saRole->id,
            'is_active' => true,
            'has_all_access' => true,
        ]);

        $cat = LoanCategory::create(['category_name' => 'Jagoron 4', 'category_name_bn' => 'জাগরণ']);
        $prod = LoanProduct::create([
            'loan_category_id' => $cat->id,
            'product_name' => 'Jagoron Weekly 4',
            'product_name_bn' => 'জাগরণ সাপ্তাহিক',
            'duration_months' => 12,
            'installment_type' => 'weekly',
            'number_of_installments' => 46,
            'min_amount' => 1000,
            'max_amount' => 100000,
        ]);

        $loan = LoanApplication::create([
            'application_no' => 'LN-004',
            'loan_category_id' => $cat->id,
            'loan_product_id' => $prod->id,
            'branch_id' => $branch->id,
            'status' => LoanApplication::STATUS_APPROVED,
            'requested_amount' => 40000,
            'approved_amount' => 40000,
            'loan_term_months' => 12,
        ]);

        $controller = app(\App\Http\Controllers\Member\LoanApplicationController::class);
        $request = \Illuminate\Http\Request::create(
            "/member/loan-applications/{$loan->id}/update-loan-product",
            'PATCH',
            [
                'loan_category_id' => $cat->id,
                'loan_product_id' => $prod->id,
                'requested_amount' => 50000,
                'number_of_installments' => 46,
                'loan_term_months' => 12,
                'repayment_frequency' => 'weekly',
            ]
        );
        $request->setUserResolver(fn () => $admin);

        $controller->updateLoanProduct($request, $loan->id);
        $freshLoan = $loan->fresh();
        $this->assertEquals(50000, (float) $freshLoan->requested_amount);
        $this->assertEquals(50000, (float) $freshLoan->approved_amount);
    }

    public function test_update_loan_product_rejects_with_clear_error_if_amount_is_below_product_min_amount(): void
    {
        $branch = Branch::create(['name' => 'Dhaka Branch 4B', 'branch_code' => '0104B']);
        $buRole = Role::firstOrCreate(['name' => Role::BRANCH_USER], ['display_name' => 'Branch User']);
        $user = User::create([
            'name' => 'Branch User 4B',
            'email' => 'bu4b@test.com',
            'role_id' => $buRole->id,
            'branch_id' => $branch->id,
            'is_active' => true,
        ]);
        DB::table('user_branches')->insert(['user_id' => $user->id, 'branch_id' => $branch->id]);

        $catOld = LoanCategory::create(['category_name' => 'RMTP-SME', 'category_name_bn' => 'আরএমটিপি-এসএমই']);
        $prodOld = LoanProduct::create([
            'loan_category_id' => $catOld->id,
            'product_name' => 'SAHOS_DM/W',
            'duration_months' => 6,
            'installment_type' => 'monthly',
            'number_of_installments' => 6,
            'min_amount' => 1,
            'max_amount' => 50000,
        ]);

        $catAgro = LoanCategory::create(['category_name' => 'Agrosor', 'category_name_bn' => 'অগ্রসর']);
        $prodAgro = LoanProduct::create([
            'loan_category_id' => $catAgro->id,
            'product_name' => 'Agr_F/M1Yr',
            'duration_months' => 12,
            'installment_type' => 'monthly',
            'number_of_installments' => 12,
            'min_amount' => 200000, // 2 lakh min
            'max_amount' => 6000000,
        ]);

        $loan = LoanApplication::create([
            'application_no' => 'LN20260902290',
            'loan_category_id' => $catOld->id,
            'loan_product_id' => $prodOld->id,
            'branch_id' => $branch->id,
            'status' => LoanApplication::STATUS_PENDING_HEAD_OFFICE,
            'requested_amount' => 20000,
            'approved_amount' => 20000,
            'loan_term_months' => 6,
        ]);

        $controller = app(\App\Http\Controllers\Member\LoanApplicationController::class);
        $request = \Illuminate\Http\Request::create(
            "/member/loan-applications/{$loan->id}/update-loan-product",
            'PATCH',
            [
                'loan_category_id' => $catAgro->id,
                'loan_product_id' => $prodAgro->id,
                'requested_amount' => 20000,
                'number_of_installments' => 12,
                'loan_term_months' => 12,
                'repayment_frequency' => 'monthly',
            ]
        );
        $request->setUserResolver(fn () => $user);

        $controller->updateLoanProduct($request, $loan->id);
        $this->assertTrue(session()->has('errors'), 'Should have validation errors when amount < min_amount');
        $errors = session('errors')->getBag('default');
        $this->assertTrue($errors->has('requested_amount'));
        $this->assertStringContainsString('নির্বাচিত প্রডাক্টের সর্বনিম্ন পরিমাণ ৳200,000 হতে হবে', $errors->first('requested_amount'));
    }

    public function test_deleting_loan_deletes_linked_team_based_item_and_sheet(): void
    {
        $branch = Branch::create(['name' => 'Dhaka Branch 5', 'branch_code' => '0105']);
        $member = MemberAdmission::create([
            'application_no' => '0105000001',
            'applicant_name_bn' => 'করিম মিয়া',
            'branch_id' => $branch->id,
        ]);

        $loan = LoanApplication::create([
            'application_no' => 'LN-005',
            'member_admission_id' => $member->id,
            'branch_id' => $branch->id,
            'status' => LoanApplication::STATUS_DRAFT,
            'requested_amount' => 30000,
        ]);

        $teamBased = TeamBasedApproval::create([
            'branch_id' => $branch->id,
            'loan_application_id' => $loan->id,
            'status' => 'pending',
        ]);

        $item = TeamBasedApprovalItem::create([
            'team_based_approval_id' => $teamBased->id,
            'member_code' => $member->application_no,
            'proposed_loan_amount' => '30000',
        ]);

        $review = TeamBasedApprovalReview::create([
            'team_based_approval_id' => $teamBased->id,
            'team_based_approval_item_id' => $item->id,
            'user_id' => 1,
            'status' => 'pending',
        ]);

        // Delete loan
        $loan->delete();

        // Linked item, review, and empty sheet must be deleted
        $this->assertDatabaseMissing('team_based_approval_items', ['id' => $item->id]);
        $this->assertDatabaseMissing('team_based_approval_reviews', ['id' => $review->id]);
        $this->assertDatabaseMissing('team_based_approvals', ['id' => $teamBased->id]);
    }

    public function test_deleting_loan_does_not_delete_other_loans_in_multi_item_sheet(): void
    {
        $branch = Branch::create(['name' => 'Dhaka Branch 6', 'branch_code' => '0106']);
        $memberA = MemberAdmission::create([
            'application_no' => '0106000001',
            'applicant_name_bn' => 'সদস্য ক',
            'branch_id' => $branch->id,
        ]);
        $memberB = MemberAdmission::create([
            'application_no' => '0106000002',
            'applicant_name_bn' => 'সদস্য খ',
            'branch_id' => $branch->id,
        ]);

        $loanA = LoanApplication::create([
            'application_no' => 'LN-006A',
            'member_admission_id' => $memberA->id,
            'branch_id' => $branch->id,
            'status' => LoanApplication::STATUS_APPROVED,
            'requested_amount' => 30000,
            'approved_amount' => 30000,
        ]);
        $loanB = LoanApplication::create([
            'application_no' => 'LN-006B',
            'member_admission_id' => $memberB->id,
            'branch_id' => $branch->id,
            'status' => LoanApplication::STATUS_APPROVED,
            'requested_amount' => 50000,
            'approved_amount' => 50000,
        ]);

        // Multi-item sheet containing both Member A and Member B
        $teamBased = TeamBasedApproval::create([
            'branch_id' => $branch->id,
            'status' => 'approved',
            'approved_total_amount' => 80000,
        ]);

        $itemA = TeamBasedApprovalItem::create([
            'team_based_approval_id' => $teamBased->id,
            'member_code' => $memberA->application_no,
            'proposed_loan_amount' => '30000',
            'approved_amount' => 30000,
        ]);
        $itemB = TeamBasedApprovalItem::create([
            'team_based_approval_id' => $teamBased->id,
            'member_code' => $memberB->application_no,
            'proposed_loan_amount' => '50000',
            'approved_amount' => 50000,
        ]);

        $reviewA = TeamBasedApprovalReview::create([
            'team_based_approval_id' => $teamBased->id,
            'team_based_approval_item_id' => $itemA->id,
            'user_id' => 1,
            'status' => 'approved',
            'approved_amount' => 30000,
        ]);
        $reviewB = TeamBasedApprovalReview::create([
            'team_based_approval_id' => $teamBased->id,
            'team_based_approval_item_id' => $itemB->id,
            'user_id' => 1,
            'status' => 'approved',
            'approved_amount' => 50000,
        ]);

        // Delete only Loan A
        $loanA->delete();

        // Item A and its review must be deleted
        $this->assertDatabaseMissing('team_based_approval_items', ['id' => $itemA->id]);
        $this->assertDatabaseMissing('team_based_approval_reviews', ['id' => $reviewA->id]);

        // Item B and Review B must NOT be deleted!
        $this->assertDatabaseHas('team_based_approval_items', ['id' => $itemB->id]);
        $this->assertDatabaseHas('team_based_approval_reviews', ['id' => $reviewB->id]);

        // Sheet must NOT be deleted, and its approved total should reflect only Item B (50000)
        $this->assertDatabaseHas('team_based_approvals', ['id' => $teamBased->id]);
        $this->assertEquals(50000, $teamBased->fresh()->approved_total_amount);
    }
}
