<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\SavingsProduct;

class SavingsProductSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Monthly Savings
        SavingsProduct::create([
            'product_name' => 'General Monthly Savings',
            'product_name_bn' => 'সাধারণ মাসিক সঞ্চয়',
            'product_code' => 'GMS-01',
            'description' => 'Regular monthly savings account with flexible deposits',
            'description_bn' => 'নমনীয় জমার সাথে নিয়মিত মাসিক সঞ্চয় হিসাব',
            'deposit_type' => 'monthly',
            'duration_months' => 12,
            'monthly_installment' => 500.00,
            'min_amount' => 100.00,
            'max_amount' => 50000.00,
            'interest_rate' => 6.00,
            'profit_distribution_type' => 'yearly',
            'premature_withdrawal_allowed' => true,
            'premature_withdrawal_penalty' => 2.00,
            'maturity_conditions' => [
                'minimum_months' => 12,
                'auto_renew' => false,
            ],
            'min_age' => 18,
            'max_age' => 65,
            'requires_nominee' => true,
            'is_active' => true,
        ]);

        // 2. Fixed Deposit (Lump Sum)
        SavingsProduct::create([
            'product_name' => 'Fixed Deposit Account',
            'product_name_bn' => 'স্থায়ী আমানত হিসাব',
            'product_code' => 'FD-01',
            'description' => 'One-time fixed deposit with higher interest rate',
            'description_bn' => 'উচ্চ সুদের হারে এককালীন স্থায়ী আমানত',
            'deposit_type' => 'lump_sum',
            'duration_months' => 24,
            'monthly_installment' => 0.00,
            'min_amount' => 10000.00,
            'max_amount' => 1000000.00,
            'interest_rate' => 8.50,
            'profit_distribution_type' => 'maturity',
            'premature_withdrawal_allowed' => true,
            'premature_withdrawal_penalty' => 5.00,
            'maturity_conditions' => [
                'minimum_months' => 24,
                'auto_renew' => true,
            ],
            'min_age' => 18,
            'max_age' => 70,
            'requires_nominee' => true,
            'is_active' => true,
        ]);

        // 3. Double Benefit Scheme
        SavingsProduct::create([
            'product_name' => 'Double Benefit Savings',
            'product_name_bn' => 'দ্বিগুণ সুবিধা সঞ্চয়',
            'product_code' => 'DBS-01',
            'description' => 'Monthly savings scheme that doubles your money',
            'description_bn' => 'মাসিক সঞ্চয় প্রকল্প যা আপনার অর্থ দ্বিগুণ করে',
            'deposit_type' => 'monthly',
            'duration_months' => 96, // 8 years
            'monthly_installment' => 1000.00,
            'min_amount' => 500.00,
            'max_amount' => 10000.00,
            'interest_rate' => 9.00,
            'profit_distribution_type' => 'maturity',
            'premature_withdrawal_allowed' => true,
            'premature_withdrawal_penalty' => 10.00,
            'maturity_conditions' => [
                'minimum_months' => 96,
                'auto_renew' => false,
                'double_deposit' => true,
            ],
            'min_age' => 18,
            'max_age' => 55,
            'requires_nominee' => true,
            'is_active' => true,
        ]);

        // 4. Child Education Savings
        SavingsProduct::create([
            'product_name' => 'Child Education Savings',
            'product_name_bn' => 'শিশু শিক্ষা সঞ্চয়',
            'product_code' => 'CES-01',
            'description' => 'Long-term savings for child education with special benefits',
            'description_bn' => 'বিশেষ সুবিধা সহ শিশু শিক্ষার জন্য দীর্ঘমেয়াদী সঞ্চয়',
            'deposit_type' => 'monthly',
            'duration_months' => 120, // 10 years
            'monthly_installment' => 1000.00,
            'min_amount' => 500.00,
            'max_amount' => 5000.00,
            'interest_rate' => 10.00,
            'profit_distribution_type' => 'maturity',
            'premature_withdrawal_allowed' => false,
            'premature_withdrawal_penalty' => 0.00,
            'maturity_conditions' => [
                'minimum_months' => 120,
                'auto_renew' => false,
                'child_age_limit' => 18,
            ],
            'min_age' => 18,
            'max_age' => 60,
            'requires_nominee' => true,
            'is_active' => true,
        ]);

        // 5. Recurring Deposit
        SavingsProduct::create([
            'product_name' => 'Recurring Deposit Scheme',
            'product_name_bn' => 'পুনরাবৃত্ত আমানত স্কিম',
            'product_code' => 'RDS-01',
            'description' => 'Regular monthly recurring deposit with guaranteed returns',
            'description_bn' => 'নিশ্চিত রিটার্ন সহ নিয়মিত মাসিক পুনরাবৃত্ত আমানত',
            'deposit_type' => 'recurring',
            'duration_months' => 60, // 5 years
            'monthly_installment' => 2000.00,
            'min_amount' => 500.00,
            'max_amount' => 20000.00,
            'interest_rate' => 7.50,
            'profit_distribution_type' => 'maturity',
            'premature_withdrawal_allowed' => true,
            'premature_withdrawal_penalty' => 3.00,
            'maturity_conditions' => [
                'minimum_months' => 60,
                'auto_renew' => false,
            ],
            'min_age' => 18,
            'max_age' => 65,
            'requires_nominee' => true,
            'is_active' => true,
        ]);

        // 6. Women's Special Savings
        SavingsProduct::create([
            'product_name' => 'Women\'s Empowerment Savings',
            'product_name_bn' => 'নারী ক্ষমতায়ন সঞ্চয়',
            'product_code' => 'WES-01',
            'description' => 'Special savings scheme for women with additional benefits',
            'description_bn' => 'অতিরিক্ত সুবিধা সহ নারীদের জন্য বিশেষ সঞ্চয় প্রকল্প',
            'deposit_type' => 'monthly',
            'duration_months' => 36,
            'monthly_installment' => 1000.00,
            'min_amount' => 500.00,
            'max_amount' => 10000.00,
            'interest_rate' => 9.50,
            'profit_distribution_type' => 'yearly',
            'premature_withdrawal_allowed' => true,
            'premature_withdrawal_penalty' => 2.00,
            'maturity_conditions' => [
                'minimum_months' => 36,
                'auto_renew' => true,
            ],
            'min_age' => 18,
            'max_age' => 60,
            'requires_nominee' => true,
            'is_active' => true,
        ]);
    }
}

