<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('member_admissions', function (Blueprint $table) {
            $table->foreignId('assigned_officer_id')
                ->nullable()
                ->after('created_by')
                ->constrained('users')
                ->nullOnDelete();
            $table->index('assigned_officer_id');
        });

        // Existing members stay with whoever created/admitted them.
        DB::table('member_admissions')
            ->whereNull('assigned_officer_id')
            ->whereNotNull('created_by')
            ->update([
                'assigned_officer_id' => DB::raw('created_by'),
            ]);
    }

    public function down(): void
    {
        Schema::table('member_admissions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('assigned_officer_id');
        });
    }
};
