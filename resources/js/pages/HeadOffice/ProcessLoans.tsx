import React from 'react';
import { Head, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Search, Calendar, FileText, Eye, AlertCircle, CheckCircle } from 'lucide-react';

interface Issue {
    id: number;
    issue_description: string;
    reporter: { name: string };
}

interface Loan {
    id: number;
    application_no: string;
    requested_amount: number;
    submitted_at: string;
    branch: { name: string };
    loan_product: { product_name_bn: string; product_code: string };
    loan_category: { category_name_bn: string };
    member_admission: { applicant_name_bn: string; applicant_name_en?: string; nid_number?: string; mobile_number?: string };
    issues: Issue[];
}

interface Props {
    loans: {
        data: Loan[];
        current_page: number;
        last_page: number;
        total: number;
    };
    filters: { date: string; search?: string };
}

export default function ProcessLoans({ loans, filters }: Props) {
    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        router.get('/head-office/process-loans', {
            date: e.target.value,
            search: filters.search,
        }, { preserveState: true });
    };

    const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        router.get('/head-office/process-loans', {
            date: filters.date,
            search: formData.get('search'),
        }, { preserveState: true });
    };

    const handleApproveAll = () => {
        if (confirm(`Approve all loan applications for ${filters.date}?\n\nOnly applications with no issues will be approved. Those with issues will remain pending.`)) {
            router.post('/head-office/loans/approve-all', {
                date: filters.date,
            }, { preserveScroll: true });
        }
    };

    return (
        <AdminLayout>
            <Head title="Head Office - Process Loan Applications (হেড অফিস - ঋণ আবেদন প্রসেস)" />

            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <FileText className="w-8 h-8 text-blue-600" />
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Loan Applications (Head Office)</h1>
                            <p className="text-sm text-gray-600">Review loan applications sent from branch/area/zone. Add issues if needed, otherwise approve.</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleApproveAll}
                        className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                        <CheckCircle className="w-5 h-5" />
                        Approve All
                    </button>
                </div>

                <div className="bg-white rounded-lg shadow border p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Calendar className="w-4 h-4 inline mr-2" /> Date (তারিখ)
                            </label>
                            <input
                                type="date"
                                value={filters.date}
                                onChange={handleDateChange}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Search className="w-4 h-4 inline mr-2" /> Search (খুঁজুন)
                            </label>
                            <form onSubmit={handleSearch}>
                                <input
                                    type="text"
                                    name="search"
                                    defaultValue={filters.search}
                                    placeholder="Name, NID, Mobile, Application No... (নাম, NID, মোবাইল, আবেদন নং)"
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </form>
                        </div>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">Total: {loans.total} application(s) (মোট: {loans.total} টি আবেদন)</p>
                </div>

                <div className="bg-white rounded-lg shadow border overflow-hidden">
                    {loans.data.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                            <p className="text-lg font-medium">No loan applications (কোন ঋণ আবেদন নেই)</p>
                            <p className="text-sm">Change date or search (তারিখ বা খুঁজুন পরিবর্তন করুন)</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Application No. (আবেদন নং)</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Member (সদস্য)</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category / Product (ক্যাটাগরি/পণ্য)</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount (পরিমাণ)</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch (শাখা)</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted Date (জমার তারিখ)</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issues (সমস্যা)</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Action (অ্যাকশন)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {loans.data.map((loan) => (
                                        <tr key={loan.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{loan.application_no}</td>
                                            <td className="px-4 py-3 text-sm">
                                                <p className="font-medium">{loan.member_admission?.applicant_name_bn}</p>
                                                <p className="text-xs text-gray-500">{loan.member_admission?.mobile_number}</p>
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                <p>{loan.loan_category?.category_name_bn}</p>
                                                <p className="text-xs text-gray-500">{loan.loan_product?.product_name_bn}</p>
                                            </td>
                                            <td className="px-4 py-3 text-sm font-medium">৳{Number(loan.requested_amount).toLocaleString()}</td>
                                            <td className="px-4 py-3 text-sm">{loan.branch?.name}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                {loan.submitted_at ? new Date(loan.submitted_at).toLocaleDateString('bn-BD') : '-'}
                                            </td>
                                            <td className="px-4 py-3">
                                                {loan.issues?.length > 0 ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 text-xs rounded">
                                                        <AlertCircle className="w-3.5 h-3.5" />
                                                        {loan.issues.length}
                                                    </span>
                                                ) : (
                                                    <span className="text-green-600 text-xs">No issues (কোন সমস্যা নেই)</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    onClick={() => router.visit(`/head-office/loans/${loan.id}`)}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                    View (দেখুন)
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
