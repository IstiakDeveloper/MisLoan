<?php

use App\Models\SavingsCategory;
use App\Models\SavingsProduct;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

beforeEach(function () {
    Schema::dropIfExists('savings_products');
    Schema::dropIfExists('savings_categories');

    Schema::create('savings_categories', function (Blueprint $table) {
        $table->id();
        $table->string('category_name');
        $table->string('category_name_bn')->nullable();
        $table->string('category_code')->unique();
        $table->text('description')->nullable();
        $table->text('description_bn')->nullable();
        $table->boolean('is_active')->default(true);
        $table->integer('display_order')->default(0);
        $table->timestamps();
    });

    Schema::create('savings_products', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('savings_category_id')->nullable();
        $table->string('product_name');
        $table->string('product_name_bn')->nullable();
        $table->string('product_code')->unique();
        $table->string('deposit_type')->default('monthly');
        $table->integer('duration_months')->default(12);
        $table->decimal('min_amount', 15, 2)->default(100);
        $table->decimal('max_amount', 15, 2)->nullable();
        $table->decimal('interest_rate', 5, 2)->default(0);
        $table->boolean('is_active')->default(true);
        $table->integer('display_order')->default(0);
        $table->timestamps();
    });
});

it('links savings products to a category', function () {
    $category = SavingsCategory::query()->create([
        'category_name' => 'General Savings',
        'category_name_bn' => 'সাধারণ সঞ্চয়',
        'category_code' => '21',
        'is_active' => true,
        'display_order' => 21,
    ]);

    $product = SavingsProduct::query()->create([
        'savings_category_id' => $category->id,
        'product_name' => 'G.Savings',
        'product_name_bn' => 'জি. সঞ্চয়',
        'product_code' => '21.01',
        'deposit_type' => 'monthly',
        'duration_months' => 12,
        'min_amount' => 100,
        'interest_rate' => 6,
        'is_active' => true,
    ]);

    expect($category->savingsProducts)->toHaveCount(1)
        ->and($product->savingsCategory->category_code)->toBe('21');
});
