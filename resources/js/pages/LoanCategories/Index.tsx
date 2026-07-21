import {
    ConfigurationCard,
    ConfigurationHeader,
    ConfigurationPage,
    ConfigurationToolbar,
    EmptyState,
    LocalPagination,
    SearchField,
    StatCard,
    StatGrid,
    StatusBadge,
    TableScroll,
} from '@/components/configuration';
import AdminLayout from '@/layouts/admin-layout';
import { Head, router } from '@inertiajs/react';
import {
    Edit,
    ListTree,
    MoreVertical,
    Package,
    Plus,
    ToggleLeft,
    ToggleRight,
    Trash2,
    Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
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
    both: {
        label: 'Both',
        color: 'bg-blue-50 text-blue-700 border border-blue-200',
    },
    female: {
        label: 'Female',
        color: 'bg-pink-50 text-pink-700 border border-pink-200',
    },
    male: {
        label: 'Male',
        color: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
    },
};

export default function Index({ categories, filters }: Props) {
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [openDropdown, setOpenDropdown] = useState<number | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] =
        useState<LoanCategory | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);

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
        if (
            confirm(
                `Are you sure you want to delete category "${name}"? (আপনি কি "${name}" ক্যাটাগরি মুছে ফেলতে চান?)`,
            )
        ) {
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
            cat.category_name
                .toLowerCase()
                .includes(searchQuery.toLowerCase()) ||
            cat.category_name_bn.includes(searchQuery) ||
            cat.category_code.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    const totalPages = Math.ceil(filteredCategories.length / itemsPerPage);
    const paginatedCategories = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredCategories.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredCategories, currentPage, itemsPerPage]);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <AdminLayout>
            <Head title="Loan Categories" />

            <ConfigurationPage>
                <ConfigurationHeader
                    title="Loan Categories"
                    description="Organize lending programs into clear, reusable categories."
                    icon={ListTree}
                    actions={
                        <button
                            onClick={handleAddNew}
                            className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50 focus:ring-4 focus:ring-white/30 focus:outline-none sm:w-auto"
                        >
                            <Plus className="size-4" />
                            Add Category
                        </button>
                    }
                />

                {/* Stats */}
                <StatGrid>
                    <StatCard
                        label="Total categories"
                        value={categoriesList.length}
                        icon={ListTree}
                    />
                    <StatCard
                        label="Active categories"
                        value={categoriesList.filter((c) => c.is_active).length}
                        icon={ToggleRight}
                        tone="green"
                    />
                    <StatCard
                        label="Female only"
                        value={
                            categoriesList.filter(
                                (c) => c.target_group === 'female',
                            ).length
                        }
                        icon={Users}
                        tone="pink"
                    />
                    <StatCard
                        label="Linked products"
                        value={categoriesList.reduce(
                            (sum, c) => sum + (c.loan_products_count || 0),
                            0,
                        )}
                        icon={Package}
                        tone="purple"
                    />
                </StatGrid>

                {/* Content Card */}
                <ConfigurationCard>
                    <ConfigurationToolbar>
                        <SearchField
                            placeholder="Search by name or code..."
                            value={searchQuery}
                            onChange={(value) => {
                                setSearchQuery(value);
                                setCurrentPage(1);
                            }}
                        />
                    </ConfigurationToolbar>

                    <TableScroll>
                        <table className="w-full min-w-[760px] text-sm">
                            <thead className="border-b border-slate-200 bg-slate-50/90">
                                <tr>
                                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">
                                        SL
                                    </th>
                                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">
                                        Order
                                    </th>
                                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">
                                        Category
                                    </th>
                                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">
                                        Code
                                    </th>
                                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">
                                        Target Group
                                    </th>
                                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">
                                        Products
                                    </th>
                                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">
                                        Status
                                    </th>
                                    <th className="px-2 py-2 text-right text-[10px] font-semibold text-gray-600 uppercase">
                                        
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {paginatedCategories.map((category, index) => {
                                    const targetInfo =
                                        targetGroupLabels[
                                            category.target_group
                                        ] || targetGroupLabels.both;
                                    const slNo =
                                        (currentPage - 1) * itemsPerPage +
                                        index +
                                        1;
                                    return (
                                        <tr
                                            key={category.id}
                                            className="border-b border-slate-100 transition-colors last:border-0 hover:bg-blue-50/40"
                                        >
                                            <td className="px-2 py-2 font-medium text-gray-500">
                                                {slNo}
                                            </td>
                                            <td className="px-2 py-2 text-gray-600">
                                                {category.display_order}
                                            </td>
                                            <td className="px-2 py-2">
                                                <div className="leading-tight font-medium text-gray-900">
                                                    {category.category_name}
                                                </div>
                                            </td>
                                            <td className="px-2 py-2">
                                                <span className="inline-block rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] font-medium text-gray-800">
                                                    {category.category_code}
                                                </span>
                                            </td>
                                            <td className="px-2 py-2">
                                                <span
                                                    className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${targetInfo.color}`}
                                                >
                                                    {targetInfo.label}
                                                </span>
                                            </td>
                                            <td className="px-2 py-2">
                                                <span className="inline-block rounded border border-purple-200 bg-purple-50 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">
                                                    {category.loan_products_count ||
                                                        0}
                                                </span>
                                            </td>
                                            <td className="px-2 py-2">
                                                <StatusBadge
                                                    active={category.is_active}
                                                />
                                            </td>
                                            <td className="px-2 py-2 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => handleToggleStatus(category.id)}
                                                        className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                                                            category.is_active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'
                                                        }`}
                                                        title={category.is_active ? "Deactivate" : "Activate"}
                                                    >
                                                        {category.is_active ? <ToggleRight className="size-4" /> : <ToggleLeft className="size-4" />}
                                                    </button>
                                                    <button
                                                        onClick={() => handleEdit(category)}
                                                        className="flex h-7 w-7 items-center justify-center rounded-md text-blue-600 transition-colors hover:bg-blue-50"
                                                        title="Edit"
                                                    >
                                                        <Edit className="size-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(category.id, category.category_name)}
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
                        {filteredCategories.length === 0 && (
                            <EmptyState
                                icon={ListTree}
                                title="No categories found"
                                description="Try a different search or add a category."
                            />
                        )}
                    </TableScroll>

                    <LocalPagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={filteredCategories.length}
                        perPage={itemsPerPage}
                        itemLabel="categories"
                        onPageChange={handlePageChange}
                        onPerPageChange={(size) => {
                            setItemsPerPage(size);
                            setCurrentPage(1);
                        }}
                    />
                </ConfigurationCard>
            </ConfigurationPage>

            <CategoryModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                category={selectedCategory}
            />
        </AdminLayout>
    );
}
