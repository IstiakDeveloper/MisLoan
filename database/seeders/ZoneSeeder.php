<?php

namespace Database\Seeders;

use App\Models\Zone;
use Illuminate\Database\Seeder;

class ZoneSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $zones = [
            [
                'id' => 1,
                'name' => 'Raninagar Zone',
                'code' => '01',
                'description' => null,
                'is_active' => true,
            ],
            [
                'id' => 2,
                'name' => 'Badalgachi Zone',
                'code' => '02',
                'description' => null,
                'is_active' => true,
            ],
            [
                'id' => 3,
                'name' => 'Shishahat Zone',
                'code' => '03',
                'description' => null,
                'is_active' => true,
            ],
        ];

        foreach ($zones as $zone) {
            Zone::create($zone);
        }
    }
}
