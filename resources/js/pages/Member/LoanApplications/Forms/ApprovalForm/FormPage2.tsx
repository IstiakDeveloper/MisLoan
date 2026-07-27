import React, { useEffect } from 'react';
import { FormPageProps } from './Types';

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

    return (
        <div id="form-page-2" data-sync="page-2" className="border-b pb-4">
            <h3 className="font-bold mb-4 bg-gray-200 px-3 py-1 inline-block rounded">পৃষ্ঠা ২: ঋণের প্রোফাইল</h3>

            <div className="mb-4">
                <h4 className="font-semibold border-b border-gray-400 pb-1 mb-3">ক. উদ্যোগ বিষয়ক সাধারণ তথ্যাবলী:</h4>
                <div className="space-y-4">
                    <div>
                        <label className="block text-[12px] font-medium mb-1">১. প্রস্তাবিত প্রকল্পের নাম</label>
                        <input type="text" value={data.proposed_project_name || data.project_name || ''} onChange={(e) => { setData('proposed_project_name', e.target.value); setData('project_name', e.target.value); }} className="w-full border rounded px-2 py-1.5 text-[12px]" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-2 rounded bg-gray-50">
                        <div className="col-span-2 text-[12px] font-medium">২. উদ্যোক্তাদের সংশ্লিষ্টতা</div>
                        <div className="flex items-center gap-2">
                            <span className="text-[12px] whitespace-nowrap">(ক) সার্বক্ষণিক:</span>
                            <input type="number" placeholder="বছর" value={data.entrepreneur_fulltime_years || ''} onChange={(e) => setData('entrepreneur_fulltime_years', e.target.value)} className="w-full border rounded px-2 py-1.5 text-[12px]" />
                            <input type="number" placeholder="মাস" value={data.entrepreneur_fulltime_months || ''} onChange={(e) => setData('entrepreneur_fulltime_months', e.target.value)} className="w-full border rounded px-2 py-1.5 text-[12px]" />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[12px] whitespace-nowrap">(খ) খণ্ডকালীন:</span>
                            <input type="number" placeholder="বছর" value={data.entrepreneur_parttime_years || ''} onChange={(e) => setData('entrepreneur_parttime_years', e.target.value)} className="w-full border rounded px-2 py-1.5 text-[12px]" />
                            <input type="number" placeholder="মাস" value={data.entrepreneur_parttime_months || ''} onChange={(e) => setData('entrepreneur_parttime_months', e.target.value)} className="w-full border rounded px-2 py-1.5 text-[12px]" />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="block text-[12px] font-medium whitespace-nowrap">৩. ঋণ কার্যক্রমে উদ্যোক্তার অভিজ্ঞতা:</label>
                        <input type="number" placeholder="বছর" value={data.loan_experience_years || ''} onChange={(e) => setData('loan_experience_years', e.target.value)} className="w-20 border rounded px-2 py-1.5 text-[12px]" />
                        <input type="number" placeholder="মাস" value={data.loan_experience_months || ''} onChange={(e) => setData('loan_experience_months', e.target.value)} className="w-20 border rounded px-2 py-1.5 text-[12px]" />
                    </div>

                    <div className="border p-2 rounded bg-gray-50">
                        <div className="flex items-center gap-2 mb-2">
                            <label className="block text-[12px] font-medium whitespace-nowrap">৪. প্রকল্পে নিয়োগকৃত জনবল (মোট):</label>
                            <input type="number" value={data.project_manpower_total || ''} onChange={(e) => setData('project_manpower_total', e.target.value)} className="w-24 border rounded px-2 py-1.5 text-[12px]" />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <div>
                                <label className="block text-[11px] mb-1">(ক) পরিবারের মধ্যে</label>
                                <input type="number" value={data.project_manpower_family || ''} onChange={(e) => setData('project_manpower_family', e.target.value)} className="w-full border rounded px-2 py-1.5 text-[12px]" />
                            </div>
                            <div>
                                <label className="block text-[11px] mb-1">(খ) পরিবারের বাইরে</label>
                                <input type="number" value={data.project_manpower_outside || ''} onChange={(e) => setData('project_manpower_outside', e.target.value)} className="w-full border rounded px-2 py-1.5 text-[12px]" />
                            </div>
                            <div>
                                <label className="block text-[11px] mb-1">(গ) প্রশিক্ষণপ্রাপ্ত লোকবল</label>
                                <input type="number" value={data.project_manpower_trained || ''} onChange={(e) => setData('project_manpower_trained', e.target.value)} className="w-full border rounded px-2 py-1.5 text-[12px]" />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[12px] font-medium mb-1">৫. উৎপাদন ও বাজারজাতকরণ সংক্রান্ত তথ্য</label>
                        <div className="space-y-2">
                            <input type="text" placeholder="ব্যবহৃত কাঁচামাল ক্রয়ের স্থান (নাম ও ঠিকানাসহ)" value={data.raw_material_purchase_location || ''} onChange={(e) => setData('raw_material_purchase_location', e.target.value)} className="w-full border rounded px-2 py-1.5 text-[12px]" />
                            <input type="text" placeholder="উৎপাদিত পণ্য বাজারজাতকরণের স্থান (নাম ও ঠিকানাসহ)" value={data.product_marketing_location || ''} onChange={(e) => setData('product_marketing_location', e.target.value)} className="w-full border rounded px-2 py-1.5 text-[12px]" />
                        </div>
                    </div>

                    <div className="border p-2 rounded bg-gray-50">
                        <label className="block text-[12px] font-medium mb-2">৬. বিগত ০১ বছরের আর্থিক তথ্য</label>
                        <div className="grid grid-cols-3 gap-2">
                            <input type="number" placeholder="পুঁজির পরিমাণ" value={data.last_year_capital || ''} onChange={(e) => setData('last_year_capital', e.target.value)} className="w-full border rounded px-2 py-1.5 text-[12px]" />
                            <input type="number" placeholder="বিক্রয় (সারা বছর)" value={data.last_year_sales || ''} onChange={(e) => setData('last_year_sales', e.target.value)} className="w-full border rounded px-2 py-1.5 text-[12px]" />
                            <input type="number" placeholder="মোট লাভ/ক্ষতি" value={data.last_year_profit_loss || ''} onChange={(e) => setData('last_year_profit_loss', e.target.value)} className="w-full border rounded px-2 py-1.5 text-[12px]" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[12px] font-medium mb-2">৭. প্রযোজ্য ক্ষেত্রে ট্রেড লাইসেন্স ও আয়ের প্রমাণ</label>
                        <div className="space-y-2">
                            <div className="flex gap-2">
                                <span className="text-[12px] whitespace-nowrap w-4">(ক)</span>
                                <input type="text" placeholder="লাইসেন্স প্রদানকারী কর্তৃপক্ষ" value={data.license_authority_1 || ''} onChange={(e) => setData('license_authority_1', e.target.value)} className="w-1/3 border rounded px-2 py-1.5 text-[12px]" />
                                <input type="text" placeholder="লাইসেন্স নম্বর" value={data.license_number_1 || ''} onChange={(e) => setData('license_number_1', e.target.value)} className="w-1/3 border rounded px-2 py-1.5 text-[12px]" />
                                <input type="text" placeholder="মেয়াদ" value={data.license_validity_1 || ''} onChange={(e) => setData('license_validity_1', e.target.value)} className="w-1/3 border rounded px-2 py-1.5 text-[12px]" />
                            </div>
                            <div className="flex gap-2">
                                <span className="text-[12px] whitespace-nowrap w-4">(খ)</span>
                                <input type="text" placeholder="লাইসেন্স প্রদানকারী কর্তৃপক্ষ" value={data.license_authority_2 || ''} onChange={(e) => setData('license_authority_2', e.target.value)} className="w-1/3 border rounded px-2 py-1.5 text-[12px]" />
                                <input type="text" placeholder="লাইসেন্স নম্বর" value={data.license_number_2 || ''} onChange={(e) => setData('license_number_2', e.target.value)} className="w-1/3 border rounded px-2 py-1.5 text-[12px]" />
                                <input type="text" placeholder="মেয়াদ" value={data.license_validity_2 || ''} onChange={(e) => setData('license_validity_2', e.target.value)} className="w-1/3 border rounded px-2 py-1.5 text-[12px]" />
                            </div>
                            <div className="flex items-center gap-4 text-[12px]">
                                <span>(গ) আয়ের প্রত্যয়ন আছে কি?</span>
                                <label className="flex items-center gap-1"><input type="radio" name="income_tax" value="yes" checked={data.income_tax_certification === 'yes'} onChange={() => setData('income_tax_certification', 'yes')} /> হ্যাঁ</label>
                                <label className="flex items-center gap-1"><input type="radio" name="income_tax" value="no" checked={data.income_tax_certification === 'no'} onChange={() => setData('income_tax_certification', 'no')} /> না</label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mb-4">
                <h4 className="font-semibold border-b border-gray-400 pb-1 mb-3">খ. আর্থিক তথ্য বিবরণী সমূহ:</h4>
                <div className="space-y-4">
                    <div className="border p-2 rounded bg-gray-50 overflow-x-auto">
                        <div className="flex items-center gap-2 mb-2 text-[12px]">
                            <span>০১. সদস্য এ' পর্যন্ত</span>
                            <input type="number" value={data.total_loans_taken || data.previous_loan_times || ''} onChange={(e) => { setData('total_loans_taken', e.target.value); setData('previous_loan_times', e.target.value); }} className="w-16 border rounded px-2 py-1 text-[12px]" />
                            <span>দফায় ঋণ গ্রহণ করেছেন। সর্বশেষ ৩ দফার ঋণ:</span>
                        </div>
                        <div className="space-y-2">
                            {[0, 1, 2].map((idx) => (
                                <div key={idx} className="flex gap-2">
                                    <input type="text" placeholder="দফা নং" value={data.last_three_loans?.[idx]?.loan_number || ''} onChange={(e) => {
                                        const rows = [...(data.last_three_loans || [])];
                                        if (!rows[idx]) rows[idx] = {};
                                        rows[idx].loan_number = e.target.value;
                                        setData('last_three_loans', rows);
                                    }} className="w-20 border rounded px-2 py-1.5 text-[12px]" />
                                    <input type="date" value={data.last_three_loans?.[idx]?.loan_date ? data.last_three_loans[idx].loan_date.split('T')[0] : ''} onChange={(e) => {
                                        const rows = [...(data.last_three_loans || [])];
                                        if (!rows[idx]) rows[idx] = {};
                                        rows[idx].loan_date = e.target.value;
                                        setData('last_three_loans', rows);
                                    }} className="w-1/4 border rounded px-2 py-1.5 text-[12px]" />
                                    <input type="number" placeholder="গৃহীত ঋণের পরিমাণ" value={data.last_three_loans?.[idx]?.loan_amount || ''} onChange={(e) => {
                                        const rows = [...(data.last_three_loans || [])];
                                        if (!rows[idx]) rows[idx] = {};
                                        rows[idx].loan_amount = e.target.value;
                                        setData('last_three_loans', rows);
                                    }} className="w-1/4 border rounded px-2 py-1.5 text-[12px]" />
                                    <input type="text" placeholder="প্রকল্পের নাম" value={data.last_three_loans?.[idx]?.project_name || ''} onChange={(e) => {
                                        const rows = [...(data.last_three_loans || [])];
                                        if (!rows[idx]) rows[idx] = {};
                                        rows[idx].project_name = e.target.value;
                                        setData('last_three_loans', rows);
                                    }} className="w-1/4 border rounded px-2 py-1.5 text-[12px]" />
                                    <input type="text" placeholder="সঞ্চয় স্থিতি" value={data.last_three_loans?.[idx]?.savings_status || ''} onChange={(e) => {
                                        const rows = [...(data.last_three_loans || [])];
                                        if (!rows[idx]) rows[idx] = {};
                                        rows[idx].savings_status = e.target.value;
                                        setData('last_three_loans', rows);
                                    }} className="w-1/4 border rounded px-2 py-1.5 text-[12px]" />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-[12px] font-medium mb-2">০২. অন্যান্য উৎস থেকে গৃহীত ঋণের বিবরণ (চলমান ঋণ)</label>
                        <div className="space-y-2">
                            {['ব্যাংক', 'এনজিও', 'গ্রামীণ বাংলাদেশ', 'আন্তর্জাতিক/বেসরকারি', 'অন্যান্য', 'খালি', 'খালি'].map((label, idx) => (
                                <div key={idx} className="flex gap-1 items-center">
                                    <span className="w-1/6 text-[10px] leading-tight text-right pr-2">{label}</span>
                                    <input type="text" placeholder="বর্তমান স্থিতি" value={data.other_loan_status?.[idx]?.current_status || ''} onChange={(e) => {
                                        const rows = [...(data.other_loan_status || [])];
                                        if (!rows[idx]) rows[idx] = {};
                                        rows[idx].current_status = e.target.value;
                                        setData('other_loan_status', rows);
                                    }} className="w-[18%] border rounded px-1 py-1 text-[11px]" />
                                    <input type="text" placeholder="মেয়াদ" value={data.other_loan_status?.[idx]?.round || ''} onChange={(e) => {
                                        const rows = [...(data.other_loan_status || [])];
                                        if (!rows[idx]) rows[idx] = {};
                                        rows[idx].round = e.target.value;
                                        setData('other_loan_status', rows);
                                    }} className="w-[12%] border rounded px-1 py-1 text-[11px]" />
                                    <input type="text" placeholder="নাম" value={data.other_loan_status?.[idx]?.borrower_name || ''} onChange={(e) => {
                                        const rows = [...(data.other_loan_status || [])];
                                        if (!rows[idx]) rows[idx] = {};
                                        rows[idx].borrower_name = e.target.value;
                                        setData('other_loan_status', rows);
                                    }} className="w-[20%] border rounded px-1 py-1 text-[11px]" />
                                    <input type="text" placeholder="মোবাইল" value={data.other_loan_status?.[idx]?.mobile || ''} onChange={(e) => {
                                        const rows = [...(data.other_loan_status || [])];
                                        if (!rows[idx]) rows[idx] = {};
                                        rows[idx].mobile = e.target.value;
                                        setData('other_loan_status', rows);
                                    }} className="w-[14%] border rounded px-1 py-1 text-[11px]" />
                                    <input type="text" placeholder="মন্তব্য" value={data.other_loan_status?.[idx]?.remarks || ''} onChange={(e) => {
                                        const rows = [...(data.other_loan_status || [])];
                                        if (!rows[idx]) rows[idx] = {};
                                        rows[idx].remarks = e.target.value;
                                        setData('other_loan_status', rows);
                                    }} className="w-[18%] border rounded px-1 py-1 text-[11px]" />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="border p-2 rounded bg-gray-50">
                        <label className="block text-[12px] font-medium mb-2">০৩. বিনিয়োগের পরিকল্পনা</label>
                        <div className="grid grid-cols-2 gap-4">
                            {/* বাম: বিনিয়োগের খাত */}
                            <div className="space-y-2">
                                <div className="text-[11px] font-semibold text-gray-700 border-b pb-1">বিনিয়োগের খাত</div>
                                <div>
                                    <label className="block text-[11px] text-gray-600 mb-0.5">সংস্থার অনুমোদনকৃত ঋণে ব্যয়ের পরিমাণ</label>
                                    <input
                                        type="number"
                                        value={data.invest_plan_applied_amount || ''}
                                        onChange={(e) => setData('invest_plan_applied_amount', e.target.value)}
                                        className="w-full border rounded px-2 py-1.5 text-[12px] bg-amber-50 border-amber-400"
                                    />
                                    <p className="text-[10px] text-gray-500 mt-0.5">পেজ ১ এর আবেদনকৃত ঋণ থেকে অটো</p>
                                </div>
                                <div>
                                    <label className="block text-[11px] text-gray-600 mb-0.5">নিজস্ব তহবিল</label>
                                    <input
                                        type="number"
                                        value={data.invest_plan_own_amount || ''}
                                        onChange={(e) => setData('invest_plan_own_amount', e.target.value)}
                                        className="w-full border rounded px-2 py-1.5 text-[12px] bg-amber-50 border-amber-400"
                                    />
                                    <p className="text-[10px] text-gray-500 mt-0.5">পেজ ১ এর (ক) নিজস্ব মূলধন থেকে অটো</p>
                                </div>
                                <div>
                                    <label className="block text-[11px] text-gray-600 mb-0.5">অন্যান্য উৎস যদি থাকে (নাম উল্লেখ করতে হবে)</label>
                                    <input type="number" value={data.invest_plan_other_amount || ''} onChange={(e) => setData('invest_plan_other_amount', e.target.value)} className="w-full border rounded px-2 py-1.5 text-[12px]" />
                                </div>
                                <div>
                                    <label className="block text-[11px] text-gray-600 mb-0.5 font-semibold">মোট</label>
                                    <input
                                        type="number"
                                        value={data.invest_plan_total || ''}
                                        readOnly
                                        className={`w-full border rounded px-2 py-1.5 text-[12px] bg-gray-100 cursor-not-allowed font-semibold ${totalsMismatch ? 'border-red-500' : ''}`}
                                    />
                                </div>
                            </div>

                            {/* ডান: ঋণের ব্যবহার */}
                            <div className="space-y-2">
                                <div className="text-[11px] font-semibold text-gray-700 border-b pb-1">ঋণের ব্যবহার</div>
                                <div>
                                    <label className="block text-[11px] text-gray-600 mb-0.5">মূলধনী ব্যয়</label>
                                    <p className="text-[10px] text-gray-400 mb-0.5">(ক) যন্ত্রপাতি ক্রয় / (খ) গৃহ নির্মাণ</p>
                                    <input type="number" value={data.invest_use_capital || ''} onChange={(e) => setData('invest_use_capital', e.target.value)} className="w-full border rounded px-2 py-1.5 text-[12px]" />
                                </div>
                                <div>
                                    <label className="block text-[11px] text-gray-600 mb-0.5">উদ্যোগ পরিচালনার ব্যয়</label>
                                    <input type="number" value={data.invest_use_running || ''} onChange={(e) => setData('invest_use_running', e.target.value)} className="w-full border rounded px-2 py-1.5 text-[12px]" />
                                </div>
                                <div>
                                    <label className="block text-[11px] text-gray-600 mb-0.5">কাঁচামাল ক্রয়</label>
                                    <input type="number" value={data.invest_use_other || ''} onChange={(e) => setData('invest_use_other', e.target.value)} className="w-full border rounded px-2 py-1.5 text-[12px]" />
                                </div>
                                <div>
                                    <label className="block text-[11px] text-gray-600 mb-0.5 font-semibold">মোট</label>
                                    <input
                                        type="number"
                                        value={data.invest_use_total || ''}
                                        readOnly
                                        className={`w-full border rounded px-2 py-1.5 text-[12px] bg-gray-100 cursor-not-allowed font-semibold ${totalsMismatch ? 'border-red-500' : ''}`}
                                    />
                                </div>
                            </div>
                        </div>
                        {totalsMismatch && (
                            <p className="mt-3 text-[12px] text-red-600 font-medium">
                                বিনিয়োগের খাতের মোট ({planTotal}) এবং ঋণের ব্যবহারের মোট ({useTotal}) মিলছে না। দুই মোট সমান হতে হবে।
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
