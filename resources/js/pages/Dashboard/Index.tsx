import React, { useState, useEffect } from 'react';
import AdminLayout from '@/layouts/admin-layout';
import { Head, Link, router } from '@inertiajs/react';
import {
    Building2,
    Send,
    UserCheck,
    MapPin,
    Layers,
    Users,
    Clock,
    Wallet,
    CheckCircle2,
    AlertTriangle,
    FileEdit,
    XCircle,
    FileSpreadsheet,
    ChevronRight,
    ArrowUpRight,
    Sparkles,
    BarChart3,
    Activity,
    ShieldCheck,
    Globe2,
    CheckSquare,
} from 'lucide-react';

interface HOItem {
    admission?: number;
    loan?: number;
    total?: number;
    count?: number;
    proposed_amount?: number;
    approved_amount?: number;
    amount?: number;
}

interface SystemScale {
    total_zones: number;
    total_areas: number;
    total_branches: number;
    total_users: number;
    total_admissions: number;
    total_loans: number;
}

interface HOStats {
    pending_head_office: HOItem;
    ready_for_head_office: HOItem;
    team_based: HOItem;
    approved: HOItem;
    pending_disbursement: HOItem;
    active_disbursed: HOItem;
    branch_level: HOItem;
    region_zone_level: HOItem;
    needs_correction: HOItem;
    draft: HOItem;
    rejected: HOItem;
    system_scale: SystemScale;
}

interface ActionQueueItem {
    id: number;
    type: 'loan' | 'admission';
    application_no: string;
    applicant_name: string;
    detail: string;
    branch_name: string;
    amount: number | null;
    status: string;
    created_at: string;
    url: string;
}

interface Props {
    period: 'today' | 'monthly' | 'date_to_date';
    dateFrom: string | null;
    dateTo: string | null;
    dashboardType: string;
    hoStats: HOStats;
    hoActionQueue: ActionQueueItem[];
    user: {
        id: number;
        name: string;
        role: string;
    };
}

/**
 * Modern SVG Circular / Radial Progress Ring
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

export default function HeadOfficeDashboard({
    period,
    dateFrom,
    dateTo,
    hoStats,
    hoActionQueue,
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

    const stats = hoStats || {
        pending_head_office: { admission: 0, loan: 0, total: 0 },
        ready_for_head_office: { admission: 0, loan: 0, total: 0 },
        team_based: { count: 0, proposed_amount: 0, approved_amount: 0 },
        approved: { admission: 0, loan: 0, total: 0, amount: 0 },
        pending_disbursement: { admission: 0, loan: 0, total: 0, amount: 0 },
        active_disbursed: { admission: 0, loan: 0, total: 0, amount: 0 },
        branch_level: { admission: 0, loan: 0, total: 0 },
        region_zone_level: { admission: 0, loan: 0, total: 0 },
        needs_correction: { admission: 0, loan: 0, total: 0 },
        draft: { admission: 0, loan: 0, total: 0 },
        rejected: { admission: 0, loan: 0, total: 0 },
        system_scale: { total_zones: 0, total_areas: 0, total_branches: 0, total_users: 0, total_admissions: 0, total_loans: 0 },
    };

    const totalPipeline =
        (stats.pending_head_office.total || 0) +
        (stats.ready_for_head_office.total || 0) +
        (stats.region_zone_level.total || 0) +
        (stats.branch_level.total || 0) +
        (stats.approved.total || 0) +
        (stats.pending_disbursement.total || 0);

    // 12 Cards configuration tailored for Head Office Executive Command Center
    const cards = [
        {
            title: 'হেড অফিসে পেন্ডিং ও যাচাই',
            subtitle: 'Pending Review at Head Office',
            icon: Building2,
            total: stats.pending_head_office.total || 0,
            admission: stats.pending_head_office.admission || 0,
            loan: stats.pending_head_office.loan || 0,
            admUrl: '/member-admissions?status=pending_head_office',
            loanUrl: '/member/loan-applications?status=pending_head_office',
            badgeBg: 'bg-purple-600 text-white',
            btnBg: 'bg-purple-50/80 hover:bg-purple-100/90 text-purple-900 border-purple-200/90',
            iconBg: 'bg-purple-600 text-white border-purple-600',
            cardBorder: 'ring-2 ring-purple-500/90 border-purple-500 shadow-md shadow-purple-500/10 bg-gradient-to-b from-purple-50/50 via-white to-white',
            isSpecialHighlight: true,
            highlightBadge: 'চূড়ান্ত যাচাই ও অনুমোদন',
            visualType: 'radial',
            radialColor: '#9333ea',
            percentage: totalPipeline > 0 ? Math.round(((stats.pending_head_office.total || 0) / totalPipeline) * 100) : 0,
        },
        {
            title: 'হেড অফিসে পাঠানো প্রস্তুত',
            subtitle: 'Ready from Branches to Ingest',
            icon: Send,
            total: stats.ready_for_head_office.total || 0,
            admission: stats.ready_for_head_office.admission || 0,
            loan: stats.ready_for_head_office.loan || 0,
            admUrl: '/member-admissions?status=ready_for_head_office',
            loanUrl: '/member/loan-applications?status=ready_for_head_office',
            badgeBg: 'bg-indigo-600 text-white',
            btnBg: 'bg-indigo-50/80 hover:bg-indigo-100/90 text-indigo-900 border-indigo-200/90',
            iconBg: 'bg-indigo-600 text-white border-indigo-600',
            cardBorder: 'ring-2 ring-indigo-500/90 border-indigo-500 shadow-md shadow-indigo-500/10 bg-gradient-to-b from-indigo-50/50 via-white to-white',
            isSpecialHighlight: true,
            highlightBadge: 'শাখা থেকে প্রেরিত',
            visualType: 'radial',
            radialColor: '#4f46e5',
            percentage: totalPipeline > 0 ? Math.round(((stats.ready_for_head_office.total || 0) / totalPipeline) * 100) : 0,
        },
        {
            title: 'টিম-বেসড আর্থিক অনুমোদন',
            subtitle: 'Team-Based Review Sheets',
            icon: FileSpreadsheet,
            total: stats.team_based.count || 0,
            isPortfolio: true,
            loan: stats.team_based.count || 0,
            amount: formatCurrency(stats.team_based.proposed_amount),
            loanUrl: '/team-based-approvals',
            badgeBg: 'bg-blue-600 text-white',
            btnBg: 'bg-blue-50/80 hover:bg-blue-100/90 text-blue-900 border-blue-200/90',
            iconBg: 'bg-blue-600 text-white border-blue-600',
            cardBorder: 'border-blue-200/90 hover:border-blue-400 bg-white',
            visualType: 'radial',
            radialColor: '#2563eb',
            percentage: 100,
        },
        {
            title: 'সারাদেশে সম্পূর্ণ অনুমোদিত',
            subtitle: 'Nationwide Fully Approved',
            icon: CheckCircle2,
            total: stats.approved.total || 0,
            admission: stats.approved.admission || 0,
            loan: stats.approved.loan || 0,
            admUrl: '/member-admissions?status=approved',
            loanUrl: '/member/loan-applications?status=approved',
            badgeBg: 'bg-emerald-600 text-white',
            btnBg: 'bg-slate-50/80 hover:bg-emerald-50/60 text-slate-800 hover:text-emerald-900 border-slate-200/80 hover:border-emerald-200',
            iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
            cardBorder: 'border-slate-200/90 hover:border-emerald-300 bg-white',
            visualType: 'equalizer',
            eqPrimary: 'bg-emerald-600',
            eqSecondary: 'bg-green-500',
        },
        {
            title: 'বিতরণের অপেক্ষায় ঋণ',
            subtitle: 'Pending Fund Disbursement',
            icon: Clock,
            total: stats.pending_disbursement.loan || 0,
            isPortfolio: true,
            loan: stats.pending_disbursement.loan || 0,
            amount: formatCurrency(stats.pending_disbursement.amount),
            loanUrl: '/member/loan-applications?status=pending_disbursement',
            badgeBg: 'bg-teal-600 text-white',
            btnBg: 'bg-slate-50/80 hover:bg-teal-50/60 text-slate-800 hover:text-teal-900 border-slate-200/80 hover:border-teal-200',
            iconBg: 'bg-teal-50 text-teal-600 border-teal-100',
            cardBorder: 'border-slate-200/90 hover:border-teal-300 bg-white',
            visualType: 'radial',
            radialColor: '#0d9488',
            percentage: (stats.active_disbursed.total || 0) + (stats.pending_disbursement.total || 0) > 0 ? Math.round(((stats.pending_disbursement.total || 0) / ((stats.active_disbursed.total || 0) + (stats.pending_disbursement.total || 0))) * 100) : 0,
        },
        {
            title: 'সক্রিয় ঋণ পোর্টফোলিও',
            subtitle: 'Active Disbursed Loans',
            icon: Wallet,
            total: stats.active_disbursed.loan || 0,
            isPortfolio: true,
            loan: stats.active_disbursed.loan || 0,
            amount: formatCurrency(stats.active_disbursed.amount),
            loanUrl: '/member/loan-applications?status=disbursed',
            badgeBg: 'bg-emerald-600 text-white',
            btnBg: 'bg-slate-50/80 hover:bg-emerald-50/60 text-slate-800 hover:text-emerald-900 border-slate-200/80 hover:border-emerald-200',
            iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
            cardBorder: 'border-slate-200/90 hover:border-emerald-300 bg-white',
            visualType: 'radial',
            radialColor: '#059669',
            percentage: 100,
        },
        {
            title: 'শাখা ও মাঠ পর্যায়ে চলমান',
            subtitle: 'Branch Manager & Field Levels',
            icon: UserCheck,
            total: stats.branch_level.total || 0,
            admission: stats.branch_level.admission || 0,
            loan: stats.branch_level.loan || 0,
            admUrl: '/member-admissions?status=submitted',
            loanUrl: '/member/loan-applications?status=submitted',
            badgeBg: 'bg-sky-600 text-white',
            btnBg: 'bg-slate-50/80 hover:bg-sky-50/60 text-slate-800 hover:text-sky-900 border-slate-200/80 hover:border-sky-200',
            iconBg: 'bg-sky-50 text-sky-600 border-sky-100',
            cardBorder: 'border-slate-200/90 hover:border-sky-300 bg-white',
            visualType: 'equalizer',
            eqPrimary: 'bg-sky-600',
            eqSecondary: 'bg-blue-500',
        },
        {
            title: 'রিজিওনাল ও জোনাল পর্যায়',
            subtitle: 'Area (RM) & Zone (ZM) Reviews',
            icon: Layers,
            total: stats.region_zone_level.total || 0,
            admission: stats.region_zone_level.admission || 0,
            loan: stats.region_zone_level.loan || 0,
            admUrl: '/member-admissions?status=under_review',
            loanUrl: '/member/loan-applications?status=under_review',
            badgeBg: 'bg-amber-600 text-white',
            btnBg: 'bg-slate-50/80 hover:bg-amber-50/60 text-slate-800 hover:text-amber-900 border-slate-200/80 hover:border-amber-200',
            iconBg: 'bg-amber-50 text-amber-600 border-amber-100',
            cardBorder: 'border-slate-200/90 hover:border-amber-300 bg-white',
            visualType: 'radial',
            radialColor: '#d97706',
            percentage: totalPipeline > 0 ? Math.round(((stats.region_zone_level.total || 0) / totalPipeline) * 100) : 0,
        },
        {
            title: 'সংশোধনের জন্য প্রেরিত',
            subtitle: 'Needs Correction / Revision',
            icon: AlertTriangle,
            total: stats.needs_correction.total || 0,
            admission: stats.needs_correction.admission || 0,
            loan: stats.needs_correction.loan || 0,
            admUrl: '/member-admissions?status=needs_revision',
            loanUrl: '/member/loan-applications?status=needs_correction',
            badgeBg: 'bg-amber-500 text-white',
            btnBg: 'bg-slate-50/80 hover:bg-amber-50/60 text-slate-800 hover:text-amber-950 border-slate-200/80 hover:border-amber-200',
            iconBg: 'bg-amber-50 text-amber-600 border-amber-100',
            cardBorder: 'border-slate-200/90 hover:border-amber-300 bg-white',
            visualType: 'equalizer',
            eqPrimary: 'bg-amber-500',
            eqSecondary: 'bg-yellow-500',
        },
        {
            title: 'খসড়া আবেদনসমূহ',
            subtitle: 'Drafts Nationwide',
            icon: FileEdit,
            total: stats.draft.total || 0,
            admission: stats.draft.admission || 0,
            loan: stats.draft.loan || 0,
            admUrl: '/member-admissions?status=draft',
            loanUrl: '/member/loan-applications?status=draft',
            badgeBg: 'bg-slate-600 text-white',
            btnBg: 'bg-slate-50/80 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border-slate-200/80 hover:border-slate-300',
            iconBg: 'bg-slate-50 text-slate-600 border-slate-200',
            cardBorder: 'border-slate-200/90 hover:border-slate-300 bg-white',
            visualType: 'equalizer',
            eqPrimary: 'bg-slate-500',
            eqSecondary: 'bg-slate-400',
        },
        {
            title: 'বাতিল / প্রত্যাখ্যাত',
            subtitle: 'Rejected Applications',
            icon: XCircle,
            total: stats.rejected.total || 0,
            admission: stats.rejected.admission || 0,
            loan: stats.rejected.loan || 0,
            admUrl: '/member-admissions?status=rejected',
            loanUrl: '/member/loan-applications?status=rejected',
            badgeBg: 'bg-rose-600 text-white',
            btnBg: 'bg-slate-50/80 hover:bg-rose-50/60 text-slate-800 hover:text-rose-900 border-slate-200/80 hover:border-rose-200',
            iconBg: 'bg-rose-50 text-rose-600 border-rose-100',
            cardBorder: 'border-slate-200/90 hover:border-rose-300 bg-white',
            visualType: 'radial',
            radialColor: '#e11d48',
            percentage: totalPipeline > 0 ? Math.round(((stats.rejected.total || 0) / totalPipeline) * 100) : 0,
        },
        {
            title: 'জাতীয় নেটওয়ার্ক অবকাঠামো',
            subtitle: 'Zones, Areas, Branches & Users',
            icon: Globe2,
            total: stats.system_scale.total_branches || 0,
            isPortfolio: true,
            loan: stats.system_scale.total_branches || 0,
            amount: `${stats.system_scale.total_zones} জোন • ${stats.system_scale.total_areas} এরিয়া • ${stats.system_scale.total_users} ইউজার`,
            loanUrl: '/branches',
            badgeBg: 'bg-slate-800 text-white',
            btnBg: 'bg-slate-50/80 hover:bg-slate-100 text-slate-800 border-slate-200',
            iconBg: 'bg-slate-100 text-slate-800 border-slate-200',
            cardBorder: 'border-slate-200/90 hover:border-slate-400 bg-white',
            visualType: 'radial',
            radialColor: '#334155',
            percentage: 100,
        },
    ];

    // Head Office National Pipeline Vertical Chart
    const pipelineColumns = [
        { label: 'হেড অফিস', count: stats.pending_head_office.total || 0, color: 'from-purple-600 to-purple-500' },
        { label: 'প্রেরণ প্রস্তুত', count: stats.ready_for_head_office.total || 0, color: 'from-indigo-600 to-indigo-400' },
        { label: 'টিম ঋণ', count: stats.team_based.count || 0, color: 'from-blue-600 to-blue-400' },
        { label: 'অনুমোদিত', count: stats.approved.total || 0, color: 'from-emerald-600 to-emerald-400' },
        { label: 'বিতরণ বাকি', count: stats.pending_disbursement.total || 0, color: 'from-teal-600 to-teal-400' },
        { label: 'মাঠ/শাখা', count: stats.branch_level.total || 0, color: 'from-sky-600 to-sky-400' },
        { label: 'এরিয়া/জোন', count: stats.region_zone_level.total || 0, color: 'from-amber-600 to-amber-400' },
    ];

    const maxColCount = Math.max(...pipelineColumns.map((c) => c.count), 1);

    return (
        <AdminLayout>
            <Head title="হেড অফিস ড্যাশবোর্ড" />

            <div className="max-w-7xl mx-auto space-y-3.5 pb-10">
                {/* 1. SLIM EXECUTIVE TOP BAR WITH HO IDENTITY & ACTION SHORTCUT */}
                <div className="bg-white px-4 py-2.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                    {/* Left: HO Identity */}
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-purple-700 flex items-center justify-center text-white shadow-xs shrink-0">
                            <Building2 size={16} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-sm font-bold text-slate-800 tracking-tight">
                                    {user?.name || 'প্রধান কার্যালয়'}
                                </h1>
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md border border-purple-200">
                                    প্রধান কার্যালয় (Head Office)
                                </span>
                                <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                                    • {stats.system_scale.total_branches} টি শাখা • {stats.system_scale.total_areas} টি এরিয়া • {stats.system_scale.total_zones} টি জোন
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Period Switcher & Pending Review Action Link */}
                    <div className="flex items-center gap-2.5 ml-auto flex-wrap">
                        {/* Urgent Action Queue Link */}
                        {(stats.pending_head_office.total || 0) > 0 && (
                            <Link
                                href="/member/loan-applications?status=pending_head_office"
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-2xs animate-pulse"
                            >
                                <CheckSquare size={13} />
                                <span>হেড অফিস অনুমোদন ({stats.pending_head_office.total})</span>
                            </Link>
                        )}

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

                {/* 2. THE 12 BALANCED & EYE-CATCHING HEAD OFFICE STATUS CARDS */}
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
                                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                                            <Sparkles size={9} className="text-purple-600" />
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

                                {/* Bottom: Refined Clickable Action Buttons */}
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
                                            {card.loan} টি
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

                {/* 3. HEAD OFFICE ACTION QUEUE & NATIONAL PIPELINE VERTICAL CHART */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 pt-1">
                    {/* Left 2 Cols: National Approval Pipeline Chart */}
                    <div className="lg:col-span-2 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                                    <BarChart3 size={15} />
                                </div>
                                <div>
                                    <h3 className="text-xs font-bold text-slate-800 tracking-tight">
                                        জাতীয় অনুমোদন পাইপলাইন ও পর্যায়ক্রমিক প্রবাহ
                                    </h3>
                                    <p className="text-[10px] text-slate-400 font-medium">
                                        হেড অফিস ও সারাদেশের সার্বিক অবস্থা
                                    </p>
                                </div>
                            </div>
                            <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-md border border-purple-200">
                                মোট চলমান: {totalPipeline} টি
                            </span>
                        </div>

                        {/* Visual Vertical Columns Chart */}
                        <div className="h-40 flex items-end justify-between gap-2 pt-4 px-2 pb-1 border-b border-slate-100">
                            {pipelineColumns.map((col, cIdx) => {
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
                                        <span className="text-[10px] font-bold text-slate-500 mt-2 text-center truncate max-w-[58px] block" title={col.label}>
                                            {col.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right 1 Col: Head Office Immediate Action Queue */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-2.5">
                        <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                                    <Activity size={15} />
                                </div>
                                <div>
                                    <h3 className="text-xs font-bold text-slate-800 tracking-tight">
                                        হেড অফিসে পর্যালোচনার জন্য প্রস্তুত
                                    </h3>
                                </div>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md">
                                {stats.pending_head_office.total} টি
                            </span>
                        </div>

                        {/* Recent Pending Decision List */}
                        <div className="space-y-2 overflow-y-auto max-h-56 pr-0.5">
                            {!hoActionQueue || hoActionQueue.length === 0 ? (
                                <p className="text-xs text-slate-400 text-center py-6">বর্তমানে কোনো আবেদন হেড অফিসে অপেক্ষায় নেই।</p>
                            ) : (
                                hoActionQueue.map((item, rIdx) => (
                                    <Link
                                        key={rIdx}
                                        href={item.url}
                                        className="flex items-center justify-between p-2 rounded-xl border border-slate-100 hover:border-purple-300 bg-slate-50/50 hover:bg-purple-50/50 transition-all group"
                                    >
                                        <div className="min-w-0 flex-1 pr-2">
                                            <div className="flex items-center gap-1.5">
                                                <span className={`text-[9px] font-black px-1.5 py-0.2 rounded uppercase ${item.type === 'loan' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                                    {item.type === 'loan' ? 'ঋণ' : 'ভর্তি'}
                                                </span>
                                                <p className="text-xs font-bold text-slate-800 truncate group-hover:text-purple-600 transition-colors">
                                                    {item.applicant_name}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium mt-0.5">
                                                <span className="font-mono">{item.application_no}</span>
                                                <span>•</span>
                                                <span>{item.branch_name}</span>
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0">
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-600 text-white flex items-center gap-0.5 group-hover:scale-105 transition-transform shadow-2xs">
                                                <span>যাচাই</span>
                                                <ChevronRight size={10} />
                                            </span>
                                            {item.amount && (
                                                <p className="text-[10px] font-black text-slate-700 mt-1">
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
