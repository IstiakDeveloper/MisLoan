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
    other_institution_loan_amount?: number | null;
    proposed_loan_amount?: number | null;
    loan_term_years?: number | null;
    loan_type?: string | null;
    project_name?: string | null;
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
            <Head title="Team Based Approval - Print" />

            <div className="max-w-6xl mx-auto py-6 px-4 print:px-0">
                <div className="print:hidden flex justify-end mb-4">
                    <button
                        type="button"
                        onClick={handlePrint}
                        className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                    >
                        Print
                    </button>
                </div>

                <div className="bg-white border border-gray-300 rounded-lg shadow-sm p-4 print:shadow-none print:border-0">
                    <div className="flex flex-col items-center mb-4">
                        <h1 className="text-lg font-bold text-gray-900">টিম ভিত্তিক ঋণ বণ্টন ও অনুমোদন সংগ্রহ ফরম</h1>
                        <p className="text-xs text-gray-700 mt-1">
                            শাখা: {sheet.branch.name} ({sheet.branch.code})
                            {sheet.branch.area_name && `, এরিয়া: ${sheet.branch.area_name}`}
                            {sheet.branch.zone_name && `, জোন: ${sheet.branch.zone_name}`}
                        </p>
                        <p className="text-xs text-gray-700 mt-0.5">
                            তারিখ: {sheet.sheet_date || '-'} | অনুমোদনকারী: {sheet.approver_name || '-'}
                        </p>
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
                                        <td className="border border-gray-300 px-2 py-1 text-right">
                                            {row.other_institution_loan_amount ?? ''}
                                        </td>
                                        <td className="border border-gray-300 px-2 py-1 text-right">
                                            {row.proposed_loan_amount ?? ''}
                                        </td>
                                        <td className="border border-gray-300 px-2 py-1 text-center">
                                            {row.loan_term_years ?? ''}
                                        </td>
                                        <td className="border border-gray-300 px-2 py-1">{row.loan_type || ''}</td>
                                        <td className="border border-gray-300 px-2 py-1">{row.project_name || ''}</td>
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

