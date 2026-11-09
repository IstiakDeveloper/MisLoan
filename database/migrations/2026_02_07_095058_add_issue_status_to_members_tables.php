<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

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
        // Update loan_members status enum only
        Schema::table('loan_members', function (Blueprint $table) {
            $table->enum('status', ['pending', 'issue', 'approved', 'rejected'])->nullable()->default('pending')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // First update any 'issue' status back to 'pending'
        DB::table('loan_members')->where('status', 'issue')->update(['status' => 'pending']);

        // Revert enum
        Schema::table('loan_members', function (Blueprint $table) {
            $table->enum('status', ['pending', 'approved', 'rejected'])->nullable()->default('pending')->change();
        });
    }
};
