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
        Schema::create('comments', function (Blueprint $table) {
            $table->id();

            // Polymorphic relationship
            $table->morphs('commentable');

            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->text('comment'); // Can be Bangla or English

            // AI suggestions for common issues
            $table->boolean('is_ai_suggested')->default(false);
            $table->string('suggestion_type')->nullable(); // document_missing, incorrect_data, etc.

            // Reply support
            $table->foreignId('parent_id')->nullable()->constrained('comments')->onDelete('cascade');

            $table->timestamps();
            $table->softDeletes();

            // morphs() already creates index for commentable_type and commentable_id
            $table->index('user_id');
            $table->index('parent_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('comments');
    }
};
