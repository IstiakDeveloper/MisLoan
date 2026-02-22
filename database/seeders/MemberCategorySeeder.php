<?php

namespace Database\Seeders;

use App\Models\MemberCategory;
use Illuminate\Database\Seeder;

class MemberCategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = [
            [
                'category_name' => 'Jagoron',
                'category_name_bn' => 'জাগরণ',
                'description' => 'Jagoron Program',
                'is_active' => true,
            ],
            [
                'category_name' => 'Agrosor',
                'category_name_bn' => 'অগ্রসর',
                'description' => 'Agrosor Program',
                'is_active' => true,
            ],
            [
                'category_name' => 'Buniad',
                'category_name_bn' => 'বুনিয়াদ',
                'description' => 'Buniad Program',
                'is_active' => true,
            ],
            [
                'category_name' => 'ENRICH',
                'category_name_bn' => 'এনরিচ',
                'description' => 'ENRICH Program',
                'is_active' => true,
            ],
            [
                'category_name' => 'RMTP-SME',
                'category_name_bn' => 'আরএমটিপি-এসএমই',
                'description' => 'RMTP-SME Program',
                'is_active' => true,
            ],
            [
                'category_name' => 'ECCCP-Drought',
                'category_name_bn' => 'ইসিসিসিপি-খরা',
                'description' => 'ECCCP-Drought Program',
                'is_active' => true,
            ],
            [
                'category_name' => 'Abason',
                'category_name_bn' => 'আবাসন',
                'description' => 'Abason Program',
                'is_active' => true,
            ],
        ];

        foreach ($categories as $category) {
            MemberCategory::updateOrCreate(
                ['category_name' => $category['category_name']],
                $category
            );
        }

        $this->command->info('Member Categories seeded successfully!');
    }
}
