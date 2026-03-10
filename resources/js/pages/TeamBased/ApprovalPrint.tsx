import { Head } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';

interface Sheet {
    id: number;
    sheet_date: string | null;
    status: string;
    branch: {
        name: string;
        code: string;
        area_name?: string | null;
        zone_name?: string | null;
    };
    approver_name?: string | null;
}

interface Item {
    serial_no: number;
    member_name: string;
    member_code?: string | null;
    samity_number?: string | null;
    savings_general?: number | null;
    savings_other?: number | null;
    savings_total?: number | null;
    repaid_loan_amount?: number | null;
    repaid_installment_no?: number | null;
    other_institution_loan_amount?: string | null;
    proposed_loan_amount?: number | null;
    approved_amount?: number | null;
    loan_term_years?: number | null;
    loan_type?: string | null;
    project_name?: string | null;
    approvers?: { approver_name?: string | null; approver_role?: string | null; status?: string; approver_signature?: string | null; decided_at?: string | null }[];
}

interface Props {
    sheet: Sheet;
    items: Item[];
}

export default function TeamBasedApprovalPrint({ sheet, items }: Props) {
    const handlePrint = () => {
        if (typeof window !== 'undefined') {
            window.print();
        }
    };

    return (
        <AdminLayout>
            <Head title="Team Based Approval - Print">
                <style>{`
                    @page { size: A4; margin: 0; }
                    @media print {
                        html, body { margin: 0 !important; padding: 0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        .teambased-approval-print-page { margin: 0 !important; padding: 0 !important; }
                    }
                `}</style>
            </Head>

            <div className="mx-auto py-6 px-4 print:py-0 print:px-0 teambased-approval-print-page">
                <div className="print:hidden flex justify-end mb-4">
                    <button
                        type="button"
                        onClick={handlePrint}
                        className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                    >
                        Print
                    </button>
                </div>

                <div className="bg-white border border-gray-300 rounded-lg shadow-sm p-4 print:shadow-none print:border-0 print:rounded-none print:p-0">
                    {/* Header - matches formal document: logo left, org+title center, date right; then branch/area/zone */}
                    <div className="mb-4">
                        <div className="flex items-start justify-between gap-4 mb-2">
                            <div className="flex-shrink-0">
                                <img
                                    src="/logo.png"
                                    alt="Logo"
                                    className="w-12 h-12 object-contain"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                            </div>
                            <div className="flex-1 text-center leading-tight">
                                <h1 className="text-lg font-bold text-gray-900">মৌসুমী</h1>
                                <p className="text-xs text-gray-700">উকিলপাড়া, নওগাঁ।</p>
                                <p className="text-sm font-semibold text-gray-900 mt-0.5">
                                    মাসিক ঋণ যাচাই ও অনুমোদন সংক্রান্ত তথ্য।
                                </p>
                            </div>
                            <div className="flex-shrink-0 text-right text-xs text-gray-700">
                                <p>তারিখ: {sheet.sheet_date || '-'}</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-gray-700">
                            <span><span className="font-semibold">শাখার নাম:</span> {sheet.branch.name}</span>
                            <span><span className="font-semibold">অঞ্চলের নাম:</span> {sheet.branch.area_name || '-'}</span>
                            <span><span className="font-semibold">জোনের নাম:</span> {sheet.branch.zone_name || '-'}</span>
                            <span><span className="font-semibold">তারিখ:</span> {sheet.sheet_date || '-'}</span>
                        </div>
                        {sheet.approver_name && (
                            <p className="text-xs text-gray-600 mt-1">অনুমোদনকারী: {sheet.approver_name}</p>
                        )}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse text-[11px]">
                            <thead>
                                <tr>
                                    <th className="border border-gray-400 px-2 py-1 bg-gray-100 text-center">ক্র. নং</th>
                                    <th className="border border-gray-400 px-2 py-1 bg-gray-100 text-center">সদস্যের নাম</th>
                                    <th className="border border-gray-400 px-2 py-1 bg-gray-100 text-center">সদস্য নম্বর</th>
                                    <th className="border border-gray-400 px-2 py-1 bg-gray-100 text-center">সমিতি নম্বর</th>
                                    <th colSpan={3} className="border border-gray-400 px-2 py-1 bg-gray-100 text-center">
                                        সঞ্চয়ের পরিমাণ
                                    </th>
                                    <th className="border border-gray-400 px-2 py-1 bg-gray-100 text-center">
                                        পরিশোধিত ঋণের পরিমাণ
                                    </th>
                                    <th className="border border-gray-400 px-2 py-1 bg-gray-100 text-center">
                                        পরিশোধিত দফা নম্বর
                                    </th>
                                    <th className="border border-gray-400 px-2 py-1 bg-gray-100 text-center">
                                        অন্যান্য সংস্থায় গ্রহণকৃত ঋণের পরিমাণ
                                    </th>
                                    <th className="border border-gray-400 px-2 py-1 bg-gray-100 text-center">
                                        প্রস্তাবিত ঋণের পরিমাণ
                                    </th>
                                    <th className="border border-gray-400 px-2 py-1 bg-gray-100 text-center">
                                        ঋণের মেয়াদ (বছর)
                                    </th>
                                    <th className="border border-gray-400 px-2 py-1 bg-gray-100 text-center">ঋণের ধরন</th>
                                    <th className="border border-gray-400 px-2 py-1 bg-gray-100 text-center">প্রকল্পের নাম</th>
                                    <th className="border border-gray-400 px-2 py-1 bg-gray-100 text-center">অনুমোদিত ঋণ</th>
                                    <th className="border border-gray-400 px-2 py-1 bg-gray-100 text-center">অনুমোদনকারী</th>
                                    <th className="border border-gray-400 px-2 py-1 bg-gray-100 text-center">অনুমোদনকারীর স্বাক্ষর / তারিখ</th>
                                </tr>
                                <tr>
                                    <th className="border border-gray-400 px-2 py-1 bg-gray-100 text-center" />
                                    <th className="border border-gray-400 px-2 py-1 bg-gray-100 text-center" />
                                    <th className="border border-gray-400 px-2 py-1 bg-gray-100 text-center" />
                                    <th className="border border-gray-400 px-2 py-1 bg-gray-100 text-center" />
                                    <th className="border border-gray-400 px-2 py-1 bg-gray-100 text-center">সাধারণ</th>
                                    <th className="border border-gray-400 px-2 py-1 bg-gray-100 text-center">অন্যান্য</th>
                                    <th className="border border-gray-400 px-2 py-1 bg-gray-100 text-center">মোট</th>
                                    <th className="border border-gray-400 px-2 py-1 bg-gray-100 text-center" />
                                    <th className="border border-gray-400 px-2 py-1 bg-gray-100 text-center" />
                                    <th className="border border-gray-400 px-2 py-1 bg-gray-100 text-center" />
                                    <th className="border border-gray-400 px-2 py-1 bg-gray-100 text-center" />
                                    <th className="border border-gray-400 px-2 py-1 bg-gray-100 text-center" />
                                    <th className="border border-gray-400 px-2 py-1 bg-gray-100 text-center" />
                                    <th className="border border-gray-400 px-2 py-1 bg-gray-100 text-center" />
                                    <th className="border border-gray-400 px-2 py-1 bg-gray-100 text-center" />
                                    <th className="border border-gray-400 px-2 py-1 bg-gray-100 text-center" />
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((row, idx) => (
                                    <tr key={idx}>
                                        <td className="border border-gray-300 px-2 py-1 text-center align-middle">
                                            {row.serial_no || idx + 1}
                                        </td>
                                        <td className="border border-gray-300 px-2 py-1">{row.member_name}</td>
                                        <td className="border border-gray-300 px-2 py-1">{row.member_code || ''}</td>
                                        <td className="border border-gray-300 px-2 py-1">{row.samity_number || ''}</td>
                                        <td className="border border-gray-300 px-2 py-1 text-right">
                                            {row.savings_general ?? ''}
                                        </td>
                                        <td className="border border-gray-300 px-2 py-1 text-right">
                                            {row.savings_other ?? ''}
                                        </td>
                                        <td className="border border-gray-300 px-2 py-1 text-right">
                                            {row.savings_total ?? ''}
                                        </td>
                                        <td className="border border-gray-300 px-2 py-1 text-right">
                                            {row.repaid_loan_amount ?? ''}
                                        </td>
                                        <td className="border border-gray-300 px-2 py-1 text-center">
                                            {row.repaid_installment_no ?? ''}
                                        </td>
                                        <td className="border border-gray-300 px-2 py-1 text-right align-top">
                                            <span className="whitespace-pre-line block text-left">{row.other_institution_loan_amount ?? ''}</span>
                                        </td>
                                        <td className="border border-gray-300 px-2 py-1 text-right">
                                            {row.proposed_loan_amount ?? ''}
                                        </td>
                                        <td className="border border-gray-300 px-2 py-1 text-center">
                                            {row.loan_term_years ?? ''}
                                        </td>
                                        <td className="border border-gray-300 px-2 py-1">{row.loan_type || ''}</td>
                                        <td className="border border-gray-300 px-2 py-1">{row.project_name || ''}</td>
                                        <td className="border border-gray-300 px-2 py-1 text-right">{row.approved_amount ?? ''}</td>
                                        <td className="border border-gray-300 px-2 py-1 text-center text-[10px]">
                                            {row.approvers && row.approvers.length > 0 ? row.approvers.map((a) => a.approver_name).filter(Boolean).join(', ') : ''}
                                        </td>
                                        <td className="border border-gray-300 px-2 py-1 text-center align-top">
                                            {(row.approvers && row.approvers.length > 0 ? row.approvers : []).map((a, i) => (
                                                <div key={i} className="flex flex-col items-center gap-0 py-0.5 border-b border-gray-100 last:border-0 text-[10px]">
                                                    {a.approver_signature && (
                                                        <img
                                                            src={a.approver_signature.startsWith('http') ? a.approver_signature : a.approver_signature.startsWith('/storage/') ? a.approver_signature : `/storage/${a.approver_signature}`}
                                                            alt=""
                                                            className="h-6 max-h-6 object-contain"
                                                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                        />
                                                    )}
                                                    <span className="text-gray-700">{a.decided_at || ''}</span>
                                                </div>
                                            ))}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}

