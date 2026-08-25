<?php

use App\Http\Controllers\HeadOfficeLoanController;
use App\Models\LoanApplication;
use App\Models\Role;
use App\Models\User;
use App\Support\RoleListWorkQueue;
use Illuminate\Http\Request;

function invokeHeadOfficeLoanMethod(string $method, mixed ...$args): mixed
{
    $controller = new HeadOfficeLoanController;
    $reflection = new ReflectionMethod(HeadOfficeLoanController::class, $method);
    $reflection->setAccessible(true);

    return $reflection->invoke($controller, ...$args);
}

function userWithRole(string $roleName, bool $hasAllAccess = false): User
{
    $user = new User;
    $user->id = 1;
    $user->has_all_access = $hasAllAccess;
    $user->setRelation('role', new Role(['name' => $roleName]));

    return $user;
}

it('does not hide pre-head-office loans from a head office user', function () {
    $this->actingAs(userWithRole(Role::HEAD_OFFICE));

    expect(invokeHeadOfficeLoanMethod('shouldRestrictToHeadOfficeStage'))->toBeFalse();

    $query = LoanApplication::query();
    invokeHeadOfficeLoanMethod('applyHeadOfficeStageVisibility', $query);

    expect($query->toSql())->not->toContain('status');
});

it('keeps the same unrestricted list for super admin', function () {
    $this->actingAs(userWithRole(Role::SUPER_ADMIN, true));

    expect(invokeHeadOfficeLoanMethod('shouldRestrictToHeadOfficeStage'))->toBeFalse();
});

it('still defaults head office to the pending head office work queue', function () {
    $user = userWithRole(Role::HEAD_OFFICE);

    expect(RoleListWorkQueue::defaultStatus($user))->toBe(LoanApplication::STATUS_PENDING_HEAD_OFFICE);

    $request = Request::create('/head-office/loan-applications', 'GET', ['status' => 'all']);

    expect(RoleListWorkQueue::resolve($request, $user))->toBeNull();
});
