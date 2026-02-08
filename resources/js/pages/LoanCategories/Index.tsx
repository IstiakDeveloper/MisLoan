import { useState, useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Plus, Search, MoreVertical, Edit, Trash2, ListTree, ToggleLeft, ToggleRight, Users, Package, ChevronLeft, ChevronRight } from 'lucide-react';
import CategoryModal from './Components/CategoryModal';

interface LoanCategory {
    id: number;
    category_name: string;
    category_name_bn: string;
    category_code: string;
    description: string | null;
    description_bn: string | null;
    target_group: string;
    is_active: boolean;
    display_order: number;
    loan_products_count: number;
}

interface Props {
    categories: LoanCategory[];
    filters: { search?: string };
}

const targetGroupLabels: Record<string, { label: string; color: string }> = {
    both: { label: 'Both', color: 'bg-blue-50 text-blue-700 border border-blue-200' },
    female: { label: 'Female', color: 'bg-pink-50 text-pink-700 border border-pink-200' },
    male: { label: 'Male', color: 'bg-indigo-50 text-indigo-700 border border-indigo-200' },
};

export default function Index({ categories, filters }: Props) {
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [openDropdown, setOpenDropdown] = useState<number | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<LoanCategory | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const categoriesList = Array.isArray(categories) ? categories : [];

    const handleAddNew = () => {
        setSelectedCategory(null);
        setModalOpen(true);
    };

    const handleEdit = (category: LoanCategory) => {
        setSelectedCategory(category);
        setModalOpen(true);
        setOpenDropdown(null);
    };

    const handleDelete = (id: number, name: string) => {
        if (confirm(`Are you sure you want to delete category "${name}"? (আপনি কি "${name}" ক্যাটাগরি মুছে ফেলতে চান?)`)) {
            router.delete(`/loan-categories/${id}`);
        }
        setOpenDropdown(null);
    };

    const handleToggleStatus = (id: number) => {
        router.patch(`/loan-categories/${id}/toggle-status`);
        setOpenDropdown(null);
    };

    const filteredCategories = categoriesList.filter(
        (cat) =>
            cat.category_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            cat.category_name_bn.includes(searchQuery) ||
            cat.category_code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalPages = Math.ceil(filteredCategories.length / itemsPerPage);
    const paginatedCategories = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredCategories.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredCategories, currentPage]);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <AdminLayout>
            <Head title="Loan Categories" />

            <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Loan Categories</h1>
                        <p className="text-xs text-gray-500 mt-0.5">Manage loan categories</p>
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
                                <ListTree className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{categoriesList.length}</p>
                                <p className="text-sm text-gray-600">Total Categories (মোট ক্যাটাগরি)</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm border p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                                <ToggleRight className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{categoriesList.filter(c => c.is_active).length}</p>
                                <p className="text-sm text-gray-600">Active (সক্রিয়)</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm border p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center">
                                <Users className="w-5 h-5 text-pink-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{categoriesList.filter(c => c.target_group === 'female').length}</p>
                                <p className="text-sm text-gray-600">Female Only (শুধু মহিলা)</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm border p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                                <Package className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{categoriesList.reduce((sum, c) => sum + (c.loan_products_count || 0), 0)}</p>
                                <p className="text-sm text-gray-600">Total Products (মোট পণ্য)</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Card */}
                <div className="bg-white rounded-md border">
                    <div className="px-4 py-3 border-b">
                        <div className="relative max-w-xs">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search categories..."
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                className="pl-8 pr-3 py-1.5 text-sm w-full border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">SL</th>
                                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">Order</th>
                                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">Category</th>
                                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">Code</th>
                                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">Target Group</th>
                                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">Products</th>
                                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">Status</th>
                                    <th className="px-2 py-2 text-right text-[10px] font-semibold text-gray-600 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {paginatedCategories.map((category, index) => {
                                    const targetInfo = targetGroupLabels[category.target_group] || targetGroupLabels.both;
                                    const slNo = (currentPage - 1) * itemsPerPage + index + 1;
                                    return (
                                        <tr key={category.id} className="hover:bg-gray-50">
                                            <td className="px-2 py-2 text-gray-500 font-medium">{slNo}</td>
                                            <td className="px-2 py-2 text-gray-600">{category.display_order}</td>
                                            <td className="px-2 py-2">
                                                <div className="font-medium text-gray-900 leading-tight">{category.category_name}</div>
                                            </td>
                                            <td className="px-2 py-2">
                                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-gray-100 text-gray-800">
                                                    {category.category_code}
                                                </span>
                                            </td>
                                            <td className="px-2 py-2">
                                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${targetInfo.color}`}>
                                                    {targetInfo.label}
                                                </span>
                                            </td>
                                            <td className="px-2 py-2">
                                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
                                                    {category.loan_products_count || 0}
                                                </span>
                                            </td>
                                            <td className="px-2 py-2">
                                                {category.is_active ? (
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
                                                        onClick={() => setOpenDropdown(openDropdown === category.id ? null : category.id)}
                                                        className="p-1 rounded hover:bg-gray-100"
                                                    >
                                                        <MoreVertical className="w-3.5 h-3.5 text-gray-600" />
                                                    </button>
                                                    {openDropdown === category.id && (
                                                        <div className="absolute right-0 mt-1 w-36 bg-white rounded-md shadow-lg border py-1 z-10">
                                                            <button
                                                                onClick={() => handleEdit(category)}
                                                                className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                                                            >
                                                                <Edit className="w-3 h-3" />
                                                                Edit
                                                            </button>
                                                            <button
                                                                onClick={() => handleToggleStatus(category.id)}
                                                                className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                                                            >
                                                                {category.is_active ? (
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
                                                                onClick={() => handleDelete(category.id, category.category_name)}
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
                        {filteredCategories.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                <ListTree className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                <p className="text-xs">No categories found</p>
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-between">
                            <div className="text-xs text-gray-600">
                                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredCategories.length)} of {filteredCategories.length} categories
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

            <CategoryModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                category={selectedCategory}
            />
        </AdminLayout>
    );
}
