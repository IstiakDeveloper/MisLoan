import { Head, Link, router, useForm } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { ChevronLeft, Plus, Trash2, Save } from 'lucide-react';
import React from 'react';

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
    loan_term_years: string;
    loan_type: string;
    project_name: string;
}

// Convert Bangla digits to English digits so that
// users can type বাংলা/English amount but calculations still work.
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

    // Remove common thousand separators so parseFloat works
    result = result.replace(/,/g, '');

    return result;
}

function toNumber(value: string): number {
    const normalized = normalizeNumericInput(value);
    const n = parseFloat(normalized);
    return Number.isFinite(n) ? n : 0;
}

function toBanglaDigits(value: string): string {
    if (!value) return '';
    const engToBanglaMap: Record<string, string> = {
        '0': '০',
        '1': '১',
        '2': '২',
        '3': '৩',
        '4': '৪',
        '5': '৫',
        '6': '৬',
        '7': '৭',
        '8': '৮',
        '9': '৯',
    };

    let result = '';
    for (const ch of value) {
        if (engToBanglaMap[ch] !== undefined) {
            result += engToBanglaMap[ch];
        } else {
            result += ch;
        }
    }

    return result;
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
    existingApproval?: ExistingApproval;
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
        loan_term_years: '',
        loan_type: '',
        project_name: '',
    };
}

export default function TeamBasedApprovalForm({ branch, approverOptions, today, existingApproval }: Props) {
    const isEdit = !!existingApproval;

    const { data, setData, post, put, processing, errors } = useForm({
        sheet_date: existingApproval?.sheet_date || today || '',
        approver_user_id: existingApproval?.approver_user_id
            ? String(existingApproval.approver_user_id)
            : '',
        items: (existingApproval?.items as RowItem[]) || ([makeEmptyRow()] as RowItem[]),
    });

    const handleRowChange = (index: number, field: keyof RowItem, value: string) => {
        const newItems = [...data.items];
        let newValue = value;

        // Only savings & loan_term: normalize to numeric. Other amount fields allow text+number.
        if (
            field === 'savings_general' ||
            field === 'savings_other' ||
            field === 'savings_total' ||
            field === 'loan_term_years'
        ) {
            newValue = normalizeNumericInput(value);
        }

        newItems[index] = { ...newItems[index], [field]: newValue };
        // Auto-update total savings for this row
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

        if (isEdit && existingApproval) {
            put(`/team-based-approvals/${existingApproval.id}`, {
                preserveScroll: true,
                onSuccess: () => {
                    router.visit('/team-based-approvals/drafts', {
                        preserveScroll: true,
                    });
                },
            });
        } else {
            post('/team-based-approvals/save-draft', {
                preserveScroll: true,
                onSuccess: () => {
                    router.visit('/team-based-approvals/drafts', {
                        preserveScroll: true,
                    });
                },
            });
        }
    };

    return (
        <AdminLayout>
            <Head title="Team Based Loan Approval Form" />

            <div className="max-w-[1600px] mx-auto py-6 px-2 sm:px-6">
                <div className="bg-white shadow rounded-lg border border-gray-200">
                    <div className="px-2 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex items-start gap-3">
                                <Link
                                    href="/team-based-approvals/drafts"
                                    className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-gray-300 text-gray-800 hover:bg-gray-100 active:bg-gray-200"
                                    aria-label="Back"
                                    title="Back"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Link>
                                <div>
                                    <h1 className="text-base sm:text-lg font-semibold text-gray-900 leading-tight">
                                        {isEdit ? 'Edit Team Based Draft' : 'Team Based Loan Disbursement & Approval Form'}
                                    </h1>
                                    <p className="text-xs text-gray-600 mt-1 leading-snug">
                                        শাখা: {branch.name} ({branch.code})
                                        {branch.area_name && `, এরিয়া: ${branch.area_name}`}
                                        {branch.zone_name && `, জোন: ${branch.zone_name}`}
                                    </p>
                                </div>
                            </div>

                            <div className="w-full sm:w-auto">
                                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                    Sheet Date
                                </label>
                                <input
                                    type="date"
                                    value={data.sheet_date}
                                    onChange={(e) => setData('sheet_date', e.target.value)}
                                    className="w-full sm:w-auto h-9 border border-gray-300 rounded-md px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                />
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="px-2 sm:px-6 py-4 pb-28 sm:pb-4 space-y-6">
                        {/* Approver selection */}
                        <div className="border border-gray-200 rounded-xl p-4 bg-gradient-to-r from-gray-50 to-white">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                <div>
                                    <h2 className="text-sm font-semibold text-gray-900">Approver Selection (Team Based)</h2>
                                    <p className="text-xs text-gray-600 mt-1">
                                        এই শিটটির জন্য মাত্র <span className="font-semibold">১ জন</span> অনুমোদনকারী নির্বাচন করুন। এই ব্যক্তি Area/Zone Manager বা
                                        ADMF/DMF/ED যে কেউ হতে পারেন (যাদের এই শাখায় অ্যাক্সেস আছে)।
                                    </p>
                                </div>
                                <div className="w-full sm:max-w-md">
                                    <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                        Approver (Select 1)
                                    </label>
                                    <select
                                        value={data.approver_user_id}
                                        onChange={(e) => setData('approver_user_id', e.target.value)}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                    >
                                        <option value="">নির্বাচন করুন</option>
                                        {approverOptions.map((u) => (
                                            <option key={u.id} value={u.id}>
                                                {u.name} ({u.role_name})
                                            </option>
                                        ))}
                                    </select>
                                    {errors.approver_user_id && (
                                        <p className="text-xs text-red-600 mt-1">{errors.approver_user_id}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ── MOBILE CARD EDITOR ─────────────────────────── */}
                        <div className="md:hidden space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900">Loan Rows</h3>
                                    <p className="text-xs text-gray-600 mt-0.5">মোবাইলে সহজভাবে প্রতি সারি কার্ড আকারে পূরণ করুন।</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={addRow}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    Add Row
                                </button>
                            </div>

                            {data.items.map((row, index) => (
                                <div key={index} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                                    <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-gray-200">
                                        <div className="flex items-center gap-2">
                                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-xs font-bold">
                                                {index + 1}
                                            </span>
                                            <div>
                                                <p className="text-xs font-semibold text-gray-900 leading-tight">
                                                    {row.member_name || 'নতুন সারি'}
                                                </p>
                                                <p className="text-[10px] text-gray-500 leading-tight">
                                                    সদস্য কোড: {row.member_code || '—'} • সমিতি: {row.samity_number || '—'}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeRow(index)}
                                            className="inline-flex items-center justify-center p-2 rounded-md bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-40"
                                            disabled={data.items.length === 1}
                                            title="সারি মুছুন"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="p-3 grid grid-cols-1 gap-3 text-sm">
                                        <div className="grid grid-cols-1 gap-3">
                                            <div>
                                                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">সদস্যের নাম</label>
                                                <input
                                                    type="text"
                                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                                                    value={row.member_name}
                                                    onChange={(e) => handleRowChange(index, 'member_name', e.target.value)}
                                                    placeholder="সদস্যের নাম"
                                                />
                                                {errors[`items.${index}.member_name` as keyof typeof errors] && (
                                                    <p className="text-xs text-red-600 mt-1">
                                                        {errors[`items.${index}.member_name` as keyof typeof errors] as string}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">সদস্য নম্বর</label>
                                                    <input
                                                        type="text"
                                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                                                        value={row.member_code}
                                                        onChange={(e) => handleRowChange(index, 'member_code', e.target.value)}
                                                        placeholder="কোড / ০ = নতুন"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">সমিতি নম্বর</label>
                                                    <input
                                                        type="text"
                                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                                                        value={row.samity_number}
                                                        onChange={(e) => handleRowChange(index, 'samity_number', e.target.value)}
                                                        placeholder="সমিতি নং"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                                            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">সঞ্চয়</p>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div>
                                                    <label className="block text-[10px] font-medium text-gray-600 mb-1">সাধারণ</label>
                                                    <input
                                                        type="text"
                                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-right bg-white"
                                                        value={row.savings_general}
                                                        onChange={(e) => handleRowChange(index, 'savings_general', e.target.value)}
                                                        inputMode="decimal"
                                                    />
                                                    {errors[`items.${index}.savings_general` as keyof typeof errors] && (
                                                        <p className="text-xs text-red-600 mt-1">
                                                            {errors[`items.${index}.savings_general` as keyof typeof errors] as string}
                                                        </p>
                                                    )}
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-medium text-gray-600 mb-1">অন্যান্য</label>
                                                    <input
                                                        type="text"
                                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-right bg-white"
                                                        value={row.savings_other}
                                                        onChange={(e) => handleRowChange(index, 'savings_other', e.target.value)}
                                                        inputMode="decimal"
                                                    />
                                                    {errors[`items.${index}.savings_other` as keyof typeof errors] && (
                                                        <p className="text-xs text-red-600 mt-1">
                                                            {errors[`items.${index}.savings_other` as keyof typeof errors] as string}
                                                        </p>
                                                    )}
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-medium text-gray-600 mb-1">মোট</label>
                                                    <input
                                                        type="text"
                                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-right bg-white"
                                                        value={row.savings_total}
                                                        onChange={(e) => handleRowChange(index, 'savings_total', e.target.value)}
                                                        inputMode="decimal"
                                                    />
                                                    {errors[`items.${index}.savings_total` as keyof typeof errors] && (
                                                        <p className="text-xs text-red-600 mt-1">
                                                            {errors[`items.${index}.savings_total` as keyof typeof errors] as string}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-[11px] text-gray-600 mt-2">
                                                টিপস: সাধারণ/অন্যান্য লিখলে মোট অটো হিসাব হবে।
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">পরিশোধিত মূল ঋণ</label>
                                                <input
                                                    type="text"
                                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-right"
                                                    value={row.repaid_loan_amount}
                                                    onChange={(e) => handleRowChange(index, 'repaid_loan_amount', e.target.value)}
                                                />
                                                {errors[`items.${index}.repaid_loan_amount` as keyof typeof errors] && (
                                                    <p className="text-xs text-red-600 mt-1">
                                                        {errors[`items.${index}.repaid_loan_amount` as keyof typeof errors] as string}
                                                    </p>
                                                )}
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">পরিশোধিত দফা</label>
                                                <input
                                                    type="text"
                                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-right"
                                                    value={row.repaid_installment_no}
                                                    onChange={(e) => handleRowChange(index, 'repaid_installment_no', e.target.value)}
                                                />
                                                {errors[`items.${index}.repaid_installment_no` as keyof typeof errors] && (
                                                    <p className="text-xs text-red-600 mt-1">
                                                        {errors[`items.${index}.repaid_installment_no` as keyof typeof errors] as string}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                                অন্যান্য সংস্থায় ঋণ (ঐচ্ছিক)
                                            </label>
                                            <textarea
                                                rows={3}
                                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm resize-y"
                                                value={row.other_institution_loan_amount}
                                                onChange={(e) => handleRowChange(index, 'other_institution_loan_amount', e.target.value)}
                                                placeholder="যেমন: আশা ৫০০০, ব্রাক ২০০০ (প্রতি লাইনে বা কমা দিয়ে)"
                                                title="একাধিক সংস্থা লিখতে প্রতি লাইনে বা কমা দিয়ে আলাদা করুন"
                                            />
                                            {errors[`items.${index}.other_institution_loan_amount` as keyof typeof errors] && (
                                                <p className="text-xs text-red-600 mt-1">
                                                    {errors[`items.${index}.other_institution_loan_amount` as keyof typeof errors] as string}
                                                </p>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">প্রস্তাবিত ঋণ</label>
                                                <input
                                                    type="text"
                                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-right"
                                                    value={row.proposed_loan_amount}
                                                    onChange={(e) => handleRowChange(index, 'proposed_loan_amount', e.target.value)}
                                                />
                                                {errors[`items.${index}.proposed_loan_amount` as keyof typeof errors] && (
                                                    <p className="text-xs text-red-600 mt-1">
                                                        {errors[`items.${index}.proposed_loan_amount` as keyof typeof errors] as string}
                                                    </p>
                                                )}
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">ঋণের মেয়াদ</label>
                                                <select
                                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
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
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-3">
                                            <div>
                                                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">ঋণের ধরন</label>
                                                <input
                                                    type="text"
                                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                                                    value={row.loan_type}
                                                    onChange={(e) => handleRowChange(index, 'loan_type', e.target.value)}
                                                    placeholder="ঋণের ধরন"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">প্রকল্পের নাম</label>
                                                <input
                                                    type="text"
                                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                                                    value={row.project_name}
                                                    onChange={(e) => handleRowChange(index, 'project_name', e.target.value)}
                                                    placeholder="প্রকল্পের নাম"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {errors.items && typeof errors.items === 'string' && (
                                <p className="text-xs text-red-600">{errors.items}</p>
                            )}
                        </div>

                        {/* ── DESKTOP TABLE EDITOR ───────────────────────── */}
                        <div className="hidden md:block">
                            {/* Data table */}
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
                                            পরিশোধিত মূল ঋণের পরিমাণ
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
                                            ঋণের মেয়াদ
                                        </th>
                                        <th rowSpan={2} className="border border-gray-400 px-2 py-1 bg-gray-100 text-center">
                                            ঋণের ধরন
                                        </th>
                                        <th rowSpan={2} className="border border-gray-400 px-2 py-1 bg-gray-100 text-center">
                                            প্রকল্পের নাম
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
                                                {errors[`items.${index}.savings_general` as keyof typeof errors] && (
                                                    <p className="text-[10px] text-red-500 mt-0.5">
                                                        {errors[`items.${index}.savings_general` as keyof typeof errors] as string}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="border border-gray-300 px-1 py-0.5">
                                                <input
                                                    type="text"
                                                    className="w-full border border-gray-200 rounded px-1 py-0.5 text-[11px] text-right"
                                                    value={row.savings_other}
                                                    onChange={(e) => handleRowChange(index, 'savings_other', e.target.value)}
                                                />
                                                {errors[`items.${index}.savings_other` as keyof typeof errors] && (
                                                    <p className="text-[10px] text-red-500 mt-0.5">
                                                        {errors[`items.${index}.savings_other` as keyof typeof errors] as string}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="border border-gray-300 px-1 py-0.5 bg-gray-50">
                                                <input
                                                    type="text"
                                                    className="w-full border border-gray-200 rounded px-1 py-0.5 text-[11px] text-right bg-gray-50"
                                                    value={row.savings_total}
                                                    onChange={(e) => handleRowChange(index, 'savings_total', e.target.value)}
                                                />
                                                {errors[`items.${index}.savings_total` as keyof typeof errors] && (
                                                    <p className="text-[10px] text-red-500 mt-0.5">
                                                        {errors[`items.${index}.savings_total` as keyof typeof errors] as string}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="border border-gray-300 px-1 py-0.5">
                                                <input
                                                    type="text"
                                                    className="w-full border border-gray-200 rounded px-1 py-0.5 text-[11px] text-right"
                                                    value={row.repaid_loan_amount}
                                                    onChange={(e) => handleRowChange(index, 'repaid_loan_amount', e.target.value)}
                                                />
                                                {errors[`items.${index}.repaid_loan_amount` as keyof typeof errors] && (
                                                    <p className="text-[10px] text-red-500 mt-0.5">
                                                        {errors[`items.${index}.repaid_loan_amount` as keyof typeof errors] as string}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="border border-gray-300 px-1 py-0.5">
                                                <input
                                                    type="text"
                                                    className="w-full border border-gray-200 rounded px-1 py-0.5 text-[11px] text-right"
                                                    value={row.repaid_installment_no}
                                                    onChange={(e) => handleRowChange(index, 'repaid_installment_no', e.target.value)}
                                                />
                                                {errors[`items.${index}.repaid_installment_no` as keyof typeof errors] && (
                                                    <p className="text-[10px] text-red-500 mt-0.5">
                                                        {errors[`items.${index}.repaid_installment_no` as keyof typeof errors] as string}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="border border-gray-300 px-1 py-0.5 align-top">
                                                <textarea
                                                    rows={2}
                                                    className="w-full min-w-[140px] border border-gray-200 rounded px-1 py-0.5 text-[11px] resize-y"
                                                    value={row.other_institution_loan_amount}
                                                    onChange={(e) =>
                                                        handleRowChange(index, 'other_institution_loan_amount', e.target.value)
                                                    }
                                                    placeholder="যেমন: আশা ৫০০০, ব্রাক ২০০০ (প্রতি লাইনে বা কমা দিয়ে)"
                                                    title="একাধিক সংস্থা লিখতে প্রতি লাইনে বা কমা দিয়ে আলাদা করুন"
                                                />
                                                {errors[`items.${index}.other_institution_loan_amount` as keyof typeof errors] && (
                                                    <p className="text-[10px] text-red-500 mt-0.5">
                                                        {
                                                            errors[
                                                                `items.${index}.other_institution_loan_amount` as keyof typeof errors
                                                            ] as string
                                                        }
                                                    </p>
                                                )}
                                            </td>
                                            <td className="border border-gray-300 px-1 py-0.5">
                                                <input
                                                    type="text"
                                                    className="w-full border border-gray-200 rounded px-1 py-0.5 text-[11px] text-right"
                                                    value={row.proposed_loan_amount}
                                                    onChange={(e) => handleRowChange(index, 'proposed_loan_amount', e.target.value)}
                                                />
                                                {errors[`items.${index}.proposed_loan_amount` as keyof typeof errors] && (
                                                    <p className="text-[10px] text-red-500 mt-0.5">
                                                        {errors[`items.${index}.proposed_loan_amount` as keyof typeof errors] as string}
                                                    </p>
                                                )}
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
                                <p className="text-xs text-red-600 mt-2">{errors.items}</p>
                            )}

                            <div className="flex items-center justify-between mt-4">
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
                                    {processing ? 'Saving...' : 'Save Draft'}
                                </button>
                            </div>
                        </div>

                        {/* Mobile sticky actions */}
                        <div className="md:hidden print:hidden sticky bottom-0 px-0 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] bg-white/95 backdrop-blur border-t border-gray-200">
                            <div className="grid grid-cols-2 gap-2 px-2">
                                <button
                                    type="button"
                                    onClick={addRow}
                                    className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-md border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-50"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    Add
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-md bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-60"
                                >
                                    <Save className="w-3.5 h-3.5" />
                                    {processing ? 'Saving…' : 'Save'}
                                </button>
                            </div>
                            <p className="mt-1.5 px-2 text-[10px] text-gray-500 leading-snug">
                                টিপস: সব সারি পূরণ করে <span className="font-semibold">Save Draft</span> দিন, পরে Draft List থেকে Submit করবেন।
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </AdminLayout>
    );
}

