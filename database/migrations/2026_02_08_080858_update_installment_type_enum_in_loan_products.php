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
        \DB::statement("ALTER TABLE loan_products MODIFY COLUMN installment_type ENUM('weekly', 'monthly', 'lump_sum') DEFAULT 'monthly'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        \DB::statement("ALTER TABLE loan_products MODIFY COLUMN installment_type ENUM('weekly', 'monthly') DEFAULT 'monthly'");
    }
};
