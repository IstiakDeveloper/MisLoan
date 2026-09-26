/**
 * SmartDateInput — Reliable date input for Bangladesh (Asia/Dhaka)
 *
 * Rules:
 * - User types DD/MM/YYYY (Bangla or English digits accepted — always stored as English)
 * - Deletion / Backspace / Editing works from ANY cursor position (start, middle, end, selection)
 * - Digits do NOT jump or shift into adjacent parts when editing
 * - Cursor position is strictly preserved and never jumps to the end
 * - Calendar picker (type="date") syncs only when user explicitly chooses from it
 * - onChange always emits YYYY-MM-DD (ISO) when date is complete & valid
 * - onChange emits '' when field is cleared
 * - Bangladesh time (Asia/Dhaka) is strictly enforced
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SmartDateInputProps {
    value: string | null | undefined;
    onChange: (value: string) => void;
    className?: string;
    error?: boolean | string;
    disabled?: boolean;
    placeholder?: string;
}

const BANGLA_TO_EN: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
};

export function toEnglishDigits(value: string): string {
    let result = '';
    for (const ch of value) {
        result += BANGLA_TO_EN[ch] ?? ch;
    }
    return result;
}

/**
 * Convert YYYY-MM-DD → DD/MM/YYYY for display.
 */
function isoToDisplay(iso: string | null | undefined): string {
    if (!iso || iso === '0000-00-00') return '';
    const clean = iso.split('T')[0].split(' ')[0];
    const parts = clean.split('-');
    if (parts.length === 3) {
        const [year, month, day] = parts;
        if (year && month && day) {
            return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
        }
    }
    return '';
}

/**
 * Parse DD/MM/YYYY string into parts if valid.
 */
function parseDateParts(str: string): { day: number; month: number; year: number } | null {
    const parts = str.split('/');
    if (parts.length !== 3) return null;
    const [dStr, mStr, yStr] = parts;
    if (!yStr || yStr.length !== 4) return null;
    const day = parseInt(dStr, 10);
    const month = parseInt(mStr, 10);
    const year = parseInt(yStr, 10);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    if (year < 1900 || year > 2100) return null;
    if (month < 1 || month > 12) return null;
    const maxDays = new Date(year, month, 0).getDate();
    if (day < 1 || day > maxDays) return null;
    return { day, month, year };
}

function toISO(parts: { day: number; month: number; year: number }): string {
    return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

export function SmartDateInput({
    value,
    onChange,
    className,
    error,
    disabled,
    placeholder = 'DD/MM/YYYY',
}: SmartDateInputProps) {
    const [displayVal, setDisplayVal] = useState(() => isoToDisplay(value));
    const [isFocused, setIsFocused] = useState(false);
    const [internalError, setInternalError] = useState<string | null>(null);

    const inputRef = useRef<HTMLInputElement>(null);
    const pickerRef = useRef<HTMLInputElement>(null);
    const cursorRef = useRef<number | null>(null);
    const lastExternalIso = useRef(value ?? '');

    // Sync from parent if value changes externally
    useEffect(() => {
        const incoming = value ?? '';
        if (incoming !== lastExternalIso.current) {
            lastExternalIso.current = incoming;
            setDisplayVal(isoToDisplay(incoming));
            setInternalError(null);
        }
    }, [value]);

    // Restore exact cursor position after state re-render
    useLayoutEffect(() => {
        if (cursorRef.current !== null && inputRef.current) {
            const pos = Math.max(0, Math.min(cursorRef.current, inputRef.current.value.length));
            try {
                inputRef.current.setSelectionRange(pos, pos);
            } catch {
                // ignore
            }
            cursorRef.current = null;
        }
    }, [displayVal]);

    const updateValue = (formatted: string, nextCursor: number) => {
        setDisplayVal(formatted);
        cursorRef.current = nextCursor;

        if (!formatted.trim()) {
            setInternalError(null);
            lastExternalIso.current = '';
            onChange('');
            return;
        }

        const parts = parseDateParts(formatted);
        if (parts) {
            const iso = toISO(parts);
            setInternalError(null);
            lastExternalIso.current = iso;
            onChange(iso);
        } else {
            if (formatted.length >= 10) {
                setInternalError('সঠিক তারিখ লিখুন (দিন/মাস/বছর)');
            } else {
                setInternalError(null);
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (disabled) return;
        const input = e.currentTarget;
        const selStart = input.selectionStart ?? 0;
        const selEnd = input.selectionEnd ?? 0;
        const val = input.value;

        if (e.key === 'Backspace') {
            // When text is selected, allow native deletion
            if (selStart !== selEnd) {
                return;
            }
            // If cursor is right after a slash (e.g. "15/"), delete both slash and preceding digit
            if (selStart > 0 && val[selStart - 1] === '/') {
                e.preventDefault();
                const deleteUpTo = selStart >= 2 ? selStart - 2 : 0;
                const nextVal = val.slice(0, deleteUpTo) + val.slice(selStart);
                cursorRef.current = deleteUpTo;
                updateValue(nextVal, deleteUpTo);
                return;
            }
        } else if (e.key === 'Delete') {
            if (selStart !== selEnd) {
                return;
            }
            // If cursor is right before a slash (e.g. "15|/08"), delete both slash and next digit
            if (selStart < val.length && val[selStart] === '/') {
                e.preventDefault();
                const deleteFrom = selStart + 2 <= val.length ? selStart + 2 : val.length;
                const nextVal = val.slice(0, selStart) + val.slice(deleteFrom);
                cursorRef.current = selStart;
                updateValue(nextVal, selStart);
                return;
            }
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (disabled) return;
        const input = e.target;
        let raw = toEnglishDigits(input.value);
        // Only allow digits and slashes
        raw = raw.replace(/[^\d/]/g, '');

        const selStart = input.selectionStart ?? raw.length;
        const isForward = raw.length > displayVal.length;

        let formatted = raw;
        let nextCursor = selStart;

        // Auto-insert slash when typing forward at day and month boundaries
        if (isForward) {
            if (/^\d{2}$/.test(raw)) {
                formatted = `${raw}/`;
                nextCursor = 3;
            } else if (/^\d{2}\/\d{2}$/.test(raw)) {
                formatted = `${raw}/`;
                nextCursor = 6;
            }
        }

        if (formatted.length > 10) {
            formatted = formatted.slice(0, 10);
            nextCursor = Math.min(nextCursor, 10);
        }

        updateValue(formatted, nextCursor);
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        if (disabled) return;
        e.preventDefault();
        const text = toEnglishDigits(e.clipboardData.getData('text')).trim();

        // ISO format YYYY-MM-DD
        const isoMatch = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
        if (isoMatch) {
            const [, y, m, d] = isoMatch;
            const display = `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
            updateValue(display, display.length);
            return;
        }

        // DMY format DD/MM/YYYY
        const dmyMatch = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
        if (dmyMatch) {
            const [, d, m, y] = dmyMatch;
            const display = `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
            updateValue(display, display.length);
            return;
        }

        // 8 raw digits: DDMMYYYY
        const digits = text.replace(/\D/g, '').slice(0, 8);
        if (digits.length === 8) {
            const display = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
            updateValue(display, display.length);
            return;
        }

        // Fallback: insert digits
        updateValue(digits, digits.length);
    };

    const handleBlur = () => {
        setIsFocused(false);
        if (!displayVal.trim()) {
            setInternalError(null);
            return;
        }
        const parts = parseDateParts(displayVal);
        if (!parts) {
            setInternalError('পূর্ণাঙ্গ ও সঠিক তারিখ লিখুন (দিন/মাস/বছর)');
        } else {
            setInternalError(null);
        }
    };

    const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const pickedIso = e.target.value;
        if (!pickedIso) return;
        const display = isoToDisplay(pickedIso);
        setDisplayVal(display);
        setInternalError(null);
        lastExternalIso.current = pickedIso;
        onChange(pickedIso);
    };

    const openPicker = () => {
        if (disabled) return;
        const picker = pickerRef.current;
        if (!picker) return;
        if (typeof picker.showPicker === 'function') {
            try {
                picker.showPicker();
            } catch {
                picker.click();
            }
        } else {
            picker.click();
        }
    };

    const currentIsoForPicker = value && value.length === 10 ? value : '';
    const hasError = Boolean(error || internalError);
    const errorMessage = typeof error === 'string' ? error : internalError;

    return (
        <div className="relative w-full">
            <div
                className={cn(
                    'relative flex items-center w-full rounded-xl border bg-white transition-all',
                    hasError
                        ? 'border-red-500 ring-2 ring-red-200'
                        : isFocused
                        ? 'border-indigo-500 ring-2 ring-indigo-500/20'
                        : 'border-gray-300 hover:border-gray-400',
                    disabled && 'bg-slate-50 cursor-not-allowed opacity-75',
                    className
                )}
            >
                <input
                    ref={inputRef}
                    type="text"
                    inputMode="numeric"
                    value={displayVal}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    onFocus={() => setIsFocused(true)}
                    onBlur={handleBlur}
                    disabled={disabled}
                    placeholder={placeholder}
                    maxLength={10}
                    className="w-full bg-transparent px-3 py-2 pr-9 text-xs md:text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed"
                />

                <button
                    type="button"
                    tabIndex={-1}
                    onClick={openPicker}
                    disabled={disabled}
                    className="absolute right-2.5 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:cursor-not-allowed"
                    title="ক্যালেন্ডার খুলুন"
                >
                    <Calendar className="w-4 h-4" />
                </button>

                <input
                    ref={pickerRef}
                    type="date"
                    tabIndex={-1}
                    value={currentIsoForPicker}
                    onChange={handlePickerChange}
                    disabled={disabled}
                    className="sr-only pointer-events-none"
                    aria-hidden="true"
                />
            </div>

            {hasError && errorMessage && (
                <p className="mt-1 text-xs text-red-600 font-medium">
                    {errorMessage}
                </p>
            )}
        </div>
    );
}
export default SmartDateInput;
