<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loan_applications', function (Blueprint $table) {
            $table->timestamp('repaid_at')->nullable()->after('disbursed_at');
            $table->foreignId('repaid_by')->nullable()->after('repaid_at')->constrained('users')->nullOnDelete();
            $table->text('repayment_notes')->nullable()->after('repaid_by');
        });

        Schema::table('member_admissions', function (Blueprint $table) {
            $table->foreignId('previous_admission_id')->nullable()->after('id')->constrained('member_admissions')->nullOnDelete();
        });

        // Drop unique constraint on application_no in member_admissions if present, and ensure standard index
        try {
            Schema::table('member_admissions', function (Blueprint $table) {
                $table->dropUnique(['application_no']);
                $table->index('application_no');
            });
        } catch (\Throwable $e) {
            // If already dropped or differently named
        }

        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("
                ALTER TABLE loan_applications
                MODIFY COLUMN status ENUM(
                    'draft',
                    'pending',
                    'submitted',
                    'under_review',
                    'ready_for_head_office',
                    'pending_head_office',
                    'approved',
                    'pending_disbursement',
                    'pending_amount_approval',
                    'rejected',
                    'disbursed',
                    'repaid',
                    'cancelled',
                    'needs_correction'
                ) NOT NULL DEFAULT 'draft'
            ");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'sqlite') {
            DB::table('loan_applications')
                ->where('status', 'repaid')
                ->update(['status' => 'disbursed']);

            DB::statement("
                ALTER TABLE loan_applications
                MODIFY COLUMN status ENUM(
                    'draft',
                    'pending',
                    'submitted',
                    'under_review',
                    'ready_for_head_office',
                    'pending_head_office',
                    'approved',
                    'pending_disbursement',
                    'pending_amount_approval',
                    'rejected',
                    'disbursed',
                    'cancelled',
                    'needs_correction'
                ) NOT NULL DEFAULT 'draft'
            ");
        }

        Schema::table('member_admissions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('previous_admission_id');
        });

        Schema::table('loan_applications', function (Blueprint $table) {
            $table->dropConstrainedForeignId('repaid_by');
            $table->dropColumn(['repaid_at', 'repayment_notes']);
        });
    }
};
