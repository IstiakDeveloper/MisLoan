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
            // Update status column to include 'issue' if it doesn't already
            // Note: We'll use raw SQL to modify the enum
            if (Schema::hasColumn('loan_members', 'status')) {
                // Drop and recreate the column with the new enum values
                Schema::table('loan_members', function (Blueprint $table) {
                    $table->enum('status', ['pending', 'approved', 'rejected', 'issue'])->nullable()->default('pending')->change();
                });
            }

            // Add rejection_reason column if it doesn't exist
            if (! Schema::hasColumn('loan_members', 'rejection_reason')) {
                $table->text('rejection_reason')->nullable()->after('status');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('loan_members', function (Blueprint $table) {
            if (Schema::hasColumn('loan_members', 'rejection_reason')) {
                $table->dropColumn('rejection_reason');
            }

            // Revert status column to original enum values
            if (Schema::hasColumn('loan_members', 'status')) {
                Schema::table('loan_members', function (Blueprint $table) {
                    $table->enum('status', ['pending', 'approved', 'rejected'])->nullable()->default('pending')->change();
                });
            }
        });
    }
};
