/**
 * Maps Bangla digits to English digits
 */
export const BANGLA_TO_ENGLISH_DIGITS: Record<string, string> = {
    '০': '0',
    '১': '1',
    '২': '2',
    '৩': '3',
    '৪': '4',
    '৫': '5',
    '৬': '6',
    '৭': '7',
    '৮': '8',
    '৯': '9',
};

/**
 * Converts any Bangla digits in a string to English digits
 */
export function toEnglishDigits(value: string | null | undefined): string {
    if (!value) return '';
    let result = '';
    for (const ch of String(value)) {
        result += BANGLA_TO_ENGLISH_DIGITS[ch] ?? ch;
    }
    return result;
}

/**
 * Cleans phone number for `tel:` link:
 * Converts Bangla digits to English and strips all non-numeric characters (except leading '+').
 */
export function formatTelHref(phone: string | null | undefined): string {
    if (!phone) return '';
    const eng = toEnglishDigits(phone);
    const hasPlus = eng.trim().startsWith('+');
    const digits = eng.replace(/\D/g, '');
    if (!digits) return '';
    return hasPlus ? `+${digits}` : digits;
}
