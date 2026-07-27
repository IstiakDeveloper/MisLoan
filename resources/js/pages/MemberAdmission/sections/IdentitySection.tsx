import React from 'react';
import FormSection from '@/components/MemberAdmission/FormSection';
import { SmartDateInput } from '@/components/ui/SmartDateInput';
import { FileText } from 'lucide-react';

interface IdentitySectionProps {
    data: any;
    setData: (field: string, value: any) => void;
    errors: Record<string, string>;
}

export default function IdentitySection({
    data,
    setData,
    errors,
}: IdentitySectionProps) {
    const inputClass = (hasErr?: boolean) =>
        `w-full rounded-xl border ${hasErr ? 'border-red-500 bg-red-50/50 ring-2 ring-red-200' : 'border-gray-300 bg-white'} px-3 py-2 text-xs md:text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-medium transition-all`;

    return (
        <FormSection
            title="৪. জাতীয় পরিচয়পত্র ও ডকুমেন্টস"
            icon={<FileText className="w-4 h-4 text-purple-600" />}
            subtitle="NID, স্মার্ট কার্ড, জন্ম সনদ ও প্রফেশনাল ফটো আপলোড"
        >
            <div className="space-y-4">
                <h4 className="text-xs font-bold text-gray-800 mb-2">১২. Identity Information (পরিচয় তথ্য)</h4>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                    <div>
                        <label className="mb-0.5 block text-xs font-semibold text-gray-700">
                            National ID No. (জাতীয় পরিচয়পত্র)
                        </label>
                        <input
                            type="text"
                            placeholder="এনআইডি নম্বর"
                            value={data.nid_number}
                            onChange={(e) => setData('nid_number', e.target.value)}
                            className={inputClass(Boolean(errors.nid_number))}
                        />
                        {errors.nid_number && (
                            <p className="mt-1 text-xs text-red-600 font-medium">{errors.nid_number}</p>
                        )}
                    </div>

                    <div>
                        <label className="mb-0.5 block text-xs font-semibold text-gray-700">Smart Card No.</label>
                        <input
                            type="text"
                            value={data.smart_card_number}
                            onChange={(e) => setData('smart_card_number', e.target.value)}
                            className={inputClass()}
                        />
                    </div>
                </div>

                <h4 className="text-xs font-bold text-gray-800 mb-2">
                    ১৩. Other Identity Information (জন্ম সনদ নং, DOB, Gender, Family Mobile)
                </h4>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 md:grid-cols-4">
                    <div>
                        <label className="mb-0.5 block text-xs font-semibold text-gray-700">
                            জন্ম সনদ নং (প্রযোজ্য ক্ষেত্রে)
                        </label>
                        <input
                            type="text"
                            value={data.birth_certificate_number}
                            onChange={(e) => setData('birth_certificate_number', e.target.value)}
                            className={inputClass()}
                        />
                    </div>

                    <div>
                        <label className="mb-0.5 block text-xs font-semibold text-gray-700">Date of Birth</label>
                        <SmartDateInput
                            value={data.date_of_birth}
                            onChange={(val) => setData('date_of_birth', val)}
                            error={Boolean(errors.date_of_birth)}
                            className="w-full rounded-xl border border-gray-300 text-xs md:text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-medium"
                        />
                    </div>

                    <div>
                        <label className="mb-0.5 block text-xs font-semibold text-gray-700">
                            Gender (লিঙ্গ) <span className="text-red-500 font-bold">*</span>
                        </label>
                        <select
                            value={data.gender}
                            onChange={(e) => setData('gender', e.target.value)}
                            className={inputClass(Boolean(errors.gender))}
                        >
                            <option value="male">পুরুষ (Male)</option>
                            <option value="female">নারী (Female)</option>
                            <option value="other">অন্যান্য (Other)</option>
                        </select>
                        {errors.gender && (
                            <p className="mt-1 text-xs text-red-600 font-medium">{errors.gender}</p>
                        )}
                    </div>

                    <div>
                        <label className="mb-0.5 block text-xs font-semibold text-gray-700">
                            Family Member Mobile (পরিবারের সদস্যের মোবাইল)
                        </label>
                        <input
                            type="text"
                            value={data.family_member_mobile}
                            onChange={(e) => setData('family_member_mobile', e.target.value)}
                            className={inputClass()}
                        />
                    </div>
                </div>

                <h4 className="text-xs font-bold text-gray-800 mb-2">
                    ১৪–১৫. Guarantor & Financial Identity (জামিনদার ও অন্যান্য)
                </h4>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
                    <div>
                        <label className="mb-0.5 block text-xs font-semibold text-gray-700">
                            ১৪. জামিনদারের নাম (Guarantor Name)
                        </label>
                        <input
                            type="text"
                            value={data.guarantor_name}
                            onChange={(e) => setData('guarantor_name', e.target.value)}
                            className={inputClass()}
                        />
                    </div>

                    <div>
                        <label className="mb-0.5 block text-xs font-semibold text-gray-700">
                            ১৫. জামিনদারের মোবাইল (Guarantor Mobile)
                        </label>
                        <input
                            type="text"
                            value={data.guarantor_mobile}
                            onChange={(e) => setData('guarantor_mobile', e.target.value)}
                            className={inputClass()}
                        />
                    </div>

                    <div>
                        <label className="mb-0.5 block text-xs font-semibold text-gray-700">
                            TIN Number (কর শনাক্তকরণ নম্বর)
                        </label>
                        <input
                            type="text"
                            value={data.tin_number}
                            onChange={(e) => setData('tin_number', e.target.value)}
                            className={inputClass()}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2 p-3 bg-purple-50/60 rounded-xl border border-purple-100">
                    <input
                        type="checkbox"
                        id="want_sms"
                        checked={data.want_sms_service}
                        onChange={(e) => setData('want_sms_service', e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <label htmlFor="want_sms" className="text-xs md:text-sm font-bold text-purple-900 select-none cursor-pointer">
                        সদস্য কি এসএমএস সেবা নিতে চান?
                    </label>
                </div>
            </div>
        </FormSection>
    );
}
