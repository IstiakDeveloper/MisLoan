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
import { useCanMutate } from '@/hooks/use-can-mutate';
import AdminLayout from '@/layouts/admin-layout';
import { Head, router } from '@inertiajs/react';
import { Edit, ListTree, Package, Plus, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import CategoryModal from './Components/CategoryModal';

interface SavingsCategory {
    id: number;
    category_name: string;
    category_name_bn: string;
    category_code: string;
    description: string | null;
    description_bn: string | null;
    is_active: boolean;
    display_order: number;
    savings_products_count: number;
}

interface Props {
    categories: SavingsCategory[];
    filters: { search?: string };
}

export default function Index({ categories, filters }: Props) {
    const canMutate = useCanMutate();
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<SavingsCategory | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);

    const categoriesList = Array.isArray(categories) ? categories : [];

    const handleAddNew = () => {
        setSelectedCategory(null);
        setModalOpen(true);
    };

    const handleEdit = (category: SavingsCategory) => {
        setSelectedCategory(category);
        setModalOpen(true);
    };

    const handleDelete = (id: number, name: string) => {
        if (confirm(`আপনি কি "${name}" ক্যাটাগরি মুছে ফেলতে চান?`)) {
            router.delete(`/savings-categories/${id}`);
        }
    };

    const handleToggleStatus = (id: number) => {
        router.patch(`/savings-categories/${id}/toggle-status`);
    };

    const filteredCategories = categoriesList.filter(
        (cat) =>
            cat.category_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (cat.category_name_bn || '').includes(searchQuery) ||
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
            <Head title="Savings Categories" />

            <ConfigurationPage>
                <ConfigurationHeader
                    title="Savings Categories"
                    description="Main codes such as 21 General Savings group the products underneath (21.01, 21.02)."
                    icon={ListTree}
                    actions={
                        canMutate ? (
                            <button
                                onClick={handleAddNew}
                                className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50 focus:ring-4 focus:ring-white/30 focus:outline-none sm:w-auto"
                            >
                                <Plus className="size-4" />
                                Add Category
                            </button>
                        ) : undefined
                    }
                />

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
                        label="Linked products"
                        value={categoriesList.reduce(
                            (sum, c) => sum + (c.savings_products_count || 0),
                            0,
                        )}
                        icon={Package}
                        tone="purple"
                    />
                </StatGrid>

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
                                        Products
                                    </th>
                                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">
                                        Status
                                    </th>
                                    <th className="px-2 py-2 text-right text-[10px] font-semibold text-gray-600 uppercase" />
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {paginatedCategories.map((category, index) => {
                                    const slNo = (currentPage - 1) * itemsPerPage + index + 1;
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
                                                {category.category_name_bn && (
                                                    <div className="text-[10px] text-gray-500">
                                                        {category.category_name_bn}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-2 py-2">
                                                <span className="inline-block rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] font-medium text-gray-800">
                                                    {category.category_code}
                                                </span>
                                            </td>
                                            <td className="px-2 py-2">
                                                <span className="inline-block rounded border border-purple-200 bg-purple-50 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">
                                                    {category.savings_products_count || 0}
                                                </span>
                                            </td>
                                            <td className="px-2 py-2">
                                                <StatusBadge active={category.is_active} />
                                            </td>
                                            <td className="px-2 py-2 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {canMutate ? (
                                                        <>
                                                            <button
                                                                onClick={() => handleToggleStatus(category.id)}
                                                                className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                                                                    category.is_active
                                                                        ? 'text-emerald-600 hover:bg-emerald-50'
                                                                        : 'text-slate-400 hover:bg-slate-100'
                                                                }`}
                                                                title={category.is_active ? 'Deactivate' : 'Activate'}
                                                            >
                                                                {category.is_active ? (
                                                                    <ToggleRight className="size-4" />
                                                                ) : (
                                                                    <ToggleLeft className="size-4" />
                                                                )}
                                                            </button>
                                                            <button
                                                                onClick={() => handleEdit(category)}
                                                                className="flex h-7 w-7 items-center justify-center rounded-md text-blue-600 transition-colors hover:bg-blue-50"
                                                                title="Edit"
                                                            >
                                                                <Edit className="size-4" />
                                                            </button>
                                                            <button
                                                                onClick={() =>
                                                                    handleDelete(
                                                                        category.id,
                                                                        category.category_name,
                                                                    )
                                                                }
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
