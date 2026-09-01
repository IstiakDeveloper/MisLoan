import React, { useState, useTransition } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { 
    Users, 
    Search, 
    Filter, 
    RotateCcw, 
    Printer, 
    Download, 
    Phone, 
    Building2, 
    Banknote, 
    CheckCircle2, 
    Calendar,
    ShieldAlert
} from 'lucide-react';
import {
    lastMonthRangeIso,
    startOfMonthIsoDate,
    startOfYearIsoDate,
    todayIsoDate,
} from '@/utils/dateUtils';

interface Guarantor {
    name: string;
    mobile: string;
    relation?: string;
    nid?: string;
    source?: string;
}

interface Informant {
    name: string;
    mobile: string;
    relation?: string;
    address?: string;
    source?: string;
}

interface LoanReportItem {
    id: number;
    application_no: string;
    loan_number: string;
    date: string;
    member_code: string;
    borrower_name: string;
    borrower_mobile: string;
    amount: number;
    status: string;
    status_label: string;
    product_name: string;
    branch_name: string;
    branch_code?: string;
    area_name: string;
    zone_name: string;
    samity_name: string;
    samity_code?: string;
    guarantors: Guarantor[];
    informants: Informant[];
}

interface PaginatedData {
    data: LoanReportItem[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: Array<{ url: string | null; label: string; active: boolean }>;
}

interface Props {
    loans: PaginatedData;
    filters: {
        date_from?: string;
        date_to?: string;
        min_amount?: number;
        status?: string;
        zone_id?: string | number;
        area_id?: string | number;
        branch_id?: string | number;
        search?: string;
        per_page?: number;
    };
    summary: {
        total_loans: number;
        total_amount: number;
    };
    zones: Array<{ id: number; name: string }>;
    areas: Array<{ id: number; name: string; zone_id: number }>;
    branches: Array<{ id: number; name: string; area_id: number }>;
}

export default function GuarantorInformantReport({
    loans,
    filters,
    summary,
    zones,
    areas,
    branches,
}: Props) {
    const [isPending, startTransition] = useTransition();
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');
    const [minAmount, setMinAmount] = useState(filters.min_amount || 300000);
    const [status, setStatus] = useState(filters.status || 'default');
    const [zoneId, setZoneId] = useState(filters.zone_id?.toString() || '');
    const [areaId, setAreaId] = useState(filters.area_id?.toString() || '');
    const [branchId, setBranchId] = useState(filters.branch_id?.toString() || '');
    const [search, setSearch] = useState(filters.search || '');
    const [perPage, setPerPage] = useState(filters.per_page || 25);

    // Cascading dropdowns
    const filteredAreas = zoneId
        ? areas.filter((a) => a.zone_id.toString() === zoneId)
        : areas;

    const filteredBranches = areaId
        ? branches.filter((b) => b.area_id.toString() === areaId)
        : zoneId
        ? branches.filter((b) => {
              const matchedArea = areas.find((a) => a.id === b.area_id);
              return matchedArea && matchedArea.zone_id.toString() === zoneId;
          })
        : branches;

    const handleApplyFilters = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        startTransition(() => {
            router.get(
                '/head-office/reports/guarantor-informants',
                {
                    date_from: dateFrom || undefined,
                    date_to: dateTo || undefined,
                    min_amount: minAmount || undefined,
                    status: status || undefined,
                    zone_id: zoneId || undefined,
                    area_id: areaId || undefined,
                    branch_id: branchId || undefined,
                    search: search || undefined,
                    per_page: perPage,
                },
                { preserveState: true, preserveScroll: true }
            );
        });
    };

    const handleClearFilters = () => {
        setDateFrom('');
        setDateTo('');
        setMinAmount(300000);
        setStatus('default');
        setZoneId('');
        setAreaId('');
        setBranchId('');
        setSearch('');
        startTransition(() => {
            router.get('/head-office/reports/guarantor-informants', {}, { preserveState: true });
        });
    };

    const handleQuickDate = (type: 'today' | 'this_month' | 'last_month' | 'this_year') => {
        let fromStr = '';
        let toStr = '';

        if (type === 'today') {
            fromStr = todayIsoDate();
            toStr = fromStr;
        } else if (type === 'this_month') {
            fromStr = startOfMonthIsoDate();
            toStr = todayIsoDate();
        } else if (type === 'last_month') {
            const lastMonth = lastMonthRangeIso();
            fromStr = lastMonth.from;
            toStr = lastMonth.to;
        } else if (type === 'this_year') {
            fromStr = startOfYearIsoDate();
            toStr = todayIsoDate();
        }

        setDateFrom(fromStr);
        setDateTo(toStr);
    };

    const getPrintUrl = () => {
        const params = new URLSearchParams();
        if (dateFrom) params.set('date_from', dateFrom);
        if (dateTo) params.set('date_to', dateTo);
        if (minAmount) params.set('min_amount', minAmount.toString());
        if (status) params.set('status', status);
        if (zoneId) params.set('zone_id', zoneId);
        if (areaId) params.set('area_id', areaId);
        if (branchId) params.set('branch_id', branchId);
        if (search) params.set('search', search);
        return `/head-office/reports/guarantor-informants/print?${params.toString()}`;
    };

    const getExportUrl = () => {
        const params = new URLSearchParams();
        if (dateFrom) params.set('date_from', dateFrom);
        if (dateTo) params.set('date_to', dateTo);
        if (minAmount) params.set('min_amount', minAmount.toString());
        if (status) params.set('status', status);
        if (zoneId) params.set('zone_id', zoneId);
        if (areaId) params.set('area_id', areaId);
        if (branchId) params.set('branch_id', branchId);
        if (search) params.set('search', search);
        return `/head-office/reports/guarantor-informants/export?${params.toString()}`;
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('bn-BD', {
            style: 'currency',
            currency: 'BDT',
            maximumFractionDigits: 0,
        }).format(val);
    };

    return (
        <AdminLayout>
            <Head title="Guarantor & Informant Report" />

            <div className="space-y-5 pb-12">
                {/* Header Card */}
                <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2.5 text-brand font-bold text-sm mb-1">
                            <span className="p-1.5 rounded-lg bg-brand-soft text-brand-dark">
                                <Users className="w-4 h-4" />
                            </span>
                            <span>Head Office & Monitoring Report</span>
                        </div>
                        <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">
                            Guarantor & Informant Report
                        </h1>
                        <p className="text-xs md:text-sm text-slate-500 mt-1">
                            ঋণ গ্রহীতা, সকল জামিনদার এবং তথ্য প্রদানকারীদের বিস্তারিত তথ্য ও তালিকা।
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                        <a
                            href={getExportUrl()}
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/70 transition-all shadow-xs"
                            title="Download Excel / CSV"
                        >
                            <Download className="w-3.5 h-3.5" />
                            <span>এক্সেল ডাউনলোড</span>
                        </a>
                        <a
                            href={getPrintUrl()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-brand text-white hover:bg-brand-dark transition-all shadow-sm shadow-brand/20"
                        >
                            <Printer className="w-3.5 h-3.5" />
                            <span>প্রিন্ট ভিউ</span>
                        </a>
                    </div>
                </div>

                {/* Summary Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-white border border-purple-200/70 rounded-2xl p-4.5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">মোট ঋণ সংখ্যা</span>
                            <span className="p-2 rounded-xl bg-purple-100 text-purple-700">
                                <Banknote className="w-4 h-4" />
                            </span>
                        </div>
                        <div className="mt-2 text-2xl font-black text-slate-800">
                            {summary.total_loans.toLocaleString('bn-BD')} <span className="text-sm font-medium text-slate-500">টি</span>
                        </div>
                        <p className="text-[11px] text-purple-600 mt-1">ফিল্টার অনুযায়ী মোট ঋণ সংখ্যা</p>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-white border border-emerald-200/70 rounded-2xl p-4.5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">মোট ঋণের পরিমাণ</span>
                            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                                <CheckCircle2 className="w-4 h-4" />
                            </span>
                        </div>
                        <div className="mt-2 text-2xl font-black text-emerald-700">
                            {formatCurrency(summary.total_amount)}
                        </div>
                        <p className="text-[11px] text-emerald-600 mt-1">অনুমোদিত / মোট অর্থ</p>
                    </div>

                    <div className="bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-white border border-blue-200/70 rounded-2xl p-4.5 shadow-xs sm:col-span-2 md:col-span-1">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">ফিল্টার শর্ত</span>
                            <span className="p-2 rounded-xl bg-blue-100 text-blue-700">
                                <Filter className="w-4 h-4" />
                            </span>
                        </div>
                        <div className="mt-2 text-2xl font-black text-slate-800">
                            ≥ {formatCurrency(minAmount)}
                        </div>
                        <p className="text-[11px] text-blue-600 mt-1">
                            {status === 'all' ? 'সকল স্ট্যাটাস' : status === 'default' ? 'হেড অফিস স্তর (ডিফল্ট)' : status}
                        </p>
                    </div>
                </div>

                {/* Filters Section */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                        <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
                            <Filter className="w-4 h-4 text-brand" />
                            <span>রিপোর্ট ফিল্টারিং অপশন</span>
                        </div>

                        {/* Quick Date Pills */}
                        <div className="hidden sm:flex items-center gap-1.5 text-xs">
                            <span className="text-slate-400 mr-1 text-[11px]">তারিখ শর্টকাট:</span>
                            <button
                                type="button"
                                onClick={() => handleQuickDate('today')}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-brand-soft hover:text-brand-dark text-slate-600 font-medium transition-colors"
                            >
                                আজ
                            </button>
                            <button
                                type="button"
                                onClick={() => handleQuickDate('this_month')}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-brand-soft hover:text-brand-dark text-slate-600 font-medium transition-colors"
                            >
                                চলতি মাস
                            </button>
                            <button
                                type="button"
                                onClick={() => handleQuickDate('last_month')}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-brand-soft hover:text-brand-dark text-slate-600 font-medium transition-colors"
                            >
                                গত মাস
                            </button>
                            <button
                                type="button"
                                onClick={() => handleQuickDate('this_year')}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-brand-soft hover:text-brand-dark text-slate-600 font-medium transition-colors"
                            >
                                চলতি বছর
                            </button>
                        </div>
                    </div>

                    <form onSubmit={handleApplyFilters} className="space-y-3.5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                            {/* Date From */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                    হতে (From)
                                </label>
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="w-full h-9 px-2.5 py-1.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all"
                                />
                            </div>

                            {/* Date To */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                    পর্যন্ত (To)
                                </label>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="w-full h-9 px-2.5 py-1.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all"
                                />
                            </div>

                            {/* Status Filter */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                    স্ট্যাটাস (Status)
                                </label>
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                    className="w-full h-9 px-2.5 py-1.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all"
                                >
                                    <option value="default">হেড অফিস স্তর (ডিফল্ট)</option>
                                    <option value="all">সকল আবেদন (All)</option>
                                    <option value="pending_head_office">হেড অফিস অপেক্ষমাণ</option>
                                    <option value="approved">অনুমোদিত (Approved)</option>
                                    <option value="pending_disbursement">বিতরণ অপেক্ষমাণ</option>
                                    <option value="disbursed">বিতরণকৃত (Disbursed)</option>
                                    <option value="rejected">প্রত্যাখ্যাত</option>
                                    <option value="submitted">দাখিলকৃত (Submitted)</option>
                                    <option value="draft">খসড়া (Draft)</option>
                                </select>
                            </div>

                            {/* Min Amount */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                    সর্বনিম্ন পরিমাণ
                                </label>
                                <select
                                    value={minAmount}
                                    onChange={(e) => setMinAmount(Number(e.target.value))}
                                    className="w-full h-9 px-2.5 py-1.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all"
                                >
                                    <option value={300000}>৩,০০,০০০ (৩ লাখ)</option>
                                    <option value={400000}>৪,০০,০০০ (৪ লাখ)</option>
                                    <option value={500000}>৫,০০,০০০ (৫ লাখ)</option>
                                    <option value={1000000}>১০,০০,০০০ (১০ লাখ)</option>
                                    <option value={100000}>১,০০,০০০ (১ লাখ)</option>
                                    <option value={0}>সকল পরিমাণ (যেকোনো)</option>
                                </select>
                            </div>

                            {/* Zone */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                    জোন (Zone)
                                </label>
                                <select
                                    value={zoneId}
                                    onChange={(e) => {
                                        setZoneId(e.target.value);
                                        setAreaId('');
                                        setBranchId('');
                                    }}
                                    className="w-full h-9 px-2.5 py-1.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all"
                                >
                                    <option value="">সকল জোন</option>
                                    {zones.map((z) => (
                                        <option key={z.id} value={z.id}>
                                            {z.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Area */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                    এরিয়া (Area)
                                </label>
                                <select
                                    value={areaId}
                                    onChange={(e) => {
                                        setAreaId(e.target.value);
                                        setBranchId('');
                                    }}
                                    className="w-full h-9 px-2.5 py-1.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all"
                                >
                                    <option value="">সকল এরিয়া</option>
                                    {filteredAreas.map((a) => (
                                        <option key={a.id} value={a.id}>
                                            {a.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Branch */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                    শাখা (Branch)
                                </label>
                                <select
                                    value={branchId}
                                    onChange={(e) => setBranchId(e.target.value)}
                                    className="w-full h-9 px-2.5 py-1.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all"
                                >
                                    <option value="">সকল শাখা</option>
                                    {filteredBranches.map((b) => (
                                        <option key={b.id} value={b.id}>
                                            {b.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Search */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                    সার্চ
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="খুঁজুন..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="w-full h-9 pl-7 pr-2.5 py-1.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all"
                                    />
                                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-3 text-slate-400" />
                                </div>
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-between pt-1">
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] text-slate-400">প্রতি পেজে:</span>
                                <select
                                    value={perPage}
                                    onChange={(e) => setPerPage(Number(e.target.value))}
                                    className="h-8 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:border-brand outline-none"
                                >
                                    <option value={15}>১৫</option>
                                    <option value={25}>২৫</option>
                                    <option value={50}>৫০</option>
                                    <option value={100}>১০০</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleClearFilters}
                                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5"
                                >
                                    <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                                    <span>রিসেট</span>
                                </button>
                                <button
                                    type="submit"
                                    disabled={isPending}
                                    className="px-4 py-1.5 rounded-xl bg-brand text-white text-xs font-bold hover:bg-brand-dark transition-all shadow-sm shadow-brand/20 inline-flex items-center gap-1.5 disabled:opacity-50"
                                >
                                    <Filter className="w-3.5 h-3.5" />
                                    <span>{isPending ? 'লোড হচ্ছে...' : 'ফিল্টার প্রয়োগ'}</span>
                                </button>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Data Table */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-brand"></span>
                            <span className="font-bold text-xs text-slate-700">
                                প্রদর্শিত ফলাফল: {loans.total.toLocaleString('bn-BD')} টি
                            </span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                            পেজ {loans.current_page} এর {loans.last_page}
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="py-3 px-3 text-center w-12">ক্রঃ</th>
                                    <th className="py-3 px-3 min-w-[110px]">নম্বর ও তারিখ</th>
                                    <th className="py-3 px-3 min-w-[180px]">ঋণ গ্রহীতার তথ্য</th>
                                    <th className="py-3 px-3 min-w-[120px] text-right">ঋণের পরিমাণ</th>
                                    <th className="py-3 px-3 min-w-[140px]">শাখা ও সমিতি</th>
                                    <th className="py-3 px-3 min-w-[260px] bg-purple-50/40 text-purple-900 border-l border-r border-purple-100">
                                        জামিনদারের তথ্য (নাম ও মোবাইল)
                                    </th>
                                    <th className="py-3 px-3 min-w-[260px] bg-blue-50/40 text-blue-900">
                                        তথ্য প্রদানকারীর তথ্য (নাম ও মোবাইল)
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                                {loans.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center text-slate-400">
                                            <ShieldAlert className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                                            <p className="font-medium">কোন ডাটা পাওয়া যায়নি</p>
                                            <p className="text-[11px] mt-0.5">
                                                নির্বাচিত ফিল্টারের আওতায় কোনো লোন পাওয়া যায়নি।
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    loans.data.map((item, index) => {
                                        const serial = (loans.current_page - 1) * loans.per_page + index + 1;
                                        return (
                                            <tr
                                                key={item.id}
                                                className="hover:bg-slate-50/70 transition-colors group"
                                            >
                                                {/* Serial */}
                                                <td className="py-3 px-3 text-center font-mono text-slate-400 font-medium">
                                                    {serial}
                                                </td>

                                                {/* Loan Number & Date */}
                                                <td className="py-3 px-3">
                                                    <div className="font-mono font-bold text-brand-dark text-xs flex items-center gap-1">
                                                        <span title={item.application_no}>{item.loan_number}</span>
                                                    </div>
                                                    <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                                        <Calendar className="w-3 h-3 text-slate-300" />
                                                        <span>{item.date || 'N/A'}</span>
                                                    </div>
                                                    <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                                        {item.status_label}
                                                    </span>
                                                </td>

                                                {/* Borrower */}
                                                <td className="py-3 px-3">
                                                    <div className="font-bold text-slate-800 text-[13px]">
                                                        {item.borrower_name}
                                                    </div>
                                                    <div className="flex items-center gap-1 mt-0.5">
                                                        <span className="font-mono text-[10.5px] px-1.5 py-0.5 rounded bg-brand-soft text-brand-dark font-bold">
                                                            {item.member_code}
                                                        </span>
                                                    </div>
                                                    {item.borrower_mobile && (
                                                        <a
                                                            href={`tel:${item.borrower_mobile}`}
                                                            className="text-[11px] text-slate-500 hover:text-brand flex items-center gap-1 mt-1 font-mono"
                                                        >
                                                            <Phone className="w-3 h-3 text-slate-400" />
                                                            <span>{item.borrower_mobile}</span>
                                                        </a>
                                                    )}
                                                </td>

                                                {/* Amount */}
                                                <td className="py-3 px-3 text-right">
                                                    <div className="font-black text-emerald-700 text-sm">
                                                        {formatCurrency(item.amount)}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[120px] ml-auto" title={item.product_name}>
                                                        {item.product_name}
                                                    </div>
                                                </td>

                                                {/* Branch & Samity */}
                                                <td className="py-3 px-3">
                                                    <div className="font-semibold text-slate-700 flex items-center gap-1">
                                                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                        <span className="truncate">{item.branch_name}</span>
                                                    </div>
                                                    <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                                                        <span className="text-slate-400">সমিতি:</span>
                                                        <span className="truncate">{item.samity_name || 'N/A'}</span>
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 mt-0.5">
                                                        {item.area_name} • {item.zone_name}
                                                    </div>
                                                </td>

                                                {/* Guarantors */}
                                                <td className="py-3 px-3 bg-purple-50/20 border-l border-r border-purple-100/60">
                                                    {item.guarantors.length === 0 ? (
                                                        <span className="text-[11px] text-slate-400 italic">
                                                            জামিনদার পাওয়া যায়নি
                                                        </span>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            {item.guarantors.map((g, gIdx) => (
                                                                <div
                                                                    key={gIdx}
                                                                    className="bg-white p-2 rounded-xl border border-purple-200/70 shadow-2xs"
                                                                >
                                                                    <div className="flex items-center justify-between gap-1">
                                                                        <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                                                                            <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold flex items-center justify-center">
                                                                                {gIdx + 1}
                                                                            </span>
                                                                            <span>{g.name}</span>
                                                                        </div>
                                                                        {g.relation && (
                                                                            <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200">
                                                                                {g.relation}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {g.mobile && (
                                                                        <div className="mt-1 flex items-center gap-1">
                                                                            <Phone className="w-3 h-3 text-purple-400" />
                                                                            <a
                                                                                href={`tel:${g.mobile}`}
                                                                                className="font-mono text-[11px] font-semibold text-purple-800 hover:underline"
                                                                            >
                                                                                {g.mobile}
                                                                            </a>
                                                                        </div>
                                                                    )}
                                                                    {g.nid && (
                                                                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                                                                            NID: {g.nid}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Informants */}
                                                <td className="py-3 px-3 bg-blue-50/20">
                                                    {item.informants.length === 0 ? (
                                                        <span className="text-[11px] text-slate-400 italic">
                                                            তথ্যদাতা পাওয়া যায়নি
                                                        </span>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            {item.informants.map((inf, iIdx) => (
                                                                <div
                                                                    key={iIdx}
                                                                    className="bg-white p-2 rounded-xl border border-blue-200/70 shadow-2xs"
                                                                >
                                                                    <div className="flex items-center justify-between gap-1">
                                                                        <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                                                                            <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center">
                                                                                {iIdx + 1}
                                                                            </span>
                                                                            <span>{inf.name}</span>
                                                                        </div>
                                                                        {inf.relation && (
                                                                            <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                                                                {inf.relation}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {inf.mobile && (
                                                                        <div className="mt-1 flex items-center gap-1">
                                                                            <Phone className="w-3 h-3 text-blue-400" />
                                                                            <a
                                                                                href={`tel:${inf.mobile}`}
                                                                                className="font-mono text-[11px] font-semibold text-blue-800 hover:underline"
                                                                            >
                                                                                {inf.mobile}
                                                                            </a>
                                                                        </div>
                                                                    )}
                                                                    {inf.address && (
                                                                        <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[200px]" title={inf.address}>
                                                                            {inf.address}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {loans.total > loans.per_page && (
                        <div className="p-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                            <span className="text-xs text-slate-500">
                                মোট {loans.total.toLocaleString('bn-BD')} টি রেকর্ডের মধ্যে{' '}
                                {(loans.current_page - 1) * loans.per_page + 1} হতে{' '}
                                {Math.min(loans.current_page * loans.per_page, loans.total)} দেখানো হচ্ছে
                            </span>

                            <div className="flex items-center gap-1">
                                {loans.links.map((link, lIdx) => {
                                    if (!link.url) {
                                        return (
                                            <span
                                                key={lIdx}
                                                className="px-2.5 py-1 text-xs text-slate-300 select-none"
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                            />
                                        );
                                    }
                                    return (
                                        <Link
                                            key={lIdx}
                                            href={link.url}
                                            preserveScroll
                                            preserveState
                                            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                                                link.active
                                                    ? 'bg-brand text-white shadow-xs font-bold'
                                                    : 'text-slate-600 hover:bg-slate-100'
                                            }`}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
