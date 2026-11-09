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
        // Add 'pending_head_office' and 'needs_revision' to status enum
        Schema::table('member_admissions', function (Blueprint $table) {
            $table->enum('status', ['draft', 'submitted', 'under_review', 'pending_head_office', 'approved', 'rejected', 'needs_revision'])->nullable()->default('draft')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove 'pending_head_office' and 'needs_revision' from status enum
        Schema::table('member_admissions', function (Blueprint $table) {
            $table->enum('status', ['draft', 'submitted', 'under_review', 'approved', 'rejected'])->nullable()->default('draft')->change();
        });
    }
};
