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
        Schema::table('loan_members', function (Blueprint $table) {
            // Add status column if it doesn't exist
            if (!Schema::hasColumn('loan_members', 'status')) {
                $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending')->after('remarks');
                $table->index('status');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('loan_members', function (Blueprint $table) {
            if (Schema::hasColumn('loan_members', 'status')) {
                $table->dropColumn('status');
                $table->dropIndex(['status']);
            }
        });
    }
};
