import React, { useState, useEffect } from 'react';
import { Head, router, Link, usePage } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { formatDate, formatDateTime, todayIsoDate } from '@/utils/dateUtils';
import { Badge } from '@/components/ui/badge';
import {
    Search,
    Plus,
    Eye,
    Edit,
    Trash2,
    Send,
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
    Download,
    Layers,
    FileText,
    CheckCircle2,
    AlertTriangle,
} from 'lucide-react';
import { MemberAdmission } from '@/types/memberAdmission';
import ListPagination from '@/components/ListPagination';
import AutoFitTableContainer from '@/components/AutoFitTableContainer';
import { formatBranchLabel, keepListFilters, sortBranchesByCode } from '@/utils/branchLabel';
import SendAdmissionToHoModal, { HoAdmissionItem } from '@/components/MemberAdmission/SendAdmissionToHoModal';
import HoSendCutoffNotice from '@/components/HoSendCutoffNotice';
import { useHoSendCutoff } from '@/hooks/use-ho-send-cutoff';

interface ZoneOption {
    id: number;
    name: string;
    code?: string;
}

interface AreaOption {
    id: number;
    name: string;
    code?: string;
    zone_id: number;
}

interface BranchOption {
    id: number;
    name: string;
    code?: string;
    area_id: number;
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
    zones?: ZoneOption[];
    areas?: AreaOption[];
    branches?: BranchOption[];
    filters: {
        zone_id?: string;
        area_id?: string;
        branch_id?: string;
        status?: string;
        search?: string;
        from_date?: string;
        to_date?: string;
        per_page?: number | string;
    };
    stats: {
        total: number;
        draft: number;
        submitted: number;
        under_review: number;
        approved: number;
        rejected: number;
        needs_revision?: number;
        ready_for_head_office?: number;
        pending_head_office?: number;
        pending_my_approval?: number;
    };
    workQueue?: {
        default_status?: string | null;
        label?: string;
        hint?: string | null;
    };
}

export default function Index({ admissions, zones = [], areas = [], branches = [], filters, stats, workQueue }: Props) {
    const pageAuth = usePage().props.auth as { user?: { id?: number; role?: { name: string } } } | undefined;
    const roleName = pageAuth?.user?.role?.name?.toLowerCase() || '';
    // Only Branch User can send ready admissions to Head Office (not Branch Manager)
    const isBranchUser = roleName === 'branch_user';
    const hoSendCutoff = useHoSendCutoff();
    const isFieldOfficer = roleName === 'field_officer';
    const canCreateAdmission = isFieldOfficer || roleName === 'branch_manager';
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

    const canEditAdmission = (admission: MemberAdmission) =>
        admission.can_be_edited ??
        (admission.status === 'draft' || admission.status === 'rejected');

    const [selectedZone, setSelectedZone] = useState(filters?.zone_id ? String(filters.zone_id) : '');
    const [selectedArea, setSelectedArea] = useState(filters?.area_id ? String(filters.area_id) : '');
    const [selectedBranch, setSelectedBranch] = useState(filters?.branch_id ? String(filters.branch_id) : '');
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
    const [fromDate, setFromDate] = useState(filters.from_date || '');
    const [toDate, setToDate] = useState(filters.to_date || '');

    useEffect(() => {
        setSelectedZone(filters?.zone_id ? String(filters.zone_id) : '');
        setSelectedArea(filters?.area_id ? String(filters.area_id) : '');
        setSelectedBranch(filters?.branch_id ? String(filters.branch_id) : '');
        setFromDate(filters.from_date || '');
        setToDate(filters.to_date || '');
        setStatusFilter(filters.status || 'all');
    }, [filters?.zone_id, filters?.area_id, filters?.branch_id, filters.from_date, filters.to_date, filters.status]);

    const filteredAreas = useMemo(() => {
        if (!selectedZone) return areas;
        return areas.filter((a) => String(a.zone_id) === String(selectedZone));
    }, [areas, selectedZone]);

    const filteredBranches = useMemo(() => {
        let list = branches;
        if (selectedZone) {
            const areaIds = new Set(filteredAreas.map((a) => String(a.id)));
            list = list.filter((b) => areaIds.has(String(b.area_id)));
        }
        if (selectedArea) {
            list = list.filter((b) => String(b.area_id) === String(selectedArea));
        }
        return sortBranchesByCode(list);
    }, [branches, selectedZone, selectedArea, filteredAreas]);

    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showResubmitModal, setShowResubmitModal] = useState(false);
    const [showHoModal, setShowHoModal] = useState(false);
    const [hoModalItems, setHoModalItems] = useState<HoAdmissionItem[]>([]);
    const [isSendingToHo, setIsSendingToHo] = useState(false);
    const [selectedAdmission, setSelectedAdmission] = useState<MemberAdmission | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [revisionNote, setRevisionNote] = useState('');
    const [selectedHoIds, setSelectedHoIds] = useState<number[]>([]);

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

    const openSendSingleToHo = (admission: MemberAdmission) => {
        if (hoSendCutoff.is_blocked) return;
        setHoModalItems([
            {
                id: admission.id,
                application_no: admission.application_no,
                applicant_name: admission.applicant_name_bn || admission.applicant_name_en,
                branch_name: admission.branch?.name,
            },
        ]);
        setShowHoModal(true);
    };

    const openSendBulkToHo = () => {
        if (selectedHoIds.length === 0 || hoSendCutoff.is_blocked) return;
        const selectedAdmissions = admissions.data
            .filter((a) => selectedHoIds.includes(a.id))
            .map((a) => ({
                id: a.id,
                application_no: a.application_no,
                applicant_name: a.applicant_name_bn || a.applicant_name_en,
                branch_name: a.branch?.name,
            }));
        setHoModalItems(selectedAdmissions);
        setShowHoModal(true);
    };

    const handleConfirmSendToHo = () => {
        if (hoModalItems.length === 0 || isSendingToHo) return;
        setIsSendingToHo(true);

        if (hoModalItems.length === 1) {
            router.patch(
                `/member-admissions/${hoModalItems[0].id}/send-to-head-office`,
                {},
                {
                    ...keepListFilters,
                    onFinish: () => {
                        setIsSendingToHo(false);
                        setShowHoModal(false);
                        setHoModalItems([]);
                        setSelectedHoIds((prev) => prev.filter((id) => id !== hoModalItems[0].id));
                    },
                }
            );
        } else {
            const ids = hoModalItems.map((i) => i.id);
            router.post(
                '/member-admissions/send-to-head-office-bulk',
                { ids },
                {
                    ...keepListFilters,
                    onFinish: () => {
                        setIsSendingToHo(false);
                        setShowHoModal(false);
                        setHoModalItems([]);
                        setSelectedHoIds([]);
                    },
                }
            );
        }
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

    const today = todayIsoDate();
    const isTodayFilter = fromDate === today && toDate === today;

    const buildParams = (override: Record<string, string> = {}) => {
        const params: Record<string, string> = {};
        const z = override.zone_id !== undefined ? override.zone_id : selectedZone;
        const a = override.area_id !== undefined ? override.area_id : selectedArea;
        const b = override.branch_id !== undefined ? override.branch_id : selectedBranch;
        const s = override.search !== undefined ? override.search : searchQuery;
        const st = override.status !== undefined ? override.status : statusFilter;
        const fd = override.from_date !== undefined ? override.from_date : fromDate;
        const td = override.to_date !== undefined ? override.to_date : toDate;

        if (z) params.zone_id = z;
        if (a) params.area_id = a;
        if (b) params.branch_id = b;
        if (s) params.search = s;
        params.status = st || 'all';
        if (fd) params.from_date = fd;
        if (td) params.to_date = td;
        params.per_page = String(admissions.per_page || filters.per_page || 20);
        return params;
    };

    const handleLocationFilterChange = (zoneVal: string, areaVal: string, branchVal: string) => {
        setSelectedZone(zoneVal);
        setSelectedArea(areaVal);
        setSelectedBranch(branchVal);
        router.get('/member-admissions', buildParams({ zone_id: zoneVal, area_id: areaVal, branch_id: branchVal }), { preserveState: true });
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
        const next = status || 'all';
        setStatusFilter(next);
        router.get('/member-admissions', { ...buildParams(), status: next }, { preserveState: true });
    };

    const getEffectiveDate = (admission: MemberAdmission) => {
        return (admission as any).reviewed_at || admission.submitted_at || admission.created_at;
    };

    const handleExportExcel = () => {
        const params = new URLSearchParams(buildParams());
        window.location.href = `/member-admissions/export/excel?${params.toString()}`;
    };

    const handlePrint = () => {
        window.print();
    };

    const handleDelete = (id: number, applicationNo: string) => {
        if (confirm(`আবেদন নং ${applicationNo} মুছে ফেলতে চান?`)) {
            router.delete(`/member-admissions/${id}`, keepListFilters);
        }
    };

    const handleSubmit = (id: number, applicationNo: string, isLegacy?: boolean) => {
        const msg = isLegacy
            ? `আবেদন নং ${applicationNo} পুরাতন সদস্য — জমা দিলে স্বয়ংক্রিয়ভাবে অনুমোদিত হবে। চালিয়ে যাবেন?`
            : `আবেদন নং ${applicationNo} জমা দিতে চান?`;
        if (confirm(msg)) {
            router.patch(`/member-admissions/${id}/submit`, {}, keepListFilters);
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
                ...keepListFilters,
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
                ...keepListFilters,
                onSuccess: () => {
                    setShowRejectModal(false);
                    setSelectedAdmission(null);
                    setRejectionReason('');
                },
            }
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
        {
            label: 'HO তে পাঠান',
            count: stats.ready_for_head_office || 0,
            filter: 'ready_for_head_office',
            icon: Sparkles,
            iconColor: 'text-emerald-700',
            iconBg: 'bg-emerald-100',
            barColor: 'from-emerald-500 to-emerald-600',
            activeBg: 'bg-emerald-600 border-emerald-600 text-white',
            highlight: (stats.ready_for_head_office || 0) > 0,
        },
        {
            label: 'হেড অফিসে',
            count: stats.pending_head_office || 0,
            filter: 'pending_head_office',
            icon: Building2,
            iconColor: 'text-purple-600',
            iconBg: 'bg-purple-50',
            barColor: 'from-purple-500 to-purple-600',
            activeBg: 'bg-purple-600 border-purple-600 text-white',
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

    return (
        <AdminLayout>
            <Head title="সদস্য ভর্তি প্যানেল" />

            <div className="p-3 md:p-4 space-y-3 max-w-[1600px] mx-auto pb-16 print:block">
                {/* ── 1. SLIM PROFESSIONAL HEADER & TIMING WARNING ───────────────────── */}
                <div className="space-y-2.5 print:hidden">
                    {/* Compact Top Action Bar */}
                    <div className="bg-white px-4 py-3 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-slate-800 text-white flex items-center justify-center shadow-xs shrink-0">
                                <Users size={16} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight">
                                        সদস্য ভর্তি আবেদন তালিকা
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
                                <Calendar size={13} />
                                <span>Today (আজ)</span>
                            </button>

                            {canCreateAdmission && (
                                <Link
                                    href="/member-admissions/create"
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-2xs transition-all active:scale-95"
                                >
                                    <Plus size={14} />
                                    <span>নতুন ভর্তি আবেদন</span>
                                </Link>
                            )}

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
                                onClick={handlePrint}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold transition-all active:scale-95 shadow-2xs"
                            >
                                <Printer size={13} />
                                <span>প্রিন্ট</span>
                            </button>
                        </div>
                    </div>

                    {isBranchUser && (
                        <HoSendCutoffNotice kind="admission" />
                    )}
                </div>

                {/* ── 2. UNIFIED FILTER & STATUS CONTROL CARD ─────────────────────────── */}
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-3.5 space-y-3.5 print:hidden">
                    {/* Status Filter Cards in 1 Row with Micro Visual Progress & Icons */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
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
                                            ? 'bg-gradient-to-b from-emerald-50/90 to-white border-emerald-300 hover:border-emerald-400 hover:shadow-xs'
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

                    {/* Location, Search & Date Toolbar */}
                    <div className="pt-2.5 border-t border-slate-100 space-y-2.5">
                        {/* Zone / Area / Branch Filters for Approvers & Multi-branch users */}
                        {(zones.length > 0 || areas.length > 0 || branches.length > 0) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                {zones.length > 0 && (
                                    <div>
                                        <select
                                            value={selectedZone}
                                            onChange={(e) => handleLocationFilterChange(e.target.value, '', '')}
                                            className="h-8.5 w-full border border-slate-300 rounded-xl px-2.5 text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
                                        >
                                            <option value="">সকল জোন ({zones.length})</option>
                                            {zones.map((z) => (
                                                <option key={z.id} value={z.id}>
                                                    {z.name} {z.code ? `(${z.code})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {areas.length > 0 && (
                                    <div>
                                        <select
                                            value={selectedArea}
                                            onChange={(e) => handleLocationFilterChange(selectedZone, e.target.value, '')}
                                            className="h-8.5 w-full border border-slate-300 rounded-xl px-2.5 text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
                                        >
                                            <option value="">সকল অঞ্চল ({filteredAreas.length})</option>
                                            {filteredAreas.map((a) => (
                                                <option key={a.id} value={a.id}>
                                                    {a.name} {a.code ? `(${a.code})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {branches.length > 0 && (
                                    <div className="md:col-span-1 lg:col-span-2">
                                        <select
                                            value={selectedBranch}
                                            onChange={(e) => handleLocationFilterChange(selectedZone, selectedArea, e.target.value)}
                                            className="h-8.5 w-full border border-slate-300 rounded-xl px-2.5 text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
                                        >
                                            <option value="">সকল শাখা ({filteredBranches.length})</option>
                                            {filteredBranches.map((b) => (
                                                <option key={b.id} value={b.id}>
                                                    {formatBranchLabel(b)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Search & Date Controls */}
                        <form onSubmit={handleSearch} className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
                            {/* Search Input Box */}
                            <div className="relative flex-grow max-w-lg">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="সদস্য নাম্বার, নাম, মোবাইল, এনআইডি খুঁজুন..."
                                    className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50 transition-all font-medium"
                                />
                            </div>

                            {/* Date Range & Controls */}
                            <div className="flex flex-wrap items-center gap-2">
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
                                    className="px-4 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white rounded-xl transition shadow-2xs active:scale-95"
                                >
                                    খুঁজুন
                                </button>

                                {(searchQuery || statusFilter !== 'all' || fromDate || toDate || selectedZone || selectedArea || selectedBranch) && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearchQuery('');
                                            setStatusFilter('');
                                            setFromDate('');
                                            setToDate('');
                                            setSelectedZone('');
                                            setSelectedArea('');
                                            setSelectedBranch('');
                                            router.get('/member-admissions');
                                        }}
                                        className="px-3 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                                    >
                                        রিসেট
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    {/* Bulk Selection Notification Bar */}
                    {isBranchUser && readyForHoIds.length > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-purple-200 bg-purple-50/80 px-3 py-2 text-xs">
                            <p className="text-purple-950 font-medium">
                                শাখা অনুমোদিত: <strong className="font-bold text-purple-900">{readyForHoIds.length}</strong> টি · নির্বাচিত:{' '}
                                <strong className="font-bold text-purple-900">{selectedHoIds.length}</strong> টি
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={toggleSelectAllReady}
                                    className="rounded-lg border border-purple-300 bg-white px-2.5 py-1 text-xs font-bold text-purple-800 hover:bg-purple-100 shadow-2xs"
                                >
                                    {allReadySelected ? 'সব আনসিলেক্ট' : 'একবারে সব সিলেক্ট'}
                                </button>
                                <button
                                    type="button"
                                    onClick={openSendBulkToHo}
                                    disabled={selectedHoIds.length === 0 || isSendingToHo || hoSendCutoff.is_blocked}
                                    title={hoSendCutoff.is_blocked ? hoSendCutoff.blocked_message : undefined}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-40 px-3 py-1 text-xs font-bold text-white shadow-2xs transition active:scale-95"
                                >
                                    <Send className="w-3.5 h-3.5" />
                                    <span>{isSendingToHo ? 'পাঠানো হচ্ছে...' : `HO তে পাঠান (${selectedHoIds.length})`}</span>
                                </button>
                            </div>
                        </div>
                    )}
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
                                {workQueue?.hint && !isAllStatus
                                    ? 'এখন কোনো পেন্ডিং কাজ নেই। সব আবেদন দেখতে “সর্বমোট” চাপুন।'
                                    : 'কোনো ভর্তি আবেদন পাওয়া যায়নি'}
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
                                            <p className="font-semibold text-slate-600 mt-0.5">{formatDate(getEffectiveDate(admission))}</p>
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

                                        {canEditAdmission(admission) && (
                                            <Link
                                                href={`/member-admissions/${admission.id}/edit`}
                                                className="p-2 text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition"
                                                title="সম্পাদনা"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Link>
                                        )}
                                        {admission.status === 'draft' && (
                                            <button
                                                onClick={() => handleSubmit(admission.id, admission.application_no, admission.is_legacy)}
                                                className="p-2 text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition"
                                                title={admission.is_legacy ? 'সংরক্ষণ ও অটো অনুমোদন' : 'জমা দিন'}
                                            >
                                                <Send className="w-4 h-4" />
                                            </button>
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
                                                onClick={() => openSendSingleToHo(admission)}
                                                disabled={hoSendCutoff.is_blocked}
                                                className="p-2 text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
                                                title={hoSendCutoff.is_blocked ? hoSendCutoff.blocked_message : 'Head Office এ পাঠান'}
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
                    <div className="hidden md:block member-admission-index-table-wrap print:overflow-visible print:block">
                        <AutoFitTableContainer
                            minWidth={1150}
                            storageKey="member_admissions_table"
                            title="সদস্য ভর্তি আবেদন তালিকা"
                            subtitle={`(পৃষ্ঠা ${admissions.current_page || 1}/${admissions.last_page || 1} · মোট ${admissions.total || 0} টি)`}
                        >
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
                                                {workQueue?.hint && !isAllStatus
                                                    ? 'এখন কোনো পেন্ডিং কাজ নেই। সব আবেদন দেখতে “সর্বমোট” চাপুন।'
                                                    : 'কোনো ভর্তি আবেদন পাওয়া যায়নি'}
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
                                                    {formatDate(getEffectiveDate(admission))}
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

                                                        {canEditAdmission(admission) && (
                                                            <Link
                                                                href={`/member-admissions/${admission.id}/edit`}
                                                                className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                                                title="সম্পাদনা"
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                            </Link>
                                                        )}
                                                        {admission.status === 'draft' && (
                                                            <button
                                                                onClick={() => handleSubmit(admission.id, admission.application_no, admission.is_legacy)}
                                                                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                                title={admission.is_legacy ? 'সংরক্ষণ ও অটো অনুমোদন' : 'জমা দিন'}
                                                            >
                                                                <Send className="w-4 h-4" />
                                                            </button>
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
                                                                onClick={() => openSendSingleToHo(admission)}
                                                                disabled={hoSendCutoff.is_blocked}
                                                                className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                                                title={hoSendCutoff.is_blocked ? hoSendCutoff.blocked_message : 'Head Office এ পাঠান'}
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
                        </AutoFitTableContainer>
                    </div>

                    <ListPagination
                        meta={admissions}
                        onPageChange={(page) =>
                            router.get('/member-admissions', { ...buildParams(), page }, { preserveState: true, preserveScroll: true })
                        }
                        onPerPageChange={(size) =>
                            router.get(
                                '/member-admissions',
                                { ...buildParams(), per_page: size, page: 1 },
                                { preserveState: true, preserveScroll: true },
                            )
                        }
                    />
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

                {/* Head Office Dispatch Confirmation / Warning Modal */}
                <SendAdmissionToHoModal
                    isOpen={showHoModal}
                    onClose={() => {
                        if (!isSendingToHo) {
                            setShowHoModal(false);
                            setHoModalItems([]);
                        }
                    }}
                    onConfirm={handleConfirmSendToHo}
                    isLoading={isSendingToHo}
                    items={hoModalItems}
                    cutoffLabel={hoSendCutoff.label}
                    cutoffBadge={hoSendCutoff.badge}
                    isBlocked={hoSendCutoff.is_blocked}
                    blockedMessage={hoSendCutoff.blocked_message}
                />
            </div>
        </AdminLayout>
    );
}
