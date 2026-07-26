/**
 * Whole-number money display (0.00 → "0", 5000.50 → "5001").
 * Shared base helper for amount formatting across the app.
 */
export function formatAmount(
    val: number | string | null | undefined,
): string {
    if (val == null || val === '') return '';
    const n =
        typeof val === 'number'
            ? val
            : parseFloat(String(val).replace(/[^\d.-]/g, ''));
    if (!Number.isFinite(n)) return String(val);
    return String(Math.round(n));
}

/** Locale currency without forced decimals (0 not 0.00). */
export function formatCurrency(
    val: number | string | null | undefined,
): string {
    if (val == null || val === '') return '';
    const n =
        typeof val === 'number'
            ? val
            : parseFloat(String(val).replace(/[^\d.-]/g, ''));
    if (!Number.isFinite(n)) return String(val);
    return new Intl.NumberFormat('en-BD', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(Math.round(n));
}

/**
 * Deep-normalize Inertia page props: whole decimals like "0.00" / "5000.00"
 * become "0" / "5000". Leaves real fractions (e.g. "0.5", "12.50") unchanged.
 */
export function stripWholeNumberDecimals<T>(value: T): T {
    if (Array.isArray(value)) {
        return value.map((item) => stripWholeNumberDecimals(item)) as T;
    }

    if (value && typeof value === 'object') {
        if (value instanceof Date || value instanceof File || value instanceof Blob) {
            return value;
        }

        const out: Record<string, unknown> = {};
        for (const [key, child] of Object.entries(
            value as Record<string, unknown>,
        )) {
            out[key] = stripWholeNumberDecimals(child);
        }
        return out as T;
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        // "0.00", "5000.000" → whole number string; "12.50" / "0.5" kept
        if (/^-?\d+\.0+$/.test(trimmed)) {
            return String(parseInt(trimmed, 10)) as T;
        }
    }

    return value;
}
