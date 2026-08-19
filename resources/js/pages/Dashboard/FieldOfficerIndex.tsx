import React, { useState, useEffect } from 'react';
import AdminLayout from '@/layouts/admin-layout';
import { Head, Link, router } from '@inertiajs/react';
import {
    UserCheck,
    FileEdit,
    Clock,
    CheckCircle2,
    AlertTriangle,
    ShieldCheck,
    Wallet,
    XCircle,
    Building2,
    ArrowUpRight,
    Sparkles,
    Activity,
    PlusCircle,
    UserPlus,
    FilePlus2,
    TrendingUp,
    CheckCircle,
    ChevronRight,
    Layers,
    Send,
} from 'lucide-react';

interface MyBranch {
    id: number;
    name: string;
    code: string;
    area_id: number;
    area: {
        id: number;
        name: string;
        code: string;
        zone_id: number;
        zone: { id: number; name: string; code: string };
    };
}

interface FOItem {
    admission: number;
    loan: number;
    total: number;
    amount?: number;
}

interface FOStats {
    draft: FOItem;
    pending_manager: FOItem;
    higher_approvers: FOItem;
    needs_correction: FOItem;
    approved: FOItem;
    disbursed: FOItem;
    rejected: FOItem;
    totals: FOItem;
}

interface RecentApplication {
    id: number;
    type: 'loan' | 'admission';
    application_no: string;
    applicant_name: string;
    detail: string;
    amount: number | null;
    status: string;
    created_at: string;
    url: string;
}

interface Props {
    period: 'today' | 'monthly' | 'date_to_date';
    dateFrom: string | null;
    dateTo: string | null;
    myBranches: MyBranch[];
    dashboardType: string;
    foStats: FOStats;
    recentApplications: RecentApplication[];
    user: {
        id: number;
        name: string;
        role: string;
        branch: string;
    };
}

/**
 * Modern SVG Circular Progress Ring
 */
function CircularProgress({
    percentage,
    size = 36,
    strokeWidth = 3.5,
    color = '#4f46e5',
    trackColor = '#f1f5f9',
    label,
}: {
    percentage: number;
    size?: number;
    strokeWidth?: number;
    color?: string;
    trackColor?: string;
    label?: string;
}) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const clamped = Math.min(100, Math.max(0, percentage));
    const strokeDashoffset = circumference - (clamped / 100) * circumference;

    return (
        <div className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={trackColor}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-700 ease-out"
                />
            </svg>
            <span className="absolute text-[9px] font-black text-slate-700 select-none">
                {label || `${clamped}%`}
            </span>
        </div>
    );
}

/**
 * Vertical Dynamic Equalizer / Mini Ratio Bars
 */
function VerticalSplitBars({
    admission,
    loan,
    primaryColor = 'bg-blue-600',
    secondaryColor = 'bg-indigo-600',
}: {
    admission: number;
    loan: number;
    primaryColor?: string;
    secondaryColor?: string;
}) {
    const total = admission + loan;
    const maxVal = Math.max(admission, loan, 1);
    const admHeight = total > 0 ? Math.max(20, Math.round((admission / maxVal) * 100)) : 15;
    const loanHeight = total > 0 ? Math.max(20, Math.round((loan / maxVal) * 100)) : 15;

    return (
        <div className="flex items-end gap-1 h-7 px-1.5 py-0.5 bg-slate-50/80 rounded-lg border border-slate-100/90 shrink-0">
            <div className="flex flex-col items-center gap-0.5" title={`ভর্তি: ${admission}`}>
                <div
                    style={{ height: `${(admHeight / 100) * 18}px` }}
                    className={`w-1.5 rounded-full ${secondaryColor} transition-all duration-500`}
                />
            </div>
            <div className="flex flex-col items-center gap-0.5" title={`ঋণ: ${loan}`}>
                <div
                    style={{ height: `${(loanHeight / 100) * 18}px` }}
                    className={`w-1.5 rounded-full ${primaryColor} transition-all duration-500`}
                />
            </div>
        </div>
    );
}

export default function FieldOfficerDashboard({
    period,
    dateFrom,
    dateTo,
    myBranches,
    foStats,
    recentApplications,
    user,
}: Props) {
    const [periodSelect, setPeriodSelect] = useState<'today' | 'monthly' | 'date_to_date'>(period);
    const [fromDate, setFromDate] = useState(dateFrom ?? '');
    const [toDate, setToDate] = useState(dateTo ?? '');

    useEffect(() => {
        setPeriodSelect(period);
        setFromDate(dateFrom ?? '');
        setToDate(dateTo ?? '');
    }, [period, dateFrom, dateTo]);

    const applyFilter = (newPeriod?: 'today' | 'monthly' | 'date_to_date') => {
        const p = newPeriod || periodSelect;
        const params: Record<string, string> = { period: p };
        if (p === 'date_to_date' && fromDate && toDate) {
            params.from_date = fromDate;
            params.to_date = toDate;
        }
        const query = new URLSearchParams(params).toString();
        router.get(query ? `/dashboard?${query}` : '/dashboard');
    };

    const handlePeriodChange = (val: 'today' | 'monthly' | 'date_to_date') => {
        setPeriodSelect(val);
        if (val !== 'date_to_date') {
            applyFilter(val);
        }
    };

    const formatCurrency = (amount?: number) => {
        const val = Number(amount || 0);
        if (val >= 10000000) {
            return `৳ ${(val / 10000000).toFixed(2)} কোটি`;
        }
        if (val >= 100000) {
            return `৳ ${(val / 100000).toFixed(2)} লাখ`;
        }
        return '৳ ' + val.toLocaleString('en-IN');
    };

    const stats = foStats || {
        draft: { admission: 0, loan: 0, total: 0 },
        pending_manager: { admission: 0, loan: 0, total: 0 },
        higher_approvers: { admission: 0, loan: 0, total: 0 },
        needs_correction: { admission: 0, loan: 0, total: 0 },
        approved: { admission: 0, loan: 0, total: 0, amount: 0 },
        disbursed: { admission: 0, loan: 0, total: 0, amount: 0 },
        rejected: { admission: 0, loan: 0, total: 0 },
        totals: { admission: 0, loan: 0, total: 0 },
    };

    const totalActiveFO =
        stats.draft.total +
        stats.pending_manager.total +
        stats.higher_approvers.total +
        stats.needs_correction.total +
        stats.approved.total;

    const statusBadge = (status: string) => {
        const map: Record<string, { label: string; bg: string; text: string }> = {
            draft: { label: 'খসড়া', bg: 'bg-slate-100', text: 'text-slate-700' },
            submitted: { label: 'ম্যানেজার পেন্ডিং', bg: 'bg-blue-50', text: 'text-blue-700' },
            under_review: { label: 'উর্ধ্বতন পর্যায়', bg: 'bg-amber-50', text: 'text-amber-700' },
            ready_for_head_office: { label: 'হেড অফিস প্রস্তুত', bg: 'bg-indigo-50', text: 'text-indigo-700' },
            pending_head_office: { label: 'হেড অফিস রিভিউ', bg: 'bg-purple-50', text: 'text-purple-700' },
            approved: { label: 'অনুমোদিত', bg: 'bg-emerald-50', text: 'text-emerald-700' },
            pending_disbursement: { label: 'বিতরণ বাকি', bg: 'bg-teal-50', text: 'text-teal-700' },
            disbursed: { label: 'সক্রিয় ঋণ', bg: 'bg-green-50', text: 'text-green-700' },
            needs_revision: { label: 'সংশোধন ফেরত', bg: 'bg-rose-50', text: 'text-rose-700' },
            needs_correction: { label: 'সংশোধন ফেরত', bg: 'bg-rose-50', text: 'text-rose-700' },
            rejected: { label: 'বাতিল', bg: 'bg-red-50', text: 'text-red-700' },
        };
        const s = map[status] || { label: status, bg: 'bg-slate-100', text: 'text-slate-700' };
        return (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${s.bg} ${s.text}`}>
                {s.label}
            </span>
        );
    };

    // Cards configuration specifically for Field Officer Workflow
    const cards = [
        {
            title: 'খসড়া আবেদন (জমা বাকি)',
            subtitle: 'Drafts to Submit to Manager',
            icon: FileEdit,
            total: stats.draft.total,
            admission: stats.draft.admission,
            loan: stats.draft.loan,
            admUrl: '/member-admissions?status=draft',
            loanUrl: '/member/loan-applications?status=draft',
            badgeBg: 'bg-slate-800 text-white',
            btnBg: 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200/90',
            iconBg: 'bg-slate-100 text-slate-700 border-slate-200',
            cardBorder: 'border-slate-200/90 hover:border-slate-400 bg-white',
            visualType: 'equalizer',
            eqPrimary: 'bg-slate-700',
            eqSecondary: 'bg-slate-500',
        },
        {
            title: 'ম্যানেজারের কাছে পেন্ডিং',
            subtitle: 'Pending Branch Manager Review',
            icon: UserCheck,
            total: stats.pending_manager.total,
            admission: stats.pending_manager.admission,
            loan: stats.pending_manager.loan,
            admUrl: '/member-admissions?status=submitted',
            loanUrl: '/member/loan-applications?status=submitted',
            badgeBg: 'bg-blue-600 text-white',
            btnBg: 'bg-blue-50/60 hover:bg-blue-100/80 text-blue-900 border-blue-200/80',
            iconBg: 'bg-blue-50 text-blue-600 border-blue-100',
            cardBorder: 'border-blue-200/90 hover:border-blue-400 bg-gradient-to-b from-blue-50/20 to-white',
            visualType: 'radial',
            radialColor: '#2563eb',
            percentage: totalActiveFO > 0 ? Math.round((stats.pending_manager.total / totalActiveFO) * 100) : 0,
        },
        {
            title: 'উর্ধ্বতন কর্তৃপক্ষের কাছে',
            subtitle: 'RM / ZM / ADMF / DMF / ED / HO',
            icon: Layers,
            total: stats.higher_approvers.total,
            admission: stats.higher_approvers.admission,
            loan: stats.higher_approvers.loan,
            admUrl: '/member-admissions?status=under_review',
            loanUrl: '/member/loan-applications?status=under_review',
            badgeBg: 'bg-purple-600 text-white',
            btnBg: 'bg-purple-50/60 hover:bg-purple-100/80 text-purple-900 border-purple-200/80',
            iconBg: 'bg-purple-50 text-purple-600 border-purple-100',
            cardBorder: 'border-purple-200/90 hover:border-purple-400 bg-gradient-to-b from-purple-50/20 to-white',
            visualType: 'equalizer',
            eqPrimary: 'bg-purple-600',
            eqSecondary: 'bg-indigo-500',
        },
        {
            title: 'সংশোধনের জন্য ফেরত',
            subtitle: 'Needs Correction / Fix & Resubmit',
            icon: AlertTriangle,
            total: stats.needs_correction.total,
            admission: stats.needs_correction.admission,
            loan: stats.needs_correction.loan,
            admUrl: '/member-admissions?status=needs_revision',
            loanUrl: '/member/loan-applications?status=needs_correction',
            badgeBg: 'bg-amber-600 text-white',
            btnBg: 'bg-amber-50/70 hover:bg-amber-100 text-amber-950 border-amber-200/90',
            iconBg: 'bg-amber-100 text-amber-700 border-amber-200',
            cardBorder: 'ring-2 ring-amber-400/80 border-amber-400 shadow-sm shadow-amber-500/10 bg-gradient-to-b from-amber-50/30 to-white',
            isSpecialHighlight: true,
            highlightBadge: 'জরুরি সংশোধন',
            visualType: 'radial',
            radialColor: '#d97706',
            percentage: totalActiveFO > 0 ? Math.round((stats.needs_correction.total / totalActiveFO) * 100) : 0,
        },
        {
            title: 'অনুমোদিত আবেদনসমূহ',
            subtitle: 'Approved & Ready for Disbursement',
            icon: CheckCircle2,
            total: stats.approved.total,
            admission: stats.approved.admission,
            loan: stats.approved.loan,
            admUrl: '/member-admissions?status=approved',
            loanUrl: '/member/loan-applications?status=approved',
            badgeBg: 'bg-emerald-600 text-white',
            btnBg: 'bg-emerald-50/60 hover:bg-emerald-100/80 text-emerald-900 border-emerald-200/80',
            iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
            cardBorder: 'border-emerald-200/90 hover:border-emerald-400 bg-gradient-to-b from-emerald-50/20 to-white',
            visualType: 'equalizer',
            eqPrimary: 'bg-emerald-600',
            eqSecondary: 'bg-green-500',
        },
        {
            title: 'বিতরণকৃত ও সক্রিয় ঋণ',
            subtitle: 'Active Disbursed Portfolio',
            icon: Wallet,
            total: stats.disbursed.loan,
            isPortfolio: true,
            loan: stats.disbursed.loan,
            amount: formatCurrency(stats.disbursed.amount),
            loanUrl: '/member/loan-applications?status=disbursed',
            badgeBg: 'bg-teal-600 text-white',
            btnBg: 'bg-teal-50/60 hover:bg-teal-100/80 text-teal-900 border-teal-200/80',
            iconBg: 'bg-teal-50 text-teal-600 border-teal-100',
            cardBorder: 'border-teal-200/90 hover:border-teal-400 bg-gradient-to-b from-teal-50/20 to-white',
            visualType: 'radial',
            radialColor: '#0d9488',
            percentage: 100,
        },
        {
            title: 'বাতিল / প্রত্যাখ্যাত',
            subtitle: 'Rejected Applications',
            icon: XCircle,
            total: stats.rejected.total,
            admission: stats.rejected.admission,
            loan: stats.rejected.loan,
            admUrl: '/member-admissions?status=rejected',
            loanUrl: '/member/loan-applications?status=rejected',
            badgeBg: 'bg-rose-600 text-white',
            btnBg: 'bg-rose-50/60 hover:bg-rose-100/80 text-rose-900 border-rose-200/80',
            iconBg: 'bg-rose-50 text-rose-600 border-rose-100',
            cardBorder: 'border-rose-200/90 hover:border-rose-300 bg-white',
            visualType: 'radial',
            radialColor: '#e11d48',
            percentage: stats.totals.total > 0 ? Math.round((stats.rejected.total / stats.totals.total) * 100) : 0,
        },
    ];

    // FO Performance Funnel Vertical Chart
    const performanceColumns = [
        { label: 'খসড়া প্রস্তুত', count: stats.draft.total, color: 'from-slate-700 to-slate-500' },
        { label: 'ম্যানেজার', count: stats.pending_manager.total, color: 'from-blue-600 to-blue-400' },
        { label: 'উর্ধ্বতন স্তর', count: stats.higher_approvers.total, color: 'from-purple-600 to-purple-400' },
        { label: 'সংশোধন', count: stats.needs_correction.total, color: 'from-amber-600 to-amber-400' },
        { label: 'অনুমোদিত', count: stats.approved.total, color: 'from-emerald-600 to-emerald-400' },
        { label: 'বিতরণকৃত', count: stats.disbursed.total, color: 'from-teal-600 to-teal-400' },
    ];

    const maxColCount = Math.max(...performanceColumns.map((c) => c.count), 1);

    return (
        <AdminLayout>
            <Head title="মাঠ কর্মকর্তা ড্যাশবোর্ড" />

            <div className="max-w-7xl mx-auto space-y-3.5 pb-10">
                {/* 1. SLIM EXECUTIVE TOP BAR WITH FO PROFILE & ACTION SHORTCUTS */}
                <div className="bg-white px-4 py-2.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                    {/* Left: FO Identity */}
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs shrink-0">
                            <ShieldCheck size={17} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-sm font-bold text-slate-800 tracking-tight">
                                    {user?.name || 'মাঠ কর্মকর্তা ড্যাশবোর্ড'}
                                </h1>
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-200">
                                    মাঠ কর্মকর্তা (FO)
                                </span>
                                {myBranches?.[0]?.name && (
                                    <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                                        • {myBranches[0].name} ({myBranches[0].code})
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Period Switcher & Quick New Creation Shortcuts */}
                    <div className="flex items-center gap-2.5 ml-auto flex-wrap">
                        {/* Quick New Creation Buttons */}
                        <div className="flex items-center gap-1.5">
                            <Link
                                href="/member-admissions/create"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-all shadow-2xs"
                            >
                                <UserPlus size={13} />
                                <span>নতুন ভর্তি</span>
                            </Link>
                            <Link
                                href="/member/loan-applications/create"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-2xs"
                            >
                                <FilePlus2 size={13} />
                                <span>নতুন ঋণ</span>
                            </Link>
                        </div>

                        {/* Period Switcher */}
                        <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-semibold">
                            <button
                                type="button"
                                onClick={() => handlePeriodChange('today')}
                                className={`px-3 py-1 rounded-lg transition-all ${
                                    periodSelect === 'today'
                                        ? 'bg-white text-blue-600 shadow-2xs font-bold'
                                        : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                আজ
                            </button>
                            <button
                                type="button"
                                onClick={() => handlePeriodChange('monthly')}
                                className={`px-3 py-1 rounded-lg transition-all ${
                                    periodSelect === 'monthly'
                                        ? 'bg-white text-blue-600 shadow-2xs font-bold'
                                        : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                এই মাস
                            </button>
                            <button
                                type="button"
                                onClick={() => handlePeriodChange('date_to_date')}
                                className={`px-3 py-1 rounded-lg transition-all ${
                                    periodSelect === 'date_to_date'
                                        ? 'bg-white text-blue-600 shadow-2xs font-bold'
                                        : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                কাস্টম
                            </button>
                        </div>

                        {periodSelect === 'date_to_date' && (
                            <div className="flex items-center gap-1 bg-slate-50 p-0.5 rounded-xl border border-slate-200">
                                <input
                                    type="date"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                    className="rounded-lg border-0 bg-white text-xs py-1 px-1.5 text-slate-700 shadow-2xs focus:ring-1 focus:ring-blue-500"
                                />
                                <span className="text-slate-300 text-xs">-</span>
                                <input
                                    type="date"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                    className="rounded-lg border-0 bg-white text-xs py-1 px-1.5 text-slate-700 shadow-2xs focus:ring-1 focus:ring-blue-500"
                                />
                                <button
                                    type="button"
                                    onClick={() => applyFilter('date_to_date')}
                                    className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 shadow-2xs"
                                >
                                    ওকে
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. FIELD OFFICER STATUS CARDS (CLEAR & STREAMLINED 7-CARD GRID) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                    {cards.map((card, idx) => {
                        const Icon = card.icon;

                        return (
                            <div
                                key={idx}
                                className={`group relative rounded-2xl border ${card.cardBorder} p-4 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between`}
                            >
                                {/* Top Header of Card: Icon + Title + Visual Indicator */}
                                <div>
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className={`w-8 h-8 rounded-xl ${card.iconBg} border flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform shrink-0`}>
                                                <Icon size={16} className="stroke-[2.2]" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <h2 className="text-xs font-bold text-slate-800 tracking-tight leading-tight truncate">
                                                        {card.title}
                                                    </h2>
                                                    {card.isSpecialHighlight && (
                                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                                            <Sparkles size={9} className="text-amber-600" />
                                                            {card.highlightBadge}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] font-medium text-slate-400 truncate">
                                                    {card.subtitle}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Visual Element: Radial Progress Ring or Vertical Equalizer */}
                                        <div className="shrink-0 flex items-center gap-1.5">
                                            {card.visualType === 'radial' ? (
                                                <CircularProgress
                                                    percentage={card.percentage || 0}
                                                    color={card.radialColor}
                                                    size={32}
                                                    strokeWidth={3}
                                                    label={card.total > 0 ? String(card.total) : '০'}
                                                />
                                            ) : (
                                                <div className="flex items-center gap-1.5">
                                                    <VerticalSplitBars
                                                        admission={card.admission || 0}
                                                        loan={card.loan || 0}
                                                        primaryColor={card.eqPrimary}
                                                        secondaryColor={card.eqSecondary}
                                                    />
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${card.badgeBg} shadow-2xs`}>
                                                        {card.total}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Bottom: Separate Clickable Buttons for Admission & Loan */}
                                {!card.isPortfolio ? (
                                    <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-slate-100">
                                        <Link
                                            href={card.admUrl}
                                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border transition-all shadow-2xs group/btn ${card.btnBg}`}
                                        >
                                            <span className="text-[11px] font-semibold text-slate-600 group-hover/btn:text-slate-900">ভর্তি</span>
                                            <span className="text-xs font-bold text-slate-800 group-hover/btn:text-blue-600 flex items-center gap-0.5">
                                                {card.admission}
                                                <ArrowUpRight size={11} className="text-slate-400 group-hover/btn:text-blue-600 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                                            </span>
                                        </Link>

                                        <Link
                                            href={card.loanUrl}
                                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border transition-all shadow-2xs group/btn ${card.btnBg}`}
                                        >
                                            <span className="text-[11px] font-semibold text-slate-600 group-hover/btn:text-slate-900">ঋণ</span>
                                            <span className="text-xs font-bold text-slate-800 group-hover/btn:text-blue-600 flex items-center gap-0.5">
                                                {card.loan}
                                                <ArrowUpRight size={11} className="text-slate-400 group-hover/btn:text-blue-600 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                                            </span>
                                        </Link>
                                    </div>
                                ) : (
                                    <Link
                                        href={card.loanUrl}
                                        className={`flex items-center justify-between px-3 py-1.5 rounded-xl border text-xs transition-all shadow-2xs group/btn ${card.btnBg}`}
                                    >
                                        <span className="text-[11px] font-semibold text-slate-600 group-hover/btn:text-slate-900">
                                            ঋণ: <strong className="font-bold text-slate-800">{card.loan} টি</strong>
                                        </span>
                                        <span className="font-bold text-slate-800 group-hover/btn:text-blue-600 flex items-center gap-1">
                                            {card.amount}
                                            <ArrowUpRight size={12} className="text-slate-400 group-hover/btn:text-blue-600 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                                        </span>
                                    </Link>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* 3. PERFORMANCE COLUMN CHART & RECENT ACTIVITY SECTION */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 pt-1">
                    {/* Left 2 Cols: Field Officer Progress Pipeline Chart */}
                    <div className="lg:col-span-2 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                    <TrendingUp size={15} />
                                </div>
                                <div>
                                    <h3 className="text-xs font-bold text-slate-800 tracking-tight">
                                        আমার কার্যক্রম ও পাইপলাইন অগ্রগতি
                                    </h3>
                                    <p className="text-[10px] text-slate-400 font-medium">
                                        ধাপভিত্তিক আবেদনের প্রবাহ ও অনুমোদন পরিস্থিতি
                                    </p>
                                </div>
                            </div>
                            <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
                                মোট আবেদন: {stats.totals.total} টি
                            </span>
                        </div>

                        {/* Visual Vertical Columns Chart */}
                        <div className="h-40 flex items-end justify-between gap-2 pt-4 px-2 pb-1 border-b border-slate-100">
                            {performanceColumns.map((col, cIdx) => {
                                const heightPct = maxColCount > 0 ? Math.max(12, Math.round((col.count / maxColCount) * 100)) : 12;

                                return (
                                    <div key={cIdx} className="flex-1 flex flex-col items-center justify-end h-full group">
                                        {/* Value Label on Top of Column */}
                                        <span className={`text-[10px] font-black mb-1 transition-transform group-hover:-translate-y-0.5 ${col.count > 0 ? 'text-slate-800 font-extrabold' : 'text-slate-300'}`}>
                                            {col.count}
                                        </span>

                                        {/* Vertical Bar */}
                                        <div className="w-full max-w-[36px] bg-slate-100 rounded-t-lg overflow-hidden flex items-end h-full">
                                            <div
                                                style={{ height: `${heightPct}%` }}
                                                className={`w-full bg-gradient-to-t ${col.color} rounded-t-lg transition-all duration-700 ease-out group-hover:brightness-110 shadow-2xs`}
                                            />
                                        </div>

                                        {/* Bottom Stage Label */}
                                        <span className="text-[10px] font-bold text-slate-500 mt-2 text-center truncate max-w-[62px] block" title={col.label}>
                                            {col.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right 1 Col: Recent Applications Feed */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-2.5">
                        <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                    <Activity size={15} />
                                </div>
                                <h3 className="text-xs font-bold text-slate-800 tracking-tight">
                                    আমার সাম্প্রতিক আবেদনসমূহ
                                </h3>
                            </div>
                        </div>

                        {/* Recent Items List */}
                        <div className="space-y-2 overflow-y-auto max-h-56 pr-0.5">
                            {!recentApplications || recentApplications.length === 0 ? (
                                <p className="text-xs text-slate-400 text-center py-6">কোন সাম্প্রতিক আবেদন পাওয়া যায়নি।</p>
                            ) : (
                                recentApplications.map((item, rIdx) => (
                                    <Link
                                        key={rIdx}
                                        href={item.url}
                                        className="flex items-center justify-between p-2 rounded-xl border border-slate-100 hover:border-blue-200 bg-slate-50/50 hover:bg-blue-50/40 transition-all group"
                                    >
                                        <div className="min-w-0 flex-1 pr-2">
                                            <div className="flex items-center gap-1.5">
                                                <span className={`text-[9px] font-black px-1.5 py-0.2 rounded uppercase ${item.type === 'loan' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                                    {item.type === 'loan' ? 'ঋণ' : 'ভর্তি'}
                                                </span>
                                                <p className="text-xs font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                                                    {item.applicant_name}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium mt-0.5">
                                                <span className="font-mono">{item.application_no}</span>
                                                <span>•</span>
                                                <span>{item.created_at}</span>
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0">
                                            {statusBadge(item.status)}
                                            {item.amount && (
                                                <p className="text-[10px] font-black text-slate-700 mt-0.5">
                                                    ৳ {item.amount.toLocaleString()}
                                                </p>
                                            )}
                                        </div>
                                    </Link>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
