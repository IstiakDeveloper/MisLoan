import React, { useMemo } from 'react';
import {
    Send,
    Clock,
    CheckCircle2,
    Eye,
    X,
    FileCheck2,
} from 'lucide-react';
import { useHoSendCutoff } from '@/hooks/use-ho-send-cutoff';
import { formatDate } from '@/utils/dateUtils';

interface Props {
    today: string;
    sentDay: string;
    hoSentOn?: string | null;
    readyCount: number;
    readyTotalAmount?: number;
    sentCount: number;
    sentTotalAmount?: number;
    isViewingReadyList: boolean;
    isSending?: boolean;
    branchName?: string;
    branchCode?: string;
    onSelectSentDay: (day: string) => void;
    onClearSentFilter: () => void;
    onSendAllReady?: () => void;
    onViewReadyList?: () => void;
}

const formatAmount = (amount?: number | null) => {
    if (!amount) return '০';
    return new Intl.NumberFormat('en-BD', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

const shiftIsoDate = (iso: string, days: number) => {
    const [year, month, day] = iso.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + days);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

export default function BranchHoDispatchHub({
    today,
    sentDay,
    hoSentOn,
    readyCount,
    readyTotalAmount = 0,
    sentCount,
    sentTotalAmount = 0,
    isViewingReadyList,
    isSending = false,
    onSelectSentDay,
    onClearSentFilter,
    onSendAllReady,
    onViewReadyList,
}: Props) {
    const cutoff = useHoSendCutoff();
    const yesterday = useMemo(() => shiftIsoDate(today, -1), [today]);

    // Live remaining time calculation till cutoff
    const cutoffInfo = useMemo(() => {
        if (cutoff.is_blocked) {
            return {
                isBlocked: true,
                badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
                pulse: false,
                text: 'কাট-অফ শেষ (আজ আর পাঠানো যাবে না)',
            };
        }

        const [hh = 17, mm = 0] = (cutoff.time || '17:00').split(':').map(Number);
        const now = new Date();
        const dhakaTimeStr = now.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' });
        const dhakaDate = new Date(dhakaTimeStr);
        const targetDate = new Date(dhakaDate);
        targetDate.setHours(hh, mm, 0, 0);

        const diffMinutes = Math.floor((targetDate.getTime() - dhakaDate.getTime()) / 60000);

        if (diffMinutes <= 0) {
            return {
                isBlocked: true,
                badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
                pulse: false,
                text: 'কাট-অফ সময় শেষ',
            };
        }

        const hours = Math.floor(diffMinutes / 60);
        const mins = diffMinutes % 60;
        let timeRemaining = '';
        if (hours > 0) {
            timeRemaining = `বাকি ${hours} ঘণ্টা ${mins > 0 ? `${mins} মি.` : ''}`;
        } else {
            timeRemaining = `বাকি মাত্র ${mins} মিনিট!`;
        }

        if (diffMinutes <= 30) {
            return {
                isBlocked: false,
                badgeColor: 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse',
                pulse: true,
                text: `জরুরি: ${cutoff.badge} (${timeRemaining})`,
            };
        }

        if (diffMinutes <= 90) {
            return {
                isBlocked: false,
                badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
                pulse: false,
                text: `কাট-অফ: ${cutoff.badge} (${timeRemaining})`,
            };
        }

        return {
            isBlocked: false,
            badgeColor: 'bg-indigo-50/90 text-indigo-800 border-indigo-200',
            pulse: false,
            text: `কাট-অফ: ${cutoff.badge} (${timeRemaining})`,
        };
    }, [cutoff]);

    const isSentListActive = Boolean(hoSentOn && hoSentOn === sentDay);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 print:hidden">
            
            {/* ── CARD 1: READY TO DISPATCH (হেড অফিসে প্রেরণ বাকি) ── */}
            <div className={`rounded-2xl border p-3 flex flex-col justify-between transition-all duration-150 ${
                isViewingReadyList
                    ? 'border-indigo-400 bg-white ring-2 ring-indigo-500/20 shadow-xs'
                    : 'border-indigo-200/90 bg-gradient-to-br from-indigo-50/70 via-white to-indigo-50/30 shadow-2xs'
            }`}>
                {/* Top Row: Title, Icon & Status Pill */}
                <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                            <FileCheck2 size={15} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-xs font-black text-indigo-950 tracking-tight">
                                হেড অফিসে প্রেরণ বাকি
                            </h3>
                            <p className="text-[11px] text-slate-500 font-medium truncate">
                                শাখা অনুমোদিত ফাইল প্রধান কার্যালয়ে প্রেরণ
                            </p>
                        </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider shrink-0 ${
                        readyCount > 0
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                    }`}>
                        {readyCount > 0 ? 'প্রেরণ প্রয়োজন' : 'সব পাঠানো সম্পন্ন ✓'}
                    </span>
                </div>

                {/* Bottom Row: Count, Amount & Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-indigo-100/70">
                    <div className="flex items-baseline gap-2">
                        <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                            {readyCount}
                        </span>
                        <span className="text-xs font-bold text-slate-600">টি আবেদন</span>
                        {readyTotalAmount > 0 && (
                            <span className="text-xs font-bold text-indigo-700 bg-indigo-100/70 border border-indigo-200 px-2 py-0.5 rounded-md">
                                ৳ {formatAmount(readyTotalAmount)}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5">
                        {readyCount > 0 ? (
                            <>
                                <button
                                    type="button"
                                    onClick={onSendAllReady}
                                    disabled={cutoff.is_blocked || isSending}
                                    title={cutoff.is_blocked ? cutoff.blocked_message : 'এক ক্লিকে সকল প্রস্তুত আবেদন হেড অফিসে পাঠান'}
                                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-2xs transition"
                                >
                                    <Send size={12} className="shrink-0" />
                                    <span>এক ক্লিকে সব পাঠান ({readyCount})</span>
                                </button>
                                {onViewReadyList && (
                                    <button
                                        type="button"
                                        onClick={onViewReadyList}
                                        className={`inline-flex items-center gap-1 h-8 px-2.5 rounded-xl text-xs font-bold transition active:scale-95 ${
                                            isViewingReadyList
                                                ? 'bg-indigo-100 text-indigo-800'
                                                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs'
                                        }`}
                                    >
                                        <Eye size={12} />
                                        <span>{isViewingReadyList ? '✓ খোলা আছে' : 'তালিকা'}</span>
                                    </button>
                                )}
                            </>
                        ) : (
                            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 py-1">
                                <CheckCircle2 size={14} className="text-emerald-600" />
                                <span>কোনো ফাইল বাকি নেই</span>
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* ── CARD 2: SENT TODAY / ARCHIVE TRACKER (হেড অফিসে পাঠানো আজ) ── */}
            <div className={`rounded-2xl border p-3 flex flex-col justify-between transition-all duration-150 ${
                isSentListActive
                    ? 'border-purple-400 bg-purple-50/50 ring-2 ring-purple-500/20 shadow-xs'
                    : 'border-purple-200/90 bg-gradient-to-br from-purple-50/70 via-white to-purple-50/30 shadow-2xs'
            }`}>
                {/* Top Row: Title, Icon & Cutoff Badge */}
                <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                            <CheckCircle2 size={15} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                                <h3 className="text-xs font-black text-purple-950 tracking-tight">
                                    {sentDay === today ? 'আজ হেড অফিসে পাঠানো' : sentDay === yesterday ? 'গতকাল হেড অফিসে পাঠানো' : 'হেড অফিসে পাঠানো'}
                                </h3>
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium truncate">
                                প্রধান কার্যালয়ে জমা হওয়া আবেদনের হিসাব
                            </p>
                        </div>
                    </div>

                    {/* Cutoff Badge */}
                    <div className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-bold shadow-2xs shrink-0 ${cutoffInfo.badgeColor}`}>
                        <Clock size={12} className={`shrink-0 ${cutoffInfo.pulse ? 'text-rose-600' : ''}`} />
                        <span>{cutoffInfo.text}</span>
                    </div>
                </div>

                {/* Bottom Row: Count, Day Switcher & View Action */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-purple-100/70">
                    <div className="flex items-baseline gap-2">
                        <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                            {sentCount}
                        </span>
                        <span className="text-xs font-bold text-slate-600">টি প্রেরিত</span>
                        {sentTotalAmount > 0 && (
                            <span className="text-xs font-bold text-purple-700 bg-purple-100/70 border border-purple-200 px-2 py-0.5 rounded-md">
                                ৳ {formatAmount(sentTotalAmount)}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Day Pills: আজ | গতকাল | 📅 */}
                        <div className="inline-flex items-center rounded-xl bg-slate-100 p-0.5 text-xs font-bold text-slate-600">
                            <button
                                type="button"
                                onClick={() => onSelectSentDay(today)}
                                className={`rounded-lg px-2.5 py-1 transition ${
                                    sentDay === today
                                        ? 'bg-white text-indigo-900 shadow-2xs font-black'
                                        : 'hover:text-slate-900'
                                }`}
                            >
                                আজ
                            </button>
                            <button
                                type="button"
                                onClick={() => onSelectSentDay(yesterday)}
                                className={`rounded-lg px-2.5 py-1 transition ${
                                    sentDay === yesterday
                                        ? 'bg-white text-indigo-900 shadow-2xs font-black'
                                        : 'hover:text-slate-900'
                                }`}
                            >
                                গতকাল
                            </button>
                            <input
                                type="date"
                                value={sentDay}
                                max={today}
                                onChange={(e) => e.target.value && onSelectSentDay(e.target.value)}
                                className={`h-6 w-24 rounded-lg border-0 bg-transparent px-1 text-xs font-bold focus:ring-0 cursor-pointer ${
                                    sentDay !== today && sentDay !== yesterday
                                        ? 'bg-white text-indigo-900 font-black shadow-2xs'
                                        : 'text-slate-600'
                                }`}
                                title="অন্য দিন নির্বাচন করুন"
                            />
                        </div>

                        {/* View / Clear Button */}
                        {isSentListActive ? (
                            <button
                                type="button"
                                onClick={onClearSentFilter}
                                className="inline-flex items-center gap-1 h-8 px-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold shadow-2xs transition active:scale-95"
                                title="ফিল্টার মুছে মূল তালিকায় ফিরুন"
                            >
                                <X size={12} />
                                <span>✕ সব তালিকা</span>
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => onSelectSentDay(sentDay)}
                                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-2xs transition active:scale-95"
                            >
                                <Eye size={12} />
                                <span>{sentDay === today ? 'আজকের তালিকা' : 'তালিকা দেখুন'}</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
