import React, { useState, useMemo } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { formatDate, formatDateTime, formatTime } from '@/utils/dateUtils';
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
    UserCheck,
    XCircle,
    Building2,
    Clock,
    RefreshCw,
    CheckCheck,
    Tag,
    Phone,
    CreditCard,
    Sparkles,
    ChevronRight,
    Users,
    MapPin,
    Building,
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
    created_at: string;
}

interface Admission {
    id: number;
    application_no: string;
    applicant_name_en: string;
    applicant_name_bn: string;
    nid_number?: string;
    smart_card_number?: string;
    mobile_number: string;
    submitted_at: string;
    revision_count?: number;
    revision_comments?: string;
    is_legacy?: boolean;
    loan_dofa?: number | null;
    status?: string;
    branch: {
        name: string;
        code?: string;
    };
    samity: {
        samity_name: string;
    };
    member_category: {
        category_name: string;
    };
    issues: Issue[];
}

interface Props {
    admissions: {
        data: Admission[];
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
        date_from?: string;
        date_to?: string;
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
    'আবেদনকারীর ছবি অস্পষ্ট',
    'মোবাইল নম্বর সঠিক নয়',
    'ঠিকানার তথ্যে ভুল বা অসম্পূর্ণ',
    'সমিতি নির্বাচন সঠিক নয়',
    'স্বাক্ষর অনুপস্থিত বা অমিল',
    'অন্যান্য তথ্য পুনরায় যাচাই প্রয়োজন',
];

export default function ProcessAdmissions({ admissions, filters, zones = [], areas = [], branches = [] }: Props) {
    const { auth } = usePage().props as { auth?: { user?: { username?: string | null } } };
    const authUsername = auth?.user?.username ?? '';
    const getCurrentMonth = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    };

    const currentMonthDefault = filters.month || getCurrentMonth();
    const [monthFilter, setMonthFilter] = useState(currentMonthDefault);
    const [dateFrom, setDateFrom] = useState(filters.date_from || filters.date || '');
    const [dateTo, setDateTo] = useState(filters.date_to || filters.date || '');
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [selectedZone, setSelectedZone] = useState(filters.zone_id ? String(filters.zone_id) : '');
    const [selectedArea, setSelectedArea] = useState(filters.area_id ? String(filters.area_id) : '');
    const [selectedBranch, setSelectedBranch] = useState(filters.branch_id ? String(filters.branch_id) : '');

    const [activeTab, setActiveTab] = useState<'all' | 'clean' | 'flagged' | 'revised'>('all');

    const [selectedAdmission, setSelectedAdmission] = useState<Admission | null>(null);
    const [showIssueModal, setShowIssueModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [pushToBlockList, setPushToBlockList] = useState(true);
    const [rejectError, setRejectError] = useState<string | null>(null);
    const [rejectFieldErrors, setRejectFieldErrors] = useState<string[]>([]);

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
    const applyFilters = (overrides: {
        month?: string;
        date_from?: string;
        date_to?: string;
        search?: string;
        zone_id?: string;
        area_id?: string;
        branch_id?: string;
        page?: number;
        per_page?: number;
    } = {}) => {
        const queryParams: Record<string, string> = {};
        const targetMonth = overrides.month !== undefined ? overrides.month : monthFilter;
        const targetDateFrom = overrides.date_from !== undefined ? overrides.date_from : dateFrom;
        const targetDateTo = overrides.date_to !== undefined ? overrides.date_to : dateTo;
        const targetSearch = overrides.search !== undefined ? overrides.search : searchQuery;
        const targetZone = overrides.zone_id !== undefined ? overrides.zone_id : selectedZone;
        const targetArea = overrides.area_id !== undefined ? overrides.area_id : selectedArea;
        const targetBranch = overrides.branch_id !== undefined ? overrides.branch_id : selectedBranch;

        if (targetDateFrom || targetDateTo) {
            if (targetDateFrom) queryParams.date_from = targetDateFrom;
            if (targetDateTo) queryParams.date_to = targetDateTo;
        } else if (targetMonth) {
            queryParams.month = targetMonth;
        }

        if (targetSearch.trim()) {
            queryParams.search = targetSearch.trim();
        }

        if (targetZone) queryParams.zone_id = targetZone;
        if (targetArea) queryParams.area_id = targetArea;
        if (targetBranch) queryParams.branch_id = targetBranch;

        const perPage = overrides.per_page ?? Number(filters.per_page || admissions.per_page || 20);
        queryParams.per_page = String(perPage);
        if (overrides.page) {
            queryParams.page = String(overrides.page);
        }

        router.get('/head-office/process-admissions', queryParams, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setMonthFilter(val);
        setDateFrom('');
        setDateTo('');
        applyFilters({ month: val, date_from: '', date_to: '' });
    };

    const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setDateFrom(val);
        applyFilters({ date_from: val });
    };

    const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setDateTo(val);
        applyFilters({ date_to: val });
    };

    const handleZoneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setSelectedZone(val);
        setSelectedArea('');
        setSelectedBranch('');
        applyFilters({ zone_id: val, area_id: '', branch_id: '' });
    };

    const handleAreaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setSelectedArea(val);
        setSelectedBranch('');
        applyFilters({ area_id: val, branch_id: '' });
    };

    const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setSelectedBranch(val);
        applyFilters({ branch_id: val });
    };

    const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        applyFilters();
    };

    const handleResetFilters = () => {
        const curMonth = getCurrentMonth();
        setMonthFilter(curMonth);
        setDateFrom('');
        setDateTo('');
        setSearchQuery('');
        setSelectedZone('');
        setSelectedArea('');
        setSelectedBranch('');
        setActiveTab('all');
        router.get('/head-office/process-admissions', { month: curMonth }, { preserveState: true });
    };

    // Calculate Client-side tab filters & Stats
    const cleanAdmissions = admissions.data.filter(a => a.issues.length === 0);
    const flaggedAdmissions = admissions.data.filter(a => a.issues.length > 0);
    const revisedAdmissions = admissions.data.filter(a => (a.revision_count || 0) > 0);

    const displayedAdmissions = admissions.data.filter(admission => {
        if (activeTab === 'clean') return admission.issues.length === 0;
        if (activeTab === 'flagged') return admission.issues.length > 0;
        if (activeTab === 'revised') return (admission.revision_count || 0) > 0;
        return true;
    });

    // Modals
    const openIssueModal = (admission: Admission) => {
        setSelectedAdmission(admission);
        setShowIssueModal(true);
        reset();
    };

    const closeIssueModal = () => {
        setShowIssueModal(false);
        setSelectedAdmission(null);
        reset();
    };

    const handleSaveIssue = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAdmission) return;

        post(`/head-office/admissions/${selectedAdmission.id}/issue`, {
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
        const hasDateRange = !!(dateFrom || dateTo);
        const scopeText = hasDateRange
            ? `তারিখ: ${dateFrom ? formatDate(dateFrom) : '...'} – ${dateTo ? formatDate(dateTo) : '...'}`
            : `মাস: ${monthFilter}`;

        if (confirm(`আপনি কি নিশ্চিত যে (${scopeText}) এর ফিল্টারকৃত সমস্ত সমস্যা-মুক্ত আবেদন অনুমোদন করতে চান?\n\nযেসব আবেদনে সমস্যা চিহ্নিত আছে, সেগুলি সংশোধনের জন্য শাখায় পাঠানো হবে।`)) {
            router.post('/head-office/admissions/approve-all', {
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
                month: hasDateRange ? undefined : monthFilter,
                zone_id: selectedZone || undefined,
                area_id: selectedArea || undefined,
                branch_id: selectedBranch || undefined,
            }, {
                ...keepListFilters,
            });
        }
    };

    const handleApproveSingle = (admission: Admission) => {
        if (admission.issues.length > 0) {
            alert('আবেদনটিতে পেন্ডিং সমস্যা রয়েছে! অনুমোদন করার আগে সমস্যা সমাধান অথবা ডিলিট করুন।');
            return;
        }

        if (confirm(`আবেদনপত্র নং ${admission.application_no} (${admission.applicant_name_en}) অনুমোদন করতে চান?`)) {
            router.patch(`/head-office/admissions/${admission.id}/approve`, {}, keepListFilters);
        }
    };

    const handleDeleteIssue = (issueId: number) => {
        if (confirm('এই সমস্যা রেকর্ডটি মুছে ফেলতে চান?')) {
            router.delete(`/head-office/issues/${issueId}`, keepListFilters);
        }
    };

    const openViewModal = (admission: Admission) => {
        setSelectedAdmission(admission);
        setShowViewModal(true);
    };

    const closeViewModal = () => {
        setShowViewModal(false);
        setSelectedAdmission(null);
    };

    const openRejectModal = (admission: Admission) => {
        setSelectedAdmission(admission);
        setRejectionReason('');
        setPushToBlockList(true);
        setRejectError(null);
        setRejectFieldErrors([]);
        setShowRejectModal(true);
    };

    const closeRejectModal = () => {
        setShowRejectModal(false);
        setSelectedAdmission(null);
        setRejectionReason('');
        setPushToBlockList(true);
        setRejectError(null);
        setRejectFieldErrors([]);
    };

    const handleReject = () => {
        if (!selectedAdmission) return;
        const problems: string[] = [];
        if (!rejectionReason.trim()) {
            problems.push('প্রত্যাখ্যানের কারণ লিখুন');
        }
        if (pushToBlockList) {
            const nid = selectedAdmission.nid_number || selectedAdmission.smart_card_number || '';
            const phone = (selectedAdmission.mobile_number || '').replace(/\D/g, '');
            if (!nid.trim()) problems.push('NID নম্বর নেই — block list-এ যোগ করা যাবে না');
            if (phone.length < 10) problems.push('ফোন নম্বর ১০–১৪ অঙ্কের হতে হবে');
            if (!authUsername.trim()) problems.push('Username সেট করা নেই');
            if (!selectedAdmission.branch?.code) problems.push('শাখার code পাওয়া যায়নি');
        }
        if (problems.length > 0) {
            setRejectFieldErrors(problems);
            setRejectError(problems[0]);
            return;
        }

        setRejectError(null);
        setRejectFieldErrors([]);
        router.patch(`/head-office/admissions/${selectedAdmission.id}/reject`, {
            rejection_reason: rejectionReason,
            push_to_block_list: pushToBlockList,
        }, {
            ...keepListFilters,
            onSuccess: (visit) => {
                const flashError = (visit.props as { flash?: { error?: string | null } }).flash?.error;
                if (flashError) {
                    setRejectError(flashError);
                    setRejectFieldErrors([flashError]);
                    return;
                }
                closeRejectModal();
            },
            onError: (errors) => {
                const messages = Object.values(errors).flat().filter((v): v is string => typeof v === 'string');
                setRejectFieldErrors(messages);
                setRejectError(messages[0] || 'প্রত্যাখ্যান করা যায়নি।');
            },
        });
    };

    // Selection & Bulk Approval
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const pageItemIds = useMemo(() => displayedAdmissions.map((a) => a.id), [displayedAdmissions]);
    const allPageSelected = pageItemIds.length > 0 && pageItemIds.every((id) => selectedIds.includes(id));

    const handleSelectAll = () => {
        if (allPageSelected) {
            setSelectedIds((prev) => prev.filter((id) => !pageItemIds.includes(id)));
        } else {
            setSelectedIds((prev) => [...new Set([...prev, ...pageItemIds])]);
        }
    };

    const handleSelectOne = (id: number) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    const handleApproveSelected = () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`আপনি কি নিশ্চিত যে নির্বাচিত ${selectedIds.length} টি ভর্তি আবেদন অনুমোদন করতে চান?`)) return;

        router.post('/head-office/admissions/approve-bulk', { ids: selectedIds }, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => setSelectedIds([]),
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
            <Head title="Process Admissions - Head Office" />

            <div className="p-3 md:p-4 space-y-3 max-w-[1600px] mx-auto">
                {/* Compact Header Bar */}
                <div className="bg-slate-900 text-white rounded-xl px-4 py-3 shadow-md flex flex-wrap items-center justify-between gap-3 border border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/30">
                            <UserCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-lg font-bold text-white tracking-tight">
                                    Admission Process (আবেদন প্রক্রিয়াকরণ)
                                </h1>
                                {dateFrom || dateTo ? (
                                    <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-[11px] font-medium rounded-full border border-emerald-500/30 flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {dateFrom ? formatDate(dateFrom) : '...'} – {dateTo ? formatDate(dateTo) : '...'}
                                    </span>
                                ) : monthFilter ? (
                                    <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-[11px] font-medium rounded-full border border-emerald-500/30 flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {formatMonthLabel(monthFilter)}
                                    </span>
                                ) : null}
                            </div>
                            <p className="text-xs text-slate-400">
                                শাখা হতে প্রাপ্ত সদস্য ভর্তির আবেদনপত্রসমূহ দ্রুত যাচাই ও অনুমোদন করুন
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
                    {/* Total Admissions Card */}
                    <div className="bg-white rounded-xl px-3.5 py-2.5 border border-slate-200 shadow-sm flex items-center justify-between">
                        <div>
                            <span className="text-[11px] font-semibold text-slate-500 uppercase block">মোট আবেদন</span>
                            <div className="flex items-baseline gap-1 mt-0.5">
                                <span className="text-xl font-extrabold text-slate-900">{admissions.total}</span>
                                <span className="text-[10px] text-slate-400 font-medium">টি</span>
                            </div>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <Users className="w-4 h-4" />
                        </div>
                    </div>

                    {/* Clean / Ready Card */}
                    <div className="bg-white rounded-xl px-3.5 py-2.5 border border-emerald-200 shadow-sm flex items-center justify-between">
                        <div>
                            <span className="text-[11px] font-semibold text-emerald-600 uppercase block">প্রস্তুত (সমস্যামুক্ত)</span>
                            <div className="flex items-baseline gap-1 mt-0.5">
                                <span className="text-xl font-extrabold text-emerald-700">{cleanAdmissions.length}</span>
                                <span className="text-[10px] text-emerald-600 font-medium">টি</span>
                            </div>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4" />
                        </div>
                    </div>

                    {/* Flagged Issues Card */}
                    <div className="bg-white rounded-xl px-3.5 py-2.5 border border-amber-200 shadow-sm flex items-center justify-between">
                        <div>
                            <span className="text-[11px] font-semibold text-amber-600 uppercase block">সমস্যা চিহ্নিত</span>
                            <div className="flex items-baseline gap-1 mt-0.5">
                                <span className="text-xl font-extrabold text-amber-700">{flaggedAdmissions.length}</span>
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
                            <span className="text-[11px] font-semibold text-purple-600 uppercase block">পুনরায় জমাকৃত</span>
                            <div className="flex items-baseline gap-1 mt-0.5">
                                <span className="text-xl font-extrabold text-purple-700">{revisedAdmissions.length}</span>
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
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2">
                        {/* Month Picker */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                মাস (Month)
                            </label>
                            <input
                                type="month"
                                value={monthFilter}
                                onChange={handleMonthChange}
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                            />
                        </div>

                        {/* Date From */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                হতে (Date From)
                            </label>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={handleDateFromChange}
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                            />
                        </div>

                        {/* Date To */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                পর্যন্ত (Date To)
                            </label>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={handleDateToChange}
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
                                    placeholder="নাম, NID, ফোন..."
                                    className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                                />
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearchQuery('');
                                            applyFilters({ search: '' });
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
                            <span>সকল আবেদন</span>
                            <span className={`px-1.5 py-0.2 rounded text-[10px] ${activeTab === 'all' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                                {admissions.data.length}
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
                                {cleanAdmissions.length}
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
                                {flaggedAdmissions.length}
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
                                {revisedAdmissions.length}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Floating/Sticky Bulk Actions Banner */}
                {selectedIds.length > 0 && (
                    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white rounded-xl p-3 px-4 shadow-lg border border-indigo-500/30 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                                {selectedIds.length}
                            </span>
                            <span className="text-xs font-semibold text-indigo-100">
                                {selectedIds.length} টি ভর্তি আবেদন নির্বাচিত করা হয়েছে
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setSelectedIds([])}
                                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg transition"
                            >
                                নির্বাচন বাতিল
                            </button>
                            <button
                                type="button"
                                onClick={handleApproveSelected}
                                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow transition flex items-center gap-1.5 border border-emerald-400/40"
                            >
                                <CheckCheck className="w-4 h-4" />
                                নির্বাচিত ({selectedIds.length}) অনুমোদন করুন
                            </button>
                        </div>
                    </div>
                )}

                {/* Admissions Main Data Table */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    {displayedAdmissions.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="w-16 h-16 mx-auto mb-3 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                                <Users className="w-8 h-8" />
                            </div>
                            <h3 className="text-base font-bold text-slate-800">কোনো আবেদন পাওয়া যায়নি</h3>
                            <p className="text-slate-500 text-xs mt-1 max-w-xs mx-auto">
                                নির্বাচিত মাস বা তারিখ অনুযায়ী কোনো পেন্ডিং আবেদন খুঁজে পাওয়া যায়নি।
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
                            minWidth={1250}
                            storageKey="ho_process_admissions_table"
                            title="সদস্য ভর্তি প্রক্রিয়াকরণ তালিকা"
                            subtitle={`(মোট ${displayedAdmissions.length} টি)`}
                        >
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                                        <th className="py-3 px-3 text-center w-10">
                                            <input
                                                type="checkbox"
                                                checked={allPageSelected}
                                                onChange={handleSelectAll}
                                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                                                title="পৃষ্ঠার সব আবেদন নির্বাচন করুন"
                                            />
                                        </th>
                                        <th className="py-3 px-3 text-center w-12">ক্রমিক</th>
                                        <th className="py-3 px-4">আবেদন নং</th>
                                        <th className="py-3 px-4">সদস্য টাইপ / দফা</th>
                                        <th className="py-3 px-4">আবেদনকারীর নাম</th>
                                        <th className="py-3 px-4">NID / স্মার্ট কার্ড ও মোবাইল</th>
                                        <th className="py-3 px-4">শাখা ও সমিতি</th>
                                        <th className="py-3 px-4">জমাদানের তারিখ</th>
                                        <th className="py-3 px-4">যাচাই স্থিতি (Issues)</th>
                                        <th className="py-3 px-4 text-center">অ্যাকশন (Actions)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                    {displayedAdmissions.map((admission, index) => {
                                        const hasIssues = admission.issues.length > 0;
                                        const isRevised = (admission.revision_count || 0) > 0;
                                        const isSelected = selectedIds.includes(admission.id);

                                        return (
                                            <tr key={admission.id} className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-indigo-50/60' : ''}`}>
                                                <td className="py-3 px-3 text-center align-top">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => handleSelectOne(admission.id)}
                                                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                                                    />
                                                </td>
                                                <td className="py-3 px-3 align-top text-center font-bold text-slate-500 text-xs">
                                                    {index + 1}
                                                </td>
                                                {/* App No & Badges */}
                                                <td className="py-3 px-4 align-top">
                                                    <div className="space-y-1">
                                                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block text-xs" title="সদস্য নাম্বার">
                                                            {admission.application_no}
                                                        </span>
                                                        <div>
                                                            {isRevised && (
                                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-semibold rounded">
                                                                    <RefreshCw className="w-2.5 h-2.5" />
                                                                    Rev #{admission.revision_count}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Member Type / Dofa */}
                                                <td className="py-3 px-4 align-top">
                                                    {admission.is_legacy ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold rounded">
                                                            পুরাতন{admission.loan_dofa ? ` · দফা ${admission.loan_dofa}` : ''}
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold rounded">
                                                            নতুন সদস্য
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Applicant Name */}
                                                <td className="py-3 px-4 align-top">
                                                    <div className="flex items-start gap-2.5">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm">
                                                            {admission.applicant_name_en?.charAt(0) || 'A'}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-slate-900 leading-snug">
                                                                {admission.applicant_name_en}
                                                            </p>
                                                            <p className="text-[11px] text-slate-500 mt-0.5">
                                                                {admission.applicant_name_bn}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* NID / Smart Card & Mobile */}
                                                <td className="py-3 px-4 align-top">
                                                    <div className="space-y-0.5 text-slate-700 text-xs">
                                                        {(admission.nid_number || admission.smart_card_number) ? (
                                                            <div className="flex items-center gap-1 font-mono text-[11px]" title={admission.smart_card_number && !admission.nid_number ? 'স্মার্ট কার্ড' : 'NID'}>
                                                                <CreditCard className="w-3 h-3 text-slate-400" />
                                                                <span className="font-semibold text-slate-800">{admission.nid_number || admission.smart_card_number}</span>
                                                                {admission.smart_card_number && !admission.nid_number && (
                                                                    <span className="text-[9px] px-1 py-0.2 bg-blue-50 text-blue-700 rounded border border-blue-200 font-sans">Smart</span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-400 italic text-[11px]">NID / Smart Card নেই</span>
                                                        )}
                                                        <div className="flex items-center gap-1">
                                                            <PhoneCallLink
                                                                phone={admission.mobile_number}
                                                                className="text-slate-800 text-[11px]"
                                                                iconClassName="w-3 h-3 text-slate-400"
                                                            />
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Branch & Samity */}
                                                <td className="py-3 px-4 align-top">
                                                    <div className="space-y-0.5">
                                                        <div className="flex items-center gap-1 font-semibold text-slate-800 text-xs">
                                                            <Building2 className="w-3 h-3 text-indigo-500" />
                                                            <span>{admission.branch?.name}</span>
                                                        </div>
                                                        <p className="text-[11px] text-slate-500 pl-4">
                                                            {admission.samity?.samity_name}
                                                        </p>
                                                    </div>
                                                </td>

                                                {/* Submission Date + time (AM/PM) */}
                                                <td className="py-3 px-4 align-top text-xs text-slate-600 whitespace-nowrap">
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3 text-slate-400" />
                                                        <span>{formatDate(admission.submitted_at)}</span>
                                                    </div>
                                                    {formatTime(admission.submitted_at) && (
                                                        <div className="text-[10px] text-slate-500 font-medium mt-0.5 pl-4">
                                                            {formatTime(admission.submitted_at)}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Issues Status */}
                                                <td className="py-3 px-4 align-top max-w-xs">
                                                    {hasIssues ? (
                                                        <div className="space-y-1">
                                                            {admission.issues.map((issue) => (
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
                                                    <div className="flex flex-wrap items-center justify-center gap-1">
                                                        {/* Details */}
                                                        <button
                                                            onClick={() => openViewModal(admission)}
                                                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                                            title="বিস্তারিত দেখুন"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </button>

                                                        {/* Report Issue (যাচাই) */}
                                                        <button
                                                            onClick={() => openIssueModal(admission)}
                                                            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-1"
                                                            title="সমস্যা চিহ্নিত করুন"
                                                        >
                                                            <AlertTriangle className="w-3 h-3" />
                                                            যাচাই
                                                        </button>

                                                        {/* Approve */}
                                                        <button
                                                            onClick={() => handleApproveSingle(admission)}
                                                            disabled={hasIssues}
                                                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                                                            title={hasIssues ? "সমস্যা থাকা অবস্থায় অনুমোদন সম্ভব নয়" : "অনুমোদন করুন"}
                                                        >
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            অনুমোদন
                                                        </button>

                                                        {/* Reject */}
                                                        <button
                                                            onClick={() => openRejectModal(admission)}
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
                        meta={admissions}
                        onPageChange={(page) => applyFilters({ page })}
                        onPerPageChange={(size) => applyFilters({ per_page: size, page: 1 })}
                    />
                </div>
            </div>

            {/* Issue Reporting Modal (যাচাই Modal with Preset Quick Tags) */}
            {showIssueModal && selectedAdmission && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden border border-slate-200">
                        {/* Modal Header */}
                        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                                    যাচাই ও সমস্যা চিহ্নিতকরণ (Report Issue)
                                </h3>
                                <p className="text-xs text-slate-300 mt-0.5">
                                    আবেদন নং: {selectedAdmission.application_no} | {selectedAdmission.applicant_name_en}
                                </p>
                            </div>
                            <button
                                onClick={closeIssueModal}
                                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveIssue} className="p-5 space-y-4">
                            {/* Preset Quick Tag Chips */}
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

                            {/* Issue Description Textarea */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    সমস্যার বিবরণ (Issue Description) <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={data.issue_description}
                                    onChange={(e) => setData('issue_description', e.target.value)}
                                    rows={4}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:bg-white transition"
                                    placeholder="এখানে চিহ্নিত সমস্যার বিস্তারিত বিবরণ লিখুন অথবা উপরের কুইক ট্যাগ ক্লিক করুন..."
                                    required
                                />
                                {errors.issue_description && (
                                    <p className="text-xs text-red-600 mt-1">{errors.issue_description}</p>
                                )}
                            </div>

                            {/* Existing Issues History */}
                            {selectedAdmission.issues.length > 0 && (
                                <div className="border-t border-slate-100 pt-3">
                                    <h4 className="text-xs font-semibold text-slate-700 mb-1.5">পূর্বে চিহ্নিত সমস্যাসমূহ:</h4>
                                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                                        {selectedAdmission.issues.map((issue) => (
                                            <div key={issue.id} className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs">
                                                <p className="text-amber-900 font-medium text-xs">{issue.issue_description}</p>
                                                <p className="text-[10px] text-amber-600 mt-0.5">
                                                    রিপোর্টার: {issue.reporter?.name} | {formatDateTime(issue.created_at)}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
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

            {/* View Details Modal */}
            {showViewModal && selectedAdmission && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden border border-slate-200 max-h-[90vh] flex flex-col">
                        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold">আবেদনের বিবরণ (Admission Details)</h3>
                                <p className="text-xs text-slate-300">আবেদন নং: {selectedAdmission.application_no}</p>
                            </div>
                            <button onClick={closeViewModal} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                                    <span className="text-[10px] text-slate-500 font-semibold block">আবেদনকারীর নাম (English)</span>
                                    <span className="font-bold text-slate-900 text-xs">{selectedAdmission.applicant_name_en}</span>
                                </div>
                                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                                    <span className="text-[10px] text-slate-500 font-semibold block">আবেদনকারীর নাম (বাংলা)</span>
                                    <span className="font-bold text-slate-900 text-xs">{selectedAdmission.applicant_name_bn}</span>
                                </div>
                                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                                    <span className="text-[10px] text-slate-500 font-semibold block">জাতীয় পরিচয়পত্র / স্মার্ট কার্ড</span>
                                    <span className="font-mono font-bold text-slate-900 text-xs">{selectedAdmission.nid_number || selectedAdmission.smart_card_number || 'N/A'}</span>
                                </div>
                                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                                    <span className="text-[10px] text-slate-500 font-semibold block">মোবাইল নম্বর</span>
                                    <PhoneCallLink
                                        phone={selectedAdmission.mobile_number}
                                        className="font-mono font-bold text-blue-700 text-xs"
                                        iconClassName="w-3.5 h-3.5 text-blue-500"
                                    />
                                </div>
                                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                                    <span className="text-[10px] text-slate-500 font-semibold block">শাখা (Branch)</span>
                                    <span className="font-bold text-slate-900 text-xs">{selectedAdmission.branch?.name}</span>
                                </div>
                                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                                    <span className="text-[10px] text-slate-500 font-semibold block">সমিতি (Samity)</span>
                                    <span className="font-bold text-slate-900 text-xs">{selectedAdmission.samity?.samity_name}</span>
                                </div>
                                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                                    <span className="text-[10px] text-slate-500 font-semibold block">ক্যাটাগরি</span>
                                    <span className="font-bold text-slate-900 text-xs">{selectedAdmission.member_category?.category_name}</span>
                                </div>
                                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                                    <span className="text-[10px] text-slate-500 font-semibold block">জমাদানের সময়</span>
                                    <span className="font-bold text-slate-900 text-xs">{formatDateTime(selectedAdmission.submitted_at)}</span>
                                </div>
                            </div>

                            {/* Revision History */}
                            {selectedAdmission.revision_comments && (
                                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                                    <h4 className="text-xs font-bold text-purple-900 mb-1 flex items-center gap-1.5">
                                        <FileText className="w-3.5 h-3.5" />
                                        সংশোধন ইতিহাস (Revision History)
                                    </h4>
                                    <p className="text-xs text-purple-800 whitespace-pre-wrap mt-1">
                                        {selectedAdmission.revision_comments}
                                    </p>
                                </div>
                            )}

                            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                                <a
                                    href={`/head-office/admissions/${selectedAdmission.id}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center gap-1"
                                >
                                    সম্পূর্ণ প্রোফাইল দেখুন <ChevronRight className="w-3.5 h-3.5" />
                                </a>
                                <button
                                    onClick={closeViewModal}
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
                                >
                                    বন্ধ করুন
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Application Modal */}
            {showRejectModal && selectedAdmission && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200">
                        <div className="bg-red-600 text-white p-4 flex items-center justify-between">
                            <h3 className="text-base font-bold flex items-center gap-2">
                                <XCircle className="w-5 h-5" />
                                আবেদন প্রত্যাখ্যান (Reject Application)
                            </h3>
                            <button onClick={closeRejectModal} className="text-red-200 hover:text-white p-1 rounded-lg hover:bg-red-700 transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-5 space-y-3 text-xs">
                            {rejectFieldErrors.length > 0 && (
                                <div className="rounded-xl border border-rose-300 bg-rose-50 p-3">
                                    <p className="text-xs font-bold text-rose-800">প্রত্যাখ্যান করা যাচ্ছে না — সমস্যা:</p>
                                    <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-[11px] font-medium text-rose-700">
                                        {rejectFieldErrors.map((problem) => (
                                            <li key={problem}>{problem}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            <p className="text-slate-600">
                                আবেদন নং: <strong className="text-slate-900">{selectedAdmission.application_no}</strong> ({selectedAdmission.applicant_name_en})
                            </p>
                            <p className="text-slate-600">
                                শাখা: <strong className="text-slate-900">{selectedAdmission.branch?.name}</strong>
                                {selectedAdmission.branch?.code ? ` (${selectedAdmission.branch.code})` : ' (কোড নেই)'}
                            </p>
                            <p className="text-slate-600">
                                Username: <strong className={authUsername ? 'text-slate-900' : 'text-rose-600'}>{authUsername || 'সেট নেই'}</strong>
                                {' · '}NID: <strong className="text-slate-900">{selectedAdmission.nid_number || selectedAdmission.smart_card_number || 'নেই'}</strong>
                                {' · '}ফোন: <strong className="text-slate-900">{selectedAdmission.mobile_number || 'নেই'}</strong>
                            </p>
                            {rejectError && rejectFieldErrors.length === 0 && (
                                <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">{rejectError}</p>
                            )}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    প্রত্যাখ্যানের কারণ (Rejection Reason) <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    rows={4}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-1 focus:ring-red-500 focus:bg-white transition"
                                    placeholder="কেন আবেদনটি বাতিল করা হচ্ছে তার কারণ লিখুন..."
                                />
                            </div>

                            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                                <input
                                    type="checkbox"
                                    checked={pushToBlockList}
                                    onChange={(e) => setPushToBlockList(e.target.checked)}
                                    className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                                />
                                <div>
                                    <p className="text-xs font-bold text-slate-900">Block List-এ সদস্যের তথ্য সংরক্ষণ করুন</p>
                                    <p className="text-[10px] text-slate-500">আবেদনের NID ও ফোন নম্বর দিয়ে যোগ করা হবে</p>
                                </div>
                            </label>

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
