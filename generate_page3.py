import sys
import re

path_print = 'c:/Code/MisLoan/resources/js/pages/Member/LoanApplications/Forms/LoanApplicationApprovalPrint.tsx'
with open(path_print, 'r', encoding='utf-8') as f:
    content_print = f.read()

page3_code = '''
function renderPage3(d: any) {
    const fmt = formatDateBangla;
    
    // Calculations for Income/Expense
    const exp_emp = Number(d.est_emp_salary) || 0;
    const exp_trans = Number(d.est_transport) || 0;
    const exp_bills = Number(d.est_bills) || 0;
    const exp_rent = Number(d.est_rent) || 0;
    const exp_loan = Number(d.est_loan_charge) || 0;
    const exp_o1 = Number(d.est_other_exp_1_amount) || 0;
    const exp_o2 = Number(d.est_other_exp_2_amount) || 0;
    const exp_o3 = Number(d.est_other_exp_3_amount) || 0;
    const total_exp = exp_emp + exp_trans + exp_bills + exp_rent + exp_loan + exp_o1 + exp_o2 + exp_o3;
    
    const inc_main = Number(d.est_main_income_amount) || 0;
    const inc_other = Number(d.est_other_income_amount) || 0;
    const total_inc = inc_main + inc_other;
    
    const net_profit = total_inc - total_exp;
    const exp_percent = total_inc > 0 ? ((total_exp / total_inc) * 100).toFixed(2) : '0.00';
    const profit_percent = total_inc > 0 ? ((net_profit / total_inc) * 100).toFixed(2) : '0.00';

    const inst_prin = Number(d.installment_principal) || 0;
    const inst_sc = Number(d.installment_service_charge) || 0;
    const inst_total = inst_prin + inst_sc;
    const loan_dur = Number(d.loan_duration_months) || 0;
    const total_payable = inst_total * loan_dur;

    return (
        <div className="bg-white p-4 print:p-0 print:border-none text-[12px] print:text-[11px] print:leading-tight" style={{ pageBreakAfter: 'always' }}>
            <div className="mb-2">
                <h3 className="font-bold mb-1 text-[13px]">০৪. উদ্যোগের ১/১.৫/২ বছর এর সম্ভাব্য আয়-ব্যয় হিসাব:</h3>
                <table className="w-full border-collapse border border-gray-600 mb-1 text-center align-middle">
                    <thead>
                        <tr>
                            <th className="border border-gray-600 p-1 font-semibold w-[35%]">ব্যয়</th>
                            <th className="border border-gray-600 p-1 font-semibold w-[15%]">টাকার পরিমাণ</th>
                            <th className="border border-gray-600 p-1 font-semibold w-[35%]">আয়</th>
                            <th className="border border-gray-600 p-1 font-semibold w-[15%]">টাকার পরিমাণ</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="border border-gray-600 p-1 text-left">
                                উদ্যোগ পরিচালনা ব্যয়:<br/>
                                (ক) কর্মচারীর বেতন ভাতা বাবদ<br/>
                                (খ) পরিবহন বাবদ<br/>
                                (গ) বিভিন্ন বিল বাবদ<br/>
                                (ঘ) ঘর/স্থাপনা ভাড়া বাবদ<br/>
                                (ঙ) ঋণের সার্ভিস চার্জ বাবদ<br/>
                                (চ) {d.est_other_exp_1_name || '.............................................'}<br/>
                                (ছ) {d.est_other_exp_2_name || '.............................................'}<br/>
                                (জ) {d.est_other_exp_3_name || '.............................................'}
                            </td>
                            <td className="border border-gray-600 p-1 align-top pt-5">
                                {d.est_emp_salary || ''}<br/>
                                {d.est_transport || ''}<br/>
                                {d.est_bills || ''}<br/>
                                {d.est_rent || ''}<br/>
                                {d.est_loan_charge || ''}<br/>
                                {d.est_other_exp_1_amount || ''}<br/>
                                {d.est_other_exp_2_amount || ''}<br/>
                                {d.est_other_exp_3_amount || ''}
                            </td>
                            <td className="border border-gray-600 p-1 text-left align-top">
                                উদ্যোগের মূল আয়<br/>
                                (মূল আয়ের খাত উল্লেখ করতে হবে)<br/>
                                <div className="mt-2 text-center underline font-semibold">{d.est_main_income_source || ''}</div>
                                <div className="mt-6 border-t border-gray-600 pt-1">
                                    অন্যান্য আয় (খাত উল্লেখ করতে হবে)<br/>
                                    <div className="mt-1 text-center underline font-semibold">{d.est_other_income_source || ''}</div>
                                </div>
                            </td>
                            <td className="border border-gray-600 p-1 align-top">
                                <br/><br/><br/>{d.est_main_income_amount || ''}
                                <br/><br/><br/><br/>{d.est_other_income_amount || ''}
                            </td>
                        </tr>
                        <tr>
                            <td className="border border-gray-600 p-1 text-left">মোট ব্যয়:</td>
                            <td className="border border-gray-600 p-1">{total_exp || ''}</td>
                            <td className="border border-gray-600 p-1 border-b-0 bg-gray-100"></td>
                            <td className="border border-gray-600 p-1 border-b-0 bg-gray-100"></td>
                        </tr>
                        <tr>
                            <td className="border border-gray-600 p-1 text-left">নিট লাভ/উদ্বৃত্ত</td>
                            <td className="border border-gray-600 p-1">{net_profit || ''}</td>
                            <td className="border border-gray-600 p-1 text-center font-bold">মোট</td>
                            <td className="border border-gray-600 p-1 font-bold">{total_inc || ''}</td>
                        </tr>
                        <tr>
                            <td className="border border-gray-600 p-1 text-center font-bold">মোট</td>
                            <td className="border border-gray-600 p-1 font-bold">{total_exp + net_profit || ''}</td>
                            <td className="border border-gray-600 p-1 bg-gray-100"></td>
                            <td className="border border-gray-600 p-1 bg-gray-100"></td>
                        </tr>
                    </tbody>
                </table>
                <div className="text-[12px] print:text-[11px] mb-2 leading-relaxed">
                    উদ্যোগের মোট আয়ের <span className="underline px-2 font-bold">{exp_percent}</span>% ব্যয় হবে [(মোট ব্যয় ÷ মোট আয়) ১০০%]<br/>
                    উদ্যোগের মোট আয়ের <span className="underline px-2 font-bold">{profit_percent}</span>% নিট লাভ থাকবে [(নিট লাভ ÷ মোট আয়) ১০০%]
                </div>
            </div>

            <div className="mb-2">
                <div className="inline-block border border-gray-600 px-3 py-1 font-bold mb-1 bg-gray-100">গ. অন্যান্য তথ্যাবলী:</div>
                <div className="flex justify-between mb-1">
                    <span>০১. (ক) ঋণের মেয়াদ...<span className="underline font-bold px-2">{d.loan_duration_months || ''} মাস</span>...</span>
                    <span>(খ) আরোপিত ঋণের সার্ভিস চার্জের হার (%)...<span className="underline font-bold px-2">{d.applied_service_charge_rate || ''}%</span>...</span>
                    <span>(গ) ঋণ পরিশোধের তফসিল:</span>
                </div>
                <table className="w-full border-collapse border border-gray-600 mb-2 text-center align-middle">
                    <thead>
                        <tr>
                            <th className="border border-gray-600 p-1 font-semibold">কিস্তির ধরণ</th>
                            <th className="border border-gray-600 p-1 font-semibold">আসল (টাকা)</th>
                            <th className="border border-gray-600 p-1 font-semibold">সার্ভিস চার্জ (টাকা)</th>
                            <th className="border border-gray-600 p-1 font-semibold">মোট (টাকা)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="border border-gray-600 p-1">{d.installment_type || 'মাসিক কিস্তি'}</td>
                            <td className="border border-gray-600 p-1">{d.installment_principal || ''}</td>
                            <td className="border border-gray-600 p-1">{d.installment_service_charge || ''}</td>
                            <td className="border border-gray-600 p-1">{inst_total || ''}</td>
                        </tr>
                        <tr>
                            <td className="border border-gray-600 p-1 text-left pl-2" colSpan={3}>মোট পরিশোধের পরিমাণ</td>
                            <td className="border border-gray-600 p-1 font-bold">{total_payable || ''}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="mb-2">
                <div className="flex justify-between font-bold mb-1">
                    <span>০২. জামিনদারের তথ্য: (ক) ১ম জামিনদার</span>
                    <span className="w-1/2 pl-2">(খ) ২য় জামিনদার</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div className="border border-dotted border-gray-600 p-2 leading-loose">
                        জামিনদারের নাম: {d.guarantor_1_name || '...........................................'}<br/>
                        ঠিকানা: {d.guarantor_1_address || '......................................................'}<br/>
                        মোবাইল নম্বর: {d.guarantor_1_mobile || '............................................'}<br/>
                        ঋণীর সাথে সম্পর্ক: {d.guarantor_1_relation || '....................'} পেশা: {d.guarantor_1_profession || '......................'}<br/>
                        মাসিক আয়: {d.guarantor_1_monthly_income || '.............'} জামিনদারের সম্পদের পরিমাণ: {d.guarantor_1_assets_amount || '.............'}<br/>
                        সম্ভাব্য মূল্য: {d.guarantor_1_potential_value || '............................................'}<br/>
                        সাক্ষাৎকারীর নাম: {d.guarantor_1_interviewer_name || '.....................'} পদবী: {d.guarantor_1_interviewer_designation || 'বিএম/আরএম/জেডএম'}
                    </div>
                    <div className="border border-dotted border-gray-600 p-2 leading-loose">
                        জামিনদারের নাম: {d.guarantor_2_name || '...........................................'}<br/>
                        ঠিকানা: {d.guarantor_2_address || '......................................................'}<br/>
                        মোবাইল নম্বর: {d.guarantor_2_mobile || '............................................'}<br/>
                        ঋণীর সাথে সম্পর্ক: {d.guarantor_2_relation || '....................'} পেশা: {d.guarantor_2_profession || '......................'}<br/>
                        মাসিক আয়: {d.guarantor_2_monthly_income || '.............'} জামিনদারের সম্পদের পরিমাণ: {d.guarantor_2_assets_amount || '.............'}<br/>
                        সম্ভাব্য মূল্য: {d.guarantor_2_potential_value || '............................................'}<br/>
                        সাক্ষাৎকারীর নাম: {d.guarantor_2_interviewer_name || '.....................'} পদবী: {d.guarantor_2_interviewer_designation || 'বিএম/আরএম/জেডএম'}
                    </div>
                </div>
            </div>

            <div className="mb-0">
                <div className="flex justify-between font-bold mb-1">
                    <span>০৩. ঋণী ও জামিনদার সম্পর্কে তথ্য প্রদানকারী: (ক) ১ম জন</span>
                    <span className="w-1/2 pl-2">(খ) ২য় জন</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div className="border border-dotted border-gray-600 p-2 leading-loose">
                        তথ্য প্রদানকারীর নাম: {d.informant_1_name || '..........................................'}<br/>
                        ঠিকানা: {d.informant_1_address || '......................................................'}<br/>
                        মোবাইল নম্বর: {d.informant_1_mobile || '............................................'}<br/>
                        ঋণীর সাথে সম্পর্ক: {d.informant_1_relation || '....................'} পেশা: {d.informant_1_profession || '......................'}<br/>
                        ঋণ সংক্রান্ত তথ্য: {d.informant_1_loan_info || '............................................'}<br/>
                        সম্পদ সংক্রান্ত তথ্য: {d.informant_1_asset_info || '.........................................'}<br/>
                        তথ্য প্রদানকারীর সার্বিক মন্তব্য: {d.informant_1_overall_comment || '..................................'}
                    </div>
                    <div className="border border-dotted border-gray-600 p-2 leading-loose">
                        তথ্য প্রদানকারীর নাম: {d.informant_2_name || '..........................................'}<br/>
                        ঠিকানা: {d.informant_2_address || '......................................................'}<br/>
                        মোবাইল নম্বর: {d.informant_2_mobile || '............................................'}<br/>
                        ঋণীর সাথে সম্পর্ক: {d.informant_2_relation || '....................'} পেশা: {d.informant_2_profession || '......................'}<br/>
                        ঋণ সংক্রান্ত তথ্য: {d.informant_2_loan_info || '............................................'}<br/>
                        সম্পদ সংক্রান্ত তথ্য: {d.informant_2_asset_info || '.........................................'}<br/>
                        তথ্য প্রদানকারীর সার্বিক মন্তব্য: {d.informant_2_overall_comment || '..................................'}
                    </div>
                </div>
            </div>
        </div>
    );
}
'''

new_content = re.sub(r'function renderPage3.*?return\s*\(.*?\);\s*\}', page3_code, content_print, flags=re.DOTALL)

with open(path_print, 'w', encoding='utf-8') as f:
    f.write(new_content)
    
print("Page 3 regenerated successfully in Print file")
