<?php

use App\Models\SavingsCategory;
use App\Models\SavingsProduct;
use App\Support\SavingsProductHierarchy;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
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

            $table->index('category_code');
            $table->index('is_active');
        });

        Schema::table('savings_products', function (Blueprint $table) {
            $table->foreignId('savings_category_id')
                ->nullable()
                ->after('id')
                ->constrained()
                ->nullOnDelete();
        });

        if (Schema::hasTable('savings_applications') && ! Schema::hasColumn('savings_applications', 'savings_category_id')) {
            Schema::table('savings_applications', function (Blueprint $table) {
                $table->foreignId('savings_category_id')
                    ->nullable()
                    ->after('savings_product_id')
                    ->constrained()
                    ->nullOnDelete();
            });
        }

        SavingsProductHierarchy::reorganize();
    }

    public function down(): void
    {
        if (Schema::hasTable('savings_categories')) {
            foreach (SavingsCategory::query()->orderBy('id')->get() as $category) {
                $exists = SavingsProduct::query()
                    ->where('product_code', $category->category_code)
                    ->exists();

                if ($exists) {
                    continue;
                }

                SavingsProduct::query()->create([
                    'product_name' => $category->category_name,
                    'product_name_bn' => $category->category_name_bn,
                    'product_code' => $category->category_code,
                    'description' => $category->description,
                    'description_bn' => $category->description_bn,
                    'deposit_type' => 'monthly',
                    'duration_months' => 12,
                    'min_amount' => 100,
                    'max_amount' => 1000000,
                    'monthly_installment' => 500,
                    'interest_rate' => 0,
                    'profit_distribution_type' => 'maturity',
                    'premature_withdrawal_allowed' => false,
                    'premature_withdrawal_penalty' => 0,
                    'min_age' => 18,
                    'max_age' => 70,
                    'requires_nominee' => true,
                    'is_active' => $category->is_active,
                    'display_order' => $category->display_order,
                ]);
            }
        }

        if (Schema::hasTable('savings_applications') && Schema::hasColumn('savings_applications', 'savings_category_id')) {
            Schema::table('savings_applications', function (Blueprint $table) {
                $table->dropConstrainedForeignId('savings_category_id');
            });
        }

        if (Schema::hasColumn('savings_products', 'savings_category_id')) {
            Schema::table('savings_products', function (Blueprint $table) {
                $table->dropConstrainedForeignId('savings_category_id');
            });
        }

        Schema::dropIfExists('savings_categories');
    }
};
