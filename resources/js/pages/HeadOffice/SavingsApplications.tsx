import React, { useState, useEffect, useMemo } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import {
    Search,
    Filter,
    ChevronLeft,
    ChevronRight,
    FileText,
    X,
    Landmark,
    Eye,
    Calculator,
    Calendar,
    Printer,
    RefreshCw,
    Building2,
    Clock,
    CheckCircle2,
    AlertCircle,
    PiggyBank,
    Sparkles,
    Coins,
    TrendingUp,
    Layers,
} from 'lucide-react';
import { formatDate, todayIsoDate } from '@/utils/dateUtils';
import SavingsCalculatorModal from '@/components/SavingsCalculatorModal';
import { formatBranchLabel, sortBranchesByCode } from '@/utils/branchLabel';
import { PhoneCallLink } from '@/components/ui/PhoneCallLink';

interface Zone {
    id: number;
    name: string;
}

interface Area {
    id: number;
    name: string;
    zone_id: number;
    zone?: Zone;
}

interface Branch {
    id: number;
    name: string;
    code?: string;
    area_id: number;
    area?: { id: number; name: string; zone?: Zone };
}

interface BranchSummaryItem {
    branch_id: number;
    branch_name: string;
    area_name: string;
    zone_name: string;
    count: number;
}

interface SavingsApplication {
    id: number;
    application_no: string;
    account_no?: string;
    member_no?: string;
    account_opening_date?: string;
    status: string;
    deposit_amount: number;
    monthly_installment?: number;
    monthly_savings_amount?: number;
    maturity_amount?: number;
    duration_months?: number;
    created_at: string;
    submitted_at?: string | null;
    reviewed_at?: string | null;
    branch?: { id: number; name: string; code?: string; area?: { name: string; zone?: { name: string } } };
    savings_product?: {
        id: number;
        product_name: string;
        product_name_bn?: string;
        product_code: string;
    };
    savingsProduct?: {
        id: number;
        product_name: string;
        product_name_bn?: string;
        product_code: string;
    };
    member_admission?: {
        id: number;
        applicant_name_en?: string;
        applicant_name_bn?: string;
        application_no?: string;
        nid_number?: string;
        mobile_number?: string;
    };
    memberAdmission?: {
        id: number;
        applicant_name_en?: string;
        applicant_name_bn?: string;
        application_no?: string;
        nid_number?: string;
        mobile_number?: string;
    };
}

interface Props {
    applications: {
        data: SavingsApplication[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from?: number;
        to?: number;
        links?: Array<{ url: string | null; label: string; active: boolean }>;
    };
    filters: {
        status?: string;
        search?: string;
        zone_id?: number | string;
        area_id?: number | string;
        branch_id?: number | string;
        date_from?: string;
        date_to?: string;
    };
    stats: {
        total: number;
        total_accounts?: number;
        total_deposit?: number;
        total_withdrawn?: number;
        net_balance?: number;
        draft: number;
        submitted: number;
        under_review: number;
        approved: number;
        rejected: number;
        active: number;
        matured: number;
        closed?: number;
    };
    branchSummary?: BranchSummaryItem[];
    zones: Zone[];
    areas: Area[];
    branches: Branch[];
}

const statusBadges: Record<string, { label: string; bg: string; text: string; dot: string; border: string }> = {
    active: { label: 'সক্রিয় (Active)', bg: 'bg-emerald-50', text: 'text-emerald-800', dot: 'bg-emerald-500', border: 'border-emerald-200' },
    matured: { label: 'পরিপক্ক (Matured)', bg: 'bg-teal-50', text: 'text-teal-800', dot: 'bg-teal-500', border: 'border-teal-200' },
    closed: { label: 'উত্তোলনকৃত (Closed)', bg: 'bg-amber-50', text: 'text-amber-800', dot: 'bg-amber-500', border: 'border-amber-200' },
    draft: { label: 'খসড়া (Draft)', bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-400', border: 'border-slate-200' },
    submitted: { label: 'জমা (Submitted)', bg: 'bg-blue-50', text: 'text-blue-800', dot: 'bg-blue-500', border: 'border-blue-200' },
    under_review: { label: 'পর্যালোচনায়', bg: 'bg-amber-50', text: 'text-amber-800', dot: 'bg-amber-500', border: 'border-amber-200' },
    approved: { label: 'অনুমোদিত', bg: 'bg-emerald-50', text: 'text-emerald-800', dot: 'bg-emerald-500', border: 'border-emerald-200' },
    rejected: { label: 'প্রত্যাখ্যাত', bg: 'bg-rose-50', text: 'text-rose-800', dot: 'bg-rose-500', border: 'border-rose-200' },
    cancelled: { label: 'বাতিল', bg: 'bg-rose-50', text: 'text-rose-800', dot: 'bg-rose-500', border: 'border-rose-200' },
};

const formatAmount = (n: number | null | undefined) =>
    new Intl.NumberFormat('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(n) || 0);

export default function SavingsApplications({
    applications,
    filters,
    stats,
    branchSummary = [],
    zones = [],
    areas = [],
    branches = [],
}: Props) {
    const today = todayIsoDate();
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');
    const [selectedZone, setSelectedZone] = useState((filters.zone_id ?? '').toString());
    const [selectedArea, setSelectedArea] = useState((filters.area_id ?? '').toString());
    const [selectedBranch, setSelectedBranch] = useState((filters.branch_id ?? '').toString());
    const [showCalculatorModal, setShowCalculatorModal] = useState(false);

    const [filteredAreas, setFilteredAreas] = useState<Area[]>(areas);
    const [filteredBranches, setFilteredBranches] = useState<Branch[]>(branches);

    useEffect(() => {
        if (selectedZone) {
            setFilteredAreas(areas.filter((a) => a.zone_id.toString() === selectedZone));
            if (selectedArea && !areas.find((a) => a.id.toString() === selectedArea && a.zone_id.toString() === selectedZone)) {
                setSelectedArea('');
            }
        } else {
            setFilteredAreas(areas);
        }
    }, [selectedZone, areas]);

    useEffect(() => {
        if (selectedArea) {
            setFilteredBranches(sortBranchesByCode(branches.filter((b) => b.area_id.toString() === selectedArea)));
            if (selectedBranch && !branches.find((b) => b.id.toString() === selectedBranch && b.area_id.toString() === selectedArea)) {
                setSelectedBranch('');
            }
        } else if (selectedZone) {
            const zoneAreaIds = filteredAreas.map((a) => a.id);
            setFilteredBranches(sortBranchesByCode(branches.filter((b) => zoneAreaIds.includes(b.area_id))));
        } else {
            setFilteredBranches(sortBranchesByCode(branches));
        }
    }, [selectedArea, selectedZone, filteredAreas, branches]);

    const buildParams = (overrides: Record<string, string | number | undefined> = {}) => {
        const p: Record<string, string> = {
            date_from: dateFrom,
            date_to: dateTo,
            search: searchQuery,
            status: statusFilter,
            zone_id: selectedZone,
            area_id: selectedArea,
            branch_id: selectedBranch,
            ...overrides,
        };
        return Object.fromEntries(Object.entries(p).filter(([, v]) => v !== '' && v !== undefined));
    };

    const applyFilters = () => {
        router.get('/head-office/savings-applications', buildParams(), { preserveState: true });
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const handleFilterChange = (status: string) => {
        setStatusFilter(status);
        router.get('/head-office/savings-applications', buildParams({ status }), { preserveState: true });
    };

    const handleTodayFilter = () => {
        if (isTodayFilter) {
            setDateFrom('');
            setDateTo('');
            router.get('/head-office/savings-applications', buildParams({ date_from: '', date_to: '' }), { preserveState: true });
        } else {
            setDateFrom(today);
            setDateTo(today);
            router.get('/head-office/savings-applications', buildParams({ date_from: today, date_to: today }), { preserveState: true });
        }
    };

    const clearFilters = () => {
        setSearchQuery('');
        setStatusFilter('');
        setSelectedZone('');
        setSelectedArea('');
        setSelectedBranch('');
        setDateFrom('');
        setDateTo('');
        router.get('/head-office/savings-applications', {}, { preserveState: true });
    };

    const paginationUrl = (page: number) => {
        const params = new URLSearchParams(buildParams() as any);
        params.set('page', String(page));
        return `/head-office/savings-applications?${params.toString()}`;
    };

    const isTodayFilter = dateFrom === today && dateTo === today;

    // Stat Cards with rich color themes and icons
    const statCards = [
        {
            key: '',
            label: 'সর্বমোট হিসাব',
            sub: 'All Accounts',
            count: stats.total,
            icon: Layers,
            bg: 'from-slate-700 to-slate-900',
            textColor: 'text-white',
            borderColor: 'border-slate-300',
            activeRing: 'ring-slate-400',
        },
        {
            key: 'submitted',
            label: 'নতুন জমা',
            sub: 'Submitted',
            count: stats.submitted,
            icon: Clock,
            bg: 'from-blue-600 to-indigo-600',
            textColor: 'text-white',
            borderColor: 'border-blue-200',
            activeRing: 'ring-blue-400',
        },
        {
            key: 'under_review',
            label: 'পর্যালোচনায়',
            sub: 'Under Review',
            count: stats.under_review,
            icon: AlertCircle,
            bg: 'from-amber-500 to-amber-600',
            textColor: 'text-white',
            borderColor: 'border-amber-200',
            activeRing: 'ring-amber-400',
        },
        {
            key: 'approved',
            label: 'অনুমোদিত',
            sub: 'Approved',
            count: stats.approved,
            icon: CheckCircle2,
            bg: 'from-emerald-600 to-teal-600',
            textColor: 'text-white',
            borderColor: 'border-emerald-200',
            activeRing: 'ring-emerald-400',
        },
        {
            key: 'active',
            label: 'সক্রিয় হিসাব',
            sub: 'Active Accounts',
            count: stats.active,
            icon: Sparkles,
            bg: 'from-teal-600 to-emerald-700',
            textColor: 'text-white',
            borderColor: 'border-teal-200',
            activeRing: 'ring-teal-400',
        },
        {
            key: 'matured',
            label: 'পরিপক্ক হিসাব',
            sub: 'Matured',
            count: stats.matured,
            icon: Coins,
            bg: 'from-purple-600 to-indigo-700',
            textColor: 'text-white',
            borderColor: 'border-purple-200',
            activeRing: 'ring-purple-400',
        },
        {
            key: 'rejected',
            label: 'প্রত্যাখ্যাত',
            sub: 'Rejected',
            count: stats.rejected,
            icon: X,
            bg: 'from-rose-600 to-red-700',
            textColor: 'text-white',
            borderColor: 'border-rose-200',
            activeRing: 'ring-rose-400',
        },
    ];

    const maxBranchCount = useMemo(() => {
        if (!branchSummary || branchSummary.length === 0) return 1;
        return Math.max(...branchSummary.map((b) => b.count), 1);
    }, [branchSummary]);

    return (
        <AdminLayout>
            <Head title="হেড অফিস সঞ্চয় আবেদন ও হিসাব সমন্বয় - Savings Applications" />

            <div className="p-3 md:p-4 space-y-3.5 max-w-[1700px] mx-auto">
                {/* ── 1. COMPACT EXECUTIVE HEADER ─────────────────────────────────────── */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl px-4 py-2.5 shadow-md border border-indigo-800/40 flex flex-wrap items-center justify-between gap-3 print:hidden">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-emerald-400 flex items-center justify-center text-white shadow-sm shrink-0">
                            <Landmark className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-sm sm:text-base font-black text-white tracking-tight truncate">
                                    হেড অফিস সঞ্চয় আবেদন ও হিসাব সমন্বয়
                                </h1>
                                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                                    Central Hub
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                                    মোট {stats.total_accounts ?? stats.total ?? 0} টি হিসাব
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Top Action Buttons */}
                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                        <button
                            type="button"
                            onClick={handleTodayFilter}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-2xs ${
                                isTodayFilter
                                    ? 'bg-emerald-500 text-slate-950 font-black shadow-emerald-500/20'
                                    : 'bg-white/10 text-white hover:bg-white/15 border border-white/10'
                            }`}
                            title="আজকের আবেদনসমূহ"
                        >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Today (আজ)</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setShowCalculatorModal(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 text-xs font-black shadow-2xs transition-all active:scale-95"
                        >
                            <Calculator className="w-3.5 h-3.5 text-slate-950" />
                            <span>Savings Calculator</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 text-xs font-semibold transition-all active:scale-95"
                            title="প্রিন্ট"
                        >
                            <Printer className="w-3.5 h-3.5" />
                            <span>প্রিন্ট</span>
                        </button>

                        <button
                            type="button"
                            onClick={clearFilters}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 text-xs font-semibold transition-all active:scale-95"
                            title="ফিল্টার রিসেট"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>রিসেট</span>
                        </button>
                    </div>
                </div>

                {/* ── 2. EXECUTIVE METRICS & FINANCIAL CARDS (টাকার কার্ডসহ) ──────────── */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5 print:hidden">
                    {/* Card 1: Total Deposit (টাকার কার্ড) */}
                    <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs relative overflow-hidden group hover:shadow-xs transition-all">
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide truncate">মোট সঞ্চয় জমা</span>
                            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform shrink-0">
                                <PiggyBank className="w-3.5 h-3.5" />
                            </div>
                        </div>
                        <div className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                            ৳{formatAmount(stats.total_deposit)}
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">আমানত সংগ্রহ ও জমা</p>
                        <div className="mt-2 w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 w-full" />
                        </div>
                    </div>

                    {/* Card 2: Total Withdrawn (টাকার কার্ড) */}
                    <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs relative overflow-hidden group hover:shadow-xs transition-all">
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide truncate">মোট উত্তোলন</span>
                            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform shrink-0">
                                <Coins className="w-3.5 h-3.5" />
                            </div>
                        </div>
                        <div className="text-base sm:text-lg font-black text-amber-900 tracking-tight">
                            ৳{formatAmount(stats.total_withdrawn)}
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">পরিশোধিত অর্থ ও মুনাফা</p>
                        <div className="mt-2 w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 w-3/4" />
                        </div>
                    </div>

                    {/* Card 3: Net Balance (টাকার কার্ড) */}
                    <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs relative overflow-hidden group hover:shadow-xs transition-all">
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide truncate">বর্তমান নিট স্থিতি</span>
                            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform shrink-0">
                                <TrendingUp className="w-3.5 h-3.5" />
                            </div>
                        </div>
                        <div className="text-base sm:text-lg font-black text-blue-700 tracking-tight">
                            ৳{formatAmount(stats.net_balance)}
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">জমা স্থিতি হতে বাদ</p>
                        <div className="mt-2 w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 w-5/6" />
                        </div>
                    </div>

                    {/* Card 4: Active Accounts (সক্রিয় হিসাব) */}
                    <button
                        type="button"
                        onClick={() => handleFilterChange(statusFilter === 'active' ? '' : 'active')}
                        className={`p-3.5 rounded-2xl text-left border relative overflow-hidden group hover:shadow-xs transition-all ${
                            statusFilter === 'active'
                                ? 'bg-purple-50/60 border-purple-400 ring-2 ring-purple-300 shadow-xs'
                                : 'bg-white border-slate-200/90 shadow-2xs hover:border-purple-300'
                        }`}
                    >
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide truncate">সক্রিয় হিসাব</span>
                            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-600 text-white flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform shrink-0">
                                <Sparkles className="w-3.5 h-3.5" />
                            </div>
                        </div>
                        <div className="text-base sm:text-lg font-black text-purple-900 tracking-tight">
                            {stats.active} টি
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">চলতি মেয়াদী ও সাধারণ</p>
                        <div className="mt-2 w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 w-full" />
                        </div>
                    </button>

                    {/* Card 5: Matured Accounts (পরিপক্ক হিসাব) */}
                    <button
                        type="button"
                        onClick={() => handleFilterChange(statusFilter === 'matured' ? '' : 'matured')}
                        className={`p-3.5 rounded-2xl text-left border relative overflow-hidden group hover:shadow-xs transition-all ${
                            statusFilter === 'matured'
                                ? 'bg-teal-50/60 border-teal-400 ring-2 ring-teal-300 shadow-xs'
                                : 'bg-white border-slate-200/90 shadow-2xs hover:border-teal-300'
                        }`}
                    >
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide truncate">পরিপক্ক হিসাব</span>
                            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-600 text-white flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform shrink-0">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                            </div>
                        </div>
                        <div className="text-base sm:text-lg font-black text-teal-900 tracking-tight">
                            {stats.matured} টি
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">উত্তোলনের জন্য প্রস্তুত</p>
                        <div className="mt-2 w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 w-full" />
                        </div>
                    </button>

                    {/* Card 6: Pending / Under Review (অপেক্ষমাণ / জমা) */}
                    <button
                        type="button"
                        onClick={() => handleFilterChange(statusFilter === 'submitted' ? '' : 'submitted')}
                        className={`p-3.5 rounded-2xl text-left border relative overflow-hidden group hover:shadow-xs transition-all ${
                            statusFilter === 'submitted'
                                ? 'bg-indigo-50/60 border-indigo-400 ring-2 ring-indigo-300 shadow-xs'
                                : 'bg-white border-slate-200/90 shadow-2xs hover:border-indigo-300'
                        }`}
                    >
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide truncate">জমা / অপেক্ষমাণ</span>
                            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-indigo-500 to-blue-600 text-white flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform shrink-0">
                                <Clock className="w-3.5 h-3.5" />
                            </div>
                        </div>
                        <div className="text-base sm:text-lg font-black text-indigo-900 tracking-tight">
                            {(stats.submitted || 0) + (stats.under_review || 0)} টি
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">অনুমোদনাধীন আবেদন</p>
                        <div className="mt-2 w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 w-2/3" />
                        </div>
                    </button>

                    {/* Card 7: Total Accounts (সর্বমোট হিসাব) */}
                    <button
                        type="button"
                        onClick={() => handleFilterChange('')}
                        className={`p-3.5 rounded-2xl text-left border relative overflow-hidden group hover:shadow-xs transition-all col-span-2 sm:col-span-1 ${
                            !statusFilter
                                ? 'bg-slate-50/80 border-slate-400 ring-2 ring-slate-300 shadow-xs'
                                : 'bg-white border-slate-200/90 shadow-2xs hover:border-slate-300'
                        }`}
                    >
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide truncate">সর্বমোট হিসাব</span>
                            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-slate-700 to-slate-900 text-white flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform shrink-0">
                                <Layers className="w-3.5 h-3.5" />
                            </div>
                        </div>
                        <div className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                            {stats.total_accounts ?? stats.total ?? 0} টি
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">সকল ধরণের সঞ্চয় হিসাব</p>
                        <div className="mt-2 w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-slate-600 to-slate-800 w-full" />
                        </div>
                    </button>
                </div>

                {/* ── 4. REFINED FILTERS TOOLBAR ──────────────────────────────────────── */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 space-y-3">
                    <form onSubmit={handleSearch} className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 text-xs">
                            {/* Zone Filter */}
                            {zones.length > 0 && (
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                                        জোন (Zone)
                                    </label>
                                    <select
                                        value={selectedZone}
                                        onChange={(e) => {
                                            setSelectedZone(e.target.value);
                                            setSelectedArea('');
                                            setSelectedBranch('');
                                        }}
                                        className="h-9 w-full border border-slate-300 rounded-xl px-2.5 text-xs bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                                    >
                                        <option value="">সকল জোন ({zones.length})</option>
                                        {zones.map((z) => (
                                            <option key={z.id} value={z.id}>
                                                {z.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Area Filter */}
                            {areas.length > 0 && (
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                                        অঞ্চল (Area)
                                    </label>
                                    <select
                                        value={selectedArea}
                                        onChange={(e) => {
                                            setSelectedArea(e.target.value);
                                            setSelectedBranch('');
                                        }}
                                        className="h-9 w-full border border-slate-300 rounded-xl px-2.5 text-xs bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                                    >
                                        <option value="">সকল অঞ্চল ({filteredAreas.length})</option>
                                        {filteredAreas.map((a) => (
                                            <option key={a.id} value={a.id}>
                                                {a.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Branch Filter */}
                            {branches.length > 0 && (
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                                        শাখা (Branch)
                                    </label>
                                    <select
                                        value={selectedBranch}
                                        onChange={(e) => setSelectedBranch(e.target.value)}
                                        className="h-9 w-full border border-slate-300 rounded-xl px-2.5 text-xs bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                                    >
                                        <option value="">সকল শাখা ({filteredBranches.length})</option>
                                        {filteredBranches.map((b) => (
                                            <option key={b.id} value={b.id}>
                                                {formatBranchLabel(b)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Status Selector */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                                    হিসাবের স্ট্যাটাস
                                </label>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="h-9 w-full border border-slate-300 rounded-xl px-2.5 text-xs bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                                >
                                    <option value="">সকল স্ট্যাটাস</option>
                                    {Object.entries(statusBadges).map(([k, v]) => (
                                        <option key={k} value={k}>
                                            {v.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Search & Date Filter Bar */}
                        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 pt-2 border-t border-slate-100 text-xs">
                            {/* Global Search Input */}
                            <div className="relative flex-grow max-w-xl">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder="সদস্য কোড, হিসাব নং, নাম, ফোন, এনআইডি, আবেদন নং..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-8 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/60 font-medium transition"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearchQuery('');
                                            router.get('/head-office/savings-applications', buildParams({ search: '' }), { preserveState: true });
                                        }}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>

                            {/* Date Picker Range */}
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1 rounded-xl">
                                    <input
                                        type="date"
                                        value={dateFrom}
                                        onChange={(e) => setDateFrom(e.target.value)}
                                        className="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white font-medium focus:outline-none"
                                        title="তারিখ হতে"
                                    />
                                    <span className="text-slate-400 text-xs font-bold">–</span>
                                    <input
                                        type="date"
                                        value={dateTo}
                                        onChange={(e) => setDateTo(e.target.value)}
                                        className="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white font-medium focus:outline-none"
                                        title="তারিখ পর্যন্ত"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition active:scale-95 flex items-center gap-1.5"
                                >
                                    <Filter className="w-3.5 h-3.5" />
                                    <span>ফিল্টার প্রয়োগ</span>
                                </button>

                                {(searchQuery || statusFilter || selectedZone || selectedArea || selectedBranch || dateFrom || dateTo) && (
                                    <button
                                        type="button"
                                        onClick={clearFilters}
                                        className="px-3 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-1"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                        <span>মুছুন</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </form>
                </div>

                {/* ── 5. APPLICATIONS TABLE CONTAINER ─────────────────────────────────── */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden p-3 md:p-4 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
                        <div className="flex items-center gap-2">
                            <PiggyBank className="w-4 h-4 text-indigo-600" />
                            <h3 className="font-bold text-slate-800">হেড অফিস সঞ্চয় আবেদন তালিকা</h3>
                        </div>
                        <span className="text-slate-500 font-medium">
                            মোট ফলাফল: <strong className="text-slate-900 font-bold">{applications.total}</strong> টি
                        </span>
                    </div>

                    {/* MOBILE CARDS VIEW (md:hidden) */}
                    <div className="md:hidden flex flex-col gap-3.5">
                        {applications.data.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-xs font-medium">
                                কোনো সঞ্চয় হিসাব পাওয়া যায়নি।
                            </div>
                        ) : (
                            applications.data.map((app) => {
                                const member = app.member_admission ?? app.memberAdmission;
                                const product = app.savings_product ?? app.savingsProduct;
                                const memberName = member?.applicant_name_bn || member?.applicant_name_en || '—';
                                const memberCode = app.member_no || member?.application_no || '—';
                                const statusInfo = statusBadges[app.status] || statusBadges.draft;

                                return (
                                    <div
                                        key={app.id}
                                        className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-xs"
                                    >
                                        <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                                            <div>
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                                        {app.application_no}
                                                    </span>
                                                    {app.account_no && (
                                                        <span className="text-xs font-mono font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                                            হিসাব: {app.account_no}
                                                        </span>
                                                    )}
                                                </div>
                                                <h4 className="font-bold text-slate-900 text-sm mt-1">
                                                    {memberName}
                                                </h4>
                                                <p className="text-[11px] text-slate-500 font-medium">
                                                    সদস্য আইডি: {memberCode} • শাখা: {app.branch?.name || '—'}
                                                </p>
                                            </div>
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                                                {statusInfo.label}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl text-xs">
                                            <div>
                                                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                                                    সঞ্চয় স্কিম
                                                </span>
                                                <p className="font-bold text-slate-800 truncate mt-0.5">
                                                    {product?.product_name_bn || product?.product_name || '—'}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                                                    জমার পরিমাণ
                                                </span>
                                                <p className="font-black text-emerald-700 mt-0.5">
                                                    ৳{formatAmount(app.deposit_amount)}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                                                    পরিপক্ক পরিমাণ
                                                </span>
                                                <p className="font-bold text-teal-700 mt-0.5">
                                                    {app.maturity_amount ? `৳${formatAmount(app.maturity_amount)}` : '—'}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                                                    তারিখ
                                                </span>
                                                <p className="font-medium text-slate-600 mt-0.5">
                                                    {formatDate(app.account_opening_date || app.created_at)}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="pt-1 border-t border-slate-100 flex items-center justify-end">
                                            <Link
                                                href={`/head-office/savings-applications/${app.id}`}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                <span>বিস্তারিত দেখুন</span>
                                            </Link>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* DESKTOP TABLE VIEW (hidden md:block) */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                                    <th className="py-3 px-3.5">আবেদন ও হিসাব নং</th>
                                    <th className="py-3 px-3.5">সদস্যের তথ্য</th>
                                    <th className="py-3 px-3.5">শাখা ও অঞ্চল</th>
                                    <th className="py-3 px-3.5">সঞ্চয় প্রকল্প</th>
                                    <th className="py-3 px-3.5 text-right">জমার পরিমাণ</th>
                                    <th className="py-3 px-3.5 text-right">পরিপক্ক পরিমাণ</th>
                                    <th className="py-3 px-3.5">স্ট্যাটাস</th>
                                    <th className="py-3 px-3.5">তারিখ</th>
                                    <th className="py-3 px-3.5 text-right">অ্যাকশন</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                                {applications.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                                            <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                                            কোনো সঞ্চয় আবেদন পাওয়া যায়নি
                                        </td>
                                    </tr>
                                ) : (
                                    applications.data.map((app) => {
                                        const member = app.member_admission ?? app.memberAdmission;
                                        const product = app.savings_product ?? app.savingsProduct;
                                        const memberName = member?.applicant_name_bn || member?.applicant_name_en || '—';
                                        const memberCode = app.member_no || member?.application_no;
                                        const phone = member?.mobile_number;
                                        const statusInfo = statusBadges[app.status] || statusBadges.draft;

                                        return (
                                            <tr key={app.id} className="hover:bg-slate-50/70 transition-colors">
                                                {/* Application & Account No */}
                                                <td className="py-3 px-3.5 font-mono">
                                                    <Link
                                                        href={`/head-office/savings-applications/${app.id}`}
                                                        className="hover:underline block group"
                                                    >
                                                        <span className="font-bold text-indigo-700 group-hover:text-indigo-900 block">
                                                            {app.application_no}
                                                        </span>
                                                        {app.account_no && (
                                                            <span className="text-[11px] text-slate-500 font-semibold block mt-0.5">
                                                                হিসাব: <strong className="text-slate-700">{app.account_no}</strong>
                                                            </span>
                                                        )}
                                                    </Link>
                                                </td>

                                                {/* Member Info */}
                                                <td className="py-3 px-3.5">
                                                    <div className="font-bold text-slate-900">{memberName}</div>
                                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                                                        {memberCode && (
                                                            <span className="font-mono bg-slate-100 text-slate-600 px-1 py-0.2 rounded font-semibold">
                                                                {memberCode}
                                                            </span>
                                                        )}
                                                        {phone && (
                                                            <PhoneCallLink
                                                                phone={phone}
                                                                className="text-[10px] text-indigo-600 hover:underline"
                                                                iconClassName="w-2.5 h-2.5 text-indigo-500"
                                                            />
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Branch Info */}
                                                <td className="py-3 px-3.5">
                                                    <div className="font-semibold text-slate-800">
                                                        {app.branch?.name || '—'}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[140px]">
                                                        {app.branch?.area?.name ? `${app.branch.area.name}` : ''}
                                                        {app.branch?.area?.zone?.name ? ` • ${app.branch.area.zone.name}` : ''}
                                                    </div>
                                                </td>

                                                {/* Savings Product */}
                                                <td className="py-3 px-3.5">
                                                    <div className="font-semibold text-slate-800">
                                                        {product?.product_name_bn || product?.product_name || '—'}
                                                    </div>
                                                    {product?.product_code && (
                                                        <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1 py-0.2 rounded block w-fit mt-0.5">
                                                            {product.product_code}
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Deposit */}
                                                <td className="py-3 px-3.5 text-right font-black text-slate-900">
                                                    ৳{formatAmount(app.deposit_amount)}
                                                    {(app.monthly_installment || app.monthly_savings_amount) && (
                                                        <span className="text-[10px] text-slate-400 block font-normal">
                                                            কিস্তি: ৳{formatAmount(app.monthly_installment || app.monthly_savings_amount)}
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Maturity Amount */}
                                                <td className="py-3 px-3.5 text-right font-bold text-teal-700">
                                                    {app.maturity_amount ? `৳${formatAmount(app.maturity_amount)}` : '—'}
                                                </td>

                                                {/* Status */}
                                                <td className="py-3 px-3.5">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                                                        {statusInfo.label}
                                                    </span>
                                                </td>

                                                {/* Date */}
                                                <td className="py-3 px-3.5 text-slate-600 whitespace-nowrap">
                                                    <div>{formatDate(app.account_opening_date || app.created_at)}</div>
                                                    {app.created_at && (
                                                        <div className="text-[10px] text-slate-400">
                                                            তৈরি: {formatDate(app.created_at)}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Actions */}
                                                <td className="py-3 px-3.5 text-right">
                                                    <Link
                                                        href={`/head-office/savings-applications/${app.id}`}
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition"
                                                        title="বিস্তারিত পর্যালোচনা করুন"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                        <span>বিবরণ</span>
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* ── 6. MODERN PAGINATION ────────────────────────────────────────── */}
                    {applications.last_page > 1 && (
                        <div className="px-4 py-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
                            <div>
                                প্রদর্শিত হচ্ছে <strong className="text-slate-900">{applications.from}</strong> হতে <strong className="text-slate-900">{applications.to}</strong> (সর্বমোট <strong className="text-slate-900">{applications.total}</strong> টি)
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Link
                                    href={paginationUrl(Math.max(1, applications.current_page - 1))}
                                    preserveState
                                    className={`p-1.5 rounded-lg border transition ${
                                        applications.current_page <= 1
                                            ? 'border-slate-200 text-slate-300 pointer-events-none'
                                            : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                                    }`}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Link>

                                <span className="px-3 py-1 font-bold bg-slate-100 text-slate-800 rounded-lg">
                                    পৃষ্ঠা {applications.current_page} / {applications.last_page}
                                </span>

                                <Link
                                    href={paginationUrl(Math.min(applications.last_page, applications.current_page + 1))}
                                    preserveState
                                    className={`p-1.5 rounded-lg border transition ${
                                        applications.current_page >= applications.last_page
                                            ? 'border-slate-200 text-slate-300 pointer-events-none'
                                            : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                                    }`}
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Link>
                            </div>
                        </div>
                    )}
                </div>

                {/* Savings Calculator Modal */}
                <SavingsCalculatorModal
                    open={showCalculatorModal}
                    onOpenChange={setShowCalculatorModal}
                />
            </div>
        </AdminLayout>
    );
}
