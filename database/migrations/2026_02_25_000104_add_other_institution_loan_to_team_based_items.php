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
        Schema::table('team_based_approval_items', function (Blueprint $table) {
            $table->decimal('other_institution_loan_amount', 15, 2)
                ->nullable()
                ->after('repaid_installment_no');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('team_based_approval_items', function (Blueprint $table) {
            $table->dropColumn('other_institution_loan_amount');
        });
    }
};

