<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Allow multiple institutions (e.g. "আশা ৫০০০, ব্রাক ২০০০").
     */
    public function up(): void
    {
        DB::statement('ALTER TABLE team_based_approval_items
            MODIFY COLUMN other_institution_loan_amount VARCHAR(500) NULL');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('ALTER TABLE team_based_approval_items
            MODIFY COLUMN other_institution_loan_amount VARCHAR(100) NULL');
    }
};
