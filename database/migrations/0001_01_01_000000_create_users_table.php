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
        // This migration is intentionally left empty
        // Custom users table is created in 2024_01_01_000005_create_users_table.php
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Handled by the custom migration
    }
};
