<?php

namespace Database\Factories;

use App\Models\SavingsCategory;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SavingsCategory>
 */
class SavingsCategoryFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'category_name' => 'General Savings',
            'category_name_bn' => 'সাধারণ সঞ্চয়',
            'category_code' => (string) fake()->unique()->numberBetween(21, 99),
            'description' => null,
            'description_bn' => null,
            'is_active' => true,
            'display_order' => 0,
        ];
    }
}
