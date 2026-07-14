import React, { useState, useEffect, useRef } from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SmartDateInputProps {
    value: string | null | undefined;
    onChange: (value: string) => void;
    className?: string;
    error?: boolean | string;
    disabled?: boolean;
}

// Convert Bangla digits to English digits
function toEnglishDigits(value: string): string {
    const banglaToEnglishMap: Record<string, string> = {
        '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
        '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
    };
    let result = '';
    for (const ch of value) {
        result += banglaToEnglishMap[ch] ?? ch;
    }
    return result;
}

function toDisplayDate(isoDate: string | null | undefined): string {
    if (!isoDate || isoDate === '0000-00-00') return '';
    const parts = isoDate.split('T')[0].split(' ')[0].split('-');
    if (parts.length === 3) {
        const [year, month, day] = parts;
        return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }
    return String(isoDate);
}

function isValidDate(day: number, month: number, year: number): boolean {
    if (year < 1900 || year > 2100) return false;
    if (month < 1 || month > 12) return false;
    const daysInMonth = new Date(year, month, 0).getDate();
    return day >= 1 && day <= daysInMonth;
}

export function SmartDateInput({ value, onChange, className, error, disabled }: SmartDateInputProps) {
    const [displayVal, setDisplayVal] = useState(() => toDisplayDate(value));
    const [isFocused, setIsFocused] = useState(false);
    const [internalError, setInternalError] = useState<string | null>(null);

    useEffect(() => {
        setDisplayVal(toDisplayDate(value));
        setInternalError(null);
    }, [value]);

    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawVal = e.target.value;
        const englishVal = toEnglishDigits(rawVal);
        const cleanVal = englishVal.replace(/[^0-9/]/g, '');
        const digits = cleanVal.replace(/\D/g, '').slice(0, 8);
        
        let formatted = '';
        if (digits.length > 0) {
            formatted += digits.slice(0, 2);
        }
        if (digits.length > 2) {
            formatted += '/' + digits.slice(2, 4);
        } else if (digits.length === 2 && cleanVal.endsWith('/')) {
            formatted += '/';
        }
        
        if (digits.length > 4) {
            formatted += '/' + digits.slice(4, 8);
        } else if (digits.length === 4 && cleanVal.endsWith('/')) {
            formatted += '/';
        }
        
        setDisplayVal(formatted);
        
        if (digits.length === 8) {
            const day = parseInt(digits.slice(0, 2), 10);
            const month = parseInt(digits.slice(2, 4), 10);
            const year = parseInt(digits.slice(4, 8), 10);
            
            if (isValidDate(day, month, year)) {
                setInternalError(null);
                const iso = `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                onChange(iso);
            } else {
                setInternalError("সঠিক তারিখ লিখুন (দিন/মাস/বছর)");
                onChange(formatted);
            }
        } else {
            setInternalError(null);
            onChange(formatted); // Send partial formatted value to parent for live validation if needed
        }
    };

    const handleBlur = () => {
        setIsFocused(false);
        const digitsLength = displayVal.replace(/\D/g, '').length;
        if (displayVal && digitsLength > 0 && digitsLength < 8) {
            setInternalError("পূর্ণাঙ্গ তারিখ লিখুন (দিন/মাস/বছর)");
        }
    };

    const errorText = typeof error === 'string' ? error : internalError;
    const hasError = Boolean(error || internalError);

    const displayInputClass = cn(
        "w-full border rounded-xl pl-3.5 pr-10 py-2.5 text-sm bg-white shadow-sm outline-none transition-all",
        hasError
            ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
            : isFocused
            ? 'border-blue-500 ring-2 ring-blue-100'
            : 'border-slate-200 hover:border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-100',
        disabled && 'bg-slate-50 text-slate-400 cursor-not-allowed',
        className
    );

    return (
        <div className="w-full">
            <div className="relative w-full">
                <input
                    type="text"
                    inputMode="numeric"
                    value={displayVal}
                    onChange={handleTextChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={handleBlur}
                    placeholder="DD/MM/YYYY"
                    disabled={disabled}
                    className={displayInputClass}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center p-1 text-slate-400 hover:text-slate-600 transition-colors pointer-events-none">
                    <Calendar className="w-4 h-4" />
                </div>
                <input
                    type="date"
                    value={value || ''}
                    onChange={(e) => {
                        const val = e.target.value;
                        onChange(val);
                    }}
                    disabled={disabled}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 opacity-0 cursor-pointer border-none bg-transparent outline-none p-0"
                    title="Calendar Picker"
                />
            </div>
            {errorText && (
                <p className="text-[11px] text-rose-600 font-medium mt-1">{errorText}</p>
            )}
        </div>
    );
}
