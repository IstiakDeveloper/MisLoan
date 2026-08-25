<?php

namespace Tests\Unit;

use App\Models\Branch;
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
                return (int) (preg_match('/' . $pattern . '/', (string) $value) === 1);
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

    public function test_forwarding_admission_to_rm_or_zm_sets_pending_and_under_review(): void
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
            'created_by' => $bmUser->id,
        ]);

        $bmApproval = MemberAdmissionApproval::create([
            'member_admission_id' => $admission->id,
            'user_id' => $bmUser->id,
            'level' => 'branch',
            'sequence' => 1,
            'status' => 'pending',
        ]);

        // Mock notification service
        $notificationMock = $this->createMock(NotificationService::class);
        $this->app->instance(NotificationService::class, $notificationMock);

        $service = app(ApprovalService::class);
        $result = $service->forwardToApprover($bmApproval, $rmUser->id, 'Forwarding to Area Manager');

        $this->assertTrue($result);
        $this->assertEquals('under_review', $admission->fresh()->status);

        $bmApprovalFresh = $bmApproval->fresh();
        $this->assertEquals('approved', $bmApprovalFresh->status);

        $nextApproval = MemberAdmissionApproval::where('member_admission_id', $admission->id)
            ->where('user_id', $rmUser->id)
            ->first();

        $this->assertNotNull($nextApproval);
        $this->assertEquals('pending', $nextApproval->status);
        $this->assertEquals('area', $nextApproval->level);
    }

    public function test_forwarding_admission_to_admf_dmf_ed_auto_approves_and_sets_ready_for_head_office(): void
    {
        $this->createDummyTables();

        $bmRole = Role::create(['name' => Role::BRANCH_MANAGER, 'display_name' => 'Branch Manager']);
        $admfRole = Role::create(['name' => Role::ADMF, 'display_name' => 'ADMF']);
        $dmfRole = Role::create(['name' => Role::DMF, 'display_name' => 'DMF']);
        $edRole = Role::create(['name' => Role::ED, 'display_name' => 'ED']);

        $bmUser = User::create([
            'name' => 'Branch Manager',
            'email' => 'bm2@test.com',
            'role_id' => $bmRole->id,
            'is_active' => true,
        ]);

        foreach ([$admfRole, $dmfRole, $edRole] as $role) {
            $approverUser = User::create([
                'name' => "Approver {$role->name}",
                'email' => "approver_{$role->name}@test.com",
                'role_id' => $role->id,
                'is_active' => true,
            ]);

            $admission = MemberAdmission::create([
                'application_no' => "APP-{$role->name}",
                'applicant_name_bn' => "আবেদনকারী {$role->name}",
                'status' => 'submitted',
                'created_by' => $bmUser->id,
            ]);

            $bmApproval = MemberAdmissionApproval::create([
                'member_admission_id' => $admission->id,
                'user_id' => $bmUser->id,
                'level' => 'branch',
                'sequence' => 1,
                'status' => 'pending',
            ]);

            $notificationMock = $this->createMock(NotificationService::class);
            $this->app->instance(NotificationService::class, $notificationMock);

            $service = app(ApprovalService::class);
            $result = $service->forwardToApprover($bmApproval, $approverUser->id, 'Forwarding to executive');

            $this->assertTrue($result);
            $this->assertEquals('ready_for_head_office', $admission->fresh()->status, "Admission should be ready_for_head_office when forwarded to {$role->name}");

            $bmApprovalFresh = $bmApproval->fresh();
            $this->assertEquals('approved', $bmApprovalFresh->status);

            $escalationApproval = MemberAdmissionApproval::where('member_admission_id', $admission->id)
                ->where('user_id', $approverUser->id)
                ->first();

            $this->assertNotNull($escalationApproval);
            $this->assertEquals('approved', $escalationApproval->status, "Approval row for {$role->name} must be approved");
            $this->assertEquals('escalation', $escalationApproval->level);
            $this->assertNotNull($escalationApproval->approved_at);
        }
    }
}
