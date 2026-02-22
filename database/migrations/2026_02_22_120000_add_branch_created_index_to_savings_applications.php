<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Composite index so list-by-branch + date range + order by created_at uses index (avoids sort buffer).
     */
    public function up(): void
    {
        Schema::table('savings_applications', function (Blueprint $table) {
            $table->index(['branch_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('savings_applications', function (Blueprint $table) {
            $table->dropIndex(['branch_id', 'created_at']);
        });
    }
};
