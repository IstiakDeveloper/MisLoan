<?php

namespace Database\Seeders;

use App\Models\Area;
use App\Models\Role;
use App\Models\User;
use App\Models\Zone;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AreaZoneManagerSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $zoneManagerRole = Role::where('name', Role::ZONE_MANAGER)->first();
        $areaManagerRole = Role::where('name', Role::AREA_MANAGER)->first();

        if (! $zoneManagerRole || ! $areaManagerRole) {
            $this->command?->warn('Zone/Area manager roles not found. Run RoleSeeder first.');
            return;
        }

        // For each zone, ensure at least one Zone Manager user exists
        foreach (Zone::all() as $zone) {
            $exists = User::where('role_id', $zoneManagerRole->id)
                ->where('zone_id', $zone->id)
                ->exists();

            if (! $exists) {
                User::create([
                    'name' => $zone->name . ' Zone Manager',
                    'email' => 'zone' . $zone->code . '_manager@misloan.com',
                    'phone' => null,
                    'username' => 'Z' . $zone->code . '_MGR',
                    'password' => Hash::make('password'),
                    'role_id' => $zoneManagerRole->id,
                    'zone_id' => $zone->id,
                    'has_all_access' => false,
                    'is_active' => true,
                    'email_verified_at' => now(),
                ]);

                $this->command?->info("Zone Manager created for zone {$zone->name}.");
            }
        }

        // For each area, ensure at least one Area Manager user exists
        foreach (Area::all() as $area) {
            $exists = User::where('role_id', $areaManagerRole->id)
                ->where('area_id', $area->id)
                ->exists();

            if (! $exists) {
                User::create([
                    'name' => $area->name . ' Area Manager',
                    'email' => 'area' . $area->code . '_manager@misloan.com',
                    'phone' => null,
                    'username' => 'A' . $area->code . '_MGR',
                    'password' => Hash::make('password'),
                    'role_id' => $areaManagerRole->id,
                    'area_id' => $area->id,
                    'has_all_access' => false,
                    'is_active' => true,
                    'email_verified_at' => now(),
                ]);

                $this->command?->info("Area Manager created for area {$area->name}.");
            }
        }
    }
}

