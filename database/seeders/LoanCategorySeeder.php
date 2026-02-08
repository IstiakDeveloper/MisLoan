<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\LoanCategory;
use App\Models\LoanProduct;

class LoanCategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Truncate existing data
        \DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        LoanProduct::truncate();
        LoanCategory::truncate();
        \DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        // ==========================================
        // 1. Jagoron Loan (জাগরণ ঋণ) - Category Code: 01.00 - 4 products
        // ==========================================
        $jagoron = LoanCategory::create([
            'category_name' => 'Jagoron Loan',
            'category_name_bn' => 'জাগরণ ঋণ',
            'category_code' => '01.00',
            'description' => 'Jagoron empowerment loan for development',
            'description_bn' => 'উন্নয়নের জন্য জাগরণ ক্ষমতায়ন ঋণ',
            'target_group' => 'both',
            'is_active' => true,
            'display_order' => 1,
        ]);

        // Jagoron Products
        $jagoronProducts = [
            // জাগরণ সাপ্তাহিক (1 বছর মেয়াদী) - FEMALE ONLY
            [
                'product_code' => '01.01',
                'product_name' => 'Jagoron Weekly (1 Year)',
                'product_name_bn' => 'জাগরণ সাপ্তাহিক (১ বছর মেয়াদী)',
                'interest_rate' => 23.92,
                'service_charge_per_thousand' => 127,
                'duration_months' => 12,
                'number_of_installments' => 46,
                'installment_amount_per_thousand' => 25,
                'last_installment_per_thousand' => 2,
                'min_amount' => 10000,
                'max_amount' => 69000,
                'installment_type' => 'weekly',
                'gender_restriction' => 'female', // সাপ্তাহিক = মেয়ে only
            ],
            // জাগরণ মাসিক (1 বছর মেয়াদী)
            [
                'product_code' => '01.02',
                'product_name' => 'Jagoron Monthly (1 Year)',
                'product_name_bn' => 'জাগরণ মাসিক (১ বছর মেয়াদী)',
                'interest_rate' => 23.83,
                'service_charge_per_thousand' => 133,
                'duration_months' => 12,
                'number_of_installments' => 12,
                'installment_amount_per_thousand' => 95,
                'last_installment_per_thousand' => 88,
                'min_amount' => 50000,
                'max_amount' => 199000,
                'installment_type' => 'monthly',
                'gender_restriction' => 'both',
            ],
            // জাগরণ মাসিক (1.5 বছর মেয়াদী)
            [
                'product_code' => '01.03',
                'product_name' => 'Jagoron Monthly (1.5 Year)',
                'product_name_bn' => 'জাগরণ মাসিক (১.৫ বছর মেয়াদী)',
                'interest_rate' => 23.94,
                'service_charge_per_thousand' => 199,
                'duration_months' => 18,
                'number_of_installments' => 18,
                'installment_amount_per_thousand' => 67,
                'last_installment_per_thousand' => 60,
                'min_amount' => 50000,
                'max_amount' => 199000,
                'installment_type' => 'monthly',
                'gender_restriction' => 'both',
            ],
            // জাগরণ মাসিক (2 বছর মেয়াদী)
            [
                'product_code' => '01.04',
                'product_name' => 'Jagoron Monthly (2 Year)',
                'product_name_bn' => 'জাগরণ মাসিক (২ বছর মেয়াদী)',
                'interest_rate' => 23.86,
                'service_charge_per_thousand' => 266,
                'duration_months' => 24,
                'number_of_installments' => 24,
                'installment_amount_per_thousand' => 53,
                'last_installment_per_thousand' => 47,
                'min_amount' => 50000,
                'max_amount' => 199000,
                'installment_type' => 'monthly',
                'gender_restriction' => 'both',
            ],
        ];

        foreach ($jagoronProducts as $product) {
            LoanProduct::create(array_merge($product, [
                'loan_category_id' => $jagoron->id,
                'service_charge' => 0.00,
                'interest_calculation_type' => 'flat',
                'min_age' => 18,
                'max_age' => 60,
                'requires_guarantor' => true,
                'number_of_guarantors' => 1,
                'eligibility_conditions' => [],
                'required_documents' => ['nid', 'photo'],
                'is_active' => true,
            ]));
        }

        // ==========================================
        // 2. Agrosor (আগ্রসর ঋণ) - Category Code: AGR - 31 products
        // ==========================================
        $agrosor = LoanCategory::create([
            'category_name' => 'Agrosor',
            'category_name_bn' => 'আগ্রসর',
            'category_code' => 'AGR',
            'description' => 'Agrosor agricultural and enterprise development loan',
            'description_bn' => 'আগ্রসর কৃষি ও উদ্যোগ উন্নয়ন ঋণ',
            'target_group' => 'both',
            'is_active' => true,
            'display_order' => 2,
        ]);

        // Agrosor Products (All 31 products from PDF)
        $agrosorProducts = [
            // আগ্রসর মাসিক (1 বছর মেয়াদী)
            [
                'product_code' => 'AGR-08',
                'product_name' => 'Agrosor Monthly (1 Year)',
                'product_name_bn' => 'আগ্রসর মাসিক (১ বছর মেয়াদী)',
                'interest_rate' => 23.83,
                'service_charge_per_thousand' => 133,
                'duration_months' => 12,
                'number_of_installments' => 12,
                'installment_amount_per_thousand' => 95,
                'last_installment_per_thousand' => 88,
                'min_amount' => 200000,
                'max_amount' => 6000000,
            ],
            // আগ্রসর মাসিক (1.5 বছর মেয়াদী)
            [
                'product_code' => 'AGR-09',
                'product_name' => 'Agrosor Monthly (1.5 Year)',
                'product_name_bn' => 'আগ্রসর মাসিক (১.৫ বছর মেয়াদী)',
                'interest_rate' => 23.94,
                'service_charge_per_thousand' => 199,
                'duration_months' => 18,
                'number_of_installments' => 18,
                'installment_amount_per_thousand' => 67,
                'last_installment_per_thousand' => 60,
                'min_amount' => 200000,
                'max_amount' => 5000000,
            ],
            // আগ্রসর মাসিক (2 বছর মেয়াদী)
            [
                'product_code' => 'AGR-10',
                'product_name' => 'Agrosor Monthly (2 Year)',
                'product_name_bn' => 'আগ্রসর মাসিক (২ বছর মেয়াদী)',
                'interest_rate' => 23.86,
                'service_charge_per_thousand' => 266,
                'duration_months' => 24,
                'number_of_installments' => 24,
                'installment_amount_per_thousand' => 53,
                'last_installment_per_thousand' => 47,
                'min_amount' => 200000,
                'max_amount' => 5000000,
            ],
            // আগ্রসর মাসিক (3 বছর মেয়াদী)
            [
                'product_code' => 'AGR-11',
                'product_name' => 'Agrosor Monthly (3 Year)',
                'product_name_bn' => 'আগ্রসর মাসিক (৩ বছর মেয়াদী)',
                'interest_rate' => 23.37,
                'service_charge_per_thousand' => 399,
                'duration_months' => 36,
                'number_of_installments' => 36,
                'installment_amount_per_thousand' => 39,
                'last_installment_per_thousand' => 34,
                'min_amount' => 200000,
                'max_amount' => 4000000,
            ],
            // আগ্রসর-রেইজ মাসিক (1 বছর মেয়াদী)
            [
                'product_code' => 'AGR-12',
                'product_name' => 'Agrosor-RAISE Monthly (1 Year)',
                'product_name_bn' => 'আগ্রসর-রেইজ মাসিক (১ বছর মেয়াদী)',
                'interest_rate' => 17.70,
                'service_charge_per_thousand' => 98,
                'duration_months' => 12,
                'number_of_installments' => 12,
                'installment_amount_per_thousand' => 92,
                'last_installment_per_thousand' => 86,
                'min_amount' => 51000,
                'max_amount' => 4000000,
            ],
            // আগ্রসর-রেইজ মাসিক (2 বছর মেয়াদী)
            [
                'product_code' => 'AGR-13',
                'product_name' => 'Agrosor-RAISE Monthly (2 Year)',
                'product_name_bn' => 'আগ্রসর-রেইজ মাসিক (২ বছর মেয়াদী)',
                'interest_rate' => 17.86,
                'service_charge_per_thousand' => 196,
                'duration_months' => 24,
                'number_of_installments' => 24,
                'installment_amount_per_thousand' => 50,
                'last_installment_per_thousand' => 46,
                'min_amount' => 51000,
                'max_amount' => 4000000,
            ],
            // আগ্রসর-এমএফসিই মাসিক (1 বছর মেয়াদী)
            [
                'product_code' => 'AGR-21',
                'product_name' => 'Agrosor-MFCE Monthly (1 Year)',
                'product_name_bn' => 'আগ্রসর-এমএফসিই মাসিক (১ বছর মেয়াদী)',
                'interest_rate' => 17.70,
                'service_charge_per_thousand' => 98,
                'duration_months' => 12,
                'number_of_installments' => 12,
                'installment_amount_per_thousand' => 92,
                'last_installment_per_thousand' => 86,
                'min_amount' => 70000,
                'max_amount' => 4000000,
            ],
            // আগ্রসর-এমএফসিই মাসিক (1.5 বছর মেয়াদী)
            [
                'product_code' => 'AGR-22',
                'product_name' => 'Agrosor-MFCE Monthly (1.5 Year)',
                'product_name_bn' => 'আগ্রসর-এমএফসিই মাসিক (১.৫ বছর মেয়াদী)',
                'interest_rate' => 17.89,
                'service_charge_per_thousand' => 147,
                'duration_months' => 18,
                'number_of_installments' => 18,
                'installment_amount_per_thousand' => 64,
                'last_installment_per_thousand' => 59,
                'min_amount' => 70000,
                'max_amount' => 3000000,
            ],
            // আগ্রসর-এমএফসিই মাসিক (2 বছর মেয়াদী)
            [
                'product_code' => 'AGR-23',
                'product_name' => 'Agrosor-MFCE Monthly (2 Year)',
                'product_name_bn' => 'আগ্রসর-এমএফসিই মাসিক (২ বছর মেয়াদী)',
                'interest_rate' => 17.86,
                'service_charge_per_thousand' => 196,
                'duration_months' => 24,
                'number_of_installments' => 24,
                'installment_amount_per_thousand' => 50,
                'last_installment_per_thousand' => 46,
                'min_amount' => 70000,
                'max_amount' => 4000000,
            ],
            // বিশেষায়িত আগ্রসর মাসিক (1 বছর মেয়াদী)
            [
                'product_code' => 'AGR-24',
                'product_name' => 'Specialized Agrosor Monthly (1 Year)',
                'product_name_bn' => 'বিশেষায়িত আগ্রসর মাসিক (১ বছর মেয়াদী)',
                'interest_rate' => 15.91,
                'service_charge_per_thousand' => 88,
                'duration_months' => 12,
                'number_of_installments' => 12,
                'installment_amount_per_thousand' => 91,
                'last_installment_per_thousand' => 87,
                'min_amount' => 100000,
                'max_amount' => 3000000,
            ],
            // বিশেষায়িত আগ্রসর মাসিক (1.5 বছর মেয়াদী)
            [
                'product_code' => 'AGR-25',
                'product_name' => 'Specialized Agrosor Monthly (1.5 Year)',
                'product_name_bn' => 'বিশেষায়িত আগ্রসর মাসিক (১.৫ বছর মেয়াদী)',
                'interest_rate' => 16.00,
                'service_charge_per_thousand' => 132,
                'duration_months' => 18,
                'number_of_installments' => 18,
                'installment_amount_per_thousand' => 63,
                'last_installment_per_thousand' => 61,
                'min_amount' => 100000,
                'max_amount' => 2500000,
            ],
            // বিশেষায়িত আগ্রসর মাসিক (2 বছর মেয়াদী)
            [
                'product_code' => 'AGR-26',
                'product_name' => 'Specialized Agrosor Monthly (2 Year)',
                'product_name_bn' => 'বিশেষায়িত আগ্রসর মাসিক (২ বছর মেয়াদী)',
                'interest_rate' => 16.00,
                'service_charge_per_thousand' => 176,
                'duration_months' => 24,
                'number_of_installments' => 24,
                'installment_amount_per_thousand' => 49,
                'last_installment_per_thousand' => 49,
                'min_amount' => 100000,
                'max_amount' => 1500000,
            ],
            // আগ্রসর-স্মার্ট মাসিক (1 বছর মেয়াদী)
            [
                'product_code' => 'AGR-32',
                'product_name' => 'Agrosor-SMART Monthly (1 Year)',
                'product_name_bn' => 'আগ্রসর-স্মার্ট মাসিক (১ বছর মেয়াদী)',
                'interest_rate' => 23.83,
                'service_charge_per_thousand' => 133,
                'duration_months' => 12,
                'number_of_installments' => 12,
                'installment_amount_per_thousand' => 95,
                'last_installment_per_thousand' => 88,
                'min_amount' => 50000,
                'max_amount' => 1500000,
            ],
            // আগ্রসর-স্মার্ট মাসিক (1.5 বছর মেয়াদী)
            [
                'product_code' => 'AGR-33',
                'product_name' => 'Agrosor-SMART Monthly (1.5 Year)',
                'product_name_bn' => 'আগ্রসর-স্মার্ট মাসিক (১.৫ বছর মেয়াদী)',
                'interest_rate' => 23.94,
                'service_charge_per_thousand' => 199,
                'duration_months' => 18,
                'number_of_installments' => 18,
                'installment_amount_per_thousand' => 67,
                'last_installment_per_thousand' => 60,
                'min_amount' => 50000,
                'max_amount' => 1500000,
            ],
            // আগ্রসর-স্মার্ট মাসিক (2 বছর মেয়াদী)
            [
                'product_code' => 'AGR-34',
                'product_name' => 'Agrosor-SMART Monthly (2 Year)',
                'product_name_bn' => 'আগ্রসর-স্মার্ট মাসিক (২ বছর মেয়াদী)',
                'interest_rate' => 23.86,
                'service_charge_per_thousand' => 266,
                'duration_months' => 24,
                'number_of_installments' => 24,
                'installment_amount_per_thousand' => 53,
                'last_installment_per_thousand' => 47,
                'min_amount' => 50000,
                'max_amount' => 2000000,
            ],
            // আগ্রসর-সিএসএল-স্মার্ট মাসিক (1 বছর মেয়াদী)
            [
                'product_code' => 'AGR-35',
                'product_name' => 'Agrosor-CSL-SMART Monthly (1 Year)',
                'product_name_bn' => 'আগ্রসর-সিএসএল-স্মার্ট মাসিক (১ বছর মেয়াদী)',
                'interest_rate' => 23.83,
                'service_charge_per_thousand' => 133,
                'duration_months' => 12,
                'number_of_installments' => 12,
                'installment_amount_per_thousand' => 95,
                'last_installment_per_thousand' => 88,
                'min_amount' => 50000,
                'max_amount' => 1500000,
            ],
            // আগ্রসর-সিএসএল-স্মার্ট মাসিক (1.5 বছর মেয়াদী)
            [
                'product_code' => 'AGR-36',
                'product_name' => 'Agrosor-CSL-SMART Monthly (1.5 Year)',
                'product_name_bn' => 'আগ্রসর-সিএসএল-স্মার্ট মাসিক (১.৫ বছর মেয়াদী)',
                'interest_rate' => 23.94,
                'service_charge_per_thousand' => 199,
                'duration_months' => 18,
                'number_of_installments' => 18,
                'installment_amount_per_thousand' => 67,
                'last_installment_per_thousand' => 60,
                'min_amount' => 50000,
                'max_amount' => 1500000,
            ],
            // আগ্রসর-সিএসএল-স্মার্ট মাসিক (2 বছর মেয়াদী)
            [
                'product_code' => 'AGR-37',
                'product_name' => 'Agrosor-CSL-SMART Monthly (2 Year)',
                'product_name_bn' => 'আগ্রসর-সিএসএল-স্মার্ট মাসিক (২ বছর মেয়াদী)',
                'interest_rate' => 23.86,
                'service_charge_per_thousand' => 266,
                'duration_months' => 24,
                'number_of_installments' => 24,
                'installment_amount_per_thousand' => 53,
                'last_installment_per_thousand' => 47,
                'min_amount' => 50000,
                'max_amount' => 2000000,
            ],
        ];

        foreach ($agrosorProducts as $product) {
            LoanProduct::create(array_merge($product, [
                'loan_category_id' => $agrosor->id,
                'installment_type' => 'monthly',
                'service_charge' => 0.00,
                'interest_calculation_type' => 'flat',
                'gender_restriction' => 'both',
                'min_age' => 18,
                'max_age' => 65,
                'requires_guarantor' => true,
                'number_of_guarantors' => 1,
                'eligibility_conditions' => [],
                'required_documents' => ['nid', 'photo'],
                'is_active' => true,
            ]));
        }

        // ==========================================
        // 3. Buniad Loan (বুনিয়াদ ঋণ) - Category Code: 03.00 - 2 products - ALL FEMALE
        // ==========================================
        $buniad = LoanCategory::create([
            'category_name' => 'Buniad Loan',
            'category_name_bn' => 'বুনিয়াদ ঋণ',
            'category_code' => '03.00',
            'description' => 'Buniad foundation loan for women',
            'description_bn' => 'মহিলাদের জন্য বুনিয়াদ ভিত্তি ঋণ',
            'target_group' => 'both',
            'is_active' => true,
            'display_order' => 3,
        ]);

        // Buniad Products - ALL FEMALE
        $buniadProducts = [
            // বুনিয়াদ সাপ্তাহিক (1 বছর মেয়াদী) - FEMALE
            [
                'product_code' => '03.01',
                'product_name' => 'Buniad Weekly (1 Year)',
                'product_name_bn' => 'বুনিয়াদ সাপ্তাহিক (১ বছর মেয়াদী)',
                'interest_rate' => 19.89,
                'service_charge_per_thousand' => 105,
                'duration_months' => 12,
                'number_of_installments' => 45,
                'installment_amount_per_thousand' => 25,
                'last_installment_per_thousand' => 5,
                'min_amount' => 10000,
                'max_amount' => 69000,
                'installment_type' => 'weekly',
                'gender_restriction' => 'female',
            ],
            // বুনিয়াদ মাসিক (1 বছর মেয়াদী) - FEMALE
            [
                'product_code' => '03.02',
                'product_name' => 'Buniad Monthly (1 Year)',
                'product_name_bn' => 'বুনিয়াদ মাসিক (১ বছর মেয়াদী)',
                'interest_rate' => 19.96,
                'service_charge_per_thousand' => 111,
                'duration_months' => 12,
                'number_of_installments' => 12,
                'installment_amount_per_thousand' => 93,
                'last_installment_per_thousand' => 88,
                'min_amount' => 50000,
                'max_amount' => 150000,
                'installment_type' => 'monthly',
                'gender_restriction' => 'female',
            ],
        ];

        foreach ($buniadProducts as $product) {
            LoanProduct::create(array_merge($product, [
                'loan_category_id' => $buniad->id,
                'service_charge' => 0.00,
                'interest_calculation_type' => 'flat',
                'min_age' => 18,
                'max_age' => 60,
                'requires_guarantor' => true,
                'number_of_guarantors' => 1,
                'eligibility_conditions' => [],
                'required_documents' => ['nid', 'photo'],
                'is_active' => true,
            ]));
        }

        // ==========================================
        // 4. ENRICH (এনরিচ) - Category Code: ENR - 3 products
        // ==========================================
        $enrich = LoanCategory::create([
            'category_name' => 'ENRICH',
            'category_name_bn' => 'এনরিচ',
            'category_code' => 'ENR',
            'description' => 'ENRICH Sufolon agricultural loan',
            'description_bn' => 'এনরিচ সুফলন কৃষি ঋণ',
            'target_group' => 'both',
            'is_active' => true,
            'display_order' => 4,
        ]);

        // ENRICH Products (Sufolon + IGA Biannual + LIL)
        $enrichProducts = [
            // সুফলন ষান্মাসিক (6 মাস মেয়াদী)
            [
                'product_code' => 'ENR-07',
                'product_name' => 'Sufolon Biannual (6 Months)',
                'product_name_bn' => 'সুফলন ষান্মাসিক (৬ মাস মেয়াদী)',
                'interest_rate' => 12.00, // মাসিক 2%
                'service_charge_per_thousand' => 20,
                'duration_months' => 6,
                'number_of_installments' => 6,
                'installment_amount_per_thousand' => 0,
                'last_installment_per_thousand' => 0,
                'min_amount' => 10000,
                'max_amount' => 250000,
                'installment_type' => 'lump_sum',
            ],
            // আইজিএ ষান্মাসিক (6 মাস মেয়াদী)
            [
                'product_code' => 'ENR-18',
                'product_name' => 'IGA Biannual (6 Months)',
                'product_name_bn' => 'আইজিএ ষান্মাসিক (৬ মাস মেয়াদী)',
                'interest_rate' => 12.00, // মাসিক 2%
                'service_charge_per_thousand' => 20,
                'duration_months' => 6,
                'number_of_installments' => 6,
                'installment_amount_per_thousand' => 0,
                'last_installment_per_thousand' => 0,
                'min_amount' => 10000,
                'max_amount' => 250000,
                'installment_type' => 'lump_sum',
            ],
            // এলআইএল মাসিক (11 মাস মেয়াদী)
            [
                'product_code' => 'ENR-19',
                'product_name' => 'LIL Monthly (11 Months)',
                'product_name_bn' => 'এলআইএল মাসিক (১১ মাস মেয়াদী)',
                'interest_rate' => 8.00,
                'service_charge_per_thousand' => 40,
                'duration_months' => 11,
                'number_of_installments' => 11,
                'installment_amount_per_thousand' => 95,
                'last_installment_per_thousand' => 90,
                'min_amount' => 10000,
                'max_amount' => 100000,
                'installment_type' => 'monthly',
            ],
        ];

        foreach ($enrichProducts as $product) {
            LoanProduct::create(array_merge($product, [
                'loan_category_id' => $enrich->id,
                'service_charge' => 0.00,
                'interest_calculation_type' => 'flat',
                'gender_restriction' => 'both',
                'min_age' => 18,
                'max_age' => 65,
                'requires_guarantor' => true,
                'number_of_guarantors' => 1,
                'eligibility_conditions' => [],
                'required_documents' => ['nid', 'photo'],
                'is_active' => true,
            ]));
        }

        // ==========================================
        // 5. RMTP-SME (আরএমটিপি-এসএমই) - Category Code: RMTP - 3 products
        // ==========================================
        $rmtp = LoanCategory::create([
            'category_name' => 'RMTP-SME',
            'category_name_bn' => 'আরএমটিপি-এসএমই',
            'category_code' => 'RMTP',
            'description' => 'RMTP Special Micro Enterprise loan',
            'description_bn' => 'আরএমটিপি বিশেষ ক্ষুদ্র উদ্যোগ ঋণ',
            'target_group' => 'both',
            'is_active' => true,
            'display_order' => 5,
        ]);

        // RMTP Products + SCL + CMSME
        $rmtpProducts = [
            // এসসিএল (5 মাস মেয়াদী)
            [
                'product_code' => 'RMTP-20',
                'product_name' => 'SCL (5 Months)',
                'product_name_bn' => 'এসসিএল (৫ মাস মেয়াদী)',
                'interest_rate' => 8.00,
                'service_charge_per_thousand' => 40,
                'duration_months' => 5,
                'number_of_installments' => 5,
                'installment_amount_per_thousand' => 0,
                'last_installment_per_thousand' => 0,
                'min_amount' => 10000,
                'max_amount' => 50000,
                'installment_type' => 'lump_sum',
            ],
            // সিএমএসএমই মাসিক ঋণ (1 বছর মেয়াদী)
            [
                'product_code' => 'RMTP-29',
                'product_name' => 'CMSME Monthly (1 Year)',
                'product_name_bn' => 'সিএমএসএমই মাসিক ঋণ (১ বছর মেয়াদী)',
                'interest_rate' => 4.00,
                'service_charge_per_thousand' => 21.80,
                'duration_months' => 12,
                'number_of_installments' => 12,
                'installment_amount_per_thousand' => 86,
                'last_installment_per_thousand' => 75.80,
                'min_amount' => 100000,
                'max_amount' => 5000000,
                'installment_type' => 'monthly',
            ],
            // সিএমএসএমই মাসিক ঋণ (1.5 বছর মেয়াদী)
            [
                'product_code' => 'RMTP-30',
                'product_name' => 'CMSME Monthly (1.5 Year)',
                'product_name_bn' => 'সিএমএসএমই মাসিক ঋণ (১.৫ বছর মেয়াদী)',
                'interest_rate' => 4.00,
                'service_charge_per_thousand' => 31.97,
                'duration_months' => 18,
                'number_of_installments' => 18,
                'installment_amount_per_thousand' => 58,
                'last_installment_per_thousand' => 45.97,
                'min_amount' => 100000,
                'max_amount' => 5000000,
                'installment_type' => 'monthly',
            ],
            // সিএমএসএমই মাসিক ঋণ (2 বছর মেয়াদী)
            [
                'product_code' => 'RMTP-31',
                'product_name' => 'CMSME Monthly (2 Year)',
                'product_name_bn' => 'সিএমএসএমই মাসিক ঋণ (২ বছর মেয়াদী)',
                'interest_rate' => 4.00,
                'service_charge_per_thousand' => 42.20,
                'duration_months' => 24,
                'number_of_installments' => 24,
                'installment_amount_per_thousand' => 44,
                'last_installment_per_thousand' => 30.20,
                'min_amount' => 100000,
                'max_amount' => 5000000,
                'installment_type' => 'monthly',
            ],
        ];

        foreach ($rmtpProducts as $product) {
            LoanProduct::create(array_merge($product, [
                'loan_category_id' => $rmtp->id,
                'service_charge' => 0.00,
                'interest_calculation_type' => 'flat',
                'gender_restriction' => 'both',
                'min_age' => 18,
                'max_age' => 65,
                'requires_guarantor' => true,
                'number_of_guarantors' => 1,
                'eligibility_conditions' => [],
                'required_documents' => ['nid', 'photo'],
                'is_active' => true,
            ]));
        }

        // ==========================================
        // 6. ECCCP-Draught (ইসিসিসিপি-খরা) - Category Code: ECCCP - 0 products
        // ==========================================
        $ecccp = LoanCategory::create([
            'category_name' => 'ECCCP-Draught',
            'category_name_bn' => 'ইসিসিসিপি-খরা',
            'category_code' => 'ECCCP',
            'description' => 'Climate Change and Drought program',
            'description_bn' => 'জলবায়ু পরিবর্তন এবং খরা কর্মসূচি',
            'target_group' => 'both',
            'is_active' => true,
            'display_order' => 6,
        ]);

        // ECCCP Products
        $ecccpProducts = [
            // ইসিসিসিপি-ড্রাউট মাসিক (1 বছর মেয়াদী)
            [
                'product_code' => 'ECCCP-27',
                'product_name' => 'ECCCP-Drought Monthly (1 Year)',
                'product_name_bn' => 'ইসিসিসিপি-ড্রাউট মাসিক (১ বছর মেয়াদী)',
                'interest_rate' => 19.96,
                'service_charge_per_thousand' => 111,
                'duration_months' => 12,
                'number_of_installments' => 12,
                'installment_amount_per_thousand' => 93,
                'last_installment_per_thousand' => 88,
                'min_amount' => 50000,
                'max_amount' => 200000,
                'installment_type' => 'monthly',
            ],
            // ইসিসিসিপি-ড্রাইট ষান্মাসিক (6 মাস মেয়াদী)
            [
                'product_code' => 'ECCCP-28',
                'product_name' => 'ECCCP-Dryit Biannual (6 Months)',
                'product_name_bn' => 'ইসিসিসিপি-ড্রাইট ষান্মাসিক (৬ মাস মেয়াদী)',
                'interest_rate' => 10.02, // মাসিক 1.67%
                'service_charge_per_thousand' => 16.70,
                'duration_months' => 6,
                'number_of_installments' => 6,
                'installment_amount_per_thousand' => 0,
                'last_installment_per_thousand' => 0,
                'min_amount' => 10000,
                'max_amount' => 250000,
                'installment_type' => 'lump_sum',
            ],
        ];

        foreach ($ecccpProducts as $product) {
            LoanProduct::create(array_merge($product, [
                'loan_category_id' => $ecccp->id,
                'service_charge' => 0.00,
                'interest_calculation_type' => 'flat',
                'gender_restriction' => 'both',
                'min_age' => 18,
                'max_age' => 65,
                'requires_guarantor' => true,
                'number_of_guarantors' => 1,
                'eligibility_conditions' => [],
                'required_documents' => ['nid', 'photo'],
                'is_active' => true,
            ]));
        }

        // ==========================================
        // 7. Abason Loan (আবাসন ঋণ) - Category Code: ABS - 4 products
        // ==========================================
        $abason = LoanCategory::create([
            'category_name' => 'Abason Loan',
            'category_name_bn' => 'আবাসন ঋণ',
            'category_code' => 'ABS',
            'description' => 'Abason housing loan program',
            'description_bn' => 'আবাসন গৃহায়ন ঋণ কর্মসূচি',
            'target_group' => 'both',
            'is_active' => true,
            'display_order' => 7,
        ]);

        // IGA Products (Weekly + Monthly products under Abason)
        $abasonProducts = [
            // আইজিএ সাপ্তাহিক (1 বছর মেয়াদী) - FEMALE ONLY
            [
                'product_code' => 'ABS-14',
                'product_name' => 'IGA Weekly (1 Year)',
                'product_name_bn' => 'আইজিএ সাপ্তাহিক (১ বছর মেয়াদী)',
                'interest_rate' => 25.00,
                'service_charge_per_thousand' => 133,
                'duration_months' => 12,
                'number_of_installments' => 46,
                'installment_amount_per_thousand' => 25,
                'last_installment_per_thousand' => 8,
                'min_amount' => 10000,
                'max_amount' => 69000,
                'installment_type' => 'weekly',
                'gender_restriction' => 'female', // সাপ্তাহিক = মেয়ে only
            ],
            // আইজিএ মাসিক (1 বছর মেয়াদী)
            [
                'product_code' => 'ABS-15',
                'product_name' => 'IGA Monthly (1 Year)',
                'product_name_bn' => 'আইজিএ মাসিক (১ বছর মেয়াদী)',
                'interest_rate' => 24.96,
                'service_charge_per_thousand' => 133,
                'duration_months' => 12,
                'number_of_installments' => 12,
                'installment_amount_per_thousand' => 100,
                'last_installment_per_thousand' => 33,
                'min_amount' => 50000,
                'max_amount' => 200000,
                'installment_type' => 'monthly',
                'gender_restriction' => 'both',
            ],
            // আইজিএ মাসিক (1.5 বছর মেয়াদী)
            [
                'product_code' => 'ABS-16',
                'product_name' => 'IGA Monthly (1.5 Year)',
                'product_name_bn' => 'আইজিএ মাসিক (১.৫ বছর মেয়াদী)',
                'interest_rate' => 23.94,
                'service_charge_per_thousand' => 199,
                'duration_months' => 18,
                'number_of_installments' => 18,
                'installment_amount_per_thousand' => 70,
                'last_installment_per_thousand' => 9,
                'min_amount' => 50000,
                'max_amount' => 200000,
                'installment_type' => 'monthly',
                'gender_restriction' => 'both',
            ],
            // আইজিএ মাসিক (2 বছর মেয়াদী)
            [
                'product_code' => 'ABS-17',
                'product_name' => 'IGA Monthly (2 Year)',
                'product_name_bn' => 'আইজিএ মাসিক (২ বছর মেয়াদী)',
                'interest_rate' => 24.29,
                'service_charge_per_thousand' => 266,
                'duration_months' => 24,
                'number_of_installments' => 24,
                'installment_amount_per_thousand' => 54,
                'last_installment_per_thousand' => 24,
                'min_amount' => 50000,
                'max_amount' => 200000,
                'installment_type' => 'monthly',
                'gender_restriction' => 'both',
            ],
        ];

        foreach ($abasonProducts as $product) {
            LoanProduct::create(array_merge($product, [
                'loan_category_id' => $abason->id,
                'service_charge' => 0.00,
                'interest_calculation_type' => 'flat',
                'min_age' => 18,
                'max_age' => 60,
                'requires_guarantor' => true,
                'number_of_guarantors' => 1,
                'eligibility_conditions' => [],
                'required_documents' => ['nid', 'photo'],
                'is_active' => true,
            ]));
        }
    }
}
