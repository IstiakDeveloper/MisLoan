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
            $this->command?->warn('Zone/Regional manager roles not found. Run RoleSeeder first.');
            return;
        }

        // For each zone, ensure at least one Zone Manager user exists
        // Username: zmbadalgachi (zm + slug from zone name, e.g. "Badalgachi" → badalgachi)
        foreach (Zone::all() as $zone) {
            $exists = User::where('role_id', $zoneManagerRole->id)
                ->where('zone_id', $zone->id)
                ->exists();

            if (! $exists) {
                $slug = $this->nameToSlug($zone->name);
                $username = 'zm' . $slug;
                $email = $username . '@misloan.com';

                User::create([
                    'name' => $zone->name . ' Zone Manager',
                    'email' => $email,
                    'phone' => null,
                    'username' => $username,
                    'password' => Hash::make('12345678'),
                    'role_id' => $zoneManagerRole->id,
                    'zone_id' => $zone->id,
                    'has_all_access' => false,
                    'is_active' => true,
                    'email_verified_at' => now(),
                ]);

                $this->command?->info("Zone Manager created for zone {$zone->name} ({$username}).");
            }
        }

        // For each regional, ensure at least one Regional Manager user exists
        // Username: rmnaogaon (rm + slug from regional name, e.g. "Naogaon" → naogaon)
        foreach (Area::all() as $regional) {
            $exists = User::where('role_id', $areaManagerRole->id)
                ->where('area_id', $regional->id)
                ->exists();

            if (! $exists) {
                $slug = $this->nameToSlug($regional->name);
                $username = 'rm' . $slug;
                $email = $username . '@misloan.com';

                User::create([
                    'name' => $regional->name . ' Regional Manager',
                    'email' => $email,
                    'phone' => null,
                    'username' => $username,
                    'password' => Hash::make('12345678'),
                    'role_id' => $areaManagerRole->id,
                    'area_id' => $regional->id,
                    'has_all_access' => false,
                    'is_active' => true,
                    'email_verified_at' => now(),
                ]);

                $this->command?->info("Regional Manager created for {$regional->name} ({$username}).");
            }
        }
    }

    /**
     * Convert name to slug: lowercase, remove spaces. (Names in DB have no Zone/Area/Branch suffix.)
     */
    private function nameToSlug(string $name): string
    {
        return strtolower(preg_replace('/\s+/', '', $name));
    }
}
