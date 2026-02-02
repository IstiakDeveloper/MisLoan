<?php

namespace Database\Seeders;

use App\Models\Branch;
use Illuminate\Database\Seeder;

class BranchSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $branches = [
            ['id' => 1, 'area_id' => 1, 'name' => 'Atrai Branch', 'code' => '0002', 'is_active' => true],
            ['id' => 2, 'area_id' => 1, 'name' => 'Bhabanipur Branch', 'code' => '0004', 'is_active' => true],
            ['id' => 3, 'area_id' => 1, 'name' => 'Khajura Branch', 'code' => '0028', 'is_active' => true],
            ['id' => 4, 'area_id' => 1, 'name' => 'Naldanga Branch', 'code' => '0031', 'is_active' => true],
            ['id' => 5, 'area_id' => 1, 'name' => 'Samaspara Branch', 'code' => '0032', 'is_active' => true],
            ['id' => 6, 'area_id' => 2, 'name' => 'Abadpukur Branch', 'code' => '0007', 'is_active' => true],
            ['id' => 7, 'area_id' => 2, 'name' => 'Saharpukur Branch', 'code' => '0010', 'is_active' => true],
            ['id' => 8, 'area_id' => 2, 'name' => 'Adamdighi Branch', 'code' => '0011', 'is_active' => true],
            ['id' => 9, 'area_id' => 2, 'name' => 'Hatkoroi Branch', 'code' => '0027', 'is_active' => true],
            ['id' => 10, 'area_id' => 2, 'name' => 'Kahaloo Branch', 'code' => '0042', 'is_active' => true],
            ['id' => 11, 'area_id' => 3, 'name' => 'Raninagar Branch', 'code' => '0003', 'is_active' => true],
            ['id' => 12, 'area_id' => 3, 'name' => 'Bandaikhara Branch', 'code' => '0005', 'is_active' => true],
            ['id' => 13, 'area_id' => 3, 'name' => 'Fatepur Branch', 'code' => '0023', 'is_active' => true],
            ['id' => 14, 'area_id' => 4, 'name' => 'Naogaon Sadar Branch', 'code' => '0001', 'is_active' => true],
            ['id' => 15, 'area_id' => 4, 'name' => 'Shailgachi Branch', 'code' => '0012', 'is_active' => true],
            ['id' => 16, 'area_id' => 4, 'name' => 'Tilakpur Branch', 'code' => '0014', 'is_active' => true],
            ['id' => 17, 'area_id' => 4, 'name' => 'Santahar Branch', 'code' => '0015', 'is_active' => true],
            ['id' => 18, 'area_id' => 4, 'name' => 'Katkhair Branch', 'code' => '0026', 'is_active' => true],
            ['id' => 19, 'area_id' => 5, 'name' => 'Khetlal Branch', 'code' => '0038', 'is_active' => true],
            ['id' => 20, 'area_id' => 5, 'name' => 'Chanpara Branch', 'code' => '0039', 'is_active' => true],
            ['id' => 21, 'area_id' => 5, 'name' => 'Kichok Branch', 'code' => '0040', 'is_active' => true],
            ['id' => 22, 'area_id' => 5, 'name' => 'Rajabirat Branch', 'code' => '0041', 'is_active' => true],
            ['id' => 23, 'area_id' => 6, 'name' => 'Kritipur Branch', 'code' => '0006', 'is_active' => true],
            ['id' => 24, 'area_id' => 6, 'name' => 'Badalgachi Branch', 'code' => '0009', 'is_active' => true],
            ['id' => 25, 'area_id' => 6, 'name' => 'Akkelpur Branch', 'code' => '0037', 'is_active' => true],
            ['id' => 26, 'area_id' => 7, 'name' => 'Hapania Branch', 'code' => '0008', 'is_active' => true],
            ['id' => 27, 'area_id' => 7, 'name' => 'Charagpur Branch', 'code' => '0016', 'is_active' => true],
            ['id' => 28, 'area_id' => 7, 'name' => 'Mohadebpur Branch', 'code' => '0018', 'is_active' => true],
            ['id' => 29, 'area_id' => 7, 'name' => 'Chatra Branch', 'code' => '0020', 'is_active' => true],
            ['id' => 30, 'area_id' => 7, 'name' => 'Shibpur Branch', 'code' => '0029', 'is_active' => true],
            ['id' => 31, 'area_id' => 8, 'name' => 'Sapahar Branch', 'code' => '0021', 'is_active' => true],
            ['id' => 32, 'area_id' => 8, 'name' => 'Shishahat Branch', 'code' => '0024', 'is_active' => true],
            ['id' => 33, 'area_id' => 8, 'name' => 'Digirhat Branch', 'code' => '0030', 'is_active' => true],
            ['id' => 34, 'area_id' => 8, 'name' => 'Agradigun Branch', 'code' => '0034', 'is_active' => true],
            ['id' => 35, 'area_id' => 3, 'name' => 'Betgari Branch', 'code' => '0013', 'is_active' => true],
            ['id' => 36, 'area_id' => 6, 'name' => 'Nazipur Branch', 'code' => '0017', 'is_active' => true],
            ['id' => 37, 'area_id' => 6, 'name' => 'Paharpur Branch', 'code' => '0019', 'is_active' => true],
            ['id' => 38, 'area_id' => 9, 'name' => 'Chaubaria Hat Branch', 'code' => '0022', 'is_active' => true],
            ['id' => 39, 'area_id' => 9, 'name' => 'Hat Gangopara Branch', 'code' => '0025', 'is_active' => true],
            ['id' => 40, 'area_id' => 9, 'name' => 'Rajbari Branch', 'code' => '0033', 'is_active' => true],
            ['id' => 41, 'area_id' => 9, 'name' => 'Dorgadanga Branch', 'code' => '0035', 'is_active' => true],
            ['id' => 42, 'area_id' => 9, 'name' => 'Nachol Branch', 'code' => '0036', 'is_active' => true],
        ];

        foreach ($branches as $branch) {
            Branch::create($branch);
        }
    }
}
