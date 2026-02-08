import { useState, useMemo, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import {
    Plus, Calendar, FileText, CheckCircle, XCircle, Clock,
    Search, Eye, Edit, Trash2, X
} from 'lucide-react';

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

interface LoanApplication {
    id: number;
    application_no: string;
    status: string;
    requested_amount: number;
    approved_amount?: number;
    loan_product: LoanProduct;
    loan_category: LoanCategory;
    created_at: string;
    member_admission?: {
        id: number;
        name: string;
        member_code: string;
    };
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
}

const statusLabels: Record<string, { label: string; color: string }> = {
    draft: { label: 'Draft (খসড়া)', color: 'bg-gray-50 text-gray-700 border border-gray-200' },
    submitted: { label: 'Submitted (জমা)', color: 'bg-blue-50 text-blue-700 border border-blue-200' },
    under_review: { label: 'Under Review (পর্যালোচনায়)', color: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
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

interface Member {
    id: number;
    applicant_name_en: string;
    applicant_name_bn: string;
    nid_number: string;
    mobile_number: string;
    application_no: string;
    status: string;
}

export default function Index({ categories, applications, stats, selectedDate }: Props) {
    const [currentDate, setCurrentDate] = useState(selectedDate);
    const [searchQuery, setSearchQuery] = useState('');
    const [showNewModal, setShowNewModal] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
    const [products, setProducts] = useState<LoanProduct[]>([]);

    // New states for modal
    const [memberSearchQuery, setMemberSearchQuery] = useState('');
    const [memberSearchResults, setMemberSearchResults] = useState<Member[]>([]);
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);
    const [requestedAmount, setRequestedAmount] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    const handleDateChange = (date: string) => {
        setCurrentDate(date);
        router.get('/member/loan-applications', { date }, { preserveState: true });
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
        setSelectedMember(member);
        setMemberSearchQuery('');
        setMemberSearchResults([]);
    };

    const handleSubmit = () => {
        if (selectedCategory && selectedProduct && selectedMember && requestedAmount) {
            router.visit(`/member/loan-applications/form-selection?loan_category_id=${selectedCategory}&loan_product_id=${selectedProduct}&member_id=${selectedMember.id}&requested_amount=${requestedAmount}`);
        }
    };

    const filteredApplications = useMemo(() => {
        return applications.filter(app => {
            const matchesSearch = !searchQuery ||
                app.application_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
                app.loan_product.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                app.member_admission?.name.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesSearch;
        });
    }, [applications, searchQuery]);

    return (
        <AdminLayout>
            <Head title="Loan Applications (ঋণ আবেদন)" />

            <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Loan Applications (ঋণ আবেদন)</h1>
                        <p className="text-xs text-gray-500 mt-0.5">Manage your loan applications</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white border rounded-md">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <input
                                type="date"
                                value={currentDate}
                                onChange={(e) => handleDateChange(e.target.value)}
                                className="text-sm border-0 focus:ring-0 p-0"
                            />
                        </div>
                        <button
                            onClick={handleNewApplication}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            <Plus className="w-4 h-4" />
                            New Application (নতুন আবেদন)
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
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
                </div>

                {/* Applications Table */}
                <div className="bg-white rounded-md border">
                    <div className="px-4 py-3 border-b">
                        <div className="relative max-w-xs">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search applications..."
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
                                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">Date (তারিখ)</th>
                                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">Product (পণ্য)</th>
                                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">Category (ক্যাটাগরি)</th>
                                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">Amount (পরিমাণ)</th>
                                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">Status (স্ট্যাটাস)</th>
                                    <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-600 uppercase">Actions (অ্যাকশন)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredApplications.map((app) => {
                                    const statusInfo = statusLabels[app.status] || statusLabels.draft;
                                    return (
                                        <tr key={app.id} className="hover:bg-gray-50">
                                            <td className="px-3 py-2">
                                                <div className="font-medium text-gray-900">{app.application_no}</div>
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
                                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${statusInfo.color}`}>
                                                    {statusInfo.label}
                                                </span>
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
                                                                className="p-1 hover:bg-red-50 rounded"
                                                                title="Delete"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5 text-red-600" />
                                                            </button>
                                                        </>
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
                        <div className="p-6 space-y-4 overflow-y-auto flex-1">
                            {/* Member Search */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Search Member (সদস্য খুঁজুন)
                                </label>

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
                                                    return (
                                                        <button
                                                            key={member.id}
                                                            type="button"
                                                            onClick={() => !isRejected && handleMemberSelect(member)}
                                                            disabled={isRejected}
                                                            className={`w-full px-3 py-2 text-left border-b last:border-b-0 ${
                                                                isRejected
                                                                    ? 'bg-red-50 cursor-not-allowed opacity-60'
                                                                    : 'hover:bg-gray-50 cursor-pointer'
                                                            }`}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex-1">
                                                                    <div className="text-sm font-medium text-gray-900">{member.applicant_name_en}</div>
                                                                    <div className="text-xs text-gray-500">
                                                                        {member.application_no} | NID: {member.nid_number} | Mobile: {member.mobile_number}
                                                                    </div>
                                                                </div>
                                                                {isRejected && (
                                                                    <span className="ml-2 px-2 py-0.5 text-[10px] font-medium bg-red-100 text-red-700 rounded">
                                                                        Rejected (প্রত্যাখ্যাত)
                                                                    </span>
                                                                )}
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
                                        <div className="p-3 bg-green-50 border-2 border-green-200 rounded-md">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold">
                                                            ✓
                                                        </span>
                                                        <span className="text-xs font-semibold text-green-700">Selected Member (নির্বাচিত সদস্য)</span>
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
                        </div>
                        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t bg-gray-50 rounded-b-lg flex-shrink-0">
                            <button
                                onClick={() => setShowNewModal(false)}
                                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                            >
                                Cancel (বাতিল)
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={!selectedMember || !selectedProduct || !requestedAmount}
                                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Continue to Form (ফর্মে যান)
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
