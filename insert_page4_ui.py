import sys
import re

path = 'c:/Code/MisLoan/resources/js/pages/Member/LoanApplications/Forms/LoanApplicationApproval.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

state_fields = '''
        // --- NEW PAGE 4 FIELDS ---
        employee_workplace_name: '', employee_monthly_salary: '', employee_received_in_hand: '',
        employee_other_income: '', employee_approver_presence_time: '', employee_who_was_with: '',
        employee_bank_name: '', employee_salary_per_statement: '',
        expatriate_monthly_income: '', expatriate_channel: '', expatriate_confirmation_method: '',
        expatriate_country: '', expatriate_years_living: '', expatriate_work_permit_checked: '',
        project_environmental_legal_issues: '', risk_disaster_experience: '', risk_credit_sale: '',
        future_micro_enterprise_plan: '', loan_program_name: loanProduct?.name || '',
        self_emp_full_female: '', self_emp_full_male: '', self_emp_part_female: '', self_emp_part_male: '',
        wage_emp_full_female: '', wage_emp_full_male: '', wage_emp_part_female: '', wage_emp_part_male: '',
        
        regional_manager_comments: '', regional_manager_signature: null,
        zonal_manager_comments: '', zonal_manager_signature: null,
        
        // Page 4 fields (previously Page 3)
'''

# Use regex to find and replace the // Page 4 fields placeholder
new_content = re.sub(r'\/\/\s*Page 4 fields \(previously Page 3\)', state_fields, content, count=1)


ui_blocks = '''
                                {/* PAGE 4 - NEW UI */}
                                <div className={order-b pb-4}>
                                    <h3 className="font-bold text-[12px] mb-4">০৪. চাকরিজীবীর ক্ষেত্রে (Page 4)</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div className="space-y-1">
                                            <input type="text" placeholder="কর্মস্থলের নাম" value={data.employee_workplace_name} onChange={e => setData('employee_workplace_name', e.target.value)} className="w-full border rounded px-2 py-1 text-[11px]" />
                                            <input type="text" placeholder="মাসিক বেতন" value={data.employee_monthly_salary} onChange={e => setData('employee_monthly_salary', e.target.value)} className="w-full border rounded px-2 py-1 text-[11px]" />
                                            <input type="text" placeholder="হাতে প্রাপ্তি" value={data.employee_received_in_hand} onChange={e => setData('employee_received_in_hand', e.target.value)} className="w-full border rounded px-2 py-1 text-[11px]" />
                                            <input type="text" placeholder="অন্যান্য খাতের আয়" value={data.employee_other_income} onChange={e => setData('employee_other_income', e.target.value)} className="w-full border rounded px-2 py-1 text-[11px]" />
                                        </div>
                                        <div className="space-y-1">
                                            <input type="text" placeholder="উপস্থিতির তারিখ ও সময়" value={data.employee_approver_presence_time} onChange={e => setData('employee_approver_presence_time', e.target.value)} className="w-full border rounded px-2 py-1 text-[11px]" />
                                            <input type="text" placeholder="সাথে কে ছিলো" value={data.employee_who_was_with} onChange={e => setData('employee_who_was_with', e.target.value)} className="w-full border rounded px-2 py-1 text-[11px]" />
                                            <input type="text" placeholder="যে ব্যাংকে বেতন হয়" value={data.employee_bank_name} onChange={e => setData('employee_bank_name', e.target.value)} className="w-full border rounded px-2 py-1 text-[11px]" />
                                            <input type="text" placeholder="ব্যাংক স্টেটমেন্ট অনুযায়ী পরিমাণ" value={data.employee_salary_per_statement} onChange={e => setData('employee_salary_per_statement', e.target.value)} className="w-full border rounded px-2 py-1 text-[11px]" />
                                        </div>
                                    </div>

                                    <h3 className="font-bold text-[12px] mb-4">০৫. প্রবাসী সদস্যের রেমিটেন্স এর তথ্য</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div className="space-y-1">
                                            <input type="text" placeholder="মাসিক আয়" value={data.expatriate_monthly_income} onChange={e => setData('expatriate_monthly_income', e.target.value)} className="w-full border rounded px-2 py-1 text-[11px]" />
                                            <input type="text" placeholder="যে চ্যানেলে আসে" value={data.expatriate_channel} onChange={e => setData('expatriate_channel', e.target.value)} className="w-full border rounded px-2 py-1 text-[11px]" />
                                            <input type="text" placeholder="যা দেখে নিশ্চিত হলেন" value={data.expatriate_confirmation_method} onChange={e => setData('expatriate_confirmation_method', e.target.value)} className="w-full border rounded px-2 py-1 text-[11px]" />
                                        </div>
                                        <div className="space-y-1">
                                            <input type="text" placeholder="যে দেশে থাকে" value={data.expatriate_country} onChange={e => setData('expatriate_country', e.target.value)} className="w-full border rounded px-2 py-1 text-[11px]" />
                                            <input type="text" placeholder="কতো বছর ধরে থাকে" value={data.expatriate_years_living} onChange={e => setData('expatriate_years_living', e.target.value)} className="w-full border rounded px-2 py-1 text-[11px]" />
                                            <select value={data.expatriate_work_permit_checked} onChange={e => setData('expatriate_work_permit_checked', e.target.value)} className="w-full border rounded px-2 py-1 text-[11px]">
                                                <option value="">ওয়ার্কপারমিট যাচাই?</option>
                                                <option value="হ্যাঁ">হ্যাঁ</option>
                                                <option value="না">না</option>
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <h3 className="font-bold text-[12px] mb-4">০৬-০৮. পরিবেশ ও ঝুঁকি</h3>
                                    <div className="space-y-2 mb-4">
                                        <div className="flex gap-2 items-center">
                                            <label className="text-[11px] w-1/2">পরিবেশ ও আইনগত জটিলতা?</label>
                                            <select value={data.project_environmental_legal_issues} onChange={e => setData('project_environmental_legal_issues', e.target.value)} className="w-1/2 border rounded px-2 py-1 text-[11px]">
                                                <option value="">নির্বাচন করুন</option>
                                                <option value="হ্যাঁ">হ্যাঁ</option>
                                                <option value="না">না</option>
                                            </select>
                                        </div>
                                        <div className="flex gap-2 items-center">
                                            <label className="text-[11px] w-1/2">দুর্যোগ মোকাবিলার অভিজ্ঞতা?</label>
                                            <select value={data.risk_disaster_experience} onChange={e => setData('risk_disaster_experience', e.target.value)} className="w-1/2 border rounded px-2 py-1 text-[11px]">
                                                <option value="">নির্বাচন করুন</option>
                                                <option value="আছে">আছে</option>
                                                <option value="নাই">নাই</option>
                                            </select>
                                        </div>
                                        <div className="flex gap-2 items-center">
                                            <label className="text-[11px] w-1/2">বাকিতে বিক্রয়ের পরিমাণ/হার?</label>
                                            <select value={data.risk_credit_sale} onChange={e => setData('risk_credit_sale', e.target.value)} className="w-1/2 border rounded px-2 py-1 text-[11px]">
                                                <option value="">নির্বাচন করুন</option>
                                                <option value="আছে">আছে</option>
                                                <option value="নাই">নাই</option>
                                            </select>
                                        </div>
                                        <div>
                                            <input type="text" placeholder="ভবিষ্যতে ক্ষুদ্র উদ্যোগ বিষয়ে পরিকল্পনা" value={data.future_micro_enterprise_plan} onChange={e => setData('future_micro_enterprise_plan', e.target.value)} className="w-full border rounded px-2 py-1 text-[11px]" />
                                        </div>
                                    </div>

                                    <h3 className="font-bold text-[12px] mb-4">৯. কর্মসংস্থান সংক্রান্ত তথ্য</h3>
                                    <div className="border rounded p-2 mb-4">
                                        <div className="mb-2">
                                            <input type="text" placeholder="ঋণ কার্যক্রমের নাম" value={data.loan_program_name} onChange={e => setData('loan_program_name', e.target.value)} className="w-full border rounded px-2 py-1 text-[11px]" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <h4 className="font-bold text-[11px] mb-1">স্ব-কর্মসংস্থান (পূর্ণকালীন)</h4>
                                                <div className="flex gap-1"><input type="number" placeholder="মহিলা" value={data.self_emp_full_female} onChange={e => setData('self_emp_full_female', e.target.value)} className="w-1/2 border rounded px-2 py-1 text-[11px]" /><input type="number" placeholder="পুরুষ" value={data.self_emp_full_male} onChange={e => setData('self_emp_full_male', e.target.value)} className="w-1/2 border rounded px-2 py-1 text-[11px]" /></div>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-[11px] mb-1">স্ব-কর্মসংস্থান (খণ্ডকালীন)</h4>
                                                <div className="flex gap-1"><input type="number" placeholder="মহিলা" value={data.self_emp_part_female} onChange={e => setData('self_emp_part_female', e.target.value)} className="w-1/2 border rounded px-2 py-1 text-[11px]" /><input type="number" placeholder="পুরুষ" value={data.self_emp_part_male} onChange={e => setData('self_emp_part_male', e.target.value)} className="w-1/2 border rounded px-2 py-1 text-[11px]" /></div>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-[11px] mb-1">মজুরি ভিত্তিক (পূর্ণকালীন)</h4>
                                                <div className="flex gap-1"><input type="number" placeholder="মহিলা" value={data.wage_emp_full_female} onChange={e => setData('wage_emp_full_female', e.target.value)} className="w-1/2 border rounded px-2 py-1 text-[11px]" /><input type="number" placeholder="পুরুষ" value={data.wage_emp_full_male} onChange={e => setData('wage_emp_full_male', e.target.value)} className="w-1/2 border rounded px-2 py-1 text-[11px]" /></div>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-[11px] mb-1">মজুরি ভিত্তিক (খণ্ডকালীন)</h4>
                                                <div className="flex gap-1"><input type="number" placeholder="মহিলা" value={data.wage_emp_part_female} onChange={e => setData('wage_emp_part_female', e.target.value)} className="w-1/2 border rounded px-2 py-1 text-[11px]" /><input type="number" placeholder="পুরুষ" value={data.wage_emp_part_male} onChange={e => setData('wage_emp_part_male', e.target.value)} className="w-1/2 border rounded px-2 py-1 text-[11px]" /></div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Additional Approval Details */}
                                    <h3 className="font-bold text-[12px] mb-4">ঘ. সংস্থার অফিস পর্যায়ে পূরণীয় (অতিরিক্ত)</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-[11px] font-medium mb-1">আঞ্চলিক ব্যবস্থাপকের মন্তব্য</label>
                                            <textarea value={data.regional_manager_comments} onChange={(e) => setData('regional_manager_comments', e.target.value)} className="w-full border rounded px-2 py-1 text-[11px]" rows={2} />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-medium mb-1">জোনাল ম্যানেজারের মন্তব্য</label>
                                            <textarea value={data.zonal_manager_comments} onChange={(e) => setData('zonal_manager_comments', e.target.value)} className="w-full border rounded px-2 py-1 text-[11px]" rows={2} />
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Page 4 (previously Page 3): Investigation & Recommendation */}
'''

# Use regex to inject UI just before Page 4 (previously Page 3) header
new_content = re.sub(r'\{\/\*\s*Page 4 \(previously Page 3\):\s*Investigation & Recommendation\s*\*\*\/\}|\{\/\*\s*Page 4 \(previously Page 3\)\s*\*\/\}', ui_blocks, new_content, flags=re.IGNORECASE)

if new_content == content:
    print("Failed to replace!")
else:
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Page 4 UI injected successfully!")

