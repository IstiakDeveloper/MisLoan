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
                'name' => 'Raninagar',
                'code' => '01',
                'description' => null,
                'is_active' => true,
            ],
            [
                'id' => 2,
                'name' => 'Badalgachi',
                'code' => '02',
                'description' => null,
                'is_active' => true,
            ],
            [
                'id' => 3,
                'name' => 'Shishahat',
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
