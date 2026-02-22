<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Note: Zone, Area, Branch info comes from the loan_application's branch relationship
     * (loan_members -> loan_application -> branch -> area -> zone)
     * So we don't store branch_name in loan_members table.
     */
    public function up(): void
    {
        Schema::table('loan_members', function (Blueprint $table) {
            // Add loan_type field from the image requirements
            // ঋণের ধরন - comes from Excel upload
            $table->string('loan_type')->nullable()->after('serial_no');
        });

        // Remove fields that are not in requirements (if they exist)
        if (Schema::hasColumn('loan_members', 'general_member')) {
            Schema::table('loan_members', function (Blueprint $table) {
                $table->dropColumn('general_member');
            });
        }
        if (Schema::hasColumn('loan_members', 'total_member')) {
            Schema::table('loan_members', function (Blueprint $table) {
                $table->dropColumn('total_member');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('loan_members', function (Blueprint $table) {
            $table->dropColumn(['loan_type']);
        });
    }
};
