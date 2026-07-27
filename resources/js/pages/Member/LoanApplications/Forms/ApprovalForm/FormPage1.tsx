import React from 'react';
import { FormPageProps } from './Types';
import GeneralSavingsSection from '@/components/LoanApplications/GeneralSavingsSection';
import { SmartDateInput } from '@/components/ui/SmartDateInput';
import { toInputDate } from './index';

const RECIPIENT_OPTIONS = [
    'প্রধান নির্বাহী',
    'পরিচালক (মাইক্রোফাইন্যান্স)',
    'সহকারি পরিচালক (মাইক্রোফাইন্যান্স)',
    'জোন ব্যবস্থাপক',
    'অঞ্চলিক ব্যবস্থাপক',
] as const;

export default function FormPage1({ data, setData, member, isLegacy, handleImageUpload, removeImage, savingsProducts, loanRound }: FormPageProps) {
    const fromAdmission = !!(member && !isLegacy);
    const isOldMember = data.member_type === 'old' || !!(member?.is_legacy) || !!isLegacy;
    const inputClass = fromAdmission ? 'w-full border rounded px-2 py-1.5 text-[12px] bg-gray-100 cursor-not-allowed' : 'w-full border rounded px-2 py-1.5 text-[12px]';
    const editableClass = 'w-full border rounded px-2 py-1.5 text-[12px] bg-white';
    const warningClass = 'w-full border rounded px-2 py-1.5 text-[12px] bg-amber-50 border-amber-400';

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

    return (
        <div id="form-page-1" data-sync="page-1" className="border-b pb-4">
            <h3 className="font-bold mb-4 bg-gray-200 px-3 py-1 inline-block rounded">পৃষ্ঠা ১: মৌলিক তথ্য</h3>

            {/* Header info */}
            <div className="grid grid-cols-2 gap-4 mb-4" data-sync="page-1">
                <div className="space-y-2">
                    <div>
                        <label className="block text-[12px] font-medium mb-1">আবেদনের তারিখ</label>
                        <SmartDateInput
                            value={toInputDate(data.application_date)}
                            onChange={(val) => setData('application_date', val)}
                            className={warningClass}
                        />
                    </div>
                    <div>
                        <label className="block text-[12px] font-medium mb-1">বরাবর</label>
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
                        <label className="block text-[12px] font-medium mb-1">ঠিকানা</label>
                        <input
                            type="text"
                            value={data.authority_medium || ''}
                            onChange={(e) => setData('authority_medium', e.target.value)}
                            className={warningClass}
                            placeholder="ঠিকানা লিখুন"
                        />
                    </div>
                </div>
                <div className="space-y-2 border p-2 rounded bg-gray-50">
                    <div>
                        <label className="block text-[12px] font-medium mb-1">ঋণ অনুমোদনের তারিখ</label>
                        <SmartDateInput
                            value={toInputDate(data.loan_approval_date)}
                            onChange={(val) => setData('loan_approval_date', val)}
                            className={editableClass}
                        />
                    </div>
                    <div>
                        <label className="block text-[12px] font-medium mb-1">ঋণ বিতরণের তারিখ</label>
                        <SmartDateInput
                            value={toInputDate(data.loan_disbursement_date)}
                            onChange={(val) => setData('loan_disbursement_date', val)}
                            className={editableClass}
                        />
                    </div>
                    <div>
                        <label className="block text-[12px] font-medium mb-1">ঋণ পরিশোধের তারিখ</label>
                        <SmartDateInput
                            value={toInputDate(data.loan_repayment_date)}
                            onChange={(val) => setData('loan_repayment_date', val)}
                            className={editableClass}
                        />
                    </div>
                </div>
            </div>

            {/* Committee info */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                    <label className="block text-[12px] font-medium mb-1">সমিতির নাম</label>
                    <input type="text" value={data.committee_name || ''} onChange={(e) => setData('committee_name', e.target.value)} readOnly={fromAdmission} className={inputClass} />
                </div>
                <div>
                    <label className="block text-[12px] font-medium mb-1">সমিতি কোড</label>
                    <input type="text" value={data.committee_code || ''} onChange={(e) => setData('committee_code', e.target.value)} readOnly={fromAdmission} className={inputClass} />
                </div>
                <div>
                    <label className="block text-[12px] font-medium mb-1">নতুন/পুরাতন সদস্য</label>
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
                        <label className="block text-[12px] font-medium mb-1">দফা</label>
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

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div data-sync="item-1">
                    <label className="block text-[12px] font-medium mb-1">১. আবেদনকারীর নাম</label>
                    <input type="text" value={data.member_name_detail || ''} onChange={(e) => setData('member_name_detail', e.target.value)} readOnly={fromAdmission} className={inputClass} />
                </div>
                <div>
                    <label className="block text-[12px] font-medium mb-1">সদস্য কোড</label>
                    <input type="text" value={data.member_code || ''} onChange={(e) => setData('member_code', e.target.value)} readOnly={fromAdmission} className={inputClass} />
                </div>
                <div>
                    <label className="block text-[12px] font-medium mb-1">বয়স</label>
                    <input type="number" value={data.age || ''} onChange={(e) => setData('age', e.target.value)} readOnly={!!member?.date_of_birth} className={member?.date_of_birth ? inputClass : warningClass} />
                </div>
            </div>

            <div className="mb-4" data-sync="item-2">
                <label className="block text-[12px] font-medium mb-1">২. পিতা/স্বামীর নাম</label>
                <input type="text" value={data.father_husband_name || ''} onChange={(e) => setData('father_husband_name', e.target.value)} readOnly={fromAdmission} className={inputClass} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4" data-sync="item-3">
                <div className="space-y-2">
                    <label className="block text-[12px] font-medium mb-1">৩. ক) স্থায়ী ঠিকানা</label>
                    <input type="text" value={data.permanent_address_line1 || ''} onChange={(e) => setData('permanent_address_line1', e.target.value)} readOnly={fromAdmission} className={inputClass} placeholder="গ্রাম/মহল্লা" />
                    <input type="text" value={data.permanent_address_line2 || ''} onChange={(e) => setData('permanent_address_line2', e.target.value)} readOnly={fromAdmission} className={inputClass} placeholder="পোস্ট কোড" />
                    <input type="text" value={data.permanent_address_line3 || ''} onChange={(e) => setData('permanent_address_line3', e.target.value)} readOnly={fromAdmission} className={inputClass} placeholder="উপজেলা, জেলা" />
                </div>
                <div className="space-y-2">
                    <label className="block text-[12px] font-medium mb-1">৩. খ) বর্তমান ঠিকানা</label>
                    <input type="text" value={data.current_address_line1 || ''} onChange={(e) => setData('current_address_line1', e.target.value)} readOnly={fromAdmission} className={inputClass} placeholder="গ্রাম/মহল্লা" />
                    <input type="text" value={data.current_address_line2 || ''} onChange={(e) => setData('current_address_line2', e.target.value)} readOnly={fromAdmission} className={inputClass} placeholder="পোস্ট কোড" />
                    <input type="text" value={data.current_address_line3 || ''} onChange={(e) => setData('current_address_line3', e.target.value)} readOnly={fromAdmission} className={inputClass} placeholder="উপজেলা, জেলা" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="block text-[12px] font-medium mb-1">৫. পেশা</label>
                    <input type="text" value={data.occupation || ''} onChange={(e) => setData('occupation', e.target.value)} className={warningClass} />
                </div>
                <div>
                    <label className="block text-[12px] font-medium mb-1">৬. শিক্ষাগত যোগ্যতা</label>
                    <input type="text" value={data.educational_qualification || ''} onChange={(e) => setData('educational_qualification', e.target.value)} className={warningClass} />
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                    <label className="block text-[12px] font-medium mb-1">৭. সমিতিতে ভর্তির তারিখ</label>
                    <SmartDateInput
                        value={toInputDate(data.admission_date)}
                        onChange={(val) => setData('admission_date', val)}
                        disabled={fromAdmission}
                        className={fromAdmission ? inputClass : warningClass}
                    />
                </div>
                <div>
                    <label className="block text-[12px] font-medium mb-1">৮. পরিবারের মোট সদস্য</label>
                    <input type="number" value={data.family_members_count || ''} onChange={(e) => setData('family_members_count', e.target.value)} readOnly={fromAdmission} className={inputClass} />
                </div>
                <div>
                    <label className="block text-[12px] font-medium mb-1">৯. উপার্জনক্ষম সদস্য</label>
                    <input type="number" value={data.earning_members_count || ''} onChange={(e) => setData('earning_members_count', e.target.value)} className={warningClass} />
                </div>
            </div>

            {isOldMember && (
                <>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-[12px] font-medium mb-1">১০. ইতোপূর্বে গৃহীত ঋণ (বার)</label>
                            <input
                                type="number"
                                value={data.previous_loan_times || ''}
                                readOnly
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className="block text-[12px] font-medium mb-1">ইতোপূর্বে গৃহীত ঋণ (টাকা)</label>
                            <input type="number" value={data.previous_loan_amount || ''} onChange={(e) => setData('previous_loan_amount', e.target.value)} className={warningClass} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-[12px] font-medium mb-1">১১. সর্বশেষ পরিশোধিত ঋণ</label>
                            <input type="number" value={data.last_repaid_loan_amount || ''} onChange={(e) => setData('last_repaid_loan_amount', e.target.value)} className={warningClass} />
                        </div>
                        <div>
                            <label className="block text-[12px] font-medium mb-1">১২. সর্বশেষ পরিশোধিত প্রকল্প</label>
                            <input type="text" value={data.last_repaid_project_name || ''} onChange={(e) => setData('last_repaid_project_name', e.target.value)} className={warningClass} />
                        </div>
                    </div>
                </>
            )}

            <div data-sync="item-13" className={`mb-4${fromAdmission ? ' p-2 bg-gray-50 border rounded' : ''}`}>
                <GeneralSavingsSection
                    data={data}
                    setData={setData}
                    savingsProducts={savingsProducts || []}
                    loanRound={loanRound || 1}
                    isLegacy={isLegacy || false}
                    member={member}
                />
            </div>

            <div className="mb-4">
                <label className="block text-[12px] font-medium mb-1">১৪. ঋণ প্রস্তাবনার তারিখ</label>
                <SmartDateInput
                    value={toInputDate(data.loan_proposal_date)}
                    onChange={(val) => setData('loan_proposal_date', val)}
                    className={warningClass}
                />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="block text-[12px] font-medium mb-1">১৫. প্রকল্পের নাম</label>
                    <input
                        type="text"
                        value={data.project_name || data.proposed_project_name || ''}
                        onChange={(e) => { setData('project_name', e.target.value); setData('proposed_project_name', e.target.value); }}
                        readOnly={fromAdmission && !!member?.project_name}
                        className={fromAdmission && member?.project_name ? inputClass : warningClass}
                    />
                </div>
                <div>
                    <label className="block text-[12px] font-medium mb-1">১৬. প্রকল্পে নিয়োজিত জনবল</label>
                    <input type="number" value={data.project_manpower || ''} onChange={(e) => { setData('project_manpower', e.target.value); setData('project_manpower_total', e.target.value); }} className={warningClass} />
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                    <label className="block text-[12px] font-medium mb-1">১৭. প্রকল্পের আয় (সম্ভাব্য)</label>
                    <input type="number" value={data.project_income_1_2_yr || ''} onChange={(e) => setData('project_income_1_2_yr', e.target.value)} className={warningClass} />
                </div>
                <div>
                    <label className="block text-[12px] font-medium mb-1">১৮. প্রকল্পের ব্যয় (সম্ভাব্য)</label>
                    <input type="number" value={data.project_expense_1_2_yr || ''} onChange={(e) => setData('project_expense_1_2_yr', e.target.value)} className={warningClass} />
                </div>
                <div>
                    <label className="block text-[12px] font-medium mb-1">১৯. বার্ষিক নিট লাভ</label>
                    <input
                        type="number"
                        value={data.annual_net_profit || ''}
                        onChange={(e) => setData('annual_net_profit', e.target.value)}
                        readOnly={fromAdmission && (member?.estimated_annual_project_income != null && member?.estimated_annual_project_income !== '')}
                        className={fromAdmission && (member?.estimated_annual_project_income != null && member?.estimated_annual_project_income !== '') ? inputClass : warningClass}
                    />
                </div>
            </div>
            {incomeExpenseMismatch && (
                <p className="mb-4 text-[11px] text-red-600 font-medium">
                    আয় − ব্যয় = বার্ষিক নিট লাভ হতে হবে। এখন: {income} − {expense} = {income - expense}, নিট লাভ: {netProfit}
                </p>
            )}
            {hasNet && !hasIncomeExpense && (
                <p className="mb-4 text-[11px] text-amber-700">
                    আয় ও ব্যয় এমনভাবে পূরণ করুন যাতে আয় − ব্যয় = বার্ষিক নিট লাভ ({netProfit}) হয়।
                </p>
            )}

            <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                    <label className="block text-[12px] font-medium mb-1">২০. প্রকল্পে মোট মূলধন</label>
                    <input type="number" value={data.capital_total || ''} onChange={(e) => setData('capital_total', e.target.value)} className={warningClass} />
                </div>
                <div>
                    <label className="block text-[12px] font-medium mb-1">(ক) নিজস্ব মূলধন</label>
                    <input type="number" value={data.capital_own || ''} onChange={(e) => setData('capital_own', e.target.value)} className={warningClass} />
                </div>
                <div>
                    <label className="block text-[12px] font-medium mb-1">(খ) আবেদনকৃত ঋণ</label>
                    <input type="number" value={data.capital_applied_loan || ''} onChange={(e) => { setData('capital_applied_loan', e.target.value); setData('approval_amount_digits', e.target.value); }} className={warningClass} />
                </div>
            </div>

            <div data-sync="item-21" className={`mb-4${fromAdmission ? ' p-2 bg-gray-50 border rounded' : ''}`}>
                <label className="block text-[12px] font-medium mb-2">২১. পারিবারিক সম্পদ (স্থাবর ও অস্থাবর)</label>
                <div className="space-y-2">
                    {Array.from({ length: Math.max(4, (data.family_assets?.length ?? 4)) }).map((_, idx) => (
                        <div key={idx} className="grid grid-cols-4 gap-2">
                            <input type="text" placeholder="স্থাবর পরিমাণ" value={data.family_assets?.[idx]?.fixed_quantity || ''} onChange={(e) => {
                                const assets = [...(data.family_assets || [])];
                                if (!assets[idx]) assets[idx] = {};
                                assets[idx].fixed_quantity = e.target.value;
                                setData('family_assets', assets);
                            }} readOnly={fromAdmission} className={inputClass} />
                            <input type="text" placeholder="স্থাবর মূল্য" value={data.family_assets?.[idx]?.fixed_value || ''} onChange={(e) => {
                                const assets = [...(data.family_assets || [])];
                                if (!assets[idx]) assets[idx] = {};
                                assets[idx].fixed_value = e.target.value;
                                setData('family_assets', assets);
                            }} readOnly={fromAdmission} className={inputClass} />
                            <input type="text" placeholder="অস্থাবর বিবরণ" value={data.family_assets?.[idx]?.movable_desc || ''} onChange={(e) => {
                                const assets = [...(data.family_assets || [])];
                                if (!assets[idx]) assets[idx] = {};
                                assets[idx].movable_desc = e.target.value;
                                setData('family_assets', assets);
                            }} readOnly={fromAdmission} className={inputClass} />
                            <input type="text" placeholder="অস্থাবর মূল্য" value={data.family_assets?.[idx]?.movable_value || ''} onChange={(e) => {
                                const assets = [...(data.family_assets || [])];
                                if (!assets[idx]) assets[idx] = {};
                                assets[idx].movable_value = e.target.value;
                                setData('family_assets', assets);
                            }} readOnly={fromAdmission} className={inputClass} />
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
}
