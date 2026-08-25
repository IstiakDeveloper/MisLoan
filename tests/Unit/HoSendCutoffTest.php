<?php

namespace Tests\Unit;

use App\Models\Branch;
use App\Models\LoanApplication;
use App\Models\MemberAdmission;
use App\Models\Role;
use App\Models\User;
use App\Services\HoSendCutoffService;
use Carbon\Carbon;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class HoSendCutoffTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Cache::flush();
        $this->createDummyTables();
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function createDummyTables(): void
    {
        Schema::dropIfExists('user_zones');
        Schema::dropIfExists('user_areas');
        Schema::dropIfExists('user_branches');
        Schema::dropIfExists('loan_application_approvals');
        Schema::dropIfExists('member_admission_approvals');
        Schema::dropIfExists('loan_application_issues');
        Schema::dropIfExists('loan_applications');
        Schema::dropIfExists('member_admission_issues');
        Schema::dropIfExists('member_admissions');
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('settings');
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
            $table->string('account_type')->nullable();
            $table->string('signature')->nullable();
            $table->string('pin')->nullable();
            $table->timestamp('email_verified_at')->nullable();
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
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
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
            $table->dateTime('zm_approved_at')->nullable();
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
            $table->dateTime('zm_approved_at')->nullable();
            $table->timestamps();
        });

        Schema::create('member_admission_approvals', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('member_admission_id');
            $table->unsignedBigInteger('user_id');
            $table->string('status')->default('pending');
            $table->string('level')->nullable();
            $table->timestamps();
        });

        Schema::create('loan_application_approvals', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('loan_application_id');
            $table->unsignedBigInteger('user_id');
            $table->string('status')->default('pending');
            $table->timestamps();
        });
    }

    private function createHeadOfficeUser(): User
    {
        $role = Role::query()->create([
            'name' => Role::HEAD_OFFICE,
            'display_name' => 'Head Office',
        ]);

        return User::query()->create([
            'name' => 'Head Office',
            'email' => 'ho-cutoff@test.com',
            'password' => Hash::make('password'),
            'role_id' => $role->id,
            'is_active' => true,
            'email_verified_at' => now(),
        ]);
    }

    /**
     * @return array{0: User, 1: Branch}
     */
    private function createBranchUser(): array
    {
        $role = Role::query()->create([
            'name' => Role::BRANCH_USER,
            'display_name' => 'Branch User',
        ]);

        $branch = Branch::query()->create([
            'name' => 'Test Branch',
            'code' => 'TB01',
        ]);

        $user = User::query()->create([
            'name' => 'Branch User',
            'email' => 'branch-cutoff@test.com',
            'password' => Hash::make('password'),
            'role_id' => $role->id,
            'branch_id' => $branch->id,
            'is_active' => true,
            'email_verified_at' => now(),
        ]);

        return [$user, $branch];
    }

    public function test_default_cutoff_is_five_pm_bangladesh_time(): void
    {
        $service = app(HoSendCutoffService::class);

        $this->assertSame('17:00', $service->time());
        $this->assertSame('বিকাল ৫:০০টা', $service->label());
        $this->assertSame('৫:০০ PM', $service->badgeLabel());
    }

    public function test_sending_is_blocked_after_cutoff(): void
    {
        $service = app(HoSendCutoffService::class);

        $this->travelTo(Carbon::parse('2026-08-25 17:00:01', 'Asia/Dhaka'));
        $this->assertTrue($service->isBlocked());

        $this->travelTo(Carbon::parse('2026-08-25 16:59:59', 'Asia/Dhaka'));
        $this->assertFalse($service->isBlocked());
    }

    public function test_head_office_configured_time_is_used(): void
    {
        $service = app(HoSendCutoffService::class);
        $service->update('18:00');

        $this->travelTo(Carbon::parse('2026-08-25 17:30:00', 'Asia/Dhaka'));
        $this->assertFalse($service->isBlocked());
        $this->assertSame('18:00', $service->time());
        $this->assertSame('সন্ধ্যা ৬:০০টা', $service->label());

        $this->travelTo(Carbon::parse('2026-08-25 18:00:01', 'Asia/Dhaka'));
        $this->assertTrue($service->isBlocked());
    }

    public function test_head_office_can_view_and_update_cutoff(): void
    {
        $user = $this->createHeadOfficeUser();

        $this->actingAs($user)
            ->get(route('head-office.send-cutoff'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('HeadOffice/SendCutoff')
                ->where('cutoff.time', '17:00')
                ->where('canManage', true)
            );

        $this->actingAs($user)
            ->from(route('head-office.send-cutoff'))
            ->put(route('head-office.send-cutoff.update'), [
                'cutoff_time' => '14:00',
            ])
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertSame('14:00', app(HoSendCutoffService::class)->time());
    }

    public function test_branch_user_cannot_change_cutoff(): void
    {
        [$user] = $this->createBranchUser();

        $this->actingAs($user)
            ->put(route('head-office.send-cutoff.update'), [
                'cutoff_time' => '20:00',
            ])
            ->assertForbidden();

        $this->assertSame('17:00', app(HoSendCutoffService::class)->time());
    }

    public function test_loan_send_is_blocked_after_cutoff(): void
    {
        [$user, $branch] = $this->createBranchUser();

        $application = LoanApplication::query()->create([
            'application_no' => 'LN-CUTOFF-1',
            'branch_id' => $branch->id,
            'status' => LoanApplication::STATUS_READY_FOR_HEAD_OFFICE,
            'requested_amount' => 10000,
        ]);

        $this->travelTo(Carbon::parse('2026-08-25 17:01:00', 'Asia/Dhaka'));

        $this->actingAs($user)
            ->from('/member/loan-applications')
            ->patch(route('member.loan-applications.send-to-head-office', $application->id))
            ->assertRedirect()
            ->assertSessionHas('error');

        $this->assertSame(
            LoanApplication::STATUS_READY_FOR_HEAD_OFFICE,
            $application->fresh()->status
        );
    }

    public function test_loan_send_is_allowed_before_cutoff(): void
    {
        [$user, $branch] = $this->createBranchUser();

        $application = LoanApplication::query()->create([
            'application_no' => 'LN-CUTOFF-2',
            'branch_id' => $branch->id,
            'status' => LoanApplication::STATUS_READY_FOR_HEAD_OFFICE,
            'requested_amount' => 10000,
        ]);

        $this->travelTo(Carbon::parse('2026-08-25 16:45:00', 'Asia/Dhaka'));

        $this->actingAs($user)
            ->patch(route('member.loan-applications.send-to-head-office', $application->id))
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertSame(
            LoanApplication::STATUS_PENDING_HEAD_OFFICE,
            $application->fresh()->status
        );
    }

    public function test_admission_send_is_blocked_after_cutoff(): void
    {
        [$user, $branch] = $this->createBranchUser();

        $admission = MemberAdmission::query()->create([
            'application_no' => 'MA-CUTOFF-1',
            'branch_id' => $branch->id,
            'status' => 'ready_for_head_office',
            'applicant_name_bn' => 'পরীক্ষা সদস্য',
        ]);

        $this->travelTo(Carbon::parse('2026-08-25 17:15:00', 'Asia/Dhaka'));

        $this->actingAs($user)
            ->from('/member-admissions')
            ->patch(route('member-admissions.send-to-head-office', $admission))
            ->assertRedirect()
            ->assertSessionHas('error');

        $this->assertSame('ready_for_head_office', $admission->fresh()->status);
    }

    public function test_bulk_loan_send_is_blocked_after_cutoff(): void
    {
        [$user, $branch] = $this->createBranchUser();

        $application = LoanApplication::query()->create([
            'application_no' => 'LN-CUTOFF-3',
            'branch_id' => $branch->id,
            'status' => LoanApplication::STATUS_READY_FOR_HEAD_OFFICE,
            'requested_amount' => 8000,
        ]);

        $this->travelTo(Carbon::parse('2026-08-25 17:30:00', 'Asia/Dhaka'));

        $this->actingAs($user)
            ->from('/member/loan-applications')
            ->post(route('member.loan-applications.send-to-head-office-bulk'), [
                'ids' => [$application->id],
            ])
            ->assertRedirect()
            ->assertSessionHas('error');

        $this->assertSame(
            LoanApplication::STATUS_READY_FOR_HEAD_OFFICE,
            $application->fresh()->status
        );
    }
}
