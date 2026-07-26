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
            $table->foreignId('member_admission_id')->nullable()->constrained()->onDelete('cascade');
            $table->foreignId('loan_product_id')->nullable()->constrained()->onDelete('restrict');
            $table->foreignId('loan_category_id')->nullable()->constrained()->onDelete('restrict');
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->foreignId('samity_id')->nullable()->constrained()->onDelete('cascade');

            // Form & Type
            $table->string('form_type')->nullable();

            // Loan Details
            $table->decimal('requested_amount', 15, 2)->nullable();
            $table->decimal('approved_amount', 15, 2)->nullable();
            $table->decimal('installment_amount', 12, 2)->nullable();
            $table->integer('number_of_installments')->nullable();
            $table->integer('loan_term_months')->nullable();
            $table->date('proposed_start_date')->nullable();
            $table->date('approved_start_date')->nullable();
            $table->date('expected_end_date')->nullable();

            // Purpose & Details
            $table->text('purpose_of_loan')->nullable();
            $table->json('loan_usage_plan')->nullable();
            $table->json('loan_usage_breakdown')->nullable();
            $table->json('business_plan')->nullable();
            $table->string('business_type')->nullable();
            $table->text('business_description')->nullable();
            $table->decimal('business_capital', 12, 2)->nullable();
            $table->decimal('business_income', 12, 2)->nullable();
            $table->text('repayment_source')->nullable();
            $table->string('repayment_frequency')->nullable();

            // Guarantor Information
            $table->json('guarantor_info')->nullable();
            $table->json('guarantors_list')->nullable();
            $table->json('family_members')->nullable();
            $table->json('nominee_info')->nullable();

            // Financial Assessment
            $table->decimal('monthly_income', 12, 2)->nullable();
            $table->json('monthly_income_breakdown')->nullable();
            $table->decimal('monthly_expense', 12, 2)->nullable();
            $table->json('monthly_expense_breakdown')->nullable();
            $table->json('income_sources')->nullable();
            $table->decimal('other_loan_amount', 12, 2)->default(0);
            $table->text('collateral_info')->nullable();
            $table->json('asset_info')->nullable();
            $table->json('asset_details')->nullable();
            $table->json('liability_details')->nullable();

            // Applicant Details
            $table->string('applicant_education')->nullable();
            $table->string('spouse_education')->nullable();
            $table->json('employment_details')->nullable();
            $table->json('risk_measures')->nullable();
            $table->boolean('has_savings_account')->default(false);
            $table->decimal('savings_amount', 12, 2)->nullable();
            $table->string('savings_account_type')->nullable();

            // Documents & Signatures
            $table->json('signatures')->nullable();
            $table->json('conditions_met')->nullable();
            $table->json('documents_submitted')->nullable();
            $table->text('officer_recommendation')->nullable();
            $table->text('manager_recommendation')->nullable();
            $table->text('committee_recommendation')->nullable();
            $table->string('applicant_photo')->nullable();
            $table->string('guarantor_photo')->nullable();

            // Excel Upload Fields (for bulk uploads)
            $table->string('excel_file_path')->nullable();
            $table->string('excel_file_name')->nullable();
            $table->integer('total_members')->nullable();

            // Status & Workflow
            $table->enum('status', [
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
            ])->default('draft');
            
            $table->foreignId('submitted_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('submitted_at')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamp('officer_reviewed_at')->nullable();
            $table->timestamp('manager_reviewed_at')->nullable();
            $table->timestamp('committee_reviewed_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->text('remarks')->nullable();
            $table->text('head_office_remarks')->nullable();
            $table->text('branch_remarks')->nullable();

            // Disbursement
            $table->foreignId('disbursed_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('disbursed_at')->nullable();
            $table->string('disbursement_method')->nullable();
            $table->string('disbursement_reference')->nullable();

            // Additional Data
            $table->json('loan_agreement_data')->nullable();
            $table->json('selected_approvers')->nullable();
            
            // Legacy Support
            $table->string('legacy_application_key')->nullable();
            $table->json('legacy_member_snapshot')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index('application_no');
            $table->index('member_admission_id');
            $table->index('loan_product_id');
            $table->index('branch_id');
            $table->index('status');
            $table->index('proposed_start_date');
            $table->index('submitted_at');
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
