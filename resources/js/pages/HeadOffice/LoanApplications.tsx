import React, { useState, useEffect } from 'react';
import { Head, router, Link, usePage } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { formatDate, formatTime, todayIsoDate } from '@/utils/dateUtils';
import { Badge } from '@/components/ui/badge';
import {
    Search,
    Eye,
    Pencil,
    CalendarDays,
    Filter,
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
    Download,
    Sparkles,
    Wrench,
    Layers,
    Send,
    Banknote,
    Ban,
    PlayCircle,
} from 'lucide-react';
import AutoFitTableContainer from '@/components/AutoFitTableContainer';
import ListPagination from '@/components/ListPagination';
import SuperAdminDeletePinModal from '@/components/SuperAdminDeletePinModal';
import { formatBranchLabel, keepListFilters, sortBranchesByCode } from '@/utils/branchLabel';
import { PhoneCallLink } from '@/components/ui/PhoneCallLink';
import HeadOfficeModificationModal, {
    useCanHeadOfficeModify,
    type ModificationTarget,
} from '@/components/HeadOfficeModificationModal';

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
        per_page?: number | string;
    };
    stats: {
        total: number;
        draft: number;
        submitted: number;
        under_review: number;
        ready_for_head_office?: number;
        pending_head_office: number;
        approved: number;
        pending_disbursement?: number;
        rejected: number;
        disbursed: number;
        pending_my_approval?: number;
    };
    zones: Zone[];
    areas: Area[];
    branches: Branch[];
    viewAllLoans?: boolean;
    workQueue?: {
        default_status?: string | null;
        label?: string;
        hint?: string | null;
    };
}

export default function LoanApplications({ loans, filters, stats, zones, areas, branches, viewAllLoans = false, workQueue }: Props) {
    const { auth } = usePage().props as any;
    const roleName = auth?.user?.role?.name || (typeof auth?.user?.role === 'string' ? auth?.user?.role : '');
    const isSuperAdmin = roleName === 'super_admin' || roleName === 'superadmin' || roleName === 'Super Admin';
    const canModify = useCanHeadOfficeModify();
    const canViewAllLoans = isSuperAdmin || !!auth?.user?.has_all_access || viewAllLoans;

    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
    const [printedFilter, setPrintedFilter] = useState(filters.printed || '');

    // Modals
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [modificationTarget, setModificationTarget] = useState<ModificationTarget | null>(null);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [deleteIntent, setDeleteIntent] = useState<{ type: 'single'; id: number; label: string } | { type: 'bulk' } | null>(null);
    const [deleteProcessing, setDeleteProcessing] = useState(false);
    const [markAsPrintedCheckbox, setMarkAsPrintedCheckbox] = useState(false);
    const [syncProcessing, setSyncProcessing] = useState(false);

    // Date filters - default to current month (1st .. today)
    const today = todayIsoDate();
    const monthStart = `${today.slice(0, 7)}-01`;
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');

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
        setDateFrom(filters.date_from || '');
        setDateTo(filters.date_to || '');
        setStatusFilter(filters.status || 'all');
    }, [filters.date_from, filters.date_to, filters.status]);

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
            setFilteredBranches(sortBranchesByCode(filtered));
            if (selectedBranch && !filtered.find(b => b.id.toString() === selectedBranch)) {
                setSelectedBranch('');
            }
        } else if (selectedZone) {
            const zoneAreaIds = filteredAreas.map(a => a.id);
            const filtered = branches.filter(branch => zoneAreaIds.includes(branch.area_id));
            setFilteredBranches(sortBranchesByCode(filtered));
        } else {
            setFilteredBranches(sortBranchesByCode(branches));
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
            per_page: loans.per_page || filters.per_page || 20,
            ...overrides,
        };

        queryParams.status = queryParams.status || 'all';

        // Clean empty values except status (all must be sent)
        Object.keys(queryParams).forEach(key => {
            if (key === 'status') return;
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
        setStatusFilter(workQueue?.default_status || 'all');
        setSelectedZone('');
        setSelectedArea('');
        setSelectedBranch('');
        setDateFrom('');
        setDateTo('');
        setHadIssues('');
        setPrintedFilter('');
        router.get('/head-office/loan-applications', {}, { preserveState: true });
    };

    const handleDelete = (loan: LoanApplication) => {
        setDeleteIntent({ type: 'single', id: loan.id, label: loan.member_admission?.application_no || loan.application_no });
    };

    const toggleSelect = (id: number) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    const pageIds = loans.data.map((loan) => loan.id);
    const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));

    const toggleSelectAllOnPage = () => {
        if (allPageSelected) {
            setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
        } else {
            setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
        }
    };

    const confirmDeleteWithPin = (pin: string) => {
        if (!deleteIntent) {
            return;
        }
        setDeleteProcessing(true);
        const isBulk = deleteIntent.type === 'bulk';
        const url = isBulk ? '/head-office/loans/bulk' : `/head-office/loans/${deleteIntent.id}`;
        const data = isBulk ? { pin, ids: selectedIds } : { pin };

        router.delete(url, {
            data,
            ...keepListFilters,
            onSuccess: () => {
                setDeleteIntent(null);
                if (isBulk) {
                    setSelectedIds([]);
                } else if (deleteIntent.type === 'single') {
                    setSelectedIds((prev) => prev.filter((id) => id !== deleteIntent.id));
                }
            },
            onFinish: () => setDeleteProcessing(false),
        });
    };

    const openModificationModal = (loan: LoanApplication) => {
        setModificationTarget({
            id: loan.id,
            applicationNo: loan.member_admission?.application_no || loan.application_no,
            applicantName: loan.member_admission?.applicant_name_bn || loan.member_admission?.applicant_name_en,
            status: loan.status,
        });
    };

    const handlePrintConfirm = () => {
        const params = getQueryParams();
        const printUrl = `/head-office/loan-applications/print?${new URLSearchParams(params).toString()}`;
        window.open(printUrl, '_blank');

        if (markAsPrintedCheckbox) {
            router.post('/head-office/loan-applications/mark-printed', params, keepListFilters);
        }

        setShowPrintModal(false);
        setMarkAsPrintedCheckbox(false);
    };

    const handleExportExcel = () => {
        const params = new URLSearchParams(getQueryParams());
        window.location.href = `/head-office/loan-applications/export?${params.toString()}`;
    };

    const handleSyncMemberCodes = (onlySelected: boolean) => {
        const selected = onlySelected && selectedIds.length > 0;
        const message = selected
            ? `নির্বাচিত ${selectedIds.length} টি ঋণ আবেদনের বর্তমান মেম্বার কোড সব ফর্মে সিঙ্ক হবে। চালিয়ে যাবেন?`
            : 'সব সদস্যের বর্তমান মেম্বার কোড সব ঋণ ফর্ম, সঞ্চয় ও টিম-ভিত্তিক শিটে সিঙ্ক হবে। চালিয়ে যাবেন?';
        if (!confirm(message)) {
            return;
        }

        setSyncProcessing(true);
        router.post(
            '/head-office/loan-applications/sync-member-codes',
            selected ? { ids: selectedIds } : {},
            {
                preserveScroll: true,
                onFinish: () => setSyncProcessing(false),
            },
        );
    };

    const getStatusBadge = (status: string) => {
        const statusMap: Record<string, { label: string; bg: string; text: string }> = {
            draft: { label: 'ড্রাফট', bg: 'bg-slate-100 border-slate-300', text: 'text-slate-700' },
            submitted: { label: 'জমাকৃত', bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
            under_review: { label: 'যাচাইাধীন', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700' },
            ready_for_head_office: { label: 'শাখা অনুমোদিত', bg: 'bg-violet-50 border-violet-200', text: 'text-violet-700' },
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

    const defaultStatus = workQueue?.default_status || '';
    const isAllStatus = statusFilter === 'all' || statusFilter === '';
    const selectStatus = (status: string) => {
        const next = status || 'all';
        setStatusFilter(next);
        applyFilters({ status: next });
    };
    const hoLoanStatCards = [
        ...(defaultStatus
            ? [{
                key: defaultStatus,
                label: workQueue?.label || 'আমার কাজ',
                count: (stats as Record<string, number>)[defaultStatus] || 0,
                icon: UserCheck,
                iconColor: 'text-indigo-600',
                iconBg: 'bg-indigo-50',
                barColor: 'from-indigo-500 to-indigo-600',
                activeBg: 'bg-indigo-600 border-indigo-600 text-white',
                highlight: true,
            }]
            : []),
        {
            key: 'all',
            label: 'সর্বমোট',
            count: stats.total,
            icon: Layers,
            iconColor: 'text-slate-700',
            iconBg: 'bg-slate-100',
            barColor: 'from-slate-600 to-slate-800',
            activeBg: 'bg-slate-900 border-slate-900 text-white',
        },
        {
            key: 'pending_head_office',
            label: 'হেড অফিসে পেন্ডিং',
            count: stats.pending_head_office,
            icon: Building2,
            iconColor: 'text-purple-600',
            iconBg: 'bg-purple-50',
            barColor: 'from-purple-500 to-purple-600',
            activeBg: 'bg-purple-600 border-purple-600 text-white',
            highlight: stats.pending_head_office > 0,
        },
        {
            key: 'approved',
            label: 'অনুমোদিত',
            count: stats.approved,
            icon: CheckCircle2,
            iconColor: 'text-teal-600',
            iconBg: 'bg-teal-50',
            barColor: 'from-teal-500 to-teal-600',
            activeBg: 'bg-teal-600 border-teal-600 text-white',
        },
        {
            key: 'pending_disbursement',
            label: 'বিতরণ অপেক্ষা',
            count: stats.pending_disbursement ?? 0,
            icon: Banknote,
            iconColor: 'text-amber-600',
            iconBg: 'bg-amber-50',
            barColor: 'from-amber-500 to-amber-600',
            activeBg: 'bg-amber-600 border-amber-600 text-white',
        },
        {
            key: 'disbursed',
            label: 'বিতরণকৃত',
            count: stats.disbursed,
            icon: CheckCheck,
            iconColor: 'text-emerald-600',
            iconBg: 'bg-emerald-50',
            barColor: 'from-emerald-500 to-emerald-600',
            activeBg: 'bg-emerald-600 border-emerald-600 text-white',
        },
        ...(canViewAllLoans
            ? [
                  {
                      key: 'ready_for_head_office',
                      label: 'শাখা অনুমোদিত',
                      count: stats.ready_for_head_office ?? 0,
                      icon: Sparkles,
                      iconColor: 'text-violet-600',
                      iconBg: 'bg-violet-50',
                      barColor: 'from-violet-500 to-violet-600',
                      activeBg: 'bg-violet-600 border-violet-600 text-white',
                  },
                  {
                      key: 'under_review',
                      label: 'যাচাইাধীন',
                      count: stats.under_review,
                      icon: Clock,
                      iconColor: 'text-amber-600',
                      iconBg: 'bg-amber-50',
                      barColor: 'from-amber-400 to-amber-500',
                      activeBg: 'bg-amber-500 border-amber-500 text-white',
                  },
                  {
                      key: 'submitted',
                      label: 'জমাকৃত',
                      count: stats.submitted,
                      icon: Send,
                      iconColor: 'text-blue-600',
                      iconBg: 'bg-blue-50',
                      barColor: 'from-blue-500 to-blue-600',
                      activeBg: 'bg-blue-600 border-blue-600 text-white',
                  },
              ]
            : []),
        {
            key: 'rejected',
            label: 'প্রত্যাখ্যাত',
            count: stats.rejected,
            icon: Ban,
            iconColor: 'text-rose-600',
            iconBg: 'bg-rose-50',
            barColor: 'from-rose-500 to-rose-600',
            activeBg: 'bg-rose-600 border-rose-600 text-white',
        },
    ].filter((stat, index, all) => all.findIndex((s) => s.key === stat.key) === index);

    return (
        <AdminLayout>
            <Head title="Head Office - Loan Applications (ঋণ আবেদনসমূহ)" />

            <div className="p-3 md:p-4 space-y-3 max-w-[1600px] mx-auto pb-16 print:block">
                {/* ── 1. SLIM PROFESSIONAL HEADER ───────────────────────────────────── */}
                <div className="bg-white px-4 py-3 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3 print:hidden">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-slate-800 text-white flex items-center justify-center shadow-xs shrink-0">
                            <CreditCard size={16} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight">
                                    {canViewAllLoans
                                        ? 'Loan Applications (সকল ঋণ আবেদনসমূহ)'
                                        : 'Loan Applications (হেড অফিসে আসা ঋণ আবেদন)'}
                                </h1>
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200">
                                    মোট {stats.total || 0} টি
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            type="button"
                            onClick={handleTodayFilter}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all active:scale-95 shadow-2xs ${
                                isTodayFilter
                                    ? 'bg-blue-600 text-white border-blue-600 font-bold'
                                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                            title="আজকের আবেদনসমূহ (Today)"
                        >
                            <CalendarDays size={13} />
                            <span>Today (আজ)</span>
                        </button>

                        <Link
                            href="/head-office/process-loans"
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-all active:scale-95"
                        >
                            <UserCheck size={14} />
                            <span>Process Loans</span>
                        </Link>

                        <button
                            type="button"
                            onClick={handleExportExcel}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold transition-all active:scale-95 shadow-2xs"
                            title="XLSX এক্সেল ডাউনলোড"
                        >
                            <Download size={13} />
                            <span>Excel</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setShowPrintModal(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold transition-all active:scale-95 shadow-2xs"
                        >
                            <Printer size={13} />
                            <span>প্রিন্ট</span>
                        </button>

                        {isSuperAdmin && (
                            <button
                                type="button"
                                disabled={syncProcessing}
                                onClick={() => handleSyncMemberCodes(false)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 text-xs font-semibold transition-all active:scale-95 shadow-2xs disabled:opacity-60"
                                title="বর্তমান মেম্বার কোড সব ঋণ ফর্মে আপডেট করুন"
                            >
                                <RefreshCw size={13} className={syncProcessing ? 'animate-spin' : ''} />
                                <span>{syncProcessing ? 'সিঙ্ক হচ্ছে...' : 'মেম্বার কোড সিঙ্ক'}</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* ── 2. UNIFIED FILTER & STATUS CONTROL CARD ─────────────────────────── */}
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-3.5 space-y-3.5 print:hidden">
                    {/* Status Filter Cards in 1 Row with Micro Visual Progress & Icons */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-2">
                        {hoLoanStatCards.map((stat) => {
                            const active = stat.key === 'all' ? isAllStatus : statusFilter === stat.key;
                            const IconComponent = stat.icon;
                            const percentage = Math.min(100, Math.round((stat.count / (stats.total || 1)) * 100));

                            return (
                                <button
                                    key={stat.key}
                                    type="button"
                                    onClick={() => selectStatus(stat.key)}
                                    className={`relative p-2.5 rounded-2xl border text-left transition-all duration-150 active:scale-95 group overflow-hidden ${
                                        active
                                            ? `${stat.activeBg} shadow-md ring-2 ring-offset-1 ring-blue-500/40`
                                            : stat.highlight
                                            ? 'bg-gradient-to-b from-purple-50/90 to-white border-purple-300 hover:border-purple-400 hover:shadow-xs'
                                            : 'bg-white hover:bg-slate-50/90 border-slate-200/90 hover:border-slate-300 shadow-2xs'
                                    }`}
                                >
                                    {/* Top Row: Icon & Count */}
                                    <div className="flex items-center justify-between gap-1 mb-1.5">
                                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                                            active ? 'bg-white/20 text-white' : `${stat.iconBg} ${stat.iconColor}`
                                        }`}>
                                            <IconComponent size={14} className="stroke-[2.2]" />
                                        </div>
                                        <span className={`text-base font-black tracking-tight ${
                                            active ? 'text-white' : 'text-slate-900'
                                        }`}>
                                            {stat.count}
                                        </span>
                                    </div>

                                    {/* Middle: Label */}
                                    <span className={`text-[11px] font-bold truncate block ${
                                        active ? 'text-white/90' : 'text-slate-600'
                                    }`}>
                                        {stat.label}
                                    </span>

                                    {/* Visual Micro Progress Bar */}
                                    <div className="mt-1.5 w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-300 ${
                                                active ? 'bg-white' : `bg-gradient-to-r ${stat.barColor}`
                                            }`}
                                            style={{ width: `${stat.key === 'all' ? 100 : Math.max(8, percentage)}%` }}
                                        />
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Integrated Search & Filter Controls Toolbar */}
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
                        <div className="relative flex-grow min-w-[200px] max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') applyFilters(); }}
                                placeholder="সদস্য নং, নাম, মোবাইল, এনআইডি..."
                                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50 transition-all font-medium"
                            />
                        </div>

                        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1 rounded-xl">
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => { setDateFrom(e.target.value); applyFilters({ date_from: e.target.value }); }}
                                className="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none"
                                title="তারিখ হতে"
                            />
                            <span className="text-slate-400 text-xs font-bold">–</span>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => { setDateTo(e.target.value); applyFilters({ date_to: e.target.value }); }}
                                className="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none"
                                title="তারিখ পর্যন্ত"
                            />
                        </div>

                        <select
                            value={selectedZone}
                            onChange={(e) => { setSelectedZone(e.target.value); setSelectedArea(''); setSelectedBranch(''); applyFilters({ zone_id: e.target.value, area_id: '', branch_id: '' }); }}
                            className="px-2.5 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 font-medium"
                        >
                            <option value="">সকল জোন</option>
                            {zones.map((z) => (
                                <option key={z.id} value={z.id}>{z.name}</option>
                            ))}
                        </select>

                        <select
                            value={selectedArea}
                            onChange={(e) => { setSelectedArea(e.target.value); setSelectedBranch(''); applyFilters({ area_id: e.target.value, branch_id: '' }); }}
                            disabled={!selectedZone && filteredAreas.length === 0}
                            className="px-2.5 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 font-medium disabled:opacity-50"
                        >
                            <option value="">সকল আঞ্চলিক অফিস</option>
                            {filteredAreas.map((a) => (
                                <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                        </select>

                        <select
                            value={selectedBranch}
                            onChange={(e) => { setSelectedBranch(e.target.value); applyFilters({ branch_id: e.target.value }); }}
                            disabled={filteredBranches.length === 0}
                            className="px-2.5 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 font-medium disabled:opacity-50"
                        >
                            <option value="">সকল শাখা</option>
                            {filteredBranches.map((b) => (
                                <option key={b.id} value={b.id}>{formatBranchLabel(b)}</option>
                            ))}
                        </select>

                        <select
                            value={printedFilter}
                            onChange={(e) => { setPrintedFilter(e.target.value); applyFilters({ printed: e.target.value }); }}
                            className="px-2.5 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 font-medium"
                        >
                            <option value="">প্রিন্ট: সকল</option>
                            <option value="yes">প্রিন্ট সম্পন্ন</option>
                            <option value="no">প্রিন্ট হয়নি</option>
                        </select>

                        <select
                            value={hadIssues}
                            onChange={(e) => { setHadIssues(e.target.value); applyFilters({ had_issues: e.target.value }); }}
                            className="px-2.5 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 font-medium"
                        >
                            <option value="">সমস্যা: সকল</option>
                            <option value="yes">সমস্যা চিহ্নিত</option>
                            <option value="no">সমস্যামুক্ত</option>
                        </select>

                        <button
                            type="button"
                            onClick={() => applyFilters()}
                            className="px-4 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white rounded-xl transition shadow-2xs active:scale-95"
                        >
                            খুঁজুন
                        </button>

                        <button
                            type="button"
                            onClick={handleResetFilters}
                            className="px-3 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                        >
                            রিসেট
                        </button>
                    </div>
                </div>

                {/* Main Loans Table with AutoFit Container */}
                {isSuperAdmin && selectedIds.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                        <p className="text-sm text-rose-800 font-medium">{selectedIds.length} টি ঋণ আবেদন নির্বাচিত</p>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => setSelectedIds([])}
                                className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                                নির্বাচন সরান
                            </button>
                            <button
                                type="button"
                                disabled={syncProcessing}
                                onClick={() => handleSyncMemberCodes(true)}
                                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-sm disabled:opacity-60"
                            >
                                মেম্বার কোড সিঙ্ক
                            </button>
                            <button
                                type="button"
                                onClick={() => setDeleteIntent({ type: 'bulk' })}
                                className="px-4 py-2 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 shadow-sm"
                            >
                                নির্বাচিত মুছুন
                            </button>
                        </div>
                    </div>
                )}
                {loans.data.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center text-slate-500">
                        <FileText className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                        <h3 className="text-base font-bold text-slate-800">
                            {workQueue?.hint && !isAllStatus
                                ? 'এখন কোনো পেন্ডিং কাজ নেই। সব আবেদন দেখতে “সর্বমোট” চাপুন।'
                                : 'কোনো ঋণ আবেদন পাওয়া যায়নি'}
                        </h3>
                        <p className="text-xs mt-1 text-slate-500">নির্বাচিত ফিল্টার অনুযায়ী কোনো রেকর্ড নেই।</p>
                    </div>
                ) : (
                    <AutoFitTableContainer
                        minWidth={1150}
                        storageKey="ho_loan_applications_table"
                        title="ঋণ আবেদন তালিকা"
                        subtitle={`(পৃষ্ঠা ${loans.current_page || 1}/${loans.last_page || 1} · মোট ${loans.total || 0} টি)`}
                    >
                        <table className="w-full text-left border-collapse table-auto">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                                    {isSuperAdmin && (
                                        <th className="py-2.5 px-2 text-center w-8">
                                            <input
                                                type="checkbox"
                                                checked={allPageSelected}
                                                onChange={toggleSelectAllOnPage}
                                                className="h-3.5 w-3.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                                            />
                                        </th>
                                    )}
                                    <th className="py-2.5 px-2.5">সদস্য নং ও টাইপ</th>
                                    <th className="py-2.5 px-2.5">পণ্য ও ক্যাটাগরি</th>
                                    <th className="py-2.5 px-2.5">আবেদনকারী ও মোবাইল</th>
                                    <th className="py-2.5 px-2.5">পরিমাণ (টাকা)</th>
                                    <th className="py-2.5 px-2.5"> শাখা ও সমিতি</th>
                                    <th className="py-2.5 px-2.5">জমাদানের তারিখ</th>
                                    <th className="py-2.5 px-2.5 text-center">প্রিন্ট</th>
                                    <th className="py-2.5 px-2.5">স্ট্যাটাস</th>
                                    <th className="py-2.5 px-2.5 text-center">অ্যাকশন</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                                {loans.data.map((loan) => (
                                    <tr key={loan.id} className="hover:bg-slate-50/80 transition-colors">
                                        {isSuperAdmin && (
                                            <td className="py-2 px-2 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(loan.id)}
                                                    onChange={() => toggleSelect(loan.id)}
                                                    className="h-3.5 w-3.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                                                />
                                            </td>
                                        )}
                                        {/* Member No & Member Type */}
                                        <td className="py-2 px-2.5 whitespace-nowrap">
                                            <div className="font-mono font-bold text-blue-700 text-xs">
                                                {loan.member_admission?.application_no || '—'}
                                            </div>
                                            <div className="mt-0.5">
                                                {loan.member_admission?.is_legacy ? (
                                                    <span className="inline-flex items-center px-1.5 py-0.2 bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold rounded">
                                                        পুরাতন{loan.member_admission?.loan_dofa ? ` · দফা ${loan.member_admission?.loan_dofa}` : ''}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-1.5 py-0.2 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-semibold rounded">
                                                        নতুন সদস্য
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Product & Category */}
                                        <td className="py-2 px-2.5">
                                            <div className="font-semibold text-slate-800 leading-tight">
                                                {loan.loan_product?.product_name_bn || loan.loan_product?.product_name || '—'}
                                            </div>
                                            <div className="text-[10.5px] text-slate-500 mt-0.5">
                                                {loan.loan_category?.category_name_bn || loan.loan_category?.category_name || '—'}
                                            </div>
                                        </td>

                                        {/* Applicant & Mobile */}
                                        <td className="py-2 px-2.5">
                                            <div className="font-semibold text-slate-900 leading-tight">
                                                {loan.member_admission?.applicant_name_en || loan.member_admission?.applicant_name_bn || '—'}
                                            </div>
                                            {loan.member_admission?.mobile_number && (
                                                <div className="text-[10.5px] mt-0.5">
                                                    <PhoneCallLink
                                                        phone={loan.member_admission.mobile_number}
                                                        className="text-slate-600 font-mono"
                                                        iconClassName="w-3 h-3 text-blue-500"
                                                    />
                                                </div>
                                            )}
                                        </td>

                                        {/* Amounts */}
                                        <td className="py-2 px-2.5 whitespace-nowrap">
                                            <div className="font-bold text-slate-900 text-xs">
                                                ৳{Number(loan.requested_amount || 0).toLocaleString('bn-BD')}
                                            </div>
                                            {loan.approved_amount && (
                                                <div className="text-[10.5px] text-emerald-600 font-semibold mt-0.5">
                                                    অনুমোদিত: ৳{Number(loan.approved_amount).toLocaleString('bn-BD')}
                                                </div>
                                            )}
                                        </td>

                                        {/* Branch & Samity */}
                                        <td className="py-2 px-2.5">
                                            <div className="font-semibold text-slate-800 flex items-center gap-1 leading-tight">
                                                <Building2 className="w-3 h-3 text-indigo-500 shrink-0" />
                                                <span>{loan.branch?.name || '—'}</span>
                                            </div>
                                            <div className="text-[10.5px] text-slate-500 mt-0.5">{loan.samity?.samity_name || ''}</div>
                                        </td>

                                        {/* Date + time (AM/PM) */}
                                        <td className="py-2 px-2.5 text-slate-600 whitespace-nowrap text-[11px]">
                                            <div>{formatDate(loan.submitted_at || loan.created_at)}</div>
                                            {formatTime(loan.submitted_at || loan.created_at) && (
                                                <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                                                    {formatTime(loan.submitted_at || loan.created_at)}
                                                </div>
                                            )}
                                        </td>

                                        {/* Printed Status Indicator */}
                                        <td className="py-2 px-2 text-center whitespace-nowrap">
                                            {loan.printed_at ? (
                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold rounded">
                                                    <Check className="w-2.5 h-2.5" />
                                                    প্রিন্ট
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-1.5 py-0.5 bg-slate-100 text-slate-500 border border-slate-200 text-[10px] font-medium rounded">
                                                    হয়নি
                                                </span>
                                            )}
                                        </td>

                                        {/* Status */}
                                        <td className="py-2 px-2 whitespace-nowrap">
                                            {getStatusBadge(loan.status)}
                                        </td>

                                        {/* Actions */}
                                        <td className="py-2 px-2 text-center whitespace-nowrap">
                                            <div className="flex items-center justify-center gap-1">
                                                <Link
                                                    href={`/head-office/loans/${loan.id}`}
                                                    className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                                    title="বিস্তারিত দেখুন"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Link>

                                                {canModify && loan.status !== 'draft' && loan.status !== 'disbursed' && loan.status !== 'cancelled' && (
                                                    <button
                                                        onClick={() => openModificationModal(loan)}
                                                        className="p-1.5 text-slate-600 hover:text-white hover:bg-slate-800 rounded-lg transition"
                                                        title="Modification"
                                                    >
                                                        <Wrench className="w-4 h-4" />
                                                    </button>
                                                )}

                                                {loan.status === 'pending_head_office' && (
                                                    <Link
                                                        href="/head-office/process-loans"
                                                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition shadow-sm flex items-center gap-1"
                                                        title="প্রসেস করুন"
                                                    >
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                        প্রসেস
                                                    </Link>
                                                )}

                                                {isSuperAdmin && (
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
                    </AutoFitTableContainer>
                )}

                <ListPagination
                    meta={loans}
                    onPageChange={(page) => applyFilters({ page })}
                    onPerPageChange={(size) => applyFilters({ per_page: size, page: 1 })}
                />
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
            <HeadOfficeModificationModal
                open={!!modificationTarget}
                onClose={() => setModificationTarget(null)}
                entityType="loan"
                target={modificationTarget}
            />
            <SuperAdminDeletePinModal
                open={!!deleteIntent}
                title="ঋণ আবেদন মুছে ফেলুন"
                description={
                    deleteIntent?.type === 'bulk'
                        ? `নির্বাচিত ${selectedIds.length} টি ঋণ আবেদন মুছে ফেলতে PIN দিন।`
                        : `সদস্য নং ${deleteIntent?.type === 'single' ? deleteIntent.label : ''} মুছে ফেলতে PIN দিন।`
                }
                processing={deleteProcessing}
                onClose={() => setDeleteIntent(null)}
                onConfirm={confirmDeleteWithPin}
            />
        </AdminLayout>
    );
}
