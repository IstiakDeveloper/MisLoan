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
        Schema::create('team_based_approval_reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_based_approval_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('level', 50)->nullable(); // area_manager, zone_manager, admf, dmf, ed
            $table->string('status', 30)->default('pending'); // pending, approved, rejected
            $table->text('comments')->nullable();
            $table->string('approver_signature')->nullable();
            $table->timestamp('decided_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('team_based_approval_reviews');
    }
};

