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
        Schema::table('team_based_approval_reviews', function (Blueprint $table) {
            if (! Schema::hasColumn('team_based_approval_reviews', 'team_based_approval_item_id')) {
                $table->foreignId('team_based_approval_item_id')
                    ->nullable()
                    ->after('team_based_approval_id')
                    ->constrained('team_based_approval_items')
                    ->nullOnDelete();
            }
        });

        Schema::table('team_based_approval_items', function (Blueprint $table) {
            if (! Schema::hasColumn('team_based_approval_items', 'approved_amount')) {
                $table->decimal('approved_amount', 15, 2)->nullable()->after('proposed_loan_amount');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('team_based_approval_reviews', function (Blueprint $table) {
            if (Schema::hasColumn('team_based_approval_reviews', 'team_based_approval_item_id')) {
                $table->dropForeign(['team_based_approval_item_id']);
                $table->dropColumn('team_based_approval_item_id');
            }
        });

        Schema::table('team_based_approval_items', function (Blueprint $table) {
            if (Schema::hasColumn('team_based_approval_items', 'approved_amount')) {
                $table->dropColumn('approved_amount');
            }
        });
    }
};

