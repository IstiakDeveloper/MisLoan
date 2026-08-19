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

/** Display date as dd/mm/YYYY (Asia/Dhaka when a time is present). */
export function formatDate(value: string | Date | null | undefined, fallback = '-'): string {
    const instant = parseDateTimeInstant(value);
    if (instant) {
        return formatDhakaParts(instant).date;
    }

    const date = parseDateValue(value);
    if (!date) return fallback === '' ? '' : fallback;

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

const DISPLAY_TIMEZONE = 'Asia/Dhaka';

function isDateOnlyString(str: string): boolean {
    const s = str.trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(s) || /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s);
}

/** Parse a datetime (ISO / Laravel) as an instant; date-only strings return null. */
function parseDateTimeInstant(value: string | Date | null | undefined): Date | null {
    if (value == null || value === '') return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

    const str = String(value).trim();
    if (!str || isDateOnlyString(str)) return null;
    if (!/(?:T|\s)\d{1,2}:\d{2}/.test(str)) return null;

    // Laravel may send 6-digit microseconds; Date() expects up to 3.
    const normalized = str.replace(/\.(\d{3})\d+/, '.$1');
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDhakaParts(date: Date): { date: string; time: string } {
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: DISPLAY_TIMEZONE,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    }).formatToParts(date);

    const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
    const ampm = (get('dayPeriod') || 'AM').replace(/\./g, '').replace(/\s/g, '').toUpperCase();

    return {
        date: `${get('day')}/${get('month')}/${get('year')}`,
        time: `${String(get('hour')).padStart(2, '0')}:${get('minute')} ${ampm}`,
    };
}

/** Display time only as hh:mm AM/PM (Asia/Dhaka). Date-only values return fallback. */
export function formatTime(value: string | Date | null | undefined, fallback = ''): string {
    const date = parseDateTimeInstant(value);
    if (!date) return fallback;
    return formatDhakaParts(date).time;
}

/** Display date + time as dd/mm/YYYY hh:mm AM/PM (Asia/Dhaka). */
export function formatDateTime(value: string | Date | null | undefined, fallback = '-'): string {
    if (value == null || value === '') return fallback;

    const instant = parseDateTimeInstant(value);
    if (!instant) {
        return formatDate(value, fallback);
    }

    const { date, time } = formatDhakaParts(instant);
    return `${date} ${time}`;
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
