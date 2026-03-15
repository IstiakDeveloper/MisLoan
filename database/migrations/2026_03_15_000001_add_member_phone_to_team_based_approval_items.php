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
        Schema::table('team_based_approval_items', function (Blueprint $table) {
            $table->string('member_phone', 20)->nullable()->after('member_code');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('team_based_approval_items', function (Blueprint $table) {
            $table->dropColumn('member_phone');
        });
    }
};
