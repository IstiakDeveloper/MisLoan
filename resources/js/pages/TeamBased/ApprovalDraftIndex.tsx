import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';

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

    const applyFilter = (from: string, to: string) => {
        router.visit('/team-based-approvals/drafts', {
            data: { date_from: from, date_to: to },
            preserveScroll: true,
        });
    };

    const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newFrom = e.target.value;
        applyFilter(newFrom, currentTo || newFrom);
    };

    const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTo = e.target.value;
        applyFilter(currentFrom || newTo, newTo);
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
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-600">From:</span>
                            <input
                                type="date"
                                value={currentFrom}
                                onChange={handleFromChange}
                                className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                            />
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-600">To:</span>
                            <input
                                type="date"
                                value={currentTo}
                                onChange={handleToChange}
                                className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                            />
                        </div>
                        <Link
                            href="/team-based-approvals"
                            className="inline-flex items-center px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700"
                        >
                            All Applications
                        </Link>
                        <Link
                            href="/team-based-approvals/create"
                            className="inline-flex items-center px-3 py-1.5 rounded-md bg-green-600 text-white text-sm hover:bg-green-700"
                        >
                            New Draft
                        </Link>
                    </div>
                </div>

                <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
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
                                    <td colSpan={5} className="px-4 py-6 text-center text-gray-500 text-sm">
                                        কোনো Draft Team Based ফরম পাওয়া যায়নি।
                                    </td>
                                </tr>
                            )}
                            {approvals.data.map((row, idx) => (
                                <tr key={row.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-2 border-b align-middle">
                                        {(approvals.current_page - 1) * 20 + idx + 1}
                                    </td>
                                    <td className="px-4 py-2 border-b align-middle">{row.sheet_date || '-'}</td>
                                    <td className="px-4 py-2 border-b align-middle">
                                        {row.approver_name || '-'}
                                    </td>
                                    <td className="px-4 py-2 border-b align-middle">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full border text-xs bg-gray-100 text-gray-700 border-gray-200">
                                            Draft
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 border-b align-middle text-xs text-gray-500">
                                        {row.created_at ? row.created_at : '-'}
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

