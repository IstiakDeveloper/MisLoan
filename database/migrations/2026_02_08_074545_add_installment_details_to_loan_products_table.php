<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('loan_products', function (Blueprint $table) {
            $table->decimal('service_charge_per_thousand', 10, 2)->default(0)->after('interest_rate');
            $table->decimal('installment_amount_per_thousand', 10, 2)->default(0)->after('number_of_installments');
            $table->decimal('last_installment_per_thousand', 10, 2)->default(0)->after('installment_amount_per_thousand');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('loan_products', function (Blueprint $table) {
            $table->dropColumn([
                'service_charge_per_thousand',
                'installment_amount_per_thousand',
                'last_installment_per_thousand'
            ]);
        });
    }
};
