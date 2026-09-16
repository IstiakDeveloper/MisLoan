<?php

namespace Database\Factories;

use App\Models\SavingsCategory;
use App\Models\SavingsProduct;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SavingsProduct>
 */
class SavingsProductFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'savings_category_id' => SavingsCategory::factory(),
            'product_name' => 'G.Savings',
            'product_name_bn' => 'জি. সঞ্চয়',
            'product_code' => fake()->unique()->numerify('##.##'),
            'description' => null,
            'description_bn' => null,
            'deposit_type' => 'monthly',
            'duration_months' => 12,
            'min_amount' => 100,
            'max_amount' => 1000000,
            'monthly_installment' => 500,
            'interest_rate' => 6,
            'profit_distribution_type' => 'maturity',
            'premature_withdrawal_allowed' => false,
            'premature_withdrawal_penalty' => 0,
            'min_age' => 18,
            'max_age' => 70,
            'requires_nominee' => true,
            'is_active' => true,
            'display_order' => 0,
        ];
    }
}
