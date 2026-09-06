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
            $table->decimal('pending_approved_amount', 12, 2)->nullable()->after('approved_amount');
            $table->foreignId('amount_change_requested_by')->nullable()->after('pending_approved_amount')->constrained('users')->nullOnDelete();
            $table->timestamp('amount_change_requested_at')->nullable()->after('amount_change_requested_by');
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
                'pending_amount_approval',
                'rejected',
                'disbursed',
                'cancelled',
                'needs_correction'
            ) NOT NULL DEFAULT 'draft'
        ");
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'sqlite') {
            DB::table('loan_applications')
                ->where('status', 'pending_amount_approval')
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
                    'rejected',
                    'disbursed',
                    'cancelled',
                    'needs_correction'
                ) NOT NULL DEFAULT 'draft'
            ");
        }

        Schema::table('loan_applications', function (Blueprint $table) {
            $table->dropConstrainedForeignId('amount_change_requested_by');
            $table->dropColumn(['pending_approved_amount', 'amount_change_requested_at']);
        });
    }
};
