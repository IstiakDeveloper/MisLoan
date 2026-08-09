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
import { useCanMutate } from '@/hooks/use-can-mutate';
import AdminLayout from '@/layouts/admin-layout';
import { Head, router } from '@inertiajs/react';
import {
    Download,
    Edit,
    FileSpreadsheet,
    Filter,
    MoreVertical,
    Package,
    Plus,
    ToggleLeft,
    ToggleRight,
    Trash2,
    Upload,
    X,
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

    // Import modal state
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);

    const productsList = Array.isArray(products) ? products : [];
    const canMutate = useCanMutate();

    const handleExport = () => {
        const params = new URLSearchParams();
        if (searchQuery) params.append('search', searchQuery);
        if (filterCategory) params.append('category_id', filterCategory);
        if (filterType) params.append('installment_type', filterType);
        window.location.href = `/loan-products/export?${params.toString()}`;
    };

    const handleImportSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!importFile) {
            setImportError('Please select an Excel file (.xlsx or .xls) to upload.');
            return;
        }

        setIsImporting(true);
        setImportError(null);

        const formData = new FormData();
        formData.append('file', importFile);

        router.post('/loan-products/import', formData, {
            forceFormData: true,
            onSuccess: () => {
                setIsImportOpen(false);
                setImportFile(null);
            },
            onError: (errors) => {
                setImportError(
                    errors.file || errors.error || 'An error occurred during import.'
                );
            },
            onFinish: () => {
                setIsImporting(false);
            },
        });
    };

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
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={handleExport}
                                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-white/20 focus:ring-4 focus:ring-white/30 focus:outline-none"
                                title="Download Loan Products Excel"
                            >
                                <Download className="size-4" />
                                Export Excel
                            </button>

                            {canMutate && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setImportError(null);
                                            setImportFile(null);
                                            setIsImportOpen(true);
                                        }}
                                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-white/20 focus:ring-4 focus:ring-white/30 focus:outline-none"
                                        title="Import Loan Products from Excel"
                                    >
                                        <Upload className="size-4" />
                                        Import Excel
                                    </button>

                                    <button
                                        onClick={handleAddNew}
                                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm hover:bg-blue-50 focus:ring-4 focus:ring-white/30 focus:outline-none"
                                    >
                                        <Plus className="size-4" />
                                        Add Product
                                    </button>
                                </>
                            )}
                        </div>
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
                                                    {canMutate ? (
                                                    <>
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
                                                    </>
                                                    ) : (
                                                        <span className="text-xs text-slate-400">View only</span>
                                                    )}
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

            {/* Excel Import Modal */}
            {isImportOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
                        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
                            <div className="flex items-center gap-3">
                                <div className="flex size-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                                    <FileSpreadsheet className="size-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900">
                                        Import Loan Products
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        Upload Excel (.xlsx) file to import loan products
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsImportOpen(false)}
                                className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                            >
                                <X className="size-5" />
                            </button>
                        </div>

                        <form onSubmit={handleImportSubmit} className="p-6 space-y-4">
                            {importError && (
                                <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                                    {importError}
                                </div>
                            )}

                            <div className="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50/50 p-3">
                                <div className="text-xs text-slate-600">
                                    Need the correct file format?
                                </div>
                                <a
                                    href="/loan-products/template"
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:underline"
                                    download
                                >
                                    <Download className="size-3.5" />
                                    Download Template
                                </a>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    Select Excel File (.xlsx, .xls)
                                </label>
                                <input
                                    type="file"
                                    accept=".xlsx,.xls"
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            setImportFile(e.target.files[0]);
                                            setImportError(null);
                                        }
                                    }}
                                    className="block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-blue-700"
                                />
                                {importFile && (
                                    <p className="mt-2 text-xs text-emerald-600 font-medium">
                                        Selected: {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
                                    </p>
                                )}
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsImportOpen(false)}
                                    disabled={isImporting}
                                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isImporting || !importFile}
                                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700 focus:ring-4 focus:ring-blue-100 disabled:opacity-50"
                                >
                                    {isImporting ? (
                                        <>Importing...</>
                                    ) : (
                                        <>
                                            <Upload className="size-3.5" />
                                            Import Now
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
