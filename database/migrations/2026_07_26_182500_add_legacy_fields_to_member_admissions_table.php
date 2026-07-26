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
            $table->boolean('is_legacy')->default(false)->after('created_by');
            $table->unsignedSmallInteger('loan_dofa')->nullable()->after('is_legacy');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('member_admissions', function (Blueprint $table) {
            $table->dropColumn(['is_legacy', 'loan_dofa']);
        });
    }
};
