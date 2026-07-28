<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            if (! Schema::hasColumn('branches', 'login_pin')) {
                $table->string('login_pin')->nullable()->after('is_active');
            }
            if (! Schema::hasColumn('branches', 'branch_user_id')) {
                $table->foreignId('branch_user_id')->nullable()->after('login_pin')->constrained('users')->nullOnDelete();
            }
        });

        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'account_type')) {
                $table->string('account_type', 20)->default('staff')->after('role_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            if (Schema::hasColumn('branches', 'branch_user_id')) {
                $table->dropConstrainedForeignId('branch_user_id');
            }
            if (Schema::hasColumn('branches', 'login_pin')) {
                $table->dropColumn('login_pin');
            }
        });

        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'account_type')) {
                $table->dropColumn('account_type');
            }
        });
    }
};
