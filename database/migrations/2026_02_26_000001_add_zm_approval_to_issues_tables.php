<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Add ZM approval fields to member_admission_issues
        Schema::table('member_admission_issues', function (Blueprint $table) {
            $table->timestamp('zm_approved_at')->nullable()->after('resolved_by');
            $table->foreignId('zm_approved_by')->nullable()->after('zm_approved_at')->constrained('users')->nullOnDelete();
            $table->text('zm_approval_note')->nullable()->after('zm_approved_by');
        });

        // 2. Add ZM approval fields to loan_application_issues
        Schema::table('loan_application_issues', function (Blueprint $table) {
            $table->timestamp('zm_approved_at')->nullable()->after('responded_at');
            $table->foreignId('zm_approved_by')->nullable()->after('zm_approved_at')->constrained('users')->nullOnDelete();
            $table->text('zm_approval_note')->nullable()->after('zm_approved_by');
        });

        // 3. Backfill existing resolved/replied issues as ZM approved to maintain continuity
        DB::table('member_admission_issues')
            ->whereNotNull('resolution_note')
            ->where('resolution_note', '!=', '')
            ->update([
                'zm_approved_at' => DB::raw('COALESCE(resolved_at, created_at)'),
                'zm_approved_by' => DB::raw('resolved_by'),
            ]);

        DB::table('loan_application_issues')
            ->whereNotNull('response_message')
            ->where('response_message', '!=', '')
            ->update([
                'zm_approved_at' => DB::raw('COALESCE(responded_at, created_at)'),
                'zm_approved_by' => DB::raw('responded_by'),
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('loan_application_issues', function (Blueprint $table) {
            $table->dropForeign(['zm_approved_by']);
            $table->dropColumn(['zm_approved_at', 'zm_approved_by', 'zm_approval_note']);
        });

        Schema::table('member_admission_issues', function (Blueprint $table) {
            $table->dropForeign(['zm_approved_by']);
            $table->dropColumn(['zm_approved_at', 'zm_approved_by', 'zm_approval_note']);
        });
    }
};
