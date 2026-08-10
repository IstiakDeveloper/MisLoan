import React, { useState, useEffect } from 'react';
import { Head, router, Link, usePage } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { formatDate, formatDateTime } from '@/utils/dateUtils';
import { Badge } from '@/components/ui/badge';
import {
    Search,
    Plus,
    Eye,
    Edit,
    Trash2,
    Send,
    ChevronLeft,
    ChevronRight,
    RotateCcw,
    Ban,
    Printer,
    Banknote,
    Building2,
    Users,
    Phone,
    Calendar,
    Clock,
    UserCheck,
    X,
    Filter,
    Sparkles,
} from 'lucide-react';
import { MemberAdmission } from '@/types/memberAdmission';

interface Props {
    admissions: {
        data: MemberAdmission[];
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
        from_date?: string;
        to_date?: string;
    };
    stats: {
        total: number;
        draft: number;
        submitted: number;
        under_review: number;
        approved: number;
        rejected: number;
        needs_revision?: number;
    };
}

export default function Index({ admissions, filters, stats }: Props) {
    const pageAuth = usePage().props.auth as { user?: { id?: number; role?: { name: string } } } | undefined;
    const roleName = pageAuth?.user?.role?.name?.toLowerCase() || '';
    // Only Branch User can send ready admissions to Head Office (not Branch Manager)
    const isBranchUser = roleName === 'branch_user';
    const isFieldOfficer = roleName === 'field_officer';
    const currentUserId = pageAuth?.user?.id;

    const canApplyLoan = (admission: MemberAdmission) => {
        if (admission.status === 'rejected') return false;
        if (admission.has_active_loan) return false;
        if (roleName === 'branch_user') return admission.status === 'approved';
        if (!isFieldOfficer) return false;
        const assignedId =
            typeof admission.assigned_officer_id === 'object'
                ? admission.assigned_officer_id?.id
                : admission.assigned_officer_id ?? admission.assignedOfficer?.id;
        const creatorId =
            typeof admission.created_by === 'object'
                ? admission.created_by?.id
                : admission.created_by ?? admission.createdBy?.id;
        return Number(assignedId ?? creatorId) === Number(currentUserId);
    };

    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');
    const [fromDate, setFromDate] = useState(filters.from_date || '');
    const [toDate, setToDate] = useState(filters.to_date || '');

    useEffect(() => {
        setFromDate(filters.from_date || '');
        setToDate(filters.to_date || '');
    }, [filters.from_date, filters.to_date]);

    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showResubmitModal, setShowResubmitModal] = useState(false);
    const [selectedAdmission, setSelectedAdmission] = useState<MemberAdmission | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [revisionNote, setRevisionNote] = useState('');
    const [selectedHoIds, setSelectedHoIds] = useState<number[]>([]);
    const [bulkSending, setBulkSending] = useState(false);

    const readyForHoIds = admissions.data
        .filter((a) => a.status === 'ready_for_head_office')
        .map((a) => a.id);
    const allReadySelected =
        readyForHoIds.length > 0 && readyForHoIds.every((id) => selectedHoIds.includes(id));

    const toggleHoSelect = (id: number) => {
        setSelectedHoIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    const toggleSelectAllReady = () => {
        setSelectedHoIds(allReadySelected ? [] : readyForHoIds);
    };

    const sendSelectedToHeadOffice = () => {
        if (selectedHoIds.length === 0 || bulkSending) return;
        if (!confirm(`${selectedHoIds.length}টি আবেদন Head Office এ পাঠাতে চান?`)) return;

        setBulkSending(true);
        router.post(
            '/member-admissions/send-to-head-office-bulk',
            { ids: selectedHoIds },
            {
                preserveScroll: true,
                onFinish: () => {
                    setBulkSending(false);
                    setSelectedHoIds([]);
                },
            },
        );
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { bg: string; text: string; dot: string; label: string }> = {
            draft: { bg: 'bg-slate-100 border-slate-300', text: 'text-slate-700', dot: 'bg-slate-500', label: 'খসড়া' },
            submitted: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500', label: 'জমা' },
            under_review: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500', label: 'পর্যালোচনায়' },
            ready_for_head_office: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'শাখা অনুমোদিত' },
            pending_head_office: { bg: 'bg-purple-50 border-purple-200', text: 'text-purple-700', dot: 'bg-purple-500', label: 'হেড অফিসে' },
            approved: { bg: 'bg-green-50 border-green-200', text: 'text-green-700', dot: 'bg-green-600', label: 'অনুমোদিত' },
            rejected: { bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700', dot: 'bg-rose-500', label: 'প্রত্যাখ্যাত' },
            needs_revision: { bg: 'bg-orange-50 border-orange-200', text: 'text-orange-700', dot: 'bg-orange-500', label: 'সংশোধন' },
        };

        const config = variants[status] || { bg: 'bg-slate-50 border-slate-200', text: 'text-slate-700', dot: 'bg-slate-400', label: status };
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-bold tracking-wide ${config.bg} ${config.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                {config.label}
            </span>
        );
    };

    const getInitials = (name?: string) => {
        if (!name) return 'MA';
        return name
            .split(' ')
            .map((n) => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
    };

    const getActiveLoanBadge = (admission: MemberAdmission) => {
        if (!admission.has_active_loan) return null;

        const isDisbursed = admission.active_loan_status === 'disbursed';
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-bold tracking-wide ${
                isDisbursed
                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                    : 'bg-amber-50 border-amber-200 text-amber-700'
            }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isDisbursed ? 'bg-rose-500' : 'bg-amber-500'}`} />
                {isDisbursed ? 'ঋণ সক্রিয়' : 'ঋণ চলমান'}
            </span>
        );
    };

    const today = new Date().toISOString().split('T')[0];
    const isTodayFilter = fromDate === today && toDate === today;

    const buildParams = () => {
        const params: Record<string, string> = {};
        if (searchQuery) params.search = searchQuery;
        if (statusFilter) params.status = statusFilter;
        if (fromDate) params.from_date = fromDate;
        if (toDate) params.to_date = toDate;
        return params;
    };

    const handleTodayFilter = () => {
        setFromDate(today);
        setToDate(today);
        router.get('/member-admissions', { ...buildParams(), from_date: today, to_date: today }, { preserveState: true });
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/member-admissions', buildParams(), { preserveState: true });
    };

    const handleFilterChange = (status: string) => {
        setStatusFilter(status);
        router.get('/member-admissions', { ...buildParams(), status }, { preserveState: true });
    };

    const handlePrint = () => {
        window.print();
    };

    const handleDelete = (id: number, applicationNo: string) => {
        if (confirm(`আবেদন নং ${applicationNo} মুছে ফেলতে চান?`)) {
            router.delete(`/member-admissions/${id}`);
        }
    };

    const handleSubmit = (id: number, applicationNo: string, isLegacy?: boolean) => {
        const msg = isLegacy
            ? `আবেদন নং ${applicationNo} পুরাতন সদস্য — জমা দিলে স্বয়ংক্রিয়ভাবে অনুমোদিত হবে। চালিয়ে যাবেন?`
            : `আবেদন নং ${applicationNo} জমা দিতে চান?`;
        if (confirm(msg)) {
            router.patch(`/member-admissions/${id}/submit`);
        }
    };

    const openResubmitModal = (admission: MemberAdmission) => {
        setSelectedAdmission(admission);
        setRevisionNote('');
        setShowResubmitModal(true);
    };

    const handleResubmit = () => {
        if (!selectedAdmission || !revisionNote.trim()) {
            alert('সংশোধনের বিবরণ লিখুন');
            return;
        }
        router.patch(
            `/member-admissions/${selectedAdmission.id}/resubmit`,
            {
                revision_note: revisionNote,
            },
            {
                onSuccess: () => {
                    setShowResubmitModal(false);
                    setSelectedAdmission(null);
                    setRevisionNote('');
                },
            }
        );
    };

    const openRejectModal = (admission: MemberAdmission) => {
        setSelectedAdmission(admission);
        setRejectionReason('');
        setShowRejectModal(true);
    };

    const handleReject = () => {
        if (!selectedAdmission || !rejectionReason.trim()) {
            alert('প্রত্যাখ্যানের কারণ লিখুন');
            return;
        }
        router.patch(
            `/member-admissions/${selectedAdmission.id}/reject`,
            {
                rejection_reason: rejectionReason,
            },
            {
                onSuccess: () => {
                    setShowRejectModal(false);
                    setSelectedAdmission(null);
                    setRejectionReason('');
                },
            }
        );
    };

    const statCards = [
        { label: 'সর্বমোট', count: stats.total, color: 'bg-slate-800 text-white', filter: '' },
        { label: 'খসড়া', count: stats.draft, color: 'bg-slate-200 text-slate-800', filter: 'draft' },
        { label: 'জমা', count: stats.submitted, color: 'bg-blue-600 text-white', filter: 'submitted' },
        { label: 'পর্যালোচনা', count: stats.under_review, color: 'bg-amber-500 text-white', filter: 'under_review' },
        { label: 'সংশোধন', count: stats.needs_revision || 0, color: 'bg-orange-500 text-white', filter: 'needs_revision' },
        { label: 'অনুমোদিত', count: stats.approved, color: 'bg-emerald-600 text-white', filter: 'approved' },
        { label: 'প্রত্যাখ্যাত', count: stats.rejected, color: 'bg-rose-600 text-white', filter: 'rejected' },
    ];

    return (
        <AdminLayout>
            <Head title="সদস্য ভর্তি প্যানেল" />

            <div className="p-3 md:p-4 space-y-3 max-w-[1600px] mx-auto pb-16 print:block">
                {/* ── 1. HERO BANNER HEADER ─────────────────────────────────────────────── */}
                <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-6 sm:p-8 shadow-xl border border-slate-800 print:hidden">
                    <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-gradient-to-tr from-blue-600/30 to-teal-500/20 blur-3xl pointer-events-none" />
                    <div className="absolute left-1/3 -top-12 w-48 h-48 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-2 max-w-2xl">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/20 text-blue-300 text-xs font-semibold backdrop-blur-md">
                                <Users className="w-4 h-4 text-blue-400" />
                                <span>Member Admission Command Center</span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                                সদস্য ভর্তি আবেদন প্যানেল
                            </h1>
                            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                                নতুন সদস্য ভর্তির আবেদন তৈরি করুন, ফিল্ড সার্ভে ডেটা যাচাই করুন এবং হেড অফিস প্রসেসিং ট্র্যাক করুন।
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={handleTodayFilter}
                                className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border text-xs sm:text-sm font-semibold transition-all active:scale-95 ${
                                    isTodayFilter
                                        ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                                }`}
                                title="আজকের ভর্তি আবেদনসমূহ (Today)"
                            >
                                <Calendar className="w-4 h-4" />
                                <span>Today (আজ)</span>
                            </button>
                            {isFieldOfficer && (
                                <Link
                                    href="/member-admissions/create"
                                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-bold shadow-lg shadow-blue-600/30 transition-all active:scale-95"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>নতুন ভর্তি আবেদন</span>
                                </Link>
                            )}
                            <button
                                type="button"
                                onClick={handlePrint}
                                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs sm:text-sm font-semibold transition-all active:scale-95"
                            >
                                <Printer className="w-4 h-4" />
                                <span>প্রিন্ট</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── 2. SEARCH & FILTER TOOLBAR ─────────────────────────────────────── */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-4 print:hidden">
                    {isBranchUser && readyForHoIds.length > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-purple-200 bg-purple-50 px-3 py-2.5">
                            <p className="text-sm text-purple-900">
                                শাখা অনুমোদিত: <span className="font-semibold">{readyForHoIds.length}</span> · সিলেক্টেড:{' '}
                                <span className="font-semibold">{selectedHoIds.length}</span>
                            </p>
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    onClick={toggleSelectAllReady}
                                    className="rounded-lg border border-purple-300 bg-white px-3 py-1.5 text-xs font-semibold text-purple-800 hover:bg-purple-100"
                                >
                                    {allReadySelected ? 'সব আনসিলেক্ট' : 'একবারে সব সিলেক্ট'}
                                </button>
                                <button
                                    type="button"
                                    onClick={sendSelectedToHeadOffice}
                                    disabled={selectedHoIds.length === 0 || bulkSending}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-40 px-3 py-1.5 text-xs font-bold text-white"
                                >
                                    <Send className="w-3.5 h-3.5" />
                                    {bulkSending ? 'পাঠানো হচ্ছে...' : `HO তে পাঠান (${selectedHoIds.length})`}
                                </button>
                            </div>
                        </div>
                    )}
                    <form onSubmit={handleSearch} className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                        {/* Search Input Box */}
                        <div className="relative flex-grow max-w-lg">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="সদস্য নাম্বার, নাম, মোবাইল, এনআইডি খুঁজুন..."
                                className="w-full pl-9 pr-4 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50 transition-all"
                            />
                        </div>

                        {/* Date Range & Buttons */}
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={handleTodayFilter}
                                className={`px-3 py-2 text-xs font-bold rounded-xl border transition ${
                                    isTodayFilter
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                        : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                                }`}
                                title="আজকের আবেদনসমূহ (Today)"
                            >
                                Today (আজ)
                            </button>

                            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1 rounded-xl">
                                <input
                                    type="date"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                    className="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none"
                                    title="তারিখ থেকে"
                                />
                                <span className="text-slate-400 text-xs font-bold">–</span>
                                <input
                                    type="date"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                    className="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none"
                                    title="তারিখ পর্যন্ত"
                                />
                            </div>

                            <button
                                type="submit"
                                className="px-4 py-2 text-xs font-bold bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition-all shadow-sm"
                            >
                                খুঁজুন
                            </button>

                            {(searchQuery || statusFilter || fromDate || toDate) && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchQuery('');
                                        setStatusFilter('');
                                        setFromDate('');
                                        setToDate('');
                                        router.get('/member-admissions');
                                    }}
                                    className="px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                                >
                                    রিসেট
                                </button>
                            )}
                        </div>
                    </form>

                    {/* Summary Filter Chips */}
                    <div className="flex overflow-x-auto pb-1 gap-2 hide-scrollbar items-center border-t border-slate-100 pt-3">
                        {statCards.map((stat) => (
                            <button
                                key={stat.label}
                                type="button"
                                onClick={() => handleFilterChange(stat.filter)}
                                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                                    statusFilter === stat.filter
                                        ? 'ring-2 ring-blue-500/30 bg-blue-50 text-blue-800 border border-blue-200'
                                        : 'bg-slate-50 border border-slate-200/80 text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                                <span className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-black ${stat.color}`}>
                                    {stat.count}
                                </span>
                                <span>{stat.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── 3. MAIN CONTENT CONTAINER ──────────────────────────────────────── */}
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden member-admission-index-print print:overflow-visible">
                    {/* Print Only Title */}
                    <div className="hidden print:block text-center py-4 border-b border-slate-300">
                        <h2 className="text-xl font-bold text-slate-900">সদস্য ভর্তি আবেদন তালিকা</h2>
                        {(fromDate || toDate) && (
                            <p className="text-xs text-slate-600 mt-1">তারিখ: {fromDate || 'শুরু'} – {toDate || 'শেষ'}</p>
                        )}
                        <p className="text-[10px] text-slate-500 mt-0.5">প্রিন্টের সময়: {formatDateTime(new Date())}</p>
                    </div>

                    {/* ── MOBILE CARDS VIEW (md:hidden) ────────────────────────────────── */}
                    <div className="md:hidden divide-y divide-slate-100 print:hidden">
                        {admissions.data.length === 0 ? (
                            <div className="p-12 text-center text-slate-400 text-sm">
                                কোনো ভর্তি আবেদন পাওয়া যায়নি
                            </div>
                        ) : (
                            admissions.data.map((admission) => (
                                <div key={admission.id} className="p-4 space-y-3 hover:bg-slate-50/50 transition-colors relative">
                                    {/* Header Row */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            {isBranchUser && admission.status === 'ready_for_head_office' && (
                                                <input
                                                    type="checkbox"
                                                    checked={selectedHoIds.includes(admission.id)}
                                                    onChange={() => toggleHoSelect(admission.id)}
                                                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 shrink-0"
                                                />
                                            )}
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-700 to-slate-900 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-sm">
                                                {getInitials(admission.applicant_name_en || admission.applicant_name_bn)}
                                            </div>
                                            <div>
                                                <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                                    {admission.application_no}
                                                </span>
                                                <h3 className="font-bold text-slate-900 text-sm mt-1">
                                                    {admission.applicant_name_bn || admission.applicant_name_en}
                                                </h3>
                                                {admission.is_legacy && (
                                                    <span className="mt-0.5 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                                                        পুরাতন{admission.loan_dofa ? ` · দফা ${admission.loan_dofa}` : ''}
                                                    </span>
                                                )}
                                                {admission.applicant_name_bn && admission.applicant_name_en && (
                                                    <p className="text-xs text-slate-500">{admission.applicant_name_en}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="shrink-0">{getStatusBadge(admission.status)}</div>
                                    </div>
                                        {getActiveLoanBadge(admission)}

                                    {/* Details Grid */}
                                    <div className="grid grid-cols-2 gap-2.5 bg-slate-50/80 p-3 rounded-2xl border border-slate-100 text-xs">
                                        <div>
                                            <span className="text-[10px] font-bold uppercase text-slate-400 block">মোবাইল</span>
                                            <a href={`tel:${admission.mobile_number}`} className="font-semibold text-blue-600 flex items-center gap-1 mt-0.5">
                                                <Phone className="w-3 h-3" /> {admission.mobile_number}
                                            </a>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold uppercase text-slate-400 block">শাখা</span>
                                            <p className="font-semibold text-slate-800 truncate mt-0.5">{admission.branch?.name || '–'}</p>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold uppercase text-slate-400 block">সমিতি</span>
                                            <p className="font-semibold text-slate-800 truncate mt-0.5">{admission.samity?.samity_name || '–'}</p>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold uppercase text-slate-400 block">তারিখ</span>
                                            <p className="font-semibold text-slate-600 mt-0.5">{formatDate(admission.created_at)}</p>
                                        </div>
                                        <div className="col-span-2 border-t border-slate-200/60 pt-1.5 mt-0.5 flex items-center justify-between">
                                            <span className="text-[10px] font-bold uppercase text-slate-400">কার কাছে পেন্ডিং:</span>
                                            <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-[11px]">
                                                {admission.tracking_state?.label ?? '—'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Mobile Touch Action Buttons Toolbar */}
                                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                        <Link
                                            href={`/member-admissions/${admission.id}`}
                                            className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition active:scale-95"
                                        >
                                            <Eye className="w-3.5 h-3.5" /> দেখুন
                                        </Link>

                                        {canApplyLoan(admission) && (
                                            <Link
                                                href={`/member/loan-applications?member_id=${admission.id}`}
                                                className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition active:scale-95"
                                                title="ঋণ আবেদন করুন"
                                            >
                                                <Banknote className="w-3.5 h-3.5" /> ঋণ আবেদন
                                            </Link>
                                        )}

                                        {(admission.status === 'draft' || admission.status === 'rejected') && (
                                            <>
                                                <Link
                                                    href={`/member-admissions/${admission.id}/edit`}
                                                    className="p-2 text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition"
                                                    title="সম্পাদনা"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Link>
                                                {admission.status === 'draft' && (
                                                    <button
                                                        onClick={() => handleSubmit(admission.id, admission.application_no, admission.is_legacy)}
                                                        className="p-2 text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition"
                                                        title={admission.is_legacy ? 'সংরক্ষণ ও অটো অনুমোদন' : 'জমা দিন'}
                                                    >
                                                        <Send className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </>
                                        )}

                                        {admission.status === 'needs_revision' && !isFieldOfficer && (
                                            <>
                                                <button
                                                    onClick={() => openResubmitModal(admission)}
                                                    className="p-2 text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition"
                                                    title="পুনরায় জমা"
                                                >
                                                    <RotateCcw className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => openRejectModal(admission)}
                                                    className="p-2 text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition"
                                                    title="প্রত্যাখ্যান"
                                                >
                                                    <Ban className="w-4 h-4" />
                                                </button>
                                            </>
                                        )}

                                        {admission.status === 'ready_for_head_office' && isBranchUser && (
                                            <button
                                                onClick={() => {
                                                    if (confirm(`এই আবেদনটি Head Office এ পাঠাতে চান? (${admission.application_no})`)) {
                                                        router.patch(`/member-admissions/${admission.id}/send-to-head-office`);
                                                    }
                                                }}
                                                className="p-2 text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition"
                                                title="Head Office এ পাঠান"
                                            >
                                                <Send className="w-4 h-4" />
                                            </button>
                                        )}

                                        {admission.status === 'draft' && (
                                            <button
                                                onClick={() => handleDelete(admission.id, admission.application_no)}
                                                className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition"
                                                title="মুছুন"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* ── DESKTOP TABLE VIEW (hidden md:block) ────────────────────────── */}
                    <div className="hidden md:block member-admission-index-table-wrap overflow-x-auto print:overflow-visible print:block">
                        <table className="w-full text-left border-collapse member-admission-index-table">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                    {isBranchUser && (
                                        <th className="py-3.5 px-3 text-center print:hidden w-10">
                                            {readyForHoIds.length > 0 && (
                                                <input
                                                    type="checkbox"
                                                    checked={allReadySelected}
                                                    onChange={toggleSelectAllReady}
                                                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                                                    title="সব সিলেক্ট"
                                                />
                                            )}
                                        </th>
                                    )}
                                    <th className="py-3.5 px-4 text-center">ক্রমিক নং</th>
                                    <th className="py-3.5 px-4">সদস্য নাম্বার</th>
                                    <th className="py-3.5 px-4">আবেদনকারী</th>
                                    <th className="py-3.5 px-4">মোবাইল</th>
                                    <th className="py-3.5 px-4">শাখা</th>
                                    <th className="py-3.5 px-4">সমিতি</th>
                                    <th className="py-3.5 px-4">ক্যাটাগরি</th>
                                    <th className="py-3.5 px-4">স্ট্যাটাস</th>
                                    <th className="py-3.5 px-4">পেন্ডিং অবস্থান</th>
                                    <th className="py-3.5 px-4">তারিখ</th>
                                    <th className="py-3.5 px-4 text-right print:hidden">অ্যাকশন</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {admissions.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={isBranchUser ? 12 : 11} className="py-12 text-center text-slate-400">
                                            কোনো ভর্তি আবেদন পাওয়া যায়নি
                                        </td>
                                    </tr>
                                ) : (
                                    admissions.data.map((admission, index) => (
                                        <tr key={admission.id} className="hover:bg-slate-50/60 transition-colors">
                                            {isBranchUser && (
                                                <td className="py-4 px-3 text-center print:hidden">
                                                    {admission.status === 'ready_for_head_office' ? (
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedHoIds.includes(admission.id)}
                                                            onChange={() => toggleHoSelect(admission.id)}
                                                            className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                                                        />
                                                    ) : null}
                                                </td>
                                            )}
                                            <td className="py-4 px-4 text-center font-bold text-slate-500 text-xs whitespace-nowrap">
                                                {((admissions.current_page || 1) - 1) * (admissions.per_page || 15) + index + 1}
                                            </td>
                                            <td className="py-4 px-4 font-mono font-bold text-blue-700 text-xs whitespace-nowrap">
                                                {admission.application_no}
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="font-bold text-slate-800">
                                                    {admission.applicant_name_bn || admission.applicant_name_en}
                                                </div>
                                                {getActiveLoanBadge(admission)}
                                                {admission.is_legacy && (
                                                    <span className="mt-0.5 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                                                        পুরাতন{admission.loan_dofa ? ` · দফা ${admission.loan_dofa}` : ''}
                                                    </span>
                                                )}
                                                {admission.applicant_name_bn && admission.applicant_name_en && (
                                                    <div className="text-xs text-slate-500 font-medium">{admission.applicant_name_en}</div>
                                                )}
                                            </td>
                                            <td className="py-4 px-4 font-medium text-slate-700 whitespace-nowrap">{admission.mobile_number}</td>
                                            <td className="py-4 px-4 font-medium text-slate-700">{admission.branch?.name || '–'}</td>
                                            <td className="py-4 px-4 font-medium text-slate-700">{admission.samity?.samity_name || '–'}</td>
                                            <td className="py-4 px-4 font-medium text-slate-700">{admission.member_category?.category_name || '–'}</td>
                                            <td className="py-4 px-4">{getStatusBadge(admission.status)}</td>
                                            <td className="py-4 px-4">
                                                <span className="inline-block text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                                                    {admission.tracking_state?.label ?? '—'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-xs font-medium text-slate-500 whitespace-nowrap">
                                                {formatDate(admission.created_at)}
                                            </td>
                                            <td className="py-4 px-4 text-right print:hidden">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Link
                                                        href={`/member-admissions/${admission.id}`}
                                                        className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="দেখুন"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Link>

                                                    {canApplyLoan(admission) && (
                                                        <Link
                                                            href={`/member/loan-applications?member_id=${admission.id}`}
                                                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                            title="ঋণ আবেদন"
                                                        >
                                                            <Banknote className="w-4 h-4" />
                                                        </Link>
                                                    )}

                                                    {(admission.status === 'draft' || admission.status === 'rejected') && (
                                                        <>
                                                            <Link
                                                                href={`/member-admissions/${admission.id}/edit`}
                                                                className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                                                title="সম্পাদনা"
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                            </Link>
                                                            {admission.status === 'draft' && (
                                                                <button
                                                                    onClick={() => handleSubmit(admission.id, admission.application_no, admission.is_legacy)}
                                                                    className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                                    title={admission.is_legacy ? 'সংরক্ষণ ও অটো অনুমোদন' : 'জমা দিন'}
                                                                >
                                                                    <Send className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </>
                                                    )}

                                                    {admission.status === 'needs_revision' && !isFieldOfficer && (
                                                        <>
                                                            <button
                                                                onClick={() => openResubmitModal(admission)}
                                                                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                                title="পুনরায় জমা"
                                                            >
                                                                <RotateCcw className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => openRejectModal(admission)}
                                                                className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                                title="প্রত্যাখ্যান"
                                                            >
                                                                <Ban className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}

                                                    {admission.status === 'ready_for_head_office' && isBranchUser && (
                                                        <button
                                                            onClick={() => {
                                                                if (confirm(`এই আবেদনটি Head Office এ পাঠাতে চান? (${admission.application_no})`)) {
                                                                    router.patch(`/member-admissions/${admission.id}/send-to-head-office`);
                                                                }
                                                            }}
                                                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                                            title="Head Office এ পাঠান"
                                                        >
                                                            <Send className="w-4 h-4" />
                                                        </button>
                                                    )}

                                                    {admission.status === 'draft' && (
                                                        <button
                                                            onClick={() => handleDelete(admission.id, admission.application_no)}
                                                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                            title="মুছুন"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Container */}
                    {admissions.last_page > 1 && (
                        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 print:hidden">
                            <span>দেখাচ্ছে {admissions.from}–{admissions.to} (সর্বমোট {admissions.total})</span>
                            <div className="flex items-center gap-2">
                                <Link
                                    href={`/member-admissions?page=${admissions.current_page - 1}${searchQuery ? `&search=${searchQuery}` : ''}${statusFilter ? `&status=${statusFilter}` : ''}${fromDate ? `&from_date=${fromDate}` : ''}${toDate ? `&to_date=${toDate}` : ''}`}
                                    className={`p-2 rounded-xl border font-bold ${admissions.current_page === 1 ? 'border-slate-200 text-slate-300 cursor-not-allowed' : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-700'}`}
                                    preserveState
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Link>
                                <span className="font-bold px-2">পৃষ্ঠা {admissions.current_page} / {admissions.last_page}</span>
                                <Link
                                    href={`/member-admissions?page=${admissions.current_page + 1}${searchQuery ? `&search=${searchQuery}` : ''}${statusFilter ? `&status=${statusFilter}` : ''}${fromDate ? `&from_date=${fromDate}` : ''}${toDate ? `&to_date=${toDate}` : ''}`}
                                    className={`p-2 rounded-xl border font-bold ${admissions.current_page === admissions.last_page ? 'border-slate-200 text-slate-300 cursor-not-allowed' : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-700'}`}
                                    preserveState
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Link>
                            </div>
                        </div>
                    )}
                </div>

                <style>{`
                    @media print {
                        html, body { overflow: hidden !important; height: auto !important; }
                        body * { visibility: hidden; }
                        .member-admission-index-print,
                        .member-admission-index-print * { visibility: visible; }
                        .member-admission-index-print {
                            position: absolute !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: 100% !important;
                            overflow: visible !important;
                            max-height: none !important;
                        }
                        .member-admission-index-table-wrap { overflow: visible !important; }
                        .member-admission-index-table { font-size: 10pt; }
                        .member-admission-index-table th,
                        .member-admission-index-table td { padding: 4px 6px; border: 1px solid #ddd; }
                    }
                `}</style>

                {/* Resubmit Modal */}
                {showResubmitModal && selectedAdmission && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
                        <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <h3 className="text-lg font-bold text-slate-900">পুনরায় জমা: {selectedAdmission.application_no}</h3>
                                <button onClick={() => { setShowResubmitModal(false); setSelectedAdmission(null); setRevisionNote(''); }} className="p-1 rounded-full text-slate-400 hover:text-slate-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">সংশোধনের বিবরণ *</label>
                                <textarea
                                    value={revisionNote}
                                    onChange={(e) => setRevisionNote(e.target.value)}
                                    rows={3}
                                    className="w-full border border-slate-300 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    placeholder="কি সংশোধন করা হয়েছে লিখুন..."
                                />
                            </div>
                            {selectedAdmission.revision_comments && (
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                                    {selectedAdmission.revision_comments}
                                </div>
                            )}
                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button onClick={() => { setShowResubmitModal(false); setSelectedAdmission(null); setRevisionNote(''); }} className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200">বাতিল</button>
                                <button onClick={handleResubmit} className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 shadow-sm">জমা দিন</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Reject Modal */}
                {showRejectModal && selectedAdmission && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
                        <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <h3 className="text-lg font-bold text-slate-900">প্রত্যাখ্যান: {selectedAdmission.application_no}</h3>
                                <button onClick={() => { setShowRejectModal(false); setSelectedAdmission(null); setRejectionReason(''); }} className="p-1 rounded-full text-slate-400 hover:text-slate-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">প্রত্যাখ্যানের কারণ *</label>
                                <textarea
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    rows={3}
                                    className="w-full border border-slate-300 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                                    placeholder="কারণ লিখুন..."
                                />
                            </div>
                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button onClick={() => { setShowRejectModal(false); setSelectedAdmission(null); setRejectionReason(''); }} className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200">বাতিল</button>
                                <button onClick={handleReject} className="px-5 py-2 text-xs font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700 shadow-sm">প্রত্যাখ্যান করুন</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
