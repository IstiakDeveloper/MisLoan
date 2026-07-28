import React, { useState, useEffect } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { formatDate } from '@/utils/dateUtils';
import { Badge } from '@/components/ui/badge';
import {
    Search,
    Eye,
    Pencil,
    CalendarDays,
    Filter,
    ChevronLeft,
    ChevronRight,
    Trash2,
    FileText,
    X,
    Printer,
    Building2,
    MapPin,
    Building,
    DollarSign,
    RefreshCw,
    CheckCircle2,
    Clock,
    AlertCircle,
    XCircle,
    CheckCheck,
    CreditCard,
    UserCheck,
    Check,
    Download
} from 'lucide-react';

interface Zone {
    id: number;
    name: string;
    code: string;
}

interface Area {
    id: number;
    name: string;
    code: string;
    zone_id: number;
    zone?: Zone;
}

interface Branch {
    id: number;
    name: string;
    code: string;
    area_id: number;
    area?: {
        id: number;
        name: string;
        zone: Zone;
    };
}

interface LoanApplication {
    id: number;
    application_no: string;
    status: string;
    requested_amount: number;
    approved_amount: number | null;
    created_at: string;
    submitted_at: string | null;
    printed_at?: string | null;
    branch?: {
        id: number;
        name: string;
        area?: {
            id: number;
            name: string;
            zone?: Zone;
        };
    };
    loan_product?: {
        id: number;
        product_name: string;
        product_name_bn: string;
    };
    loan_category?: {
        id: number;
        category_name: string;
        category_name_bn: string;
    };
    member_admission?: {
        id: number;
        applicant_name_en: string;
        applicant_name_bn: string;
        mobile_number: string;
        nid_number: string;
        application_no: string;
        is_legacy?: boolean | number;
        loan_dofa?: number | string | null;
    };
    samity?: {
        samity_name: string;
        samity_name_bn: string;
    };
}

interface Props {
    loans: {
        data: LoanApplication[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from: number;
        to: number;
    };
    filters: {
        status?: string;
        search?: string;
        zone_id?: number;
        area_id?: number;
        branch_id?: number;
        date_from?: string;
        date_to?: string;
        had_issues?: string;
        printed?: string;
    };
    stats: {
        total: number;
        draft: number;
        submitted: number;
        under_review: number;
        pending_head_office: number;
        approved: number;
        pending_disbursement?: number;
        rejected: number;
        disbursed: number;
    };
    zones: Zone[];
    areas: Area[];
    branches: Branch[];
}

export default function LoanApplications({ loans, filters, stats, zones, areas, branches }: Props) {
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');
    const [printedFilter, setPrintedFilter] = useState(filters.printed || '');

    // Modals
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [markAsPrintedCheckbox, setMarkAsPrintedCheckbox] = useState(false);

    // Date filters - default to current month (1st .. today)
    const today = new Date().toISOString().split('T')[0];
    const monthStart = `${today.slice(0, 7)}-01`;
    const [dateFrom, setDateFrom] = useState(filters.date_from || monthStart);
    const [dateTo, setDateTo] = useState(filters.date_to || today);

    // Organizational filters
    const [selectedZone, setSelectedZone] = useState(filters.zone_id?.toString() || '');
    const [selectedArea, setSelectedArea] = useState(filters.area_id?.toString() || '');
    const [selectedBranch, setSelectedBranch] = useState(filters.branch_id?.toString() || '');
    const [hadIssues, setHadIssues] = useState(filters.had_issues || '');

    // Filtered lists for cascading dropdowns
    const [filteredAreas, setFilteredAreas] = useState<Area[]>(areas);
    const [filteredBranches, setFilteredBranches] = useState<Branch[]>(branches);

    // Cascading logic for Zone -> Area -> Branch
    useEffect(() => {
        if (selectedZone) {
            const filtered = areas.filter(area => area.zone_id.toString() === selectedZone);
            setFilteredAreas(filtered);
            if (selectedArea && !filtered.find(a => a.id.toString() === selectedArea)) {
                setSelectedArea('');
            }
        } else {
            setFilteredAreas(areas);
        }
    }, [selectedZone, areas]);

    useEffect(() => {
        if (selectedArea) {
            const filtered = branches.filter(branch => branch.area_id.toString() === selectedArea);
            setFilteredBranches(filtered);
            if (selectedBranch && !filtered.find(b => b.id.toString() === selectedBranch)) {
                setSelectedBranch('');
            }
        } else if (selectedZone) {
            const zoneAreaIds = filteredAreas.map(a => a.id);
            const filtered = branches.filter(branch => zoneAreaIds.includes(branch.area_id));
            setFilteredBranches(filtered);
        } else {
            setFilteredBranches(branches);
        }
    }, [selectedArea, selectedZone, filteredAreas, branches]);

    const getQueryParams = (overrides = {}) => {
        const queryParams: any = {
            search: searchQuery,
            status: statusFilter,
            zone_id: selectedZone,
            area_id: selectedArea,
            branch_id: selectedBranch,
            date_from: dateFrom,
            date_to: dateTo,
            had_issues: hadIssues,
            printed: printedFilter,
            ...overrides,
        };

        // Clean empty values
        Object.keys(queryParams).forEach(key => {
            if (!queryParams[key]) delete queryParams[key];
        });

        return queryParams;
    };

    const applyFilters = (overrides = {}) => {
        router.get('/head-office/loan-applications', getQueryParams(overrides), {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const isTodayFilter = dateFrom === today && dateTo === today;

    const handleTodayFilter = () => {
        setDateFrom(today);
        setDateTo(today);
        applyFilters({ date_from: today, date_to: today });
    };

    const handleResetFilters = () => {
        setSearchQuery('');
        setStatusFilter('');
        setSelectedZone('');
        setSelectedArea('');
        setSelectedBranch('');
        setDateFrom(monthStart);
        setDateTo(today);
        setHadIssues('');
        setPrintedFilter('');
        router.get('/head-office/loan-applications', { date_from: monthStart, date_to: today }, { preserveState: true });
    };

    const handleDelete = (loan: LoanApplication) => {
        if (confirm(`আপনি কি নিশ্চিত যে ঋণ আবেদন নং ${loan.application_no} মুছে ফেলতে চান?`)) {
            router.delete(`/head-office/loans/${loan.id}`, { preserveScroll: true });
        }
    };

    const handlePrintConfirm = () => {
        const params = getQueryParams();
        const printUrl = `/head-office/loan-applications/print?${new URLSearchParams(params).toString()}`;
        window.open(printUrl, '_blank');

        if (markAsPrintedCheckbox) {
            router.post('/head-office/loan-applications/mark-printed', params, {
                preserveScroll: true,
            });
        }

        setShowPrintModal(false);
        setMarkAsPrintedCheckbox(false);
    };

    const handleExportExcel = () => {
        const params = new URLSearchParams(getQueryParams());
        window.location.href = `/head-office/loan-applications/export?${params.toString()}`;
    };

    const getStatusBadge = (status: string) => {
        const statusMap: Record<string, { label: string; bg: string; text: string }> = {
            draft: { label: 'ড্রাফট', bg: 'bg-slate-100 border-slate-300', text: 'text-slate-700' },
            submitted: { label: 'জমাকৃত', bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
            under_review: { label: 'যাচাইাধীন', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700' },
            pending_head_office: { label: 'হেড অফিস পেন্ডিং', bg: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-700' },
            approved: { label: 'অনুমোদিত', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
            pending_disbursement: { label: 'বিতরণ অপেক্ষা', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800' },
            rejected: { label: 'প্রত্যাখ্যাত', bg: 'bg-red-50 border-red-200', text: 'text-red-700' },
            disbursed: { label: 'বিতরণকৃত', bg: 'bg-teal-50 border-teal-200', text: 'text-teal-700' },
        };

        const current = statusMap[status] || { label: status, bg: 'bg-slate-100 border-slate-200', text: 'text-slate-700' };
        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${current.bg} ${current.text}`}>
                {current.label}
            </span>
        );
    };

    return (
        <AdminLayout>
            <Head title="Head Office - Loan Applications (ঋণ আবেদনসমূহ)" />

            <div className="p-3 md:p-4 space-y-3 max-w-[1600px] mx-auto">
                {/* Header Bar */}
                <div className="bg-slate-900 text-white rounded-xl px-4 py-3 shadow-md flex flex-wrap items-center justify-between gap-3 border border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/30">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white tracking-tight">
                                Loan Applications (সকল ঋণ আবেদনসমূহ)
                            </h1>
                            <p className="text-xs text-slate-400">
                                সকল শাখা হতে প্রাপ্ত ঋণ আবেদনপত্রের তথ্য, ফিল্টারিং, প্রিন্ট ও রিপোর্ট
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Today Button */}
                        <button
                            type="button"
                            onClick={handleTodayFilter}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg shadow transition flex items-center gap-1 border ${
                                isTodayFilter
                                    ? 'bg-blue-600 text-white border-blue-500'
                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                            }`}
                            title="আজকের আবেদনসমূহ (Today)"
                        >
                            <CalendarDays className="w-3.5 h-3.5" /> Today (আজ)
                        </button>

                        {/* Process Loans Direct Button */}
                        <Link
                            href="/head-office/process-loans"
                            className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-lg shadow transition flex items-center gap-1.5 border border-emerald-500/30"
                        >
                            <UserCheck className="w-4 h-4" /> ঋণ আবেদন প্রসেস (Process Loans)
                        </Link>

                        <button
                            type="button"
                            onClick={handleExportExcel}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow transition flex items-center gap-1.5 border border-emerald-500/30"
                            title="Excel ডাউনলোড"
                        >
                            <Download className="w-3.5 h-3.5" /> XLSX Download
                        </button>

                        <button
                            onClick={handleResetFilters}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 transition flex items-center gap-1.5"
                        >
                            <RefreshCw className="w-3.5 h-3.5" /> রিসেট
                        </button>

                        <button
                            onClick={() => setShowPrintModal(true)}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow transition flex items-center gap-1.5 border border-indigo-500/30"
                        >
                            <Printer className="w-3.5 h-3.5" /> প্রিন্ট
                        </button>
                    </div>
                </div>

                {/* KPI Metrics Cards Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                    <div
                        onClick={() => { setStatusFilter(''); applyFilters({ status: '' }); }}
                        className={`bg-white rounded-xl p-2.5 border shadow-sm cursor-pointer transition ${!statusFilter ? 'border-indigo-500 bg-indigo-50/20' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                        <span className="text-[10px] font-bold uppercase text-slate-500 block">সর্বমোট</span>
                        <span className="text-lg font-black text-slate-900">{stats.total}</span>
                    </div>

                    <div
                        onClick={() => { setStatusFilter('pending_head_office'); applyFilters({ status: 'pending_head_office' }); }}
                        className={`bg-white rounded-xl p-2.5 border shadow-sm cursor-pointer transition ${statusFilter === 'pending_head_office' ? 'border-indigo-500 bg-indigo-50' : 'border-indigo-100 hover:border-indigo-300'}`}
                    >
                        <span className="text-[10px] font-bold uppercase text-indigo-600 block">হেড অফিস পেন্ডিং</span>
                        <span className="text-lg font-black text-indigo-700">{stats.pending_head_office}</span>
                    </div>

                    <div
                        onClick={() => { setStatusFilter('approved'); applyFilters({ status: 'approved' }); }}
                        className={`bg-white rounded-xl p-2.5 border shadow-sm cursor-pointer transition ${statusFilter === 'approved' ? 'border-emerald-500 bg-emerald-50' : 'border-emerald-100 hover:border-emerald-300'}`}
                    >
                        <span className="text-[10px] font-bold uppercase text-emerald-600 block">অনুমোদিত</span>
                        <span className="text-lg font-black text-emerald-700">{stats.approved}</span>
                    </div>

                    <div
                        onClick={() => { setStatusFilter('pending_disbursement'); applyFilters({ status: 'pending_disbursement' }); }}
                        className={`bg-white rounded-xl p-2.5 border shadow-sm cursor-pointer transition ${statusFilter === 'pending_disbursement' ? 'border-amber-500 bg-amber-50' : 'border-amber-100 hover:border-amber-300'}`}
                    >
                        <span className="text-[10px] font-bold uppercase text-amber-700 block">বিতরণ অপেক্ষা</span>
                        <span className="text-lg font-black text-amber-800">{stats.pending_disbursement ?? 0}</span>
                    </div>

                    <div
                        onClick={() => { setStatusFilter('disbursed'); applyFilters({ status: 'disbursed' }); }}
                        className={`bg-white rounded-xl p-2.5 border shadow-sm cursor-pointer transition ${statusFilter === 'disbursed' ? 'border-teal-500 bg-teal-50' : 'border-teal-100 hover:border-teal-300'}`}
                    >
                        <span className="text-[10px] font-bold uppercase text-teal-600 block">বিতরণকৃত</span>
                        <span className="text-lg font-black text-teal-700">{stats.disbursed}</span>
                    </div>

                    <div
                        onClick={() => { setStatusFilter('under_review'); applyFilters({ status: 'under_review' }); }}
                        className={`bg-white rounded-xl p-2.5 border shadow-sm cursor-pointer transition ${statusFilter === 'under_review' ? 'border-amber-500 bg-amber-50' : 'border-amber-100 hover:border-amber-300'}`}
                    >
                        <span className="text-[10px] font-bold uppercase text-amber-600 block">যাচাইাধীন</span>
                        <span className="text-lg font-black text-amber-700">{stats.under_review}</span>
                    </div>

                    <div
                        onClick={() => { setStatusFilter('submitted'); applyFilters({ status: 'submitted' }); }}
                        className={`bg-white rounded-xl p-2.5 border shadow-sm cursor-pointer transition ${statusFilter === 'submitted' ? 'border-blue-500 bg-blue-50' : 'border-blue-100 hover:border-blue-300'}`}
                    >
                        <span className="text-[10px] font-bold uppercase text-blue-600 block">জমাকৃত</span>
                        <span className="text-lg font-black text-blue-700">{stats.submitted}</span>
                    </div>

                    <div
                        onClick={() => { setStatusFilter('rejected'); applyFilters({ status: 'rejected' }); }}
                        className={`bg-white rounded-xl p-2.5 border shadow-sm cursor-pointer transition ${statusFilter === 'rejected' ? 'border-red-500 bg-red-50' : 'border-red-100 hover:border-red-300'}`}
                    >
                        <span className="text-[10px] font-bold uppercase text-red-600 block">প্রত্যাখ্যাত</span>
                        <span className="text-lg font-black text-red-700">{stats.rejected}</span>
                    </div>

                    <div
                        onClick={() => { setStatusFilter('draft'); applyFilters({ status: 'draft' }); }}
                        className={`bg-white rounded-xl p-2.5 border shadow-sm cursor-pointer transition ${statusFilter === 'draft' ? 'border-slate-500 bg-slate-100' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                        <span className="text-[10px] font-bold uppercase text-slate-500 block">ড্রাফট</span>
                        <span className="text-lg font-black text-slate-700">{stats.draft}</span>
                    </div>
                </div>

                {/* Filter Control Bar */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 space-y-2 text-xs">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2">
                        {/* Date From */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">হতে (Date From)</label>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => { setDateFrom(e.target.value); applyFilters({ date_from: e.target.value }); }}
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                            />
                        </div>

                        {/* Date To */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">পর্যন্ত (Date To)</label>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => { setDateTo(e.target.value); applyFilters({ date_to: e.target.value }); }}
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                            />
                        </div>

                        {/* Zone Filter */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">জোন (Zone)</label>
                            <select
                                value={selectedZone}
                                onChange={(e) => { setSelectedZone(e.target.value); setSelectedArea(''); setSelectedBranch(''); applyFilters({ zone_id: e.target.value, area_id: '', branch_id: '' }); }}
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
                            >
                                <option value="">সকল জোন</option>
                                {zones.map((z) => (
                                    <option key={z.id} value={z.id}>{z.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Area Filter */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">আঞ্চলিক অফিস (Area)</label>
                            <select
                                value={selectedArea}
                                onChange={(e) => { setSelectedArea(e.target.value); setSelectedBranch(''); applyFilters({ area_id: e.target.value, branch_id: '' }); }}
                                disabled={!selectedZone && filteredAreas.length === 0}
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium disabled:opacity-60"
                            >
                                <option value="">সকল আঞ্চলিক অফিস</option>
                                {filteredAreas.map((a) => (
                                    <option key={a.id} value={a.id}>{a.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Branch Filter */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">শাখা (Branch)</label>
                            <select
                                value={selectedBranch}
                                onChange={(e) => { setSelectedBranch(e.target.value); applyFilters({ branch_id: e.target.value }); }}
                                disabled={filteredBranches.length === 0}
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium disabled:opacity-60"
                            >
                                <option value="">সকল শাখা</option>
                                {filteredBranches.map((b) => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Status Filter */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">স্ট্যাটাস (Status)</label>
                            <select
                                value={statusFilter}
                                onChange={(e) => { setStatusFilter(e.target.value); applyFilters({ status: e.target.value }); }}
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
                            >
                                <option value="">সকল স্ট্যাটাস</option>
                                <option value="pending_head_office">হেড অফিস পেন্ডিং</option>
                                <option value="approved">অনুমোদিত</option>
                                <option value="pending_disbursement">বিতরণ অপেক্ষা</option>
                                <option value="disbursed">বিতরণকৃত</option>
                                <option value="under_review">যাচাইাধীন</option>
                                <option value="submitted">জমাকৃত</option>
                                <option value="rejected">প্রত্যাখ্যাত</option>
                                <option value="draft">ড্রাফট</option>
                            </select>
                        </div>

                        {/* Printed Filter (Member Admission er moto) */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">প্রিন্ট স্থিতি (Printed)</label>
                            <select
                                value={printedFilter}
                                onChange={(e) => { setPrintedFilter(e.target.value); applyFilters({ printed: e.target.value }); }}
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
                            >
                                <option value="">সকল</option>
                                <option value="yes">প্রিন্ট সম্পন্ন (Printed)</option>
                                <option value="no">অপ্রিন্টেড (Not Printed)</option>
                            </select>
                        </div>

                        {/* Issues Filter */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">সমস্যা (Had Issues)</label>
                            <select
                                value={hadIssues}
                                onChange={(e) => { setHadIssues(e.target.value); applyFilters({ had_issues: e.target.value }); }}
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
                            >
                                <option value="">সকল</option>
                                <option value="yes">সমস্যা চিহ্নিত (Yes)</option>
                                <option value="no">সমস্যামুক্ত (No)</option>
                            </select>
                        </div>

                        {/* Search Input */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">খুঁজুন (Search)</label>
                            <form onSubmit={(e) => { e.preventDefault(); applyFilters(); }} className="relative">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="আবেদন নং, নাম..."
                                    className="w-full pl-7 pr-6 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400"
                                />
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => { setSearchQuery(''); applyFilters({ search: '' }); }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </form>
                        </div>
                    </div>
                </div>

                {/* Main Loans Table */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    {loans.data.length === 0 ? (
                        <div className="p-12 text-center text-slate-500">
                            <FileText className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                            <h3 className="text-base font-bold text-slate-800">কোনো ঋণ আবেদন পাওয়া যায়নি</h3>
                            <p className="text-xs mt-1 text-slate-500">নির্বাচিত ফিল্টার অনুযায়ী কোনো রেকর্ড নেই।</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                                        <th className="py-3 px-4">আবেদন তথ্য</th>
                                        <th className="py-3 px-4">সদস্য টাইপ / দফা</th>
                                        <th className="py-3 px-4">পণ্য ও ক্যাটাগরি</th>
                                        <th className="py-3 px-4">আবেদনকারী সদস্য</th>
                                        <th className="py-3 px-4">চাহিদাকৃত / অনুমোদিত পরিমাণ</th>
                                        <th className="py-3 px-4">শাখা ও সমিতি</th>
                                        <th className="py-3 px-4">তারিখ</th>
                                        <th className="py-3 px-4">প্রিন্ট স্থিতি</th>
                                        <th className="py-3 px-4">স্ট্যাটাস</th>
                                        <th className="py-3 px-4 text-center">অ্যাকশন</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                    {loans.data.map((loan) => (
                                        <tr key={loan.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="py-3 px-4 font-mono font-bold text-slate-900">
                                                {loan.application_no}
                                            </td>

                                            {/* Member Type / Dofa */}
                                            <td className="py-3 px-4">
                                                {loan.member_admission?.is_legacy ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold rounded">
                                                        পুরাতন{loan.member_admission?.loan_dofa ? ` · দফা ${loan.member_admission?.loan_dofa}` : ''}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold rounded">
                                                        নতুন সদস্য
                                                    </span>
                                                )}
                                            </td>

                                            <td className="py-3 px-4">
                                                <div className="space-y-0.5">
                                                    <p className="font-semibold text-slate-800">
                                                        {loan.loan_product?.product_name_bn || loan.loan_product?.product_name || '—'}
                                                    </p>
                                                    <p className="text-[11px] text-slate-500">
                                                        {loan.loan_category?.category_name_bn || loan.loan_category?.category_name || '—'}
                                                    </p>
                                                </div>
                                            </td>

                                            <td className="py-3 px-4">
                                                <div className="space-y-0.5">
                                                    <p className="font-semibold text-slate-900">
                                                        {loan.member_admission?.applicant_name_en || '—'}
                                                    </p>
                                                    <p className="text-[11px] text-slate-500">
                                                        {loan.member_admission?.applicant_name_bn} ({loan.member_admission?.mobile_number})
                                                    </p>
                                                </div>
                                            </td>

                                            <td className="py-3 px-4">
                                                <div className="space-y-0.5">
                                                    <p className="font-bold text-slate-900">
                                                        ৳{Number(loan.requested_amount || 0).toLocaleString('bn-BD')}
                                                    </p>
                                                    {loan.approved_amount && (
                                                        <p className="text-[11px] text-emerald-600 font-semibold">
                                                            অনুমোদিত: ৳{Number(loan.approved_amount).toLocaleString('bn-BD')}
                                                        </p>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="py-3 px-4">
                                                <div className="space-y-0.5">
                                                    <p className="font-semibold text-slate-800">{loan.branch?.name || '—'}</p>
                                                    <p className="text-[11px] text-slate-500">{loan.samity?.samity_name || ''}</p>
                                                </div>
                                            </td>

                                            <td className="py-3 px-4 text-slate-600">
                                                {formatDate(loan.submitted_at || loan.created_at)}
                                            </td>

                                            {/* Printed Status Indicator */}
                                            <td className="py-3 px-4">
                                                {loan.printed_at ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold rounded-md">
                                                        <Check className="w-3 h-3" />
                                                        প্রিন্ট সম্পন্ন
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-medium rounded-md">
                                                        অপ্রিন্টেড
                                                    </span>
                                                )}
                                            </td>

                                            <td className="py-3 px-4">
                                                {getStatusBadge(loan.status)}
                                            </td>

                                            <td className="py-3 px-4 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <Link
                                                        href={`/head-office/loans/${loan.id}`}
                                                        className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                                        title="বিস্তারিত দেখুন"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Link>

                                                    {loan.status === 'pending_head_office' && (
                                                        <Link
                                                            href="/head-office/process-loans"
                                                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition shadow-sm flex items-center gap-1"
                                                            title="প্রসেস করুন"
                                                        >
                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                            প্রসেস
                                                        </Link>
                                                    )}

                                                    {(loan.status === 'draft' || loan.status === 'submitted') && (
                                                        <button
                                                            onClick={() => handleDelete(loan)}
                                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                            title="মুছে ফেলুন"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination Bar */}
                    {loans.last_page > 1 && (
                        <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between bg-slate-50/50 text-xs">
                            <span className="text-slate-600 font-medium">
                                পেজ {loans.current_page} / {loans.last_page} (মোট {loans.total} টি রেকর্ড)
                            </span>
                            <div className="flex items-center gap-2">
                                {loans.current_page > 1 && (
                                    <button
                                        onClick={() => applyFilters({ page: loans.current_page - 1 })}
                                        className="px-3 py-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold rounded-lg transition flex items-center gap-1"
                                    >
                                        <ChevronLeft className="w-3.5 h-3.5" /> পূর্ববর্তী
                                    </button>
                                )}
                                {loans.current_page < loans.last_page && (
                                    <button
                                        onClick={() => applyFilters({ page: loans.current_page + 1 })}
                                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition flex items-center gap-1 shadow-sm"
                                    >
                                        পরবর্তী <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Print Confirmation Modal (Identical to Member Admission Print Modal) */}
            {showPrintModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-semibold text-slate-900 mb-3">প্রিন্ট</h3>
                        <p className="text-sm text-slate-600 mb-4">
                            বর্তমান ফিল্টার অনুযায়ী তালিকা প্রিন্ট করা হবে। প্রিন্টের পর নিচের চেকবক্স চিহ্নিত করলে এই
                            তালিকার সব রেকর্ড <strong>প্রিন্ট সম্পন্ন</strong> হিসেবে নোট থাকবে।
                        </p>
                        <label className="flex items-center gap-2 cursor-pointer mb-6">
                            <input
                                type="checkbox"
                                checked={markAsPrintedCheckbox}
                                onChange={(e) => setMarkAsPrintedCheckbox(e.target.checked)}
                                className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="text-sm font-medium text-slate-700">প্রিন্ট সম্পন্ন চিহ্নিত করুন</span>
                        </label>
                        <div className="flex gap-3 justify-end">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowPrintModal(false);
                                    setMarkAsPrintedCheckbox(false);
                                }}
                                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition"
                            >
                                বাতিল
                            </button>
                            <button
                                type="button"
                                onClick={handlePrintConfirm}
                                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 flex items-center gap-1 transition shadow-sm"
                            >
                                <Printer className="w-4 h-4" />
                                প্রিন্ট
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
