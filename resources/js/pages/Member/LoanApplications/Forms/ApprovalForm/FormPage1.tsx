import React, { useEffect } from 'react';
import { FormPageProps } from './Types';
import GeneralSavingsSection from '@/components/LoanApplications/GeneralSavingsSection';
import { SmartDateInput } from '@/components/ui/SmartDateInput';
import { Calendar, User, Home, Building2, Wallet, Briefcase, Calculator, Lock } from 'lucide-react';
import { formatLoanYearsLabel, getLoanYears, scaleAnnualToLoanYears } from './FormPage3';
import { numberToWordsBangla } from './PrintPreview';

const RECIPIENT_OPTIONS = [
    'নির্বাহী পরিচালক',
    'পরিচালক (মাইক্রোফাইন্যান্স)',
    'সহকারি পরিচালক (মাইক্রোফাইন্যান্স)',
    'জোন ব্যবস্থাপক',
    'অঞ্চলিক ব্যবস্থাপক',
    'শাখা ব্যবস্থাপক',
] as const;

export default function FormPage1({
    data,
    setData,
    member,
    isLegacy,
    handleImageUpload,
    removeImage,
    savingsProducts,
    loanRound,
    loanProduct,
    requestedAmount,
    errors = {},
}: FormPageProps) {
    const fromAdmission = !!(member && !isLegacy);
    const isOldMember = data.member_type === 'old' || !!(member?.is_legacy) || !!isLegacy;

    const inputClass = fromAdmission
        ? 'w-full border border-gray-200 rounded-lg px-3 py-2 text-xs md:text-sm bg-gray-100/90 text-gray-700 cursor-not-allowed font-medium'
        : 'w-full border border-gray-300 rounded-lg px-3 py-2 text-xs md:text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all';
    
    const editableClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-xs md:text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all';
    const warningClass = 'w-full border border-amber-300 rounded-lg px-3 py-2 text-xs md:text-sm bg-amber-50/40 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all';

    const income = Number(data.project_income_1_2_yr) || 0;
    const expense = Number(data.project_expense_1_2_yr) || 0;
    const netProfit = Number(data.annual_net_profit) || 0;
    const hasIncomeExpense =
        data.project_income_1_2_yr !== '' &&
        data.project_income_1_2_yr != null &&
        data.project_expense_1_2_yr !== '' &&
        data.project_expense_1_2_yr != null;
    const hasNet = data.annual_net_profit !== '' && data.annual_net_profit != null;
    const incomeExpenseMismatch = hasIncomeExpense && hasNet && income - expense !== netProfit;

    const durationMonths =
        data.loan_duration_months ||
        loanProduct?.duration_months ||
        loanProduct?.loan_duration_months ||
        '';
    const yearsLabel = formatLoanYearsLabel(durationMonths);
    const loanYears = getLoanYears(durationMonths);
    const durationLabel = `${yearsLabel} বছর`;
    const annualNetFromAdmission = Number(member?.estimated_annual_project_income) || 0;
    const durationNetFromAdmission = scaleAnnualToLoanYears(
        member?.estimated_annual_project_income,
        durationMonths,
    );

    useEffect(() => {
        if (data.recipient_to === 'প্রধান নির্বাহী') {
            setData('recipient_to', 'নির্বাহী পরিচালক');
        }
    }, [data.recipient_to]);

    useEffect(() => {
        if (durationNetFromAdmission && String(data.annual_net_profit || '') !== durationNetFromAdmission) {
            setData('annual_net_profit', durationNetFromAdmission);
        }

        if (annualNetFromAdmission <= 0 || loanYears === 1) return;

        const currentIncome = Number(data.project_income_1_2_yr) || 0;
        const currentExpense = Number(data.project_expense_1_2_yr) || 0;
        // পুরনো বার্ষিক মান থাকলে মেয়াদ অনুযায়ী গুণ করুন (আয় − ব্যয় = বার্ষিক নিট)
        if (
            currentIncome > 0 &&
            Math.round(currentIncome - currentExpense) === Math.round(annualNetFromAdmission)
        ) {
            setData('project_income_1_2_yr', String(Math.round(currentIncome * loanYears)));
            if (data.project_expense_1_2_yr !== '' && data.project_expense_1_2_yr != null) {
                setData('project_expense_1_2_yr', String(Math.round(currentExpense * loanYears)));
            }
        }
    }, [
        durationNetFromAdmission,
        annualNetFromAdmission,
        loanYears,
        data.annual_net_profit,
        data.project_income_1_2_yr,
        data.project_expense_1_2_yr,
    ]);

    const appAmount = Number(data.approval_amount_digits || data.capital_applied_loan || requestedAmount) || 0;
    useEffect(() => {
        if (appAmount > 0) {
            const words = numberToWordsBangla(appAmount);
            if (words && String(data.approval_amount_words || '') !== words) {
                setData('approval_amount_words', words);
            }
        }
    }, [appAmount, data.approval_amount_words]);

    return (
        <div id="form-page-1" data-sync="page-1" className="space-y-5">
            {/* Header Title */}
            <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-4 py-3 rounded-xl shadow-sm">
                <div className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    <h3 className="font-bold text-sm md:text-base">পৃষ্ঠা ১: মৌলিক ও আবেদনকারী তথ্য</h3>
                </div>
                <span className="text-[11px] bg-white/20 px-2.5 py-1 rounded-full font-medium">স্টেপ ১ / ৪</span>
            </div>

            {/* Header & Dates Card */}
            <div className="bg-white p-4 md:p-5 rounded-xl border border-gray-200 shadow-sm space-y-4" data-sync="page-1">
                <div className="flex items-center gap-2 text-gray-800 font-bold text-sm border-b pb-2">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    <span>আবেদনপত্র ও অনুমোদন তারিখ সংক্রান্ত</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">আবেদনের তারিখ</label>
                            <SmartDateInput
                                value={data.application_date}
                                onChange={(val) => setData('application_date', val)}
                                className={warningClass}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">বরাবর</label>
                            <select
                                value={data.recipient_to || ''}
                                onChange={(e) => setData('recipient_to', e.target.value)}
                                className={warningClass}
                            >
                                <option value="">নির্বাচন করুন</option>
                                {RECIPIENT_OPTIONS.map((opt) => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">ঠিকানা / মাধ্যম</label>
                            <input
                                type="text"
                                value={data.authority_medium || ''}
                                onChange={(e) => setData('authority_medium', e.target.value)}
                                className={warningClass}
                                placeholder="ঠিকানা লিখুন"
                            />
                        </div>
                    </div>
                    <div className="space-y-3 border border-indigo-100 p-3.5 rounded-xl bg-indigo-50/30">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">ঋণ অনুমোদনের তারিখ</label>
                            <SmartDateInput
                                value={data.loan_approval_date}
                                onChange={(val) => setData('loan_approval_date', val)}
                                className={editableClass}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">ঋণ বিতরণের তারিখ</label>
                            <SmartDateInput
                                value={data.loan_disbursement_date}
                                onChange={(val) => setData('loan_disbursement_date', val)}
                                className={editableClass}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">ঋণ পরিশোধের তারিখ</label>
                            <SmartDateInput
                                value={data.loan_repayment_date}
                                onChange={(val) => setData('loan_repayment_date', val)}
                                className={editableClass}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Committee & Basic Member Info Card */}
            <div className="bg-white p-4 md:p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-gray-800 font-bold text-sm border-b pb-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <span>সমিতি ও সদস্যের মৌলিক পরিচিতি</span>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center justify-between">
                            <span>সমিতির নাম</span>
                            {fromAdmission && <Lock className="w-3 h-3 text-gray-400" />}
                        </label>
                        <input type="text" value={data.committee_name || ''} onChange={(e) => setData('committee_name', e.target.value)} readOnly={fromAdmission} className={inputClass} />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center justify-between">
                            <span>সমিতি কোড</span>
                            {fromAdmission && <Lock className="w-3 h-3 text-gray-400" />}
                        </label>
                        <input type="text" value={data.committee_code || ''} onChange={(e) => setData('committee_code', e.target.value)} readOnly={fromAdmission} className={inputClass} />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">সদস্যের ধরণ</label>
                        <select
                            value={isOldMember ? 'old' : 'new'}
                            disabled
                            className={inputClass}
                        >
                            <option value="new">নতুন সদস্য</option>
                            <option value="old">পুরাতন সদস্য</option>
                        </select>
                    </div>
                    {isOldMember && (
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">দফা</label>
                            <input
                                type="number"
                                min={1}
                                value={data.years_involved || ''}
                                readOnly
                                className={inputClass}
                            />
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
                    <div data-sync="item-1">
                        <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center justify-between">
                            <span>১. আবেদনকারীর নাম</span>
                            {fromAdmission && <Lock className="w-3 h-3 text-gray-400" />}
                        </label>
                        <input type="text" value={data.member_name_detail || ''} onChange={(e) => setData('member_name_detail', e.target.value)} readOnly={fromAdmission} className={inputClass} />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center justify-between">
                            <span>সদস্য কোড</span>
                            {fromAdmission && <Lock className="w-3 h-3 text-gray-400" />}
                        </label>
                        <input type="text" value={data.member_code || ''} onChange={(e) => setData('member_code', e.target.value)} readOnly={fromAdmission} className={inputClass} />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">বয়স</label>
                        <input type="number" value={data.age || ''} onChange={(e) => setData('age', e.target.value)} readOnly={!!member?.date_of_birth} className={member?.date_of_birth ? inputClass : warningClass} />
                    </div>
                </div>

                <div data-sync="item-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center justify-between">
                        <span>২. পিতা/স্বামীর নাম</span>
                        {fromAdmission && <Lock className="w-3 h-3 text-gray-400" />}
                    </label>
                    <input type="text" value={data.father_husband_name || ''} onChange={(e) => setData('father_husband_name', e.target.value)} readOnly={fromAdmission} className={inputClass} />
                </div>
            </div>

            {/* Addresses & Personal Details Card */}
            <div className="bg-white p-4 md:p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-gray-800 font-bold text-sm border-b pb-2">
                    <Home className="w-4 h-4 text-emerald-600" />
                    <span>ঠিকানা ও সামাজিক তথ্যাবলী</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-sync="item-3">
                    <div className="space-y-2 bg-gray-50/70 p-3 rounded-xl border border-gray-200">
                        <label className="block text-xs font-bold text-gray-700 flex items-center justify-between">
                            <span>৩. ক) স্থায়ী ঠিকানা</span>
                            {fromAdmission && <Lock className="w-3 h-3 text-gray-400" />}
                        </label>
                        <input type="text" value={data.permanent_address_line1 || ''} onChange={(e) => setData('permanent_address_line1', e.target.value)} readOnly={fromAdmission} className={inputClass} placeholder="গ্রাম/মহল্লা" />
                        <input type="text" value={data.permanent_address_line2 || ''} onChange={(e) => setData('permanent_address_line2', e.target.value)} readOnly={fromAdmission} className={inputClass} placeholder="পোস্ট কোড" />
                        <input type="text" value={data.permanent_address_line3 || ''} onChange={(e) => setData('permanent_address_line3', e.target.value)} readOnly={fromAdmission} className={inputClass} placeholder="উপজেলা, জেলা" />
                    </div>
                    <div className="space-y-2 bg-gray-50/70 p-3 rounded-xl border border-gray-200">
                        <label className="block text-xs font-bold text-gray-700 flex items-center justify-between">
                            <span>৩. খ) বর্তমান ঠিকানা</span>
                            {fromAdmission && <Lock className="w-3 h-3 text-gray-400" />}
                        </label>
                        <input type="text" value={data.current_address_line1 || ''} onChange={(e) => setData('current_address_line1', e.target.value)} readOnly={fromAdmission} className={inputClass} placeholder="গ্রাম/মহল্লা" />
                        <input type="text" value={data.current_address_line2 || ''} onChange={(e) => setData('current_address_line2', e.target.value)} readOnly={fromAdmission} className={inputClass} placeholder="পোস্ট কোড" />
                        <input type="text" value={data.current_address_line3 || ''} onChange={(e) => setData('current_address_line3', e.target.value)} readOnly={fromAdmission} className={inputClass} placeholder="উপজেলা, জেলা" />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center justify-between">
                            <span>৫. পেশা</span>
                            {fromAdmission && <Lock className="w-3 h-3 text-gray-400" />}
                        </label>
                        <input
                            type="text"
                            value={data.occupation || ''}
                            onChange={(e) => setData('occupation', e.target.value)}
                            readOnly={fromAdmission}
                            className={fromAdmission ? inputClass : warningClass}
                            placeholder="পারিবারিক তথ্য (নিজ) থেকে আসবে"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center justify-between">
                            <span>৬. শিক্ষাগত যোগ্যতা</span>
                            {fromAdmission && <Lock className="w-3 h-3 text-gray-400" />}
                        </label>
                        <input
                            type="text"
                            value={data.educational_qualification || ''}
                            onChange={(e) => setData('educational_qualification', e.target.value)}
                            readOnly={fromAdmission}
                            className={fromAdmission ? inputClass : warningClass}
                            placeholder="পারিবারিক তথ্য (নিজ) থেকে আসবে"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">৭. ভর্তির তারিখ</label>
                        <SmartDateInput
                            value={data.admission_date}
                            onChange={(val) => setData('admission_date', val)}
                            disabled={fromAdmission}
                            className={fromAdmission ? inputClass : warningClass}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">৮. পরিবারের সদস্য</label>
                        <input type="number" value={data.family_members_count || ''} onChange={(e) => setData('family_members_count', e.target.value)} readOnly={fromAdmission} className={inputClass} placeholder="সংখ্যা" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">৯. উপার্জনক্ষম সদস্য</label>
                        <input type="number" value={data.earning_members_count || ''} onChange={(e) => setData('earning_members_count', e.target.value)} className={warningClass} placeholder="সংখ্যা" />
                    </div>
                </div>
            </div>

            {/* Savings & Past Loan Info */}
            <div className="bg-white p-4 md:p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-gray-800 font-bold text-sm border-b pb-2">
                    <Wallet className="w-4 h-4 text-purple-600" />
                    <span>সঞ্চয় ও পূর্ববর্তী ঋণ তথ্য</span>
                </div>

                {isOldMember && (
                    <div className="space-y-3 bg-amber-50/30 p-3.5 rounded-xl border border-amber-200">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">১০. ইতোপূর্বে গৃহীত ঋণ (বার)</label>
                                <input
                                    type="number"
                                    value={data.previous_loan_times || ''}
                                    readOnly
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">ইতোপূর্বে গৃহীত ঋণ (টাকা)</label>
                                <input type="number" value={data.previous_loan_amount || ''} onChange={(e) => setData('previous_loan_amount', e.target.value)} className={warningClass} placeholder="টাকা" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">১১. সর্বশেষ পরিশোধিত ঋণ</label>
                                <input type="number" value={data.last_repaid_loan_amount || ''} onChange={(e) => setData('last_repaid_loan_amount', e.target.value)} className={warningClass} placeholder="টাকা" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">১২. সর্বশেষ পরিশোধিত প্রকল্প</label>
                                <input type="text" value={data.last_repaid_project_name || ''} onChange={(e) => setData('last_repaid_project_name', e.target.value)} className={warningClass} placeholder="প্রকল্পের নাম" />
                            </div>
                        </div>
                    </div>
                )}

                <div data-sync="item-13" className={`rounded-xl ${fromAdmission ? 'p-3 bg-gray-50 border border-gray-200' : ''}`}>
                    <GeneralSavingsSection
                        savingsProducts={savingsProducts || []}
                        loanProduct={loanProduct || {}}
                        requestedAmount={Number(requestedAmount) || 0}
                        loanRound={loanRound || 1}
                        compact
                        data={{
                            savings_amount: data.savings_amount,
                            general_savings_product_id: data.general_savings_product_id,
                            general_savings_amount: data.general_savings_amount,
                            is_against_savings: data.is_against_savings,
                            against_savings_product_id: data.against_savings_product_id,
                            against_savings_amount: data.against_savings_amount,
                            loan_round: data.loan_round,
                        }}
                        setData={(key, value) => setData(key, value)}
                        errors={errors}
                    />
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">১৪. ঋণ প্রস্তাবনার তারিখ</label>
                    <SmartDateInput
                        value={data.loan_proposal_date}
                        onChange={(val) => setData('loan_proposal_date', val)}
                        className={warningClass}
                    />
                </div>
            </div>

            {/* Project & Estimated Financials */}
            <div className="bg-white p-4 md:p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-gray-800 font-bold text-sm border-b pb-2">
                    <Briefcase className="w-4 h-4 text-indigo-600" />
                    <span>প্রকল্প ও প্রাক্কলিত আয়-ব্যয়</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center justify-between">
                            <span>১৫. প্রকল্পের নাম</span>
                            {fromAdmission && member?.project_name && <Lock className="w-3 h-3 text-gray-400" />}
                        </label>
                        <input
                            type="text"
                            value={data.project_name || data.proposed_project_name || ''}
                            onChange={(e) => { setData('project_name', e.target.value); setData('proposed_project_name', e.target.value); }}
                            readOnly={fromAdmission && !!member?.project_name}
                            className={fromAdmission && member?.project_name ? inputClass : warningClass}
                            placeholder="প্রকল্পের নাম"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">১৬. নিয়োজিত জনবল</label>
                        <input type="number" value={data.project_manpower || ''} onChange={(e) => { setData('project_manpower', e.target.value); setData('project_manpower_total', e.target.value); }} className={warningClass} placeholder="সংখ্যা" />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">১৭. সম্ভাব্য আয় ({durationLabel})</label>
                        <input type="number" value={data.project_income_1_2_yr || ''} onChange={(e) => setData('project_income_1_2_yr', e.target.value)} className={warningClass} placeholder="টাকা" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">১৮. সম্ভাব্য ব্যয় ({durationLabel})</label>
                        <input type="number" value={data.project_expense_1_2_yr || ''} onChange={(e) => setData('project_expense_1_2_yr', e.target.value)} className={warningClass} placeholder="টাকা" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">১৯. নিট লাভ ({durationLabel})</label>
                        <input
                            type="number"
                            value={data.annual_net_profit || ''}
                            onChange={(e) => setData('annual_net_profit', e.target.value)}
                            readOnly={fromAdmission && (member?.estimated_annual_project_income != null && member?.estimated_annual_project_income !== '')}
                            className={fromAdmission && (member?.estimated_annual_project_income != null && member?.estimated_annual_project_income !== '') ? inputClass : warningClass}
                            placeholder="টাকা"
                        />
                    </div>
                </div>

                {incomeExpenseMismatch && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
                        ⚠️ আয় − ব্যয় = নিট লাভ ({durationLabel}) হতে হবে। (এখন: {income} − {expense} = {income - expense}, দেওয়া নিট লাভ: {netProfit})
                    </div>
                )}
                {hasNet && !hasIncomeExpense && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                        💡 আয় ও ব্যয় এমনভাবে পূরণ করুন যাতে (আয় − ব্যয়) = নিট লাভ ({durationLabel}) ({netProfit}) হয়।
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">২০. মোট মূলধন</label>
                        <input type="number" value={data.capital_total || ''} onChange={(e) => setData('capital_total', e.target.value)} className={warningClass} placeholder="টাকা" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">(ক) নিজস্ব মূলধন</label>
                        <input type="number" value={data.capital_own || ''} onChange={(e) => setData('capital_own', e.target.value)} className={warningClass} placeholder="টাকা" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">(খ) আবেদনকৃত ঋণ</label>
                        <input type="number" value={data.capital_applied_loan || ''} onChange={(e) => { setData('capital_applied_loan', e.target.value); setData('approval_amount_digits', e.target.value); }} className={warningClass} placeholder="টাকা" />
                    </div>
                </div>
            </div>

            {/* Family Assets Card Grid */}
            <div data-sync="item-21" className="bg-white p-4 md:p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-2 text-gray-800 font-bold text-sm">
                        <Calculator className="w-4 h-4 text-teal-600" />
                        <span>২১. পারিবারিক সম্পদ (স্থাবর ও অস্থাবর)</span>
                    </div>
                    {fromAdmission && (
                        <span className="text-[11px] bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                            <Lock className="w-3 h-3 text-gray-400" /> ভর্তি ফরম থেকে প্রাপ্ত
                        </span>
                    )}
                </div>

                {(() => {
                    const populatedAssets = (data.family_assets || []).filter(
                        (item: any) =>
                            String(item?.fixed_quantity ?? '').trim() !== '' ||
                            String(item?.fixed_value ?? '').trim() !== '' ||
                            String(item?.movable_desc ?? '').trim() !== '' ||
                            String(item?.movable_value ?? '').trim() !== ''
                    );
                    const assetRowsToDisplay = fromAdmission ? populatedAssets : (data.family_assets || []);

                    if (fromAdmission && assetRowsToDisplay.length === 0) {
                        return (
                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-500 italic flex items-center justify-between">
                                <span>ভর্তি ফরম থেকে কোনো স্থাবর/অস্থাবর সম্পদ নিবন্ধিত পাওয়া যায়নি।</span>
                                <Lock className="w-3.5 h-3.5 text-gray-400" />
                            </div>
                        );
                    }

                    return (
                        <div className="space-y-3">
                            {assetRowsToDisplay.map((item: any, idx: number) => (
                                <div key={idx} className="bg-gray-50/80 p-3 rounded-xl border border-gray-200 space-y-2">
                                    <div className="text-[11px] font-bold text-gray-700 flex items-center justify-between border-b pb-1">
                                        <span>সম্পদ বিবরণী #{idx + 1}</span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        <div>
                                            <label className="block text-[10px] text-gray-500 font-medium mb-0.5">স্থাবর পরিমাণ</label>
                                            <input
                                                type="text"
                                                placeholder="স্থাবর পরিমাণ"
                                                value={item?.fixed_quantity || ''}
                                                onChange={(e) => {
                                                    if (fromAdmission) return;
                                                    const assets = [...(data.family_assets || [])];
                                                    if (!assets[idx]) assets[idx] = {};
                                                    assets[idx].fixed_quantity = e.target.value;
                                                    setData('family_assets', assets);
                                                }}
                                                readOnly={fromAdmission}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] text-gray-500 font-medium mb-0.5">স্থাবর মূল্য</label>
                                            <input
                                                type="text"
                                                placeholder="স্থাবর মূল্য"
                                                value={item?.fixed_value || ''}
                                                onChange={(e) => {
                                                    if (fromAdmission) return;
                                                    const assets = [...(data.family_assets || [])];
                                                    if (!assets[idx]) assets[idx] = {};
                                                    assets[idx].fixed_value = e.target.value;
                                                    setData('family_assets', assets);
                                                }}
                                                readOnly={fromAdmission}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] text-gray-500 font-medium mb-0.5">অস্থাবর বিবরণ</label>
                                            <input
                                                type="text"
                                                placeholder="অস্থাবর বিবরণ"
                                                value={item?.movable_desc || ''}
                                                onChange={(e) => {
                                                    if (fromAdmission) return;
                                                    const assets = [...(data.family_assets || [])];
                                                    if (!assets[idx]) assets[idx] = {};
                                                    assets[idx].movable_desc = e.target.value;
                                                    setData('family_assets', assets);
                                                }}
                                                readOnly={fromAdmission}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] text-gray-500 font-medium mb-0.5">অস্থাবর মূল্য</label>
                                            <input
                                                type="text"
                                                placeholder="অস্থাবর মূল্য"
                                                value={item?.movable_value || ''}
                                                onChange={(e) => {
                                                    if (fromAdmission) return;
                                                    const assets = [...(data.family_assets || [])];
                                                    if (!assets[idx]) assets[idx] = {};
                                                    assets[idx].movable_value = e.target.value;
                                                    setData('family_assets', assets);
                                                }}
                                                readOnly={fromAdmission}
                                                className={inputClass}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    );
                })()}
            </div>

        </div>
    );
}

