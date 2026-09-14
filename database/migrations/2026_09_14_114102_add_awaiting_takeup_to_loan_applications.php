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
            $table->timestamp('awaiting_takeup_at')->nullable()->after('repayment_notes');
            $table->foreignId('awaiting_takeup_by')->nullable()->after('awaiting_takeup_at')->constrained('users')->nullOnDelete();
            $table->string('awaiting_note', 500)->nullable()->after('awaiting_takeup_by');
        });

        if (DB::getDriverName() === 'sqlite') {
            return;
        }

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
                'awaiting_takeup',
                'pending_amount_approval',
                'rejected',
                'disbursed',
                'repaid',
                'cancelled',
                'needs_correction'
            ) NOT NULL DEFAULT 'draft'
        ");
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'sqlite') {
            DB::table('loan_applications')
                ->where('status', 'awaiting_takeup')
                ->update(['status' => 'pending_disbursement']);

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

        Schema::table('loan_applications', function (Blueprint $table) {
            $table->dropConstrainedForeignId('awaiting_takeup_by');
            $table->dropColumn(['awaiting_takeup_at', 'awaiting_note']);
        });
    }
};
