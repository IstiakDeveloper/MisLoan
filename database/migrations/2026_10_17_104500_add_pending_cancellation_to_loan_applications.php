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
            $table->text('cancellation_reason')->nullable()->after('awaiting_note');
            $table->foreignId('cancellation_requested_by')->nullable()->after('cancellation_reason')->constrained('users')->nullOnDelete();
            $table->timestamp('cancellation_requested_at')->nullable()->after('cancellation_requested_by');
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
                'pending_cancellation',
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
                ->where('status', 'pending_cancellation')
                ->update(['status' => 'awaiting_takeup']);

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

        Schema::table('loan_applications', function (Blueprint $table) {
            $table->dropConstrainedForeignId('cancellation_requested_by');
            $table->dropColumn(['cancellation_reason', 'cancellation_requested_at']);
        });
    }
};
