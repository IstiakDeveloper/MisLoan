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
        // Add 'pending_head_office' and 'needs_revision' to status enum
        DB::statement("ALTER TABLE member_admissions MODIFY COLUMN status ENUM('draft', 'submitted', 'under_review', 'pending_head_office', 'approved', 'rejected', 'needs_revision') DEFAULT 'draft'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove 'pending_head_office' and 'needs_revision' from status enum
        DB::statement("ALTER TABLE member_admissions MODIFY COLUMN status ENUM('draft', 'submitted', 'under_review', 'approved', 'rejected') DEFAULT 'draft'");
    }
};
