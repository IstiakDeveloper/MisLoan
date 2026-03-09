import { Head, Link, router, useForm } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Plus, Trash2, Save } from 'lucide-react';

interface ApproverUser {
    id: number;
    name: string;
    role_name: string;
    level?: string;
}

interface BranchInfo {
    id: number;
    name: string;
    code: string;
    area_name?: string | null;
    zone_name?: string | null;
}

interface RowItem {
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

function toNumber(value: string): number {
    const normalized = normalizeNumericInput(value);
    const n = parseFloat(normalized);
    return Number.isFinite(n) ? n : 0;
}

interface ExistingApproval {
    id: number;
    sheet_date: string;
    approver_user_id: number | null;
    status: string;
    items: RowItem[];
}

interface Props {
    branch: BranchInfo;
    approverOptions: ApproverUser[];
    today: string;
    existingApproval: ExistingApproval;
}

function makeEmptyRow(): RowItem {
    return {
        member_name: '',
        member_code: '',
        samity_number: '',
        savings_general: '',
        savings_other: '',
        savings_total: '',
        repaid_loan_amount: '',
        repaid_installment_no: '',
        other_institution_loan_amount: '',
        proposed_loan_amount: '',
        approved_amount: '',
        loan_term_years: '',
        loan_type: '',
        project_name: '',
        review_comments: '',
    };
}

export default function HeadOfficeTeamBasedApprovalEdit({ branch, approverOptions, today, existingApproval }: Props) {
    const { data, setData, put, processing, errors } = useForm({
        sheet_date: existingApproval?.sheet_date || today || '',
        approver_user_id: existingApproval?.approver_user_id ? String(existingApproval.approver_user_id) : '',
        items: (existingApproval?.items as RowItem[]) || ([makeEmptyRow()] as RowItem[]),
    });

    const handleRowChange = (index: number, field: keyof RowItem, value: string) => {
        const newItems = [...data.items];
        let newValue = value;

        if (
            field === 'savings_general' ||
            field === 'savings_other' ||
            field === 'savings_total' ||
            field === 'repaid_loan_amount' ||
            field === 'repaid_installment_no' ||
            field === 'other_institution_loan_amount' ||
            field === 'proposed_loan_amount' ||
            field === 'approved_amount' ||
            field === 'loan_term_years'
        ) {
            newValue = normalizeNumericInput(value);
        }

        newItems[index] = { ...newItems[index], [field]: newValue };

        if (field === 'savings_general' || field === 'savings_other') {
            const g = toNumber(newItems[index].savings_general || '0');
            const o = toNumber(newItems[index].savings_other || '0');
            const total = g + o;
            newItems[index].savings_total = total > 0 ? String(total) : '';
        }

        setData('items', newItems);
    };

    const addRow = () => {
        setData('items', [...data.items, makeEmptyRow()]);
    };

    const removeRow = (index: number) => {
        if (data.items.length === 1) return;
        setData(
            'items',
            data.items.filter((_, i) => i !== index),
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        put(`/head-office/team-based-approvals/${existingApproval.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                router.visit('/head-office/team-based-approvals', {
                    preserveScroll: true,
                });
            },
        });
    };

    return (
        <AdminLayout>
            <Head title="Head Office - Edit Team Based Sheet" />

            <div className="max-w-[1600px] mx-auto py-6">
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
                                    Head Office: Team Based Sheet Edit
                                </h1>
                                <p className="text-xs text-gray-600 mt-1">
                                    শাখা: {branch.name} ({branch.code})
                                    {branch.area_name && `, এরিয়া: ${branch.area_name}`}
                                    {branch.zone_name && `, জোন: ${branch.zone_name}`}
                                </p>
                                <p className="text-xs text-gray-500">
                                    বর্তমান স্ট্যাটাস: <span className="font-semibold uppercase">{existingApproval.status}</span>
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-700">তারিখ:</label>
                            <input
                                type="date"
                                value={data.sheet_date}
                                onChange={(e) => setData('sheet_date', e.target.value)}
                                className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="px-6 py-4 space-y-6">
                        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                            <h2 className="text-sm font-semibold text-gray-900 mb-3">Approver Selection</h2>
                            <p className="text-xs text-gray-600 mb-3">
                                এই শিটটির জন্য মাত্র <span className="font-semibold">১ জন</span> অনুমোদনকারী নির্বাচন করুন (Area/Zone Manager বা ADMF/DMF/ED)।
                            </p>
                            <div className="max-w-md">
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    অনুমোদনকারী (Select 1 Approver)
                                </label>
                                <select
                                    value={data.approver_user_id}
                                    onChange={(e) => setData('approver_user_id', e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="">নির্বাচন করুন</option>
                                    {approverOptions.map((u) => (
                                        <option key={u.id} value={u.id}>
                                            {u.name} ({u.role_name})
                                        </option>
                                    ))}
                                </select>
                                {errors.approver_user_id && (
                                    <p className="text-xs text-red-500 mt-1">{errors.approver_user_id}</p>
                                )}
                            </div>
                        </div>

                        <div className="border border-gray-300 rounded-lg overflow-x-auto">
                            <table className="min-w-full border-collapse text-[12px]">
                                <thead>
                                    <tr>
                                        <th rowSpan={2} className="border border-gray-400 px-2 py-1 bg-gray-100 text-center">
                                            ক্র. নং
                                        </th>
                                        <th rowSpan={2} className="border border-gray-400 px-2 py-1 bg-gray-100 text-center">
                                            সদস্যের নাম
                                        </th>
                                        <th rowSpan={2} className="border border-gray-400 px-2 py-1 bg-gray-100 text-center">
                                            সদস্য নম্বর
                                        </th>
                                        <th rowSpan={2} className="border border-gray-400 px-2 py-1 bg-gray-100 text-center">
                                            সমিতি নম্বর
                                        </th>
                                        <th colSpan={3} className="border border-gray-400 px-2 py-1 bg-gray-100 text-center">
                                            সঞ্চয়ের পরিমাণ
                                        </th>
                                        <th rowSpan={2} className="border border-gray-400 px-2 py-1 bg-gray-100 text-center">
                                            পরিশোধিত ঋণের পরিমাণ
                                        </th>
                                        <th rowSpan={2} className="border border-gray-400 px-2 py-1 bg-gray-100 text-center">
                                            পরিশোধিত দফা নম্বর
                                        </th>
                                        <th rowSpan={2} className="border border-gray-400 px-2 py-1 bg-gray-100 text-center">
                                            অন্যান্য সংস্থায় গ্রহণকৃত ঋণের পরিমাণ
                                        </th>
                                        <th rowSpan={2} className="border border-gray-400 px-2 py-1 bg-gray-100 text-center">
                                            প্রস্তাবিত ঋণের পরিমাণ
                                        </th>
                                        <th rowSpan={2} className="border border-gray-400 px-2 py-1 bg-gray-100 text-center">
                                            অনুমোদিত ঋণের পরিমাণ
                                        </th>
                                        <th rowSpan={2} className="border border-gray-400 px-2 py-1 bg-gray-100 text-center">
                                            ঋণের মেয়াদ
                                        </th>
                                        <th rowSpan={2} className="border border-gray-400 px-2 py-1 bg-gray-100 text-center">
                                            ঋণের ধরন
                                        </th>
                                        <th rowSpan={2} className="border border-gray-400 px-2 py-1 bg-gray-100 text-center">
                                            প্রকল্পের নাম
                                        </th>
                                        <th rowSpan={2} className="border border-gray-400 px-2 py-1 bg-gray-100 text-center">
                                            মন্তব্য
                                        </th>
                                        <th rowSpan={2} className="border border-gray-400 px-1 py-1 bg-gray-100 text-center">
                                            কার্য
                                        </th>
                                    </tr>
                                    <tr>
                                        <th className="border border-gray-400 px-2 py-1 bg-gray-100 text-center">সাধারণ</th>
                                        <th className="border border-gray-400 px-2 py-1 bg-gray-100 text-center">অন্যান্য</th>
                                        <th className="border border-gray-400 px-2 py-1 bg-gray-100 text-center">মোট</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.items.map((row, index) => (
                                        <tr key={index}>
                                            <td className="border border-gray-300 px-2 py-1 text-center align-middle">{index + 1}</td>
                                            <td className="border border-gray-300 px-1 py-0.5">
                                                <input
                                                    type="text"
                                                    className="w-full border border-gray-200 rounded px-1 py-0.5 text-[11px]"
                                                    value={row.member_name}
                                                    onChange={(e) => handleRowChange(index, 'member_name', e.target.value)}
                                                    placeholder="সদস্যের নাম"
                                                />
                                                {errors[`items.${index}.member_name` as keyof typeof errors] && (
                                                    <p className="text-[10px] text-red-500 mt-0.5">
                                                        {errors[`items.${index}.member_name` as keyof typeof errors] as string}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="border border-gray-300 px-1 py-0.5">
                                                <input
                                                    type="text"
                                                    className="w-full border border-gray-200 rounded px-1 py-0.5 text-[11px]"
                                                    value={row.member_code}
                                                    onChange={(e) => handleRowChange(index, 'member_code', e.target.value)}
                                                    placeholder="কোড / ০ = নতুন"
                                                />
                                            </td>
                                            <td className="border border-gray-300 px-1 py-0.5">
                                                <input
                                                    type="text"
                                                    className="w-full border border-gray-200 rounded px-1 py-0.5 text-[11px]"
                                                    value={row.samity_number}
                                                    onChange={(e) => handleRowChange(index, 'samity_number', e.target.value)}
                                                    placeholder="সমিতি নং"
                                                />
                                            </td>
                                            <td className="border border-gray-300 px-1 py-0.5">
                                                <input
                                                    type="text"
                                                    className="w-full border border-gray-200 rounded px-1 py-0.5 text-[11px] text-right"
                                                    value={row.savings_general}
                                                    onChange={(e) => handleRowChange(index, 'savings_general', e.target.value)}
                                                />
                                            </td>
                                            <td className="border border-gray-300 px-1 py-0.5">
                                                <input
                                                    type="text"
                                                    className="w-full border border-gray-200 rounded px-1 py-0.5 text-[11px] text-right"
                                                    value={row.savings_other}
                                                    onChange={(e) => handleRowChange(index, 'savings_other', e.target.value)}
                                                />
                                            </td>
                                            <td className="border border-gray-300 px-1 py-0.5 bg-gray-50">
                                                <input
                                                    type="text"
                                                    className="w-full border border-gray-200 rounded px-1 py-0.5 text-[11px] text-right bg-gray-50"
                                                    value={row.savings_total}
                                                    onChange={(e) => handleRowChange(index, 'savings_total', e.target.value)}
                                                />
                                            </td>
                                            <td className="border border-gray-300 px-1 py-0.5">
                                                <input
                                                    type="text"
                                                    className="w-full border border-gray-200 rounded px-1 py-0.5 text-[11px] text-right"
                                                    value={row.repaid_loan_amount}
                                                    onChange={(e) => handleRowChange(index, 'repaid_loan_amount', e.target.value)}
                                                />
                                            </td>
                                            <td className="border border-gray-300 px-1 py-0.5">
                                                <input
                                                    type="text"
                                                    className="w-full border border-gray-200 rounded px-1 py-0.5 text-[11px] text-right"
                                                    value={row.repaid_installment_no}
                                                    onChange={(e) => handleRowChange(index, 'repaid_installment_no', e.target.value)}
                                                />
                                            </td>
                                            <td className="border border-gray-300 px-1 py-0.5">
                                                <input
                                                    type="text"
                                                    className="w-full border border-gray-200 rounded px-1 py-0.5 text-[11px] text-right"
                                                    value={row.other_institution_loan_amount}
                                                    onChange={(e) =>
                                                        handleRowChange(index, 'other_institution_loan_amount', e.target.value)
                                                    }
                                                />
                                            </td>
                                            <td className="border border-gray-300 px-1 py-0.5">
                                                <input
                                                    type="text"
                                                    className="w-full border border-gray-200 rounded px-1 py-0.5 text-[11px] text-right"
                                                    value={row.proposed_loan_amount}
                                                    onChange={(e) => handleRowChange(index, 'proposed_loan_amount', e.target.value)}
                                                />
                                            </td>
                                            <td className="border border-gray-300 px-1 py-0.5">
                                                <input
                                                    type="text"
                                                    className="w-full border border-gray-200 rounded px-1 py-0.5 text-[11px] text-right"
                                                    value={row.approved_amount}
                                                    onChange={(e) => handleRowChange(index, 'approved_amount', e.target.value)}
                                                />
                                            </td>
                                            <td className="border border-gray-300 px-1 py-0.5">
                                                <select
                                                    className="w-full border border-gray-200 rounded px-1 py-0.5 text-[11px]"
                                                    value={row.loan_term_years}
                                                    onChange={(e) => handleRowChange(index, 'loan_term_years', e.target.value)}
                                                >
                                                    <option value="">নির্বাচন</option>
                                                    <option value="0.5">৬ মাস</option>
                                                    <option value="1">১ বছর</option>
                                                    <option value="1.5">১.৫ বছর</option>
                                                    <option value="2">২ বছর</option>
                                                    <option value="3">৩ বছর</option>
                                                </select>
                                            </td>
                                            <td className="border border-gray-300 px-1 py-0.5">
                                                <input
                                                    type="text"
                                                    className="w-full border border-gray-200 rounded px-1 py-0.5 text-[11px]"
                                                    value={row.loan_type}
                                                    onChange={(e) => handleRowChange(index, 'loan_type', e.target.value)}
                                                    placeholder="ঋণের ধরন"
                                                />
                                            </td>
                                            <td className="border border-gray-300 px-1 py-0.5">
                                                <input
                                                    type="text"
                                                    className="w-full border border-gray-200 rounded px-1 py-0.5 text-[11px]"
                                                    value={row.project_name}
                                                    onChange={(e) => handleRowChange(index, 'project_name', e.target.value)}
                                                    placeholder="প্রকল্পের নাম"
                                                />
                                            </td>
                                            <td className="border border-gray-300 px-1 py-0.5">
                                                <input
                                                    type="text"
                                                    className="w-full border border-gray-200 rounded px-1 py-0.5 text-[11px]"
                                                    value={row.review_comments}
                                                    onChange={(e) => handleRowChange(index, 'review_comments', e.target.value)}
                                                    placeholder="মন্তব্য"
                                                />
                                            </td>
                                            <td className="border border-gray-300 px-1 py-0.5 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => removeRow(index)}
                                                    className="inline-flex items-center justify-center p-1 rounded bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-40"
                                                    disabled={data.items.length === 1}
                                                    title="সারি মুছুন"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {errors.items && typeof errors.items === 'string' && (
                            <p className="text-xs text-red-500">{errors.items}</p>
                        )}

                        <div className="flex items-center justify-between">
                            <button
                                type="button"
                                onClick={addRow}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100"
                            >
                                <Plus className="w-4 h-4" />
                                Add Row
                            </button>

                            <button
                                type="submit"
                                disabled={processing}
                                className="inline-flex items-center gap-1 px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
                            >
                                <Save className="w-4 h-4" />
                                {processing ? 'Updating...' : 'Update Sheet'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AdminLayout>
    );
}

