<?php

namespace App\Helpers;

use Carbon\Carbon;

/**
 * Helper class for converting various Bangla data formats to standardized formats
 * Handles: Bijoy to Unicode, Bangla numbers, various date formats
 */
class BanglaDataConverter
{
    /**
     * Bijoy to Unicode character mapping
     * Based on standard Bijoy ANSI encoding
     */
    private static array $bijoyToUnicodeMap = [
        // Vowels and vowel signs - order matters!
        'Av' => 'আ',
        'A' => 'অ',
        'B' => 'ই',
        'C' => 'ঈ',
        'D' => 'উ',
        'E' => 'ঊ',
        'F' => 'ঋ',
        'G' => 'এ',
        'H' => 'ঐ',
        'I' => 'ও',
        'J' => 'ঔ',

        // Consonants
        'K' => 'ক',
        'L' => 'খ',
        'M' => 'গ',
        'N' => 'ঘ',
        'O' => 'ঙ',
        'P' => 'চ',
        'Q' => 'ছ',
        'R' => 'জ',
        'S' => 'ঝ',
        'T' => 'ঞ',
        'U' => 'ট',
        'V' => 'ঠ',
        'W' => 'ড',
        'X' => 'ঢ',
        'Y' => 'ণ',
        'Z' => 'ত',
        '_' => 'প',
        'a' => 'ব',
        'b' => 'ভ',
        'c' => 'ম',
        'd' => 'য',
        'e' => 'র',
        'f' => 'ল',
        'g' => 'শ',
        'h' => 'ষ',
        'i' => 'স',
        'j' => 'হ',
        'k' => 'ড়',
        'l' => 'ঢ়',
        'm' => 'য়',
        'n' => 'ৎ',
        'o' => 'ং',
        'p' => 'ঃ',
        'q' => 'ঁ',

        // Vowel signs (kar)
        'v' => 'া',   // aa-kar
        'w' => 'ি',   // i-kar
        'x' => 'ী',   // ii-kar
        'y' => 'ু',   // u-kar
        'z' => 'ূ',   // uu-kar
        '©' => 'ৃ',   // ri-kar
        '‡' => 'ে',   // e-kar
        '†' => 'ৈ',   // oi-kar

        // Hasanta
        '&' => '্',

        // Special characters
        '|' => '।',
        '\\' => 'দ',
        ']' => 'ধ',
        '[' => 'থ',
        '^' => 'ন',
        '`' => 'ফ',

        // Numbers - keep as English (will be converted separately if needed)
    ];

    /**
     * Bijoy conjunct/complex character mappings
     * These must be processed before single characters
     */
    private static array $bijoyComplexMap = [
        // Pre-kar combinations (e-kar, oi-kar come before consonant in Bijoy)
        '‡v' => 'ো',   // o-kar
        '‡Š' => 'ৌ',   // ou-kar
        '†v' => 'ৈা',

        // Common conjuncts
        '•' => 'ক্ষ',
        'ÿ' => 'শ্চ',
        'Á' => 'প্প',
        'Â' => 'প্র',
        'Ã' => 'প্ল',
        'Ë' => 'শ্ন',
        'Ì' => 'শ্ব',
        'Í' => 'শ্ম',
        'Î' => 'শ্র',
        'Ï' => 'শ্ল',

        // t-conjuncts
        '¯' => 'ন্ন',
        '®' => 'ন্ধ',
        '­' => 'ন্দ',
        '¬' => 'ন্থ',
        '«' => 'ন্ত',
        'ª' => 'ন্ড',

        // Other common ones
        'ß' => 'ক্স',
        'à' => 'ক্ট',
        'á' => 'জ্জ্ব',
        'â' => 'ট্ট',
        'ã' => 'ড্ড',
        'ä' => 'ণ্ট',
        'å' => 'ণ্ঠ',
        'æ' => 'ণ্ড',
        'ç' => 'ত্ত',
        'è' => 'ত্থ',
        'é' => 'ত্ন',
        'ê' => 'ত্ম',
        'ë' => 'ত্র',
        'ì' => 'দ্দ',
        'í' => 'দ্ধ',
        'î' => 'দ্ব',
        'ï' => 'দ্ম',
        'ð' => 'দ্র',
        'ñ' => 'দ্‌ঘ',
        'ò' => 'ধ্ব',
        'ó' => 'ধ্র',
        'ô' => 'ন্ট',
        'õ' => 'ন্ঠ',
        'ö' => 'ন্ড',
        '÷' => 'ন্ন',
        'ø' => 'ন্ব',
        'ù' => 'ন্ম',
        'ú' => 'প্ত',
        'û' => 'প্ন',
        'ü' => 'প্স',
        'ý' => 'ফ্র',
        'þ' => 'ব্জ',
    ];

    /**
     * Bangla digits to English digits mapping
     */
    private static array $banglaDigits = [
        '০' => '0', '১' => '1', '২' => '2', '৩' => '3', '৪' => '4',
        '৫' => '5', '৬' => '6', '৭' => '7', '৮' => '8', '৯' => '9',
    ];

    /**
     * Bangla month names mapping
     */
    private static array $banglaMonths = [
        'জানুয়ারি' => '01', 'জানুয়ারী' => '01',
        'ফেব্রুয়ারি' => '02', 'ফেব্রুয়ারী' => '02',
        'মার্চ' => '03',
        'এপ্রিল' => '04',
        'মে' => '05',
        'জুন' => '06',
        'জুলাই' => '07',
        'আগস্ট' => '08', 'আগষ্ট' => '08',
        'সেপ্টেম্বর' => '09',
        'অক্টোবর' => '10',
        'নভেম্বর' => '11',
        'ডিসেম্বর' => '12',
    ];

    /**
     * Convert all data in an Excel row
     */
    public static function convertExcelRow(array $row): array
    {
        return array_map(function ($value) {
            if (!is_string($value) || empty($value)) {
                return $value;
            }

            // First ensure proper UTF-8 encoding
            $value = self::ensureUtf8($value);

            // Check if it's Bijoy encoded and convert
            if (self::isBijoyEncoded($value)) {
                $value = self::bijoyToUnicode($value);
            }

            return $value;
        }, $row);
    }

    /**
     * Ensure string is properly UTF-8 encoded
     */
    public static function ensureUtf8(string $value): string
    {
        if (!mb_check_encoding($value, 'UTF-8')) {
            // Try common encodings used in Bangladesh
            $encodings = ['UTF-8', 'Windows-1252', 'ISO-8859-1', 'ASCII'];
            $detectedEncoding = mb_detect_encoding($value, $encodings, true);
            $value = mb_convert_encoding($value, 'UTF-8', $detectedEncoding ?: 'UTF-8');
        }
        return $value;
    }

    /**
     * Check if string appears to be Bijoy encoded
     * Bijoy uses ASCII characters to represent Bangla, so we look for:
     * 1. Common Bijoy character sequences
     * 2. Absence of Unicode Bangla characters
     * 3. Presence of specific ASCII patterns used in Bijoy
     */
    public static function isBijoyEncoded(string $value): bool
    {
        if (empty($value)) {
            return false;
        }

        // If it already has Unicode Bangla, it's not Bijoy
        if (preg_match('/[\x{0980}-\x{09FF}]/u', $value)) {
            return false;
        }

        // Common Bijoy patterns - these ASCII sequences are typical in Bijoy
        // Bijoy uses lowercase letters for common consonants
        $bijoyIndicators = [
            // Common Bijoy consonant patterns
            '/[a-z]{2,}/', // Multiple lowercase letters (Bijoy consonants)
            '/[KLMNOPQRSTUVWXYZ]/', // Bijoy uses uppercase for vowels/special
            // Common Bijoy words patterns
            '/\b[kK][vV]/', // কা, খা
            '/\b[mM][vV]/', // মা
            '/\b[nN][vV]/', // না
            '/\b[iI][mM]/', // common pattern
        ];

        // Check if string has multiple ASCII letters (common in Bijoy)
        $asciiLetterCount = preg_match_all('/[a-zA-Z]/', $value);
        $totalLength = mb_strlen($value);

        // If more than 50% is ASCII letters and no Bangla Unicode, likely Bijoy
        if ($totalLength > 2 && $asciiLetterCount > $totalLength * 0.4) {
            return true;
        }

        return false;
    }

    /**
     * Convert Bijoy encoded text to Unicode
     * Note: Bijoy to Unicode conversion is complex. This handles common cases.
     */
    public static function bijoyToUnicode(string $text): string
    {
        if (empty($text)) {
            return $text;
        }

        $result = $text;

        // First handle complex mappings (longer strings first)
        // Sort by length descending to match longer patterns first
        $complexMap = self::$bijoyComplexMap;
        uksort($complexMap, function ($a, $b) {
            return strlen($b) - strlen($a);
        });

        foreach ($complexMap as $bijoy => $unicode) {
            $result = str_replace($bijoy, $unicode, $result);
        }

        // Sort single char map by key length (longer first for Av before A)
        $singleMap = self::$bijoyToUnicodeMap;
        uksort($singleMap, function ($a, $b) {
            return strlen($b) - strlen($a);
        });

        // Then handle single character mappings
        foreach ($singleMap as $bijoy => $unicode) {
            $result = str_replace($bijoy, $unicode, $result);
        }

        // Fix vowel sign positions (i-kar, e-kar come before in Bijoy but after in Unicode)
        $result = self::fixVowelSignPositions($result);

        return $result;
    }

    /**
     * Fix vowel sign positions after conversion
     * In Bijoy, i-kar (ি) and e-kar (ে) come BEFORE the consonant
     * In Unicode, they must come AFTER the consonant
     */
    private static function fixVowelSignPositions(string $text): string
    {
        // i-kar (ি) rearrangement: ি + ক -> কি
        $text = preg_replace('/(ি)([ক-হড়ঢ়য়])/u', '$2$1', $text);

        // e-kar (ে) rearrangement: ে + ক -> কে
        $text = preg_replace('/(ে)([ক-হড়ঢ়য়])/u', '$2$1', $text);

        // oi-kar (ৈ) rearrangement
        $text = preg_replace('/(ৈ)([ক-হড়ঢ়য়])/u', '$2$1', $text);

        return $text;
    }

    /**
     * Convert Bangla digits to English digits
     */
    public static function banglaToEnglishDigits(string $value): string
    {
        return str_replace(
            array_keys(self::$banglaDigits),
            array_values(self::$banglaDigits),
            $value
        );
    }

    /**
     * Convert numeric value (handles Bangla digits)
     */
    public static function toNumber($value, string $type = 'float')
    {
        if (empty($value) && $value !== 0 && $value !== '0') {
            return null;
        }

        if (is_numeric($value)) {
            return $type === 'int' ? (int) $value : (float) $value;
        }

        if (is_string($value)) {
            // Convert Bangla digits
            $converted = self::banglaToEnglishDigits($value);

            // Remove commas, spaces
            $converted = preg_replace('/[,\s৳]/', '', $converted);

            // Handle percentage sign
            $converted = str_replace('%', '', $converted);

            if (is_numeric($converted)) {
                return $type === 'int' ? (int) $converted : (float) $converted;
            }
        }

        return null;
    }

    /**
     * Convert to integer
     */
    public static function toInt($value): ?int
    {
        return self::toNumber($value, 'int');
    }

    /**
     * Convert to float
     */
    public static function toFloat($value): ?float
    {
        return self::toNumber($value, 'float');
    }

    /**
     * Parse date from various formats
     * Handles: Y-m-d, d/m/Y, d-m-Y, Bangla dates, Excel serial numbers
     */
    public static function parseDate($value): ?string
    {
        if (empty($value)) {
            return null;
        }

        // If already a Carbon/DateTime instance
        if ($value instanceof \DateTimeInterface) {
            return Carbon::instance($value)->format('Y-m-d');
        }

        // Handle Excel serial date number
        if (is_numeric($value) && $value > 25569 && $value < 100000) {
            try {
                // Excel serial date: days since 1900-01-01 (with Excel bug for 1900 leap year)
                $unixTimestamp = ($value - 25569) * 86400;
                return Carbon::createFromTimestamp($unixTimestamp)->format('Y-m-d');
            } catch (\Exception $e) {
                // Fall through to string parsing
            }
        }

        if (!is_string($value)) {
            return null;
        }

        // Ensure UTF-8
        $value = self::ensureUtf8($value);

        // Check for Bijoy encoding
        if (self::isBijoyEncoded($value)) {
            $value = self::bijoyToUnicode($value);
        }

        // Convert Bangla digits to English
        $value = self::banglaToEnglishDigits($value);

        // Trim and normalize
        $value = trim($value);

        // Try various date formats
        $formats = [
            'Y-m-d',           // 2026-01-27
            'd-m-Y',           // 27-01-2026
            'd/m/Y',           // 27/01/2026
            'm/d/Y',           // 01/27/2026 (US format)
            'Y/m/d',           // 2026/01/27
            'd.m.Y',           // 27.01.2026
            'Y.m.d',           // 2026.01.27
            'd-M-Y',           // 27-Jan-2026
            'd M Y',           // 27 Jan 2026
            'd M, Y',          // 27 Jan, 2026
            'F d, Y',          // January 27, 2026
            'd F Y',           // 27 January 2026
            'd F, Y',          // 27 January, 2026
        ];

        foreach ($formats as $format) {
            try {
                $date = Carbon::createFromFormat($format, $value);
                if ($date && $date->format($format) === $value) {
                    return $date->format('Y-m-d');
                }
            } catch (\Exception $e) {
                continue;
            }
        }

        // Try Bangla month names
        foreach (self::$banglaMonths as $banglaMonth => $monthNum) {
            if (mb_strpos($value, $banglaMonth) !== false) {
                // Extract day and year
                preg_match('/(\d{1,2})\s*' . preg_quote($banglaMonth, '/') . '\s*[,]?\s*(\d{4})/u', $value, $matches);
                if (!empty($matches)) {
                    $day = str_pad($matches[1], 2, '0', STR_PAD_LEFT);
                    $year = $matches[2];
                    return "{$year}-{$monthNum}-{$day}";
                }

                // Alternative: month day, year
                preg_match('/' . preg_quote($banglaMonth, '/') . '\s*(\d{1,2})\s*[,]?\s*(\d{4})/u', $value, $matches);
                if (!empty($matches)) {
                    $day = str_pad($matches[1], 2, '0', STR_PAD_LEFT);
                    $year = $matches[2];
                    return "{$year}-{$monthNum}-{$day}";
                }
            }
        }

        // Try Carbon's flexible parsing as last resort
        try {
            $date = Carbon::parse($value);
            // Validate it's a reasonable date (not too far in past or future)
            if ($date->year >= 1900 && $date->year <= 2100) {
                return $date->format('Y-m-d');
            }
        } catch (\Exception $e) {
            // Failed to parse
        }

        return null;
    }

    /**
     * Convert mobile number (handles various formats)
     */
    public static function parseMobile($value): ?string
    {
        if (empty($value)) {
            return null;
        }

        // Ensure UTF-8
        $value = self::ensureUtf8($value);

        // Check for Bijoy encoding
        if (self::isBijoyEncoded($value)) {
            $value = self::bijoyToUnicode($value);
        }

        // Convert Bangla digits to English
        $value = self::banglaToEnglishDigits($value);

        // Remove common prefixes and formatting
        $value = preg_replace('/[\s\-\.\(\)\+]/', '', $value);

        // Remove country code if present
        $value = preg_replace('/^(880|0088|\+880)/', '0', $value);

        // Ensure it starts with 0 for Bangladesh numbers
        if (strlen($value) === 10 && preg_match('/^1[3-9]/', $value)) {
            $value = '0' . $value;
        }

        // Validate Bangladesh mobile format
        if (preg_match('/^01[3-9]\d{8}$/', $value)) {
            return $value;
        }

        // Return cleaned value even if not valid Bangladesh mobile
        return $value ?: null;
    }

    /**
     * Clean text field (handles encoding, trims, limits length)
     * Also converts Bangla digits to English for fields that may contain numbers
     */
    public static function cleanText($value, int $maxLength = 255, bool $convertDigits = true): ?string
    {
        if (empty($value) && $value !== '0') {
            return null;
        }

        // Convert to string if not already
        $value = (string) $value;

        // Ensure UTF-8
        $value = self::ensureUtf8($value);

        // Check for Bijoy encoding and convert
        if (self::isBijoyEncoded($value)) {
            $converted = self::bijoyToUnicode($value);

            // If conversion still has many ASCII letters, it might not be fully converted
            // Log warning but use the converted value anyway
            $asciiCount = preg_match_all('/[a-zA-Z]/', $converted);
            $unicodeBanglaCount = preg_match_all('/[\x{0980}-\x{09FF}]/u', $converted);

            if ($asciiCount > 0 && $unicodeBanglaCount > 0) {
                // Partial conversion - log for debugging
                \Log::warning('Bijoy conversion may be incomplete', [
                    'original' => mb_substr($value, 0, 50),
                    'converted' => mb_substr($converted, 0, 50),
                ]);
            }

            $value = $converted;
        }

        // Convert Bangla digits to English (useful for serial numbers, codes, etc.)
        if ($convertDigits) {
            $value = self::banglaToEnglishDigits($value);
        }

        // Trim and limit length
        $value = trim($value);

        if (mb_strlen($value) > $maxLength) {
            $value = mb_substr($value, 0, $maxLength);
        }

        return $value ?: null;
    }

    /**
     * Process entire loan member row from Excel
     * Returns array ready for database insertion
     */
    public static function processLoanMemberRow(array $row): array
    {
        // First convert entire row (handles Bijoy encoding)
        $row = self::convertExcelRow($row);

        return [
            // serial_no is integer in DB, so convert Bangla digits and cast to int
            'serial_no' => self::toInt($row[0] ?? null),
            'loan_type' => self::cleanText($row[1] ?? null),
            'somiti_name' => self::cleanText($row[2] ?? null),
            'somiti_code' => self::cleanText($row[3] ?? null),
            'member_name' => self::cleanText($row[4] ?? null),
            'member_code' => self::cleanText($row[5] ?? null),
            'member_mobile' => self::parseMobile($row[6] ?? null),
            'general_savings' => self::toFloat($row[7] ?? null),
            'total_savings' => self::toFloat($row[8] ?? null),
            'principal_amount' => self::toFloat($row[9] ?? null),
            'paid_installment_count' => self::toInt($row[10] ?? null),
            'approved_loan_amount' => self::toFloat($row[11] ?? null),
            'installment_increment_rate' => self::toFloat($row[12] ?? null),
            'loan_duration' => self::toInt($row[13] ?? null),
            'phase_no' => self::toInt($row[14] ?? null),
            'project_name' => self::cleanText($row[15] ?? null),
            'loan_release_or_approval_date' => self::parseDate($row[16] ?? null),
            'loan_distribution_date' => self::parseDate($row[17] ?? null),
            'approved_by' => self::cleanText($row[18] ?? null),
            'remarks' => self::cleanText($row[19] ?? null, 1000),
        ];
    }
}
