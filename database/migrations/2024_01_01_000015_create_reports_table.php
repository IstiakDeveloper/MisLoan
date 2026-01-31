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
        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->string('report_type'); // loan_summary, admission_summary, branch_wise, etc.
            $table->string('title'); // Can be Bangla or English

            // Filters used for report
            $table->foreignId('generated_by')->constrained('users')->onDelete('cascade');
            $table->foreignId('branch_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('area_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('zone_id')->nullable()->constrained()->onDelete('set null');

            $table->date('date_from')->nullable();
            $table->date('date_to')->nullable();
            $table->json('filters')->nullable();

            // Report data
            $table->json('report_data');
            $table->string('pdf_file_path')->nullable();
            $table->string('excel_file_path')->nullable();

            // Statistics
            $table->integer('total_applications')->default(0);
            $table->integer('approved_count')->default(0);
            $table->integer('rejected_count')->default(0);
            $table->integer('pending_count')->default(0);

            $table->timestamps();
            $table->softDeletes();

            $table->index('report_type');
            $table->index('generated_by');
            $table->index(['date_from', 'date_to']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reports');
    }
};
