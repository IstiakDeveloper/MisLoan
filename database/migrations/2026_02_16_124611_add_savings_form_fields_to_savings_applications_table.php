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
        Schema::table('savings_applications', function (Blueprint $table) {
            // Office use fields
            $table->date('account_opening_date')->nullable()->after('maturity_date');
            $table->decimal('monthly_savings_amount', 12, 2)->nullable()->after('account_opening_date');
            $table->integer('term_years')->nullable()->after('monthly_savings_amount'); // 5 or 10
            $table->string('account_no')->nullable()->after('term_years');
            $table->string('member_no')->nullable()->after('account_no');
            
            // Applicant details (additional fields)
            $table->string('applicant_photo')->nullable()->after('member_no');
            $table->text('current_address')->nullable()->after('applicant_photo');
            $table->text('permanent_address')->nullable()->after('current_address');
            $table->string('profession')->nullable()->after('permanent_address');
            $table->string('source_of_income')->nullable()->after('profession');
            
            // Nominee additional fields (photos, signatures stored in JSON)
            // nominee_info JSON already exists, will store: name, relation, mobile, nid, address, percentage, photo, signature, birth_registration_no
            
            // Monthly deposit submission date
            $table->date('monthly_deposit_submission_date')->nullable()->after('source_of_income');
            
            // Signatures with PINs
            $table->string('applicant_signature')->nullable()->after('monthly_deposit_submission_date');
            $table->string('officer_signature')->nullable()->after('applicant_signature');
            $table->string('officer_pin')->nullable()->after('officer_signature');
            $table->string('accountant_signature')->nullable()->after('officer_pin');
            $table->string('accountant_pin')->nullable()->after('accountant_signature');
            $table->string('branch_manager_signature')->nullable()->after('accountant_pin');
            $table->string('branch_manager_pin')->nullable()->after('branch_manager_signature');
            
            // Form data JSON (to store complete form data similar to loan applications)
            $table->json('form_data')->nullable()->after('branch_manager_pin');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('savings_applications', function (Blueprint $table) {
            $table->dropColumn([
                'account_opening_date',
                'monthly_savings_amount',
                'term_years',
                'account_no',
                'member_no',
                'applicant_photo',
                'current_address',
                'permanent_address',
                'profession',
                'source_of_income',
                'monthly_deposit_submission_date',
                'applicant_signature',
                'officer_signature',
                'officer_pin',
                'accountant_signature',
                'accountant_pin',
                'branch_manager_signature',
                'branch_manager_pin',
                'form_data',
            ]);
        });
    }
};
