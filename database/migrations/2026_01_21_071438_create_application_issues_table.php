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
        Schema::create('application_issues', function (Blueprint $table) {
            $table->id();

            // Application type (admission or loan)
            $table->string('application_type'); // 'admission' or 'loan'
            $table->unsignedBigInteger('application_id');
            $table->unsignedBigInteger('member_id');

            // Issue details
            $table->string('issue_type');
            $table->text('issue_description');
            $table->enum('severity', ['critical', 'warning', 'info'])->default('warning');
            $table->enum('status', ['open', 'assigned', 'resolved', 'rejected'])->default('open');

            // Who created/resolved
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('resolved_by')->nullable();
            $table->timestamp('resolved_at')->nullable();

            // Messages and communication
            $table->json('messages')->nullable(); // Store all messages as JSON
            $table->text('resolution_notes')->nullable();

            // Email tracking
            $table->boolean('email_sent_to_branch')->default(false);
            $table->timestamp('email_sent_at')->nullable();
            $table->boolean('email_sent_to_headoffice')->default(false);
            $table->timestamp('headoffice_email_sent_at')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index(['application_type', 'application_id']);
            $table->index(['member_id']);
            $table->index(['status']);
            $table->index(['created_by']);
            $table->index(['resolved_by']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('application_issues');
    }
};
