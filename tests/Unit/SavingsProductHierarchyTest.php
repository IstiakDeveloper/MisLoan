<?php

use App\Models\SavingsCategory;
use App\Models\SavingsProduct;
use App\Support\SavingsProductHierarchy;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

function createSavingsHierarchyTables(): void
{
    Schema::dropIfExists('savings_applications');
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
        $table->text('description')->nullable();
        $table->text('description_bn')->nullable();
        $table->string('deposit_type')->default('monthly');
        $table->integer('duration_months')->default(12);
        $table->decimal('min_amount', 15, 2)->default(100);
        $table->decimal('max_amount', 15, 2)->nullable();
        $table->decimal('monthly_installment', 12, 2)->nullable();
        $table->decimal('interest_rate', 5, 2)->default(0);
        $table->string('profit_distribution_type')->default('maturity');
        $table->boolean('premature_withdrawal_allowed')->default(false);
        $table->decimal('premature_withdrawal_penalty', 5, 2)->default(0);
        $table->integer('min_age')->default(18);
        $table->integer('max_age')->default(70);
        $table->boolean('requires_nominee')->default(true);
        $table->boolean('is_active')->default(true);
        $table->integer('display_order')->default(0);
        $table->timestamps();
    });

    Schema::create('savings_applications', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('savings_product_id');
        $table->unsignedBigInteger('savings_category_id')->nullable();
        $table->timestamps();
    });
}

function makeSavingsProduct(string $code, string $name, string $nameBn, float $rate = 0): SavingsProduct
{
    return SavingsProduct::query()->create([
        'product_code' => $code,
        'product_name' => $name,
        'product_name_bn' => $nameBn,
        'interest_rate' => $rate,
        'deposit_type' => 'monthly',
        'duration_months' => 12,
        'min_amount' => 100,
        'max_amount' => 1000000,
        'monthly_installment' => 500,
        'profit_distribution_type' => 'maturity',
        'is_active' => true,
    ]);
}

beforeEach(function () {
    createSavingsHierarchyTables();
});

it('treats integer codes as categories and dotted codes as child products', function () {
    expect(SavingsProductHierarchy::isCategoryCode('21'))->toBeTrue();
    expect(SavingsProductHierarchy::isCategoryCode('21.01'))->toBeFalse();
    expect(SavingsProductHierarchy::parentCategoryCode('21.01'))->toBe('21');
    expect(SavingsProductHierarchy::parentCategoryCode('GMS-01'))->toBe(SavingsProductHierarchy::OTHER_CATEGORY_CODE);
});

it('promotes parent codes into categories and keeps dotted products underneath', function () {
    makeSavingsProduct('21', 'General Savings', 'সাধারণ সঞ্চয়');
    makeSavingsProduct('21.01', 'G.Savings', 'জি. সঞ্চয়', 6);
    makeSavingsProduct('21.02', 'ENRICH', 'ইনরিচ', 6);
    makeSavingsProduct('22', 'Special Savings', 'বিশেষ সঞ্চয়');
    makeSavingsProduct('22.01', 'SP.Savings', 'এস.পি. সঞ্চয়', 6);

    $result = SavingsProductHierarchy::reorganize();

    expect($result['parents_removed'])->toBe(2);

    $general = SavingsCategory::query()->where('category_code', '21')->first();
    $special = SavingsCategory::query()->where('category_code', '22')->first();

    expect($general)->not->toBeNull()
        ->and($general->category_name)->toBe('General Savings')
        ->and($special)->not->toBeNull();

    expect(SavingsProduct::query()->where('product_code', '21')->exists())->toBeFalse()
        ->and(SavingsProduct::query()->where('product_code', '22')->exists())->toBeFalse();

    $gSavings = SavingsProduct::query()->where('product_code', '21.01')->first();
    $enrich = SavingsProduct::query()->where('product_code', '21.02')->first();
    $spSavings = SavingsProduct::query()->where('product_code', '22.01')->first();

    expect($gSavings?->savings_category_id)->toBe($general->id)
        ->and($enrich?->savings_category_id)->toBe($general->id)
        ->and($spSavings?->savings_category_id)->toBe($special->id);

    SavingsProductHierarchy::reorganize();

    expect(SavingsCategory::query()->where('category_code', '21')->count())->toBe(1)
        ->and(SavingsProduct::query()->where('product_code', '21.01')->count())->toBe(1);
});

it('creates a missing parent category when only dotted products exist', function () {
    makeSavingsProduct('23.01', 'MS 10Yr', 'এমএস ১০ বছর', 9);

    SavingsProductHierarchy::reorganize();

    $category = SavingsCategory::query()->where('category_code', '23')->first();

    expect($category)->not->toBeNull()
        ->and($category->category_name)->toBe('Monthly Savings')
        ->and(SavingsProduct::query()->where('product_code', '23.01')->first()?->savings_category_id)->toBe($category->id);
});

it('puts non numeric leftover products under other savings', function () {
    makeSavingsProduct('GMS-01', 'General Monthly Savings', 'সাধারণ মাসিক সঞ্চয়');

    SavingsProductHierarchy::reorganize();

    $other = SavingsCategory::query()->where('category_code', SavingsProductHierarchy::OTHER_CATEGORY_CODE)->first();

    expect($other)->not->toBeNull()
        ->and(SavingsProduct::query()->where('product_code', 'GMS-01')->first()?->savings_category_id)->toBe($other->id);
});

it('keeps a parent code as a product when it has no children', function () {
    makeSavingsProduct('21', 'General Savings', 'সাধারণ সঞ্চয়');

    SavingsProductHierarchy::reorganize();

    $category = SavingsCategory::query()->where('category_code', '21')->first();
    $product = SavingsProduct::query()->where('product_code', '21')->first();

    expect($category)->not->toBeNull()
        ->and($product)->not->toBeNull()
        ->and($product->savings_category_id)->toBe($category->id);
});

it('remaps applications from a parent product to the first child', function () {
    $parent = makeSavingsProduct('21', 'General Savings', 'সাধারণ সঞ্চয়');
    $child = makeSavingsProduct('21.01', 'G.Savings', 'জি. সঞ্চয়', 6);

    $applicationId = DB::table('savings_applications')->insertGetId([
        'savings_product_id' => $parent->id,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    SavingsProductHierarchy::reorganize();

    $row = DB::table('savings_applications')->where('id', $applicationId)->first();
    $category = SavingsCategory::query()->where('category_code', '21')->first();

    expect($row->savings_product_id)->toBe($child->id)
        ->and($row->savings_category_id)->toBe($category->id)
        ->and(SavingsProduct::query()->where('product_code', '21')->exists())->toBeFalse();
});
