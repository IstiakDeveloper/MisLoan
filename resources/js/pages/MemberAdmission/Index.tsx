import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Head, router, Link, usePage } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { formatDate, formatDateTime, todayIsoDate } from '@/utils/dateUtils';
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
    Smartphone,
    Loader2,
    Check,
    ChevronDown,
    SlidersHorizontal,
    MapPin,
} from 'lucide-react';
import NewAppRegisterModal from '@/components/MemberAdmission/NewAppRegisterModal';
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
        member_type?: string;
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
    const pageAuth = usePage().props.auth as { user?: { id?: number; role?: { name: string }; branch_id?: number; has_all_access?: boolean } } | undefined;
    const roleName = pageAuth?.user?.role?.name?.toLowerCase() || '';
    const isSuperAdmin = roleName === 'super_admin' || roleName === 'superadmin' || roleName === 'super admin' || Boolean(pageAuth?.user?.has_all_access);
    const isHeadOffice = roleName === 'head_office';
    const canDeactivateApp = isSuperAdmin || isHeadOffice;
    // Only Branch User can send ready admissions to Head Office (not Branch Manager)
    const isBranchUser = roleName === 'branch_user';
    const hoSendCutoff = useHoSendCutoff();
    const isFieldOfficer = roleName === 'field_officer';
    const canCreateAdmission = isFieldOfficer || roleName === 'branch_manager';
    const currentUserId = pageAuth?.user?.id;

    const canApplyLoan = (admission: MemberAdmission) => {
        if (admission.status === 'rejected') return false;
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
    const [memberType, setMemberType] = useState(filters.member_type || '');

    const today = todayIsoDate();
    const isTodayFilter = fromDate === today && toDate === today;

    // Advanced filters collapse toggle
    const hasInitialAdvancedFilters = Boolean(
        filters.zone_id ||
        filters.area_id ||
        filters.branch_id ||
        filters.member_type ||
        (filters.from_date && filters.from_date !== today) ||
        (filters.to_date && filters.to_date !== today)
    );
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(hasInitialAdvancedFilters);

    const [appRegisterModalOpen, setAppRegisterModalOpen] = useState(false);
    const [appRegisteredMap, setAppRegisteredMap] = useState<Record<number, boolean>>({});
    const [togglingId, setTogglingId] = useState<number | null>(null);

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

    const handleToggleAppRegister = async (admission: MemberAdmission) => {
        const currentState = appRegisteredMap[admission.id] ?? Boolean(admission.is_app_registered);
        const newState = !currentState;

        // Restriction: Once active, regular users cannot turn it OFF (only Super Admin / Head Office can)
        if (currentState && !newState && !canDeactivateApp) {
            alert('একবার অ্যাপ রেজিস্টার সক্রিয় হলে হেড অফিস বা সুপার অ্যাডমিন ছাড়া বন্ধ বা পরিবর্তন করা যাবে না।');
            return;
        }

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

    useEffect(() => {
        setSelectedZone(filters?.zone_id ? String(filters.zone_id) : '');
        setSelectedArea(filters?.area_id ? String(filters.area_id) : '');
        setSelectedBranch(filters?.branch_id ? String(filters.branch_id) : '');
        setFromDate(filters.from_date || '');
        setToDate(filters.to_date || '');
        setStatusFilter(filters.status || 'all');
        setMemberType(filters.member_type || '');
    }, [filters?.zone_id, filters?.area_id, filters?.branch_id, filters.from_date, filters.to_date, filters.status, filters.member_type]);

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
            draft: { bg: 'bg-slate-100 border-slate-200/80', text: 'text-slate-700', dot: 'bg-slate-400', label: 'খসড়া' },
            submitted: { bg: 'bg-blue-50 border-blue-200/80', text: 'text-blue-700', dot: 'bg-blue-500', label: 'জমা' },
            under_review: { bg: 'bg-amber-50 border-amber-200/80', text: 'text-amber-700', dot: 'bg-amber-500', label: 'পর্যালোচনায়' },
            ready_for_head_office: { bg: 'bg-emerald-50 border-emerald-200/80', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'শাখা অনুমোদিত' },
            pending_head_office: { bg: 'bg-purple-50 border-purple-200/80', text: 'text-purple-700', dot: 'bg-purple-500', label: 'হেড অফিসে' },
            approved: { bg: 'bg-green-50 border-green-200/80', text: 'text-green-700', dot: 'bg-green-600', label: 'অনুমোদিত' },
            rejected: { bg: 'bg-rose-50 border-rose-200/80', text: 'text-rose-700', dot: 'bg-rose-500', label: 'প্রত্যাখ্যাত' },
            needs_revision: { bg: 'bg-orange-50 border-orange-200/80', text: 'text-orange-700', dot: 'bg-orange-500', label: 'সংশোধন' },
        };

        const config = variants[status] || { bg: 'bg-slate-50 border-slate-200', text: 'text-slate-700', dot: 'bg-slate-400', label: status };
        return (
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-semibold tracking-tight whitespace-nowrap ${config.bg} ${config.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`} />
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
        const loanNo = admission.existing_loan_form?.application_no;
        return (
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-semibold tracking-tight ${
                isDisbursed
                    ? 'bg-rose-50 border-rose-200/80 text-rose-700'
                    : 'bg-amber-50 border-amber-200/80 text-amber-700'
            }`}>
                <span className={`w-1 h-1 rounded-full ${isDisbursed ? 'bg-rose-500' : 'bg-amber-500'}`} />
                Loan: {loanNo || 'বিদ্যমান'}
            </span>
        );
    };

    const buildParams = (override: Record<string, string> = {}) => {
        const params: Record<string, string> = {};
        const z = override.zone_id !== undefined ? override.zone_id : selectedZone;
        const a = override.area_id !== undefined ? override.area_id : selectedArea;
        const b = override.branch_id !== undefined ? override.branch_id : selectedBranch;
        const s = override.search !== undefined ? override.search : searchQuery;
        const st = override.status !== undefined ? override.status : statusFilter;
        const fd = override.from_date !== undefined ? override.from_date : fromDate;
        const td = override.to_date !== undefined ? override.to_date : toDate;
        const mt = override.member_type !== undefined ? override.member_type : memberType;

        if (z) params.zone_id = z;
        if (a) params.area_id = a;
        if (b) params.branch_id = b;
        if (s) params.search = s;
        params.status = st || 'all';
        if (fd) params.from_date = fd;
        if (td) params.to_date = td;
        if (mt) params.member_type = mt;
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
        if (isTodayFilter) {
            setFromDate('');
            setToDate('');
            router.get('/member-admissions', buildParams({ from_date: '', to_date: '' }), { preserveState: true });
        } else {
            setFromDate(today);
            setToDate(today);
            router.get('/member-admissions', { ...buildParams(), from_date: today, to_date: today }, { preserveState: true });
        }
    };

    const handleMemberTypeChange = (val: string) => {
        setMemberType(val);
        router.get('/member-admissions', buildParams({ member_type: val }), { preserveState: true });
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

    const handleResetAll = () => {
        setSearchQuery('');
        setStatusFilter('all');
        setFromDate('');
        setToDate('');
        setSelectedZone('');
        setSelectedArea('');
        setSelectedBranch('');
        setMemberType('');
        setShowAdvancedFilters(false);
        router.get('/member-admissions', { per_page: admissions.per_page || 20, status: 'all' }, { preserveState: true });
    };

    const getEffectiveDate = (admission: MemberAdmission) => {
        return (admission as any).reviewed_at || admission.submitted_at || admission.created_at;
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

    const handleExportExcel = () => {
        const params = new URLSearchParams(buildParams());
        window.location.href = `/member-admissions/export/excel?${params.toString()}`;
    };

    const handlePrint = () => {
        window.print();
    };

    const handleDelete = (id: number, applicationNo: string, isAppRegistered?: boolean) => {
        if (isAppRegistered && !canDeactivateApp) {
            alert('অ্যাপ রেজিস্টার সম্পন্ন সদস্য মুছে ফেলার অনুমতি শুধুমাত্র হেড অফিস ও সুপার অ্যাডমিনের আছে।');
            return;
        }
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
        {
            label: 'HO তে পাঠান',
            count: stats.ready_for_head_office || 0,
            filter: 'ready_for_head_office',
            icon: Sparkles,
            iconColor: 'text-emerald-700',
            iconBg: 'bg-emerald-100',
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
            activeBg: 'bg-purple-600 border-purple-600 text-white',
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
        if (memberType) count++;
        if (fromDate && !isTodayFilter) count++;
        if (toDate && !isTodayFilter) count++;
        return count;
    }, [selectedZone, selectedArea, selectedBranch, memberType, fromDate, toDate, isTodayFilter]);

    const hasAnyActiveFilter = Boolean(
        searchQuery ||
        (!isAllStatus && statusFilter !== 'all') ||
        fromDate ||
        toDate ||
        selectedZone ||
        selectedArea ||
        selectedBranch ||
        memberType
    );

    return (
        <AdminLayout>
            <Head title="সদস্য ভর্তি প্যানেল" />

            <div className="p-3 sm:p-4 md:p-5 space-y-3 max-w-[1600px] mx-auto pb-24 print:p-0 print:pb-0">
                {/* ── 1. COMPACT PROFESSIONAL HEADER ───────────────────────────────────── */}
                <div className="space-y-2.5 print:hidden">
                    <div className="bg-white px-4 py-2.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                        {/* Title & Total Count */}
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs shrink-0">
                                <Users size={16} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                                        সদস্য ভর্তি আবেদন
                                    </h1>
                                    <span className="text-[11px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200/80">
                                        {admissions.total || 0} টি
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Top Action CTAs */}
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
                                title="আজকের আবেদনসমূহ (Today)"
                            >
                                <Calendar size={13} />
                                <span>আজ</span>
                            </button>

                            {/* Create Admission Button */}
                            {canCreateAdmission && (
                                <Link
                                    href="/member-admissions/create"
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-2xs transition-all active:scale-95"
                                >
                                    <Plus size={14} />
                                    <span>নতুন ভর্তি</span>
                                </Link>
                            )}

                            {/* App Register Modal Trigger */}
                            <button
                                type="button"
                                onClick={() => setAppRegisterModalOpen(true)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold shadow-2xs transition-all active:scale-95"
                                title="অ্যাপ রেজিস্টার (একক এন্ট্রি বা বাল্ক এক্সেল)"
                            >
                                <Smartphone size={13} className="text-indigo-600" />
                                <span>অ্যাপ রেজিস্টার</span>
                            </button>

                            {/* Excel Export */}
                            <button
                                type="button"
                                onClick={handleExportExcel}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium transition-all active:scale-95 shadow-2xs"
                                title="এক্সেল ডাউনলোড"
                            >
                                <Download size={13} className="text-emerald-600" />
                                <span className="hidden sm:inline">Excel</span>
                            </button>

                            {/* Print */}
                            <button
                                type="button"
                                onClick={handlePrint}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium transition-all active:scale-95 shadow-2xs"
                                title="প্রিন্ট করুন"
                            >
                                <Printer size={13} className="text-slate-600" />
                                <span className="hidden sm:inline">প্রিন্ট</span>
                            </button>
                        </div>
                    </div>

                    {/* Cutoff Notice for Branch Users */}
                    {isBranchUser && (
                        <HoSendCutoffNotice kind="admission" />
                    )}
                </div>

                {/* ── 2. COMPACT STATUS FILTER MINI-CARDS ───────────────────────────── */}
                <div className="print:hidden">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-1.5 sm:gap-2">
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
                                            ? 'bg-gradient-to-b from-emerald-50/90 to-white border-emerald-300 hover:border-emerald-400 hover:shadow-2xs'
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
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
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
                                        router.get('/member-admissions', buildParams({ search: '' }), { preserveState: true });
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
                            {(zones.length > 0 || areas.length > 0 || branches.length > 0) && (
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
                            )}

                            {/* Global Reset Button */}
                            {hasAnyActiveFilter && (
                                <button
                                    type="button"
                                    onClick={handleResetAll}
                                    className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition shadow-2xs"
                                    title="সব ফিল্টার রিসেট করুন"
                                >
                                    <RotateCcw size={12} />
                                    <span className="hidden sm:inline">রিসেট</span>
                                </button>
                            )}
                        </div>
                    </form>

                    {/* Collapsible Advanced Filters (Zone / Area / Branch / Member Type / Date) */}
                    {showAdvancedFilters && (
                        <div className="pt-2.5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2 animate-in fade-in duration-150">
                            {zones.length > 0 && (
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">জোন</label>
                                    <select
                                        value={selectedZone}
                                        onChange={(e) => handleLocationFilterChange(e.target.value, '', '')}
                                        className="h-8 w-full border border-slate-200 rounded-xl px-2.5 text-xs bg-slate-50/50 hover:bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
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
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">অঞ্চল</label>
                                    <select
                                        value={selectedArea}
                                        onChange={(e) => handleLocationFilterChange(selectedZone, e.target.value, '')}
                                        className="h-8 w-full border border-slate-200 rounded-xl px-2.5 text-xs bg-slate-50/50 hover:bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
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
                                <div className="sm:col-span-2 md:col-span-1 lg:col-span-1">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">শাখা</label>
                                    <select
                                        value={selectedBranch}
                                        onChange={(e) => handleLocationFilterChange(selectedZone, selectedArea, e.target.value)}
                                        className="h-8 w-full border border-slate-200 rounded-xl px-2.5 text-xs bg-slate-50/50 hover:bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
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

                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">সদস্য ধরন</label>
                                <select
                                    value={memberType}
                                    onChange={(e) => handleMemberTypeChange(e.target.value)}
                                    className="h-8 w-full border border-slate-200 rounded-xl px-2.5 text-xs bg-slate-50/50 hover:bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">সকল ধরন</option>
                                    <option value="new">নতুন সদস্য</option>
                                    <option value="old">পুরাতন সদস্য</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">তারিখ সীমা</label>
                                <div className="flex items-center gap-1">
                                    <input
                                        type="date"
                                        value={fromDate}
                                        onChange={(e) => setFromDate(e.target.value)}
                                        className="h-8 w-1/2 border border-slate-200 rounded-xl px-2 text-[11px] bg-slate-50/50 hover:bg-white text-slate-700 focus:outline-none"
                                        title="তারিখ হতে"
                                    />
                                    <span className="text-slate-400 text-xs">–</span>
                                    <input
                                        type="date"
                                        value={toDate}
                                        onChange={(e) => setToDate(e.target.value)}
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
                                    router.get('/member-admissions', buildParams({ search: '' }), { preserveState: true });
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
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden member-admission-index-print print:overflow-visible">
                    {/* Print Header */}
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
                                <div key={admission.id} className="p-3.5 space-y-2.5 hover:bg-slate-50/50 transition-colors">
                                    {/* Header Row */}
                                    <div className="flex items-start justify-between gap-2.5">
                                        <div className="flex items-center gap-2.5">
                                            {isBranchUser && admission.status === 'ready_for_head_office' && (
                                                <input
                                                    type="checkbox"
                                                    checked={selectedHoIds.includes(admission.id)}
                                                    onChange={() => toggleHoSelect(admission.id)}
                                                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 shrink-0"
                                                />
                                            )}
                                            <div className="w-8 h-8 rounded-full bg-slate-800 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                                                {getInitials(admission.applicant_name_en || admission.applicant_name_bn)}
                                            </div>
                                            <div>
                                                <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                                    {highlightMatch(admission.application_no, filters.search)}
                                                </span>
                                                <h3 className="font-bold text-slate-900 text-xs mt-0.5">
                                                    {highlightMatch(admission.applicant_name_bn || admission.applicant_name_en, filters.search)}
                                                </h3>
                                                {admission.is_legacy && (
                                                    <span className="mt-0.5 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.2 text-[9.5px] font-semibold text-amber-800">
                                                        পুরাতন{admission.loan_dofa ? ` · দফা ${admission.loan_dofa}` : ''}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="shrink-0">{getStatusBadge(admission.status)}</div>
                                    </div>

                                    {getActiveLoanBadge(admission)}

                                    {/* Info Grid */}
                                    <div className="grid grid-cols-2 gap-2 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 text-xs">
                                        <div>
                                            <span className="text-[9.5px] font-bold uppercase text-slate-400 block">মোবাইল</span>
                                            <a href={`tel:${admission.mobile_number}`} className="font-semibold text-blue-600 flex items-center gap-1 mt-0.5">
                                                <Phone className="w-3 h-3" /> {highlightMatch(admission.mobile_number, filters.search)}
                                            </a>
                                        </div>
                                        <div>
                                            <span className="text-[9.5px] font-bold uppercase text-slate-400 block">সমিতি ও শাখা</span>
                                            <p className="font-semibold text-slate-800 truncate mt-0.5">{admission.samity?.samity_name || '–'}</p>
                                            <p className="text-[10px] text-slate-500 truncate">{admission.branch?.name || '–'}</p>
                                        </div>
                                        <div>
                                            <span className="text-[9.5px] font-bold uppercase text-slate-400 block">তারিখ</span>
                                            <p className="font-semibold text-slate-600 mt-0.5">{formatDate(getEffectiveDate(admission))}</p>
                                        </div>
                                        <div>
                                            <span className="text-[9.5px] font-bold uppercase text-slate-400 block">পেন্ডিং</span>
                                            <p className="font-semibold text-indigo-700 truncate mt-0.5">
                                                {admission.tracking_state?.label ?? '—'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* App Register Switch */}
                                    {(() => {
                                        const isRegistered = Boolean(appRegisteredMap[admission.id] ?? admission.is_app_registered);
                                        const isLocked = isRegistered && !canDeactivateApp;

                                        return (
                                            <div className="flex items-center justify-between px-2.5 py-1.5 bg-blue-50/40 rounded-xl border border-blue-100/70">
                                                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                                                    <Smartphone size={13} className="text-blue-600" />
                                                    <span>অ্যাপ রেজিস্টার</span>
                                                    {isLocked && (
                                                        <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                                            লক
                                                        </span>
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    disabled={togglingId === admission.id || isLocked}
                                                    onClick={() => handleToggleAppRegister(admission)}
                                                    className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                                        isRegistered
                                                            ? isLocked
                                                                ? 'bg-emerald-500 cursor-not-allowed opacity-90'
                                                                : 'bg-emerald-500 cursor-pointer hover:bg-emerald-600'
                                                            : 'bg-slate-300 cursor-pointer hover:bg-slate-400'
                                                    }`}
                                                    title={
                                                        isRegistered
                                                            ? isLocked
                                                                ? 'অ্যাপ রেজিস্টার্ড সম্পন্ন (শুধুমাত্র হেড অফিস বা সুপার অ্যাডমিন পরিবর্তন করতে পারবেন)'
                                                                : 'অ্যাপ রেজিস্টার্ড (ক্লিক করে বাতিল করুন)'
                                                            : 'অ্যাপ রেজিস্টার করতে ক্লিক করুন'
                                                    }
                                                >
                                                    <span
                                                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out flex items-center justify-center text-[8px] ${
                                                            isRegistered
                                                                ? 'translate-x-4 text-emerald-600'
                                                                : 'translate-x-0.5 text-slate-400'
                                                        }`}
                                                    >
                                                        {togglingId === admission.id ? (
                                                            <Loader2 size={9} className="animate-spin text-slate-500" />
                                                        ) : isRegistered ? (
                                                            <Check size={9} className="stroke-[3]" />
                                                        ) : null}
                                                    </span>
                                                </button>
                                            </div>
                                        );
                                    })()}

                                    {/* Mobile Actions Toolbar */}
                                    <div className="flex items-center gap-1.5 pt-1">
                                        <Link
                                            href={`/member-admissions/${admission.id}`}
                                            className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition active:scale-95"
                                        >
                                            <Eye size={13} /> দেখুন
                                        </Link>

                                        {canApplyLoan(admission) && (
                                            <Link
                                                href={`/member/loan-applications?member_id=${admission.id}`}
                                                className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition active:scale-95"
                                                title="ঋণ আবেদন করুন"
                                            >
                                                <Banknote size={13} /> ঋণ
                                            </Link>
                                        )}

                                        {canEditAdmission(admission) && (
                                            <Link
                                                href={`/member-admissions/${admission.id}/edit`}
                                                className="p-1.5 text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition"
                                                title="সম্পাদনা"
                                            >
                                                <Edit size={14} />
                                            </Link>
                                        )}

                                        {admission.status === 'draft' && (
                                            <button
                                                onClick={() => handleSubmit(admission.id, admission.application_no, admission.is_legacy)}
                                                className="p-1.5 text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition"
                                                title={admission.is_legacy ? 'সংরক্ষণ ও অটো অনুমোদন' : 'জমা দিন'}
                                            >
                                                <Send size={14} />
                                            </button>
                                        )}

                                        {admission.status === 'ready_for_head_office' && isBranchUser && (
                                            <button
                                                onClick={() => openSendSingleToHo(admission)}
                                                disabled={hoSendCutoff.is_blocked}
                                                className="p-1.5 text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition disabled:opacity-40"
                                                title={hoSendCutoff.is_blocked ? hoSendCutoff.blocked_message : 'Head Office এ পাঠান'}
                                            >
                                                <Send size={14} />
                                            </button>
                                        )}

                                        {admission.status === 'draft' && (
                                            <button
                                                onClick={() => handleDelete(admission.id, admission.application_no, Boolean(appRegisteredMap[admission.id] ?? admission.is_app_registered))}
                                                disabled={Boolean(appRegisteredMap[admission.id] ?? admission.is_app_registered) && !canDeactivateApp}
                                                className="p-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition disabled:opacity-30 disabled:cursor-not-allowed"
                                                title={Boolean(appRegisteredMap[admission.id] ?? admission.is_app_registered) && !canDeactivateApp ? 'অ্যাপ রেজিস্টার সম্পন্ন সদস্য মুছে ফেলা যাবে না' : 'মুছুন'}
                                            >
                                                <Trash2 size={14} />
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
                            minWidth={1050}
                            storageKey="member_admissions_table"
                            title="সদস্য ভর্তি আবেদন তালিকা"
                            subtitle={`(পৃষ্ঠা ${admissions.current_page || 1}/${admissions.last_page || 1} · মোট ${admissions.total || 0} টি)`}
                        >
                            <table className="w-full text-left border-collapse member-admission-index-table">
                                <thead>
                                    <tr className="bg-slate-50/90 border-b border-slate-200/90 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                        {isBranchUser && (
                                            <th className="py-3 px-3 text-center print:hidden w-10">
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
                                        <th className="py-3 px-3 text-center w-12">#</th>
                                        <th className="py-3 px-3.5">সদস্য কোড</th>
                                        <th className="py-3 px-3.5">আবেদনকারী</th>
                                        <th className="py-3 px-3.5">মোবাইল</th>
                                        <th className="py-3 px-3.5">সমিতি ও শাখা</th>
                                        <th className="py-3 px-3">ক্যাটাগরি</th>
                                        <th className="py-3 px-3.5">স্ট্যাটাস ও ট্র্যাকিং</th>
                                        <th className="py-3 px-2.5 text-center print:hidden">অ্যাপ</th>
                                        <th className="py-3 px-3">তারিখ</th>
                                        <th className="py-3 px-3.5 text-right print:hidden">অ্যাকশন</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                    {admissions.data.length === 0 ? (
                                        <tr>
                                            <td colSpan={isBranchUser ? 11 : 10} className="py-12 text-center text-slate-400">
                                                {workQueue?.hint && !isAllStatus
                                                    ? 'এখন কোনো পেন্ডিং কাজ নেই। সব আবেদন দেখতে “সর্বমোট” চাপুন।'
                                                    : 'কোনো ভর্তি আবেদন পাওয়া যায়নি'}
                                            </td>
                                        </tr>
                                    ) : (
                                        admissions.data.map((admission, index) => (
                                            <tr key={admission.id} className="hover:bg-slate-50/70 transition-colors">
                                                {/* Checkbox */}
                                                {isBranchUser && (
                                                    <td className="py-2.5 px-3 text-center print:hidden">
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

                                                {/* Serial # */}
                                                <td className="py-2.5 px-3 text-center font-bold text-slate-400 whitespace-nowrap text-[11px]">
                                                    {((admissions.current_page || 1) - 1) * (admissions.per_page || 15) + index + 1}
                                                </td>

                                                {/* Member Code */}
                                                <td className="py-2.5 px-3.5 whitespace-nowrap">
                                                    <span className="font-mono font-bold text-blue-700 bg-blue-50/90 border border-blue-200/70 px-2 py-0.5 rounded-md text-[11.5px] inline-block shadow-2xs">
                                                        {highlightMatch(admission.application_no, filters.search)}
                                                    </span>
                                                </td>

                                                {/* Applicant Name & Badges */}
                                                <td className="py-2.5 px-3.5">
                                                    <div className="font-bold text-slate-900 leading-tight">
                                                        {highlightMatch(admission.applicant_name_bn || admission.applicant_name_en, filters.search)}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                                        {getActiveLoanBadge(admission)}
                                                        {admission.is_legacy && (
                                                            <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200/80 px-1.5 py-0.2 text-[9.5px] font-semibold text-amber-800">
                                                                পুরাতন{admission.loan_dofa ? ` · দফা ${admission.loan_dofa}` : ''}
                                                            </span>
                                                        )}
                                                        {admission.applicant_name_bn && admission.applicant_name_en && (
                                                            <span className="text-[10.5px] text-slate-400 font-normal">
                                                                {highlightMatch(admission.applicant_name_en, filters.search)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Mobile Number */}
                                                <td className="py-2.5 px-3.5 font-medium text-slate-700 whitespace-nowrap">
                                                    <a href={`tel:${admission.mobile_number}`} className="hover:text-blue-600 transition">
                                                        {highlightMatch(admission.mobile_number, filters.search)}
                                                    </a>
                                                </td>

                                                {/* Unified Samity & Branch */}
                                                <td className="py-2.5 px-3.5">
                                                    <div className="font-semibold text-slate-800 truncate max-w-[170px]" title={admission.samity?.samity_name}>
                                                        {admission.samity?.samity_name || '–'}
                                                    </div>
                                                    <div className="text-[10.5px] text-slate-500 flex items-center gap-1 truncate max-w-[170px] mt-0.5" title={admission.branch?.name}>
                                                        <Building2 size={10} className="shrink-0 text-slate-400" />
                                                        <span>{admission.branch?.name || '–'}</span>
                                                    </div>
                                                </td>

                                                {/* Category */}
                                                <td className="py-2.5 px-3 text-slate-600 font-medium">
                                                    {admission.member_category?.category_name || '–'}
                                                </td>

                                                {/* Unified Status & Tracking State */}
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

                                                {/* Compact App Register Toggle */}
                                                <td className="py-2.5 px-2.5 text-center print:hidden">
                                                    {(() => {
                                                        const isRegistered = Boolean(appRegisteredMap[admission.id] ?? admission.is_app_registered);
                                                        const isLocked = isRegistered && !canDeactivateApp;

                                                        return (
                                                            <button
                                                                type="button"
                                                                disabled={togglingId === admission.id || isLocked}
                                                                onClick={() => handleToggleAppRegister(admission)}
                                                                className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                                                    isRegistered
                                                                        ? isLocked
                                                                            ? 'bg-emerald-500 shadow-2xs cursor-not-allowed opacity-90'
                                                                            : 'bg-emerald-500 shadow-2xs cursor-pointer hover:bg-emerald-600'
                                                                        : 'bg-slate-200 hover:bg-slate-300 cursor-pointer'
                                                                }`}
                                                                title={
                                                                    isRegistered
                                                                        ? isLocked
                                                                            ? 'অ্যাপ রেজিস্টার্ড সম্পন্ন (শুধুমাত্র হেড অফিস বা সুপার অ্যাডমিন পরিবর্তন করতে পারবেন)'
                                                                            : 'অ্যাপ রেজিস্টার্ড (ক্লিক করে বাতিল করুন)'
                                                                        : 'অ্যাপ রেজিস্টার করতে ক্লিক করুন'
                                                                }
                                                            >
                                                                <span
                                                                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out flex items-center justify-center text-[8px] ${
                                                                        isRegistered
                                                                            ? 'translate-x-4 text-emerald-600'
                                                                            : 'translate-x-0.5 text-slate-400'
                                                                    }`}
                                                                >
                                                                    {togglingId === admission.id ? (
                                                                        <Loader2 size={9} className="animate-spin text-slate-500" />
                                                                    ) : isRegistered ? (
                                                                        <Check size={9} className="stroke-[3]" />
                                                                    ) : null}
                                                                </span>
                                                            </button>
                                                        );
                                                    })()}
                                                </td>

                                                {/* Date */}
                                                <td className="py-2.5 px-3 text-[11px] font-medium text-slate-500 whitespace-nowrap">
                                                    {formatDate(getEffectiveDate(admission))}
                                                </td>

                                                {/* Action Buttons Toolbar */}
                                                <td className="py-2.5 px-3.5 text-right print:hidden">
                                                    <div className="flex items-center justify-end gap-0.5">
                                                        <Link
                                                            href={`/member-admissions/${admission.id}`}
                                                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                            title="দেখুন"
                                                        >
                                                            <Eye size={14} />
                                                        </Link>

                                                        {canApplyLoan(admission) && (
                                                            <Link
                                                                href={`/member/loan-applications?member_id=${admission.id}`}
                                                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                                                title="ঋণ আবেদন"
                                                            >
                                                                <Banknote size={14} />
                                                            </Link>
                                                        )}

                                                        {canEditAdmission(admission) && (
                                                            <Link
                                                                href={`/member-admissions/${admission.id}/edit`}
                                                                className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition"
                                                                title="সম্পাদনা"
                                                            >
                                                                <Edit size={14} />
                                                            </Link>
                                                        )}

                                                        {admission.status === 'draft' && (
                                                            <button
                                                                onClick={() => handleSubmit(admission.id, admission.application_no, admission.is_legacy)}
                                                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                                                title={admission.is_legacy ? 'সংরক্ষণ ও অটো অনুমোদন' : 'জমা দিন'}
                                                            >
                                                                <Send size={14} />
                                                            </button>
                                                        )}

                                                        {admission.status === 'needs_revision' && !isFieldOfficer && (
                                                            <>
                                                                <button
                                                                    onClick={() => openResubmitModal(admission)}
                                                                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                                                    title="পুনরায় জমা"
                                                                >
                                                                    <RotateCcw size={14} />
                                                                </button>
                                                                <button
                                                                    onClick={() => openRejectModal(admission)}
                                                                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                                                    title="প্রত্যাখ্যান"
                                                                >
                                                                    <Ban size={14} />
                                                                </button>
                                                            </>
                                                        )}

                                                        {admission.status === 'ready_for_head_office' && isBranchUser && (
                                                            <button
                                                                onClick={() => openSendSingleToHo(admission)}
                                                                disabled={hoSendCutoff.is_blocked}
                                                                className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
                                                                title={hoSendCutoff.is_blocked ? hoSendCutoff.blocked_message : 'Head Office এ পাঠান'}
                                                            >
                                                                <Send size={14} />
                                                            </button>
                                                        )}

                                                        {admission.status === 'draft' && (
                                                            <button
                                                                onClick={() => handleDelete(admission.id, admission.application_no, Boolean(appRegisteredMap[admission.id] ?? admission.is_app_registered))}
                                                                disabled={Boolean(appRegisteredMap[admission.id] ?? admission.is_app_registered) && !canDeactivateApp}
                                                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
                                                                title={Boolean(appRegisteredMap[admission.id] ?? admission.is_app_registered) && !canDeactivateApp ? 'অ্যাপ রেজিস্টার সম্পন্ন সদস্য মুছে ফেলা যাবে না' : 'মুছুন'}
                                                            >
                                                                <Trash2 size={14} />
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

                    {/* Pagination */}
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

                {/* ── 5. FLOATING BATCH ACTION BAR (FOR HO SEND) ───────────────────────── */}
                {isBranchUser && selectedHoIds.length > 0 && (
                    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-md text-white px-4 sm:px-5 py-2.5 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center gap-3 sm:gap-4 animate-in slide-in-from-bottom-5">
                        <div className="flex items-center gap-2 text-xs font-medium">
                            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse shrink-0" />
                            <span>
                                নির্বাচিত: <strong className="font-bold text-purple-300">{selectedHoIds.length}</strong> টি
                            </span>
                        </div>
                        <div className="h-4 w-px bg-slate-700" />
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={toggleSelectAllReady}
                                className="px-2 py-1 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
                            >
                                {allReadySelected ? 'সব বাতিল' : 'সব সিলেক্ট'}
                            </button>
                            <button
                                type="button"
                                onClick={openSendBulkToHo}
                                disabled={isSendingToHo || hoSendCutoff.is_blocked}
                                title={hoSendCutoff.is_blocked ? hoSendCutoff.blocked_message : undefined}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md transition active:scale-95 disabled:opacity-40"
                            >
                                <Send size={13} />
                                <span>{isSendingToHo ? 'পাঠানো হচ্ছে...' : `HO তে পাঠান (${selectedHoIds.length})`}</span>
                            </button>
                        </div>
                    </div>
                )}

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

                {/* New App Register Modal */}
                <NewAppRegisterModal
                    isOpen={appRegisterModalOpen}
                    onClose={() => setAppRegisterModalOpen(false)}
                    branches={branches}
                    currentBranchId={pageAuth?.user?.branch_id}
                    hasMultipleBranches={branches.length > 1}
                    onSuccess={() => {
                        router.reload({ only: ['admissions', 'stats'] });
                    }}
                />
            </div>
        </AdminLayout>
    );
}
