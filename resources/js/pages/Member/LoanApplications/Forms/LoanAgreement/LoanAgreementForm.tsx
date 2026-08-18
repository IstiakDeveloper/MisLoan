import React from 'react';
import { LoanAgreementData } from './Types';
import { formatDateBangla, formatBanglaNumber, toBanglaDigits } from '@/utils/dateUtils';
import { Upload, X, Home, User, Building2, Calculator, ShieldCheck, MapPin, Users } from 'lucide-react';

interface LoanAgreementFormProps {
    data: LoanAgreementData;
    setData: (key: any, value: any) => void;
    handleImageUpload: (field: string, file: File | null) => void;
    removeImage: (field: string) => void;
    loanProduct: any;
    loanCategory: any;
}

export function LoanAgreementForm({
    data,
    setData,
    handleImageUpload,
    removeImage,
    loanProduct,
    loanCategory,
}: LoanAgreementFormProps) {
    const inputClass = 'w-full px-3 py-2 text-xs md:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium bg-white';
    const disabledClass = 'w-full px-3 py-2 text-xs md:text-sm border border-gray-200 rounded-lg bg-gray-100/90 text-gray-700 font-medium cursor-not-allowed';

    return (
        <div className="space-y-5">
            {/* 1. Branch Info */}
            <div className="bg-white rounded-xl shadow-sm p-4 md:p-5 border border-gray-200">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-gray-800 border-b pb-2">
                    <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">১</span>
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <span>শাখা সংক্রান্ত তথ্য (Branch Info)</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">শাখার নাম</label>
                        <input
                            type="text"
                            value={data.branch_name}
                            onChange={(e) => setData('branch_name', e.target.value)}
                            className={inputClass}
                            placeholder="শাখার নাম লিখুন"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">ঠিকানা</label>
                        <input
                            type="text"
                            value={data.branch_address}
                            onChange={(e) => setData('branch_address', e.target.value)}
                            className={inputClass}
                            placeholder="শাখার ঠিকানা লিখুন"
                        />
                    </div>
                </div>
            </div>

            {/* 2. Member Info */}
            <div className="bg-white rounded-xl shadow-sm p-4 md:p-5 border border-gray-200">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-gray-800 border-b pb-2">
                    <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">২</span>
                    <User className="w-4 h-4 text-blue-600" />
                    <span>সদস্য মৌলিক তথ্য (Member Info - MemberAdmission থেকে সংগৃহীত)</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">সদস্যের নাম (বাংলা)</label>
                        <input type="text" value={data.member_name_bn} disabled className={disabledClass} />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">সদস্য কোড / আবেদন নং</label>
                        <input
                            type="text"
                            value={data.member_code}
                            onChange={(e) => setData('member_code', e.target.value)}
                            className={inputClass}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">পিতা/স্বামীর নাম</label>
                        <input type="text" value={data.father_husband_name} disabled className={disabledClass} />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">মাতার নাম</label>
                        <input type="text" value={data.mother_name} disabled className={disabledClass} />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">জাতীয় পরিচয়পত্র (NID)</label>
                        <input type="text" value={data.nid_number} disabled className={disabledClass} />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">মোবাইল নম্বর</label>
                        <input type="text" value={data.mobile_number} disabled className={disabledClass} />
                    </div>
                </div>
            </div>

            {/* 3. Address Info */}
            <div className="bg-white rounded-xl shadow-sm p-4 md:p-5 border border-gray-200">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-gray-800 border-b pb-2">
                    <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">৩</span>
                    <MapPin className="w-4 h-4 text-blue-600" />
                    <span>ঠিকানা বিবরণী (Address Info)</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">সমিতি</label>
                        <input type="text" value={data.samity_name} disabled className={disabledClass} />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">সমিতি কোড</label>
                        <input type="text" value={data.samity_code} disabled className={disabledClass} />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">গ্রাম/রাস্তা</label>
                        <input
                            type="text"
                            value={data.village}
                            onChange={(e) => setData('village', e.target.value)}
                            className={inputClass}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">ইউনিয়ন</label>
                        <input
                            type="text"
                            value={data.union}
                            onChange={(e) => setData('union', e.target.value)}
                            className={inputClass}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">উপজেলা/থানা</label>
                        <input
                            type="text"
                            value={data.upazila}
                            onChange={(e) => setData('upazila', e.target.value)}
                            className={inputClass}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">জেলা</label>
                        <input
                            type="text"
                            value={data.district}
                            onChange={(e) => setData('district', e.target.value)}
                            className={inputClass}
                        />
                    </div>
                </div>
            </div>

            {/* 4. Loan Details */}
            <div className="rounded-xl shadow-sm p-4 md:p-5 border border-green-200 bg-emerald-50/30">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-emerald-900 border-b border-emerald-200 pb-2">
                    <span className="w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-xs font-bold">৪</span>
                    <Calculator className="w-4 h-4 text-emerald-600" />
                    <span>ঋণের বিবরণ ও হিসাব (Loan Details & Auto-Calculation)</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">প্রকল্পের উদ্দেশ্য/নাম *</label>
                        <input
                            type="text"
                            value={data.loan_purpose}
                            onChange={(e) => setData('loan_purpose', e.target.value)}
                            placeholder="যেমন: ক্ষুদ্র ব্যবসা / গৃহস্থালী কাজ"
                            className={inputClass}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">ঋণের পরিমাণ (৳)</label>
                        <input
                            type="number"
                            value={data.loan_amount}
                            onChange={(e) => setData('loan_amount', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 text-sm border border-emerald-400 rounded-lg font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500 bg-white"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">ঋণ প্রদানের তারিখ</label>
                        <input
                            type="date"
                            value={data.disbursement_date}
                            onChange={(e) => setData('disbursement_date', e.target.value)}
                            className={inputClass}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">ঋণের মেয়াদ (মাস)</label>
                        <input type="number" value={data.loan_duration_months} disabled className={disabledClass} />
                    </div>

                    <div className="sm:col-span-2 bg-white p-3.5 rounded-xl border border-emerald-200 shadow-sm mt-1">
                        <h4 className="text-xs font-bold text-gray-700 mb-2 border-b pb-1">স্বয়ংক্রিয় হিসাবের সারসংক্ষেপ:</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                            <div>
                                <span className="text-gray-500 block">সার্ভিস চার্জ:</span>
                                <p className="font-bold text-amber-600 text-sm">৳{formatBanglaNumber(data.service_charge)}</p>
                            </div>
                            <div>
                                <span className="text-gray-500 block">মোট পরিশোধযোগ্য:</span>
                                <p className="font-bold text-blue-600 text-sm">৳{formatBanglaNumber(data.total_amount)}</p>
                            </div>
                            <div>
                                <span className="text-gray-500 block">মোট কিস্তি সংখ্যা:</span>
                                <p className="font-bold text-purple-600 text-sm">{toBanglaDigits(data.number_of_installments)} টি</p>
                            </div>
                            <div>
                                <span className="text-gray-500 block">প্রতি কিস্তির পরিমাণ:</span>
                                <p className="font-bold text-emerald-600 text-sm">৳{formatBanglaNumber(data.installment_amount)}</p>
                            </div>
                            <div>
                                <span className="text-gray-500 block">শেষ কিস্তির পরিমাণ:</span>
                                <p className="font-bold text-rose-600 text-sm">৳{formatBanglaNumber(data.last_installment_amount)}</p>
                            </div>
                            <div>
                                <span className="text-gray-500 block">পরিশোধের শেষ তারিখ:</span>
                                <p className="font-bold text-gray-800 text-sm">{formatDateBangla(data.last_installment_date)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 5. Signatures & Witnesses */}
            <div className="bg-white rounded-xl shadow-sm p-4 md:p-5 border border-gray-200">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-gray-800 border-b pb-2">
                    <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">৫</span>
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>স্বাক্ষর ও সাক্ষীগণ (Signatures & Witnesses)</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Applicant */}
                    <div className="p-3 border rounded-xl bg-gray-50/50">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">আবেদনকারী/গ্রহীতার নাম</label>
                        <input
                            type="text"
                            value={data.applicant_signature_name}
                            onChange={(e) => setData('applicant_signature_name', e.target.value)}
                            placeholder="আবেদনকারীর নাম"
                            className={inputClass}
                        />
                        {data.applicant_signature_image && (
                            <p className="text-[11px] text-emerald-600 font-semibold mt-1.5 flex items-center gap-1">
                                ✓ MemberAdmission থেকে সংরক্ষিত স্বাক্ষর পাওয়া গেছে (প্রিন্ট/প্রিভিউতে দেখাবে)
                            </p>
                        )}
                    </div>

                    {/* Guardian */}
                    <div className="p-3 border rounded-xl bg-gray-50/50">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">অভিভাবকের নাম</label>
                        <input
                            type="text"
                            value={data.guardian_name}
                            onChange={(e) => setData('guardian_name', e.target.value)}
                            placeholder="অভিভাবকের নাম"
                            className={inputClass}
                        />
                        {data.guardian_signature_image && (
                            <p className="text-[11px] text-emerald-600 font-semibold mt-1.5 flex items-center gap-1">
                                ✓ MemberAdmission থেকে সংরক্ষিত স্বাক্ষর পাওয়া গেছে (প্রিন্ট/প্রিভিউতে দেখাবে)
                            </p>
                        )}
                    </div>

                    {/* President */}
                    <div className="p-3 border rounded-xl bg-gray-50/50">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">সাক্ষী ১: সভানেত্রীর নাম</label>
                        <input
                            type="text"
                            value={data.president_name}
                            onChange={(e) => setData('president_name', e.target.value)}
                            placeholder="সভানেত্রীর নাম"
                            className={inputClass}
                        />
                    </div>

                    {/* Secretary */}
                    <div className="p-3 border rounded-xl bg-gray-50/50">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">সাক্ষী ২: সম্পাদিকার নাম</label>
                        <input
                            type="text"
                            value={data.secretary_name}
                            onChange={(e) => setData('secretary_name', e.target.value)}
                            placeholder="সম্পাদিকার নাম"
                            className={inputClass}
                        />
                    </div>
                </div>
            </div>

            {/* 6. Property Details */}
            <div className="bg-white rounded-xl shadow-sm p-4 md:p-5 border border-gray-200">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-gray-800 border-b pb-2">
                    <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">৬</span>
                    <Home className="w-4 h-4 text-blue-600" />
                    <span>সম্পত্তি ও জমি সংক্রান্ত তথ্য</span>
                </h3>
                <p className="text-xs font-semibold text-blue-900 mb-2">
                    গ্রাহকের মালিকানাধীন মোট জমির পরিমাণ ও মূল্য (শতাংশে):
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">বসতবাড়ি (একরে)</label>
                        <input
                            type="text"
                            value={data.house_acres}
                            onChange={(e) => setData('house_acres', e.target.value)}
                            className={inputClass}
                            placeholder="০"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">বসতবাড়ি (শতাংশে)</label>
                        <input
                            type="text"
                            value={data.house_decimal}
                            onChange={(e) => setData('house_decimal', e.target.value)}
                            className={inputClass}
                            placeholder="০"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">মোট জমি (একরে)</label>
                        <input
                            type="text"
                            value={data.land_acres}
                            onChange={(e) => setData('land_acres', e.target.value)}
                            className={inputClass}
                            placeholder="০"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">মোট জমি (শতাংশে)</label>
                        <input
                            type="text"
                            value={data.land_decimal}
                            onChange={(e) => setData('land_decimal', e.target.value)}
                            className={inputClass}
                            placeholder="০"
                        />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">বাড়ির আনুমানিক মূল্য (৳)</label>
                        <input
                            type="text"
                            value={data.house_value}
                            onChange={(e) => setData('house_value', e.target.value)}
                            className={inputClass}
                            placeholder="৳"
                        />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">জমির আনুমানিক মূল্য (৳)</label>
                        <input
                            type="text"
                            value={data.land_value}
                            onChange={(e) => setData('land_value', e.target.value)}
                            className={inputClass}
                            placeholder="৳"
                        />
                    </div>
                </div>
            </div>

            {/* 7. Employment Information */}
            <div className="bg-white rounded-xl shadow-sm p-4 md:p-5 border border-gray-200">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-gray-800 border-b pb-2">
                    <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">৭</span>
                    <Users className="w-4 h-4 text-blue-600" />
                    <span>কর্মসংস্থান সংক্রান্ত তথ্য (Employment Information)</span>
                </h3>
                <div className="w-full overflow-x-auto border border-gray-300 rounded-xl bg-gray-50/50">
                    <table className="w-full border-collapse text-center text-xs">
                        <thead>
                            <tr className="bg-gray-100 text-gray-800 font-bold">
                                <th rowSpan={3} className="border border-gray-300 p-2 min-w-[130px]">ঋণ কার্যক্রমের নাম</th>
                                <th colSpan={4} className="border border-gray-300 p-1.5">স্ব-কর্মসংস্থান/পারিবারিক</th>
                                <th colSpan={4} className="border border-gray-300 p-1.5">মজুরি ভিত্তিক কর্মসংস্থান</th>
                            </tr>
                            <tr className="bg-gray-50 text-gray-700 font-semibold">
                                <th colSpan={2} className="border border-gray-300 p-1">পূর্ণকালীন</th>
                                <th colSpan={2} className="border border-gray-300 p-1">খণ্ডকালীন</th>
                                <th colSpan={2} className="border border-gray-300 p-1">পূর্ণকালীন</th>
                                <th colSpan={2} className="border border-gray-300 p-1">খণ্ডকালীন</th>
                            </tr>
                            <tr className="bg-white text-gray-600 text-[11px] font-medium">
                                <th className="border border-gray-300 p-1">মহিলা (১)</th>
                                <th className="border border-gray-300 p-1">পুরুষ (২)</th>
                                <th className="border border-gray-300 p-1">মহিলা (৩)</th>
                                <th className="border border-gray-300 p-1">পুরুষ (৪)</th>
                                <th className="border border-gray-300 p-1">মহিলা (৫)</th>
                                <th className="border border-gray-300 p-1">পুরুষ (৬)</th>
                                <th className="border border-gray-300 p-1">মহিলা (৭)</th>
                                <th className="border border-gray-300 p-1">পুরুষ (৮)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="bg-white">
                                <td className="border border-gray-300 p-2 font-semibold text-gray-800">
                                    {data.loan_category_name || data.loan_product_name || 'প্রকল্পের নাম'}
                                </td>
                                <td className="border border-gray-300 p-1">
                                    <input
                                        type="number"
                                        value={data.self_emp_full_female || data.self_full_female || ''}
                                        onChange={(e) => {
                                            setData('self_emp_full_female', e.target.value);
                                            setData('self_full_female', e.target.value);
                                        }}
                                        placeholder="০"
                                        className="w-full border border-gray-200 rounded px-1.5 py-1 text-xs text-center"
                                    />
                                </td>
                                <td className="border border-gray-300 p-1">
                                    <input
                                        type="number"
                                        value={data.self_emp_full_male || data.self_full_male || ''}
                                        onChange={(e) => {
                                            setData('self_emp_full_male', e.target.value);
                                            setData('self_full_male', e.target.value);
                                        }}
                                        placeholder="০"
                                        className="w-full border border-gray-200 rounded px-1.5 py-1 text-xs text-center"
                                    />
                                </td>
                                <td className="border border-gray-300 p-1">
                                    <input
                                        type="number"
                                        value={data.self_emp_part_female || data.self_part_female || ''}
                                        onChange={(e) => {
                                            setData('self_emp_part_female', e.target.value);
                                            setData('self_part_female', e.target.value);
                                        }}
                                        placeholder="০"
                                        className="w-full border border-gray-200 rounded px-1.5 py-1 text-xs text-center"
                                    />
                                </td>
                                <td className="border border-gray-300 p-1">
                                    <input
                                        type="number"
                                        value={data.self_emp_part_male || data.self_part_male || ''}
                                        onChange={(e) => {
                                            setData('self_emp_part_male', e.target.value);
                                            setData('self_part_male', e.target.value);
                                        }}
                                        placeholder="০"
                                        className="w-full border border-gray-200 rounded px-1.5 py-1 text-xs text-center"
                                    />
                                </td>
                                <td className="border border-gray-300 p-1">
                                    <input
                                        type="number"
                                        value={data.wage_emp_full_female || data.wage_full_female || ''}
                                        onChange={(e) => {
                                            setData('wage_emp_full_female', e.target.value);
                                            setData('wage_full_female', e.target.value);
                                        }}
                                        placeholder="০"
                                        className="w-full border border-gray-200 rounded px-1.5 py-1 text-xs text-center"
                                    />
                                </td>
                                <td className="border border-gray-300 p-1">
                                    <input
                                        type="number"
                                        value={data.wage_emp_full_male || data.wage_full_male || ''}
                                        onChange={(e) => {
                                            setData('wage_emp_full_male', e.target.value);
                                            setData('wage_full_male', e.target.value);
                                        }}
                                        placeholder="০"
                                        className="w-full border border-gray-200 rounded px-1.5 py-1 text-xs text-center"
                                    />
                                </td>
                                <td className="border border-gray-300 p-1">
                                    <input
                                        type="number"
                                        value={data.wage_emp_part_female || data.wage_part_female || ''}
                                        onChange={(e) => {
                                            setData('wage_emp_part_female', e.target.value);
                                            setData('wage_part_female', e.target.value);
                                        }}
                                        placeholder="০"
                                        className="w-full border border-gray-200 rounded px-1.5 py-1 text-xs text-center"
                                    />
                                </td>
                                <td className="border border-gray-300 p-1">
                                    <input
                                        type="number"
                                        value={data.wage_emp_part_male || data.wage_part_male || ''}
                                        onChange={(e) => {
                                            setData('wage_emp_part_male', e.target.value);
                                            setData('wage_part_male', e.target.value);
                                        }}
                                        placeholder="০"
                                        className="w-full border border-gray-200 rounded px-1.5 py-1 text-xs text-center"
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 8. Officers */}
            <div className="bg-white rounded-xl shadow-sm p-4 md:p-5 border border-gray-200">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-gray-800 border-b pb-2">
                    <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">৮</span>
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>কর্মকর্তাদের তথ্য (Officers Information)</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Credit Officer */}
                    <div className="p-3 border rounded-xl bg-gray-50/50 space-y-2">
                        <label className="block text-xs font-bold text-gray-800">ঋণ কর্মকর্তা (Credit Officer)</label>
                        <div>
                            <label className="block text-[11px] font-medium text-gray-600 mb-0.5">নাম</label>
                            <input
                                type="text"
                                value={data.credit_officer_name}
                                onChange={(e) => setData('credit_officer_name', e.target.value)}
                                placeholder="নাম লিখুন"
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-medium text-gray-600 mb-0.5">পিন (PIN)</label>
                            <input
                                type="text"
                                value={data.credit_officer_pin}
                                onChange={(e) => setData('credit_officer_pin', e.target.value)}
                                placeholder="PIN লিখুন"
                                className={inputClass}
                            />
                        </div>
                    </div>

                    {/* Accountant */}
                    <div className="p-3 border rounded-xl bg-gray-50/50 space-y-2">
                        <label className="block text-xs font-bold text-gray-800">হিসাবরক্ষক (Accountant)</label>
                        <div>
                            <label className="block text-[11px] font-medium text-gray-600 mb-0.5">নাম</label>
                            <input
                                type="text"
                                value={data.accountant_name || ''}
                                onChange={(e) => setData('accountant_name', e.target.value)}
                                placeholder="নাম লিখুন"
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-medium text-gray-600 mb-0.5">পিন (PIN)</label>
                            <input
                                type="text"
                                value={data.accountant_pin || ''}
                                onChange={(e) => setData('accountant_pin', e.target.value)}
                                placeholder="PIN লিখুন"
                                className={inputClass}
                            />
                        </div>
                    </div>

                    {/* Branch Manager */}
                    <div className="p-3 border rounded-xl bg-gray-50/50 space-y-2">
                        <label className="block text-xs font-bold text-gray-800">শাখা ব্যবস্থাপক (Branch Manager)</label>
                        <div>
                            <label className="block text-[11px] font-medium text-gray-600 mb-0.5">নাম</label>
                            <input
                                type="text"
                                value={data.branch_manager_name}
                                onChange={(e) => setData('branch_manager_name', e.target.value)}
                                placeholder="নাম লিখুন"
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-medium text-gray-600 mb-0.5">পিন (PIN)</label>
                            <input
                                type="text"
                                value={data.branch_manager_pin}
                                onChange={(e) => setData('branch_manager_pin', e.target.value)}
                                placeholder="PIN লিখুন"
                                className={inputClass}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
