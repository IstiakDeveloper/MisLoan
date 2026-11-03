import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import ListPagination from '@/components/ListPagination';
import AutoFitTableContainer from '@/components/AutoFitTableContainer';
import { formatBranchLabel } from '@/utils/branchLabel';
import { formatDate, formatDateTime } from '@/utils/dateUtils';
import {
    Smartphone,
    Building2,
    Users,
    FileSpreadsheet,
    Printer,
    Download,
    Filter,
    RotateCcw,
    Search,
    Calendar,
    ArrowRight,
    CheckCircle2,
    Layers,
    UserCheck,
    Upload,
} from 'lucide-react';

interface ZoneOption {
    id: number;
    name: string;
    code?: string;
}

interface AreaOption {
    id: number;
    name: string;
    code?: string;
    zone_id: number;
}

interface BranchOption {
    id: number;
    name: string;
    code?: string;
    area_id: number;
}

interface SamityOption {
    id: number;
    samity_name: string;
    samity_code?: string;
    branch_id: number;
}

interface SummaryRow {
    branch_id: number;
    branch_name: string;
    branch_code: string;
    area_id: number;
    area_name: string;
    zone_id: number;
    zone_name: string;
    switch_count: number;
    single_count: number;
    bulk_count: number;
    total_registered: number;
}

interface LedgerItem {
    id: number;
    member_code: string;
    member_name: string;
    phone_number?: string | null;
    is_registered: boolean;
    registered_at: string;
    registration_source: 'admission_switch' | 'single_entry' | 'bulk_excel';
    remarks?: string | null;
    branch?: { id: number; name: string; code?: string };
    samity?: { id: number; samity_name: string; samity_code?: string } | null;
    registeredByUser?: { id: number; name: string; username?: string } | null;
}

interface Props {
    summary: {
        rows: SummaryRow[];
        totals: {
            total_branches: number;
            total_registered: number;
            total_switch: number;
            total_single: number;
            total_bulk: number;
        };
    };
    ledger: {
        data: LedgerItem[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from: number;
        to: number;
    };
    zones: ZoneOption[];
    areas: AreaOption[];
    branches: BranchOption[];
    samities: SamityOption[];
    filters: {
        zone_id?: string;
        area_id?: string;
        branch_id?: string;
        samity_id?: string;
        source?: string;
        from_date?: string;
        to_date?: string;
        search?: string;
        tab?: string;
        per_page?: number | string;
    };
}

export default function AppRegistrationReport({
    summary,
    ledger,
    zones = [],
    areas = [],
    branches = [],
    samities = [],
    filters,
}: Props) {
    const activeTab = filters.tab || 'summary';

    const [zoneId, setZoneId] = useState(filters.zone_id || '');
    const [areaId, setAreaId] = useState(filters.area_id || '');
    const [branchId, setBranchId] = useState(filters.branch_id || '');
    const [samityId, setSamityId] = useState(filters.samity_id || '');
    const [source, setSource] = useState(filters.source || '');
    const [fromDate, setFromDate] = useState(filters.from_date || '');
    const [toDate, setToDate] = useState(filters.to_date || '');
    const [search, setSearch] = useState(filters.search || '');

    // Cascading filters
    const filteredAreas = zoneId
        ? areas.filter((a) => String(a.zone_id) === String(zoneId))
        : areas;

    const filteredBranches = areaId
        ? branches.filter((b) => String(b.area_id) === String(areaId))
        : zoneId
        ? branches.filter((b) => {
              const matchedArea = areas.find((a) => a.id === b.area_id);
              return matchedArea && String(matchedArea.zone_id) === String(zoneId);
          })
        : branches;

    const applyFilters = (newTab?: string, overrideBranchId?: string) => {
        const queryParams: Record<string, string> = {};
        const tabToUse = newTab || activeTab;
        queryParams.tab = tabToUse;

        const effectiveBranchId = overrideBranchId !== undefined ? overrideBranchId : branchId;

        if (zoneId) queryParams.zone_id = zoneId;
        if (areaId) queryParams.area_id = areaId;
        if (effectiveBranchId) queryParams.branch_id = effectiveBranchId;
        if (samityId) queryParams.samity_id = samityId;
        if (source) queryParams.source = source;
        if (fromDate) queryParams.from_date = fromDate;
        if (toDate) queryParams.to_date = toDate;
        if (search.trim()) queryParams.search = search.trim();

        router.get('/reports/app-registrations', queryParams, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleResetFilters = () => {
        setZoneId('');
        setAreaId('');
        setBranchId('');
        setSamityId('');
        setSource('');
        setFromDate('');
        setToDate('');
        setSearch('');

        router.get(
            '/reports/app-registrations',
            { tab: activeTab },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleTabChange = (tab: 'summary' | 'ledger') => {
        applyFilters(tab);
    };

    const handleViewBranchLedger = (targetBranchId: number) => {
        setBranchId(String(targetBranchId));
        applyFilters('ledger', String(targetBranchId));
    };

    const handleExportLedgerExcel = () => {
        const params = new URLSearchParams();
        if (zoneId) params.append('zone_id', zoneId);
        if (areaId) params.append('area_id', areaId);
        if (branchId) params.append('branch_id', branchId);
        if (samityId) params.append('samity_id', samityId);
        if (source) params.append('source', source);
        if (fromDate) params.append('from_date', fromDate);
        if (toDate) params.append('to_date', toDate);
        if (search.trim()) params.append('search', search.trim());

        window.location.href = `/reports/app-registrations/export-ledger?${params.toString()}`;
    };

    const handlePrint = () => {
        window.print();
    };

    const sourceBadge = (src: LedgerItem['registration_source']) => {
        switch (src) {
            case 'admission_switch':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 size={11} /> ভর্তি সুইচ
                    </span>
                );
            case 'single_entry':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        <UserCheck size={11} /> একক এন্ট্রি
                    </span>
                );
            case 'bulk_excel':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                        <Upload size={11} /> এক্সেল বাল্ক
                    </span>
                );
            default:
                return null;
        }
    };

    return (
        <AdminLayout>
            <Head title="অ্যাপ রেজিস্ট্রেশন রিপোর্ট ও লেজার" />

            <div className="space-y-4 max-w-7xl mx-auto pb-10">
                {/* 1. Page Header */}
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                                <Smartphone size={22} />
                            </div>
                            <div>
                                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                                    <span>অ্যাপ রেজিস্ট্রেশন রিপোর্ট ও লেজার</span>
                                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                                        মোট {summary.totals.total_registered || 0} টি এন্ট্রি
                                    </span>
                                </h1>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    শাখা-ভিত্তিক সারসংক্ষেপ ও সদস্যের বিস্তারিত লেজার রিপোর্ট
                                </p>
                            </div>
                        </div>

                        {/* Top Action Buttons */}
                        <div className="flex items-center gap-2 flex-wrap print:hidden">
                            {activeTab === 'ledger' && (
                                <button
                                    type="button"
                                    onClick={handleExportLedgerExcel}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold transition-all shadow-2xs active:scale-95"
                                    title="লেজার এক্সেল ডাউনলোড করুন"
                                >
                                    <Download size={14} />
                                    <span>Excel Export</span>
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={handlePrint}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold transition-all shadow-2xs active:scale-95"
                            >
                                <Printer size={14} />
                                <span>প্রিন্ট</span>
                            </button>
                        </div>
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-3.5 border-t border-slate-100">
                        <div className="p-3 bg-gradient-to-br from-blue-50/60 to-white rounded-2xl border border-blue-100/80">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1">
                                <Layers size={12} /> সর্বমোট রেজিস্ট্রেশন
                            </div>
                            <div className="text-xl font-black text-blue-900 mt-0.5">
                                {summary.totals.total_registered}
                            </div>
                        </div>

                        <div className="p-3 bg-gradient-to-br from-emerald-50/60 to-white rounded-2xl border border-emerald-100/80">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1">
                                <CheckCircle2 size={12} /> ভর্তি তালিকা সুইচ
                            </div>
                            <div className="text-xl font-black text-emerald-900 mt-0.5">
                                {summary.totals.total_switch}
                            </div>
                        </div>

                        <div className="p-3 bg-gradient-to-br from-sky-50/60 to-white rounded-2xl border border-sky-100/80">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-sky-600 flex items-center gap-1">
                                <UserCheck size={12} /> একক নতুন এন্ট্রি
                            </div>
                            <div className="text-xl font-black text-sky-900 mt-0.5">
                                {summary.totals.total_single}
                            </div>
                        </div>

                        <div className="p-3 bg-gradient-to-br from-purple-50/60 to-white rounded-2xl border border-purple-100/80">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-purple-600 flex items-center gap-1">
                                <Upload size={12} /> এক্সেল বাল্ক এন্ট্রি
                            </div>
                            <div className="text-xl font-black text-purple-900 mt-0.5">
                                {summary.totals.total_bulk}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Tabs Bar */}
                <div className="flex items-center gap-2 border-b border-slate-200 print:hidden">
                    <button
                        type="button"
                        onClick={() => handleTabChange('summary')}
                        className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
                            activeTab === 'summary'
                                ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl shadow-2xs'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <Building2 size={15} />
                        <span>১. শাখা-ভিত্তিক সারসংক্ষেপ (Branch Summary)</span>
                        <span className="ml-1 text-[10px] bg-slate-100 px-1.5 py-0.5 rounded-full font-mono">
                            {summary.rows.length} শাখা
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleTabChange('ledger')}
                        className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
                            activeTab === 'ledger'
                                ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl shadow-2xs'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <FileSpreadsheet size={15} />
                        <span>২. লেজার / বিস্তারিত তালিকা (Detailed Ledger)</span>
                        <span className="ml-1 text-[10px] bg-slate-100 px-1.5 py-0.5 rounded-full font-mono">
                            {ledger.total} রেকর্ড
                        </span>
                    </button>
                </div>

                {/* 3. Filter Card */}
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-3.5 space-y-3 print:hidden">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                        <div className="flex items-center gap-1.5">
                            <Filter size={14} className="text-blue-600" />
                            <span>রিপোর্ট ফিল্টার</span>
                        </div>
                        {(zoneId || areaId || branchId || samityId || source || fromDate || toDate || search) && (
                            <button
                                type="button"
                                onClick={handleResetFilters}
                                className="inline-flex items-center gap-1 text-[11px] text-red-600 hover:underline"
                            >
                                <RotateCcw size={12} />
                                <span>ফিল্টার রিসেট</span>
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                        {/* Zone Filter */}
                        {zones.length > 1 && (
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">জোন</label>
                                <select
                                    value={zoneId}
                                    onChange={(e) => {
                                        setZoneId(e.target.value);
                                        setAreaId('');
                                        setBranchId('');
                                    }}
                                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                                >
                                    <option value="">সব জোন</option>
                                    {zones.map((z) => (
                                        <option key={z.id} value={z.id}>
                                            {z.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Area Filter */}
                        {filteredAreas.length > 1 && (
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">এরিয়া</label>
                                <select
                                    value={areaId}
                                    onChange={(e) => {
                                        setAreaId(e.target.value);
                                        setBranchId('');
                                    }}
                                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                                >
                                    <option value="">সব এরিয়া</option>
                                    {filteredAreas.map((a) => (
                                        <option key={a.id} value={a.id}>
                                            {a.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Branch Filter */}
                        {filteredBranches.length > 1 && (
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">শাখা</label>
                                <select
                                    value={branchId}
                                    onChange={(e) => setBranchId(e.target.value)}
                                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                                >
                                    <option value="">সব শাখা</option>
                                    {filteredBranches.map((b) => (
                                        <option key={b.id} value={b.id}>
                                            {formatBranchLabel(b)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Source Filter */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">উৎস (Source)</label>
                            <select
                                value={source}
                                onChange={(e) => setSource(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                            >
                                <option value="">সব উৎস</option>
                                <option value="admission_switch">ভর্তি তালিকা সুইচ</option>
                                <option value="single_entry">একক এন্ট্রি</option>
                                <option value="bulk_excel">এক্সেল বাল্ক</option>
                            </select>
                        </div>

                        {/* From Date */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">শুরুর তারিখ</label>
                            <input
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                            />
                        </div>

                        {/* To Date */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">শেষ তারিখ</label>
                            <input
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                            />
                        </div>
                    </div>

                    {/* Search & Apply Button */}
                    <div className="flex items-center gap-2 pt-1">
                        {activeTab === 'ledger' && (
                            <div className="relative flex-1">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                                    placeholder="সদস্য কোড, নাম বা মোবাইল দিয়ে খুঁজুন..."
                                    className="w-full pl-9 pr-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                                />
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={() => applyFilters()}
                            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs ml-auto"
                        >
                            ফিল্টার প্রয়োগ করুন
                        </button>
                    </div>
                </div>

                {/* Print Title Header */}
                <div className="hidden print:block text-center py-4 border-b border-slate-300">
                    <h2 className="text-xl font-bold text-slate-900">
                        {activeTab === 'summary' ? 'শাখা-ভিত্তিক অ্যাপ রেজিস্ট্রেশন রিপোর্ট' : 'অ্যাপ রেজিস্ট্রেশন বিস্তারিত লেজার'}
                    </h2>
                    {(fromDate || toDate) && (
                        <p className="text-xs text-slate-600 mt-1">তারিখ: {fromDate || 'শুরু'} থেকে {toDate || 'বর্তমান'}</p>
                    )}
                    <p className="text-[10px] text-slate-500 mt-0.5">প্রিন্ট সময়: {formatDateTime(new Date())}</p>
                </div>

                {/* 4. Tab 1: Branch Summary View */}
                {activeTab === 'summary' && (
                    <AutoFitTableContainer
                        minWidth={900}
                        storageKey="app_reg_summary_table"
                        title="শাখা-ভিত্তিক সারসংক্ষেপ"
                        subtitle={`(মোট ${summary.rows.length} টি শাখা)`}
                    >
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="py-3 px-3 text-center">ক্রমিক</th>
                                    <th className="py-3 px-3">জোন</th>
                                    <th className="py-3 px-3">এরিয়া</th>
                                    <th className="py-3 px-4">শাখার নাম ও কোড</th>
                                    <th className="py-3 px-3 text-center">ভর্তি সুইচ</th>
                                    <th className="py-3 px-3 text-center">একক এন্ট্রি</th>
                                    <th className="py-3 px-3 text-center">বাল্ক এক্সেল</th>
                                    <th className="py-3 px-4 text-center font-bold text-blue-700">সর্বমোট রেজিস্টার্ড</th>
                                    <th className="py-3 px-3 text-right print:hidden">অ্যাকশন</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                                {summary.rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="py-10 text-center text-slate-400">
                                            কোনো ডাটা পাওয়া যায়নি
                                        </td>
                                    </tr>
                                ) : (
                                    summary.rows.map((row, idx) => (
                                        <tr key={row.branch_id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="py-3 px-3 text-center font-bold text-slate-500">
                                                {idx + 1}
                                            </td>
                                            <td className="py-3 px-3 text-slate-600">{row.zone_name || '-'}</td>
                                            <td className="py-3 px-3 text-slate-600">{row.area_name || '-'}</td>
                                            <td className="py-3 px-4 font-semibold text-slate-900">
                                                {row.branch_name}{' '}
                                                <span className="font-mono text-[11px] text-slate-500">
                                                    ({row.branch_code})
                                                </span>
                                            </td>
                                            <td className="py-3 px-3 text-center font-medium text-emerald-700">
                                                {row.switch_count}
                                            </td>
                                            <td className="py-3 px-3 text-center font-medium text-sky-700">
                                                {row.single_count}
                                            </td>
                                            <td className="py-3 px-3 text-center font-medium text-purple-700">
                                                {row.bulk_count}
                                            </td>
                                            <td className="py-3 px-4 text-center font-bold text-base text-blue-700">
                                                {row.total_registered}
                                            </td>
                                            <td className="py-3 px-3 text-right print:hidden">
                                                <button
                                                    type="button"
                                                    onClick={() => handleViewBranchLedger(row.branch_id)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold transition-colors"
                                                >
                                                    <span>লেজার</span>
                                                    <ArrowRight size={12} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                            {summary.rows.length > 0 && (
                                <tfoot>
                                    <tr className="bg-slate-100 font-bold text-xs text-slate-800 border-t-2 border-slate-300">
                                        <td colSpan={4} className="py-3 px-4 text-right">
                                            মোট সর্বমোট:
                                        </td>
                                        <td className="py-3 px-3 text-center text-emerald-800">
                                            {summary.totals.total_switch}
                                        </td>
                                        <td className="py-3 px-3 text-center text-sky-800">
                                            {summary.totals.total_single}
                                        </td>
                                        <td className="py-3 px-3 text-center text-purple-800">
                                            {summary.totals.total_bulk}
                                        </td>
                                        <td className="py-3 px-4 text-center font-black text-blue-800 text-base">
                                            {summary.totals.total_registered}
                                        </td>
                                        <td className="print:hidden"></td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </AutoFitTableContainer>
                )}

                {/* 5. Tab 2: Detailed Ledger View */}
                {activeTab === 'ledger' && (
                    <div className="space-y-4">
                        <AutoFitTableContainer
                            minWidth={1100}
                            storageKey="app_reg_ledger_table"
                            title="অ্যাপ রেজিস্ট্রেশন বিস্তারিত লেজার"
                            subtitle={`(মোট ${ledger.total} টি এন্ট্রি)`}
                        >
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                        <th className="py-3 px-3 text-center">ক্রমিক</th>
                                        <th className="py-3 px-3">তারিখ ও সময়</th>
                                        <th className="py-3 px-3">শাখা</th>
                                        <th className="py-3 px-3">সমিতি</th>
                                        <th className="py-3 px-3">সদস্য কোড</th>
                                        <th className="py-3 px-3">সদস্যের নাম</th>
                                        <th className="py-3 px-3">মোবাইল</th>
                                        <th className="py-3 px-3 text-center">উৎস</th>
                                        <th className="py-3 px-3">এন্ট্রি করেছেন</th>
                                        <th className="py-3 px-3 text-center">স্ট্যাটাস</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                    {ledger.data.length === 0 ? (
                                        <tr>
                                            <td colSpan={10} className="py-12 text-center text-slate-400">
                                                কোনো লেজার রেকর্ড পাওয়া যায়নি
                                            </td>
                                        </tr>
                                    ) : (
                                        ledger.data.map((item, index) => (
                                            <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                                                <td className="py-3 px-3 text-center font-bold text-slate-500">
                                                    {(ledger.current_page - 1) * ledger.per_page + index + 1}
                                                </td>
                                                <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                                                    {item.registered_at ? formatDateTime(item.registered_at) : '-'}
                                                </td>
                                                <td className="py-3 px-3 text-slate-800 font-medium">
                                                    {item.branch?.name || '-'}{' '}
                                                    <span className="text-slate-400 font-mono text-[11px]">
                                                        ({item.branch?.code || ''})
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3 text-slate-600">
                                                    {item.samity?.samity_name ? (
                                                        <span>
                                                            {item.samity.samity_name}{' '}
                                                            <span className="text-slate-400 font-mono text-[11px]">
                                                                ({item.samity.samity_code})
                                                            </span>
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 italic">-</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-3 font-mono font-bold text-blue-700 whitespace-nowrap">
                                                    {item.member_code}
                                                </td>
                                                <td className="py-3 px-3 font-medium text-slate-900">
                                                    {item.member_name}
                                                </td>
                                                <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                                                    {item.phone_number || '-'}
                                                </td>
                                                <td className="py-3 px-3 text-center whitespace-nowrap">
                                                    {sourceBadge(item.registration_source)}
                                                </td>
                                                <td className="py-3 px-3 text-slate-600">
                                                    {item.registeredByUser?.name || '-'}
                                                </td>
                                                <td className="py-3 px-3 text-center whitespace-nowrap">
                                                    {item.is_registered ? (
                                                        <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-100 text-emerald-800">
                                                            Active
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-slate-100 text-slate-600">
                                                            Inactive
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </AutoFitTableContainer>

                        {/* Pagination */}
                        {ledger.last_page > 1 && (
                            <div className="print:hidden">
                                <ListPagination
                                    pagination={ledger}
                                    onPageChange={(page) => {
                                        router.get(
                                            '/reports/app-registrations',
                                            {
                                                ...filters,
                                                page,
                                            },
                                            { preserveState: true, preserveScroll: true }
                                        );
                                    }}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
