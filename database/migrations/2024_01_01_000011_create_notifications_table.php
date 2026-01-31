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
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');

            // Notification details (Can be Bangla or English)
            $table->string('type'); // loan_application, member_admission, approval, rejection, etc.
            $table->string('title');
            $table->text('message');

            // Related entity (polymorphic)
            $table->nullableMorphs('notifiable');

            // Notification metadata
            $table->json('data')->nullable();
            $table->string('action_url')->nullable();

            // Status
            $table->boolean('is_read')->default(false);
            $table->timestamp('read_at')->nullable();
            $table->boolean('is_sent_email')->default(false);
            $table->timestamp('email_sent_at')->nullable();

            $table->timestamps();

            $table->index('user_id');
            // nullableMorphs() already creates index for notifiable_type and notifiable_id
            $table->index('is_read');
            $table->index('type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
