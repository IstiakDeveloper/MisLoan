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
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');

            // Activity details
            $table->string('log_type'); // login, logout, create, update, delete, approve, reject
            $table->string('module'); // user, loan, member, branch, etc.

            // Entity reference
            $table->nullableMorphs('loggable');

            $table->text('description'); // Can be Bangla or English
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();

            // Request info
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent')->nullable();

            $table->timestamps();

            $table->index('user_id');
            // nullableMorphs() already creates index for loggable_type and loggable_id
            $table->index('log_type');
            $table->index('module');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};
