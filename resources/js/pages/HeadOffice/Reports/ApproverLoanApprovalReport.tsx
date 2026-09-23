import AdminLayout from '@/layouts/admin-layout';
import { Head, router } from '@inertiajs/react';
import { useState, useMemo } from 'react';
import {
    Calendar,
    Search,
    Printer,
    Download,
    UserCheck,
    Coins,
    Banknote,
    FileSpreadsheet,
    Building2,
    RotateCcw,
    Layers,
    Clock,
    CheckCircle2,
    Eye,
    ChevronRight,
    Users,
    Shield,
    Award,
} from 'lucide-react';

interface ApproverOption {
    id: number;
    name: string;
    role_slug?: string;
    role_rank?: number;
    role_name: string;
    branch_name: string;
}

interface ApprovalItem {
    id: number;
    loan_id: number;
    approval_date: string;
    approval_time: string;
    approved_at_raw: string;
    level: string;
    level_label: string;
    comments: string | null;
    approver_id: number;
    approver_name: string;
    approver_role: string;
    application_no: string;
    member_name: string;
    member_code: string;
    member_mobile: string;
    product_name: string;
    product_code: string;
    category_name: string;
    branch_name: string;
    branch_code: string;
    area_name: string;
    zone_name: string;
    samity_name: string;
    requested_amount: number;
    approved_amount: number;
    loan_status: string;
    loan_status_label: string;
}

interface DateApproverBreakdown {
    user_id: number;
    user_name: string;
    role_name: string;
    role_rank?: number;
    loans_count: number;
    total_amount: number;
}

interface DateSummaryItem {
    date: string;
    formatted_date: string;
    total_loans: number;
    total_amount: number;
    approvers: DateApproverBreakdown[];
}

interface ApproverSummaryItem {
    user_id: number;
    user_name: string;
    role_slug?: string;
    role_rank?: number;
    role_name: string;
    branch_name: string;
    total_loans: number;
    total_amount: number;
}

interface ZoneOption {
    id: number | string;
    name: string;
}

interface AreaOption {
    id: number | string;
    name: string;
    zone_id?: number | string;
}

interface BranchOption {
    id: number | string;
    name: string;
    code?: string;
    area_id?: number | string;
}

interface Props {
    approvals: {
        data: ApprovalItem[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        links: Array<{ url: string | null; label: string; active: boolean }>;
    };
    filters: {
        date_from: string;
        date_to: string;
        user_id: string;
        zone_id: string;
        area_id: string;
        branch_id: string;
        search: string;
        per_page: number;
    };
    summary: {
        total_loans: number;
        total_amount: number;
        unique_approvers: number;
        average_amount: number;
    };
    selected_approver?: {
        id: number;
        name: string;
        email: string;
        role_name: string;
        branch_name: string;
    } | null;
    date_summary: DateSummaryItem[];
    approver_summary: ApproverSummaryItem[];
    approvers_list: ApproverOption[];
    zones: ZoneOption[];
    areas: AreaOption[];
    branches: BranchOption[];
}

export default function ApproverLoanApprovalReport({
    approvals,
    filters,
    summary,
    selected_approver,
    date_summary = [],
    approver_summary = [],
    approvers_list = [],
    zones = [],
    areas = [],
    branches = [],
}: Props) {
    // Filter form state
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');
    const [userId, setUserId] = useState(filters.user_id || '');
    const [zoneId, setZoneId] = useState(filters.zone_id || '');
    const [areaId, setAreaId] = useState(filters.area_id || '');
    const [branchId, setBranchId] = useState(filters.branch_id || '');
    const [search, setSearch] = useState(filters.search || '');
    const [perPage, setPerPage] = useState(filters.per_page || 25);
    const [activeTab, setActiveTab] = useState<'approver_wise' | 'detailed' | 'date_wise'>('approver_wise');

    // Cascading area and branch options
    const filteredAreas = useMemo(() => {
        if (!zoneId) return areas;
        return areas.filter((a) => String(a.zone_id) === String(zoneId));
    }, [areas, zoneId]);

    const filteredBranches = useMemo(() => {
        let list = branches;
        if (zoneId) {
            const areaIds = areas.filter((a) => String(a.zone_id) === String(zoneId)).map((a) => String(a.id));
            list = list.filter((b) => areaIds.includes(String(b.area_id)));
        }
        if (areaId) {
            list = list.filter((b) => String(b.area_id) === String(areaId));
        }
        return list;
    }, [branches, areas, zoneId, areaId]);

    const buildQueryString = () => {
        const params = new URLSearchParams();
        if (dateFrom) params.set('date_from', dateFrom);
        if (dateTo) params.set('date_to', dateTo);
        if (userId) params.set('user_id', userId);
        if (zoneId) params.set('zone_id', zoneId);
        if (areaId) params.set('area_id', areaId);
        if (branchId) params.set('branch_id', branchId);
        if (search) params.set('search', search);
        if (perPage) params.set('per_page', String(perPage));
        return params.toString();
    };

    const handleApplyFilters = () => {
        const qs = buildQueryString();
        router.get(`/reports/approver-loan-approvals?${qs}`);
    };

    const handleResetFilters = () => {
        const today = new Date().toISOString().split('T')[0];
        const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        setDateFrom(firstDay);
        setDateTo(today);
        setUserId('');
        setZoneId('');
        setAreaId('');
        setBranchId('');
        setSearch('');
        router.get(`/reports/approver-loan-approvals?date_from=${firstDay}&date_to=${today}`);
    };

    // Quick Date shortcuts
    const setQuickDate = (type: 'today' | 'this_week' | 'this_month' | 'last_month') => {
        const now = new Date();
        let from = '';
        let to = now.toISOString().split('T')[0];

        if (type === 'today') {
            from = to;
        } else if (type === 'this_week') {
            const dayOfWeek = now.getDay();
            const firstDay = new Date(now);
            firstDay.setDate(now.getDate() - dayOfWeek);
            from = firstDay.toISOString().split('T')[0];
        } else if (type === 'this_month') {
            from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        } else if (type === 'last_month') {
            from = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
            to = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
        }

        setDateFrom(from);
        setDateTo(to);
        const params = new URLSearchParams(buildQueryString());
        params.set('date_from', from);
        params.set('date_to', to);
        router.get(`/reports/approver-loan-approvals?${params.toString()}`);
    };

    const handlePrint = () => {
        const qs = buildQueryString();
        window.open(`/reports/approver-loan-approvals/print?${qs}`, '_blank');
    };

    const handleExportExcel = () => {
        const qs = buildQueryString();
        window.location.href = `/reports/approver-loan-approvals/export?${qs}`;
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            maximumFractionDigits: 2,
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const formatDateDMY = (dateStr: string) => {
        if (!dateStr) return '';
        try {
            const parts = dateStr.split('-');
            if (parts.length === 3) {
                return `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
            return dateStr;
        } catch {
            return dateStr;
        }
    };

    const getRoleBadge = (roleSlug?: string, roleName?: string) => {
        const slug = (roleSlug || roleName || '').toLowerCase();
        if (slug.includes('ed') || slug.includes('executive')) {
            return {
                label: 'Executive Director (ED)',
                badge: 'bg-purple-100 text-purple-900 border-purple-300 font-bold',
                tag: 'ED',
                levelText: 'শীর্ষ স্তর (১ম)',
            };
        }
        if (slug.includes('dmf') || slug.includes('director microfinance')) {
            return {
                label: 'Director Microfinance (DMF)',
                badge: 'bg-blue-100 text-blue-900 border-blue-300 font-bold',
                tag: 'DMF',
                levelText: 'হেড অফিস (২য়)',
            };
        }
        if (slug.includes('admf') || slug.includes('assistant director')) {
            return {
                label: 'Asst. Director Microfinance (ADMF)',
                badge: 'bg-sky-100 text-sky-900 border-sky-300 font-semibold',
                tag: 'ADMF',
                levelText: 'হেড অফিস (৩য়)',
            };
        }
        if (slug.includes('zone')) {
            return {
                label: 'Zone Manager (জোন)',
                badge: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-semibold',
                tag: 'ZONE',
                levelText: 'জোন প্রধান (৪র্থ)',
            };
        }
        if (slug.includes('area') || slug.includes('regional')) {
            return {
                label: 'Area / Regional Manager (অঞ্চল)',
                badge: 'bg-amber-100 text-amber-900 border-amber-300 font-semibold',
                tag: 'REGIONAL',
                levelText: 'অঞ্চল প্রধান (৫ম)',
            };
        }
        if (slug.includes('branch') || slug.includes('manager')) {
            return {
                label: 'Branch Manager (শাখা প্রধান)',
                badge: 'bg-slate-100 text-slate-800 border-slate-300 font-medium',
                tag: 'BRANCH MANAGER',
                levelText: 'শাখা প্রধান (৬ষ্ঠ)',
            };
        }
        return {
            label: roleName || 'অন্যান্য কর্মকর্তা',
            badge: 'bg-gray-100 text-gray-800 border-gray-200 font-medium',
            tag: 'OFFICER',
            levelText: 'কর্মকর্তা',
        };
    };

    return (
        <AdminLayout>
            <Head title="অনুমোদকভিত্তিক ঋণ অনুমোদন রিপোর্ট" />

            <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <div className="p-2.5 bg-gradient-to-tr from-brand-dark to-brand rounded-xl text-white shadow-sm">
                                <UserCheck className="w-5 h-5" />
                            </div>
                            <div>
                                <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                                    অনুমোদকভিত্তিক ঋণ অনুমোদন রিপোর্ট
                                </h1>
                                <p className="text-xs text-slate-500 font-medium">
                                    কর্মকর্তা ও তারিখ অনুযায়ী অনুমোদিত ঋণের সারসংক্ষেপ, পরিসংখ্যান ও বিস্তারিত তালিকা
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition shadow-xs active:scale-95"
                            title="A4 পেপার সাইজে প্রিন্ট করুন"
                        >
                            <Printer className="w-4 h-4 text-slate-600" />
                            <span>A4 প্রিন্ট ভিউ</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleExportExcel}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 border border-emerald-700 transition shadow-xs active:scale-95"
                            title="এক্সেল (.xlsx) ফাইল ডাউনলোড করুন"
                        >
                            <Download className="w-4 h-4" />
                            <span>এক্সেল ডাউনলোড (.xlsx)</span>
                        </button>
                    </div>
                </div>

                {/* Filters Section */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                            <Search className="w-3.5 h-3.5" />
                            রিপোর্ট ফিল্টার ও তারিখ নির্বাচন
                        </span>

                        {/* Quick Date Shortcuts */}
                        <div className="flex items-center gap-1">
                            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline mr-1">দ্রুত নির্বাচন:</span>
                            <button
                                type="button"
                                onClick={() => setQuickDate('today')}
                                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                            >
                                আজ
                            </button>
                            <button
                                type="button"
                                onClick={() => setQuickDate('this_week')}
                                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                            >
                                এই সপ্তাহ
                            </button>
                            <button
                                type="button"
                                onClick={() => setQuickDate('this_month')}
                                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                            >
                                এই মাস
                            </button>
                            <button
                                type="button"
                                onClick={() => setQuickDate('last_month')}
                                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                            >
                                গত মাস
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                        {/* Approver / Manager Dropdown */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                অনুমোদক / কর্মকর্তা:
                            </label>
                            <select
                                value={userId}
                                onChange={(e) => setUserId(e.target.value)}
                                className="w-full text-xs rounded-xl border-slate-300 focus:border-brand focus:ring-brand font-medium"
                            >
                                <option value="">-- সকল অনুমোদক (All Approvers) --</option>
                                {approvers_list.map((ap) => (
                                    <option key={ap.id} value={ap.id}>
                                        {ap.name} ({ap.role_name}) {ap.branch_name ? `— ${ap.branch_name}` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Date From */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-xs font-bold text-slate-700">
                                    শুরুর তারিখ:
                                </label>
                                {dateFrom && (
                                    <span className="text-[11px] font-mono font-bold text-brand">
                                        {formatDateDMY(dateFrom)}
                                    </span>
                                )}
                            </div>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="w-full text-xs rounded-xl border-slate-300 focus:border-brand focus:ring-brand pl-8 font-medium"
                                />
                                <Calendar className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        </div>

                        {/* Date To */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-xs font-bold text-slate-700">
                                    শেষের তারিখ:
                                </label>
                                {dateTo && (
                                    <span className="text-[11px] font-mono font-bold text-brand">
                                        {formatDateDMY(dateTo)}
                                    </span>
                                )}
                            </div>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="w-full text-xs rounded-xl border-slate-300 focus:border-brand focus:ring-brand pl-8 font-medium"
                                />
                                <Calendar className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        </div>

                        {/* Branch Dropdown */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                শাখা (Branch):
                            </label>
                            <select
                                value={branchId}
                                onChange={(e) => setBranchId(e.target.value)}
                                className="w-full text-xs rounded-xl border-slate-300 focus:border-brand focus:ring-brand font-medium"
                            >
                                <option value="">-- সকল শাখা --</option>
                                {filteredBranches.map((b) => (
                                    <option key={b.id} value={b.id}>
                                        {b.name} {b.code ? `(${b.code})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Zone Dropdown */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                জোন (Zone):
                            </label>
                            <select
                                value={zoneId}
                                onChange={(e) => {
                                    setZoneId(e.target.value);
                                    setAreaId('');
                                    setBranchId('');
                                }}
                                className="w-full text-xs rounded-xl border-slate-300 focus:border-brand focus:ring-brand font-medium"
                            >
                                <option value="">-- সকল জোন --</option>
                                {zones.map((z) => (
                                    <option key={z.id} value={z.id}>{z.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Area Dropdown */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                এরিয়া (Area):
                            </label>
                            <select
                                value={areaId}
                                onChange={(e) => {
                                    setAreaId(e.target.value);
                                    setBranchId('');
                                }}
                                className="w-full text-xs rounded-xl border-slate-300 focus:border-brand focus:ring-brand font-medium"
                            >
                                <option value="">-- সকল এরিয়া --</option>
                                {filteredAreas.map((a) => (
                                    <option key={a.id} value={a.id}>{a.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Search Input */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                সার্চ (আবেদন নং / সদস্য / মোবাইল):
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="আবেদন নং, নাম বা সদস্য কোড..."
                                    className="w-full text-xs rounded-xl border-slate-300 focus:border-brand focus:ring-brand pl-8"
                                    onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
                                />
                                <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-end gap-2">
                            <button
                                type="button"
                                onClick={handleApplyFilters}
                                className="flex-1 px-4 py-2.5 bg-brand hover:bg-brand-dark text-white rounded-xl text-xs font-bold transition shadow-xs active:scale-95"
                            >
                                রিপোর্ট দেখুন
                            </button>
                            <button
                                type="button"
                                onClick={handleResetFilters}
                                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition active:scale-95"
                                title="ফিল্টার রিসেট করুন"
                            >
                                <RotateCcw className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Selected Approver Info Card (if single approver filtered) */}
                {selected_approver && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
                                {selected_approver.name.charAt(0)}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-bold text-slate-800">{selected_approver.name}</h3>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800">
                                        {selected_approver.role_name}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 font-medium">
                                    শাখা: {selected_approver.branch_name || 'হেড অফিস / সর্বজনীন'} • ইমেইল: {selected_approver.email}
                                </p>
                            </div>
                        </div>
                        <div className="text-right sm:border-l sm:border-blue-200 sm:pl-4">
                            <span className="text-[11px] text-slate-500 font-bold block">এই সময়কালে মোট অনুমোদন:</span>
                            <span className="text-base font-black text-blue-900">{summary.total_loans} টি ঋণ ({formatCurrency(summary.total_amount)} ৳)</span>
                        </div>
                    </div>
                )}

                {/* Summary Metrics Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                    {/* Total Loans Card */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600 shrink-0">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                                মোট অনুমোদিত ঋণ
                            </span>
                            <span className="text-lg sm:text-xl font-black text-slate-800 truncate block">
                                {summary.total_loans.toLocaleString('bn-BD')} টি
                            </span>
                        </div>
                    </div>

                    {/* Total Amount Card */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600 shrink-0">
                            <Banknote className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                                মোট অনুমোদিত টাকা
                            </span>
                            <span className="text-lg sm:text-xl font-black text-emerald-700 truncate block">
                                {formatCurrency(summary.total_amount)} ৳
                            </span>
                        </div>
                    </div>

                    {/* Average Amount Card */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0">
                            <Coins className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                                গড় ঋণের পরিমাণ
                            </span>
                            <span className="text-lg sm:text-xl font-black text-slate-800 truncate block">
                                {formatCurrency(summary.average_amount)} ৳
                            </span>
                        </div>
                    </div>

                    {/* Approvers Count Card */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-purple-50 border border-purple-200/60 flex items-center justify-center text-purple-600 shrink-0">
                            <Users className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                                মোট কর্মকর্তা / অনুমোদক
                            </span>
                            <span className="text-lg sm:text-xl font-black text-slate-800 truncate block">
                                {summary.unique_approvers.toLocaleString('bn-BD')} জন
                            </span>
                        </div>
                    </div>
                </div>

                {/* View Tabs */}
                <div className="flex items-center gap-2 border-b border-slate-200">
                    <button
                        type="button"
                        onClick={() => setActiveTab('approver_wise')}
                        className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-1.5 border-b-2 transition ${
                            activeTab === 'approver_wise'
                                ? 'border-brand text-brand-dark'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <Users className="w-4 h-4" />
                        <span>অনুমোদকভিত্তিক সারসংক্ষেপ ({approver_summary.length} জন)</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('detailed')}
                        className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-1.5 border-b-2 transition ${
                            activeTab === 'detailed'
                                ? 'border-brand text-brand-dark'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        <span>অনুমোদিত ঋণের বিস্তারিত তালিকা ({summary.total_loans})</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('date_wise')}
                        className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-1.5 border-b-2 transition ${
                            activeTab === 'date_wise'
                                ? 'border-brand text-brand-dark'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <Calendar className="w-4 h-4" />
                        <span>তারিখভিত্তিক সারসংক্ষেপ ({date_summary.length} দিন)</span>
                    </button>
                </div>

                {/* TAB 1: APPROVER-WISE SUMMARY (First Tab) */}
                {activeTab === 'approver_wise' && (
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                        {/* Header Box */}
                        <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-sm font-black uppercase tracking-wider text-slate-800">
                                        অনুমোদকভিত্তিক সারসংক্ষেপ তালিকা
                                    </h2>
                                    <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-brand/10 text-brand-dark">
                                        পদক্রম অনুযায়ী সাজানো
                                    </span>
                                </div>
                                <p className="text-[11.5px] text-slate-500 mt-1 font-medium flex items-center gap-1.5 flex-wrap">
                                    <span className="text-purple-700 font-bold">Executive Director</span>
                                    <span>➔</span>
                                    <span className="text-blue-700 font-bold">DMF</span>
                                    <span>➔</span>
                                    <span className="text-sky-700 font-bold">ADMF</span>
                                    <span>➔</span>
                                    <span className="text-emerald-700 font-bold">Zone Manager</span>
                                    <span>➔</span>
                                    <span className="text-amber-700 font-bold">Regional / Area</span>
                                    <span>➔</span>
                                    <span className="text-slate-700 font-bold">Branch Manager</span>
                                </p>
                            </div>

                            {userId && (
                                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl">
                                    <span className="text-xs text-blue-800 font-medium">
                                        ফিল্টার সক্রিয়: <strong>{selected_approver?.name}</strong>
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setUserId('');
                                            const params = new URLSearchParams(buildQueryString());
                                            params.delete('user_id');
                                            router.get(`/reports/approver-loan-approvals?${params.toString()}`);
                                        }}
                                        className="text-xs font-bold text-blue-600 hover:text-blue-800 underline ml-1"
                                    >
                                        সকল দেখুন
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Approver Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                                        <th className="py-3 px-3 text-center w-12">ক্র.</th>
                                        <th className="py-3 px-3">কর্মকর্তার নাম</th>
                                        <th className="py-3 px-3">পদবী / স্তর</th>
                                        <th className="py-3 px-3">শাখা / কর্মস্থল</th>
                                        <th className="py-3 px-3 text-center">অনুমোদিত ঋণ সংখ্যা</th>
                                        <th className="py-3 px-3 text-right">অনুমোদিত মোট টাকা (৳)</th>
                                        <th className="py-3 px-3 text-right">গড় ঋণ (৳)</th>
                                        <th className="py-3 px-3 text-center">অ্যাকশন</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium">
                                    {approver_summary.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="py-8 text-center text-slate-400">
                                                নির্বাচিত ফিল্টারে কোনো অনুমোদকের তথ্য পাওয়া যায়নি।
                                            </td>
                                        </tr>
                                    ) : (
                                        approver_summary.map((item, idx) => {
                                            const badgeInfo = getRoleBadge(item.role_slug, item.role_name);
                                            const isSelected = String(item.user_id) === String(userId);
                                            const avg = item.total_loans > 0 ? item.total_amount / item.total_loans : 0;

                                            return (
                                                <tr
                                                    key={item.user_id}
                                                    className={`transition ${
                                                        isSelected
                                                            ? 'bg-blue-50/80 font-bold'
                                                            : 'hover:bg-slate-50/80'
                                                    }`}
                                                >
                                                    <td className="py-3 px-3 text-center">
                                                        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-mono text-[11px] font-bold inline-flex items-center justify-center">
                                                            {idx + 1}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        <div className="font-bold text-slate-900 text-[12.5px]">{item.user_name}</div>
                                                        <div className="text-[10px] text-slate-400 font-medium">ID: #{item.user_id}</div>
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] border ${badgeInfo.badge}`}>
                                                                {badgeInfo.label}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-3 text-slate-600">
                                                        {item.branch_name && item.branch_name !== 'N/A' ? item.branch_name : 'হেড অফিস / সর্বজনীন'}
                                                    </td>
                                                    <td className="py-3 px-3 text-center font-mono font-bold text-blue-700 text-[12.5px]">
                                                        {item.total_loans.toLocaleString('bn-BD')} টি
                                                    </td>
                                                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700 text-[12.5px]">
                                                        {formatCurrency(item.total_amount)} ৳
                                                    </td>
                                                    <td className="py-3 px-3 text-right font-mono text-slate-600">
                                                        {formatCurrency(avg)} ৳
                                                    </td>
                                                    <td className="py-3 px-3 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setUserId(String(item.user_id));
                                                                setActiveTab('detailed');
                                                                const params = new URLSearchParams(buildQueryString());
                                                                params.set('user_id', String(item.user_id));
                                                                router.get(`/reports/approver-loan-approvals?${params.toString()}`);
                                                            }}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-brand/10 hover:bg-brand/20 text-brand-dark transition shadow-2xs"
                                                            title={`${item.user_name} এর অনুমোদিত ঋণের বিস্তারিত তালিকা দেখুন`}
                                                        >
                                                            <span>ঋণ তালিকা</span>
                                                            <ChevronRight className="w-3.5 h-3.5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                                {approver_summary.length > 0 && (
                                    <tfoot>
                                        <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-800">
                                            <td colSpan={4} className="py-3 px-3 text-right">
                                                সর্বমোট (Grand Total - {approver_summary.length} জন অনুমোদক):
                                            </td>
                                            <td className="py-3 px-3 text-center font-bold text-blue-900 text-sm">
                                                {summary.total_loans.toLocaleString('bn-BD')} টি
                                            </td>
                                            <td className="py-3 px-3 text-right font-mono text-emerald-800 text-sm">
                                                {formatCurrency(summary.total_amount)} ৳
                                            </td>
                                            <td className="py-3 px-3 text-right font-mono text-slate-700">
                                                {formatCurrency(summary.average_amount)} ৳
                                            </td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>
                )}

                {/* TAB 2: DETAILED LIST */}
                {activeTab === 'detailed' && (
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                ঋণের বিস্তারিত অনুমোদন বিবরণী
                            </h2>
                            <div className="flex items-center gap-2">
                                <label className="text-xs text-slate-500 font-medium">প্রতি পেজে:</label>
                                <select
                                    value={perPage}
                                    onChange={(e) => {
                                        setPerPage(Number(e.target.value));
                                        const params = new URLSearchParams(buildQueryString());
                                        params.set('per_page', e.target.value);
                                        router.get(`/reports/approver-loan-approvals?${params.toString()}`);
                                    }}
                                    className="text-xs rounded-lg border-slate-300 py-1 pl-2 pr-6"
                                >
                                    <option value={15}>১৫</option>
                                    <option value={25}>২৫</option>
                                    <option value={50}>৫০</option>
                                    <option value={100}>১০০</option>
                                    <option value={200}>২০০</option>
                                </select>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                                        <th className="py-3 px-3 text-center w-12">ক্র.</th>
                                        <th className="py-3 px-3">অনুমোদনের তারিখ ও সময়</th>
                                        <th className="py-3 px-3">আবেদন নং</th>
                                        <th className="py-3 px-3">সদস্যের নাম ও কোড</th>
                                        <th className="py-3 px-3">শাখা ও সমিতি</th>
                                        <th className="py-3 px-3">প্রোডাক্ট</th>
                                        <th className="py-3 px-3 text-right">চাহিদাকৃত (৳)</th>
                                        <th className="py-3 px-3 text-right">অনুমোদিত টাকা (৳)</th>
                                        <th className="py-3 px-3">অনুমোদক ও পদবী</th>
                                        <th className="py-3 px-3">মন্তব্য</th>
                                        <th className="py-3 px-3 text-center">ভিউ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium">
                                    {approvals.data.length === 0 ? (
                                        <tr>
                                            <td colSpan={11} className="py-12 text-center text-slate-400">
                                                নির্বাচিত ফিল্টারে কোনো ঋণ অনুমোদনের তথ্য পাওয়া যায়নি।
                                            </td>
                                        </tr>
                                    ) : (
                                        approvals.data.map((item, index) => {
                                            const sl = (approvals.current_page - 1) * approvals.per_page + index + 1;
                                            return (
                                                <tr key={item.id} className="hover:bg-slate-50/80 transition">
                                                    <td className="py-3 px-3 text-center text-slate-400 font-semibold">{sl}</td>
                                                    <td className="py-3 px-3 whitespace-nowrap">
                                                        <div className="font-bold text-slate-800">{item.approval_date}</div>
                                                        <div className="text-[10.5px] text-slate-400">{item.approval_time}</div>
                                                    </td>
                                                    <td className="py-3 px-3 whitespace-nowrap">
                                                        <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                                                            {item.application_no}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        <div className="font-bold text-slate-800">{item.member_name}</div>
                                                        <div className="text-[10.5px] text-slate-500 font-mono">
                                                            কোড: {item.member_code} {item.member_mobile !== '—' && `• ${item.member_mobile}`}
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        <div className="font-semibold text-slate-700">{item.branch_name}</div>
                                                        <div className="text-[10.5px] text-slate-400 truncate max-w-[150px]">{item.samity_name}</div>
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        <span className="font-semibold text-slate-700">{item.product_name}</span>
                                                    </td>
                                                    <td className="py-3 px-3 text-right font-mono text-slate-500">
                                                        {formatCurrency(item.requested_amount)}
                                                    </td>
                                                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                                                        {formatCurrency(item.approved_amount)}
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        <div className="font-bold text-slate-800">{item.approver_name}</div>
                                                        <div className="text-[10.5px] text-indigo-700 font-semibold">
                                                            {item.approver_role} • {item.level_label}
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-3 text-slate-500 text-[11px] max-w-[180px] truncate" title={item.comments || ''}>
                                                        {item.comments || '—'}
                                                    </td>
                                                    <td className="py-3 px-3 text-center">
                                                        <a
                                                            href={`/member/loan-applications/${item.loan_id}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-1.5 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-brand hover:bg-brand-soft transition"
                                                            title="আবেদন বিবরণী দেখুন"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </a>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                                {approvals.data.length > 0 && (
                                    <tfoot>
                                        <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-800">
                                            <td colSpan={7} className="py-3 px-3 text-right">
                                                এই পেজের সর্বমোট (Page Total):
                                            </td>
                                            <td className="py-3 px-3 text-right font-mono text-emerald-800 text-sm">
                                                {formatCurrency(approvals.data.reduce((sum, item) => sum + item.approved_amount, 0))} ৳
                                            </td>
                                            <td colSpan={3} className="py-3 px-3 text-slate-500 text-[11px]">
                                                {approvals.data.length} টি ঋণ
                                            </td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>

                        {/* Pagination Links */}
                        {approvals.last_page > 1 && (
                            <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                                <span className="text-xs text-slate-500">
                                    মোট {approvals.total} টির মধ্যে {(approvals.current_page - 1) * approvals.per_page + 1} থেকে {Math.min(approvals.current_page * approvals.per_page, approvals.total)} দেখানো হচ্ছে
                                </span>
                                <div className="flex items-center gap-1">
                                    {approvals.links.map((link, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => link.url && router.get(link.url)}
                                            disabled={!link.url}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                            className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition ${
                                                link.active
                                                    ? 'bg-brand text-white shadow-xs'
                                                    : 'text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none'
                                            }`}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 2: DATE-WISE BREAKDOWN SUMMARY */}
                {activeTab === 'date_wise' && (
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                    তারিখ অনুযায়ী ঋণ অনুমোদন বিবরণী
                                </h2>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                    প্রতিটি দিনে মোট কয়টি ঋণ ও কত টাকা অনুমোদন দেওয়া হয়েছে তার তালিকা
                                </p>
                            </div>
                            <span className="text-xs font-bold text-slate-500">
                                মোট কার্যদিবস: {date_summary.length} দিন
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                                        <th className="py-3 px-3 text-center w-12">ক্র.</th>
                                        <th className="py-3 px-3">তারিখ (Date)</th>
                                        <th className="py-3 px-3 text-center">অনুমোদিত ঋণ সংখ্যা</th>
                                        <th className="py-3 px-3 text-right">অনুমোদিত মোট টাকা (৳)</th>
                                        <th className="py-3 px-3">অনুমোদনকারী কর্মকর্তা ও ব্রেকডাউন</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium">
                                    {date_summary.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="py-12 text-center text-slate-400">
                                                কোনো তারিখভিত্তিক তথ্য পাওয়া যায়নি।
                                            </td>
                                        </tr>
                                    ) : (
                                        date_summary.map((dItem, idx) => (
                                            <tr key={dItem.date} className="hover:bg-slate-50/80 transition">
                                                <td className="py-3 px-3 text-center text-slate-400 font-semibold">{idx + 1}</td>
                                                <td className="py-3 px-3 whitespace-nowrap">
                                                    <div className="font-bold text-slate-800">{dItem.formatted_date}</div>
                                                    <div className="text-[10px] text-slate-400 font-mono">{dItem.date}</div>
                                                </td>
                                                <td className="py-3 px-3 text-center">
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                                        {dItem.total_loans} টি
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700 text-sm">
                                                    {formatCurrency(dItem.total_amount)} ৳
                                                </td>
                                                <td className="py-3 px-3">
                                                    <div className="space-y-1">
                                                        {dItem.approvers.map((ap) => (
                                                            <div key={ap.user_id} className="text-[11.5px] flex items-center gap-1.5 flex-wrap">
                                                                <span className="font-bold text-slate-800">{ap.user_name}</span>
                                                                <span className="text-[10px] text-slate-500 font-medium">({ap.role_name}):</span>
                                                                <span className="font-mono font-bold text-blue-700">{ap.loans_count} টি</span>
                                                                <span className="text-slate-400">•</span>
                                                                <span className="font-mono text-emerald-700 font-semibold">{formatCurrency(ap.total_amount)} ৳</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                                {date_summary.length > 0 && (
                                    <tfoot>
                                        <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-800">
                                            <td colSpan={2} className="py-3 px-3 text-right">
                                                সর্বমোট (Grand Total):
                                            </td>
                                            <td className="py-3 px-3 text-center font-bold text-blue-900">
                                                {summary.total_loans} টি ঋণ
                                            </td>
                                            <td className="py-3 px-3 text-right font-mono text-emerald-800 text-sm">
                                                {formatCurrency(summary.total_amount)} ৳
                                            </td>
                                            <td className="py-3 px-3 text-slate-500 text-[11px]">
                                                মোট {summary.unique_approvers} জন কর্মকর্তার অনুমোদন
                                            </td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
