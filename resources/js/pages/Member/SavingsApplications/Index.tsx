import { useState, useEffect, useMemo } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Plus, Calendar, FileText, CheckCircle, XCircle, Clock, Search, Eye, Edit, Trash2, X } from 'lucide-react';
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

const statusLabels: Record<string, { label: string; color: string }> = {
    draft: { label: 'Draft (খসড়া)', color: 'bg-gray-50 text-gray-700 border border-gray-200' },
    submitted: { label: 'Submitted (জমা)', color: 'bg-blue-50 text-blue-700 border border-blue-200' },
    under_review: { label: 'Under Review (পর্যালোচনায়)', color: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
    approved: { label: 'Approved (অনুমোদিত)', color: 'bg-green-50 text-green-700 border border-green-200' },
    rejected: { label: 'Rejected (প্রত্যাখ্যাত)', color: 'bg-red-50 text-red-700 border border-red-200' },
    active: { label: 'Active (সক্রিয়)', color: 'bg-purple-50 text-purple-700 border border-purple-200' },
    matured: { label: 'Matured (পরিপক্ক)', color: 'bg-indigo-50 text-indigo-700 border border-indigo-200' },
    closed: { label: 'Closed (বন্ধ)', color: 'bg-gray-50 text-gray-700 border border-gray-200' },
    cancelled: { label: 'Cancelled (বাতিল)', color: 'bg-red-50 text-red-700 border border-red-200' },
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

    // Products available for new application (exclude G. Savings)
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
        if (confirm('Are you sure you want to delete this application?')) {
            router.delete(`/member/savings-applications/${id}`, {
                preserveScroll: true,
            });
        }
    };

    // Calculate stats from applications data
    const stats = useMemo(() => {
        return {
            total: applications.total,
            draft: applications.data.filter(a => a.status === 'draft').length,
            submitted: applications.data.filter(a => a.status === 'submitted').length,
            approved: applications.data.filter(a => a.status === 'approved').length,
            rejected: applications.data.filter(a => a.status === 'rejected').length,
            active: applications.data.filter(a => a.status === 'active').length,
            under_review: applications.data.filter(a => a.status === 'under_review').length,
        };
    }, [applications]);

    return (
        <AdminLayout>
            <Head title="Savings Applications (মেয়াদী সঞ্চয় আবেদন)" />

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

                {/* Error Message */}
                {flash?.error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                        <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-red-800">{flash.error}</p>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Savings Applications (মেয়াদী সঞ্চয় আবেদন)</h1>
                        <p className="text-xs text-gray-500 mt-0.5">Manage your savings applications</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {applicationProducts.length > 0 && (
                            <Button
                                className="flex items-center gap-1.5"
                                onClick={() => setShowProductModal(true)}
                            >
                                <Plus className="w-4 h-4" />
                                New Application (নতুন আবেদন)
                            </Button>
                        )}
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
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    <div className="bg-white rounded-md border p-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded bg-blue-50 flex items-center justify-center">
                                <FileText className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-lg font-bold text-gray-900">{stats.total}</p>
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
                                <p className="text-lg font-bold text-gray-900">{stats.draft}</p>
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
                                <p className="text-lg font-bold text-gray-900">{stats.submitted}</p>
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
                                <p className="text-lg font-bold text-gray-900">{stats.under_review}</p>
                                <p className="text-xs text-gray-500">Under Review</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-md border p-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded bg-green-50 flex items-center justify-center">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                            </div>
                            <div>
                                <p className="text-lg font-bold text-gray-900">{stats.approved}</p>
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
                                <p className="text-lg font-bold text-gray-900">{stats.rejected}</p>
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
                                <p className="text-lg font-bold text-gray-900">{stats.active}</p>
                                <p className="text-xs text-gray-500">Active (সক্রিয়)</p>
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
                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
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
                                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">Deposit Amount (জমার পরিমাণ)</th>
                                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">Maturity Amount (পরিপক্ক পরিমাণ)</th>
                                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">Status (স্ট্যাটাস)</th>
                                    <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-600 uppercase">Actions (অ্যাকশন)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {applications.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                                            <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                                            <p className="text-xs">No applications found</p>
                                            {applicationProducts.length > 0 && (
                                                <Button
                                                    className="mt-4"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setShowProductModal(true)}
                                                >
                                                    <Plus className="h-4 w-4 mr-2" />
                                                    Create New Application
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ) : (
                                    applications.data.map((application) => {
                                        const statusInfo = statusLabels[application.status] || statusLabels.draft;
                                        return (
                                            <tr key={application.id} className="hover:bg-gray-50">
                                                <td className="px-3 py-2">
                                                    <Link
                                                        href={`/member/savings-applications/${application.id}`}
                                                        className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                                                    >
                                                        {application.application_no}
                                                    </Link>
                                                </td>
                                                <td className="px-3 py-2">
                                                    {application.memberAdmission ? (
                                                        <div>
                                                            {application.memberAdmission.applicant_name_bn && (
                                                                <div className="font-medium text-gray-900 text-sm">
                                                                    {application.memberAdmission.applicant_name_bn}
                                                                </div>
                                                            )}
                                                            {application.memberAdmission.applicant_name_en && (
                                                                <div className="text-[10px] text-gray-600 italic">
                                                                    {application.memberAdmission.applicant_name_en}
                                                                </div>
                                                            )}
                                                            <div className="text-[10px] text-gray-500 mt-0.5 space-y-0.5">
                                                                {application.memberAdmission.application_no && (
                                                                    <div>Member: {application.memberAdmission.application_no}</div>
                                                                )}
                                                                {application.memberAdmission.nid_number && (
                                                                    <div>NID: {application.memberAdmission.nid_number}</div>
                                                                )}
                                                                {application.memberAdmission.mobile_number && (
                                                                    <div>Phone: {application.memberAdmission.mobile_number}</div>
                                                                )}
                                                            </div>
                                                            {!application.memberAdmission.applicant_name_bn && !application.memberAdmission.applicant_name_en && (
                                                                <span className="text-gray-400 text-[10px]">N/A</span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400 text-[10px]">N/A</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-gray-600">
                                                    {new Date(application.created_at).toLocaleDateString('en-GB')}
                                                </td>
                                                <td className="px-3 py-2">
                                                    {application.savingsProduct ? (
                                                        <>
                                                            <div className="font-medium text-gray-900">{application.savingsProduct.product_name_bn || application.savingsProduct.product_name || '—'}</div>
                                                            <div className="text-[10px] text-gray-500">{application.savingsProduct.product_code || ''}</div>
                                                        </>
                                                    ) : (
                                                        <span className="text-gray-400 text-[10px]">N/A</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <div className="font-medium text-gray-900">৳{formatAmount(application.deposit_amount)}</div>
                                                    {application.monthly_installment && (
                                                        <div className="text-[10px] text-gray-500">Monthly: ৳{formatAmount(application.monthly_installment)}</div>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <div className="font-medium text-gray-900">
                                                        {application.maturity_amount ? `৳${formatAmount(application.maturity_amount)}` : '-'}
                                                    </div>
                                                    {application.maturity_date && (
                                                        <div className="text-[10px] text-gray-500">
                                                            {new Date(application.maturity_date).toLocaleDateString('en-GB')}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${statusInfo.color}`}>
                                                        {statusInfo.label}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    <div className="flex items-center justify-end gap-1 flex-wrap">
                                                        <Link
                                                            href={`/member/savings-applications/${application.id}`}
                                                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded border border-blue-200"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                            View
                                                        </Link>
                                                        {application.status === 'draft' && (
                                                            <>
                                                                <Link href={`/member/savings-applications/create/${application.savingsProduct?.id ?? application.savings_product_id ?? ''}?member_id=${application.memberAdmission?.id ?? application.member_admission_id ?? ''}`}>
                                                                    <button
                                                                        className="p-1 hover:bg-gray-100 rounded"
                                                                        title="Edit"
                                                                    >
                                                                        <Edit className="w-3.5 h-3.5 text-gray-600" />
                                                                    </button>
                                                                </Link>
                                                                <button
                                                                    onClick={() => handleDelete(application.id)}
                                                                    className="p-1 hover:bg-red-50 rounded"
                                                                    title="Delete"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                                                                </button>
                                                            </>
                                                        )}
                                                        {application.status === 'submitted' && (
                                                            <>
                                                                <button
                                                                    onClick={() => router.patch(`/member/savings-applications/${application.id}/approve`, {}, { preserveScroll: true })}
                                                                    className="p-1 hover:bg-green-50 rounded"
                                                                    title="Approve"
                                                                >
                                                                    <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        const reason = window.prompt('Rejection reason (optional):');
                                                                        if (reason !== null) router.patch(`/member/savings-applications/${application.id}/reject`, { rejection_reason: reason || '' }, { preserveScroll: true });
                                                                    }}
                                                                    className="p-1 hover:bg-red-50 rounded"
                                                                    title="Reject"
                                                                >
                                                                    <XCircle className="w-3.5 h-3.5 text-red-600" />
                                                                </button>
                                                            </>
                                                        )}
                                                        {application.status === 'submitted' && (
                                                            <button
                                                                onClick={() => handleDelete(application.id)}
                                                                className="p-1 hover:bg-red-50 rounded"
                                                                title="Delete"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5 text-red-600" />
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
                    </div>

                {/* Product selection modal for new application */}
                {showProductModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
                            <div className="flex items-center justify-between px-6 py-4 border-b">
                                <h2 className="text-lg font-bold text-gray-900">Select Savings Product</h2>
                                <button
                                    type="button"
                                    onClick={() => setShowProductModal(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <p className="px-6 py-2 text-sm text-gray-600 border-b">
                                Select the product you want to apply for. G. Savings (21.01) is not in this list.
                            </p>
                            <div className="p-4 overflow-y-auto flex-1 space-y-2">
                                {applicationProducts.map((product) => (
                                    <Link
                                        key={product.id}
                                        href={`/member/savings-applications/create/${product.id}`}
                                        className="block p-4 border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
                                    >
                                        <div className="font-medium text-gray-900">
                                            {product.product_name}
                                        </div>
                                        <div className="text-sm text-gray-600 mt-0.5">
                                            {product.product_name_bn}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-3">
                                            <span>Code: {product.product_code}</span>
                                            <span>Min: ৳{formatAmount(product.min_amount)}</span>
                                            {product.max_amount ? (
                                                <span>Max: ৳{formatAmount(product.max_amount)}</span>
                                            ) : null}
                                            <span>{product.interest_rate}% interest</span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                            <div className="px-6 py-4 border-t bg-gray-50 rounded-b-lg">
                                <button
                                    type="button"
                                    onClick={() => setShowProductModal(false)}
                                    className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 rounded-md"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                    {/* Pagination */}
                    {applications.last_page > 1 && (
                        <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                            <div className="flex items-center justify-between">
                                <div className="flex-1 flex justify-between sm:hidden">
                                    {applications.current_page > 1 && (
                                        <Link
                                            href={applications.links[applications.current_page - 2]?.url || '#'}
                                            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                        >
                                            Previous
                                        </Link>
                                    )}
                                    {applications.current_page < applications.last_page && (
                                        <Link
                                            href={applications.links[applications.current_page]?.url || '#'}
                                            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                        >
                                            Next
                                        </Link>
                                    )}
                                </div>
                                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-sm text-gray-700">
                                            Showing <span className="font-medium">{((applications.current_page - 1) * applications.per_page) + 1}</span> to{' '}
                                            <span className="font-medium">
                                                {Math.min(applications.current_page * applications.per_page, applications.total)}
                                            </span>{' '}
                                            of <span className="font-medium">{applications.total}</span> results
                                        </p>
                                    </div>
                                    <div>
                                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                            {applications.links.map((link, index) => {
                                                if (index === 0 || index === applications.links.length - 1) {
                                                    return (
                                                        <Link
                                                            key={index}
                                                            href={link.url || '#'}
                                                            className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${
                                                                index === applications.links.length - 1 ? 'rounded-l-none rounded-r-md' : ''
                                                            } ${!link.url ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        >
                                                            {link.label.replace('&laquo;', '«').replace('&raquo;', '»')}
                                                        </Link>
                                                    );
                                                }
                                                return (
                                                    <Link
                                                        key={index}
                                                        href={link.url || '#'}
                                                        className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium ${
                                                            link.active
                                                                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                                                : 'bg-white text-gray-500 hover:bg-gray-50'
                                                        } ${!link.url ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    >
                                                        {link.label}
                                                    </Link>
                                                );
                                            })}
                                        </nav>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
