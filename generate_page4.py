import sys
import re

path = 'c:/Code/MisLoan/resources/js/pages/Member/LoanApplications/Forms/LoanApplicationApprovalPrint.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

page4_code = '''function renderPage4(d: any) {
    return (
        <div className="bg-white p-4 print:p-0 text-[12px] print:text-[11px] print:leading-tight">
            <div className="mb-2">
                <div className="font-bold mb-1">০৪. চাকরিজীবীর ক্ষেত্রে (প্রযোজ্য ক্ষেত্রে): <span className="font-normal border-b border-dotted border-gray-600 inline-block min-w-[150px]">{d.employee_workplace_name || ''}</span> মাসিক বেতন: <span className="font-normal border-b border-dotted border-gray-600 inline-block min-w-[100px]">{d.employee_monthly_salary ? fmt(d.employee_monthly_salary) : ''}</span> হাতে প্রাপ্তি: <span className="font-normal border-b border-dotted border-gray-600 inline-block min-w-[100px]">{d.employee_received_in_hand ? fmt(d.employee_received_in_hand) : ''}</span></div>
                <div className="mb-1">অন্যান্য খাতের আয়: <span className="border-b border-dotted border-gray-600 inline-block min-w-[100px]">{d.employee_other_income ? fmt(d.employee_other_income) : ''}</span> কর্মস্থলে ঋণ অনুমোদনকারীর উপস্থিতির তারিখ ও সময়: <span className="border-b border-dotted border-gray-600 inline-block min-w-[150px]">{d.employee_approver_presence_time || ''}</span> সাথে কে ছিলো: <span className="border-b border-dotted border-gray-600 inline-block min-w-[100px]">{d.employee_who_was_with || ''}</span></div>
                <div className="mb-1">যে ব্যাংকে বেতন হয়: <span className="border-b border-dotted border-gray-600 inline-block min-w-[150px]">{d.employee_bank_name || ''}</span> ব্যাংক স্টেটমেন্ট যাচাই অনুযায়ী হাতে বেতন পাওয়ার পরিমাণ: <span className="border-b border-dotted border-gray-600 inline-block min-w-[100px]">{d.employee_salary_per_statement ? fmt(d.employee_salary_per_statement) : ''}</span></div>
            </div>

            <div className="mb-2">
                <div className="font-bold mb-1">০৫. প্রবাসী সদস্যের রেমিটেন্স এর তথ্য (প্রযোজ্য ক্ষেত্রে): <span className="font-normal">মাসিক আয়:</span> <span className="font-normal border-b border-dotted border-gray-600 inline-block min-w-[150px]">{d.expatriate_monthly_income ? fmt(d.expatriate_monthly_income) : ''}</span> যে চ্যানেলে আসে: <span className="font-normal border-b border-dotted border-gray-600 inline-block min-w-[100px]">{d.expatriate_channel || ''}</span></div>
                <div className="mb-1">যা দেখে নিশ্চিত হলেন: <span className="border-b border-dotted border-gray-600 inline-block min-w-[150px]">{d.expatriate_confirmation_method || ''}</span> প্রবাসী সদস্য যে দেশে থাকে: <span className="border-b border-dotted border-gray-600 inline-block min-w-[100px]">{d.expatriate_country || ''}</span> কতো বছর ধরে থাকে: <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px]">{d.expatriate_years_living ? fmt(d.expatriate_years_living) : ''}</span> ওয়ার্কপারমিট যাচাই: <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px]">{d.expatriate_work_permit_checked || ''}</span></div>
            </div>

            <div className="mb-2">
                <span className="font-bold">০৬. প্রকল্পে পরিবেশ ও আইনগত কোনো জটিলতা আছে কি-না? (টিক চিহ্ন দিন)</span> <span className="ml-4">(ক) হ্যাঁ</span> {d.project_environmental_legal_issues === 'হ্যাঁ' ? '✓' : ''} <span className="ml-4">(খ) না</span> {d.project_environmental_legal_issues === 'না' ? '✓' : ''}
            </div>

            <div className="mb-2">
                <div className="font-bold">০৭. ঝুঁকি প্রতিরোধের উপায় (Risk Coverage Measures) লিখুন:-</div>
                <div className="ml-4">
                    (ক) প্রযোজ্য ক্ষেত্রে দুর্যোগ মোকাবিলার অভিজ্ঞতা: (i) আছে {d.risk_disaster_experience === 'আছে' ? '✓' : ''} (ii) নাই {d.risk_disaster_experience === 'নাই' ? '✓' : ''} &nbsp;&nbsp;&nbsp;
                    (খ) প্রযোজ্য ক্ষেত্রে বাকিতে বিক্রয়ের পরিমাণ/হার: (i) আছে {d.risk_credit_sale === 'আছে' ? '✓' : ''} (ii) নাই {d.risk_credit_sale === 'নাই' ? '✓' : ''}
                </div>
            </div>

            <div className="mb-2">
                <span className="font-bold">০৮. ভবিষ্যতে ক্ষুদ্র উদ্যোগ বিষয়ে কি ধরণের পরিকল্পনা রয়েছে?</span> <span className="border-b border-dotted border-gray-600 inline-block min-w-[300px]">{d.future_micro_enterprise_plan || ''}</span>
            </div>

            <div className="mb-4 mt-4">
                <div className="font-bold mb-1">৯. কর্মসংস্থান সংক্রান্ত তথ্য:</div>
                <table className="w-full border-collapse border border-black text-center text-[10px]">
                    <thead>
                        <tr>
                            <th rowSpan={3} className="border border-black font-normal p-1">ঋণ কার্যক্রমের নাম</th>
                            <th colSpan={2} className="border border-black font-normal p-1">স্ব-কর্মসংস্থান/পারিবারিক কর্মসংস্থান</th>
                            <th colSpan={2} className="border border-black font-normal p-1">মজুরি ভিত্তিক কর্মসংস্থান</th>
                            <th colSpan={2} className="border border-black font-normal p-1">মোট</th>
                        </tr>
                        <tr>
                            <th className="border border-black font-normal p-1">পূর্ণকালীন</th>
                            <th className="border border-black font-normal p-1">খণ্ডকালীন</th>
                            <th className="border border-black font-normal p-1">পূর্ণকালীন</th>
                            <th className="border border-black font-normal p-1">খণ্ডকালীন</th>
                            <th rowSpan={2} className="border border-black font-normal p-1 whitespace-nowrap">পূর্ণ সময়<br/>৯ = ১+২+৫+৬</th>
                            <th rowSpan={2} className="border border-black font-normal p-1 whitespace-nowrap">আংশিক সময়<br/>১০ = ৩+৪+৭+৮</th>
                        </tr>
                        <tr>
                            <th className="border border-black p-0 font-normal"><div className="flex"><div className="w-1/2 border-r border-black py-0.5">মহিলা</div><div className="w-1/2 py-0.5">পুরুষ</div></div></th>
                            <th className="border border-black p-0 font-normal"><div className="flex"><div className="w-1/2 border-r border-black py-0.5">মহিলা</div><div className="w-1/2 py-0.5">পুরুষ</div></div></th>
                            <th className="border border-black p-0 font-normal"><div className="flex"><div className="w-1/2 border-r border-black py-0.5">মহিলা</div><div className="w-1/2 py-0.5">পুরুষ</div></div></th>
                            <th className="border border-black p-0 font-normal"><div className="flex"><div className="w-1/2 border-r border-black py-0.5">মহিলা</div><div className="w-1/2 py-0.5">পুরুষ</div></div></th>
                        </tr>
                        <tr>
                            <td className="border border-black bg-gray-100 p-0 text-[10px]"></td>
                            <td className="border border-black bg-gray-100 p-0 text-[10px]"><div className="flex"><div className="w-1/2 border-r border-black py-0.5">১</div><div className="w-1/2 py-0.5">২</div></div></td>
                            <td className="border border-black bg-gray-100 p-0 text-[10px]"><div className="flex"><div className="w-1/2 border-r border-black py-0.5">৩</div><div className="w-1/2 py-0.5">৪</div></div></td>
                            <td className="border border-black bg-gray-100 p-0 text-[10px]"><div className="flex"><div className="w-1/2 border-r border-black py-0.5">৫</div><div className="w-1/2 py-0.5">৬</div></div></td>
                            <td className="border border-black bg-gray-100 p-0 text-[10px]"><div className="flex"><div className="w-1/2 border-r border-black py-0.5">৭</div><div className="w-1/2 py-0.5">৮</div></div></td>
                            <td className="border border-black bg-gray-100 p-0 text-[10px]"></td>
                            <td className="border border-black bg-gray-100 p-0 text-[10px]"></td>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="border border-black p-1">{d.loan_program_name || ''}</td>
                            <td className="border border-black p-0"><div className="flex h-full min-h-[20px]"><div className="w-1/2 border-r border-black py-1">{fmt(d.self_emp_full_female)}</div><div className="w-1/2 py-1">{fmt(d.self_emp_full_male)}</div></div></td>
                            <td className="border border-black p-0"><div className="flex h-full min-h-[20px]"><div className="w-1/2 border-r border-black py-1">{fmt(d.self_emp_part_female)}</div><div className="w-1/2 py-1">{fmt(d.self_emp_part_male)}</div></div></td>
                            <td className="border border-black p-0"><div className="flex h-full min-h-[20px]"><div className="w-1/2 border-r border-black py-1">{fmt(d.wage_emp_full_female)}</div><div className="w-1/2 py-1">{fmt(d.wage_emp_full_male)}</div></div></td>
                            <td className="border border-black p-0"><div className="flex h-full min-h-[20px]"><div className="w-1/2 border-r border-black py-1">{fmt(d.wage_emp_part_female)}</div><div className="w-1/2 py-1">{fmt(d.wage_emp_part_male)}</div></div></td>
                            <td className="border border-black p-1">{ fmt((Number(d.self_emp_full_female||0) + Number(d.self_emp_full_male||0) + Number(d.wage_emp_full_female||0) + Number(d.wage_emp_full_male||0))) }</td>
                            <td className="border border-black p-1">{ fmt((Number(d.self_emp_part_female||0) + Number(d.self_emp_part_male||0) + Number(d.wage_emp_part_female||0) + Number(d.wage_emp_part_male||0))) }</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="flex justify-between items-end mt-12 mb-6 px-4">
                <div className="text-center relative">
                    {d.member?.signature_image_url && <img src={d.member.signature_image_url} alt="Signature" className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-10 object-contain" />}
                    <div className="border-t border-dotted border-gray-600 min-w-[150px] pt-1 text-[11px]">সদস্যের স্বাক্ষর:</div>
                    <div className="mt-1 flex items-center justify-center gap-1">
                        <span className="text-[11px]">সদস্যের মোবাইল নং</span>
                        <div className="flex border border-gray-600">
                            {String(d.member?.mobile_number || '').padEnd(11, ' ').slice(0, 11).split('').map((char, i) => (
                                <div key={i} className={w-4 h-5 flex items-center justify-center text-[10px] }>{char.trim()}</div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="text-center relative">
                    <div className="border-t border-dotted border-gray-600 min-w-[200px] pt-1 text-[11px]">প্রোফাইল পূরণকারীর স্বাক্ষর ও সিল:</div>
                </div>
            </div>

            <div className="border border-black mb-6 w-full md:w-3/4 mx-auto md:mx-0 print:w-[85%] print:mx-auto">
                <div className="text-center font-bold border-b border-black py-1">ঘ. সংস্থার অফিস পর্যায়ে পূরণীয়:</div>
                
                <div className="border-b border-black p-2 min-h-[50px] relative">
                    <div className="font-bold text-[11px]">(ক) অফিসারের পরিদর্শনোত্তর মন্তব্য, স্বাক্ষর ও সিল:</div>
                    <div className="mt-1 text-[11px]">{d.officer_post_inspection_comments || ''}</div>
                    {d.officer_post_inspection_signature && <img src={d.officer_post_inspection_signature} alt="Signature" className="absolute bottom-1 right-1 w-20 h-10 object-contain" />}
                </div>
                
                <div className="border-b border-black p-2 min-h-[50px] relative">
                    <div className="font-bold text-[11px]">(খ) শাখা ব্যবস্থাপকের পরিদর্শনোত্তর মন্তব্য, স্বাক্ষর ও সিল:</div>
                    <div className="mt-1 text-[11px]">{d.branch_manager_post_inspection_comments || ''}</div>
                    {d.branch_manager_post_inspection_signature && <img src={d.branch_manager_post_inspection_signature} alt="Signature" className="absolute bottom-1 right-1 w-20 h-10 object-contain" />}
                </div>

                <div className="border-b border-black p-2 min-h-[50px] relative">
                    <div className="font-bold text-[11px]">(গ) আঞ্চলিক ব্যবস্থাপকের পরিদর্শনোত্তর মন্তব্য, স্বাক্ষর ও সিল:</div>
                    <div className="mt-1 text-[11px]">{d.regional_manager_comments || ''}</div>
                    {d.regional_manager_signature && <img src={d.regional_manager_signature} alt="Signature" className="absolute bottom-1 right-1 w-20 h-10 object-contain" />}
                </div>

                <div className="border-b border-black p-2 min-h-[50px] relative">
                    <div className="font-bold text-[11px]">(ঘ) জোনাল ম্যানেজারের পরিদর্শনোত্তর মন্তব্য, স্বাক্ষর ও সিল:</div>
                    <div className="mt-1 text-[11px]">{d.zonal_manager_comments || ''}</div>
                    {d.zonal_manager_signature && <img src={d.zonal_manager_signature} alt="Signature" className="absolute bottom-1 right-1 w-20 h-10 object-contain" />}
                </div>

                <div className="p-2 min-h-[70px]">
                    <div className="font-bold text-[11px]">(ঙ) সংস্থার চূড়ান্ত অনুমোদনকারীর মন্তব্য ও অনুমোদিত ঋণের বিবরণ:</div>
                    <div className="mt-1 border-b border-dotted border-gray-600 min-h-[20px] text-[11px]">{d.final_approver_comments || ''}</div>
                </div>
            </div>

            <div className="flex justify-between items-end mt-4 px-2 print:mt-10">
                <div>
                    <span className="font-bold">টাকা:</span> <span className="border-b border-dotted border-gray-600 inline-block min-w-[120px] font-bold">{d.final_approved_loan_amount_digits ? fmt(d.final_approved_loan_amount_digits) + '/-' : ''}</span>
                    <span className="font-bold ml-4">কথায়:</span> <span className="border-b border-dotted border-gray-600 inline-block min-w-[200px] font-bold">{d.final_approved_loan_amount_words || ''}</span>
                </div>
                <div className="text-center relative">
                    {d.final_approver_signature && <img src={d.final_approver_signature} alt="Signature" className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-10 object-contain" />}
                    <div className="border-t border-dotted border-gray-600 min-w-[200px] pt-1 text-[11px]">চূড়ান্ত অনুমোদনকারীর স্বাক্ষর ও সিল:</div>
                </div>
            </div>
        </div>
    );
}'''

new_content = re.sub(r'function renderPage4\(d: any\) \{.*\}', page4_code, content, flags=re.DOTALL)

with open(path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Page 4 successfully generated!")
