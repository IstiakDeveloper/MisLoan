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
        Schema::create('rejection_reasons', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('reason'); // Can be Bangla or English
            $table->text('description')->nullable();

            // AI suggestion - predefined reasons
            $table->boolean('is_common')->default(false);
            $table->integer('usage_count')->default(0);

            $table->enum('category', ['documentation', 'eligibility', 'verification', 'data_error', 'other'])
                  ->default('other');

            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('code');
            $table->index('is_common');
            $table->index('category');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rejection_reasons');
    }
};
