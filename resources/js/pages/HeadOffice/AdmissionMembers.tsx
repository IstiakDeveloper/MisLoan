import React, { useState, useEffect } from 'react';
import { Head, router, Link, usePage } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { formatDate, formatTime } from '@/utils/dateUtils';
import {
    Search,
    Eye,
    Pencil,
    CalendarDays,
    Filter,
    PlayCircle,
    Trash2,
    FileText,
    X,
    Printer,
    CheckCircle,
    Circle,
    Users,
    Building2,
    Phone,
    MapPin,
    Download,
    Sparkles,
    Wrench,
    Layers,
    Send,
    Clock,
    UserCheck,
    RotateCcw,
    CheckCircle2,
    Ban,
} from 'lucide-react';
import { MemberAdmission } from '@/types/memberAdmission';
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
        pending_head_office: number;
        approved: number;
        rejected: number;
        needs_revision: number;
        pending_my_approval?: number;
    };
    zones: Zone[];
    areas: Area[];
    branches: Branch[];
    viewAllAdmissions?: boolean;
    workQueue?: {
        default_status?: string | null;
        label?: string;
        hint?: string | null;
    };
}

function creatorName(admission: MemberAdmission): string {
    if (admission.createdBy?.name) return admission.createdBy.name;
    if (typeof admission.created_by === 'object' && admission.created_by?.name) {
        return admission.created_by.name;
    }
    return '—';
}

function branchLabel(admission: MemberAdmission): { name: string; meta?: string } {
    const branch = admission.branch as
        | { name?: string; code?: string; area?: { name?: string; zone?: { name?: string } } }
        | undefined;
    if (!branch?.name) return { name: '—' };
    const area = branch.area?.name;
    const zone = branch.area?.zone?.name;
    const meta = [area, zone].filter(Boolean).join(' · ') || undefined;
    return { name: branch.name, meta };
}

export default function AdmissionMembers({ admissions, filters, stats, zones, areas, branches, viewAllAdmissions = false, workQueue }: Props) {
    const { auth } = usePage().props as any;
    const roleName = auth?.user?.role?.name || (typeof auth?.user?.role === 'string' ? auth?.user?.role : '');
    const isSuperAdmin = roleName === 'super_admin' || roleName === 'superadmin' || roleName === 'Super Admin';
    const canModify = useCanHeadOfficeModify();
    const canViewAllAdmissions = isSuperAdmin || !!auth?.user?.has_all_access || viewAllAdmissions;

    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedAdmission, setSelectedAdmission] = useState<MemberAdmission | null>(null);
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [modificationTarget, setModificationTarget] = useState<ModificationTarget | null>(null);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [deleteIntent, setDeleteIntent] = useState<{ type: 'single'; id: number; label: string } | { type: 'bulk' } | null>(null);
    const [deleteProcessing, setDeleteProcessing] = useState(false);
    const [markAsPrintedCheckbox, setMarkAsPrintedCheckbox] = useState(false);

    const today = new Date().toISOString().split('T')[0];
    const monthStart = `${today.slice(0, 7)}-01`;
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');
    const isTodayFilter = dateFrom === today && dateTo === today;

    const [selectedZone, setSelectedZone] = useState(filters.zone_id?.toString() || '');
    const [selectedArea, setSelectedArea] = useState(filters.area_id?.toString() || '');
    const [selectedBranch, setSelectedBranch] = useState(filters.branch_id?.toString() || '');
    const [hadIssues, setHadIssues] = useState(filters.had_issues || '');
    const [printedFilter, setPrintedFilter] = useState(filters.printed || '');

    const [filteredAreas, setFilteredAreas] = useState<Area[]>(areas);
    const [filteredBranches, setFilteredBranches] = useState<Branch[]>(branches);

    useEffect(() => {
        setDateFrom(filters.date_from || '');
        setDateTo(filters.date_to || '');
        setStatusFilter(filters.status || 'all');
    }, [filters.date_from, filters.date_to, filters.status]);

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

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { bg: string; text: string; label: string }> = {
            draft: { bg: 'bg-slate-100 border-slate-300', text: 'text-slate-700', label: 'খসড়া' },
            submitted: { bg: 'bg-sky-50 border-sky-300', text: 'text-sky-800', label: 'জমা' },
            under_review: { bg: 'bg-amber-50 border-amber-300', text: 'text-amber-800', label: 'পর্যালোচনায়' },
            ready_for_head_office: { bg: 'bg-cyan-50 border-cyan-300', text: 'text-cyan-800', label: 'শাখা অনুমোদিত' },
            pending_head_office: { bg: 'bg-blue-50 border-blue-400', text: 'text-blue-800', label: 'হেড অফিসে' },
            approved: { bg: 'bg-emerald-50 border-emerald-300', text: 'text-emerald-800', label: 'অনুমোদিত' },
            rejected: { bg: 'bg-rose-50 border-rose-300', text: 'text-rose-800', label: 'প্রত্যাখ্যাত' },
            needs_revision: { bg: 'bg-orange-50 border-orange-300', text: 'text-orange-800', label: 'সংশোধন' },
        };
        const config = variants[status] || {
            bg: 'bg-slate-100 border-slate-300',
            text: 'text-slate-700',
            label: status,
        };
        return (
            <span
                className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-semibold whitespace-nowrap ${config.bg} ${config.text}`}
            >
                {config.label}
            </span>
        );
    };

    const filterPayload = (overrides: Record<string, string> = {}) => ({
        search: searchQuery,
        status: statusFilter || 'all',
        zone_id: selectedZone,
        area_id: selectedArea,
        branch_id: selectedBranch,
        date_from: dateFrom,
        date_to: dateTo,
        had_issues: hadIssues,
        printed: printedFilter,
        per_page: String(admissions.per_page || filters.per_page || 20),
        ...overrides,
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/head-office/admission-members', filterPayload(), { preserveState: true });
    };

    const handleFilterChange = (status: string) => {
        const next = status || 'all';
        setStatusFilter(next);
        router.get('/head-office/admission-members', filterPayload({ status: next }), { preserveState: true });
    };

    const handleTodayFilter = () => {
        setDateFrom(today);
        setDateTo(today);
        router.get(
            '/head-office/admission-members',
            filterPayload({ date_from: today, date_to: today }),
            { preserveState: true }
        );
    };

    const clearFilters = () => {
        setSearchQuery('');
        setStatusFilter(workQueue?.default_status || 'all');
        setSelectedZone('');
        setSelectedArea('');
        setSelectedBranch('');
        setDateFrom('');
        setDateTo('');
        setHadIssues('');
        setPrintedFilter('');
        router.get(
            '/head-office/admission-members',
            {},
            { preserveState: true }
        );
    };

    const getPrintParams = () => {
        const params: Record<string, string> = {};
        if (searchQuery) params.search = searchQuery;
        if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
        else params.status = 'all';
        if (selectedZone) params.zone_id = selectedZone;
        if (selectedArea) params.area_id = selectedArea;
        if (selectedBranch) params.branch_id = selectedBranch;
        if (dateFrom) params.date_from = dateFrom;
        if (dateTo) params.date_to = dateTo;
        if (hadIssues) params.had_issues = hadIssues;
        if (printedFilter) params.printed = printedFilter;
        return params;
    };

    const goToPage = (page: number) => {
        router.get('/head-office/admission-members', filterPayload({ page: String(page) }), {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const changePerPage = (size: number) => {
        router.get(
            '/head-office/admission-members',
            filterPayload({ per_page: String(size), page: '1' }),
            { preserveState: true, preserveScroll: true },
        );
    };

    const handlePrintConfirm = () => {
        const params = getPrintParams();
        window.open(`/head-office/admission-members/print?${new URLSearchParams(params).toString()}`, '_blank');
        if (markAsPrintedCheckbox) {
            router.post('/head-office/admission-members/mark-printed', params, keepListFilters);
        }
        setShowPrintModal(false);
        setMarkAsPrintedCheckbox(false);
    };

    const handleExportExcel = () => {
        const params = new URLSearchParams(getPrintParams());
        window.location.href = `/head-office/admission-members/export?${params.toString()}`;
    };

    const handleDelete = (id: number, applicationNo: string) => {
        setDeleteIntent({ type: 'single', id, label: applicationNo });
    };

    const toggleSelect = (id: number) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    const pageIds = admissions.data.map((a) => a.id);
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
        const url = isBulk ? '/head-office/admissions/bulk' : `/head-office/admissions/${deleteIntent.id}`;
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

    const openHistoryModal = (admission: MemberAdmission) => {
        setSelectedAdmission(admission);
        setShowHistoryModal(true);
    };

    const openModificationModal = (admission: MemberAdmission) => {
        setModificationTarget({
            id: admission.id,
            applicationNo: admission.application_no,
            applicantName: admission.applicant_name_bn || admission.applicant_name_en,
            status: admission.status,
            isLegacy: !!admission.is_legacy,
            loanDofa: admission.loan_dofa,
        });
    };

    const hasActiveFilters =
        searchQuery ||
        (statusFilter && statusFilter !== 'all' && statusFilter !== (workQueue?.default_status || '')) ||
        selectedZone ||
        selectedArea ||
        selectedBranch ||
        hadIssues ||
        printedFilter ||
        dateFrom ||
        dateTo;

    const defaultStatus = workQueue?.default_status || '';
    const isAllStatus = statusFilter === 'all' || statusFilter === '';
    const statCards = [
        ...(defaultStatus
            ? [{
                label: workQueue?.label || 'আমার কাজ',
                count: (stats as Record<string, number>)[defaultStatus] || 0,
                filter: defaultStatus,
                icon: UserCheck,
                iconColor: 'text-indigo-600',
                iconBg: 'bg-indigo-50',
                barColor: 'from-indigo-500 to-indigo-600',
                activeBg: 'bg-indigo-600 border-indigo-600 text-white',
                highlight: true,
            }]
            : []),
        {
            label: 'সর্বমোট',
            count: stats.total,
            filter: 'all',
            icon: Layers,
            iconColor: 'text-slate-700',
            iconBg: 'bg-slate-100',
            barColor: 'from-slate-600 to-slate-800',
            activeBg: 'bg-slate-900 border-slate-900 text-white',
        },
        ...(canViewAllAdmissions
            ? [
                  {
                      label: 'খসড়া',
                      count: stats.draft,
                      filter: 'draft',
                      icon: FileText,
                      iconColor: 'text-slate-600',
                      iconBg: 'bg-slate-100',
                      barColor: 'from-slate-400 to-slate-500',
                      activeBg: 'bg-slate-800 border-slate-800 text-white',
                  },
                  {
                      label: 'জমাকৃত',
                      count: stats.submitted,
                      filter: 'submitted',
                      icon: Send,
                      iconColor: 'text-blue-600',
                      iconBg: 'bg-blue-50',
                      barColor: 'from-blue-500 to-blue-600',
                      activeBg: 'bg-blue-600 border-blue-600 text-white',
                  },
                  {
                      label: 'পর্যালোচনা',
                      count: stats.under_review,
                      filter: 'under_review',
                      icon: Clock,
                      iconColor: 'text-amber-600',
                      iconBg: 'bg-amber-50',
                      barColor: 'from-amber-400 to-amber-500',
                      activeBg: 'bg-amber-500 border-amber-500 text-white',
                  },
              ]
            : []),
        {
            label: 'হেড অফিসে',
            count: stats.pending_head_office,
            filter: 'pending_head_office',
            icon: Building2,
            iconColor: 'text-purple-600',
            iconBg: 'bg-purple-50',
            barColor: 'from-purple-500 to-purple-600',
            activeBg: 'bg-purple-600 border-purple-600 text-white',
            highlight: stats.pending_head_office > 0,
        },
        {
            label: 'সংশোধন',
            count: stats.needs_revision || 0,
            filter: 'needs_revision',
            icon: RotateCcw,
            iconColor: 'text-orange-600',
            iconBg: 'bg-orange-50',
            barColor: 'from-orange-500 to-orange-600',
            activeBg: 'bg-orange-500 border-orange-500 text-white',
        },
        {
            label: 'অনুমোদিত',
            count: stats.approved,
            filter: 'approved',
            icon: CheckCircle2,
            iconColor: 'text-teal-600',
            iconBg: 'bg-teal-50',
            barColor: 'from-teal-500 to-teal-600',
            activeBg: 'bg-teal-600 border-teal-600 text-white',
        },
        {
            label: 'প্রত্যাখ্যাত',
            count: stats.rejected,
            filter: 'rejected',
            icon: Ban,
            iconColor: 'text-rose-600',
            iconBg: 'bg-rose-50',
            barColor: 'from-rose-500 to-rose-600',
            activeBg: 'bg-rose-600 border-rose-600 text-white',
        },
    ].filter((stat, index, all) => all.findIndex((s) => s.filter === stat.filter) === index);

    const ActionButtons = ({ admission }: { admission: MemberAdmission }) => (
        <div className="flex items-center justify-end gap-1">
            <a
                href={`/head-office/admissions/${admission.id}`}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-200 hover:border-blue-600 rounded-md transition"
                title="দেখুন"
            >
                <Eye className="w-4 h-4" />
            </a>
            <Link
                href={`/member-admissions/${admission.id}/edit`}
                className="p-1.5 text-sky-700 hover:text-white hover:bg-sky-600 border border-sky-200 hover:border-sky-600 rounded-md transition"
                title="সম্পাদনা"
            >
                <Pencil className="w-4 h-4" />
            </Link>
            {canModify && admission.status !== 'draft' && (
                <button
                    onClick={() => openModificationModal(admission)}
                    className="p-1.5 text-slate-700 hover:text-white hover:bg-slate-800 border border-slate-200 hover:border-slate-800 rounded-md transition"
                    title="Modification"
                >
                    <Wrench className="w-4 h-4" />
                </button>
            )}
            {admission.status === 'approved' && (admission.revision_count ?? 0) > 0 && (
                <button
                    onClick={() => openHistoryModal(admission)}
                    className="p-1.5 text-blue-700 hover:text-white hover:bg-blue-700 border border-blue-200 hover:border-blue-700 rounded-md transition"
                    title="ইতিহাস"
                >
                    <FileText className="w-4 h-4" />
                </button>
            )}
            {isSuperAdmin && (
                    <button
                        onClick={() => handleDelete(admission.id, admission.application_no)}
                        className="p-1.5 text-rose-500 hover:text-white hover:bg-rose-600 border border-rose-200 hover:border-rose-600 rounded-md transition"
                        title="মুছুন"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
            )}
        </div>
    );

    return (
        <AdminLayout>
            <Head title="Admission Members" />

            <div className="p-3 md:p-4 space-y-3 max-w-[1600px] mx-auto pb-16 print:block">
                {/* ── 1. SLIM PROFESSIONAL HEADER ───────────────────────────────────── */}
                <div className="bg-white px-4 py-3 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3 print:hidden">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-slate-800 text-white flex items-center justify-center shadow-xs shrink-0">
                            <Building2 size={16} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight">
                                    সদস্য ভর্তি তালিকা (Head Office)
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
                            title="আজকের ভর্তি আবেদনসমূহ (Today)"
                        >
                            <CalendarDays size={13} />
                            <span>Today (আজ)</span>
                        </button>

                        <Link
                            href="/head-office/process-admissions"
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-all active:scale-95"
                        >
                            <PlayCircle size={14} />
                            <span>Process Admissions</span>
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
                    </div>
                </div>

                {/* ── 2. UNIFIED FILTER & STATUS CONTROL CARD ─────────────────────────── */}
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-3.5 space-y-3.5 print:hidden">
                    {/* Status Filter Cards in 1 Row with Micro Visual Progress & Icons */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-2">
                        {statCards.map((stat) => {
                            const isActive = statusFilter === stat.filter || (stat.filter === 'all' && isAllStatus);
                            const IconComponent = stat.icon;
                            const percentage = Math.min(100, Math.round((stat.count / (stats.total || 1)) * 100));

                            return (
                                <button
                                    key={stat.label}
                                    type="button"
                                    onClick={() => handleFilterChange(stat.filter)}
                                    className={`relative p-2.5 rounded-2xl border text-left transition-all duration-150 active:scale-95 group overflow-hidden ${
                                        isActive
                                            ? `${stat.activeBg} shadow-md ring-2 ring-offset-1 ring-blue-500/40`
                                            : stat.highlight
                                            ? 'bg-gradient-to-b from-purple-50/90 to-white border-purple-300 hover:border-purple-400 hover:shadow-xs'
                                            : 'bg-white hover:bg-slate-50/90 border-slate-200/90 hover:border-slate-300 shadow-2xs'
                                    }`}
                                >
                                    {/* Top Row: Icon & Count */}
                                    <div className="flex items-center justify-between gap-1 mb-1.5">
                                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                                            isActive ? 'bg-white/20 text-white' : `${stat.iconBg} ${stat.iconColor}`
                                        }`}>
                                            <IconComponent size={14} className="stroke-[2.2]" />
                                        </div>
                                        <span className={`text-base font-black tracking-tight ${
                                            isActive ? 'text-white' : 'text-slate-900'
                                        }`}>
                                            {stat.count}
                                        </span>
                                    </div>

                                    {/* Middle: Label */}
                                    <span className={`text-[11px] font-bold truncate block ${
                                        isActive ? 'text-white/90' : 'text-slate-600'
                                    }`}>
                                        {stat.label}
                                    </span>

                                    {/* Visual Micro Progress Bar */}
                                    <div className="mt-1.5 w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-300 ${
                                                isActive ? 'bg-white' : `bg-gradient-to-r ${stat.barColor}`
                                            }`}
                                            style={{ width: `${stat.filter === 'all' ? 100 : Math.max(8, percentage)}%` }}
                                        />
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Integrated Search & Filter Controls Toolbar */}
                    <form onSubmit={handleSearch} className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
                        <div className="relative flex-grow min-w-[200px] max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="সদস্য নাম্বার, নাম, মোবাইল, এনআইডি..."
                                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50 transition-all font-medium"
                            />
                        </div>

                        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1 rounded-xl">
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none"
                                title="তারিখ হতে"
                            />
                            <span className="text-slate-400 text-xs font-bold">–</span>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none"
                                title="তারিখ পর্যন্ত"
                            />
                        </div>

                        <select
                            value={selectedZone}
                            onChange={(e) => setSelectedZone(e.target.value)}
                            className="px-2.5 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 font-medium"
                        >
                            <option value="">সব জোন</option>
                            {zones.map((zone) => (
                                <option key={zone.id} value={zone.id.toString()}>
                                    {zone.name}
                                </option>
                            ))}
                        </select>

                        <select
                            value={selectedArea}
                            onChange={(e) => setSelectedArea(e.target.value)}
                            disabled={!selectedZone && filteredAreas.length === 0}
                            className="px-2.5 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 font-medium disabled:opacity-50"
                        >
                            <option value="">সব এলাকা</option>
                            {filteredAreas.map((area) => (
                                <option key={area.id} value={area.id.toString()}>
                                    {area.name}
                                </option>
                            ))}
                        </select>

                        <select
                            value={selectedBranch}
                            onChange={(e) => setSelectedBranch(e.target.value)}
                            disabled={!selectedZone && !selectedArea && filteredBranches.length === 0}
                            className="px-2.5 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 font-medium disabled:opacity-50"
                        >
                            <option value="">সব শাখা</option>
                            {filteredBranches.map((branch) => (
                                <option key={branch.id} value={branch.id.toString()}>
                                    {formatBranchLabel(branch)}
                                </option>
                            ))}
                        </select>

                        <select
                            value={hadIssues}
                            onChange={(e) => setHadIssues(e.target.value)}
                            className="px-2.5 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 font-medium"
                        >
                            <option value="">ইস্যু: সব</option>
                            <option value="yes">ইস্যু ছিল</option>
                            <option value="no">সরাসরি অনুমোদিত</option>
                        </select>

                        <select
                            value={printedFilter}
                            onChange={(e) => setPrintedFilter(e.target.value)}
                            className="px-2.5 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 font-medium"
                        >
                            <option value="">প্রিন্ট: সব</option>
                            <option value="yes">প্রিন্ট সম্পন্ন</option>
                            <option value="no">প্রিন্ট হয়নি</option>
                        </select>

                        <button
                            type="submit"
                            className="px-4 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white rounded-xl transition shadow-2xs active:scale-95"
                        >
                            খুঁজুন
                        </button>

                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="px-3 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                            >
                                রিসেট
                            </button>
                        )}
                    </form>
                </div>

                {isSuperAdmin && selectedIds.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                        <p className="text-sm text-rose-800 font-medium">{selectedIds.length} টি আবেদন নির্বাচিত</p>
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
                                onClick={() => setDeleteIntent({ type: 'bulk' })}
                                className="px-4 py-2 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 shadow-sm"
                            >
                                নির্বাচিত মুছুন
                            </button>
                        </div>
                    </div>
                )}

                {/* List */}
                <div className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden">
                    {/* Mobile cards */}
                    <div className="md:hidden divide-y divide-blue-100">
                        {admissions.data.length === 0 ? (
                            <div className="p-12 text-center text-slate-400 text-sm">
                                {workQueue?.hint && !isAllStatus
                                    ? 'এখন কোনো পেন্ডিং কাজ নেই। সব আবেদন দেখতে “সর্বমোট” চাপুন।'
                                    : 'কোনো ভর্তি আবেদন পাওয়া যায়নি'}
                            </div>
                        ) : (
                            admissions.data.map((admission) => {
                                const branch = branchLabel(admission);
                                return (
                                    <div key={admission.id} className="p-4 space-y-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-start gap-2 min-w-0">
                                                {isSuperAdmin && (
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.includes(admission.id)}
                                                        onChange={() => toggleSelect(admission.id)}
                                                        className="mt-1 h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                                                    />
                                                )}
                                            <div>
                                                <span className="text-xs font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                                                    {admission.application_no}
                                                </span>
                                                <h3 className="font-semibold text-slate-900 text-sm mt-1.5">
                                                    {admission.applicant_name_bn || admission.applicant_name_en}
                                                </h3>
                                                {admission.applicant_name_bn && admission.applicant_name_en && (
                                                    <p className="text-xs text-slate-500">{admission.applicant_name_en}</p>
                                                )}
                                            </div>
                                            </div>
                                            {getStatusBadge(admission.status)}
                                        </div>
                                        <div className="grid grid-cols-2 gap-2.5 bg-blue-50/50 p-3 rounded-lg border border-blue-100 text-xs">
                                            <div>
                                                <span className="text-[10px] font-semibold uppercase text-blue-400 block">মোবাইল</span>
                                                <div className="font-medium text-slate-800 flex items-center gap-1 mt-0.5">
                                                    <PhoneCallLink
                                                        phone={admission.mobile_number}
                                                        className="text-slate-800"
                                                        iconClassName="w-3 h-3 text-blue-400"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-semibold uppercase text-blue-400 block">শাখা</span>
                                                <p className="font-medium text-slate-800 truncate mt-0.5 flex items-center gap-1">
                                                    <Building2 className="w-3 h-3 text-blue-400 shrink-0" />
                                                    {branch.name}
                                                </p>
                                                {branch.meta && (
                                                    <p className="text-[10px] text-slate-400 truncate">{branch.meta}</p>
                                                )}
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-semibold uppercase text-blue-400 block">সমিতি</span>
                                                <p className="font-medium text-slate-800 truncate mt-0.5">
                                                    {admission.samity?.samity_name || '—'}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-semibold uppercase text-blue-400 block">জমাদানের তারিখ</span>
                                                <p className="font-bold text-slate-800 mt-0.5">
                                                    {formatDate(admission.submitted_at || admission.created_at)}
                                                </p>
                                                {formatTime(admission.submitted_at || admission.created_at) && (
                                                    <p className="text-[10px] text-slate-500 font-medium">
                                                        {formatTime(admission.submitted_at || admission.created_at)}
                                                    </p>
                                                )}
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-semibold uppercase text-blue-400 block">তৈরি করেছেন</span>
                                                <p className="font-medium text-slate-800 truncate mt-0.5">{creatorName(admission)}</p>
                                            </div>
                                            <div className="col-span-2 border-t border-blue-100 pt-1.5 mt-0.5 flex items-center justify-between gap-2">
                                                <span className="text-[10px] font-semibold uppercase text-blue-400 flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" /> কার কাছে পেন্ডিং
                                                </span>
                                                <span className="font-semibold text-blue-800 bg-white border border-blue-200 px-2 py-0.5 rounded-md text-[11px]">
                                                    {admission.tracking_state?.label ?? '—'}
                                                </span>
                                            </div>
                                        </div>
                                        <ActionButtons admission={admission} />
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Desktop table with auto-fit zoom scaling */}
                    <div className="hidden md:block">
                        <AutoFitTableContainer
                            minWidth={1200}
                            storageKey="ho_admission_members_table"
                            title="সদস্য ভর্তি আবেদন তালিকা"
                            subtitle={`(পৃষ্ঠা ${admissions.current_page || 1}/${admissions.last_page || 1} · মোট ${admissions.total || 0} টি)`}
                        >
                            <table className="w-full text-left border-collapse table-auto">
                                <thead>
                                    <tr className="bg-gradient-to-r from-blue-700 to-blue-600 text-[11px] font-semibold text-white uppercase tracking-wide">
                                        {isSuperAdmin && (
                                            <th className="py-2.5 px-2 border-b border-blue-500 text-center w-8">
                                                <input
                                                    type="checkbox"
                                                    checked={allPageSelected}
                                                    onChange={toggleSelectAllOnPage}
                                                    className="h-3.5 w-3.5 rounded border-blue-300 text-rose-600 focus:ring-rose-500"
                                                />
                                            </th>
                                        )}
                                        <th className="py-2.5 px-2.5 border-b border-blue-500 text-center w-10">ক্রমিক</th>
                                        <th className="py-2.5 px-2.5 border-b border-blue-500">আবেদন নং ও টাইপ</th>
                                        <th className="py-2.5 px-2.5 border-b border-blue-500">আবেদনকারী ও মোবাইল</th>
                                        <th className="py-2.5 px-2.5 border-b border-blue-500">শাখা ও সমিতি</th>
                                        <th className="py-2.5 px-2.5 border-b border-blue-500">জমাদানের তারিখ</th>
                                        <th className="py-2.5 px-2.5 border-b border-blue-500">স্ট্যাটাস</th>
                                        <th className="py-2.5 px-2.5 border-b border-blue-500">পেন্ডিং অবস্থান</th>
                                        <th className="py-2.5 px-2.5 border-b border-blue-500 text-center">প্রিন্ট</th>
                                        <th className="py-2.5 px-2.5 border-b border-blue-500 text-center">অ্যাকশন</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {admissions.data.length === 0 ? (
                                        <tr>
                                            <td colSpan={isSuperAdmin ? 10 : 9} className="py-12 text-center text-slate-400 border-b border-blue-100">
                                                {workQueue?.hint && !isAllStatus
                                                    ? 'এখন কোনো পেন্ডিং কাজ নেই। সব আবেদন দেখতে “সর্বমোট” চাপুন।'
                                                    : 'কোনো ভর্তি আবেদন পাওয়া যায়নি'}
                                            </td>
                                        </tr>
                                    ) : (
                                        admissions.data.map((admission, index) => {
                                            const branch = branchLabel(admission);
                                            return (
                                                <tr
                                                    key={admission.id}
                                                    className={`text-xs border-b border-blue-100/70 hover:bg-blue-50/70 transition-colors ${
                                                        index % 2 === 1 ? 'bg-sky-50/30' : 'bg-white'
                                                    }`}
                                                >
                                                    {isSuperAdmin && (
                                                        <td className="py-2 px-2 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedIds.includes(admission.id)}
                                                                onChange={() => toggleSelect(admission.id)}
                                                                className="h-3.5 w-3.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                                                            />
                                                        </td>
                                                    )}
                                                    {/* Serial No */}
                                                    <td className="py-2 px-2 text-center font-bold text-slate-500 text-[11px] whitespace-nowrap">
                                                        {((admissions.current_page || 1) - 1) * (admissions.per_page || 15) + index + 1}
                                                    </td>

                                                    {/* App No & Member Type */}
                                                    <td className="py-2 px-2.5 whitespace-nowrap">
                                                        <div className="font-mono font-bold text-blue-700 text-xs">
                                                            {admission.application_no}
                                                        </div>
                                                        <div className="mt-0.5">
                                                            {admission.is_legacy ? (
                                                                <span className="inline-flex items-center px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[10px] font-semibold rounded">
                                                                    পুরাতন{admission.loan_dofa ? ` · দফা ${admission.loan_dofa}` : ''}
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] font-semibold rounded">
                                                                    নতুন সদস্য
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Applicant Name & Mobile */}
                                                    <td className="py-2 px-2.5">
                                                        <div className="font-bold text-slate-900 leading-tight">
                                                            {admission.applicant_name_bn || admission.applicant_name_en}
                                                        </div>
                                                        <div className="font-mono text-slate-600 text-[11px] flex items-center gap-1 mt-0.5">
                                                            <PhoneCallLink
                                                                phone={admission.mobile_number}
                                                                className="text-slate-700"
                                                                iconClassName="w-3 h-3 text-blue-500 shrink-0"
                                                            />
                                                        </div>
                                                        {admission.member_category?.category_name && (
                                                            <div className="text-[10px] text-blue-500 font-medium mt-0.5">
                                                                {admission.member_category.category_name}
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Branch & Samity */}
                                                    <td className="py-2 px-2.5">
                                                        <div className="font-semibold text-slate-800 flex items-center gap-1 leading-tight">
                                                            <Building2 className="w-3 h-3 text-blue-500 shrink-0" />
                                                            <span>{branch.name}</span>
                                                        </div>
                                                        <div className="text-[11px] text-slate-600 mt-0.5">
                                                            {admission.samity?.samity_name || '—'}
                                                        </div>
                                                        {branch.meta && (
                                                            <div className="text-[10px] text-slate-400 truncate max-w-[130px]">{branch.meta}</div>
                                                        )}
                                                    </td>

                                                    {/* Submission Date + time (AM/PM) */}
                                                    <td className="py-2 px-2.5 whitespace-nowrap">
                                                        <div className="font-bold text-slate-800 text-xs">
                                                            {formatDate(admission.submitted_at || admission.created_at)}
                                                        </div>
                                                        {formatTime(admission.submitted_at || admission.created_at) && (
                                                            <div className="text-slate-500 text-[10px] font-medium mt-0.5">
                                                                {formatTime(admission.submitted_at || admission.created_at)}
                                                            </div>
                                                        )}
                                                        {creatorName(admission) !== '—' && (
                                                            <div className="text-slate-400 text-[10px] mt-0.5" title="তৈরি করেছেন">
                                                                এন্ট্রি: {creatorName(admission)}
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Status */}
                                                    <td className="py-2 px-2 whitespace-nowrap">
                                                        {getStatusBadge(admission.status)}
                                                    </td>

                                                    {/* Pending Position */}
                                                    <td className="py-2 px-2 whitespace-nowrap">
                                                        <span className="inline-flex items-center gap-1 font-semibold text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md text-[10.5px]">
                                                            <MapPin className="w-3 h-3 shrink-0 text-blue-500" />
                                                            {admission.tracking_state?.label ?? '—'}
                                                        </span>
                                                    </td>

                                                    {/* Print Status */}
                                                    <td className="py-2 px-2 text-center whitespace-nowrap">
                                                        {admission.printed_at ? (
                                                            <span className="inline-flex items-center gap-1 text-emerald-700 text-[10.5px] font-semibold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                                                <CheckCircle className="w-3 h-3 text-emerald-600" />
                                                                প্রিন্ট
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 text-slate-400 text-[10.5px] bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">
                                                                <Circle className="w-2.5 h-2.5" />
                                                                হয়নি
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="py-2 px-2 text-center whitespace-nowrap">
                                                        <ActionButtons admission={admission} />
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </AutoFitTableContainer>
                    </div>

                    <ListPagination
                        meta={admissions}
                        onPageChange={goToPage}
                        onPerPageChange={changePerPage}
                    />
                </div>

                {/* Print Modal */}
                {showPrintModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
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
                                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200"
                                >
                                    বাতিল
                                </button>
                                <button
                                    type="button"
                                    onClick={handlePrintConfirm}
                                    className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 flex items-center gap-1"
                                >
                                    <Printer className="w-4 h-4" />
                                    প্রিন্ট
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* History Modal */}
                {showHistoryModal && selectedAdmission && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">Revision History</h3>
                                    <p className="text-sm text-slate-600">
                                        {selectedAdmission.application_no} — {selectedAdmission.applicant_name_en}
                                    </p>
                                </div>
                                <button onClick={() => { setShowHistoryModal(false); setSelectedAdmission(null); }} className="p-2 hover:bg-slate-100 rounded-full">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-blue-600" />
                                        <span className="text-sm font-medium text-slate-700">Total Revisions:</span>
                                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                                            {selectedAdmission.revision_count}
                                        </span>
                                    </div>
                                </div>
                                {selectedAdmission.revision_comments ? (
                                    <div className="border border-blue-200 bg-blue-50 rounded-xl p-4 space-y-3">
                                        {selectedAdmission.revision_comments.split('\n\n').map((comment, index) => {
                                            const isHeadOffice = comment.includes('Head Office') || comment.includes('Issue');
                                            const isBranch = comment.includes('Branch Revision Note');
                                            return (
                                                <div
                                                    key={index}
                                                    className={`p-3 rounded-lg border ${
                                                        isHeadOffice
                                                            ? 'bg-orange-50 border-orange-200'
                                                            : isBranch
                                                              ? 'bg-emerald-50 border-emerald-200'
                                                              : 'bg-white border-slate-200'
                                                    }`}
                                                >
                                                    <p className="text-sm whitespace-pre-wrap text-slate-800">{comment.trim()}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-slate-500">
                                        <FileText className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                                        <p>No revision history available</p>
                                    </div>
                                )}
                            </div>
                            <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end rounded-b-2xl">
                                <button
                                    onClick={() => { setShowHistoryModal(false); setSelectedAdmission(null); }}
                                    className="px-6 py-2 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <HeadOfficeModificationModal
                    open={!!modificationTarget}
                    onClose={() => setModificationTarget(null)}
                    entityType="admission"
                    target={modificationTarget}
                />
                <SuperAdminDeletePinModal
                    open={!!deleteIntent}
                    title="সদস্য ভর্তি মুছে ফেলুন"
                    description={
                        deleteIntent?.type === 'bulk'
                            ? `নির্বাচিত ${selectedIds.length} টি সদস্য ভর্তি মুছে ফেলতে PIN দিন। সংশ্লিষ্ট ঋণ আবেদনও মুছে যাবে।`
                            : `আবেদন নং ${deleteIntent?.type === 'single' ? deleteIntent.label : ''} মুছে ফেলতে PIN দিন।`
                    }
                    processing={deleteProcessing}
                    onClose={() => setDeleteIntent(null)}
                    onConfirm={confirmDeleteWithPin}
                />
            </div>
        </AdminLayout>
    );
}
