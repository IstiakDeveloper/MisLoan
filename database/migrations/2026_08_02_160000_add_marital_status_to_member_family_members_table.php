<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('member_family_members', function (Blueprint $table) {
            $table->string('marital_status', 20)->nullable()->after('age_months');
        });
    }

    public function down(): void
    {
        Schema::table('member_family_members', function (Blueprint $table) {
            $table->dropColumn('marital_status');
        });
    }
};
