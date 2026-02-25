<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE member_admission_approvals MODIFY COLUMN level ENUM('branch', 'area', 'zone', 'escalation', 'head_office') NOT NULL");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE member_admission_approvals MODIFY COLUMN level ENUM('branch', 'area', 'zone', 'head_office') NOT NULL");
    }
};
