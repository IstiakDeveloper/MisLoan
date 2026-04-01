import { Head } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';

type BranchRow = {
    id: number;
    name: string;
    code: string;
};

interface Props {
    generatedAt: string;
    branches: BranchRow[];
}

export default function BranchPrint({ generatedAt, branches }: Props) {
    const handlePrint = () => {
        if (typeof window !== 'undefined') window.print();
    };

    const handleExportCsv = () => {
        const escapeCell = (val: unknown) => {
            const s = String(val ?? '');
            const escaped = s.replace(/"/g, '""');
            return /[",\n\r]/.test(escaped) ? `"${escaped}"` : escaped;
        };

        const rows = [
            ['Branch Name', 'Code'],
            ...branches.map((b) => [b.name, b.code]),
        ];

        const csv = rows.map((r) => r.map(escapeCell).join(',')).join('\r\n');
        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'branch_list.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    return (
        <AdminLayout>
            <Head title="Branch List - Print">
                <style>{`
                    @page {
                        size: A4 portrait;
                        margin: 12mm;
                    }
                    @media print {
                        html, body {
                            margin: 0 !important;
                            padding: 0 !important;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                            background: #fff !important;
                        }

                        body * { visibility: hidden; }
                        .branch-print-page,
                        .branch-print-page * { visibility: visible; }
                        .branch-print-page {
                            position: absolute !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: 100% !important;
                            max-width: 100% !important;
                            margin: 0 !important;
                            padding: 0 !important;
                        }

                        .branch-print-page table { font-size: 9.5pt !important; }
                        .branch-print-page tr { page-break-inside: avoid; }
                    }
                `}</style>
            </Head>

            <div className="mx-auto py-6 px-4 print:py-0 print:px-0 branch-print-page">
                <div className="print:hidden flex justify-end mb-4 gap-2">
                    <button
                        type="button"
                        onClick={handleExportCsv}
                        className="px-4 py-2 rounded-md bg-white text-gray-700 border border-gray-300 text-sm font-medium hover:bg-gray-50"
                    >
                        Export CSV
                    </button>
                    <button
                        type="button"
                        onClick={handlePrint}
                        className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                    >
                        Print
                    </button>
                </div>

                <div className="bg-white border border-gray-300 rounded-lg shadow-sm p-4 print:shadow-none print:border-0 print:rounded-none print:p-0">
                    <div className="mb-3">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <img
                                    src="/logo.png"
                                    alt="Logo"
                                    className="w-10 h-10 object-contain"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                                <div className="leading-tight">
                                    <div className="text-base font-bold text-gray-900">Branch List (Code সহ)</div>
                                    <div className="text-xs text-gray-600">Generated at: {generatedAt}</div>
                                </div>
                            </div>
                            <div className="text-right text-xs text-gray-600">
                                <div>Total: {branches.length}</div>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse">
                            <thead>
                                <tr>
                                    <th className="border border-gray-400 px-2 py-1 bg-gray-100 text-center w-[36px]">SL</th>
                                    <th className="border border-gray-400 px-2 py-1 bg-gray-100 text-left">Branch Name</th>
                                    <th className="border border-gray-400 px-2 py-1 bg-gray-100 text-center w-[90px]">Code</th>
                                </tr>
                            </thead>
                            <tbody>
                                {branches.map((b, idx) => (
                                    <tr key={b.id}>
                                        <td className="border border-gray-300 px-2 py-1 text-center">{idx + 1}</td>
                                        <td className="border border-gray-300 px-2 py-1">{b.name}</td>
                                        <td className="border border-gray-300 px-2 py-1 text-center font-mono">{b.code}</td>
                                    </tr>
                                ))}
                                {branches.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="border border-gray-300 px-2 py-6 text-center text-gray-500">
                                            No branches found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-3 text-[10px] text-gray-500 flex items-center justify-between">
                        <span>Page: 1</span>
                        <span className="print:hidden">Tip: Browser print dialog থেকে Paper size = A4 নির্বাচন করুন।</span>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}

