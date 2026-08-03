import { useState, useEffect, useMemo } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { formatDate } from '@/utils/dateUtils';
import {
    Plus,
    Calendar,
    FileText,
    CheckCircle,
    XCircle,
    Clock,
    Search,
    Eye,
    Edit,
    Trash2,
    X,
    PiggyBank,
    Building2,
    Phone,
    UserCheck,
    ChevronLeft,
    ChevronRight,
    Sparkles,
    Calculator,
} from 'lucide-react';
import SavingsCalculatorModal from '@/components/SavingsCalculatorModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface SavingsProduct {
    id: number;
    product_name: string;
    product_name_bn: string;
    product_code: string;
    min_amount: number;
    max_amount: number;
    duration_months: number;
    interest_rate: number;
    is_active: boolean;
}

interface SavingsApplication {
    id: number;
    application_no: string;
    status: string;
    deposit_amount: number;
    monthly_installment?: number;
    maturity_amount?: number;
    maturity_date?: string;
    created_at: string;
    submitted_at?: string;
    savingsProduct: SavingsProduct;
    memberAdmission?: {
        id: number;
        applicant_name_en?: string;
        applicant_name_bn?: string;
        application_no?: string;
        nid_number?: string;
        mobile_number?: string;
    };
}

interface Props {
    products: SavingsProduct[];
    applications: {
        data: SavingsApplication[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        links: Array<{ url: string | null; label: string; active: boolean }>;
    };
    flash?: {
        success?: string;
        error?: string;
    };
}

const statusLabels: Record<string, { label: string; bg: string; text: string; dot: string }> = {
    draft: { label: 'খসড়া', bg: 'bg-slate-100 border-slate-300', text: 'text-slate-700', dot: 'bg-slate-500' },
    submitted: { label: 'জমা', bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500' },
    under_review: { label: 'পর্যালোচনায়', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' },
    approved: { label: 'অনুমোদিত', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-600' },
    rejected: { label: 'প্রত্যাখ্যাত', bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700', dot: 'bg-rose-500' },
    active: { label: 'সক্রিয়', bg: 'bg-purple-50 border-purple-200', text: 'text-purple-700', dot: 'bg-purple-500' },
    matured: { label: 'পরিপক্ক', bg: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-700', dot: 'bg-indigo-500' },
    closed: { label: 'বন্ধ', bg: 'bg-slate-100 border-slate-200', text: 'text-slate-700', dot: 'bg-slate-400' },
    cancelled: { label: 'বাতিল', bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700', dot: 'bg-rose-500' },
};

const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-BD', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

const G_SAVINGS_PRODUCT_CODE = '21.01';

export default function Index({ products, applications, flash }: Props) {
    const today = new Date().toISOString().split('T')[0];
    const [currentDateFrom, setCurrentDateFrom] = useState(today);
    const [currentDateTo, setCurrentDateTo] = useState(today);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSuccessMessage, setShowSuccessMessage] = useState(!!flash?.success);
    const [showProductModal, setShowProductModal] = useState(false);
    const [showCalculatorModal, setShowCalculatorModal] = useState(false);

    const applicationProducts = useMemo(
        () => products.filter((p) => p.product_code !== G_SAVINGS_PRODUCT_CODE),
        [products]
    );

    useEffect(() => {
        if (flash?.success) {
            setShowSuccessMessage(true);
            const timer = setTimeout(() => setShowSuccessMessage(false), 5000);
            return () => clearTimeout(timer);
        }
    }, [flash?.success]);

    const handleDateFilterChange = () => {
        const params: any = {
            date_from: currentDateFrom,
            date_to: currentDateTo,
        };
        if (searchQuery) {
            params.search = searchQuery;
        }
        router.get('/member/savings-applications', params, { preserveState: true });
    };

    const handleSearch = () => {
        const params: any = {
            date_from: currentDateFrom,
            date_to: currentDateTo,
        };
        if (searchQuery) {
            params.search = searchQuery;
        }
        router.get('/member/savings-applications', params, { preserveState: true });
    };

    const handleDelete = (id: number) => {
        if (confirm('আবেদনটি মুছে ফেলতে চান?')) {
            router.delete(`/member/savings-applications/${id}`, {
                preserveScroll: true,
            });
        }
    };

    const stats = useMemo(() => {
        return {
            total: applications.total,
            draft: applications.data.filter((a) => a.status === 'draft').length,
            submitted: applications.data.filter((a) => a.status === 'submitted').length,
            approved: applications.data.filter((a) => a.status === 'approved').length,
            rejected: applications.data.filter((a) => a.status === 'rejected').length,
            active: applications.data.filter((a) => a.status === 'active').length,
            under_review: applications.data.filter((a) => a.status === 'under_review').length,
        };
    }, [applications]);

    const getStatusBadge = (status: string) => {
        const info = statusLabels[status] || statusLabels.draft;
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${info.bg} ${info.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${info.dot}`} />
                {info.label}
            </span>
        );
    };

    return (
        <AdminLayout>
            <Head title="মেয়াদী সঞ্চয় আবেদন" />

            <div className="max-w-7xl mx-auto space-y-6 py-4 px-3 sm:px-6 pb-16">
                {/* Alert Notification */}
                {showSuccessMessage && flash?.success && (
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-bold flex items-center justify-between shadow-sm animate-in fade-in">
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                            <span>{flash.success}</span>
                        </div>
                        <button onClick={() => setShowSuccessMessage(false)} className="text-emerald-600 hover:text-emerald-800">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* ── 1. HERO BANNER HEADER ─────────────────────────────────────────── */}
                <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-6 sm:p-8 shadow-xl border border-slate-800">
                    <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-gradient-to-tr from-purple-600/30 to-indigo-500/20 blur-3xl pointer-events-none" />
                    <div className="absolute left-1/3 -top-12 w-48 h-48 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-2 max-w-2xl">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-400/20 text-purple-300 text-xs font-semibold backdrop-blur-md">
                                <PiggyBank className="w-4 h-4 text-purple-400" />
                                <span>Savings Application Management</span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                                মেয়াদী সঞ্চয় আবেদন প্যানেল
                            </h1>
                            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                                সদস্যদের মেয়াদী সঞ্চয় প্রকল্প আবেদনসমূহ পর্যালোচনা করুন ও দ্রুত প্রক্রিয়াজাত করুন।
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 shrink-0">
                            <button
                                onClick={() => setShowCalculatorModal(true)}
                                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-bold border border-white/20 backdrop-blur-md transition-all active:scale-95 shrink-0"
                            >
                                <Calculator className="w-4 h-4 text-emerald-400" />
                                <span>Savings Calculator</span>
                            </button>

                            {applicationProducts.length > 0 && (
                                <button
                                    onClick={() => setShowProductModal(true)}
                                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-bold shadow-lg shadow-purple-600/30 transition-all active:scale-95 shrink-0"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>নতুন সঞ্চয় আবেদন</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── 2. STATS OVERVIEW CARDS ────────────────────────────────────────── */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">মোট আবেদন</span>
                        <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{stats.total}</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">খসড়া (Draft)</span>
                        <p className="text-xl sm:text-2xl font-black text-slate-700 mt-1">{stats.draft}</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">জমা (Submitted)</span>
                        <p className="text-xl sm:text-2xl font-black text-blue-600 mt-1">{stats.submitted}</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block">পর্যালোচনায়</span>
                        <p className="text-xl sm:text-2xl font-black text-amber-600 mt-1">{stats.under_review}</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">অনুমোদিত</span>
                        <p className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">{stats.approved}</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 block">সক্রিয় (Active)</span>
                        <p className="text-xl sm:text-2xl font-black text-purple-600 mt-1">{stats.active}</p>
                    </div>
                </div>

                {/* ── 3. SEARCH & FILTER TOOLBAR ─────────────────────────────────────── */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-4">
                    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                        <div className="relative flex-grow max-w-lg">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                placeholder="নাম, আবেদন নং, মোবাইল, এনআইডি খুঁজুন..."
                                className="w-full pl-9 pr-4 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-slate-50/50 transition-all"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1 rounded-xl">
                                <input
                                    type="date"
                                    value={currentDateFrom}
                                    onChange={(e) => setCurrentDateFrom(e.target.value)}
                                    className="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none"
                                />
                                <span className="text-slate-400 text-xs font-bold">–</span>
                                <input
                                    type="date"
                                    value={currentDateTo}
                                    onChange={(e) => setCurrentDateTo(e.target.value)}
                                    className="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none"
                                />
                            </div>

                            <button
                                onClick={handleDateFilterChange}
                                className="px-4 py-2.5 text-xs font-bold bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition-all shadow-sm"
                            >
                                ফিল্টার প্রয়োগ
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── 4. APPLICATIONS MAIN CONTENT ───────────────────────────────────── */}
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                    {/* MOBILE CARDS VIEW (md:hidden) */}
                    <div className="md:hidden divide-y divide-slate-100">
                        {applications.data.length === 0 ? (
                            <div className="p-12 text-center text-slate-400 text-sm">
                                কোনো মেয়াদী সঞ্চয় আবেদন পাওয়া যায়নি
                            </div>
                        ) : (
                            applications.data.map((app) => (
                                <div key={app.id} className="p-4 space-y-3 hover:bg-slate-50/50 transition-colors">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                                {app.application_no}
                                            </span>
                                            <h3 className="font-bold text-slate-900 text-sm mt-1">
                                                {app.memberAdmission?.applicant_name_bn || app.memberAdmission?.applicant_name_en || 'N/A'}
                                            </h3>
                                        </div>
                                        <div className="shrink-0">{getStatusBadge(app.status)}</div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2.5 bg-slate-50/80 p-3 rounded-2xl border border-slate-100 text-xs">
                                        <div>
                                            <span className="text-[10px] font-bold uppercase text-slate-400 block">সঞ্চয় প্রকল্প</span>
                                            <p className="font-bold text-slate-800 truncate mt-0.5">
                                                {app.savingsProduct?.product_name_bn || app.savingsProduct?.product_name || '—'}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold uppercase text-slate-400 block">জমার পরিমাণ</span>
                                            <p className="font-black text-purple-700 mt-0.5">৳{formatAmount(app.deposit_amount)}</p>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold uppercase text-slate-400 block">মাসিক কিস্তি</span>
                                            <p className="font-semibold text-slate-700 mt-0.5">
                                                {app.monthly_installment ? `৳${formatAmount(app.monthly_installment)}` : '-'}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold uppercase text-slate-400 block">পরিপক্ক পরিমাণ</span>
                                            <p className="font-semibold text-emerald-700 mt-0.5">
                                                {app.maturity_amount ? `৳${formatAmount(app.maturity_amount)}` : '-'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                                        <Link
                                            href={`/member/savings-applications/${app.id}`}
                                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition"
                                        >
                                            <Eye className="w-3.5 h-3.5" /> বিবরণ দেখুন
                                        </Link>
                                        {app.status === 'draft' && (
                                            <>
                                                <Link
                                                    href={`/member/savings-applications/${app.id}/edit`}
                                                    className="p-2 text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition"
                                                    title="সম্পাদনা"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(app.id)}
                                                    className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition"
                                                    title="মুছুন"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* DESKTOP TABLE VIEW (hidden md:block) */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="py-3.5 px-4">আবেদন নং</th>
                                    <th className="py-3.5 px-4">সদস্যের নাম</th>
                                    <th className="py-3.5 px-4">প্রকল্প</th>
                                    <th className="py-3.5 px-4 text-right">জমার পরিমাণ</th>
                                    <th className="py-3.5 px-4 text-right">পরিপক্ক পরিমাণ</th>
                                    <th className="py-3.5 px-4">স্ট্যাটাস</th>
                                    <th className="py-3.5 px-4 text-right">অ্যাকশন</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {applications.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center text-slate-400">
                                            কোনো মেয়াদী সঞ্চয় আবেদন পাওয়া যায়নি
                                        </td>
                                    </tr>
                                ) : (
                                    applications.data.map((app) => (
                                        <tr key={app.id} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="py-4 px-4 font-mono font-bold text-purple-700 text-xs">
                                                <Link href={`/member/savings-applications/${app.id}`} className="hover:underline">
                                                    {app.application_no}
                                                </Link>
                                            </td>
                                            <td className="py-4 px-4 font-bold text-slate-800">
                                                {app.memberAdmission?.applicant_name_bn || app.memberAdmission?.applicant_name_en || '—'}
                                            </td>
                                            <td className="py-4 px-4 font-medium text-slate-700">
                                                {app.savingsProduct?.product_name_bn || app.savingsProduct?.product_name || '—'}
                                            </td>
                                            <td className="py-4 px-4 text-right font-black text-slate-900">
                                                ৳{formatAmount(app.deposit_amount)}
                                            </td>
                                            <td className="py-4 px-4 text-right font-semibold text-emerald-700">
                                                {app.maturity_amount ? `৳${formatAmount(app.maturity_amount)}` : '-'}
                                            </td>
                                            <td className="py-4 px-4">{getStatusBadge(app.status)}</td>
                                            <td className="py-4 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Link
                                                        href={`/member/savings-applications/${app.id}`}
                                                        className="p-2 text-slate-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                                        title="বিবরণ দেখুন"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Link>
                                                    {app.status === 'draft' && (
                                                        <>
                                                            <Link
                                                                href={`/member/savings-applications/${app.id}/edit`}
                                                                className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                                                title="সম্পাদনা"
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                            </Link>
                                                            <button
                                                                onClick={() => handleDelete(app.id)}
                                                                className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                                title="মুছুন"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── 5. PRODUCT SELECTION MODAL ──────────────────────────────────────── */}
                {showProductModal && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
                        <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <h3 className="text-lg font-bold text-slate-900">সঞ্চয় প্রকল্প নির্বাচন করুন</h3>
                                <button onClick={() => setShowProductModal(false)} className="p-1 rounded-full text-slate-400 hover:text-slate-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                {applicationProducts.map((prod) => (
                                    <Link
                                        key={prod.id}
                                        href={`/member/savings-applications/create?product_id=${prod.id}`}
                                        className="p-4 rounded-2xl border border-slate-200 hover:border-purple-500 hover:bg-purple-50/50 transition-all flex items-center justify-between group"
                                    >
                                        <div>
                                            <h4 className="font-bold text-slate-900 text-sm group-hover:text-purple-700">
                                                {prod.product_name_bn || prod.product_name}
                                            </h4>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                মেয়াদ: {prod.duration_months} মাস | মুনাফা: {prod.interest_rate}%
                                            </p>
                                        </div>
                                        <Plus className="w-5 h-5 text-slate-400 group-hover:text-purple-600" />
                                    </Link>
                                ))}
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
