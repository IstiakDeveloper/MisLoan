import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import React from 'react';
import { formatDate, formatDateTime } from '@/utils/dateUtils';

interface ApprovalRow {
    id: number;
    sheet_date: string | null;
    status: string;
    created_at?: string | null;
    approver_name?: string | null;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedApprovals {
    data: ApprovalRow[];
    current_page: number;
    last_page: number;
    links: PaginationLink[];
}

interface Props {
    approvals: PaginatedApprovals;
    filters: {
        date_from: string;
        date_to: string;
    };
}

export default function TeamBasedApprovalDraftIndex({ approvals, filters }: Props) {
    const currentFrom = filters.date_from || '';
    const currentTo = filters.date_to || '';
    const [filterFrom, setFilterFrom] = React.useState(currentFrom);
    const [filterTo, setFilterTo] = React.useState(currentTo);

    React.useEffect(() => {
        setFilterFrom(currentFrom);
        setFilterTo(currentTo);
    }, [currentFrom, currentTo]);

    const applyFilter = (from: string, to: string) => {
        router.visit('/team-based-approvals/drafts', {
            data: { date_from: from, date_to: to },
            preserveScroll: true,
        });
    };

    const submitFilters = () => {
        const from = filterFrom || '';
        const to = filterTo || filterFrom || '';
        applyFilter(from, to);
    };

    const handleFilterKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            submitFilters();
        }
    };

    const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFilterFrom(e.target.value);
    };

    const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFilterTo(e.target.value);
    };

    return (
        <AdminLayout>
            <Head title="Team Based Drafts" />

            <div className="mx-auto py-6 px-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                    <div>
                        <h1 className="text-lg font-semibold text-gray-900">Team Based Loan Approvals (Draft List)</h1>
                        <p className="text-xs text-gray-600 mt-0.5">
                            শুধুমাত্র Draft অবস্থার শিটগুলো এখানে দেখা যাবে। এখান থেকেই Edit, Submit এবং Delete করতে পারবেন।
                        </p>
                    </div>
                    <div className="flex flex-col gap-2 w-full md:w-auto">
                        <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">From</span>
                                <input
                                    type="date"
                                    value={filterFrom}
                                    onChange={handleFromChange}
                                    onKeyDown={handleFilterKeyDown}
                                    className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm bg-white"
                                />
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">To</span>
                                <input
                                    type="date"
                                    value={filterTo}
                                    onChange={handleToChange}
                                    onKeyDown={handleFilterKeyDown}
                                    className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm bg-white"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:flex md:items-center gap-2">
                            <button
                                type="button"
                                onClick={submitFilters}
                                className="inline-flex items-center justify-center px-3 py-1.5 rounded-md bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
                            >
                                Apply Filter
                            </button>
                            <button
                                type="button"
                                onClick={() => applyFilter('', '')}
                                className="inline-flex items-center justify-center px-3 py-1.5 rounded-md bg-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-300"
                            >
                                সব ডেটা
                            </button>
                            <Link
                                href="/team-based-approvals"
                                className="inline-flex items-center justify-center px-3 py-1.5 rounded-md bg-slate-900 text-white text-xs font-semibold hover:bg-black"
                            >
                                All Applications
                            </Link>
                            <Link
                                href="/team-based-approvals/create"
                                className="col-span-2 md:col-span-1 inline-flex items-center justify-center px-3 py-1.5 rounded-md bg-green-600 text-white text-xs font-semibold hover:bg-green-700"
                            >
                                New Draft
                            </Link>
                        </div>
                    </div>
                </div>

                {/* ── MOBILE CARD VIEW ─────────────────────────────────── */}
                <div className="md:hidden flex flex-col gap-3">
                    {approvals.data.length === 0 && (
                        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center text-sm text-gray-500">
                            কোনো Draft Team Based ফরম পাওয়া যায়নি।
                        </div>
                    )}

                    {approvals.data.map((row, idx) => (
                        <div key={row.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                            <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-gray-200">
                                <div className="flex items-center gap-2">
                                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold">
                                        {(approvals.current_page - 1) * 20 + idx + 1}
                                    </span>
                                    <div>
                                        <p className="text-xs font-semibold text-gray-900 leading-tight">
                                            {formatDate(row.sheet_date)}
                                        </p>
                                        <p className="text-[10px] text-gray-500 leading-tight">
                                            Approver: {row.approver_name || '-'}
                                        </p>
                                    </div>
                                </div>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold bg-gray-100 text-gray-700 border-gray-200">
                                    Draft
                                </span>
                            </div>

                            <div className="px-3 py-2.5 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                                <div className="col-span-2">
                                    <span className="text-gray-400">Created</span>
                                    <p className="font-medium text-gray-800">{row.created_at ? formatDateTime(row.created_at) : '-'}</p>
                                </div>
                            </div>

                            <div className="border-t border-gray-200 bg-white px-3 py-2.5">
                                <div className="grid grid-cols-3 gap-2">
                                    <Link
                                        href={`/team-based-approvals/${row.id}/edit`}
                                        className="inline-flex items-center justify-center px-2 py-1.5 rounded-md border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                                    >
                                        Edit
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (confirm('Submit this draft for approval?')) {
                                                router.post(`/team-based-approvals/${row.id}/submit`);
                                            }
                                        }}
                                        className="inline-flex items-center justify-center px-2 py-1.5 rounded-md border border-green-500 text-xs font-semibold text-green-700 hover:bg-green-50"
                                    >
                                        Submit
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (confirm('Delete this draft?')) {
                                                router.delete(`/team-based-approvals/${row.id}`);
                                            }
                                        }}
                                        className="inline-flex items-center justify-center px-2 py-1.5 rounded-md border border-red-500 text-xs font-semibold text-red-700 hover:bg-red-50"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── DESKTOP TABLE VIEW ────────────────────────────────── */}
                <div className="hidden md:block bg-white shadow-sm border border-gray-200 rounded-lg overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 border-b text-left">ক্রম</th>
                                <th className="px-4 py-2 border-b text-left">তারিখ</th>
                                <th className="px-4 py-2 border-b text-left">অনুমোদনকারী</th>
                                <th className="px-4 py-2 border-b text-left">Status</th>
                                <th className="px-4 py-2 border-b text-left">Created At</th>
                                <th className="px-4 py-2 border-b text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {approvals.data.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-6 text-center text-gray-500 text-sm">
                                        কোনো Draft Team Based ফরম পাওয়া যায়নি।
                                    </td>
                                </tr>
                            )}
                            {approvals.data.map((row, idx) => (
                                <tr key={row.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-2 border-b align-middle">
                                        {(approvals.current_page - 1) * 20 + idx + 1}
                                    </td>
                                    <td className="px-4 py-2 border-b align-middle">{formatDate(row.sheet_date)}</td>
                                    <td className="px-4 py-2 border-b align-middle">
                                        {row.approver_name || '-'}
                                    </td>
                                    <td className="px-4 py-2 border-b align-middle">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full border text-xs bg-gray-100 text-gray-700 border-gray-200">
                                            Draft
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 border-b align-middle text-xs text-gray-500">
                                        {row.created_at ? formatDateTime(row.created_at) : '-'}
                                    </td>
                                    <td className="px-4 py-2 border-b align-middle text-right text-xs text-gray-700 space-x-2">
                                        <Link
                                            href={`/team-based-approvals/${row.id}/edit`}
                                            className="inline-flex items-center px-2 py-0.5 rounded-md border border-gray-300 hover:bg-gray-100"
                                        >
                                            Edit
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (confirm('Submit this draft for approval?')) {
                                                    router.post(`/team-based-approvals/${row.id}/submit`);
                                                }
                                            }}
                                            className="inline-flex items-center px-2 py-0.5 rounded-md border border-green-500 text-green-700 hover:bg-green-50"
                                        >
                                            Submit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (confirm('Delete this draft?')) {
                                                    router.delete(`/team-based-approvals/${row.id}`);
                                                }
                                            }}
                                            className="inline-flex items-center px-2 py-0.5 rounded-md border border-red-500 text-red-700 hover:bg-red-50"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </AdminLayout>
    );
}

