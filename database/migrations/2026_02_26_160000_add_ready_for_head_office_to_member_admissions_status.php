<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add 'ready_for_head_office' to status enum
        DB::statement("
            ALTER TABLE member_admissions
            MODIFY COLUMN status ENUM(
                'draft',
                'submitted',
                'under_review',
                'ready_for_head_office',
                'pending_head_office',
                'approved',
                'rejected',
                'needs_revision'
            ) DEFAULT 'draft'
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove 'ready_for_head_office' from status enum (back to previous definition)
        DB::statement("
            ALTER TABLE member_admissions
            MODIFY COLUMN status ENUM(
                'draft',
                'submitted',
                'under_review',
                'pending_head_office',
                'approved',
                'rejected',
                'needs_revision'
            ) DEFAULT 'draft'
        ");
    }
};

