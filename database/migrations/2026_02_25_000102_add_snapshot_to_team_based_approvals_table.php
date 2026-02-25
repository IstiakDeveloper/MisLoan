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
        Schema::table('team_based_approvals', function (Blueprint $table) {
            $table->json('last_items_snapshot')->nullable()->after('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('team_based_approvals', function (Blueprint $table) {
            $table->dropColumn('last_items_snapshot');
        });
    }
};

