<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Allow multiple institutions (e.g. "আশা ৫০০০, ব্রাক ২০০০").
     */
    public function up(): void
    {
        Schema::table('team_based_approval_items', function (Blueprint $table) {
            $table->string('other_institution_loan_amount', 500)->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('team_based_approval_items', function (Blueprint $table) {
            $table->string('other_institution_loan_amount', 100)->nullable()->change();
        });
    }
};
