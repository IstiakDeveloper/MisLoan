<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('member_admissions', function (Blueprint $table) {
            $table->string('surveyor_signature_path')->nullable()->after('employee_name');
            $table->string('surveyor_pin', 50)->nullable()->after('surveyor_signature_path');
            $table->string('submitted_by_signature_path')->nullable()->after('submitted_at');
            $table->string('submitted_by_pin', 50)->nullable()->after('submitted_by_signature_path');
        });
    }

    public function down(): void
    {
        Schema::table('member_admissions', function (Blueprint $table) {
            $table->dropColumn(['surveyor_signature_path', 'surveyor_pin', 'submitted_by_signature_path', 'submitted_by_pin']);
        });
    }
};
