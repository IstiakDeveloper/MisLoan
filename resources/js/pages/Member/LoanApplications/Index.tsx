import { useState, useMemo, useEffect } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { formatDate } from '@/utils/dateUtils';
import {
    Plus, Calendar, FileText, CheckCircle, XCircle, Clock,
    Search, Eye, Edit, Trash2, X, AlertTriangle, MessageSquare, Send,
    Filter, RefreshCw, UserCheck, Layers, CreditCard, ChevronRight, AlertCircle, ArrowUpRight, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
    loan_product: LoanProduct & { installment_type?: string };
    loan_category: LoanCategory;
    created_at: string;
    member_admission?: {
        id: number;
        applicant_name_en?: string;
        applicant_name_bn?: string;
        application_no?: string;
        nid_number?: string;
        mobile_number?: string;
    };
    /** For display when member_admission is null (legacy/old member) */
    member_display?: {
        applicant_name_bn?: string;
        applicant_name_en?: string;
        application_no?: string;
        nid_number?: string;
        mobile_number?: string;
    };
    visible_form_ids?: number[];
    form_saved?: Record<number, boolean>;
    all_forms_complete?: boolean;
    issues?: LoanApplicationIssue[];
}

interface Stats {
    total: number;
    draft: number;
    submitted: number;
    approved: number;
    rejected: number;
}

interface Props {
    categories: LoanCategory[];
    applications: LoanApplication[];
    stats: Stats;
    selectedDate: string;
    dateFrom?: string;
    dateTo?: string;
    statusFilter?: string;
    preselectedMember?: Member | null;
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

export default function Index({ categories, applications, stats, selectedDate, dateFrom, dateTo, statusFilter = '', preselectedMember = null, flash }: Props) {
    const pageAuth = usePage().props.auth as { user?: { role?: { name: string } } } | undefined;
    const roleName = pageAuth?.user?.role?.name?.toLowerCase() || '';
    const isBranchUser = roleName === 'branch_user';
    const isFieldOfficer = roleName === 'field_officer';
    const canCreateLoanApplication = isFieldOfficer || roleName === 'branch_user';

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const firstDayOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const [currentDateFrom, setCurrentDateFrom] = useState(dateFrom || firstDayOfMonth);
    const [currentDateTo, setCurrentDateTo] = useState(dateTo || today);
    const [currentStatusFilter, setCurrentStatusFilter] = useState(statusFilter);
    const [searchQuery, setSearchQuery] = useState('');
    const [showNewModal, setShowNewModal] = useState(!!preselectedMember && canCreateLoanApplication);
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
    const [showSuccessMessage, setShowSuccessMessage] = useState(!!flash?.success);
    const [selectedIssue, setSelectedIssue] = useState<{ applicationId: number; issueId: number } | null>(null);
    const [showResolveModal, setShowResolveModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);

    const resolveForm = useForm({
        response_message: '',
    });

    const rejectForm = useForm({
        response_message: '',
    });

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

    const handleDateFilterChange = () => {
        const params: any = {
            date_from: currentDateFrom,
            date_to: currentDateTo,
        };
        if (currentStatusFilter) {
            params.status = currentStatusFilter;
        }
        router.get('/member/loan-applications', params, { preserveState: true });
    };

    const resetFilters = () => {
        setCurrentDateFrom(firstDayOfMonth);
        setCurrentDateTo(today);
        setCurrentStatusFilter('');
        setSearchQuery('');
        router.get('/member/loan-applications', {
            date_from: firstDayOfMonth,
            date_to: today,
        }, { preserveState: true });
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
        if (member.has_active_loan && member.active_loans && member.active_loans.length > 0) {
            alert('এই সদস্যের জন্য সক্রিয় ঋণ আছে। মেয়াদ শেষ হওয়ার আগে নতুন ঋণ আবেদন করা যাবে না।');
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
        if (selectedCategory && selectedProduct && selectedMember && requestedAmount) {
            router.visit(`/member/loan-applications/form-selection?loan_category_id=${selectedCategory}&loan_product_id=${selectedProduct}&member_id=${selectedMember.id}&requested_amount=${requestedAmount}`);
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

    const filteredApplications = useMemo(() => {
        return applications.filter(app => {
            if (!searchQuery) return true;
            
            const searchLower = searchQuery.toLowerCase().trim();
            const memberNameBn = app.member_admission?.applicant_name_bn?.toLowerCase() || '';
            const memberNameEn = app.member_admission?.applicant_name_en?.toLowerCase() || '';
            const memberCode = app.member_admission?.application_no?.toLowerCase() || '';
            const nidNumber = app.member_admission?.nid_number?.toLowerCase() || '';
            const mobileNumber = app.member_admission?.mobile_number?.toLowerCase() || '';
            const applicationNo = app.application_no?.toLowerCase() || '';
            const productName = app.loan_product?.product_name?.toLowerCase() || '';
            
            return (
                applicationNo.includes(searchLower) ||
                memberNameBn.includes(searchLower) ||
                memberNameEn.includes(searchLower) ||
                memberCode.includes(searchLower) ||
                nidNumber.includes(searchLower) ||
                mobileNumber.includes(searchLower) ||
                productName.includes(searchLower)
            );
        });
    }, [applications, searchQuery]);

    const filteredStats = useMemo(() => {
        return {
            total: filteredApplications.length,
            draft: filteredApplications.filter(app => app.status === 'draft').length,
            submitted: filteredApplications.filter(app => app.status === 'submitted').length,
            approved: filteredApplications.filter(app => app.status === 'approved').length,
            rejected: filteredApplications.filter(app => app.status === 'rejected').length,
            pending_head_office: filteredApplications.filter(app => app.status === 'pending_head_office').length,
            ready_for_head_office: filteredApplications.filter(app => app.status === 'ready_for_head_office').length,
            under_review: filteredApplications.filter(app => app.status === 'under_review').length,
            disbursed: filteredApplications.filter(app => app.status === 'disbursed').length,
        };
    }, [filteredApplications]);

    return (
        <AdminLayout>
            <Head title="Loan Applications (ঋণ আবেদন)" />

            <div className="space-y-5">
                {/* Flash Success Message */}
                {showSuccessMessage && flash?.success && (
                    <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4 flex items-start gap-3 shadow-md">
                        <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm font-bold text-emerald-900">{flash.success}</p>
                        </div>
                        <button
                            onClick={() => setShowSuccessMessage(false)}
                            className="text-emerald-600 hover:text-emerald-800"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* HERO BANNER HEADER */}
                <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-6 sm:p-8 shadow-xl border border-slate-800">
                    <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-gradient-to-tr from-blue-600/30 to-indigo-500/20 blur-3xl pointer-events-none" />
                    <div className="absolute left-1/3 -top-12 w-48 h-48 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-2 max-w-2xl">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/20 text-blue-300 text-xs font-semibold backdrop-blur-md">
                                <CreditCard className="w-4 h-4 text-blue-400" />
                                <span>Loan Application Management System</span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                                ঋণ আবেদনসমূহ (Loan Applications)
                            </h1>
                            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                                নতুন ঋণ আবেদন তৈরি করুন, আবেদন ফর্মগুলোর অগ্রগতি ট্র্যাক করুন এবং অনুমোদন অবস্থা পর্যবেক্ষণ করুন।
                            </p>
                        </div>

                        {canCreateLoanApplication && (
                            <button
                                onClick={handleNewApplication}
                                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-blue-600/30 transition-all active:scale-95 shrink-0"
                            >
                                <Plus className="w-5 h-5" />
                                <span>নতুন ঋণ আবেদন</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* METRIC STATS GRID */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    <button
                        type="button"
                        onClick={() => {
                            setCurrentStatusFilter('');
                            handleDateFilterChange();
                        }}
                        className={`p-4 rounded-2xl border text-left transition-all shadow-sm ${
                            !currentStatusFilter
                                ? 'bg-slate-900 border-slate-900 text-white ring-2 ring-slate-900/20'
                                : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800'
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${!currentStatusFilter ? 'text-slate-300' : 'text-slate-500'}`}>
                                মোট আবেদন
                            </span>
                            <Layers className={`w-4 h-4 ${!currentStatusFilter ? 'text-blue-400' : 'text-slate-400'}`} />
                        </div>
                        <p className={`text-2xl font-extrabold mt-2 ${!currentStatusFilter ? 'text-white' : 'text-slate-900'}`}>
                            {filteredStats.total}
                        </p>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setCurrentStatusFilter('draft');
                            handleDateFilterChange();
                        }}
                        className={`p-4 rounded-2xl border text-left transition-all shadow-sm ${
                            currentStatusFilter === 'draft'
                                ? 'bg-slate-800 border-slate-800 text-white ring-2 ring-slate-800/20'
                                : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800'
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">খসড়া (Draft)</span>
                            <Clock className="w-4 h-4 text-slate-500" />
                        </div>
                        <p className="text-2xl font-extrabold text-slate-700 mt-2">{filteredStats.draft}</p>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setCurrentStatusFilter('submitted');
                            handleDateFilterChange();
                        }}
                        className={`p-4 rounded-2xl border text-left transition-all shadow-sm ${
                            currentStatusFilter === 'submitted'
                                ? 'bg-blue-600 border-blue-600 text-white ring-2 ring-blue-600/20'
                                : 'bg-white border-blue-100 hover:border-blue-300 text-blue-900'
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${currentStatusFilter === 'submitted' ? 'text-blue-100' : 'text-blue-600'}`}>
                                জমা (Submitted)
                            </span>
                            <Send className={`w-4 h-4 ${currentStatusFilter === 'submitted' ? 'text-blue-200' : 'text-blue-500'}`} />
                        </div>
                        <p className={`text-2xl font-extrabold mt-2 ${currentStatusFilter === 'submitted' ? 'text-white' : 'text-blue-600'}`}>
                            {filteredStats.submitted}
                        </p>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setCurrentStatusFilter('approved');
                            handleDateFilterChange();
                        }}
                        className={`p-4 rounded-2xl border text-left transition-all shadow-sm ${
                            currentStatusFilter === 'approved'
                                ? 'bg-emerald-600 border-emerald-600 text-white ring-2 ring-emerald-600/20'
                                : 'bg-white border-emerald-100 hover:border-emerald-300 text-emerald-900'
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${currentStatusFilter === 'approved' ? 'text-emerald-100' : 'text-emerald-600'}`}>
                                অনুমোদিত (Approved)
                            </span>
                            <CheckCircle className={`w-4 h-4 ${currentStatusFilter === 'approved' ? 'text-emerald-200' : 'text-emerald-500'}`} />
                        </div>
                        <p className={`text-2xl font-extrabold mt-2 ${currentStatusFilter === 'approved' ? 'text-white' : 'text-emerald-600'}`}>
                            {filteredStats.approved}
                        </p>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setCurrentStatusFilter('rejected');
                            handleDateFilterChange();
                        }}
                        className={`p-4 rounded-2xl border text-left transition-all shadow-sm ${
                            currentStatusFilter === 'rejected'
                                ? 'bg-rose-600 border-rose-600 text-white ring-2 ring-rose-600/20'
                                : 'bg-white border-rose-100 hover:border-rose-300 text-rose-900'
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${currentStatusFilter === 'rejected' ? 'text-rose-100' : 'text-rose-600'}`}>
                                প্রত্যাখ্যাত (Rejected)
                            </span>
                            <XCircle className={`w-4 h-4 ${currentStatusFilter === 'rejected' ? 'text-rose-200' : 'text-rose-500'}`} />
                        </div>
                        <p className={`text-2xl font-extrabold mt-2 ${currentStatusFilter === 'rejected' ? 'text-white' : 'text-rose-600'}`}>
                            {filteredStats.rejected}
                        </p>
                    </button>
                </div>

                {/* SEARCH & FILTER TOOLBAR */}
                <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-sm space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                                শুরুর তারিখ (Date From)
                            </label>
                            <input
                                type="date"
                                value={currentDateFrom}
                                onChange={(e) => setCurrentDateFrom(e.target.value)}
                                className="w-full px-3 py-2 text-xs md:text-sm font-medium border border-slate-300 rounded-xl bg-slate-50/50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                                শেষ তারিখ (Date To)
                            </label>
                            <input
                                type="date"
                                value={currentDateTo}
                                onChange={(e) => setCurrentDateTo(e.target.value)}
                                className="w-full px-3 py-2 text-xs md:text-sm font-medium border border-slate-300 rounded-xl bg-slate-50/50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                                স্ট্যাটাস ফিল্টার
                            </label>
                            <select
                                value={currentStatusFilter}
                                onChange={(e) => setCurrentStatusFilter(e.target.value)}
                                className="w-full px-3 py-2 text-xs md:text-sm font-medium border border-slate-300 rounded-xl bg-slate-50/50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                            >
                                <option value="">সব স্ট্যাটাস (All Statuses)</option>
                                <option value="draft">Draft (খসড়া)</option>
                                <option value="submitted">Submitted (জমা)</option>
                                <option value="under_review">Under Review (পর্যালোচনা)</option>
                                <option value="ready_for_head_office">Branch Approved (শাখা অনুমোদিত)</option>
                                <option value="pending_head_office">Pending Head Office (হেড অফিসে প্রেরিত)</option>
                                <option value="approved">Approved (অনুমোদিত)</option>
                                <option value="rejected">Rejected (প্রত্যাখ্যাত)</option>
                                <option value="disbursed">Disbursed (বিতরণকৃত)</option>
                            </select>
                        </div>

                        <div className="flex items-end gap-2">
                            <button
                                onClick={handleDateFilterChange}
                                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs md:text-sm font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-md transition-all active:scale-95"
                            >
                                <Filter className="w-4 h-4" />
                                <span>ফিল্টার করুন</span>
                            </button>
                            <button
                                onClick={resetFilters}
                                className="px-3 py-2.5 text-xs md:text-sm font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all active:scale-95"
                                title="ফিল্টার রিসেট"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* APPLICATIONS CONTAINER */}
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden p-4 sm:p-5 space-y-4">
                    {/* Search Input Bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-slate-100">
                        <div className="relative w-full sm:w-80">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="নাম, আবেদন নং, মোবাইল বা এনআইডি..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 text-xs md:text-sm font-medium border border-slate-300 rounded-xl bg-slate-50/50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        <span className="text-xs text-slate-500 font-semibold self-end sm:self-center">
                            মোট পাওয়া গেছে: <strong className="text-slate-900 font-bold">{filteredApplications.length}</strong> টি আবেদন
                        </span>
                    </div>

                    {/* MOBILE CARDS VIEW (md:hidden) */}
                    <div className="md:hidden flex flex-col gap-3.5">
                        {filteredApplications.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-xs font-medium">
                                কোনো ঋণ আবেদন পাওয়া যায়নি।
                            </div>
                        ) : (
                            filteredApplications.map((app) => {
                                const member = app.member_display ?? app.member_admission;
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
                                                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold flex items-center justify-center text-xs shadow-sm">
                                                    {(member?.applicant_name_bn || member?.applicant_name_en || 'M')[0]}
                                                </div>
                                                <div>
                                                    <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm">
                                                        {member?.applicant_name_bn || member?.applicant_name_en || 'N/A'}
                                                    </h3>
                                                    <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                                                        {app.application_no}
                                                    </span>
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
                                                <p className="font-semibold text-slate-600">{formatDate(app.created_at)}</p>
                                            </div>
                                            <div className="col-span-2 flex items-center justify-between pt-1 border-t border-slate-200/50">
                                                <span className="text-[10px] font-bold uppercase text-slate-400">স্ট্যাটাস:</span>
                                                <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}>
                                                    {statusInfo.label}
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
                                            {app.status === 'draft' && (
                                                <button
                                                    onClick={() => router.get(`/member/loan-applications/${app.id}/edit`)}
                                                    className="p-2 text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition active:scale-95"
                                                    title="সম্পাদনা"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* DESKTOP TABLE VIEW (hidden md:block) */}
                    <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200">
                        <table className="w-full text-xs">
                            <thead className="bg-slate-900 text-white">
                                <tr>
                                    <th className="px-4 py-3.5 text-left text-[11px] font-extrabold uppercase tracking-wider">আবেদন নম্বর</th>
                                    <th className="px-4 py-3.5 text-left text-[11px] font-extrabold uppercase tracking-wider">আবেদনকারী সদস্য</th>
                                    <th className="px-4 py-3.5 text-left text-[11px] font-extrabold uppercase tracking-wider">তারিখ</th>
                                    <th className="px-4 py-3.5 text-left text-[11px] font-extrabold uppercase tracking-wider">ঋণ পণ্য ও ক্যাটাগরি</th>
                                    <th className="px-4 py-3.5 text-left text-[11px] font-extrabold uppercase tracking-wider">পরিমাণ</th>
                                    <th className="px-4 py-3.5 text-left text-[11px] font-extrabold uppercase tracking-wider">স্ট্যাটাস</th>
                                    <th className="px-4 py-3.5 text-left text-[11px] font-extrabold uppercase tracking-wider">ফর্ম অগ্রগতি</th>
                                    <th className="px-4 py-3.5 text-right text-[11px] font-extrabold uppercase tracking-wider">অ্যাকশন</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white font-medium">
                                {filteredApplications.map((app) => {
                                    const member = app.member_display ?? app.member_admission;
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
                                            <td className="px-4 py-3.5">
                                                <span className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg text-xs">
                                                    {app.application_no}
                                                </span>
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
                                                {formatDate(app.created_at)}
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
                                                    {app.status === 'draft' && (
                                                        <>
                                                            <button
                                                                onClick={() => router.get(`/member/loan-applications/${app.id}/edit`)}
                                                                className="p-1.5 text-amber-700 hover:bg-amber-50 rounded-xl transition"
                                                                title="সম্পাদনা"
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    if (confirm(`আপনি কি নিশ্চিত যে আপনি এই ঋণ আবেদনটি মুছে ফেলতে চান?\n\nআবেদন নং: ${app.application_no}`)) {
                                                                        router.delete(`/member/loan-applications/${app.id}`, {
                                                                            preserveScroll: true,
                                                                        });
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
                                                                if (confirm(`ঋণ আবেদন ${app.application_no} Head Office এ পাঠাতে চান?`)) {
                                                                    router.patch(`/member/loan-applications/${app.id}/send-to-head-office`);
                                                                }
                                                            }}
                                                            className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition active:scale-95"
                                                            title="Head Office এ পাঠান"
                                                        >
                                                            <Send className="w-3 h-3" />
                                                            <span>HO পাঠান</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {filteredApplications.length === 0 && (
                            <div className="text-center py-12 text-slate-400">
                                <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                                <p className="text-sm font-semibold">কোনো ঋণ আবেদন পাওয়া যায়নি।</p>
                            </div>
                        )}
                    </div>
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
                                                    const hasActiveLoan = member.has_active_loan && member.active_loans && member.active_loans.length > 0;
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
