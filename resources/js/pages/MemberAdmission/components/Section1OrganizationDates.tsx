import React from 'react';
import type { MemberAdmissionFormData } from '@/types/memberAdmission';

interface Props {
    data: MemberAdmissionFormData;
    setData: (key: keyof MemberAdmissionFormData, value: any) => void;
    errors: Record<string, string>;
    validationErrors: Record<string, string>;
    branches: Array<{ id: number; name: string }>;
    availableSamities: Array<{ id: number; samity_name: string; branch_id: number }>;
    categories: Array<{ id: number; category_name: string }>;
    hasAllAccess: boolean;
    onBranchChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

export default function Section1OrganizationDates({
    data,
    setData,
    errors,
    validationErrors,
    branches,
    availableSamities,
    categories,
    hasAllAccess,
    onBranchChange,
}: Props) {
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Organization & Date</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Branch (শাখা) <span className="text-red-500">*</span>
                    </label>
                    <select
                        value={data.branch_id}
                        onChange={onBranchChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        disabled={!hasAllAccess}
                    >
                        <option value={0}>Select Branch</option>
                        {branches.map((branch) => (
                            <option key={branch.id} value={branch.id}>
                                {branch.name}
                            </option>
                        ))}
                    </select>
                    {(errors.branch_id || validationErrors.branch_id) && (
                        <p className="mt-1 text-sm text-red-600">{errors.branch_id || validationErrors.branch_id}</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        ১. Samity (সমিতি) <span className="text-red-500">*</span>
                    </label>
                    <select
                        value={data.samity_id}
                        onChange={(e) => setData('samity_id', Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled={!data.branch_id}
                    >
                        <option value={0}>Select Samity</option>
                        {availableSamities.map((samity) => (
                            <option key={samity.id} value={samity.id}>
                                {samity.samity_name}
                            </option>
                        ))}
                    </select>
                    {(errors.samity_id || validationErrors.samity_id) && (
                        <p className="mt-1 text-sm text-red-600">{errors.samity_id || validationErrors.samity_id}</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        ২. Member Category (সদস্য শ্রেণি) <span className="text-red-500">*</span>
                    </label>
                    <select
                        value={data.member_category_id}
                        onChange={(e) => setData('member_category_id', Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value={0}>Select Category</option>
                        {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.category_name}
                            </option>
                        ))}
                    </select>
                    {(errors.member_category_id || validationErrors.member_category_id) && (
                        <p className="mt-1 text-sm text-red-600">{errors.member_category_id || validationErrors.member_category_id}</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        জরিপের তারিখ <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="date"
                        value={data.survey_date}
                        onChange={(e) => setData('survey_date', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {(errors.survey_date || validationErrors.survey_date) && (
                        <p className="mt-1 text-sm text-red-600">{errors.survey_date || validationErrors.survey_date}</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        ভর্তির তারিখ <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="date"
                        value={data.admission_date}
                        onChange={(e) => setData('admission_date', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {(errors.admission_date || validationErrors.admission_date) && (
                        <p className="mt-1 text-sm text-red-600">{errors.admission_date || validationErrors.admission_date}</p>
                    )}
                </div>
            </div>
        </div>
    );
}
