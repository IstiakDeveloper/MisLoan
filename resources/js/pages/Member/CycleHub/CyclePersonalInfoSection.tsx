import FormSection from '@/components/MemberAdmission/FormSection';
import { toEnglishDigits } from '@/utils/memberCodeUtils';
import axios from 'axios';
import { User } from 'lucide-react';
import { useRef, useState } from 'react';

interface CyclePersonalInfoSectionProps {
    data: any;
    setData: (field: string, value: any) => void;
    errors: Record<string, string>;
    cycleId: number;
    lockIdentity?: boolean;
}

export default function CyclePersonalInfoSection({
    data,
    setData,
    errors,
    cycleId,
    lockIdentity = false,
}: CyclePersonalInfoSectionProps) {
    const [mobileUniqueError, setMobileUniqueError] = useState('');
    const mobileCheckVersion = useRef(0);
    const [mobileFormatError, setMobileFormatError] = useState('');
    const [altMobileFormatError, setAltMobileFormatError] = useState('');
    const mobileError =
        errors.mobile_number || mobileFormatError || mobileUniqueError;
    const altMobileError = errors.alternative_mobile || altMobileFormatError;
    const inputClass = (hasErr?: boolean) =>
        `w-full rounded-xl border ${hasErr ? 'border-red-500 bg-red-50/50 ring-2 ring-red-200' : lockIdentity ? 'border-slate-200 bg-slate-50 text-slate-700' : 'border-gray-300 bg-white'} px-3 py-2 text-xs md:text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-medium transition-all ${lockIdentity ? 'cursor-not-allowed' : ''}`;

    return (
        <FormSection
            title="২. আবেদনকারীর নাম ও ব্যক্তিগত তথ্য"
            icon={<User className="h-4 w-4 text-indigo-600" />}
            subtitle={
                lockIdentity
                    ? 'ব্যক্তিগত তথ্য আগের সদস্যের মতোই লক — আয়-ব্যয় নিচে বদলাতে পারবেন'
                    : 'আবেদনকারী ও পিতা/মাতা/স্বামীর নামসমূহ (বাংলা ও ইংরেজি)'
            }
        >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
                {/* কলাম ১ — বাংলা */}
                <div className="space-y-3">
                    <div>
                        <label className="mb-0.5 block text-xs font-semibold text-gray-700">
                            ৩. আবেদনকারীর নাম (বাংলায়){' '}
                            <span className="font-bold text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={data.applicant_name_bn}
                            onChange={(e) =>
                                setData('applicant_name_bn', e.target.value)
                            }
                            disabled={lockIdentity}
                            readOnly={lockIdentity}
                            className={inputClass(
                                Boolean(errors.applicant_name_bn),
                            )}
                        />
                        {errors.applicant_name_bn && (
                            <p className="mt-1 text-xs font-medium text-red-600">
                                {errors.applicant_name_bn}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="mb-0.5 block text-xs font-semibold text-gray-700">
                            ৪. পিতার নাম (বাংলায়){' '}
                            <span className="font-bold text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={data.father_name_bn}
                            onChange={(e) =>
                                setData('father_name_bn', e.target.value)
                            }
                            disabled={lockIdentity}
                            readOnly={lockIdentity}
                            className={inputClass(
                                Boolean(errors.father_name_bn),
                            )}
                        />
                        {errors.father_name_bn && (
                            <p className="mt-1 text-xs font-medium text-red-600">
                                {errors.father_name_bn}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="mb-0.5 block text-xs font-semibold text-gray-700">
                            ৫. মাতার নাম (বাংলায়){' '}
                            <span className="font-bold text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={data.mother_name_bn}
                            onChange={(e) =>
                                setData('mother_name_bn', e.target.value)
                            }
                            disabled={lockIdentity}
                            readOnly={lockIdentity}
                            className={inputClass(
                                Boolean(errors.mother_name_bn),
                            )}
                        />
                        {errors.mother_name_bn && (
                            <p className="mt-1 text-xs font-medium text-red-600">
                                {errors.mother_name_bn}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="mb-0.5 block text-xs font-semibold text-gray-700">
                            ৬. বৈবাহিক অবস্থা{' '}
                            <span className="font-bold text-red-500">*</span>
                        </label>
                        <select
                            value={data.marital_status}
                            onChange={(e) =>
                                setData('marital_status', e.target.value)
                            }
                            disabled={lockIdentity}
                            className={inputClass(
                                Boolean(errors.marital_status),
                            )}
                        >
                            <option value="single">অবিবাহিত (Single)</option>
                            <option value="married">বিবাহিত (Married)</option>
                            <option value="widowed">
                                বিধবা/বিপত্নীক (Widowed)
                            </option>
                            <option value="divorced">
                                ডিভোর্সড (Divorced)
                            </option>
                        </select>
                        {errors.marital_status && (
                            <p className="mt-1 text-xs font-medium text-red-600">
                                {errors.marital_status}
                            </p>
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
                                onChange={(e) =>
                                    setData('spouse_name_bn', e.target.value)
                                }
                                disabled={lockIdentity}
                                readOnly={lockIdentity}
                                className={inputClass(
                                    Boolean(errors.spouse_name_bn),
                                )}
                            />
                            {errors.spouse_name_bn && (
                                <p className="mt-1 text-xs font-medium text-red-600">
                                    {errors.spouse_name_bn}
                                </p>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="mb-0.5 block text-xs font-semibold text-gray-700">
                            ৭. মোবাইল নম্বর{' '}
                            <span className="font-bold text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            inputMode="numeric"
                            value={data.mobile_number}
                            disabled={lockIdentity}
                            readOnly={lockIdentity}
                            maxLength={11}
                            onChange={(e) => {
                                const val = toEnglishDigits(e.target.value)
                                    .replace(/\D/g, '')
                                    .slice(0, 11);
                                mobileCheckVersion.current++;
                                setMobileUniqueError('');
                                setData('mobile_number', val);
                                if (val.length > 0 && val.length !== 11) {
                                    setMobileFormatError(
                                        'মোবাইল নম্বর অবশ্যই ১১ ডিজিট হতে হবে',
                                    );
                                } else {
                                    setMobileFormatError('');
                                }
                            }}
                            onBlur={async (e) => {
                                const value = toEnglishDigits(e.target.value)
                                    .replace(/\D/g, '')
                                    .slice(0, 11);
                                if (!value) {
                                    setMobileUniqueError('');
                                    setMobileFormatError('');
                                    return;
                                }
                                if (value.length !== 11) {
                                    setMobileFormatError(
                                        'মোবাইল নম্বর অবশ্যই ১১ ডিজিট হতে হবে',
                                    );
                                    return;
                                }
                                setMobileFormatError('');
                                const version = ++mobileCheckVersion.current;
                                try {
                                    const { data: result } = await axios.get(
                                        `/member/cycle-hub/renewals/${cycleId}/check-unique`,
                                        { params: { mobile_number: value } },
                                    );
                                    if (
                                        version === mobileCheckVersion.current
                                    ) {
                                        setMobileUniqueError(
                                            result.errors?.mobile_number || '',
                                        );
                                    }
                                } catch {
                                    // Server save still enforces uniqueness.
                                }
                            }}
                            placeholder="017xxxxxxxx"
                            className={inputClass(Boolean(mobileError))}
                        />
                        {mobileError && (
                            <p className="mt-1 text-xs font-medium text-red-600">
                                {mobileError}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="mb-0.5 block text-xs font-semibold text-gray-700">
                            ৮. বিকল্প মোবাইল নম্বর (যদি থাকে)
                        </label>
                        <input
                            type="text"
                            inputMode="numeric"
                            value={data.alternative_mobile}
                            onChange={(e) => {
                                const val = toEnglishDigits(e.target.value)
                                    .replace(/\D/g, '')
                                    .slice(0, 11);
                                setData('alternative_mobile', val);
                                if (val.length > 0 && val.length !== 11) {
                                    setAltMobileFormatError(
                                        'বিকল্প মোবাইল নম্বর অবশ্যই ১১ ডিজিট হতে হবে',
                                    );
                                } else {
                                    setAltMobileFormatError('');
                                }
                            }}
                            onBlur={(e) => {
                                const val = toEnglishDigits(e.target.value)
                                    .replace(/\D/g, '')
                                    .slice(0, 11);
                                if (val.length > 0 && val.length !== 11) {
                                    setAltMobileFormatError(
                                        'বিকল্প মোবাইল নম্বর অবশ্যই ১১ ডিজিট হতে হবে',
                                    );
                                } else {
                                    setAltMobileFormatError('');
                                }
                            }}
                            disabled={lockIdentity}
                            readOnly={lockIdentity}
                            maxLength={11}
                            placeholder="01xxxxxxxxx"
                            className={inputClass(Boolean(altMobileError))}
                        />
                        {altMobileError && (
                            <p className="mt-1 text-xs font-medium text-red-600">
                                {altMobileError}
                            </p>
                        )}
                    </div>
                </div>

                {/* কলাম ২ — ইংরেজি */}
                <div className="space-y-3">
                    <div>
                        <label className="mb-0.5 block text-xs font-semibold text-gray-700">
                            Applicant Name (English){' '}
                            <span className="font-bold text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={data.applicant_name_en}
                            onChange={(e) =>
                                setData('applicant_name_en', e.target.value)
                            }
                            disabled={lockIdentity}
                            readOnly={lockIdentity}
                            className={inputClass(
                                Boolean(errors.applicant_name_en),
                            )}
                        />
                        {errors.applicant_name_en && (
                            <p className="mt-1 text-xs font-medium text-red-600">
                                {errors.applicant_name_en}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="mb-0.5 block text-xs font-semibold text-gray-700">
                            Father Name (English){' '}
                            <span className="font-bold text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={data.father_name_en}
                            onChange={(e) =>
                                setData('father_name_en', e.target.value)
                            }
                            disabled={lockIdentity}
                            readOnly={lockIdentity}
                            className={inputClass(
                                Boolean(errors.father_name_en),
                            )}
                        />
                        {errors.father_name_en && (
                            <p className="mt-1 text-xs font-medium text-red-600">
                                {errors.father_name_en}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="mb-0.5 block text-xs font-semibold text-gray-700">
                            Mother Name (English){' '}
                            <span className="font-bold text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={data.mother_name_en}
                            onChange={(e) =>
                                setData('mother_name_en', e.target.value)
                            }
                            disabled={lockIdentity}
                            readOnly={lockIdentity}
                            className={inputClass(
                                Boolean(errors.mother_name_en),
                            )}
                        />
                        {errors.mother_name_en && (
                            <p className="mt-1 text-xs font-medium text-red-600">
                                {errors.mother_name_en}
                            </p>
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
                                onChange={(e) =>
                                    setData('spouse_name_en', e.target.value)
                                }
                                disabled={lockIdentity}
                                readOnly={lockIdentity}
                                className={inputClass(
                                    Boolean(errors.spouse_name_en),
                                )}
                            />
                        </div>
                    )}
                </div>
            </div>
        </FormSection>
    );
}
