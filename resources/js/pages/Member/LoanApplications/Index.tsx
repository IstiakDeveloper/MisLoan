import { useState, useMemo, useEffect } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import {
    Plus, Calendar, FileText, CheckCircle, XCircle, Clock,
    Search, Eye, Edit, Trash2, X, AlertTriangle, MessageSquare
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
    flash?: {
        success?: string;
        error?: string;
    };
}

const statusLabels: Record<string, { label: string; color: string }> = {
    draft: { label: 'Draft (খসড়া)', color: 'bg-gray-50 text-gray-700 border border-gray-200' },
    submitted: { label: 'Submitted (জমা)', color: 'bg-blue-50 text-blue-700 border border-blue-200' },
    under_review: { label: 'Under Review (পর্যালোচনায়)', color: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
    pending_head_office: { label: 'Pending Head Office (হেড অফিসে প্রেরিত)', color: 'bg-indigo-50 text-indigo-700 border border-indigo-200' },
    approved: { label: 'Approved (অনুমোদিত)', color: 'bg-green-50 text-green-700 border border-green-200' },
    rejected: { label: 'Rejected (প্রত্যাখ্যাত)', color: 'bg-red-50 text-red-700 border border-red-200' },
    disbursed: { label: 'Disbursed (বিতরণকৃত)', color: 'bg-purple-50 text-purple-700 border border-purple-200' },
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
}

interface Member {
    id: number;
    applicant_name_en: string;
    applicant_name_bn: string;
    nid_number: string;
    mobile_number: string;
    application_no: string;
    status: string;
    has_active_loan?: boolean;
    active_loans?: ActiveLoan[];
}

export default function Index({ categories, applications, stats, selectedDate, dateFrom, dateTo, statusFilter = '', flash }: Props) {
    const today = new Date().toISOString().split('T')[0];
    const [currentDateFrom, setCurrentDateFrom] = useState(dateFrom || selectedDate || today);
    const [currentDateTo, setCurrentDateTo] = useState(dateTo || selectedDate || today);
    const [currentStatusFilter, setCurrentStatusFilter] = useState(statusFilter);
    const [searchQuery, setSearchQuery] = useState('');
    const [showNewModal, setShowNewModal] = useState(false);
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

    // New states for modal
    const [memberSearchQuery, setMemberSearchQuery] = useState('');
    const [memberSearchResults, setMemberSearchResults] = useState<Member[]>([]);
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);
    const [requestedAmount, setRequestedAmount] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [useLegacyMemberTab, setUseLegacyMemberTab] = useState(false);
    const [samities, setSamities] = useState<{ id: number; samity_code: string; samity_name: string; samity_name_bn: string }[]>([]);
    const [legacyForm, setLegacyForm] = useState({
        applicant_name_bn: '',
        applicant_name_en: '',
        nid_number: '',
        mobile_number: '',
        present_village_road: '',
        present_upazila: '',
        present_district: '',
        samity_id: '',
    });
    const [legacySubmitting, setLegacySubmitting] = useState(false);

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

    const handleNewApplication = () => {
        setShowNewModal(true);
        setSelectedCategory(null);
        setSelectedProduct(null);
        setProducts([]);
        setMemberSearchQuery('');
        setMemberSearchResults([]);
        setSelectedMember(null);
        setRequestedAmount('');
        setUseLegacyMemberTab(false);
        setLegacyForm({
            applicant_name_bn: '',
            applicant_name_en: '',
            nid_number: '',
            mobile_number: '',
            present_village_road: '',
            present_upazila: '',
            present_district: '',
            samity_id: '',
        });
    };

    useEffect(() => {
        if (showNewModal && useLegacyMemberTab && samities.length === 0) {
            fetch('/member/loan-applications/samities-for-branch')
                .then((r) => r.json())
                .then(setSamities)
                .catch(() => setSamities([]));
        }
    }, [showNewModal, useLegacyMemberTab]);

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
            console.log('Search results:', data);
            setMemberSearchResults(data);
        } catch (error) {
            console.error('Member search failed:', error);
            setMemberSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const handleMemberSelect = (member: Member) => {
        console.log('Member selected:', member);
        if (member.status === 'rejected') {
            console.log('Cannot select rejected member');
            return;
        }
        // Check if member has ANY active loan (not expired yet)
        if (member.has_active_loan && member.active_loans && member.active_loans.length > 0) {
            alert('এই সদস্যের জন্য সক্রিয় ঋণ আছে। মেয়াদ শেষ হওয়ার আগে নতুন ঋণ আবেদন করা যাবে না।');
            return;
        }
        setSelectedMember(member);
        setMemberSearchQuery('');
        setMemberSearchResults([]);
    };

    const handleSubmit = () => {
        if (selectedCategory && selectedProduct && selectedMember && requestedAmount) {
            router.visit(`/member/loan-applications/form-selection?loan_category_id=${selectedCategory}&loan_product_id=${selectedProduct}&member_id=${selectedMember.id}&requested_amount=${requestedAmount}`);
        }
    };

    const handleLegacySubmit = () => {
        const amt = parseFloat(requestedAmount);
        if (!legacyForm.applicant_name_bn?.trim() || !legacyForm.nid_number?.trim() || !legacyForm.mobile_number?.trim() || !legacyForm.samity_id || !selectedCategory || !selectedProduct || !requestedAmount || isNaN(amt) || amt < 1) {
            return;
        }
        setLegacySubmitting(true);
        router.post('/member/loan-applications/start-legacy-application', {
            applicant_name_bn: legacyForm.applicant_name_bn.trim(),
            applicant_name_en: legacyForm.applicant_name_en?.trim() || legacyForm.applicant_name_bn.trim(),
            nid_number: legacyForm.nid_number.trim(),
            mobile_number: legacyForm.mobile_number.trim(),
            present_village_road: legacyForm.present_village_road?.trim() || '',
            present_upazila: legacyForm.present_upazila?.trim() || '',
            present_district: legacyForm.present_district?.trim() || '',
            samity_id: Number(legacyForm.samity_id),
            loan_category_id: selectedCategory,
            loan_product_id: selectedProduct,
            requested_amount: amt,
        }, {
            onFinish: () => setLegacySubmitting(false),
            onError: () => setLegacySubmitting(false),
        });
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

    // Calculate stats from filtered applications
    const filteredStats = useMemo(() => {
        return {
            total: filteredApplications.length,
            draft: filteredApplications.filter(app => app.status === 'draft').length,
            submitted: filteredApplications.filter(app => app.status === 'submitted').length,
            approved: filteredApplications.filter(app => app.status === 'approved').length,
            rejected: filteredApplications.filter(app => app.status === 'rejected').length,
            pending_head_office: filteredApplications.filter(app => app.status === 'pending_head_office').length,
            under_review: filteredApplications.filter(app => app.status === 'under_review').length,
            disbursed: filteredApplications.filter(app => app.status === 'disbursed').length,
        };
    }, [filteredApplications]);

    return (
        <AdminLayout>
            <Head title="Loan Applications (ঋণ আবেদন)" />

            <div className="space-y-4">
                {/* Success Message */}
                {showSuccessMessage && flash?.success && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-green-800">{flash.success}</p>
                        </div>
                        <button
                            onClick={() => setShowSuccessMessage(false)}
                            className="text-green-600 hover:text-green-800"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Loan Applications (ঋণ আবেদন)</h1>
                        <p className="text-xs text-gray-500 mt-0.5">Manage your loan applications</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleNewApplication}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            <Plus className="w-4 h-4" />
                            New Application (নতুন আবেদন)
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-md border p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">From Date (শুরুর তারিখ)</label>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border rounded-md">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <input
                                    type="date"
                                    value={currentDateFrom}
                                    onChange={(e) => setCurrentDateFrom(e.target.value)}
                                    className="text-sm border-0 bg-transparent focus:ring-0 p-0 flex-1"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">To Date (শেষ তারিখ)</label>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border rounded-md">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <input
                                    type="date"
                                    value={currentDateTo}
                                    onChange={(e) => setCurrentDateTo(e.target.value)}
                                    className="text-sm border-0 bg-transparent focus:ring-0 p-0 flex-1"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Status (স্ট্যাটাস)</label>
                            <select
                                value={currentStatusFilter}
                                onChange={(e) => setCurrentStatusFilter(e.target.value)}
                                className="w-full px-3 py-1.5 text-sm border rounded-md bg-gray-50 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">All Status (সব স্ট্যাটাস)</option>
                                <option value="draft">Draft (খসড়া)</option>
                                <option value="submitted">Submitted (জমা)</option>
                                <option value="under_review">Under Review (পর্যালোচনায়)</option>
                                <option value="pending_head_office">Pending Head Office (হেড অফিসে প্রেরিত)</option>
                                <option value="approved">Approved (অনুমোদিত)</option>
                                <option value="rejected">Rejected (প্রত্যাখ্যাত)</option>
                                <option value="disbursed">Disbursed (বিতরণকৃত)</option>
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={handleDateFilterChange}
                                className="w-full px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                Apply Filter (ফিল্টার প্রয়োগ)
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                    <div className="bg-white rounded-md border p-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded bg-blue-50 flex items-center justify-center">
                                <FileText className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-lg font-bold text-gray-900">{filteredStats.total}</p>
                                <p className="text-xs text-gray-500">Total (মোট)</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-md border p-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded bg-gray-50 flex items-center justify-center">
                                <FileText className="w-4 h-4 text-gray-600" />
                            </div>
                            <div>
                                <p className="text-lg font-bold text-gray-900">{filteredStats.draft}</p>
                                <p className="text-xs text-gray-500">Draft (খসড়া)</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-md border p-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded bg-blue-50 flex items-center justify-center">
                                <Clock className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-lg font-bold text-gray-900">{filteredStats.submitted}</p>
                                <p className="text-xs text-gray-500">Submitted (জমা)</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-md border p-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded bg-yellow-50 flex items-center justify-center">
                                <Clock className="w-4 h-4 text-yellow-600" />
                            </div>
                            <div>
                                <p className="text-lg font-bold text-gray-900">{filteredStats.under_review}</p>
                                <p className="text-xs text-gray-500">Under Review</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-md border p-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded bg-indigo-50 flex items-center justify-center">
                                <Clock className="w-4 h-4 text-indigo-600" />
                            </div>
                            <div>
                                <p className="text-lg font-bold text-gray-900">{filteredStats.pending_head_office}</p>
                                <p className="text-xs text-gray-500">Pending HO</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-md border p-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded bg-green-50 flex items-center justify-center">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                            </div>
                            <div>
                                <p className="text-lg font-bold text-gray-900">{filteredStats.approved}</p>
                                <p className="text-xs text-gray-500">Approved (অনুমোদিত)</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-md border p-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded bg-red-50 flex items-center justify-center">
                                <XCircle className="w-4 h-4 text-red-600" />
                            </div>
                            <div>
                                <p className="text-lg font-bold text-gray-900">{filteredStats.rejected}</p>
                                <p className="text-xs text-gray-500">Rejected (প্রত্যাখ্যাত)</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-md border p-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded bg-purple-50 flex items-center justify-center">
                                <CheckCircle className="w-4 h-4 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-lg font-bold text-gray-900">{filteredStats.disbursed}</p>
                                <p className="text-xs text-gray-500">Disbursed (বিতরণকৃত)</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Applications Table */}
                <div className="bg-white rounded-md border">
                    <div className="px-4 py-3 border-b">
                        <div className="relative max-w-md">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by name, member code, NID, phone, or application no..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8 pr-3 py-1.5 text-sm w-full border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">Application No (আবেদন নং)</th>
                                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">Member Name (সদস্যের নাম)</th>
                                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">Date (তারিখ)</th>
                                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">Product (পণ্য)</th>
                                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">Category (ক্যাটাগরি)</th>
                                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">Amount (পরিমাণ)</th>
                                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">Status (স্ট্যাটাস)</th>
                                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">Issues (সমস্যা)</th>
                                    <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-600 uppercase">Actions (অ্যাকশন)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredApplications.map((app) => {
                                    // Check if there are pending issues
                                    const pendingIssues = app.issues?.filter(issue => issue.status === 'pending') || [];
                                    const hasPendingIssues = pendingIssues.length > 0;
                                    
                                    // Determine display status
                                    let displayStatus = app.status;
                                    let statusInfo = statusLabels[app.status] || statusLabels.draft;
                                    
                                    // If there are pending issues, show issue status prominently
                                    if (hasPendingIssues && (app.status === 'pending_head_office' || app.status === 'under_review' || app.status === 'submitted')) {
                                        statusInfo = {
                                            label: `সমস্যা আছে (${pendingIssues.length})`,
                                            color: 'bg-amber-100 text-amber-800 border border-amber-300'
                                        };
                                    }
                                    
                                    return (
                                        <tr key={app.id} className="hover:bg-gray-50">
                                            <td className="px-3 py-2">
                                                <div className="font-medium text-gray-900">{app.application_no}</div>
                                                {app.status === 'draft' && app.visible_form_ids && (
                                                    <div className="text-[10px] mt-0.5">
                                                        {app.all_forms_complete ? (
                                                            <span className="text-green-600">সব ফর্ম সেভ আছে</span>
                                                        ) : (
                                                            <span className="text-amber-600">
                                                                বাকি: {(app.visible_form_ids || []).filter((id) => !app.form_saved?.[id]).map((id) => FORM_NAMES[id] || id).join(', ')}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-3 py-2">
                                                {(() => {
                                                    const member = app.member_display ?? app.member_admission;
                                                    return member ? (
                                                        <div>
                                                            {member.applicant_name_bn && (
                                                                <div className="font-medium text-gray-900 text-sm">
                                                                    {member.applicant_name_bn}
                                                                </div>
                                                            )}
                                                            {member.applicant_name_en && (
                                                                <div className="text-[10px] text-gray-600 italic">
                                                                    {member.applicant_name_en}
                                                                </div>
                                                            )}
                                                            <div className="text-[10px] text-gray-500 mt-0.5 space-y-0.5">
                                                                {member.application_no && (
                                                                    <div>Member: {member.application_no}</div>
                                                                )}
                                                                {member.nid_number && (
                                                                    <div>NID: {member.nid_number}</div>
                                                                )}
                                                                {member.mobile_number && (
                                                                    <div>Phone: {member.mobile_number}</div>
                                                                )}
                                                            </div>
                                                            {app.member_display && (
                                                                <span className="text-[10px] text-amber-600">আগের সদস্য</span>
                                                            )}
                                                            {!member.applicant_name_bn && !member.applicant_name_en && (
                                                                <span className="text-gray-400 text-[10px]">N/A</span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400 text-[10px]">N/A</span>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-3 py-2 text-gray-600">
                                                {new Date(app.created_at).toLocaleDateString('en-GB')}
                                            </td>
                                            <td className="px-3 py-2">
                                                <div className="font-medium text-gray-900">{app.loan_product.product_name}</div>
                                                <div className="text-[10px] text-gray-500">{app.loan_product.product_code}</div>
                                            </td>
                                            <td className="px-3 py-2 text-gray-700">
                                                {app.loan_category.category_name}
                                            </td>
                                            <td className="px-3 py-2">
                                                <div className="font-medium text-gray-900">৳{formatAmount(app.requested_amount)}</div>
                                                {app.approved_amount && (
                                                    <div className="text-[10px] text-green-600">Approved: ৳{formatAmount(app.approved_amount)}</div>
                                                )}
                                            </td>
                                            <td className="px-3 py-2">
                                                <div className="space-y-1">
                                                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${statusInfo.color}`}>
                                                        {statusInfo.label}
                                                    </span>
                                                    {/* Show original status if there are issues */}
                                                    {hasPendingIssues && app.status !== 'draft' && (
                                                        <div className="text-[9px] text-gray-600 mt-0.5">
                                                            মূল অবস্থা: {statusLabels[app.status]?.label.split(' (')[0] || app.status}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2">
                                                {app.issues && app.issues.length > 0 ? (
                                                    <div className="space-y-1.5">
                                                        {app.issues.map((issue) => (
                                                            <div
                                                                key={issue.id}
                                                                className={`p-2 rounded text-[10px] border ${
                                                                    issue.status === 'pending'
                                                                        ? 'bg-amber-50 border-amber-200'
                                                                        : issue.status === 'resolved'
                                                                        ? 'bg-green-50 border-green-200'
                                                                        : 'bg-red-50 border-red-200'
                                                                }`}
                                                            >
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <div className="flex-1">
                                                                        <p className={`font-medium mb-1 ${
                                                                            issue.status === 'pending'
                                                                                ? 'text-amber-900'
                                                                                : issue.status === 'resolved'
                                                                                ? 'text-green-900'
                                                                                : 'text-red-900'
                                                                        }`}>
                                                                            {issue.issue_description}
                                                                        </p>
                                                                        {issue.reporter && (
                                                                            <p className="text-[9px] text-gray-600 mb-1">
                                                                                — {issue.reporter.name}
                                                                            </p>
                                                                        )}
                                                                        {issue.response_message && (
                                                                            <div className="mt-1 pt-1 border-t border-gray-200">
                                                                                <p className="text-[9px] text-gray-700 font-medium mb-0.5">আপনার উত্তর:</p>
                                                                                <p className="text-[9px] text-gray-600">{issue.response_message}</p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    {issue.status === 'pending' && (
                                                                        <div className="flex gap-1 flex-shrink-0">
                                                                            <button
                                                                                onClick={() => handleResolveIssue(app.id, issue.id)}
                                                                                className="p-1 bg-green-100 hover:bg-green-200 rounded text-green-700"
                                                                                title="সমাধান করুন"
                                                                            >
                                                                                <CheckCircle className="w-3 h-3" />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleRejectIssue(app.id, issue.id)}
                                                                                className="p-1 bg-red-100 hover:bg-red-200 rounded text-red-700"
                                                                                title="প্রত্যাখ্যান করুন"
                                                                            >
                                                                                <XCircle className="w-3 h-3" />
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {issue.status !== 'pending' && (
                                                                    <Badge className={`mt-1 text-[8px] ${
                                                                        issue.status === 'resolved'
                                                                            ? 'bg-green-200 text-green-800'
                                                                            : 'bg-red-200 text-red-800'
                                                                    }`}>
                                                                        {issue.status === 'resolved' ? 'সমাধান করা হয়েছে' : 'প্রত্যাখ্যান করা হয়েছে'}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] text-gray-400">কোন সমস্যা নেই</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => router.get(`/member/loan-applications/${app.id}`)}
                                                        className="p-1 hover:bg-gray-100 rounded"
                                                        title="View"
                                                    >
                                                        <Eye className="w-3.5 h-3.5 text-gray-600" />
                                                    </button>
                                                    {app.status === 'draft' && (
                                                        <>
                                                            <button
                                                                onClick={() => router.get(`/member/loan-applications/${app.id}/edit`)}
                                                                className="p-1 hover:bg-gray-100 rounded"
                                                                title="Edit"
                                                            >
                                                                <Edit className="w-3.5 h-3.5 text-gray-600" />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    if (confirm(`আপনি কি নিশ্চিত যে আপনি এই ঋণ আবেদনটি মুছে ফেলতে চান?\n\nআবেদন নং: ${app.application_no}\n\nএই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।`)) {
                                                                        router.delete(`/member/loan-applications/${app.id}`, {
                                                                            preserveScroll: true,
                                                                            onSuccess: () => {
                                                                                // Success message will come from backend
                                                                            },
                                                                            onError: (errors) => {
                                                                                if (errors.error) {
                                                                                    alert(errors.error);
                                                                                }
                                                                            },
                                                                        });
                                                                    }
                                                                }}
                                                                className="p-1 hover:bg-red-50 rounded"
                                                                title="Delete"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5 text-red-600" />
                                                            </button>
                                                        </>
                                                    )}
                                                    {app.status === 'draft' && app.all_forms_complete && (
                                                        <button
                                                            onClick={() => router.get(`/member/loan-applications/${app.id}`)}
                                                            className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded"
                                                            title="Submit"
                                                        >
                                                            সাবমিট
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
                            <div className="text-center py-8 text-gray-500">
                                <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                <p className="text-xs">No applications found for this date</p>
                                <button
                                    onClick={handleNewApplication}
                                    className="mt-3 text-xs text-blue-600 hover:text-blue-700"
                                >
                                    Create your first application
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* New Application Modal */}
            {showNewModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
                            <h2 className="text-lg font-bold text-gray-900">New Loan Application (নতুন ঋণ আবেদন)</h2>
                            <button onClick={() => setShowNewModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        {/* Tabs: Member Search | Legacy Member */}
                        <div className="flex border-b px-6">
                            <button
                                type="button"
                                onClick={() => setUseLegacyMemberTab(false)}
                                className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px ${!useLegacyMemberTab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                Search Member
                            </button>
                            <button
                                type="button"
                                onClick={() => setUseLegacyMemberTab(true)}
                                className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px ${useLegacyMemberTab ? 'border-amber-600 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                Legacy Member (No Admission)
                            </button>
                        </div>
                        <div className="p-6 space-y-4 overflow-y-auto flex-1">
                            {!useLegacyMemberTab ? (
                            <>
                            {/* Member Search */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Search Member (সদস্য খুঁজুন)
                                </label>
                                <p className="text-xs text-gray-600 mb-2 bg-blue-50 p-2 rounded">
                                    💡 যদি সদস্যের কোনো সক্রিয় ঋণ থাকে (মেয়াদ শেষ হয়নি), তাহলে নতুন ঋণ আবেদন করা যাবে না।
                                </p>

                                {!selectedMember ? (
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={memberSearchQuery}
                                            onChange={(e) => handleMemberSearch(e.target.value)}
                                            onFocus={() => {
                                                if (memberSearchQuery.length >= 3) {
                                                    handleMemberSearch(memberSearchQuery);
                                                }
                                            }}
                                            placeholder="Search by name, NID, mobile, or member code..."
                                            className="w-full px-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            autoComplete="off"
                                        />
                                        {isSearching && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                            </div>
                                        )}
                                        {memberSearchResults.length > 0 && (
                                            <div className="absolute z-[100] w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                                                {memberSearchResults.map((member) => {
                                                    const isRejected = member.status === 'rejected';
                                                    const hasActiveLoan = member.has_active_loan && member.active_loans && member.active_loans.length > 0;
                                                    const isDisabled = isRejected || hasActiveLoan;
                                                    
                                                    return (
                                                        <button
                                                            key={member.id}
                                                            type="button"
                                                            onClick={() => !isDisabled && handleMemberSelect(member)}
                                                            disabled={isDisabled}
                                                            className={`w-full px-3 py-2 text-left border-b last:border-b-0 ${
                                                                isDisabled
                                                                    ? 'bg-red-50 cursor-not-allowed opacity-60'
                                                                    : 'hover:bg-gray-50 cursor-pointer'
                                                            }`}
                                                        >
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div className="flex-1">
                                                                    {member.applicant_name_bn && (
                                                                        <div className="text-sm font-medium text-gray-900">{member.applicant_name_bn}</div>
                                                                    )}
                                                                    {member.applicant_name_en && (
                                                                        <div className={`text-xs ${member.applicant_name_bn ? 'text-gray-600 italic' : 'font-medium text-gray-900'}`}>
                                                                            {member.applicant_name_en}
                                                                        </div>
                                                                    )}
                                                                    <div className="text-xs text-gray-500">
                                                                        {member.application_no} | NID: {member.nid_number} | Mobile: {member.mobile_number}
                                                                    </div>
                                                                    {hasActiveLoan && member.active_loans && (
                                                                        <div className="mt-1 text-xs text-amber-700 bg-amber-50 p-1.5 rounded">
                                                                            <div className="font-semibold mb-1">⚠️ ইতিমধ্যে সক্রিয় ঋণ আছে (মেয়াদ শেষ হওয়ার আগে নতুন ঋণ নেওয়া যাবে না):</div>
                                                                            {member.active_loans.map((loan, idx) => (
                                                                                <div key={idx} className="text-[10px] ml-2">
                                                                                    • {loan.product_name_bn || loan.product_name} - আবেদন: {loan.application_no}
                                                                                    {loan.expected_end_date && (
                                                                                        <span className="text-gray-600"> - মেয়াদ শেষ: {new Date(loan.expected_end_date).toLocaleDateString('bn-BD')}</span>
                                                                                    )}
                                                                                    {loan.loan_term_months && (
                                                                                        <span className="text-gray-600"> ({loan.loan_term_months} মাস)</span>
                                                                                    )}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="flex flex-col gap-1 flex-shrink-0">
                                                                    {isRejected && (
                                                                        <span className="px-2 py-0.5 text-[10px] font-medium bg-red-100 text-red-700 rounded">
                                                                            প্রত্যাখ্যাত
                                                                        </span>
                                                                    )}
                                                                    {hasActiveLoan && (
                                                                        <span className="px-2 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 rounded">
                                                                            সক্রিয় ঋণ
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        {!isSearching && memberSearchQuery.length >= 3 && memberSearchResults.length === 0 && (
                                            <div className="absolute z-[100] w-full mt-1 bg-white border rounded-md shadow-lg p-3">
                                                <p className="text-xs text-gray-500 text-center">No members found. Try a different search term.</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <div className={`p-3 border-2 rounded-md ${
                                            selectedMember.has_active_loan
                                                ? 'bg-red-50 border-red-300'
                                                : 'bg-green-50 border-green-200'
                                        }`}>
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-bold ${
                                                            selectedMember.has_active_loan
                                                                ? 'bg-red-600'
                                                                : 'bg-green-600'
                                                        }`}>
                                                            {selectedMember.has_active_loan ? '⚠' : '✓'}
                                                        </span>
                                                        <span className={`text-xs font-semibold ${
                                                            selectedMember.has_active_loan
                                                                ? 'text-red-700'
                                                                : 'text-green-700'
                                                        }`}>
                                                            {selectedMember.has_active_loan
                                                                ? 'এই সদস্যের জন্য সক্রিয় ঋণ আছে (মেয়াদ শেষ হওয়ার আগে নতুন ঋণ নেওয়া যাবে না)'
                                                                : 'Selected Member (নির্বাচিত সদস্য)'}
                                                        </span>
                                                    </div>
                                                    <div className="ml-8 space-y-1">
                                                        <div className="text-sm font-bold text-gray-900">{selectedMember.applicant_name_en}</div>
                                                        <div className="text-xs text-gray-600">
                                                            <span className="font-medium">Application:</span> {selectedMember.application_no}
                                                        </div>
                                                        <div className="text-xs text-gray-600">
                                                            <span className="font-medium">NID:</span> {selectedMember.nid_number} |
                                                            <span className="font-medium"> Mobile:</span> {selectedMember.mobile_number}
                                                        </div>
                                                        {selectedMember.has_active_loan && selectedMember.active_loans && (
                                                            <div className="mt-2 text-xs text-red-700 bg-red-100 p-2 rounded">
                                                                <div className="font-semibold mb-1">সক্রিয় ঋণ:</div>
                                                                {selectedMember.active_loans.map((loan, idx) => (
                                                                    <div key={idx} className="text-[10px] ml-2">
                                                                        • {loan.product_name_bn || loan.product_name} - {loan.application_no}
                                                                        {loan.expected_end_date && (
                                                                            <span> (মেয়াদ শেষ: {new Date(loan.expected_end_date).toLocaleDateString('bn-BD')})</span>
                                                                        )}
                                                                        {loan.loan_term_months && !loan.expected_end_date && (
                                                                            <span> ({loan.loan_term_months} মাস)</span>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedMember(null);
                                                        setMemberSearchQuery('');
                                                        setMemberSearchResults([]);
                                                    }}
                                                    className="flex-shrink-0 p-1 hover:bg-red-100 rounded-full text-gray-500 hover:text-red-600 transition-colors"
                                                    title="Remove selection"
                                                >
                                                    <X className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Category Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Loan Category (ঋণ ক্যাটাগরি)
                                </label>
                                <select
                                    value={selectedCategory || ''}
                                    onChange={(e) => handleCategoryChange(Number(e.target.value))}
                                    className="w-full px-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Select category...</option>
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.category_name} ({cat.category_name_bn}) - {cat.category_code}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Product Selection */}
                            {selectedCategory && products.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Loan Product (ঋণ পণ্য)
                                    </label>
                                    <select
                                        value={selectedProduct || ''}
                                        onChange={(e) => handleProductChange(Number(e.target.value))}
                                        className="w-full px-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Select product...</option>
                                        {products.map((prod) => (
                                            <option key={prod.id} value={prod.id}>
                                                {prod.product_name} ({prod.product_name_bn}) - {prod.product_code}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Requested Amount */}
                            {selectedProduct && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Requested Amount (অনুরোধকৃত পরিমাণ)
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">৳</span>
                                        <input
                                            type="number"
                                            value={requestedAmount}
                                            onChange={(e) => setRequestedAmount(e.target.value)}
                                            placeholder="Enter amount..."
                                            className="w-full pl-8 pr-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Product Details */}
                            {selectedProduct && products.find(p => p.id === selectedProduct) && (
                                <div className="bg-gray-50 rounded-md p-4 space-y-2 text-xs">
                                    {(() => {
                                        const product = products.find(p => p.id === selectedProduct);
                                        return product && (
                                            <>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Amount Range (পরিমাণ):</span>
                                                    <span className="font-medium">৳{formatAmount(product.min_amount)} - ৳{formatAmount(product.max_amount)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Interest Rate (সুদের হার):</span>
                                                    <span className="font-medium">{product.interest_rate}%</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Duration (মেয়াদ):</span>
                                                    <span className="font-medium">{product.duration_months} months</span>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            )}
                            </>
                            ) : (
                            /* Legacy member form */
                            <>
                                <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded mb-2">
                                    For members without Member Admission; enter minimal details to proceed with loan application.
                                </p>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Name (Bangla) (বাংলা) <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={legacyForm.applicant_name_bn}
                                        onChange={(e) => setLegacyForm((f) => ({ ...f, applicant_name_bn: e.target.value }))}
                                        placeholder="সদস্যের নাম (বাংলা)"
                                        className="w-full px-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Name (English) (ইংরেজি)</label>
                                    <input
                                        type="text"
                                        value={legacyForm.applicant_name_en}
                                        onChange={(e) => setLegacyForm((f) => ({ ...f, applicant_name_en: e.target.value }))}
                                        placeholder="Name in English"
                                        className="w-full px-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">NID (জাতীয় পরিচয়পত্র) <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={legacyForm.nid_number}
                                        onChange={(e) => setLegacyForm((f) => ({ ...f, nid_number: e.target.value }))}
                                        placeholder="জাতীয় পরিচয়পত্র নম্বর"
                                        className="w-full px-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number (মোবাইল নম্বর) <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={legacyForm.mobile_number}
                                        onChange={(e) => setLegacyForm((f) => ({ ...f, mobile_number: e.target.value }))}
                                        placeholder="০১XXXXXXXXX"
                                        className="w-full px-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Village/Road (গ্রাম/রোড)</label>
                                    <input
                                        type="text"
                                        value={legacyForm.present_village_road}
                                        onChange={(e) => setLegacyForm((f) => ({ ...f, present_village_road: e.target.value }))}
                                        placeholder="গ্রাম বা রোড নম্বর"
                                        className="w-full px-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Upazila (উপজেলা)</label>
                                        <input
                                            type="text"
                                            value={legacyForm.present_upazila}
                                            onChange={(e) => setLegacyForm((f) => ({ ...f, present_upazila: e.target.value }))}
                                            className="w-full px-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">District (জেলা)</label>
                                        <input
                                            type="text"
                                            value={legacyForm.present_district}
                                            onChange={(e) => setLegacyForm((f) => ({ ...f, present_district: e.target.value }))}
                                            className="w-full px-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Samity (সমিতি) <span className="text-red-500">*</span></label>
                                    <select
                                        value={legacyForm.samity_id}
                                        onChange={(e) => setLegacyForm((f) => ({ ...f, samity_id: e.target.value }))}
                                        className="w-full px-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-blue-500"
                                    >
                                        <option value="">Select samity (সমিতি নির্বাচন করুন)</option>
                                        {samities.map((s) => (
                                            <option key={s.id} value={s.id}>{s.samity_name} ({s.samity_name_bn}) - {s.samity_code}</option>
                                        ))}
                                    </select>
                                </div>
                                {/* Category, Product, Amount - same as normal flow */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Loan Category (ঋণ ক্যাটাগরি)</label>
                                    <select
                                        value={selectedCategory || ''}
                                        onChange={(e) => handleCategoryChange(Number(e.target.value))}
                                        className="w-full px-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-blue-500"
                                    >
                                        <option value="">Select category...</option>
                                        {categories.map((cat) => (
                                            <option key={cat.id} value={cat.id}>{cat.category_name} ({cat.category_name_bn})</option>
                                        ))}
                                    </select>
                                </div>
                                {selectedCategory && products.length > 0 && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Loan Product (ঋণ পণ্য)</label>
                                        <select
                                            value={selectedProduct || ''}
                                            onChange={(e) => handleProductChange(Number(e.target.value))}
                                            className="w-full px-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-blue-500"
                                        >
                                            <option value="">Select product...</option>
                                            {products.map((prod) => (
                                                <option key={prod.id} value={prod.id}>{prod.product_name} ({prod.product_name_bn})</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                {selectedProduct && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Requested Amount (অনুরোধকৃত পরিমাণ)</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">৳</span>
                                            <input
                                                type="number"
                                                value={requestedAmount}
                                                onChange={(e) => setRequestedAmount(e.target.value)}
                                                placeholder="পরিমাণ লিখুন"
                                                className="w-full pl-8 pr-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>
                                )}
                            </>
                            )}
                        </div>
                        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t bg-gray-50 rounded-b-lg flex-shrink-0">
                            <button
                                onClick={() => setShowNewModal(false)}
                                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                            >
                                Cancel (বাতিল)
                            </button>
                            {useLegacyMemberTab ? (
                                <button
                                    onClick={handleLegacySubmit}
                                    disabled={legacySubmitting || !legacyForm.applicant_name_bn?.trim() || !legacyForm.nid_number?.trim() || !legacyForm.mobile_number?.trim() || !legacyForm.samity_id || !selectedCategory || !selectedProduct || !requestedAmount || parseFloat(requestedAmount) < 1}
                                    className="px-4 py-2 text-sm bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {legacySubmitting ? 'Submitting...' : 'Continue to Forms'}
                                </button>
                            ) : (
                                <button
                                    onClick={handleSubmit}
                                    disabled={!selectedMember || !selectedProduct || !requestedAmount || selectedMember?.has_active_loan}
                                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title={selectedMember?.has_active_loan ? 'এই সদস্যের জন্য সক্রিয় ঋণ আছে - মেয়াদ শেষ হওয়ার আগে নতুন ঋণ নেওয়া যাবে না' : ''}
                                >
                                    Continue to Form (ফর্মে যান)
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Resolve Issue Modal */}
            {showResolveModal && selectedIssue && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
                        <div className="px-6 py-4 border-b">
                            <h3 className="text-lg font-bold text-green-700">সমস্যা সমাধান করুন</h3>
                            <p className="text-sm text-gray-600 mt-1">সমস্যার সমাধান সম্পর্কে বিস্তারিত লিখুন।</p>
                        </div>
                        <form onSubmit={submitResolve} className="p-6">
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    সমাধানের বিবরণ <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={resolveForm.data.response_message}
                                    onChange={(e) => resolveForm.setData('response_message', e.target.value)}
                                    rows={5}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    placeholder="সমস্যা কীভাবে সমাধান করা হয়েছে তা বিস্তারিত লিখুন..."
                                    required
                                    minLength={10}
                                />
                                <p className="text-xs text-gray-500 mt-1">ন্যূনতম ১০ অক্ষর প্রয়োজন</p>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setShowResolveModal(false);
                                        setSelectedIssue(null);
                                        resolveForm.reset();
                                    }}
                                >
                                    বাতিল
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={resolveForm.processing || !resolveForm.data.response_message || resolveForm.data.response_message.length < 10}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    {resolveForm.processing ? 'সাবমিট হচ্ছে...' : 'সমাধান করুন'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Reject Issue Modal */}
            {showRejectModal && selectedIssue && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
                        <div className="px-6 py-4 border-b">
                            <h3 className="text-lg font-bold text-red-700">সমস্যা প্রত্যাখ্যান করুন</h3>
                            <p className="text-sm text-gray-600 mt-1">কেন আপনি এই সমস্যাটি প্রত্যাখ্যান করছেন তা বিস্তারিত লিখুন।</p>
                        </div>
                        <form onSubmit={submitReject} className="p-6">
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    প্রত্যাখ্যানের কারণ <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={rejectForm.data.response_message}
                                    onChange={(e) => rejectForm.setData('response_message', e.target.value)}
                                    rows={5}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                    placeholder="কেন আপনি এই সমস্যাটি প্রত্যাখ্যান করছেন তা বিস্তারিত লিখুন..."
                                    required
                                    minLength={10}
                                />
                                <p className="text-xs text-gray-500 mt-1">ন্যূনতম ১০ অক্ষর প্রয়োজন</p>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setShowRejectModal(false);
                                        setSelectedIssue(null);
                                        rejectForm.reset();
                                    }}
                                >
                                    বাতিল
                                </Button>
                                <Button
                                    type="submit"
                                    variant="destructive"
                                    disabled={rejectForm.processing || !rejectForm.data.response_message || rejectForm.data.response_message.length < 10}
                                >
                                    {rejectForm.processing ? 'সাবমিট হচ্ছে...' : 'প্রত্যাখ্যান করুন'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
