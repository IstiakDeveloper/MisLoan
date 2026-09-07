<?php

use App\Http\Controllers\Member\LoanApplicationController;
use App\Models\LoanApplication;
use App\Models\LoanApplicationApproval;
use App\Models\Role;
use App\Models\User;
use App\Services\ApprovalService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

function setupApprovalCommentTestTables(): void
{
    Schema::dropIfExists('loan_application_approvals');
    Schema::dropIfExists('loan_applications');
    Schema::dropIfExists('users');
    Schema::dropIfExists('roles');

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
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('loan_applications', function (Blueprint $table) {
        $table->id();
        $table->string('application_no')->nullable();
        $table->unsignedBigInteger('member_admission_id')->nullable();
        $table->unsignedBigInteger('loan_product_id')->nullable();
        $table->unsignedBigInteger('branch_id')->nullable();
        $table->string('status')->default('under_review');
        $table->decimal('requested_amount', 12, 2)->default(50000);
        $table->decimal('approved_amount', 12, 2)->nullable();
        $table->json('business_plan')->nullable();
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('loan_application_approvals', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('loan_application_id');
        $table->unsignedBigInteger('user_id');
        $table->string('level');
        $table->integer('sequence')->default(1);
        $table->string('status')->default('pending');
        $table->text('comments')->nullable();
        $table->timestamp('approved_at')->nullable();
        $table->string('approver_signature')->nullable();
        $table->timestamps();
    });
}

test('it syncs all approver comments into business_plan', function () {
    setupApprovalCommentTestTables();

    $loan = LoanApplication::create([
        'application_no' => 'LA-TEST-01',
        'requested_amount' => 60000,
        'status' => 'approved',
        'approved_amount' => 60000,
        'business_plan' => [
            'proposed_project_name' => 'মৎস্য চাষ',
        ],
    ]);

    $branchUser = User::create(['name' => 'BM User', 'email' => 'bm@test.com']);
    $areaUser = User::create(['name' => 'AM User', 'email' => 'am@test.com']);

    $branchApproval = LoanApplicationApproval::create([
        'loan_application_id' => $loan->id,
        'user_id' => $branchUser->id,
        'level' => 'branch',
        'sequence' => 1,
        'status' => 'approved',
        'comments' => 'শাখা ব্যবস্থাপক সুপারিশ করেছেন',
        'approved_at' => now(),
    ]);

    $areaApproval = LoanApplicationApproval::create([
        'loan_application_id' => $loan->id,
        'user_id' => $areaUser->id,
        'level' => 'area',
        'sequence' => 2,
        'status' => 'approved',
        'comments' => 'আঞ্চলিক ব্যবস্থাপক চূড়ান্ত অনুমোদন দিয়েছেন',
        'approved_at' => now(),
    ]);

    $approvalService = app(ApprovalService::class);
    $approvalService->syncAllApprovalCommentsToBusinessPlan($loan);

    $loan->refresh();
    $plan = $loan->business_plan;

    expect($plan['branch_manager_post_inspection_comments'])->toBe('শাখা ব্যবস্থাপক সুপারিশ করেছেন');
    expect($plan['bm_comments'])->toBe('শাখা ব্যবস্থাপক সুপারিশ করেছেন');
    expect($plan['regional_manager_comments'])->toBe('আঞ্চলিক ব্যবস্থাপক চূড়ান্ত অনুমোদন দিয়েছেন');
    expect($plan['rm_comments'])->toBe('আঞ্চলিক ব্যবস্থাপক চূড়ান্ত অনুমোদন দিয়েছেন');
    expect($plan['final_approver_comments'])->toBe('আঞ্চলিক ব্যবস্থাপক চূড়ান্ত অনুমোদন দিয়েছেন');
    expect($plan['final_approver_remarks'])->toBe('আঞ্চলিক ব্যবস্থাপক চূড়ান্ত অনুমোদন দিয়েছেন');
    expect($plan['proposed_project_name'])->toBe('মৎস্য চাষ');
});

test('updating approval comment in controller syncs to loan business_plan', function () {
    setupApprovalCommentTestTables();

    $superAdminRole = Role::create(['name' => 'super_admin']);
    $superAdmin = User::create([
        'name' => 'Admin',
        'email' => 'admin@test.com',
        'role_id' => $superAdminRole->id,
        'has_all_access' => true,
    ]);

    $loan = LoanApplication::create([
        'application_no' => 'LA-TEST-02',
        'requested_amount' => 40000,
        'status' => 'approved',
        'approved_amount' => 40000,
        'business_plan' => [],
    ]);

    $bmUser = User::create(['name' => 'BM User', 'email' => 'bm2@test.com']);
    $approval = LoanApplicationApproval::create([
        'loan_application_id' => $loan->id,
        'user_id' => $bmUser->id,
        'level' => 'branch',
        'sequence' => 1,
        'status' => 'approved',
        'comments' => 'পুরাতন মন্তব্য',
        'approved_at' => now(),
    ]);

    $request = Request::create(
        "/loan-application-approvals/{$approval->id}/update-comment",
        'PATCH',
        ['comments' => 'সংশোধিত নতুন মন্তব্য']
    );
    $request->setUserResolver(fn () => $superAdmin);

    $controller = app(LoanApplicationController::class);
    $response = $controller->updateApprovalComment($request, $approval);

    expect($response->getStatusCode())->toBe(302);

    $approval->refresh();
    expect($approval->comments)->toBe('সংশোধিত নতুন মন্তব্য');

    $loan->refresh();
    $plan = $loan->business_plan;
    expect($plan['branch_manager_post_inspection_comments'])->toBe('সংশোধিত নতুন মন্তব্য');
    expect($plan['final_approver_comments'])->toBe('সংশোধিত নতুন মন্তব্য');
});
