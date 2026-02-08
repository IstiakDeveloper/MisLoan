<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loan_applications', function (Blueprint $table) {
            // Repayment terms
            $table->string('repayment_frequency')->nullable()->after('loan_category_id');
            $table->integer('loan_term_months')->nullable()->after('repayment_frequency');

            // Family Members info
            $table->json('family_members')->nullable()->after('guarantor_info');

            // Nominee Information
            $table->json('nominee_info')->nullable()->after('family_members');

            // Income sources
            $table->json('income_sources')->nullable()->after('monthly_expense');

            // Asset Information
            $table->json('asset_info')->nullable()->after('collateral_info');

            // Educational Information
            $table->string('applicant_education')->nullable()->after('asset_info');
            $table->string('spouse_education')->nullable()->after('applicant_education');

            // Employment details
            $table->json('employment_details')->nullable()->after('spouse_education');

            // Loan Usage Plan
            $table->text('loan_usage_plan')->nullable()->after('purpose_of_loan');
            $table->json('loan_usage_breakdown')->nullable()->after('loan_usage_plan');

            // Business Information
            $table->string('business_type')->nullable()->after('business_plan');
            $table->text('business_description')->nullable()->after('business_type');
            $table->decimal('business_capital', 12, 2)->nullable()->after('business_description');
            $table->decimal('business_income', 12, 2)->nullable()->after('business_capital');

            // Detailed Financial Info
            $table->json('monthly_income_breakdown')->nullable()->after('monthly_income');
            $table->json('monthly_expense_breakdown')->nullable()->after('monthly_expense');
            $table->json('asset_details')->nullable()->after('asset_info');
            $table->json('liability_details')->nullable()->after('asset_details');

            // Risk Assessment
            $table->json('risk_measures')->nullable()->after('liability_details');

            // Savings Information
            $table->boolean('has_savings_account')->default(false)->after('risk_measures');
            $table->decimal('savings_amount', 12, 2)->nullable()->after('has_savings_account');
            $table->string('savings_account_type')->nullable()->after('savings_amount');

            // Multiple Guarantors
            $table->json('guarantors_list')->nullable()->after('guarantor_info');

            // Signatures
            $table->json('signatures')->nullable()->after('guarantors_list');

            // Conditions and Documents
            $table->json('conditions_met')->nullable()->after('signatures');
            $table->json('documents_submitted')->nullable()->after('conditions_met');

            // Recommendations
            $table->text('officer_recommendation')->nullable()->after('remarks');
            $table->text('manager_recommendation')->nullable()->after('officer_recommendation');
            $table->text('committee_recommendation')->nullable()->after('manager_recommendation');

            // Photos
            $table->string('applicant_photo')->nullable()->after('committee_recommendation');
            $table->string('guarantor_photo')->nullable()->after('applicant_photo');

            // Approval workflow timestamps
            $table->timestamp('officer_reviewed_at')->nullable()->after('reviewed_at');
            $table->timestamp('manager_reviewed_at')->nullable()->after('officer_reviewed_at');
            $table->timestamp('committee_reviewed_at')->nullable()->after('manager_reviewed_at');
        });
    }

    public function down(): void
    {
        Schema::table('loan_applications', function (Blueprint $table) {
            $table->dropColumn([
                'repayment_frequency',
                'loan_term_months',
                'family_members',
                'nominee_info',
                'income_sources',
                'asset_info',
                'applicant_education',
                'spouse_education',
                'employment_details',
                'loan_usage_plan',
                'loan_usage_breakdown',
                'business_type',
                'business_description',
                'business_capital',
                'business_income',
                'monthly_income_breakdown',
                'monthly_expense_breakdown',
                'asset_details',
                'liability_details',
                'risk_measures',
                'has_savings_account',
                'savings_amount',
                'savings_account_type',
                'guarantors_list',
                'signatures',
                'conditions_met',
                'documents_submitted',
                'officer_recommendation',
                'manager_recommendation',
                'committee_recommendation',
                'applicant_photo',
                'guarantor_photo',
                'officer_reviewed_at',
                'manager_reviewed_at',
                'committee_reviewed_at',
            ]);
        });
    }
};
