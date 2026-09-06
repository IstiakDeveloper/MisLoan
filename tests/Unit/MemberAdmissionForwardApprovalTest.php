<?php

namespace Tests\Unit;

use App\Models\MemberAdmission;
use App\Models\MemberAdmissionApproval;
use App\Models\Role;
use App\Models\User;
use App\Services\ApprovalService;
use App\Services\NotificationService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class MemberAdmissionForwardApprovalTest extends TestCase
{
    private function createDummyTables(): void
    {
        if (DB::connection()->getDriverName() === 'sqlite') {
            DB::connection()->getPdo()->sqliteCreateFunction('REGEXP', function ($pattern, $value) {
                return (int) (preg_match('/'.$pattern.'/', (string) $value) === 1);
            });
        }

        Schema::dropIfExists('member_admission_approvals');
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
            $table->string('member_code')->nullable();
            $table->string('applicant_name_en')->nullable();
            $table->string('applicant_name_bn')->nullable();
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('submitted_by')->nullable();
            $table->string('status')->default('submitted');
            $table->decimal('requested_loan_amount', 12, 2)->default(0);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('member_admission_approvals', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('member_admission_id');
            $table->unsignedBigInteger('user_id');
            $table->string('level');
            $table->integer('sequence');
            $table->string('status')->default('pending');
            $table->text('comments')->nullable();
            $table->dateTime('approved_at')->nullable();
            $table->string('approver_signature')->nullable();
            $table->string('approver_pin')->nullable();
            $table->timestamps();
        });
    }

    public function test_admissions_cannot_be_forwarded_to_higher_approvers(): void
    {
        $this->createDummyTables();

        $bmRole = Role::create(['name' => Role::BRANCH_MANAGER, 'display_name' => 'Branch Manager']);
        $rmRole = Role::create(['name' => Role::AREA_MANAGER, 'display_name' => 'Area Manager']);

        $bmUser = User::create([
            'name' => 'Branch Manager',
            'email' => 'bm@test.com',
            'role_id' => $bmRole->id,
            'is_active' => true,
        ]);

        $rmUser = User::create([
            'name' => 'Area Manager User',
            'email' => 'rm@test.com',
            'role_id' => $rmRole->id,
            'is_active' => true,
        ]);

        $admission = MemberAdmission::create([
            'application_no' => 'APP-001',
            'applicant_name_bn' => 'আবেদনকারী ১',
            'status' => 'submitted',
            'requested_loan_amount' => 150000,
            'created_by' => $bmUser->id,
        ]);

        $bmApproval = MemberAdmissionApproval::create([
            'member_admission_id' => $admission->id,
            'user_id' => $bmUser->id,
            'level' => 'branch',
            'sequence' => 1,
            'status' => 'pending',
        ]);

        $service = app(ApprovalService::class);
        $result = $service->forwardToApprover($bmApproval, $rmUser->id, 'Forwarding to Area Manager');

        $this->assertFalse($result);
        $this->assertEquals('submitted', $admission->fresh()->status);
        $this->assertEquals('pending', $bmApproval->fresh()->status);
        $this->assertNull(
            MemberAdmissionApproval::where('member_admission_id', $admission->id)
                ->where('user_id', $rmUser->id)
                ->first()
        );
    }

    public function test_branch_manager_can_approve_admission_regardless_of_loan_amount(): void
    {
        $this->createDummyTables();

        $bmRole = Role::create(['name' => Role::BRANCH_MANAGER, 'display_name' => 'Branch Manager']);
        $bmUser = User::create([
            'name' => 'Branch Manager',
            'email' => 'bm-approve@test.com',
            'role_id' => $bmRole->id,
            'is_active' => true,
        ]);

        $notificationMock = $this->createMock(NotificationService::class);
        $this->app->instance(NotificationService::class, $notificationMock);

        $service = app(ApprovalService::class);

        foreach ([15000, 70000, 150000] as $amount) {
            $admission = MemberAdmission::create([
                'application_no' => 'APP-'.$amount,
                'applicant_name_bn' => 'আবেদনকারী '.$amount,
                'status' => 'submitted',
                'requested_loan_amount' => $amount,
                'created_by' => $bmUser->id,
            ]);

            $bmApproval = MemberAdmissionApproval::create([
                'member_admission_id' => $admission->id,
                'user_id' => $bmUser->id,
                'level' => 'branch',
                'sequence' => 1,
                'status' => 'pending',
            ]);

            $result = $service->approve($bmApproval, 'Approved by branch manager');

            $this->assertTrue($result, "BM should approve admission with requested amount {$amount}");
            $this->assertEquals('ready_for_head_office', $admission->fresh()->status);
            $this->assertEquals('approved', $bmApproval->fresh()->status);
        }
    }
}
