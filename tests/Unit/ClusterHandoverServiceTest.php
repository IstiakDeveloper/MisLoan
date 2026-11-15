<?php

use App\Models\Branch;
use App\Models\MemberAdmission;
use App\Models\Role;
use App\Models\Samity;
use App\Models\User;
use App\Services\ClusterHandoverService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

function createClusterHandoverTables(): void
{
    Schema::dropIfExists('loan_applications');
    Schema::dropIfExists('member_admissions');
    Schema::dropIfExists('samities');
    Schema::dropIfExists('user_zones');
    Schema::dropIfExists('user_areas');
    Schema::dropIfExists('user_branches');
    Schema::dropIfExists('users');
    Schema::dropIfExists('roles');
    Schema::dropIfExists('branches');
    Schema::dropIfExists('areas');
    Schema::dropIfExists('zones');

    Schema::create('zones', function (Blueprint $table) {
        $table->id();
        $table->string('name')->nullable();
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('areas', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('zone_id')->nullable();
        $table->string('name')->nullable();
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('branches', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->string('code')->nullable();
        $table->unsignedBigInteger('area_id')->nullable();
        $table->boolean('is_active')->default(true);
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('roles', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->string('display_name')->nullable();
        $table->timestamps();
    });

    Schema::create('users', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->string('email')->unique();
        $table->string('username')->nullable();
        $table->string('password');
        $table->unsignedBigInteger('role_id')->nullable();
        $table->unsignedBigInteger('branch_id')->nullable();
        $table->unsignedBigInteger('area_id')->nullable();
        $table->unsignedBigInteger('zone_id')->nullable();
        $table->boolean('is_active')->default(true);
        $table->boolean('has_all_access')->default(false);
        $table->string('pin')->nullable();
        $table->string('phone')->nullable();
        $table->timestamps();
        $table->softDeletes();
    });

    foreach (['user_branches' => 'branch_id', 'user_areas' => 'area_id', 'user_zones' => 'zone_id'] as $tableName => $related) {
        Schema::create($tableName, function (Blueprint $table) use ($related) {
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger($related);
            $table->timestamps();
        });
    }

    Schema::create('samities', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('branch_id');
        $table->string('samity_code');
        $table->string('samity_name');
        $table->string('samity_name_bn')->nullable();
        $table->boolean('is_active')->default(true);
        $table->timestamps();
    });

    Schema::create('member_admissions', function (Blueprint $table) {
        $table->id();
        $table->string('application_no')->nullable();
        $table->string('applicant_name_bn')->nullable();
        $table->string('applicant_name_en')->nullable();
        $table->string('mobile_number')->nullable();
        $table->string('nid_number')->nullable();
        $table->unsignedBigInteger('branch_id')->nullable();
        $table->unsignedBigInteger('samity_id')->nullable();
        $table->unsignedBigInteger('previous_admission_id')->nullable();
        $table->unsignedBigInteger('created_by')->nullable();
        $table->unsignedBigInteger('assigned_officer_id')->nullable();
        $table->string('status')->default('approved');
        $table->timestamps();
    });

    Schema::create('loan_applications', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('member_admission_id')->nullable();
        $table->unsignedBigInteger('submitted_by')->nullable();
        $table->string('status')->default('draft');
        $table->timestamps();
        $table->softDeletes();
    });
}

function clusterHandoverUser(Role $role, Branch $branch, string $name, string $email): User
{
    return User::create([
        'name' => $name,
        'email' => $email,
        'username' => $email,
        'password' => 'password',
        'role_id' => $role->id,
        'branch_id' => $branch->id,
        'is_active' => true,
        'pin' => '1001',
    ]);
}

function clusterHandoverMember(Branch $branch, Samity $samity, User $officer, string $name, string $code): MemberAdmission
{
    return MemberAdmission::create([
        'application_no' => $code,
        'applicant_name_en' => $name,
        'applicant_name_bn' => $name,
        'mobile_number' => '01700000000',
        'branch_id' => $branch->id,
        'samity_id' => $samity->id,
        'assigned_officer_id' => $officer->id,
        'created_by' => $officer->id,
        'status' => 'approved',
    ]);
}

it('groups leftover members by transferred officer and samity cluster', function () {
    $leftOfficer = new User(['name' => 'Maruf', 'pin' => '1055']);
    $leftOfficer->id = 169;

    $samity = new Samity([
        'samity_name' => 'Cluster A',
        'samity_name_bn' => 'ক্লাস্টার ক',
    ]);
    $samity->id = 7;

    $first = new MemberAdmission([
        'assigned_officer_id' => 169,
        'samity_id' => 7,
    ]);
    $first->id = 11;
    $first->setRelation('assignedOfficer', $leftOfficer);
    $first->setRelation('samity', $samity);

    $second = new MemberAdmission([
        'assigned_officer_id' => 169,
        'samity_id' => 7,
    ]);
    $second->id = 12;
    $second->setRelation('assignedOfficer', $leftOfficer);
    $second->setRelation('samity', $samity);

    $ungrouped = new MemberAdmission([
        'assigned_officer_id' => 169,
        'samity_id' => null,
    ]);
    $ungrouped->id = 13;
    $ungrouped->setRelation('assignedOfficer', $leftOfficer);

    $groups = (new ClusterHandoverService)->groupIntoClusters(collect([$first, $second, $ungrouped]));

    expect($groups)->toHaveCount(1)
        ->and($groups[0]['from_officer']['id'])->toBe(169)
        ->and($groups[0]['from_officer']['name'])->toBe('Maruf')
        ->and($groups[0]['clusters'])->toHaveCount(2);

    $named = collect($groups[0]['clusters'])->firstWhere('samity_id', 7);
    $none = collect($groups[0]['clusters'])->firstWhere('samity_id', null);

    expect($named['member_count'])->toBe(2)
        ->and($named['member_ids'])->toBe([11, 12])
        ->and($named['samity_name'])->toBe('ক্লাস্টার ক')
        ->and($none['member_count'])->toBe(1)
        ->and($none['samity_name'])->toBe('সমিতি নেই');
});

beforeEach(function () {
    createClusterHandoverTables();
});

it('searches only the branch user members and can match a samity name', function () {
    $branchRole = Role::create(['name' => Role::BRANCH_USER, 'display_name' => 'Branch User']);
    $officerRole = Role::create(['name' => Role::FIELD_OFFICER, 'display_name' => 'Field Officer']);
    $home = Branch::create(['name' => 'Home', 'code' => '0001']);
    $other = Branch::create(['name' => 'Other', 'code' => '0002']);
    $branchUser = clusterHandoverUser($branchRole, $home, 'Branch User', 'bu@test.com');
    $officer = clusterHandoverUser($officerRole, $home, 'Officer A', 'a@test.com');
    $otherOfficer = clusterHandoverUser($officerRole, $other, 'Officer B', 'b@test.com');
    $homeSamity = Samity::create([
        'branch_id' => $home->id,
        'samity_code' => 'U-1',
        'samity_name' => 'Uttar Samity',
        'samity_name_bn' => 'উত্তর সমিতি',
    ]);
    $otherSamity = Samity::create([
        'branch_id' => $other->id,
        'samity_code' => 'U-2',
        'samity_name' => 'Uttar Samity',
    ]);
    $own = clusterHandoverMember($home, $homeSamity, $officer, 'Karim', '0001000001');
    $clone = MemberAdmission::create([
        'application_no' => '0001000099',
        'applicant_name_en' => 'Karim',
        'applicant_name_bn' => 'Karim',
        'branch_id' => $home->id,
        'samity_id' => $homeSamity->id,
        'assigned_officer_id' => $officer->id,
        'previous_admission_id' => $own->id,
        'status' => 'approved',
    ]);
    $away = clusterHandoverMember($other, $otherSamity, $otherOfficer, 'Karim', '0002000001');

    $byName = collect((new ClusterHandoverService)->searchExisting($branchUser, 'Karim'));
    $bySamity = collect((new ClusterHandoverService)->searchExisting($branchUser, 'Uttar'));

    expect($byName->pluck('id')->all())->toBe([$own->id])
        ->and($byName->first()['officer']['id'])->toBe($officer->id)
        ->and($bySamity->pluck('id')->all())->toBe([$own->id])
        ->and($bySamity->pluck('id'))->not->toContain($away->id)
        ->and($bySamity->pluck('id'))->not->toContain($clone->id);
});

it('reassigns a single member and leaves the rest of the samity', function () {
    $branchRole = Role::create(['name' => Role::BRANCH_USER, 'display_name' => 'Branch User']);
    $officerRole = Role::create(['name' => Role::FIELD_OFFICER, 'display_name' => 'Field Officer']);
    $branch = Branch::create(['name' => 'Home', 'code' => '0001']);
    $branchUser = clusterHandoverUser($branchRole, $branch, 'Branch User', 'bu-single@test.com');
    $current = clusterHandoverUser($officerRole, $branch, 'Officer A', 'a-single@test.com');
    $target = clusterHandoverUser($officerRole, $branch, 'Officer B', 'b-single@test.com');
    $samity = Samity::create([
        'branch_id' => $branch->id,
        'samity_code' => 'S-1',
        'samity_name' => 'Samity One',
    ]);
    $first = clusterHandoverMember($branch, $samity, $current, 'First', '0001000001');
    $second = clusterHandoverMember($branch, $samity, $current, 'Second', '0001000002');

    $moved = (new ClusterHandoverService)->reassign($branchUser, 'single', $first->id, $target->id);

    expect($moved)->toBe(1)
        ->and($first->fresh()->assigned_officer_id)->toBe($target->id)
        ->and($second->fresh()->assigned_officer_id)->toBe($current->id);
});

it('reassigns every master member of the samity and skips other samities', function () {
    $branchRole = Role::create(['name' => Role::BRANCH_USER, 'display_name' => 'Branch User']);
    $officerRole = Role::create(['name' => Role::FIELD_OFFICER, 'display_name' => 'Field Officer']);
    $home = Branch::create(['name' => 'Home', 'code' => '0001']);
    $other = Branch::create(['name' => 'Other', 'code' => '0002']);
    $branchUser = clusterHandoverUser($branchRole, $home, 'Branch User', 'bu-samity@test.com');
    $current = clusterHandoverUser($officerRole, $home, 'Officer A', 'a-samity@test.com');
    $split = clusterHandoverUser($officerRole, $home, 'Officer C', 'c-samity@test.com');
    $target = clusterHandoverUser($officerRole, $home, 'Officer B', 'b-samity@test.com');
    $otherOfficer = clusterHandoverUser($officerRole, $other, 'Officer D', 'd-samity@test.com');
    $samity = Samity::create([
        'branch_id' => $home->id,
        'samity_code' => 'S-1',
        'samity_name' => 'Samity One',
    ]);
    $otherSamity = Samity::create([
        'branch_id' => $home->id,
        'samity_code' => 'S-2',
        'samity_name' => 'Samity Two',
    ]);
    $awaySamity = Samity::create([
        'branch_id' => $other->id,
        'samity_code' => 'S-9',
        'samity_name' => 'Away',
    ]);
    $first = clusterHandoverMember($home, $samity, $current, 'First', '0001000001');
    $second = clusterHandoverMember($home, $samity, $split, 'Second', '0001000002');
    $third = clusterHandoverMember($home, $samity, $current, 'Third', '0001000003');
    $clone = MemberAdmission::create([
        'application_no' => '0001000099',
        'applicant_name_en' => 'Clone',
        'branch_id' => $home->id,
        'samity_id' => $samity->id,
        'assigned_officer_id' => $current->id,
        'previous_admission_id' => $first->id,
        'status' => 'approved',
    ]);
    $elsewhere = clusterHandoverMember($home, $otherSamity, $current, 'Other Samity', '0001000004');
    $away = clusterHandoverMember($other, $awaySamity, $otherOfficer, 'Away Member', '0002000001');

    $moved = (new ClusterHandoverService)->reassign($branchUser, 'samity', $first->id, $target->id);

    expect($moved)->toBe(3)
        ->and($first->fresh()->assigned_officer_id)->toBe($target->id)
        ->and($second->fresh()->assigned_officer_id)->toBe($target->id)
        ->and($third->fresh()->assigned_officer_id)->toBe($target->id)
        ->and($clone->fresh()->assigned_officer_id)->toBe($current->id)
        ->and($elsewhere->fresh()->assigned_officer_id)->toBe($current->id)
        ->and($away->fresh()->assigned_officer_id)->toBe($otherOfficer->id);
});

it('rejects an officer who does not work at the branch', function () {
    $branchRole = Role::create(['name' => Role::BRANCH_USER, 'display_name' => 'Branch User']);
    $officerRole = Role::create(['name' => Role::FIELD_OFFICER, 'display_name' => 'Field Officer']);
    $home = Branch::create(['name' => 'Home', 'code' => '0001']);
    $other = Branch::create(['name' => 'Other', 'code' => '0002']);
    $branchUser = clusterHandoverUser($branchRole, $home, 'Branch User', 'bu-deny@test.com');
    $current = clusterHandoverUser($officerRole, $home, 'Officer A', 'a-deny@test.com');
    $outsider = clusterHandoverUser($officerRole, $other, 'Outsider', 'out@test.com');
    $samity = Samity::create([
        'branch_id' => $home->id,
        'samity_code' => 'S-1',
        'samity_name' => 'Samity One',
    ]);
    $member = clusterHandoverMember($home, $samity, $current, 'Karim', '0001000001');

    expect(fn () => (new ClusterHandoverService)->reassign($branchUser, 'single', $member->id, $outsider->id))
        ->toThrow(ValidationException::class);

    expect($member->fresh()->assigned_officer_id)->toBe($current->id);
});

it('lists only the branch samities and reassigns that whole samity', function () {
    $branchRole = Role::create(['name' => Role::BRANCH_USER, 'display_name' => 'Branch User']);
    $officerRole = Role::create(['name' => Role::FIELD_OFFICER, 'display_name' => 'Field Officer']);
    $home = Branch::create(['name' => 'Home', 'code' => '0001']);
    $other = Branch::create(['name' => 'Other', 'code' => '0002']);
    $branchUser = clusterHandoverUser($branchRole, $home, 'Branch User', 'bu-list@test.com');
    $current = clusterHandoverUser($officerRole, $home, 'Officer A', 'a-list@test.com');
    $target = clusterHandoverUser($officerRole, $home, 'Officer B', 'b-list@test.com');
    $otherOfficer = clusterHandoverUser($officerRole, $other, 'Officer D', 'd-list@test.com');
    $homeSamity = Samity::create([
        'branch_id' => $home->id,
        'samity_code' => 'H-1',
        'samity_name' => 'Home Samity',
        'samity_name_bn' => 'হোম সমিতি',
    ]);
    $otherSamity = Samity::create([
        'branch_id' => $other->id,
        'samity_code' => 'O-1',
        'samity_name' => 'Other Samity',
    ]);
    $first = clusterHandoverMember($home, $homeSamity, $current, 'First', '0001000001');
    $second = clusterHandoverMember($home, $homeSamity, $current, 'Second', '0001000002');
    clusterHandoverMember($other, $otherSamity, $otherOfficer, 'Away', '0002000001');

    $service = new ClusterHandoverService;
    $listed = collect($service->samitiesForBranches([$home->id]));

    expect($listed->pluck('id')->all())->toBe([$homeSamity->id])
        ->and($listed->first()['name'])->toBe('হোম সমিতি')
        ->and($listed->first()['member_count'])->toBe(2);

    $members = collect($service->membersOfSamity($branchUser, $homeSamity->id));
    expect($members->pluck('id')->all())->toBe([$first->id, $second->id]);

    expect(fn () => $service->reassignSamity($branchUser, $otherSamity->id, $target->id))
        ->toThrow(ValidationException::class);

    expect($service->reassignSamity($branchUser, $homeSamity->id, $target->id))->toBe(2)
        ->and($first->fresh()->assigned_officer_id)->toBe($target->id)
        ->and($second->fresh()->assigned_officer_id)->toBe($target->id);
});
