<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Allow incomplete drafts: required fields are enforced on submit, not on save.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('member_admissions', function (Blueprint $table) {
            $table->dropForeign(['branch_id']);
            $table->dropForeign(['samity_id']);
            $table->dropForeign(['member_category_id']);
        });

        Schema::table('member_admissions', function (Blueprint $table) {
            $table->unsignedBigInteger('branch_id')->nullable()->change();
            $table->unsignedBigInteger('samity_id')->nullable()->change();
            $table->unsignedBigInteger('member_category_id')->nullable()->change();

            $table->date('survey_date')->nullable()->change();
            $table->date('admission_date')->nullable()->change();

            $table->string('applicant_name_en')->nullable()->change();
            $table->string('father_name_en')->nullable()->change();
            $table->string('mother_name_en')->nullable()->change();
            $table->string('applicant_name_bn')->nullable()->change();
            $table->string('father_name_bn')->nullable()->change();
            $table->string('mother_name_bn')->nullable()->change();

            $table->string('marital_status', 20)->nullable()->change();
            $table->string('mobile_number', 20)->nullable()->change();

            $table->string('present_division')->nullable()->change();
            $table->string('present_district')->nullable()->change();
            $table->string('present_upazila')->nullable()->change();

            $table->string('gender', 20)->nullable()->change();
        });

        Schema::table('member_admissions', function (Blueprint $table) {
            $table->foreign('branch_id')->references('id')->on('branches')->nullOnDelete();
            $table->foreign('samity_id')->references('id')->on('samities')->nullOnDelete();
            $table->foreign('member_category_id')->references('id')->on('member_categories')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('member_admissions', function (Blueprint $table) {
            $table->dropForeign(['branch_id']);
            $table->dropForeign(['samity_id']);
            $table->dropForeign(['member_category_id']);
        });

        Schema::table('member_admissions', function (Blueprint $table) {
            $table->unsignedBigInteger('branch_id')->nullable(false)->change();
            $table->unsignedBigInteger('samity_id')->nullable(false)->change();
            $table->unsignedBigInteger('member_category_id')->nullable(false)->change();

            $table->date('survey_date')->nullable(false)->change();
            $table->date('admission_date')->nullable(false)->change();

            $table->string('applicant_name_en')->nullable(false)->change();
            $table->string('father_name_en')->nullable(false)->change();
            $table->string('mother_name_en')->nullable(false)->change();
            $table->string('applicant_name_bn')->nullable(false)->change();
            $table->string('father_name_bn')->nullable(false)->change();
            $table->string('mother_name_bn')->nullable(false)->change();

            $table->string('marital_status', 20)->nullable(false)->change();
            $table->string('mobile_number', 20)->nullable(false)->change();

            $table->string('present_division')->nullable(false)->change();
            $table->string('present_district')->nullable(false)->change();
            $table->string('present_upazila')->nullable(false)->change();

            $table->string('gender', 20)->nullable(false)->change();
        });

        Schema::table('member_admissions', function (Blueprint $table) {
            $table->foreign('branch_id')->references('id')->on('branches')->cascadeOnDelete();
            $table->foreign('samity_id')->references('id')->on('samities')->cascadeOnDelete();
            $table->foreign('member_category_id')->references('id')->on('member_categories')->restrictOnDelete();
        });
    }
};
