import React from 'react';
import type { MemberAdmissionFormData } from '@/types/memberAdmission';

interface Props {
    data: MemberAdmissionFormData;
    setData: (key: keyof MemberAdmissionFormData, value: any) => void;
    errors: Record<string, string>;
}

export default function Section2PersonalInfo({ data, setData, errors }: Props) {
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        ৩. Applicant's Name (English) (আবেদনকারীর নাম - ইংরেজি) <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={data.applicant_name_en}
                        onChange={(e) => setData('applicant_name_en', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {errors.applicant_name_en && (
                        <p className="mt-1 text-sm text-red-600">{errors.applicant_name_en}</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        ৩. Applicant's Name (বাংলায়) (আবেদনকারীর নাম - বাংলা) <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={data.applicant_name_bn}
                        onChange={(e) => setData('applicant_name_bn', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {errors.applicant_name_bn && (
                        <p className="mt-1 text-sm text-red-600">{errors.applicant_name_bn}</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        ৪. Father's Name (English) (পিতার নাম - ইংরেজি) <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={data.father_name_en}
                        onChange={(e) => setData('father_name_en', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {errors.father_name_en && (
                        <p className="mt-1 text-sm text-red-600">{errors.father_name_en}</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        ৪. Father's Name (বাংলায়) (পিতার নাম - বাংলা) <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={data.father_name_bn}
                        onChange={(e) => setData('father_name_bn', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {errors.father_name_bn && (
                        <p className="mt-1 text-sm text-red-600">{errors.father_name_bn}</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        ৫. Mother's Name (English) (মাতার নাম - ইংরেজি) <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={data.mother_name_en}
                        onChange={(e) => setData('mother_name_en', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {errors.mother_name_en && (
                        <p className="mt-1 text-sm text-red-600">{errors.mother_name_en}</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        ৫. Mother's Name (বাংলায়) (মাতার নাম - বাংলা) <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={data.mother_name_bn}
                        onChange={(e) => setData('mother_name_bn', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {errors.mother_name_bn && (
                        <p className="mt-1 text-sm text-red-600">{errors.mother_name_bn}</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        ৭. বৈবাহিক অবস্থা (Marital Status) (বৈবাহিক অবস্থা) <span className="text-red-500">*</span>
                    </label>
                    <select
                        value={data.marital_status}
                        onChange={(e) => setData('marital_status', e.target.value as 'single' | 'married' | 'divorced' | 'widowed')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="single">Single</option>
                        <option value="married">Married</option>
                        <option value="divorced">Divorced</option>
                        <option value="widowed">Widowed</option>
                    </select>
                    {errors.marital_status && (
                        <p className="mt-1 text-sm text-red-600">{errors.marital_status}</p>
                    )}
                </div>

                {data.marital_status === 'married' && (
                    <>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                ৬. Spouse Name (English) (স্বামী/স্ত্রীর নাম - ইংরেজি)
                            </label>
                            <input
                                type="text"
                                value={data.spouse_name_en ?? ''}
                                onChange={(e) => setData('spouse_name_en', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                ৬. Spouse Name (বাংলায়) (স্বামী/স্ত্রীর নাম - বাংলা)
                            </label>
                            <input
                                type="text"
                                value={data.spouse_name_bn ?? ''}
                                onChange={(e) => setData('spouse_name_bn', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        ৮. মোবাইল নং (Mobile Number) (মোবাইল নং) <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="tel"
                        value={data.mobile_number}
                        onChange={(e) => setData('mobile_number', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {errors.mobile_number && (
                        <p className="mt-1 text-sm text-red-600">{errors.mobile_number}</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        ৯. বিকল্প মোবাইল নং (Alternative Mobile) (বিকল্প মোবাইল নং)
                    </label>
                    <input
                        type="tel"
                        value={data.alternative_mobile ?? ''}
                        onChange={(e) => setData('alternative_mobile', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            </div>
        </div>
    );
}
