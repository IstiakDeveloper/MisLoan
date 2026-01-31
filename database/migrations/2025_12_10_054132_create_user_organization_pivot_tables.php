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
        // User can be assigned to multiple zones
        Schema::create('user_zones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('zone_id')->constrained()->onDelete('cascade');
            $table->timestamps();

            $table->unique(['user_id', 'zone_id']);
            $table->index('user_id');
            $table->index('zone_id');
        });

        // User can be assigned to multiple areas
        Schema::create('user_areas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('area_id')->constrained()->onDelete('cascade');
            $table->timestamps();

            $table->unique(['user_id', 'area_id']);
            $table->index('user_id');
            $table->index('area_id');
        });

        // User can be assigned to multiple branches
        Schema::create('user_branches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->timestamps();

            $table->unique(['user_id', 'branch_id']);
            $table->index('user_id');
            $table->index('branch_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_branches');
        Schema::dropIfExists('user_areas');
        Schema::dropIfExists('user_zones');
    }
};
