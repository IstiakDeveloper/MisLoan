import { useState, useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import {
    Plus,
    Search,
    MoreVertical,
    Edit,
    Trash2,
    Wallet,
    ToggleLeft,
    ToggleRight,
    Filter,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import ProductModal from './Components/ProductModal';

interface SavingsProduct {
    id: number;
    product_name: string;
    product_name_bn: string | null;
    product_code: string;
    description: string | null;
    deposit_type: string;
    duration_months: number;
    min_amount: number;
    max_amount: number | null;
    monthly_installment: number | null;
    interest_rate: number;
    is_active: boolean;
    display_order: number;
    savings_applications_count: number;
}

interface Props {
    products: SavingsProduct[];
    filters: { search?: string; deposit_type?: string };
}

const depositTypeLabels: Record<string, { label: string; color: string }> = {
    monthly: { label: 'Monthly (মাসিক)', color: 'bg-blue-50 text-blue-700 border border-blue-200' },
    lump_sum: { label: 'Lump Sum (এককালীন)', color: 'bg-purple-50 text-purple-700 border border-purple-200' },
    recurring: { label: 'Recurring (পুনরাবৃত্ত)', color: 'bg-teal-50 text-teal-700 border border-teal-200' },
};

const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-BD', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

export default function Index({ products, filters }: Props) {
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [filterType, setFilterType] = useState(filters.deposit_type || '');
    const [openDropdown, setOpenDropdown] = useState<number | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<SavingsProduct | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const productsList = Array.isArray(products) ? products : [];

    const handleAddNew = () => {
        setSelectedProduct(null);
        setModalOpen(true);
    };

    const handleEdit = (product: SavingsProduct) => {
        setSelectedProduct(product);
        setModalOpen(true);
        setOpenDropdown(null);
    };

    const handleDelete = (id: number, name: string) => {
        if (confirm(`আপনি কি "${name}" সঞ্চয় পণ্য মুছে ফেলতে চান?`)) {
            router.delete(`/savings-products/${id}`);
        }
        setOpenDropdown(null);
    };

    const handleToggleStatus = (id: number) => {
        router.patch(`/savings-products/${id}/toggle-status`);
        setOpenDropdown(null);
    };

    const filteredProducts = productsList.filter((product) => {
        const matchesSearch =
            !searchQuery ||
            product.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (product.product_name_bn || '').includes(searchQuery) ||
            product.product_code.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = !filterType || product.deposit_type === filterType;
        return matchesSearch && matchesType;
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
            <Head title="Savings Products (সঞ্চয় পণ্য)" />

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Savings Products (সঞ্চয় পণ্য)</h1>
                        <p className="text-xs text-gray-500 mt-0.5">সঞ্চয় পণ্য ব্যবস্থাপনা – Product Code, Name, Interest Rate</p>
                    </div>
                    <button
                        onClick={handleAddNew}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Add New (নতুন যোগ করুন)
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="bg-white rounded-lg shadow-sm border p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                                <Wallet className="w-5 h-5 text-emerald-600" />
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
                                <p className="text-2xl font-bold text-gray-900">{productsList.filter((p) => p.is_active).length}</p>
                                <p className="text-sm text-gray-600">Active (সক্রিয়)</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm border p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                <Wallet className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">
                                    {productsList.filter((p) => p.deposit_type === 'monthly').length}
                                </p>
                                <p className="text-sm text-gray-600">Monthly (মাসিক)</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm border p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                                <Wallet className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">
                                    {productsList.filter((p) => p.deposit_type === 'lump_sum').length}
                                </p>
                                <p className="text-sm text-gray-600">Lump Sum (এককালীন)</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-md border">
                    <div className="px-4 py-3 border-b">
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative flex-1 min-w-[180px] max-w-xs">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search by code or name..."
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="pl-8 pr-3 py-1.5 text-sm w-full border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Filter className="w-3.5 h-3.5 text-gray-400" />
                                <select
                                    value={filterType}
                                    onChange={(e) => {
                                        setFilterType(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="px-2 py-1.5 text-xs border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">All Types</option>
                                    <option value="monthly">Monthly</option>
                                    <option value="lump_sum">Lump Sum</option>
                                    <option value="recurring">Recurring</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">SL</th>
                                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">
                                        Product Code
                                    </th>
                                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">Name</th>
                                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">
                                        Interest Rate
                                    </th>
                                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">
                                        Duration
                                    </th>
                                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">Type</th>
                                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">
                                        Amount Range
                                    </th>
                                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">Status</th>
                                    <th className="px-2 py-2 text-right text-[10px] font-semibold text-gray-600 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {paginatedProducts.map((product, index) => {
                                    const typeInfo = depositTypeLabels[product.deposit_type] || depositTypeLabels.monthly;
                                    const slNo = (currentPage - 1) * itemsPerPage + index + 1;
                                    return (
                                        <tr key={product.id} className="hover:bg-gray-50">
                                            <td className="px-2 py-2 text-gray-500 font-medium">{slNo}</td>
                                            <td className="px-2 py-2">
                                                <span className="font-mono font-medium text-gray-900">{product.product_code}</span>
                                            </td>
                                            <td className="px-2 py-2">
                                                <div className="font-medium text-gray-900 leading-tight">
                                                    {product.product_name}
                                                </div>
                                                {product.product_name_bn && (
                                                    <div className="text-[10px] text-gray-500">{product.product_name_bn}</div>
                                                )}
                                            </td>
                                            <td className="px-2 py-2 font-medium text-gray-900">{product.interest_rate}%</td>
                                            <td className="px-2 py-2 text-gray-600">
                                                {product.duration_months} মাস
                                            </td>
                                            <td className="px-2 py-2">
                                                <span
                                                    className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${typeInfo.color}`}
                                                >
                                                    {typeInfo.label}
                                                </span>
                                            </td>
                                            <td className="px-2 py-2">
                                                <div className="text-gray-600">৳{formatAmount(Number(product.min_amount))}</div>
                                                {product.max_amount != null && (
                                                    <div className="text-gray-900 font-medium">
                                                        ৳{formatAmount(Number(product.max_amount))}
                                                    </div>
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
                                                        onClick={() =>
                                                            setOpenDropdown(openDropdown === product.id ? null : product.id)
                                                        }
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
                                                                onClick={() =>
                                                                    handleDelete(
                                                                        product.id,
                                                                        product.product_name_bn || product.product_name
                                                                    )
                                                                }
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
                                <Wallet className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                <p className="text-xs">কোন সঞ্চয় পণ্য নেই। নতুন যোগ করুন।</p>
                            </div>
                        )}
                    </div>

                    {totalPages > 1 && (
                        <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-between">
                            <div className="text-xs text-gray-600">
                                Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                                {Math.min(currentPage * itemsPerPage, filteredProducts.length)} of {filteredProducts.length}{' '}
                                products
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
                                        return (
                                            <span key={page} className="px-1">
                                                ...
                                            </span>
                                        );
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

            <ProductModal isOpen={modalOpen} onClose={() => setModalOpen(false)} product={selectedProduct} />
        </AdminLayout>
    );
}
