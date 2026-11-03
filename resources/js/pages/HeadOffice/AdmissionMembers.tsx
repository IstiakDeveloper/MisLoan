import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Head, router, Link, usePage } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { formatDate, formatTime, todayIsoDate } from '@/utils/dateUtils';
import {
    Search,
    Eye,
    Pencil,
    Calendar,
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
    ChevronDown,
    SlidersHorizontal,
    Smartphone,
    Check,
    Loader2,
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
        zone_id?: number | string;
        area_id?: number | string;
        branch_id?: number | string;
        date_from?: string;
        date_to?: string;
        had_issues?: string;
        printed?: string;
        member_type?: string;
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

export default function AdmissionMembers({
    admissions,
    filters,
    stats,
    zones,
    areas,
    branches,
    viewAllAdmissions = false,
    workQueue,
}: Props) {
    const { auth } = usePage().props as any;
    const roleName = (auth?.user?.role?.name || (typeof auth?.user?.role === 'string' ? auth?.user?.role : '')).toLowerCase();
    const isSuperAdmin = roleName === 'super_admin' || roleName === 'superadmin' || roleName === 'super admin';
    const isHeadOffice = roleName === 'head_office';
    const isCso = roleName === 'cso';
    const canDelete = (isSuperAdmin || isHeadOffice) && !isCso;
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
    const [appRegisteredMap, setAppRegisteredMap] = useState<Record<number, boolean>>({});
    const [togglingId, setTogglingId] = useState<number | null>(null);

    const handleToggleAppRegister = async (admission: MemberAdmission) => {
        const currentState = appRegisteredMap[admission.id] ?? Boolean(admission.is_app_registered);
        const newState = !currentState;

        setAppRegisteredMap((prev) => ({ ...prev, [admission.id]: newState }));
        setTogglingId(admission.id);

        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';
            const res = await fetch(`/member-admissions/${admission.id}/toggle-app-register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({ force_state: newState }),
            });

            const data = await res.json();
            if (!res.ok || !data.ok) {
                setAppRegisteredMap((prev) => ({ ...prev, [admission.id]: currentState }));
                if (data.message) {
                    alert(data.message);
                }
            }
        } catch {
            setAppRegisteredMap((prev) => ({ ...prev, [admission.id]: currentState }));
        } finally {
            setTogglingId(null);
        }
    };

    const today = todayIsoDate();
    // Default date filter removed: only populate if passed in filters
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');
    const isTodayFilter = dateFrom === today && dateTo === today;

    const [selectedZone, setSelectedZone] = useState(filters.zone_id?.toString() || '');
    const [selectedArea, setSelectedArea] = useState(filters.area_id?.toString() || '');
    const [selectedBranch, setSelectedBranch] = useState(filters.branch_id?.toString() || '');
    const [hadIssues, setHadIssues] = useState(filters.had_issues || '');
    const [printedFilter, setPrintedFilter] = useState(filters.printed || '');
    const [memberType, setMemberType] = useState(filters.member_type || '');

    // Advanced filters collapse state
    const hasInitialAdvancedFilters = Boolean(
        filters.zone_id ||
        filters.area_id ||
        filters.branch_id ||
        filters.had_issues ||
        filters.printed ||
        filters.member_type ||
        (filters.date_from && filters.date_from !== today) ||
        (filters.date_to && filters.date_to !== today)
    );
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(hasInitialAdvancedFilters);

    const searchInputRef = useRef<HTMLInputElement>(null);

    // Global keyboard shortcut: Ctrl+/ or Cmd+/ to focus search input
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === '/') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const [filteredAreas, setFilteredAreas] = useState<Area[]>(areas);
    const [filteredBranches, setFilteredBranches] = useState<Branch[]>(branches);

    useEffect(() => {
        setDateFrom(filters.date_from || '');
        setDateTo(filters.date_to || '');
        setStatusFilter(filters.status || 'all');
        setMemberType(filters.member_type || '');
    }, [filters.date_from, filters.date_to, filters.status, filters.member_type]);

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
        const variants: Record<string, { bg: string; text: string; dot: string; label: string }> = {
            draft: { bg: 'bg-slate-100 border-slate-200/80', text: 'text-slate-700', dot: 'bg-slate-400', label: 'খসড়া' },
            submitted: { bg: 'bg-blue-50 border-blue-200/80', text: 'text-blue-700', dot: 'bg-blue-500', label: 'জমা' },
            under_review: { bg: 'bg-amber-50 border-amber-200/80', text: 'text-amber-700', dot: 'bg-amber-500', label: 'পর্যালোচনায়' },
            ready_for_head_office: { bg: 'bg-emerald-50 border-emerald-200/80', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'শাখা অনুমোদিত' },
            pending_head_office: { bg: 'bg-purple-50 border-purple-200/80', text: 'text-purple-700', dot: 'bg-purple-500', label: 'হেড অফিসে' },
            approved: { bg: 'bg-green-50 border-green-200/80', text: 'text-green-700', dot: 'bg-green-600', label: 'অনুমোদিত' },
            rejected: { bg: 'bg-rose-50 border-rose-200/80', text: 'text-rose-700', dot: 'bg-rose-500', label: 'প্রত্যাখ্যাত' },
            needs_revision: { bg: 'bg-orange-50 border-orange-200/80', text: 'text-orange-700', dot: 'bg-orange-500', label: 'সংশোধন' },
        };
        const config = variants[status] || {
            bg: 'bg-slate-50 border-slate-200',
            text: 'text-slate-700',
            dot: 'bg-slate-400',
            label: status,
        };
        return (
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-semibold tracking-tight whitespace-nowrap ${config.bg} ${config.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`} />
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
        member_type: memberType,
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
        if (isTodayFilter) {
            setDateFrom('');
            setDateTo('');
            router.get('/head-office/admission-members', filterPayload({ date_from: '', date_to: '' }), { preserveState: true });
        } else {
            setDateFrom(today);
            setDateTo(today);
            router.get('/head-office/admission-members', filterPayload({ date_from: today, date_to: today }), { preserveState: true });
        }
    };

    const clearFilters = () => {
        setSearchQuery('');
        setStatusFilter('all');
        setSelectedZone('');
        setSelectedArea('');
        setSelectedBranch('');
        setDateFrom('');
        setDateTo('');
        setHadIssues('');
        setPrintedFilter('');
        setMemberType('');
        setShowAdvancedFilters(false);
        router.get('/head-office/admission-members', { status: 'all', per_page: admissions.per_page || 20 }, { preserveState: true });
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
        if (memberType) params.member_type = memberType;
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
        const params: Record<string, string> = { ...getPrintParams() };
        if (markAsPrintedCheckbox) {
            params.mark_as_printed = '1';
        }
        const printUrl = `/head-office/admission-members/print?${new URLSearchParams(params).toString()}`;
        window.open(printUrl, '_blank');
        if (markAsPrintedCheckbox) {
            let reloaded = false;
            const doReload = () => {
                if (!reloaded) {
                    reloaded = true;
                    router.reload(keepListFilters);
                    window.removeEventListener('focus', doReload);
                }
            };
            window.addEventListener('focus', doReload);
            setTimeout(doReload, 1200);
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

    const highlightMatch = (text?: string | null, query?: string) => {
        if (!text) return '–';
        if (!query || !query.trim()) return text;
        const cleanQ = query.trim();
        const str = String(text);
        const idx = str.toLowerCase().indexOf(cleanQ.toLowerCase());
        if (idx === -1) return str;
        const before = str.slice(0, idx);
        const match = str.slice(idx, idx + cleanQ.length);
        const after = str.slice(idx + cleanQ.length);
        return (
            <>
                {before}
                <mark className="bg-amber-200 text-amber-950 font-bold rounded px-0.5">{match}</mark>
                {after}
            </>
        );
    };

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
                      activeBg: 'bg-slate-800 border-slate-800 text-white',
                  },
                  {
                      label: 'জমাকৃত',
                      count: stats.submitted,
                      filter: 'submitted',
                      icon: Send,
                      iconColor: 'text-blue-600',
                      iconBg: 'bg-blue-50',
                      activeBg: 'bg-blue-600 border-blue-600 text-white',
                  },
                  {
                      label: 'পর্যালোচনা',
                      count: stats.under_review,
                      filter: 'under_review',
                      icon: Clock,
                      iconColor: 'text-amber-600',
                      iconBg: 'bg-amber-50',
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
            activeBg: 'bg-orange-500 border-orange-500 text-white',
        },
        {
            label: 'অনুমোদিত',
            count: stats.approved,
            filter: 'approved',
            icon: CheckCircle2,
            iconColor: 'text-teal-600',
            iconBg: 'bg-teal-50',
            activeBg: 'bg-teal-600 border-teal-600 text-white',
        },
        {
            label: 'প্রত্যাখ্যাত',
            count: stats.rejected,
            filter: 'rejected',
            icon: Ban,
            iconColor: 'text-rose-600',
            iconBg: 'bg-rose-50',
            activeBg: 'bg-rose-600 border-rose-600 text-white',
        },
    ].filter((stat, index, all) => all.findIndex((s) => s.filter === stat.filter) === index);

    // Active filters count for badge
    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (selectedZone) count++;
        if (selectedArea) count++;
        if (selectedBranch) count++;
        if (hadIssues) count++;
        if (printedFilter) count++;
        if (memberType) count++;
        if (dateFrom && !isTodayFilter) count++;
        if (dateTo && !isTodayFilter) count++;
        return count;
    }, [selectedZone, selectedArea, selectedBranch, hadIssues, printedFilter, memberType, dateFrom, dateTo, isTodayFilter]);

    const hasAnyActiveFilter = Boolean(
        searchQuery ||
        (!isAllStatus && statusFilter !== 'all') ||
        dateFrom ||
        dateTo ||
        selectedZone ||
        selectedArea ||
        selectedBranch ||
        hadIssues ||
        printedFilter ||
        memberType
    );

    const ActionButtons = ({ admission }: { admission: MemberAdmission }) => (
        <div className="flex items-center justify-end gap-0.5">
            <Link
                href={`/head-office/admissions/${admission.id}`}
                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                title="দেখুন"
            >
                <Eye size={14} />
            </Link>
            <Link
                href={`/member-admissions/${admission.id}/edit`}
                className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                title="সম্পাদনা"
            >
                <Pencil size={14} />
            </Link>
            {canModify && admission.status !== 'draft' && (
                <button
                    type="button"
                    onClick={() => openModificationModal(admission)}
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                    title="Modification"
                >
                    <Wrench size={14} />
                </button>
            )}
            {admission.status === 'approved' && (admission.revision_count ?? 0) > 0 && (
                <button
                    type="button"
                    onClick={() => openHistoryModal(admission)}
                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                    title="ইতিহাস"
                >
                    <FileText size={14} />
                </button>
            )}
            {canDelete && (
                <button
                    type="button"
                    onClick={() => handleDelete(admission.id, admission.application_no)}
                    className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                    title="মুছুন"
                >
                    <Trash2 size={14} />
                </button>
            )}
        </div>
    );

    return (
        <AdminLayout>
            <Head title="Admission Members (Head Office)" />

            <div className="p-3 sm:p-4 md:p-5 space-y-3 max-w-[1600px] mx-auto pb-24 print:p-0 print:pb-0">
                {/* ── 1. COMPACT PROFESSIONAL HEADER ───────────────────────────────────── */}
                <div className="bg-white px-4 py-2.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3 print:hidden">
                    {/* Title & Count */}
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs shrink-0">
                            <Building2 size={16} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                                    সদস্য ভর্তি আবেদন (Head Office)
                                </h1>
                                <span className="text-[11px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200/80">
                                    {admissions.total || 0} টি
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Action CTAs */}
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        {/* Today Shortcut Button */}
                        <button
                            type="button"
                            onClick={handleTodayFilter}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all active:scale-95 shadow-2xs ${
                                isTodayFilter
                                    ? 'bg-blue-600 text-white border-blue-600 font-bold'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                            title="আজকের ভর্তি আবেদনসমূহ (Today)"
                        >
                            <Calendar size={13} />
                            <span>আজ</span>
                        </button>

                        {/* Process Admissions */}
                        <Link
                            href="/head-office/process-admissions"
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-all active:scale-95"
                        >
                            <PlayCircle size={14} />
                            <span>Process Admissions</span>
                        </Link>

                        {/* Excel Export */}
                        <button
                            type="button"
                            onClick={handleExportExcel}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium transition-all active:scale-95 shadow-2xs"
                            title="XLSX এক্সেল ডাউনলোড"
                        >
                            <Download size={13} className="text-emerald-600" />
                            <span className="hidden sm:inline">Excel</span>
                        </button>

                        {/* Print */}
                        <button
                            type="button"
                            onClick={() => setShowPrintModal(true)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium transition-all active:scale-95 shadow-2xs"
                        >
                            <Printer size={13} className="text-slate-600" />
                            <span className="hidden sm:inline">প্রিন্ট</span>
                        </button>

                        {/* Recent Deletions Link */}
                        {canDelete && (
                            <Link
                                href="/head-office/recent-deletions?type=member_admission"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-medium transition-all active:scale-95 shadow-2xs"
                                title="বিগত ৭ দিনে মুছে ফেলা সদস্য ভর্তি তালিকা"
                            >
                                <Trash2 size={13} />
                                <span className="hidden md:inline">মুছে ফেলা ডাটা (৭ দিন)</span>
                            </Link>
                        )}
                    </div>
                </div>

                {/* ── 2. COMPACT STATUS FILTER MINI-CARDS ───────────────────────────── */}
                <div className="print:hidden">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-1.5 sm:gap-2">
                        {statCards.map((stat) => {
                            const isActive = statusFilter === stat.filter || (stat.filter === 'all' && isAllStatus);
                            const IconComponent = stat.icon;

                            return (
                                <button
                                    key={stat.filter}
                                    type="button"
                                    onClick={() => handleFilterChange(stat.filter)}
                                    className={`relative p-2 sm:p-2.5 rounded-xl border text-left transition-all duration-150 active:scale-95 group overflow-hidden ${
                                        isActive
                                            ? `${stat.activeBg} shadow-sm ring-2 ring-offset-1 ring-blue-500/30`
                                            : stat.highlight
                                            ? 'bg-gradient-to-b from-purple-50/90 to-white border-purple-300 hover:border-purple-400 hover:shadow-2xs'
                                            : 'bg-white hover:bg-slate-50 border-slate-200/90 hover:border-slate-300 shadow-2xs'
                                    }`}
                                >
                                    {/* Top Row: Mini Icon & Bold Count */}
                                    <div className="flex items-center justify-between gap-1 mb-1">
                                        <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                                            isActive ? 'bg-white/20 text-white' : `${stat.iconBg} ${stat.iconColor}`
                                        }`}>
                                            <IconComponent size={12} className="stroke-[2.2]" />
                                        </div>
                                        <span className={`text-sm sm:text-base font-extrabold tracking-tight ${
                                            isActive ? 'text-white' : 'text-slate-900'
                                        }`}>
                                            {stat.count}
                                        </span>
                                    </div>

                                    {/* Bottom Row: Label & Indicator */}
                                    <div className="flex items-center justify-between gap-1">
                                        <span className={`text-[10.5px] font-semibold truncate block ${
                                            isActive ? 'text-white/95 font-bold' : 'text-slate-600'
                                        }`}>
                                            {stat.label}
                                        </span>
                                        {stat.highlight && !isActive && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse shrink-0" />
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ── 3. UNIFIED OMNI-SEARCH & FILTER BAR ─────────────────────────────── */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-2.5 sm:p-3 space-y-2.5 print:hidden">
                    <form onSubmit={handleSearch} className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
                        {/* Search Input Box */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="সদস্য কোড (যেমন: 4040), নাম, মোবাইল অথবা এনআইডি খুঁজুন... (Ctrl + /)"
                                className="w-full pl-9 pr-9 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50 hover:bg-white focus:bg-white font-medium text-slate-800 shadow-2xs transition-all"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchQuery('');
                                        router.get('/head-office/admission-members', filterPayload({ search: '' }), { preserveState: true });
                                    }}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-500 hover:text-slate-800 flex items-center justify-center transition"
                                    title="সার্চ মুছুন"
                                >
                                    <X size={10} />
                                </button>
                            )}
                        </div>

                        {/* Controls Group */}
                        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                            {/* Search Submit */}
                            <button
                                type="submit"
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition shadow-2xs active:scale-95"
                            >
                                <Search size={13} />
                                <span>খুঁজুন</span>
                            </button>

                            {/* Advanced Filter Collapse Toggle */}
                            <button
                                type="button"
                                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition shadow-2xs active:scale-95 ${
                                    showAdvancedFilters || activeFiltersCount > 0
                                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                }`}
                            >
                                <SlidersHorizontal size={13} />
                                <span>ফিল্টার</span>
                                {activeFiltersCount > 0 && (
                                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                                        {activeFiltersCount}
                                    </span>
                                )}
                                <ChevronDown
                                    size={12}
                                    className={`transition-transform duration-200 ${showAdvancedFilters ? 'rotate-180' : ''}`}
                                />
                            </button>

                            {/* Global Reset Button */}
                            {hasAnyActiveFilter && (
                                <button
                                    type="button"
                                    onClick={clearFilters}
                                    className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition shadow-2xs"
                                    title="সব ফিল্টার রিসেট করুন"
                                >
                                    <RotateCcw size={12} />
                                    <span className="hidden sm:inline">রিসেট</span>
                                </button>
                            )}
                        </div>
                    </form>

                    {/* Collapsible Advanced Filters */}
                    {showAdvancedFilters && (
                        <div className="pt-2.5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 animate-in fade-in duration-150">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">জোন</label>
                                <select
                                    value={selectedZone}
                                    onChange={(e) => setSelectedZone(e.target.value)}
                                    className="h-8 w-full border border-slate-200 rounded-xl px-2.5 text-xs bg-slate-50/50 hover:bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">সকল জোন ({zones.length})</option>
                                    {zones.map((zone) => (
                                        <option key={zone.id} value={zone.id.toString()}>
                                            {zone.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">অঞ্চল</label>
                                <select
                                    value={selectedArea}
                                    onChange={(e) => setSelectedArea(e.target.value)}
                                    disabled={!selectedZone && filteredAreas.length === 0}
                                    className="h-8 w-full border border-slate-200 rounded-xl px-2.5 text-xs bg-slate-50/50 hover:bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                                >
                                    <option value="">সকল অঞ্চল</option>
                                    {filteredAreas.map((area) => (
                                        <option key={area.id} value={area.id.toString()}>
                                            {area.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">শাখা</label>
                                <select
                                    value={selectedBranch}
                                    onChange={(e) => setSelectedBranch(e.target.value)}
                                    disabled={!selectedZone && !selectedArea && filteredBranches.length === 0}
                                    className="h-8 w-full border border-slate-200 rounded-xl px-2.5 text-xs bg-slate-50/50 hover:bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                                >
                                    <option value="">সকল শাখা ({filteredBranches.length})</option>
                                    {filteredBranches.map((branch) => (
                                        <option key={branch.id} value={branch.id.toString()}>
                                            {formatBranchLabel(branch)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">সদস্য ধরন</label>
                                <select
                                    value={memberType}
                                    onChange={(e) => setMemberType(e.target.value)}
                                    className="h-8 w-full border border-slate-200 rounded-xl px-2.5 text-xs bg-slate-50/50 hover:bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">সকল ধরন</option>
                                    <option value="new">নতুন সদস্য</option>
                                    <option value="old">পুরাতন সদস্য</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">ইস্যু / প্রিন্ট</label>
                                <div className="grid grid-cols-2 gap-1">
                                    <select
                                        value={hadIssues}
                                        onChange={(e) => setHadIssues(e.target.value)}
                                        className="h-8 w-full border border-slate-200 rounded-xl px-1.5 text-[11px] bg-slate-50/50 hover:bg-white text-slate-800 focus:outline-none"
                                    >
                                        <option value="">ইস্যু: সব</option>
                                        <option value="yes">ইস্যু ছিল</option>
                                        <option value="no">সরাসরি</option>
                                    </select>
                                    <select
                                        value={printedFilter}
                                        onChange={(e) => setPrintedFilter(e.target.value)}
                                        className="h-8 w-full border border-slate-200 rounded-xl px-1.5 text-[11px] bg-slate-50/50 hover:bg-white text-slate-800 focus:outline-none"
                                    >
                                        <option value="">প্রিন্ট: সব</option>
                                        <option value="yes">প্রিন্ট</option>
                                        <option value="no">হয়নি</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">তারিখ সীমা</label>
                                <div className="flex items-center gap-1">
                                    <input
                                        type="date"
                                        value={dateFrom}
                                        onChange={(e) => setDateFrom(e.target.value)}
                                        className="h-8 w-1/2 border border-slate-200 rounded-xl px-2 text-[11px] bg-slate-50/50 hover:bg-white text-slate-700 focus:outline-none"
                                        title="তারিখ হতে"
                                    />
                                    <span className="text-slate-400 text-xs">–</span>
                                    <input
                                        type="date"
                                        value={dateTo}
                                        onChange={(e) => setDateTo(e.target.value)}
                                        className="h-8 w-1/2 border border-slate-200 rounded-xl px-2 text-[11px] bg-slate-50/50 hover:bg-white text-slate-700 focus:outline-none"
                                        title="তারিখ পর্যন্ত"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Active Search Highlight Strip */}
                    {filters.search && (
                        <div className="flex items-center justify-between px-3 py-1.5 bg-blue-50/80 border border-blue-200/70 rounded-xl text-xs text-blue-900 animate-in fade-in">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse shrink-0" />
                                <span>
                                    সার্চ ফিল্টার: <span className="font-mono font-bold text-blue-700 px-1.5 py-0.5 bg-white rounded-md border border-blue-200/80">"{filters.search}"</span>
                                    <span className="text-slate-500 ml-1.5 text-[11px] hidden sm:inline">(সর্বোচ্চ প্রাসঙ্গিক ও কাছাকাছি মিল শীর্ষে)</span>
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchQuery('');
                                    router.get('/head-office/admission-members', filterPayload({ search: '' }), { preserveState: true });
                                }}
                                className="text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-white px-2 py-0.5 rounded-md border border-blue-200 hover:bg-blue-50 transition shadow-2xs flex items-center gap-1 shrink-0"
                            >
                                <X size={11} />
                                <span>মুছুন</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* ── 4. MAIN DATA TABLE CONTAINER ────────────────────────────────────── */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
                    {/* Mobile cards */}
                    <div className="md:hidden divide-y divide-slate-100">
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
                                    <div key={admission.id} className="p-3.5 space-y-2.5 hover:bg-slate-50/50 transition-colors">
                                        <div className="flex items-start justify-between gap-2.5">
                                            <div className="flex items-start gap-2 min-w-0">
                                                {canDelete && (
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.includes(admission.id)}
                                                        onChange={() => toggleSelect(admission.id)}
                                                        className="mt-1 h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 shrink-0"
                                                    />
                                                )}
                                                <div>
                                                    <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                                        {highlightMatch(admission.application_no, filters.search)}
                                                    </span>
                                                    <h3 className="font-bold text-slate-900 text-xs mt-1">
                                                        {highlightMatch(admission.applicant_name_bn || admission.applicant_name_en, filters.search)}
                                                    </h3>
                                                    {admission.is_legacy && (
                                                        <span className="mt-0.5 inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-1.5 py-0.2 text-[9.5px] font-semibold text-amber-800">
                                                            পুরাতন{admission.loan_dofa ? ` · দফা ${admission.loan_dofa}` : ''}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="shrink-0">{getStatusBadge(admission.status)}</div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 text-xs">
                                            <div>
                                                <span className="text-[9.5px] font-bold uppercase text-slate-400 block">মোবাইল</span>
                                                <div className="font-semibold text-blue-600 flex items-center gap-1 mt-0.5">
                                                    <PhoneCallLink
                                                        phone={admission.mobile_number}
                                                        className="text-blue-600"
                                                        iconClassName="w-3 h-3 text-blue-500"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-[9.5px] font-bold uppercase text-slate-400 block">সমিতি ও শাখা</span>
                                                <p className="font-semibold text-slate-800 truncate mt-0.5">{admission.samity?.samity_name || '–'}</p>
                                                <p className="text-[10px] text-slate-500 truncate">{branch.name}</p>
                                            </div>
                                            <div>
                                                <span className="text-[9.5px] font-bold uppercase text-slate-400 block">তারিখ</span>
                                                <p className="font-semibold text-slate-700 mt-0.5">
                                                    {formatDate(admission.submitted_at || admission.created_at)}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-[9.5px] font-bold uppercase text-slate-400 block">পেন্ডিং</span>
                                                <p className="font-semibold text-indigo-700 truncate mt-0.5">
                                                    {admission.tracking_state?.label ?? '—'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* App Register Mobile Switch */}
                                        <div className="flex items-center justify-between px-2.5 py-1.5 bg-blue-50/40 rounded-xl border border-blue-100/70">
                                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                                                <Smartphone size={13} className="text-blue-600" />
                                                <span>অ্যাপ রেজিস্টার</span>
                                            </div>
                                            <button
                                                type="button"
                                                disabled={togglingId === admission.id}
                                                onClick={() => handleToggleAppRegister(admission)}
                                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                                    (appRegisteredMap[admission.id] ?? admission.is_app_registered)
                                                        ? 'bg-emerald-500 shadow-2xs hover:bg-emerald-600'
                                                        : 'bg-slate-300 hover:bg-slate-400'
                                                }`}
                                                title={
                                                    (appRegisteredMap[admission.id] ?? admission.is_app_registered)
                                                        ? 'অ্যাপ রেজিস্টার্ড (ক্লিক করে বাতিল করুন)'
                                                        : 'অ্যাপ রেজিস্টার করতে ক্লিক করুন'
                                                }
                                            >
                                                <span
                                                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out flex items-center justify-center text-[8px] ${
                                                        (appRegisteredMap[admission.id] ?? admission.is_app_registered)
                                                            ? 'translate-x-4 text-emerald-600'
                                                            : 'translate-x-0.5 text-slate-400'
                                                    }`}
                                                >
                                                    {togglingId === admission.id ? (
                                                        <Loader2 size={9} className="animate-spin text-slate-500" />
                                                    ) : (appRegisteredMap[admission.id] ?? admission.is_app_registered) ? (
                                                        <Check size={9} className="stroke-[3]" />
                                                    ) : null}
                                                </span>
                                            </button>
                                        </div>

                                        <div className="flex items-center justify-between pt-1">
                                            <div className="text-[10.5px] text-slate-500">
                                                {admission.printed_at ? (
                                                    <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                                                        <CheckCircle size={12} className="text-emerald-600" /> প্রিন্ট সম্পন্ন
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400">প্রিন্ট হয়নি</span>
                                                )}
                                            </div>
                                            <ActionButtons admission={admission} />
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Desktop table */}
                    <div className="hidden md:block">
                        <AutoFitTableContainer
                            minWidth={1100}
                            storageKey="ho_admission_members_table"
                            title="সদস্য ভর্তি আবেদন তালিকা (Head Office)"
                            subtitle={`(পৃষ্ঠা ${admissions.current_page || 1}/${admissions.last_page || 1} · মোট ${admissions.total || 0} টি)`}
                        >
                            <table className="w-full text-left border-collapse table-auto">
                                <thead>
                                    <tr className="bg-slate-50/90 border-b border-slate-200/90 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                        {canDelete && (
                                            <th className="py-3 px-3 text-center w-9">
                                                <input
                                                    type="checkbox"
                                                    checked={allPageSelected}
                                                    onChange={toggleSelectAllOnPage}
                                                    className="h-3.5 w-3.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                                                />
                                            </th>
                                        )}
                                        <th className="py-3 px-3 text-center w-12">#</th>
                                        <th className="py-3 px-3.5">সদস্য কোড</th>
                                        <th className="py-3 px-3.5">আবেদনকারী</th>
                                        <th className="py-3 px-3.5">মোবাইল</th>
                                        <th className="py-3 px-3.5">সমিতি ও শাখা</th>
                                        <th className="py-3 px-3.5">স্ট্যাটাস ও ট্র্যাকিং</th>
                                        <th className="py-3 px-3">তারিখ ও এন্ট্রি</th>
                                        <th className="py-3 px-2.5 text-center">অ্যাপ</th>
                                        <th className="py-3 px-2.5 text-center">প্রিন্ট</th>
                                        <th className="py-3 px-3.5 text-right">অ্যাকশন</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                    {admissions.data.length === 0 ? (
                                        <tr>
                                            <td colSpan={canDelete ? 11 : 10} className="py-12 text-center text-slate-400">
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
                                                    className="hover:bg-slate-50/70 transition-colors"
                                                >
                                                    {canDelete && (
                                                        <td className="py-2.5 px-3 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedIds.includes(admission.id)}
                                                                onChange={() => toggleSelect(admission.id)}
                                                                className="h-3.5 w-3.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                                                            />
                                                        </td>
                                                    )}

                                                    {/* Serial No */}
                                                    <td className="py-2.5 px-3 text-center font-bold text-slate-400 whitespace-nowrap text-[11px]">
                                                        {((admissions.current_page || 1) - 1) * (admissions.per_page || 15) + index + 1}
                                                    </td>

                                                    {/* Member Code */}
                                                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                                                        <span className="font-mono font-bold text-blue-700 bg-blue-50/90 border border-blue-200/70 px-2 py-0.5 rounded-md text-[11.5px] inline-block shadow-2xs">
                                                            {highlightMatch(admission.application_no, filters.search)}
                                                        </span>
                                                        {admission.is_legacy && (
                                                            <div className="mt-0.5">
                                                                <span className="inline-flex items-center px-1.5 py-0.2 bg-amber-50 border border-amber-200/80 text-amber-800 text-[9.5px] font-semibold rounded-full">
                                                                    পুরাতন{admission.loan_dofa ? ` · দফা ${admission.loan_dofa}` : ''}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Applicant Name */}
                                                    <td className="py-2.5 px-3.5">
                                                        <div className="font-bold text-slate-900 leading-tight">
                                                            {highlightMatch(admission.applicant_name_bn || admission.applicant_name_en, filters.search)}
                                                        </div>
                                                        {admission.applicant_name_bn && admission.applicant_name_en && (
                                                            <div className="text-[10.5px] text-slate-400 font-normal">
                                                                {highlightMatch(admission.applicant_name_en, filters.search)}
                                                            </div>
                                                        )}
                                                        {admission.member_category?.category_name && (
                                                            <span className="text-[10px] text-slate-500 font-medium">
                                                                {admission.member_category.category_name}
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* Mobile */}
                                                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                                                        <PhoneCallLink
                                                            phone={admission.mobile_number}
                                                            className="text-slate-700 font-medium hover:text-blue-600 transition"
                                                            iconClassName="w-3 h-3 text-blue-500 shrink-0"
                                                        />
                                                    </td>

                                                    {/* Unified Samity & Branch */}
                                                    <td className="py-2.5 px-3.5">
                                                        <div className="font-semibold text-slate-800 truncate max-w-[170px]" title={admission.samity?.samity_name}>
                                                            {admission.samity?.samity_name || '–'}
                                                        </div>
                                                        <div className="text-[10.5px] text-slate-500 flex items-center gap-1 truncate max-w-[170px] mt-0.5" title={branch.name}>
                                                            <Building2 size={10} className="shrink-0 text-slate-400" />
                                                            <span>{branch.name}</span>
                                                        </div>
                                                    </td>

                                                    {/* Unified Status & Tracking */}
                                                    <td className="py-2.5 px-3.5">
                                                        <div>{getStatusBadge(admission.status)}</div>
                                                        {admission.tracking_state?.label && (
                                                            <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                                                                <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0" />
                                                                <span className="truncate max-w-[140px]" title={admission.tracking_state.label}>
                                                                    {admission.tracking_state.label}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Date & Entry User */}
                                                    <td className="py-2.5 px-3 whitespace-nowrap">
                                                        <div className="font-semibold text-slate-800 text-[11px]">
                                                            {formatDate(admission.submitted_at || admission.created_at)}
                                                        </div>
                                                        {creatorName(admission) !== '—' && (
                                                            <div className="text-slate-400 text-[10px] truncate max-w-[120px]" title={`তৈরি করেছেন: ${creatorName(admission)}`}>
                                                                এন্ট্রি: {creatorName(admission)}
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Compact App Register Toggle (Super Admin / Head Office can toggle) */}
                                                    <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                                                        <button
                                                            type="button"
                                                            disabled={togglingId === admission.id}
                                                            onClick={() => handleToggleAppRegister(admission)}
                                                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                                                (appRegisteredMap[admission.id] ?? admission.is_app_registered)
                                                                    ? 'bg-emerald-500 shadow-2xs hover:bg-emerald-600'
                                                                    : 'bg-slate-200 hover:bg-slate-300'
                                                            }`}
                                                            title={
                                                                (appRegisteredMap[admission.id] ?? admission.is_app_registered)
                                                                    ? 'অ্যাপ রেজিস্টার্ড (ক্লিক করে বাতিল করুন)'
                                                                    : 'অ্যাপ রেজিস্টার করতে ক্লিক করুন'
                                                            }
                                                        >
                                                            <span
                                                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out flex items-center justify-center text-[8px] ${
                                                                    (appRegisteredMap[admission.id] ?? admission.is_app_registered)
                                                                        ? 'translate-x-4 text-emerald-600'
                                                                        : 'translate-x-0.5 text-slate-400'
                                                                }`}
                                                            >
                                                                {togglingId === admission.id ? (
                                                                    <Loader2 size={9} className="animate-spin text-slate-500" />
                                                                ) : (appRegisteredMap[admission.id] ?? admission.is_app_registered) ? (
                                                                    <Check size={9} className="stroke-[3]" />
                                                                ) : null}
                                                            </span>
                                                        </button>
                                                    </td>

                                                    {/* Print Status */}
                                                    <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                                                        {admission.printed_at ? (
                                                            <span className="inline-flex items-center gap-1 text-emerald-700 text-[10px] font-semibold bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded-md">
                                                                <CheckCircle className="w-3 h-3 text-emerald-600" />
                                                                প্রিন্ট
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 text-slate-400 text-[10px] bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded-md">
                                                                <Circle className="w-2.5 h-2.5" />
                                                                না
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
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

                    {/* Pagination */}
                    <ListPagination
                        meta={admissions}
                        onPageChange={goToPage}
                        onPerPageChange={changePerPage}
                    />
                </div>

                {/* ── 5. FLOATING BOTTOM BULK ACTION DOCK ──────────────────────────────── */}
                {canDelete && selectedIds.length > 0 && (
                    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-md text-white px-4 sm:px-5 py-2.5 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center gap-3 sm:gap-4 animate-in slide-in-from-bottom-5">
                        <div className="flex items-center gap-2 text-xs font-medium">
                            <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse shrink-0" />
                            <span>
                                নির্বাচিত: <strong className="font-bold text-rose-300">{selectedIds.length}</strong> টি
                            </span>
                        </div>
                        <div className="h-4 w-px bg-slate-700" />
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setSelectedIds([])}
                                className="px-2 py-1 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
                            >
                                নির্বাচন সরান
                            </button>
                            <button
                                type="button"
                                onClick={() => setDeleteIntent({ type: 'bulk' })}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition active:scale-95"
                            >
                                <Trash2 size={13} />
                                <span>নির্বাচিত মুছুন ({selectedIds.length})</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Print Modal */}
                {showPrintModal && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
                        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-100 space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <h3 className="text-lg font-bold text-slate-900">তালিকা প্রিন্ট</h3>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowPrintModal(false);
                                        setMarkAsPrintedCheckbox(false);
                                    }}
                                    className="p-1 rounded-full text-slate-400 hover:text-slate-600"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed">
                                বর্তমান ফিল্টার অনুযায়ী তালিকা প্রিন্ট করা হবে। প্রিন্টের পর নিচের চেকবক্স চিহ্নিত করলে এই
                                তালিকার সব রেকর্ড <strong>প্রিন্ট সম্পন্ন</strong> হিসেবে নোট থাকবে।
                            </p>
                            <label className="flex items-center gap-2.5 cursor-pointer p-3 bg-slate-50 rounded-xl border border-slate-200">
                                <input
                                    type="checkbox"
                                    checked={markAsPrintedCheckbox}
                                    onChange={(e) => setMarkAsPrintedCheckbox(e.target.checked)}
                                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                <span className="text-xs font-bold text-slate-700">প্রিন্ট সম্পন্ন হিসেবে চিহ্নিত করুন</span>
                            </label>
                            <div className="flex gap-2 justify-end pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowPrintModal(false);
                                        setMarkAsPrintedCheckbox(false);
                                    }}
                                    className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200"
                                >
                                    বাতিল
                                </button>
                                <button
                                    type="button"
                                    onClick={handlePrintConfirm}
                                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 flex items-center gap-1.5 shadow-xs"
                                >
                                    <Printer size={13} />
                                    <span>প্রিন্ট করুন</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* History Modal */}
                {showHistoryModal && selectedAdmission && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
                        <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100">
                            <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-3xl">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">Revision History</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {selectedAdmission.application_no} — {selectedAdmission.applicant_name_en || selectedAdmission.applicant_name_bn}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => { setShowHistoryModal(false); setSelectedAdmission(null); }}
                                    className="p-1 rounded-full text-slate-400 hover:text-slate-600"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-blue-600" />
                                        <span className="text-xs font-semibold text-slate-700">Total Revisions:</span>
                                        <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-bold">
                                            {selectedAdmission.revision_count || 0}
                                        </span>
                                    </div>
                                </div>
                                {selectedAdmission.revision_comments ? (
                                    <div className="space-y-2.5">
                                        {selectedAdmission.revision_comments.split('\n\n').map((comment, index) => {
                                            const isHeadOffice = comment.includes('Head Office') || comment.includes('Issue');
                                            const isBranch = comment.includes('Branch Revision Note');
                                            return (
                                                <div
                                                    key={index}
                                                    className={`p-3 rounded-2xl border text-xs leading-relaxed ${
                                                        isHeadOffice
                                                            ? 'bg-orange-50/70 border-orange-200 text-orange-950'
                                                            : isBranch
                                                            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                                                            : 'bg-slate-50 border-slate-200 text-slate-800'
                                                    }`}
                                                >
                                                    <p className="whitespace-pre-wrap">{comment.trim()}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-slate-400 text-xs">
                                        <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                                        <p>কোনো রিভিশন হিস্ট্রি পাওয়া যায়নি</p>
                                    </div>
                                )}
                            </div>
                            <div className="sticky bottom-0 bg-slate-50 border-t border-slate-100 px-6 py-3.5 flex justify-end rounded-b-3xl">
                                <button
                                    type="button"
                                    onClick={() => { setShowHistoryModal(false); setSelectedAdmission(null); }}
                                    className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition"
                                >
                                    বন্ধ করুন
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
                            ? `নির্বাচিত ${selectedIds.length} টি সদস্য ভর্তি মুছে ফেলতে আপনার লগইন পাসওয়ার্ড দিন। সংশ্লিষ্ট ঋণ আবেদনও মুছে যাবে।`
                            : `আবেদন নং ${deleteIntent?.type === 'single' ? deleteIntent.label : ''} মুছে ফেলতে আপনার লগইন পাসওয়ার্ড দিন।`
                    }
                    pinLabel="আপনার পাসওয়ার্ড (User Password)"
                    placeholder="লগইন পাসওয়ার্ড লিখুন"
                    processing={deleteProcessing}
                    onClose={() => setDeleteIntent(null)}
                    onConfirm={confirmDeleteWithPin}
                />
            </div>
        </AdminLayout>
    );
}
