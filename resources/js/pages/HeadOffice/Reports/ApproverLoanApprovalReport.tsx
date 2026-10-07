import AdminLayout from '@/layouts/admin-layout';
import { Head, router } from '@inertiajs/react';
import { useState, useMemo } from 'react';
import { todayIsoDate, startOfMonthIsoDate, lastMonthRangeIso, addCalendarDays } from '@/utils/dateUtils';
import {
    Calendar,
    Search,
    Printer,
    Download,
    UserCheck,
    Coins,
    Banknote,
    FileSpreadsheet,
    Building2,
    RotateCcw,
    Layers,
    Clock,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Info,
    ChevronDown,
    ChevronUp,
    Eye,
    ChevronRight,
    Users,
    Shield,
    Award,
    Filter,
    X,
    ExternalLink,
    Briefcase,
    TrendingUp,
} from 'lucide-react';

interface ApproverOption {
    id: number;
    name: string;
    role_slug?: string;
    role_rank?: number;
    role_name: string;
    branch_name: string;
}

interface ApprovalItem {
    id: number;
    loan_id: number;
    approval_date: string;
    approval_time: string;
    approved_at_raw: string;
    level: string;
    level_label: string;
    action_status?: 'approved' | 'rejected' | string;
    action_status_label?: string;
    comments: string | null;
    approver_id: number;
    approver_name: string;
    approver_role: string;
    application_no: string;
    member_name: string;
    member_code: string;
    member_mobile: string;
    product_name: string;
    product_code: string;
    category_name: string;
    branch_name: string;
    branch_code: string;
    area_name: string;
    zone_name: string;
    samity_name: string;
    requested_amount: number;
    approved_amount: number;
    display_amount?: number;
    loan_status: string;
    loan_status_label: string;
}

interface DateApproverBreakdown {
    user_id: number;
    user_name: string;
    role_name: string;
    role_rank?: number;
    loans_count: number;
    approved_count?: number;
    approved_amount?: number;
    rejected_count?: number;
    rejected_amount?: number;
    total_amount: number;
}

interface DateSummaryItem {
    date: string;
    formatted_date: string;
    total_loans: number;
    approved_count?: number;
    approved_amount?: number;
    rejected_count?: number;
    rejected_amount?: number;
    total_amount: number;
    approvers: DateApproverBreakdown[];
}

interface ApproverSummaryItem {
    user_id: number;
    user_name: string;
    role_slug?: string;
    role_rank?: number;
    role_name: string;
    branch_name: string;
    total_loans: number;
    total_actions?: number;
    total_approvals?: number;
    approved_loans?: number;
    approved_amount?: number;
    reapprovals_count?: number;
    rejected_loans?: number;
    rejected_actions?: number;
    rejected_amount?: number;
    total_amount: number;
}

interface ZoneOption {
    id: number | string;
    name: string;
}

interface AreaOption {
    id: number | string;
    name: string;
    zone_id?: number | string;
}

interface BranchOption {
    id: number | string;
    name: string;
    code?: string;
    area_id?: number | string;
}

interface Props {
    approvals: {
        data: ApprovalItem[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        links: Array<{ url: string | null; label: string; active: boolean }>;
    };
    filters: {
        date_from: string;
        date_to: string;
        user_id: string;
        decision_status?: string;
        zone_id: string;
        area_id: string;
        branch_id: string;
        search: string;
        per_page: number;
    };
    summary: {
        total_decisions?: number;
        total_loans: number;
        total_approvals?: number;
        approved_loans?: number;
        approved_actions?: number;
        approved_amount?: number;
        rejected_loans?: number;
        rejected_actions?: number;
        rejected_amount?: number;
        total_amount: number;
        unique_approvers: number;
        average_amount: number;
    };
    selected_approver?: {
        id: number;
        name: string;
        email: string;
        role_name: string;
        branch_name: string;
    } | null;
    date_summary: DateSummaryItem[];
    approver_summary: ApproverSummaryItem[];
    approvers_list: ApproverOption[];
    zones: ZoneOption[];
    areas: AreaOption[];
    branches: BranchOption[];
}

export default function ApproverLoanApprovalReport({
    approvals,
    filters,
    summary,
    selected_approver,
    date_summary = [],
    approver_summary = [],
    approvers_list = [],
    zones = [],
    areas = [],
    branches = [],
}: Props) {
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');
    const [userId, setUserId] = useState(filters.user_id || '');
    const [decisionStatus, setDecisionStatus] = useState(filters.decision_status || 'all');
    const [zoneId, setZoneId] = useState(filters.zone_id || '');
    const [areaId, setAreaId] = useState(filters.area_id || '');
    const [branchId, setBranchId] = useState(filters.branch_id || '');
    const [search, setSearch] = useState(filters.search || '');
    const [perPage, setPerPage] = useState(filters.per_page || 25);
    const [activeTab, setActiveTab] = useState<'approver_wise' | 'detailed' | 'date_wise'>(
        filters.user_id ? 'detailed' : 'approver_wise'
    );
    const [showAdvancedLocation, setShowAdvancedLocation] = useState(
        Boolean(filters.zone_id || filters.area_id || filters.branch_id)
    );
    const [showHelpGuide, setShowHelpGuide] = useState(false);

    // Cascading area and branch options
    const filteredAreas = useMemo(() => {
        if (!zoneId) return areas;
        return areas.filter((a) => String(a.zone_id) === String(zoneId));
    }, [areas, zoneId]);

    const filteredBranches = useMemo(() => {
        let list = branches;
        if (zoneId) {
            const areaIds = areas.filter((a) => String(a.zone_id) === String(zoneId)).map((a) => String(a.id));
            list = list.filter((b) => areaIds.includes(String(b.area_id)));
        }
        if (areaId) {
            list = list.filter((b) => String(b.area_id) === String(areaId));
        }
        return list;
    }, [branches, areas, zoneId, areaId]);

    const buildQueryString = (overrides: Record<string, string | number> = {}) => {
        const params = new URLSearchParams();
        const currentVals: Record<string, string | number> = {
            date_from: dateFrom,
            date_to: dateTo,
            user_id: userId,
            decision_status: decisionStatus,
            zone_id: zoneId,
            area_id: areaId,
            branch_id: branchId,
            search: search,
            per_page: perPage,
            ...overrides,
        };

        Object.entries(currentVals).forEach(([k, v]) => {
            if (v !== '' && v !== null && v !== undefined) {
                params.set(k, String(v));
            }
        });

        return params.toString();
    };

    const handleApplyFilters = () => {
        const qs = buildQueryString();
        router.get(`/reports/approver-loan-approvals?${qs}`);
    };

    const handleDecisionStatusChange = (newStatus: string) => {
        setDecisionStatus(newStatus);
        const qs = buildQueryString({ decision_status: newStatus });
        router.get(`/reports/approver-loan-approvals?${qs}`);
    };

    const handleResetFilters = () => {
        const today = todayIsoDate();
        const firstDay = startOfMonthIsoDate();
        setDateFrom(firstDay);
        setDateTo(today);
        setUserId('');
        setDecisionStatus('all');
        setZoneId('');
        setAreaId('');
        setBranchId('');
        setSearch('');
        router.get(`/reports/approver-loan-approvals?date_from=${firstDay}&date_to=${today}&decision_status=all`);
    };

    const handleClearApproverFilter = () => {
        setUserId('');
        const qs = buildQueryString({ user_id: '' });
        router.get(`/reports/approver-loan-approvals?${qs}`);
    };

    // Quick Date shortcuts
    const setQuickDate = (type: 'today' | 'this_month' | 'last_month' | 'last_30_days') => {
        const today = todayIsoDate();
        let from = '';
        let to = today;

        if (type === 'today') {
            from = today;
        } else if (type === 'this_month') {
            from = startOfMonthIsoDate();
        } else if (type === 'last_month') {
            const range = lastMonthRangeIso();
            from = range.from;
            to = range.to;
        } else if (type === 'last_30_days') {
            from = addCalendarDays(today, -30);
        }

        setDateFrom(from);
        setDateTo(to);
        const qs = buildQueryString({ date_from: from, date_to: to });
        router.get(`/reports/approver-loan-approvals?${qs}`);
    };

    const handlePrint = (reportType?: string) => {
        const type = reportType || activeTab;
        const qs = buildQueryString({ report_type: type });
        window.open(`/reports/approver-loan-approvals/print?${qs}`, '_blank');
    };

    const handleExportExcel = (reportType?: string) => {
        const type = reportType || activeTab;
        const qs = buildQueryString({ report_type: type });
        window.location.href = `/reports/approver-loan-approvals/export?${qs}`;
    };

    const formatCurrency = (amount: number | string | null | undefined) => {
        if (!amount || Number(amount) === 0) return '০.০০';
        return Number(amount).toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    const formatDateDMY = (dateStr: string) => {
        if (!dateStr) return '';
        try {
            const parts = dateStr.split('-');
            if (parts.length === 3) {
                return `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
            return dateStr;
        } catch {
            return dateStr;
        }
    };

    // Role Hierarchy styling badge
    const getRoleBadge = (roleSlug?: string, roleName?: string) => {
        const s = (roleSlug || '').toLowerCase();
        if (s.includes('ed') || s.includes('executive')) {
            return {
                label: 'Executive Director (১ম)',
                badge: 'bg-purple-100 text-purple-900 border-purple-300 font-bold',
                tag: 'ED',
                levelText: 'শীর্ষ নির্বাহী (১ম স্তর)',
            };
        }
        if (s.includes('dmf') && !s.includes('admf')) {
            return {
                label: 'DMF (২য়)',
                badge: 'bg-blue-100 text-blue-900 border-blue-300 font-bold',
                tag: 'DMF',
                levelText: 'পরিচালক (২য় স্তর)',
            };
        }
        if (s.includes('admf')) {
            return {
                label: 'ADMF (৩য়)',
                badge: 'bg-sky-100 text-sky-900 border-sky-300 font-bold',
                tag: 'ADMF',
                levelText: 'সহকারী পরিচালক (৩য় স্তর)',
            };
        }
        if (s.includes('zone')) {
            return {
                label: 'Zone Manager (৪র্থ)',
                badge: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold',
                tag: 'ZONE',
                levelText: 'জোনাল প্রধান (৪র্থ স্তর)',
            };
        }
        if (s.includes('area') || s.includes('regional')) {
            return {
                label: 'Area / Regional Manager (৫ম)',
                badge: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
                tag: 'AREA',
                levelText: 'এলাকা প্রধান (৫ম স্তর)',
            };
        }
        if (s.includes('branch') || s.includes('manager')) {
            return {
                label: 'Branch Manager (৬ষ্ঠ)',
                badge: 'bg-slate-100 text-slate-800 border-slate-300 font-medium',
                tag: 'BRANCH MANAGER',
                levelText: 'শাখা প্রধান (৬ষ্ঠ স্তর)',
            };
        }
        return {
            label: roleName || 'অন্যান্য কর্মকর্তা',
            badge: 'bg-gray-100 text-gray-800 border-gray-200 font-medium',
            tag: 'OFFICER',
            levelText: 'কর্মকর্তা',
        };
    };

    const getLoanStatusBadge = (status: string, label: string) => {
        switch (status) {
            case 'disbursed':
                return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'pending_disbursement':
                return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'ready_for_head_office':
            case 'pending_head_office':
                return 'bg-purple-50 text-purple-700 border-purple-200';
            case 'approved':
                return 'bg-teal-50 text-teal-700 border-teal-200';
            case 'under_review':
                return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'rejected':
                return 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
            default:
                return 'bg-slate-50 text-slate-700 border-slate-200';
        }
    };

    return (
        <AdminLayout>
            <Head title="কর্মকর্তাভিত্তিক ঋণ সিদ্ধান্ত ও অনুমোদন রিপোর্ট" />

            <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-5">
                {/* 1. Header Section */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="p-3 bg-gradient-to-tr from-brand-dark to-brand rounded-2xl text-white shadow-sm flex items-center justify-center">
                            <UserCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                                    কর্মকর্তাভিত্তিক ঋণ সিদ্ধান্ত ও অনুমোদন রিপোর্ট
                                </h1>
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                    অনুমোদন ও বাতিল সমন্বিত ভিউ
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                                কর্মকর্তা ও সময়কাল অনুযায়ী ঋণের অনুমোদন, পুনঃঅনুমোদন ও বাতিলের নির্ভুল পরিসংখ্যান এবং বিস্তারিত ডাটা
                            </p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <button
                            type="button"
                            onClick={() => setShowHelpGuide(!showHelpGuide)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition active:scale-95 cursor-pointer"
                            title="রিপোর্টের নির্দেশিকা ও সংজ্ঞা দেখুন"
                        >
                            <Info className="w-4 h-4 text-blue-600" />
                            <span>নির্দেশিকা</span>
                            {showHelpGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                        <button
                            type="button"
                            onClick={() => handlePrint(activeTab)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition shadow-2xs active:scale-95 cursor-pointer"
                            title={`বর্তমান ভিউ (${
                                activeTab === 'approver_wise'
                                    ? 'কর্মকর্তা সারসংক্ষেপ'
                                    : activeTab === 'detailed'
                                    ? 'বিস্তারিত তালিকা'
                                    : 'তারিখ বিবরণী'
                            }) A4 সাইজে প্রিন্ট বা PDF সেভ করুন`}
                        >
                            <Printer className="w-4 h-4 text-slate-600" />
                            <span>
                                {activeTab === 'approver_wise'
                                    ? 'কর্মকর্তা সারসংক্ষেপ প্রিন্ট'
                                    : activeTab === 'detailed'
                                    ? 'বিস্তারিত তালিকা প্রিন্ট'
                                    : 'তারিখ বিবরণী প্রিন্ট'}
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleExportExcel(activeTab)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 border border-emerald-700 transition shadow-2xs active:scale-95 cursor-pointer"
                            title={`বর্তমান ভিউ (${
                                activeTab === 'approver_wise'
                                    ? 'কর্মকর্তা সারসংক্ষেপ'
                                    : activeTab === 'detailed'
                                    ? 'বিস্তারিত তালিকা'
                                    : 'তারিখ বিবরণী'
                            }) এক্সেল (.xlsx) ফরম্যাটে ডাউনলোড করুন`}
                        >
                            <Download className="w-4 h-4" />
                            <span>
                                {activeTab === 'approver_wise'
                                    ? 'কর্মকর্তা এক্সেল (.xlsx)'
                                    : activeTab === 'detailed'
                                    ? 'বিস্তারিত এক্সেল (.xlsx)'
                                    : 'তারিখভিত্তিক এক্সেল (.xlsx)'}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Collapsible Info / Help Guide Box */}
                {showHelpGuide && (
                    <div className="bg-gradient-to-r from-blue-50 via-slate-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3 animate-in fade-in duration-200">
                        <div className="flex items-center gap-2">
                            <Info className="w-5 h-5 text-blue-600 shrink-0" />
                            <h3 className="text-sm font-bold text-slate-900">রিপোর্টের কলাম ও তথ্যাবলীর স্পষ্ট ব্যাখ্যা:</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
                            <div className="bg-white p-3 rounded-xl border border-slate-200/80 space-y-1 shadow-2xs">
                                <div className="font-bold text-emerald-700 flex items-center gap-1.5">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>অনুমোদিত ঋণ (Approved):</span>
                                </div>
                                <p className="text-slate-600 leading-relaxed">
                                    যে সকল ঋণ আবেদন কর্মকর্তা কর্তৃক যথাযথ বিবেচনা করে অনুমোদন করা হয়েছে।
                                </p>
                            </div>

                            <div className="bg-white p-3 rounded-xl border border-slate-200/80 space-y-1 shadow-2xs">
                                <div className="font-bold text-purple-700 flex items-center gap-1.5">
                                    <AlertCircle className="w-4 h-4" />
                                    <span>(১টি পুনঃঅনুমোদন) এর অর্থ:</span>
                                </div>
                                <p className="text-slate-600 leading-relaxed">
                                    ঋণ আবেদন একবার অনুমোদন হওয়ার পর সংশোধন (Needs Correction) বা টাকার পরিমাণ সমন্বয়ের কারণে একই কর্মকর্তা যখন ২য় বার অনুমোদন দেন, তখন অতিরিক্ত অনুমোদনকে পুনঃঅনুমোদন বলা হয়।
                                </p>
                            </div>

                            <div className="bg-white p-3 rounded-xl border border-slate-200/80 space-y-1 shadow-2xs">
                                <div className="font-bold text-rose-700 flex items-center gap-1.5">
                                    <XCircle className="w-4 h-4" />
                                    <span>বাতিল / প্রত্যাখ্যাত (Rejected):</span>
                                </div>
                                <p className="text-slate-600 leading-relaxed">
                                    নীতিমালা বা ঝুঁকি অনুযায়ী যে সকল আবেদন বাতিল করা হয়েছে। বিস্তারিত তালিকায় কর্মকর্তা কর্তৃক প্রদত্ত সুনির্দিষ্ট কারণ প্রদর্শিত হয়।
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. Selected Approver Active Banner */}
                {selected_approver && (
                    <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border border-blue-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-lg shadow-sm">
                                {selected_approver.name.charAt(0)}
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="text-base font-bold text-slate-900">{selected_approver.name}</h3>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-300">
                                        {selected_approver.role_name}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-600 font-medium mt-0.5">
                                    কর্মস্থল: <strong>{selected_approver.branch_name || 'হেড অফিস'}</strong> • ইমেইল: {selected_approver.email}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleClearApproverFilter}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-700 hover:bg-slate-100 border border-slate-300 transition shadow-2xs active:scale-95 cursor-pointer"
                            >
                                <X className="w-3.5 h-3.5 text-slate-500" />
                                <span>ফিল্টার অপসারণ (সকল অনুমোদক)</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* 3. Filter Section */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
                    {/* Decision Status Segmented Filter Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-slate-700 mr-1 flex items-center gap-1">
                                <Filter className="w-3.5 h-3.5 text-slate-400" />
                                <span>সিদ্ধান্ত ফিল্টার:</span>
                            </span>
                            <button
                                type="button"
                                onClick={() => handleDecisionStatusChange('all')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                    decisionStatus === 'all'
                                        ? 'bg-slate-900 text-white shadow-xs'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                <span>সকল সিদ্ধান্ত</span>
                                <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${decisionStatus === 'all' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                                    {summary.total_decisions ?? summary.total_loans}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => handleDecisionStatusChange('approved')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                    decisionStatus === 'approved'
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                }`}
                            >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>শুধুমাত্র অনুমোদিত</span>
                                <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${decisionStatus === 'approved' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                                    {summary.approved_loans ?? summary.total_loans}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => handleDecisionStatusChange('rejected')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                    decisionStatus === 'rejected'
                                        ? 'bg-rose-600 text-white shadow-xs'
                                        : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                                }`}
                            >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>শুধুমাত্র বাতিল / প্রত্যাখ্যাত</span>
                                <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${decisionStatus === 'rejected' ? 'bg-rose-700 text-white' : 'bg-rose-100 text-rose-800'}`}>
                                    {summary.rejected_loans ?? 0}
                                </span>
                            </button>
                        </div>

                        {/* Quick Date Shortcuts */}
                        <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-[11px] font-bold text-slate-400 mr-1">দ্রুত সময়:</span>
                            <button
                                type="button"
                                onClick={() => setQuickDate('today')}
                                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                            >
                                আজ
                            </button>
                            <button
                                type="button"
                                onClick={() => setQuickDate('this_month')}
                                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition cursor-pointer"
                            >
                                চলতি মাস
                            </button>
                            <button
                                type="button"
                                onClick={() => setQuickDate('last_month')}
                                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                            >
                                গত মাস
                            </button>
                            <button
                                type="button"
                                onClick={() => setQuickDate('last_30_days')}
                                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                            >
                                গত ৩০ দিন
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                        {/* Approver Dropdown */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                কর্মকর্তা / অনুমোদক:
                            </label>
                            <select
                                value={userId}
                                onChange={(e) => setUserId(e.target.value)}
                                className="w-full text-xs rounded-xl border-slate-300 focus:border-brand focus:ring-brand font-medium py-2"
                            >
                                <option value="">-- সকল অনুমোদক (All Approvers) --</option>
                                {approvers_list.map((ap) => (
                                    <option key={ap.id} value={ap.id}>
                                        {ap.name} ({ap.role_name}) {ap.branch_name ? `— ${ap.branch_name}` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Date From */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-xs font-bold text-slate-700">শুরুর তারিখ:</label>
                                {dateFrom && (
                                    <span className="text-[11px] font-mono font-bold text-brand">
                                        {formatDateDMY(dateFrom)}
                                    </span>
                                )}
                            </div>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="w-full text-xs rounded-xl border-slate-300 focus:border-brand focus:ring-brand pl-8 font-medium py-2"
                                />
                                <Calendar className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        </div>

                        {/* Date To */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-xs font-bold text-slate-700">শেষের তারিখ:</label>
                                {dateTo && (
                                    <span className="text-[11px] font-mono font-bold text-brand">
                                        {formatDateDMY(dateTo)}
                                    </span>
                                )}
                            </div>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="w-full text-xs rounded-xl border-slate-300 focus:border-brand focus:ring-brand pl-8 font-medium py-2"
                                />
                                <Calendar className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        </div>

                        {/* Search Input */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                সার্চ (আবেদন নং / সদস্য / মোবাইল):
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="আবেদন নং, নাম বা সদস্য কোড..."
                                    className="w-full text-xs rounded-xl border-slate-300 focus:border-brand focus:ring-brand pl-8 py-2"
                                    onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
                                />
                                <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Cascading Location Filter Toggle */}
                    <div className="pt-2 border-t border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                        <button
                            type="button"
                            onClick={() => setShowAdvancedLocation(!showAdvancedLocation)}
                            className="text-xs font-bold text-slate-600 hover:text-brand flex items-center gap-1.5 self-start cursor-pointer"
                        >
                            <Building2 className="w-4 h-4 text-slate-500" />
                            <span>শাখা / এরিয়া / জোন ফিল্টার</span>
                            <span className="text-[11px] text-slate-400 font-normal">
                                {showAdvancedLocation ? '(লুকান)' : '(দেখুন)'}
                            </span>
                        </button>

                        <div className="flex items-center gap-2 self-end">
                            <button
                                type="button"
                                onClick={handleResetFilters}
                                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>রিসেট</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleApplyFilters}
                                className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-brand hover:bg-brand-dark transition shadow-xs flex items-center gap-1.5 active:scale-95 cursor-pointer"
                            >
                                <Filter className="w-3.5 h-3.5" />
                                <span>ফিল্টার প্রয়োগ</span>
                            </button>
                        </div>
                    </div>

                    {/* Location Dropdowns */}
                    {showAdvancedLocation && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 bg-slate-50/80 p-3 rounded-xl border border-slate-200/60 animate-in fade-in duration-200">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">জোন (Zone):</label>
                                <select
                                    value={zoneId}
                                    onChange={(e) => {
                                        setZoneId(e.target.value);
                                        setAreaId('');
                                        setBranchId('');
                                    }}
                                    className="w-full text-xs rounded-xl border-slate-300 py-1.5"
                                >
                                    <option value="">-- সকল জোন --</option>
                                    {zones.map((z) => (
                                        <option key={z.id} value={z.id}>{z.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">এরিয়া (Area):</label>
                                <select
                                    value={areaId}
                                    onChange={(e) => {
                                        setAreaId(e.target.value);
                                        setBranchId('');
                                    }}
                                    className="w-full text-xs rounded-xl border-slate-300 py-1.5"
                                >
                                    <option value="">-- সকল এরিয়া --</option>
                                    {filteredAreas.map((a) => (
                                        <option key={a.id} value={a.id}>{a.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">শাখা (Branch):</label>
                                <select
                                    value={branchId}
                                    onChange={(e) => setBranchId(e.target.value)}
                                    className="w-full text-xs rounded-xl border-slate-300 py-1.5"
                                >
                                    <option value="">-- সকল শাখা --</option>
                                    {filteredBranches.map((b) => (
                                        <option key={b.id} value={b.id}>{b.name} {b.code ? `(${b.code})` : ''}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                {/* 4. KPI Statistics Cards (4-Column Layout) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                    {/* Total Decisions & Actions Card */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600 shrink-0">
                            <Layers className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                                মোট সিদ্ধান্ত কার্যক্রম
                            </span>
                            <span className="text-xl sm:text-2xl font-black text-slate-800 truncate block">
                                {(summary.total_decisions ?? summary.total_loans).toLocaleString('bn-BD')} টি
                            </span>
                            <span className="text-[10px] text-blue-600 font-semibold block">
                                স্বতন্ত্র ঋণ: {summary.total_loans.toLocaleString('bn-BD')} টি
                            </span>
                        </div>
                    </div>

                    {/* Approved Loans Card */}
                    <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 shadow-xs flex items-center gap-3.5 bg-gradient-to-br from-white to-emerald-50/30">
                        <div className="w-12 h-12 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">
                                অনুমোদিত ঋণ
                            </span>
                            <span className="text-xl sm:text-2xl font-black text-emerald-800 truncate block">
                                {(summary.approved_loans ?? summary.total_loans).toLocaleString('bn-BD')} টি
                            </span>
                            <span className="text-[10.5px] text-emerald-700 font-bold block truncate">
                                {formatCurrency(summary.approved_amount ?? summary.total_amount)} ৳
                            </span>
                        </div>
                    </div>

                    {/* Rejected Loans Card */}
                    <div className="bg-white p-4 rounded-2xl border border-rose-200/80 shadow-xs flex items-center gap-3.5 bg-gradient-to-br from-white to-rose-50/30">
                        <div className="w-12 h-12 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-700 shrink-0">
                            <XCircle className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">
                                বাতিল / প্রত্যাখ্যাত ঋণ
                            </span>
                            <span className="text-xl sm:text-2xl font-black text-rose-800 truncate block">
                                {(summary.rejected_loans ?? 0).toLocaleString('bn-BD')} টি
                            </span>
                            <span className="text-[10.5px] text-rose-700 font-bold block truncate">
                                {formatCurrency(summary.rejected_amount ?? 0)} ৳ প্রার্থিত
                            </span>
                        </div>
                    </div>

                    {/* Active Approvers Card */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-200/60 flex items-center justify-center text-purple-600 shrink-0">
                            <Users className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                                সক্রিয় অনুমোদক
                            </span>
                            <span className="text-xl sm:text-2xl font-black text-slate-800 truncate block">
                                {summary.unique_approvers.toLocaleString('bn-BD')} জন
                            </span>
                            <span className="text-[10px] text-purple-700 font-semibold block">
                                গড় ঋণ: {formatCurrency(summary.average_amount)} ৳
                            </span>
                        </div>
                    </div>
                </div>

                {/* 5. View Switcher Tabs */}
                <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-3 pt-3 rounded-t-2xl">
                    <button
                        type="button"
                        onClick={() => setActiveTab('approver_wise')}
                        className={`pb-3 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
                            activeTab === 'approver_wise'
                                ? 'border-brand text-brand-dark'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <Users className="w-4 h-4" />
                        <span>কর্মকর্তাভিত্তিক সারসংক্ষেপ</span>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] ${activeTab === 'approver_wise' ? 'bg-brand/10 text-brand-dark' : 'bg-slate-100 text-slate-600'}`}>
                            {approver_summary.length} জন
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('detailed')}
                        className={`pb-3 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
                            activeTab === 'detailed'
                                ? 'border-brand text-brand-dark'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        <span>বিস্তারিত ঋণের তালিকা</span>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] ${activeTab === 'detailed' ? 'bg-brand/10 text-brand-dark' : 'bg-slate-100 text-slate-600'}`}>
                            {approvals.total} টি
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('date_wise')}
                        className={`pb-3 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
                            activeTab === 'date_wise'
                                ? 'border-brand text-brand-dark'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <Calendar className="w-4 h-4" />
                        <span>তারিখভিত্তিক বিবরণী</span>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] ${activeTab === 'date_wise' ? 'bg-brand/10 text-brand-dark' : 'bg-slate-100 text-slate-600'}`}>
                            {date_summary.length} দিন
                        </span>
                    </button>
                </div>

                {/* TAB 1: APPROVER-WISE SUMMARY TABLE */}
                {activeTab === 'approver_wise' && (
                    <div className="bg-white rounded-b-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                        <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-sm font-black uppercase tracking-wider text-slate-800">
                                        কর্মকর্তাভিত্তিক ঋণ সিদ্ধান্ত সারসংক্ষেপ
                                    </h2>
                                    <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-brand/10 text-brand-dark">
                                        পদক্রম ও কার্যক্রম অনুযায়ী
                                    </span>
                                </div>
                                <p className="text-[11.5px] text-slate-500 mt-1 font-medium flex items-center gap-1.5 flex-wrap">
                                    <span className="text-purple-700 font-bold">Executive Director</span>
                                    <span>➔</span>
                                    <span className="text-blue-700 font-bold">DMF</span>
                                    <span>➔</span>
                                    <span className="text-sky-700 font-bold">ADMF</span>
                                    <span>➔</span>
                                    <span className="text-emerald-700 font-bold">Zone Manager</span>
                                    <span>➔</span>
                                    <span className="text-amber-700 font-bold">Area Manager</span>
                                    <span>➔</span>
                                    <span className="text-slate-700 font-bold">Branch Manager</span>
                                </p>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                                {userId && (
                                    <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl">
                                        <span className="text-xs text-blue-800 font-medium">
                                            ফিল্টার সক্রিয়: <strong>{selected_approver?.name}</strong>
                                        </span>
                                        <button
                                            type="button"
                                            onClick={handleClearApproverFilter}
                                            className="text-xs font-bold text-blue-600 hover:text-blue-800 underline ml-1 cursor-pointer"
                                        >
                                            সকল দেখুন
                                        </button>
                                    </div>
                                )}
                                <button
                                    type="button"
                                    onClick={() => handlePrint('approver_wise')}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition shadow-2xs cursor-pointer active:scale-95"
                                    title="শুধুমাত্র কর্মকর্তাভিত্তিক সারসংক্ষেপ প্রিন্ট করুন"
                                >
                                    <Printer className="w-3.5 h-3.5 text-slate-600" />
                                    <span>সারসংক্ষেপ প্রিন্ট</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleExportExcel('approver_wise')}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition shadow-2xs cursor-pointer active:scale-95"
                                    title="শুধুমাত্র কর্মকর্তাভিত্তিক সারসংক্ষেপ এক্সেল ডাউনলোড করুন"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>সারসংক্ষেপ এক্সেল</span>
                                </button>
                            </div>
                        </div>

                        {/* Approver Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                                        <th className="py-3 px-3 text-center w-12">ক্র.</th>
                                        <th className="py-3 px-3">কর্মকর্তার নাম ও আইডি</th>
                                        <th className="py-3 px-3">পদবী ও স্তর</th>
                                        <th className="py-3 px-3">কর্মস্থল / শাখা</th>
                                        <th className="py-3 px-3 text-center text-emerald-800">অনুমোদিত ঋণ</th>
                                        <th className="py-3 px-3 text-center text-rose-700">বাতিল / প্রত্যাখ্যাত</th>
                                        <th className="py-3 px-3 text-center">মোট সিদ্ধান্ত</th>
                                        <th className="py-3 px-3 text-right text-emerald-800">অনুমোদিত টাকা (৳)</th>
                                        <th className="py-3 px-3 text-right">গড় ঋণ (৳)</th>
                                        <th className="py-3 px-3 text-center">একশন</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium">
                                    {approver_summary.length === 0 ? (
                                        <tr>
                                            <td colSpan={10} className="py-12 text-center text-slate-400">
                                                নির্বাচিত ফিল্টারে কোনো কর্মকর্তার তথ্য পাওয়া যায়নি।
                                            </td>
                                        </tr>
                                    ) : (
                                        approver_summary.map((item, idx) => {
                                            const badgeInfo = getRoleBadge(item.role_slug, item.role_name);
                                            const isSelected = String(item.user_id) === String(userId);
                                            const approvedLoans = item.approved_loans ?? item.total_loans;
                                            const rejectedLoans = item.rejected_loans ?? 0;
                                            const approvedAmount = item.approved_amount ?? item.total_amount;
                                            const avg = approvedLoans > 0 ? approvedAmount / approvedLoans : 0;
                                            const totalActions = item.total_actions ?? item.total_approvals ?? item.total_loans;
                                            const reapprovals = item.reapprovals_count ?? (totalActions > item.total_loans ? totalActions - item.total_loans : 0);

                                            return (
                                                <tr
                                                    key={item.user_id}
                                                    className={`transition ${
                                                        isSelected
                                                            ? 'bg-blue-50/80 font-bold'
                                                            : 'hover:bg-slate-50/80'
                                                    }`}
                                                >
                                                    <td className="py-3 px-3 text-center">
                                                        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-mono text-[11px] font-bold inline-flex items-center justify-center">
                                                            {idx + 1}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        <div className="font-bold text-slate-900 text-[12.5px]">{item.user_name}</div>
                                                        <div className="text-[10px] text-slate-400 font-medium">ID: #{item.user_id}</div>
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] border ${badgeInfo.badge}`}>
                                                                {badgeInfo.label}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-3 text-slate-600">
                                                        {item.branch_name && item.branch_name !== 'N/A' ? item.branch_name : 'হেড অফিস / সর্বজনীন'}
                                                    </td>
                                                    <td className="py-3 px-3 text-center font-mono font-bold text-emerald-700 text-[12.5px]">
                                                        {approvedLoans.toLocaleString('bn-BD')} টি
                                                        {reapprovals > 0 && (
                                                            <span className="block text-[9.5px] text-purple-600 font-normal">
                                                                ({reapprovals}টি পুনঃঅনুমোদন)
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-3 text-center font-mono font-bold text-[12.5px]">
                                                        {rejectedLoans > 0 ? (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                                                                {rejectedLoans.toLocaleString('bn-BD')} টি
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-400 font-normal">০ টি</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-3 text-center font-mono text-slate-700 font-bold text-[12px]">
                                                        {totalActions.toLocaleString('bn-BD')} টি
                                                    </td>
                                                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700 text-[12.5px]">
                                                        {formatCurrency(approvedAmount)} ৳
                                                    </td>
                                                    <td className="py-3 px-3 text-right font-mono text-slate-600">
                                                        {formatCurrency(avg)} ৳
                                                    </td>
                                                    <td className="py-3 px-3 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setUserId(String(item.user_id));
                                                                setActiveTab('detailed');
                                                                const qs = buildQueryString({ user_id: item.user_id });
                                                                router.get(`/reports/approver-loan-approvals?${qs}`);
                                                            }}
                                                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-brand text-white hover:bg-brand-dark transition shadow-2xs active:scale-95 cursor-pointer"
                                                            title={`${item.user_name} এর ঋণের বিস্তারিত তালিকা দেখুন`}
                                                        >
                                                            <span>ঋণ তালিকা</span>
                                                            <ChevronRight className="w-3.5 h-3.5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                                {approver_summary.length > 0 && (
                                    <tfoot>
                                        <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-800">
                                            <td colSpan={4} className="py-3 px-3 text-right">
                                                সর্বমোট (মোট {approver_summary.length} জন কর্মকর্তা):
                                            </td>
                                            <td className="py-3 px-3 text-center font-bold text-emerald-800 text-sm">
                                                {(summary.approved_loans ?? summary.total_loans).toLocaleString('bn-BD')} টি
                                            </td>
                                            <td className="py-3 px-3 text-center font-bold text-rose-800 text-sm">
                                                {(summary.rejected_loans ?? 0).toLocaleString('bn-BD')} টি
                                            </td>
                                            <td className="py-3 px-3 text-center font-bold text-slate-700 text-xs">
                                                {(summary.total_decisions ?? summary.total_approvals ?? summary.total_loans).toLocaleString('bn-BD')} টি
                                            </td>
                                            <td className="py-3 px-3 text-right font-mono text-emerald-800 text-sm">
                                                {formatCurrency(summary.approved_amount ?? summary.total_amount)} ৳
                                            </td>
                                            <td className="py-3 px-3 text-right font-mono text-slate-700">
                                                {formatCurrency(summary.average_amount)} ৳
                                            </td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>
                )}

                {/* TAB 2: DETAILED LOAN APPLICATIONS LIST */}
                {activeTab === 'detailed' && (
                    <div className="bg-white rounded-b-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-50 to-white">
                            <div>
                                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                    ঋণ সিদ্ধান্তের বিস্তারিত ডাটা তালিকা
                                </h2>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                    {selected_approver
                                        ? `${selected_approver.name} কর্তৃক মোট ${approvals.total} টি ঋণ সিদ্ধান্তের রেকর্ড প্রদর্শন করা হচ্ছে`
                                        : `সকল কর্মকর্তার মোট ${approvals.total} টি ঋণ সিদ্ধান্তের রেকর্ড`}
                                </p>
                            </div>

                            <div className="flex items-center gap-2.5 flex-wrap">
                                {userId && (
                                    <button
                                        type="button"
                                        onClick={handleClearApproverFilter}
                                        className="text-xs font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer mr-1"
                                    >
                                        সকল কর্মকর্তা দেখুন
                                    </button>
                                )}

                                <div className="flex items-center gap-1.5">
                                    <label className="text-xs text-slate-500 font-medium">প্রতি পেজে:</label>
                                    <select
                                        value={perPage}
                                        onChange={(e) => {
                                            setPerPage(Number(e.target.value));
                                            const qs = buildQueryString({ per_page: e.target.value });
                                            router.get(`/reports/approver-loan-approvals?${qs}`);
                                        }}
                                        className="text-xs rounded-xl border-slate-300 py-1 pl-2 pr-6"
                                    >
                                        <option value={15}>১৫</option>
                                        <option value={25}>২৫</option>
                                        <option value={50}>৫০</option>
                                        <option value={100}>১০০</option>
                                        <option value={200}>২০০</option>
                                    </select>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => handlePrint('detailed')}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition shadow-2xs cursor-pointer active:scale-95"
                                    title="বিস্তারিত ঋণ তালিকা প্রিন্ট করুন"
                                >
                                    <Printer className="w-3.5 h-3.5 text-slate-600" />
                                    <span>তালিকা প্রিন্ট</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleExportExcel('detailed')}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition shadow-2xs cursor-pointer active:scale-95"
                                    title="বিস্তারিত ঋণ তালিকা এক্সেল ডাউনলোড করুন"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>তালিকা এক্সেল</span>
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                                        <th className="py-3 px-3 text-center w-12">ক্র.</th>
                                        <th className="py-3 px-3">তারিখ ও সময়</th>
                                        <th className="py-3 px-3">আবেদন নং</th>
                                        <th className="py-3 px-3">সদস্যের নাম ও কোড</th>
                                        <th className="py-3 px-3">শাখা ও সমিতি</th>
                                        <th className="py-3 px-3">প্রোডাক্ট</th>
                                        <th className="py-3 px-3 text-right">চাহিদাকৃত (৳)</th>
                                        <th className="py-3 px-3 text-right">অনুমোদিত টাকা (৳)</th>
                                        <th className="py-3 px-3 text-center">সিদ্ধান্ত</th>
                                        <th className="py-3 px-3">কর্মকর্তা ও স্তর</th>
                                        <th className="py-3 px-3">মন্তব্য / বাতিলের কারণ</th>
                                        <th className="py-3 px-3 text-center">ভিউ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium">
                                    {approvals.data.length === 0 ? (
                                        <tr>
                                            <td colSpan={12} className="py-12 text-center text-slate-400">
                                                নির্বাচিত ফিল্টারে কোনো ঋণের সিদ্ধান্তের তথ্য পাওয়া যায়নি।
                                            </td>
                                        </tr>
                                    ) : (
                                        approvals.data.map((item, index) => {
                                            const sl = (approvals.current_page - 1) * approvals.per_page + index + 1;
                                            const isRej = item.action_status === 'rejected';

                                            return (
                                                <tr
                                                    key={item.id}
                                                    className={`transition ${isRej ? 'bg-rose-50/40 hover:bg-rose-50/70' : 'hover:bg-slate-50/80'}`}
                                                >
                                                    <td className="py-3 px-3 text-center text-slate-400 font-semibold">{sl}</td>
                                                    <td className="py-3 px-3 whitespace-nowrap">
                                                        <div className="font-bold text-slate-800">{item.approval_date}</div>
                                                        <div className="text-[10.5px] text-slate-400">{item.approval_time}</div>
                                                    </td>
                                                    <td className="py-3 px-3 whitespace-nowrap">
                                                        <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                                                            {item.application_no}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        <div className="font-bold text-slate-800">{item.member_name}</div>
                                                        <div className="text-[10.5px] text-slate-500 font-mono">
                                                            কোড: {item.member_code} {item.member_mobile !== '—' && `• ${item.member_mobile}`}
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        <div className="font-semibold text-slate-700">{item.branch_name}</div>
                                                        <div className="text-[10.5px] text-slate-400 truncate max-w-[150px]">{item.samity_name}</div>
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        <span className="font-semibold text-slate-700">{item.product_name}</span>
                                                    </td>
                                                    <td className="py-3 px-3 text-right font-mono text-slate-500">
                                                        {formatCurrency(item.requested_amount)}
                                                    </td>
                                                    <td className="py-3 px-3 text-right font-mono font-bold">
                                                        {isRej ? (
                                                            <span className="text-slate-400 line-through">০.০০</span>
                                                        ) : (
                                                            <span className="text-emerald-700">{formatCurrency(item.approved_amount)}</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-3 text-center whitespace-nowrap">
                                                        {isRej ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                                                <XCircle className="w-3 h-3 text-rose-600" />
                                                                <span>বাতিল / প্রত্যাখ্যাত</span>
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                                <span>অনুমোদিত</span>
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        <div className="font-bold text-slate-800">{item.approver_name}</div>
                                                        <div className="text-[10.5px] text-indigo-700 font-semibold">
                                                            {item.approver_role} • {item.level_label}
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-3 max-w-[220px]">
                                                        {item.comments ? (
                                                            <div className={`p-1.5 rounded-lg text-[11px] leading-tight ${
                                                                isRej ? 'bg-rose-100/70 text-rose-900 border border-rose-200 font-medium' : 'text-slate-700 bg-slate-50'
                                                            }`}>
                                                                {item.comments}
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-400">—</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-3 text-center">
                                                        <a
                                                            href={`/member/loan-applications/${item.loan_id}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-1.5 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-brand hover:bg-brand-soft transition cursor-pointer"
                                                            title="ঋণ আবেদন বিস্তারিত দেখুন"
                                                        >
                                                            <ExternalLink className="w-4 h-4" />
                                                        </a>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                                {approvals.data.length > 0 && (
                                    <tfoot>
                                        <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-800">
                                            <td colSpan={7} className="py-3 px-3 text-right">
                                                এই পেজের মোট অনুমোদিত টাকা:
                                            </td>
                                            <td className="py-3 px-3 text-right font-mono text-emerald-800 text-sm">
                                                {formatCurrency(
                                                    approvals.data.reduce(
                                                        (sum, item) => sum + (item.action_status === 'rejected' ? 0 : item.approved_amount),
                                                        0
                                                    )
                                                )} ৳
                                            </td>
                                            <td colSpan={4} className="py-3 px-3 text-slate-500 text-[11px]">
                                                {approvals.data.filter((a) => a.action_status !== 'rejected').length} টি অনুমোদিত,{' '}
                                                {approvals.data.filter((a) => a.action_status === 'rejected').length} টি বাতিল
                                            </td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>

                        {/* Pagination Links */}
                        {approvals.last_page > 1 && (
                            <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                                <span className="text-xs text-slate-500 font-medium">
                                    মোট <strong>{approvals.total}</strong> টির মধ্যে <strong>{(approvals.current_page - 1) * approvals.per_page + 1}</strong> থেকে <strong>{Math.min(approvals.current_page * approvals.per_page, approvals.total)}</strong> দেখানো হচ্ছে
                                </span>
                                <div className="flex items-center gap-1 flex-wrap">
                                    {approvals.links.map((link, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => link.url && router.get(link.url)}
                                            disabled={!link.url}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                            className={`px-3 py-1.5 text-xs rounded-xl font-semibold transition cursor-pointer ${
                                                link.active
                                                    ? 'bg-brand text-white shadow-xs'
                                                    : 'text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none'
                                            }`}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 3: DATE-WISE BREAKDOWN SUMMARY */}
                {activeTab === 'date_wise' && (
                    <div className="bg-white rounded-b-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
                            <div>
                                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                    তারিখ অনুযায়ী ঋণ সিদ্ধান্ত ও অনুমোদন বিবরণী
                                </h2>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                    প্রতিটি দিনে অনুমোদিত ও বাতিলকৃত ঋণের সংখ্যা এবং টাকার পরিমাণ
                                </p>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-xl">
                                    মোট কার্যদিবস: {date_summary.length} দিন
                                </span>
                                <button
                                    type="button"
                                    onClick={() => handlePrint('date_wise')}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition shadow-2xs cursor-pointer active:scale-95"
                                    title="তারিখভিত্তিক বিবরণী প্রিন্ট করুন"
                                >
                                    <Printer className="w-3.5 h-3.5 text-slate-600" />
                                    <span>তারিখ বিবরণী প্রিন্ট</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleExportExcel('date_wise')}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition shadow-2xs cursor-pointer active:scale-95"
                                    title="তারিখভিত্তিক বিবরণী এক্সেল ডাউনলোড করুন"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>তারিখ এক্সেল</span>
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                                        <th className="py-3 px-3 text-center w-12">ক্র.</th>
                                        <th className="py-3 px-3">তারিখ (Date)</th>
                                        <th className="py-3 px-3 text-center text-emerald-800">অনুমোদিত ঋণ</th>
                                        <th className="py-3 px-3 text-right text-emerald-800">অনুমোদিত মোট টাকা (৳)</th>
                                        <th className="py-3 px-3 text-center text-rose-700">বাতিলকৃত ঋণ</th>
                                        <th className="py-3 px-3 text-center">মোট সিদ্ধান্ত</th>
                                        <th className="py-3 px-3">কর্মকর্তাদের ব্রেকডাউন</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium">
                                    {date_summary.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="py-12 text-center text-slate-400">
                                                কোনো তারিখভিত্তিক তথ্য পাওয়া যায়নি।
                                            </td>
                                        </tr>
                                    ) : (
                                        date_summary.map((dItem, idx) => (
                                            <tr key={dItem.date} className="hover:bg-slate-50/80 transition">
                                                <td className="py-3 px-3 text-center text-slate-400 font-semibold">{idx + 1}</td>
                                                <td className="py-3 px-3 whitespace-nowrap">
                                                    <div className="font-bold text-slate-800">{dItem.formatted_date}</div>
                                                    <div className="text-[10px] text-slate-400 font-mono">{dItem.date}</div>
                                                </td>
                                                <td className="py-3 px-3 text-center">
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                        {(dItem.approved_count ?? dItem.total_loans).toLocaleString('bn-BD')} টি
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700 text-sm">
                                                    {formatCurrency(dItem.approved_amount ?? dItem.total_amount)} ৳
                                                </td>
                                                <td className="py-3 px-3 text-center">
                                                    {(dItem.rejected_count ?? 0) > 0 ? (
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                                            {(dItem.rejected_count ?? 0).toLocaleString('bn-BD')} টি
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400">—</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-3 text-center font-bold text-slate-700 font-mono">
                                                    {dItem.total_loans.toLocaleString('bn-BD')} টি
                                                </td>
                                                <td className="py-3 px-3">
                                                    <div className="space-y-1">
                                                        {dItem.approvers.map((ap) => (
                                                            <div key={ap.user_id} className="text-[11.5px] flex items-center gap-1.5 flex-wrap">
                                                                <span className="font-bold text-slate-800">{ap.user_name}</span>
                                                                <span className="text-[10px] text-slate-500 font-medium">({ap.role_name}):</span>
                                                                <span className="font-mono font-bold text-emerald-700">
                                                                    {(ap.approved_count ?? ap.loans_count)} টি অনুমোদন
                                                                </span>
                                                                {Boolean(ap.rejected_count && ap.rejected_count > 0) && (
                                                                    <span className="font-mono font-bold text-rose-600 bg-rose-50 px-1 rounded">
                                                                        • {ap.rejected_count} টি বাতিল
                                                                    </span>
                                                                )}
                                                                <span className="text-slate-400">•</span>
                                                                <span className="font-mono text-slate-600 font-medium">{formatCurrency(ap.approved_amount ?? ap.total_amount)} ৳</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                                {date_summary.length > 0 && (
                                    <tfoot>
                                        <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-800">
                                            <td colSpan={2} className="py-3 px-3 text-right">
                                                সর্বমোট (Grand Total):
                                            </td>
                                            <td className="py-3 px-3 text-center font-bold text-emerald-800">
                                                {(summary.approved_loans ?? summary.total_loans).toLocaleString('bn-BD')} টি
                                            </td>
                                            <td className="py-3 px-3 text-right font-mono text-emerald-800 text-sm">
                                                {formatCurrency(summary.approved_amount ?? summary.total_amount)} ৳
                                            </td>
                                            <td className="py-3 px-3 text-center font-bold text-rose-800">
                                                {(summary.rejected_loans ?? 0).toLocaleString('bn-BD')} টি
                                            </td>
                                            <td className="py-3 px-3 text-center font-bold text-slate-800">
                                                {(summary.total_decisions ?? summary.total_loans).toLocaleString('bn-BD')} টি
                                            </td>
                                            <td className="py-3 px-3 text-slate-500 text-[11px]">
                                                মোট {summary.unique_approvers} জন কর্মকর্তার কার্যক্রম
                                            </td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
