<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Allow text+number in these fields (e.g. "৮৩৪৩৮৫ টাঁকা").
     */
    public function up(): void
    {
        DB::statement('ALTER TABLE team_based_approval_items
            MODIFY COLUMN repaid_loan_amount VARCHAR(100) NULL,
            MODIFY COLUMN repaid_installment_no VARCHAR(100) NULL,
            MODIFY COLUMN other_institution_loan_amount VARCHAR(100) NULL,
            MODIFY COLUMN proposed_loan_amount VARCHAR(100) NULL');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('ALTER TABLE team_based_approval_items
            MODIFY COLUMN repaid_loan_amount DECIMAL(15,2) NULL,
            MODIFY COLUMN repaid_installment_no INT UNSIGNED NULL,
            MODIFY COLUMN other_institution_loan_amount DECIMAL(15,2) NULL,
            MODIFY COLUMN proposed_loan_amount DECIMAL(15,2) NULL');
    }
};
