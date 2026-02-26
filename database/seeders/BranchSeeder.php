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
            ['id' => 1, 'area_id' => 1, 'name' => 'Atrai', 'code' => '0002', 'is_active' => true],
            ['id' => 2, 'area_id' => 1, 'name' => 'Bhabanipur', 'code' => '0004', 'is_active' => true],
            ['id' => 3, 'area_id' => 1, 'name' => 'Khajura', 'code' => '0028', 'is_active' => true],
            ['id' => 4, 'area_id' => 1, 'name' => 'Naldanga', 'code' => '0031', 'is_active' => true],
            ['id' => 5, 'area_id' => 1, 'name' => 'Samaspara', 'code' => '0032', 'is_active' => true],
            ['id' => 6, 'area_id' => 2, 'name' => 'Abadpukur', 'code' => '0007', 'is_active' => true],
            ['id' => 7, 'area_id' => 2, 'name' => 'Saharpukur', 'code' => '0010', 'is_active' => true],
            ['id' => 8, 'area_id' => 2, 'name' => 'Adamdighi', 'code' => '0011', 'is_active' => true],
            ['id' => 9, 'area_id' => 2, 'name' => 'Hatkoroi', 'code' => '0027', 'is_active' => true],
            ['id' => 10, 'area_id' => 2, 'name' => 'Kahaloo', 'code' => '0042', 'is_active' => true],
            ['id' => 11, 'area_id' => 3, 'name' => 'Raninagar', 'code' => '0003', 'is_active' => true],
            ['id' => 12, 'area_id' => 3, 'name' => 'Bandaikhara', 'code' => '0005', 'is_active' => true],
            ['id' => 13, 'area_id' => 3, 'name' => 'Fatepur', 'code' => '0023', 'is_active' => true],
            ['id' => 14, 'area_id' => 4, 'name' => 'Naogaon Sadar', 'code' => '0001', 'is_active' => true],
            ['id' => 15, 'area_id' => 4, 'name' => 'Shailgachi', 'code' => '0012', 'is_active' => true],
            ['id' => 16, 'area_id' => 4, 'name' => 'Tilakpur', 'code' => '0014', 'is_active' => true],
            ['id' => 17, 'area_id' => 4, 'name' => 'Santahar', 'code' => '0015', 'is_active' => true],
            ['id' => 18, 'area_id' => 4, 'name' => 'Katkhair', 'code' => '0026', 'is_active' => true],
            ['id' => 19, 'area_id' => 5, 'name' => 'Khetlal', 'code' => '0038', 'is_active' => true],
            ['id' => 20, 'area_id' => 5, 'name' => 'Chanpara', 'code' => '0039', 'is_active' => true],
            ['id' => 21, 'area_id' => 5, 'name' => 'Kichok', 'code' => '0040', 'is_active' => true],
            ['id' => 22, 'area_id' => 5, 'name' => 'Rajabirat', 'code' => '0041', 'is_active' => true],
            ['id' => 23, 'area_id' => 6, 'name' => 'Kritipur', 'code' => '0006', 'is_active' => true],
            ['id' => 24, 'area_id' => 6, 'name' => 'Badalgachi', 'code' => '0009', 'is_active' => true],
            ['id' => 25, 'area_id' => 6, 'name' => 'Akkelpur', 'code' => '0037', 'is_active' => true],
            ['id' => 26, 'area_id' => 7, 'name' => 'Hapania', 'code' => '0008', 'is_active' => true],
            ['id' => 27, 'area_id' => 7, 'name' => 'Charagpur', 'code' => '0016', 'is_active' => true],
            ['id' => 28, 'area_id' => 7, 'name' => 'Mohadebpur', 'code' => '0018', 'is_active' => true],
            ['id' => 29, 'area_id' => 7, 'name' => 'Chatra', 'code' => '0020', 'is_active' => true],
            ['id' => 30, 'area_id' => 7, 'name' => 'Shibpur', 'code' => '0029', 'is_active' => true],
            ['id' => 31, 'area_id' => 8, 'name' => 'Sapahar', 'code' => '0021', 'is_active' => true],
            ['id' => 32, 'area_id' => 8, 'name' => 'Shishahat', 'code' => '0024', 'is_active' => true],
            ['id' => 33, 'area_id' => 8, 'name' => 'Digirhat', 'code' => '0030', 'is_active' => true],
            ['id' => 34, 'area_id' => 8, 'name' => 'Agradigun', 'code' => '0034', 'is_active' => true],
            ['id' => 35, 'area_id' => 3, 'name' => 'Betgari', 'code' => '0013', 'is_active' => true],
            ['id' => 36, 'area_id' => 6, 'name' => 'Nazipur', 'code' => '0017', 'is_active' => true],
            ['id' => 37, 'area_id' => 6, 'name' => 'Paharpur', 'code' => '0019', 'is_active' => true],
            ['id' => 38, 'area_id' => 9, 'name' => 'Chaubaria Hat', 'code' => '0022', 'is_active' => true],
            ['id' => 39, 'area_id' => 9, 'name' => 'Hat Gangopara', 'code' => '0025', 'is_active' => true],
            ['id' => 40, 'area_id' => 9, 'name' => 'Rajbari', 'code' => '0033', 'is_active' => true],
            ['id' => 41, 'area_id' => 9, 'name' => 'Dorgadanga', 'code' => '0035', 'is_active' => true],
            ['id' => 42, 'area_id' => 9, 'name' => 'Nachol', 'code' => '0036', 'is_active' => true],
        ];

        foreach ($branches as $branch) {
            Branch::create($branch);
        }
    }
}
