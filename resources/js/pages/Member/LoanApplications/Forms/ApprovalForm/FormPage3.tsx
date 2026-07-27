import React, { useEffect } from 'react';
import { FormPageProps } from './Types';
import { Calculator, Calendar, ShieldCheck, UserCheck, DollarSign } from 'lucide-react';

/** Convert duration months → years label (e.g. 12 → "১", 18 → "১.৫", 24 → "২") */
export function formatLoanYearsLabel(months: number | string | null | undefined): string {
    const m = Number(months) || 0;
    if (m <= 0) return '১/১.৫/২';
    const years = m / 12;
    const eng = Number.isInteger(years) ? String(years) : String(Math.round(years * 10) / 10);
    const banglaMap: Record<string, string> = {
        '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
        '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯',
    };
    return eng.replace(/[0-9]/g, (d) => banglaMap[d] ?? d);
}

export function getLoanYears(months: number | string | null | undefined): number {
    const m = Number(months) || 0;
    if (m <= 0) return 1;
    return Math.round((m / 12) * 100) / 100;
}

function getInstallmentTypeLabel(product: any): string {
    const t = String(product?.installment_type || '').toLowerCase();
    if (t === 'weekly' || t.includes('week') || t.includes('সাপ্তাহ')) return 'সাপ্তাহিক কিস্তি';
    if (t === 'monthly' || t.includes('month') || t.includes('মাস')) return 'মাসিক কিস্তি';
    return 'মাসিক কিস্তি';
}

/** Per-installment principal + service charge from loan amount & product */
export function calcInstallmentSchedule(
    loanAmount: number,
    loanProduct: any,
    durationMonths?: number | string | null,
): { principal: number; serviceCharge: number; installments: number; typeLabel: string } | null {
    const amount = Number(loanAmount) || 0;
    if (amount <= 0) return null;

    const months = Number(durationMonths || loanProduct?.duration_months || loanProduct?.loan_duration_months || 0);
    const installments = Number(loanProduct?.number_of_installments) || months || 0;
    if (installments <= 0) return null;

    const scPerThousand = Number(loanProduct?.service_charge_per_thousand);
    const rate = Number(
        loanProduct?.interest_rate ?? loanProduct?.service_charge ?? loanProduct?.service_charge_rate ?? 0,
    );
    const totalServiceCharge =
        scPerThousand > 0
            ? (amount / 1000) * scPerThousand
            : amount * (rate / 100);

    return {
        principal: Math.round(amount / installments),
        serviceCharge: Math.round(totalServiceCharge / installments),
        installments,
        typeLabel: getInstallmentTypeLabel(loanProduct),
    };
}

export default function FormPage3({ data, setData, member, loanProduct, requestedAmount }: FormPageProps) {
    const durationMonths =
        data.loan_duration_months ||
        loanProduct?.duration_months ||
        loanProduct?.loan_duration_months ||
        '';
    const yearsLabel = formatLoanYearsLabel(durationMonths);
    const years = getLoanYears(durationMonths);

    const projectName =
        data.project_name ||
        data.proposed_project_name ||
        member?.project_name ||
        '';

    const annualIncome =
        data.annual_net_profit ||
        (member?.estimated_annual_project_income != null
            ? String(Math.round(Number(member.estimated_annual_project_income)))
            : '');

    const computedMainIncome =
        annualIncome !== '' && annualIncome != null
            ? String(Math.round(Number(annualIncome) * years))
            : '';

    const loanAmount =
        Number(data.invest_plan_applied_amount) ||
        Number(data.capital_applied_loan) ||
        Number(data.approval_amount_digits) ||
        Number(requestedAmount) ||
        0;

    // প্রধান আয়ের খাত = প্রকল্পের নাম
    useEffect(() => {
        if (projectName && String(data.est_main_income_desc || '') !== String(projectName)) {
            setData('est_main_income_desc', projectName);
            setData('est_main_income_source', projectName);
        }
    }, [projectName]);

    // সম্ভাব্য আয় = বার্ষিক নিট লাভ × মেয়াদ (বছর)
    useEffect(() => {
        if (computedMainIncome !== '' && String(data.est_main_income_amount || '') !== computedMainIncome) {
            setData('est_main_income_amount', computedMainIncome);
        }
    }, [computedMainIncome]);

    // মেয়াদ + সার্ভিস চার্জ হার + কিস্তি তফসিল (আসল / সার্ভিস চার্জ)
    useEffect(() => {
        const months = loanProduct?.duration_months ?? loanProduct?.loan_duration_months;
        if (months && String(data.loan_duration_months || '') !== String(months)) {
            setData('loan_duration_months', String(months));
        }
        const sc = loanProduct?.interest_rate ?? loanProduct?.service_charge ?? loanProduct?.service_charge_rate;
        if (sc != null && sc !== '' && String(data.applied_service_charge_rate || '') !== String(sc)) {
            setData('applied_service_charge_rate', String(sc));
        }

        const schedule = calcInstallmentSchedule(loanAmount, loanProduct, months || durationMonths);
        if (!schedule) return;

        if (String(data.installment_type || '') !== schedule.typeLabel) {
            setData('installment_type', schedule.typeLabel);
        }
        if (String(data.installment_principal || '') !== String(schedule.principal)) {
            setData('installment_principal', String(schedule.principal));
        }
        if (String(data.installment_service_charge || '') !== String(schedule.serviceCharge)) {
            setData('installment_service_charge', String(schedule.serviceCharge));
        }
        if (String(data.number_of_installments || '') !== String(schedule.installments)) {
            setData('number_of_installments', String(schedule.installments));
        }
    }, [
        loanAmount,
        durationMonths,
        loanProduct?.duration_months,
        loanProduct?.loan_duration_months,
        loanProduct?.interest_rate,
        loanProduct?.service_charge,
        loanProduct?.service_charge_rate,
        loanProduct?.service_charge_per_thousand,
        loanProduct?.number_of_installments,
        loanProduct?.installment_type,
    ]);

    const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-xs md:text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all';
    const warningClass = 'w-full border border-amber-300 rounded-lg px-3 py-2 text-xs md:text-sm bg-amber-50/40 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all';
    const readOnlyClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-xs md:text-sm bg-gray-100/90 text-gray-700 font-medium cursor-not-allowed';

    return (
        <div id="form-page-3" data-sync="page-3" className="space-y-5">
            {/* Header Title */}
            <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-4 py-3 rounded-xl shadow-sm">
                <div className="flex items-center gap-2">
                    <Calculator className="w-5 h-5" />
                    <h3 className="font-bold text-sm md:text-base">পৃষ্ঠা ৩: আয়-ব্যয় হিসাব ও জামিনদার তথ্য</h3>
                </div>
                <span className="text-[11px] bg-white/20 px-2.5 py-1 rounded-full font-medium">স্টেপ ৩ / ৪</span>
            </div>

            {/* Income & Expenditure Statement Card */}
            <div className="bg-white p-4 md:p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-gray-800 font-bold text-sm border-b pb-2">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <span>০৪. উদ্যোগের {yearsLabel} বছর এর সম্ভাব্য আয়-ব্যয় হিসাব</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Expenditures */}
                    <div className="bg-rose-50/30 p-3.5 rounded-xl border border-rose-100 space-y-3">
                        <div className="text-xs font-bold text-rose-900 border-b border-rose-200 pb-1">ব্যয়ের খাতসমূহ (টাকা)</div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center gap-2">
                                <span className="text-xs font-medium text-gray-700 w-1/2">কর্মচারীর বেতন</span>
                                <input type="number" placeholder="টাকা" value={data.est_emp_salary || ''} onChange={(e) => setData('est_emp_salary', e.target.value)} className={inputClass} />
                            </div>
                            <div className="flex justify-between items-center gap-2">
                                <span className="text-xs font-medium text-gray-700 w-1/2">যাতায়াত/পরিবহন</span>
                                <input type="number" placeholder="টাকা" value={data.est_transport || ''} onChange={(e) => setData('est_transport', e.target.value)} className={inputClass} />
                            </div>
                            <div className="flex justify-between items-center gap-2">
                                <span className="text-xs font-medium text-gray-700 w-1/2">বিদ্যুৎ/গ্যাস/পানি/বিল</span>
                                <input type="number" placeholder="টাকা" value={data.est_bills || ''} onChange={(e) => setData('est_bills', e.target.value)} className={inputClass} />
                            </div>
                            <div className="flex justify-between items-center gap-2">
                                <span className="text-xs font-medium text-gray-700 w-1/2">দোকান ভাড়া</span>
                                <input type="number" placeholder="টাকা" value={data.est_rent || ''} onChange={(e) => setData('est_rent', e.target.value)} className={inputClass} />
                            </div>
                            <div className="flex justify-between items-center gap-2">
                                <span className="text-xs font-medium text-gray-700 w-1/2">সার্ভিস চার্জ</span>
                                <input type="number" placeholder="টাকা" value={data.est_loan_charge || ''} onChange={(e) => setData('est_loan_charge', e.target.value)} className={inputClass} />
                            </div>
                            <div className="flex justify-between items-center gap-2">
                                <input type="text" placeholder="অন্যান্য খাত ১" value={data.est_other_exp_1_desc || ''} onChange={(e) => setData('est_other_exp_1_desc', e.target.value)} className={inputClass} />
                                <input type="number" placeholder="টাকা" value={data.est_other_exp_1_amount || ''} onChange={(e) => setData('est_other_exp_1_amount', e.target.value)} className={inputClass} />
                            </div>
                            <div className="flex justify-between items-center gap-2">
                                <input type="text" placeholder="অন্যান্য খাত ২" value={data.est_other_exp_2_desc || ''} onChange={(e) => setData('est_other_exp_2_desc', e.target.value)} className={inputClass} />
                                <input type="number" placeholder="টাকা" value={data.est_other_exp_2_amount || ''} onChange={(e) => setData('est_other_exp_2_amount', e.target.value)} className={inputClass} />
                            </div>
                            <div className="flex justify-between items-center gap-2">
                                <input type="text" placeholder="অন্যান্য খাত ৩" value={data.est_other_exp_3_desc || ''} onChange={(e) => setData('est_other_exp_3_desc', e.target.value)} className={inputClass} />
                                <input type="number" placeholder="টাকা" value={data.est_other_exp_3_amount || ''} onChange={(e) => setData('est_other_exp_3_amount', e.target.value)} className={inputClass} />
                            </div>
                        </div>
                    </div>

                    {/* Incomes */}
                    <div className="bg-emerald-50/30 p-3.5 rounded-xl border border-emerald-100 space-y-3">
                        <div className="text-xs font-bold text-emerald-900 border-b border-emerald-200 pb-1">আয়ের খাতসমূহ (টাকা)</div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center gap-2">
                                <input
                                    type="text"
                                    placeholder="প্রধান আয়ের খাত"
                                    value={data.est_main_income_desc || ''}
                                    onChange={(e) => setData('est_main_income_desc', e.target.value)}
                                    className={warningClass}
                                />
                                <input
                                    type="number"
                                    placeholder="টাকা"
                                    value={data.est_main_income_amount || ''}
                                    onChange={(e) => setData('est_main_income_amount', e.target.value)}
                                    className={warningClass}
                                />
                            </div>
                            <div className="flex justify-between items-center gap-2">
                                <input type="text" placeholder="অন্যান্য আয়ের খাত" value={data.est_other_income_desc || ''} onChange={(e) => setData('est_other_income_desc', e.target.value)} className={inputClass} />
                                <input type="number" placeholder="টাকা" value={data.est_other_income_amount || ''} onChange={(e) => setData('est_other_income_amount', e.target.value)} className={inputClass} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Other Details & Installment Schedule */}
            <div className="bg-white p-4 md:p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-gray-800 font-bold text-sm border-b pb-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span>গ. অন্যান্য তথ্যাবলী ও ঋণ পরিশোধের তফসিল</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">০১. (ক) ঋণের মেয়াদ (মাস)</label>
                        <input type="number" value={data.loan_duration_months || ''} onChange={(e) => setData('loan_duration_months', e.target.value)} className={readOnlyClass} readOnly />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">(খ) সার্ভিস চার্জের হার (%)</label>
                        <input
                            type="number"
                            value={data.applied_service_charge_rate || ''}
                            onChange={(e) => setData('applied_service_charge_rate', e.target.value)}
                            className={readOnlyClass}
                            readOnly
                        />
                    </div>
                </div>

                <div className="bg-indigo-50/40 p-3.5 rounded-xl border border-indigo-100 space-y-2">
                    <label className="block text-xs font-bold text-indigo-900">(গ) ঋণ পরিশোধের তফসিল</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div>
                            <label className="block text-[11px] font-medium text-gray-600 mb-1">কিস্তির ধরণ</label>
                            <input type="text" value={data.installment_type || 'মাসিক কিস্তি'} onChange={(e) => setData('installment_type', e.target.value)} className={readOnlyClass} readOnly />
                        </div>
                        <div>
                            <label className="block text-[11px] font-medium text-gray-600 mb-1">আসল (টাকা)</label>
                            <input type="number" value={data.installment_principal || ''} onChange={(e) => setData('installment_principal', e.target.value)} className={readOnlyClass} readOnly />
                        </div>
                        <div>
                            <label className="block text-[11px] font-medium text-gray-600 mb-1">সার্ভিস চার্জ (টাকা)</label>
                            <input type="number" value={data.installment_service_charge || ''} onChange={(e) => setData('installment_service_charge', e.target.value)} className={readOnlyClass} readOnly />
                        </div>
                    </div>
                </div>
            </div>

            {/* Guarantors Section */}
            <div className="bg-white p-4 md:p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-gray-800 font-bold text-sm border-b pb-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>০২. জামিনদারদের তথ্য</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 1st Guarantor */}
                    <div className="bg-gray-50/70 p-3.5 rounded-xl border border-gray-200 space-y-2.5">
                        <div className="text-xs font-bold text-indigo-700 border-b pb-1">👤 (ক) ১ম জামিনদার</div>
                        <input type="text" placeholder="জামিনদারের নাম" value={data.guarantor_1_name || ''} onChange={e => setData('guarantor_1_name', e.target.value)} className={inputClass} />
                        <input type="text" placeholder="ঠিকানা" value={data.guarantor_1_address || ''} onChange={e => setData('guarantor_1_address', e.target.value)} className={inputClass} />
                        <input type="text" placeholder="মোবাইল নম্বর" value={data.guarantor_1_mobile || ''} onChange={e => setData('guarantor_1_mobile', e.target.value)} className={inputClass} />
                        <div className="grid grid-cols-2 gap-2">
                            <input type="text" placeholder="সম্পর্ক" value={data.guarantor_1_relation || ''} onChange={e => setData('guarantor_1_relation', e.target.value)} className={inputClass} />
                            <input type="text" placeholder="পেশা" value={data.guarantor_1_profession || ''} onChange={e => setData('guarantor_1_profession', e.target.value)} className={inputClass} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <input type="text" placeholder="মাসিক আয়" value={data.guarantor_1_monthly_income || ''} onChange={e => setData('guarantor_1_monthly_income', e.target.value)} className={inputClass} />
                            <input type="text" placeholder="সম্পদের পরিমাণ" value={data.guarantor_1_assets_amount || ''} onChange={e => setData('guarantor_1_assets_amount', e.target.value)} className={inputClass} />
                        </div>
                        <input type="text" placeholder="সম্ভাব্য মূল্য" value={data.guarantor_1_potential_value || ''} onChange={e => setData('guarantor_1_potential_value', e.target.value)} className={inputClass} />
                        <div className="grid grid-cols-2 gap-2">
                            <input type="text" placeholder="সাক্ষাৎকারীর নাম" value={data.guarantor_1_interviewer_name || ''} onChange={e => setData('guarantor_1_interviewer_name', e.target.value)} className={inputClass} />
                            <input type="text" placeholder="পদবী" value={data.guarantor_1_interviewer_designation || ''} onChange={e => setData('guarantor_1_interviewer_designation', e.target.value)} className={inputClass} />
                        </div>
                    </div>

                    {/* 2nd Guarantor */}
                    <div className="bg-gray-50/70 p-3.5 rounded-xl border border-gray-200 space-y-2.5">
                        <div className="text-xs font-bold text-indigo-700 border-b pb-1">👤 (খ) ২য় জামিনদার</div>
                        <input type="text" placeholder="জামিনদারের নাম" value={data.guarantor_2_name || ''} onChange={e => setData('guarantor_2_name', e.target.value)} className={inputClass} />
                        <input type="text" placeholder="ঠিকানা" value={data.guarantor_2_address || ''} onChange={e => setData('guarantor_2_address', e.target.value)} className={inputClass} />
                        <input type="text" placeholder="মোবাইল নম্বর" value={data.guarantor_2_mobile || ''} onChange={e => setData('guarantor_2_mobile', e.target.value)} className={inputClass} />
                        <div className="grid grid-cols-2 gap-2">
                            <input type="text" placeholder="সম্পর্ক" value={data.guarantor_2_relation || ''} onChange={e => setData('guarantor_2_relation', e.target.value)} className={inputClass} />
                            <input type="text" placeholder="পেশা" value={data.guarantor_2_profession || ''} onChange={e => setData('guarantor_2_profession', e.target.value)} className={inputClass} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <input type="text" placeholder="মাসিক আয়" value={data.guarantor_2_monthly_income || ''} onChange={e => setData('guarantor_2_monthly_income', e.target.value)} className={inputClass} />
                            <input type="text" placeholder="সম্পদের পরিমাণ" value={data.guarantor_2_assets_amount || ''} onChange={e => setData('guarantor_2_assets_amount', e.target.value)} className={inputClass} />
                        </div>
                        <input type="text" placeholder="সম্ভাব্য মূল্য" value={data.guarantor_2_potential_value || ''} onChange={e => setData('guarantor_2_potential_value', e.target.value)} className={inputClass} />
                        <div className="grid grid-cols-2 gap-2">
                            <input type="text" placeholder="সাক্ষাৎকারীর নাম" value={data.guarantor_2_interviewer_name || ''} onChange={e => setData('guarantor_2_interviewer_name', e.target.value)} className={inputClass} />
                            <input type="text" placeholder="পদবী" value={data.guarantor_2_interviewer_designation || ''} onChange={e => setData('guarantor_2_interviewer_designation', e.target.value)} className={inputClass} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Informants Section */}
            <div className="bg-white p-4 md:p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-gray-800 font-bold text-sm border-b pb-2">
                    <UserCheck className="w-4 h-4 text-purple-600" />
                    <span>০৩. তথ্য প্রদানকারী ব্যক্তিবর্গ</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 1st Informant */}
                    <div className="bg-gray-50/70 p-3.5 rounded-xl border border-gray-200 space-y-2.5">
                        <div className="text-xs font-bold text-purple-700 border-b pb-1">ℹ️ (ক) ১ম তথ্য প্রদানকারী</div>
                        <input type="text" placeholder="নাম" value={data.informant_1_name || ''} onChange={e => setData('informant_1_name', e.target.value)} className={inputClass} />
                        <input type="text" placeholder="ঠিকানা" value={data.informant_1_address || ''} onChange={e => setData('informant_1_address', e.target.value)} className={inputClass} />
                        <div className="grid grid-cols-3 gap-2">
                            <input type="text" placeholder="মোবাইল" value={data.informant_1_mobile || ''} onChange={e => setData('informant_1_mobile', e.target.value)} className={inputClass} />
                            <input type="text" placeholder="সম্পর্ক" value={data.informant_1_relation || ''} onChange={e => setData('informant_1_relation', e.target.value)} className={inputClass} />
                            <input type="text" placeholder="পেশা" value={data.informant_1_profession || ''} onChange={e => setData('informant_1_profession', e.target.value)} className={inputClass} />
                        </div>
                        <input type="text" placeholder="ঋণ সংক্রান্ত তথ্য" value={data.informant_1_loan_info || ''} onChange={e => setData('informant_1_loan_info', e.target.value)} className={inputClass} />
                        <input type="text" placeholder="সম্পদ সংক্রান্ত তথ্য" value={data.informant_1_asset_info || ''} onChange={e => setData('informant_1_asset_info', e.target.value)} className={inputClass} />
                        <input type="text" placeholder="সার্বিক মন্তব্য" value={data.informant_1_overall_comment || ''} onChange={e => setData('informant_1_overall_comment', e.target.value)} className={inputClass} />
                    </div>

                    {/* 2nd Informant */}
                    <div className="bg-gray-50/70 p-3.5 rounded-xl border border-gray-200 space-y-2.5">
                        <div className="text-xs font-bold text-purple-700 border-b pb-1">ℹ️ (খ) ২য় তথ্য প্রদানকারী</div>
                        <input type="text" placeholder="নাম" value={data.informant_2_name || ''} onChange={e => setData('informant_2_name', e.target.value)} className={inputClass} />
                        <input type="text" placeholder="ঠিকানা" value={data.informant_2_address || ''} onChange={e => setData('informant_2_address', e.target.value)} className={inputClass} />
                        <div className="grid grid-cols-3 gap-2">
                            <input type="text" placeholder="মোবাইল" value={data.informant_2_mobile || ''} onChange={e => setData('informant_2_mobile', e.target.value)} className={inputClass} />
                            <input type="text" placeholder="সম্পর্ক" value={data.informant_2_relation || ''} onChange={e => setData('informant_2_relation', e.target.value)} className={inputClass} />
                            <input type="text" placeholder="পেশা" value={data.informant_2_profession || ''} onChange={e => setData('informant_2_profession', e.target.value)} className={inputClass} />
                        </div>
                        <input type="text" placeholder="ঋণ সংক্রান্ত তথ্য" value={data.informant_2_loan_info || ''} onChange={e => setData('informant_2_loan_info', e.target.value)} className={inputClass} />
                        <input type="text" placeholder="সম্পদ সংক্রান্ত তথ্য" value={data.informant_2_asset_info || ''} onChange={e => setData('informant_2_asset_info', e.target.value)} className={inputClass} />
                        <input type="text" placeholder="সার্বিক মন্তব্য" value={data.informant_2_overall_comment || ''} onChange={e => setData('informant_2_overall_comment', e.target.value)} className={inputClass} />
                    </div>
                </div>
            </div>
        </div>
    );
}

