<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('loan_products', function (Blueprint $table) {
            $table->string('main_product_code', 50)->nullable()->after('product_code');
            $table->decimal('loan_installment_factor', 14, 8)->default(0)->after('last_installment_per_thousand');
            $table->decimal('interest_installment_factor', 14, 8)->default(0)->after('loan_installment_factor');
            $table->decimal('savings_installment', 10, 2)->default(0)->after('interest_installment_factor');
            $table->index('main_product_code');
        });

        // Update interest_calculation_type enum to include 'housing'
        try {
            DB::statement("ALTER TABLE loan_products MODIFY COLUMN interest_calculation_type ENUM('flat', 'reducing', 'compound', 'housing') DEFAULT 'flat'");
        } catch (\Exception $e) {
            // In case of sqlite or test environments where ALTER TABLE MODIFY COLUMN is not supported
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('loan_products', function (Blueprint $table) {
            $table->dropIndex(['main_product_code']);
            $table->dropColumn([
                'main_product_code',
                'loan_installment_factor',
                'interest_installment_factor',
                'savings_installment',
            ]);
        });

        try {
            DB::statement("ALTER TABLE loan_products MODIFY COLUMN interest_calculation_type ENUM('flat', 'reducing', 'compound') DEFAULT 'flat'");
        } catch (\Exception $e) {
        }
    }
};
