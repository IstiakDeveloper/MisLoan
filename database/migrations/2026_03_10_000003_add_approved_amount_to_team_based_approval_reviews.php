<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('team_based_approval_reviews', function (Blueprint $table) {
            if (! Schema::hasColumn('team_based_approval_reviews', 'approved_amount')) {
                $table->decimal('approved_amount', 15, 2)->nullable()->after('comments');
            }
        });
    }

    public function down(): void
    {
        Schema::table('team_based_approval_reviews', function (Blueprint $table) {
            if (Schema::hasColumn('team_based_approval_reviews', 'approved_amount')) {
                $table->dropColumn('approved_amount');
            }
        });
    }
};

