import { Head, Link, router, useForm } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Save } from 'lucide-react';

interface BranchInfo {
    id: number;
    name: string;
    code: string;
    area_name?: string | null;
    zone_name?: string | null;
}

interface ItemPayload {
    id: number;
    sheet_date: string;
    status: string;
    member_name: string;
    member_code: string;
    samity_number: string;
    savings_general: string;
    savings_other: string;
    savings_total: string;
    repaid_loan_amount: string;
    repaid_installment_no: string;
    other_institution_loan_amount: string;
    proposed_loan_amount: string;
    approved_amount: string;
    loan_term_years: string;
    loan_type: string;
    project_name: string;
    review_comments: string;
}

function normalizeNumericInput(value: string): string {
    if (!value) return '';
    const banglaToEnglishMap: Record<string, string> = {
        '০': '0',
        '১': '1',
        '২': '2',
        '৩': '3',
        '৪': '4',
        '৫': '5',
        '৬': '6',
        '৭': '7',
        '৮': '8',
        '৯': '9',
    };

    let result = '';
    for (const ch of value) {
        if (banglaToEnglishMap[ch] !== undefined) {
            result += banglaToEnglishMap[ch];
        } else {
            result += ch;
        }
    }

    return result.replace(/,/g, '');
}

interface Props {
    branch: BranchInfo;
    item: ItemPayload;
}

export default function HeadOfficeTeamBasedItemEdit({ branch, item }: Props) {
    const { data, setData, put, processing, errors } = useForm({
        member_name: item.member_name,
        member_code: item.member_code,
        samity_number: item.samity_number,
        savings_general: item.savings_general,
        savings_other: item.savings_other,
        savings_total: item.savings_total,
        repaid_loan_amount: item.repaid_loan_amount,
        repaid_installment_no: item.repaid_installment_no,
        other_institution_loan_amount: item.other_institution_loan_amount,
        proposed_loan_amount: item.proposed_loan_amount,
        approved_amount: item.approved_amount,
        loan_term_years: item.loan_term_years,
        loan_type: item.loan_type,
        project_name: item.project_name,
        review_comments: item.review_comments,
    });

    const handleNumberChange = (field: keyof typeof data, value: string) => {
        setData(field, normalizeNumericInput(value));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        put(`/head-office/team-based-approvals/items/${item.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                router.visit('/head-office/team-based-approvals', { preserveScroll: true });
            },
        });
    };

    return (
        <AdminLayout>
            <Head title="Head Office - Edit Team Based Item" />

            <div className="max-w-4xl mx-auto py-6">
                <div className="bg-white shadow rounded-lg border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Link
                                href="/head-office/team-based-approvals"
                                className="inline-flex items-center px-3 py-1.5 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100"
                            >
                                Back
                            </Link>
                            <div>
                                <h1 className="text-lg font-semibold text-gray-900">
                                    Head Office: Single Loan Row Edit
                                </h1>
                                <p className="text-xs text-gray-600 mt-1">
                                    শাখা: {branch.name} ({branch.code})
                                    {branch.area_name && `, এরিয়া: ${branch.area_name}`}
                                    {branch.zone_name && `, জোন: ${branch.zone_name}`}
                                </p>
                                <p className="text-xs text-gray-500">
                                    শিটের তারিখ: <span className="font-semibold">{item.sheet_date}</span> ·
                                    স্ট্যাটাস: <span className="font-semibold uppercase">{item.status}</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4 text-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">সদস্যের নাম</label>
                                <input
                                    type="text"
                                    value={data.member_name}
                                    onChange={(e) => setData('member_name', e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-2 py-1"
                                />
                                {errors.member_name && (
                                    <p className="text-[11px] text-red-500 mt-0.5">{errors.member_name}</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">সদস্য নম্বর</label>
                                <input
                                    type="text"
                                    value={data.member_code}
                                    onChange={(e) => setData('member_code', e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-2 py-1"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">সমিতি নম্বর</label>
                                <input
                                    type="text"
                                    value={data.samity_number}
                                    onChange={(e) => setData('samity_number', e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-2 py-1"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">সঞ্চয় (সাধারণ)</label>
                                <input
                                    type="text"
                                    value={data.savings_general}
                                    onChange={(e) => handleNumberChange('savings_general', e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-2 py-1 text-right"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">সঞ্চয় (অন্যান্য)</label>
                                <input
                                    type="text"
                                    value={data.savings_other}
                                    onChange={(e) => handleNumberChange('savings_other', e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-2 py-1 text-right"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">সঞ্চয় (মোট)</label>
                                <input
                                    type="text"
                                    value={data.savings_total}
                                    onChange={(e) => handleNumberChange('savings_total', e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-2 py-1 text-right"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    পরিশোধিত ঋণের পরিমাণ
                                </label>
                                <input
                                    type="text"
                                    value={data.repaid_loan_amount}
                                    onChange={(e) => handleNumberChange('repaid_loan_amount', e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-2 py-1 text-right"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    পরিশোধিত দফা নম্বর
                                </label>
                                <input
                                    type="text"
                                    value={data.repaid_installment_no}
                                    onChange={(e) => handleNumberChange('repaid_installment_no', e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-2 py-1 text-right"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    অন্যান্য সংস্থায় গ্রহণকৃত ঋণের পরিমাণ
                                </label>
                                <input
                                    type="text"
                                    value={data.other_institution_loan_amount}
                                    onChange={(e) => handleNumberChange('other_institution_loan_amount', e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-2 py-1 text-right"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    প্রস্তাবিত ঋণের পরিমাণ
                                </label>
                                <input
                                    type="text"
                                    value={data.proposed_loan_amount}
                                    onChange={(e) => handleNumberChange('proposed_loan_amount', e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-2 py-1 text-right"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    অনুমোদিত ঋণের পরিমাণ
                                </label>
                                <input
                                    type="text"
                                    value={data.approved_amount}
                                    onChange={(e) => handleNumberChange('approved_amount', e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-2 py-1 text-right"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">ঋণের মেয়াদ</label>
                                <select
                                    value={data.loan_term_years}
                                    onChange={(e) => setData('loan_term_years', e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-2 py-1"
                                >
                                    <option value="">নির্বাচন</option>
                                    <option value="0.5">৬ মাস</option>
                                    <option value="1">১ বছর</option>
                                    <option value="1.5">১.৫ বছর</option>
                                    <option value="2">২ বছর</option>
                                    <option value="3">৩ বছর</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">ঋণের ধরন</label>
                                <input
                                    type="text"
                                    value={data.loan_type}
                                    onChange={(e) => setData('loan_type', e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-2 py-1"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">প্রকল্পের নাম</label>
                                <input
                                    type="text"
                                    value={data.project_name}
                                    onChange={(e) => setData('project_name', e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-2 py-1"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">মন্তব্য</label>
                            <textarea
                                rows={3}
                                value={data.review_comments}
                                onChange={(e) => setData('review_comments', e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                                placeholder="অনুমোদনকারীর মন্তব্য / নোট"
                            />
                        </div>

                        <div className="flex items-center justify-end">
                            <button
                                type="submit"
                                disabled={processing}
                                className="inline-flex items-center gap-1 px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
                            >
                                <Save className="w-4 h-4" />
                                {processing ? 'Updating...' : 'Update Row'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AdminLayout>
    );
}

