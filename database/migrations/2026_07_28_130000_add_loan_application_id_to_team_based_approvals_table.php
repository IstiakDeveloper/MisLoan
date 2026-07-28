<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('team_based_approvals', function (Blueprint $table) {
            if (! Schema::hasColumn('team_based_approvals', 'loan_application_id')) {
                $table->foreignId('loan_application_id')
                    ->nullable()
                    ->after('branch_id')
                    ->constrained('loan_applications')
                    ->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('team_based_approvals', function (Blueprint $table) {
            if (Schema::hasColumn('team_based_approvals', 'loan_application_id')) {
                $table->dropForeign(['loan_application_id']);
                $table->dropColumn('loan_application_id');
            }
        });
    }
};
