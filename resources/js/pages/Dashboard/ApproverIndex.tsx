import React, { useState, useEffect, useMemo } from 'react';
import AdminLayout from '@/layouts/admin-layout';
import { Head, Link, router } from '@inertiajs/react';
import {
    UserCheck,
    Building2,
    ShieldCheck,
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
    CheckSquare,
    Layers,
    Send,
    TrendingUp,
    Users,
    Search,
    Phone,
    Filter,
} from 'lucide-react';

interface MyBranch {
    id: number;
    name: string;
    code: string;
    area_id: number;
    area?: {
        id: number;
        name: string;
        code: string;
        zone?: { id: number; name: string; code: string };
    };
}

interface ApproverItem {
    admission?: number;
    loan?: number;
    total?: number;
    count?: number;
    proposed_amount?: number;
    approved_count?: number;
    approved_amount?: number;
    amount?: number;
}

interface ApproverStats {
    my_pending: ApproverItem;
    team_pending: ApproverItem;
    other_pending: ApproverItem;
    approved: ApproverItem;
    pending_disbursement: ApproverItem;
    active_disbursed: ApproverItem;
    needs_correction: ApproverItem;
    draft: ApproverItem;
    rejected: ApproverItem;
    totals: ApproverItem;
}

interface TeamBasedStats {
    my_pending_reviews: number;
    my_pending_amount: number;
    my_approved_reviews: number;
    my_approved_amount: number;
    jurisdiction_draft: number;
    jurisdiction_submitted: number;
    jurisdiction_approved: number;
    jurisdiction_rejected: number;
}

interface ActionQueueItem {
    id: number;
    type: 'loan' | 'admission' | 'team_based';
    application_no: string;
    applicant_name: string;
    detail: string;
    branch_name: string;
    amount: number | null;
    status: string;
    created_at: string;
    url: string;
}

export interface SubordinateManager {
    id: number;
    manager_id?: number | null;
    manager_name: string;
    manager_phone?: string | null;
    manager_role: string;
    unit_name: string;
    unit_code: string;
    parent_name: string;
    admission_pending: number;
    loan_pending: number;
    total_pending: number;
    loan_amount: number;
    branches_count?: number | null;
}

import HierarchicalPendingMonitor, { HierarchyNode } from '@/components/Dashboard/HierarchicalPendingMonitor';

export interface SubordinateSummary {
    type: 'branch_managers' | 'regional_managers' | 'zonal_and_regional_managers';
    title: string;
    list: SubordinateManager[];
    hierarchy_tree?: HierarchyNode[];
    total_managers: number;
    total_pending_all: number;
    total_amount_all: number;
}

interface Props {
    period: 'today' | 'monthly' | 'date_to_date';
    dateFrom: string | null;
    dateTo: string | null;
    myBranches: MyBranch[];
    dashboardType: string;
    approverStats: ApproverStats;
    teamBasedStats: TeamBasedStats;
    approverActionQueue: ActionQueueItem[];
    subordinateSummary?: SubordinateSummary;
    user: {
        id: number;
        name: string;
        role: string;
        scope: string;
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

export default function UnifiedApproverDashboard({
    period,
    dateFrom,
    dateTo,
    myBranches,
    approverStats,
    teamBasedStats,
    approverActionQueue,
    subordinateSummary,
    user,
}: Props) {
    const [periodSelect, setPeriodSelect] = useState<'today' | 'monthly' | 'date_to_date'>(period);
    const [fromDate, setFromDate] = useState(dateFrom ?? '');
    const [toDate, setToDate] = useState(dateTo ?? '');

    const [searchManager, setSearchManager] = useState('');
    const [managerFilterTab, setManagerFilterTab] = useState<'all' | 'pending' | 'zero'>('all');
    const [viewMode, setViewMode] = useState<'hierarchy' | 'flat'>('hierarchy');

    const filteredSubordinates = useMemo(() => {
        if (!subordinateSummary?.list) return [];
        return subordinateSummary.list.filter((mgr) => {
            if (managerFilterTab === 'pending' && mgr.total_pending === 0) return false;
            if (managerFilterTab === 'zero' && mgr.total_pending > 0) return false;
            if (!searchManager) return true;
            const query = searchManager.toLowerCase();
            return (
                mgr.manager_name.toLowerCase().includes(query) ||
                mgr.unit_name.toLowerCase().includes(query) ||
                mgr.unit_code.toLowerCase().includes(query) ||
                mgr.parent_name.toLowerCase().includes(query)
            );
        });
    }, [subordinateSummary, searchManager, managerFilterTab]);

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

    const stats = approverStats || {
        my_pending: { admission: 0, loan: 0, total: 0 },
        team_pending: { count: 0, proposed_amount: 0, approved_count: 0, approved_amount: 0 },
        other_pending: { admission: 0, loan: 0, total: 0 },
        approved: { admission: 0, loan: 0, total: 0, amount: 0 },
        pending_disbursement: { admission: 0, loan: 0, total: 0, amount: 0 },
        active_disbursed: { admission: 0, loan: 0, total: 0, amount: 0 },
        needs_correction: { admission: 0, loan: 0, total: 0 },
        draft: { admission: 0, loan: 0, total: 0 },
        rejected: { admission: 0, loan: 0, total: 0 },
        totals: { admission: 0, loan: 0, total: 0 },
    };

    const totalPipeline =
        (stats.my_pending.total || 0) +
        (stats.team_pending.count || 0) +
        (stats.other_pending.total || 0) +
        (stats.approved.total || 0) +
        (stats.pending_disbursement.total || 0);

    // Cards configuration for Approver Command Center
    const cards = [
        {
            title: 'আমার অনুমোদনাধীন (একক)',
            subtitle: 'Individual Pending My Approval',
            icon: UserCheck,
            total: stats.my_pending.total || 0,
            admission: stats.my_pending.admission || 0,
            loan: stats.my_pending.loan || 0,
            admUrl: '/member-admissions?status=pending_my_approval',
            loanUrl: '/member/loan-applications?status=pending_my_approval',
            badgeBg: 'bg-indigo-600 text-white',
            btnBg: 'bg-indigo-50/80 hover:bg-indigo-100/90 text-indigo-900 border-indigo-200/90',
            iconBg: 'bg-indigo-600 text-white border-indigo-600',
            cardBorder: 'ring-2 ring-indigo-500/90 border-indigo-500 shadow-md shadow-indigo-500/10 bg-gradient-to-b from-indigo-50/50 via-white to-white',
            isSpecialHighlight: true,
            highlightBadge: 'জরুরি সিদ্ধান্ত',
            visualType: 'radial',
            radialColor: '#4f46e5',
            percentage: totalPipeline > 0 ? Math.round(((stats.my_pending.total || 0) / totalPipeline) * 100) : 0,
        },
        {
            title: 'টিম-বেসড অনুমোদন পেন্ডিং',
            subtitle: 'Team Based Approvals for Me',
            icon: FileSpreadsheet,
            total: stats.team_pending.count || 0,
            isPortfolio: true,
            loan: stats.team_pending.count || 0,
            amount: formatCurrency(stats.team_pending.proposed_amount),
            loanUrl: '/team-based-approvals/for-approver',
            badgeBg: 'bg-blue-600 text-white',
            btnBg: 'bg-blue-50/80 hover:bg-blue-100/90 text-blue-900 border-blue-200/90',
            iconBg: 'bg-blue-600 text-white border-blue-600',
            cardBorder: 'ring-2 ring-blue-500/90 border-blue-500 shadow-md shadow-blue-500/10 bg-gradient-to-b from-blue-50/50 via-white to-white',
            isSpecialHighlight: true,
            highlightBadge: 'টিম ঋণ রিভিউ',
            visualType: 'radial',
            radialColor: '#2563eb',
            percentage: totalPipeline > 0 ? Math.round(((stats.team_pending.count || 0) / totalPipeline) * 100) : 0,
        },
        {
            title: 'আমার পরিধিতে অনুমোদিত',
            subtitle: 'Approved in Jurisdiction',
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
            title: 'অন্যান্য স্তরে পর্যালোচনাধীন',
            subtitle: 'In Other Review Stages',
            icon: Layers,
            total: stats.other_pending.total || 0,
            admission: stats.other_pending.admission || 0,
            loan: stats.other_pending.loan || 0,
            admUrl: '/member-admissions?status=under_review',
            loanUrl: '/member/loan-applications?status=under_review',
            badgeBg: 'bg-amber-600 text-white',
            btnBg: 'bg-slate-50/80 hover:bg-amber-50/60 text-slate-800 hover:text-amber-900 border-slate-200/80 hover:border-amber-200',
            iconBg: 'bg-amber-50 text-amber-600 border-amber-100',
            cardBorder: 'border-slate-200/90 hover:border-amber-300 bg-white',
            visualType: 'radial',
            radialColor: '#d97706',
            percentage: totalPipeline > 0 ? Math.round(((stats.other_pending.total || 0) / totalPipeline) * 100) : 0,
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
            title: 'সক্রিয় ঋণ ও পোর্টফোলিও',
            subtitle: 'Active Disbursed Loans in Scope',
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
            title: 'সংশোধনের জন্য প্রেরিত',
            subtitle: 'Returned for Revision in Scope',
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
            title: 'শাখার খসড়া আবেদন',
            subtitle: 'Drafts in Jurisdiction',
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
            subtitle: 'Rejected Applications in Scope',
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
    ];

    // Approver Pipeline Vertical Chart Columns
    const pipelineColumns = [
        { label: 'আমার পেন্ডিং', count: stats.my_pending.total || 0, color: 'from-indigo-600 to-indigo-500' },
        { label: 'টিম-বেসড', count: stats.team_pending.count || 0, color: 'from-blue-600 to-blue-400' },
        { label: 'অন্যান্য স্তর', count: stats.other_pending.total || 0, color: 'from-amber-600 to-amber-400' },
        { label: 'অনুমোদিত', count: stats.approved.total || 0, color: 'from-emerald-600 to-emerald-400' },
        { label: 'বিতরণ বাকি', count: stats.pending_disbursement.total || 0, color: 'from-teal-600 to-teal-400' },
        { label: 'সংশোধন', count: stats.needs_correction.total || 0, color: 'from-orange-600 to-orange-400' },
    ];

    const maxColCount = Math.max(...pipelineColumns.map((c) => c.count), 1);

    return (
        <AdminLayout>
            <Head title="অনুমোদক ড্যাশবোর্ড" />

            <div className="max-w-7xl mx-auto space-y-3.5 pb-10">
                {/* 1. SLIM EXECUTIVE TOP BAR WITH APPROVER PROFILE & ACTION SHORTCUTS */}
                <div className="bg-white px-4 py-2.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                    {/* Left: Approver Identity */}
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs shrink-0">
                            <ShieldCheck size={17} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-sm font-bold text-slate-800 tracking-tight">
                                    {user?.name || 'অনুমোদক ড্যাশবোর্ড'}
                                </h1>
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-200">
                                    {user?.role || 'অনুমোদক'}
                                </span>
                                {user?.scope && (
                                    <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                                        • {user.scope}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Period Switcher & Pending Review Action Links */}
                    <div className="flex items-center gap-2.5 ml-auto flex-wrap">
                        {/* Team-Based Approvals Shortcut */}
                        {(stats.team_pending.count || 0) > 0 && (
                            <Link
                                href="/team-based-approvals/for-approver"
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-2xs animate-pulse"
                            >
                                <FileSpreadsheet size={13} />
                                <span>টিম অনুমোদন ({stats.team_pending.count})</span>
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

                {/* 2. THE 9 BALANCED & EYE-CATCHING APPROVER STATUS CARDS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
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
                                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                                                            <Sparkles size={9} className="text-indigo-600" />
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
                                            পেন্ডিং: <strong className="font-bold text-slate-800">{card.loan} টি</strong>
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

                {/* 3. TEAM-BASED FINANCIAL APPROVALS STRIP */}
                {teamBasedStats && (
                    <div className="bg-white px-4 py-3 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                <FileSpreadsheet size={15} />
                            </div>
                            <div>
                                <span className="font-bold text-slate-800">টিম-বেসড আর্থিক অনুমোদন:</span>
                                <span className="text-[10px] text-slate-400 font-medium ml-1">
                                    (পেন্ডিং: {teamBasedStats.my_pending_reviews} টি • {formatCurrency(teamBasedStats.my_pending_amount)})
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3.5 font-semibold flex-wrap">
                            <Link href="/team-based-approvals/for-approver" className="text-blue-600 hover:text-blue-700 flex items-center gap-1">
                                <span>আমার পেন্ডিং:</span>
                                <strong className="font-bold">{teamBasedStats.my_pending_reviews}</strong>
                            </Link>
                            <span className="text-slate-200">|</span>
                            <span className="text-emerald-600 flex items-center gap-1">
                                <span>অনুমোদিত:</span>
                                <strong className="font-bold">{teamBasedStats.my_approved_reviews} ({formatCurrency(teamBasedStats.my_approved_amount)})</strong>
                            </span>
                            <span className="text-slate-200">|</span>
                            <span className="text-slate-500">
                                এরিয়া জমা: <strong>{teamBasedStats.jurisdiction_submitted}</strong>
                            </span>
                        </div>

                        <Link
                            href="/team-based-approvals/for-approver"
                            className="font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 ml-auto"
                        >
                            <span>টিম রিভিউ দেখুন</span>
                            <ChevronRight size={13} />
                        </Link>
                    </div>
                )}

                {/* 4. APPROVER IMMEDIATE DECISION QUEUE & PIPELINE VERTICAL CHART */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 pt-1">
                    {/* Left 2 Cols: Pipeline Vertical Chart */}
                    <div className="lg:col-span-2 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                    <BarChart3 size={15} />
                                </div>
                                <div>
                                    <h3 className="text-xs font-bold text-slate-800 tracking-tight">
                                        অনুমোদন পাইপলাইন ও কাজের অগ্রগতি
                                    </h3>
                                    <p className="text-[10px] text-slate-400 font-medium">
                                        আমার আওতাধীন সকল শাখার চলমান প্রবাহ
                                    </p>
                                </div>
                            </div>
                            <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-200">
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
                                        <span className="text-[10px] font-bold text-slate-500 mt-2 text-center truncate max-w-[62px] block" title={col.label}>
                                            {col.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right 1 Col: Approver Immediate Decision Queue */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-2.5">
                        <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                    <Activity size={15} />
                                </div>
                                <div>
                                    <h3 className="text-xs font-bold text-slate-800 tracking-tight">
                                        অনুমোদনের জন্য জরুরি তালিকা
                                    </h3>
                                </div>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md">
                                {(stats.my_pending.total || 0) + (stats.team_pending.count || 0)} টি
                            </span>
                        </div>

                        {/* Recent Pending Decision List */}
                        <div className="space-y-2 overflow-y-auto max-h-56 pr-0.5">
                            {!approverActionQueue || approverActionQueue.length === 0 ? (
                                <p className="text-xs text-slate-400 text-center py-6">বর্তমানে আপনার কোনো আবেদন অনুমোদনের অপেক্ষায় নেই।</p>
                            ) : (
                                approverActionQueue.map((item, rIdx) => (
                                    <Link
                                        key={rIdx}
                                        href={item.url}
                                        className="flex items-center justify-between p-2 rounded-xl border border-slate-100 hover:border-indigo-300 bg-slate-50/50 hover:bg-indigo-50/50 transition-all group"
                                    >
                                        <div className="min-w-0 flex-1 pr-2">
                                            <div className="flex items-center gap-1.5">
                                                <span className={`text-[9px] font-black px-1.5 py-0.2 rounded uppercase ${item.type === 'team_based' ? 'bg-purple-100 text-purple-700' : item.type === 'loan' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                                    {item.type === 'team_based' ? 'টিম ঋণ' : item.type === 'loan' ? 'ঋণ' : 'ভর্তি'}
                                                </span>
                                                <p className="text-xs font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
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
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-600 text-white flex items-center gap-0.5 group-hover:scale-105 transition-transform shadow-2xs">
                                                <span>অনুমোদন</span>
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

                {/* 5. SUBORDINATE MANAGERS NAME-BASED PENDING MONITOR */}
                {subordinateSummary && subordinateSummary.list && (
                    <div className="space-y-4">
                        {/* View Mode Switcher Header */}
                        <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-900 text-white p-3 rounded-2xl shadow-sm flex-wrap">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-indigo-300">
                                    <Users size={17} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold tracking-tight">
                                        {subordinateSummary.title}
                                    </h3>
                                    <p className="text-[11px] text-indigo-200/80">
                                        আওতাধীন কর্মকর্তা ও শাখাসমূহের ক্রমানুসারে পেন্ডিং আবেদনের লাইভ স্থিতি
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center bg-black/30 p-1 rounded-xl text-xs font-bold gap-1 backdrop-blur-md">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('hierarchy')}
                                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                                        viewMode === 'hierarchy'
                                            ? 'bg-indigo-600 text-white shadow-sm font-extrabold'
                                            : 'text-indigo-200 hover:text-white'
                                    }`}
                                >
                                    <Layers size={13} />
                                    <span>হায়ারার্কি ড্রিল-ডাউন ভিউ</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('flat')}
                                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                                        viewMode === 'flat'
                                            ? 'bg-indigo-600 text-white shadow-sm font-extrabold'
                                            : 'text-indigo-200 hover:text-white'
                                    }`}
                                >
                                    <BarChart3 size={13} />
                                    <span>ফ্ল্যাট তালিকা ভিউ</span>
                                </button>
                            </div>
                        </div>

                        {/* Hierarchical Monitor View */}
                        {viewMode === 'hierarchy' ? (
                            <HierarchicalPendingMonitor
                                tree={subordinateSummary.hierarchy_tree || []}
                                title={subordinateSummary.title}
                                subtitle="আওতাধীন অঞ্চল ও শাখাসমূহ ক্রমানুসারে এক্সপ্যান্ড করে প্রতিটি স্তরের দায়িত্বপ্রাপ্ত কর্মকর্তা ও স্টেজের লাইভ স্থিতি"
                                accentColor="indigo"
                            />
                        ) : (
                            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 space-y-4">
                                {/* Section Header */}
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                                            <Users size={16} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight">
                                                    {subordinateSummary.title} (ফ্ল্যাট তালিকা)
                                                </h3>
                                                <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-200">
                                                    মোট {subordinateSummary.total_managers} জন কর্মকর্তা
                                                </span>
                                                <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-800 rounded-md border border-amber-200">
                                                    মোট পেন্ডিং {subordinateSummary.total_pending_all} টি
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                                                আওতাধীন কর্মকর্তাদের নাম, শাখা/অঞ্চল এবং পেন্ডিং আবেদনের তাৎক্ষণিক পর্যবেক্ষণ
                                            </p>
                                        </div>
                                    </div>

                                    {/* Search & Tabs Toolbar */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        <div className="relative min-w-[200px] max-w-xs">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                                            <input
                                                type="text"
                                                value={searchManager}
                                                onChange={(e) => setSearchManager(e.target.value)}
                                                placeholder="কর্মকর্তা বা শাখার নাম খুঁজুন..."
                                                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                                            />
                                            {searchManager && (
                                                <button
                                                    type="button"
                                                    onClick={() => setSearchManager('')}
                                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-[11px] font-bold">
                                            <button
                                                type="button"
                                                onClick={() => setManagerFilterTab('all')}
                                                className={`px-2.5 py-1 rounded-lg transition-all ${
                                                    managerFilterTab === 'all'
                                                        ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                                                        : 'text-slate-600 hover:text-slate-900'
                                                }`}
                                            >
                                                সব ({subordinateSummary.list.length})
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setManagerFilterTab('pending')}
                                                className={`px-2.5 py-1 rounded-lg transition-all ${
                                                    managerFilterTab === 'pending'
                                                        ? 'bg-amber-500 text-white shadow-2xs font-extrabold'
                                                        : 'text-slate-600 hover:text-amber-600'
                                                }`}
                                            >
                                                পেন্ডিং আছে ({subordinateSummary.list.filter((m) => m.total_pending > 0).length})
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setManagerFilterTab('zero')}
                                                className={`px-2.5 py-1 rounded-lg transition-all ${
                                                    managerFilterTab === 'zero'
                                                        ? 'bg-emerald-600 text-white shadow-2xs font-extrabold'
                                                        : 'text-slate-600 hover:text-emerald-600'
                                                }`}
                                            >
                                                শূন্য ({subordinateSummary.list.filter((m) => m.total_pending === 0).length})
                                            </button>
                                        </div>
                                    </div>
                                </div>

                        {/* Managers Table View */}
                        <div className="overflow-x-auto rounded-xl border border-slate-200/80">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/80 text-slate-600 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider">
                                        <th className="py-2.5 px-3">#</th>
                                        <th className="py-2.5 px-3">কর্মকর্তার নাম ও পদবি</th>
                                        <th className="py-2.5 px-3">শাখা / অঞ্চল</th>
                                        <th className="py-2.5 px-3 text-center">ভর্তি পেন্ডিং</th>
                                        <th className="py-2.5 px-3 text-center">ঋণ পেন্ডিং</th>
                                        <th className="py-2.5 px-3 text-center">সর্বমোট পেন্ডিং</th>
                                        <th className="py-2.5 px-3 text-right">ঋণের পরিমাণ (৳)</th>
                                        <th className="py-2.5 px-3 text-center">অবস্থা</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredSubordinates.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                                                কোনো কর্মকর্তার তথ্য পাওয়া যায়নি।
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredSubordinates.map((mgr, idx) => {
                                            const hasPending = mgr.total_pending > 0;
                                            const isHighLoad = mgr.total_pending >= 5;

                                            return (
                                                <tr
                                                    key={mgr.id || idx}
                                                    className={`hover:bg-indigo-50/30 transition-colors ${
                                                        isHighLoad ? 'bg-amber-50/20' : ''
                                                    }`}
                                                >
                                                    <td className="py-2.5 px-3 text-slate-400 font-semibold">
                                                        {idx + 1}
                                                    </td>

                                                    {/* Manager Name & Role */}
                                                    <td className="py-2.5 px-3">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-slate-700 to-slate-900 text-white font-bold flex items-center justify-center text-xs shadow-2xs shrink-0">
                                                                {(mgr.manager_name || 'M')[0]}
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="font-bold text-slate-900">
                                                                        {mgr.manager_name}
                                                                    </span>
                                                                    {mgr.manager_phone && (
                                                                        <a
                                                                            href={`tel:${mgr.manager_phone}`}
                                                                            className="text-slate-400 hover:text-indigo-600 transition-colors"
                                                                            title={`কল করুন: ${mgr.manager_phone}`}
                                                                        >
                                                                            <Phone size={11} />
                                                                        </a>
                                                                    )}
                                                                </div>
                                                                <span className="text-[10px] text-slate-500 font-medium">
                                                                    {mgr.manager_role}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Branch / Area Name */}
                                                    <td className="py-2.5 px-3">
                                                        <div>
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="font-bold text-slate-800">
                                                                    {mgr.unit_name}
                                                                </span>
                                                                {mgr.unit_code && (
                                                                    <span className="text-[9px] font-mono px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded border border-slate-200">
                                                                        {mgr.unit_code}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="text-[10px] text-slate-400 font-medium">
                                                                {mgr.parent_name}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    {/* Admission Pending */}
                                                    <td className="py-2.5 px-3 text-center">
                                                        <span
                                                            className={`inline-flex items-center justify-center min-w-[24px] px-2 py-0.5 rounded-full text-xs font-bold ${
                                                                mgr.admission_pending > 0
                                                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                                                    : 'text-slate-400'
                                                            }`}
                                                        >
                                                            {mgr.admission_pending}
                                                        </span>
                                                    </td>

                                                    {/* Loan Pending */}
                                                    <td className="py-2.5 px-3 text-center">
                                                        <span
                                                            className={`inline-flex items-center justify-center min-w-[24px] px-2 py-0.5 rounded-full text-xs font-bold ${
                                                                mgr.loan_pending > 0
                                                                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                                                    : 'text-slate-400'
                                                            }`}
                                                        >
                                                            {mgr.loan_pending}
                                                        </span>
                                                    </td>

                                                    {/* Total Pending */}
                                                    <td className="py-2.5 px-3 text-center">
                                                        <span
                                                            className={`inline-flex items-center justify-center min-w-[28px] px-2.5 py-0.5 rounded-full text-xs font-black ${
                                                                isHighLoad
                                                                    ? 'bg-rose-600 text-white shadow-2xs'
                                                                    : hasPending
                                                                    ? 'bg-indigo-600 text-white shadow-2xs'
                                                                    : 'bg-slate-100 text-slate-500'
                                                            }`}
                                                        >
                                                            {mgr.total_pending}
                                                        </span>
                                                    </td>

                                                    {/* Loan Amount */}
                                                    <td className="py-2.5 px-3 text-right">
                                                        <span className="font-bold text-slate-800">
                                                            {mgr.loan_amount > 0 ? `৳ ${mgr.loan_amount.toLocaleString()}` : '—'}
                                                        </span>
                                                    </td>

                                                    {/* Status Badge */}
                                                    <td className="py-2.5 px-3 text-center">
                                                        {isHighLoad ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                                                উচ্চ চাপ ({mgr.total_pending})
                                                            </span>
                                                        ) : hasPending ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                                চলমান ({mgr.total_pending})
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                <CheckCircle2 size={10} />
                                                                ক্লিয়ার
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        )}
    </div>
</AdminLayout>
);
}
