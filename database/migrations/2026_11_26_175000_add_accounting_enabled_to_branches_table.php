<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('branches') && ! Schema::hasColumn('branches', 'accounting_enabled')) {
            Schema::table('branches', function (Blueprint $table) {
                $table->boolean('accounting_enabled')->default(false)->after('is_active');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('branches') && Schema::hasColumn('branches', 'accounting_enabled')) {
            Schema::table('branches', function (Blueprint $table) {
                $table->dropColumn('accounting_enabled');
            });
        }
    }
};
