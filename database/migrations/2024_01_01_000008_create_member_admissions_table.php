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
        Schema::create('member_admissions', function (Blueprint $table) {
            $table->id();
            $table->string('application_no')->unique();
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->foreignId('submitted_by')->constrained('users')->onDelete('cascade');

            // Excel file info
            $table->string('excel_file_path');
            $table->string('excel_file_name');
            $table->integer('total_members')->default(0);

            // Status
            $table->enum('status', ['pending', 'under_review', 'approved', 'rejected', 'needs_correction'])
                  ->default('pending');

            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->onDelete('set null');

            $table->text('head_office_remarks')->nullable();
            $table->text('branch_remarks')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index('application_no');
            $table->index('branch_id');
            $table->index('status');
            $table->index('submitted_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('member_admissions');
    }
};
