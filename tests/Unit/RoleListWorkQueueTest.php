<?php

namespace Tests\Unit;

use App\Models\Role;
use App\Models\User;
use App\Support\RoleListWorkQueue;
use Illuminate\Http\Request;
use Tests\TestCase;

class RoleListWorkQueueTest extends TestCase
{
    public function test_missing_status_without_user_shows_all(): void
    {
        $request = Request::create('/member-admissions', 'GET');

        $this->assertNull(RoleListWorkQueue::resolve($request, null));
    }

    public function test_explicit_all_status_clears_the_filter(): void
    {
        $request = Request::create('/member-admissions', 'GET', ['status' => 'all']);

        $this->assertNull(RoleListWorkQueue::resolve($request, null));
    }

    public function test_explicit_status_is_kept(): void
    {
        $request = Request::create('/member-admissions', 'GET', ['status' => 'approved']);

        $this->assertSame('approved', RoleListWorkQueue::resolve($request, null));
    }

    public function test_work_queue_statuses_skip_default_month_dates(): void
    {
        $request = Request::create('/head-office/admission-members', 'GET', [
            'status' => 'pending_head_office',
        ]);

        $resolved = RoleListWorkQueue::resolveWithDates($request, true, null);

        $this->assertSame('pending_head_office', $resolved['status']);
        $this->assertNull($resolved['date_from']);
        $this->assertNull($resolved['date_to']);

        foreach (['awaiting_takeup', 'pending_cancellation', 'ho_pending_cancellation'] as $status) {
            $queueRequest = Request::create('/head-office/loan-applications', 'GET', [
                'status' => $status,
            ]);
            $queueResolved = RoleListWorkQueue::resolveWithDates($queueRequest, true, null);

            $this->assertSame($status, $queueResolved['status']);
            $this->assertNull($queueResolved['date_from']);
            $this->assertNull($queueResolved['date_to']);
        }
    }

    public function test_all_status_uses_month_dates_when_requested(): void
    {
        $request = Request::create('/head-office/admission-members', 'GET', [
            'status' => 'all',
        ]);

        $resolved = RoleListWorkQueue::resolveWithDates($request, true, null);

        $this->assertNull($resolved['status']);
        $this->assertSame(now()->startOfMonth()->toDateString(), $resolved['date_from']);
        $this->assertSame(now()->toDateString(), $resolved['date_to']);
    }

    public function test_branch_user_loan_list_does_not_default_to_the_current_month(): void
    {
        $branchUser = $this->userWithRole(Role::BRANCH_USER);
        $manager = $this->userWithRole(Role::BRANCH_MANAGER);

        $this->assertFalse(RoleListWorkQueue::loanListUsesDefaultMonthDates($branchUser));
        $this->assertTrue(RoleListWorkQueue::loanListUsesDefaultMonthDates($manager));

        foreach (['all', 'disbursed', 'rejected', 'pending_disbursement', 'awaiting_takeup', 'pending_cancellation'] as $status) {
            $request = Request::create('/member/loan-applications', 'GET', ['status' => $status]);
            $resolved = RoleListWorkQueue::resolveWithDates(
                $request,
                RoleListWorkQueue::loanListUsesDefaultMonthDates($branchUser),
                $branchUser,
            );

            $this->assertNull($resolved['date_from'], $status);
            $this->assertNull($resolved['date_to'], $status);
        }
    }

    public function test_branch_user_loan_list_keeps_dates_they_choose(): void
    {
        $branchUser = $this->userWithRole(Role::BRANCH_USER);
        $request = Request::create('/member/loan-applications', 'GET', [
            'status' => 'disbursed',
            'date_from' => '2026-01-01',
            'date_to' => '2026-01-31',
        ]);

        $resolved = RoleListWorkQueue::resolveWithDates($request, false, $branchUser);

        $this->assertSame('2026-01-01', $resolved['date_from']);
        $this->assertSame('2026-01-31', $resolved['date_to']);
    }

    private function userWithRole(string $roleName): User
    {
        $user = new User;
        $user->setRelation('role', new Role(['name' => $roleName]));

        return $user;
    }
}
