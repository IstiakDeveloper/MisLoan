import React, { useEffect, useState } from 'react';
import { FormPageProps } from './Types';
import { Briefcase, CreditCard, PieChart, Users, Award, Landmark } from 'lucide-react';

const toNum = (v: unknown): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

const sumOrEmpty = (...vals: unknown[]): string => {
    const hasAny = vals.some((v) => v !== '' && v !== null && v !== undefined);
    if (!hasAny) return '';
    return String(vals.reduce((acc: number, v) => acc + toNum(v), 0));
};

export default function FormPage2({ data, setData, requestedAmount }: FormPageProps) {
    const initialPopulatedLoans = (data.other_loan_status || []).reduce((max, row, i) => {
        const hasValue = row?.current_status || row?.round || row?.borrower_name || row?.mobile || row?.remarks || row?.source_name;
        return hasValue ? Math.max(max, i + 1) : max;
    }, 1);

    const [visibleLoanCount, setVisibleLoanCount] = useState<number>(initialPopulatedLoans);

    // সংস্থার অনুমোদনকৃত ঋণ = পেজ ১ এর আবেদনকৃত ঋণ / requested amount
    const appliedLoan =
        data.capital_applied_loan ||
        data.approval_amount_digits ||
        (requestedAmount != null && requestedAmount !== '' ? String(requestedAmount) : '');

    // নিজস্ব তহবিল = পেজ ১ এর (ক) নিজস্ব মূলধন
    const ownCapital = data.capital_own || '';

    useEffect(() => {
        if (appliedLoan !== '' && String(data.invest_plan_applied_amount || '') !== String(appliedLoan)) {
            setData('invest_plan_applied_amount', appliedLoan);
        }
    }, [appliedLoan]);

    useEffect(() => {
        if (ownCapital !== '' && String(data.invest_plan_own_amount || '') !== String(ownCapital)) {
            setData('invest_plan_own_amount', ownCapital);
        }
    }, [ownCapital]);

    // বাম কলাম মোট
    useEffect(() => {
        const total = sumOrEmpty(
            data.invest_plan_applied_amount,
            data.invest_plan_own_amount,
            data.invest_plan_other_amount,
        );
        if (String(data.invest_plan_total || '') !== total) {
            setData('invest_plan_total', total);
        }
    }, [data.invest_plan_applied_amount, data.invest_plan_own_amount, data.invest_plan_other_amount]);

    // ডান কলাম মোট
    useEffect(() => {
        const total = sumOrEmpty(
            data.invest_use_capital,
            data.invest_use_running,
            data.invest_use_other,
        );
        if (String(data.invest_use_total || '') !== total) {
            setData('invest_use_total', total);
        }
    }, [data.invest_use_capital, data.invest_use_running, data.invest_use_other]);

    const planTotal = toNum(data.invest_plan_total);
    const useTotal = toNum(data.invest_use_total);
    const hasPlanTotal = data.invest_plan_total !== '' && data.invest_plan_total != null;
    const hasUseTotal = data.invest_use_total !== '' && data.invest_use_total != null;
    const totalsMismatch = hasPlanTotal && hasUseTotal && planTotal !== useTotal;

    const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-xs md:text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all';
    const warningClass = 'w-full border border-amber-300 rounded-lg px-3 py-2 text-xs md:text-sm bg-amber-50/40 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all';

    return (
        <div id="form-page-2" data-sync="page-2" className="space-y-5">
            {/* Header Title */}
            <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-4 py-3 rounded-xl shadow-sm">
                <div className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5" />
                    <h3 className="font-bold text-sm md:text-base">পৃষ্ঠা ২: ঋণের প্রোফাইল ও ব্যবসা তথ্য</h3>
                </div>
                <span className="text-[11px] bg-white/20 px-2.5 py-1 rounded-full font-medium">স্টেপ ২ / ৪</span>
            </div>

            {/* Section A: Enterprise General Info */}
            <div className="bg-white p-4 md:p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-gray-800 font-bold text-sm border-b pb-2">
                    <Briefcase className="w-4 h-4 text-indigo-600" />
                    <span>ক. উদ্যোগ বিষয়ক সাধারণ তথ্যাবলী</span>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">১. প্রস্তাবিত প্রকল্পের নাম</label>
                        <input
                            type="text"
                            value={data.proposed_project_name || data.project_name || ''}
                            onChange={(e) => { setData('proposed_project_name', e.target.value); setData('project_name', e.target.value); }}
                            className={inputClass}
                            placeholder="প্রকল্পের নাম লিখুন"
                        />
                    </div>

                    <div className="bg-gray-50/70 p-3.5 rounded-xl border border-gray-200 space-y-3">
                        <div className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-blue-600" />
                            <span>২. উদ্যোক্তাদের সংশ্লিষ্টতা</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            <div className="space-y-1.5">
                                <span className="block text-xs font-semibold text-gray-600">(ক) সার্বক্ষণিক:</span>
                                <div className="grid grid-cols-2 gap-2">
                                    <input type="number" placeholder="বছর" value={data.entrepreneur_fulltime_years || ''} onChange={(e) => setData('entrepreneur_fulltime_years', e.target.value)} className={inputClass} />
                                    <input type="number" placeholder="মাস" value={data.entrepreneur_fulltime_months || ''} onChange={(e) => setData('entrepreneur_fulltime_months', e.target.value)} className={inputClass} />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <span className="block text-xs font-semibold text-gray-600">(খ) খণ্ডকালীন:</span>
                                <div className="grid grid-cols-2 gap-2">
                                    <input type="number" placeholder="বছর" value={data.entrepreneur_parttime_years || ''} onChange={(e) => setData('entrepreneur_parttime_years', e.target.value)} className={inputClass} />
                                    <input type="number" placeholder="মাস" value={data.entrepreneur_parttime_months || ''} onChange={(e) => setData('entrepreneur_parttime_months', e.target.value)} className={inputClass} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50/70 p-3.5 rounded-xl border border-gray-200 space-y-2">
                        <label className="block text-xs font-bold text-gray-700">৩. ঋণ কার্যক্রমে উদ্যোক্তার অভিজ্ঞতা</label>
                        <div className="grid grid-cols-2 gap-3 max-w-xs">
                            <input type="number" placeholder="বছর" value={data.loan_experience_years || ''} onChange={(e) => setData('loan_experience_years', e.target.value)} className={inputClass} />
                            <input type="number" placeholder="মাস" value={data.loan_experience_months || ''} onChange={(e) => setData('loan_experience_months', e.target.value)} className={inputClass} />
                        </div>
                    </div>

                    <div className="bg-gray-50/70 p-3.5 rounded-xl border border-gray-200 space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="block text-xs font-bold text-gray-700">৪. প্রকল্পে নিয়োগকৃত জনবল (মোট)</label>
                            <input type="number" value={data.project_manpower_total || ''} onChange={(e) => setData('project_manpower_total', e.target.value)} className="w-28 border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-bold bg-white" placeholder="মোট জনবল" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <div>
                                <label className="block text-[11px] font-medium text-gray-600 mb-1">(ক) পরিবারের মধ্যে</label>
                                <input type="number" value={data.project_manpower_family || ''} onChange={(e) => setData('project_manpower_family', e.target.value)} className={inputClass} placeholder="সংখ্যা" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-medium text-gray-600 mb-1">(খ) পরিবারের বাইরে</label>
                                <input type="number" value={data.project_manpower_outside || ''} onChange={(e) => setData('project_manpower_outside', e.target.value)} className={inputClass} placeholder="সংখ্যা" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-medium text-gray-600 mb-1">(গ) প্রশিক্ষণপ্রাপ্ত লোকবল</label>
                                <input type="number" value={data.project_manpower_trained || ''} onChange={(e) => setData('project_manpower_trained', e.target.value)} className={inputClass} placeholder="সংখ্যা" />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">৫. উৎপাদন ও বাজারজাতকরণ সংক্রান্ত তথ্য</label>
                        <div className="space-y-2">
                            <input type="text" placeholder="ব্যবহৃত কাঁচামাল ক্রয়ের স্থান (নাম ও ঠিকানাসহ)" value={data.raw_material_purchase_location || ''} onChange={(e) => setData('raw_material_purchase_location', e.target.value)} className={inputClass} />
                            <input type="text" placeholder="উৎপাদিত পণ্য বাজারজাতকরণের স্থান (নাম ও ঠিকানাসহ)" value={data.product_marketing_location || ''} onChange={(e) => setData('product_marketing_location', e.target.value)} className={inputClass} />
                        </div>
                    </div>

                    <div className="bg-gray-50/70 p-3.5 rounded-xl border border-gray-200 space-y-2">
                        <label className="block text-xs font-bold text-gray-700 mb-1">৬. বিগত ০১ বছরের আর্থিক তথ্য</label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <div>
                                <label className="block text-[10px] font-medium text-gray-500 mb-0.5">পুঁজির পরিমাণ (টাকা)</label>
                                <input type="number" value={data.last_year_capital || ''} onChange={(e) => setData('last_year_capital', e.target.value)} className={inputClass} placeholder="টাকা" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-medium text-gray-500 mb-0.5">বিক্রয় (সারা বছর)</label>
                                <input type="number" value={data.last_year_sales || ''} onChange={(e) => setData('last_year_sales', e.target.value)} className={inputClass} placeholder="টাকা" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-medium text-gray-500 mb-0.5">মোট লাভ/ক্ষতি (টাকা)</label>
                                <input type="number" value={data.last_year_profit_loss || ''} onChange={(e) => setData('last_year_profit_loss', e.target.value)} className={inputClass} placeholder="টাকা" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50/70 p-3.5 rounded-xl border border-gray-200 space-y-3">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                            <Award className="w-4 h-4 text-emerald-600" />
                            <span>৭. ট্রেড লাইসেন্স ও আয়ের প্রমাণ (প্রযোজ্য ক্ষেত্রে)</span>
                        </div>
                        <div className="space-y-2.5">
                            <div className="space-y-1 sm:space-y-0 sm:flex sm:gap-2">
                                <span className="text-xs font-bold text-gray-500 w-6 pt-2 sm:block hidden">(ক)</span>
                                <input type="text" placeholder="লাইসেন্স ১: কর্তৃপক্ষ" value={data.license_authority_1 || ''} onChange={(e) => setData('license_authority_1', e.target.value)} className={inputClass} />
                                <input type="text" placeholder="লাইসেন্স নম্বর" value={data.license_number_1 || ''} onChange={(e) => setData('license_number_1', e.target.value)} className={inputClass} />
                                <input type="text" placeholder="মেয়াদ" value={data.license_validity_1 || ''} onChange={(e) => setData('license_validity_1', e.target.value)} className={inputClass} />
                            </div>
                            <div className="space-y-1 sm:space-y-0 sm:flex sm:gap-2">
                                <span className="text-xs font-bold text-gray-500 w-6 pt-2 sm:block hidden">(খ)</span>
                                <input type="text" placeholder="লাইসেন্স ২: কর্তৃপক্ষ" value={data.license_authority_2 || ''} onChange={(e) => setData('license_authority_2', e.target.value)} className={inputClass} />
                                <input type="text" placeholder="লাইসেন্স নম্বর" value={data.license_number_2 || ''} onChange={(e) => setData('license_number_2', e.target.value)} className={inputClass} />
                                <input type="text" placeholder="মেয়াদ" value={data.license_validity_2 || ''} onChange={(e) => setData('license_validity_2', e.target.value)} className={inputClass} />
                            </div>
                            <div className="flex items-center gap-4 text-xs pt-1 font-medium text-gray-700">
                                <span>(গ) আয়ের প্রত্যয়ন আছে কি?</span>
                                <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" name="income_tax" value="yes" checked={data.income_tax_certification === 'yes'} onChange={() => setData('income_tax_certification', 'yes')} className="text-indigo-600" /> হ্যাঁ</label>
                                <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" name="income_tax" value="no" checked={data.income_tax_certification === 'no'} onChange={() => setData('income_tax_certification', 'no')} className="text-indigo-600" /> না</label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Section B: Financial Statements */}
            <div className="bg-white p-4 md:p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-gray-800 font-bold text-sm border-b pb-2">
                    <CreditCard className="w-4 h-4 text-purple-600" />
                    <span>খ. আর্থিক তথ্য বিবরণী সমূহ</span>
                </div>

                <div className="space-y-4">
                    {/* Last 3 Loans */}
                    <div className="bg-gray-50/70 p-3.5 rounded-xl border border-gray-200 space-y-3">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-700">
                            <span>০১. সদস্য এ' পর্যন্ত মোট</span>
                            <input type="number" value={data.total_loans_taken || data.previous_loan_times || ''} onChange={(e) => { setData('total_loans_taken', e.target.value); setData('previous_loan_times', e.target.value); }} className="w-16 border border-gray-300 rounded px-2 py-1 text-xs font-bold text-center bg-white" />
                            <span>দফায় ঋণ গ্রহণ করেছেন। (সর্বশেষ ৩ দফার তথ্য):</span>
                        </div>
                        
                        <div className="space-y-2.5">
                            {[0, 1, 2].map((idx) => (
                                <div key={idx} className="bg-white p-3 rounded-lg border border-gray-200 shadow-xs space-y-2">
                                    <div className="text-[11px] font-bold text-indigo-700 flex items-center justify-between border-b pb-1">
                                        <span>দফা তথ্য #{idx + 1}</span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                        <input type="text" placeholder="দফা নং" value={data.last_three_loans?.[idx]?.loan_number || ''} onChange={(e) => {
                                            const rows = [...(data.last_three_loans || [])];
                                            if (!rows[idx]) rows[idx] = {};
                                            rows[idx].loan_number = e.target.value;
                                            setData('last_three_loans', rows);
                                        }} className={inputClass} />
                                        <input type="date" value={data.last_three_loans?.[idx]?.loan_date ? data.last_three_loans[idx].loan_date.split('T')[0] : ''} onChange={(e) => {
                                            const rows = [...(data.last_three_loans || [])];
                                            if (!rows[idx]) rows[idx] = {};
                                            rows[idx].loan_date = e.target.value;
                                            setData('last_three_loans', rows);
                                        }} className={inputClass} />
                                        <input type="number" placeholder="ঋণের পরিমাণ" value={data.last_three_loans?.[idx]?.loan_amount || ''} onChange={(e) => {
                                            const rows = [...(data.last_three_loans || [])];
                                            if (!rows[idx]) rows[idx] = {};
                                            rows[idx].loan_amount = e.target.value;
                                            setData('last_three_loans', rows);
                                        }} className={inputClass} />
                                        <input type="text" placeholder="প্রকল্পের নাম" value={data.last_three_loans?.[idx]?.project_name || ''} onChange={(e) => {
                                            const rows = [...(data.last_three_loans || [])];
                                            if (!rows[idx]) rows[idx] = {};
                                            rows[idx].project_name = e.target.value;
                                            setData('last_three_loans', rows);
                                        }} className={inputClass} />
                                        <input type="text" placeholder="সঞ্চয় স্থিতি" value={data.last_three_loans?.[idx]?.savings_status || ''} onChange={(e) => {
                                            const rows = [...(data.last_three_loans || [])];
                                            if (!rows[idx]) rows[idx] = {};
                                            rows[idx].savings_status = e.target.value;
                                            setData('last_three_loans', rows);
                                        }} className={`${inputClass} col-span-2 sm:col-span-1`} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Other Loans */}
                    <div className="bg-gray-50/70 p-3.5 rounded-xl border border-gray-200 space-y-3">
                        <div className="flex items-center justify-between border-b pb-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                                <Landmark className="w-4 h-4 text-emerald-600" />
                                <span>০২. অন্যান্য উৎস থেকে গৃহীত ঋণ (চলমান ঋণ)</span>
                            </div>
                            {visibleLoanCount < 7 && (
                                <button
                                    type="button"
                                    onClick={() => setVisibleLoanCount(prev => Math.min(7, prev + 1))}
                                    className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg font-semibold hover:bg-emerald-100 active:scale-95 transition-all flex items-center gap-1"
                                >
                                    + আরেকটি ঋণ যোগ করুন
                                </button>
                            )}
                        </div>
                        
                        <div className="space-y-3">
                            {Array.from({ length: visibleLoanCount }).map((_, idx) => {
                                const currentObj = data.other_loan_status?.[idx] || {};
                                const sourceName = currentObj.source_name || '';
                                const isCustom = currentObj.is_custom || (sourceName !== '' && !['ব্যাংক', 'এনজিও', 'গ্রামীণ ব্যাংক', 'ব্র্যাক', 'আশা', 'বুরো বাংলাদেশ', 'টিএমএসএস', 'সোনালী ব্যাংক', 'কৃষি ব্যাংক', 'ইসলামী ব্যাংক', 'পুবালী ব্যাংক', 'সিটি ব্যাংক'].includes(sourceName));

                                return (
                                    <div key={idx} className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs space-y-2.5">
                                        <div className="text-[11px] font-bold text-gray-700 flex items-center justify-between border-b pb-1">
                                            <span>চলমান ঋণ বিবরণী #{idx + 1}</span>
                                            {idx > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const rows = [...(data.other_loan_status || [])];
                                                        rows[idx] = { current_status: '', round: '', borrower_name: '', mobile: '', remarks: '', source_name: '', custom_source: '', is_custom: false };
                                                        setData('other_loan_status', rows);
                                                        setVisibleLoanCount(prev => Math.max(1, prev - 1));
                                                    }}
                                                    className="text-[10px] text-red-500 hover:text-red-700 font-semibold"
                                                >
                                                    ✕ বাদ দিন
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            <div>
                                                <label className="block text-[11px] text-gray-600 font-semibold mb-1">সংস্থার/প্রতিষ্ঠানের নাম (ব্যাংক/এনজিও)</label>
                                                <select
                                                    value={isCustom ? 'custom' : sourceName}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        const rows = [...(data.other_loan_status || [])];
                                                        if (!rows[idx]) rows[idx] = {};
                                                        if (val === 'custom') {
                                                            rows[idx].is_custom = true;
                                                            rows[idx].source_name = rows[idx].custom_source || '';
                                                        } else {
                                                            rows[idx].is_custom = false;
                                                            rows[idx].source_name = val;
                                                        }
                                                        setData('other_loan_status', rows);
                                                    }}
                                                    className={inputClass}
                                                >
                                                    <option value="">-- ব্যাংক / এনজিও নির্বাচন করুন --</option>
                                                    <option value="ব্যাংক">ব্যাংক</option>
                                                    <option value="এনজিও">এনজিও</option>
                                                    <option value="গ্রামীণ ব্যাংক">গ্রামীণ ব্যাংক</option>
                                                    <option value="ব্র্যাক">ব্র্যাক</option>
                                                    <option value="আশা">আশা</option>
                                                    <option value="বুরো বাংলাদেশ">বুরো বাংলাদেশ</option>
                                                    <option value="টিএমএসএস">টিএমএসএস</option>
                                                    <option value="সোনালী ব্যাংক">সোনালী ব্যাংক</option>
                                                    <option value="কৃষি ব্যাংক">কৃষি ব্যাংক</option>
                                                    <option value="ইসলামী ব্যাংক">ইসলামী ব্যাংক</option>
                                                    <option value="পুবালী ব্যাংক">পুবালী ব্যাংক</option>
                                                    <option value="সিটি ব্যাংক">সিটি ব্যাংক</option>
                                                    <option value="custom">অন্যান্য / কাস্টম নাম লিখুন...</option>
                                                </select>

                                                {isCustom && (
                                                    <input
                                                        type="text"
                                                        placeholder="কাস্টম ব্যাংক/এনজিও-এর নাম লিখুন..."
                                                        value={currentObj.custom_source ?? (isCustom ? sourceName : '')}
                                                        onChange={(e) => {
                                                            const txt = e.target.value;
                                                            const rows = [...(data.other_loan_status || [])];
                                                            if (!rows[idx]) rows[idx] = {};
                                                            rows[idx].is_custom = true;
                                                            rows[idx].custom_source = txt;
                                                            rows[idx].source_name = txt;
                                                            setData('other_loan_status', rows);
                                                        }}
                                                        className={`${inputClass} mt-2 bg-amber-50/60 border-amber-300`}
                                                    />
                                                )}
                                            </div>

                                            <div>
                                                <label className="block text-[11px] text-gray-600 font-semibold mb-1">বর্তমান গৃহীত ঋণের পরিমাণ (স্থিতি)</label>
                                                <input
                                                    type="text"
                                                    placeholder="টাকা"
                                                    value={currentObj.current_status || ''}
                                                    onChange={(e) => {
                                                        const rows = [...(data.other_loan_status || [])];
                                                        if (!rows[idx]) rows[idx] = {};
                                                        rows[idx].current_status = e.target.value;
                                                        setData('other_loan_status', rows);
                                                    }}
                                                    className={inputClass}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                            <div>
                                                <label className="block text-[10px] text-gray-500 font-medium mb-0.5">ঋণের মেয়াদ</label>
                                                <input
                                                    type="text"
                                                    placeholder="মেয়াদ"
                                                    value={currentObj.round || ''}
                                                    onChange={(e) => {
                                                        const rows = [...(data.other_loan_status || [])];
                                                        if (!rows[idx]) rows[idx] = {};
                                                        rows[idx].round = e.target.value;
                                                        setData('other_loan_status', rows);
                                                    }}
                                                    className={inputClass}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] text-gray-500 font-medium mb-0.5">তথ্য প্রদানকারীর নাম</label>
                                                <input
                                                    type="text"
                                                    placeholder="নাম"
                                                    value={currentObj.borrower_name || ''}
                                                    onChange={(e) => {
                                                        const rows = [...(data.other_loan_status || [])];
                                                        if (!rows[idx]) rows[idx] = {};
                                                        rows[idx].borrower_name = e.target.value;
                                                        setData('other_loan_status', rows);
                                                    }}
                                                    className={inputClass}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] text-gray-500 font-medium mb-0.5">মোবাইল</label>
                                                <input
                                                    type="text"
                                                    placeholder="মোবাইল"
                                                    value={currentObj.mobile || ''}
                                                    onChange={(e) => {
                                                        const rows = [...(data.other_loan_status || [])];
                                                        if (!rows[idx]) rows[idx] = {};
                                                        rows[idx].mobile = e.target.value;
                                                        setData('other_loan_status', rows);
                                                    }}
                                                    className={inputClass}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] text-gray-500 font-medium mb-0.5">মন্তব্য</label>
                                                <input
                                                    type="text"
                                                    placeholder="মন্তব্য"
                                                    value={currentObj.remarks || ''}
                                                    onChange={(e) => {
                                                        const rows = [...(data.other_loan_status || [])];
                                                        if (!rows[idx]) rows[idx] = {};
                                                        rows[idx].remarks = e.target.value;
                                                        setData('other_loan_status', rows);
                                                    }}
                                                    className={inputClass}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Investment Plan & Use Comparison */}
                    <div className="bg-white p-4 md:p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 text-gray-800 font-bold text-sm border-b pb-2">
                            <PieChart className="w-4 h-4 text-blue-600" />
                            <span>০৩. বিনিয়োগের পরিকল্পনা ও ঋণের ব্যবহার</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Left: Investment Plan Sources */}
                            <div className="bg-indigo-50/30 p-3.5 rounded-xl border border-indigo-100 space-y-3">
                                <div className="text-xs font-bold text-indigo-900 border-b border-indigo-200 pb-1">১. বিনিয়োগের খাত (উৎস)</div>
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-700 mb-1">সংস্থার অনুমোদিত ঋণে ব্যয়ের পরিমাণ</label>
                                    <input
                                        type="number"
                                        value={data.invest_plan_applied_amount || ''}
                                        onChange={(e) => setData('invest_plan_applied_amount', e.target.value)}
                                        className={warningClass}
                                    />
                                    <p className="text-[10px] text-gray-500 mt-0.5">পেজ ১ এর আবেদনকৃত ঋণ থেকে অটো</p>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-700 mb-1">নিজস্ব তহবিল</label>
                                    <input
                                        type="number"
                                        value={data.invest_plan_own_amount || ''}
                                        onChange={(e) => setData('invest_plan_own_amount', e.target.value)}
                                        className={warningClass}
                                    />
                                    <p className="text-[10px] text-gray-500 mt-0.5">পেজ ১ এর (ক) নিজস্ব মূলধন থেকে অটো</p>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-700 mb-1">অন্যান্য উৎস (যদি থাকে)</label>
                                    <input type="number" value={data.invest_plan_other_amount || ''} onChange={(e) => setData('invest_plan_other_amount', e.target.value)} className={inputClass} placeholder="টাকা" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-800 mb-1">মোট পরিকল্পনা (খাত)</label>
                                    <input
                                        type="number"
                                        value={data.invest_plan_total || ''}
                                        readOnly
                                        className={`w-full border rounded-lg px-3 py-2 text-xs md:text-sm font-bold bg-gray-100 cursor-not-allowed ${totalsMismatch ? 'border-red-500 text-red-600' : 'border-gray-300 text-gray-800'}`}
                                    />
                                </div>
                            </div>

                            {/* Right: Loan Usage Breakdown */}
                            <div className="bg-emerald-50/30 p-3.5 rounded-xl border border-emerald-100 space-y-3">
                                <div className="text-xs font-bold text-emerald-900 border-b border-emerald-200 pb-1">২. ঋণের ব্যবহার (খাতভিত্তিক)</div>
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-700 mb-1">মূলধনী ব্যয় (যন্ত্রপাতি / গৃহ)</label>
                                    <input type="number" value={data.invest_use_capital || ''} onChange={(e) => setData('invest_use_capital', e.target.value)} className={inputClass} placeholder="টাকা" />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-700 mb-1">উদ্যোগ পরিচালনার ব্যয়</label>
                                    <input type="number" value={data.invest_use_running || ''} onChange={(e) => setData('invest_use_running', e.target.value)} className={inputClass} placeholder="টাকা" />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-700 mb-1">কাঁচামাল ক্রয়</label>
                                    <input type="number" value={data.invest_use_other || ''} onChange={(e) => setData('invest_use_other', e.target.value)} className={inputClass} placeholder="টাকা" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-800 mb-1">মোট ব্যবহার</label>
                                    <input
                                        type="number"
                                        value={data.invest_use_total || ''}
                                        readOnly
                                        className={`w-full border rounded-lg px-3 py-2 text-xs md:text-sm font-bold bg-gray-100 cursor-not-allowed ${totalsMismatch ? 'border-red-500 text-red-600' : 'border-gray-300 text-gray-800'}`}
                                    />
                                </div>
                            </div>
                        </div>

                        {totalsMismatch && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
                                ⚠️ বিনিয়োগের খাতের মোট (৳{planTotal}) এবং ঋণের ব্যবহারের মোট (৳{useTotal}) মিলছে না। দুটি মোট পরিমাণ সমান হতে হবে।
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

