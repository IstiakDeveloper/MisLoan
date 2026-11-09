<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loan_applications', function (Blueprint $table) {
            $table->enum('status', ['draft', 'pending', 'submitted', 'under_review', 'ready_for_head_office', 'pending_head_office', 'approved', 'rejected', 'disbursed', 'cancelled', 'needs_correction'])->default('draft')->change();
        });
    }

    public function down(): void
    {
        DB::table('loan_applications')
            ->where('status', 'ready_for_head_office')
            ->update(['status' => 'submitted']);

        Schema::table('loan_applications', function (Blueprint $table) {
            $table->enum('status', ['draft', 'pending', 'submitted', 'under_review', 'pending_head_office', 'approved', 'rejected', 'disbursed', 'cancelled', 'needs_correction'])->default('draft')->change();
        });
    }
};
