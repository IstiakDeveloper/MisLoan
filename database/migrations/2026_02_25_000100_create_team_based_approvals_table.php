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
        Schema::create('team_based_approvals', function (Blueprint $table) {
            $table->id();

            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');

            // Header info
            $table->date('sheet_date');

            // Selected approvers for this sheet (can be null if not selected)
            $table->foreignId('area_manager_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('zone_manager_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('admf_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('dmf_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('ed_id')->nullable()->constrained('users')->nullOnDelete();

            // Status: draft, submitted, approved, rejected (extend later)
            $table->string('status', 30)->default('draft')->index();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('team_based_approvals');
    }
};

