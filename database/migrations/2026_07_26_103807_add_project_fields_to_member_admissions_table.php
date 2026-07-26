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
        Schema::table('member_admissions', function (Blueprint $table) {
            $table->decimal('requested_loan_amount', 12, 2)->nullable()->after('other_loan_info');
            $table->string('project_name')->nullable()->after('requested_loan_amount');
            $table->decimal('estimated_annual_project_income', 12, 2)->nullable()->after('project_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('member_admissions', function (Blueprint $table) {
            $table->dropColumn(['requested_loan_amount', 'project_name', 'estimated_annual_project_income']);
        });
    }
};
