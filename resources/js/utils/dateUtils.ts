/**
 * Bangladesh display date format: dd/mm/YYYY
 * Times are always Asia/Dhaka in 12-hour AM/PM, never the computer timezone.
 * API / <input type="date"> values stay YYYY-MM-DD internally.
 */

export const DISPLAY_TIMEZONE = 'Asia/Dhaka';

/** Bangladesh has no DST; UTC+6 year-round. */
const DHAKA_OFFSET_HOURS = 6;

function parseDateValue(value: string | Date | number | null | undefined): Date | null {
    if (value == null || value === '') return null;
    if (typeof value === 'number' && Number.isFinite(value)) {
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? null : d;
    }
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

    const str = String(value).trim();
    if (!str) return null;

    const datePart = str.split('T')[0].split(' ')[0];

    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
    if (iso) {
        const year = Number(iso[1]);
        const month = Number(iso[2]) - 1;
        const day = Number(iso[3]);
        const d = new Date(Date.UTC(year, month, day, 12 - DHAKA_OFFSET_HOURS, 0, 0));
        return Number.isNaN(d.getTime()) ? null : d;
    }

    const bd = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(datePart);
    if (bd) {
        const day = Number(bd[1]);
        const month = Number(bd[2]) - 1;
        const year = Number(bd[3]);
        const d = new Date(Date.UTC(year, month, day, 12 - DHAKA_OFFSET_HOURS, 0, 0));
        return Number.isNaN(d.getTime()) ? null : d;
    }

    return parseDateTimeInstant(str);
}

function isDateOnlyString(str: string): boolean {
    const s = str.trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(s) || /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s);
}

function hasExplicitTimezone(str: string): boolean {
    return /[zZ]$/.test(str) || /[+-]\d{2}:?\d{2}$/.test(str);
}

function dhakaWallClockToDate(
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
    second: number,
): Date {
    return new Date(Date.UTC(year, month - 1, day, hour - DHAKA_OFFSET_HOURS, minute, second));
}

/** Parse a datetime (ISO / Laravel) as an instant; date-only strings return null. */
function parseDateTimeInstant(value: string | Date | number | null | undefined): Date | null {
    if (value == null || value === '') return null;
    if (typeof value === 'number' && Number.isFinite(value)) {
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? null : d;
    }
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

    const str = String(value).trim();
    if (!str || isDateOnlyString(str)) return null;
    if (!/(?:T|\s)\d{1,2}:\d{2}/.test(str)) return null;

    // Laravel may send 6-digit microseconds; Date() expects up to 3.
    const normalized = str.replace(/\.(\d{3})\d+/, '.$1');

    if (hasExplicitTimezone(normalized)) {
        const parsed = new Date(normalized);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    const naive = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(normalized);
    if (naive) {
        return dhakaWallClockToDate(
            Number(naive[1]),
            Number(naive[2]),
            Number(naive[3]),
            Number(naive[4]),
            Number(naive[5]),
            Number(naive[6] ?? 0),
        );
    }

    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function dhakaParts(date: Date, withSeconds = false): Intl.DateTimeFormatPart[] {
    return new Intl.DateTimeFormat('en-GB', {
        timeZone: DISPLAY_TIMEZONE,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        ...(withSeconds ? { second: '2-digit' as const } : {}),
        hour12: true,
    }).formatToParts(date);
}

function formatDhakaParts(date: Date, withSeconds = false): { date: string; time: string } {
    const parts = dhakaParts(date, withSeconds);
    const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
    const ampm = (get('dayPeriod') || 'AM').replace(/\./g, '').replace(/\s/g, '').toUpperCase();
    const seconds = withSeconds ? `:${get('second')}` : '';

    return {
        date: `${get('day')}/${get('month')}/${get('year')}`,
        time: `${String(get('hour')).padStart(2, '0')}:${get('minute')}${seconds} ${ampm}`,
    };
}

/** Display date as dd/mm/YYYY (Asia/Dhaka when a time is present). */
export function formatDate(value: string | Date | number | null | undefined, fallback = '-'): string {
    const instant = parseDateTimeInstant(value);
    if (instant) {
        return formatDhakaParts(instant).date;
    }

    const date = parseDateValue(value);
    if (!date) return fallback === '' ? '' : fallback;

    return formatDhakaParts(date).date;
}

/** Display time only as hh:mm AM/PM (Asia/Dhaka). Date-only values return fallback. */
export function formatTime(
    value: string | Date | number | null | undefined,
    fallback = '',
    withSeconds = false,
): string {
    const date = parseDateTimeInstant(value);
    if (!date) return fallback;
    return formatDhakaParts(date, withSeconds).time;
}

/** Display date + time as dd/mm/YYYY hh:mm AM/PM (Asia/Dhaka). */
export function formatDateTime(value: string | Date | number | null | undefined, fallback = '-'): string {
    if (value == null || value === '') return fallback;

    const instant = parseDateTimeInstant(value);
    if (!instant) {
        return formatDate(value, fallback);
    }

    const { date, time } = formatDhakaParts(instant);
    return `${date} ${time}`;
}

/** Long date such as ১ সেপ্টেম্বর ২০২৬, always Asia/Dhaka. */
export function formatLongDate(
    value: string | Date | number | null | undefined,
    locale = 'bn-BD',
    fallback = '-',
): string {
    const date = parseDateTimeInstant(value) ?? parseDateValue(value);
    if (!date) return fallback;

    return new Intl.DateTimeFormat(locale, {
        timeZone: DISPLAY_TIMEZONE,
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(date);
}

/** Today's calendar date in Asia/Dhaka as YYYY-MM-DD (not the PC or UTC date). */
export function todayIsoDate(at: Date = new Date()): string {
    return toIsoDate(at);
}

/** Calendar date in Asia/Dhaka as YYYY-MM-DD. */
export function toIsoDate(value: string | Date | number | null | undefined): string {
    if (value == null || value === '') return '';

    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
        return value.trim();
    }

    const date = value instanceof Date ? value : parseDateTimeInstant(value) ?? parseDateValue(value);
    if (!date) return '';

    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: DISPLAY_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(date);

    const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
    return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Shift a YYYY-MM-DD calendar date by whole days (timezone-safe). */
export function addCalendarDays(isoDate: string, days: number): string {
    const [year, month, day] = isoDate.split('-').map(Number);
    const utc = new Date(Date.UTC(year, month - 1, day + days));
    return [
        utc.getUTCFullYear(),
        String(utc.getUTCMonth() + 1).padStart(2, '0'),
        String(utc.getUTCDate()).padStart(2, '0'),
    ].join('-');
}

/** Shift a YYYY-MM-DD calendar date by whole months (timezone-safe). */
export function addCalendarMonths(isoDate: string, months: number): string {
    const [year, month, day] = isoDate.split('-').map(Number);
    const utc = new Date(Date.UTC(year, month - 1 + months, day));
    return [
        utc.getUTCFullYear(),
        String(utc.getUTCMonth() + 1).padStart(2, '0'),
        String(utc.getUTCDate()).padStart(2, '0'),
    ].join('-');
}

function dhakaYmd(at: Date = new Date()): { year: number; month: number; day: number } {
    const [year, month, day] = todayIsoDate(at).split('-').map(Number);
    return { year, month, day };
}

export function startOfMonthIsoDate(at: Date = new Date()): string {
    const { year, month } = dhakaYmd(at);
    return `${year}-${String(month).padStart(2, '0')}-01`;
}

export function startOfYearIsoDate(at: Date = new Date()): string {
    return `${dhakaYmd(at).year}-01-01`;
}

export function lastMonthRangeIso(at: Date = new Date()): { from: string; to: string } {
    const { year, month } = dhakaYmd(at);
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonth = month === 1 ? 12 : month - 1;
    const lastDay = new Date(Date.UTC(prevYear, prevMonth, 0)).getUTCDate();

    return {
        from: `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`,
        to: `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
    };
}

/** For <input type="date"> — always YYYY-MM-DD */
export function toInputDateValue(value: string | Date | null | undefined): string {
    return toIsoDate(value);
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
