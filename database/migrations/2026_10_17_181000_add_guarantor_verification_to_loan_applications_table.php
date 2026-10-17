<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loan_applications', function (Blueprint $table) {
            if (! Schema::hasColumn('loan_applications', 'guarantor_verified_at')) {
                $table->timestamp('guarantor_verified_at')->nullable()->after('manager_reviewed_at');
            }
            if (! Schema::hasColumn('loan_applications', 'guarantor_verified_by')) {
                $table->foreignId('guarantor_verified_by')->nullable()->after('guarantor_verified_at')->constrained('users')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('loan_applications', function (Blueprint $table) {
            if (Schema::hasColumn('loan_applications', 'guarantor_verified_by')) {
                $table->dropForeign(['guarantor_verified_by']);
                $table->dropColumn('guarantor_verified_by');
            }
            if (Schema::hasColumn('loan_applications', 'guarantor_verified_at')) {
                $table->dropColumn('guarantor_verified_at');
            }
        });
    }
};
