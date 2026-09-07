import React, { useState, useEffect } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { formatDate, formatDateTime, todayIsoDate } from '@/utils/dateUtils';
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
    ShieldCheck,
    CheckSquare,
    Square,
    Layers,
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
    is_zm_approved?: boolean;
    zm_approved_at?: string | null;
    zm_approver_name?: string | null;
    zm_approval_note?: string | null;
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
    sent_at?: string | null;
    issue_date?: string | null;
    reply_date?: string | null;
    latest_action_at?: string;
    created_at: string;
    reviewed_at?: string | null;
    reviewed_by_name?: string | null;
    rejection_reason?: string | null;
    has_pending_issue: boolean;
    has_replied: boolean;
    is_zm_approved: boolean;
    zm_approved_at?: string | null;
    zm_approver_name?: string | null;
    zm_approval_note?: string | null;
    issues: IssueDetail[];
    latest_issue_id?: number | null;
    latest_issue_description: string;
    latest_reply_message?: string | null;
    latest_reply_by_name?: string | null;
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
        pending_action?: number;
        admission_count: number;
        loan_count: number;
        pending_issues: number;
        branch_replied: number;
        zm_approved: number;
        approved: number;
        rejected?: number;
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
        can_zm_approve: boolean;
        is_head_office: boolean;
        is_zone_manager?: boolean;
        role: string;
    };
    zones: Zone[];
    areas: Area[];
    branches: Branch[];
}

export default function VerificationIndex({ items, stats, filters, permissions, zones, areas, branches }: Props) {
    const today = todayIsoDate();

    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');
    const isTodayFilter = dateFrom === today && dateTo === today;
    const isAllDates = !dateFrom && !dateTo;

    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [typeFilter, setTypeFilter] = useState(filters.type || 'all');
    const [issueStatusFilter, setIssueStatusFilter] = useState(filters.issue_status || 'pending_action');

    const [selectedZone, setSelectedZone] = useState(filters.zone_id?.toString() || '');
    const [selectedArea, setSelectedArea] = useState(filters.area_id?.toString() || '');
    const [selectedBranch, setSelectedBranch] = useState(filters.branch_id?.toString() || '');

    const [filteredAreas, setFilteredAreas] = useState<Area[]>(areas);
    const [filteredBranches, setFilteredBranches] = useState<Branch[]>(branches);

    // Multi-Select Checkboxes
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Modals
    const [replyModalItem, setReplyModalItem] = useState<VerificationItem | null>(null);
    const [replyText, setReplyText] = useState('');

    const [zmApproveModalItem, setZmApproveModalItem] = useState<VerificationItem | null>(null);
    const [zmApprovalNote, setZmApprovalNote] = useState('');

    const [bulkZmModalOpen, setBulkZmModalOpen] = useState(false);
    const [bulkApprovalNote, setBulkApprovalNote] = useState('');

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

    // Clear selection on page or filter changes
    useEffect(() => {
        setSelectedIds([]);
    }, [items.current_page, issueStatusFilter, typeFilter]);

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

    const executeFilter = (overrides: Record<string, string> = {}) => {
        router.get('/verifications', filterPayload({ page: '1', ...overrides }), {
            preserveState: true,
            replace: true,
        });
    };

    // Debounce search query
    useEffect(() => {
        if (searchQuery === (filters.search || '')) return;
        const handler = setTimeout(() => {
            executeFilter({ search: searchQuery });
        }, 400);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        executeFilter();
    };

    const handleDateFromChange = (val: string) => {
        setDateFrom(val);
        let nextTo = dateTo;
        if (!dateTo || dateTo === dateFrom) {
            nextTo = val;
            setDateTo(val);
        }
        executeFilter({ date_from: val, date_to: nextTo });
    };

    const handleDateToChange = (val: string) => {
        setDateTo(val);
        executeFilter({ date_to: val });
    };

    const handleZoneChange = (val: string) => {
        setSelectedZone(val);
        setSelectedArea('');
        setSelectedBranch('');
        executeFilter({ zone_id: val, area_id: '', branch_id: '' });
    };

    const handleAreaChange = (val: string) => {
        setSelectedArea(val);
        setSelectedBranch('');
        executeFilter({ area_id: val, branch_id: '' });
    };

    const handleBranchChange = (val: string) => {
        setSelectedBranch(val);
        executeFilter({ branch_id: val });
    };

    const handleTypeChange = (newType: string) => {
        setTypeFilter(newType);
        executeFilter({ type: newType });
    };

    const handleStatusChange = (newStatus: string) => {
        setIssueStatusFilter(newStatus);
        executeFilter({ issue_status: newStatus });
    };

    const handleTodayFilter = () => {
        setDateFrom(today);
        setDateTo(today);
        executeFilter({ date_from: today, date_to: today });
    };

    const handleAllDatesFilter = () => {
        setDateFrom('');
        setDateTo('');
        executeFilter({ date_from: '', date_to: '' });
    };

    const clearFilters = () => {
        setSearchQuery('');
        setTypeFilter('all');
        setIssueStatusFilter('pending_action');
        setSelectedZone('');
        setSelectedArea('');
        setSelectedBranch('');
        setDateFrom('');
        setDateTo('');
        router.get(
            '/verifications',
            { issue_status: 'pending_action', date_from: '', date_to: '' },
            { preserveState: true, replace: true }
        );
    };

    // Selection Handlers
    const allPageIds = (items?.data ?? []).map((i) => i.id);
    const isAllSelected = allPageIds.length > 0 && allPageIds.every((id) => selectedIds.includes(id));
    const isSomeSelected = allPageIds.some((id) => selectedIds.includes(id));

    const toggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedIds((prev) => prev.filter((id) => !allPageIds.includes(id)));
        } else {
            setSelectedIds((prev) => Array.from(new Set([...prev, ...allPageIds])));
        }
    };

    const toggleSelectItem = (id: string) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
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

    // Single-Item ZM Approve
    const handleOpenZmApproveModal = (item: VerificationItem) => {
        setZmApproveModalItem(item);
        setZmApprovalNote('');
    };

    const confirmSingleZmApprove = () => {
        if (!zmApproveModalItem) return;
        setIsSubmitting(true);

        router.post('/verifications/zm-approve', {
            item_type: zmApproveModalItem.item_type,
            raw_id: zmApproveModalItem.raw_id,
            issue_id: zmApproveModalItem.latest_issue_id,
            approval_note: zmApprovalNote.trim() || undefined,
        }, {
            ...keepListFilters,
            onSuccess: () => {
                setZmApproveModalItem(null);
                setZmApprovalNote('');
            },
            onFinish: () => setIsSubmitting(false),
        });
    };

    // Bulk ZM Approve
    const handleOpenBulkZmModal = () => {
        if (selectedIds.length === 0) return;
        setBulkZmModalOpen(true);
        setBulkApprovalNote('');
    };

    const confirmBulkZmApprove = () => {
        if (selectedIds.length === 0) return;
        setIsSubmitting(true);

        const selectedItems = (items?.data ?? []).filter((i) => selectedIds.includes(i.id));
        const payloadItems = selectedItems.map((item) => ({
            item_type: item.item_type,
            raw_id: item.raw_id,
            issue_id: item.latest_issue_id || undefined,
        }));

        router.post('/verifications/bulk-zm-approve', {
            items: payloadItems,
            approval_note: bulkApprovalNote.trim() || undefined,
        }, {
            ...keepListFilters,
            onSuccess: () => {
                setBulkZmModalOpen(false);
                setSelectedIds([]);
                setBulkApprovalNote('');
            },
            onFinish: () => setIsSubmitting(false),
        });
    };

    // Universal Reply to Issue
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

            <div className="w-full space-y-3.5 py-3 px-3 sm:px-6 pb-24">
                {/* 1. Sleek, Executive Header Bar */}
                <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white flex items-center justify-center shadow-xs shrink-0">
                            <ShieldAlert className="w-5 h-5 text-amber-300" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                                    যাচাই ও অনুসন্ধান মনিটরিং
                                </h1>
                                {(stats?.zm_approved ?? 0) > 0 ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse">
                                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                        {stats.zm_approved} টি আবেদন HO অনুমোদনের জন্য প্রস্তুত
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                        <Clock className="w-3 h-3 text-slate-500" />
                                        {stats?.pending_action ?? 0} টি আবেদন অমীমাংসিত/অপেক্ষমান
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                                {permissions.can_approve
                                    ? 'হেড অফিস আপত্তি, শাখার জবাব ও জোনাল অনুমোদন পর্যালোচনা ও ১-ক্লিকে চূড়ান্ত অনুমোদন'
                                    : permissions.can_zm_approve
                                    ? 'শাখার জবাবসমূহ পর্যালোচনা করে ZM অনুমোদন প্রদান করুন'
                                    : 'আপত্তির কারণ পর্যবেক্ষণ করে শাখা থেকে ব্যাখ্যা/জবাব প্রদান করুন'}
                            </p>
                        </div>
                    </div>

                    {/* Right side: Search & Date toggles */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Compact Search */}
                        <div className="relative min-w-[220px] flex-1 sm:flex-initial">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="আবেদন নং, সদস্য, মোবাইল..."
                                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>

                        {/* Date Toggles */}
                        <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-xs">
                            <button
                                type="button"
                                onClick={handleAllDatesFilter}
                                className={`px-2.5 py-1 rounded-md font-semibold transition ${
                                    isAllDates
                                        ? 'bg-white text-indigo-900 shadow-xs font-bold'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                                title="সকল তারিখের ডেটা"
                            >
                                সব তারিখ
                            </button>
                            <button
                                type="button"
                                onClick={handleTodayFilter}
                                className={`px-2.5 py-1 rounded-md font-semibold transition ${
                                    isTodayFilter
                                        ? 'bg-indigo-600 text-white shadow-xs font-bold'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                                title="আজকের অনুসন্ধানসমূহ"
                            >
                                আজ
                            </button>
                        </div>
                    </div>
                </div>

                {/* 2. Main Filter Tabs (Ordered as requested: Pending & ZM Approved -> All -> Approved -> Rejected) */}
                <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-2.5 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        {/* Primary Filter Tabs */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {/* Tab 1: অমীমাংসিত ও ZM অনুমোদিত (DEFAULT) */}
                            <button
                                type="button"
                                onClick={() => handleStatusChange('pending_action')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                                    issueStatusFilter === 'pending_action'
                                        ? 'bg-indigo-600 text-white shadow-xs'
                                        : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
                                }`}
                            >
                                <AlertCircle className="w-3.5 h-3.5" />
                                অমীমাংসিত ও ZM অনুমোদিত
                                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                                    issueStatusFilter === 'pending_action' ? 'bg-indigo-800 text-white' : 'bg-indigo-200 text-indigo-900'
                                }`}>
                                    {stats?.pending_action ?? 0}
                                </span>
                            </button>

                            {/* Tab 2: সকল (All) */}
                            <button
                                type="button"
                                onClick={() => handleStatusChange('all')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                                    issueStatusFilter === 'all'
                                        ? 'bg-slate-900 text-white shadow-xs'
                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                            >
                                <Layers className="w-3.5 h-3.5" />
                                সকল (All)
                                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                                    issueStatusFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700'
                                }`}>
                                    {stats?.total ?? 0}
                                </span>
                            </button>

                            {/* Tab 3: অনুমোদিত (Approved) */}
                            <button
                                type="button"
                                onClick={() => handleStatusChange('approved')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                                    issueStatusFilter === 'approved'
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                }`}
                            >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                অনুমোদিত
                                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                                    issueStatusFilter === 'approved' ? 'bg-emerald-700 text-white' : 'bg-emerald-200 text-emerald-900'
                                }`}>
                                    {stats?.approved ?? 0}
                                </span>
                            </button>

                            {/* Tab 4: বাতিলকৃত (Rejected) */}
                            <button
                                type="button"
                                onClick={() => handleStatusChange('rejected')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                                    issueStatusFilter === 'rejected'
                                        ? 'bg-rose-600 text-white shadow-xs'
                                        : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                                }`}
                            >
                                <XCircle className="w-3.5 h-3.5" />
                                বাতিলকৃত
                                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                                    issueStatusFilter === 'rejected' ? 'bg-rose-700 text-white' : 'bg-rose-200 text-rose-900'
                                }`}>
                                    {stats?.rejected ?? 0}
                                </span>
                            </button>
                        </div>

                        {/* Type switch pills */}
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => handleTypeChange('all')}
                                className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                                    typeFilter === 'all'
                                        ? 'bg-slate-800 text-white font-semibold shadow-2xs'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                সব টাইপ
                            </button>
                            <button
                                type="button"
                                onClick={() => handleTypeChange('admission')}
                                className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition ${
                                    typeFilter === 'admission'
                                        ? 'bg-blue-600 text-white font-semibold shadow-2xs'
                                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                                }`}
                            >
                                <UserPlus className="w-3 h-3" />
                                ভর্তি ({stats?.admission_count ?? 0})
                            </button>
                            <button
                                type="button"
                                onClick={() => handleTypeChange('loan')}
                                className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition ${
                                    typeFilter === 'loan'
                                        ? 'bg-emerald-600 text-white font-semibold shadow-2xs'
                                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                }`}
                            >
                                <Banknote className="w-3 h-3" />
                                ঋণ ({stats?.loan_count ?? 0})
                            </button>
                        </div>
                    </div>

                    {/* Row 3: Sub-status Quick Filter Chips + Org Selectors */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        {/* Sub-status filter chips */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
                                ফিল্টার:
                            </span>

                            {/* ZM Approved (Ready for HO Action) Chip */}
                            <button
                                type="button"
                                onClick={() => handleStatusChange('zm_approved')}
                                className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1 transition border ${
                                    issueStatusFilter === 'zm_approved'
                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs font-bold'
                                        : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                }`}
                                title="জোনাল ম্যানেজার অনুমোদন সম্পন্ন, হেড অফিসের ফাইনাল অনুমোদনের অপেক্ষায়"
                            >
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                ZM অনুমোদিত — HO অ্যাকশন প্রস্তুত ({stats?.zm_approved ?? 0})
                            </button>

                            {/* Branch Replied (Waiting for ZM) Chip */}
                            <button
                                type="button"
                                onClick={() => handleStatusChange('branch_replied')}
                                className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1 transition border ${
                                    issueStatusFilter === 'branch_replied'
                                        ? 'bg-sky-600 text-white border-sky-600 shadow-2xs font-bold'
                                        : 'bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100'
                                }`}
                                title="শাখা থেকে জবাব দেওয়া হয়েছে, ZM অনুমোদনের অপেক্ষায়"
                            >
                                <Clock className="w-3.5 h-3.5 text-sky-600" />
                                শাখার জবাব — ZM অপেক্ষমান ({stats?.branch_replied ?? 0})
                            </button>

                            {/* Unresolved / Pending Branch Reply Chip */}
                            <button
                                type="button"
                                onClick={() => handleStatusChange('pending')}
                                className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1 transition border ${
                                    issueStatusFilter === 'pending'
                                        ? 'bg-amber-600 text-white border-amber-600 shadow-2xs font-bold'
                                        : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                                }`}
                                title="হেড অফিসের আপত্তি দেওয়া আছে, শাখা থেকে এখনো উত্তর আসেনি"
                            >
                                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                অমীমাংসিত — শাখার জবাব অপেক্ষমান ({stats?.pending_issues ?? 0})
                            </button>
                        </div>

                        {/* Org & Date selectors */}
                        <div className="flex items-center gap-1.5 flex-wrap ml-auto">
                            {zones.length > 0 && (
                                <select
                                    value={selectedZone}
                                    onChange={(e) => handleZoneChange(e.target.value)}
                                    className="h-7 px-2 text-xs border border-slate-300 rounded-md bg-white text-slate-700"
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
                                    onChange={(e) => handleAreaChange(e.target.value)}
                                    disabled={!selectedZone && filteredAreas.length === 0}
                                    className="h-7 px-2 text-xs border border-slate-300 rounded-md bg-white text-slate-700 disabled:bg-slate-100"
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
                                    onChange={(e) => handleBranchChange(e.target.value)}
                                    disabled={!selectedZone && !selectedArea && filteredBranches.length === 0}
                                    className="h-7 px-2 text-xs border border-slate-300 rounded-md bg-white text-slate-700 disabled:bg-slate-100 max-w-[160px]"
                                >
                                    <option value="">সব শাখা</option>
                                    {filteredBranches.map((branch) => (
                                        <option key={branch.id} value={branch.id.toString()}>
                                            {formatBranchLabel(branch)}
                                        </option>
                                    ))}
                                </select>
                            )}

                            <div className="flex items-center gap-1">
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => handleDateFromChange(e.target.value)}
                                    className="h-7 px-1.5 text-xs border border-slate-300 rounded-md bg-white"
                                    title="হতে তারিখ"
                                />
                                <span className="text-slate-400 text-xs">-</span>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => handleDateToChange(e.target.value)}
                                    className="h-7 px-1.5 text-xs border border-slate-300 rounded-md bg-white"
                                    title="পর্যন্ত তারিখ"
                                />
                            </div>

                            {hasActiveFilters && (
                                <button
                                    type="button"
                                    onClick={clearFilters}
                                    className="h-7 px-2 text-xs bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 rounded-md font-medium flex items-center gap-1 transition"
                                    title="সকল ফিল্টার রিসেট করুন"
                                >
                                    <RotateCcw className="w-3 h-3" />
                                    রিসেট
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Floating Bulk Action Bar for ZM Approval */}
                {selectedIds.length > 0 && permissions.can_zm_approve && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-md text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-4 animate-in slide-in-from-bottom duration-200">
                        <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-full bg-indigo-500 text-white font-bold text-xs flex items-center justify-center">
                                {selectedIds.length}
                            </span>
                            <span className="text-xs font-semibold">টি আবেদন নির্বাচিত</span>
                        </div>

                        <div className="h-4 w-px bg-slate-700" />

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleOpenBulkZmModal}
                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                            >
                                <ShieldCheck className="w-4 h-4" />
                                নির্বাচিতসমূহ ZM অনুমোদন করুন (Bulk ZM Approve)
                            </button>

                            <button
                                type="button"
                                onClick={() => setSelectedIds([])}
                                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition"
                            >
                                সিলেকশন মুছুন
                            </button>
                        </div>
                    </div>
                )}

                {/* Table list */}
                <div className="bg-white rounded-xl border border-indigo-200 shadow-sm overflow-hidden">
                    <AutoFitTableContainer
                        minWidth={1150}
                        storageKey="ho_verification_table"
                        title="যাচাই ও অনুসন্ধান তালিকা"
                        subtitle={`(সর্বশেষ আপডেট সবার উপরে · পৃষ্ঠা ${items.current_page || 1}/${items.last_page || 1} · মোট ${items.total || 0} টি রেকর্ড)`}
                    >
                        <table className="w-full text-left border-collapse table-auto">
                            <thead>
                                <tr className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-[11px] font-semibold text-white uppercase tracking-wide">
                                    <th className="py-3 px-3 border-b border-indigo-800 text-center w-10">
                                        <button
                                            type="button"
                                            onClick={toggleSelectAll}
                                            className="text-white hover:text-indigo-200 transition"
                                            title={isAllSelected ? 'সব আনসিলেক্ট করুন' : 'সব সিলেক্ট করুন'}
                                        >
                                            {isAllSelected ? (
                                                <CheckSquare className="w-4 h-4 text-emerald-400" />
                                            ) : isSomeSelected ? (
                                                <Square className="w-4 h-4 text-indigo-300" />
                                            ) : (
                                                <Square className="w-4 h-4 text-white/60" />
                                            )}
                                        </button>
                                    </th>
                                    <th className="py-3 px-3 border-b border-indigo-800 text-center w-12">ক্র.</th>
                                    <th className="py-3 px-3 border-b border-indigo-800 min-w-[170px]">শাখা ও সমিতি (কোড)</th>
                                    <th className="py-3 px-3 border-b border-indigo-800 min-w-[150px]">টাইপ ও আবেদন নং</th>
                                    <th className="py-3 px-3 border-b border-indigo-800 min-w-[160px]">সদস্যের নাম ও মোবাইল</th>
                                    <th className="py-3 px-3 border-b border-indigo-800 min-w-[340px]">উত্থাপিত আপত্তি, জবাব ও ZM অনুমোদন</th>
                                    <th className="py-3 px-3 border-b border-indigo-800 text-center w-28">স্ট্যাটাস</th>
                                    <th className="py-3 px-3 border-b border-indigo-800 text-center min-w-[200px]">অ্যাকশন</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                                {(items?.data ?? []).length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-16 text-center text-slate-400">
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
                                        const isSelected = selectedIds.includes(item.id);

                                        return (
                                            <tr
                                                key={item.id}
                                                className={`transition hover:bg-indigo-50/40 ${
                                                    isSelected ? 'bg-indigo-50/70' : item.has_pending_issue ? 'bg-amber-50/20' : ''
                                                }`}
                                            >
                                                {/* Checkbox */}
                                                <td className="py-3.5 px-3 text-center align-top">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleSelectItem(item.id)}
                                                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                                                    />
                                                </td>

                                                {/* Serial Number */}
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
                                                    {item.zone_name && (
                                                        <div className="text-[10px] text-indigo-700 font-medium mt-0.5">
                                                            জোন: {item.zone_name}
                                                        </div>
                                                    )}
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
                                                    <div className="text-[10px] text-slate-500 mt-1 font-medium flex items-center gap-1" title="আবেদন হেড অফিসে প্রেরণের তারিখ">
                                                        <CalendarDays className="w-3 h-3 text-slate-400 shrink-0" />
                                                        <span>
                                                            আবেদন: {item.submitted_at ? formatDate(item.submitted_at) : formatDate(item.created_at)}
                                                        </span>
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

                                                {/* Unified Thread: HO Objection, Branch Reply & ZM Approval */}
                                                <td className="py-3.5 px-3 align-top">
                                                    <div className="text-[10px] text-indigo-700 font-semibold mb-1.5 flex items-center gap-1 bg-indigo-50/60 px-2 py-0.5 rounded border border-indigo-100/70 w-fit">
                                                        <Clock className="w-3 h-3 text-indigo-500 shrink-0" />
                                                        <span>টাইমলাইন আপডেট: {formatDateTime(item.latest_action_at)}</span>
                                                    </div>
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
                                                            <CheckCircle2 className="w-3 h-3" /> চূড়ান্ত অনুমোদিত
                                                        </span>
                                                    ) : isRejected ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                                            <XCircle className="w-3 h-3" /> বাতিলকৃত
                                                        </span>
                                                    ) : item.is_zm_approved ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-600 text-white shadow-2xs" title="ZM অনুমোদন সম্পন্ন, হেড অফিস ফাইনাল অনুমোদনের জন্য প্রস্তুত">
                                                            <ShieldCheck className="w-3.5 h-3.5 text-white" /> ZM অনুমোদিত (HO প্রস্তুত)
                                                        </span>
                                                    ) : item.has_replied ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-300" title="শাখা থেকে জবাব দেওয়া হয়েছে, ZM অনুমোদনের অপেক্ষায়">
                                                            <Clock className="w-3 h-3 text-sky-600" /> শাখার জবাব (ZM অপেক্ষমান)
                                                        </span>
                                                    ) : item.has_pending_issue ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                                            <AlertCircle className="w-3 h-3" /> তদন্তাধীন / অমীমাংসিত
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
                                                        {/* 1. Branch User Reply Button (FO, BM, AM) */}
                                                        {permissions.can_reply && !permissions.is_zone_manager && !permissions.is_head_office && !isApproved && !isRejected && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenReplyModal(item)}
                                                                className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm transition"
                                                                title="আপত্তির ব্যাখ্যা/জবাব প্রদান বা সংশোধন করুন"
                                                            >
                                                                <Reply className="w-3.5 h-3.5" />
                                                                {item.has_replied ? 'জবাব সংশোধন' : 'জবাব/ব্যাখ্যা দিন'}
                                                            </button>
                                                        )}

                                                        {/* 2. Zonal Manager Actions:
                                                            - If Branch replied & pending ZM approval: Show Approve (ZM অনুমোদন) + Reject (বাতিল)
                                                            - If Branch has NOT replied yet: Show "জবাব/ব্যাখ্যা দিন" so ZM can reply directly
                                                        */}
                                                        {permissions.is_zone_manager && !isApproved && !isRejected && (
                                                            <>
                                                                {item.has_replied && !item.is_zm_approved ? (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleOpenZmApproveModal(item)}
                                                                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition"
                                                                        title="শাখার জবাব পর্যালোচনা করে ZM অনুমোদন করুন"
                                                                    >
                                                                        <Check className="w-3.5 h-3.5" />
                                                                        ZM অনুমোদন
                                                                    </button>
                                                                ) : !item.has_replied ? (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleOpenReplyModal(item)}
                                                                        className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm transition"
                                                                        title="শাখার পক্ষ থেকে সরাসরি জবাব/ব্যাখ্যা প্রদান করুন"
                                                                    >
                                                                        <Reply className="w-3.5 h-3.5" />
                                                                        জবাব/ব্যাখ্যা দিন
                                                                    </button>
                                                                ) : null}

                                                                {/* ZM can also reject application */}
                                                                {permissions.can_reject && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleOpenRejectModal(item)}
                                                                        className="p-1.5 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 rounded-lg transition"
                                                                        title="আবেদন বাতিল/প্রত্যাখ্যান করুন"
                                                                    >
                                                                        <Ban className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}

                                                        {/* 3. Head Office Actions (Approve or Reject when ZM-approved / ready) */}
                                                        {permissions.is_head_office && !isApproved && !isRejected && (
                                                            <>
                                                                {item.is_zm_approved ? (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleOneClickApprove(item)}
                                                                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition"
                                                                        title="১ ক্লিকে চূড়ান্ত অনুমোদন করুন (ZM অনুমোদন সম্পন্ন)"
                                                                    >
                                                                        <Check className="w-3.5 h-3.5" />
                                                                        HO অনুমোদন
                                                                    </button>
                                                                ) : item.has_replied && !item.is_zm_approved ? (
                                                                    <span
                                                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg text-[11px] font-semibold"
                                                                        title="জোনাল ম্যানেজার (ZM) অনুমোদন না করা পর্যন্ত হেড অফিস থেকে চূড়ান্ত অনুমোদন করা যাবে না"
                                                                    >
                                                                        <Lock className="w-3 h-3 text-rose-600 shrink-0" />
                                                                        ZM অনুমোদনের অপেক্ষায়
                                                                    </span>
                                                                ) : !item.has_pending_issue ? (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleOneClickApprove(item)}
                                                                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition"
                                                                        title="১ ক্লিকে চূড়ান্ত অনুমোদন করুন"
                                                                    >
                                                                        <Check className="w-3.5 h-3.5" />
                                                                        HO অনুমোদন
                                                                    </button>
                                                                ) : (
                                                                    <span
                                                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 text-slate-600 border border-slate-200 rounded-lg text-[11px] font-medium"
                                                                        title="শাখা থেকে জবাব ও ZM অনুমোদনের অপেক্ষায় রয়েছে"
                                                                    >
                                                                        <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                                                        জবাব অপেক্ষমান
                                                                    </span>
                                                                )}

                                                                {/* HO Reject Button */}
                                                                {permissions.can_reject && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleOpenRejectModal(item)}
                                                                        className="p-1.5 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 rounded-lg transition"
                                                                        title="আবেদন বাতিল/প্রত্যাখ্যান করুন"
                                                                    >
                                                                        <Ban className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}

                                                        {/* 4. Super Admin fallback approval if not caught above */}
                                                        {!permissions.is_head_office && !permissions.is_zone_manager && permissions.can_approve && !isApproved && !isRejected && item.is_zm_approved && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOneClickApprove(item)}
                                                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition"
                                                                title="চূড়ান্ত অনুমোদন করুন"
                                                            >
                                                                <Check className="w-3.5 h-3.5" />
                                                                অনুমোদন
                                                            </button>
                                                        )}

                                                        {/* 5. View Details */}
                                                        <Link
                                                            href={item.view_url}
                                                            className="p-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 rounded-lg transition"
                                                            title="সম্পূর্ণ আবেদন দেখুন"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </Link>

                                                        {/* 6. Manage issues / Inquiry modal (Only for HO or history viewing) */}
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

            {/* Universal Reply Modal (Branch users & ZM only) */}
            {replyModalItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-150">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center">
                                    <Reply className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-sm">
                                        {permissions.is_zone_manager
                                            ? 'জোনাল ম্যানেজারের সরাসরি ব্যাখ্যা প্রদান'
                                            : 'আপত্তির ব্যাখ্যা / জবাব প্রদান'}
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        আবেদন নং: <span className="font-mono font-bold text-indigo-700">{replyModalItem.application_no}</span> ({replyModalItem.applicant_name}) {replyModalItem.branch_name ? `· শাখা: ${replyModalItem.branch_name}` : ''}
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

                        {/* Informational note on workflow */}
                        <div className="bg-indigo-50/70 rounded-xl p-2.5 text-[11px] text-indigo-900 border border-indigo-200 flex items-start gap-2">
                            <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                            <div>
                                {permissions.is_zone_manager ? (
                                    <span>জোনাল ম্যানেজার হিসেবে আপনার ব্যাখ্যা সরাসরি ZM-অনুমোদিত হিসেবে হেড অফিসে সংরক্ষিত ও প্রেরিত হবে।</span>
                                ) : (
                                    <span>শাখা থেকে আপনার ব্যাখ্যা সংরক্ষিত হবে এবং জোনাল ম্যানেজারের (ZM) পর্যালোচনার পর হেড অফিসের অনুমোদনে যাবে।</span>
                                )}
                            </div>
                        </div>

                        {/* Reply input form */}
                        <form onSubmit={handleSendReply} className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    ব্যাখ্যা / সমাধানের বিবরণ (Explanation / Reply):
                                </label>
                                <textarea
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder="হেড অফিসের আপত্তির প্রেক্ষিতে স্পষ্ট ব্যাখ্যা বা সমাধানের বিবরণ এখানে লিখুন..."
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
                                    {isSubmitting ? 'প্রেরণ হচ্ছে...' : 'ব্যাখ্যা প্রেরণ করুন'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Single ZM Approval Confirmation Modal */}
            {zmApproveModalItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-150">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 text-base">জোনাল ম্যানেজার (ZM) অনুমোদন</h3>
                                <p className="text-xs text-slate-500">শাখার জবাব অনুমোদনপূর্বক হেড অফিসে প্রেরণ</p>
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-2 border border-slate-200">
                            <div className="flex justify-between">
                                <span className="text-slate-500">আবেদন নং:</span>
                                <span className="font-mono font-bold text-indigo-700">{zmApproveModalItem.application_no}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">সদস্যের নাম:</span>
                                <span className="font-semibold text-slate-800">{zmApproveModalItem.applicant_name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">শাখা:</span>
                                <span className="font-medium text-slate-700">{zmApproveModalItem.branch_name} ({zmApproveModalItem.branch_code})</span>
                            </div>
                            {zmApproveModalItem.latest_reply_message && (
                                <div className="pt-2 border-t border-slate-200">
                                    <div className="font-bold text-slate-700 mb-0.5">শাখার জবাব:</div>
                                    <p className="text-slate-600 bg-white p-2 rounded border border-slate-200 leading-relaxed font-medium">
                                        {zmApproveModalItem.latest_reply_message}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                ZM অনুমোদন মন্তব্য (ঐচ্ছিক):
                            </label>
                            <input
                                type="text"
                                value={zmApprovalNote}
                                onChange={(e) => setZmApprovalNote(e.target.value)}
                                placeholder="যেমন: যাচাই করে সঠিক পাওয়া গেছে / অনুমোদন করা হলো"
                                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setZmApproveModalItem(null)}
                                disabled={isSubmitting}
                                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                            >
                                বাতিল
                            </button>
                            <button
                                type="button"
                                onClick={confirmSingleZmApprove}
                                disabled={isSubmitting}
                                className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition flex items-center gap-1.5"
                            >
                                <Check className="w-4 h-4" />
                                {isSubmitting ? 'অনুমোদন হচ্ছে...' : 'হ্যাঁ, ZM অনুমোদন করুন'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk ZM Approval Confirmation Modal */}
            {bulkZmModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-150">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                <Layers className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 text-base">একযোগে ZM অনুমোদন (Bulk Approve)</h3>
                                <p className="text-xs text-slate-500">নির্বাচিত {selectedIds.length} টি আবেদনের জবাব এক ক্লিকে অনুমোদন</p>
                            </div>
                        </div>

                        <div className="bg-emerald-50/70 rounded-xl p-3 text-xs text-emerald-950 border border-emerald-200">
                            আপনি মোট <strong>{selectedIds.length}</strong> টি আবেদনের জবাব ZM অনুমোদন করে হেড অফিসে পাঠাতে যাচ্ছেন।
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                বাল্ক অনুমোদন মন্তব্য (ঐচ্ছিক):
                            </label>
                            <input
                                type="text"
                                value={bulkApprovalNote}
                                onChange={(e) => setBulkApprovalNote(e.target.value)}
                                placeholder="যেমন: বাল্ক ZM অনুমোদন সম্পন্ন"
                                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setBulkZmModalOpen(false)}
                                disabled={isSubmitting}
                                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                            >
                                বাতিল
                            </button>
                            <button
                                type="button"
                                onClick={confirmBulkZmApprove}
                                disabled={isSubmitting}
                                className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition flex items-center gap-1.5"
                            >
                                <CheckCheck className="w-4 h-4" />
                                {isSubmitting ? 'অনুমোদন হচ্ছে...' : `হ্যাঁ, ${selectedIds.length} টি অনুমোদন করুন`}
                            </button>
                        </div>
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
                                <h3 className="font-bold text-slate-900 text-base">১-ক্লিকে চূড়ান্ত অনুমোদন নিশ্চিতকরণ</h3>
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
                                {isSubmitting ? 'অনুমোদন হচ্ছে...' : 'হ্যাঁ, চূড়ান্ত অনুমোদন করুন'}
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
                            {permissions.is_head_office && (
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
            : (item.latest_issue_description
                ? [
                      {
                          id: 0,
                          issue_description: item.latest_issue_description,
                          reporter_name: 'হেড অফিস',
                          status: item.has_pending_issue ? 'pending' : 'resolved',
                          reply_message: item.latest_reply_message,
                          responder_name: item.latest_reply_by_name || null,
                          created_at: item.created_at,
                          replied_at: item.reply_date || null,
                          is_zm_approved: item.is_zm_approved,
                          zm_approved_at: item.zm_approved_at,
                          zm_approver_name: item.zm_approver_name,
                          zm_approval_note: item.zm_approval_note,
                      } satisfies IssueDetail,
                  ]
                : []);

    const textClass = compact ? 'text-xs' : 'text-sm';

    return (
        <div className="relative space-y-2 pl-3">
            <div className="absolute left-[5px] top-2 bottom-2 w-px bg-slate-200" />

            {issues.length === 0 && !isApproved && !isRejected && (
                <div className="text-[11px] text-slate-400 italic py-1">
                    কোনো আপত্তি বা পর্যবেক্ষণ নেই (প্রাথমিক অবস্থায় অপেক্ষমান)
                </div>
            )}

            {issues.map((issue, index) => (
                <div key={issue.id || `round-${index}`} className="space-y-2">
                    {/* 1. HO Objection Card */}
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

                    {/* 2. Unified Branch Reply Card (Includes ZM Approval green tick on header line) */}
                    <div
                        className={`relative rounded-lg p-2.5 space-y-1.5 shadow-2xs border ${
                            issue.reply_message
                                ? 'bg-sky-50/80 border-sky-200 text-sky-950'
                                : 'bg-slate-50/80 border-slate-200 border-dashed text-slate-500'
                        }`}
                    >
                        <div
                            className={`absolute -left-[9px] top-3 w-2.5 h-2.5 rounded-full border-2 border-white ${
                                issue.reply_message ? (issue.is_zm_approved ? 'bg-emerald-500' : 'bg-sky-500') : 'bg-slate-300'
                            }`}
                        />
                        {/* Header line with branch responder info and inline ZM approval status */}
                        <div className="flex items-center justify-between gap-1 flex-wrap text-[10px]">
                            <div className="flex items-center gap-1">
                                <span
                                    className={`inline-flex items-center gap-1 font-bold px-1.5 py-0.5 rounded ${
                                        issue.reply_message
                                            ? 'text-sky-900 bg-sky-200/70'
                                            : 'text-slate-600 bg-slate-200/70'
                                    }`}
                                >
                                    <CornerDownRight className="w-3 h-3" />
                                    শাখার জবাব
                                </span>
                                {issue.reply_message && (
                                    <span className="text-sky-800 font-medium truncate">
                                        {issue.responder_name || 'শাখা কর্মকর্তা'}
                                        {issue.replied_at ? ` · ${formatDateTime(issue.replied_at)}` : ''}
                                    </span>
                                )}
                            </div>

                            {/* Inline ZM Approval Badge directly on the same line */}
                            {issue.reply_message && (
                                issue.is_zm_approved ? (
                                    <span
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[10px]"
                                        title={`ZM অনুমোদিত (${issue.zm_approver_name || 'জোনাল ম্যানেজার'})`}
                                    >
                                        <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                                        ZM অনুমোদিত {issue.zm_approved_at ? ` · ${formatDateTime(issue.zm_approved_at)}` : ''}
                                    </span>
                                ) : (
                                    <span
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300 font-bold text-[10px]"
                                        title="জোনাল ম্যানেজার এখনও অনুমোদন দেননি (ZM অনুমোদন অপেক্ষমান)"
                                    >
                                        <X className="w-3.5 h-3.5 text-rose-600 stroke-[2.5]" />
                                        ZM অনুমোদন অপেক্ষমান
                                    </span>
                                )
                            )}
                        </div>

                        {/* Reply Text */}
                        {issue.reply_message ? (
                            <div className="space-y-1">
                                <p className={`${textClass} text-sky-950 font-medium leading-relaxed`}>
                                    {issue.reply_message}
                                </p>
                                {issue.zm_approval_note && (
                                    <p className="text-[11px] text-emerald-800 font-medium italic bg-emerald-50/70 px-2 py-1 rounded border border-emerald-200">
                                        ZM নোট: {issue.zm_approval_note}
                                    </p>
                                )}
                            </div>
                        ) : (
                            <p className="text-[11px] text-slate-400 italic flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                জবাব অপেক্ষমান
                            </p>
                        )}
                    </div>
                </div>
            ))}

            {/* 3. HO Final Approval Card (comes underneath) */}
            {isApproved && (
                <div className="relative bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 space-y-1">
                    <div className="absolute -left-[9px] top-3 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
                    <div className="flex items-center justify-between gap-1 text-[10px]">
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-900 bg-emerald-200/70 px-1.5 py-0.5 rounded">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            HO চূড়ান্ত অনুমোদন
                        </span>
                        <span className="text-emerald-700 font-medium truncate">
                            {item.reviewed_by_name || 'হেড অফিস'}
                            {item.reviewed_at ? ` · ${formatDateTime(item.reviewed_at)}` : ''}
                        </span>
                    </div>
                    <p className={`${textClass} text-emerald-900 font-medium`}>আবেদন চূড়ান্ত অনুমোদিত হয়েছে</p>
                </div>
            )}

            {/* 4. HO Rejection Card */}
            {isRejected && (
                <div className="relative bg-rose-50 border border-rose-200 rounded-lg p-2.5 space-y-1">
                    <div className="absolute -left-[9px] top-3 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-white" />
                    <div className="flex items-center justify-between gap-1 text-[10px]">
                        <span className="inline-flex items-center gap-1 font-bold text-rose-900 bg-rose-200/70 px-1.5 py-0.5 rounded">
                            <XCircle className="w-3 h-3 text-rose-600" />
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
