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
            if (! Schema::hasColumn('team_based_approvals', 'approved_total_amount')) {
                $table->decimal('approved_total_amount', 15, 2)->nullable()->after('status');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('team_based_approvals', function (Blueprint $table) {
            if (Schema::hasColumn('team_based_approvals', 'approved_total_amount')) {
                $table->dropColumn('approved_total_amount');
            }
        });
    }
};

