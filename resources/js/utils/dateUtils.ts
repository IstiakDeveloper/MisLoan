/**
 * Bangladesh display date format: dd/mm/YYYY
 * API / <input type="date"> values stay YYYY-MM-DD internally.
 */

function parseDateValue(value: string | Date | null | undefined): Date | null {
    if (value == null || value === '') return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

    const str = String(value).trim();
    if (!str) return null;

    const datePart = str.split('T')[0].split(' ')[0];

    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
    if (iso) {
        const year = Number(iso[1]);
        const month = Number(iso[2]) - 1;
        const day = Number(iso[3]);
        const d = new Date(year, month, day);
        return Number.isNaN(d.getTime()) ? null : d;
    }

    const bd = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(datePart);
    if (bd) {
        const day = Number(bd[1]);
        const month = Number(bd[2]) - 1;
        const year = Number(bd[3]);
        const d = new Date(year, month, day);
        return Number.isNaN(d.getTime()) ? null : d;
    }

    const parsed = new Date(str);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Display date as dd/mm/YYYY */
export function formatDate(value: string | Date | null | undefined, fallback = '-'): string {
    const date = parseDateValue(value);
    if (!date) return fallback === '' ? '' : fallback;

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

/** Display date + time as dd/mm/YYYY hh:mm AM/PM */
export function formatDateTime(value: string | Date | null | undefined, fallback = '-'): string {
    if (value == null || value === '') return fallback;

    const str = String(value).trim();
    const date = parseDateValue(value);
    if (!date) return fallback;

    let hours = 0;
    let minutes = 0;

    const timeFromString = str.match(/(?:T|\s)(\d{1,2}):(\d{2})/);
    if (timeFromString) {
        hours = Number(timeFromString[1]);
        minutes = Number(timeFromString[2]);
    } else if (value instanceof Date) {
        hours = value.getHours();
        minutes = value.getMinutes();
    }

    const hasTime = Boolean(timeFromString) || (value instanceof Date && (hours !== 0 || minutes !== 0));
    if (!hasTime) {
        return formatDate(date, fallback);
    }

    const h12 = hours % 12 || 12;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    return `${formatDate(date, '')} ${String(h12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`;
}

/** For <input type="date"> — always YYYY-MM-DD */
export function toInputDateValue(value: string | Date | null | undefined): string {
    const date = parseDateValue(value);
    if (!date) return '';

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

const banglaDigitsMap: Record<string, string> = {
    '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
    '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯',
};

/** Convert English digits to Bengali digits */
export function toBanglaDigits(value: string | number | null | undefined): string {
    if (value == null || value === '') return '';
    return String(value).replace(/[0-9]/g, (d) => banglaDigitsMap[d] ?? d);
}

/** Convert numbers with comma format to Bangla digits e.g. 100000 -> ১,০০,০০০ */
export function formatBanglaNumber(value: number | string | null | undefined): string {
    if (value == null || value === '' || isNaN(Number(value))) return '';
    const num = Number(value);
    const formattedEn = new Intl.NumberFormat('en-IN').format(num);
    return toBanglaDigits(formattedEn);
}

/** Convert date to dd/mm/YYYY with Bengali digits (e.g. ১৮/০৮/২০২৬) */
export function formatDateBangla(value: string | Date | null | undefined, fallback = '-'): string {
    const formatted = formatDate(value, fallback);
    if (!formatted || formatted === fallback) return fallback;
    return toBanglaDigits(formatted);
}
