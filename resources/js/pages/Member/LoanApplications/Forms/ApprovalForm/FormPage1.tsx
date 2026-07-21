import React from 'react';
import { Upload } from 'lucide-react';
import { FormPageProps } from './Types';
import GeneralSavingsSection from '@/components/LoanApplications/GeneralSavingsSection';
import { toInputDate } from './index';

export default function FormPage1({ data, setData, member, isLegacy, handleImageUpload, removeImage, savingsProducts, loanRound }: FormPageProps) {
    const fromAdmission = !!(member && !isLegacy);
    const inputClass = fromAdmission ? 'w-full border rounded px-2 py-1.5 text-[12px] bg-gray-100 cursor-not-allowed' : 'w-full border rounded px-2 py-1.5 text-[12px]';
    const warningClass = fromAdmission ? 'w-full border rounded px-2 py-1.5 text-[12px] bg-amber-50 border-amber-400' : 'w-full border rounded px-2 py-1.5 text-[12px]';

    return (
        <div id="form-page-1" data-sync="page-1" className="border-b pb-4">
            <h3 className="font-bold mb-4 bg-gray-200 px-3 py-1 inline-block rounded">পৃষ্ঠা ১: মৌলিক তথ্য</h3>

            {/* Header info */}
            <div className="grid grid-cols-2 gap-4 mb-4" data-sync="page-1">
                <div className="space-y-2">
                    <div>
                        <label className="block text-[12px] font-medium mb-1">আবেদনের তারিখ</label>
                        <input type="date" value={toInputDate(data.application_date)} onChange={(e) => setData('application_date', e.target.value)} className={warningClass} />
                    </div>
                    <div>
                        <label className="block text-[12px] font-medium mb-1">বরাবর</label>
                        <input type="text" value={data.recipient_to || ''} onChange={(e) => setData('recipient_to', e.target.value)} className={warningClass} placeholder="যেমন: নির্বাহী পরিচালক" />
                    </div>
                    <div>
                        <label className="block text-[12px] font-medium mb-1">মাধ্যম</label>
                        <input type="text" value={data.authority_medium || ''} onChange={(e) => setData('authority_medium', e.target.value)} className={warningClass} placeholder="যথাযথ কর্তৃপক্ষ" />
                    </div>
                </div>
                <div className="space-y-2 border p-2 rounded bg-gray-50">
                    <div>
                        <label className="block text-[12px] font-medium mb-1">ঋণ অনুমোদনের তারিখ</label>
                        <input type="date" value={toInputDate(data.loan_approval_date)} onChange={(e) => setData('loan_approval_date', e.target.value)} className="w-full border rounded px-2 py-1.5 text-[12px]" />
                    </div>
                    <div>
                        <label className="block text-[12px] font-medium mb-1">ঋণ বিতরণের তারিখ</label>
                        <input type="date" value={toInputDate(data.loan_disbursement_date)} onChange={(e) => setData('loan_disbursement_date', e.target.value)} className="w-full border rounded px-2 py-1.5 text-[12px]" />
                    </div>
                    <div>
                        <label className="block text-[12px] font-medium mb-1">ঋণ পরিশোধের তারিখ</label>
                        <input type="date" value={toInputDate(data.loan_repayment_date)} onChange={(e) => setData('loan_repayment_date', e.target.value)} className="w-full border rounded px-2 py-1.5 text-[12px]" />
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
                    <select value={data.member_type ?? 'new'} onChange={(e) => setData('member_type', e.target.value as 'new' | 'old')} className={warningClass}>
                        <option value="new">নতুন সদস্য</option>
                        <option value="old">পুরাতন সদস্য</option>
                    </select>
                </div>
                {data.member_type === 'old' && (
                    <div>
                        <label className="block text-[12px] font-medium mb-1">কতো বছর যাবৎ সম্পৃক্ত</label>
                        <input type="text" value={data.years_involved || ''} onChange={(e) => setData('years_involved', e.target.value)} className={warningClass} />
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
                    <input type="text" value={data.permanent_address_line2 || ''} onChange={(e) => setData('permanent_address_line2', e.target.value)} readOnly={fromAdmission} className={inputClass} placeholder="ডাকঘর" />
                    <input type="text" value={data.permanent_address_line3 || ''} onChange={(e) => setData('permanent_address_line3', e.target.value)} readOnly={fromAdmission} className={inputClass} placeholder="উপজেলা, জেলা" />
                </div>
                <div className="space-y-2">
                    <label className="block text-[12px] font-medium mb-1">৩. খ) বর্তমান ঠিকানা</label>
                    <input type="text" value={data.current_address_line1 || ''} onChange={(e) => setData('current_address_line1', e.target.value)} readOnly={fromAdmission} className={inputClass} placeholder="গ্রাম/মহল্লা" />
                    <input type="text" value={data.current_address_line2 || ''} onChange={(e) => setData('current_address_line2', e.target.value)} readOnly={fromAdmission} className={inputClass} placeholder="ডাকঘর" />
                    <input type="text" value={data.current_address_line3 || ''} onChange={(e) => setData('current_address_line3', e.target.value)} readOnly={fromAdmission} className={inputClass} placeholder="উপজেলা, জেলা" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="block text-[12px] font-medium mb-1">৫. পেশা</label>
                    <input type="text" value={data.occupation || ''} onChange={(e) => setData('occupation', e.target.value)} readOnly={fromAdmission} className={inputClass} />
                </div>
                <div>
                    <label className="block text-[12px] font-medium mb-1">৬. শিক্ষাগত যোগ্যতা</label>
                    <input type="text" value={data.educational_qualification || ''} onChange={(e) => setData('educational_qualification', e.target.value)} readOnly={fromAdmission} className={inputClass} />
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                    <label className="block text-[12px] font-medium mb-1">৭. সমিতিতে ভর্তির তারিখ</label>
                    <input type="date" value={toInputDate(data.admission_date)} onChange={(e) => setData('admission_date', e.target.value)} readOnly={fromAdmission} className={inputClass} />
                </div>
                <div>
                    <label className="block text-[12px] font-medium mb-1">৮. পরিবারের মোট সদস্য</label>
                    <input type="number" value={data.family_members_count || ''} onChange={(e) => setData('family_members_count', e.target.value)} readOnly={fromAdmission} className={inputClass} />
                </div>
                <div>
                    <label className="block text-[12px] font-medium mb-1">৯. উপার্জনক্ষম সদস্য</label>
                    <input type="number" value={data.earning_members_count || ''} onChange={(e) => setData('earning_members_count', e.target.value)} readOnly={fromAdmission} className={inputClass} />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="block text-[12px] font-medium mb-1">১০. ইতোপূর্বে গৃহীত ঋণ (বার)</label>
                    <input type="number" value={data.previous_loan_times || ''} onChange={(e) => setData('previous_loan_times', e.target.value)} className={warningClass} />
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
                <input type="date" value={toInputDate(data.loan_proposal_date)} onChange={(e) => setData('loan_proposal_date', e.target.value)} className={warningClass} />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="block text-[12px] font-medium mb-1">১৫. প্রকল্পের নাম</label>
                    <input type="text" value={data.project_name || data.proposed_project_name || ''} onChange={(e) => { setData('project_name', e.target.value); setData('proposed_project_name', e.target.value); }} className={warningClass} />
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
                    <input type="number" value={data.annual_net_profit || ''} onChange={(e) => setData('annual_net_profit', e.target.value)} className={warningClass} />
                </div>
            </div>

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

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="block text-[12px] font-medium mb-2">আবেদনকারীর স্বাক্ষর</label>
                    {data.applicant_signature ? (
                        <div className="relative">
                            <img src={data.applicant_signature} alt="Signature" className="w-full h-24 object-contain border rounded" />
                            <button onClick={() => removeImage('applicant_signature')} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded text-[12px]">X</button>
                        </div>
                    ) : (
                        <div className="border-2 border-dashed rounded p-2 text-center">
                            <Upload className="w-6 h-6 mx-auto mb-1 text-gray-400" />
                            <input type="file" accept="image/*" onChange={(e) => handleImageUpload('applicant_signature', e.target.files?.[0] || null)} className="hidden" id="applicant_signature" />
                            <label htmlFor="applicant_signature" className="cursor-pointer text-[12px] text-blue-600">Upload</label>
                        </div>
                    )}
                </div>
                <div>
                    <label className="block text-[12px] font-medium mb-2">অনুমোদনকারীর স্বাক্ষর</label>
                    {data.approver_signature ? (
                        <div className="relative">
                            <img src={data.approver_signature} alt="Signature" className="w-full h-24 object-contain border rounded" />
                            <button onClick={() => removeImage('approver_signature')} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded text-[12px]">X</button>
                        </div>
                    ) : (
                        <div className="border-2 border-dashed rounded p-2 text-center">
                            <Upload className="w-6 h-6 mx-auto mb-1 text-gray-400" />
                            <input type="file" accept="image/*" onChange={(e) => handleImageUpload('approver_signature', e.target.files?.[0] || null)} className="hidden" id="approver_signature" />
                            <label htmlFor="approver_signature" className="cursor-pointer text-[12px] text-blue-600">Upload</label>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
