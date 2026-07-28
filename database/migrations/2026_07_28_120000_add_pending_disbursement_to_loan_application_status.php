<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
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
                'rejected',
                'disbursed',
                'cancelled',
                'needs_correction'
            ) NOT NULL DEFAULT 'draft'
        ");
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        DB::table('loan_applications')
            ->where('status', 'pending_disbursement')
            ->update(['status' => 'approved']);

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
                'rejected',
                'disbursed',
                'cancelled',
                'needs_correction'
            ) NOT NULL DEFAULT 'draft'
        ");
    }
};
