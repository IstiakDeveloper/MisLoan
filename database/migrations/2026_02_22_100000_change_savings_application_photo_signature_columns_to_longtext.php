<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Base64 image/signature data exceeds VARCHAR(255). Use LONGTEXT for photo/signature columns.
     */
    public function up(): void
    {
        DB::statement('ALTER TABLE savings_applications MODIFY applicant_photo LONGTEXT NULL');
        DB::statement('ALTER TABLE savings_applications MODIFY applicant_signature LONGTEXT NULL');
        DB::statement('ALTER TABLE savings_applications MODIFY officer_signature LONGTEXT NULL');
        DB::statement('ALTER TABLE savings_applications MODIFY accountant_signature LONGTEXT NULL');
        DB::statement('ALTER TABLE savings_applications MODIFY branch_manager_signature LONGTEXT NULL');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('ALTER TABLE savings_applications MODIFY applicant_photo VARCHAR(255) NULL');
        DB::statement('ALTER TABLE savings_applications MODIFY applicant_signature VARCHAR(255) NULL');
        DB::statement('ALTER TABLE savings_applications MODIFY officer_signature VARCHAR(255) NULL');
        DB::statement('ALTER TABLE savings_applications MODIFY accountant_signature VARCHAR(255) NULL');
        DB::statement('ALTER TABLE savings_applications MODIFY branch_manager_signature VARCHAR(255) NULL');
    }
};
