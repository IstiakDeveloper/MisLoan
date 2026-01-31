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
        // Set default status to 'pending' for existing loan members with NULL status
        DB::update("UPDATE loan_members SET status = 'pending' WHERE status IS NULL OR status = ''");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No need to reverse this - it's just data cleanup
    }
};
