<?php

namespace Database\Seeders;

use App\Models\Area;
use Illuminate\Database\Seeder;

class AreaSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $areas = [
            [
                'id' => 1,
                'zone_id' => 1,
                'name' => 'Atrai Area',
                'code' => '101',
                'description' => null,
                'is_active' => true,
            ],
            [
                'id' => 2,
                'zone_id' => 1,
                'name' => 'Adamdighi Area',
                'code' => '102',
                'description' => null,
                'is_active' => true,
            ],
            [
                'id' => 3,
                'zone_id' => 1,
                'name' => 'Betgari Area',
                'code' => '105',
                'description' => null,
                'is_active' => true,
            ],
            [
                'id' => 4,
                'zone_id' => 2,
                'name' => 'Naogaon Area',
                'code' => '106',
                'description' => null,
                'is_active' => true,
            ],
            [
                'id' => 5,
                'zone_id' => 2,
                'name' => 'Khetlal Area',
                'code' => '108',
                'description' => null,
                'is_active' => true,
            ],
            [
                'id' => 6,
                'zone_id' => 2,
                'name' => 'Paharpur Area',
                'code' => '109',
                'description' => null,
                'is_active' => true,
            ],
            [
                'id' => 7,
                'zone_id' => 3,
                'name' => 'Mohadebpur Area',
                'code' => '103',
                'description' => null,
                'is_active' => true,
            ],
            [
                'id' => 8,
                'zone_id' => 3,
                'name' => 'Sapahar Area',
                'code' => '104',
                'description' => null,
                'is_active' => true,
            ],
            [
                'id' => 9,
                'zone_id' => 3,
                'name' => 'Rajbari Area',
                'code' => '107',
                'description' => null,
                'is_active' => true,
            ],
        ];

        foreach ($areas as $area) {
            Area::create($area);
        }
    }
}
