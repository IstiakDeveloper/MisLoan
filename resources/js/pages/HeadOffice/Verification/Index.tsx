import React, { useState, useEffect } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { formatDate, formatDateTime } from '@/utils/dateUtils';
import ListPagination from '@/components/ListPagination';
import AutoFitTableContainer from '@/components/AutoFitTableContainer';
import { formatBranchLabel, keepListFilters, sortBranchesByCode } from '@/utils/branchLabel';
import { PhoneCallLink } from '@/components/ui/PhoneCallLink';
import {
    Search,
    CalendarDays,
    Filter,
    X,
    CheckCircle2,
    AlertCircle,
    Building2,
    Eye,
    MessageSquare,
    Check,
    HelpCircle,
    UserPlus,
    Banknote,
    Clock,
    CheckCheck,
    Users,
    ShieldAlert,
    FileText,
    ArrowRight,
    Send,
    CornerDownRight,
    MessageCircle,
    Reply,
    Ban,
    XCircle,
    RotateCcw,
    Lock,
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
    zone?: Zone;
}

interface Branch {
    id: number;
    name: string;
    code?: string;
    area_id: number;
    area?: {
        id: number;
        name: string;
        zone?: Zone;
    };
}

interface IssueDetail {
    id: number;
    issue_description: string;
    reporter_name: string;
    status: string;
    reply_message?: string | null;
    responder_name?: string | null;
    created_at?: string | null;
    replied_at?: string | null;
}

interface VerificationItem {
    id: string;
    raw_id: number;
    item_type: 'admission' | 'loan';
    application_no: string;
    applicant_name: string;
    applicant_name_en?: string;
    mobile_number?: string;
    nid_number?: string;
    category_name: string;
    branch_id: number;
    branch_name: string;
    branch_code: string;
    branch_code_int: number;
    area_name: string;
    zone_name: string;
    samity_name: string;
    status: string;
    submitted_at?: string | null;
    created_at: string;
    reviewed_at?: string | null;
    reviewed_by_name?: string | null;
    rejection_reason?: string | null;
    has_pending_issue: boolean;
    has_replied: boolean;
    issues: IssueDetail[];
    latest_issue_id?: number | null;
    latest_issue_description: string;
    latest_reply_message?: string | null;
    view_url: string;
    amount?: number | null;
}

interface Props {
    items: {
        data: VerificationItem[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from?: number | null;
        to?: number | null;
    };
    stats: {
        total: number;
        admission_count: number;
        loan_count: number;
        pending_issues: number;
        branch_replied: number;
        approved: number;
    };
    filters: {
        date_from?: string;
        date_to?: string;
        search?: string;
        type?: string;
        issue_status?: string;
        zone_id?: number | null;
        area_id?: number | null;
        branch_id?: number | null;
        per_page?: number;
    };
    permissions: {
        can_approve: boolean;
        can_reject: boolean;
        can_reply: boolean;
        is_head_office: boolean;
        is_zone_manager?: boolean;
        role: string;
    };
    zones: Zone[];
    areas: Area[];
    branches: Branch[];
}

export default function VerificationIndex({ items, stats, filters, permissions, zones, areas, branches }: Props) {
    const today = new Date().toISOString().split('T')[0];

    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');
    const isTodayFilter = dateFrom === today && dateTo === today;
    const isAllDates = !dateFrom && !dateTo;

    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [typeFilter, setTypeFilter] = useState(filters.type || 'all');
    const [issueStatusFilter, setIssueStatusFilter] = useState(filters.issue_status || 'all');

    const [selectedZone, setSelectedZone] = useState(filters.zone_id?.toString() || '');
    const [selectedArea, setSelectedArea] = useState(filters.area_id?.toString() || '');
    const [selectedBranch, setSelectedBranch] = useState(filters.branch_id?.toString() || '');

    const [filteredAreas, setFilteredAreas] = useState<Area[]>(areas);
    const [filteredBranches, setFilteredBranches] = useState<Branch[]>(branches);

    // Modals
    const [replyModalItem, setReplyModalItem] = useState<VerificationItem | null>(null);
    const [replyText, setReplyText] = useState('');

    const [rejectModalItem, setRejectModalItem] = useState<VerificationItem | null>(null);
    const [rejectReason, setRejectReason] = useState('');

    const [approvalModalItem, setApprovalModalItem] = useState<VerificationItem | null>(null);
    const [selectedItemForHistory, setSelectedItemForHistory] = useState<VerificationItem | null>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);

    // New issue by HO
    const [newIssueText, setNewIssueText] = useState('');

    useEffect(() => {
        if (selectedZone) {
            const filtered = areas.filter((area) => area.zone_id.toString() === selectedZone);
            setFilteredAreas(filtered);
            if (selectedArea && !filtered.find((a) => a.id.toString() === selectedArea)) {
                setSelectedArea('');
            }
        } else {
            setFilteredAreas(areas);
        }
    }, [selectedZone, areas]);

    useEffect(() => {
        if (selectedArea) {
            const filtered = branches.filter((branch) => branch.area_id.toString() === selectedArea);
            setFilteredBranches(sortBranchesByCode(filtered));
            if (selectedBranch && !filtered.find((b) => b.id.toString() === selectedBranch)) {
                setSelectedBranch('');
            }
        } else if (selectedZone) {
            const zoneAreaIds = filteredAreas.map((a) => a.id);
            setFilteredBranches(sortBranchesByCode(branches.filter((branch) => zoneAreaIds.includes(branch.area_id))));
        } else {
            setFilteredBranches(sortBranchesByCode(branches));
        }
    }, [selectedArea, selectedZone, filteredAreas, branches]);

    const filterPayload = (overrides: Record<string, string> = {}) => ({
        date_from: dateFrom,
        date_to: dateTo,
        search: searchQuery,
        type: typeFilter,
        issue_status: issueStatusFilter,
        zone_id: selectedZone,
        area_id: selectedArea,
        branch_id: selectedBranch,
        per_page: String(items.per_page || filters.per_page || 20),
        ...overrides,
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/verifications', filterPayload(), { preserveState: true });
    };

    const handleTypeChange = (newType: string) => {
        setTypeFilter(newType);
        router.get('/verifications', filterPayload({ type: newType, page: '1' }), { preserveState: true });
    };

    const handleStatusChange = (newStatus: string) => {
        setIssueStatusFilter(newStatus);
        router.get('/verifications', filterPayload({ issue_status: newStatus, page: '1' }), { preserveState: true });
    };

    const handleTodayFilter = () => {
        setDateFrom(today);
        setDateTo(today);
        router.get(
            '/verifications',
            filterPayload({ date_from: today, date_to: today, page: '1' }),
            { preserveState: true }
        );
    };

    const handleAllDatesFilter = () => {
        setDateFrom('');
        setDateTo('');
        router.get(
            '/verifications',
            filterPayload({ date_from: '', date_to: '', page: '1' }),
            { preserveState: true }
        );
    };

    const clearFilters = () => {
        setSearchQuery('');
        setTypeFilter('all');
        setIssueStatusFilter('all');
        setSelectedZone('');
        setSelectedArea('');
        setSelectedBranch('');
        setDateFrom('');
        setDateTo('');
        router.get(
            '/verifications',
            { date_from: '', date_to: '' },
            { preserveState: true }
        );
    };

    // 1-Click Approve (Head Office)
    const handleOneClickApprove = (item: VerificationItem) => {
        setApprovalModalItem(item);
    };

    const confirmApproval = () => {
        if (!approvalModalItem) return;
        setIsSubmitting(true);

        const url = approvalModalItem.item_type === 'admission'
            ? `/verifications/admissions/${approvalModalItem.raw_id}/approve`
            : `/verifications/loans/${approvalModalItem.raw_id}/approve`;

        router.post(url, {}, {
            ...keepListFilters,
            onSuccess: () => {
                setApprovalModalItem(null);
            },
            onFinish: () => setIsSubmitting(false),
        });
    };

    // Branch / User Reply to Issue — never prefill HO's own inquiry as the branch reply
    const handleOpenReplyModal = (item: VerificationItem) => {
        const hoText = (item.latest_issue_description || '').trim();
        const existingReply = (item.latest_reply_message || '').trim();
        setReplyModalItem(item);
        setReplyText(existingReply && existingReply !== hoText ? existingReply : '');
    };

    const handleSendReply = (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyModalItem || !replyText.trim()) return;

        setIsSubmitting(true);
        router.post('/verifications/reply-issue', {
            item_type: replyModalItem.item_type,
            raw_id: replyModalItem.raw_id,
            issue_id: replyModalItem.latest_issue_id,
            reply_message: replyText.trim(),
        }, {
            ...keepListFilters,
            onSuccess: () => {
                setReplyModalItem(null);
                setReplyText('');
            },
            onFinish: () => setIsSubmitting(false),
        });
    };

    // Reject Application
    const handleOpenRejectModal = (item: VerificationItem) => {
        setRejectModalItem(item);
        setRejectReason('');
    };

    const handleConfirmReject = (e: React.FormEvent) => {
        e.preventDefault();
        if (!rejectModalItem || !rejectReason.trim()) return;

        setIsSubmitting(true);
        router.post('/verifications/reject-application', {
            item_type: rejectModalItem.item_type,
            raw_id: rejectModalItem.raw_id,
            rejection_reason: rejectReason.trim(),
        }, {
            ...keepListFilters,
            onSuccess: () => {
                setRejectModalItem(null);
                setRejectReason('');
            },
            onFinish: () => setIsSubmitting(false),
        });
    };

    // Store new issue (Head Office)
    const handleStoreNewIssue = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItemForHistory || !newIssueText.trim()) return;

        setIsSubmitting(true);
        router.post('/verifications/store-issue', {
            item_type: selectedItemForHistory.item_type,
            raw_id: selectedItemForHistory.raw_id,
            issue_description: newIssueText.trim(),
        }, {
            ...keepListFilters,
            onSuccess: () => {
                setNewIssueText('');
                setSelectedItemForHistory(null);
            },
            onFinish: () => setIsSubmitting(false),
        });
    };

    const hasActiveFilters =
        searchQuery ||
        typeFilter !== 'all' ||
        issueStatusFilter !== 'all' ||
        selectedZone ||
        selectedArea ||
        selectedBranch ||
        dateFrom !== '' ||
        dateTo !== '';

    return (
        <AdminLayout>
            <Head title="যাচাই ও অনুসন্ধান (Verification & Inquiries)" />

            <div className="w-full space-y-5 py-4 px-3 sm:px-6 pb-16">
                {/* Header */}
                <div className="relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-indigo-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 px-5 py-5 shadow-md shadow-indigo-950/20">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.12),_transparent_50%)] pointer-events-none" />
                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-indigo-300 mb-1">
                            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                            Verification & Query Dashboard
                        </div>
                        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                            যাচাই ও অনুসন্ধান মনিটরিং
                        </h1>
                        <p className="text-sm text-indigo-200 mt-0.5">
                            {permissions.can_approve
                                ? 'হেড অফিসের আপত্তি ও তদন্তাধীন আবেদনের জোনাল ব্যাখ্যা পর্যালোচনা ও দ্রুত অনুমোদন'
                                : 'আপত্তিযুক্ত আবেদনের কারণ ও জোনাল ব্যাখ্যা পর্যবেক্ষণ করুন'}
                        </p>
                    </div>
                    <div className="relative z-10 flex flex-wrap items-center gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={handleAllDatesFilter}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                                isAllDates
                                    ? 'bg-white text-indigo-900 border-white shadow-sm font-bold'
                                    : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                            }`}
                            title="সকল তারিখের ডেটা দেখুন"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            সকল তারিখ (All Dates)
                        </button>
                        <button
                            type="button"
                            onClick={handleTodayFilter}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                                isTodayFilter
                                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm font-bold'
                                    : 'bg-indigo-500/20 hover:bg-indigo-500/40 text-white border-white/20'
                            }`}
                            title="আজকের অনুসন্ধানসমূহ"
                        >
                            <CalendarDays className="w-3.5 h-3.5" />
                            Today (আজ)
                        </button>
                    </div>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                    <button
                        type="button"
                        onClick={() => handleStatusChange('all')}
                        className={`rounded-xl p-3 text-left border transition shadow-sm ${
                            issueStatusFilter === 'all'
                                ? 'border-indigo-600 bg-indigo-600 text-white shadow-indigo-200'
                                : 'border-indigo-100 bg-white text-slate-800 hover:border-indigo-300 hover:bg-indigo-50/50'
                        }`}
                    >
                        <div className="text-xl font-bold tabular-nums leading-none">{stats?.total ?? 0}</div>
                        <div className={`text-[11px] font-medium mt-1 ${issueStatusFilter === 'all' ? 'text-indigo-100' : 'text-slate-500'}`}>
                            মোট যাচাই/তদন্ত
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleStatusChange('pending')}
                        className={`rounded-xl p-3 text-left border transition shadow-sm ${
                            issueStatusFilter === 'pending'
                                ? 'border-amber-600 bg-amber-600 text-white shadow-amber-200'
                                : 'border-amber-200 bg-amber-50/50 text-slate-800 hover:border-amber-400 hover:bg-amber-100/50'
                        }`}
                    >
                        <div className="text-xl font-bold tabular-nums leading-none text-amber-700">{stats?.pending_issues ?? 0}</div>
                        <div className="text-[11px] font-medium text-amber-900 mt-1">
                            অমীমাংসিত আপত্তি
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleStatusChange('replied')}
                        className={`rounded-xl p-3 text-left border transition shadow-sm ${
                            issueStatusFilter === 'replied'
                                ? 'border-sky-600 bg-sky-600 text-white shadow-sky-200'
                                : 'border-sky-200 bg-sky-50/50 text-slate-800 hover:border-sky-400 hover:bg-sky-100/50'
                        }`}
                    >
                        <div className="text-xl font-bold tabular-nums leading-none text-sky-700">{stats?.branch_replied ?? 0}</div>
                        <div className="text-[11px] font-medium text-sky-900 mt-1">
                            জোনাল ব্যাখ্যা প্রাপ্ত
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleStatusChange('approved')}
                        className={`rounded-xl p-3 text-left border transition shadow-sm ${
                            issueStatusFilter === 'approved'
                                ? 'border-emerald-600 bg-emerald-600 text-white shadow-emerald-200'
                                : 'border-emerald-200 bg-emerald-50/50 text-slate-800 hover:border-emerald-400 hover:bg-emerald-100/50'
                        }`}
                    >
                        <div className="text-xl font-bold tabular-nums leading-none text-emerald-700">{stats?.approved ?? 0}</div>
                        <div className="text-[11px] font-medium text-emerald-900 mt-1">
                            অনুমোদিত
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleTypeChange('admission')}
                        className={`rounded-xl p-3 text-left border transition shadow-sm ${
                            typeFilter === 'admission'
                                ? 'border-blue-600 bg-blue-600 text-white shadow-blue-200'
                                : 'border-blue-100 bg-white text-slate-800 hover:border-blue-300 hover:bg-blue-50/50'
                        }`}
                    >
                        <div className="text-xl font-bold tabular-nums leading-none">{stats?.admission_count ?? 0}</div>
                        <div className={`text-[11px] font-medium mt-1 ${typeFilter === 'admission' ? 'text-blue-100' : 'text-slate-500'}`}>
                            সদস্য ভর্তি
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleTypeChange('loan')}
                        className={`rounded-xl p-3 text-left border transition shadow-sm ${
                            typeFilter === 'loan'
                                ? 'border-emerald-600 bg-emerald-600 text-white shadow-emerald-200'
                                : 'border-emerald-100 bg-white text-slate-800 hover:border-emerald-300 hover:bg-emerald-50/50'
                        }`}
                    >
                        <div className="text-xl font-bold tabular-nums leading-none">{stats?.loan_count ?? 0}</div>
                        <div className={`text-[11px] font-medium mt-1 ${typeFilter === 'loan' ? 'text-emerald-100' : 'text-slate-500'}`}>
                            ঋণ আবেদন
                        </div>
                    </button>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl border border-indigo-100 p-3.5 shadow-sm space-y-3">
                    {/* Type switch pills */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => handleTypeChange('all')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                    typeFilter === 'all'
                                        ? 'bg-slate-900 text-white shadow-sm'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                সকল টাইপ ({stats.total})
                            </button>
                            <button
                                type="button"
                                onClick={() => handleTypeChange('admission')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                                    typeFilter === 'admission'
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                                }`}
                            >
                                <UserPlus className="w-3.5 h-3.5" />
                                ভর্তি যাচাই ({stats.admission_count})
                            </button>
                            <button
                                type="button"
                                onClick={() => handleTypeChange('loan')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                                    typeFilter === 'loan'
                                        ? 'bg-emerald-600 text-white shadow-sm'
                                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                }`}
                            >
                                <Banknote className="w-3.5 h-3.5" />
                                ঋণ যাচাই ({stats.loan_count})
                            </button>
                        </div>

                        <div className="text-xs text-slate-500 font-medium">
                            শাখা ক্রম ও কোড অনুযায়ী সুবিন্যস্ত
                        </div>
                    </div>

                    <form onSubmit={handleSearch} className="flex flex-wrap gap-2 items-end">
                        <div className="flex-1 min-w-[200px]">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 w-4 h-4" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="আবেদন নং, সদস্যের নাম, মোবাইল, এনআইডি..."
                                    className="w-full pl-9 pr-3 py-2 text-sm border border-indigo-200 rounded-lg bg-indigo-50/20 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-1">
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="px-2.5 py-2 text-sm border border-indigo-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                                title="হতে তারিখ"
                                placeholder="হতে তারিখ"
                            />
                            <span className="text-slate-400 text-xs">-</span>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="px-2.5 py-2 text-sm border border-indigo-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                                title="পর্যন্ত তারিখ"
                                placeholder="পর্যন্ত তারিখ"
                            />
                        </div>

                        {zones.length > 0 && (
                            <select
                                value={selectedZone}
                                onChange={(e) => setSelectedZone(e.target.value)}
                                className="px-2.5 py-2 text-sm border border-indigo-200 rounded-lg bg-white"
                            >
                                <option value="">সব জোন</option>
                                {zones.map((zone) => (
                                    <option key={zone.id} value={zone.id.toString()}>
                                        {zone.name}
                                    </option>
                                ))}
                            </select>
                        )}

                        {areas.length > 0 && (
                            <select
                                value={selectedArea}
                                onChange={(e) => setSelectedArea(e.target.value)}
                                disabled={!selectedZone && filteredAreas.length === 0}
                                className="px-2.5 py-2 text-sm border border-indigo-200 rounded-lg bg-white disabled:bg-slate-100"
                            >
                                <option value="">সব এলাকা</option>
                                {filteredAreas.map((area) => (
                                    <option key={area.id} value={area.id.toString()}>
                                        {area.name}
                                    </option>
                                ))}
                            </select>
                        )}

                        {branches.length > 0 && (
                            <select
                                value={selectedBranch}
                                onChange={(e) => setSelectedBranch(e.target.value)}
                                disabled={!selectedZone && !selectedArea && filteredBranches.length === 0}
                                className="px-2.5 py-2 text-sm border border-indigo-200 rounded-lg bg-white disabled:bg-slate-100"
                            >
                                <option value="">সব শাখা</option>
                                {filteredBranches.map((branch) => (
                                    <option key={branch.id} value={branch.id.toString()}>
                                        {formatBranchLabel(branch)}
                                    </option>
                                ))}
                            </select>
                        )}

                        <select
                            value={issueStatusFilter}
                            onChange={(e) => setIssueStatusFilter(e.target.value)}
                            className="px-2.5 py-2 text-sm border border-indigo-200 rounded-lg bg-white font-medium"
                        >
                            <option value="all">সব স্ট্যাটাস</option>
                            <option value="pending">অমীমাংসিত আপত্তি</option>
                            <option value="replied">শাখা জবাব দিয়েছে</option>
                            <option value="resolved">সমাধানকৃত</option>
                            <option value="approved">অনুমোদিত</option>
                            <option value="rejected">বাতিলকৃত</option>
                        </select>

                        <button
                            type="submit"
                            className="px-3.5 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold flex items-center gap-1.5 shadow-sm shadow-indigo-200"
                        >
                            <Filter className="w-3.5 h-3.5" />
                            Apply
                        </button>

                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="px-3 py-2 text-sm bg-white text-slate-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 font-medium flex items-center gap-1.5"
                            >
                                <X className="w-3.5 h-3.5" />
                                Clear
                            </button>
                        )}
                    </form>
                </div>

                {/* Table list */}
                <div className="bg-white rounded-xl border border-indigo-200 shadow-sm overflow-hidden">
                    <AutoFitTableContainer
                        minWidth={1150}
                        storageKey="ho_verification_table"
                        title="যাচাই ও অনুসন্ধান তালিকা"
                        subtitle={`(পৃষ্ঠা ${items.current_page || 1}/${items.last_page || 1} · মোট ${items.total || 0} টি রেকর্ড)`}
                    >
                        <table className="w-full text-left border-collapse table-auto">
                            <thead>
                                <tr className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-[11px] font-semibold text-white uppercase tracking-wide">
                                    <th className="py-3 px-3 border-b border-indigo-800 text-center w-12">ক্র.</th>
                                    <th className="py-3 px-3 border-b border-indigo-800 min-w-[170px]">শাখা ও সমিতি (কোড)</th>
                                    <th className="py-3 px-3 border-b border-indigo-800 min-w-[150px]">টাইপ ও আবেদন নং</th>
                                    <th className="py-3 px-3 border-b border-indigo-800 min-w-[160px]">সদস্যের নাম ও মোবাইল</th>
                                    <th className="py-3 px-3 border-b border-indigo-800 min-w-[340px]">উত্থাপিত আপত্তি ও শাখার জবাব (HO & Branch)</th>
                                    <th className="py-3 px-3 border-b border-indigo-800 text-center w-28">স্ট্যাটাস</th>
                                    <th className="py-3 px-3 border-b border-indigo-800 text-center min-w-[180px]">অ্যাকশন</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                                {(items?.data ?? []).length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-16 text-center text-slate-400">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                                                <p className="text-sm font-medium text-slate-600">কোনো অমীমাংসিত আপত্তি বা তদন্তের রেকর্ড পাওয়া যায়নি</p>
                                                <p className="text-xs text-slate-400">ফিল্টার পরিবর্তন করে আবার চেষ্টা করুন</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    (items?.data ?? []).map((item, index) => {
                                        const isAdmission = item.item_type === 'admission';
                                        const isApproved = item.status === 'approved' || item.status === 'pending_disbursement' || item.status === 'disbursed';
                                        const isRejected = item.status === 'rejected';

                                        return (
                                            <tr
                                                key={item.id}
                                                className={`transition hover:bg-indigo-50/40 ${
                                                    item.has_pending_issue ? 'bg-amber-50/20' : ''
                                                }`}
                                            >
                                                <td className="py-3.5 px-3 text-center font-mono font-medium text-slate-500 align-top">
                                                    {(items.from || 1) + index}
                                                </td>

                                                {/* Branch info */}
                                                <td className="py-3.5 px-3 align-top">
                                                    <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                                                        <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                                        <span>{item.branch_name}</span>
                                                        <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                                                            {item.branch_code}
                                                        </span>
                                                    </div>
                                                    <div className="text-[11px] text-slate-500 mt-1">
                                                        {item.samity_name} · <span className="text-slate-400">{item.area_name}</span>
                                                    </div>
                                                </td>

                                                {/* Type & App No */}
                                                <td className="py-3.5 px-3 align-top">
                                                    <div className="flex items-center gap-1.5">
                                                        <span
                                                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                                                isAdmission
                                                                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                                                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                                            }`}
                                                        >
                                                            {isAdmission ? 'ভর্তি' : 'ঋণ'}
                                                        </span>
                                                        <span className="font-mono font-semibold text-indigo-900">
                                                            {item.application_no}
                                                        </span>
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 mt-1 font-medium flex items-center gap-1" title="সর্বশেষ অ্যাকশন / জমাদানের তারিখ">
                                                        <CalendarDays className="w-3 h-3 text-indigo-400 shrink-0" />
                                                        <span>{item.submitted_at ? formatDate(item.submitted_at) : formatDate(item.created_at)}</span>
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
                                                        {item.category_name}
                                                    </div>
                                                </td>

                                                {/* Member info */}
                                                <td className="py-3.5 px-3 align-top">
                                                    <div className="font-bold text-slate-900">
                                                        {item.applicant_name}
                                                    </div>
                                                    {item.mobile_number && (
                                                        <div className="mt-1">
                                                            <PhoneCallLink
                                                                phone={item.mobile_number}
                                                                className="text-[11px] text-slate-700"
                                                                iconClassName="w-3 h-3 text-indigo-500"
                                                            />
                                                        </div>
                                                    )}
                                                    {item.nid_number && (
                                                        <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                                                            NID: {item.nid_number}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Unified HO Objection & Branch Reply Timeline */}
                                                <td className="py-3.5 px-3 align-top">
                                                    <VerificationThread
                                                        item={item}
                                                        isApproved={isApproved}
                                                        isRejected={isRejected}
                                                        compact
                                                    />
                                                </td>

                                                {/* Status */}
                                                <td className="py-3.5 px-3 text-center whitespace-nowrap align-top">
                                                    {isApproved ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                                            <CheckCircle2 className="w-3 h-3" /> অনুমোদিত
                                                        </span>
                                                    ) : isRejected ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                                            <XCircle className="w-3 h-3" /> বাতিলকৃত
                                                        </span>
                                                    ) : item.has_pending_issue ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                                            <AlertCircle className="w-3 h-3" /> তদন্তাধীন
                                                        </span>
                                                    ) : item.has_replied ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-300">
                                                            <CheckCheck className="w-3 h-3" /> জোনাল ব্যাখ্যা দেওয়া হয়েছে
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700">
                                                            {item.status}
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Actions */}
                                                <td className="py-3.5 px-3 text-center align-top">
                                                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                                        {/* Zonal Manager Reply Button */}
                                                        {!permissions.is_head_office && permissions.can_reply && !isApproved && !isRejected && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenReplyModal(item)}
                                                                className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm transition"
                                                                title="জোনাল ব্যাখ্যা / আপত্তির জবাব প্রদান করুন"
                                                            >
                                                                <Reply className="w-3.5 h-3.5" />
                                                                {item.has_replied ? 'ব্যাখ্যা সংশোধন' : 'ব্যাখ্যা/জবাব দিন'}
                                                            </button>
                                                        )}

                                                        {/* Non-ZM Branch / User Indicator: only ZM can reply */}
                                                        {!permissions.is_head_office && !permissions.can_reply && !isApproved && !isRejected && (
                                                            <span
                                                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200/80 rounded-lg text-[11px] font-medium"
                                                                title="হেড অফিসের আপত্তির প্রেক্ষিতে শুধুমাত্র জোনাল ম্যানেজার (ZM) ব্যাখ্যা প্রদান করতে পারবেন"
                                                            >
                                                                <Lock className="w-3 h-3 text-amber-600 shrink-0" />
                                                                শুধুমাত্র ZM জবাব দিতে পারবেন
                                                            </span>
                                                        )}

                                                        {/* Head Office 1-Click Approve (when Zonal reply received or no pending issue) */}
                                                        {permissions.can_approve && !isApproved && !isRejected && (item.has_replied || !item.has_pending_issue) && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOneClickApprove(item)}
                                                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm transition"
                                                                title="১ ক্লিকে অনুমোদন করুন (জোনাল ব্যাখ্যা পাওয়ার পর)"
                                                            >
                                                                <Check className="w-3.5 h-3.5" />
                                                                অনুমোদন
                                                            </button>
                                                        )}

                                                        {/* Reject Application Button */}
                                                        {permissions.can_reject && !isApproved && !isRejected && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenRejectModal(item)}
                                                                className="p-1.5 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 rounded-lg transition"
                                                                title="আবেদন বাতিল/প্রত্যাখ্যান করুন"
                                                            >
                                                                <Ban className="w-4 h-4" />
                                                            </button>
                                                        )}

                                                        {/* View Details */}
                                                        <a
                                                            href={item.view_url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="p-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 rounded-lg transition"
                                                            title="সম্পূর্ণ আবেদন দেখুন"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </a>

                                                        {/* Manage issues / Inquiry modal */}
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedItemForHistory(item);
                                                                setNewIssueText('');
                                                            }}
                                                            className="p-1.5 bg-slate-50 hover:bg-slate-800 text-slate-700 hover:text-white border border-slate-200 rounded-lg transition"
                                                            title="আপত্তি/জবাবের হিস্ট্রি ও নতুন আপত্তি"
                                                        >
                                                            <MessageSquare className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </AutoFitTableContainer>

                    {/* Pagination */}
                    {items && items.total > 0 && (
                        <div className="p-3 border-t border-indigo-100 bg-slate-50/50">
                            <ListPagination
                                meta={items}
                                onPageChange={(page) => {
                                    router.get('/verifications', filterPayload({ page: String(page) }), {
                                        preserveState: true,
                                        preserveScroll: true,
                                    });
                                }}
                                onPerPageChange={(size) => {
                                    router.get('/verifications', filterPayload({ per_page: String(size), page: '1' }), {
                                        preserveState: true,
                                        preserveScroll: true,
                                    });
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Reply Modal (Zonal Manager) */}
            {replyModalItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-150">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center">
                                    <Reply className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-sm">জোনাল ম্যানেজারের ব্যাখ্যা / জবাব প্রদান</h3>
                                    <p className="text-xs text-slate-500">
                                        আবেদন নং: <span className="font-mono font-bold text-indigo-700">{replyModalItem.application_no}</span> ({replyModalItem.applicant_name}) {replyModalItem.zone_name ? `· জোন: ${replyModalItem.zone_name}` : ''}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setReplyModalItem(null)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Current objection display */}
                        <div className="bg-amber-50 rounded-xl p-3 text-xs border border-amber-200 space-y-1">
                            <div className="font-bold text-amber-900 flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                হেড অফিসের আপত্তি / পর্যবেক্ষণ:
                            </div>
                            <p className="text-amber-950 font-medium leading-relaxed">{replyModalItem.latest_issue_description}</p>
                        </div>

                        {/* Reply input form */}
                        <form onSubmit={handleSendReply} className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    জোনাল ব্যাখ্যা / সমাধানের বিবরণ (Zonal Manager Reply):
                                </label>
                                <textarea
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder="হেড অফিসের আপত্তির প্রেক্ষিতে জোন থেকে স্পষ্ট ব্যাখ্যা বা সমাধানের বিবরণ এখানে লিখুন..."
                                    rows={4}
                                    required
                                    className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setReplyModalItem(null)}
                                    disabled={isSubmitting}
                                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                                >
                                    বাতিল
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !replyText.trim()}
                                    className="px-4 py-2 text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white rounded-lg shadow-sm transition flex items-center gap-1.5"
                                >
                                    <Send className="w-3.5 h-3.5" />
                                    {isSubmitting ? 'প্রেরণ হচ্ছে...' : 'জোনাল ব্যাখ্যা প্রেরণ করুন'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Reject Application Modal */}
            {rejectModalItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-150">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                                <Ban className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 text-base">আবেদন বাতিল / প্রত্যাখ্যান</h3>
                                <p className="text-xs text-slate-500">
                                    আবেদন নং: <span className="font-mono font-bold text-indigo-700">{rejectModalItem.application_no}</span>
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleConfirmReject} className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    বাতিলের কারণ লিখুন:
                                </label>
                                <textarea
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="আবেদন বাতিলের কারণ এখানে লিখুন..."
                                    rows={3}
                                    required
                                    className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setRejectModalItem(null)}
                                    disabled={isSubmitting}
                                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                                >
                                    ফিরে যান
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !rejectReason.trim()}
                                    className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm transition flex items-center gap-1"
                                >
                                    {isSubmitting ? 'বাতিল হচ্ছে...' : 'হ্যাঁ, আবেদন বাতিল করুন'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* One-Click Approval Confirmation Modal (Head Office) */}
            {approvalModalItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-150">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 text-base">১-ক্লিকে অনুমোদন নিশ্চিতকরণ</h3>
                                <p className="text-xs text-slate-500">আপত্তি সমাধানপূর্বক চূড়ান্ত অনুমোদন প্রদান</p>
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-2 border border-slate-200">
                            <div className="flex justify-between">
                                <span className="text-slate-500">টাইপ:</span>
                                <span className="font-bold text-slate-800">
                                    {approvalModalItem.item_type === 'admission' ? 'সদস্য ভর্তি আবেদন' : 'ঋণ আবেদন'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">আবেদন নং:</span>
                                <span className="font-mono font-bold text-indigo-700">{approvalModalItem.application_no}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">সদস্যের নাম:</span>
                                <span className="font-semibold text-slate-800">{approvalModalItem.applicant_name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">শাখা:</span>
                                <span className="font-medium text-slate-700">{approvalModalItem.branch_name} ({approvalModalItem.branch_code})</span>
                            </div>
                            {approvalModalItem.has_pending_issue && (
                                <div className="pt-2 border-t border-slate-200 text-amber-800 font-medium flex items-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                    সকল পেন্ডিং আপত্তি স্বয়ংক্রিয়ভাবে সমাধান হিসেবে চিহ্নিত হবে।
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setApprovalModalItem(null)}
                                disabled={isSubmitting}
                                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                            >
                                বাতিল
                            </button>
                            <button
                                type="button"
                                onClick={confirmApproval}
                                disabled={isSubmitting}
                                className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition flex items-center gap-1"
                            >
                                {isSubmitting ? 'অনুমোদন হচ্ছে...' : 'হ্যাঁ, অনুমোদন করুন'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Issue & Reply History Modal */}
            {selectedItemForHistory && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl max-w-2xl w-full p-5 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-150">
                        {/* Modal Header */}
                        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                        {selectedItemForHistory.application_no}
                                    </span>
                                    <span className="text-xs font-semibold text-slate-500">
                                        {selectedItemForHistory.branch_name} ({selectedItemForHistory.branch_code})
                                    </span>
                                </div>
                                <h3 className="font-bold text-slate-900 text-base mt-1">
                                    {selectedItemForHistory.applicant_name} — আপত্তি ও জবাব হিস্ট্রি
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedItemForHistory(null)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body: chronological timeline */}
                        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                            {selectedItemForHistory.issues.length === 0 &&
                            !selectedItemForHistory.latest_issue_description ? (
                                <p className="text-xs text-slate-400 text-center py-6">কোনো লিপিবদ্ধ আপত্তি নেই</p>
                            ) : (
                                <VerificationThread
                                    item={selectedItemForHistory}
                                    isApproved={
                                        selectedItemForHistory.status === 'approved' ||
                                        selectedItemForHistory.status === 'pending_disbursement' ||
                                        selectedItemForHistory.status === 'disbursed'
                                    }
                                    isRejected={selectedItemForHistory.status === 'rejected'}
                                />
                            )}

                            {/* Add new issue form (Head Office only) */}
                            {permissions.can_approve && (
                                <form onSubmit={handleStoreNewIssue} className="pt-3 border-t border-slate-200 space-y-2">
                                    <label className="block text-xs font-bold text-slate-700">
                                        নতুন আপত্তি / তদন্ত নোট যোগ করুন (HO):
                                    </label>
                                    <textarea
                                        value={newIssueText}
                                        onChange={(e) => setNewIssueText(e.target.value)}
                                        placeholder="আপত্তি বা অতিরিক্ত তথ্যের চাহিদা এখানে লিখুন..."
                                        rows={2}
                                        className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                    />
                                    <div className="flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={isSubmitting || !newIssueText.trim()}
                                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                                        >
                                            <Send className="w-3.5 h-3.5" />
                                            আপত্তি প্রেরণ করুন
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}

function VerificationThread({
    item,
    isApproved,
    isRejected,
    compact = false,
}: {
    item: VerificationItem;
    isApproved: boolean;
    isRejected: boolean;
    compact?: boolean;
}) {
    const issues =
        item.issues.length > 0
            ? [...item.issues].sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''))
            : [
                  {
                      id: 0,
                      issue_description: item.latest_issue_description,
                      reporter_name: 'হেড অফিস',
                      status: item.has_pending_issue ? 'pending' : 'resolved',
                      reply_message: item.latest_reply_message,
                      responder_name: null,
                      created_at: item.created_at,
                      replied_at: null,
                  } satisfies IssueDetail,
              ];

    const textClass = compact ? 'text-xs' : 'text-sm';

    return (
        <div className="relative space-y-2 pl-3">
            <div className="absolute left-[5px] top-2 bottom-2 w-px bg-slate-200" />

            {issues.map((issue, index) => (
                <div key={issue.id || `round-${index}`} className="space-y-2">
                    <div className="relative bg-amber-50/90 border border-amber-200 rounded-lg p-2.5 space-y-1 shadow-2xs">
                        <div className="absolute -left-[9px] top-3 w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-white" />
                        <div className="flex items-center justify-between gap-1 text-[10px]">
                            <span className="inline-flex items-center gap-1 font-bold text-amber-900 bg-amber-200/70 px-1.5 py-0.5 rounded">
                                <ShieldAlert className="w-3 h-3 text-amber-700" />
                                HO আপত্তি
                            </span>
                            <span className="text-amber-700 font-medium truncate">
                                {issue.reporter_name || 'হেড অফিস'}
                                {issue.created_at ? ` · ${formatDateTime(issue.created_at)}` : ''}
                            </span>
                        </div>
                        <p className={`${textClass} text-amber-950 font-medium leading-relaxed`}>
                            {issue.issue_description}
                        </p>
                    </div>

                    <div
                        className={`relative rounded-lg p-2.5 space-y-1 shadow-2xs border ${
                            issue.reply_message
                                ? 'bg-sky-50/90 border-sky-200 text-sky-950'
                                : 'bg-slate-50/80 border-slate-200 border-dashed text-slate-500'
                        }`}
                    >
                        <div
                            className={`absolute -left-[9px] top-3 w-2.5 h-2.5 rounded-full border-2 border-white ${
                                issue.reply_message ? 'bg-sky-500' : 'bg-slate-300'
                            }`}
                        />
                        <div className="flex items-center justify-between gap-1 text-[10px]">
                            <span
                                className={`inline-flex items-center gap-1 font-bold px-1.5 py-0.5 rounded ${
                                    issue.reply_message
                                        ? 'text-sky-900 bg-sky-200/70'
                                        : 'text-slate-600 bg-slate-200/70'
                                }`}
                            >
                                <CornerDownRight className="w-3 h-3" />
                                Zonal ব্যাখ্যা
                            </span>
                            {issue.reply_message && (
                                <span className="text-sky-700 font-medium truncate">
                                    {issue.responder_name || 'জোনাল ম্যানেজার'}
                                    {issue.replied_at ? ` · ${formatDateTime(issue.replied_at)}` : ''}
                                </span>
                            )}
                        </div>
                        {issue.reply_message ? (
                            <p className={`${textClass} text-sky-950 font-medium leading-relaxed`}>
                                {issue.reply_message}
                            </p>
                        ) : (
                            <p className="text-[11px] text-slate-400 italic flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                জোনাল ব্যাখ্যা অপেক্ষমান
                            </p>
                        )}
                    </div>
                </div>
            ))}

            {isApproved && (
                <div className="relative bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 space-y-1">
                    <div className="absolute -left-[9px] top-3 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
                    <div className="flex items-center justify-between gap-1 text-[10px]">
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-900 bg-emerald-200/70 px-1.5 py-0.5 rounded">
                            <CheckCircle2 className="w-3 h-3" />
                            HO অনুমোদন
                        </span>
                        <span className="text-emerald-700 font-medium truncate">
                            {item.reviewed_by_name || 'হেড অফিস'}
                            {item.reviewed_at ? ` · ${formatDateTime(item.reviewed_at)}` : ''}
                        </span>
                    </div>
                    <p className={`${textClass} text-emerald-900 font-medium`}>আবেদন অনুমোদিত হয়েছে</p>
                </div>
            )}

            {isRejected && (
                <div className="relative bg-rose-50 border border-rose-200 rounded-lg p-2.5 space-y-1">
                    <div className="absolute -left-[9px] top-3 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-white" />
                    <div className="flex items-center justify-between gap-1 text-[10px]">
                        <span className="inline-flex items-center gap-1 font-bold text-rose-900 bg-rose-200/70 px-1.5 py-0.5 rounded">
                            <XCircle className="w-3 h-3" />
                            HO বাতিল
                        </span>
                        <span className="text-rose-700 font-medium truncate">
                            {item.reviewed_by_name || 'হেড অফিস'}
                            {item.reviewed_at ? ` · ${formatDateTime(item.reviewed_at)}` : ''}
                        </span>
                    </div>
                    <p className={`${textClass} text-rose-900 font-medium leading-relaxed`}>
                        {item.rejection_reason || 'আবেদন বাতিল করা হয়েছে'}
                    </p>
                </div>
            )}
        </div>
    );
}
