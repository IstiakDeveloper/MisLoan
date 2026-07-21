import React from 'react';
import { Upload } from 'lucide-react';
import { FormPageProps } from './Types';
import { numberToWordsBangla } from './PrintPreview';

export default function FormPage4({ data, setData, handleImageUpload, removeImage }: FormPageProps) {
    return (
        <div id="form-page-4" data-sync="page-4" className="border-b pb-4">
            <h3 className="font-bold mb-4 bg-gray-200 px-3 py-1 inline-block rounded">পৃষ্ঠা ৪: অন্যান্য ও অফিস স্তর</h3>

            <div className="mb-4">
                <h4 className="font-semibold border-b border-gray-400 pb-1 mb-3">০৪. চাকরিজীবীর ক্ষেত্রে (প্রযোজ্য ক্ষেত্রে):</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" placeholder="কর্মস্থলের নাম" value={data.employee_workplace_name || ''} onChange={e => setData('employee_workplace_name', e.target.value)} className="w-full border rounded px-2 py-1.5 text-[12px]" />
                    <div className="flex gap-2">
                        <input type="number" placeholder="মাসিক বেতন" value={data.employee_monthly_salary || ''} onChange={e => setData('employee_monthly_salary', e.target.value)} className="w-1/2 border rounded px-2 py-1.5 text-[12px]" />
                        <input type="number" placeholder="হাতে প্রাপ্তি" value={data.employee_received_in_hand || ''} onChange={e => setData('employee_received_in_hand', e.target.value)} className="w-1/2 border rounded px-2 py-1.5 text-[12px]" />
                    </div>
                    <input type="number" placeholder="অন্যান্য খাতের আয়" value={data.employee_other_income || ''} onChange={e => setData('employee_other_income', e.target.value)} className="w-full border rounded px-2 py-1.5 text-[12px]" />
                    <div className="flex gap-2">
                        <input type="text" placeholder="অনুমোদনকারীর উপস্থিতির সময়" value={data.employee_approver_presence_time || ''} onChange={e => setData('employee_approver_presence_time', e.target.value)} className="w-1/2 border rounded px-2 py-1.5 text-[12px]" />
                        <input type="text" placeholder="সাথে কে ছিলো" value={data.employee_who_was_with || ''} onChange={e => setData('employee_who_was_with', e.target.value)} className="w-1/2 border rounded px-2 py-1.5 text-[12px]" />
                    </div>
                    <div className="flex gap-2 col-span-1 md:col-span-2">
                        <input type="text" placeholder="যে ব্যাংকে বেতন হয়" value={data.employee_bank_name || ''} onChange={e => setData('employee_bank_name', e.target.value)} className="w-1/2 border rounded px-2 py-1.5 text-[12px]" />
                        <input type="number" placeholder="ব্যাংক স্টেটমেন্ট অনুযায়ী বেতন" value={data.employee_salary_per_statement || ''} onChange={e => setData('employee_salary_per_statement', e.target.value)} className="w-1/2 border rounded px-2 py-1.5 text-[12px]" />
                    </div>
                </div>
            </div>

            <div className="mb-4">
                <h4 className="font-semibold border-b border-gray-400 pb-1 mb-3">০৫. প্রবাসী সদস্যের রেমিটেন্স এর তথ্য (প্রযোজ্য ক্ষেত্রে):</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="number" placeholder="মাসিক আয়" value={data.expatriate_monthly_income || ''} onChange={e => setData('expatriate_monthly_income', e.target.value)} className="w-full border rounded px-2 py-1.5 text-[12px]" />
                    <input type="text" placeholder="যে চ্যানেলে আসে" value={data.expatriate_channel || ''} onChange={e => setData('expatriate_channel', e.target.value)} className="w-full border rounded px-2 py-1.5 text-[12px]" />
                    <input type="text" placeholder="যা দেখে নিশ্চিত হলেন" value={data.expatriate_confirmation_method || ''} onChange={e => setData('expatriate_confirmation_method', e.target.value)} className="w-full border rounded px-2 py-1.5 text-[12px]" />
                    <input type="text" placeholder="যে দেশে থাকে" value={data.expatriate_country || ''} onChange={e => setData('expatriate_country', e.target.value)} className="w-full border rounded px-2 py-1.5 text-[12px]" />
                    <div className="flex gap-2 col-span-1 md:col-span-2">
                        <input type="number" placeholder="কতো বছর ধরে থাকে" value={data.expatriate_years_living || ''} onChange={e => setData('expatriate_years_living', e.target.value)} className="w-1/2 border rounded px-2 py-1.5 text-[12px]" />
                        <input type="text" placeholder="ওয়ার্কপারমিট যাচাই" value={data.expatriate_work_permit_checked || ''} onChange={e => setData('expatriate_work_permit_checked', e.target.value)} className="w-1/2 border rounded px-2 py-1.5 text-[12px]" />
                    </div>
                </div>
            </div>

            <div className="mb-4">
                <h4 className="font-semibold border-b border-gray-400 pb-1 mb-3">০৬. প্রকল্পে পরিবেশ ও আইনগত কোনো জটিলতা আছে কি-না?</h4>
                <div className="flex items-center gap-4 text-[12px]">
                    <label className="flex items-center gap-1"><input type="radio" name="project_environmental" value="হ্যাঁ" checked={data.project_environmental_legal_issues === 'হ্যাঁ'} onChange={() => setData('project_environmental_legal_issues', 'হ্যাঁ')} /> হ্যাঁ</label>
                    <label className="flex items-center gap-1"><input type="radio" name="project_environmental" value="না" checked={data.project_environmental_legal_issues === 'না'} onChange={() => setData('project_environmental_legal_issues', 'না')} /> না</label>
                </div>
            </div>

            <div className="mb-4">
                <h4 className="font-semibold border-b border-gray-400 pb-1 mb-3">০৭. ঝুঁকি প্রতিরোধের উপায় (Risk Coverage Measures):</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border p-2 rounded bg-gray-50">
                        <label className="block text-[11px] mb-2">(ক) দুর্যোগ মোকাবিলার অভিজ্ঞতা:</label>
                        <div className="flex items-center gap-4 text-[12px]">
                            <label className="flex items-center gap-1"><input type="radio" name="risk_disaster" value="আছে" checked={data.risk_disaster_experience === 'আছে'} onChange={() => setData('risk_disaster_experience', 'আছে')} /> আছে</label>
                            <label className="flex items-center gap-1"><input type="radio" name="risk_disaster" value="নাই" checked={data.risk_disaster_experience === 'নাই'} onChange={() => setData('risk_disaster_experience', 'নাই')} /> নাই</label>
                        </div>
                    </div>
                    <div className="border p-2 rounded bg-gray-50">
                        <label className="block text-[11px] mb-2">(খ) বাকিতে বিক্রয়ের পরিমাণ/হার:</label>
                        <div className="flex items-center gap-4 text-[12px]">
                            <label className="flex items-center gap-1"><input type="radio" name="risk_credit" value="আছে" checked={data.risk_credit_sale === 'আছে'} onChange={() => setData('risk_credit_sale', 'আছে')} /> আছে</label>
                            <label className="flex items-center gap-1"><input type="radio" name="risk_credit" value="নাই" checked={data.risk_credit_sale === 'নাই'} onChange={() => setData('risk_credit_sale', 'নাই')} /> নাই</label>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mb-4">
                <h4 className="font-semibold border-b border-gray-400 pb-1 mb-3">০৮. ভবিষ্যতে ক্ষুদ্র উদ্যোগ বিষয়ে পরিকল্পনা</h4>
                <textarea placeholder="পরিকল্পনা লিখুন..." value={data.future_micro_enterprise_plan || ''} onChange={e => setData('future_micro_enterprise_plan', e.target.value)} className="w-full border rounded px-2 py-1.5 text-[12px]" rows={3} />
            </div>

            <div className="mb-4 overflow-x-auto">
                <h4 className="font-semibold border-b border-gray-400 pb-1 mb-3">৯. কর্মসংস্থান সংক্রান্ত তথ্য:</h4>
                <div className="min-w-[600px] border p-2 rounded bg-gray-50">
                    <input type="text" placeholder="ঋণ কার্যক্রমের নাম" value={data.loan_program_name || ''} onChange={e => setData('loan_program_name', e.target.value)} className="w-full border rounded px-2 py-1.5 text-[12px] mb-2" />
                    <div className="grid grid-cols-4 gap-2 text-center text-[11px] font-bold">
                        <div className="col-span-2 border-b border-gray-400">স্ব-কর্মসংস্থান/পারিবারিক</div>
                        <div className="col-span-2 border-b border-gray-400">মজুরি ভিত্তিক</div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center text-[11px] font-bold mb-2">
                        <div>পূর্ণকালীন</div>
                        <div>খণ্ডকালীন</div>
                        <div>পূর্ণকালীন</div>
                        <div>খণ্ডকালীন</div>
                    </div>
                    <div className="grid grid-cols-8 gap-1 mb-2 text-center text-[10px]">
                        <div>মহিলা</div><div>পুরুষ</div>
                        <div>মহিলা</div><div>পুরুষ</div>
                        <div>মহিলা</div><div>পুরুষ</div>
                        <div>মহিলা</div><div>পুরুষ</div>
                    </div>
                    <div className="grid grid-cols-8 gap-1">
                        <input type="number" value={data.self_emp_full_female || ''} onChange={e => setData('self_emp_full_female', e.target.value)} className="w-full border rounded px-1 py-1 text-[11px]" />
                        <input type="number" value={data.self_emp_full_male || ''} onChange={e => setData('self_emp_full_male', e.target.value)} className="w-full border rounded px-1 py-1 text-[11px]" />
                        <input type="number" value={data.self_emp_part_female || ''} onChange={e => setData('self_emp_part_female', e.target.value)} className="w-full border rounded px-1 py-1 text-[11px]" />
                        <input type="number" value={data.self_emp_part_male || ''} onChange={e => setData('self_emp_part_male', e.target.value)} className="w-full border rounded px-1 py-1 text-[11px]" />
                        
                        <input type="number" value={data.wage_emp_full_female || ''} onChange={e => setData('wage_emp_full_female', e.target.value)} className="w-full border rounded px-1 py-1 text-[11px]" />
                        <input type="number" value={data.wage_emp_full_male || ''} onChange={e => setData('wage_emp_full_male', e.target.value)} className="w-full border rounded px-1 py-1 text-[11px]" />
                        <input type="number" value={data.wage_emp_part_female || ''} onChange={e => setData('wage_emp_part_female', e.target.value)} className="w-full border rounded px-1 py-1 text-[11px]" />
                        <input type="number" value={data.wage_emp_part_male || ''} onChange={e => setData('wage_emp_part_male', e.target.value)} className="w-full border rounded px-1 py-1 text-[11px]" />
                    </div>
                </div>
            </div>

            <div className="mb-4">
                <h4 className="font-semibold border-b border-gray-400 pb-1 mb-3">ঘ. সংস্থার অফিস পর্যায়ে পূরণীয় (মন্তব্য ও স্বাক্ষর):</h4>
                
                <div className="space-y-4">
                    <div className="border p-2 rounded bg-gray-50">
                        <label className="block text-[12px] font-medium mb-1">অফিসারের পরিদর্শনোত্তর মন্তব্য</label>
                        <textarea value={data.officer_post_inspection_comments || ''} onChange={(e) => setData('officer_post_inspection_comments', e.target.value)} className="w-full border rounded px-2 py-1.5 text-[12px]" rows={2} />
                        <label className="block text-[12px] font-medium mt-2 mb-1">অফিসারের স্বাক্ষর</label>
                        {data.officer_post_inspection_signature ? (
                            <div className="relative w-32">
                                <img src={data.officer_post_inspection_signature} alt="Signature" className="w-full h-16 object-contain border rounded" />
                                <button onClick={() => removeImage('officer_post_inspection_signature')} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded text-[10px]">X</button>
                            </div>
                        ) : (
                            <div className="border-2 border-dashed rounded p-2 text-center w-32 cursor-pointer relative">
                                <Upload className="w-4 h-4 mx-auto mb-1 text-gray-400" />
                                <input type="file" accept="image/*" onChange={(e) => handleImageUpload('officer_post_inspection_signature', e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                <span className="text-[11px] text-blue-600">Upload</span>
                            </div>
                        )}
                    </div>

                    <div className="border p-2 rounded bg-gray-50">
                        <label className="block text-[12px] font-medium mb-1">শাখা ব্যবস্থাপকের পরিদর্শনোত্তর মন্তব্য</label>
                        <textarea value={data.branch_manager_post_inspection_comments || ''} onChange={(e) => setData('branch_manager_post_inspection_comments', e.target.value)} className="w-full border rounded px-2 py-1.5 text-[12px]" rows={2} />
                        <label className="block text-[12px] font-medium mt-2 mb-1">শাখা ব্যবস্থাপকের স্বাক্ষর</label>
                        {data.branch_manager_post_inspection_signature ? (
                            <div className="relative w-32">
                                <img src={data.branch_manager_post_inspection_signature} alt="Signature" className="w-full h-16 object-contain border rounded" />
                                <button onClick={() => removeImage('branch_manager_post_inspection_signature')} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded text-[10px]">X</button>
                            </div>
                        ) : (
                            <div className="border-2 border-dashed rounded p-2 text-center w-32 cursor-pointer relative">
                                <Upload className="w-4 h-4 mx-auto mb-1 text-gray-400" />
                                <input type="file" accept="image/*" onChange={(e) => handleImageUpload('branch_manager_post_inspection_signature', e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                <span className="text-[11px] text-blue-600">Upload</span>
                            </div>
                        )}
                    </div>

                    <div className="border p-2 rounded bg-gray-50">
                        <label className="block text-[12px] font-medium mb-1">আঞ্চলিক ব্যবস্থাপকের মন্তব্য</label>
                        <textarea value={data.regional_manager_comments || ''} onChange={(e) => setData('regional_manager_comments', e.target.value)} className="w-full border rounded px-2 py-1.5 text-[12px]" rows={2} />
                        <label className="block text-[12px] font-medium mt-2 mb-1">আঞ্চলিক ব্যবস্থাপকের স্বাক্ষর</label>
                        {data.regional_manager_signature ? (
                            <div className="relative w-32">
                                <img src={data.regional_manager_signature} alt="Signature" className="w-full h-16 object-contain border rounded" />
                                <button onClick={() => removeImage('regional_manager_signature')} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded text-[10px]">X</button>
                            </div>
                        ) : (
                            <div className="border-2 border-dashed rounded p-2 text-center w-32 cursor-pointer relative">
                                <Upload className="w-4 h-4 mx-auto mb-1 text-gray-400" />
                                <input type="file" accept="image/*" onChange={(e) => handleImageUpload('regional_manager_signature', e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                <span className="text-[11px] text-blue-600">Upload</span>
                            </div>
                        )}
                    </div>

                    <div className="border p-2 rounded bg-gray-50">
                        <label className="block text-[12px] font-medium mb-1">জোনাল ম্যানেজারের মন্তব্য</label>
                        <textarea value={data.zonal_manager_comments || ''} onChange={(e) => setData('zonal_manager_comments', e.target.value)} className="w-full border rounded px-2 py-1.5 text-[12px]" rows={2} />
                        <label className="block text-[12px] font-medium mt-2 mb-1">জোনাল ম্যানেজারের স্বাক্ষর</label>
                        {data.zonal_manager_signature ? (
                            <div className="relative w-32">
                                <img src={data.zonal_manager_signature} alt="Signature" className="w-full h-16 object-contain border rounded" />
                                <button onClick={() => removeImage('zonal_manager_signature')} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded text-[10px]">X</button>
                            </div>
                        ) : (
                            <div className="border-2 border-dashed rounded p-2 text-center w-32 cursor-pointer relative">
                                <Upload className="w-4 h-4 mx-auto mb-1 text-gray-400" />
                                <input type="file" accept="image/*" onChange={(e) => handleImageUpload('zonal_manager_signature', e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                <span className="text-[11px] text-blue-600">Upload</span>
                            </div>
                        )}
                    </div>

                    <div className="border p-2 rounded bg-gray-50">
                        <label className="block text-[12px] font-medium mb-1">চূড়ান্ত অনুমোদনকারীর মন্তব্য</label>
                        <textarea value={data.final_approver_comments || ''} onChange={(e) => setData('final_approver_comments', e.target.value)} className="w-full border rounded px-2 py-1.5 text-[12px]" rows={2} />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                            <div>
                                <label className="block text-[12px] font-medium mb-1">চূড়ান্ত অনুমোদিত ঋণের পরিমাণ (সংখ্যায়)</label>
                                <input type="number" value={data.final_approved_loan_amount_digits || ''} onChange={(e) => {
                                    const v = e.target.value;
                                    setData('final_approved_loan_amount_digits', v);
                                    const words = numberToWordsBangla(v);
                                    setData('final_approved_loan_amount_words', words ? words + ' টাকা' : '');
                                }} className="w-full border rounded px-2 py-1.5 text-[12px]" />
                            </div>
                            <div>
                                <label className="block text-[12px] font-medium mb-1">চূড়ান্ত অনুমোদিত ঋণের পরিমাণ (কথায়)</label>
                                <input type="text" value={data.final_approved_loan_amount_words || ''} onChange={(e) => setData('final_approved_loan_amount_words', e.target.value)} className="w-full border rounded px-2 py-1.5 text-[12px] bg-gray-100" readOnly />
                            </div>
                        </div>

                        <label className="block text-[12px] font-medium mt-2 mb-1">চূড়ান্ত অনুমোদনকারীর স্বাক্ষর</label>
                        {data.final_approver_signature ? (
                            <div className="relative w-32">
                                <img src={data.final_approver_signature} alt="Signature" className="w-full h-16 object-contain border rounded" />
                                <button onClick={() => removeImage('final_approver_signature')} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded text-[10px]">X</button>
                            </div>
                        ) : (
                            <div className="border-2 border-dashed rounded p-2 text-center w-32 cursor-pointer relative">
                                <Upload className="w-4 h-4 mx-auto mb-1 text-gray-400" />
                                <input type="file" accept="image/*" onChange={(e) => handleImageUpload('final_approver_signature', e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                <span className="text-[11px] text-blue-600">Upload</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
