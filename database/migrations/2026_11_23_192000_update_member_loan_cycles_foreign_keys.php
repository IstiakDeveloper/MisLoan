<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('member_loan_cycles')) {
            return;
        }

        if (DB::getDriverName() !== 'sqlite') {
            Schema::table('member_loan_cycles', function (Blueprint $table) {
                $table->dropForeign(['source_loan_id']);
                $table->dropForeign(['loan_id']);
                $table->dropForeign(['source_admission_id']);
            });

            Schema::table('member_loan_cycles', function (Blueprint $table) {
                $table->unsignedBigInteger('source_loan_id')->nullable()->change();
                $table->unsignedBigInteger('source_admission_id')->nullable()->change();

                $table->foreign('source_loan_id')->references('id')->on('loan_applications')->nullOnDelete();
                $table->foreign('loan_id')->references('id')->on('loan_applications')->nullOnDelete();
                $table->foreign('source_admission_id')->references('id')->on('member_admissions')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('member_loan_cycles')) {
            return;
        }

        if (DB::getDriverName() !== 'sqlite') {
            Schema::table('member_loan_cycles', function (Blueprint $table) {
                $table->dropForeign(['source_loan_id']);
                $table->dropForeign(['loan_id']);
                $table->dropForeign(['source_admission_id']);
            });

            Schema::table('member_loan_cycles', function (Blueprint $table) {
                $table->unsignedBigInteger('source_loan_id')->nullable(false)->change();
                $table->unsignedBigInteger('source_admission_id')->nullable(false)->change();

                $table->foreign('source_loan_id')->references('id')->on('loan_applications')->restrictOnDelete();
                $table->foreign('loan_id')->references('id')->on('loan_applications')->restrictOnDelete();
                $table->foreign('source_admission_id')->references('id')->on('member_admissions')->restrictOnDelete();
            });
        }
    }
};
