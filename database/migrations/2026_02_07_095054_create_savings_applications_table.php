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
        Schema::create('savings_applications', function (Blueprint $table) {
            $table->id();
            $table->string('application_no')->unique();

            // Relations
            $table->foreignId('member_admission_id')->constrained()->onDelete('cascade');
            $table->foreignId('savings_product_id')->constrained()->onDelete('restrict');
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->foreignId('samity_id')->constrained()->onDelete('cascade');

            // Savings Details
            $table->decimal('deposit_amount', 15, 2);
            $table->decimal('monthly_installment', 12, 2)->nullable();
            $table->integer('duration_months');
            $table->decimal('maturity_amount', 15, 2)->nullable();
            $table->date('start_date')->nullable();
            $table->date('maturity_date')->nullable();

            // Nominee Information (JSON for one or more nominees)
            $table->json('nominee_info')->nullable();

            // Purpose
            $table->text('purpose_of_savings')->nullable();

            // Status & Workflow
            $table->enum('status', ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'active', 'matured', 'closed', 'cancelled'])->default('draft');
            $table->foreignId('submitted_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('submitted_at')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('reviewed_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->text('remarks')->nullable();

            // Activation
            $table->foreignId('activated_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('activated_at')->nullable();

            $table->timestamps();

            // Indexes
            $table->index('application_no');
            $table->index('member_admission_id');
            $table->index('savings_product_id');
            $table->index('branch_id');
            $table->index('status');
            $table->index('maturity_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('savings_applications');
    }
};
