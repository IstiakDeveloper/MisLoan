<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('help_guides')) {
            Schema::create('help_guides', function (Blueprint $table) {
                $table->id();
                $table->string('slug', 80)->unique();
                $table->unsignedInteger('part_number');
                $table->string('title_bn', 255);
                $table->string('summary_bn', 600);
                $table->json('roles');
                $table->json('steps_bn');
                $table->json('tips_bn')->nullable();
                $table->string('video_url', 500)->nullable();
                $table->string('video_duration', 32)->nullable();
                $table->boolean('is_published')->default(true);
                $table->timestamps();

                $table->index(['part_number', 'is_published']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('help_guides');
    }
};
