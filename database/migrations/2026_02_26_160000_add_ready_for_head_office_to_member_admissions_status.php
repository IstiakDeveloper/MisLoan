<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add 'ready_for_head_office' to status enum
        Schema::table('member_admissions', function (Blueprint $table) {
            $table->enum('status', ['draft', 'submitted', 'under_review', 'ready_for_head_office', 'pending_head_office', 'approved', 'rejected', 'needs_revision'])->nullable()->default('draft')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove 'ready_for_head_office' from status enum (back to previous definition)
        Schema::table('member_admissions', function (Blueprint $table) {
            $table->enum('status', ['draft', 'submitted', 'under_review', 'pending_head_office', 'approved', 'rejected', 'needs_revision'])->nullable()->default('draft')->change();
        });
    }
};
