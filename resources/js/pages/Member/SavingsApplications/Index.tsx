import { useState, useMemo, useEffect, type FormEvent } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { formatDate, todayIsoDate, addCalendarMonths } from '@/utils/dateUtils';
import { formatBranchLabel, keepListFilters, sortBranchesByCode } from '@/utils/branchLabel';
import ListPagination from '@/components/ListPagination';
import SavingsCalculatorModal from '@/components/SavingsCalculatorModal';
import {
    PiggyBank,
    Plus,
    Calendar,
    Printer,
    Search,
    Eye,
    Edit,
    Trash2,
    X,
    Filter,
    RefreshCw,
    Layers,
    CheckCircle2,
    Sparkles,
    Coins,
    TrendingUp,
    Check,
    Calculator,
    Info,
    ArrowRight,
    Percent,
    Clock,
    AlertCircle,
    UserCheck,
    Banknote,
    Receipt,
    Building2,
    Phone,
} from 'lucide-react';

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

interface SavingsProduct {
    id: number;
    product_name: string;
    product_name_bn: string;
    product_code: string;
    min_amount: number;
    max_amount: number;
    duration_months: number;
    interest_rate: number;
    is_active?: boolean;
}

interface SavingsCategory {
    id: number;
    category_name: string;
    category_name_bn: string | null;
    category_code: string;
    display_order?: number;
    savings_products?: SavingsProduct[];
}

interface SavingsFormRules {
    admission_only_codes: string[];
    forms: Record<string, string>;
    messages: {
        admission_only: string;
        form_not_ready: string;
    };
}

interface SavingsApplication {
    id: number;
    application_no: string;
    account_no?: string;
    member_no?: string;
    status: string;
    deposit_amount: number;
    monthly_installment?: number;
    monthly_savings_amount?: number;
    duration_months?: number;
    term_years?: number;
    maturity_amount?: number;
    maturity_date?: string;
    start_date?: string;
    account_opening_date?: string;
    created_at: string;
    submitted_at?: string;
    activated_at?: string;
    remarks?: string;
    form_data?: {
        withdrawal?: {
            withdrawal_date?: string;
            months_completed?: number;
            total_deposit_paid?: number;
            profit_amount?: number;
            penalty_or_deduction?: number;
            total_payout?: number;
            withdrawn_at?: string;
        };
        [key: string]: any;
    };
    savingsProduct?: SavingsProduct;
    savings_product?: SavingsProduct;
    memberAdmission?: {
        id: number;
        applicant_name_en?: string;
        applicant_name_bn?: string;
        application_no?: string;
        nid_number?: string;
        mobile_number?: string;
    };
    member_admission?: {
        id: number;
        applicant_name_en?: string;
        applicant_name_bn?: string;
        application_no?: string;
        nid_number?: string;
        mobile_number?: string;
    };
    branch?: {
        id: number;
        name: string;
        code?: string;
    };
    samity?: {
        id: number;
        samity_name?: string;
        samity_name_bn?: string;
        samity_code?: string;
    };
}

interface Stats {
    total_accounts: number;
    total_deposit: number;
    total_withdrawn: number;
    net_balance: number;
    active: number;
    matured: number;
    closed: number;
    pending: number;
    draft?: number;
    submitted?: number;
    approved?: number;
    rejected?: number;
}

interface Props {
    categories: SavingsCategory[];
    applications: {
        data: SavingsApplication[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from?: number | null;
        to?: number | null;
    };
    stats?: Stats;
    zones?: ZoneOption[];
    areas?: AreaOption[];
    branches?: BranchOption[];
    filters?: {
        zone_id?: string;
        area_id?: string;
        branch_id?: string;
    };
    dateFrom?: string;
    dateTo?: string;
    statusFilter?: string;
    searchFilter?: string;
    perPage?: number;
    savingsFormRules?: SavingsFormRules;
    flash?: {
        success?: string;
        error?: string;
    };
}

// Premature closure tiers (from Savings Calculator)
const SETTLEMENT_TIERS = [
    { minMonths: 144, rate: 12.0, name: '১২ বছর মেয়াদী স্তর (১২.০%)' },
    { minMonths: 120, rate: 12.0, name: '১০ বছর মেয়াদী স্তর (১২.০%)' },
    { minMonths: 84, rate: 10.0, name: '৭ বছর মেয়াদী স্তর (১০.০%)' },
    { minMonths: 60, rate: 9.0, name: '৫ বছর মেয়াদী স্তর (৯.০%)' },
    { minMonths: 36, rate: 7.0, name: '৩ বছর মেয়াদী স্তর (৭.০%)' },
    { minMonths: 1, rate: 6.0, name: 'সাধারণ সঞ্চয় স্তর (১ মাস+: ৬.০%)' },
];

const statusBadges: Record<string, { label: string; bg: string; text: string; dot: string }> = {
    active: { label: 'সক্রিয় (Active)', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-800', dot: 'bg-emerald-600' },
    matured: { label: 'পরিপক্ক (Matured)', bg: 'bg-teal-50 border-teal-200', text: 'text-teal-800', dot: 'bg-teal-600' },
    closed: { label: 'উত্তোলনকৃত (Closed)', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800', dot: 'bg-amber-600' },
    draft: { label: 'খসড়া (Draft)', bg: 'bg-slate-100 border-slate-200', text: 'text-slate-700', dot: 'bg-slate-500' },
    submitted: { label: 'জমা (Submitted)', bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500' },
    under_review: { label: 'পর্যালোচনায়', bg: 'bg-purple-50 border-purple-200', text: 'text-purple-700', dot: 'bg-purple-500' },
    approved: { label: 'অনুমোদিত', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    rejected: { label: 'প্রত্যাখ্যাত', bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700', dot: 'bg-rose-500' },
    cancelled: { label: 'বাতিল', bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700', dot: 'bg-rose-500' },
};

const formatAmount = (amount: number | null | undefined) => {
    return new Intl.NumberFormat('en-BD', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(Number(amount) || 0);
};

export default function Index({
    categories = [],
    applications,
    stats,
    zones = [],
    areas = [],
    branches = [],
    filters,
    dateFrom,
    dateTo,
    statusFilter = 'all',
    searchFilter = '',
    perPage = 20,
    savingsFormRules,
    flash,
}: Props) {
    const today = todayIsoDate();
    const [selectedZone, setSelectedZone] = useState(filters?.zone_id ? String(filters.zone_id) : '');
    const [selectedArea, setSelectedArea] = useState(filters?.area_id ? String(filters.area_id) : '');
    const [selectedBranch, setSelectedBranch] = useState(filters?.branch_id ? String(filters.branch_id) : '');
    const [currentDateFrom, setCurrentDateFrom] = useState(dateFrom || '');
    const [currentDateTo, setCurrentDateTo] = useState(dateTo || '');
    const [currentStatusFilter, setCurrentStatusFilter] = useState(statusFilter || 'all');
    const [searchQuery, setSearchQuery] = useState(searchFilter || '');

    const [showSuccessMessage, setShowSuccessMessage] = useState(!!flash?.success);
    const [showErrorMessage, setShowErrorMessage] = useState(!!flash?.error);
    const [showProductModal, setShowProductModal] = useState(false);
    const [showCalculatorModal, setShowCalculatorModal] = useState(false);
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | ''>('');
    const [selectedProductId, setSelectedProductId] = useState<number | ''>('');

    // Withdrawal / Settlement Modal State
    const [settlementApp, setSettlementApp] = useState<SavingsApplication | null>(null);
    const [settlementDate, setSettlementDate] = useState<string>(today);
    const [manualDepositPaid, setManualDepositPaid] = useState<string>('');
    const [manualDeduction, setManualDeduction] = useState<string>('0');
    const [settlementRemarks, setSettlementRemarks] = useState<string>('মেয়াদান্তে এককালীন উত্তোলন ও নিষ্পত্তি');
    const [isSubmittingSettlement, setIsSubmittingSettlement] = useState<boolean>(false);

    useEffect(() => {
        setSelectedZone(filters?.zone_id ? String(filters.zone_id) : '');
        setSelectedArea(filters?.area_id ? String(filters.area_id) : '');
        setSelectedBranch(filters?.branch_id ? String(filters.branch_id) : '');
    }, [filters?.zone_id, filters?.area_id, filters?.branch_id]);

    useEffect(() => {
        setCurrentDateFrom(dateFrom || '');
        setCurrentDateTo(dateTo || '');
        setCurrentStatusFilter(statusFilter || 'all');
        setSearchQuery(searchFilter || '');
    }, [dateFrom, dateTo, statusFilter, searchFilter]);

    useEffect(() => {
        if (flash?.success) {
            setShowSuccessMessage(true);
            const timer = setTimeout(() => setShowSuccessMessage(false), 5000);
            return () => clearTimeout(timer);
        }
    }, [flash?.success]);

    useEffect(() => {
        if (flash?.error) {
            setShowErrorMessage(true);
            const timer = setTimeout(() => setShowErrorMessage(false), 6000);
            return () => clearTimeout(timer);
        }
    }, [flash?.error]);

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

    const buildListParams = (overrides: Record<string, string | number> = {}) => {
        const params: Record<string, string | number> = {
            date_from: currentDateFrom,
            date_to: currentDateTo,
            per_page: applications.per_page || perPage || 20,
            zone_id: selectedZone,
            area_id: selectedArea,
            branch_id: selectedBranch,
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
        router.get('/member/savings-applications', buildListParams(overrides), keepListFilters);
    };

    const handleLocationFilterChange = (zoneVal: string, areaVal: string, branchVal: string) => {
        setSelectedZone(zoneVal);
        setSelectedArea(areaVal);
        setSelectedBranch(branchVal);
        applyListFilters({ zone_id: zoneVal, area_id: areaVal, branch_id: branchVal, page: 1 });
    };

    const isTodayFilter = currentDateFrom === today && currentDateTo === today;

    const handleTodayFilter = () => {
        if (isTodayFilter) {
            setCurrentDateFrom('');
            setCurrentDateTo('');
            applyListFilters({ date_from: '', date_to: '', page: 1 });
        } else {
            setCurrentDateFrom(today);
            setCurrentDateTo(today);
            applyListFilters({ date_from: today, date_to: today, page: 1 });
        }
    };

    const handleDateFilterChange = () => {
        applyListFilters({ page: 1 });
    };

    const resetFilters = () => {
        setCurrentDateFrom('');
        setCurrentDateTo('');
        setCurrentStatusFilter('all');
        setSearchQuery('');
        setSelectedZone('');
        setSelectedArea('');
        setSelectedBranch('');
        router.get(
            '/member/savings-applications',
            { per_page: applications.per_page || perPage || 20 },
            { preserveState: true }
        );
    };

    const handleDelete = (id: number) => {
        if (confirm('সঞ্চয় আবেদনটি মুছে ফেলতে চান?')) {
            router.delete(`/member/savings-applications/${id}`, keepListFilters);
        }
    };

    const handleQuickActivate = (id: number) => {
        if (confirm('এই সঞ্চয় হিসাবটি অবিলম্বে সক্রিয় করতে চান?')) {
            router.patch(`/member/savings-applications/${id}/activate`, {}, keepListFilters);
        }
    };

    // Derived savings financial metrics
    const financialStats = useMemo(() => {
        if (stats) {
            return {
                total_accounts: stats.total_accounts ?? applications.total ?? 0,
                total_deposit: stats.total_deposit ?? 0,
                total_withdrawn: stats.total_withdrawn ?? 0,
                net_balance: stats.net_balance ?? Math.max(0, (stats.total_deposit || 0) - (stats.total_withdrawn || 0)),
                active: stats.active ?? 0,
                matured: stats.matured ?? 0,
                closed: stats.closed ?? 0,
                pending: stats.pending ?? 0,
            };
        }
        const appList = applications.data || [];
        const depositSum = appList.reduce((acc, a) => acc + (Number(a.deposit_amount) || 0), 0);
        const withdrawnSum = appList
            .filter((a) => a.status === 'closed')
            .reduce((acc, a) => acc + (a.form_data?.withdrawal?.total_payout || a.maturity_amount || a.deposit_amount || 0), 0);

        return {
            total_accounts: applications.total || 0,
            total_deposit: depositSum,
            total_withdrawn: withdrawnSum,
            net_balance: Math.max(0, depositSum - withdrawnSum),
            active: appList.filter((a) => a.status === 'active').length,
            matured: appList.filter((a) => a.status === 'matured').length,
            closed: appList.filter((a) => a.status === 'closed').length,
            pending: appList.filter((a) => ['draft', 'submitted', 'under_review'].includes(a.status)).length,
        };
    }, [stats, applications]);

    // Savings Status Pills definition (clean and practical)
    const savingsFilterPills = [
        { key: 'all', label: 'সকল হিসাব', count: financialStats.total_accounts, icon: Layers },
        { key: 'active', label: 'সক্রিয় হিসাব', count: financialStats.active, icon: Sparkles, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
        { key: 'matured', label: 'পরিপক্ক হিসাব', count: financialStats.matured, icon: CheckCircle2, color: 'text-teal-700 bg-teal-50 border-teal-200' },
        { key: 'closed', label: 'উত্তোলন / সমাপ্ত', count: financialStats.closed, icon: Coins, color: 'text-amber-700 bg-amber-50 border-amber-200' },
        { key: 'pending', label: 'অপেক্ষমাণ / নতুন', count: financialStats.pending, icon: Clock, color: 'text-blue-700 bg-blue-50 border-blue-200' },
    ];

    // Open Withdrawal Modal
    const openSettlementModal = (app: SavingsApplication) => {
        setSettlementApp(app);
        const appStartDate = app.account_opening_date || app.start_date || app.created_at?.slice(0, 10) || today;
        const start = new Date(appStartDate);
        const now = new Date(today);
        let elapsed = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
        if (now.getDate() < start.getDate()) {
            elapsed -= 1;
        }
        elapsed = Math.max(0, elapsed);

        // Auto default deposit amount based on monthly installment or deposit amount
        const monthly = Number(app.monthly_installment || app.monthly_savings_amount || 0);
        let defaultDeposit = Number(app.deposit_amount) || 0;
        if (monthly > 0 && elapsed >= 1 && defaultDeposit === 0) {
            defaultDeposit = monthly * elapsed;
        }

        setSettlementDate(today);
        setManualDepositPaid(String(defaultDeposit));
        setManualDeduction('0');
        setSettlementRemarks(
            app.status === 'matured' || (app.duration_months && elapsed >= app.duration_months)
                ? 'মেয়াদান্তে এককালীন সঞ্চয় উত্তোলন ও হিসাব নিষ্পত্তি'
                : 'অকাল প্রত্যাহার ও সঞ্চয় হিসাব নিষ্পত্তি'
        );
    };

    // Auto calculate settlement amounts
    const settlementCalc = useMemo(() => {
        if (!settlementApp) {
            return {
                elapsedMonths: 0,
                targetMonths: 60,
                isFullMaturity: false,
                appliedTierName: '',
                appliedRate: 0,
                depositPaid: 0,
                profitEarned: 0,
                deduction: 0,
                totalPayout: 0,
                underOneMonth: false,
            };
        }

        const appStartDate = settlementApp.account_opening_date || settlementApp.start_date || settlementApp.created_at?.slice(0, 10) || today;
        const start = new Date(appStartDate);
        const end = new Date(settlementDate || today);

        let elapsedMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
        if (end.getDate() < start.getDate()) {
            elapsedMonths -= 1;
        }
        elapsedMonths = Math.max(0, elapsedMonths);

        const targetMonths = settlementApp.duration_months || settlementApp.savingsProduct?.duration_months || (settlementApp as any).savings_product?.duration_months || 60;
        const isFullMaturity = elapsedMonths >= targetMonths && targetMonths > 0;
        const depositPaid = Math.max(0, Number(manualDepositPaid) || Number(settlementApp.deposit_amount) || 0);
        const deduction = Math.max(0, Number(manualDeduction) || 0);

        const prod = settlementApp.savingsProduct || (settlementApp as any).savings_product;
        const defaultRate = Number(prod?.interest_rate) || 9.0;
        const productName = prod?.product_name_bn || prod?.product_name || 'সঞ্চয় প্রকল্প';

        let appliedRate = defaultRate;
        let appliedTierName = isFullMaturity
            ? `${productName} (পূর্ণ মেয়াদ)`
            : 'অকাল উত্তোলন';

        let profitEarned = 0;
        const underOneMonth = elapsedMonths < 1;

        if (underOneMonth) {
            // STRICT RULE: Minimum 1 month tenure is strictly required for profit. Under 1 month, profit is strictly 0.
            appliedRate = 0;
            appliedTierName = '১ মাসের কম (কোনো মুনাফা প্রযোজ্য নয়)';
            profitEarned = 0;
        } else if (isFullMaturity) {
            // Full Scheme Maturity
            const fullMaturityExpected = Number(settlementApp.maturity_amount) || 0;
            if (fullMaturityExpected > depositPaid) {
                profitEarned = fullMaturityExpected - depositPaid;
            } else {
                profitEarned = Math.round(depositPaid * (appliedRate / 100) * (targetMonths / 12));
            }
        } else {
            // Premature tier lookup (minimum 1 month required)
            const tier = SETTLEMENT_TIERS.find((t) => elapsedMonths >= t.minMonths) || SETTLEMENT_TIERS[SETTLEMENT_TIERS.length - 1];
            appliedRate = tier.rate;
            appliedTierName = tier.name;
            // Compound or simple interest based on tier
            profitEarned = Math.round(depositPaid * (appliedRate / 100) * (elapsedMonths / 12));
        }

        const totalPayout = Math.max(0, depositPaid + profitEarned - deduction);

        return {
            elapsedMonths,
            targetMonths,
            isFullMaturity,
            appliedTierName,
            appliedRate,
            depositPaid,
            profitEarned,
            deduction,
            totalPayout,
            underOneMonth,
        };
    }, [settlementApp, settlementDate, manualDepositPaid, manualDeduction, today]);

    const handleConfirmSettlement = (e: FormEvent) => {
        e.preventDefault();
        if (!settlementApp || isSubmittingSettlement) return;

        setIsSubmittingSettlement(true);
        router.post(
            `/member/savings-applications/${settlementApp.id}/withdraw`,
            {
                withdrawal_date: settlementDate,
                months_completed: settlementCalc.elapsedMonths,
                total_deposit_paid: settlementCalc.depositPaid,
                profit_amount: settlementCalc.profitEarned,
                penalty_or_deduction: settlementCalc.deduction,
                total_payout: settlementCalc.totalPayout,
                remarks: settlementRemarks,
            },
            {
                ...keepListFilters,
                onFinish: () => {
                    setIsSubmittingSettlement(false);
                    setSettlementApp(null);
                },
            }
        );
    };

    // Product Modal helpers
    const categoriesList = Array.isArray(categories) ? categories : [];
    const formRules = savingsFormRules ?? {
        admission_only_codes: ['21', '22'],
        forms: { '23': 'term_savings', '24': 'profit_savings', '25': 'profit_savings' },
        messages: {
            admission_only: 'এই সঞ্চয় ক্যাটাগরির জন্য আলাদা আবেদন ফর্ম লাগে না। হিসাব সদস্য ভর্তির সাথেই হয়ে যায়।',
            form_not_ready: 'এই ক্যাটাগরির আবেদন ফর্ম পরে যোগ করা হবে।',
        },
    };
    const selectedCategory = categoriesList.find((category) => category.id === selectedCategoryId);
    const categoryCode = selectedCategory?.category_code ?? '';
    const isAdmissionOnly = formRules.admission_only_codes.includes(categoryCode);
    const formType = formRules.forms[categoryCode] ?? null;
    const categoryProducts = selectedCategory?.savings_products ?? [];
    const selectedProduct = categoryProducts.find((product) => product.id === selectedProductId);
    const canContinue = Boolean(formType && selectedProductId);

    const resetCreateModal = () => {
        setSelectedCategoryId('');
        setSelectedProductId('');
        setShowProductModal(false);
    };

    const applicationRows = applications.data ?? [];

    const getStatusBadge = (status: string) => {
        const info = statusBadges[status] || statusBadges.draft;
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${info.bg} ${info.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${info.dot}`} />
                {info.label}
            </span>
        );
    };

    return (
        <AdminLayout>
            <Head title="সঞ্চয় হিসাব ও আমানত ব্যবস্থাপনা" />

            <div className="p-3 md:p-4 space-y-3 max-w-[1600px] mx-auto">
                {/* Flash Messages */}
                {showSuccessMessage && flash?.success && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-start gap-2.5 shadow-xs text-xs sm:text-sm animate-in fade-in">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 font-bold text-emerald-900">{flash.success}</div>
                        <button
                            onClick={() => setShowSuccessMessage(false)}
                            className="text-emerald-600 hover:text-emerald-800"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {showErrorMessage && flash?.error && (
                    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 flex items-start gap-2.5 shadow-xs text-xs sm:text-sm animate-in fade-in">
                        <Info className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 font-bold text-rose-900">{flash.error}</div>
                        <button
                            onClick={() => setShowErrorMessage(false)}
                            className="text-rose-600 hover:text-rose-800"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* ── 1. COMPACT EXECUTIVE HEADER ─────────────────────────────────────── */}
                <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-teal-950 text-white rounded-2xl px-4 py-2.5 shadow-md border border-slate-800 flex flex-wrap items-center justify-between gap-3 print:hidden">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-sm shrink-0">
                            <PiggyBank className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-sm sm:text-base font-black text-white tracking-tight truncate">
                                    সঞ্চয় হিসাব ও আমানত ব্যবস্থাপনা
                                </h1>
                                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                                    Savings Hub
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-teal-500/20 text-teal-300 border border-teal-400/30">
                                    মোট {financialStats.total_accounts} টি হিসাব
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Compact Action Buttons */}
                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                        <button
                            type="button"
                            onClick={handleTodayFilter}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-2xs ${
                                isTodayFilter
                                    ? 'bg-emerald-500 text-slate-950 font-black shadow-emerald-500/20'
                                    : 'bg-white/10 text-white hover:bg-white/15 border border-white/10'
                            }`}
                            title="আজকের হিসাবসমূহ"
                        >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Today (আজ)</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setSelectedCategoryId('');
                                setSelectedProductId('');
                                setShowProductModal(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 text-xs font-black shadow-2xs transition-all active:scale-95"
                        >
                            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>নতুন সঞ্চয় হিসাব</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setShowCalculatorModal(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 text-xs font-semibold transition-all active:scale-95"
                        >
                            <Calculator className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Savings Calculator</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 text-xs font-semibold transition-all active:scale-95"
                        >
                            <Printer className="w-3.5 h-3.5" />
                            <span>প্রিন্ট</span>
                        </button>

                        <button
                            type="button"
                            onClick={resetFilters}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 text-xs font-semibold transition-all active:scale-95"
                            title="ফিল্টার রিসেট"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>রিসেট</span>
                        </button>
                    </div>
                </div>

                {/* ── 2. SAVINGS FINANCIAL METRICS OVERVIEW (5 Compact Cards) ─────────── */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 print:hidden">
                    {/* Card 1: Total Deposit */}
                    <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs relative overflow-hidden group hover:shadow-xs transition-all">
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide truncate">মোট সঞ্চয় জমা</span>
                            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform shrink-0">
                                <PiggyBank className="w-3.5 h-3.5" />
                            </div>
                        </div>
                        <div className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                            ৳{formatAmount(financialStats.total_deposit)}
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">আমানত সংগ্রহ ও মোট জমা</p>
                        <div className="mt-2 w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 w-full" />
                        </div>
                    </div>

                    {/* Card 2: Total Withdrawn */}
                    <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs relative overflow-hidden group hover:shadow-xs transition-all">
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide truncate">মোট উত্তোলন ও নিষ্পত্তি</span>
                            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform shrink-0">
                                <Coins className="w-3.5 h-3.5" />
                            </div>
                        </div>
                        <div className="text-base sm:text-lg font-black text-amber-900 tracking-tight">
                            ৳{formatAmount(financialStats.total_withdrawn)}
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">পরিশোধকৃত আমানত ও মুনাফা</p>
                        <div className="mt-2 w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 w-3/4" />
                        </div>
                    </div>

                    {/* Card 3: Net Balance */}
                    <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs relative overflow-hidden group hover:shadow-xs transition-all">
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide truncate">বর্তমান নিট স্থিতি</span>
                            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform shrink-0">
                                <TrendingUp className="w-3.5 h-3.5" />
                            </div>
                        </div>
                        <div className="text-base sm:text-lg font-black text-blue-700 tracking-tight">
                            ৳{formatAmount(financialStats.net_balance)}
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">জমা স্থিতি হতে বাদ</p>
                        <div className="mt-2 w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 w-5/6" />
                        </div>
                    </div>

                    {/* Card 4: Active Accounts */}
                    <button
                        type="button"
                        onClick={() => {
                            const next = currentStatusFilter === 'active' ? 'all' : 'active';
                            setCurrentStatusFilter(next);
                            applyListFilters({ status: next, page: 1 });
                        }}
                        className={`p-3.5 rounded-2xl text-left border relative overflow-hidden group hover:shadow-xs transition-all ${
                            currentStatusFilter === 'active'
                                ? 'bg-purple-50/60 border-purple-400 ring-2 ring-purple-300 shadow-xs'
                                : 'bg-white border-slate-200/90 shadow-2xs hover:border-purple-300'
                        }`}
                    >
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide truncate">সক্রিয় সঞ্চয় হিসাব</span>
                            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-600 text-white flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform shrink-0">
                                <Sparkles className="w-3.5 h-3.5" />
                            </div>
                        </div>
                        <div className="text-base sm:text-lg font-black text-purple-900 tracking-tight">
                            {financialStats.active} টি
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">চলতি মেয়াদী ও সাধারণ</p>
                        <div className="mt-2 w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 w-full" />
                        </div>
                    </button>

                    {/* Card 5: Matured Accounts */}
                    <button
                        type="button"
                        onClick={() => {
                            const next = currentStatusFilter === 'matured' ? 'all' : 'matured';
                            setCurrentStatusFilter(next);
                            applyListFilters({ status: next, page: 1 });
                        }}
                        className={`p-3.5 rounded-2xl text-left border relative overflow-hidden group hover:shadow-xs transition-all col-span-2 sm:col-span-1 ${
                            currentStatusFilter === 'matured'
                                ? 'bg-teal-50/60 border-teal-400 ring-2 ring-teal-300 shadow-xs'
                                : 'bg-white border-slate-200/90 shadow-2xs hover:border-teal-300'
                        }`}
                    >
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide truncate">পরিপক্ক হিসাব</span>
                            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-600 text-white flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform shrink-0">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                            </div>
                        </div>
                        <div className="text-base sm:text-lg font-black text-teal-900 tracking-tight">
                            {financialStats.matured} টি
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">উত্তোলনের জন্য প্রস্তুত</p>
                        <div className="mt-2 w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 w-full" />
                        </div>
                    </button>
                </div>

                {/* ── 3. SAVINGS STATUS TABS & TOOLBAR ─────────────────────────────────── */}
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 space-y-4 print:hidden">
                    {/* Status Tabs */}
                    <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
                        {savingsFilterPills.map((pill) => {
                            const active = pill.key === 'all' ? currentStatusFilter === 'all' || !currentStatusFilter : currentStatusFilter === pill.key;
                            const IconComponent = pill.icon;

                            return (
                                <button
                                    key={pill.key}
                                    type="button"
                                    onClick={() => {
                                        setCurrentStatusFilter(pill.key);
                                        applyListFilters({ status: pill.key, page: 1 });
                                    }}
                                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-2xs border ${
                                        active
                                            ? 'bg-slate-900 border-slate-900 text-white ring-2 ring-slate-900/20'
                                            : 'bg-white hover:bg-slate-50 border-slate-200/90 text-slate-700'
                                    }`}
                                >
                                    <IconComponent className={`w-3.5 h-3.5 ${active ? 'text-emerald-400' : 'text-slate-400'}`} />
                                    <span>{pill.label}</span>
                                    <span
                                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                                            active
                                                ? 'bg-slate-800 text-emerald-300'
                                                : 'bg-slate-100 text-slate-600'
                                        }`}
                                    >
                                        {pill.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Cascading Location Filter (if available) */}
                    {zones.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-50/70 border border-slate-200/70">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">জোন (Zone)</label>
                                <select
                                    value={selectedZone}
                                    onChange={(e) => handleLocationFilterChange(e.target.value, '', '')}
                                    className="h-9 w-full border border-slate-300 rounded-xl px-3 text-xs bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition shadow-2xs"
                                >
                                    <option value="">সকল জোন ({zones.length})</option>
                                    {zones.map((z) => (
                                        <option key={z.id} value={z.id}>{z.name} {z.code ? `(${z.code})` : ''}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">অঞ্চল (Area)</label>
                                <select
                                    value={selectedArea}
                                    onChange={(e) => handleLocationFilterChange(selectedZone, e.target.value, '')}
                                    disabled={!selectedZone && zones.length > 0}
                                    className="h-9 w-full border border-slate-300 rounded-xl px-3 text-xs bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition shadow-2xs disabled:bg-slate-100 disabled:text-slate-400"
                                >
                                    <option value="">সকল অঞ্চল ({filteredAreas.length})</option>
                                    {filteredAreas.map((a) => (
                                        <option key={a.id} value={a.id}>{a.name} {a.code ? `(${a.code})` : ''}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">শাখা (Branch)</label>
                                <select
                                    value={selectedBranch}
                                    onChange={(e) => handleLocationFilterChange(selectedZone, selectedArea, e.target.value)}
                                    className="h-9 w-full border border-slate-300 rounded-xl px-3 text-xs bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition shadow-2xs"
                                >
                                    <option value="">সকল শাখা ({filteredBranches.length})</option>
                                    {filteredBranches.map((b) => (
                                        <option key={b.id} value={b.id}>{formatBranchLabel(b)}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Search & Date Controls */}
                    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 text-xs">
                        {/* Search Input */}
                        <div className="relative flex-grow max-w-lg">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="সদস্য কোড, হিসাব নং, নাম, ফোন, এনআইডি, আবেদন নং..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        applyListFilters({ page: 1 });
                                    }
                                }}
                                className="w-full pl-10 pr-8 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-slate-50/50 font-medium transition-all shadow-2xs"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchQuery('');
                                        applyListFilters({ search: '', page: 1 });
                                    }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {/* Date Range & Buttons */}
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded-xl shadow-2xs">
                                <input
                                    type="date"
                                    value={currentDateFrom}
                                    onChange={(e) => setCurrentDateFrom(e.target.value)}
                                    className="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none font-medium"
                                    title="তারিখ হতে"
                                />
                                <span className="text-slate-400 text-xs font-bold">–</span>
                                <input
                                    type="date"
                                    value={currentDateTo}
                                    onChange={(e) => setCurrentDateTo(e.target.value)}
                                    className="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none font-medium"
                                    title="তারিখ পর্যন্ত"
                                />
                            </div>

                            <button
                                type="button"
                                onClick={handleDateFilterChange}
                                className="px-4 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition shadow-sm active:scale-95 flex items-center gap-1.5"
                            >
                                <Filter className="w-3.5 h-3.5 text-emerald-400" />
                                <span>ফিল্টার</span>
                            </button>

                            <button
                                type="button"
                                onClick={resetFilters}
                                className="px-3.5 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-1 shadow-2xs"
                                title="ফিল্টার রিসেট"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>রিসেট</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── 4. APPLICATIONS TABLE CONTAINER ─────────────────────────────────── */}
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden p-3 md:p-5 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">সঞ্চয় হিসাবের তালিকা</h3>
                            <span className="text-xs font-bold px-2.5 py-0.5 bg-emerald-50 text-emerald-800 rounded-full border border-emerald-200">
                                মোট {applications.total} টি হিসাব
                            </span>
                        </div>
                        <span className="text-xs text-slate-400 font-medium hidden sm:block">
                            পৃষ্ঠা {applications.current_page || 1} / {applications.last_page || 1}
                        </span>
                    </div>

                    {/* MOBILE CARDS VIEW (md:hidden) */}
                    <div className="md:hidden flex flex-col gap-3.5">
                        {applicationRows.length === 0 ? (
                            <div className="p-12 text-center text-slate-400 text-xs font-medium bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                কোনো সঞ্চয় হিসাব পাওয়া যায়নি।
                            </div>
                        ) : (
                            applicationRows.map((app) => {
                                const member = app.memberAdmission || (app as any).member_admission;
                                const product = app.savingsProduct || (app as any).savings_product;
                                const memberName =
                                    member?.applicant_name_bn ||
                                    member?.applicant_name_en ||
                                    '—';
                                const memberCode = app.member_no || member?.application_no || '—';
                                const phone = member?.mobile_number;
                                const isClosed = app.status === 'closed';
                                const withdrawalData = app.form_data?.withdrawal;
                                const monthly =
                                    app.monthly_installment ||
                                    app.monthly_savings_amount ||
                                    app.form_data?.monthly_savings_amount;

                                return (
                                    <div
                                        key={app.id}
                                        className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3 relative overflow-hidden"
                                    >
                                        <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                                            <div>
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                                        {app.application_no}
                                                    </span>
                                                    {app.account_no && (
                                                        <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                                            হিসাব: {app.account_no}
                                                        </span>
                                                    )}
                                                </div>
                                                <h4 className="font-extrabold text-slate-900 text-sm mt-1.5">
                                                    {memberName}
                                                </h4>
                                                <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                                                    <span>আইডি: {memberCode}</span>
                                                    {phone && <span>• {phone}</span>}
                                                </div>
                                            </div>
                                            <div className="shrink-0">{getStatusBadge(app.status)}</div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2.5 bg-slate-50/80 p-3 rounded-2xl border border-slate-100 text-xs">
                                            <div>
                                                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                                                    সঞ্চয় প্রকল্প
                                                </span>
                                                <p className="font-bold text-slate-800 truncate mt-0.5">
                                                    {product?.product_name_bn ||
                                                        product?.product_name ||
                                                        '—'}
                                                </p>
                                                {product?.product_code && (
                                                    <span className="text-[10px] font-mono text-slate-400">
                                                        {product.product_code}
                                                    </span>
                                                )}
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                                                    মোট জমার অংক
                                                </span>
                                                <p className="font-black text-slate-900 mt-0.5">
                                                    ৳{formatAmount(app.deposit_amount)}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                                                    মাসিক কিস্তি
                                                </span>
                                                <p className="font-semibold text-slate-700 mt-0.5">
                                                    {monthly
                                                        ? `৳${formatAmount(monthly)}`
                                                        : '—'}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                                                    {isClosed ? 'পরিশোধিত অর্থ' : 'পরিপক্ক পরিমাণ'}
                                                </span>
                                                <p className={`font-semibold mt-0.5 ${isClosed ? 'text-amber-800' : 'text-teal-700'}`}>
                                                    {isClosed
                                                        ? `৳${formatAmount(withdrawalData?.total_payout || app.maturity_amount || app.deposit_amount)}`
                                                        : app.maturity_amount
                                                        ? `৳${formatAmount(app.maturity_amount)}`
                                                        : '—'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                                            <Link
                                                href={`/member/savings-applications/${app.id}`}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                <span>বিবরণ</span>
                                            </Link>

                                            <div className="flex items-center gap-1.5">
                                                {!isClosed && (
                                                    <button
                                                        type="button"
                                                        onClick={() => openSettlementModal(app)}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition shadow-2xs"
                                                    >
                                                        <Coins className="w-3.5 h-3.5 text-amber-700" />
                                                        <span>উত্তোলন</span>
                                                    </button>
                                                )}
                                                {['draft', 'rejected'].includes(app.status) && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(app.id)}
                                                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-xl transition"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* DESKTOP TABLE VIEW (hidden md:block) */}
                    <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider">
                                    <th className="py-3 px-3.5">আবেদন ও হিসাব নং</th>
                                    <th className="py-3 px-3.5">সদস্যের তথ্য</th>
                                    <th className="py-3 px-3.5">সঞ্চয় প্রকল্প</th>
                                    <th className="py-3 px-3.5 text-right">জমার পরিমাণ</th>
                                    <th className="py-3 px-3.5 text-right">মাসিক কিস্তি</th>
                                    <th className="py-3 px-3.5 text-right">পরিপক্ক / পরিশোধ</th>
                                    <th className="py-3 px-3.5">শাখা ও সমিতি</th>
                                    <th className="py-3 px-3.5">স্ট্যাটাস</th>
                                    <th className="py-3 px-3.5">সময়কাল</th>
                                    <th className="py-3 px-3.5 text-right">অ্যাকশন</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                                {applicationRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="py-16 text-center text-slate-400 font-medium">
                                            কোনো সঞ্চয় হিসাব পাওয়া যায়নি
                                        </td>
                                    </tr>
                                ) : (
                                    applicationRows.map((app) => {
                                        const member = app.memberAdmission || (app as any).member_admission;
                                        const product = app.savingsProduct || (app as any).savings_product;
                                        const memberName =
                                            member?.applicant_name_bn ||
                                            member?.applicant_name_en ||
                                            '—';
                                        const memberCode = app.member_no || member?.application_no;
                                        const phone = member?.mobile_number;
                                        const duration = app.duration_months || product?.duration_months;
                                        const durationLabel = duration
                                            ? duration >= 12
                                                ? `${Math.round(duration / 12)} বছর`
                                                : `${duration} মাস`
                                            : null;
                                        const isClosed = app.status === 'closed';
                                        const withdrawalData = app.form_data?.withdrawal;
                                        const monthly =
                                            app.monthly_installment ||
                                            app.monthly_savings_amount ||
                                            app.form_data?.monthly_savings_amount;

                                        // Member avatar initial
                                        const initial = memberName && memberName !== '—' ? memberName.charAt(0) : 'S';

                                        return (
                                            <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                                                {/* Account / Application No */}
                                                <td className="py-3 px-3.5">
                                                    <Link
                                                        href={`/member/savings-applications/${app.id}`}
                                                        className="hover:underline block group"
                                                    >
                                                        <span className="font-mono font-bold text-emerald-800 group-hover:text-emerald-950 block">
                                                            {app.application_no}
                                                        </span>
                                                        {app.account_no && (
                                                            <span className="inline-block text-[11px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded mt-0.5">
                                                                হিসাব: {app.account_no}
                                                            </span>
                                                        )}
                                                    </Link>
                                                </td>

                                                {/* Member Details */}
                                                <td className="py-3 px-3.5">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs shrink-0 border border-emerald-200">
                                                            {initial}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-900">{memberName}</div>
                                                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                                                                {memberCode && (
                                                                    <span className="font-mono bg-slate-100 text-slate-600 px-1 py-0.2 rounded border border-slate-200">
                                                                        {memberCode}
                                                                    </span>
                                                                )}
                                                                {phone && <span>{phone}</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Savings Product */}
                                                <td className="py-3 px-3.5">
                                                    <div className="font-bold text-slate-800">
                                                        {product?.product_name_bn ||
                                                            product?.product_name ||
                                                            '—'}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5 flex-wrap">
                                                        {product?.product_code && (
                                                            <span className="font-mono bg-slate-100 text-slate-600 px-1 py-0.2 rounded border border-slate-200">
                                                                {product.product_code}
                                                            </span>
                                                        )}
                                                        {durationLabel && (
                                                            <span className="bg-slate-100 text-slate-700 px-1 py-0.2 rounded font-medium">
                                                                {durationLabel}
                                                            </span>
                                                        )}
                                                        {product?.interest_rate != null && (
                                                            <span className="text-emerald-700 font-bold bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                                                                {product.interest_rate}%
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Deposit Amount */}
                                                <td className="py-3 px-3.5 text-right font-black text-slate-900 tabular-nums">
                                                    ৳{formatAmount(app.deposit_amount)}
                                                </td>

                                                {/* Monthly Installment */}
                                                <td className="py-3 px-3.5 text-right font-semibold text-slate-700 tabular-nums">
                                                    {monthly
                                                        ? `৳${formatAmount(monthly)}`
                                                        : '—'}
                                                </td>

                                                {/* Maturity / Settled Amount */}
                                                <td className="py-3 px-3.5 text-right tabular-nums">
                                                    {isClosed ? (
                                                        <div>
                                                            <span className="font-bold text-amber-800 block">
                                                                ৳{formatAmount(withdrawalData?.total_payout || app.maturity_amount || app.deposit_amount)}
                                                            </span>
                                                            <span className="text-[10px] text-amber-600 font-medium">উত্তোলিত</span>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <span className="font-bold text-teal-700 block">
                                                                {app.maturity_amount ? `৳${formatAmount(app.maturity_amount)}` : '—'}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400 font-medium">পরিপক্ক পরিমাণ</span>
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Branch / Samity */}
                                                <td className="py-3 px-3.5 text-slate-600">
                                                    {app.branch?.name && (
                                                        <div className="font-bold text-slate-800 truncate">{app.branch.name}</div>
                                                    )}
                                                    {app.samity?.samity_name_bn || app.samity?.samity_name ? (
                                                        <div className="text-[10px] text-slate-500 truncate mt-0.5">
                                                            {app.samity.samity_name_bn || app.samity.samity_name}
                                                        </div>
                                                    ) : null}
                                                </td>

                                                {/* Status */}
                                                <td className="py-3 px-3.5">{getStatusBadge(app.status)}</td>

                                                {/* Timing Duration */}
                                                <td className="py-3 px-3.5 text-slate-500 whitespace-nowrap">
                                                    <div className="font-medium text-slate-700">{formatDate(app.account_opening_date || app.start_date || app.created_at)}</div>
                                                    {app.maturity_date && (
                                                        <div className="text-[10px] text-slate-400">
                                                            মেয়াদ: {formatDate(app.maturity_date)}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Action Buttons */}
                                                <td className="py-3 px-3.5 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {/* Details View */}
                                                        <Link
                                                            href={`/member/savings-applications/${app.id}`}
                                                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors border border-transparent hover:border-emerald-200"
                                                            title="বিবরণ দেখুন"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </Link>

                                                        {/* Quick Auto-Activate button for pending/draft */}
                                                        {['draft', 'submitted', 'under_review'].includes(app.status) && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleQuickActivate(app.id)}
                                                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-2xs"
                                                                title="অবিলম্বে সক্রিয় করুন"
                                                            >
                                                                <Check className="w-3.5 h-3.5" />
                                                                <span>সক্রিয়</span>
                                                            </button>
                                                        )}

                                                        {/* Quick Withdrawal & Settlement Button */}
                                                        {!isClosed && (
                                                            <button
                                                                type="button"
                                                                onClick={() => openSettlementModal(app)}
                                                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition shadow-2xs"
                                                                title="সঞ্চয় উত্তোলন ও নিষ্পত্তি করুন"
                                                            >
                                                                <Coins className="w-3.5 h-3.5 text-amber-700" />
                                                                <span>উত্তোলন</span>
                                                            </button>
                                                        )}

                                                        {/* Draft Edit / Delete */}
                                                        {['draft', 'rejected'].includes(app.status) && (
                                                            <>
                                                                <Link
                                                                    href={`/member/savings-applications/${app.id}/edit`}
                                                                    className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors border border-transparent hover:border-amber-200"
                                                                    title="সম্পাদনা"
                                                                >
                                                                    <Edit className="w-4 h-4" />
                                                                </Link>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDelete(app.id)}
                                                                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                                    title="মুছুন"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="pt-2 border-t border-slate-100">
                        <ListPagination
                            pagination={applications}
                            onPageChange={(page) => applyListFilters({ page })}
                            onPerPageChange={(perPage) => applyListFilters({ per_page: perPage, page: 1 })}
                            itemLabel="টি সঞ্চয় হিসাব"
                        />
                    </div>
                </div>

                {/* ── 5. SAVINGS WITHDRAWAL & SETTLEMENT MODAL (অটো ক্যালকুলেশনসহ) ──────── */}
                {settlementApp && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-amber-50/80 to-white">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                                        <Coins className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-extrabold text-slate-900">
                                            সঞ্চয় উত্তোলন ও নিষ্পত্তি ক্যালকুলেটর
                                        </h3>
                                        <p className="text-xs text-slate-500 font-medium">
                                            আবেদন নং: {settlementApp.application_no} · সদস্য: {settlementApp.memberAdmission?.applicant_name_bn || settlementApp.memberAdmission?.applicant_name_en}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSettlementApp(null)}
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <form onSubmit={handleConfirmSettlement} className="flex flex-col flex-1 overflow-hidden">
                                <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
                                    {/* Account Summary Banner */}
                                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        <div>
                                            <span className="text-[10px] text-slate-400 block font-bold">প্রকল্প</span>
                                            <span className="font-bold text-slate-800 truncate block">
                                                {settlementApp.savingsProduct?.product_name_bn || settlementApp.savingsProduct?.product_name}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-slate-400 block font-bold">শুরু তারিখ</span>
                                            <span className="font-bold text-slate-800">
                                                {formatDate(settlementApp.start_date || settlementApp.created_at)}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-slate-400 block font-bold">নির্ধারিত মেয়াদ</span>
                                            <span className="font-bold text-slate-800">
                                                {settlementApp.duration_months} মাস
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-slate-400 block font-bold">সুদের হার</span>
                                            <span className="font-bold text-emerald-700">
                                                {settlementApp.savingsProduct?.interest_rate}%
                                            </span>
                                        </div>
                                    </div>

                                    {/* Inputs Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                        <div>
                                            <label className="block font-bold text-slate-700 mb-1">উত্তোলন / নিষ্পত্তির তারিখ</label>
                                            <input
                                                type="date"
                                                value={settlementDate}
                                                onChange={(e) => setSettlementDate(e.target.value)}
                                                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block font-bold text-slate-700 mb-1">
                                                অতিবাহিত সময় (Elapsed Months)
                                            </label>
                                            <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-between">
                                                <span>{settlementCalc.elapsedMonths} মাস ({Math.round(settlementCalc.elapsedMonths / 12 * 10) / 10} বছর)</span>
                                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                                    settlementCalc.isFullMaturity
                                                        ? 'bg-emerald-100 text-emerald-800'
                                                        : 'bg-amber-100 text-amber-800'
                                                }`}>
                                                    {settlementCalc.isFullMaturity ? 'মেয়াদ উত্তীর্ণ' : 'অকাল উত্তোলন'}
                                                </span>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block font-bold text-slate-700 mb-1">মোট জমাকৃত মূল টাকা (৳)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="any"
                                                value={manualDepositPaid}
                                                onChange={(e) => setManualDepositPaid(e.target.value)}
                                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 font-mono"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block font-bold text-slate-700 mb-1">কর্তন / ফি (যদি থাকে) (৳)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="any"
                                                value={manualDeduction}
                                                onChange={(e) => setManualDeduction(e.target.value)}
                                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-rose-700 focus:outline-none focus:border-amber-500 font-mono"
                                            />
                                        </div>
                                    </div>

                                    {/* Auto Calculation Result Card */}
                                    <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/90 to-emerald-50/70 border border-amber-200/80 space-y-2.5">
                                        {settlementCalc.underOneMonth && (
                                            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-300 text-amber-900 text-xs flex items-start gap-2.5">
                                                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                                <div className="space-y-0.5">
                                                    <strong className="block font-bold text-amber-950">১ মাসের কম সময় হওয়ায় মুনাফা প্রযোজ্য নয়</strong>
                                                    <span className="text-[11px] text-amber-800 leading-normal block">
                                                        হিসাব খোলার তারিখ হতে অতিবাহিত সময় ১ মাস পূর্ণ হয়নি ({settlementCalc.elapsedMonths} মাস)। প্রতিষ্ঠানটির নীতিমালা অনুযায়ী সঞ্চয় উত্তোলনে মুনাফা প্রাপ্তির জন্য হিসাবের বয়স ন্যূনতম ১ মাস হতে হবে। সুতরাং মুনাফার পরিমাণ ০ টাকা এবং শুধুমাত্র মূল জমাকৃত অর্থ প্রদান করা হবে।
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between text-xs pb-2 border-b border-amber-200/60">
                                            <span className="font-bold text-slate-700">প্রযোজ্য সুদের নিয়ম / স্তর:</span>
                                            <span className={`font-bold px-2 py-0.5 rounded-md border text-xs ${
                                                settlementCalc.underOneMonth
                                                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                                                    : 'bg-white text-emerald-800 border-emerald-200'
                                            }`}>
                                                {settlementCalc.appliedTierName} ({settlementCalc.appliedRate}%)
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2 text-center pt-1">
                                            <div className="p-2 rounded-xl bg-white/80 border border-slate-200">
                                                <span className="text-[10px] text-slate-500 block font-semibold">মূল জমা</span>
                                                <span className="font-black text-slate-800 text-xs">
                                                    ৳{formatAmount(settlementCalc.depositPaid)}
                                                </span>
                                            </div>
                                            <div className="p-2 rounded-xl bg-white/80 border border-emerald-200">
                                                <span className="text-[10px] text-emerald-700 block font-semibold">অর্জিত মুনাফা</span>
                                                <span className="font-black text-emerald-700 text-xs">
                                                    +৳{formatAmount(settlementCalc.profitEarned)}
                                                </span>
                                            </div>
                                            <div className="p-2 rounded-xl bg-white/80 border border-rose-200">
                                                <span className="text-[10px] text-rose-600 block font-semibold">কর্তন</span>
                                                <span className="font-black text-rose-700 text-xs">
                                                    -৳{formatAmount(settlementCalc.deduction)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="p-3 rounded-xl bg-emerald-600 text-white flex items-center justify-between shadow-sm">
                                            <div className="flex items-center gap-2">
                                                <Receipt className="w-5 h-5" />
                                                <span className="font-extrabold text-xs sm:text-sm">সর্বমোট প্রদেয় অর্থ (Net Payout):</span>
                                            </div>
                                            <span className="font-black text-base sm:text-lg tracking-tight">
                                                ৳{formatAmount(settlementCalc.totalPayout)}
                                            </span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block font-bold text-slate-700 mb-1">মন্তব্য / বিবরণে কারণ</label>
                                        <input
                                            type="text"
                                            value={settlementRemarks}
                                            onChange={(e) => setSettlementRemarks(e.target.value)}
                                            placeholder="উত্তোলনের বিবরণ লিখুন"
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:border-amber-500"
                                        />
                                    </div>
                                </div>

                                {/* Modal Footer */}
                                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
                                    <button
                                        type="button"
                                        onClick={() => setSettlementApp(null)}
                                        className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl transition"
                                    >
                                        বাতিল
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={isSubmittingSettlement || settlementCalc.totalPayout <= 0}
                                        className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-700 hover:to-emerald-700 text-white rounded-xl shadow-md transition active:scale-95 disabled:opacity-50"
                                    >
                                        <Banknote className="w-4 h-4" />
                                        <span>
                                            {isSubmittingSettlement
                                                ? 'উত্তোলন সংরক্ষিত হচ্ছে...'
                                                : `উত্তোলন নিশ্চিত করুন (৳${formatAmount(settlementCalc.totalPayout)})`}
                                        </span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* ── 6. PRODUCT SELECTION MODAL ──────────────────────────────────────── */}
                {showProductModal && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                                        <PiggyBank className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                                            নতুন সঞ্চয় হিসাব তৈরি
                                        </h3>
                                        <p className="text-xs text-slate-500 font-medium">
                                            ক্যাটাগরি ও উপযুক্ত সঞ্চয় স্কিমটি নির্বাচন করুন
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={resetCreateModal}
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="p-6 space-y-6 overflow-y-auto flex-1">
                                <div>
                                    <div className="flex items-center justify-between mb-2.5">
                                        <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                            <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black inline-flex items-center justify-center">
                                                ১
                                            </span>
                                            সঞ্চয় ক্যাটাগরি
                                        </label>
                                        <span className="text-[11px] text-slate-400 font-medium">
                                            যেকোনো একটি ক্যাটাগরি বেছে নিন
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                        {categoriesList.map((category) => {
                                            const isSelected = selectedCategoryId === category.id;
                                            return (
                                                <button
                                                    key={category.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedCategoryId(category.id);
                                                        setSelectedProductId('');
                                                    }}
                                                    className={`relative p-3 rounded-2xl text-left border transition-all ${
                                                        isSelected
                                                            ? 'border-emerald-600 bg-emerald-50/70 shadow-sm ring-2 ring-emerald-500/20'
                                                            : 'border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span
                                                            className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                                                                isSelected
                                                                    ? 'bg-emerald-600 text-white'
                                                                    : 'bg-slate-100 text-slate-600'
                                                            }`}
                                                        >
                                                            {category.category_code}
                                                        </span>
                                                        {isSelected && (
                                                            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                                                        )}
                                                    </div>
                                                    <p
                                                        className={`text-xs font-bold line-clamp-1 ${
                                                            isSelected ? 'text-emerald-950' : 'text-slate-800'
                                                        }`}
                                                    >
                                                        {category.category_name_bn || category.category_name}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 mt-0.5">
                                                        {category.savings_products?.length ?? 0} টি পণ্য সক্রিয়
                                                    </p>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {isAdmissionOnly && (
                                    <div className="rounded-2xl border border-amber-200/80 bg-amber-50/70 p-4 text-xs text-amber-900 flex items-start gap-3 animate-in fade-in">
                                        <div className="p-1 rounded-lg bg-amber-200/60 text-amber-800 shrink-0 mt-0.5">
                                            <Info className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-amber-950 mb-0.5">
                                                আলাদা আবেদন ফর্ম প্রয়োজন নেই
                                            </p>
                                            <p className="font-medium text-amber-800 leading-relaxed">
                                                {formRules.messages.admission_only}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {selectedCategory && !isAdmissionOnly && !formType && (
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-xs text-slate-700 flex items-start gap-3 animate-in fade-in">
                                        <Info className="w-4 h-4 shrink-0 text-slate-400 mt-0.5" />
                                        <p className="font-medium leading-relaxed">
                                            {formRules.messages.form_not_ready}
                                        </p>
                                    </div>
                                )}

                                {formType && (
                                    <div className="space-y-2.5 animate-in fade-in duration-200">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                                <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black inline-flex items-center justify-center">
                                                    ২
                                                </span>
                                                সঞ্চয় পণ্য / স্কিম
                                            </label>
                                            <span className="text-[11px] text-slate-400 font-medium">
                                                {categoryProducts.length} টি স্কিম উপলভ্য
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {categoryProducts.map((product) => {
                                                const isSelected = selectedProductId === product.id;
                                                const durationText =
                                                    product.duration_months >= 12
                                                        ? `${Math.round(product.duration_months / 12)} বছর`
                                                        : `${product.duration_months} মাস`;

                                                return (
                                                    <div
                                                        key={product.id}
                                                        onClick={() => setSelectedProductId(product.id)}
                                                        className={`relative p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
                                                            isSelected
                                                                ? 'border-emerald-600 bg-emerald-50/60 shadow-sm ring-2 ring-emerald-500/20'
                                                                : 'border-slate-200/90 bg-white hover:border-emerald-300 hover:bg-slate-50/50'
                                                        }`}
                                                    >
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div>
                                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                                                                    {product.product_code}
                                                                </span>
                                                                <h4 className="text-xs sm:text-sm font-bold text-slate-900 mt-1 line-clamp-1">
                                                                    {product.product_name_bn || product.product_name}
                                                                </h4>
                                                            </div>
                                                            <div
                                                                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                                                                    isSelected
                                                                        ? 'bg-emerald-600 text-white'
                                                                        : 'border-2 border-slate-300'
                                                                }`}
                                                            >
                                                                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                                            </div>
                                                        </div>

                                                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                                                            <span className="inline-flex items-center gap-1 text-slate-600">
                                                                <Clock className="w-3 h-3 text-slate-400" />
                                                                <span>{durationText}</span>
                                                            </span>
                                                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                                                                <Percent className="w-3 h-3 text-emerald-500" />
                                                                <span>{product.interest_rate}%</span>
                                                            </span>
                                                            <span className="inline-flex items-center gap-1 text-slate-500 w-full mt-0.5">
                                                                <Coins className="w-3 h-3 text-slate-400" />
                                                                <span>
                                                                    সীমা: ৳{formatAmount(product.min_amount)}
                                                                    {product.max_amount
                                                                        ? ` – ৳${formatAmount(product.max_amount)}`
                                                                        : ''}
                                                                </span>
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/70">
                                <div className="text-xs text-slate-500 truncate max-w-[240px] sm:max-w-xs">
                                    {selectedProduct ? (
                                        <span className="text-emerald-900 font-semibold truncate block">
                                            {selectedProduct.product_name_bn || selectedProduct.product_name}
                                        </span>
                                    ) : (
                                        <span className="text-slate-400">কোনো স্কিম নির্বাচিত নেই</span>
                                    )}
                                </div>

                                <div className="flex items-center gap-2.5 shrink-0">
                                    <button
                                        type="button"
                                        onClick={resetCreateModal}
                                        className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition"
                                    >
                                        বাতিল
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!canContinue}
                                        onClick={() => {
                                            if (!selectedProductId) return;
                                            router.visit(`/member/savings-applications/create/${selectedProductId}`);
                                        }}
                                        className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl shadow-md shadow-emerald-600/25 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition active:scale-95"
                                    >
                                        <span>ফর্মে এগিয়ে যান</span>
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Savings Calculator Modal */}
                <SavingsCalculatorModal
                    open={showCalculatorModal}
                    onOpenChange={setShowCalculatorModal}
                />
            </div>
        </AdminLayout>
    );
}
