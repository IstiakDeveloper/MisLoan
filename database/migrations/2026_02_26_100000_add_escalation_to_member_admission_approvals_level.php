<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('member_admission_approvals', function (Blueprint $table) {
            $table->enum('level', ['branch', 'area', 'zone', 'head_office', 'escalation'])->change();
        });
    }

    public function down(): void
    {
        Schema::table('member_admission_approvals', function (Blueprint $table) {
            $table->enum('level', ['branch', 'area', 'zone', 'head_office'])->change();
        });
    }
};
