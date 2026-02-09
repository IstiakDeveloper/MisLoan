<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('loan_applications', function (Blueprint $table) {
            // Change form_type from tinyint to varchar
            DB::statement('ALTER TABLE loan_applications MODIFY form_type VARCHAR(50) NULL DEFAULT NULL');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('loan_applications', function (Blueprint $table) {
            // Revert back to tinyint
            DB::statement('ALTER TABLE loan_applications MODIFY form_type TINYINT NOT NULL DEFAULT 1');
        });
    }
};
