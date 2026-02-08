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
        Schema::create('loan_categories', function (Blueprint $table) {
            $table->id();
            $table->string('category_name'); // জাগরণ, অগ্রসর, বুনিয়াদ, ENRICH, RMTP-SME, ECCCP-Drought
            $table->string('category_name_bn')->nullable(); // Bengali name
            $table->string('category_code')->unique(); // JAGARON, AGROSOR, etc.
            $table->text('description')->nullable();
            $table->text('description_bn')->nullable();
            $table->enum('target_group', ['male', 'female', 'both'])->default('both');
            $table->boolean('is_active')->default(true);
            $table->integer('display_order')->default(0);
            $table->timestamps();

            // Indexes
            $table->index('category_code');
            $table->index('is_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('loan_categories');
    }
};
