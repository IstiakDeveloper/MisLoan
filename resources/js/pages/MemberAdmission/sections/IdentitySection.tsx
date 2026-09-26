import React, { useState } from 'react';
import FormSection from '@/components/MemberAdmission/FormSection';
import { SmartDateInput } from '@/components/ui/SmartDateInput';
import { FileText } from 'lucide-react';
import { checkAdmissionUnique } from '@/utils/checkAdmissionUnique';
import { toEnglishDigits } from '@/utils/memberCodeUtils';

interface IdentitySectionProps {
    data: any;
    setData: (field: string, value: any) => void;
    errors: Record<string, string>;
    ignoreAdmissionId?: number | null;
    lockIdentity?: boolean;
}

export default function IdentitySection({
    data,
    setData,
    errors,
    ignoreAdmissionId,
    lockIdentity = false,
}: IdentitySectionProps) {
    const [uniqueErrors, setUniqueErrors] = useState<Record<string, string>>({});
    const [formatErrors, setFormatErrors] = useState<Record<string, string>>({});
    const shown = { ...uniqueErrors, ...formatErrors, ...errors };

    const inputClass = (hasErr?: boolean) =>
        `w-full rounded-xl border ${hasErr ? 'border-red-500 bg-red-50/50 ring-2 ring-red-200' : lockIdentity ? 'border-slate-200 bg-slate-50 text-slate-700' : 'border-gray-300 bg-white'} px-3 py-2 text-xs md:text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-medium transition-all ${lockIdentity ? 'cursor-not-allowed' : ''}`;

    const setField = (field: 'nid_number' | 'smart_card_number', value: string) => {
        setUniqueErrors((prev) => {
            if (!prev[field]) return prev;
            const next = { ...prev };
            delete next[field];
            return next;
        });
        setData(field, value);
    };

    const checkField = async (field: 'nid_number' | 'smart_card_number', value: string) => {
        const trimmed = value.trim();
        if (!trimmed) {
            setUniqueErrors((prev) => {
                if (!prev[field]) return prev;
                const next = { ...prev };
                delete next[field];
                return next;
            });
            return;
        }
        try {
            const result = await checkAdmissionUnique({
                [field]: trimmed,
                ignore_id: ignoreAdmissionId,
                application_no: data.application_no,
                branch_id: data.branch_id,
            });
            setUniqueErrors((prev) => {
                const next = { ...prev };
                if (result[field]) {
                    next[field] = result[field];
                } else {
                    delete next[field];
                }
                return next;
            });
        } catch {
            // Server save still enforces uniqueness.
        }
    };

    return (
        <FormSection
            title="৪. জাতীয় পরিচয়পত্র ও ডকুমেন্টস"
            icon={<FileText className="w-4 h-4 text-purple-600" />}
            subtitle={lockIdentity ? 'NID ও পরিচয় আগের সদস্যের মতোই লক' : 'NID, স্মার্ট কার্ড, জন্ম সনদ ও প্রফেশনাল ফটো আপলোড'}
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
                            inputMode="numeric"
                            placeholder="১০, ১৩ অথবা ১৭ ডিজিট"
                            value={data.nid_number}
                            maxLength={17}
                            onChange={(e) => {
                                const val = toEnglishDigits(e.target.value).replace(/\D/g, '').slice(0, 17);
                                setField('nid_number', val);
                                if (val.length > 0 && ![10, 13, 17].includes(val.length)) {
                                    setFormatErrors((prev) => ({ ...prev, nid_number: 'জাতীয় পরিচয়পত্র নম্বর অবশ্যই ১০, ১৩ অথবা ১৭ ডিজিট হতে হবে' }));
                                } else {
                                    setFormatErrors((prev) => { const n = { ...prev }; delete n.nid_number; return n; });
                                }
                            }}
                            onBlur={(e) => {
                                const val = toEnglishDigits(e.target.value).replace(/\D/g, '').slice(0, 17);
                                if (val.length > 0 && ![10, 13, 17].includes(val.length)) {
                                    setFormatErrors((prev) => ({ ...prev, nid_number: 'জাতীয় পরিচয়পত্র নম্বর অবশ্যই ১০, ১৩ অথবা ১৭ ডিজিট হতে হবে' }));
                                    return;
                                }
                                setFormatErrors((prev) => { const n = { ...prev }; delete n.nid_number; return n; });
                                void checkField('nid_number', val);
                            }}
                            disabled={lockIdentity}
                            readOnly={lockIdentity}
                            className={inputClass(Boolean(shown.nid_number))}
                        />
                        {shown.nid_number && (
                            <p className="mt-1 text-xs text-red-600 font-medium">{shown.nid_number}</p>
                        )}
                    </div>

                    <div>
                        <label className="mb-0.5 block text-xs font-semibold text-gray-700">Smart Card No. (১০ ডিজিট)</label>
                        <input
                            type="text"
                            inputMode="numeric"
                            placeholder="১০ ডিজিট"
                            value={data.smart_card_number}
                            maxLength={10}
                            onChange={(e) => {
                                const val = toEnglishDigits(e.target.value).replace(/\D/g, '').slice(0, 10);
                                setField('smart_card_number', val);
                                if (val.length > 0 && val.length !== 10) {
                                    setFormatErrors((prev) => ({ ...prev, smart_card_number: 'স্মার্ট কার্ড নম্বর অবশ্যই ১০ ডিজিট হতে হবে' }));
                                } else {
                                    setFormatErrors((prev) => { const n = { ...prev }; delete n.smart_card_number; return n; });
                                }
                            }}
                            onBlur={(e) => {
                                const val = toEnglishDigits(e.target.value).replace(/\D/g, '').slice(0, 10);
                                if (val.length > 0 && val.length !== 10) {
                                    setFormatErrors((prev) => ({ ...prev, smart_card_number: 'স্মার্ট কার্ড নম্বর অবশ্যই ১০ ডিজিট হতে হবে' }));
                                    return;
                                }
                                setFormatErrors((prev) => { const n = { ...prev }; delete n.smart_card_number; return n; });
                                void checkField('smart_card_number', val);
                            }}
                            disabled={lockIdentity}
                            readOnly={lockIdentity}
                            className={inputClass(Boolean(shown.smart_card_number))}
                        />
                        {shown.smart_card_number && (
                            <p className="mt-1 text-xs text-red-600 font-medium">{shown.smart_card_number}</p>
                        )}
                    </div>
                </div>

                <h4 className="text-xs font-bold text-gray-800 mb-2">
                    ১৩. Other Identity Information (জন্ম সনদ নং, DOB, Gender, Family Mobile)
                </h4>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 md:grid-cols-4">
                    <div>
                        <label className="mb-0.5 block text-xs font-semibold text-gray-700">
                            জন্ম সনদ নং (প্রযোজ্য ক্ষেত্রে - ১৭ ডিজিট)
                        </label>
                        <input
                            type="text"
                            inputMode="numeric"
                            placeholder="১৭ ডিজিট"
                            value={data.birth_certificate_number}
                            maxLength={17}
                            onChange={(e) => {
                                const val = toEnglishDigits(e.target.value).replace(/\D/g, '').slice(0, 17);
                                setData('birth_certificate_number', val);
                                if (val.length > 0 && val.length !== 17) {
                                    setFormatErrors((prev) => ({ ...prev, birth_certificate_number: 'জন্ম সনদ নম্বর অবশ্যই ১৭ ডিজিট হতে হবে' }));
                                } else {
                                    setFormatErrors((prev) => { const n = { ...prev }; delete n.birth_certificate_number; return n; });
                                }
                            }}
                            onBlur={(e) => {
                                const val = toEnglishDigits(e.target.value).replace(/\D/g, '').slice(0, 17);
                                if (val.length > 0 && val.length !== 17) {
                                    setFormatErrors((prev) => ({ ...prev, birth_certificate_number: 'জন্ম সনদ নম্বর অবশ্যই ১৭ ডিজিট হতে হবে' }));
                                } else {
                                    setFormatErrors((prev) => { const n = { ...prev }; delete n.birth_certificate_number; return n; });
                                }
                            }}
                            disabled={lockIdentity}
                            readOnly={lockIdentity}
                            className={inputClass(Boolean(shown.birth_certificate_number))}
                        />
                        {shown.birth_certificate_number && (
                            <p className="mt-1 text-xs text-red-600 font-medium">{shown.birth_certificate_number}</p>
                        )}
                    </div>

                    <div>
                        <label className="mb-0.5 block text-xs font-semibold text-gray-700">Date of Birth</label>
                        <SmartDateInput
                            value={data.date_of_birth}
                            onChange={(val) => setData('date_of_birth', val)}
                            error={Boolean(errors.date_of_birth)}
                            disabled={lockIdentity}
                            className={`w-full rounded-xl border text-xs md:text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-medium ${lockIdentity ? 'border-slate-200 bg-slate-50 cursor-not-allowed' : 'border-gray-300'}`}
                        />
                    </div>

                    <div>
                        <label className="mb-0.5 block text-xs font-semibold text-gray-700">
                            Gender (লিঙ্গ) <span className="text-red-500 font-bold">*</span>
                        </label>
                        <select
                            value={data.gender}
                            onChange={(e) => setData('gender', e.target.value)}
                            disabled={lockIdentity}
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
                            Family Member Mobile (১১ ডিজিট)
                        </label>
                        <input
                            type="text"
                            inputMode="numeric"
                            placeholder="01xxxxxxxxx"
                            maxLength={11}
                            value={data.family_member_mobile}
                            onChange={(e) => {
                                const val = toEnglishDigits(e.target.value).replace(/\D/g, '').slice(0, 11);
                                setData('family_member_mobile', val);
                                if (val.length > 0 && val.length !== 11) {
                                    setFormatErrors((prev) => ({ ...prev, family_member_mobile: 'মোবাইল নম্বর অবশ্যই ১১ ডিজিট হতে হবে' }));
                                } else {
                                    setFormatErrors((prev) => { const n = { ...prev }; delete n.family_member_mobile; return n; });
                                }
                            }}
                            onBlur={(e) => {
                                const val = toEnglishDigits(e.target.value).replace(/\D/g, '').slice(0, 11);
                                if (val.length > 0 && val.length !== 11) {
                                    setFormatErrors((prev) => ({ ...prev, family_member_mobile: 'মোবাইল নম্বর অবশ্যই ১১ ডিজিট হতে হবে' }));
                                } else {
                                    setFormatErrors((prev) => { const n = { ...prev }; delete n.family_member_mobile; return n; });
                                }
                            }}
                            disabled={lockIdentity}
                            readOnly={lockIdentity}
                            className={inputClass(Boolean(shown.family_member_mobile))}
                        />
                        {shown.family_member_mobile && (
                            <p className="mt-1 text-xs text-red-600 font-medium">{shown.family_member_mobile}</p>
                        )}
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
                            ১৫. জামিনদারের মোবাইল (১১ ডিজিট)
                        </label>
                        <input
                            type="text"
                            inputMode="numeric"
                            placeholder="01xxxxxxxxx"
                            maxLength={11}
                            value={data.guarantor_mobile}
                            onChange={(e) => {
                                const val = toEnglishDigits(e.target.value).replace(/\D/g, '').slice(0, 11);
                                setData('guarantor_mobile', val);
                                if (val.length > 0 && val.length !== 11) {
                                    setFormatErrors((prev) => ({ ...prev, guarantor_mobile: 'মোবাইল নম্বর অবশ্যই ১১ ডিজিট হতে হবে' }));
                                } else {
                                    setFormatErrors((prev) => { const n = { ...prev }; delete n.guarantor_mobile; return n; });
                                }
                            }}
                            onBlur={(e) => {
                                const val = toEnglishDigits(e.target.value).replace(/\D/g, '').slice(0, 11);
                                if (val.length > 0 && val.length !== 11) {
                                    setFormatErrors((prev) => ({ ...prev, guarantor_mobile: 'মোবাইল নম্বর অবশ্যই ১১ ডিজিট হতে হবে' }));
                                } else {
                                    setFormatErrors((prev) => { const n = { ...prev }; delete n.guarantor_mobile; return n; });
                                }
                            }}
                            className={inputClass(Boolean(shown.guarantor_mobile))}
                        />
                        {shown.guarantor_mobile && (
                            <p className="mt-1 text-xs text-red-600 font-medium">{shown.guarantor_mobile}</p>
                        )}
                    </div>

                    <div>
                        <label className="mb-0.5 block text-xs font-semibold text-gray-700">
                            TIN Number (কর শনাক্তকরণ নম্বর)
                        </label>
                        <input
                            type="text"
                            inputMode="numeric"
                            value={data.tin_number}
                            onChange={(e) => setData('tin_number', toEnglishDigits(e.target.value).replace(/\D/g, ''))}
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
