<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Base64 image/signature data exceeds VARCHAR(255). Use LONGTEXT for photo/signature columns.
     */
    public function up(): void
    {
        Schema::table('savings_applications', function (Blueprint $table) {
            $table->longText('applicant_photo')->nullable()->change();
        });
        Schema::table('savings_applications', function (Blueprint $table) {
            $table->longText('applicant_signature')->nullable()->change();
        });
        Schema::table('savings_applications', function (Blueprint $table) {
            $table->longText('officer_signature')->nullable()->change();
        });
        Schema::table('savings_applications', function (Blueprint $table) {
            $table->longText('accountant_signature')->nullable()->change();
        });
        Schema::table('savings_applications', function (Blueprint $table) {
            $table->longText('branch_manager_signature')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('savings_applications', function (Blueprint $table) {
            $table->string('applicant_photo', 255)->nullable()->change();
        });
        Schema::table('savings_applications', function (Blueprint $table) {
            $table->string('applicant_signature', 255)->nullable()->change();
        });
        Schema::table('savings_applications', function (Blueprint $table) {
            $table->string('officer_signature', 255)->nullable()->change();
        });
        Schema::table('savings_applications', function (Blueprint $table) {
            $table->string('accountant_signature', 255)->nullable()->change();
        });
        Schema::table('savings_applications', function (Blueprint $table) {
            $table->string('branch_manager_signature', 255)->nullable()->change();
        });
    }
};
