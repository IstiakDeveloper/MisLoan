<?php

namespace Tests\Unit;

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
}
