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
        Schema::create('team_based_approval_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_based_approval_id')->constrained()->onDelete('cascade');

            $table->unsignedInteger('serial_no')->default(1);

            // Member & samity info
            $table->string('member_name');
            $table->string('member_code')->nullable();
            $table->string('samity_number')->nullable();

            // Savings (monetary amounts in BDT)
            $table->decimal('savings_general', 15, 2)->nullable();
            $table->decimal('savings_other', 15, 2)->nullable();
            $table->decimal('savings_total', 15, 2)->nullable();

            // Loan info
            $table->decimal('repaid_loan_amount', 15, 2)->nullable();
            $table->unsignedInteger('repaid_installment_no')->nullable();
            $table->decimal('proposed_loan_amount', 15, 2)->nullable();

            // Loan term in years (1, 1.5, 2, 3 etc.)
            $table->decimal('loan_term_years', 3, 1)->nullable();

            $table->string('loan_type')->nullable();
            $table->string('project_name')->nullable();

            $table->timestamps();

            $table->index('team_based_approval_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('team_based_approval_items');
    }
};

