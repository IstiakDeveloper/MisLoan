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

export function todayInputValue(): string {
    return toInputDateValue(new Date());
}

/** Alias used in Bengali loan/savings forms */
export const formatDateBangla = formatDate;
