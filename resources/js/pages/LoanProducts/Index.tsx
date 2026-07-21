import {
    ConfigurationCard,
    ConfigurationHeader,
    ConfigurationPage,
    ConfigurationToolbar,
    EmptyState,
    LocalPagination,
    SearchField,
    StatusBadge,
    TableScroll,
} from '@/components/configuration';
import AdminLayout from '@/layouts/admin-layout';
import { Head, router } from '@inertiajs/react';
import {
    Edit,
    Filter,
    MoreVertical,
    Package,
    Plus,
    ToggleLeft,
    ToggleRight,
    Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
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
    filters: {
        search?: string;
        category_id?: string;
        installment_type?: string;
    };
}

const installmentTypeLabels: Record<string, { label: string; color: string }> =
    {
        weekly: {
            label: 'Weekly',
            color: 'bg-teal-50 text-teal-700 border border-teal-200',
        },
        monthly: {
            label: 'Monthly',
            color: 'bg-orange-50 text-orange-700 border border-orange-200',
        },
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
    const [filterCategory, setFilterCategory] = useState(
        filters.category_id || '',
    );
    const [filterType, setFilterType] = useState(
        filters.installment_type || '',
    );
    const [openDropdown, setOpenDropdown] = useState<number | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<LoanProduct | null>(
        null,
    );
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);

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
        if (
            confirm(
                `Are you sure you want to delete product "${name}"? (আপনি কি "${name}" পণ্য মুছে ফেলতে চান?)`,
            )
        ) {
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
            product.product_name
                .toLowerCase()
                .includes(searchQuery.toLowerCase()) ||
            product.product_name_bn.includes(searchQuery) ||
            product.product_code
                .toLowerCase()
                .includes(searchQuery.toLowerCase());

        const matchesCategory =
            !filterCategory ||
            String(product.loan_category_id) === filterCategory;
        const matchesType =
            !filterType || product.installment_type === filterType;

        return matchesSearch && matchesCategory && matchesType;
    });

    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const paginatedProducts = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredProducts.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredProducts, currentPage, itemsPerPage]);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <AdminLayout>
            <Head title="Loan Products" />

            <ConfigurationPage>
                <ConfigurationHeader
                    title="Loan Products"
                    description="Configure lending terms, limits, schedules, and eligibility in one place."
                    icon={Package}
                    actions={
                        <button
                            onClick={handleAddNew}
                            className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm hover:bg-blue-50 focus:ring-4 focus:ring-white/30 focus:outline-none sm:w-auto"
                        >
                            <Plus className="size-4" />
                            Add Product
                        </button>
                    }
                />

                {/* Stats */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                                <Package className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">
                                    {productsList.length}
                                </p>
                                <p className="text-sm text-gray-600">
                                    Total Products (মোট পণ্য)
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                                <ToggleRight className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">
                                    {
                                        productsList.filter((p) => p.is_active)
                                            .length
                                    }
                                </p>
                                <p className="text-sm text-gray-600">
                                    Active (সক্রিয়)
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100">
                                <Package className="h-5 w-5 text-teal-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">
                                    {
                                        productsList.filter(
                                            (p) =>
                                                p.installment_type === 'weekly',
                                        ).length
                                    }
                                </p>
                                <p className="text-sm text-gray-600">
                                    Weekly (সাপ্তাহিক)
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
                                <Package className="h-5 w-5 text-orange-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">
                                    {
                                        productsList.filter(
                                            (p) =>
                                                p.installment_type ===
                                                'monthly',
                                        ).length
                                    }
                                </p>
                                <p className="text-sm text-gray-600">
                                    Monthly (মাসিক)
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Card */}
                <ConfigurationCard>
                    {/* Search & Filters */}
                    <ConfigurationToolbar>
                        <SearchField
                            placeholder="Search products..."
                            value={searchQuery}
                            onChange={(value) => {
                                setSearchQuery(value);
                                setCurrentPage(1);
                            }}
                        />
                        <div className="grid w-full grid-cols-1 gap-2 sm:ml-auto sm:w-auto sm:grid-cols-2">
                            <Filter className="h-3.5 w-3.5 text-gray-400" />
                            <select
                                value={filterCategory}
                                onChange={(e) => {
                                    setFilterCategory(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="h-10 min-w-44 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none"
                            >
                                <option value="">All Categories</option>
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>
                                        {cat.category_name} ({cat.category_code}
                                        )
                                    </option>
                                ))}
                            </select>
                            <select
                                value={filterType}
                                onChange={(e) => {
                                    setFilterType(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none"
                            >
                                <option value="">All Types</option>
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                            </select>
                        </div>
                    </ConfigurationToolbar>

                    {/* Table */}
                    <TableScroll>
                        <table className="w-full min-w-[980px] text-sm">
                            <thead className="border-b border-slate-200 bg-slate-50/90">
                                <tr>
                                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">
                                        SL
                                    </th>
                                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">
                                        Product
                                    </th>
                                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">
                                        Category
                                    </th>
                                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">
                                        Type
                                    </th>
                                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">
                                        Duration
                                    </th>
                                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">
                                        Amount Range
                                    </th>
                                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">
                                        Interest
                                    </th>
                                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">
                                        Status
                                    </th>
                                    <th className="px-2 py-2 text-right text-[10px] font-semibold text-gray-600 uppercase">
                                        
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {paginatedProducts.map((product, index) => {
                                    const typeInfo =
                                        installmentTypeLabels[
                                            product.installment_type
                                        ] || installmentTypeLabels.weekly;
                                    const slNo =
                                        (currentPage - 1) * itemsPerPage +
                                        index +
                                        1;
                                    return (
                                        <tr
                                            key={product.id}
                                            className="border-b border-slate-100 transition-colors last:border-0 hover:bg-blue-50/40"
                                        >
                                            <td className="px-2 py-2 font-medium text-gray-500">
                                                {slNo}
                                            </td>
                                            <td className="px-2 py-2">
                                                <div className="leading-tight font-medium text-gray-900">
                                                    {product.product_name}
                                                </div>
                                                <span className="mt-0.5 inline-block rounded bg-gray-100 px-1 py-0.5 font-mono text-[10px] text-gray-600">
                                                    {product.product_code}
                                                </span>
                                            </td>
                                            <td className="px-2 py-2">
                                                <span className="text-gray-700">
                                                    {
                                                        product.loan_category
                                                            ?.category_name
                                                    }
                                                </span>
                                            </td>
                                            <td className="px-2 py-2">
                                                <span
                                                    className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${typeInfo.color}`}
                                                >
                                                    {typeInfo.label}
                                                </span>
                                            </td>
                                            <td className="px-2 py-2 text-gray-600">
                                                <div>
                                                    {product.duration_months}m
                                                </div>
                                                <div className="text-[10px] text-gray-500">
                                                    {
                                                        product.number_of_installments
                                                    }{' '}
                                                    inst
                                                </div>
                                            </td>
                                            <td className="px-2 py-2">
                                                <div className="text-gray-600">
                                                    ৳
                                                    {formatAmount(
                                                        product.min_amount,
                                                    )}
                                                </div>
                                                <div className="font-medium text-gray-900">
                                                    ৳
                                                    {formatAmount(
                                                        product.max_amount,
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-2 py-2">
                                                <div className="font-medium text-gray-900">
                                                    {product.interest_rate}%
                                                </div>
                                                {parseFloat(
                                                    String(
                                                        product.service_charge,
                                                    ),
                                                ) > 0 && (
                                                    <div className="text-[10px] text-gray-500">
                                                        +
                                                        {product.service_charge}
                                                        %
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-2 py-2">
                                                <StatusBadge
                                                    active={product.is_active}
                                                />
                                            </td>
                                            <td className="px-2 py-2 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => handleToggleStatus(product.id)}
                                                        className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                                                            product.is_active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'
                                                        }`}
                                                        title={product.is_active ? "Deactivate" : "Activate"}
                                                    >
                                                        {product.is_active ? <ToggleRight className="size-4" /> : <ToggleLeft className="size-4" />}
                                                    </button>
                                                    <button
                                                        onClick={() => handleEdit(product)}
                                                        className="flex h-7 w-7 items-center justify-center rounded-md text-blue-600 transition-colors hover:bg-blue-50"
                                                        title="Edit"
                                                    >
                                                        <Edit className="size-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(product.id, product.product_name)}
                                                        className="flex h-7 w-7 items-center justify-center rounded-md text-red-600 transition-colors hover:bg-red-50"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {filteredProducts.length === 0 && (
                            <EmptyState
                                icon={Package}
                                title="No products found"
                                description="Adjust the filters or add a loan product."
                            />
                        )}
                    </TableScroll>

                    {/* Pagination */}
                    <LocalPagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={filteredProducts.length}
                        perPage={itemsPerPage}
                        itemLabel="products"
                        onPageChange={handlePageChange}
                        onPerPageChange={(size) => {
                            setItemsPerPage(size);
                            setCurrentPage(1);
                        }}
                    />
                </ConfigurationCard>
            </ConfigurationPage>

            <ProductModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                product={selectedProduct}
                categories={categories}
            />
        </AdminLayout>
    );
}
