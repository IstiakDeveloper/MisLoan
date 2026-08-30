import React, { useEffect, useMemo } from 'react';
import { FormPageProps } from './Types';
import { Calculator, Calendar, ShieldCheck, UserCheck, DollarSign } from 'lucide-react';
import { calcInstallmentSchedule, getAnnualServiceChargeRate } from '@/utils/loanInterest';

export { calcInstallmentSchedule, getAnnualServiceChargeRate } from '@/utils/loanInterest';

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

/** বার্ষিক পরিমাণ × ঋণের মেয়াদ (বছর) */
export function scaleAnnualToLoanYears(
    annualAmount: number | string | null | undefined,
    months: number | string | null | undefined,
): string {
    const annual = Number(annualAmount) || 0;
    if (annual <= 0) return '';
    return String(Math.round(annual * getLoanYears(months)));
}

export default function FormPage3({ data, setData, member, loanProduct, loanCategory, requestedAmount }: FormPageProps) {
    const durationMonths =
        data.loan_duration_months ||
        loanProduct?.duration_months ||
        loanProduct?.loan_duration_months ||
        '';
    const yearsLabel = formatLoanYearsLabel(durationMonths);

    const projectName =
        data.project_name ||
        data.proposed_project_name ||
        member?.project_name ||
        '';

    const page1IncomeRaw = data.project_income_1_2_yr;
    const page1ExpenseRaw = data.project_expense_1_2_yr;
    const page1Income = Number(page1IncomeRaw) || 0;
    const page1Expense = Number(page1ExpenseRaw) || 0;
    const page1Net = Number(data.annual_net_profit) || 0;
    const hasPage1Income = page1IncomeRaw !== '' && page1IncomeRaw != null;
    const hasPage1Expense = page1ExpenseRaw !== '' && page1ExpenseRaw != null;
    const otherIncome = Number(data.est_other_income_amount) || 0;
    const computedMainIncome =
        hasPage1Income
            ? String(Math.max(0, Math.round(page1Income - otherIncome)))
            : '';

    const loanAmount =
        Number(data.invest_plan_applied_amount) ||
        Number(data.capital_applied_loan) ||
        Number(data.approval_amount_digits) ||
        Number(requestedAmount) ||
        0;

    const liveSchedule = useMemo(
        () => calcInstallmentSchedule(loanAmount, loanProduct, durationMonths, loanCategory),
        [
            loanAmount,
            durationMonths,
            loanCategory,
            loanProduct?.duration_months,
            loanProduct?.loan_duration_months,
            loanProduct?.interest_rate,
            loanProduct?.service_charge,
            loanProduct?.service_charge_rate,
            loanProduct?.service_charge_per_thousand,
            loanProduct?.installment_amount_per_thousand,
            loanProduct?.last_installment_per_thousand,
            loanProduct?.loan_installment_factor,
            loanProduct?.interest_installment_factor,
            loanProduct?.number_of_installments,
            loanProduct?.installment_type,
            loanProduct?.product_code,
        ],
    );

    const scheduleType = liveSchedule?.typeLabel || data.installment_type || 'মাসিক কিস্তি';
    const schedulePrincipal = liveSchedule ? String(liveSchedule.principal) : (data.installment_principal || '');
    const scheduleSc = liveSchedule ? String(liveSchedule.serviceCharge) : (data.installment_service_charge || '');
    const scheduleTotal = liveSchedule
        ? String(liveSchedule.installmentAmount)
        : (data.installment_total || '');
    const totalPrincipal = liveSchedule ? String(loanAmount) : (data.total_principal || '');
    const totalServiceCharge = liveSchedule
        ? String(liveSchedule.totalServiceCharge)
        : (data.total_service_charge || '');
    const totalPayable = liveSchedule ? String(liveSchedule.totalAmount) : (data.total_payable || '');

    const page3ExpenseTotal =
        (Number(data.est_emp_salary) || 0) +
        (Number(data.est_transport) || 0) +
        (Number(data.est_bills) || 0) +
        (Number(data.est_rent) || 0) +
        (Number(data.est_loan_charge) || 0) +
        (Number(data.est_other_exp_1_amount) || 0) +
        (Number(data.est_other_exp_2_amount) || 0) +
        (Number(data.est_other_exp_3_amount) || 0);
    const page3IncomeTotal =
        (Number(computedMainIncome || data.est_main_income_amount) || 0) + otherIncome;
    const page3Net = page3IncomeTotal - page3ExpenseTotal;
    const missingPage1Income = !hasPage1Income;
    const missingPage1Expense = !hasPage1Expense;
    const incomeMismatch = hasPage1Income && page3IncomeTotal !== page1Income;
    const expenseMismatch = hasPage1Expense && page3ExpenseTotal !== page1Expense;
    const netMismatch = hasPage1Income && hasPage1Expense && page1Net > 0 && page3Net !== page1Net;

    // প্রধান আয়ের খাত = প্রকল্পের নাম
    useEffect(() => {
        if (projectName && String(data.est_main_income_desc || '') !== String(projectName)) {
            setData('est_main_income_desc', projectName);
            setData('est_main_income_source', projectName);
        }
    }, [projectName]);

    // সম্ভাব্য আয় = পৃষ্ঠা ১-এর সম্ভাব্য আয় (অন্যান্য আয় বাদ)
    useEffect(() => {
        if (computedMainIncome !== '' && String(data.est_main_income_amount || '') !== computedMainIncome) {
            setData('est_main_income_amount', computedMainIncome);
        }
    }, [computedMainIncome]);

    // মেয়াদ + সার্ভিস চার্জ হার + কিস্তি তফসিল (আসল / সার্ভিস চার্জ / মোট)
    useEffect(() => {
        const months = loanProduct?.duration_months ?? loanProduct?.loan_duration_months;
        if (months && String(data.loan_duration_months || '') !== String(months)) {
            setData('loan_duration_months', String(months));
        }
        const rawSc = loanProduct?.service_charge ?? loanProduct?.interest_rate ?? loanProduct?.service_charge_rate ?? (loanProduct?.service_charge_per_thousand ? Number(loanProduct.service_charge_per_thousand) / 10 : undefined);
        const annualRate = getAnnualServiceChargeRate(rawSc, months || data.loan_duration_months);
        if (annualRate && String(data.applied_service_charge_rate || '') !== annualRate) {
            setData('applied_service_charge_rate', annualRate);
        }

        if (!liveSchedule) return;

        if (String(data.installment_type || '') !== liveSchedule.typeLabel) {
            setData('installment_type', liveSchedule.typeLabel);
        }
        if (String(data.installment_principal || '') !== String(liveSchedule.principal)) {
            setData('installment_principal', String(liveSchedule.principal));
        }
        if (String(data.installment_service_charge || '') !== String(liveSchedule.serviceCharge)) {
            setData('installment_service_charge', String(liveSchedule.serviceCharge));
        }
        if (String(data.installment_total || '') !== String(liveSchedule.installmentAmount)) {
            setData('installment_total', String(liveSchedule.installmentAmount));
        }
        if (String(data.number_of_installments || '') !== String(liveSchedule.installments)) {
            setData('number_of_installments', String(liveSchedule.installments));
        }
        if (String(data.last_installment_amount || '') !== String(liveSchedule.lastInstallmentAmount)) {
            setData('last_installment_amount', String(liveSchedule.lastInstallmentAmount));
        }
        if (String(data.last_installment_principal || '') !== String(liveSchedule.lastPrincipal)) {
            setData('last_installment_principal', String(liveSchedule.lastPrincipal));
        }
        if (String(data.last_installment_service_charge || '') !== String(liveSchedule.lastServiceCharge)) {
            setData('last_installment_service_charge', String(liveSchedule.lastServiceCharge));
        }
        if (String(data.total_principal || '') !== String(loanAmount)) {
            setData('total_principal', String(loanAmount));
        }
        if (String(data.total_service_charge || '') !== String(liveSchedule.totalServiceCharge)) {
            setData('total_service_charge', String(liveSchedule.totalServiceCharge));
        }
        if (String(data.total_payable || '') !== String(liveSchedule.totalAmount)) {
            setData('total_payable', String(liveSchedule.totalAmount));
        }
        if (String(data.est_loan_charge || '') !== String(liveSchedule.totalServiceCharge)) {
            setData('est_loan_charge', String(liveSchedule.totalServiceCharge));
        }
    }, [
        liveSchedule,
        loanAmount,
        durationMonths,
        loanProduct?.duration_months,
        loanProduct?.loan_duration_months,
        loanProduct?.interest_rate,
        loanProduct?.service_charge,
        loanProduct?.service_charge_rate,
        loanProduct?.service_charge_per_thousand,
        loanProduct?.installment_amount_per_thousand,
        loanProduct?.last_installment_per_thousand,
        loanProduct?.loan_installment_factor,
        loanProduct?.interest_installment_factor,
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
                                <input type="number" placeholder="টাকা" value={data.est_loan_charge || ''} className={readOnlyClass} readOnly />
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
                            <div className="flex justify-between items-center gap-2 pt-1 border-t border-rose-200">
                                <span className="text-xs font-bold text-rose-900">মোট ব্যয়</span>
                                <span className={`text-xs font-bold ${expenseMismatch || missingPage1Expense ? 'text-red-700' : 'text-rose-900'}`}>
                                    {page3ExpenseTotal || 0}
                                </span>
                            </div>
                            <div className="text-[10px] text-rose-800">
                                পৃষ্ঠা ১-এর সম্ভাব্য ব্যয়: <strong>{hasPage1Expense ? page1Expense : '—'}</strong>
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
                                    value={computedMainIncome || data.est_main_income_amount || ''}
                                    className={readOnlyClass}
                                    readOnly
                                />
                            </div>
                            <div className="flex justify-between items-center gap-2">
                                <input type="text" placeholder="অন্যান্য আয়ের খাত" value={data.est_other_income_desc || ''} onChange={(e) => setData('est_other_income_desc', e.target.value)} className={inputClass} />
                                <input type="number" placeholder="টাকা" value={data.est_other_income_amount || ''} onChange={(e) => setData('est_other_income_amount', e.target.value)} className={inputClass} />
                            </div>
                            <div className="flex justify-between items-center gap-2 pt-1 border-t border-emerald-200">
                                <span className="text-xs font-bold text-emerald-900">মোট আয়</span>
                                <span className={`text-xs font-bold ${incomeMismatch || missingPage1Income ? 'text-red-700' : 'text-emerald-900'}`}>
                                    {page3IncomeTotal || 0}
                                </span>
                            </div>
                            <div className="text-[10px] text-emerald-800">
                                পৃষ্ঠা ১-এর সম্ভাব্য আয়: <strong>{hasPage1Income ? page1Income : '—'}</strong>
                            </div>
                        </div>
                    </div>
                </div>

                {(missingPage1Income || missingPage1Expense || incomeMismatch || expenseMismatch || netMismatch) && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium space-y-1">
                        {missingPage1Income && <p>পৃষ্ঠা ১-এ সম্ভাব্য আয় লিখুন। এই হিসাবের আয় সেখান থেকে আসবে।</p>}
                        {missingPage1Expense && <p>পৃষ্ঠা ১-এ সম্ভাব্য ব্যয় লিখুন। এই হিসাবের মোট ব্যয় তার সমান হতে হবে।</p>}
                        {incomeMismatch && (
                            <p>মোট আয় ({page3IncomeTotal}) পৃষ্ঠা ১-এর সম্ভাব্য আয় ({page1Income})-এর সমান নয়।</p>
                        )}
                        {expenseMismatch && (
                            <p>মোট ব্যয় ({page3ExpenseTotal}) পৃষ্ঠা ১-এর সম্ভাব্য ব্যয় ({page1Expense})-এর সমান হতে হবে। খাতগুলো ঠিক করুন।</p>
                        )}
                        {!expenseMismatch && !incomeMismatch && netMismatch && (
                            <p>নিট লাভ ({page3Net}) পৃষ্ঠা ১-এর নিট লাভ ({page1Net})-এর সমান নয়।</p>
                        )}
                    </div>
                )}
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
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[520px] border-collapse text-xs">
                            <thead>
                                <tr className="bg-indigo-100/70">
                                    {['কিস্তির ধরণ', 'আসল (টাকা)', 'সার্ভিস চার্জ (টাকা)', 'মোট (টাকা)'].map((h) => (
                                        <th key={h} className="border border-indigo-200 px-2 py-1.5 text-[11px] font-semibold text-center text-indigo-900">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="border border-indigo-200 p-1">
                                        <input
                                            type="text"
                                            value={scheduleType}
                                            className={readOnlyClass}
                                            readOnly
                                        />
                                    </td>
                                    <td className="border border-indigo-200 p-1">
                                        <input type="number" value={schedulePrincipal} className={readOnlyClass} readOnly />
                                    </td>
                                    <td className="border border-indigo-200 p-1">
                                        <input type="number" value={scheduleSc} className={readOnlyClass} readOnly />
                                    </td>
                                    <td className="border border-indigo-200 p-1">
                                        <input type="number" value={scheduleTotal} className={readOnlyClass} readOnly />
                                    </td>
                                </tr>
                                <tr className="bg-white">
                                    <td className="border border-indigo-200 px-2 py-1.5 text-[11px] font-bold text-gray-800">
                                        মোট পরিশোধের পরিমাণ
                                    </td>
                                    <td className="border border-indigo-200 p-1">
                                        <input type="number" value={totalPrincipal} className={readOnlyClass} readOnly />
                                    </td>
                                    <td className="border border-indigo-200 p-1">
                                        <input type="number" value={totalServiceCharge} className={readOnlyClass} readOnly />
                                    </td>
                                    <td className="border border-indigo-200 p-1">
                                        <input type="number" value={totalPayable} className={`${readOnlyClass} font-bold`} readOnly />
                                    </td>
                                </tr>
                            </tbody>
                        </table>
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

