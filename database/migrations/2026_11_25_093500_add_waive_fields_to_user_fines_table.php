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
        Schema::table('user_fines', function (Blueprint $table) {
            $table->foreignId('waived_by_id')->nullable()->after('resolved_by_id')->constrained('users')->nullOnDelete();
            $table->timestamp('waived_at')->nullable()->after('resolved_at');
            $table->text('waive_reason')->nullable()->after('waived_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('user_fines', function (Blueprint $table) {
            $table->dropForeign(['waived_by_id']);
            $table->dropColumn(['waived_by_id', 'waived_at', 'waive_reason']);
        });
    }
};
