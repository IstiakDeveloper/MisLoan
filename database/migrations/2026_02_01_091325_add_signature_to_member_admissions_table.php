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
            $table->string('applicant_signature')->nullable()->after('collector_comment');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('member_admissions', function (Blueprint $table) {
            $table->dropColumn('applicant_signature');
        });
    }
};
