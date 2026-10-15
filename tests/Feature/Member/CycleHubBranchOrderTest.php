<?php

use App\Models\Area;
use App\Models\Branch;
use App\Models\Role;
use App\Models\User;
use App\Models\Zone;
use Inertia\Testing\AssertableInertia as Assert;

test('cycle hub lists branches in code order as name and code', function () {
    $role = Role::create([
        'name' => Role::SUPER_ADMIN,
        'display_name' => 'Super Admin',
    ]);

    $zone = Zone::create([
        'name' => 'North',
        'code' => 'N',
        'is_active' => true,
    ]);

    $area = Area::create([
        'zone_id' => $zone->id,
        'name' => 'Sadar',
        'code' => 'N1',
        'is_active' => true,
    ]);

    Branch::create(['area_id' => $area->id, 'name' => 'Apple', 'code' => '0010', 'is_active' => true]);
    Branch::create(['area_id' => $area->id, 'name' => 'Zeta', 'code' => '0001', 'is_active' => true]);
    Branch::create(['area_id' => $area->id, 'name' => 'Mango', 'code' => '0002', 'is_active' => true]);

    $user = User::factory()->create([
        'role_id' => $role->id,
        'username' => 'cycle-hub-admin',
        'has_all_access' => true,
        'phone' => '01700000000',
        'pin' => '1234',
        'signature' => 'signed',
    ]);

    $this->actingAs($user)
        ->get(route('member.cycle-hub.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Member/CycleHub/Index')
            ->has('branches', 3)
            ->where('branches.0.name', 'Zeta')
            ->where('branches.0.code', '0001')
            ->where('branches.1.name', 'Mango')
            ->where('branches.1.code', '0002')
            ->where('branches.2.name', 'Apple')
            ->where('branches.2.code', '0010'));
});
