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
        Schema::create('recent_deletions', function (Blueprint $table) {
            $table->id();
            $table->string('deletable_type'); // 'member_admission' or 'loan_application'
            $table->unsignedBigInteger('deletable_id')->nullable();
            $table->string('application_no')->index();
            $table->string('applicant_name');
            $table->string('applicant_phone')->nullable();
            $table->unsignedBigInteger('branch_id')->nullable()->index();
            $table->string('branch_name')->nullable();
            $table->string('branch_code')->nullable();
            $table->string('samity_name')->nullable();
            $table->decimal('amount', 14, 2)->nullable();
            $table->string('status_at_deletion')->nullable();

            // Who deleted the record
            $table->foreignId('deleted_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('deleted_by_name');
            $table->string('deleted_by_username')->nullable();
            $table->string('deleted_by_role')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent')->nullable();

            // Full snapshot of deleted data for audit
            $table->json('deleted_data')->nullable();

            $table->timestamp('deleted_at')->useCurrent()->index();
            $table->timestamps();

            $table->index(['deletable_type', 'deleted_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('recent_deletions');
    }
};
