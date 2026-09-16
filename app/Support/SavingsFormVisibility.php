<?php

namespace App\Support;

class SavingsFormVisibility
{
    /** These savings types are opened with member admission — no separate application form. */
    public const ADMISSION_ONLY_CODES = ['21', '22'];

    public const TERM_SAVINGS_CODE = '23';

    /** স্বেচ্ছা সঞ্চয়/মাসিক মুনাফা/দ্বিগুণ মুনাফা প্রকল্পের ক্যাটাগরি (এমডিবিএস, এমএসটিবিএস) */
    public const PROFIT_SAVINGS_CODES = ['24', '25'];

    public const FORM_TERM_SAVINGS = 'term_savings';

    /** স্বেচ্ছা সঞ্চয়/মাসিক মুনাফা/দ্বিগুণ মুনাফা প্রকল্পের আবেদনপত্র */
    public const FORM_PROFIT_SAVINGS = 'profit_savings';

    public const ADMISSION_ONLY_MESSAGE = 'এই সঞ্চয় ক্যাটাগরির জন্য আলাদা আবেদন ফর্ম লাগে না। হিসাব সদস্য ভর্তির সাথেই হয়ে যায়।';

    public const FORM_NOT_READY_MESSAGE = 'এই ক্যাটাগরির আবেদন ফর্ম পরে যোগ করা হবে।';

    public static function categoryCode(?object $category = null, ?object $product = null): ?string
    {
        $code = trim((string) ($category->category_code ?? ''));
        if ($code !== '') {
            return $code;
        }

        if ($product) {
            $related = $product->savingsCategory ?? $product->savings_category ?? null;
            $relatedCode = trim((string) ($related->category_code ?? ''));
            if ($relatedCode !== '') {
                return $relatedCode;
            }

            $productCode = trim((string) ($product->product_code ?? ''));
            if (preg_match('/^(\d+)\./', $productCode, $matches) === 1) {
                return $matches[1];
            }

            if (preg_match('/^\d+$/', $productCode) === 1) {
                return $productCode;
            }
        }

        return null;
    }

    public static function isAdmissionOnly(?object $category = null, ?object $product = null): bool
    {
        $code = self::categoryCode($category, $product);

        return $code !== null && in_array($code, self::ADMISSION_ONLY_CODES, true);
    }

    public static function formType(?object $category = null, ?object $product = null): ?string
    {
        $code = self::categoryCode($category, $product);
        if ($code === null) {
            return null;
        }

        if ($code === self::TERM_SAVINGS_CODE) {
            return self::FORM_TERM_SAVINGS;
        }

        return in_array($code, self::PROFIT_SAVINGS_CODES, true) ? self::FORM_PROFIT_SAVINGS : null;
    }

    public static function requiresApplicationForm(?object $category = null, ?object $product = null): bool
    {
        return self::formType($category, $product) !== null;
    }

    /**
     * @return array{
     *     admission_only_codes: list<string>,
     *     forms: array<string, string>,
     *     messages: array{admission_only: string, form_not_ready: string}
     * }
     */
    public static function frontendRules(): array
    {
        return [
            'admission_only_codes' => self::ADMISSION_ONLY_CODES,
            'forms' => [
                self::TERM_SAVINGS_CODE => self::FORM_TERM_SAVINGS,
                ...array_fill_keys(self::PROFIT_SAVINGS_CODES, self::FORM_PROFIT_SAVINGS),
            ],
            'messages' => [
                'admission_only' => self::ADMISSION_ONLY_MESSAGE,
                'form_not_ready' => self::FORM_NOT_READY_MESSAGE,
            ],
        ];
    }
}
