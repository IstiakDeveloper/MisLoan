import React, { useState, useMemo } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { formatDate, formatDateTime } from '@/utils/dateUtils';
import ListPagination from '@/components/ListPagination';
import AutoFitTableContainer from '@/components/AutoFitTableContainer';
import { formatBranchLabel, keepListFilters, sortBranchesByCode } from '@/utils/branchLabel';
import { PhoneCallLink } from '@/components/ui/PhoneCallLink';
import {
    Search,
    Calendar,
    FileText,
    CheckCircle2,
    AlertTriangle,
    X,
    Eye,
    XCircle,
    Building2,
    Clock,
    RefreshCw,
    CheckCheck,
    Tag,
    Phone,
    CreditCard,
    Sparkles,
    Users,
    MapPin,
    Building,
    DollarSign,
} from 'lucide-react';

interface Zone {
    id: number;
    name: string;
    code?: string;
}

interface Area {
    id: number;
    name: string;
    code?: string;
    zone_id: number;
}

interface Branch {
    id: number;
    name: string;
    code?: string;
    area_id: number;
}

interface Issue {
    id: number;
    issue_description: string;
    reporter: {
        name: string;
    };
    created_at?: string;
}

interface Loan {
    id: number;
    application_no: string;
    requested_amount: number;
    approved_amount?: number | null;
    submitted_at: string;
    revision_count?: number;
    revision_comments?: string;
    branch?: {
        name: string;
    };
    samity?: {
        samity_name: string;
    };
    loan_product?: {
        product_name: string;
        product_name_bn: string;
        product_code?: string;
    };
    loan_category?: {
        category_name: string;
        category_name_bn: string;
    };
    member_admission?: {
        applicant_name_en: string;
        applicant_name_bn: string;
        nid_number?: string;
        mobile_number?: string;
        application_no?: string;
        is_legacy?: boolean | number;
        loan_dofa?: number | string | null;
    };
    issues: Issue[];
    status?: string;
}

interface Props {
    loans: {
        data: Loan[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from?: number | null;
        to?: number | null;
    };
    filters: {
        month?: string;
        date?: string;
        search?: string;
        zone_id?: number | string;
        area_id?: number | string;
        branch_id?: number | string;
        per_page?: number | string;
    };
    zones?: Zone[];
    areas?: Area[];
    branches?: Branch[];
}

const PRESET_ISSUES = [
    'NID নম্বর অমিল বা অস্পষ্ট',
    'আবেদনকারীর ছবি স্পষ্ট নয়',
    'আয়ের বিবরণীতে সামঞ্জস্যতাহীনতা',
    'গ্যারান্টরের তথ্যাদি অসম্পূর্ণ',
    'ব্যবসায়িক পরিকল্পনার তথ্য অসম্পূর্ণ',
    'সমিতি বা সদস্য ক্যাটাগরি ত্রুটিযুক্ত',
    'স্বাক্ষর বা প্রয়োজনীয় পেপার্স অনুপস্থিত',
];

export default function ProcessLoans({ loans, filters, zones = [], areas = [], branches = [] }: Props) {
    const getCurrentMonth = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    };

    const currentMonthDefault = filters.month || getCurrentMonth();
    const [monthFilter, setMonthFilter] = useState(currentMonthDefault);
    const [dateFilter, setDateFilter] = useState(filters.date || '');
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [selectedZone, setSelectedZone] = useState(filters.zone_id ? String(filters.zone_id) : '');
    const [selectedArea, setSelectedArea] = useState(filters.area_id ? String(filters.area_id) : '');
    const [selectedBranch, setSelectedBranch] = useState(filters.branch_id ? String(filters.branch_id) : '');

    const [activeTab, setActiveTab] = useState<'all' | 'clean' | 'flagged' | 'revised'>('all');

    const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
    const [showIssueModal, setShowIssueModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');

    const { data, setData, post, processing, reset, errors } = useForm({
        issue_description: '',
    });

    // Cascading Filter Computations
    const filteredAreas = useMemo(() => {
        if (!selectedZone) return areas;
        return areas.filter((a) => a.zone_id.toString() === selectedZone);
    }, [areas, selectedZone]);

    const filteredBranches = useMemo(() => {
        return sortBranchesByCode(
            branches.filter((b) => {
                if (selectedArea) return b.area_id.toString() === selectedArea;
                if (selectedZone) return filteredAreas.some((a) => a.id === b.area_id);
                return true;
            }),
        );
    }, [branches, selectedArea, selectedZone, filteredAreas]);

    // Apply Filter Changes
    const applyFilters = (
        newMonth?: string,
        newDate?: string,
        newSearch?: string,
        newZone?: string,
        newArea?: string,
        newBranch?: string,
        extra: { page?: number; per_page?: number } = {},
    ) => {
        const queryParams: Record<string, string> = {};
        const targetMonth = newMonth !== undefined ? newMonth : monthFilter;
        const targetDate = newDate !== undefined ? newDate : dateFilter;
        const targetSearch = newSearch !== undefined ? newSearch : searchQuery;
        const targetZone = newZone !== undefined ? newZone : selectedZone;
        const targetArea = newArea !== undefined ? newArea : selectedArea;
        const targetBranch = newBranch !== undefined ? newBranch : selectedBranch;

        if (targetDate) {
            queryParams.date = targetDate;
        } else if (targetMonth) {
            queryParams.month = targetMonth;
        }

        if (targetSearch.trim()) {
            queryParams.search = targetSearch.trim();
        }

        if (targetZone) queryParams.zone_id = targetZone;
        if (targetArea) queryParams.area_id = targetArea;
        if (targetBranch) queryParams.branch_id = targetBranch;

        const perPage = extra.per_page ?? Number(filters.per_page || loans.per_page || 20);
        queryParams.per_page = String(perPage);
        if (extra.page) {
            queryParams.page = String(extra.page);
        }

        router.get('/head-office/process-loans', queryParams, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setMonthFilter(val);
        setDateFilter('');
        applyFilters(val, '', searchQuery, selectedZone, selectedArea, selectedBranch);
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setDateFilter(val);
        applyFilters(monthFilter, val, searchQuery, selectedZone, selectedArea, selectedBranch);
    };

    const handleZoneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setSelectedZone(val);
        setSelectedArea('');
        setSelectedBranch('');
        applyFilters(monthFilter, dateFilter, searchQuery, val, '', '');
    };

    const handleAreaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setSelectedArea(val);
        setSelectedBranch('');
        applyFilters(monthFilter, dateFilter, searchQuery, selectedZone, val, '');
    };

    const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setSelectedBranch(val);
        applyFilters(monthFilter, dateFilter, searchQuery, selectedZone, selectedArea, val);
    };

    const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        applyFilters(monthFilter, dateFilter, searchQuery, selectedZone, selectedArea, selectedBranch);
    };

    const handleResetFilters = () => {
        const curMonth = getCurrentMonth();
        setMonthFilter(curMonth);
        setDateFilter('');
        setSearchQuery('');
        setSelectedZone('');
        setSelectedArea('');
        setSelectedBranch('');
        setActiveTab('all');
        router.get('/head-office/process-loans', { month: curMonth }, { preserveState: true });
    };

    // Client-side tab filters & Stats
    const cleanLoans = loans.data.filter(l => l.issues.length === 0);
    const flaggedLoans = loans.data.filter(l => l.issues.length > 0);
    const revisedLoans = loans.data.filter(l => (l.revision_count || 0) > 0);

    const displayedLoans = loans.data.filter(loan => {
        if (activeTab === 'clean') return loan.issues.length === 0;
        if (activeTab === 'flagged') return loan.issues.length > 0;
        if (activeTab === 'revised') return (loan.revision_count || 0) > 0;
        return true;
    });

    // Modals
    const openIssueModal = (loan: Loan) => {
        setSelectedLoan(loan);
        setShowIssueModal(true);
        reset();
    };

    const closeIssueModal = () => {
        setShowIssueModal(false);
        setSelectedLoan(null);
        reset();
    };

    const handleSaveIssue = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedLoan) return;

        post(`/head-office/loans/${selectedLoan.id}/issue`, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                closeIssueModal();
            },
        });
    };

    const addPresetIssueTag = (tagText: string) => {
        if (data.issue_description.includes(tagText)) return;
        const updated = data.issue_description
            ? `${data.issue_description}\n- ${tagText}`
            : `- ${tagText}`;
        setData('issue_description', updated);
    };

    const handleApproveAll = () => {
        const scopeText = dateFilter
            ? `তারিখ: ${dateFilter}`
            : `মাস: ${monthFilter}`;

        if (confirm(`আপনি কি নিশ্চিত যে (${scopeText}) এর ফিল্টারকৃত সমস্ত সমস্যামুক্ত ঋণ আবেদন অনুমোদন করতে চান?`)) {
            router.post('/head-office/loans/approve-all', {
                date: dateFilter || undefined,
                month: dateFilter ? undefined : monthFilter,
                zone_id: selectedZone || undefined,
                area_id: selectedArea || undefined,
                branch_id: selectedBranch || undefined,
            }, {
                ...keepListFilters,
            });
        }
    };

    const handleApproveSingle = (loan: Loan) => {
        if (loan.issues.length > 0) {
            alert('আবেদনটিতে পেন্ডিং সমস্যা রয়েছে! অনুমোদন করার আগে সমস্যা সমাধান করুন।');
            return;
        }

        if (confirm(`সদস্য নং ${loan.member_admission?.application_no || loan.application_no} (${loan.member_admission?.applicant_name_bn || loan.member_admission?.applicant_name_en}) অনুমোদন করতে চান?`)) {
            router.patch(`/head-office/loans/${loan.id}/approve`, {}, keepListFilters);
        }
    };

    const handleDeleteIssue = (issueId: number) => {
        if (confirm('এই সমস্যা রেকর্ডটি মুছে ফেলতে চান?')) {
            router.delete(`/head-office/issues/${issueId}`, keepListFilters);
        }
    };

    const openViewModal = (loan: Loan) => {
        setSelectedLoan(loan);
        setShowViewModal(true);
    };

    const closeViewModal = () => {
        setShowViewModal(false);
        setSelectedLoan(null);
    };

    const openRejectModal = (loan: Loan) => {
        setSelectedLoan(loan);
        setRejectionReason('');
        setShowRejectModal(true);
    };

    const closeRejectModal = () => {
        setShowRejectModal(false);
        setSelectedLoan(null);
        setRejectionReason('');
    };

    const handleReject = () => {
        if (!selectedLoan || !rejectionReason.trim()) {
            alert('প্রত্যাখ্যানের সঠিক কারণ প্রদান করুন');
            return;
        }
        router.patch(`/head-office/loans/${selectedLoan.id}/reject`, {
            rejection_reason: rejectionReason,
        }, {
            ...keepListFilters,
            onSuccess: () => {
                closeRejectModal();
            },
        });
    };

    // Month Label Formatter
    const formatMonthLabel = (mString: string) => {
        if (!mString) return '';
        const [y, m] = mString.split('-');
        if (!y || !m) return mString;
        const dateObj = new Date(parseInt(y), parseInt(m) - 1, 1);
        return dateObj.toLocaleString('bn-BD', { month: 'long', year: 'numeric' });
    };

    return (
        <AdminLayout>
            <Head title="Process Loans - Head Office (ঋণ আবেদন প্রসেস)" />

            <div className="p-3 md:p-4 space-y-3 max-w-[1600px] mx-auto">
                {/* Compact Header Bar */}
                <div className="bg-slate-900 text-white rounded-xl px-4 py-3 shadow-md flex flex-wrap items-center justify-between gap-3 border border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/30">
                            <DollarSign className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-lg font-bold text-white tracking-tight">
                                    Loan Process (ঋণ আবেদন প্রক্রিয়াকরণ)
                                </h1>
                                {monthFilter && (
                                    <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-[11px] font-medium rounded-full border border-emerald-500/30 flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {formatMonthLabel(monthFilter)}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-400">
                                শাখা হতে জমাকৃত ঋণ আবেদনপত্রসমূহ দ্রুত যাচাই ও হেড অফিস অনুমোদন সম্পন্ন করুন
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleResetFilters}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 transition flex items-center gap-1.5"
                            title="ফিল্টার রিসেট করুন"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            রিসেট
                        </button>

                        <button
                            onClick={handleApproveAll}
                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg shadow transition flex items-center gap-1.5 border border-emerald-500/30"
                        >
                            <CheckCheck className="w-4 h-4" />
                            এক ক্লিকে সব অনুমোদন (Approve All)
                        </button>
                    </div>
                </div>

                {/* Compact Horizontal KPI Metric Pills Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {/* Total Loans Card */}
                    <div className="bg-white rounded-xl px-3.5 py-2.5 border border-slate-200 shadow-sm flex items-center justify-between">
                        <div>
                            <span className="text-[11px] font-semibold text-slate-500 uppercase block">মোট ঋণ আবেদন</span>
                            <div className="flex items-baseline gap-1 mt-0.5">
                                <span className="text-xl font-extrabold text-slate-900">{loans.total}</span>
                                <span className="text-[10px] text-slate-400 font-medium">টি</span>
                            </div>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <FileText className="w-4 h-4" />
                        </div>
                    </div>

                    {/* Clean / Ready Card */}
                    <div className="bg-white rounded-xl px-3.5 py-2.5 border border-emerald-200 shadow-sm flex items-center justify-between">
                        <div>
                            <span className="text-[11px] font-semibold text-emerald-600 uppercase block">অনুমোদনের জন্য প্রস্তুত</span>
                            <div className="flex items-baseline gap-1 mt-0.5">
                                <span className="text-xl font-extrabold text-emerald-700">{cleanLoans.length}</span>
                                <span className="text-[10px] text-emerald-600 font-medium">টি সমস্যামুক্ত</span>
                            </div>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4" />
                        </div>
                    </div>

                    {/* Flagged Issues Card */}
                    <div className="bg-white rounded-xl px-3.5 py-2.5 border border-amber-200 shadow-sm flex items-center justify-between">
                        <div>
                            <span className="text-[11px] font-semibold text-amber-600 uppercase block">সমস্যা চিহ্নিত (Issues)</span>
                            <div className="flex items-baseline gap-1 mt-0.5">
                                <span className="text-xl font-extrabold text-amber-700">{flaggedLoans.length}</span>
                                <span className="text-[10px] text-amber-600 font-medium">টি</span>
                            </div>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                            <AlertTriangle className="w-4 h-4" />
                        </div>
                    </div>

                    {/* Revised Card */}
                    <div className="bg-white rounded-xl px-3.5 py-2.5 border border-purple-200 shadow-sm flex items-center justify-between">
                        <div>
                            <span className="text-[11px] font-semibold text-purple-600 uppercase block">পুনরায় জমাকৃত (Revised)</span>
                            <div className="flex items-baseline gap-1 mt-0.5">
                                <span className="text-xl font-extrabold text-purple-700">{revisedLoans.length}</span>
                                <span className="text-[10px] text-purple-600 font-medium">টি</span>
                            </div>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                            <RefreshCw className="w-4 h-4" />
                        </div>
                    </div>
                </div>

                {/* Compact Filter Controls Bar */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 space-y-2.5">
                    {/* Integrated Multi-column Filter Row */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                        {/* Month Picker */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                মাস (Month) *
                            </label>
                            <input
                                type="month"
                                value={monthFilter}
                                onChange={handleMonthChange}
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                            />
                        </div>

                        {/* Date Picker (Optional) */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                তারিখ (ঐচ্ছিক)
                            </label>
                            <input
                                type="date"
                                value={dateFilter}
                                onChange={handleDateChange}
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                            />
                        </div>

                        {/* Zone Filter */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                জোন (Zone)
                            </label>
                            <select
                                value={selectedZone}
                                onChange={handleZoneChange}
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                            >
                                <option value="">সকল জোন</option>
                                {zones.map((zone) => (
                                    <option key={zone.id} value={zone.id}>
                                        {zone.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Area / Regional Office Filter */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                আঞ্চলিক অফিস (Area)
                            </label>
                            <select
                                value={selectedArea}
                                onChange={handleAreaChange}
                                disabled={!selectedZone && filteredAreas.length === 0}
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 focus:bg-white disabled:opacity-60"
                            >
                                <option value="">সকল আঞ্চলিক অফিস</option>
                                {filteredAreas.map((area) => (
                                    <option key={area.id} value={area.id}>
                                        {area.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Branch Filter */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                শাখা (Branch)
                            </label>
                            <select
                                value={selectedBranch}
                                onChange={handleBranchChange}
                                disabled={filteredBranches.length === 0}
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 focus:bg-white disabled:opacity-60"
                            >
                                <option value="">সকল শাখা</option>
                                {filteredBranches.map((branch) => (
                                    <option key={branch.id} value={branch.id}>
                                        {formatBranchLabel(branch)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Search Input */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                খুঁজুন (Search)
                            </label>
                            <form onSubmit={handleSearchSubmit} className="relative">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="নাম, NID, ফোন, সদস্য নং..."
                                    className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                                />
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearchQuery('');
                                            applyFilters(monthFilter, dateFilter, '', selectedZone, selectedArea, selectedBranch);
                                        }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </form>
                        </div>
                    </div>

                    {/* Filter Category Tabs */}
                    <div className="flex items-center gap-1.5 border-t border-slate-100 pt-2 overflow-x-auto">
                        <button
                            onClick={() => setActiveTab('all')}
                            className={`px-3 py-1 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 whitespace-nowrap ${
                                activeTab === 'all'
                                    ? 'bg-slate-900 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            <span>সকল ঋণ আবেদন</span>
                            <span className={`px-1.5 py-0.2 rounded text-[10px] ${activeTab === 'all' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                                {loans.data.length}
                            </span>
                        </button>

                        <button
                            onClick={() => setActiveTab('clean')}
                            className={`px-3 py-1 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 whitespace-nowrap ${
                                activeTab === 'clean'
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                        >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>অনুমোদনের জন্য প্রস্তুত</span>
                            <span className={`px-1.5 py-0.2 rounded text-[10px] ${activeTab === 'clean' ? 'bg-emerald-700 text-white' : 'bg-emerald-200 text-emerald-800'}`}>
                                {cleanLoans.length}
                            </span>
                        </button>

                        <button
                            onClick={() => setActiveTab('flagged')}
                            className={`px-3 py-1 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 whitespace-nowrap ${
                                activeTab === 'flagged'
                                    ? 'bg-amber-600 text-white'
                                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                            }`}
                        >
                            <AlertTriangle className="w-3 h-3" />
                            <span>সমস্যা চিহ্নিত</span>
                            <span className={`px-1.5 py-0.2 rounded text-[10px] ${activeTab === 'flagged' ? 'bg-amber-700 text-white' : 'bg-amber-200 text-amber-800'}`}>
                                {flaggedLoans.length}
                            </span>
                        </button>

                        <button
                            onClick={() => setActiveTab('revised')}
                            className={`px-3 py-1 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 whitespace-nowrap ${
                                activeTab === 'revised'
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                            }`}
                        >
                            <RefreshCw className="w-3 h-3" />
                            <span>সংশোধিত</span>
                            <span className={`px-1.5 py-0.2 rounded text-[10px] ${activeTab === 'revised' ? 'bg-purple-700 text-white' : 'bg-purple-200 text-purple-800'}`}>
                                {revisedLoans.length}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Main Data Table */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    {displayedLoans.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="w-16 h-16 mx-auto mb-3 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                                <FileText className="w-8 h-8" />
                            </div>
                            <h3 className="text-base font-bold text-slate-800">কোনো ঋণ আবেদন পাওয়া যায়নি</h3>
                            <p className="text-slate-500 text-xs mt-1 max-w-xs mx-auto">
                                নির্বাচিত মাস ({monthFilter}) অথবা ফিল্টার অনুযায়ী কোনো পেন্ডিং আবেদন নেই।
                            </p>
                            <button
                                onClick={handleResetFilters}
                                className="mt-3 px-3.5 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-xs font-semibold rounded-lg transition"
                            >
                                ফিল্টার রিসেট করুন
                            </button>
                        </div>
                    ) : (
                        <AutoFitTableContainer
                            minWidth={1200}
                            storageKey="ho_process_loans_table"
                            title="ঋণ আবেদন প্রক্রিয়াকরণ তালিকা"
                            subtitle={`(মোট ${displayedLoans.length} টি)`}
                        >
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                                        <th className="py-3 px-4">সদস্য নং</th>
                                        <th className="py-3 px-4">সদস্য টাইপ / দফা</th>
                                        <th className="py-3 px-4">সদস্য তথ্য</th>
                                        <th className="py-3 px-4">ক্যাটাগরি ও প্রোডাক্ট</th>
                                        <th className="py-3 px-4">চাহিদাকৃত ঋণ পরিমাণ</th>
                                        <th className="py-3 px-4">শাখা ও সমিতি</th>
                                        <th className="py-3 px-4">জমাদানের তারিখ</th>
                                        <th className="py-3 px-4">যাচাই স্থিতি (Issues)</th>
                                        <th className="py-3 px-4 text-center">অ্যাকশন (Actions)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                    {displayedLoans.map((loan) => {
                                        const hasIssues = loan.issues.length > 0;
                                        const isRevised = (loan.revision_count || 0) > 0;

                                        return (
                                            <tr key={loan.id} className="hover:bg-slate-50/80 transition-colors">
                                                {/* Member No */}
                                                <td className="py-3 px-4 align-top font-mono font-bold text-slate-900">
                                                    <div className="space-y-1">
                                                        <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block text-xs">
                                                            {loan.member_admission?.application_no || loan.application_no}
                                                        </span>
                                                        {isRevised && (
                                                            <div>
                                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-semibold rounded">
                                                                    <RefreshCw className="w-2.5 h-2.5" />
                                                                    Rev #{loan.revision_count}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Member Type / Dofa */}
                                                <td className="py-3 px-4 align-top">
                                                    {(loan.member_admission as any)?.is_legacy ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold rounded">
                                                            পুরাতন{(loan.member_admission as any)?.loan_dofa ? ` · দফা ${(loan.member_admission as any)?.loan_dofa}` : ''}
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold rounded">
                                                            নতুন সদস্য
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Applicant Member Info */}
                                                <td className="py-3 px-4 align-top">
                                                    <div className="space-y-0.5">
                                                        <p className="font-semibold text-slate-900 leading-snug">
                                                            {loan.member_admission?.applicant_name_en || loan.member_admission?.applicant_name_bn}
                                                        </p>
                                                        <p className="text-[11px] text-slate-500">
                                                            {loan.member_admission?.applicant_name_bn}
                                                        </p>
                                                        {loan.member_admission?.mobile_number && (
                                                            <div className="pt-0.5">
                                                                <PhoneCallLink
                                                                    phone={loan.member_admission.mobile_number}
                                                                    className="text-[11px] text-slate-600 font-mono"
                                                                    iconClassName="w-3 h-3 text-blue-500"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Category & Product */}
                                                <td className="py-3 px-4 align-top">
                                                    <div className="space-y-0.5">
                                                        <p className="font-semibold text-slate-800">
                                                            {loan.loan_product?.product_name_bn || loan.loan_product?.product_name || '—'}
                                                        </p>
                                                        <p className="text-[11px] text-slate-500">
                                                            {loan.loan_category?.category_name_bn || loan.loan_category?.category_name || '—'}
                                                        </p>
                                                    </div>
                                                </td>

                                                {/* Amount */}
                                                <td className="py-3 px-4 align-top">
                                                    <span className="font-extrabold text-slate-900 text-sm">
                                                        ৳{Number(loan.requested_amount || 0).toLocaleString('bn-BD')}
                                                    </span>
                                                </td>

                                                {/* Branch & Samity */}
                                                <td className="py-3 px-4 align-top">
                                                    <div className="space-y-0.5">
                                                        <div className="flex items-center gap-1 font-semibold text-slate-800">
                                                            <Building2 className="w-3 h-3 text-indigo-500" />
                                                            <span>{loan.branch?.name}</span>
                                                        </div>
                                                        <p className="text-[11px] text-slate-500 pl-4">
                                                            {loan.samity?.samity_name}
                                                        </p>
                                                    </div>
                                                </td>

                                                {/* Submitted Date */}
                                                <td className="py-3 px-4 align-top text-slate-600">
                                                    {formatDate(loan.submitted_at)}
                                                </td>

                                                {/* Issues Status */}
                                                <td className="py-3 px-4 align-top max-w-xs">
                                                    {hasIssues ? (
                                                        <div className="space-y-1">
                                                            {loan.issues.map((issue) => (
                                                                <div
                                                                    key={issue.id}
                                                                    className="p-1.5 bg-amber-50 border border-amber-200/80 rounded-lg text-xs flex items-start justify-between gap-1.5"
                                                                >
                                                                    <div className="space-y-0.5">
                                                                        <p className="text-amber-900 font-medium leading-tight text-[11px]">
                                                                            {issue.issue_description}
                                                                        </p>
                                                                        <p className="text-[9px] text-amber-600">
                                                                            রিপোর্টার: {issue.reporter?.name || 'User'}
                                                                        </p>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => handleDeleteIssue(issue.id)}
                                                                        className="text-amber-500 hover:text-red-600 p-0.5 transition"
                                                                        title="সমস্যাটি মুছে ফেলুন"
                                                                    >
                                                                        <X className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold rounded">
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            কোনো সমস্যা নেই
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Actions */}
                                                <td className="py-3 px-4 align-top text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        {/* Details View Link */}
                                                        <a
                                                            href={`/head-office/loans/${loan.id}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                                            title="বিস্তারিত দেখুন"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </a>

                                                        {/* Report Issue (যাচাই) */}
                                                        <button
                                                            onClick={() => openIssueModal(loan)}
                                                            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-1"
                                                            title="সমস্যা চিহ্নিত করুন"
                                                        >
                                                            <AlertTriangle className="w-3 h-3" />
                                                            যাচাই
                                                        </button>

                                                        {/* Approve */}
                                                        <button
                                                            onClick={() => handleApproveSingle(loan)}
                                                            disabled={hasIssues}
                                                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                                                            title={hasIssues ? "সমস্যা থাকা অবস্থায় অনুমোদন সম্ভব নয়" : "অনুমোদন করুন"}
                                                        >
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            অনুমোদন
                                                        </button>

                                                        {/* Reject */}
                                                        <button
                                                            onClick={() => openRejectModal(loan)}
                                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                            title="বাতিল/প্রত্যাখ্যান করুন"
                                                        >
                                                            <XCircle className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </AutoFitTableContainer>
                    )}

                    <ListPagination
                        meta={loans}
                        onPageChange={(page) => applyFilters(undefined, undefined, undefined, undefined, undefined, undefined, { page })}
                        onPerPageChange={(size) => applyFilters(undefined, undefined, undefined, undefined, undefined, undefined, { per_page: size, page: 1 })}
                    />
                </div>
            </div>

            {/* Issue Reporting Modal (যাচাই Modal with Preset Quick Tags) */}
            {showIssueModal && selectedLoan && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden border border-slate-200">
                        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                                    যাচাই ও ঋণ আবেদন সমস্যা চিহ্নিতকরণ
                                </h3>
                                <p className="text-xs text-slate-300 mt-0.5">
                                    সদস্য নং: {selectedLoan.member_admission?.application_no || selectedLoan.application_no} | {selectedLoan.member_admission?.applicant_name_bn}
                                </p>
                            </div>
                            <button onClick={closeIssueModal} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveIssue} className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
                                    <Tag className="w-3.5 h-3.5 text-indigo-600" />
                                    দ্রুত সিলেক্ট ট্যাগ (Quick Tags):
                                </label>
                                <div className="flex flex-wrap gap-1.5">
                                    {PRESET_ISSUES.map((tag, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => addPresetIssueTag(tag)}
                                            className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 text-slate-700 border border-slate-200 text-xs rounded-lg transition"
                                        >
                                            + {tag}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    সমস্যার বিবরণ (Issue Description) <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={data.issue_description}
                                    onChange={(e) => setData('issue_description', e.target.value)}
                                    rows={4}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:bg-white transition"
                                    placeholder="এখানে ঋণ আবেদনের চিহ্নিত সমস্যার বিস্তারিত বিবরণ লিখুন..."
                                    required
                                />
                                {errors.issue_description && (
                                    <p className="text-xs text-red-600 mt-1">{errors.issue_description}</p>
                                )}
                            </div>

                            {selectedLoan.issues.length > 0 && (
                                <div className="border-t border-slate-100 pt-3">
                                    <h4 className="text-xs font-semibold text-slate-700 mb-1.5">পূর্বে চিহ্নিত সমস্যাসমূহ:</h4>
                                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                                        {selectedLoan.issues.map((issue) => (
                                            <div key={issue.id} className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs">
                                                <p className="text-amber-900 font-medium text-xs">{issue.issue_description}</p>
                                                <p className="text-[10px] text-amber-600 mt-0.5">
                                                    রিপোর্টার: {issue.reporter?.name}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={closeIssueModal}
                                    className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold rounded-xl transition"
                                >
                                    বাতিল
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-sm transition disabled:opacity-50"
                                >
                                    {processing ? 'সংরক্ষণ হচ্ছে...' : 'সমস্যা সেভ করুন'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && selectedLoan && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200">
                        <div className="bg-red-600 text-white p-4 flex items-center justify-between">
                            <h3 className="text-base font-bold flex items-center gap-2">
                                <XCircle className="w-5 h-5" />
                                ঋণ আবেদন প্রত্যাখ্যান (Reject Loan)
                            </h3>
                            <button onClick={closeRejectModal} className="text-red-200 hover:text-white p-1 rounded-lg hover:bg-red-700 transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-5 space-y-3 text-xs">
                            <p className="text-slate-600">
                                সদস্য নং: <strong className="text-slate-900">{selectedLoan.member_admission?.application_no || selectedLoan.application_no}</strong> ({selectedLoan.member_admission?.applicant_name_bn})
                            </p>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    প্রত্যাখ্যানের কারণ <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    rows={4}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-1 focus:ring-red-500 focus:bg-white transition"
                                    placeholder="কেন ঋণ আবেদনটি বাতিল করা হচ্ছে তার কারণ লিখুন..."
                                />
                            </div>

                            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                                <button
                                    onClick={closeRejectModal}
                                    className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold rounded-xl transition"
                                >
                                    বাতিল
                                </button>
                                <button
                                    onClick={handleReject}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl shadow-sm transition"
                                >
                                    প্রত্যাখ্যান নিশ্চিত করুন
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
