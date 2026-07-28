import React, { useEffect } from 'react';
import { FormPageProps } from './Types';
import { toLocalDateTimeInput } from './index';
import { Briefcase, Plane, ShieldAlert, Target, Users, CheckCircle2, MessageSquareText } from 'lucide-react';

export default function FormPage4({ data, setData }: FormPageProps) {
    const projectName = data.project_name || data.proposed_project_name || '';
    const hasEmployeeSectionInput = [
        data.employee_workplace_name,
        data.employee_monthly_salary,
        data.employee_received_in_hand,
        data.employee_other_income,
        data.employee_who_was_with,
        data.employee_bank_name,
        data.employee_salary_per_statement,
    ].some((value) => String(value ?? '').trim() !== '');

    const fullTimeTotal =
        (Number(data.self_emp_full_female) || 0) +
        (Number(data.self_emp_full_male) || 0) +
        (Number(data.wage_emp_full_female) || 0) +
        (Number(data.wage_emp_full_male) || 0);

    const partTimeTotal =
        (Number(data.self_emp_part_female) || 0) +
        (Number(data.self_emp_part_male) || 0) +
        (Number(data.wage_emp_part_female) || 0) +
        (Number(data.wage_emp_part_male) || 0);

    // চাকরিজীবী অংশে ইনপুট থাকলে তারিখ-সময় বসবে; সব খালি করলে তারিখ-সময়ও ক্লিয়ার হবে
    useEffect(() => {
        if (hasEmployeeSectionInput && !data.employee_approver_presence_time) {
            setData('employee_approver_presence_time', toLocalDateTimeInput());
        } else if (!hasEmployeeSectionInput && data.employee_approver_presence_time) {
            setData('employee_approver_presence_time', '');
        }
    }, [hasEmployeeSectionInput, data.employee_approver_presence_time, setData]);

    useEffect(() => {
        if (projectName && !data.loan_program_name) {
            setData('loan_program_name', projectName);
        }
    }, [projectName, data.loan_program_name, setData]);

    const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-xs md:text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all';
    const readOnlyClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-xs md:text-sm bg-gray-100/90 text-gray-700 font-medium cursor-not-allowed';
    const textareaClass = 'w-full border border-gray-300 rounded-lg p-3 text-xs md:text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all';

    return (
        <div id="form-page-4" data-sync="page-4" className="space-y-5">
            {/* Header Title */}
            <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-4 py-3 rounded-xl shadow-sm">
                <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    <h3 className="font-bold text-sm md:text-base">পৃষ্ঠা ৪: অন্যান্য বিবরণ ও অফিস অনুমোদন</h3>
                </div>
                <span className="text-[11px] bg-white/20 px-2.5 py-1 rounded-full font-medium">স্টেপ ৪ / ৪</span>
            </div>

            {/* Employee Section */}
            <div className="bg-white p-4 md:p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-gray-800 font-bold text-sm border-b pb-2">
                    <Briefcase className="w-4 h-4 text-indigo-600" />
                    <span>০৪. চাকরিজীবীর ক্ষেত্রে (প্রযোজ্য ক্ষেত্রে)</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">কর্মস্থলের নাম</label>
                        <input type="text" placeholder="কর্মস্থলের নাম" value={data.employee_workplace_name || ''} onChange={e => setData('employee_workplace_name', e.target.value)} className={inputClass} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">মাসিক বেতন</label>
                            <input type="number" placeholder="টাকা" value={data.employee_monthly_salary || ''} onChange={e => setData('employee_monthly_salary', e.target.value)} className={inputClass} />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">হাতে প্রাপ্তি</label>
                            <input type="number" placeholder="টাকা" value={data.employee_received_in_hand || ''} onChange={e => setData('employee_received_in_hand', e.target.value)} className={inputClass} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">অন্যান্য খাতের আয়</label>
                        <input type="number" placeholder="টাকা" value={data.employee_other_income || ''} onChange={e => setData('employee_other_income', e.target.value)} className={inputClass} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">উপস্থিতির তারিখ ও সময়</label>
                            <input
                                type="datetime-local"
                                title="অনুমোদনকারীর উপস্থিতির তারিখ ও সময়"
                                value={data.employee_approver_presence_time ? toLocalDateTimeInput(data.employee_approver_presence_time) : ''}
                                onChange={e => setData('employee_approver_presence_time', e.target.value)}
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">সাথে কে ছিলো</label>
                            <input type="text" placeholder="নাম" value={data.employee_who_was_with || ''} onChange={e => setData('employee_who_was_with', e.target.value)} className={inputClass} />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 col-span-1 md:col-span-2">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">যে ব্যাংকে বেতন হয়</label>
                            <input type="text" placeholder="ব্যাংকের নাম" value={data.employee_bank_name || ''} onChange={e => setData('employee_bank_name', e.target.value)} className={inputClass} />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">স্টেটমেন্ট অনুযায়ী বেতন</label>
                            <input type="number" placeholder="টাকা" value={data.employee_salary_per_statement || ''} onChange={e => setData('employee_salary_per_statement', e.target.value)} className={inputClass} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Expatriate Section */}
            <div className="bg-white p-4 md:p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-gray-800 font-bold text-sm border-b pb-2">
                    <Plane className="w-4 h-4 text-blue-600" />
                    <span>০৫. প্রবাসী সদস্যের রেমিটেন্স এর তথ্য (প্রযোজ্য ক্ষেত্রে)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">মাসিক আয়</label>
                        <input type="number" placeholder="টাকা" value={data.expatriate_monthly_income || ''} onChange={e => setData('expatriate_monthly_income', e.target.value)} className={inputClass} />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">যে চ্যানেলে আসে</label>
                        <input type="text" placeholder="চ্যানেলের নাম" value={data.expatriate_channel || ''} onChange={e => setData('expatriate_channel', e.target.value)} className={inputClass} />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">যা দেখে নিশ্চিত হলেন</label>
                        <input type="text" placeholder="প্রমাণ/ডকুমেন্ট" value={data.expatriate_confirmation_method || ''} onChange={e => setData('expatriate_confirmation_method', e.target.value)} className={inputClass} />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">যে দেশে থাকে</label>
                        <input type="text" placeholder="দেশের নাম" value={data.expatriate_country || ''} onChange={e => setData('expatriate_country', e.target.value)} className={inputClass} />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">কতো বছর ধরে থাকে</label>
                        <input type="number" placeholder="বছর" value={data.expatriate_years_living || ''} onChange={e => setData('expatriate_years_living', e.target.value)} className={inputClass} />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">ওয়ার্কপারমিট যাচাই</label>
                        <input type="text" placeholder="স্ট্যাটাস" value={data.expatriate_work_permit_checked || ''} onChange={e => setData('expatriate_work_permit_checked', e.target.value)} className={inputClass} />
                    </div>
                </div>
            </div>

            {/* Environmental & Risk Coverage */}
            <div className="bg-white p-4 md:p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-gray-800 font-bold text-sm border-b pb-2">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <span>০৬ & ০৭. পরিবেশ, আইনগত ও ঝুঁকি প্রতিরোধ</span>
                </div>

                <div className="space-y-4">
                    <div className="bg-amber-50/40 p-3.5 rounded-xl border border-amber-200">
                        <label className="block text-xs font-bold text-gray-800 mb-2">০৬. প্রকল্পে পরিবেশ ও আইনগত কোনো জটিলতা আছে কি-না?</label>
                        <div className="flex items-center gap-5 text-xs font-semibold text-gray-700">
                            <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" name="project_environmental" value="হ্যাঁ" checked={data.project_environmental_legal_issues === 'হ্যাঁ'} onChange={() => setData('project_environmental_legal_issues', 'হ্যাঁ')} className="text-indigo-600" /> হ্যাঁ</label>
                            <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" name="project_environmental" value="না" checked={data.project_environmental_legal_issues === 'না'} onChange={() => setData('project_environmental_legal_issues', 'না')} className="text-indigo-600" /> না</label>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-50/70 p-3.5 rounded-xl border border-gray-200 space-y-2">
                            <label className="block text-xs font-bold text-gray-800">(ক) দুর্যোগ মোকাবিলার অভিজ্ঞতা</label>
                            <div className="flex items-center gap-5 text-xs font-semibold text-gray-700 pt-1">
                                <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" name="risk_disaster" value="আছে" checked={data.risk_disaster_experience === 'আছে'} onChange={() => setData('risk_disaster_experience', 'আছে')} className="text-indigo-600" /> আছে</label>
                                <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" name="risk_disaster" value="নাই" checked={data.risk_disaster_experience === 'নাই'} onChange={() => setData('risk_disaster_experience', 'নাই')} className="text-indigo-600" /> নাই</label>
                            </div>
                        </div>
                        <div className="bg-gray-50/70 p-3.5 rounded-xl border border-gray-200 space-y-2">
                            <label className="block text-xs font-bold text-gray-800">(খ) বাকিতে বিক্রয়ের পরিমাণ/হার</label>
                            <div className="flex items-center gap-5 text-xs font-semibold text-gray-700 pt-1">
                                <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" name="risk_credit" value="আছে" checked={data.risk_credit_sale === 'আছে'} onChange={() => setData('risk_credit_sale', 'আছে')} className="text-indigo-600" /> আছে</label>
                                <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" name="risk_credit" value="নাই" checked={data.risk_credit_sale === 'নাই'} onChange={() => setData('risk_credit_sale', 'নাই')} className="text-indigo-600" /> নাই</label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Future Plan Textarea */}
            <div className="bg-white p-4 md:p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-gray-800 font-bold text-sm border-b pb-2">
                    <Target className="w-4 h-4 text-purple-600" />
                    <span>০৮. ভবিষ্যতে ক্ষুদ্র উদ্যোগ বিষয়ে পরিকল্পনা</span>
                </div>
                <textarea placeholder="ভবিষ্যতে ক্ষুদ্র উদ্যোগ সম্পর্কে ইউজার বা অফিসারের পরিকল্পনা লিখুন..." value={data.future_micro_enterprise_plan || ''} onChange={e => setData('future_micro_enterprise_plan', e.target.value)} className={textareaClass} rows={3} />
            </div>

            {/* Employment Breakdown Table */}
            <div className="bg-white p-4 md:p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-gray-800 font-bold text-sm border-b pb-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span>০৯. কর্মসংস্থান সংক্রান্ত তথ্যাবলী</span>
                </div>

                <div className="w-full overflow-x-auto border border-gray-300 rounded-xl bg-gray-50/50">
                    <table className="w-full border-collapse text-center text-xs">
                        <thead>
                            <tr className="bg-gray-100 text-gray-800">
                                <th rowSpan={3} className="border border-gray-300 p-2 font-bold min-w-[140px]">ঋণ কার্যক্রমের নাম</th>
                                <th colSpan={2} className="border border-gray-300 p-2 font-bold">স্ব-কর্মসংস্থান/পারিবারিক</th>
                                <th colSpan={2} className="border border-gray-300 p-2 font-bold">মজুরি ভিত্তিক কর্মসংস্থান</th>
                                <th rowSpan={3} className="border border-gray-300 p-2 font-bold bg-indigo-50 min-w-[70px]">মোট পূর্ণ সময়</th>
                                <th rowSpan={3} className="border border-gray-300 p-2 font-bold bg-indigo-50 min-w-[70px]">মোট আংশিক সময়</th>
                            </tr>
                            <tr className="bg-gray-50 text-gray-700">
                                <th className="border border-gray-300 p-1.5 font-semibold">পূর্ণকালীন</th>
                                <th className="border border-gray-300 p-1.5 font-semibold">খণ্ডকালীন</th>
                                <th className="border border-gray-300 p-1.5 font-semibold">পূর্ণকালীন</th>
                                <th className="border border-gray-300 p-1.5 font-semibold">খণ্ডকালীন</th>
                            </tr>
                            <tr className="bg-white text-gray-600 text-[11px]">
                                <th className="border border-gray-300 p-0 font-medium">
                                    <div className="grid grid-cols-2">
                                        <div className="border-r border-gray-300 py-1">মহিলা</div>
                                        <div className="py-1">পুরুষ</div>
                                    </div>
                                </th>
                                <th className="border border-gray-300 p-0 font-medium">
                                    <div className="grid grid-cols-2">
                                        <div className="border-r border-gray-300 py-1">মহিলা</div>
                                        <div className="py-1">পুরুষ</div>
                                    </div>
                                </th>
                                <th className="border border-gray-300 p-0 font-medium">
                                    <div className="grid grid-cols-2">
                                        <div className="border-r border-gray-300 py-1">মহিলা</div>
                                        <div className="py-1">পুরুষ</div>
                                    </div>
                                </th>
                                <th className="border border-gray-300 p-0 font-medium">
                                    <div className="grid grid-cols-2">
                                        <div className="border-r border-gray-300 py-1">মহিলা</div>
                                        <div className="py-1">পুরুষ</div>
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="bg-white">
                                <td className="border border-gray-300 p-1.5">
                                    <input type="text" placeholder="ঋণ কার্যক্রমের নাম" value={data.loan_program_name || ''} onChange={e => setData('loan_program_name', e.target.value)} className="w-full border rounded px-2 py-1 text-xs text-center" />
                                </td>
                                <td className="border border-gray-300 p-0">
                                    <div className="grid grid-cols-2">
                                        <input type="number" value={data.self_emp_full_female || ''} onChange={e => setData('self_emp_full_female', e.target.value)} className="w-full border-0 border-r border-gray-300 rounded-none px-1 py-1.5 text-xs text-center" />
                                        <input type="number" value={data.self_emp_full_male || ''} onChange={e => setData('self_emp_full_male', e.target.value)} className="w-full border-0 rounded-none px-1 py-1.5 text-xs text-center" />
                                    </div>
                                </td>
                                <td className="border border-gray-300 p-0">
                                    <div className="grid grid-cols-2">
                                        <input type="number" value={data.self_emp_part_female || ''} onChange={e => setData('self_emp_part_female', e.target.value)} className="w-full border-0 border-r border-gray-300 rounded-none px-1 py-1.5 text-xs text-center" />
                                        <input type="number" value={data.self_emp_part_male || ''} onChange={e => setData('self_emp_part_male', e.target.value)} className="w-full border-0 rounded-none px-1 py-1.5 text-xs text-center" />
                                    </div>
                                </td>
                                <td className="border border-gray-300 p-0">
                                    <div className="grid grid-cols-2">
                                        <input type="number" value={data.wage_emp_full_female || ''} onChange={e => setData('wage_emp_full_female', e.target.value)} className="w-full border-0 border-r border-gray-300 rounded-none px-1 py-1.5 text-xs text-center" />
                                        <input type="number" value={data.wage_emp_full_male || ''} onChange={e => setData('wage_emp_full_male', e.target.value)} className="w-full border-0 rounded-none px-1 py-1.5 text-xs text-center" />
                                    </div>
                                </td>
                                <td className="border border-gray-300 p-0">
                                    <div className="grid grid-cols-2">
                                        <input type="number" value={data.wage_emp_part_female || ''} onChange={e => setData('wage_emp_part_female', e.target.value)} className="w-full border-0 border-r border-gray-300 rounded-none px-1 py-1.5 text-xs text-center" />
                                        <input type="number" value={data.wage_emp_part_male || ''} onChange={e => setData('wage_emp_part_male', e.target.value)} className="w-full border-0 rounded-none px-1 py-1.5 text-xs text-center" />
                                    </div>
                                </td>
                                <td className="border border-gray-300 p-2 bg-indigo-50/70 font-bold text-indigo-900">{fullTimeTotal || ''}</td>
                                <td className="border border-gray-300 p-2 bg-indigo-50/70 font-bold text-indigo-900">{partTimeTotal || ''}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Office Level Approvals & Comments */}
            <div className="bg-white p-4 md:p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-gray-800 font-bold text-sm border-b pb-2">
                    <MessageSquareText className="w-4 h-4 text-indigo-600" />
                    <span>ঘ. সংস্থার অফিস পর্যায়ে পূরণীয় (মন্তব্য ও অনুমোদন)</span>
                </div>
                
                <div className="space-y-3.5">
                    <p className="text-[11px] text-indigo-700/80 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
                        এই অংশ ফিল্ড অফিসার বা শাখা ব্যবহারকারী পূরণ করবেন না। অনুমোদনের সময় সংশ্লিষ্ট অনুমোদনকারীর মন্তব্য ও অনুমোদিত তথ্য এখানে স্বয়ংক্রিয়ভাবে আসবে।
                    </p>
                    <div className="bg-gray-50/70 p-3.5 rounded-xl border border-gray-200">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">অফিসারের পরিদর্শনোত্তর মন্তব্য</label>
                        <textarea value={data.officer_post_inspection_comments || ''} onChange={(e) => setData('officer_post_inspection_comments', e.target.value)} className={textareaClass} rows={2} placeholder="অফিসারের পরিদর্শনোত্তর মন্তব্য লিখুন..." />
                    </div>

                    <div className="bg-gray-50/70 p-3.5 rounded-xl border border-gray-200">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">শাখা ব্যবস্থাপকের পরিদর্শনোত্তর মন্তব্য</label>
                        <textarea value={data.branch_manager_post_inspection_comments || ''} className={readOnlyClass} rows={2} readOnly placeholder="অনুমোদনের সময় মন্তব্য আসবে..." />
                    </div>

                    <div className="bg-gray-50/70 p-3.5 rounded-xl border border-gray-200">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">আঞ্চলিক ব্যবস্থাপকের মন্তব্য</label>
                        <textarea value={data.regional_manager_comments || ''} className={readOnlyClass} rows={2} readOnly placeholder="অনুমোদনের সময় মন্তব্য আসবে..." />
                    </div>

                    <div className="bg-gray-50/70 p-3.5 rounded-xl border border-gray-200">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">জোনাল ম্যানেজারের মন্তব্য</label>
                        <textarea value={data.zonal_manager_comments || ''} className={readOnlyClass} rows={2} readOnly placeholder="অনুমোদনের সময় মন্তব্য আসবে..." />
                    </div>

                    <div className="bg-indigo-50/40 p-4 rounded-xl border border-indigo-200 space-y-3">
                        <label className="block text-xs font-bold text-indigo-900">চূড়ান্ত অনুমোদনকারীর মন্তব্য ও চূড়ান্ত অনুমোদিত পরিমাণ</label>
                        <p className="text-[11px] text-indigo-700/80 bg-white/60 border border-indigo-100 rounded-lg px-2.5 py-1.5">
                            এই অংশ ফিল্ড অফিসার পূরণ করবেন না। শাখা ব্যবস্থাপক (সিলিং এর মধ্যে) বা উচ্চতর অনুমোদনকারী অনুমোদনের সময় নির্ধারণ করবেন।
                        </p>
                        <textarea
                            value={data.final_approver_comments || ''}
                            className={readOnlyClass}
                            rows={2}
                            readOnly
                            placeholder="অনুমোদনের সময় মন্তব্য আসবে..."
                        />
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">চূড়ান্ত অনুমোদিত ঋণের পরিমাণ (সংখ্যায়)</label>
                                <input
                                    type="number"
                                    value={data.final_approved_loan_amount_digits || ''}
                                    className={readOnlyClass}
                                    readOnly
                                    placeholder="অনুমোদনের সময় নির্ধারিত হবে"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">চূড়ান্ত অনুমোদিত ঋণের পরিমাণ (কথায়)</label>
                                <input type="text" value={data.final_approved_loan_amount_words || ''} className={readOnlyClass} readOnly placeholder="কথায় অটো আসবে" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

