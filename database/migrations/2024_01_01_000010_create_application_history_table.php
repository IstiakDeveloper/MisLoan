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
        Schema::create('application_history', function (Blueprint $table) {
            $table->id();

            // Polymorphic relationship - can be loan_application or member_admission
            $table->morphs('application');

            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('action'); // submitted, reviewed, approved, rejected, correction_requested, resubmitted
            $table->string('previous_status')->nullable();
            $table->string('new_status');
            $table->text('remarks')->nullable(); // Can be Bangla or English
            $table->json('metadata')->nullable(); // Additional data
            $table->timestamps();

            // morphs() already creates index for application_type and application_id
            $table->index('user_id');
            $table->index('action');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('application_history');
    }
};
