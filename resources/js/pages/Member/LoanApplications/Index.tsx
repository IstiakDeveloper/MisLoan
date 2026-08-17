import { useState, useMemo, useEffect } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { formatDate } from '@/utils/dateUtils';
import {
    Plus, Calendar, FileText, CheckCircle, XCircle, Clock,
    Search, Eye, Edit, Trash2, X, AlertTriangle, MessageSquare, Send,
    Filter, RefreshCw, UserCheck, Layers, CreditCard, ChevronRight, AlertCircle, ArrowUpRight, Sparkles,
    Download
} from 'lucide-react';
import ListPagination from '@/components/ListPagination';
import AutoFitTableContainer from '@/components/AutoFitTableContainer';
import { keepListFilters } from '@/utils/branchLabel';

interface LoanProduct {
    id: number;
    product_name: string;
    product_name_bn: string;
    product_code: string;
    interest_rate: number;
    min_amount: number;
    max_amount: number;
    duration_months: number;
}

interface LoanCategory {
    id: number;
    category_name: string;
    category_name_bn: string;
    category_code: string;
    loan_products: LoanProduct[];
}

const FORM_NAMES: Record<number, string> = {
    1: 'ঋণ চুক্তি',
    2: 'জামিনদার অঙ্গীকার',
    3: 'মৃত্যুঝুঁকি তহবিল',
    4: 'সরেজমিন তদন্ত',
    5: 'আবেদন ও অনুমোদন',
};

interface LoanApplicationIssue {
    id: number;
    issue_description: string;
    status: string;
    response_message?: string;
    responded_at?: string;
    created_at: string;
    reporter?: {
        id: number;
        name: string;
    };
}

interface LoanApplication {
    id: number;
    application_no: string;
    status: string;
    requested_amount: number;
    approved_amount?: number;
    loan_product_id?: number;
    loan_category_id?: number;
    loan_product: LoanProduct & { installment_type?: string };
    loan_category: LoanCategory;
    created_at: string;
    submitted_at?: string;
    reviewed_at?: string;
    disbursed_at?: string;
    member_code?: string;
    member_admission?: {
        id: number;
        applicant_name_en?: string;
        applicant_name_bn?: string;
        application_no?: string;
        member_code?: string;
        nid_number?: string;
        mobile_number?: string;
        is_legacy?: boolean;
        loan_dofa?: number;
    };
    /** For display when member_admission is null (legacy/old member) */
    member_display?: {
        applicant_name_bn?: string;
        applicant_name_en?: string;
        application_no?: string;
        member_code?: string;
        nid_number?: string;
        mobile_number?: string;
        is_legacy?: boolean;
        loan_dofa?: number;
    };
    visible_form_ids?: number[];
    editable_form_ids?: number[];
    form_saved?: Record<number, boolean>;
    all_forms_complete?: boolean;
    can_submit?: boolean;
    can_disburse?: boolean;
    member_admission_status?: string;
    issues?: LoanApplicationIssue[];
    tracking_state?: {
        label: string;
        pending_with_name?: string | null;
    };
}

interface Stats {
    total: number;
    draft: number;
    submitted: number;
    approved: number;
    pending_disbursement?: number;
    rejected: number;
    ready_for_head_office?: number;
    pending_head_office?: number;
    under_review?: number;
    disbursed?: number;
    pending_my_approval?: number;
}

interface Props {
    categories: LoanCategory[];
    applications: {
        data: LoanApplication[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from?: number | null;
        to?: number | null;
    };
    stats: Stats;
    selectedDate: string;
    dateFrom?: string;
    dateTo?: string;
    statusFilter?: string;
    searchFilter?: string;
    perPage?: number;
    preselectedMember?: Member | null;
    workQueue?: {
        default_status?: string | null;
        label?: string;
        hint?: string | null;
    };
    flash?: {
        success?: string;
        error?: string;
    };
}

const statusLabels: Record<string, { label: string; bg: string; text: string; border: string }> = {
    draft: { label: 'Draft (খসড়া)', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
    submitted: { label: 'Submitted (জমা)', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    under_review: { label: 'Under Review (পর্যালোচনা)', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    ready_for_head_office: { label: 'Branch Approved', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    pending_head_office: { label: 'Pending Head Office', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
    approved: { label: 'Approved (অনুমোদিত)', bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300' },
    pending_disbursement: { label: 'Disburse Pending (বিতরণ অপেক্ষা)', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
    rejected: { label: 'Rejected (প্রত্যাখ্যাত)', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
    disbursed: { label: 'Disbursed (বিতরণকৃত)', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
};

const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-BD', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

interface ActiveLoan {
    id: number;
    application_no: string;
    status: string;
    product_name: string;
    product_name_bn: string;
    category_name: string;
    requested_amount: number;
    expected_end_date?: string;
    created_at: string;
    loan_term_months?: number;
}

interface Member {
    id: number;
    applicant_name_en: string;
    applicant_name_bn: string;
    nid_number: string;
    mobile_number: string;
    application_no: string;
    status: string;
    requested_loan_amount?: number | string;
    has_active_loan?: boolean;
    active_loans?: ActiveLoan[];
}

export default function Index({ categories, applications, stats, selectedDate, dateFrom, dateTo, statusFilter = 'all', searchFilter = '', perPage = 20, preselectedMember = null, workQueue, flash }: Props) {
    const pageAuth = usePage().props.auth as { user?: { role?: { name: string } } } | undefined;
    const roleName = pageAuth?.user?.role?.name?.toLowerCase() || '';
    const isBranchUser = roleName === 'branch_user';
    const isBranchManager = roleName === 'branch_manager';
    const isFieldOfficer = roleName === 'field_officer';
    const canCreateLoanApplication = isFieldOfficer || roleName === 'branch_user';

    const handleSubmitApplication = (app: LoanApplication) => {
        if (!app.can_submit) return;
        if (confirm(`ঋণ আবেদন ${app.application_no} শাখা ব্যবস্থাপকের কাছে জমা দিতে চান?`)) {
            router.patch(`/member/loan-applications/${app.id}/submit`, {}, keepListFilters);
        }
    };

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const firstDayOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const [currentDateFrom, setCurrentDateFrom] = useState(dateFrom || '');
    const [currentDateTo, setCurrentDateTo] = useState(dateTo || '');
    const [currentStatusFilter, setCurrentStatusFilter] = useState(statusFilter || 'all');
    const [searchQuery, setSearchQuery] = useState(searchFilter);
    const [showNewModal, setShowNewModal] = useState(!!preselectedMember && canCreateLoanApplication);
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
    const [showSuccessMessage, setShowSuccessMessage] = useState(!!flash?.success);
    const [selectedIssue, setSelectedIssue] = useState<{ applicationId: number; issueId: number } | null>(null);
    const [showResolveModal, setShowResolveModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [selectedHoIds, setSelectedHoIds] = useState<number[]>([]);
    const [bulkSending, setBulkSending] = useState(false);

    const resolveForm = useForm({
        response_message: '',
    });

    const rejectForm = useForm({
        response_message: '',
    });

    useEffect(() => {
        setCurrentDateFrom(dateFrom || '');
        setCurrentDateTo(dateTo || '');
        setCurrentStatusFilter(statusFilter || 'all');
    }, [dateFrom, dateTo, statusFilter]);

    useEffect(() => {
        if (flash?.success) {
            setShowSuccessMessage(true);
            const timer = setTimeout(() => setShowSuccessMessage(false), 5000);
            return () => clearTimeout(timer);
        }
    }, [flash?.success]);
    const [products, setProducts] = useState<LoanProduct[]>([]);

    // Modal search states
    const [memberSearchQuery, setMemberSearchQuery] = useState('');
    const [memberSearchResults, setMemberSearchResults] = useState<Member[]>([]);
    const [selectedMember, setSelectedMember] = useState<Member | null>(preselectedMember);
    const [requestedAmount, setRequestedAmount] = useState(preselectedMember?.requested_loan_amount ? String(preselectedMember.requested_loan_amount) : '');
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        if (!preselectedMember || !canCreateLoanApplication) return;
        setShowNewModal(true);
        setSelectedMember(preselectedMember);
        if (preselectedMember.requested_loan_amount) {
            setRequestedAmount(String(preselectedMember.requested_loan_amount));
        }
    }, [preselectedMember, canCreateLoanApplication]);

    const isTodayFilter = currentDateFrom === today && currentDateTo === today;

    const buildListParams = (overrides: Record<string, string | number> = {}) => {
        const params: Record<string, string | number> = {
            date_from: currentDateFrom,
            date_to: currentDateTo,
            per_page: applications.per_page || perPage || 20,
            ...overrides,
        };
        const status = Object.prototype.hasOwnProperty.call(overrides, 'status')
            ? overrides.status
            : currentStatusFilter;
        params.status = (status as string) || 'all';
        const search = Object.prototype.hasOwnProperty.call(overrides, 'search')
            ? overrides.search
            : searchQuery;
        if (search) {
            params.search = search as string;
        } else {
            delete params.search;
        }
        Object.keys(params).forEach((key) => {
            if (key === 'status') return;
            if (params[key] === '' || params[key] === undefined || params[key] === null) {
                delete params[key];
            }
        });
        return params;
    };

    const applyListFilters = (overrides: Record<string, string | number> = {}) => {
        router.get('/member/loan-applications', buildListParams(overrides), {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleTodayFilter = () => {
        setCurrentDateFrom(today);
        setCurrentDateTo(today);
        applyListFilters({ date_from: today, date_to: today, page: 1 });
    };

    const handleDateFilterChange = () => {
        applyListFilters({ page: 1 });
    };

    const resetFilters = () => {
        setCurrentDateFrom('');
        setCurrentDateTo('');
        setCurrentStatusFilter(workQueue?.default_status || 'all');
        setSearchQuery('');
        router.get('/member/loan-applications', {
            per_page: applications.per_page || perPage || 20,
        }, { preserveState: true });
    };

    const getEffectiveDate = (app: LoanApplication) => {
        return (app as any).disbursed_at || (app as any).reviewed_at || (app as any).submitted_at || app.created_at;
    };

    const handleExportExcel = () => {
        const params = new URLSearchParams();
        const p = buildListParams();
        Object.entries(p).forEach(([key, val]) => {
            if (val !== undefined && val !== null && val !== '') {
                params.set(key, String(val));
            }
        });
        window.location.href = `/member/loan-applications/export/excel?${params.toString()}`;
    };

    const handleNewApplication = () => {
        setShowNewModal(true);
        setSelectedCategory(null);
        setSelectedProduct(null);
        setProducts([]);
        setMemberSearchQuery('');
        setMemberSearchResults([]);
        setSelectedMember(null);
        setRequestedAmount('');
    };

    const handleCategoryChange = (categoryId: number) => {
        setSelectedCategory(categoryId);
        setSelectedProduct(null);
        const category = categories.find(c => c.id === categoryId);
        setProducts(category?.loan_products || []);
    };

    const handleProductChange = (productId: number) => {
        setSelectedProduct(productId);
    };

    const handleMemberSearch = async (query: string) => {
        setMemberSearchQuery(query);
        if (query.length < 3) {
            setMemberSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const response = await fetch(`/member/loan-applications/search-members?query=${encodeURIComponent(query)}`);
            const data = await response.json();
            setMemberSearchResults(data);
        } catch (error) {
            console.error('Member search failed:', error);
            setMemberSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const handleMemberSelect = (member: Member) => {
        if (member.status === 'rejected') return;
        if (member.has_active_loan) {
            alert('ঋণ সক্রিয় থাকা পর্যন্ত একই সদস্যের নামে ২ বার ঋণ আবেদন করা যাবে না।');
            return;
        }
        setSelectedMember(member);
        if (member.requested_loan_amount) {
            setRequestedAmount(String(member.requested_loan_amount));
        }
        setMemberSearchQuery('');
        setMemberSearchResults([]);
    };

    const handleSubmit = () => {
        if (selectedMember?.has_active_loan) {
            alert('ঋণ সক্রিয় থাকা পর্যন্ত একই সদস্যের নামে ২ বার ঋণ আবেদন করা যাবে না।');
            return;
        }
        if (selectedCategory && selectedProduct && selectedMember && requestedAmount) {
            // Creates draft + opens Show hub with all forms generated
            router.visit(
                `/member/loan-applications/form-selection?loan_category_id=${selectedCategory}&loan_product_id=${selectedProduct}&member_id=${selectedMember.id}&requested_amount=${requestedAmount}`,
            );
        }
    };

    const handleResolveIssue = (applicationId: number, issueId: number) => {
        setSelectedIssue({ applicationId, issueId });
        setShowResolveModal(true);
        resolveForm.reset();
    };

    const handleRejectIssue = (applicationId: number, issueId: number) => {
        setSelectedIssue({ applicationId, issueId });
        setShowRejectModal(true);
        rejectForm.reset();
    };

    const submitResolve = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedIssue) {
            resolveForm.post(`/member/loan-applications/${selectedIssue.applicationId}/issues/${selectedIssue.issueId}/resolve`, {
                preserveScroll: true,
                onSuccess: () => {
                    setShowResolveModal(false);
                    setSelectedIssue(null);
                    resolveForm.reset();
                },
            });
        }
    };

    const submitReject = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedIssue) {
            rejectForm.post(`/member/loan-applications/${selectedIssue.applicationId}/issues/${selectedIssue.issueId}/reject`, {
                preserveScroll: true,
                onSuccess: () => {
                    setShowRejectModal(false);
                    setSelectedIssue(null);
                    rejectForm.reset();
                },
            });
        }
    };

    const filteredStats = useMemo(() => {
        return {
            total: stats.total || 0,
            draft: stats.draft || 0,
            submitted: stats.submitted || 0,
            approved: stats.approved || 0,
            pending_disbursement: stats.pending_disbursement || 0,
            rejected: stats.rejected || 0,
            pending_head_office: (stats as any).pending_head_office || 0,
            ready_for_head_office: (stats as any).ready_for_head_office || 0,
            under_review: (stats as any).under_review || 0,
            disbursed: (stats as any).disbursed || 0,
            pending_my_approval: (stats as any).pending_my_approval || 0,
        };
    }, [stats]);

    const applicationRows = applications.data ?? [];
    const defaultStatus = workQueue?.default_status || '';
    const isAllStatus = currentStatusFilter === 'all' || currentStatusFilter === '';
    const loanStatCards = [
        ...(defaultStatus
            ? [{
                key: defaultStatus,
                label: workQueue?.label || 'আমার কাজ',
                count: (filteredStats as Record<string, number>)[defaultStatus] || 0,
                active: 'bg-indigo-600 border-indigo-600 text-white',
                idle: 'bg-white border-indigo-200 hover:border-indigo-300',
                labelActive: 'text-indigo-100',
                labelIdle: 'text-indigo-700',
                countActive: 'text-white',
                countIdle: 'text-indigo-700',
            }]
            : []),
        {
            key: 'all',
            label: 'সর্বমোট',
            count: filteredStats.total,
            active: 'bg-slate-900 border-slate-900 text-white',
            idle: 'bg-white border-slate-200 hover:border-slate-300',
            labelActive: 'text-slate-300',
            labelIdle: 'text-slate-500',
            countActive: 'text-white',
            countIdle: 'text-slate-900',
        },
        { key: 'draft', label: 'খসড়া', count: filteredStats.draft, active: 'bg-slate-800 border-slate-800 text-white', idle: 'bg-white border-slate-200 hover:border-slate-300', labelActive: 'text-slate-300', labelIdle: 'text-slate-500', countActive: 'text-white', countIdle: 'text-slate-700' },
        { key: 'submitted', label: 'জমাকৃত', count: filteredStats.submitted, active: 'bg-blue-600 border-blue-600 text-white', idle: 'bg-white border-blue-100 hover:border-blue-300', labelActive: 'text-blue-100', labelIdle: 'text-blue-600', countActive: 'text-white', countIdle: 'text-blue-600' },
        { key: 'under_review', label: 'পর্যালোচনা', count: filteredStats.under_review, active: 'bg-amber-500 border-amber-500 text-white', idle: 'bg-white border-amber-100 hover:border-amber-300', labelActive: 'text-amber-100', labelIdle: 'text-amber-700', countActive: 'text-white', countIdle: 'text-amber-700' },
        { key: 'ready_for_head_office', label: 'হেড অফিসে পাঠান', count: filteredStats.ready_for_head_office, active: 'bg-emerald-600 border-emerald-600 text-white', idle: 'bg-white border-emerald-100 hover:border-emerald-300', labelActive: 'text-emerald-100', labelIdle: 'text-emerald-700', countActive: 'text-white', countIdle: 'text-emerald-700' },
        { key: 'pending_head_office', label: 'হেড অফিসে', count: filteredStats.pending_head_office, active: 'bg-indigo-600 border-indigo-600 text-white', idle: 'bg-white border-indigo-100 hover:border-indigo-300', labelActive: 'text-indigo-100', labelIdle: 'text-indigo-700', countActive: 'text-white', countIdle: 'text-indigo-700' },
        { key: 'approved', label: 'অনুমোদিত', count: filteredStats.approved, active: 'bg-emerald-600 border-emerald-600 text-white', idle: 'bg-white border-emerald-100 hover:border-emerald-300', labelActive: 'text-emerald-100', labelIdle: 'text-emerald-600', countActive: 'text-white', countIdle: 'text-emerald-600' },
        { key: 'pending_disbursement', label: 'বিতরণ অপেক্ষা', count: filteredStats.pending_disbursement, active: 'bg-amber-600 border-amber-600 text-white', idle: 'bg-white border-amber-100 hover:border-amber-300', labelActive: 'text-amber-100', labelIdle: 'text-amber-700', countActive: 'text-white', countIdle: 'text-amber-700' },
        { key: 'rejected', label: 'প্রত্যাখ্যাত', count: filteredStats.rejected, active: 'bg-rose-600 border-rose-600 text-white', idle: 'bg-white border-rose-100 hover:border-rose-300', labelActive: 'text-rose-100', labelIdle: 'text-rose-600', countActive: 'text-white', countIdle: 'text-rose-600' },
    ].filter((stat, index, all) => all.findIndex((s) => s.key === stat.key) === index);

    const selectStatus = (status: string) => {
        const next = status || 'all';
        setCurrentStatusFilter(next);
        applyListFilters({ status: next, page: 1 });
    };

    const isStatActive = (key: string) => (key === 'all' ? isAllStatus : currentStatusFilter === key);

    const readyForHoIds = useMemo(
        () => applicationRows.filter((a) => a.status === 'ready_for_head_office').map((a) => a.id),
        [applicationRows],
    );
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
        if (!confirm(`${selectedHoIds.length}টি ঋণ আবেদন Head Office এ পাঠাতে চান?`)) return;

        setBulkSending(true);
        router.post(
            '/member/loan-applications/send-to-head-office-bulk',
            { ids: selectedHoIds },
            {
                ...keepListFilters,
                onFinish: () => {
                    setBulkSending(false);
                    setSelectedHoIds([]);
                },
            },
        );
    };

    return (
        <AdminLayout>
            <Head title="Loan Applications (ঋণ আবেদন)" />

            <div className="p-3 md:p-4 space-y-3 max-w-[1600px] mx-auto">
                {/* Flash Success Message */}
                {showSuccessMessage && flash?.success && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2.5 shadow-sm text-xs">
                        <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="font-bold text-emerald-900">{flash.success}</p>
                        </div>
                        <button
                            onClick={() => setShowSuccessMessage(false)}
                            className="text-emerald-600 hover:text-emerald-800"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* COMPACT HEADER BAR */}
                <div className="bg-slate-900 text-white rounded-xl px-4 py-3 shadow-md flex flex-wrap items-center justify-between gap-3 border border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30">
                            <CreditCard className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white tracking-tight">
                                Loan Applications (ঋণ আবেদনসমূহ)
                            </h1>
                            <p className="text-xs text-slate-400">
                                নতুন ঋণ আবেদন তৈরি করুন, ফর্মের অগ্রগতি ট্র্যাক করুন এবং অনুমোদন স্থিতি পরীক্ষা করুন
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleTodayFilter}
                            className={`px-3.5 py-2 rounded-lg text-xs font-extrabold shadow transition flex items-center gap-1.5 border ${
                                isTodayFilter
                                    ? 'bg-blue-600 text-white border-blue-500'
                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                            }`}
                            title="আজকের আবেদনসমূহ (Today)"
                        >
                            <Calendar className="w-4 h-4" /> Today (আজ)
                        </button>

                        <button
                            type="button"
                            onClick={handleExportExcel}
                            className="px-3.5 py-2 rounded-lg text-xs font-extrabold shadow transition flex items-center gap-1.5 border bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500"
                            title="XLSX এক্সেল ডাউনলোড"
                        >
                            <Download className="w-4 h-4" />
                            <span>XLSX Download</span>
                        </button>

                        {canCreateLoanApplication && (
                            <button
                                onClick={handleNewApplication}
                                className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-extrabold shadow-md transition flex items-center gap-1.5 border border-blue-500/30"
                            >
                                <Plus className="w-4 h-4" />
                                <span>নতুন ঋণ আবেদন</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* COMPACT METRIC STATS PILLS */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                    {loanStatCards.map((stat) => {
                        const active = isStatActive(stat.key);
                        return (
                            <div
                                key={stat.key}
                                onClick={() => selectStatus(stat.key)}
                                className={`rounded-xl p-2.5 border shadow-sm cursor-pointer transition ${active ? stat.active : stat.idle}`}
                            >
                                <span className={`text-[10px] font-bold uppercase block ${active ? stat.labelActive : stat.labelIdle}`}>
                                    {stat.label}
                                </span>
                                <span className={`text-lg font-black ${active ? stat.countActive : stat.countIdle}`}>
                                    {stat.count}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {workQueue?.hint && !isAllStatus && (
                    <p className="text-xs text-indigo-800 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2">
                        {workQueue.hint}
                    </p>
                )}

                {/* INTEGRATED SEARCH & FILTER CONTROL BAR */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 space-y-2 text-xs">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                        {/* Date From */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                হতে (Date From)
                            </label>
                            <input
                                type="date"
                                value={currentDateFrom}
                                onChange={(e) => setCurrentDateFrom(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                            />
                        </div>

                        {/* Date To */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                পর্যন্ত (Date To)
                            </label>
                            <input
                                type="date"
                                value={currentDateTo}
                                onChange={(e) => setCurrentDateTo(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                            />
                        </div>

                        {/* Status Filter */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                স্ট্যাটাস (Status)
                            </label>
                            <select
                                value={currentStatusFilter === 'all' ? 'all' : currentStatusFilter}
                                onChange={(e) => selectStatus(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
                            >
                                {defaultStatus === 'pending_my_approval' && (
                                    <option value="pending_my_approval">আমার অনুমোদন</option>
                                )}
                                <option value="all">সকল স্ট্যাটাস</option>
                                <option value="draft">Draft (খসড়া)</option>
                                <option value="submitted">Submitted (জমা)</option>
                                <option value="under_review">Under Review (পর্যালোচনা)</option>
                                <option value="ready_for_head_office">Branch Approved (শাখা অনুমোদিত)</option>
                                <option value="pending_head_office">Pending Head Office (হেড অফিসে প্রেরিত)</option>
                                <option value="approved">Approved (অনুমোদিত)</option>
                                <option value="pending_disbursement">Disburse Pending (বিতরণ অপেক্ষা)</option>
                                <option value="rejected">Rejected (প্রত্যাখ্যাত)</option>
                                <option value="disbursed">Disbursed (বিতরণকৃত)</option>
                            </select>
                        </div>

                        {/* Search Input */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                খুঁজুন (Search)
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="সদস্য কোড, নাম, ফোন..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            applyListFilters({ page: 1 });
                                        }
                                    }}
                                    className="w-full pl-7 pr-6 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400"
                                />
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Filter & Reset Action Buttons */}
                        <div className="col-span-2 flex items-end gap-1.5">
                            <button
                                type="button"
                                onClick={handleTodayFilter}
                                className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg shadow transition flex items-center justify-center gap-1 border ${
                                    isTodayFilter
                                        ? 'bg-blue-600 text-white border-blue-500'
                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                                }`}
                                title="আজকের আবেদনসমূহ (Today)"
                            >
                                <Calendar className="w-3.5 h-3.5" /> আজ
                            </button>
                            <button
                                type="button"
                                onClick={handleExportExcel}
                                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg shadow transition flex items-center justify-center gap-1 border bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
                                title="XLSX এক্সেল ডাউনলোড"
                            >
                                <Download className="w-3.5 h-3.5" /> XLSX
                            </button>
                            <button
                                onClick={handleDateFilterChange}
                                className="flex-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow transition flex items-center justify-center gap-1"
                            >
                                <Filter className="w-3.5 h-3.5" /> ফিল্টার
                            </button>
                            <button
                                onClick={resetFilters}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition border border-slate-200 flex items-center justify-center gap-1"
                                title="ফিল্টার রিসেট"
                            >
                                <RefreshCw className="w-3.5 h-3.5" /> রিসেট
                            </button>
                        </div>
                    </div>
                </div>

                {/* APPLICATIONS CONTAINER */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-3 md:p-4 space-y-3">
                    {/* Application List Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
                        <h3 className="font-bold text-slate-800">ঋণ আবেদনের তালিকা</h3>
                        <span className="text-slate-500 font-semibold">
                            মোট পাওয়া গেছে: <strong className="text-slate-900 font-bold">{applications.total}</strong> টি আবেদন
                        </span>
                    </div>

                    {isBranchUser && readyForHoIds.length > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2.5">
                            <p className="text-sm text-indigo-900">
                                শাখা অনুমোদিত: <span className="font-semibold">{readyForHoIds.length}</span> · সিলেক্টেড:{' '}
                                <span className="font-semibold">{selectedHoIds.length}</span>
                        </p>
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    onClick={toggleSelectAllReady}
                                    className="rounded-lg border border-indigo-300 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-800 hover:bg-indigo-100"
                                >
                                    {allReadySelected ? 'সব আনসিলেক্ট' : 'একবারে সব সিলেক্ট'}
                                </button>
                                <button
                                    type="button"
                                    onClick={sendSelectedToHeadOffice}
                                    disabled={selectedHoIds.length === 0 || bulkSending}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 px-3 py-1.5 text-xs font-bold text-white"
                                >
                                    <Send className="w-3.5 h-3.5" />
                                    {bulkSending ? 'পাঠানো হচ্ছে...' : `HO তে পাঠান (${selectedHoIds.length})`}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* MOBILE CARDS VIEW (md:hidden) */}
                    <div className="md:hidden flex flex-col gap-3.5">
                        {applicationRows.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-xs font-medium">
                                {workQueue?.hint && !isAllStatus
                                    ? 'এখন কোনো পেন্ডিং কাজ নেই। সব আবেদন দেখতে “সর্বমোট” চাপুন।'
                                    : 'কোনো ঋণ আবেদন পাওয়া যায়নি।'}
                            </div>
                        ) : (
                            applicationRows.map((app) => {
                                const member = app.member_display ?? app.member_admission;
                                const memberCode = member?.application_no || member?.member_code || app.member_code || '—';
                                const pendingIssues = app.issues?.filter((issue) => issue.status === 'pending') || [];
                                const hasPendingIssues = pendingIssues.length > 0;
                                let statusInfo = statusLabels[app.status] || statusLabels.draft;

                                return (
                                    <div
                                        key={app.id}
                                        className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3 relative overflow-hidden"
                                    >
                                        <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                                            <div className="flex items-center gap-2.5">
                                                {isBranchUser && app.status === 'ready_for_head_office' && (
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedHoIds.includes(app.id)}
                                                        onChange={() => toggleHoSelect(app.id)}
                                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0"
                                                    />
                                                )}
                                                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold flex items-center justify-center text-xs shadow-sm">
                                                    {(member?.applicant_name_bn || member?.applicant_name_en || 'M')[0]}
                                                </div>
                                                <div>
                                                    <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm">
                                                        {member?.applicant_name_bn || member?.applicant_name_en || 'N/A'}
                                                    </h3>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                                                            {memberCode}
                                                        </span>
                                                        {member?.is_legacy ? (
                                                            <span className="text-[9px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-1 rounded">
                                                                পুরাতন{member.loan_dofa ? ` · দফা ${member.loan_dofa}` : ''}
                                                            </span>
                                                        ) : member ? (
                                                            <span className="text-[9px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1 rounded">
                                                                নতুন সদস্য
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[10px] font-bold text-slate-400 block uppercase">ঋণ পরিমাণ</span>
                                                <span className="text-sm font-black text-emerald-600">
                                                    ৳{formatAmount(app.requested_amount)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                                            <div>
                                                <span className="text-[10px] font-bold uppercase text-slate-400 block">ঋণ পণ্য</span>
                                                <p className="font-bold text-slate-800 truncate">{app.loan_product?.product_name}</p>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-bold uppercase text-slate-400 block">তারিখ</span>
                                                <p className="font-semibold text-slate-600">{formatDate(getEffectiveDate(app))}</p>
                                            </div>
                                            <div className="col-span-2 flex items-center justify-between pt-1 border-t border-slate-200/50">
                                                <span className="text-[10px] font-bold uppercase text-slate-400">স্ট্যাটাস:</span>
                                                <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}>
                                                    {statusInfo.label}
                                                </span>
                                            </div>
                                            <div className="col-span-2 flex items-center justify-between pt-1 border-t border-slate-200/50">
                                                <span className="text-[10px] font-bold uppercase text-slate-400">কার কাছে পেন্ডিং:</span>
                                                <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-[11px]">
                                                    {app.tracking_state?.label ?? '—'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Form Completion Progress Pills */}
                                        {app.visible_form_ids && app.visible_form_ids.length > 0 && (
                                            <div className="pt-1">
                                                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">ফর্মসমূহ:</span>
                                                <div className="flex flex-wrap gap-1">
                                                    {app.visible_form_ids.map((formId) => {
                                                        const isSaved = app.form_saved?.[formId];
                                                        return (
                                                            <span
                                                                key={formId}
                                                                title={FORM_NAMES[formId] || `ফর্ম ${formId}`}
                                                                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                                                                    isSaved
                                                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                                                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                                                                }`}
                                                            >
                                                                {FORM_NAMES[formId] || `ফর্ম ${formId}`} {isSaved ? '✓' : ''}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex items-center gap-2 pt-2">
                                            <button
                                                onClick={() => router.get(`/member/loan-applications/${app.id}`)}
                                                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition active:scale-95"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                <span>বিবরণ দেখুন</span>
                                            </button>
                                            {(app.status === 'submitted' || app.status === 'under_review') && isBranchManager && (app.editable_form_ids?.length ?? 0) > 0 && (
                                                <button
                                                    onClick={() => router.get(`/member/loan-applications/${app.id}`)}
                                                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition active:scale-95"
                                                    title="ফর্ম দেখুন / পূরণ করুন"
                                                >
                                                    <Edit className="w-3.5 h-3.5" />
                                                    <span>ফর্ম</span>
                                                </button>
                                            )}
                                            {app.status === 'draft' && app.all_forms_complete && (
                                                app.can_submit ? (
                                                    <button
                                                        onClick={() => handleSubmitApplication(app)}
                                                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 border border-emerald-700 transition active:scale-95"
                                                        title="শাখা ব্যবস্থাপকের কাছে জমা দিন"
                                                    >
                                                        <Send className="w-3.5 h-3.5" />
                                                        <span>সাবমিট</span>
                                                    </button>
                                                ) : (
                                                    <button
                                                        disabled
                                                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed"
                                                        title="সদস্য ভর্তি অনুমোদিত হলে জমা দেওয়া যাবে"
                                                    >
                                                        <Send className="w-3.5 h-3.5" />
                                                        <span>সাবমিট</span>
                                                    </button>
                                                )
                                            )}
                                            {app.status === 'draft' && (
                                                <button
                                                    onClick={() => router.get(`/member/loan-applications/${app.id}`)}
                                                    className="p-2 text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition active:scale-95"
                                                    title="ফর্ম দেখুন / পূরণ করুন"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                            )}
                                        {app.status === 'pending_disbursement' && isBranchUser && (
                                            <button
                                                onClick={() => {
                                                    router.get(`/member/loan-applications/${app.id}?action=disburse`);
                                                }}
                                                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 border border-emerald-700 transition active:scale-95"
                                                title="বিতরণ প্রক্রিয়া শুরু করুন"
                                            >
                                                <CheckCircle className="w-3.5 h-3.5" />
                                                <span>বিতরণ</span>
                                            </button>
                                        )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* DESKTOP TABLE VIEW (hidden md:block) */}
                    <div className="hidden md:block">
                        <AutoFitTableContainer
                            minWidth={1150}
                            storageKey="branch_loan_applications_table"
                            title="ঋণ আবেদনের তালিকা"
                            subtitle={`(পৃষ্ঠা ${applications.current_page || 1}/${applications.last_page || 1} · মোট ${applications.total || 0} টি)`}
                        >
                            <table className="w-full text-xs">
                                <thead className="bg-slate-900 text-white">
                                    <tr>
                                        {isBranchUser && (
                                            <th className="px-3 py-3.5 text-center w-10">
                                                {readyForHoIds.length > 0 && (
                                                    <input
                                                        type="checkbox"
                                                        checked={allReadySelected}
                                                        onChange={toggleSelectAllReady}
                                                        className="rounded border-slate-400 text-indigo-600 focus:ring-indigo-500"
                                                        title="সব সিলেক্ট"
                                                    />
                                                )}
                                            </th>
                                        )}
                                        <th className="px-4 py-3.5 text-left text-[11px] font-extrabold uppercase tracking-wider">সদস্য কোড ও টাইপ</th>
                                        <th className="px-4 py-3.5 text-left text-[11px] font-extrabold uppercase tracking-wider">আবেদনকারী সদস্য</th>
                                        <th className="px-4 py-3.5 text-left text-[11px] font-extrabold uppercase tracking-wider">তারিখ</th>
                                        <th className="px-4 py-3.5 text-left text-[11px] font-extrabold uppercase tracking-wider">ঋণ পণ্য ও ক্যাটাগরি</th>
                                        <th className="px-4 py-3.5 text-left text-[11px] font-extrabold uppercase tracking-wider">পরিমাণ</th>
                                        <th className="px-4 py-3.5 text-left text-[11px] font-extrabold uppercase tracking-wider">স্ট্যাটাস</th>
                                        <th className="px-4 py-3.5 text-left text-[11px] font-extrabold uppercase tracking-wider">পেন্ডিং অবস্থান</th>
                                        <th className="px-4 py-3.5 text-left text-[11px] font-extrabold uppercase tracking-wider">ফর্ম অগ্রগতি</th>
                                        <th className="px-4 py-3.5 text-right text-[11px] font-extrabold uppercase tracking-wider">অ্যাকশন</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white font-medium">
                                    {applicationRows.length === 0 ? (
                                        <tr>
                                            <td colSpan={isBranchUser ? 10 : 9} className="text-center py-12 text-slate-400">
                                                <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                                                <p className="text-sm font-semibold">
                                                    {workQueue?.hint && !isAllStatus
                                                        ? 'এখন কোনো পেন্ডিং কাজ নেই। সব আবেদন দেখতে “সর্বমোট” চাপুন।'
                                                        : 'কোনো ঋণ আবেদন পাওয়া যায়নি।'}
                                                </p>
                                            </td>
                                        </tr>
                                    ) : (
                                        applicationRows.map((app) => {
                                            const member = app.member_display ?? app.member_admission;
                                            const memberCode = member?.application_no || member?.member_code || app.member_code || '—';
                                            const pendingIssues = app.issues?.filter((issue) => issue.status === 'pending') || [];
                                            const hasPendingIssues = pendingIssues.length > 0;
                                            let statusInfo = statusLabels[app.status] || statusLabels.draft;

                                            if (hasPendingIssues && (app.status === 'pending_head_office' || app.status === 'under_review' || app.status === 'submitted')) {
                                                statusInfo = {
                                                    label: `সমস্যা আছে (${pendingIssues.length})`,
                                                    bg: 'bg-amber-100',
                                                    text: 'text-amber-900',
                                                    border: 'border-amber-300'
                                                };
                                            }

                                            return (
                                                <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                                                    {isBranchUser && (
                                                        <td className="px-3 py-3 text-center">
                                                            {app.status === 'ready_for_head_office' ? (
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedHoIds.includes(app.id)}
                                                                    onChange={() => toggleHoSelect(app.id)}
                                                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                                />
                                                            ) : null}
                                                        </td>
                                                    )}
                                                    <td className="px-4 py-3.5">
                                                        <div className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg text-xs inline-block">
                                                            {memberCode}
                                                        </div>
                                                        {member?.is_legacy !== undefined && (
                                                            <div className="mt-1">
                                                                {member.is_legacy ? (
                                                                    <span className="inline-flex items-center px-1.5 py-0.2 bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold rounded">
                                                                        পুরাতন{member.loan_dofa ? ` · দফা ${member.loan_dofa}` : ''}
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center px-1.5 py-0.2 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-semibold rounded">
                                                                        নতুন সদস্য
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>

                                                    <td className="px-4 py-3.5">
                                                        {member ? (
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold flex items-center justify-center text-xs shadow-sm">
                                                                    {(member.applicant_name_bn || member.applicant_name_en || 'M')[0]}
                                                                </div>
                                                                <div>
                                                                    <div className="font-extrabold text-slate-900 text-xs sm:text-sm">
                                                                        {member.applicant_name_bn || member.applicant_name_en}
                                                                    </div>
                                                                    <div className="text-[11px] text-slate-500 font-medium">
                                                                        {member.mobile_number || member.nid_number}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-400 font-medium text-xs">N/A</span>
                                                        )}
                                                    </td>

                                                    <td className="px-4 py-3.5 text-slate-600 font-medium">
                                                        {formatDate(getEffectiveDate(app))}
                                                    </td>

                                                    <td className="px-4 py-3.5">
                                                        <div className="font-bold text-slate-900">{app.loan_product?.product_name}</div>
                                                        <div className="text-[10px] text-slate-500 font-medium">{app.loan_category?.category_name}</div>
                                                    </td>

                                                    <td className="px-4 py-3.5">
                                                        <div className="font-black text-emerald-600 text-sm">
                                                            ৳{formatAmount(app.requested_amount)}
                                                        </div>
                                                        {app.approved_amount && (
                                                            <div className="text-[10px] text-emerald-700 font-bold">
                                                                অনুমোদিত: ৳{formatAmount(app.approved_amount)}
                                                            </div>
                                                        )}
                                                    </td>

                                                    <td className="px-4 py-3.5">
                                                        <span className={`inline-block px-2.5 py-1 rounded-xl text-[11px] font-extrabold border ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}>
                                                            {statusInfo.label}
                                                        </span>
                                                    </td>

                                                    <td className="px-4 py-3.5">
                                                        <span className="inline-block text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                                                            {app.tracking_state?.label ?? '—'}
                                                        </span>
                                                    </td>

                                                    <td className="px-4 py-3.5">
                                                        {app.visible_form_ids && app.visible_form_ids.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1">
                                                                {app.visible_form_ids.map((formId) => {
                                                                    const isSaved = app.form_saved?.[formId];
                                                                    return (
                                                                        <span
                                                                            key={formId}
                                                                            title={FORM_NAMES[formId] || `ফর্ম ${formId}`}
                                                                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                                                                isSaved
                                                                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                                                                    : 'bg-slate-100 text-slate-400 border border-slate-200'
                                                                            }`}
                                                                        >
                                                                            F{formId} {isSaved ? '✓' : ''}
                                                                        </span>
                                                                    );
                                                                })}
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-400 text-[11px]">—</span>
                                                        )}
                                                    </td>

                                                    <td className="px-4 py-3.5 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <button
                                                                onClick={() => router.get(`/member/loan-applications/${app.id}`)}
                                                                className="p-1.5 text-indigo-700 hover:bg-indigo-50 rounded-xl transition"
                                                                title="বিবরণ দেখুন"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                            </button>
                                                            {(app.status === 'submitted' || app.status === 'under_review') && isBranchManager && (app.editable_form_ids?.length ?? 0) > 0 && (
                                                                <button
                                                                    onClick={() => router.get(`/member/loan-applications/${app.id}`)}
                                                                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded-xl border border-amber-200 shadow-sm transition active:scale-95"
                                                                    title="ফর্ম দেখুন / পূরণ করুন"
                                                                >
                                                                    <Edit className="w-3 h-3" />
                                                                    <span>ফর্ম</span>
                                                                </button>
                                                            )}
                                                            {app.status === 'draft' && (
                                                                <>
                                                                    {app.all_forms_complete && (
                                                                        app.can_submit ? (
                                                                            <button
                                                                                onClick={() => handleSubmitApplication(app)}
                                                                                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition active:scale-95"
                                                                                title=" শাখা ব্যবস্থাপকের কাছে জমা দিন"
                                                                            >
                                                                                <Send className="w-3 h-3" />
                                                                                <span>সাবমিট</span>
                                                                            </button>
                                                                        ) : (
                                                                            <button
                                                                                disabled
                                                                                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-slate-100 text-slate-400 font-bold rounded-xl border border-slate-200 cursor-not-allowed"
                                                                                title="সদস্য ভর্তি অনুমোদিত হলে জমা দেওয়া যাবে"
                                                                            >
                                                                                <Send className="w-3 h-3" />
                                                                                <span>সাবমিট</span>
                                                                            </button>
                                                                        )
                                                                    )}
                                                                    <button
                                                                        onClick={() => router.get(`/member/loan-applications/${app.id}`)}
                                                                        className="p-1.5 text-amber-700 hover:bg-amber-50 rounded-xl transition"
                                                                        title="ফর্ম দেখুন / পূরণ করুন"
                                                                    >
                                                                        <Edit className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            if (confirm(`আপনি কি নিশ্চিত যে আপনি এই ঋণ আবেদনটি মুছে ফেলতে চান?\n\nসদস্য: ${member?.applicant_name_bn || member?.applicant_name_en || ''} (${memberCode})`)) {
                                                                                router.delete(`/member/loan-applications/${app.id}`, keepListFilters);
                                                                            }
                                                                        }}
                                                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-xl transition"
                                                                        title="মুছে ফেলুন"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </>
                                                            )}
                                                            {app.status === 'ready_for_head_office' && isBranchUser && (
                                                                <button
                                                                    onClick={() => {
                                                                        if (confirm(`সদস্য ${member?.applicant_name_bn || member?.applicant_name_en || ''} (${memberCode}) এর ঋণ আবেদন Head Office এ পাঠাতে চান?`)) {
                                                                            router.patch(`/member/loan-applications/${app.id}/send-to-head-office`, {}, keepListFilters);
                                                                        }
                                                                    }}
                                                                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition active:scale-95"
                                                                    title="Head Office এ পাঠান"
                                                                >
                                                                    <Send className="w-3 h-3" />
                                                                    <span>HO পাঠান</span>
                                                                </button>
                                                            )}
                                                            {app.status === 'pending_disbursement' && isBranchUser && (
                                                                <button
                                                                    onClick={() => {
                                                                        router.get(`/member/loan-applications/${app.id}?action=disburse`);
                                                                    }}
                                                                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition active:scale-95"
                                                                    title="বিতরণ প্রক্রিয়া শুরু করুন"
                                                                >
                                                                    <CheckCircle className="w-3 h-3" />
                                                                    <span>বিতরণ</span>
                                                                </button>
                                                            )}
                                                        </div>
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
                        meta={applications}
                        onPageChange={(page) => applyListFilters({ page })}
                        onPerPageChange={(size) => applyListFilters({ per_page: size, page: 1 })}
                    />
                </div>
            </div>

            {/* NEW LOAN APPLICATION MODAL */}
            {showNewModal && canCreateLoanApplication && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-100">
                        <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-blue-400">
                                    <Plus className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-extrabold text-white">নতুন ঋণ আবেদন করুন</h2>
                                    <p className="text-xs text-slate-300">সদস্য খুঁজুন ও ক্যাটাগরি পণ্য নির্বাচন করুন</p>
                                </div>
                            </div>
                            <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-white p-1 rounded-xl">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-5 overflow-y-auto flex-1">
                            {/* Member Search Section */}
                            <div>
                                <label className="block text-xs font-extrabold text-slate-800 uppercase mb-1">
                                    ১. সদস্য নির্বাচন করুন <span className="text-red-500">*</span>
                                </label>
                                {!selectedMember ? (
                                    <div className="relative">
                                        <div className="relative">
                                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                            <input
                                                type="text"
                                                value={memberSearchQuery}
                                                onChange={(e) => handleMemberSearch(e.target.value)}
                                                onFocus={() => {
                                                    if (memberSearchQuery.length >= 3) {
                                                        handleMemberSearch(memberSearchQuery);
                                                    }
                                                }}
                                                placeholder="সদস্যের নাম, এনআইডি, মোবাইল বা আবেদন নং দিয়ে খুঁজুন..."
                                                className="w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-2xl text-xs md:text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                                autoComplete="off"
                                            />
                                            {isSearching && (
                                                <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600" />
                                                </div>
                                            )}
                                        </div>

                                        {memberSearchResults.length > 0 && (
                                            <div className="absolute z-[100] w-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-60 overflow-auto divide-y divide-slate-100">
                                                {memberSearchResults.map((member) => {
                                                    const isRejected = member.status === 'rejected';
                                                    const isApproved = member.status === 'approved';
                                                    const hasActiveLoan = !!member.has_active_loan;
                                                    const isDisabled = isRejected || hasActiveLoan;

                                                    const statusLabels: Record<string, string> = {
                                                        draft: 'খসড়া',
                                                        submitted: 'জমা',
                                                        under_review: 'পর্যালোচনায়',
                                                        ready_for_head_office: 'শাখা অনুমোদিত',
                                                        pending_head_office: 'হেড অফিসে',
                                                        needs_revision: 'সংশোধন',
                                                        approved: 'অনুমোদিত',
                                                        rejected: 'প্রত্যাখ্যাত',
                                                    };

                                                    return (
                                                        <button
                                                            key={member.id}
                                                            type="button"
                                                            onClick={() => !isDisabled && handleMemberSelect(member)}
                                                            disabled={isDisabled}
                                                            className={`w-full p-3 text-left transition ${
                                                                isDisabled
                                                                    ? 'bg-rose-50/50 cursor-not-allowed opacity-70'
                                                                    : 'hover:bg-indigo-50/60 cursor-pointer'
                                                            }`}
                                                        >
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div>
                                                                    <div className="text-sm font-extrabold text-slate-900">
                                                                        {member.applicant_name_bn || member.applicant_name_en}
                                                                    </div>
                                                                    <div className="text-xs text-slate-500 font-medium mt-0.5">
                                                                        {member.application_no} | Mobile: {member.mobile_number}
                                                                    </div>
                                                                </div>
                                                                <div className="flex flex-col items-end gap-1">
                                                                    {!isApproved && !isRejected && (
                                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                                                                            {statusLabels[member.status] || member.status}
                                                                        </span>
                                                                    )}
                                                                    {hasActiveLoan && (
                                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                                                                            সক্রিয় ঋণ আছে
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="p-4 bg-emerald-50/80 border-2 border-emerald-300 rounded-2xl flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                                                {(selectedMember.applicant_name_bn || selectedMember.applicant_name_en)[0]}
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-extrabold text-slate-900">
                                                    {selectedMember.applicant_name_bn || selectedMember.applicant_name_en}
                                                </h4>
                                                <p className="text-xs text-slate-600 font-medium">
                                                    {selectedMember.application_no} | Mobile: {selectedMember.mobile_number}
                                                </p>
                                                {selectedMember.status !== 'approved' && (
                                                    <p className="text-[11px] text-amber-700 font-semibold mt-1">
                                                        ভর্তি অনুমোদিত নয় — ফর্ম পূরণ করা যাবে, জমা দেওয়া যাবে না
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedMember(null)}
                                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-xl transition"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Category Selection */}
                            <div>
                                <label className="block text-xs font-extrabold text-slate-800 uppercase mb-1">
                                    ২. ঋণ ক্যাটাগরি <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={selectedCategory || ''}
                                    onChange={(e) => handleCategoryChange(Number(e.target.value))}
                                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-2xl text-xs md:text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                >
                                    <option value="">ক্যাটাগরি নির্বাচন করুন...</option>
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.category_name_bn || cat.category_name} ({cat.category_code})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Product Selection */}
                            {selectedCategory && products.length > 0 && (
                                <div>
                                    <label className="block text-xs font-extrabold text-slate-800 uppercase mb-1">
                                        ৩. ঋণ পণ্য <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={selectedProduct || ''}
                                        onChange={(e) => handleProductChange(Number(e.target.value))}
                                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-2xl text-xs md:text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                    >
                                        <option value="">পণ্য নির্বাচন করুন...</option>
                                        {products.map((prod) => (
                                            <option key={prod.id} value={prod.id}>
                                                {prod.product_name_bn || prod.product_name} ({prod.product_code})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Requested Amount */}
                            {selectedProduct && (
                                <div>
                                    <label className="block text-xs font-extrabold text-slate-800 uppercase mb-1">
                                        ৪. অনুরোধকৃত ঋণের পরিমাণ (টাকা) <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold">৳</span>
                                        <input
                                            type="number"
                                            value={requestedAmount}
                                            onChange={(e) => setRequestedAmount(e.target.value)}
                                            placeholder="ঋণের পরিমাণ টাইপ করুন..."
                                            className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-2xl text-xs md:text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Product Details Info Card */}
                            {selectedProduct && products.find((p) => p.id === selectedProduct) && (
                                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 space-y-2.5">
                                    {(() => {
                                        const product = products.find((p) => p.id === selectedProduct);
                                        if (!product) return null;
                                        const reqAmt = Number(requestedAmount) || 0;
                                        const isAmountOutOfRange =
                                            reqAmt > 0 && (reqAmt < product.min_amount || reqAmt > product.max_amount);

                                        return (
                                            <>
                                                <div className="flex items-center justify-between border-b border-indigo-100/80 pb-2">
                                                    <span className="text-xs font-extrabold text-indigo-950 flex items-center gap-1.5">
                                                        <Sparkles className="w-4 h-4 text-indigo-600" />
                                                        {product.product_name_bn || product.product_name} ({product.product_code})
                                                    </span>
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                                                        {product.duration_months} মাস মেয়াদী
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2 text-xs">
                                                    <div className="bg-white/80 p-2.5 rounded-xl border border-indigo-100/80">
                                                        <span className="text-[10px] font-bold text-slate-500 block uppercase">সর্বনিম্ন ও সর্বোচ্চ ঋণ</span>
                                                        <span className="font-extrabold text-slate-900 mt-0.5 block">
                                                            ৳{formatAmount(product.min_amount)} - ৳{formatAmount(product.max_amount)}
                                                        </span>
                                                    </div>

                                                    <div className="bg-white/80 p-2.5 rounded-xl border border-indigo-100/80">
                                                        <span className="text-[10px] font-bold text-slate-500 block uppercase">সুদের হার & মেয়াদী</span>
                                                        <span className="font-extrabold text-indigo-700 mt-0.5 block">
                                                            {product.interest_rate}% ({product.duration_months} মাস)
                                                        </span>
                                                    </div>
                                                </div>

                                                {isAmountOutOfRange && (
                                                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
                                                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                                                        <span>
                                                            অনুরোধকৃত পরিমাণ ৳{formatAmount(product.min_amount)} থেকে ৳{formatAmount(product.max_amount)}-এর মধ্যে হতে হবে।
                                                        </span>
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100 flex-shrink-0">
                            <button
                                onClick={() => setShowNewModal(false)}
                                className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl transition"
                            >
                                বাতিল
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={!selectedMember || !selectedProduct || !requestedAmount}
                                className="px-6 py-2.5 text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg shadow-blue-600/30 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition active:scale-95"
                            >
                                ফর্মে এগিয়ে যান
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
