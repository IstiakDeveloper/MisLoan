<?php

namespace Database\Seeders;

use App\Models\SavingsCategory;
use App\Models\SavingsProduct;
use Illuminate\Database\Seeder;

/**
 * Seeds savings categories (21, 22, 23, 24, 25) and their products (21.01, 21.02, …).
 */
class SavingsProductAutomationSeeder extends Seeder
{
    public function run(): void
    {
        $tree = [
            '21' => [
                'category_name' => 'General Savings',
                'category_name_bn' => 'সাধারণ সঞ্চয়',
                'products' => [
                    ['product_code' => '21.01', 'product_name' => 'G.Savings', 'product_name_bn' => 'জি. সঞ্চয়', 'interest_rate' => 6, 'duration_months' => 12],
                    ['product_code' => '21.02', 'product_name' => 'ENRICH', 'product_name_bn' => 'ইনরিচ', 'interest_rate' => 6, 'duration_months' => 12],
                ],
            ],
            '22' => [
                'category_name' => 'Special Savings',
                'category_name_bn' => 'বিশেষ সঞ্চয়',
                'products' => [
                    ['product_code' => '22.01', 'product_name' => 'SP.Savings', 'product_name_bn' => 'এস.পি. সঞ্চয়', 'interest_rate' => 6, 'duration_months' => 12],
                    ['product_code' => '22.02', 'product_name' => 'SP.Savings (Monthly)', 'product_name_bn' => 'এস.পি. সঞ্চয় (মাসিক)', 'interest_rate' => 11.4, 'duration_months' => 12],
                ],
            ],
            '23' => [
                'category_name' => 'Monthly Savings',
                'category_name_bn' => 'মাসিক সঞ্চয়',
                'products' => [
                    ['product_code' => '23.01', 'product_name' => 'MS 10Yr', 'product_name_bn' => 'এমএস ১০ বছর', 'interest_rate' => 9, 'duration_months' => 120],
                    ['product_code' => '23.02', 'product_name' => 'MS 5 Yr', 'product_name_bn' => 'এমএস ৫ বছর', 'interest_rate' => 9, 'duration_months' => 60],
                    ['product_code' => '23.03', 'product_name' => 'MS 3Yr', 'product_name_bn' => 'এমএস ৩ বছর', 'interest_rate' => 7, 'duration_months' => 36],
                    ['product_code' => '23.04', 'product_name' => 'MS 7Yr', 'product_name_bn' => 'এমএস ৭ বছর', 'interest_rate' => 10, 'duration_months' => 84],
                    ['product_code' => '23.05', 'product_name' => 'MS 12Yr', 'product_name_bn' => 'এমএস ১২ বছর', 'interest_rate' => 12, 'duration_months' => 144],
                ],
            ],
            '24' => [
                'category_name' => 'MDBS',
                'category_name_bn' => 'এমডিবিএস',
                'products' => [
                    ['product_code' => '24.01', 'product_name' => 'MDBS', 'product_name_bn' => 'এমডিবিএস', 'interest_rate' => 11, 'duration_months' => 12],
                    ['product_code' => '24.02', 'product_name' => 'MDBS-8%', 'product_name_bn' => 'এমডিবিএস-৮%', 'interest_rate' => 8, 'duration_months' => 12],
                ],
            ],
            '25' => [
                'category_name' => 'MSTBS',
                'category_name_bn' => 'এমএসটিবিএস',
                'products' => [
                    ['product_code' => '25.02', 'product_name' => 'MMBS', 'product_name_bn' => 'এমএমবিএস', 'interest_rate' => 12, 'duration_months' => 12],
                    ['product_code' => '25.03', 'product_name' => 'MSTBS', 'product_name_bn' => 'এমএসটিবিএস', 'interest_rate' => 11.15, 'duration_months' => 12],
                    ['product_code' => '25.04', 'product_name' => 'MSTBS-8%', 'product_name_bn' => 'এমএসটিবিএস-৮%', 'interest_rate' => 8, 'duration_months' => 12],
                ],
            ],
        ];

        $productOrder = 0;
        $productCount = 0;

        foreach ($tree as $categoryCode => $group) {
            $category = SavingsCategory::query()->updateOrCreate(
                ['category_code' => $categoryCode],
                [
                    'category_name' => $group['category_name'],
                    'category_name_bn' => $group['category_name_bn'],
                    'is_active' => true,
                    'display_order' => (int) $categoryCode,
                ]
            );

            foreach ($group['products'] as $row) {
                SavingsProduct::query()->updateOrCreate(
                    ['product_code' => $row['product_code']],
                    [
                        'savings_category_id' => $category->id,
                        'product_name' => $row['product_name'],
                        'product_name_bn' => $row['product_name_bn'],
                        'interest_rate' => $row['interest_rate'],
                        'duration_months' => $row['duration_months'],
                        'deposit_type' => 'monthly',
                        'min_amount' => 100,
                        'max_amount' => 1000000,
                        'monthly_installment' => 500,
                        'profit_distribution_type' => 'maturity',
                        'premature_withdrawal_allowed' => false,
                        'premature_withdrawal_penalty' => 0,
                        'min_age' => 18,
                        'max_age' => 70,
                        'requires_nominee' => true,
                        'is_active' => true,
                        'display_order' => $productOrder++,
                    ]
                );
                $productCount++;
            }
        }

        SavingsProduct::query()
            ->whereIn('product_code', array_keys($tree))
            ->get()
            ->each(function (SavingsProduct $product): void {
                if ($product->savingsApplications()->exists()) {
                    return;
                }

                $product->delete();
            });

        $this->command?->info('Savings categories seeded: '.count($tree).', products: '.$productCount);
    }
}
