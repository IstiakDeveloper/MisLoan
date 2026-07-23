import {
    ConfigurationCard,
    ConfigurationHeader,
    ConfigurationPage,
    ConfigurationToolbar,
    EmptyState,
    ServerPagination,
    StatusBadge,
} from '@/components/configuration';
import { useCanMutate } from '@/hooks/use-can-mutate';
import AdminLayout from '@/layouts/admin-layout';
import { PageProps } from '@/types';
import { MemberCategory } from '@/types/memberCategory';
import { Head, Link, router } from '@inertiajs/react';
import { Plus, Search, Tags, Edit, Trash2 } from 'lucide-react';
import React, { useState } from 'react';

interface Props extends PageProps {
    categories: {
        data: MemberCategory[];
        links: any[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    filters: {
        search?: string;
    };
}

export default function Index({ auth, categories, filters }: Props) {
    const canMutate = useCanMutate();
    const [search, setSearch] = useState(filters.search || '');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/member-categories', { search }, { preserveState: true });
    };

    const handleDelete = (category: MemberCategory) => {
        if (
            confirm(
                `Are you sure you want to delete ${category.category_name}?`,
            )
        ) {
            router.delete(`/member-categories/${category.id}`);
        }
    };

    return (
        <AdminLayout>
            <Head title="Member Categories" />

            <ConfigurationPage>
                <ConfigurationHeader
                    title="Member Categories"
                    description="Create and organize the categories used to classify members."
                    icon={Tags}
                    actions={
                        canMutate ? (
                        <Link
                            href="/member-categories/create"
                            className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm hover:bg-blue-50 focus:ring-4 focus:ring-white/30 focus:outline-none sm:w-auto"
                        >
                            <Plus className="size-4" />
                            Add Category
                        </Link>
                        ) : undefined
                    }
                />

                <ConfigurationCard>
                    <ConfigurationToolbar>
                        <form
                            onSubmit={handleSearch}
                            className="flex w-full flex-col gap-2 sm:flex-row"
                        >
                            <div className="relative flex-1">
                                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search categories..."
                                    className="h-10 w-full rounded-lg border border-slate-300 bg-white pr-3 pl-9 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                />
                            </div>
                            <button
                                type="submit"
                                className="min-h-10 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:ring-4 focus:ring-blue-100 focus:outline-none"
                            >
                                Search
                            </button>
                            {filters.search && (
                                <Link
                                    href="/member-categories"
                                    className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                                >
                                    Clear
                                </Link>
                            )}
                        </form>
                    </ConfigurationToolbar>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] divide-y divide-slate-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                        Category Name
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                        Bangla Name
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                        Description
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
                                        
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {categories.data.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="px-6 py-12 text-center"
                                        >
                                            <EmptyState
                                                icon={Tags}
                                                title="No categories found"
                                                description="Get started by creating a new category."
                                            />
                                        </td>
                                    </tr>
                                ) : (
                                    categories.data.map((category) => (
                                        <tr
                                            key={category.id}
                                            className="transition-colors duration-150 hover:bg-gray-50"
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {category.category_name}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-600">
                                                    {category.category_name_bn ||
                                                        '-'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="max-w-xs truncate text-sm text-gray-600">
                                                    {category.description ||
                                                        '-'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <StatusBadge
                                                    active={category.is_active}
                                                />
                                            </td>
                                            <td className="px-6 py-4 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1">
                                                    {canMutate ? (
                                                    <>
                                                    <Link
                                                        href={`/member-categories/${category.id}/edit`}
                                                        className="flex h-7 w-7 items-center justify-center rounded-md text-blue-600 transition-colors hover:bg-blue-50"
                                                        title="Edit"
                                                    >
                                                        <Edit className="size-4" />
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(category)}
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
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <ServerPagination
                        links={categories.links}
                        summary={`Page ${categories.current_page} of ${categories.last_page}`}
                        perPage={categories.per_page || 50}
                        onPerPageChange={(size) => {
                            router.get('/member-categories', { search: filters.search, per_page: size }, { preserveState: true });
                        }}
                    />
                </ConfigurationCard>
            </ConfigurationPage>
        </AdminLayout>
    );
}
