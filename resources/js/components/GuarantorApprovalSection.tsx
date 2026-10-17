import React, { useState } from 'react';
import { ShieldCheck, AlertTriangle, Edit3, CheckCircle2, UserCheck, ChevronDown, ChevronUp } from 'lucide-react';

export interface GuarantorFormState {
    guarantor_name: string;
    guarantor_father_or_spouse: string;
    guarantor_nid: string;
    guarantor_mobile: string;
    guarantor_village: string;
    guarantor_post_office: string;
    guarantor_upazila: string;
    guarantor_district: string;
    guarantor_relation: string;
}

interface Props {
    data: GuarantorFormState;
    onChange: (field: keyof GuarantorFormState, value: string) => void;
    isVerifiedMarked: boolean;
    onVerifiedMarkChange: (checked: boolean) => void;
    initiallyVerified?: boolean;
    isRequired?: boolean;
}

export default function GuarantorApprovalSection({
    data,
    onChange,
    isVerifiedMarked,
    onVerifiedMarkChange,
    initiallyVerified = false,
    isRequired = true,
}: Props) {
    const hasName = Boolean(data.guarantor_name?.trim());
    const hasMobile = Boolean(data.guarantor_mobile?.trim());
    const isComplete = hasName && hasMobile;

    // By default, if data is incomplete, show edit fields open.
    // If complete, can collapse/expand.
    const [isEditing, setIsEditing] = useState<boolean>(!isComplete);

    const fullAddress = [
        data.guarantor_village,
        data.guarantor_post_office,
        data.guarantor_upazila,
        data.guarantor_district,
    ]
        .filter((part) => part && String(part).trim() !== '')
        .join(', ');

    return (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs transition-all">
            {/* Header */}
            <div className={`px-3.5 py-2.5 sm:px-4 sm:py-3 flex flex-wrap items-center justify-between gap-2 border-b ${
                !isComplete
                    ? 'bg-amber-50/70 border-amber-200'
                    : isVerifiedMarked || initiallyVerified
                      ? 'bg-emerald-50/70 border-emerald-200'
                      : 'bg-slate-50 border-slate-200'
            }`}>
                <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        !isComplete
                            ? 'bg-amber-100 text-amber-700'
                            : isVerifiedMarked || initiallyVerified
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-blue-100 text-blue-700'
                    }`}>
                        {!isComplete ? (
                            <AlertTriangle className="w-4 h-4" />
                        ) : (
                            <UserCheck className="w-4 h-4" />
                        )}
                    </div>
                    <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                            <span>জামিনদারের তথ্য যাচাই ও হালনাগাদ</span>
                            {isRequired && <span className="text-rose-500 text-xs">*</span>}
                        </h4>
                        <p className="text-[10px] sm:text-[11px] text-slate-500">
                            {isComplete
                                ? 'অনুমোদনের আগে তথ্য সঠিক আছে কিনা যাচাই করুন'
                                : 'জামিনদারের তথ্য অসম্পূর্ণ, অনুমোদন করতে পূরণ করুন'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full border ${
                        !isComplete
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : isVerifiedMarked || initiallyVerified
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-blue-100 text-blue-800 border-blue-300'
                    }`}>
                        {!isComplete
                            ? 'তথ্য অপূর্ণ'
                            : isVerifiedMarked || initiallyVerified
                              ? 'যাচাইকৃত'
                              : 'যাচাই প্রয়োজন'}
                    </span>
                    {isComplete && (
                        <button
                            type="button"
                            onClick={() => setIsEditing(!isEditing)}
                            className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-white/80 border border-slate-200 text-xs flex items-center gap-1 transition"
                            title={isEditing ? 'সংক্ষেপ করুন' : 'সম্পাদনা করুন'}
                        >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline text-[11px] font-semibold">
                                {isEditing ? 'সংক্ষেপ' : 'সংশোধন'}
                            </span>
                            {isEditing ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                    )}
                </div>
            </div>

            {/* Warning Message if Incomplete */}
            {!isComplete && (
                <div className="px-3.5 py-2.5 sm:px-4 sm:py-2.5 bg-amber-50 border-b border-amber-200/80 flex items-start gap-2 text-[11px] sm:text-xs text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <strong className="font-bold">সতর্কবার্তা: </strong>
                        এই ঋণের জামিনদারের প্রয়োজনীয় তথ্য (নাম/মোবাইল) এখনো পূরণ করা হয়নি। অনুগ্রহ করে নিচের ফর্মে জামিনদারের তথ্য পূরণ করুন। সাবমিট করলে তথ্য স্বয়ংক্রিয়ভাবে সদস্য প্রোফাইল ও ঋণের সকল ফর্মে সংরক্ষিত হবে।
                    </div>
                </div>
            )}

            {/* Readonly Summary Card when Complete and not in full edit mode */}
            {isComplete && !isEditing && (
                <div className="p-3.5 sm:p-4 bg-slate-50/50 space-y-2 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
                        <div className="flex items-center justify-between sm:justify-start sm:gap-2">
                            <span className="text-slate-500">জামিনদারের নাম:</span>
                            <strong className="text-slate-900 font-semibold">{data.guarantor_name || '-'}</strong>
                        </div>
                        <div className="flex items-center justify-between sm:justify-start sm:gap-2">
                            <span className="text-slate-500">মোবাইল নম্বর:</span>
                            <strong className="text-slate-900 font-mono font-semibold">{data.guarantor_mobile || '-'}</strong>
                        </div>
                        {data.guarantor_father_or_spouse && (
                            <div className="flex items-center justify-between sm:justify-start sm:gap-2">
                                <span className="text-slate-500">পিতা/স্বামী:</span>
                                <span className="text-slate-800">{data.guarantor_father_or_spouse}</span>
                            </div>
                        )}
                        {data.guarantor_nid && (
                            <div className="flex items-center justify-between sm:justify-start sm:gap-2">
                                <span className="text-slate-500">এনআইডি:</span>
                                <span className="text-slate-800 font-mono">{data.guarantor_nid}</span>
                            </div>
                        )}
                        {fullAddress && (
                            <div className="col-span-1 sm:col-span-2 flex items-start gap-2">
                                <span className="text-slate-500 shrink-0">ঠিকানা:</span>
                                <span className="text-slate-800">{fullAddress}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Edit Form */}
            {isEditing && (
                <div className="p-3.5 sm:p-4 space-y-3 bg-white">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                        {/* Guarantor Name */}
                        <div className="col-span-1 sm:col-span-2">
                            <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">
                                জামিনদারের নাম <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={data.guarantor_name}
                                onChange={(e) => {
                                    onChange('guarantor_name', e.target.value);
                                    if (e.target.value.trim()) onVerifiedMarkChange(true);
                                }}
                                placeholder="জামিনদারের পূর্ণ নাম লিখুন"
                                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-xs"
                                required
                            />
                        </div>

                        {/* Father or Spouse */}
                        <div>
                            <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-1">
                                পিতা / স্বামীর নাম
                            </label>
                            <input
                                type="text"
                                value={data.guarantor_father_or_spouse}
                                onChange={(e) => onChange('guarantor_father_or_spouse', e.target.value)}
                                placeholder="পিতা বা স্বামীর নাম"
                                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-xs"
                            />
                        </div>

                        {/* Mobile Number */}
                        <div>
                            <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">
                                মোবাইল নম্বর (১১ ডিজিট) <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="tel"
                                maxLength={11}
                                value={data.guarantor_mobile}
                                onChange={(e) => {
                                    onChange('guarantor_mobile', e.target.value);
                                    if (e.target.value.trim()) onVerifiedMarkChange(true);
                                }}
                                placeholder="01XXXXXXXXX"
                                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm font-mono focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-xs"
                                required
                            />
                        </div>

                        {/* NID */}
                        <div>
                            <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-1">
                                জাতীয় পরিচয়পত্র নং (NID)
                            </label>
                            <input
                                type="text"
                                value={data.guarantor_nid}
                                onChange={(e) => onChange('guarantor_nid', e.target.value)}
                                placeholder="১০/১৩/১৭ ডিজিটের এনআইডি"
                                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm font-mono focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-xs"
                            />
                        </div>

                        {/* Relation */}
                        <div>
                            <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-1">
                                সদস্যের সাথে সম্পর্ক
                            </label>
                            <input
                                type="text"
                                value={data.guarantor_relation}
                                onChange={(e) => onChange('guarantor_relation', e.target.value)}
                                placeholder="যেমন: স্বামী, ভাই, প্রতিবেশী"
                                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-xs"
                            />
                        </div>

                        {/* Village */}
                        <div>
                            <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-1">
                                গ্রাম / রাস্তা
                            </label>
                            <input
                                type="text"
                                value={data.guarantor_village}
                                onChange={(e) => onChange('guarantor_village', e.target.value)}
                                placeholder="গ্রাম বা মহল্লা"
                                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-xs"
                            />
                        </div>

                        {/* Post Office */}
                        <div>
                            <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-1">
                                ডাকঘর
                            </label>
                            <input
                                type="text"
                                value={data.guarantor_post_office}
                                onChange={(e) => onChange('guarantor_post_office', e.target.value)}
                                placeholder="ডাকঘর"
                                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-xs"
                            />
                        </div>

                        {/* Upazila */}
                        <div>
                            <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-1">
                                উপজেলা / থানা
                            </label>
                            <input
                                type="text"
                                value={data.guarantor_upazila}
                                onChange={(e) => onChange('guarantor_upazila', e.target.value)}
                                placeholder="উপজেলা"
                                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-xs"
                            />
                        </div>

                        {/* District */}
                        <div>
                            <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-1">
                                জেলা
                            </label>
                            <input
                                type="text"
                                value={data.guarantor_district}
                                onChange={(e) => onChange('guarantor_district', e.target.value)}
                                placeholder="জেলা"
                                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-xs"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Checkbox verification confirmation */}
            <div className="p-3 sm:p-3.5 bg-slate-50 border-t border-slate-200">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={isVerifiedMarked}
                        onChange={(e) => onVerifiedMarkChange(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 focus:ring-offset-0 transition cursor-pointer"
                    />
                    <div className="text-[11px] sm:text-xs">
                        <span className="font-bold text-slate-900 block">
                            আমি নিশ্চিত করছি যে জামিনদারের তথ্য যাচাই করা হয়েছে এবং সঠিক আছে।
                        </span>
                        <span className="text-slate-500 block text-[10px] sm:text-[11px] mt-0.5">
                            অনুমোদনের সাথে সাথে এই তথ্য সদস্য প্রোফাইল ও ঋণের সকল ফর্মে স্বয়ংক্রিয়ভাবে সংরক্ষিত হবে।
                        </span>
                    </div>
                </label>
            </div>
        </div>
    );
}
