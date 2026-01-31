<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('admission_members', function (Blueprint $table) {
            // Head office review tracking
            $table->timestamp('head_office_reviewed_at')->nullable()->after('status');
            $table->bigInteger('head_office_reviewed_by')->nullable()->after('head_office_reviewed_at');
            $table->text('head_office_remarks')->nullable()->after('head_office_reviewed_by');

            // Status tracking when data comes back from head office
            $table->enum('head_office_decision', ['approved', 'rejected', 'needs_correction', 'pending'])->default('pending')->after('head_office_remarks');

            // Branch feedback after head office review
            $table->timestamp('branch_feedback_at')->nullable()->after('head_office_decision');
            $table->text('branch_correction_remarks')->nullable()->after('branch_feedback_at');
        });
    }

    public function down(): void
    {
        Schema::table('admission_members', function (Blueprint $table) {
            $table->dropColumn([
                'head_office_reviewed_at',
                'head_office_reviewed_by',
                'head_office_remarks',
                'head_office_decision',
                'branch_feedback_at',
                'branch_correction_remarks',
            ]);
        });
    }
};
