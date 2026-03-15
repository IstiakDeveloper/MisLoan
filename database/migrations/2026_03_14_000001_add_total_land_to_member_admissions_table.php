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
        Schema::table('member_admissions', function (Blueprint $table) {
            $table->decimal('total_land_amount', 10, 2)->nullable()->after('non_cultivable_land_value');
            $table->decimal('total_land_value', 15, 2)->nullable()->after('total_land_amount');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('member_admissions', function (Blueprint $table) {
            $table->dropColumn(['total_land_amount', 'total_land_value']);
        });
    }
};
