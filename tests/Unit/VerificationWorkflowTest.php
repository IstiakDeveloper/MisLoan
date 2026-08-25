<?php

namespace Tests\Unit;

use App\Models\Branch;
use App\Models\LoanApplication;
use App\Models\LoanApplicationIssue;
use App\Models\MemberAdmission;
use App\Models\MemberAdmissionIssue;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class VerificationWorkflowTest extends TestCase
{
    private function createDummyTables(): void
    {
        if (DB::connection()->getDriverName() === 'sqlite') {
            DB::connection()->getPdo()->sqliteCreateFunction('REGEXP', function ($pattern, $value) {
                return (int) (preg_match('/'.$pattern.'/', (string) $value) === 1);
            });
        }

        Schema::dropIfExists('loan_application_issues');
        Schema::dropIfExists('loan_applications');
        Schema::dropIfExists('member_admission_issues');
        Schema::dropIfExists('member_admissions');
        Schema::dropIfExists('users');
        Schema::dropIfExists('roles');
        Schema::dropIfExists('branches');

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

        Schema::create('member_admissions', function (Blueprint $table) {
            $table->id();
            $table->string('application_no')->nullable();
            $table->string('applicant_name_en')->nullable();
            $table->string('applicant_name_bn')->nullable();
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('submitted_by')->nullable();
            $table->unsignedBigInteger('reviewed_by')->nullable();
            $table->dateTime('reviewed_at')->nullable();
            $table->dateTime('submitted_at')->nullable();
            $table->string('status')->default('submitted');
            $table->text('rejection_reason')->nullable();
            $table->text('revision_comments')->nullable();
            $table->integer('revision_count')->default(0);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('member_admission_issues', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('member_admission_id');
            $table->unsignedBigInteger('reported_by');
            $table->text('issue_description');
            $table->string('status')->default('pending');
            $table->text('resolution_note')->nullable();
            $table->dateTime('resolved_at')->nullable();
            $table->unsignedBigInteger('resolved_by')->nullable();
            $table->dateTime('zm_approved_at')->nullable();
            $table->unsignedBigInteger('zm_approved_by')->nullable();
            $table->text('zm_approval_note')->nullable();
            $table->timestamps();
        });

        Schema::create('loan_applications', function (Blueprint $table) {
            $table->id();
            $table->string('application_no')->nullable();
            $table->unsignedBigInteger('member_admission_id')->nullable();
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->unsignedBigInteger('submitted_by')->nullable();
            $table->unsignedBigInteger('reviewed_by')->nullable();
            $table->dateTime('reviewed_at')->nullable();
            $table->dateTime('submitted_at')->nullable();
            $table->string('status')->default('submitted');
            $table->decimal('requested_amount', 12, 2)->default(0);
            $table->decimal('approved_amount', 12, 2)->nullable();
            $table->text('rejection_reason')->nullable();
            $table->text('revision_comments')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('loan_application_issues', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('loan_application_id');
            $table->unsignedBigInteger('reported_by');
            $table->text('issue_description');
            $table->string('status')->default('pending');
            $table->text('response_message')->nullable();
            $table->unsignedBigInteger('responded_by')->nullable();
            $table->dateTime('responded_at')->nullable();
            $table->dateTime('zm_approved_at')->nullable();
            $table->unsignedBigInteger('zm_approved_by')->nullable();
            $table->text('zm_approval_note')->nullable();
            $table->timestamps();
        });
    }

    public function test_branch_user_reply_leaves_zm_approval_pending(): void
    {
        $this->createDummyTables();

        $bmRole = Role::create(['name' => Role::BRANCH_MANAGER, 'display_name' => 'Branch Manager']);
        $branch = Branch::create(['name' => 'Test Branch', 'code' => '001']);
        $user = User::create([
            'name' => 'Branch User',
            'email' => 'bm@test.com',
            'role_id' => $bmRole->id,
            'branch_id' => $branch->id,
            'is_active' => true,
        ]);

        $admission = MemberAdmission::create([
            'application_no' => 'ADM-001',
            'applicant_name_bn' => 'পরীক্ষা সদস্য',
            'branch_id' => $branch->id,
            'status' => 'submitted',
        ]);

        $issue = MemberAdmissionIssue::create([
            'member_admission_id' => $admission->id,
            'reported_by' => 1,
            'issue_description' => 'এনআইডি স্পষ্ট নয়',
            'status' => 'pending',
        ]);

        $this->actingAs($user);

        // Simulate reply from branch
        $issue->update([
            'resolution_note' => 'এনআইডি কপি পুনরায় যাচাই করে নিশ্চিত করা হলো।',
            'resolved_by' => $user->id,
            'resolved_at' => now(),
        ]);

        $issueFresh = $issue->fresh();
        $this->assertNotNull($issueFresh->resolution_note);
        $this->assertNull($issueFresh->zm_approved_at, 'Branch user reply should have null zm_approved_at');
        $this->assertNull($issueFresh->zm_approved_by, 'Branch user reply should have null zm_approved_by');
    }

    public function test_zm_can_approve_branch_reply(): void
    {
        $this->createDummyTables();

        $zmRole = Role::create(['name' => Role::ZONE_MANAGER, 'display_name' => 'Zone Manager']);
        $branch = Branch::create(['name' => 'Test Branch', 'code' => '001']);
        $zmUser = User::create([
            'name' => 'Zonal Manager',
            'email' => 'zm@test.com',
            'role_id' => $zmRole->id,
            'is_active' => true,
        ]);

        $admission = MemberAdmission::create([
            'application_no' => 'ADM-002',
            'applicant_name_bn' => 'পরীক্ষা সদস্য ২',
            'branch_id' => $branch->id,
            'status' => 'submitted',
        ]);

        $issue = MemberAdmissionIssue::create([
            'member_admission_id' => $admission->id,
            'reported_by' => 1,
            'issue_description' => 'ঠিকানা অসম্পূর্ণ',
            'status' => 'pending',
            'resolution_note' => 'ঠিকানা যাচাই করা হয়েছে',
            'resolved_by' => 2,
            'resolved_at' => now(),
        ]);

        $this->actingAs($zmUser);

        // ZM approves
        $issue->update([
            'zm_approved_at' => now(),
            'zm_approved_by' => $zmUser->id,
            'zm_approval_note' => 'যাচাইপূর্বক ZM অনুমোদন দেওয়া হলো',
        ]);

        $issueFresh = $issue->fresh();
        $this->assertNotNull($issueFresh->zm_approved_at, 'ZM approval should record zm_approved_at');
        $this->assertEquals($zmUser->id, $issueFresh->zm_approved_by);
        $this->assertEquals('যাচাইপূর্বক ZM অনুমোদন দেওয়া হলো', $issueFresh->zm_approval_note);
    }

    public function test_ho_approval_preserves_original_branch_reply_author_and_time(): void
    {
        $this->createDummyTables();

        $branchUser = User::create([
            'name' => 'Branch Officer',
            'email' => 'bo@test.com',
            'is_active' => true,
        ]);

        $hoUser = User::create([
            'name' => 'Super Admin',
            'email' => 'admin@test.com',
            'has_all_access' => true,
            'is_active' => true,
        ]);

        $admission = MemberAdmission::create([
            'application_no' => 'ADM-003',
            'applicant_name_bn' => 'সদস্য ৩',
            'status' => 'submitted',
        ]);

        $originalTime = now()->subHours(3);
        $issue = MemberAdmissionIssue::create([
            'member_admission_id' => $admission->id,
            'reported_by' => $hoUser->id,
            'issue_description' => 'এনআইডি ছবি অস্পষ্ট',
            'status' => 'pending',
            'resolution_note' => 'এনআইডি পুনরায় আপলোড করা হয়েছে',
            'resolved_by' => $branchUser->id,
            'resolved_at' => $originalTime,
            'zm_approved_at' => now()->subHour(),
            'zm_approved_by' => 5,
        ]);

        $loan = LoanApplication::create([
            'application_no' => 'LOAN-003',
            'status' => 'submitted',
        ]);

        $loanIssue = LoanApplicationIssue::create([
            'loan_application_id' => $loan->id,
            'reported_by' => $hoUser->id,
            'issue_description' => 'ব্যবসায়িক অভিজ্ঞতা কম',
            'status' => 'pending',
            'response_message' => 'মাঠ যাচাই করে সন্তোষজনক পাওয়া গেছে',
            'responded_by' => $branchUser->id,
            'responded_at' => $originalTime,
            'zm_approved_at' => now()->subHour(),
            'zm_approved_by' => 5,
        ]);

        // HO Approves - close pending issues preserving original reply author & time
        $admission->issues()->where('status', 'pending')->each(function ($i) use ($hoUser) {
            $update = ['status' => 'resolved'];
            if (! $i->resolved_at) {
                $update['resolved_at'] = now();
                $update['resolved_by'] = $hoUser->id;
            }
            $i->update($update);
        });

        $loan->issues()->where('status', 'pending')->each(function ($i) use ($hoUser) {
            $update = ['status' => 'resolved'];
            if (! $i->responded_at) {
                $update['responded_at'] = now();
                $update['responded_by'] = $hoUser->id;
            }
            $i->update($update);
        });

        $issueFresh = $issue->fresh();
        $loanIssueFresh = $loanIssue->fresh();

        $this->assertEquals('resolved', $issueFresh->status);
        $this->assertEquals($branchUser->id, $issueFresh->resolved_by, 'Admission reply author must remain the branch officer');
        $this->assertEquals($originalTime->toDateTimeString(), $issueFresh->resolved_at->toDateTimeString(), 'Admission reply time must remain original');

        $this->assertEquals('resolved', $loanIssueFresh->status);
        $this->assertEquals($branchUser->id, $loanIssueFresh->responded_by, 'Loan reply author must remain the branch officer');
        $this->assertEquals($originalTime->toDateTimeString(), $loanIssueFresh->responded_at->toDateTimeString(), 'Loan reply time must remain original');
    }
}
