<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('member_admissions', function (Blueprint $table) {
            $table->json('selected_approvers')->nullable()->after('status'); // Store selected approver IDs
            $table->integer('revision_count')->default(0)->after('selected_approvers'); // How many times returned
            $table->text('revision_comments')->nullable()->after('revision_count'); // Comments from head office
            $table->timestamp('returned_at')->nullable()->after('revision_comments'); // When returned to branch
            $table->foreignId('returned_by')->nullable()->constrained('users')->after('returned_at'); // Who returned it
        });

        // Update member_admission_approvals to support return action
        Schema::table('member_admission_approvals', function (Blueprint $table) {
            // Add 'returned' to status enum
            DB::statement("ALTER TABLE member_admission_approvals MODIFY COLUMN status ENUM('pending', 'approved', 'rejected', 'returned') DEFAULT 'pending'");
        });
    }

    public function down(): void
    {
        Schema::table('member_admissions', function (Blueprint $table) {
            $table->dropForeign(['returned_by']);
            $table->dropColumn(['selected_approvers', 'revision_count', 'revision_comments', 'returned_at', 'returned_by']);
        });

        Schema::table('member_admission_approvals', function (Blueprint $table) {
            DB::statement("ALTER TABLE member_admission_approvals MODIFY COLUMN status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending'");
        });
    }
};
