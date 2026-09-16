<?php

namespace App\Support;

use App\Models\SavingsApplication;
use App\Models\SavingsCategory;
use App\Models\SavingsProduct;
use Illuminate\Support\Facades\Schema;

class SavingsProductHierarchy
{
    public const OTHER_CATEGORY_CODE = 'OTH';

    /**
     * Main codes such as 21, 22, 23 are categories — not products.
     */
    public static function isCategoryCode(?string $code): bool
    {
        $code = trim((string) $code);

        return $code !== '' && preg_match('/^\d+$/', $code) === 1;
    }

    /**
     * 21.01 → 21, 21 → 21, GMS-01 → OTH.
     */
    public static function parentCategoryCode(?string $code): ?string
    {
        $code = trim((string) $code);

        if ($code === '') {
            return null;
        }

        if (preg_match('/^(\d+)\./', $code, $matches) === 1) {
            return $matches[1];
        }

        if (self::isCategoryCode($code)) {
            return $code;
        }

        return self::OTHER_CATEGORY_CODE;
    }

    /**
     * @return array{0: string, 1: string}
     */
    public static function defaultCategoryNames(string $code): array
    {
        return match ($code) {
            '21' => ['General Savings', 'সাধারণ সঞ্চয়'],
            '22' => ['Special Savings', 'বিশেষ সঞ্চয়'],
            '23' => ['Monthly Savings', 'মাসিক সঞ্চয়'],
            '24' => ['MDBS', 'এমডিবিএস'],
            '25' => ['MSTBS', 'এমএসটিবিএস'],
            self::OTHER_CATEGORY_CODE => ['Other Savings', 'অন্যান্য সঞ্চয়'],
            default => ['Savings '.$code, 'সঞ্চয় '.$code],
        };
    }

    /**
     * Promote parent-code products (21, 22, …) into categories and attach dotted products (21.01, 21.02).
     *
     * @return array{categories: int, products_linked: int, parents_removed: int, applications_remapped: int}
     */
    public static function reorganize(): array
    {
        $products = SavingsProduct::query()->orderBy('product_code')->get();
        $parentProducts = $products->filter(fn (SavingsProduct $product): bool => self::isCategoryCode($product->product_code));
        $childProducts = $products->reject(fn (SavingsProduct $product): bool => self::isCategoryCode($product->product_code));

        $categoryIdsByCode = [];

        foreach (SavingsCategory::query()->get() as $category) {
            $categoryIdsByCode[$category->category_code] = $category->id;
        }

        foreach ($parentProducts as $parent) {
            $category = SavingsCategory::query()->updateOrCreate(
                ['category_code' => $parent->product_code],
                [
                    'category_name' => $parent->product_name,
                    'category_name_bn' => $parent->product_name_bn,
                    'description' => $parent->description,
                    'description_bn' => $parent->description_bn,
                    'is_active' => $parent->is_active,
                    'display_order' => $parent->display_order ?: (int) $parent->product_code,
                ]
            );
            $categoryIdsByCode[$category->category_code] = $category->id;
        }

        foreach ($childProducts as $child) {
            $parentCode = self::parentCategoryCode($child->product_code);
            if ($parentCode === null || isset($categoryIdsByCode[$parentCode])) {
                continue;
            }

            [$name, $nameBn] = self::defaultCategoryNames($parentCode);
            $category = SavingsCategory::query()->updateOrCreate(
                ['category_code' => $parentCode],
                [
                    'category_name' => $name,
                    'category_name_bn' => $nameBn,
                    'is_active' => true,
                    'display_order' => is_numeric($parentCode) ? (int) $parentCode : 99,
                ]
            );
            $categoryIdsByCode[$category->category_code] = $category->id;
        }

        $productsLinked = 0;
        foreach ($childProducts as $child) {
            $parentCode = self::parentCategoryCode($child->product_code);
            if ($parentCode === null || ! isset($categoryIdsByCode[$parentCode])) {
                continue;
            }

            if ((int) $child->savings_category_id !== (int) $categoryIdsByCode[$parentCode]) {
                $child->savings_category_id = $categoryIdsByCode[$parentCode];
                $child->save();
            }
            $productsLinked++;
        }

        $applicationsRemapped = 0;
        $parentsRemoved = 0;
        $hasApplicationCategory = Schema::hasTable('savings_applications')
            && Schema::hasColumn('savings_applications', 'savings_category_id');

        foreach ($parentProducts as $parent) {
            $categoryId = $categoryIdsByCode[$parent->product_code] ?? null;
            if ($categoryId === null) {
                continue;
            }

            $firstChild = SavingsProduct::query()
                ->where('savings_category_id', $categoryId)
                ->where('id', '!=', $parent->id)
                ->orderBy('product_code')
                ->first();

            if ($firstChild && Schema::hasTable('savings_applications')) {
                $payload = ['savings_product_id' => $firstChild->id];
                if ($hasApplicationCategory) {
                    $payload['savings_category_id'] = $categoryId;
                }

                $applicationsRemapped += SavingsApplication::query()
                    ->where('savings_product_id', $parent->id)
                    ->update($payload);
            }

            if ($firstChild) {
                $parent->delete();
                $parentsRemoved++;
            } else {
                $parent->savings_category_id = $categoryId;
                $parent->save();
                $productsLinked++;
            }
        }

        if ($hasApplicationCategory) {
            foreach (SavingsProduct::query()->whereNotNull('savings_category_id')->get(['id', 'savings_category_id']) as $product) {
                SavingsApplication::query()
                    ->where('savings_product_id', $product->id)
                    ->whereNull('savings_category_id')
                    ->update(['savings_category_id' => $product->savings_category_id]);
            }
        }

        return [
            'categories' => count($categoryIdsByCode),
            'products_linked' => $productsLinked,
            'parents_removed' => $parentsRemoved,
            'applications_remapped' => $applicationsRemapped,
        ];
    }
}
