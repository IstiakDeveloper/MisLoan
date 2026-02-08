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
        Schema::create('loan_products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('loan_category_id')->constrained()->onDelete('cascade');
            $table->string('product_name');
            $table->string('product_name_bn')->nullable();
            $table->string('product_code')->unique();
            $table->text('description')->nullable();
            $table->text('description_bn')->nullable();

            // Installment Configuration
            $table->enum('installment_type', ['weekly', 'monthly'])->default('monthly');
            $table->integer('duration_months');
            $table->integer('number_of_installments');

            // Amount Limits
            $table->decimal('min_amount', 15, 2);
            $table->decimal('max_amount', 15, 2);

            // Interest & Charges
            $table->decimal('interest_rate', 5, 2); // Percentage
            $table->decimal('service_charge', 5, 2)->default(0); // Percentage
            $table->enum('interest_calculation_type', ['flat', 'reducing', 'compound'])->default('flat');

            // Eligibility
            $table->enum('gender_restriction', ['male', 'female', 'both'])->default('both');
            $table->integer('min_age')->default(18);
            $table->integer('max_age')->default(65);
            $table->boolean('requires_guarantor')->default(true);
            $table->integer('number_of_guarantors')->default(1);

            // Additional Conditions (JSON)
            $table->json('eligibility_conditions')->nullable();
            $table->json('required_documents')->nullable();

            // Status
            $table->boolean('is_active')->default(true);
            $table->integer('display_order')->default(0);

            $table->timestamps();

            // Indexes
            $table->index('loan_category_id');
            $table->index('product_code');
            $table->index('installment_type');
            $table->index('is_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('loan_products');
    }
};
