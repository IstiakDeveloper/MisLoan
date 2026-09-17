import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Sparkles, CornerDownLeft, Check } from 'lucide-react';

interface SmartIssueTextareaProps {
    value: string;
    onChange: (val: string) => void;
    presets: string[];
    placeholder?: string;
    required?: boolean;
    rows?: number;
    className?: string;
    autoFocus?: boolean;
}

// Phonetic and English keyword aliases for common verification issues
const KEYWORD_ALIASES: Record<string, string[]> = {
    'ফোন': ['phone', 'phn', 'মোবাইল', 'mobile', 'কল', 'call', 'ফোন'],
    'মোবাইল': ['mobile', 'phone', 'phn', 'নাম্বার', 'মোবাইল', 'নম্বর'],
    'রিসিভ': ['receive', 'rcv', 'ধরেনি', 'রিসিভ'],
    'কোড': ['code', 'কোড', 'নম্বর', 'নং'],
    'সদস্য': ['member', 'সদস্য', 'কাস্টমার'],
    'সমিতি': ['somiti', 'samity', 'সমিতি', 'ক্যাটাগরি'],
    'সঞ্চয়': ['shonchoy', 'sonchoy', 'savings', 'সঞ্চয়', 'সঞ্চয়'],
    'মেয়াদি': ['meyadi', 'dps', 'মেয়াদী', 'মেয়াদি', 'মেয়াদি'],
    'খেলাপি': ['khelapi', 'due', 'defaulter', 'খেলাপী', 'খেলাপি'],
    'ভর্তি': ['vorti', 'admission', 'ভর্তি'],
    'ম্যানেজার': ['manager', 'ম্যানেজার', 'বাসা', 'পরিদর্শন'],
    'আয়': ['income', 'aye', 'earning', 'আয়', 'বেতন'],
    'গ্যারান্টর': ['guarantor', 'jamin', 'জামিনদার', 'গ্যারান্টর', 'জামানত'],
    'ব্যবসায়িক': ['business', 'plan', 'ব্যবসা', 'দোকান'],
    'স্বাক্ষর': ['sign', 'signature', 'shakkhor', 'swakkhor', 'স্বাক্ষর', 'সই'],
    'ছবি': ['chobi', 'chabi', 'photo', 'picture', 'pic', 'ছবি'],
    'nid': ['nid', 'এনআইডি', 'ভোটার', 'পরিচয়পত্র', 'স্মার্টকার্ড'],
};

export function SmartIssueTextarea({
    value,
    onChange,
    presets,
    placeholder = 'চিহ্নিত সমস্যার বিবরণ লিখুন...',
    required = false,
    rows = 3,
    className = '',
    autoFocus = false,
}: SmartIssueTextareaProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Intelligently score and filter top 2-3 matched suggestions from presets
    const matchedSuggestions = useMemo(() => {
        const query = value.trim().toLowerCase();
        if (!query || query.length < 1) return [];

        const queryTokens = query.split(/\s+/).filter(Boolean);
        const scored: { preset: string; score: number }[] = [];

        for (const preset of presets) {
            const pLower = preset.toLowerCase();

            // Skip if the exact preset is already in the textarea
            if (pLower === query) continue;

            let score = 0;

            // 1. Full string match (prefix has highest weight)
            if (pLower.startsWith(query)) {
                score += 200;
            } else if (pLower.includes(query)) {
                score += 120;
            }

            // 2. Token-level match (checks each word typed)
            let matchedTokenCount = 0;
            for (const token of queryTokens) {
                if (pLower.includes(token)) {
                    score += 50;
                    matchedTokenCount++;
                } else {
                    // Check aliases
                    for (const [key, aliases] of Object.entries(KEYWORD_ALIASES)) {
                        const tokenMatchesAlias = aliases.some(
                            (a) => a.toLowerCase() === token || a.toLowerCase().includes(token) || token.includes(a.toLowerCase())
                        );
                        if (tokenMatchesAlias && (pLower.includes(key) || pLower.includes(key.replace('য়', 'য')))) {
                            score += 40;
                            matchedTokenCount++;
                            break;
                        }
                    }
                }
            }

            // If multiple tokens were typed, require at least one token match
            if (queryTokens.length > 1 && matchedTokenCount === 0) {
                score = 0;
            }

            if (score > 0) {
                // Slight bonus for shorter, cleaner texts
                score += Math.max(0, 20 - Math.floor(preset.length / 10));
                scored.push({ preset, score });
            }
        }

        // Sort descending by match score
        scored.sort((a, b) => b.score - a.score);

        // Return top 2-3 best matches
        return scored.slice(0, 3).map((item) => item.preset);
    }, [value, presets]);

    useEffect(() => {
        if (matchedSuggestions.length > 0) {
            setIsOpen(true);
            setActiveIndex(0);
        } else {
            setIsOpen(false);
        }
    }, [matchedSuggestions]);

    // Handle outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const applySuggestion = (text: string) => {
        onChange(text);
        setIsOpen(false);
        if (textareaRef.current) {
            textareaRef.current.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (!isOpen || matchedSuggestions.length === 0) return;

        if (e.key === 'Tab') {
            e.preventDefault();
            applySuggestion(matchedSuggestions[activeIndex] || matchedSuggestions[0]);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex((prev) => (prev + 1) % matchedSuggestions.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex((prev) => (prev - 1 + matchedSuggestions.length) % matchedSuggestions.length);
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    return (
        <div ref={containerRef} className="w-full">
            <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={rows}
                required={required}
                autoFocus={autoFocus}
                placeholder={placeholder}
                className={
                    className ||
                    'w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:bg-white transition'
                }
            />

            {/* Smart Suggestions Inline Box (Does NOT cover Save/Cancel buttons) */}
            {isOpen && matchedSuggestions.length > 0 && (
                <div className="mt-2 bg-gradient-to-r from-indigo-50/90 to-blue-50/90 border border-indigo-200 rounded-xl p-2.5 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between text-[11px] text-indigo-900 font-semibold mb-1.5">
                        <span className="flex items-center gap-1.5">
                            <Sparkles size={13} className="text-indigo-600" />
                            পরামর্শ / সাজেস্টেড লেখা:
                        </span>
                        <span className="text-[10px] text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-indigo-200 font-mono shadow-2xs">
                            Tab ⇥ চাপলে অটো-ফিল
                        </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                        {matchedSuggestions.slice(0, 4).map((item, idx) => {
                            const isSelected = idx === activeIndex;
                            return (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => applySuggestion(item)}
                                    onMouseEnter={() => setActiveIndex(idx)}
                                    className={`text-left px-2.5 py-1 text-xs rounded-lg border transition flex items-center gap-1.5 ${
                                        isSelected
                                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs font-medium'
                                            : 'bg-white text-slate-700 border-slate-200 hover:bg-indigo-100 hover:text-indigo-800'
                                    }`}
                                    title="ক্লিক করুন অথবা Tab চাপুন"
                                >
                                    <span className="truncate">{item}</span>
                                    {isSelected && (
                                        <span className="text-[9px] bg-white/25 px-1 py-0.2 rounded font-mono">
                                            Tab ⇥
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

export default SmartIssueTextarea;
