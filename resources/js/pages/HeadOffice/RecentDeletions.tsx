import React, { useState, useEffect } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import AutoFitTableContainer from '@/components/AutoFitTableContainer';
import ListPagination from '@/components/ListPagination';
import {
    Trash2,
    Search,
    Calendar,
    Building2,
    Users,
    Banknote,
    Layers,
    Eye,
    X,
    Clock,
    Shield,
    RotateCcw,
    FileText,
    ArrowLeft,
    UserMinus,
    CheckCircle2,
    Filter,
    PiggyBank,
} from 'lucide-react';

interface DeletionRecord {
    id: number;
    deletable_type: 'member_admission' | 'loan_application' | 'savings_application' | string;
    deletable_id: number | null;
    application_no: string;
    applicant_name: string;
    applicant_phone: string | null;
    branch_id: number | null;
    branch_name: string | null;
    branch_code: string | null;
    samity_name: string | null;
    amount: string | number | null;
    status_at_deletion: string | null;
    deleted_by_user_id: number | null;
    deleted_by_name: string;
    deleted_by_username: string | null;
    deleted_by_role: string | null;
    ip_address: string | null;
    deleted_data: any;
    deleted_at: string;
    branch?: {
        id: number;
        name: string;
        area?: {
            id: number;
            name: string;
            zone?: {
                id: number;
                name: string;
            };
        };
    };
    deleted_by_user?: {
        id: number;
        name: string;
        username: string | null;
        pin: string | null;
    };
}

interface Props {
    deletions: {
        data: DeletionRecord[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from: number | null;
        to: number | null;
    };
    stats: {
        total_last_7_days: number;
        admissions_last_7_days: number;
        loans_last_7_days: number;
        savings_last_7_days?: number;
        unique_users_last_7_days: number;
    };
    filters: {
        type: string;
        days: string;
        date_from: string | null;
        date_to: string | null;
        search: string;
        branch_id: string | null;
        area_id: string | null;
        zone_id: string | null;
        per_page: number;
    };
    zones: Array<{ id: number; name: string }>;
    areas: Array<{ id: number; name: string; zone_id: number }>;
    branches: Array<{ id: number; name: string; branch_code: string; area_id: number }>;
}

export default function RecentDeletions({ deletions, stats, filters, zones, areas, branches }: Props) {
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [selectedType, setSelectedType] = useState(filters.type || 'all');
    const [daysPreset, setDaysPreset] = useState(filters.days || '7');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');
    const [selectedZone, setSelectedZone] = useState(filters.zone_id || '');
    const [selectedArea, setSelectedArea] = useState(filters.area_id || '');
    const [selectedBranch, setSelectedBranch] = useState(filters.branch_id || '');

    const [filteredAreas, setFilteredAreas] = useState(areas);
    const [filteredBranches, setFilteredBranches] = useState(branches);
    const [selectedRecord, setSelectedRecord] = useState<DeletionRecord | null>(null);

    // Cascading branch/area/zone filters
    useEffect(() => {
        if (selectedZone) {
            const fa = areas.filter((a) => String(a.zone_id) === String(selectedZone));
            setFilteredAreas(fa);
            if (selectedArea && !fa.find((a) => String(a.id) === String(selectedArea))) {
                setSelectedArea('');
            }
        } else {
            setFilteredAreas(areas);
        }
    }, [selectedZone, areas]);

    useEffect(() => {
        if (selectedArea) {
            const fb = branches.filter((b) => String(b.area_id) === String(selectedArea));
            setFilteredBranches(fb);
            if (selectedBranch && !fb.find((b) => String(b.id) === String(selectedBranch))) {
                setSelectedBranch('');
            }
        } else if (selectedZone) {
            const zoneAreaIds = filteredAreas.map((a) => a.id);
            setFilteredBranches(branches.filter((b) => zoneAreaIds.includes(b.area_id)));
        } else {
            setFilteredBranches(branches);
        }
    }, [selectedArea, selectedZone, filteredAreas, branches]);

    const applyFilters = (overrides: Record<string, any> = {}) => {
        const payload: Record<string, any> = {
            type: selectedType,
            days: daysPreset,
            date_from: dateFrom,
            date_to: dateTo,
            search: searchQuery,
            zone_id: selectedZone,
            area_id: selectedArea,
            branch_id: selectedBranch,
            per_page: deletions.per_page,
            ...overrides,
        };

        // Remove empty keys
        Object.keys(payload).forEach((k) => {
            if (payload[k] === '' || payload[k] === null || payload[k] === undefined) {
                delete payload[k];
            }
        });

        router.get('/head-office/recent-deletions', payload, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters({ page: 1 });
    };

    const handleTypeChange = (type: string) => {
        setSelectedType(type);
        applyFilters({ type, page: 1 });
    };

    const handleDaysChange = (days: string) => {
        setDaysPreset(days);
        if (days === 'custom') {
            return;
        }
        setDateFrom('');
        setDateTo('');
        applyFilters({ days, date_from: '', date_to: '', page: 1 });
    };

    const handleClearFilters = () => {
        setSearchQuery('');
        setSelectedType('all');
        setDaysPreset('7');
        setDateFrom('');
        setDateTo('');
        setSelectedZone('');
        setSelectedArea('');
        setSelectedBranch('');
        router.get('/head-office/recent-deletions', {}, { preserveState: true });
    };

    const formatBanglaDateTime = (dateStr: string) => {
        try {
            const d = new Date(dateStr);
            return d.toLocaleString('bn-BD', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
            });
        } catch {
            return dateStr;
        }
    };

    const formatRelativeTime = (dateStr: string) => {
        try {
            const diffMs = Date.now() - new Date(dateStr).getTime();
            const diffMins = Math.floor(diffMs / (1000 * 60));
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (diffMins < 1) return 'এইমাত্র';
            if (diffMins < 60) return `${diffMins} মিনিট আগে`;
            if (diffHours < 24) return `${diffHours} ঘণ্টা আগে`;
            return `${diffDays} দিন আগে`;
        } catch {
            return '';
        }
    };

    const formatCurrency = (val: string | number | null) => {
        if (!val) return '—';
        const num = Number(val);
        return isNaN(num) ? String(val) : `৳ ${num.toLocaleString('bn-BD')}`;
    };

    const roleBadge = (role: string | null) => {
        if (!role) return null;
        const normalized = role.toLowerCase();
        if (normalized.includes('super_admin') || normalized.includes('superadmin')) {
            return <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-bold border border-purple-200">Super Admin</span>;
        }
        if (normalized.includes('head_office')) {
            return <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold border border-blue-200">Head Office</span>;
        }
        return <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-medium border border-slate-200">{role}</span>;
    };

    const hasActiveFilters =
        searchQuery ||
        (selectedType && selectedType !== 'all') ||
        (daysPreset && daysPreset !== '7') ||
        dateFrom ||
        dateTo ||
        selectedZone ||
        selectedArea ||
        selectedBranch;

    return (
        <AdminLayout>
            <Head title="সাম্প্রতিক মুছে ফেলা ডাটা (Recent Deletions)" />

            <div className="p-3 md:p-4 space-y-3 max-w-[1600px] mx-auto pb-16">
                {/* ── 1. HEADER ──────────────────────────────────────────────────────── */}
                <div className="bg-white px-4 py-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
                            <Trash2 size={18} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-base md:text-lg font-bold text-slate-900 leading-none">
                                    মুছে ফেলা ডাটা হিস্ট্রি
                                </h1>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                    বিগত ৭ দিন
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                                কে কোন সদস্য ভর্তি বা ঋণ আবেদন মুছেছেন তার বিস্তারিত অডিট লগ ও স্ন্যাপশট
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link
                            href="/head-office/admission-members"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                        >
                            <ArrowLeft size={13} />
                            <span>সদস্য ভর্তি তালিকা</span>
                        </Link>
                        <Link
                            href="/head-office/loan-applications"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                        >
                            <Banknote size={13} />
                            <span>ঋণ আবেদন তালিকা</span>
                        </Link>
                        <Link
                            href="/head-office/savings-applications"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                        >
                            <PiggyBank size={13} />
                            <span>সঞ্চয় আবেদন তালিকা</span>
                        </Link>
                    </div>
                </div>

                {/* ── 2. STATS CARDS (LAST 7 DAYS) ───────────────────────────────────── */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    <div className="bg-white p-3.5 rounded-2xl border border-rose-200/80 shadow-2xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500">৭ দিনে সর্বমোট মুছে ফেলা</span>
                            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                                <Trash2 size={16} />
                            </div>
                        </div>
                        <div className="mt-2 text-2xl font-bold text-rose-700">
                            {stats.total_last_7_days} <span className="text-xs font-normal text-slate-500">টি</span>
                        </div>
                    </div>

                    <div className="bg-white p-3.5 rounded-2xl border border-indigo-200/80 shadow-2xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500">৭ দিনে সদস্য ভর্তি মুছে ফেলা</span>
                            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                                <UserMinus size={16} />
                            </div>
                        </div>
                        <div className="mt-2 text-2xl font-bold text-indigo-700">
                            {stats.admissions_last_7_days} <span className="text-xs font-normal text-slate-500">টি</span>
                        </div>
                    </div>

                    <div className="bg-white p-3.5 rounded-2xl border border-emerald-200/80 shadow-2xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500">৭ দিনে ঋণ আবেদন মুছে ফেলা</span>
                            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                                <Banknote size={16} />
                            </div>
                        </div>
                        <div className="mt-2 text-2xl font-bold text-emerald-700">
                            {stats.loans_last_7_days} <span className="text-xs font-normal text-slate-500">টি</span>
                        </div>
                    </div>

                    <div className="bg-white p-3.5 rounded-2xl border border-purple-200/80 shadow-2xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500">৭ দিনে সঞ্চয় আবেদন মুছে ফেলা</span>
                            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                                <PiggyBank size={16} />
                            </div>
                        </div>
                        <div className="mt-2 text-2xl font-bold text-purple-700">
                            {stats.savings_last_7_days ?? 0} <span className="text-xs font-normal text-slate-500">টি</span>
                        </div>
                    </div>

                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500">সম্পৃক্ত ইউজার সংখ্যা</span>
                            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                                <Users size={16} />
                            </div>
                        </div>
                        <div className="mt-2 text-2xl font-bold text-slate-800">
                            {stats.unique_users_last_7_days} <span className="text-xs font-normal text-slate-500">জন</span>
                        </div>
                    </div>
                </div>

                {/* ── 3. FILTER CARD ─────────────────────────────────────────────────── */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                    {/* Top Row: Type Tabs & Days Presets */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                        {/* Type Tabs */}
                        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl">
                            <button
                                type="button"
                                onClick={() => handleTypeChange('all')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                    selectedType === 'all'
                                        ? 'bg-white text-slate-900 shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                সকল রেকর্ড
                            </button>
                            <button
                                type="button"
                                onClick={() => handleTypeChange('member_admission')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                                    selectedType === 'member_admission'
                                        ? 'bg-indigo-600 text-white shadow-xs'
                                        : 'text-slate-600 hover:text-indigo-600'
                                }`}
                            >
                                <UserMinus size={13} />
                                <span>সদস্য ভর্তি</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleTypeChange('loan_application')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                                    selectedType === 'loan_application'
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'text-slate-600 hover:text-emerald-600'
                                }`}
                            >
                                <Banknote size={13} />
                                <span>ঋণ আবেদন</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleTypeChange('savings_application')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                                    selectedType === 'savings_application'
                                        ? 'bg-purple-600 text-white shadow-xs'
                                        : 'text-slate-600 hover:text-purple-600'
                                }`}
                            >
                                <PiggyBank size={13} />
                                <span>সঞ্চয় আবেদন</span>
                            </button>
                        </div>

                        {/* Days Presets */}
                        <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
                                <Clock size={13} /> সময়সীমা:
                            </span>
                            {[
                                { key: '7', label: 'বিগত ৭ দিন' },
                                { key: '15', label: 'বিগত ১৫ দিন' },
                                { key: '30', label: 'বিগত ৩০ দিন' },
                                { key: 'custom', label: 'কাস্টম' },
                            ].map((preset) => (
                                <button
                                    key={preset.key}
                                    type="button"
                                    onClick={() => handleDaysChange(preset.key)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                                        daysPreset === preset.key
                                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Bottom Row: Cascading Selects & Search Form */}
                    <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-2">
                        {/* Search Input */}
                        <div className="relative min-w-[200px] flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="আবেদন নং, নাম, মোবাইল বা ইউজারের নাম দিয়ে খুঁজুন..."
                                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-1 focus:ring-slate-400 font-medium"
                            />
                        </div>

                        {/* Custom Date Range if selected */}
                        {daysPreset === 'custom' && (
                            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded-xl">
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="text-xs bg-transparent border-none p-0 focus:ring-0 text-slate-700"
                                />
                                <span className="text-slate-400 text-xs">থেকে</span>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="text-xs bg-transparent border-none p-0 focus:ring-0 text-slate-700"
                                />
                            </div>
                        )}

                        {/* Zone Select */}
                        <select
                            value={selectedZone}
                            onChange={(e) => {
                                setSelectedZone(e.target.value);
                                applyFilters({ zone_id: e.target.value, area_id: '', branch_id: '', page: 1 });
                            }}
                            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 font-medium"
                        >
                            <option value="">সকল জোন</option>
                            {zones.map((z) => (
                                <option key={z.id} value={z.id}>{z.name}</option>
                            ))}
                        </select>

                        {/* Area Select */}
                        <select
                            value={selectedArea}
                            onChange={(e) => {
                                setSelectedArea(e.target.value);
                                applyFilters({ area_id: e.target.value, branch_id: '', page: 1 });
                            }}
                            disabled={filteredAreas.length === 0}
                            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 font-medium disabled:opacity-50"
                        >
                            <option value="">সকল অঞ্চল</option>
                            {filteredAreas.map((a) => (
                                <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                        </select>

                        {/* Branch Select */}
                        <select
                            value={selectedBranch}
                            onChange={(e) => {
                                setSelectedBranch(e.target.value);
                                applyFilters({ branch_id: e.target.value, page: 1 });
                            }}
                            disabled={filteredBranches.length === 0}
                            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 font-medium disabled:opacity-50"
                        >
                            <option value="">সকল শাখা</option>
                            {filteredBranches.map((b) => (
                                <option key={b.id} value={b.id}>
                                    {b.branch_code ? `(${b.branch_code}) ` : ''}{b.name}
                                </option>
                            ))}
                        </select>

                        <button
                            type="submit"
                            className="px-4 py-1.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition shadow-2xs"
                        >
                            ফিল্টার
                        </button>

                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={handleClearFilters}
                                className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-1"
                            >
                                <RotateCcw size={12} />
                                <span>রিসেট</span>
                            </button>
                        )}
                    </form>
                </div>

                {/* ── 4. TABLE SECTION ──────────────────────────────────────────────── */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                    {deletions.data.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 space-y-2">
                            <Trash2 size={32} className="mx-auto text-slate-300" />
                            <p className="text-sm font-semibold text-slate-700">কোনো মুছে ফেলা ডাটা পাওয়া যায়নি</p>
                            <p className="text-xs text-slate-500">নির্বাচিত ফিল্টার অথবা বিগত ৭ দিনে কোনো রেকর্ড মুছে ফেলা হয়নি।</p>
                        </div>
                    ) : (
                        <AutoFitTableContainer
                            minWidth={1100}
                            storageKey="ho_recent_deletions_table"
                            title="মুছে ফেলা রেকর্ডের অডিট তালিকা"
                            subtitle={`(পৃষ্ঠা ${deletions.current_page}/${deletions.last_page} · মোট ${deletions.total} টি রেকর্ড)`}
                        >
                            <table className="w-full text-left border-collapse table-auto">
                                <thead>
                                    <tr className="bg-slate-800 text-[11px] font-bold text-white uppercase tracking-wider">
                                        <th className="py-2.5 px-3 text-center w-12">#</th>
                                        <th className="py-2.5 px-3">মুছে ফেলার সময়</th>
                                        <th className="py-2.5 px-3">ধরন</th>
                                        <th className="py-2.5 px-3">আবেদন নং / সদস্য কোড</th>
                                        <th className="py-2.5 px-3">আবেদনকারী ও মোবাইল</th>
                                        <th className="py-2.5 px-3">শাখা ও সমিতি</th>
                                        <th className="py-2.5 px-3">পরিমাণ</th>
                                        <th className="py-2.5 px-3">পূর্ববর্তী স্ট্যাটাস</th>
                                        <th className="py-2.5 px-3">কে ডিলিট করেছে</th>
                                        <th className="py-2.5 px-3 text-center">স্ন্যাপশট</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                    {deletions.data.map((record, index) => {
                                        const isAdmission = record.deletable_type === 'member_admission';
                                        return (
                                            <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                                                    {(deletions.current_page - 1) * deletions.per_page + index + 1}
                                                </td>
                                                <td className="py-2.5 px-3 whitespace-nowrap">
                                                    <div className="font-semibold text-slate-800">
                                                        {formatBanglaDateTime(record.deleted_at)}
                                                    </div>
                                                    <div className="text-[11px] text-rose-600 font-medium">
                                                        {formatRelativeTime(record.deleted_at)}
                                                    </div>
                                                </td>
                                                <td className="py-2.5 px-3 whitespace-nowrap">
                                                    {record.deletable_type === 'member_admission' ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                            <UserMinus size={12} /> সদস্য ভর্তি
                                                        </span>
                                                    ) : record.deletable_type === 'savings_application' ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                                            <PiggyBank size={12} /> সঞ্চয় আবেদন
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                            <Banknote size={12} /> ঋণ আবেদন
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-2.5 px-3 whitespace-nowrap">
                                                    <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                                        {record.application_no}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    <div className="font-bold text-slate-800 leading-tight">
                                                        {record.applicant_name}
                                                    </div>
                                                    {record.applicant_phone && (
                                                        <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                                                            {record.applicant_phone}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    <div className="font-semibold text-slate-800 flex items-center gap-1 leading-tight">
                                                        <Building2 size={12} className="text-slate-400 shrink-0" />
                                                        <span>{record.branch_name || '—'}</span>
                                                    </div>
                                                    <div className="text-[11px] text-slate-500 mt-0.5">
                                                        {record.samity_name || '—'}
                                                    </div>
                                                </td>
                                                <td className="py-2.5 px-3 whitespace-nowrap font-semibold">
                                                    {formatCurrency(record.amount)}
                                                </td>
                                                <td className="py-2.5 px-3 whitespace-nowrap">
                                                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[10px] border border-slate-200">
                                                        {record.status_at_deletion || '—'}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-3 whitespace-nowrap">
                                                    <div className="font-bold text-slate-900 leading-tight flex items-center gap-1.5">
                                                        <span>{record.deleted_by_name}</span>
                                                        {roleBadge(record.deleted_by_role)}
                                                    </div>
                                                    <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                                                        {record.deleted_by_username && (
                                                            <span>ইউজার: {record.deleted_by_username}</span>
                                                        )}
                                                        {record.ip_address && (
                                                            <span className="text-[10px] font-mono text-slate-400">IP: {record.ip_address}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedRecord(record)}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition shadow-2xs"
                                                        title="বিস্তারিত ডাটা স্ন্যাপশট দেখুন"
                                                    >
                                                        <Eye size={13} />
                                                        <span>স্ন্যাপশট</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </AutoFitTableContainer>
                    )}

                    <div className="p-3 border-t border-slate-100">
                        <ListPagination
                            meta={deletions}
                            onPageChange={(page) => applyFilters({ page })}
                            onPerPageChange={(size) => applyFilters({ per_page: size, page: 1 })}
                        />
                    </div>
                </div>

                {/* ── 5. SNAPSHOT DETAIL MODAL ───────────────────────────────────────── */}
                {selectedRecord && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-6 animate-in fade-in duration-150">
                        <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200 max-h-[90vh] flex flex-col">
                            {/* Modal Header */}
                            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-bold flex items-center gap-2">
                                        <Trash2 size={16} className="text-rose-400" />
                                        মুছে ফেলা রেকর্ডের বিস্তারিত স্ন্যাপশট
                                    </h3>
                                    <p className="text-xs text-slate-300 mt-0.5">
                                        {selectedRecord.deletable_type === 'member_admission'
                                            ? 'সদস্য ভর্তি'
                                            : selectedRecord.deletable_type === 'savings_application'
                                                ? 'সঞ্চয় আবেদন'
                                                : 'ঋণ আবেদন'} · আবেদন নং {selectedRecord.application_no}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedRecord(null)}
                                    className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
                                {/* Audit Box */}
                                <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-3.5 space-y-2">
                                    <div className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                                        <Shield size={14} className="text-rose-600" />
                                        ডিলিট অডিট তথ্য
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
                                        <div><strong>ডিলিট করেছেন:</strong> {selectedRecord.deleted_by_name} ({selectedRecord.deleted_by_role || 'User'})</div>
                                        <div><strong>ইউজারনেম/PIN:</strong> {selectedRecord.deleted_by_username || '—'}</div>
                                        <div><strong>সময় ও তারিখ:</strong> {formatBanglaDateTime(selectedRecord.deleted_at)}</div>
                                        <div><strong>আইপি অ্যাড্রেস:</strong> {selectedRecord.ip_address || '—'}</div>
                                    </div>
                                </div>

                                {/* Summary Box */}
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 space-y-2">
                                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                        <FileText size={14} className="text-slate-600" />
                                        আবেদনের মূল বিবরণ
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
                                        <div><strong>আবেদন নং:</strong> {selectedRecord.application_no}</div>
                                        <div><strong>আবেদনকারী:</strong> {selectedRecord.applicant_name}</div>
                                        <div><strong>মোবাইল নম্বর:</strong> {selectedRecord.applicant_phone || '—'}</div>
                                        <div><strong>শাখা:</strong> {selectedRecord.branch_name || '—'} ({selectedRecord.branch_code || '—'})</div>
                                        <div><strong>সমিতি:</strong> {selectedRecord.samity_name || '—'}</div>
                                        <div><strong>স্ট্যাটাস:</strong> {selectedRecord.status_at_deletion || '—'}</div>
                                        {selectedRecord.amount && (
                                            <div><strong>পরিমাণ:</strong> {formatCurrency(selectedRecord.amount)}</div>
                                        )}
                                    </div>
                                </div>

                                {/* Raw JSON Snapshot Collapsible / Viewer */}
                                <div className="space-y-1.5">
                                    <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                                        <span>সংরক্ষিত ডাটা স্ন্যাপশট (Raw Snapshot)</span>
                                    </div>
                                    <pre className="bg-slate-950 text-emerald-400 p-3.5 rounded-2xl text-[11px] font-mono overflow-x-auto max-h-60 leading-relaxed border border-slate-800">
                                        {JSON.stringify(selectedRecord.deleted_data, null, 2)}
                                    </pre>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => setSelectedRecord(null)}
                                    className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold transition"
                                >
                                    বন্ধ করুন
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
