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
        Schema::table('loan_application_issues', function (Blueprint $table) {
            $table->text('response_message')->nullable()->after('issue_description');
            $table->foreignId('responded_by')->nullable()->constrained('users')->onDelete('set null')->after('response_message');
            $table->timestamp('responded_at')->nullable()->after('responded_by');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('loan_application_issues', function (Blueprint $table) {
            $table->dropForeign(['responded_by']);
            $table->dropColumn(['response_message', 'responded_by', 'responded_at']);
        });
    }
};
