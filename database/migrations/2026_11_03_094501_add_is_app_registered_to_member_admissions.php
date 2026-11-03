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
            if (! Schema::hasColumn('member_admissions', 'is_app_registered')) {
                $table->boolean('is_app_registered')->default(false)->after('status')->index();
            }
            if (! Schema::hasColumn('member_admissions', 'app_registered_at')) {
                $table->timestamp('app_registered_at')->nullable()->after('is_app_registered');
            }
            if (! Schema::hasColumn('member_admissions', 'app_registered_by')) {
                $table->foreignId('app_registered_by')->nullable()->after('app_registered_at')->constrained('users')->nullOnDelete();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('member_admissions', function (Blueprint $table) {
            if (Schema::hasColumn('member_admissions', 'app_registered_by')) {
                $table->dropForeign(['app_registered_by']);
                $table->dropColumn('app_registered_by');
            }
            if (Schema::hasColumn('member_admissions', 'app_registered_at')) {
                $table->dropColumn('app_registered_at');
            }
            if (Schema::hasColumn('member_admissions', 'is_app_registered')) {
                $table->dropColumn('is_app_registered');
            }
        });
    }
};

