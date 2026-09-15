<?php

use App\Http\Controllers\HeadOfficeAdmissionController;
use App\Models\Area;
use App\Models\Branch;
use App\Models\MemberAdmission;
use App\Models\Role;
use App\Models\User;
use App\Models\Zone;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Inertia\Response as InertiaResponse;

function createAdmissionPrintFilterTables(): void
{
    Schema::dropIfExists('member_family_members');
    Schema::dropIfExists('member_admissions');
    Schema::dropIfExists('users');
    Schema::dropIfExists('roles');
    Schema::dropIfExists('branches');
    Schema::dropIfExists('areas');
    Schema::dropIfExists('zones');

    Schema::create('zones', function (Blueprint $table) {
        $table->id();
        $table->string('name')->nullable();
        $table->string('code')->nullable();
        $table->boolean('is_active')->default(true);
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('areas', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('zone_id')->nullable();
        $table->string('name')->nullable();
        $table->string('code')->nullable();
        $table->boolean('is_active')->default(true);
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('branches', function (Blueprint $table) {
        $table->id();
        $table->string('name')->default('Main Branch');
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
        $table->string('phone')->nullable();
        $table->timestamp('email_verified_at')->nullable();
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('member_admissions', function (Blueprint $table) {
        $table->id();
        $table->string('application_no')->nullable();
        $table->string('applicant_name_en')->nullable();
        $table->string('applicant_name_bn')->nullable();
        $table->unsignedBigInteger('branch_id')->nullable();
        $table->unsignedBigInteger('samity_id')->nullable();
        $table->unsignedBigInteger('member_category_id')->nullable();
        $table->unsignedBigInteger('created_by')->nullable();
        $table->unsignedBigInteger('submitted_by')->nullable();
        $table->dateTime('submitted_at')->nullable();
        $table->string('status')->default('pending_head_office');
        $table->integer('revision_count')->default(0);
        $table->timestamp('printed_at')->nullable();
        $table->unsignedBigInteger('previous_admission_id')->nullable();
        $table->timestamps();
    });

    Schema::create('member_family_members', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('member_admission_id');
        $table->unsignedInteger('sl_no')->nullable();
        $table->string('member_name')->nullable();
        $table->timestamps();
    });
}

function createAdmissionPrintUser(string $roleName, string $email): User
{
    $role = Role::firstOrCreate(
        ['name' => $roleName],
        ['display_name' => $roleName]
    );

    return User::create([
        'name' => $roleName.' User',
        'email' => $email,
        'password' => Hash::make('password'),
        'role_id' => $role->id,
        'is_active' => true,
        'has_all_access' => true,
        'pin' => '1234',
        'signature' => 'signed',
        'phone' => '01700000000',
        'email_verified_at' => now(),
    ]);
}

/**
 * @return array{0: MemberAdmission, 1: MemberAdmission}
 */
function createPrintedAndUnprintedAdmissions(): array
{
    $zone = Zone::create(['name' => 'North Zone', 'code' => 'NZ', 'is_active' => true]);
    $area = Area::create(['name' => 'North Area', 'code' => 'NA', 'zone_id' => $zone->id, 'is_active' => true]);
    $branch = Branch::create(['name' => 'Dhaka Branch', 'code' => '0001', 'area_id' => $area->id, 'is_active' => true]);

    $unprinted = MemberAdmission::create([
        'application_no' => '0001000001',
        'applicant_name_bn' => 'অমুদ্রিত সদস্য',
        'branch_id' => $branch->id,
        'status' => 'pending_head_office',
        'submitted_at' => now(),
        'printed_at' => null,
    ]);

    $printed = MemberAdmission::create([
        'application_no' => '0001000002',
        'applicant_name_bn' => 'মুদ্রিত সদস্য',
        'branch_id' => $branch->id,
        'status' => 'pending_head_office',
        'submitted_at' => now(),
        'printed_at' => now(),
    ]);

    return [$unprinted, $printed];
}

function printAdmissionIds(User $user, array $query): Collection
{
    test()->actingAs($user);

    $request = Request::create('/head-office/admission-members/print', 'GET', $query);
    $request->setUserResolver(fn () => $user);
    app()->instance('request', $request);

    $response = app(HeadOfficeAdmissionController::class)->print($request);
    expect($response)->toBeInstanceOf(InertiaResponse::class);

    $props = (new ReflectionProperty(InertiaResponse::class, 'props'))->getValue($response);

    return collect($props['admissions'])->pluck('id')->map(fn ($id) => (int) $id)->values();
}

function printFilterQuery(string $printed): array
{
    return [
        'status' => 'all',
        'printed' => $printed,
        'date_from' => now()->toDateString(),
        'date_to' => now()->toDateString(),
    ];
}

beforeEach(function () {
    createAdmissionPrintFilterTables();
});

it('excludes already printed admissions from print when filtered as print hoini for head office', function () {
    $user = createAdmissionPrintUser(Role::HEAD_OFFICE, 'ho_print@test.com');
    [$unprinted, $printed] = createPrintedAndUnprintedAdmissions();

    $ids = printAdmissionIds($user, printFilterQuery('no'));

    expect($ids)->toContain($unprinted->id)
        ->and($ids)->not->toContain($printed->id);
});

it('excludes already printed admissions from print when filtered as print hoini for cso', function () {
    $user = createAdmissionPrintUser(Role::CSO, 'cso_print@test.com');
    [$unprinted, $printed] = createPrintedAndUnprintedAdmissions();

    $ids = printAdmissionIds($user, printFilterQuery('no'));

    expect($ids)->toContain($unprinted->id)
        ->and($ids)->not->toContain($printed->id);
});

it('keeps already printed admissions when print filter is print completed', function () {
    $user = createAdmissionPrintUser(Role::HEAD_OFFICE, 'ho_printed_yes@test.com');
    [$unprinted, $printed] = createPrintedAndUnprintedAdmissions();

    $ids = printAdmissionIds($user, printFilterQuery('yes'));

    expect($ids)->toContain($printed->id)
        ->and($ids)->not->toContain($unprinted->id);
});
