import sys
import re

path = 'c:/Code/MisLoan/resources/js/pages/Member/LoanApplications/Forms/LoanApplicationApproval.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

ui_blocks = '''
                                {/* PAGE 3 - NEW UI */}
                                <div className={order-b pb-4}>
                                    <h3 className="font-bold text-[12px] mb-4">০৪. উদ্যোগের সম্ভাব্য আয়-ব্যয় হিসাব (Page 3)</h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <h4 className="font-bold text-[12px] mb-2 border-b">উদ্যোগ পরিচালনা ব্যয়</h4>
                                            <div className="space-y-2">
                                                <div><label className="text-[11px]">কর্মচারীর বেতন ভাতা বাবদ</label><input type="number" value={data.est_emp_salary} onChange={e => setData('est_emp_salary', e.target.value)} className="w-full border rounded px-2 py-1 text-[11px]" /></div>
                                                <div><label className="text-[11px]">পরিবহন বাবদ</label><input type="number" value={data.est_transport} onChange={e => setData('est_transport', e.target.value)} className="w-full border rounded px-2 py-1 text-[11px]" /></div>
                                                <div><label className="text-[11px]">বিভিন্ন বিল বাবদ</label><input type="number" value={data.est_bills} onChange={e => setData('est_bills', e.target.value)} className="w-full border rounded px-2 py-1 text-[11px]" /></div>
                                                <div><label className="text-[11px]">ঘর/স্থাপনা ভাড়া বাবদ</label><input type="number" value={data.est_rent} onChange={e => setData('est_rent', e.target.value)} className="w-full border rounded px-2 py-1 text-[11px]" /></div>
                                                <div><label className="text-[11px]">ঋণের সার্ভিস চার্জ বাবদ</label><input type="number" value={data.est_loan_charge} onChange={e => setData('est_loan_charge', e.target.value)} className="w-full border rounded px-2 py-1 text-[11px]" /></div>
                                                <div className="flex gap-2">
                                                    <input type="text" placeholder="অন্যান্য ব্যয় ১" value={data.est_other_exp_1_name} onChange={e => setData('est_other_exp_1_name', e.target.value)} className="w-1/2 border rounded px-2 py-1 text-[11px]" />
                                                    <input type="number" placeholder="টাকা" value={data.est_other_exp_1_amount} onChange={e => setData('est_other_exp_1_amount', e.target.value)} className="w-1/2 border rounded px-2 py-1 text-[11px]" />
                                                </div>
                                                <div className="flex gap-2">
                                                    <input type="text" placeholder="অন্যান্য ব্যয় ২" value={data.est_other_exp_2_name} onChange={e => setData('est_other_exp_2_name', e.target.value)} className="w-1/2 border rounded px-2 py-1 text-[11px]" />
                                                    <input type="number" placeholder="টাকা" value={data.est_other_exp_2_amount} onChange={e => setData('est_other_exp_2_amount', e.target.value)} className="w-1/2 border rounded px-2 py-1 text-[11px]" />
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-[12px] mb-2 border-b">উদ্যোগের আয়</h4>
                                            <div className="space-y-2">
                                                <div><label className="text-[11px]">মূল আয়ের খাত</label><input type="text" value={data.est_main_income_source} onChange={e => setData('est_main_income_source', e.target.value)} className="w-full border rounded px-2 py-1 text-[11px]" /></div>
                                                <div><label className="text-[11px]">মূল আয় (টাকা)</label><input type="number" value={data.est_main_income_amount} onChange={e => setData('est_main_income_amount', e.target.value)} className="w-full border rounded px-2 py-1 text-[11px]" /></div>
                                                <div><label className="text-[11px]">অন্যান্য আয়ের খাত</label><input type="text" value={data.est_other_income_source} onChange={e => setData('est_other_income_source', e.target.value)} className="w-full border rounded px-2 py-1 text-[11px]" /></div>
                                                <div><label className="text-[11px]">অন্যান্য আয় (টাকা)</label><input type="number" value={data.est_other_income_amount} onChange={e => setData('est_other_income_amount', e.target.value)} className="w-full border rounded px-2 py-1 text-[11px]" /></div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <h3 className="font-bold text-[12px] mb-4">গ. অন্যান্য তথ্যাবলী</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div><label className="text-[11px]">ঋণের মেয়াদ (মাস)</label><input type="number" value={data.loan_duration_months} onChange={e => setData('loan_duration_months', e.target.value)} className="w-full border rounded px-2 py-1 text-[11px]" /></div>
                                        <div><label className="text-[11px]">সার্ভিস চার্জের হার (%)</label><input type="number" value={data.applied_service_charge_rate} onChange={e => setData('applied_service_charge_rate', e.target.value)} className="w-full border rounded px-2 py-1 text-[11px]" /></div>
                                        <div><label className="text-[11px]">কিস্তির ধরণ</label><input type="text" value={data.installment_type} onChange={e => setData('installment_type', e.target.value)} className="w-full border rounded px-2 py-1 text-[11px]" /></div>
                                        <div><label className="text-[11px]">কিস্তির আসল (টাকা)</label><input type="number" value={data.installment_principal} onChange={e => setData('installment_principal', e.target.value)} className="w-full border rounded px-2 py-1 text-[11px]" /></div>
                                        <div><label className="text-[11px]">কিস্তির সার্ভিস চার্জ (টাকা)</label><input type="number" value={data.installment_service_charge} onChange={e => setData('installment_service_charge', e.target.value)} className="w-full border rounded px-2 py-1 text-[11px]" /></div>
                                    </div>

                                    <h3 className="font-bold text-[12px] mb-4">০২. জামিনদারের তথ্য</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div className="border p-2 rounded">
                                            <h4 className="font-bold text-[11px] mb-2">(ক) ১ম জামিনদার</h4>
                                            <div className="space-y-1">
                                                <input type="text" placeholder="নাম" value={data.guarantor_1_name} onChange={e => setData('guarantor_1_name', e.target.value)} className="w-full border rounded px-2 py-1 text-[11px]" />
                                                <input type="text" placeholder="ঠিকানা" value={data.guarantor_1_address} onChange={e => setData('guarantor_1_address', e.target.value)} className="w-full border rounded px-2 py-1 text-[11px]" />
                                                <input type="text" placeholder="মোবাইল" value={data.guarantor_1_mobile} onChange={e => setData('guarantor_1_mobile', e.target.value)} className="w-full border rounded px-2 py-1 text-[11px]" />
                                                <div className="flex gap-1">
                                                    <input type="text" placeholder="সম্পর্ক" value={data.guarantor_1_relation} onChange={e => setData('guarantor_1_relation', e.target.value)} className="w-1/2 border rounded px-2 py-1 text-[11px]" />
                                                    <input type="text" placeholder="পেশা" value={data.guarantor_1_profession} onChange={e => setData('guarantor_1_profession', e.target.value)} className="w-1/2 border rounded px-2 py-1 text-[11px]" />
                                                </div>
                                                <div className="flex gap-1">
                                                    <input type="text" placeholder="মাসিক আয়" value={data.guarantor_1_monthly_income} onChange={e => setData('guarantor_1_monthly_income', e.target.value)} className="w-1/2 border rounded px-2 py-1 text-[11px]" />
                                                    <input type="text" placeholder="সম্পদ পরিমাণ" value={data.guarantor_1_assets_amount} onChange={e => setData('guarantor_1_assets_amount', e.target.value)} className="w-1/2 border rounded px-2 py-1 text-[11px]" />
                                                </div>
                                                <input type="text" placeholder="সম্ভাব্য মূল্য" value={data.guarantor_1_potential_value} onChange={e => setData('guarantor_1_potential_value', e.target.value)} className="w-full border rounded px-2 py-1 text-[11px]" />
                                                <div className="flex gap-1">
                                                    <input type="text" placeholder="সাক্ষাৎকারী" value={data.guarantor_1_interviewer_name} onChange={e => setData('guarantor_1_interviewer_name', e.target.value)} className="w-1/2 border rounded px-2 py-1 text-[11px]" />
                                                    <input type="text" placeholder="পদবী" value={data.guarantor_1_interviewer_designation} onChange={e => setData('guarantor_1_interviewer_designation', e.target.value)} className="w-1/2 border rounded px-2 py-1 text-[11px]" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="border p-2 rounded">
                                            <h4 className="font-bold text-[11px] mb-2">(খ) ২য় জামিনদার</h4>
                                            <div className="space-y-1">
                                                <input type="text" placeholder="নাম" value={data.guarantor_2_name} onChange={e => setData('guarantor_2_name', e.target.value)} className="w-full border rounded px-2 py-1 text-[11px]" />
                                                <input type="text" placeholder="ঠিকানা" value={data.guarantor_2_address} onChange={e => setData('guarantor_2_address', e.target.value)} className="w-full border rounded px-2 py-1 text-[11px]" />
                                                <input type="text" placeholder="মোবাইল" value={data.guarantor_2_mobile} onChange={e => setData('guarantor_2_mobile', e.target.value)} className="w-full border rounded px-2 py-1 text-[11px]" />
                                                <div className="flex gap-1">
                                                    <input type="text" placeholder="সম্পর্ক" value={data.guarantor_2_relation} onChange={e => setData('guarantor_2_relation', e.target.value)} className="w-1/2 border rounded px-2 py-1 text-[11px]" />
                                                    <input type="text" placeholder="পেশা" value={data.guarantor_2_profession} onChange={e => setData('guarantor_2_profession', e.target.value)} className="w-1/2 border rounded px-2 py-1 text-[11px]" />
                                                </div>
                                                <div className="flex gap-1">
                                                    <input type="text" placeholder="মাসিক আয়" value={data.guarantor_2_monthly_income} onChange={e => setData('guarantor_2_monthly_income', e.target.value)} className="w-1/2 border rounded px-2 py-1 text-[11px]" />
                                                    <input type="text" placeholder="সম্পদ পরিমাণ" value={data.guarantor_2_assets_amount} onChange={e => setData('guarantor_2_assets_amount', e.target.value)} className="w-1/2 border rounded px-2 py-1 text-[11px]" />
                                                </div>
                                                <input type="text" placeholder="সম্ভাব্য মূল্য" value={data.guarantor_2_potential_value} onChange={e => setData('guarantor_2_potential_value', e.target.value)} className="w-full border rounded px-2 py-1 text-[11px]" />
                                                <div className="flex gap-1">
                                                    <input type="text" placeholder="সাক্ষাৎকারী" value={data.guarantor_2_interviewer_name} onChange={e => setData('guarantor_2_interviewer_name', e.target.value)} className="w-1/2 border rounded px-2 py-1 text-[11px]" />
                                                    <input type="text" placeholder="পদবী" value={data.guarantor_2_interviewer_designation} onChange={e => setData('guarantor_2_interviewer_designation', e.target.value)} className="w-1/2 border rounded px-2 py-1 text-[11px]" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <h3 className="font-bold text-[12px] mb-4">০৩. তথ্য প্রদানকারী</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div className="border p-2 rounded space-y-1">
                                            <h4 className="font-bold text-[11px] mb-2">(ক) ১ম জন</h4>
                                            <input type="text" placeholder="নাম" value={data.informant_1_name} onChange={e => setData('informant_1_name', e.target.value)} className="w-full border rounded px-2 py-1 text-[11px]" />
                                            <input type="text" placeholder="ঠিকানা" value={data.informant_1_address} onChange={e => setData('informant_1_address', e.target.value)} className="w-full border rounded px-2 py-1 text-[11px]" />
                                            <div className="flex gap-1">
                                                <input type="text" placeholder="মোবাইল" value={data.informant_1_mobile} onChange={e => setData('informant_1_mobile', e.target.value)} className="w-1/3 border rounded px-2 py-1 text-[11px]" />
                                                <input type="text" placeholder="সম্পর্ক" value={data.informant_1_relation} onChange={e => setData('informant_1_relation', e.target.value)} className="w-1/3 border rounded px-2 py-1 text-[11px]" />
                                                <input type="text" placeholder="পেশা" value={data.informant_1_profession} onChange={e => setData('informant_1_profession', e.target.value)} className="w-1/3 border rounded px-2 py-1 text-[11px]" />
                                            </div>
                                            <input type="text" placeholder="ঋণ সংক্রান্ত তথ্য" value={data.informant_1_loan_info} onChange={e => setData('informant_1_loan_info', e.target.value)} className="w-full border rounded px-2 py-1 text-[11px]" />
                                            <input type="text" placeholder="সম্পদ সংক্রান্ত তথ্য" value={data.informant_1_asset_info} onChange={e => setData('informant_1_asset_info', e.target.value)} className="w-full border rounded px-2 py-1 text-[11px]" />
                                            <input type="text" placeholder="সার্বিক মন্তব্য" value={data.informant_1_overall_comment} onChange={e => setData('informant_1_overall_comment', e.target.value)} className="w-full border rounded px-2 py-1 text-[11px]" />
                                        </div>
                                        <div className="border p-2 rounded space-y-1">
                                            <h4 className="font-bold text-[11px] mb-2">(খ) ২য় জন</h4>
                                            <input type="text" placeholder="নাম" value={data.informant_2_name} onChange={e => setData('informant_2_name', e.target.value)} className="w-full border rounded px-2 py-1 text-[11px]" />
                                            <input type="text" placeholder="ঠিকানা" value={data.informant_2_address} onChange={e => setData('informant_2_address', e.target.value)} className="w-full border rounded px-2 py-1 text-[11px]" />
                                            <div className="flex gap-1">
                                                <input type="text" placeholder="মোবাইল" value={data.informant_2_mobile} onChange={e => setData('informant_2_mobile', e.target.value)} className="w-1/3 border rounded px-2 py-1 text-[11px]" />
                                                <input type="text" placeholder="সম্পর্ক" value={data.informant_2_relation} onChange={e => setData('informant_2_relation', e.target.value)} className="w-1/3 border rounded px-2 py-1 text-[11px]" />
                                                <input type="text" placeholder="পেশা" value={data.informant_2_profession} onChange={e => setData('informant_2_profession', e.target.value)} className="w-1/3 border rounded px-2 py-1 text-[11px]" />
                                            </div>
                                            <input type="text" placeholder="ঋণ সংক্রান্ত তথ্য" value={data.informant_2_loan_info} onChange={e => setData('informant_2_loan_info', e.target.value)} className="w-full border rounded px-2 py-1 text-[11px]" />
                                            <input type="text" placeholder="সম্পদ সংক্রান্ত তথ্য" value={data.informant_2_asset_info} onChange={e => setData('informant_2_asset_info', e.target.value)} className="w-full border rounded px-2 py-1 text-[11px]" />
                                            <input type="text" placeholder="সার্বিক মন্তব্য" value={data.informant_2_overall_comment} onChange={e => setData('informant_2_overall_comment', e.target.value)} className="w-full border rounded px-2 py-1 text-[11px]" />
                                        </div>
                                    </div>
                                </div>

                                {/* Page 4 (previously Page 3) */}
'''

new_content = re.sub(r'\{\/\*\s*Page 3: Investigation & Recommendation.*?\}', ui_blocks, content, flags=re.IGNORECASE)

if new_content == content:
    print('Failed to replace UI block!')
else:
    print('Replaced UI block successfully!')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)
