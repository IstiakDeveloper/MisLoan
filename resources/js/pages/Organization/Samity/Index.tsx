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
import { Samity } from '@/types/samity';
import { Head, Link, router } from '@inertiajs/react';
import {
    Building2,
    Plus,
    Search,
    Edit,
    Trash2,
    Download,
    Upload,
    FileSpreadsheet,
    X,
    Filter,
} from 'lucide-react';
import React, { useState } from 'react';
import { formatBranchLabel, sortBranchesByCode } from '@/utils/branchLabel';

interface BranchOption {
    id: number;
    name: string;
    code: string;
}

interface Props extends PageProps {
    samities: {
        data: Samity[];
        links: any[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    branches?: BranchOption[];
    filters: {
        search?: string;
        branch_id?: string | number;
    };
}

export default function Index({ auth, samities, branches = [], filters }: Props) {
    const canMutate = useCanMutate();
    const [search, setSearch] = useState(filters.search || '');
    const [branchId, setBranchId] = useState<string>(
        filters.branch_id ? String(filters.branch_id) : ''
    );

    // Import modal state
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/samities',
            {
                search: search || undefined,
                branch_id: branchId || undefined,
            },
            { preserveState: true }
        );
    };

    const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setBranchId(val);
        router.get(
            '/samities',
            {
                search: search || undefined,
                branch_id: val || undefined,
            },
            { preserveState: true }
        );
    };

    const handleClearFilters = () => {
        setSearch('');
        setBranchId('');
        router.get('/samities', {}, { preserveState: true });
    };

    const handleDelete = (samity: Samity) => {
        if (confirm(`Are you sure you want to delete ${samity.samity_name}?`)) {
            router.delete(`/samities/${samity.id}`);
        }
    };

    const handleExport = () => {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (branchId) params.append('branch_id', branchId);
        window.location.href = `/samities/export?${params.toString()}`;
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

        router.post('/samities/import', formData, {
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

    return (
        <AdminLayout>
            <Head title="Samities" />

            <ConfigurationPage>
                <ConfigurationHeader
                    title="Samities"
                    description="Manage samity records and their branch assignments across the organization."
                    icon={Building2}
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={handleExport}
                                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-white/20 focus:ring-4 focus:ring-white/30 focus:outline-none"
                                title="Download Samities Excel"
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
                                        title="Import Samities from Excel"
                                    >
                                        <Upload className="size-4" />
                                        Import Excel
                                    </button>

                                    <Link
                                        href="/samities/create"
                                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm hover:bg-blue-50 focus:ring-4 focus:ring-white/30 focus:outline-none"
                                    >
                                        <Plus className="size-4" />
                                        Add Samity
                                    </Link>
                                </>
                            )}
                        </div>
                    }
                />

                <ConfigurationCard>
                    <ConfigurationToolbar>
                        <form
                            onSubmit={handleSearch}
                            className="flex w-full flex-col gap-3 sm:flex-row sm:items-center"
                        >
                            {/* Branch Filter Dropdown */}
                            <div className="relative w-full sm:w-64">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                                    <Filter className="size-4" />
                                </div>
                                <select
                                    value={branchId}
                                    onChange={handleBranchChange}
                                    className="h-10 w-full rounded-lg border border-slate-300 bg-white pr-8 pl-9 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                >
                                    <option value="">All Branches</option>
                                    {sortBranchesByCode(branches).map((b) => (
                                        <option key={b.id} value={b.id}>
                                            {formatBranchLabel(b)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Search Input */}
                            <div className="relative flex-1">
                                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search by samity name or code..."
                                    className="h-10 w-full rounded-lg border border-slate-300 bg-white pr-3 pl-9 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                />
                            </div>

                            <button
                                type="submit"
                                className="min-h-10 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:ring-4 focus:ring-blue-100 focus:outline-none"
                            >
                                Search
                            </button>

                            {(filters.search || filters.branch_id) && (
                                <button
                                    type="button"
                                    onClick={handleClearFilters}
                                    className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                                >
                                    Clear
                                </button>
                            )}
                        </form>
                    </ConfigurationToolbar>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] divide-y divide-slate-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                        Code
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                        Samity Name
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                        Branch
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {samities.data.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="px-6 py-12 text-center"
                                        >
                                            <EmptyState
                                                icon={Building2}
                                                title="No samities found"
                                                description="Get started by creating or importing a new samity."
                                            />
                                        </td>
                                    </tr>
                                ) : (
                                    samities.data.map((samity) => (
                                        <tr
                                            key={samity.id}
                                            className="transition-colors duration-150 hover:bg-gray-50"
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                                                    {samity.samity_code}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {samity.samity_name}
                                                </div>
                                                {samity.samity_name_bn && (
                                                    <div className="mt-0.5 text-xs text-gray-500">
                                                        {samity.samity_name_bn}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {samity.branch && (
                                                    <div>
                                                        <div className="text-sm text-gray-900">
                                                            {samity.branch.name}
                                                        </div>
                                                        <div className="mt-0.5 text-xs text-gray-500">
                                                            {
                                                                samity.branch
                                                                    .area?.name
                                                            }
                                                            ,{' '}
                                                            {
                                                                samity.branch
                                                                    .area?.zone
                                                                    ?.name
                                                            }
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <StatusBadge
                                                    active={samity.is_active}
                                                />
                                            </td>
                                            <td className="px-6 py-4 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1">
                                                    {canMutate ? (
                                                        <>
                                                            <Link
                                                                href={`/samities/${samity.id}/edit`}
                                                                className="flex h-7 w-7 items-center justify-center rounded-md text-blue-600 transition-colors hover:bg-blue-50"
                                                                title="Edit"
                                                            >
                                                                <Edit className="size-4" />
                                                            </Link>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDelete(samity)}
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
                        links={samities.links}
                        summary={`Page ${samities.current_page} of ${samities.last_page}`}
                        perPage={samities.per_page || 50}
                        onPerPageChange={(size) => {
                            router.get(
                                '/samities',
                                {
                                    search: filters.search,
                                    branch_id: filters.branch_id,
                                    per_page: size,
                                },
                                { preserveState: true }
                            );
                        }}
                    />
                </ConfigurationCard>
            </ConfigurationPage>

            {/* Import Excel Modal */}
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
                                        Import Samities
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        Upload Excel (.xlsx) file to import samities
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
                                    href="/samities/template"
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
