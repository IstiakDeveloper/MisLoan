import { useState, useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Plus, Search, MoreVertical, Edit, Trash2, Package, ToggleLeft, ToggleRight, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import ProductModal from './Components/ProductModal';

interface LoanCategory {
    id: number;
    category_name: string;
    category_name_bn: string;
    category_code: string;
}

interface LoanProduct {
    id: number;
    loan_category_id: number;
    product_name: string;
    product_name_bn: string;
    product_code: string;
    description: string | null;
    description_bn: string | null;
    installment_type: string;
    duration_months: number;
    number_of_installments: number;
    min_amount: number;
    max_amount: number;
    interest_rate: number;
    service_charge: number;
    interest_calculation_type: string;
    gender_restriction: string;
    min_age: number;
    max_age: number;
    requires_guarantor: boolean;
    number_of_guarantors: number;
    eligibility_conditions: Record<string, any> | null;
    required_documents: string[] | null;
    is_active: boolean;
    display_order: number;
    loan_category: LoanCategory;
    loan_applications_count: number;
}

interface Props {
    products: LoanProduct[];
    categories: LoanCategory[];
    filters: { search?: string; category_id?: string; installment_type?: string };
}

const installmentTypeLabels: Record<string, { label: string; color: string }> = {
    weekly: { label: 'Weekly', color: 'bg-teal-50 text-teal-700 border border-teal-200' },
    monthly: { label: 'Monthly', color: 'bg-orange-50 text-orange-700 border border-orange-200' },
};

const genderLabels: Record<string, string> = {
    both: 'Both',
    female: 'Female',
    male: 'Male',
};

const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-BD', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

export default function Index({ products, categories, filters }: Props) {
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [filterCategory, setFilterCategory] = useState(filters.category_id || '');
    const [filterType, setFilterType] = useState(filters.installment_type || '');
    const [openDropdown, setOpenDropdown] = useState<number | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<LoanProduct | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const productsList = Array.isArray(products) ? products : [];

    const handleAddNew = () => {
        setSelectedProduct(null);
        setModalOpen(true);
    };

    const handleEdit = (product: LoanProduct) => {
        setSelectedProduct(product);
        setModalOpen(true);
        setOpenDropdown(null);
    };

    const handleDelete = (id: number, name: string) => {
        if (confirm(`Are you sure you want to delete product "${name}"? (আপনি কি "${name}" পণ্য মুছে ফেলতে চান?)`)) {
            router.delete(`/loan-products/${id}`);
        }
        setOpenDropdown(null);
    };

    const handleToggleStatus = (id: number) => {
        router.patch(`/loan-products/${id}/toggle-status`);
        setOpenDropdown(null);
    };

    const filteredProducts = productsList.filter((product) => {
        const matchesSearch =
            !searchQuery ||
            product.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.product_name_bn.includes(searchQuery) ||
            product.product_code.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesCategory = !filterCategory || String(product.loan_category_id) === filterCategory;
        const matchesType = !filterType || product.installment_type === filterType;

        return matchesSearch && matchesCategory && matchesType;
    });

    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const paginatedProducts = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredProducts.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredProducts, currentPage]);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <AdminLayout>
            <Head title="Loan Products" />

            <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Loan Products</h1>
                        <p className="text-xs text-gray-500 mt-0.5">Manage loan products</p>
                    </div>
                    <button
                        onClick={handleAddNew}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Add New
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="bg-white rounded-lg shadow-sm border p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                <Package className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{productsList.length}</p>
                                <p className="text-sm text-gray-600">Total Products (মোট পণ্য)</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm border p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                                <ToggleRight className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{productsList.filter(p => p.is_active).length}</p>
                                <p className="text-sm text-gray-600">Active (সক্রিয়)</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm border p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                                <Package className="w-5 h-5 text-teal-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{productsList.filter(p => p.installment_type === 'weekly').length}</p>
                                <p className="text-sm text-gray-600">Weekly (সাপ্তাহিক)</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm border p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                                <Package className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{productsList.filter(p => p.installment_type === 'monthly').length}</p>
                                <p className="text-sm text-gray-600">Monthly (মাসিক)</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Card */}
                <div className="bg-white rounded-md border">
                    {/* Search & Filters */}
                    <div className="px-4 py-3 border-b">
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative flex-1 min-w-[180px] max-w-xs">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search products..."
                                    value={searchQuery}
                                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                    className="pl-8 pr-3 py-1.5 text-sm w-full border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Filter className="w-3.5 h-3.5 text-gray-400" />
                                <select
                                    value={filterCategory}
                                    onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1); }}
                                    className="px-2 py-1.5 text-xs border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">All Categories</option>
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.category_name} ({cat.category_code})
                                        </option>
                                    ))}
                                </select>
                                <select
                                    value={filterType}
                                    onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
                                    className="px-2 py-1.5 text-xs border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">All Types</option>
                                    <option value="weekly">Weekly</option>
                                    <option value="monthly">Monthly</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">SL</th>
                                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">Product</th>
                                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">Category</th>
                                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">Type</th>
                                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">Duration</th>
                                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">Amount Range</th>
                                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">Interest</th>
                                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">Status</th>
                                    <th className="px-2 py-2 text-right text-[10px] font-semibold text-gray-600 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {paginatedProducts.map((product, index) => {
                                    const typeInfo = installmentTypeLabels[product.installment_type] || installmentTypeLabels.weekly;
                                    const slNo = (currentPage - 1) * itemsPerPage + index + 1;
                                    return (
                                        <tr key={product.id} className="hover:bg-gray-50">
                                            <td className="px-2 py-2 text-gray-500 font-medium">{slNo}</td>
                                            <td className="px-2 py-2">
                                                <div className="font-medium text-gray-900 leading-tight">{product.product_name}</div>
                                                <span className="inline-block mt-0.5 px-1 py-0.5 rounded text-[10px] font-mono bg-gray-100 text-gray-600">
                                                    {product.product_code}
                                                </span>
                                            </td>
                                            <td className="px-2 py-2">
                                                <span className="text-gray-700">{product.loan_category?.category_name}</span>
                                            </td>
                                            <td className="px-2 py-2">
                                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${typeInfo.color}`}>
                                                    {typeInfo.label}
                                                </span>
                                            </td>
                                            <td className="px-2 py-2 text-gray-600">
                                                <div>{product.duration_months}m</div>
                                                <div className="text-[10px] text-gray-500">{product.number_of_installments} inst</div>
                                            </td>
                                            <td className="px-2 py-2">
                                                <div className="text-gray-600">৳{formatAmount(product.min_amount)}</div>
                                                <div className="text-gray-900 font-medium">৳{formatAmount(product.max_amount)}</div>
                                            </td>
                                            <td className="px-2 py-2">
                                                <div className="font-medium text-gray-900">{product.interest_rate}%</div>
                                                {parseFloat(String(product.service_charge)) > 0 && (
                                                    <div className="text-[10px] text-gray-500">+{product.service_charge}%</div>
                                                )}
                                            </td>
                                            <td className="px-2 py-2">
                                                {product.is_active ? (
                                                    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-700 border border-green-200">
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-700 border border-red-200">
                                                        Inactive
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-2 py-2 text-right">
                                                <div className="relative inline-block">
                                                    <button
                                                        onClick={() => setOpenDropdown(openDropdown === product.id ? null : product.id)}
                                                        className="p-1 rounded hover:bg-gray-100"
                                                    >
                                                        <MoreVertical className="w-3.5 h-3.5 text-gray-600" />
                                                    </button>
                                                    {openDropdown === product.id && (
                                                        <div className="absolute right-0 mt-1 w-36 bg-white rounded-md shadow-lg border py-1 z-10">
                                                            <button
                                                                onClick={() => handleEdit(product)}
                                                                className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                                                            >
                                                                <Edit className="w-3 h-3" />
                                                                Edit
                                                            </button>
                                                            <button
                                                                onClick={() => handleToggleStatus(product.id)}
                                                                className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                                                            >
                                                                {product.is_active ? (
                                                                    <>
                                                                        <ToggleLeft className="w-3 h-3" />
                                                                        Deactivate
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <ToggleRight className="w-3 h-3" />
                                                                        Activate
                                                                    </>
                                                                )}
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(product.id, product.product_name)}
                                                                className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                                Delete
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {filteredProducts.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                <Package className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                <p className="text-xs">No products found</p>
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-between">
                            <div className="text-xs text-gray-600">
                                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredProducts.length)} of {filteredProducts.length} products
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="p-1 rounded border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                {[...Array(totalPages)].map((_, i) => {
                                    const page = i + 1;
                                    if (
                                        page === 1 ||
                                        page === totalPages ||
                                        (page >= currentPage - 1 && page <= currentPage + 1)
                                    ) {
                                        return (
                                            <button
                                                key={page}
                                                onClick={() => handlePageChange(page)}
                                                className={`px-2 py-1 text-xs rounded border ${
                                                    currentPage === page
                                                        ? 'bg-blue-600 text-white border-blue-600'
                                                        : 'hover:bg-white'
                                                }`}
                                            >
                                                {page}
                                            </button>
                                        );
                                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                                        return <span key={page} className="px-1">...</span>;
                                    }
                                    return null;
                                })}
                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="p-1 rounded border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <ProductModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                product={selectedProduct}
                categories={categories}
            />
        </AdminLayout>
    );
}
