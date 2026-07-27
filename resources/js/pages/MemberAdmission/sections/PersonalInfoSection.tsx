import React from 'react';
import FormSection from '@/components/MemberAdmission/FormSection';
import { User } from 'lucide-react';

interface PersonalInfoSectionProps {
    data: any;
    setData: (field: string, value: any) => void;
    errors: Record<string, string>;
}

export default function PersonalInfoSection({
    data,
    setData,
    errors,
}: PersonalInfoSectionProps) {
    const inputClass = (hasErr?: boolean) =>
        `w-full rounded-xl border ${hasErr ? 'border-red-500 bg-red-50/50 ring-2 ring-red-200' : 'border-gray-300 bg-white'} px-3 py-2 text-xs md:text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-medium transition-all`;

    return (
        <FormSection
            title="২. আবেদনকারীর নাম ও ব্যক্তিগত তথ্য"
            icon={<User className="w-4 h-4 text-indigo-600" />}
            subtitle="আবেদনকারী ও পিতা/মাতা/স্বামীর নামসমূহ (বাংলা ও ইংরেজি)"
        >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
                {/* কলাম ১ — বাংলা */}
                <div className="space-y-3">
                    <div>
                        <label className="mb-0.5 block text-xs font-semibold text-gray-700">
                            ৩. আবেদনকারীর নাম (বাংলায়) <span className="text-red-500 font-bold">*</span>
                        </label>
                        <input
                            type="text"
                            value={data.applicant_name_bn}
                            onChange={(e) => setData('applicant_name_bn', e.target.value)}
                            className={inputClass(Boolean(errors.applicant_name_bn))}
                        />
                        {errors.applicant_name_bn && (
                            <p className="mt-1 text-xs text-red-600 font-medium">{errors.applicant_name_bn}</p>
                        )}
                    </div>

                    <div>
                        <label className="mb-0.5 block text-xs font-semibold text-gray-700">
                            ৪. পিতার নাম (বাংলায়) <span className="text-red-500 font-bold">*</span>
                        </label>
                        <input
                            type="text"
                            value={data.father_name_bn}
                            onChange={(e) => setData('father_name_bn', e.target.value)}
                            className={inputClass(Boolean(errors.father_name_bn))}
                        />
                        {errors.father_name_bn && (
                            <p className="mt-1 text-xs text-red-600 font-medium">{errors.father_name_bn}</p>
                        )}
                    </div>

                    <div>
                        <label className="mb-0.5 block text-xs font-semibold text-gray-700">
                            ৫. মাতার নাম (বাংলায়) <span className="text-red-500 font-bold">*</span>
                        </label>
                        <input
                            type="text"
                            value={data.mother_name_bn}
                            onChange={(e) => setData('mother_name_bn', e.target.value)}
                            className={inputClass(Boolean(errors.mother_name_bn))}
                        />
                        {errors.mother_name_bn && (
                            <p className="mt-1 text-xs text-red-600 font-medium">{errors.mother_name_bn}</p>
                        )}
                    </div>

                    <div>
                        <label className="mb-0.5 block text-xs font-semibold text-gray-700">
                            ৬. বৈবাহিক অবস্থা <span className="text-red-500 font-bold">*</span>
                        </label>
                        <select
                            value={data.marital_status}
                            onChange={(e) => setData('marital_status', e.target.value)}
                            className={inputClass(Boolean(errors.marital_status))}
                        >
                            <option value="single">অবিবাহিত (Single)</option>
                            <option value="married">বিবাহিত (Married)</option>
                            <option value="widowed">বিধবা/বিপত্নীক (Widowed)</option>
                            <option value="divorced">ডিভোর্সড (Divorced)</option>
                        </select>
                        {errors.marital_status && (
                            <p className="mt-1 text-xs text-red-600 font-medium">{errors.marital_status}</p>
                        )}
                    </div>

                    {data.marital_status === 'married' && (
                        <div>
                            <label className="mb-0.5 block text-xs font-semibold text-gray-700">
                                স্বামীর/স্ত্রীর নাম (বাংলায়)
                            </label>
                            <input
                                type="text"
                                value={data.spouse_name_bn}
                                onChange={(e) => setData('spouse_name_bn', e.target.value)}
                                className={inputClass(Boolean(errors.spouse_name_bn))}
                            />
                            {errors.spouse_name_bn && (
                                <p className="mt-1 text-xs text-red-600 font-medium">{errors.spouse_name_bn}</p>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="mb-0.5 block text-xs font-semibold text-gray-700">
                            ৭. মোবাইল নম্বর <span className="text-red-500 font-bold">*</span>
                        </label>
                        <input
                            type="text"
                            value={data.mobile_number}
                            onChange={(e) => setData('mobile_number', e.target.value)}
                            placeholder="017xxxxxxxx"
                            className={inputClass(Boolean(errors.mobile_number))}
                        />
                        {errors.mobile_number && (
                            <p className="mt-1 text-xs text-red-600 font-medium">{errors.mobile_number}</p>
                        )}
                    </div>

                    <div>
                        <label className="mb-0.5 block text-xs font-semibold text-gray-700">
                            ৮. বিকল্প মোবাইল নম্বর (যদি থাকে)
                        </label>
                        <input
                            type="text"
                            value={data.alternative_mobile}
                            onChange={(e) => setData('alternative_mobile', e.target.value)}
                            className={inputClass(Boolean(errors.alternative_mobile))}
                        />
                    </div>
                </div>

                {/* কলাম ২ — ইংরেজি */}
                <div className="space-y-3">
                    <div>
                        <label className="mb-0.5 block text-xs font-semibold text-gray-700">
                            Applicant Name (English) <span className="text-red-500 font-bold">*</span>
                        </label>
                        <input
                            type="text"
                            value={data.applicant_name_en}
                            onChange={(e) => setData('applicant_name_en', e.target.value)}
                            className={inputClass(Boolean(errors.applicant_name_en))}
                        />
                        {errors.applicant_name_en && (
                            <p className="mt-1 text-xs text-red-600 font-medium">{errors.applicant_name_en}</p>
                        )}
                    </div>

                    <div>
                        <label className="mb-0.5 block text-xs font-semibold text-gray-700">
                            Father Name (English) <span className="text-red-500 font-bold">*</span>
                        </label>
                        <input
                            type="text"
                            value={data.father_name_en}
                            onChange={(e) => setData('father_name_en', e.target.value)}
                            className={inputClass(Boolean(errors.father_name_en))}
                        />
                        {errors.father_name_en && (
                            <p className="mt-1 text-xs text-red-600 font-medium">{errors.father_name_en}</p>
                        )}
                    </div>

                    <div>
                        <label className="mb-0.5 block text-xs font-semibold text-gray-700">
                            Mother Name (English) <span className="text-red-500 font-bold">*</span>
                        </label>
                        <input
                            type="text"
                            value={data.mother_name_en}
                            onChange={(e) => setData('mother_name_en', e.target.value)}
                            className={inputClass(Boolean(errors.mother_name_en))}
                        />
                        {errors.mother_name_en && (
                            <p className="mt-1 text-xs text-red-600 font-medium">{errors.mother_name_en}</p>
                        )}
                    </div>

                    {data.marital_status === 'married' && (
                        <div>
                            <label className="mb-0.5 block text-xs font-semibold text-gray-700">
                                Spouse Name (English)
                            </label>
                            <input
                                type="text"
                                value={data.spouse_name_en}
                                onChange={(e) => setData('spouse_name_en', e.target.value)}
                                className={inputClass(Boolean(errors.spouse_name_en))}
                            />
                        </div>
                    )}
                </div>
            </div>
        </FormSection>
    );
}
