<?php

use App\Models\Area;
use App\Models\Branch;
use App\Models\LoanApplication;
use App\Models\LoanApplicationApproval;
use App\Models\LoanApplicationIssue;
use App\Models\MemberAdmission;
use App\Models\MemberAdmissionApproval;
use App\Models\Notification;
use App\Models\Role;
use App\Models\Samity;
use App\Models\User;
use App\Models\Zone;
use App\Services\Navigation\ShellBadges;
use Illuminate\Support\Facades\DB;

it('counts today only and keeps a personal approval badge for thirty seconds', function () {
    $adminRole = Role::create(['name' => Role::SUPER_ADMIN, 'display_name' => 'Admin']);
    $managerRole = Role::create(['name' => Role::BRANCH_MANAGER, 'display_name' => 'Manager']);
    $admin = User::factory()->create(['role_id' => $adminRole->id, 'has_all_access' => true]);
    $officer = User::factory()->create(['role_id' => $managerRole->id, 'has_all_access' => false]);
    $zone = Zone::create(['name' => 'Zone', 'code' => 'Z1']);
    $area = Area::create(['name' => 'Area', 'code' => 'A1', 'zone_id' => $zone->id]);
    $branch = Branch::create(['name' => 'Branch', 'code' => '0001', 'area_id' => $area->id]);
    $officer->update(['branch_id' => $branch->id]);
    $samity = Samity::create(['samity_code' => 'S1', 'samity_name' => 'Test', 'branch_id' => $branch->id]);
    $member = fn (string $number, string $status) => MemberAdmission::create([
        'application_no' => $number, 'branch_id' => $branch->id, 'samity_id' => $samity->id, 'status' => $status,
    ]);

    $today = $member('0001000001', 'pending_head_office');
    $today->update(['submitted_at' => now()]);
    $yesterday = $member('0001000002', 'pending_head_office');
    $yesterday->update(['submitted_at' => now()->subDay()]);
    $loan = fn (string $number, string $when, string $status = 'pending_head_office') => LoanApplication::create([
        'application_no' => $number, 'member_admission_id' => $today->id, 'branch_id' => $branch->id, 'samity_id' => $samity->id,
        'status' => $status, 'requested_amount' => '1000', 'submitted_at' => $when,
    ]);
    $loan('LOAN-TODAY', now()->toDateTimeString());
    $blocked = $loan('LOAN-ISSUE', now()->toDateTimeString());
    LoanApplicationIssue::create(['loan_application_id' => $blocked->id, 'reported_by' => $admin->id, 'issue_description' => 'Missing paper', 'status' => 'pending']);
    $loan('LOAN-OLD', now()->subDay()->toDateTimeString());

    $current = $member('0001000003', 'submitted');
    MemberAdmissionApproval::create(['member_admission_id' => $current->id, 'user_id' => $officer->id, 'level' => 'branch', 'sequence' => 1, 'status' => 'pending']);
    $waiting = $member('0001000004', 'submitted');
    MemberAdmissionApproval::create(['member_admission_id' => $waiting->id, 'user_id' => $admin->id, 'level' => 'branch', 'sequence' => 1, 'status' => 'pending']);
    MemberAdmissionApproval::create(['member_admission_id' => $waiting->id, 'user_id' => $officer->id, 'level' => 'area', 'sequence' => 2, 'status' => 'pending']);
    $review = $member('0001000005', 'under_review');
    MemberAdmissionApproval::create(['member_admission_id' => $review->id, 'user_id' => $admin->id, 'level' => 'branch', 'sequence' => 1, 'status' => 'pending']);
    MemberAdmissionApproval::create(['member_admission_id' => $review->id, 'user_id' => $officer->id, 'level' => 'area', 'sequence' => 2, 'status' => 'pending']);
    $personalLoan = $loan('LOAN-MINE', now()->subDays(2)->toDateTimeString(), 'submitted');
    LoanApplicationApproval::create(['loan_application_id' => $personalLoan->id, 'user_id' => $officer->id, 'level' => 'branch', 'sequence' => 1, 'status' => 'pending']);

    $shell = app(ShellBadges::class);
    $badges = $shell->forUser($admin->fresh());

    expect($badges['pendingLoanApplications'])->toBe(1)
        ->and($badges['pendingAdmissions'])->toBe(1)
        ->and($badges['pendingApprovals'])->toBe(6);

    expect($shell->forUser($officer->fresh())['pendingApprovals'])->toBe(3);

    $queries = [];
    DB::listen(function ($query) use (&$queries): void {
        $queries[] = $query->sql;
    });
    $shell->forUser($admin->fresh());

    expect(collect($queries)->filter(fn (string $sql): bool => str_contains($sql, 'loan_applications') || str_contains($sql, 'member_admission'))->all())->toBe([]);

    Notification::create(['user_id' => $admin->id, 'type' => 'approval', 'title' => 'New', 'message' => 'Hello', 'is_read' => false]);
    expect($shell->notifications($admin)['unread'])->toBe(1);
    Notification::query()->update(['is_read' => true, 'read_at' => now()]);
    expect($shell->notifications($admin)['unread'])->toBe(1);
    $shell->forget($admin);
    expect($shell->notifications($admin)['unread'])->toBe(0);

    $this->withoutVite()->actingAs($admin)->get('/notifications')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('badgeCounts.pendingLoanApplications', 1)
            ->where('badgeCounts.pendingAdmissions', 1)
            ->where('unreadNotificationsCount', 0));
});
