<?php

use App\Models\MemberAdmission;
use App\Models\Role;
use App\Models\User;

function branchStaffUser(array $accessibleBranchIds, bool $hasAllAccess = false): User
{
    $user = new class extends User
    {
        /** @var list<int> */
        public array $accessibleBranchIds = [];

        public function canAccessBranch(int $branchId): bool
        {
            return in_array($branchId, $this->accessibleBranchIds, true);
        }
    };

    $user->id = 10;
    $user->has_all_access = $hasAllAccess;
    $user->accessibleBranchIds = $accessibleBranchIds;
    $user->setRelation('role', new Role(['name' => Role::FIELD_OFFICER]));

    return $user;
}

it('lets a field officer of the branch use another officer\'s admission for a loan', function () {
    $officer = branchStaffUser([20]);
    $admission = new MemberAdmission([
        'branch_id' => 20,
        'status' => 'approved',
        'assigned_officer_id' => 99,
        'created_by' => 99,
    ]);

    expect($admission->isAssignedToUser($officer))->toBeFalse()
        ->and($admission->isOnAccessibleBranchFor($officer))->toBeTrue();
});

it('blocks a transferred field officer from using a member of their previous branch', function () {
    $officer = branchStaffUser([20]);
    $oldBranchAdmission = new MemberAdmission([
        'branch_id' => 11,
        'status' => 'approved',
        'assigned_officer_id' => $officer->id,
        'created_by' => $officer->id,
    ]);

    expect($oldBranchAdmission->isAssignedToUser($officer))->toBeTrue()
        ->and($oldBranchAdmission->isOnAccessibleBranchFor($officer))->toBeFalse();
});

it('still allows full-access users to reach any branch admission', function () {
    $admin = branchStaffUser([], true);
    $admission = new MemberAdmission([
        'branch_id' => 33,
        'status' => 'approved',
    ]);

    expect($admission->isOnAccessibleBranchFor($admin))->toBeTrue();
});
