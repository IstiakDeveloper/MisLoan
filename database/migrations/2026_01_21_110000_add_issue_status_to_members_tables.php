<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Status flow:
     * - pending: নতুন সাবমিশন, Head Office এ পেন্ডিং
     * - issue: Head Office সমস্যা পেয়েছে, Branch এ ফেরত গেছে
     * - approved: Head Office অনুমোদন করেছে
     * - rejected: Head Office বাতিল করেছে
     */
    public function up(): void
    {
        // Update admission_members status enum
        DB::statement("ALTER TABLE admission_members MODIFY COLUMN status ENUM('pending', 'issue', 'approved', 'rejected') DEFAULT 'pending'");

        // Update loan_members status enum
        DB::statement("ALTER TABLE loan_members MODIFY COLUMN status ENUM('pending', 'issue', 'approved', 'rejected') DEFAULT 'pending'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // First update any 'issue' status back to 'pending'
        DB::table('admission_members')->where('status', 'issue')->update(['status' => 'pending']);
        DB::table('loan_members')->where('status', 'issue')->update(['status' => 'pending']);

        // Revert enum
        DB::statement("ALTER TABLE admission_members MODIFY COLUMN status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending'");
        DB::statement("ALTER TABLE loan_members MODIFY COLUMN status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending'");
    }
};
