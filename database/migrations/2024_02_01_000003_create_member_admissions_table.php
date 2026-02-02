<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('member_admissions', function (Blueprint $table) {
            $table->id();
            $table->string('application_no')->unique();

            // Organization Info
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->foreignId('samity_id')->constrained()->onDelete('cascade');
            $table->foreignId('member_category_id')->constrained()->onDelete('restrict');

            // Dates
            $table->date('survey_date');
            $table->date('admission_date');

            // Personal Information - English
            $table->string('applicant_name_en');
            $table->string('father_name_en');
            $table->string('mother_name_en');
            $table->string('spouse_name_en')->nullable();

            // Personal Information - Bangla
            $table->string('applicant_name_bn');
            $table->string('father_name_bn');
            $table->string('mother_name_bn');
            $table->string('spouse_name_bn')->nullable();

            // Contact & Status
            $table->enum('marital_status', ['single', 'married', 'divorced', 'widowed']);
            $table->string('mobile_number', 20);
            $table->string('alternative_mobile', 20)->nullable();

            // Present Address
            $table->string('present_division');
            $table->string('present_district');
            $table->string('present_upazila');
            $table->string('present_union')->nullable();
            $table->string('present_village_road')->nullable();
            $table->string('present_post_code', 10)->nullable();

            // Permanent Address
            $table->boolean('permanent_address_same')->default(false);
            $table->string('permanent_division')->nullable();
            $table->string('permanent_district')->nullable();
            $table->string('permanent_upazila')->nullable();
            $table->string('permanent_union')->nullable();
            $table->string('permanent_village_road')->nullable();
            $table->string('permanent_post_code', 10)->nullable();

            // Identity Information
            $table->string('nid_number', 20)->nullable();
            $table->string('smart_card_number', 20)->nullable();
            $table->string('birth_certificate_number', 30)->nullable();
            $table->date('date_of_birth')->nullable();
            $table->enum('gender', ['male', 'female', 'other']);
            $table->string('family_member_mobile', 20)->nullable();

            // Co-Applicant/Guarantor
            $table->string('guarantor_name')->nullable();
            $table->string('guarantor_mobile', 20)->nullable();
            $table->string('tin_number', 20)->nullable();
            $table->boolean('want_sms_service')->default(true);

            // Economic Activities
            $table->text('business_details')->nullable();
            $table->text('job_details')->nullable();
            $table->text('other_income_details')->nullable();
            $table->decimal('total_asset_value', 15, 2)->nullable();
            $table->string('house_type')->nullable();

            // Property Information (Section 19.i - House Count)
            $table->integer('mud_house_count')->default(0);
            $table->integer('tin_house_count')->default(0);
            $table->integer('brick_house_count')->default(0);
            $table->integer('semi_brick_house_count')->default(0);

            // Livestock Information (Section 19.ii)
            $table->integer('cow_buffalo_count')->default(0);
            $table->integer('goat_sheep_count')->default(0);
            $table->integer('duck_chicken_count')->default(0);
            $table->string('other_livestock')->nullable();
            $table->integer('other_livestock_count')->default(0);

            // Land Information (Section 19.iii)
            $table->decimal('cultivable_land_amount', 10, 2)->nullable();
            $table->decimal('cultivable_land_value', 15, 2)->nullable();
            $table->decimal('non_cultivable_land_amount', 10, 2)->nullable();
            $table->decimal('non_cultivable_land_value', 15, 2)->nullable();

            // Financial Information (Section 20)
            $table->decimal('monthly_income', 12, 2)->nullable();
            $table->decimal('monthly_expense', 12, 2)->nullable();
            $table->decimal('monthly_savings', 12, 2)->nullable();

            // Additional Information (Section 21-22)
            $table->string('interviewer_name')->nullable();
            $table->string('employee_name')->nullable(); // গ্রাহক অন্তর্ভুক্তিকালীন কর্মকর্তার নাম
            $table->text('other_loan_info')->nullable();

            // Collector's Comment (Section 23)
            $table->text('collector_comment')->nullable();

            // Signatures and Documents
            $table->string('applicant_signature_path')->nullable();
            $table->string('customer_photo_path')->nullable(); // গ্রাহকের ছবি (Required)
            $table->string('customer_nid_photo_path')->nullable(); // গ্রাহকের NID (Required)
            $table->string('guardian_name')->nullable();
            $table->string('guardian_signature_path')->nullable();
            $table->string('guardian_photo_path')->nullable(); // অভিভাবকের ছবি (Optional)
            $table->string('guardian_nid_photo_path')->nullable(); // অভিভাবকের NID (Optional)

            // Status & Workflow
            $table->enum('status', ['draft', 'submitted', 'under_review', 'approved', 'rejected'])->default('draft');
            $table->foreignId('submitted_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('submitted_at')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('reviewed_at')->nullable();
            $table->text('rejection_reason')->nullable();

            $table->timestamps();

            // Indexes
            $table->index('branch_id');
            $table->index('samity_id');
            $table->index('member_category_id');
            $table->index('status');
            $table->index('admission_date');
            $table->index('mobile_number');
            $table->index('nid_number');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('member_admissions');
    }
};
