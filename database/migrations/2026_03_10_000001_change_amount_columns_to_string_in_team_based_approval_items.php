<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Allow text+number in these fields (e.g. "৮৩৪৩৮৫ টাঁকা").
     */
    public function up(): void
    {
        Schema::table('team_based_approval_items', function (Blueprint $table) {
            $table->string('repaid_loan_amount', 100)->nullable()->change();
            $table->string('repaid_installment_no', 100)->nullable()->change();
            $table->string('other_institution_loan_amount', 100)->nullable()->change();
            $table->string('proposed_loan_amount', 100)->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('team_based_approval_items', function (Blueprint $table) {
            $table->decimal('repaid_loan_amount', 15, 2)->nullable()->change();
            $table->unsignedInteger('repaid_installment_no')->nullable()->change();
            $table->decimal('other_institution_loan_amount', 15, 2)->nullable()->change();
            $table->decimal('proposed_loan_amount', 15, 2)->nullable()->change();
        });
    }
};
