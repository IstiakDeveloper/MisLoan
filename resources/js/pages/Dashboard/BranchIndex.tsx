import React, { useState, useEffect } from 'react';
import AdminLayout from '@/layouts/admin-layout';
import { formatDate } from '@/utils/dateUtils';
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
    ArrowRight,
    TrendingUp,
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

interface PeriodStats {
    loan_applications_submitted: number;
    member_admissions_submitted: number;
    approved: number;
    rejected: number;
    issues_count: number;
}

interface TodayBadges {
    today_admission_submitted: boolean;
    today_loan_submitted: boolean;
    today_admission_count: number;
    today_loan_count: number;
}

interface WorkflowItem {
    admission: number;
    loan: number;
    total: number;
    amount?: number;
}

interface WorkflowStats {
    ready_for_head_office: WorkflowItem;
    pending_head_office: WorkflowItem;
    pending_branch_manager: WorkflowItem;
    pending_area_manager: WorkflowItem;
    pending_zone_manager: WorkflowItem;
    pending_other_approvers: WorkflowItem;
    pending_disbursement: WorkflowItem;
    active_disbursed: WorkflowItem;
    completed_approved: WorkflowItem;
    needs_correction: WorkflowItem;
    draft: WorkflowItem;
    rejected: WorkflowItem;
    totals: WorkflowItem;
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
    stats: { my_branches: number };
    periodStats: PeriodStats;
    todayBadges: TodayBadges;
    period: 'today' | 'monthly' | 'date_to_date';
    dateFrom: string | null;
    dateTo: string | null;
    myBranches: MyBranch[];
    dashboardType: string;
    teamBasedStats?: {
        draft_count: number;
        pending_count: number;
        approved_count: number;
        rejected_count: number;
    };
    workflowStats?: WorkflowStats;
    recentApplications?: RecentApplication[];
}

/**
 * Modern SVG Circular / Radial Progress Ring
 */
function CircularProgress({
    percentage,
    size = 38,
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

export default function BranchDashboard({
    stats,
    periodStats,
    todayBadges,
    period,
    dateFrom,
    dateTo,
    myBranches,
    teamBasedStats,
    workflowStats,
    recentApplications,
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

    const wf = workflowStats || {
        ready_for_head_office: { admission: 0, loan: 0, total: 0 },
        pending_head_office: { admission: 0, loan: 0, total: 0 },
        pending_branch_manager: { admission: 0, loan: 0, total: 0 },
        pending_area_manager: { admission: 0, loan: 0, total: 0 },
        pending_zone_manager: { admission: 0, loan: 0, total: 0 },
        pending_other_approvers: { admission: 0, loan: 0, total: 0 },
        pending_disbursement: { admission: 0, loan: 0, total: 0, amount: 0 },
        active_disbursed: { admission: 0, loan: 0, total: 0, amount: 0 },
        completed_approved: { admission: 0, loan: 0, total: 0 },
        needs_correction: { admission: 0, loan: 0, total: 0 },
        draft: { admission: 0, loan: 0, total: 0 },
        rejected: { admission: 0, loan: 0, total: 0 },
        totals: { admission: 0, loan: 0, total: 0 },
    };

    // Calculate total pipeline items
    const totalPipelineItems =
        wf.ready_for_head_office.total +
        wf.pending_branch_manager.total +
        wf.pending_area_manager.total +
        wf.pending_zone_manager.total +
        wf.pending_other_approvers.total +
        wf.pending_head_office.total +
        wf.pending_disbursement.total +
        wf.completed_approved.total;

    const statusBadge = (status: string) => {
        const map: Record<string, { label: string; bg: string; text: string }> = {
            ready_for_head_office: { label: 'হেড অফিসে রেডি', bg: 'bg-indigo-50', text: 'text-indigo-700' },
            pending_head_office: { label: 'হেড অফিস পেন্ডিং', bg: 'bg-purple-50', text: 'text-purple-700' },
            submitted: { label: 'ম্যানেজার পেন্ডিং', bg: 'bg-blue-50', text: 'text-blue-700' },
            under_review: { label: 'পর্যালোচনায়', bg: 'bg-amber-50', text: 'text-amber-700' },
            approved: { label: 'অনুমোদিত', bg: 'bg-emerald-50', text: 'text-emerald-700' },
            pending_disbursement: { label: 'বিতরণ বাকি', bg: 'bg-teal-50', text: 'text-teal-700' },
            disbursed: { label: 'সক্রিয় ঋণ', bg: 'bg-green-50', text: 'text-green-700' },
            needs_revision: { label: 'সংশোধন ফেরত', bg: 'bg-yellow-50', text: 'text-yellow-800' },
            needs_correction: { label: 'সংশোধন ফেরত', bg: 'bg-yellow-50', text: 'text-yellow-800' },
            draft: { label: 'খসড়া', bg: 'bg-slate-100', text: 'text-slate-700' },
            rejected: { label: 'বাতিল', bg: 'bg-rose-50', text: 'text-rose-700' },
        };
        const s = map[status] || { label: status, bg: 'bg-slate-100', text: 'text-slate-700' };
        return (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${s.bg} ${s.text}`}>
                {s.label}
            </span>
        );
    };

    // 12 Cards configuration: Balanced, varied visual elements (radial rings, vertical mini equalizers, gauges)
    const cards = [
        {
            title: 'হেড অফিসে পাঠানো',
            subtitle: 'Ready for Head Office',
            icon: Send,
            total: wf.ready_for_head_office.total,
            admission: wf.ready_for_head_office.admission,
            loan: wf.ready_for_head_office.loan,
            admUrl: '/member-admissions?status=ready_for_head_office',
            loanUrl: '/member/loan-applications?status=ready_for_head_office',
            badgeBg: 'bg-indigo-600 text-white',
            btnBg: 'bg-indigo-50/70 hover:bg-indigo-100/90 text-indigo-900 border-indigo-200/90',
            iconBg: 'bg-indigo-100 text-indigo-700 border-indigo-200',
            cardBorder: 'ring-2 ring-indigo-500/80 border-indigo-400 shadow-sm shadow-indigo-500/10 bg-gradient-to-b from-indigo-50/40 via-white to-white',
            isSpecialHighlight: true,
            highlightBadge: 'প্রধান কাজ',
            visualType: 'radial',
            radialColor: '#4f46e5',
            percentage: totalPipelineItems > 0 ? Math.round((wf.ready_for_head_office.total / totalPipelineItems) * 100) : 0,
        },
        {
            title: 'ম্যানেজার পেন্ডিং',
            subtitle: 'Branch Manager',
            icon: UserCheck,
            total: wf.pending_branch_manager.total,
            admission: wf.pending_branch_manager.admission,
            loan: wf.pending_branch_manager.loan,
            admUrl: '/member-admissions?status=submitted',
            loanUrl: '/member/loan-applications?status=submitted',
            badgeBg: 'bg-blue-600 text-white',
            btnBg: 'bg-slate-50/80 hover:bg-blue-50/60 text-slate-800 hover:text-blue-900 border-slate-200/80 hover:border-blue-200',
            iconBg: 'bg-blue-50 text-blue-600 border-blue-100',
            cardBorder: 'border-slate-200/90 hover:border-blue-300 bg-white',
            visualType: 'equalizer',
            eqPrimary: 'bg-blue-600',
            eqSecondary: 'bg-indigo-500',
        },
        {
            title: 'রিজিওনাল ম্যানেজার',
            subtitle: 'Area / Regional Manager',
            icon: MapPin,
            total: wf.pending_area_manager.total,
            admission: wf.pending_area_manager.admission,
            loan: wf.pending_area_manager.loan,
            admUrl: '/member-admissions?status=under_review',
            loanUrl: '/member/loan-applications?status=under_review',
            badgeBg: 'bg-amber-600 text-white',
            btnBg: 'bg-slate-50/80 hover:bg-amber-50/60 text-slate-800 hover:text-amber-900 border-slate-200/80 hover:border-amber-200',
            iconBg: 'bg-amber-50 text-amber-600 border-amber-100',
            cardBorder: 'border-slate-200/90 hover:border-amber-300 bg-white',
            visualType: 'radial',
            radialColor: '#d97706',
            percentage: totalPipelineItems > 0 ? Math.round((wf.pending_area_manager.total / totalPipelineItems) * 100) : 0,
        },
        {
            title: 'জোনাল ম্যানেজার',
            subtitle: 'Zonal Manager',
            icon: Layers,
            total: wf.pending_zone_manager.total,
            admission: wf.pending_zone_manager.admission,
            loan: wf.pending_zone_manager.loan,
            admUrl: '/member-admissions?status=under_review',
            loanUrl: '/member/loan-applications?status=under_review',
            badgeBg: 'bg-orange-600 text-white',
            btnBg: 'bg-slate-50/80 hover:bg-orange-50/60 text-slate-800 hover:text-orange-900 border-slate-200/80 hover:border-orange-200',
            iconBg: 'bg-orange-50 text-orange-600 border-orange-100',
            cardBorder: 'border-slate-200/90 hover:border-orange-300 bg-white',
            visualType: 'equalizer',
            eqPrimary: 'bg-orange-500',
            eqSecondary: 'bg-amber-500',
        },
        {
            title: 'অন্যান্য অনুমোদক',
            subtitle: 'ADMF / DMF / ED',
            icon: Users,
            total: wf.pending_other_approvers.total,
            admission: wf.pending_other_approvers.admission,
            loan: wf.pending_other_approvers.loan,
            admUrl: '/member-admissions?status=under_review',
            loanUrl: '/member/loan-applications?status=under_review',
            badgeBg: 'bg-purple-600 text-white',
            btnBg: 'bg-slate-50/80 hover:bg-purple-50/60 text-slate-800 hover:text-purple-900 border-slate-200/80 hover:border-purple-200',
            iconBg: 'bg-purple-50 text-purple-600 border-purple-100',
            cardBorder: 'border-slate-200/90 hover:border-purple-300 bg-white',
            visualType: 'radial',
            radialColor: '#9333ea',
            percentage: totalPipelineItems > 0 ? Math.round((wf.pending_other_approvers.total / totalPipelineItems) * 100) : 0,
        },
        {
            title: 'হেড অফিস পেন্ডিং',
            subtitle: 'Head Office Review',
            icon: Building2,
            total: wf.pending_head_office.total,
            admission: wf.pending_head_office.admission,
            loan: wf.pending_head_office.loan,
            admUrl: '/member-admissions?status=pending_head_office',
            loanUrl: '/member/loan-applications?status=pending_head_office',
            badgeBg: 'bg-sky-600 text-white',
            btnBg: 'bg-slate-50/80 hover:bg-sky-50/60 text-slate-800 hover:text-sky-900 border-slate-200/80 hover:border-sky-200',
            iconBg: 'bg-sky-50 text-sky-600 border-sky-100',
            cardBorder: 'border-slate-200/90 hover:border-sky-300 bg-white',
            visualType: 'equalizer',
            eqPrimary: 'bg-sky-600',
            eqSecondary: 'bg-indigo-500',
        },
        {
            title: 'বিতরণের অপেক্ষায় ঋণ',
            subtitle: 'Pending Disbursement',
            icon: Clock,
            total: wf.pending_disbursement.loan,
            isPortfolio: true,
            loan: wf.pending_disbursement.loan,
            amount: formatCurrency(wf.pending_disbursement.amount),
            loanUrl: '/member/loan-applications?status=pending_disbursement',
            badgeBg: 'bg-teal-600 text-white',
            btnBg: 'bg-slate-50/80 hover:bg-teal-50/60 text-slate-800 hover:text-teal-900 border-slate-200/80 hover:border-teal-200',
            iconBg: 'bg-teal-50 text-teal-600 border-teal-100',
            cardBorder: 'border-slate-200/90 hover:border-teal-300 bg-white',
            visualType: 'radial',
            radialColor: '#0d9488',
            percentage: wf.active_disbursed.total + wf.pending_disbursement.total > 0 ? Math.round((wf.pending_disbursement.total / (wf.active_disbursed.total + wf.pending_disbursement.total)) * 100) : 0,
        },
        {
            title: 'সক্রিয় ঋণ পোর্টফোলিও',
            subtitle: 'Active Disbursed Loans',
            icon: Wallet,
            total: wf.active_disbursed.loan,
            isPortfolio: true,
            loan: wf.active_disbursed.loan,
            amount: formatCurrency(wf.active_disbursed.amount),
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
            title: 'সম্পূর্ণ অনুমোদিত',
            subtitle: 'Fully Approved & Done',
            icon: CheckCircle2,
            total: wf.completed_approved.total,
            admission: wf.completed_approved.admission,
            loan: wf.completed_approved.loan,
            admUrl: '/member-admissions?status=approved',
            loanUrl: '/member/loan-applications?status=approved',
            badgeBg: 'bg-green-600 text-white',
            btnBg: 'bg-slate-50/80 hover:bg-green-50/60 text-slate-800 hover:text-green-900 border-slate-200/80 hover:border-green-200',
            iconBg: 'bg-green-50 text-green-600 border-green-100',
            cardBorder: 'border-slate-200/90 hover:border-green-300 bg-white',
            visualType: 'equalizer',
            eqPrimary: 'bg-green-600',
            eqSecondary: 'bg-emerald-500',
        },
        {
            title: 'সংশোধনের জন্য ফেরত',
            subtitle: 'Needs Correction / Returned',
            icon: AlertTriangle,
            total: wf.needs_correction.total,
            admission: wf.needs_correction.admission,
            loan: wf.needs_correction.loan,
            admUrl: '/member-admissions?status=needs_revision',
            loanUrl: '/member/loan-applications?status=needs_correction',
            badgeBg: 'bg-amber-500 text-white',
            btnBg: 'bg-slate-50/80 hover:bg-amber-50/60 text-slate-800 hover:text-amber-950 border-slate-200/80 hover:border-amber-200',
            iconBg: 'bg-amber-50 text-amber-600 border-amber-100',
            cardBorder: 'border-slate-200/90 hover:border-amber-300 bg-white',
            visualType: 'radial',
            radialColor: '#f59e0b',
            percentage: totalPipelineItems > 0 ? Math.round((wf.needs_correction.total / totalPipelineItems) * 100) : 0,
        },
        {
            title: 'খসড়া আবেদন',
            subtitle: 'Draft Applications',
            icon: FileEdit,
            total: wf.draft.total,
            admission: wf.draft.admission,
            loan: wf.draft.loan,
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
            total: wf.rejected.total,
            admission: wf.rejected.admission,
            loan: wf.rejected.loan,
            admUrl: '/member-admissions?status=rejected',
            loanUrl: '/member/loan-applications?status=rejected',
            badgeBg: 'bg-rose-600 text-white',
            btnBg: 'bg-slate-50/80 hover:bg-rose-50/60 text-slate-800 hover:text-rose-900 border-slate-200/80 hover:border-rose-200',
            iconBg: 'bg-rose-50 text-rose-600 border-rose-100',
            cardBorder: 'border-slate-200/90 hover:border-rose-300 bg-white',
            visualType: 'radial',
            radialColor: '#e11d48',
            percentage: totalPipelineItems > 0 ? Math.round((wf.rejected.total / totalPipelineItems) * 100) : 0,
        },
    ];

    // Pipeline funnel items for Vertical Column Chart
    const verticalChartColumns = [
        { label: 'হেড অফিসে রেডি', count: wf.ready_for_head_office.total, color: 'from-indigo-600 to-indigo-500', barBg: 'bg-indigo-600', badge: 'bg-indigo-50 text-indigo-700' },
        { label: 'ম্যানেজার', count: wf.pending_branch_manager.total, color: 'from-blue-600 to-blue-400', barBg: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700' },
        { label: 'রিজিওনাল', count: wf.pending_area_manager.total, color: 'from-amber-600 to-amber-400', barBg: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700' },
        { label: 'জোনাল', count: wf.pending_zone_manager.total, color: 'from-orange-600 to-orange-400', barBg: 'bg-orange-500', badge: 'bg-orange-50 text-orange-700' },
        { label: 'অন্যান্য', count: wf.pending_other_approvers.total, color: 'from-purple-600 to-purple-400', barBg: 'bg-purple-500', badge: 'bg-purple-50 text-purple-700' },
        { label: 'হেড অফিস', count: wf.pending_head_office.total, color: 'from-sky-600 to-sky-400', barBg: 'bg-sky-500', badge: 'bg-sky-50 text-sky-700' },
        { label: 'বিতরণ বাকি', count: wf.pending_disbursement.total, color: 'from-teal-600 to-teal-400', barBg: 'bg-teal-500', badge: 'bg-teal-50 text-teal-700' },
        { label: 'সম্পূর্ণ', count: wf.completed_approved.total, color: 'from-emerald-600 to-emerald-400', barBg: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700' },
    ];

    const maxChartCount = Math.max(...verticalChartColumns.map((c) => c.count), 1);

    return (
        <AdminLayout>
            <Head title="শাখা ড্যাশবোর্ড" />

            <div className="max-w-7xl mx-auto space-y-3.5 pb-10">
                {/* 1. SLIM EXECUTIVE TOP BAR */}
                <div className="bg-white px-4 py-2.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                    {/* Left: Branch identity */}
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-xs shrink-0">
                            <Building2 size={16} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-sm font-bold text-slate-800 tracking-tight">
                                    {myBranches?.[0]?.name || 'শাখা ড্যাশবোর্ড'}
                                </h1>
                                {myBranches?.[0]?.code && (
                                    <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200">
                                        {myBranches[0].code}
                                    </span>
                                )}
                                {myBranches?.[0]?.area && (
                                    <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                                        • {myBranches[0].area.zone?.name} / {myBranches[0].area.name}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Period Switcher */}
                    <div className="flex items-center gap-2 ml-auto">
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

                {/* 2. THE 12 BALANCED & EYE-CATCHING CARDS GRID WITH RADIUS / VERTICAL VISUALS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                    {cards.map((card, idx) => {
                        const Icon = card.icon;

                        return (
                            <div
                                key={idx}
                                className={`group relative rounded-2xl border ${card.cardBorder} p-4 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between`}
                            >
                                {/* Top Header of Card: Icon + Title + (Radial or Vertical Visual) */}
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
                                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
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

                                        {/* VISUAL ELEMENT: Radial Progress Ring or Vertical Equalizer */}
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

                                {/* Bottom: Refined, Professional Clickable Action Buttons */}
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

                {/* 3. VERTICAL COLUMN CHART & RECENT ACTIVITY SECTION */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 pt-1">
                    {/* Left 2 Cols: Vertical Column Performance Chart */}
                    <div className="lg:col-span-2 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                    <BarChart3 size={15} />
                                </div>
                                <div>
                                    <h3 className="text-xs font-bold text-slate-800 tracking-tight">
                                        অনুমোদন পাইপলাইন পারফরম্যান্স ও প্রবাহ
                                    </h3>
                                    <p className="text-[10px] text-slate-400 font-medium">
                                        ধাপভিত্তিক কাজের পরিমাণ ও ভার্টিক্যাল তুলনা
                                    </p>
                                </div>
                            </div>
                            <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                                মোট পাইপলাইন: {totalPipelineItems} টি
                            </span>
                        </div>

                        {/* Visual Vertical Columns Chart */}
                        <div className="h-40 flex items-end justify-between gap-2 pt-4 px-2 pb-1 border-b border-slate-100">
                            {verticalChartColumns.map((col, cIdx) => {
                                const heightPct = maxChartCount > 0 ? Math.max(12, Math.round((col.count / maxChartCount) * 100)) : 12;

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

                    {/* Right 1 Col: Recent Applications Activity Feed */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-2.5">
                        <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                    <Activity size={15} />
                                </div>
                                <h3 className="text-xs font-bold text-slate-800 tracking-tight">
                                    সাম্প্রতিক আবেদন ও ট্র্যাকিং
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

                {/* 4. COMPACT TEAM-BASED APPROVALS BAR */}
                {teamBasedStats && (
                    <div className="bg-white px-4 py-2.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                <FileSpreadsheet size={15} />
                            </div>
                            <span className="font-bold text-slate-800">টিম-বেসড অনুমোদন:</span>
                        </div>

                        <div className="flex items-center gap-3.5 font-semibold flex-wrap">
                            <Link href="/team-based-approvals/drafts" className="text-slate-600 hover:text-slate-900 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                <span>ড্রাফট:</span>
                                <strong className="text-slate-900 font-bold">{teamBasedStats.draft_count}</strong>
                            </Link>
                            <span className="text-slate-200">|</span>
                            <Link href="/team-based-approvals" className="text-amber-600 hover:text-amber-700 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                <span>জমা দেওয়া:</span>
                                <strong className="font-bold">{teamBasedStats.pending_count}</strong>
                            </Link>
                            <span className="text-slate-200">|</span>
                            <Link href="/team-based-approvals" className="text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                <span>অনুমোদিত:</span>
                                <strong className="font-bold">{teamBasedStats.approved_count}</strong>
                            </Link>
                            <span className="text-slate-200">|</span>
                            <Link href="/team-based-approvals" className="text-rose-600 hover:text-rose-700 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                <span>বাতিল:</span>
                                <strong className="font-bold">{teamBasedStats.rejected_count}</strong>
                            </Link>
                        </div>

                        <Link
                            href="/team-based-approvals"
                            className="font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 ml-auto"
                        >
                            <span>তালিকা দেখুন</span>
                            <ChevronRight size={13} />
                        </Link>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
