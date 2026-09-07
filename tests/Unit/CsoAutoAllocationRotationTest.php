<?php

use App\Models\Area;
use App\Models\Role;
use App\Models\User;
use App\Models\Zone;
use App\Services\CsoAllocationService;
use Carbon\Carbon;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

function createCsoRotationTables(): void
{
    Schema::dropIfExists('cso_daily_allocations');
    Schema::dropIfExists('users');
    Schema::dropIfExists('roles');
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
        $table->boolean('is_active')->default(true);
        $table->boolean('has_all_access')->default(false);
        $table->timestamp('email_verified_at')->nullable();
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('cso_daily_allocations', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('user_id');
        $table->unsignedBigInteger('area_id');
        $table->date('duty_date');
        $table->unsignedBigInteger('assigned_by')->nullable();
        $table->string('notes')->nullable();
        $table->timestamps();
    });
}

function createCsoRotationUser(string $name, string $email): User
{
    $role = Role::firstOrCreate(
        ['name' => Role::CSO],
        ['display_name' => 'CSO']
    );

    return User::create([
        'name' => $name,
        'email' => $email,
        'password' => Hash::make('password'),
        'role_id' => $role->id,
        'is_active' => true,
        'email_verified_at' => now(),
    ]);
}

function createCsoRotationAreas(int $count): void
{
    $zone = Zone::create([
        'name' => 'Rotation Zone',
        'code' => 'RZ01',
        'is_active' => true,
    ]);

    for ($i = 1; $i <= $count; $i++) {
        Area::create([
            'zone_id' => $zone->id,
            'name' => 'Area '.$i,
            'code' => 'AR'.str_pad((string) $i, 2, '0', STR_PAD_LEFT),
            'is_active' => true,
        ]);
    }
}

/**
 * @return array<int, list<int>>
 */
function csoRotationAreaMap(array $board): array
{
    $map = [];

    foreach ($board['roster'] as $entry) {
        $map[(int) $entry['user']['id']] = collect($entry['areas'])
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->sort()
            ->values()
            ->all();
    }

    return $map;
}

beforeEach(function () {
    createCsoRotationTables();
    Config::set('cso.weekly_off_days', [Carbon::FRIDAY]);
});

it('does not give a cso the same auto area on consecutive duty days', function () {
    createCsoRotationUser('Zafar CSO', 'zafar-cso@test.com');
    createCsoRotationUser('Alam CSO', 'alam-cso@test.com');
    createCsoRotationAreas(4);

    $service = app(CsoAllocationService::class);
    $monday = $service->getAllocationsForDate('2026-09-07');
    $tuesday = $service->getAllocationsForDate('2026-09-08');

    $mondayMap = csoRotationAreaMap($monday);
    $tuesdayMap = csoRotationAreaMap($tuesday);

    foreach ($mondayMap as $userId => $areaIds) {
        expect(array_intersect($areaIds, $tuesdayMap[$userId] ?? []))->toBeEmpty();
    }
});

it('does not repeat thursday areas on saturday when friday is weekly off', function () {
    createCsoRotationUser('Zafar CSO', 'zafar-fri@test.com');
    createCsoRotationUser('Alam CSO', 'alam-fri@test.com');
    createCsoRotationAreas(4);

    $service = app(CsoAllocationService::class);
    $thursday = $service->getAllocationsForDate('2026-09-03');
    $saturday = $service->getAllocationsForDate('2026-09-05');

    expect(Carbon::parse('2026-09-03')->dayOfWeek)->toBe(Carbon::THURSDAY)
        ->and(Carbon::parse('2026-09-04')->dayOfWeek)->toBe(Carbon::FRIDAY)
        ->and(Carbon::parse('2026-09-05')->dayOfWeek)->toBe(Carbon::SATURDAY);

    $thursdayMap = csoRotationAreaMap($thursday);
    $saturdayMap = csoRotationAreaMap($saturday);

    foreach ($thursdayMap as $userId => $areaIds) {
        expect(array_intersect($areaIds, $saturdayMap[$userId] ?? []))->toBeEmpty();
    }
});

it('still assigns each area to exactly one cso each day', function () {
    createCsoRotationUser('Zafar CSO', 'zafar-unique@test.com');
    createCsoRotationUser('Alam CSO', 'alam-unique@test.com');
    createCsoRotationAreas(5);

    $board = app(CsoAllocationService::class)->getAllocationsForDate('2026-09-07');
    $assigned = collect($board['roster'])->flatMap(fn ($entry) => collect($entry['areas'])->pluck('id'))->all();

    expect($assigned)->toHaveCount(5)
        ->and($assigned)->toEqual(array_values(array_unique($assigned)));
});

it('assigns cyclic buckets by cso id rather than by name', function () {
    $zafar = createCsoRotationUser('Zafar CSO', 'zafar-order@test.com');
    $alam = createCsoRotationUser('Alam CSO', 'alam-order@test.com');
    createCsoRotationAreas(2);

    expect($zafar->id)->toBeLessThan($alam->id)
        ->and(strcmp($alam->name, $zafar->name))->toBeLessThan(0);

    $service = app(CsoAllocationService::class);
    $date = '2026-09-07';
    $offset = (new ReflectionMethod(CsoAllocationService::class, 'rotationOffset'))
        ->invoke($service, $date, 2);

    $map = csoRotationAreaMap($service->getAllocationsForDate($date));
    $firstAreaId = (int) Area::query()->orderBy('id')->value('id');
    $expectedOwnerId = $offset === 0 ? $zafar->id : $alam->id;

    expect($map[$expectedOwnerId] ?? [])->toContain($firstAreaId);
});
