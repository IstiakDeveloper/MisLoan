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
        Schema::create('loan_applications', function (Blueprint $table) {
            $table->id();
            $table->string('application_no')->unique();

            // Relations
            $table->foreignId('member_admission_id')->constrained()->onDelete('cascade');
            $table->foreignId('loan_product_id')->constrained()->onDelete('restrict');
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->foreignId('samity_id')->constrained()->onDelete('cascade');

            // Loan Details
            $table->decimal('requested_amount', 15, 2);
            $table->decimal('approved_amount', 15, 2)->nullable();
            $table->decimal('installment_amount', 12, 2)->nullable();
            $table->integer('number_of_installments');
            $table->date('proposed_start_date')->nullable();
            $table->date('approved_start_date')->nullable();
            $table->date('expected_end_date')->nullable();

            // Purpose & Details
            $table->text('purpose_of_loan');
            $table->text('business_plan')->nullable();
            $table->text('repayment_source')->nullable();

            // Guarantor Information (JSON array for multiple guarantors)
            $table->json('guarantor_info')->nullable();

            // Financial Assessment
            $table->decimal('monthly_income', 12, 2)->nullable();
            $table->decimal('monthly_expense', 12, 2)->nullable();
            $table->decimal('other_loan_amount', 12, 2)->default(0);
            $table->text('collateral_info')->nullable();

            // Status & Workflow
            $table->enum('status', ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'disbursed', 'cancelled'])->default('draft');
            $table->foreignId('submitted_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('submitted_at')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('reviewed_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->text('remarks')->nullable();

            // Disbursement
            $table->foreignId('disbursed_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('disbursed_at')->nullable();
            $table->string('disbursement_method')->nullable(); // cash/bank_transfer/cheque
            $table->string('disbursement_reference')->nullable();

            $table->timestamps();

            // Indexes
            $table->index('application_no');
            $table->index('member_admission_id');
            $table->index('loan_product_id');
            $table->index('branch_id');
            $table->index('status');
            $table->index('proposed_start_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('loan_applications');
    }
};
