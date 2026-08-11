import React, { useEffect, useMemo } from 'react';
import { AgrosorFormPageProps } from './Types';
import { Calculator, ShieldCheck, Users, PenLine } from 'lucide-react';
import { calcInstallmentSchedule, getLoanDurationMonths } from '@/utils/loanInterest';

const toNum = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

export default function FormPage2({
    data,
    setData,
    loanProduct,
    loanCategory,
    requestedAmount,
    member,
    isLegacy,
}: AgrosorFormPageProps) {
    const fromAdmission = !!(member && !isLegacy);

    useEffect(() => {
        if (!Array.isArray(data.previous_loans) || data.previous_loans.length === 0) {
            setData('previous_loans', [
                { receive_date: '', round: '', project_name: '', alt_project: '', repay_date: '' },
                { receive_date: '', round: '', project_name: '', alt_project: '', repay_date: '' },
                { receive_date: '', round: '', project_name: '', alt_project: '', repay_date: '' },
            ]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Auto-calc fund total
    useEffect(() => {
        const total =
            toNum(data.fund_own) + toNum(data.fund_applied_loan) + toNum(data.fund_other);
        if (String(data.fund_total || '') !== String(total || '')) {
            setData('fund_total', total ? String(total) : '');
        }
    }, [data.fund_own, data.fund_applied_loan, data.fund_other]);

    // Auto-calc alt income total
    useEffect(() => {
        const total =
            toNum(data.alt_income_agriculture) +
            toNum(data.alt_income_job) +
            toNum(data.alt_income_other);
        if (String(data.alt_income_total || '') !== String(total || '')) {
            setData('alt_income_total', total ? String(total) : '');
        }
    }, [data.alt_income_agriculture, data.alt_income_job, data.alt_income_other]);

    // Net profit
    useEffect(() => {
        const income = toNum(data.last_year_total_income);
        const expense = toNum(data.last_year_total_expense);
        if (data.last_year_total_income === '' && data.last_year_total_expense === '') {
            if (data.last_year_net_profit !== '') setData('last_year_net_profit', '');
            return;
        }
        const net = income - expense;
        if (String(data.last_year_net_profit || '') !== String(net)) {
            setData('last_year_net_profit', String(net));
        }
    }, [data.last_year_total_income, data.last_year_total_expense]);

    // Loan schedule: Sufolon/Agrosor = এককালীন (full principal + SC once). Never monthly.
    useEffect(() => {
        const amount =
            Number(data.applied_loan_amount) ||
            Number(data.fund_applied_loan) ||
            Number(requestedAmount) ||
            0;
        const months = getLoanDurationMonths(loanProduct, 6);
        const durationLabel = `${months} মাস`;
        if (String(data.loan_duration_label || '') !== durationLabel) {
            setData('loan_duration_label', durationLabel);
        }
        const rate = loanProduct?.interest_rate;
        if (rate != null && rate !== '' && String(data.service_charge_rate || '') !== String(rate)) {
            setData('service_charge_rate', String(rate));
        }

        // Force Sufolon category so product.installment_type=monthly cannot win
        const schedule = calcInstallmentSchedule(
            amount,
            { ...(loanProduct || {}), installment_type: 'lump_sum', number_of_installments: 1 },
            months,
            loanCategory || { category_code: 'SFL' },
        );
        if (!schedule) {
            if (data.installment_type !== 'এককালীন') setData('installment_type', 'এককালীন');
            return;
        }
        if (String(data.installment_type || '') !== 'এককালীন') {
            setData('installment_type', 'এককালীন');
        }
        if (String(data.installment_principal || '') !== String(schedule.principal)) {
            setData('installment_principal', String(schedule.principal));
        }
        if (String(data.installment_service_charge || '') !== String(schedule.serviceCharge)) {
            setData('installment_service_charge', String(schedule.serviceCharge));
        }
        const total = schedule.principal + schedule.serviceCharge;
        if (String(data.installment_total || '') !== String(total)) {
            setData('installment_total', String(total));
        }
    }, [
        data.applied_loan_amount,
        data.fund_applied_loan,
        requestedAmount,
        loanProduct?.interest_rate,
        loanProduct?.service_charge_per_thousand,
        loanProduct?.duration_months,
        loanProduct?.number_of_installments,
        loanProduct?.installment_type,
        loanCategory?.category_code,
        loanCategory?.category_name,
        loanCategory?.category_name_bn,
    ]);

    const scheduleAmount =
        Number(data.applied_loan_amount) ||
        Number(data.fund_applied_loan) ||
        Number(requestedAmount) ||
        0;
    const scheduleMonths = getLoanDurationMonths(loanProduct, 6);
    const liveSchedule = useMemo(
        () =>
            calcInstallmentSchedule(
                scheduleAmount,
                { ...(loanProduct || {}), installment_type: 'lump_sum', number_of_installments: 1 },
                scheduleMonths,
                loanCategory || { category_code: 'SFL' },
            ),
        [
            scheduleAmount,
            scheduleMonths,
            loanProduct?.interest_rate,
            loanProduct?.service_charge_per_thousand,
            loanProduct?.duration_months,
            loanCategory?.category_code,
        ],
    );
    const schedulePrincipal = liveSchedule ? String(liveSchedule.principal) : data.installment_principal || '';
    const scheduleSc = liveSchedule
        ? String(liveSchedule.serviceCharge)
        : data.installment_service_charge || '';
    const scheduleTotal = liveSchedule
        ? String(liveSchedule.principal + liveSchedule.serviceCharge)
        : data.installment_total || '';

    const inputClass =
        'w-full border border-gray-300 rounded px-2 py-1.5 text-xs bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500';
    const thClass = 'border border-gray-400 bg-gray-100 px-1 py-1 text-[10px] font-semibold text-center';
    const tdClass = 'border border-gray-300 px-1 py-0.5';
    const readOnlyClass = `${inputClass} bg-gray-100 cursor-not-allowed`;
    const admissionClass = fromAdmission
        ? 'w-full border border-gray-200 rounded px-2 py-1.5 text-xs bg-gray-100/90 text-gray-700 cursor-not-allowed font-medium'
        : inputClass;

    return (
        <div id="agrosor-page-2" data-sync="page-2" className="space-y-5">
            <div className="flex items-center justify-between bg-gradient-to-r from-emerald-700 to-teal-700 text-white px-4 py-3 rounded-xl shadow-sm">
                <div className="flex items-center gap-2">
                    <Calculator className="w-5 h-5" />
                    <h3 className="font-bold text-sm md:text-base">পৃষ্ঠা ২: তহবিল, আয় ও ঋণ তফসিল</h3>
                </div>
            </div>

            {/* 7. Fund sources */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
                <p className="font-bold text-sm text-gray-800 border-b pb-2">৭. পরিকল্পনা অনুযায়ী বিনিয়োগকৃত তহবিল এবং তহবিলের উৎস</p>
                <div className="space-y-2">
                    {[
                        ['fund_own', 'নিজস্ব তহবিল'],
                        ['fund_applied_loan', 'সংস্থায় আবেদনকৃত ঋণের পরিমাণ'],
                        ['fund_other', 'অন্যান্য উৎস (যদি থাকে)'],
                    ].map(([key, label]) => (
                        <div key={key} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                            <span className="text-xs font-medium text-gray-700">{label}</span>
                            <input type="number" className={inputClass} placeholder="টাকার পরিমাণ" value={data[key] || ''} onChange={(e) => setData(key, e.target.value)} />
                            <input type="text" className={inputClass} placeholder="মন্তব্য" value={data[`${key}_remarks`] || ''} onChange={(e) => setData(`${key}_remarks`, e.target.value)} />
                        </div>
                    ))}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                        <span className="text-xs font-bold text-gray-800">মোট বিনিয়োগকৃত তহবিল</span>
                        <input type="text" className={readOnlyClass} value={data.fund_total || ''} readOnly />
                    </div>
                </div>
            </div>

            {/* 8. Alt income */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
                <p className="font-bold text-sm text-gray-800 border-b pb-2">৮. উদ্যোক্তার সম্ভাব্য বিকল্প উৎস হতে বাৎসরিক আয় বিবরণী</p>
                {[
                    ['alt_income_agriculture', 'কৃষি হতে'],
                    ['alt_income_job', 'চাকরি হতে'],
                    ['alt_income_other', 'অন্যান্য'],
                ].map(([key, label]) => (
                    <div key={key} className="grid grid-cols-2 gap-2 items-center">
                        <span className="text-xs text-gray-700">{label}</span>
                        <input type="number" className={inputClass} value={data[key] || ''} onChange={(e) => setData(key, e.target.value)} />
                    </div>
                ))}
                <div className="grid grid-cols-2 gap-2 items-center">
                    <span className="text-xs font-bold">মোট</span>
                    <input type="text" className={readOnlyClass} value={data.alt_income_total || ''} readOnly />
                </div>
            </div>

            {/* 9. Last year */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
                <p className="font-bold text-sm text-gray-800 border-b pb-2">৯. উদ্যোক্তার গত বছরের সংক্ষিপ্ত আয়-ব্যয় বিবরণী</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                        <label className="text-xs font-semibold text-gray-700 mb-1 block">মোট আয়</label>
                        <input type="number" className={admissionClass} readOnly={fromAdmission} value={data.last_year_total_income || ''} onChange={(e) => setData('last_year_total_income', e.target.value)} />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-700 mb-1 block">মোট ব্যয়</label>
                        <input type="number" className={admissionClass} readOnly={fromAdmission} value={data.last_year_total_expense || ''} onChange={(e) => setData('last_year_total_expense', e.target.value)} />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-700 mb-1 block">নিট লাভ</label>
                        <input type="text" className={readOnlyClass} value={data.last_year_net_profit || ''} readOnly />
                    </div>
                </div>
            </div>

            {/* 10 */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">১০. চলমান ঋণের দফা নং</label>
                    <input type="text" className={admissionClass} readOnly={fromAdmission} value={data.current_loan_round || ''} onChange={(e) => setData('current_loan_round', e.target.value)} />
                </div>
                <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">আবেদিত ঋণের পরিমাণ</label>
                    <input type="number" className={admissionClass} readOnly={fromAdmission} value={data.applied_loan_amount || ''} onChange={(e) => setData('applied_loan_amount', e.target.value)} />
                </div>
            </div>

            {/* 11 Previous loans */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3 overflow-x-auto">
                <p className="font-bold text-sm text-gray-800 border-b pb-2">১১. বিগত ঋণের তথ্য (সর্বশেষ ৩ দফা)</p>
                <table className="w-full min-w-[750px] border-collapse text-xs">
                    <thead>
                        <tr>
                            {['ক্র.নং', 'বিগত ঋণ গ্রহণের তারিখ', 'দফা নং', 'প্রকল্পের নাম', 'বিকল্প প্রকল্পের নাম', 'ঋণ পরিশোধের তারিখ'].map((h) => (
                                <th key={h} className={thClass}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {(data.previous_loans || []).map((row: any, i: number) => (
                            <tr key={i}>
                                <td className={`${tdClass} text-center`}>{i + 1}</td>
                                {(['receive_date', 'round', 'project_name', 'alt_project', 'repay_date'] as const).map((k) => (
                                    <td key={k} className={tdClass}>
                                        <input
                                            type={k.includes('date') ? 'date' : 'text'}
                                            className={inputClass}
                                            value={row[k] || ''}
                                            onChange={(e) => {
                                                const next = [...(data.previous_loans || [])];
                                                next[i] = { ...next[i], [k]: e.target.value };
                                                setData('previous_loans', next);
                                            }}
                                        />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* 12 Loan schedule */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
                <div className="flex items-center gap-2 font-bold text-sm text-gray-800 border-b pb-2">
                    <Calculator className="w-4 h-4 text-emerald-700" />
                    <span>১২. ঋণের মেয়াদ ও পরিশোধের তফসিল</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs font-semibold text-gray-700 mb-1 block">ক) ঋণের মেয়াদকাল (মাস/বছর)</label>
                        <input type="text" className={readOnlyClass} value={`${scheduleMonths} মাস`} readOnly />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-700 mb-1 block">খ) আরোপিত সার্ভিস চার্জের হার (%)</label>
                        <input
                            type="text"
                            className={readOnlyClass}
                            value={
                                loanProduct?.interest_rate != null
                                    ? String(loanProduct.interest_rate)
                                    : data.service_charge_rate || ''
                            }
                            readOnly
                        />
                        <p className="text-[10px] text-amber-700 mt-1">বার্ষিক হার; ৬ মাসের লোনে সার্ভিস চার্জ মেয়াদ অনুযায়ী প্রো-রেট করা হয়।</p>
                    </div>
                </div>
                <p className="text-xs font-semibold text-gray-800">গ) ঋণ পরিশোধের তফসিল</p>
                <p className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-100 rounded px-2 py-1">
                    সুফলন: মেয়াদ শেষে <strong>এককালীন</strong> পরিশোধ (মাসিক কিস্তি নয়)। আসল + সার্ভিস চার্জ একসাথে দেখানো হয়েছে।
                </p>
                <table className="w-full border-collapse text-xs">
                    <thead>
                        <tr>
                            {['পরিশোধের ধরণ', 'আসল (টাকা)', 'সার্ভিস চার্জ (টাকা)', 'মোট টাকা'].map((h) => (
                                <th key={h} className={thClass}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className={tdClass}>
                                <input className={readOnlyClass} value="এককালীন" readOnly />
                            </td>
                            <td className={tdClass}>
                                <input className={readOnlyClass} value={schedulePrincipal} readOnly />
                            </td>
                            <td className={tdClass}>
                                <input className={readOnlyClass} value={scheduleSc} readOnly />
                            </td>
                            <td className={tdClass}>
                                <input className={readOnlyClass} value={scheduleTotal} readOnly />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* 13 Guarantors */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
                <div className="flex items-center gap-2 font-bold text-sm text-gray-800 border-b pb-2">
                    <Users className="w-4 h-4 text-emerald-700" />
                    <span>১৩. জামিনদারের তথ্য</span>
                </div>
                {[1, 2].map((n) => {
                    const lockFirst = fromAdmission && n === 1;
                    const cls = lockFirst ? admissionClass : inputClass;
                    return (
                        <div key={n} className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <input type="text" placeholder={`${n}| নাম`} className={cls} readOnly={lockFirst} value={data[`guarantor_${n}_name`] || ''} onChange={(e) => setData(`guarantor_${n}_name`, e.target.value)} />
                            <input type="text" placeholder="ঠিকানা" className={cls} readOnly={lockFirst} value={data[`guarantor_${n}_address`] || ''} onChange={(e) => setData(`guarantor_${n}_address`, e.target.value)} />
                            <input type="text" placeholder="মোবাইল নং" className={cls} readOnly={lockFirst} value={data[`guarantor_${n}_mobile`] || ''} onChange={(e) => setData(`guarantor_${n}_mobile`, e.target.value)} />
                        </div>
                    );
                })}
                <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">সদস্য/সদস্যার স্বাক্ষর</label>
                    <input type="text" className={admissionClass} readOnly={fromAdmission} value={data.member_signature || ''} onChange={(e) => setData('member_signature', e.target.value)} placeholder="স্বাক্ষর / নাম" />
                </div>
            </div>

            {/* Office section — FO fills (ক); BM/RM/final auto from approval */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-300 space-y-3">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-800 border-b pb-2">
                    <ShieldCheck className="w-4 h-4 text-slate-700" />
                    <span>সংস্থার অফিস পর্যায়ে পূরণীয়</span>
                </div>
                <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    শাখা/আঞ্চলিক/চূড়ান্ত অনুমোদনকারীর মন্তব্য এখানে ম্যানুয়ালি লিখবেন না। আবেদন যার আইডিতে যাবে, অনুমোদনের সময় তার মন্তব্য স্বয়ংক্রিয়ভাবে এখানে বসবে।
                </p>

                <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">
                        (ক) অফিসারের পরিদর্শনোত্তর মন্তব্য ও স্বাক্ষর
                    </label>
                    <textarea
                        rows={2}
                        className={inputClass}
                        value={
                            data.officer_post_inspection_comments || data.officer_comments || ''
                        }
                        onChange={(e) => {
                            setData('officer_post_inspection_comments', e.target.value);
                            setData('officer_comments', e.target.value);
                        }}
                        placeholder="অফিসারের পরিদর্শনোত্তর মন্তব্য লিখুন..."
                    />
                </div>

                <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">
                        (খ) সংস্থার শাখা ব্যবস্থাপকের পরিদর্শনোত্তর মন্তব্য ও স্বাক্ষর
                    </label>
                    <textarea
                        rows={2}
                        className={readOnlyClass}
                        readOnly
                        value={
                            data.branch_manager_post_inspection_comments || data.bm_comments || ''
                        }
                        placeholder="শাখা অনুমোদনের সময় মন্তব্য আসবে..."
                    />
                </div>

                <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">
                        (গ) আঞ্চলিক ব্যবস্থাপকের পরিদর্শনোত্তর মন্তব্য ও স্বাক্ষর
                    </label>
                    <textarea
                        rows={2}
                        className={readOnlyClass}
                        readOnly
                        value={data.regional_manager_comments || data.rm_comments || ''}
                        placeholder="আঞ্চলিক অনুমোদনের সময় মন্তব্য আসবে..."
                    />
                </div>

                <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">
                        (ঘ) সংস্থার চূড়ান্ত অনুমোদনকারীর মন্তব্য ও অনুমোদিত ঋণের বিবরণ
                    </label>
                    <textarea
                        rows={2}
                        className={readOnlyClass}
                        readOnly
                        value={data.final_approver_comments || ''}
                        placeholder="চূড়ান্ত অনুমোদনের সময় মন্তব্য আসবে..."
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs font-semibold text-gray-700 mb-1 block">টাকা (অংকে)</label>
                        <input
                            type="text"
                            className={readOnlyClass}
                            readOnly
                            value={data.final_approved_loan_amount_digits || ''}
                            placeholder="অনুমোদনের সময় আসবে"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-700 mb-1 block">কথায়</label>
                        <input
                            type="text"
                            className={readOnlyClass}
                            readOnly
                            value={data.final_approved_loan_amount_words || ''}
                            placeholder="অনুমোদনের সময় আসবে"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                    <PenLine className="w-3.5 h-3.5" />
                    <span>চূড়ান্ত অনুমোদনকারীর স্বাক্ষর ও তারিখ — অনুমোদন প্রক্রিয়ায় পূরণ হবে</span>
                </div>
            </div>
        </div>
    );
}
