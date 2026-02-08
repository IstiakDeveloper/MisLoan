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
        Schema::create('savings_products', function (Blueprint $table) {
            $table->id();
            $table->string('product_name');
            $table->string('product_name_bn')->nullable();
            $table->string('product_code')->unique();
            $table->text('description')->nullable();
            $table->text('description_bn')->nullable();

            // Savings Configuration
            $table->enum('deposit_type', ['monthly', 'lump_sum', 'recurring'])->default('monthly');
            $table->integer('duration_months');

            // Amount Limits
            $table->decimal('min_amount', 15, 2);
            $table->decimal('max_amount', 15, 2)->nullable();
            $table->decimal('monthly_installment', 12, 2)->nullable();

            // Interest & Profit
            $table->decimal('interest_rate', 5, 2); // Annual percentage
            $table->enum('profit_distribution_type', ['maturity', 'monthly', 'quarterly', 'yearly'])->default('maturity');

            // Maturity
            $table->boolean('premature_withdrawal_allowed')->default(false);
            $table->decimal('premature_withdrawal_penalty', 5, 2)->default(0);
            $table->json('maturity_conditions')->nullable();

            // Eligibility
            $table->integer('min_age')->default(18);
            $table->integer('max_age')->default(70);
            $table->boolean('requires_nominee')->default(true);

            // Status
            $table->boolean('is_active')->default(true);
            $table->integer('display_order')->default(0);

            $table->timestamps();

            // Indexes
            $table->index('product_code');
            $table->index('deposit_type');
            $table->index('is_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('savings_products');
    }
};
