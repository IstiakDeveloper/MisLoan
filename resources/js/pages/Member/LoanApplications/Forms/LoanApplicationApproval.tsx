import { useEffect, useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Save, Printer, Eye, Upload, X, ArrowLeft } from 'lucide-react';
import GeneralSavingsSection, { getRequiredSavingsPercent } from '@/components/LoanApplications/GeneralSavingsSection';

interface LoanApplicationApprovalData {
    [key: string]: any;
}

interface Props {
    member: any;
    loanProduct: any;
    loanCategory: any;
    requestedAmount: number;
    branch?: any;
    existingApplication?: any;
    savedData?: LoanApplicationApprovalData;
    onlyPreview?: boolean;
    savingsProducts?: Array<{ id: number; product_code: string; product_name: string; product_name_bn: string | null }>;
    loanRound?: number;
    isLegacy?: boolean;
}

const formatDateBangla = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
};

const dofaLabel = (round: number | undefined): string => {
    if (round == null || round < 1) return '১ম দফা';
    const labels: Record<number, string> = { 1: '১ম দফা', 2: '২য় দফা', 3: '৩য় দফা', 4: '৪র্থ দফা', 5: '৫ম দফা', 6: '৬ষ্ঠ দফা', 7: '৭ম দফা', 8: '৮ম দফা', 9: '৯ম দফা', 10: '১০ম দফা' };
    return labels[round] || `${round}তম দফা`;
};

const toInputDate = (value: string | null | undefined): string => {
    if (value == null || value === '') return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

/** Render Page 1 - Complete first page */
function renderPage1(d: any, branch?: any, categoryName?: string) {
    const cat = categoryName || d.category_name || 'ঋণ';
    const fmt = formatDateBangla;
    const nidDigits = (d.nid_smart_card || '').replace(/\D/g, '').slice(0, 17).split('');
    return (
        <div className="bg-white border border-gray-300 p-4 print:p-2" style={{ fontSize: '11px', pageBreakAfter: 'always' }}>
            <div className="flex flex-col items-center justify-center mb-2 border-b-2 border-gray-400 pb-2">
                <div className="flex items-center gap-3 mb-1">
                    <img src="/logo.png" alt="Logo" className="h-16 w-16 object-contain print:h-14 print:w-14" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    <div className="text-center">
                        <h1 className="text-lg font-bold leading-tight print:text-base">মৌসুমী</h1>
                        <p className="text-xs leading-tight print:text-[10px]">{branch?.address || d.branch_address || 'উকিলপাড়া, নওগাঁ।'}</p>
                    </div>
                </div>
            </div>
            <div className="text-center mb-3 rounded-lg border-2 border-gray-600 p-2">
                <h2 className="text-base font-bold print:text-sm">({cat} ঋণ আবেদন ও অনুমোদনপত্র)</h2>
            </div>
            <div className="mb-2 grid grid-cols-4 gap-2" style={{ fontSize: '10px' }}>
                <div><span>আবেদনের তারিখ:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[90px] ml-1">{fmt(d.application_date)}</span></div>
                <div><span>ঋণ অনুমোদনের তারিখ:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[90px] ml-1">{fmt(d.loan_approval_date)}</span></div>
                <div><span>ঋণ বিতরণের তারিখ:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[90px] ml-1">{fmt(d.loan_disbursement_date)}</span></div>
                <div><span>ঋণ পরিশোধের তারিখ:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[90px] ml-1">{fmt(d.loan_repayment_date)}</span></div>
            </div>
            <div className="mb-2" style={{ fontSize: '10px' }}>
                <span>বরাবর,</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[120px] mx-1 align-bottom">{d.recipient_to || ''}</span>
                <span className="ml-2">মাধ্যম: যথাযথ কর্তৃপক্ষ।</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[120px] mx-1 align-bottom">{d.authority_medium || ''}</span>
            </div>
            <div className="mb-3 text-xs leading-relaxed">
                <p>
                    জনাব,<br />
                    আমি নিম্নস্বাক্ষরকারী অত্র সংস্থার আওতাধীন <span className="border-b border-dotted border-gray-600 inline-block min-w-[100px] align-bottom">{d.committee_name || ''}</span> সমিতির (সমিতি কোড <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] align-bottom">{d.committee_code || ''}</span>) একজন {(d.member_type === 'old' ? 'পুরাতন' : 'নতুন')} সদস্য।{d.member_type === 'old' ? ` আমি গত ${d.years_involved || '......'} বছর যাবৎ ${cat} কার্যক্রমের সাথে সম্পৃক্ত।` : ''} বর্তমানে আমার ব্যবসা পরিচালনা ও পরিধি বৃদ্ধির লক্ষ্যে {cat} কর্মসূচির আওতায় ঋণ গ্রহণ করতে ইচ্ছুক। এমতাবস্থায় ঋণ গ্রহণার্থে আমার প্রয়োজনীয় তথ্যাবলি নিম্নে প্রদান করলাম:
                </p>
            </div>
            <div className="mb-1" style={{ fontSize: '10px' }}>
                <span>১. আবেদনকারীর নাম:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[140px] mx-1 align-bottom">{d.member_name_detail || d.applicant_name_bn || d.member_name || ''}</span>
                <span className="ml-2">সদস্য কোড:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] mx-1 align-bottom">{d.member_code || ''}</span>
                <span className="ml-2">বয়স:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[40px] mx-1 align-bottom">{d.age ?? ''}</span> বছর।
            </div>
            <div className="mb-1" style={{ fontSize: '10px' }}>
                <span>২. পিতা/স্বামীর নাম:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[200px] ml-1 align-bottom">{d.father_husband_name || ''}</span>
            </div>
            <div className="mb-1" style={{ fontSize: '10px' }}>
                <span>৩. ঠিকানা:</span>
                <div className="ml-4 mt-0.5">
                    <div><span>ক) স্থায়ী: গ্রাম/মহল্লা:</span> <span className="border-b border-dotted border-gray-600 inline-block min-w-[100px] ml-1 align-bottom">{d.permanent_address_line1 || ''}</span> ডাকঘর: <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] ml-1 align-bottom">{d.permanent_address_line2 || ''}</span> উপজেলা: <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] ml-1 align-bottom">{d.permanent_address_line3?.split(',')[0]?.trim() || ''}</span> জেলা: <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] ml-1 align-bottom">{d.permanent_address_line3?.split(',')[1]?.trim() || ''}</span></div>
                    <div><span>খ) বর্তমান: গ্রাম/মহল্লা:</span> <span className="border-b border-dotted border-gray-600 inline-block min-w-[100px] ml-1 align-bottom">{d.current_address_line1 || ''}</span> ডাকঘর: <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] ml-1 align-bottom">{d.current_address_line2 || ''}</span> উপজেলা: <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] ml-1 align-bottom">{d.current_address_line3?.split(',')[0]?.trim() || ''}</span> জেলা: <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] ml-1 align-bottom">{d.current_address_line3?.split(',')[1]?.trim() || ''}</span></div>
                </div>
            </div>
            <div className="mb-1" style={{ fontSize: '10px' }}>
                <span>৪. NID/Smart Card No:</span>
                <span className="inline-flex gap-0.5 ml-1">
                    {Array.from({ length: 17 }, (_, i) => (
                        <span key={i} className="border border-gray-500 w-4 inline-block text-center min-h-[14px]">{nidDigits[i] ?? ''}</span>
                    ))}
                </span>
            </div>
            <div className="mb-1" style={{ fontSize: '10px' }}>
                <span>৫. পেশা:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[100px] mx-1 align-bottom">{d.occupation || ''}</span>
                <span className="ml-2">৬. শিক্ষাগত যোগ্যতা:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[100px] ml-1 align-bottom">{d.educational_qualification || ''}</span>
            </div>
            <div className="mb-1" style={{ fontSize: '10px' }}>
                <span>৭. সমিতিতে ভর্তির তারিখ:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] mx-1 align-bottom">{fmt(d.admission_date)}</span>
                <span className="ml-2">৮. পরিবারের মোট সদস্য সংখ্যা:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[40px] mx-1 align-bottom">{d.family_members_count ?? ''}</span>
                <span className="ml-2">৯. পরিবারের উপার্জনক্ষম সদস্য সংখ্যা:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[40px] ml-1 align-bottom">{d.earning_members_count ?? ''}</span>
            </div>
            <div className="mb-1" style={{ fontSize: '10px' }}>
                <span>১০. ইতোপূর্বে গৃহীত ঋণের তথ্য: মোট কতোবার</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[60px] mx-1 align-bottom">{d.previous_loan_times || ''}</span>
                <span>...কতো টাকা।</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] ml-1 align-bottom">{d.previous_loan_amount || ''}</span>
            </div>
            <div className="mb-1" style={{ fontSize: '10px' }}>
                <span>১১. সর্বশেষ পরিশোধিত ঋণের পরিমাণ:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] mx-1 align-bottom">{d.last_repaid_loan_amount || ''}</span>
                <span className="ml-2">১২. সর্বশেষ পরিশোধিত প্রকল্পের নাম:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[120px] ml-1 align-bottom">{d.last_repaid_project_name || ''}</span>
            </div>
            <div className="mb-1" style={{ fontSize: '10px' }}>
                <span>১৩. সাধারণ সঞ্চয় (দফা ও পরিমাণ):</span>
                <span className="border-b border-dotted border-gray-600 inline-block min-w-[40px] mx-1 align-bottom">{dofaLabel(d.loan_round)}</span>
                <span className="ml-1">পরিমাণ (৳):</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] mx-1 align-bottom">{d.general_savings_amount ?? d.savings_amount ?? ''}</span>
                <span className="ml-1">সঞ্চয়ের বিপরিতে:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[32px] mx-1 align-bottom">{d.is_against_savings ? 'হ্যাঁ' : 'না'}</span>
                {d.is_against_savings && d.against_savings_amount != null && d.against_savings_amount !== '' && (
                    <span className="ml-1">বিপরিতে পরিমাণ (৳):</span>
                )}
                {d.is_against_savings && d.against_savings_amount != null && d.against_savings_amount !== '' && (
                    <span className="border-b border-dotted border-gray-600 inline-block min-w-[60px] mx-1 align-bottom">{d.against_savings_amount}</span>
                )}
            </div>
            <div className="mb-1" style={{ fontSize: '10px' }}>
                <span>১৪. ঋণ প্রস্তাবনার তারিখ:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] mx-1 align-bottom">{fmt(d.loan_proposal_date)}</span>
            </div>
            <div className="mb-1" style={{ fontSize: '10px' }}>
                <span>১৫. প্রকল্পের নাম:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[120px] mx-1 align-bottom">{d.project_name || d.proposed_project_name || ''}</span>
                <span className="ml-2">১৬. প্রকল্পে নিয়োজিত জনবল সংখ্যা:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[50px] ml-1 align-bottom">{d.project_manpower || ''}</span>
            </div>
            <div className="mb-1" style={{ fontSize: '10px' }}>
                <span>১৭. প্রকল্পের ১/১.৫/২ বছরের আয় (স্ভাব্য):</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] mx-1 align-bottom">{d.project_income_1_2_yr || ''}</span>
                <span className="ml-2">১৮. প্রকল্পের ১/১.৫/২ বছরের ব্যয় (স্ভাব্য):</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] ml-1 align-bottom">{d.project_expense_1_2_yr || ''}</span>
            </div>
            <div className="mb-1" style={{ fontSize: '10px' }}>
                <span>১৯. বার্ষিক নিট লাভ (স্ভাব্য):</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] ml-1 align-bottom">{d.annual_net_profit || ''}</span>
            </div>
            <div className="mb-2" style={{ fontSize: '10px' }}>
                <span>২০. প্রকল্পে বিনিয়োগিত মূলধনের পরিমাণ:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] mx-1 align-bottom">{Number(d.capital_own || 0) + Number(d.capital_applied_loan || 0) || ''}</span>
                <span className="ml-2">(ক) নিজস্ব মূলধনের পরিমাণ:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] mx-1 align-bottom">{d.capital_own || ''}</span>
                <span className="ml-2">(খ) আবেদনকৃত ঋণের পরিমাণ:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] ml-1 align-bottom">{d.capital_applied_loan || ''}</span>
            </div>
            <div className="mb-2">
                <p className="font-bold text-xs mb-1">২১. পারিবারিক সম্পদ (স্থাবর ও অস্থাবর)</p>
                <table className="w-full border-collapse border border-gray-600 text-xs">
                    <thead>
                        <tr>
                            <th className="border border-gray-600 px-1 py-0.5">সম্পদের পরিমাণ (স্থাবর)</th>
                            <th className="border border-gray-600 px-1 py-0.5">আনুমানিক মূল্য</th>
                            <th className="border border-gray-600 px-1 py-0.5">সম্পদের বিবরণ (অস্থাবর)</th>
                            <th className="border border-gray-600 px-1 py-0.5">আনুমানিক মূল্য</th>
                        </tr>
                    </thead>
                    <tbody>
                        {((d.family_assets || []) as any[]).slice(0, 4).map((row, idx) => (
                            <tr key={idx}>
                                <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{row.fixed_quantity || ''}</span></td>
                                <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{row.fixed_value || ''}</span></td>
                                <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{row.movable_desc || ''}</span></td>
                                <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{row.movable_value || ''}</span></td>
                            </tr>
                        ))}
                        <tr>
                            <td className="border border-gray-600 px-1 py-0.5 font-bold">মোট</td>
                            <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]"></span></td>
                            <td className="border border-gray-600 px-1 py-0.5 font-bold">মোট</td>
                            <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]"></span></td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div className="mb-2 text-xs leading-relaxed">
                <p>
                    উল্লিখিত তথ্যাবলি সঠিক। আমার আবেদনকৃত <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] align-bottom">{d.approval_amount_digits || d.capital_applied_loan || ''}</span> টাকা {cat} কর্মসূচির আওতায় ঋণ প্রদান করলে সংস্থার যাবতীয় নিয়ম-কানুন মেনে নির্ধারিত তারিখে ঋণের কিস্তি পরিশোধ করবো।
                </p>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-2" style={{ fontSize: '10px' }}>
                <div className="border border-gray-600 p-1 text-center">
                    <p className="font-bold">সুপারিশকারীগণের স্বাক্ষর</p>
                    <p className="text-[10px]">অফিসারের স্বাক্ষর ও সিল</p>
                    <div className="border-b border-dotted border-gray-600 min-h-[28px] mt-1"></div>
                </div>
                <div className="border border-gray-600 p-1 text-center">
                    <p className="font-bold">আবেদনকারীর স্বাক্ষর:</p>
                    <div className="min-h-[28px] mt-1">
                        {d.applicant_signature && <img src={d.applicant_signature} alt="Applicant" className="h-6 mx-auto object-contain" />}
                    </div>
                </div>
                <div className="border border-gray-600 p-1 text-center">
                    <p className="font-bold">শাখা ব্যবস্থাপকের স্বাক্ষর ও সিল</p>
                    <div className="border-b border-dotted border-gray-600 min-h-[28px] mt-1"></div>
                </div>
            </div>
            <div className="mb-2 text-xs">
                <p>
                    আবেদনকারীর যাবতীয় তথ্যাদি সরেজমিনে যাচাই সাপেক্ষে উক্ত প্রকল্পে <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] align-bottom">{d.approval_amount_digits || d.capital_applied_loan || ''}</span> (কথায় <span className="border-b border-dotted border-gray-600 inline-block min-w-[120px] align-bottom">{d.approval_amount_words || ''}</span>) টাকা ঋণ বিতরণের জন্য অনুমোদন করা হলো।
                </p>
            </div>
            <div className="border border-gray-600 p-1 inline-block" style={{ fontSize: '10px' }}>
                <p className="font-bold">অনুমোদনকারীর স্বাক্ষর ও সিল:</p>
                <div className="min-h-[32px] mt-1 w-40">
                    {d.approver_signature && <img src={d.approver_signature} alt="Approver" className="h-7 object-contain" />}
                </div>
            </div>
            <div className="text-right mt-2 text-xs">১ / ৪</div>
        </div>
    );
}

/** Render Page 2 - Project Profile */
function renderPage2(d: any, categoryName?: string) {
    const cat = categoryName || d.category_name || 'ঋণ';
    const fmt = formatDateBangla;
    return (
        <div className="bg-white border border-gray-300 p-4 print:p-2" style={{ fontSize: '11px', pageBreakAfter: 'always' }}>
            <div className="text-center mb-3 rounded-lg border-2 border-gray-600 p-2">
                <h2 className="text-base font-bold print:text-sm">{cat} ঋণের প্রোফাইল</h2>
            </div>
            <div className="mb-3">
                <h3 className="font-bold text-xs mb-2">ক. উদ্যোগ বিষয়ক সাধারণ তথ্যাবলী:</h3>
                <div className="space-y-2" style={{ fontSize: '10px' }}>
                    <div><span>১. প্রস্তাবিত প্রকল্পের নাম:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[300px] ml-1 align-bottom">{d.proposed_project_name || d.project_name || ''}</span></div>
                    <div><span>২. উদ্যোক্তাদের সংশ্লিষ্টতা-</span>
                        <div className="ml-4 mt-1">
                            <div><span>(ক) সার্বক্ষণিক: কতোদিন কাজটিতে নিযুক্ত আছে</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[40px] mx-1 align-bottom">{d.entrepreneur_fulltime_years || ''}</span> বছর, <span className="border-b border-dotted border-gray-600 inline-block min-w-[40px] mx-1 align-bottom">{d.entrepreneur_fulltime_months || ''}</span> মাস</div>
                            <div><span>(খ) খণ্ডকালীন: কতোদিন কাজটিতে নিযুক্ত আছে</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[40px] mx-1 align-bottom">{d.entrepreneur_parttime_years || ''}</span> বছর, <span className="border-b border-dotted border-gray-600 inline-block min-w-[40px] mx-1 align-bottom">{d.entrepreneur_parttime_months || ''}</span> মাস</div>
                        </div>
                    </div>
                    <div><span>৩. ঋণ গ্রহণের অভিজ্ঞতা:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[40px] mx-1 align-bottom">{d.loan_experience_years || ''}</span> বছর, <span className="border-b border-dotted border-gray-600 inline-block min-w-[40px] mx-1 align-bottom">{d.loan_experience_months || ''}</span> মাস</div>
                    <div><span>৪. প্রকল্পে নিয়োজিত জনবল:</span>
                        <div className="ml-4 mt-1">
                            <div><span>মোট:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[50px] mx-1 align-bottom">{d.project_manpower_total || d.project_manpower || ''}</span> পরিবারের সদস্য: <span className="border-b border-dotted border-gray-600 inline-block min-w-[50px] mx-1 align-bottom">{d.project_manpower_family || ''}</span> বাইরের: <span className="border-b border-dotted border-gray-600 inline-block min-w-[50px] mx-1 align-bottom">{d.project_manpower_outside || ''}</span> প্রশিক্ষিত: <span className="border-b border-dotted border-gray-600 inline-block min-w-[50px] mx-1 align-bottom">{d.project_manpower_trained || ''}</span></div>
                        </div>
                    </div>
                    <div><span>৫. কাঁচামাল ক্রয়ের স্থান:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[200px] ml-1 align-bottom">{d.raw_material_purchase_location || ''}</span></div>
                    <div><span>৬. পণ্য বিপণনের স্থান:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[200px] ml-1 align-bottom">{d.product_marketing_location || ''}</span></div>
                    <div><span>৭. গত বছরের মূলধন:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[100px] mx-1 align-bottom">{d.last_year_capital || ''}</span> বিক্রয়: <span className="border-b border-dotted border-gray-600 inline-block min-w-[100px] mx-1 align-bottom">{d.last_year_sales || ''}</span> লাভ/ক্ষতি: <span className="border-b border-dotted border-gray-600 inline-block min-w-[100px] mx-1 align-bottom">{d.last_year_profit_loss || ''}</span></div>
                </div>
            </div>
            <div className="mb-3">
                <h3 className="font-bold text-xs mb-2">খ. আর্থিক তথ্য বিবরণী সমূহ:</h3>
                <div className="space-y-2" style={{ fontSize: '10px' }}>
                    <div><span>১. মোট কতবার ঋণ গ্রহণ করেছেন:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[60px] mx-1 align-bottom">{d.total_loans_taken || d.previous_loan_times || ''}</span></div>
                    <div><span>২. গত তিনবারের ঋণের তথ্য:</span>
                        <table className="w-full border-collapse border border-gray-600 text-xs mt-1">
                            <thead>
                                <tr>
                                    <th className="border border-gray-600 px-1 py-0.5">ঋণ নং</th>
                                    <th className="border border-gray-600 px-1 py-0.5">তারিখ</th>
                                    <th className="border border-gray-600 px-1 py-0.5">পরিমাণ</th>
                                    <th className="border border-gray-600 px-1 py-0.5">প্রকল্পের নাম</th>
                                    <th className="border border-gray-600 px-1 py-0.5">সঞ্চয় অবস্থা</th>
                                </tr>
                            </thead>
                            <tbody>
                                {((d.last_three_loans || []) as any[]).slice(0, 3).map((loan, idx) => (
                                    <tr key={idx}>
                                        <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{loan.loan_number || ''}</span></td>
                                        <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{fmt(loan.loan_date)}</span></td>
                                        <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{loan.loan_amount || ''}</span></td>
                                        <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{loan.project_name || ''}</span></td>
                                        <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{loan.savings_status || ''}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <div className="text-right mt-2 text-xs">২ / ৪</div>
        </div>
    );
}

/** Render Page 3 - Investigation & Recommendation */
function renderPage3(d: any) {
    const fmt = formatDateBangla;
    return (
        <div className="bg-white border border-gray-300 p-4 print:p-2" style={{ fontSize: '11px', pageBreakAfter: 'always' }}>
            <div className="mb-3">
                <h3 className="font-bold text-xs mb-2">গ. তদন্ত ও সুপারিশ:</h3>
                <div className="space-y-2" style={{ fontSize: '10px' }}>
                    <div><span>তদন্তকারী অফিসারের নাম:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[200px] mx-1 align-bottom">{d.investigating_officer_name || ''}</span></div>
                    <div><span>তারিখ:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[100px] mx-1 align-bottom">{fmt(d.investigating_officer_signature_date)}</span></div>
                    <div><span>মন্তব্য:</span>
                        <div className="border border-gray-600 min-h-[60px] p-1 mt-1">{d.investigating_officer_comments || ''}</div>
                    </div>
                    <div className="border-b border-dotted border-gray-600 min-h-[40px] mt-2">
                        {d.investigating_officer_signature && <img src={d.investigating_officer_signature} alt="Officer" className="h-8 object-contain" />}
                    </div>
                </div>
            </div>
            <div className="mb-3">
                <h3 className="font-bold text-xs mb-2">ঘ. সুপারিশ:</h3>
                <div className="space-y-2" style={{ fontSize: '10px' }}>
                    <div><span>সুপারিশকারী অফিসারের নাম:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[200px] mx-1 align-bottom">{d.recommending_officer_name || ''}</span></div>
                    <div><span>তারিখ:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[100px] mx-1 align-bottom">{fmt(d.recommending_officer_signature_date)}</span></div>
                    <div><span>মন্তব্য:</span>
                        <div className="border border-gray-600 min-h-[60px] p-1 mt-1">{d.recommending_officer_comments || ''}</div>
                    </div>
                    <div className="border-b border-dotted border-gray-600 min-h-[40px] mt-2">
                        {d.recommending_officer_signature && <img src={d.recommending_officer_signature} alt="Recommending" className="h-8 object-contain" />}
                    </div>
                </div>
            </div>
            <div className="text-right mt-2 text-xs">৩ / ৪</div>
        </div>
    );
}

/** Render Page 4 - Applicant Details Continued & Office Level */
function renderPage4(d: any) {
    const fmt = formatDateBangla;
    return (
        <div className="bg-white border border-gray-300 p-4 print:p-2" style={{ fontSize: '11px' }}>
            <div className="mb-3">
                <h3 className="font-bold text-xs mb-2">I. Applicant Details (Continued)</h3>
                <div className="space-y-2" style={{ fontSize: '10px' }}>
                    <div><span>০৪. চাকরিজীবীর ক্ষেত্রে (প্রযোজ্য ক্ষেত্রে):</span>
                        <div className="ml-4 space-y-1">
                            <div><span>কর্মস্থলের নাম:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[200px] ml-1 align-bottom">{d.employee_workplace_name || ''}</span></div>
                            <div className="grid grid-cols-2 gap-2">
                                <div><span>মাসিক বেতন:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[100px] ml-1 align-bottom">{d.employee_monthly_salary || ''}</span></div>
                                <div><span>হাতে প্রাপ্তি:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[100px] ml-1 align-bottom">{d.employee_received_in_hand || ''}</span></div>
                            </div>
                        </div>
                    </div>
                    <div><span>০৫. প্রবাসী সদস্যের রেমিটেন্স এর তথ্য (প্রযোজ্য ক্ষেত্রে):</span>
                        <div className="ml-4 space-y-1">
                            <div className="grid grid-cols-2 gap-2">
                                <div><span>মাসিক আয়:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[100px] ml-1 align-bottom">{d.expatriate_monthly_income || ''}</span></div>
                                <div><span>যে চ্যানেলে আসে:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[120px] ml-1 align-bottom">{d.expatriate_channel || ''}</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="mb-3">
                <h3 className="font-bold text-xs mb-2">II. ঘ. সংস্থার অফিস পর্যায়ে পূরণীয়:</h3>
                <div className="space-y-2" style={{ fontSize: '10px' }}>
                    <div className="border border-gray-600 p-2">
                        <p className="font-bold mb-1">(ক) তদন্তকারী অফিসারের পরিদর্শনোত্তর মন্তব্য, স্বাক্ষর ও সিল:</p>
                        <div className="border border-gray-400 min-h-[60px] p-1 mb-1">{d.officer_post_inspection_comments || ''}</div>
                        <div className="border-b border-dotted border-gray-600 min-h-[32px] w-40">
                            {d.officer_post_inspection_signature && <img src={d.officer_post_inspection_signature} alt="Officer" className="h-7 object-contain" />}
                        </div>
                    </div>
                    <div className="border border-gray-600 p-2">
                        <p className="font-bold mb-1">(খ) শাখা ব্যবস্থাপকের পরিদর্শনোত্তর মন্তব্য, স্বাক্ষর ও সিল:</p>
                        <div className="border border-gray-400 min-h-[60px] p-1 mb-1">{d.branch_manager_post_inspection_comments || ''}</div>
                        <div className="border-b border-dotted border-gray-600 min-h-[32px] w-40">
                            {d.branch_manager_post_inspection_signature && <img src={d.branch_manager_post_inspection_signature} alt="Branch Manager" className="h-7 object-contain" />}
                        </div>
                    </div>
                    <div className="border border-gray-600 p-2">
                        <p className="font-bold mb-1">(ঙ) সংস্থার চূড়ান্ত অনুমোদনকারীর মন্তব্য ও অনুমোদিত ঋণের বিবরণ</p>
                        <div className="border border-gray-400 min-h-[60px] p-1 mb-1">{d.final_approver_comments || ''}</div>
                        <div className="flex items-center gap-4">
                            <div><span>টাকা:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[100px] ml-1 align-bottom">{d.final_approved_loan_amount_digits || ''}</span></div>
                            <div><span>কথায়:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[150px] ml-1 align-bottom">{d.final_approved_loan_amount_words || ''}</span></div>
                            <div className="ml-auto">
                                <p className="text-xs mb-1">চূড়ান্ত অনুমোদনকারীর স্বাক্ষর ও সিল:</p>
                                <div className="border-b border-dotted border-gray-600 min-h-[32px] w-40">
                                    {d.final_approver_signature && <img src={d.final_approver_signature} alt="Final Approver" className="h-7 object-contain" />}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="text-right mt-2 text-xs">৪ / ৪</div>
        </div>
    );
}

/** Module-level: complete preview with all 4 pages (for onlyPreview on Show page) */
function renderLoanApplicationApprovalPreviewContent(formData: any, branch?: any, categoryName?: string) {
    const d = formData || {};
    const cat = categoryName || d.category_name || 'ঋণ';
    return (
        <>
            {renderPage1(d, branch, cat)}
            {renderPage2(d, cat)}
            {renderPage3(d)}
            {renderPage4(d)}
        </>
    );
}

function formSelectionUrl(isLegacy: boolean, member: any, loanProduct: any, loanCategory: any, requestedAmount: number) {
    const params = new URLSearchParams({ loan_product_id: String(loanProduct.id), loan_category_id: String(loanCategory.id), requested_amount: String(requestedAmount) });
    if (isLegacy) params.set('legacy', '1'); else params.set('member_id', String(member?.id ?? ''));
    return `/member/loan-applications/form-selection?${params.toString()}`;
}

export default function LoanApplicationApproval({
    member,
    loanProduct,
    loanCategory,
    requestedAmount,
    branch,
    existingApplication,
    savedData,
    onlyPreview,
    savingsProducts = [],
    loanRound = 1,
    isLegacy = false,
}: Props) {
    if (onlyPreview && savedData) {
        const categoryName = loanCategory?.category_name_bn || loanCategory?.category_name || 'ঋণ';
        return (
            <div className="print-container">
                {renderLoanApplicationApprovalPreviewContent(savedData, branch, categoryName)}
            </div>
        );
    }
    
    const [showPreview, setShowPreview] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const categoryName = loanCategory?.category_name_bn || loanCategory?.category_name || 'ঋণ';
    
    const { data, setData, processing } = useForm<LoanApplicationApprovalData>({
        // Page 1 fields
        category_name: categoryName,
        branch_address: branch?.address || '',
        application_date: new Date().toISOString().split('T')[0],
        loan_approval_date: '',
        loan_disbursement_date: '',
        loan_repayment_date: '',
        recipient_to: '',
        authority_medium: '',
        committee_name: member?.samity?.samity_name_bn || member?.samity?.samity_name || '',
        committee_code: member?.samity?.samity_code || member?.samity?.id?.toString() || '',
        member_type: 'new', // 'new' | 'old' - নতুন সদস্য / পুরাতন সদস্য
        years_involved: '', // কতো বছর যাবৎ কার্যক্রমের সাথে সম্পৃক্ত (শুধু পুরাতন হলে)
        member_name_detail: member?.applicant_name_bn || member?.applicant_name_en || '',
        member_code: member?.application_no || '',
        age: '',
        father_husband_name: member?.father_name_bn || member?.spouse_name_bn || '',
        permanent_address_line1: member?.permanent_village_road || '',
        permanent_address_line2: '',
        permanent_address_line3: `${member?.permanent_upazila || ''}, ${member?.permanent_district || ''}`,
        current_address_line1: member?.present_village_road || '',
        current_address_line2: '',
        current_address_line3: `${member?.present_upazila || ''}, ${member?.present_district || ''}`,
        nid_smart_card: member?.nid_number || '',
        occupation: '',
        educational_qualification: '',
        admission_date: member?.admission_date || '',
        family_members_count: 0,
        earning_members_count: 0,
        previous_loan_times: '',
        previous_loan_amount: '',
        last_repaid_loan_amount: '',
        last_repaid_project_name: '',
        savings_amount: 0,
        general_savings_product_id: null,
        general_savings_amount: 0,
        is_against_savings: false,
        against_savings_product_id: null,
        against_savings_amount: 0,
        loan_round: loanRound,
        loan_proposal_date: '',
        project_name: '',
        proposed_project_name: '',
        project_manpower: '',
        project_income_1_2_yr: '',
        project_expense_1_2_yr: '',
        annual_net_profit: '',
        capital_own: '',
        capital_applied_loan: requestedAmount?.toString() || '',
        approval_amount_digits: requestedAmount?.toString() || '',
        approval_amount_words: '',
        family_assets: [],
        applicant_signature: null,
        approver_signature: null,
        
        // Page 2 fields
        entrepreneur_fulltime_years: '',
        entrepreneur_fulltime_months: '',
        entrepreneur_parttime_years: '',
        entrepreneur_parttime_months: '',
        loan_experience_years: '',
        loan_experience_months: '',
        project_manpower_total: '',
        project_manpower_family: '',
        project_manpower_outside: '',
        project_manpower_trained: '',
        raw_material_purchase_location: '',
        product_marketing_location: '',
        last_year_capital: '',
        last_year_sales: '',
        last_year_profit_loss: '',
        total_loans_taken: '',
        last_three_loans: [],
        
        // Page 3 fields
        investigating_officer_name: '',
        investigating_officer_signature_date: '',
        investigating_officer_comments: '',
        investigating_officer_signature: null,
        recommending_officer_name: '',
        recommending_officer_signature_date: '',
        recommending_officer_comments: '',
        recommending_officer_signature: null,
        
        // Page 4 fields
        employee_workplace_name: '',
        employee_monthly_salary: '',
        employee_received_in_hand: '',
        expatriate_monthly_income: '',
        expatriate_channel: '',
        officer_post_inspection_comments: '',
        officer_post_inspection_signature: null,
        branch_manager_post_inspection_comments: '',
        branch_manager_post_inspection_signature: null,
        final_approver_comments: '',
        final_approved_loan_amount_digits: '',
        final_approved_loan_amount_words: '',
        final_approver_signature: null,
    });

    // Load saved data if exists
    useEffect(() => {
        if (savedData) {
            setData(prev => ({
                ...prev,
                ...savedData,
            }));
            setShowPreview(true);
        }
    }, [savedData]);

    const handleImageUpload = (field: string, file: File | null) => {
        if (!file) return;
        if (!file.type.match(/image\/(png|jpg|jpeg)/)) {
            alert('শুধুমাত্র PNG, JPG বা JPEG ফাইল আপলোড করুন');
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            setData(field as any, reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const removeImage = (field: string) => {
        setData(field as any, null);
    };

    const handleSaveDraft = () => {
        const effectiveDofa = data.loan_round != null && data.loan_round >= 1 ? data.loan_round : loanRound;
        const requiredPercent = getRequiredSavingsPercent(loanProduct?.installment_type, effectiveDofa, !!data.is_against_savings, loanProduct?.duration_months);
        const minSavings = Math.ceil((requestedAmount * requiredPercent) / 100);
        const generalAmount = Number(data.general_savings_amount) || 0;
        if (generalAmount < minSavings) {
            setErrors({ general_savings_amount: `সাধারণ সঞ্চয় সর্বনিম্ন ${requiredPercent}% (৳${minSavings.toLocaleString('bn-BD')}) থাকতে হবে।` });
            return;
        }
        setErrors({});
        const payload: any = { loan_product_id: loanProduct.id, loan_category_id: loanCategory.id, requested_amount: requestedAmount, form_data: { ...data } as any };
        if (isLegacy) payload.legacy = 1; else payload.member_id = member?.id;
        router.post(
            '/member/loan-applications/forms/loan-application-approval/save-draft',
            payload,
            {
                onSuccess: () => {
                    alert(`${categoryName} ঋণ আবেদন ও অনুমোদনপত্র ড্রাফট হিসেবে সংরক্ষিত হয়েছে।`);
                    router.visit(formSelectionUrl(isLegacy, member, loanProduct, loanCategory, requestedAmount));
                },
                onError: (errs) => {
                    console.error('Save draft error:', errs);
                    alert('ড্রাফট সংরক্ষণে ত্রুটি হয়েছে');
                },
            }
        );
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <AdminLayout>
            <Head title={`${categoryName} আবেদন ও অনুমোদনপত্র`}>
                <style>{`
                    @media print {
                        @page { size: A4; margin: 1cm; }
                        body * { visibility: hidden !important; }
                        .print-container, .print-container * { visibility: visible !important; }
                        .print-container {
                            position: absolute !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: 100% !important;
                        }
                    }
                `}</style>
            </Head>
            <div className="py-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Header */}
                    <div className="mb-6 flex items-center justify-between print:hidden">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => router.visit(formSelectionUrl(isLegacy, member, loanProduct, loanCategory, requestedAmount))}
                                className="flex items-center gap-2 px-3 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back
                            </button>
                            <div>
                                <h2 className="text-lg font-bold">{categoryName} ঋণ আবেদন ও অনুমোদনপত্র</h2>
                                <p className="text-xs text-gray-600">
                                    ফর্ম পূরণ করে ড্রাফট হিসেবে সংরক্ষণ করুন এবং প্রিন্ট নিন।
                                </p>
                                {existingApplication && (
                                    <p className="text-xs text-blue-600 mt-1">
                                        ✓ Draft সংরক্ষিত আছে - Application No: {existingApplication.application_no || 'Pending'}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handlePrint}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700"
                            >
                                <Printer className="w-4 h-4" />
                                Print
                            </button>
                            <button
                                onClick={handleSaveDraft}
                                disabled={processing}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
                            >
                                <Save className="w-4 h-4" />
                                {processing ? 'সংরক্ষণ হচ্ছে...' : 'ড্রাফট সংরক্ষণ করুন'}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 print:grid-cols-1">
                        {/* LEFT SIDE: INPUT FORM */}
                        <div className="space-y-4 print:hidden">
                            <div className="bg-white rounded-lg shadow p-6 space-y-6">
                                {/* Page 1: Basic Information */}
                                <div className="border-b pb-4">
                                    <h3 className="font-bold text-sm mb-4">পৃষ্ঠা ১: মৌলিক তথ্য</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium mb-1">আবেদনের তারিখ</label>
                                            <input type="date" value={data.application_date} onChange={(e) => setData('application_date', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">ঋণ অনুমোদনের তারিখ</label>
                                            <input type="date" value={data.loan_approval_date} onChange={(e) => setData('loan_approval_date', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">ঋণ বিতরণের তারিখ</label>
                                            <input type="date" value={data.loan_disbursement_date} onChange={(e) => setData('loan_disbursement_date', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">ঋণ পরিশোধের তারিখ</label>
                                            <input type="date" value={data.loan_repayment_date} onChange={(e) => setData('loan_repayment_date', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">বরাবর</label>
                                            <input type="text" value={data.recipient_to} onChange={(e) => setData('recipient_to', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">মাধ্যম: যথাযথ কর্তৃপক্ষ</label>
                                            <input type="text" value={data.authority_medium} onChange={(e) => setData('authority_medium', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">সমিতির নাম</label>
                                            <input type="text" value={data.committee_name} onChange={(e) => setData('committee_name', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">সমিতি কোড</label>
                                            <input type="text" value={data.committee_code} onChange={(e) => setData('committee_code', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">নতুন/পুরাতন সদস্য</label>
                                            <select
                                                value={data.member_type ?? 'new'}
                                                onChange={(e) => setData('member_type', e.target.value as 'new' | 'old')}
                                                className="w-full border rounded px-2 py-1.5 text-sm"
                                            >
                                                <option value="new">নতুন সদস্য</option>
                                                <option value="old">পুরাতন সদস্য</option>
                                            </select>
                                        </div>
                                        {data.member_type === 'old' && (
                                            <div>
                                                <label className="block text-xs font-medium mb-1">কতো বছর যাবৎ কার্যক্রমের সাথে সম্পৃক্ত</label>
                                                <input type="text" value={data.years_involved} onChange={(e) => setData('years_involved', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                            </div>
                                        )}
                                        <div>
                                            <label className="block text-xs font-medium mb-1">সদস্য নাম</label>
                                            <input type="text" value={data.member_name_detail} onChange={(e) => setData('member_name_detail', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">সদস্য কোড</label>
                                            <input type="text" value={data.member_code} onChange={(e) => setData('member_code', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">বয়স</label>
                                            <input type="number" value={data.age} onChange={(e) => setData('age', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">পিতা/স্বামীর নাম</label>
                                            <input type="text" value={data.father_husband_name} onChange={(e) => setData('father_husband_name', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-xs font-medium mb-1">স্থায়ী ঠিকানা - গ্রাম/মহল্লা</label>
                                            <input type="text" value={data.permanent_address_line1} onChange={(e) => setData('permanent_address_line1', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">ডাকঘর</label>
                                            <input type="text" value={data.permanent_address_line2} onChange={(e) => setData('permanent_address_line2', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">উপজেলা, জেলা</label>
                                            <input type="text" value={data.permanent_address_line3} onChange={(e) => setData('permanent_address_line3', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" placeholder="উপজেলা, জেলা" />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-xs font-medium mb-1">বর্তমান ঠিকানা - গ্রাম/মহল্লা</label>
                                            <input type="text" value={data.current_address_line1} onChange={(e) => setData('current_address_line1', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">ডাকঘর</label>
                                            <input type="text" value={data.current_address_line2} onChange={(e) => setData('current_address_line2', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">উপজেলা, জেলা</label>
                                            <input type="text" value={data.current_address_line3} onChange={(e) => setData('current_address_line3', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" placeholder="উপজেলা, জেলা" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">NID/Smart Card No</label>
                                            <input type="text" value={data.nid_smart_card} onChange={(e) => setData('nid_smart_card', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" maxLength={17} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">পেশা</label>
                                            <input type="text" value={data.occupation} onChange={(e) => setData('occupation', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">শিক্ষাগত যোগ্যতা</label>
                                            <input type="text" value={data.educational_qualification} onChange={(e) => setData('educational_qualification', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">সমিতিতে ভর্তির তারিখ</label>
                                            <input type="date" value={toInputDate(data.admission_date)} onChange={(e) => setData('admission_date', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">পরিবারের মোট সদস্য সংখ্যা</label>
                                            <input type="number" value={data.family_members_count} onChange={(e) => setData('family_members_count', parseInt(e.target.value) || 0)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">উপার্জনক্ষম সদস্য সংখ্যা</label>
                                            <input type="number" value={data.earning_members_count} onChange={(e) => setData('earning_members_count', parseInt(e.target.value) || 0)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">ইতোপূর্বে গৃহীত ঋণের সংখ্যা</label>
                                            <input type="text" value={data.previous_loan_times} onChange={(e) => setData('previous_loan_times', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">ইতোপূর্বে গৃহীত ঋণের পরিমাণ</label>
                                            <input type="text" value={data.previous_loan_amount} onChange={(e) => setData('previous_loan_amount', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">সর্বশেষ পরিশোধিত ঋণের পরিমাণ</label>
                                            <input type="text" value={data.last_repaid_loan_amount} onChange={(e) => setData('last_repaid_loan_amount', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">সর্বশেষ পরিশোধিত প্রকল্পের নাম</label>
                                            <input type="text" value={data.last_repaid_project_name} onChange={(e) => setData('last_repaid_project_name', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                        </div>
                                        {/* Savings Information: সাধারণ সঞ্চয় (G.Savings 21.01 + দফা অনুযায়ী %) - ফর্ম ৪ এর মতো একই */}
                                        <div className="col-span-2">
                                            <GeneralSavingsSection
                                                savingsProducts={savingsProducts}
                                                loanProduct={loanProduct}
                                                requestedAmount={requestedAmount}
                                                loanRound={loanRound}
                                                showDofaSelector
                                                data={{
                                                    general_savings_product_id: data.general_savings_product_id,
                                                    general_savings_amount: data.general_savings_amount,
                                                    is_against_savings: data.is_against_savings,
                                                    against_savings_product_id: data.against_savings_product_id,
                                                    against_savings_amount: data.against_savings_amount,
                                                    loan_round: data.loan_round,
                                                }}
                                                setData={(key, value) => {
                                                    setData(key, value);
                                                    if (key === 'general_savings_amount') setData('savings_amount', typeof value === 'number' ? value : 0);
                                                }}
                                                compact
                                                errors={errors}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">ঋণ প্রস্তাবনার তারিখ</label>
                                            <input type="date" value={toInputDate(data.loan_proposal_date)} onChange={(e) => setData('loan_proposal_date', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">প্রকল্পের নাম</label>
                                            <input type="text" value={data.project_name} onChange={(e) => setData('project_name', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">প্রস্তাবিত প্রকল্পের নাম</label>
                                            <input type="text" value={data.proposed_project_name} onChange={(e) => setData('proposed_project_name', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">প্রকল্পে নিয়োজিত জনবল সংখ্যা</label>
                                            <input type="text" value={data.project_manpower} onChange={(e) => setData('project_manpower', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">প্রকল্পের ১/১.৫/২ বছরের আয় (স্ভাব্য)</label>
                                            <input type="text" value={data.project_income_1_2_yr} onChange={(e) => setData('project_income_1_2_yr', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">প্রকল্পের ১/১.৫/২ বছরের ব্যয় (স্ভাব্য)</label>
                                            <input type="text" value={data.project_expense_1_2_yr} onChange={(e) => setData('project_expense_1_2_yr', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">বার্ষিক নিট লাভ (স্ভাব্য)</label>
                                            <input type="text" value={data.annual_net_profit} onChange={(e) => setData('annual_net_profit', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">নিজস্ব মূলধনের পরিমাণ</label>
                                            <input type="text" value={data.capital_own} onChange={(e) => setData('capital_own', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">আবেদনকৃত ঋণের পরিমাণ</label>
                                            <input type="text" value={data.capital_applied_loan} onChange={(e) => setData('capital_applied_loan', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">অনুমোদিত ঋণের পরিমাণ (সংখ্যায়)</label>
                                            <input type="text" value={data.approval_amount_digits} onChange={(e) => setData('approval_amount_digits', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">অনুমোদিত ঋণের পরিমাণ (কথায়)</label>
                                            <input type="text" value={data.approval_amount_words} onChange={(e) => setData('approval_amount_words', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                        </div>
                                    </div>
                                    
                                    {/* Family Assets Table */}
                                    <div className="mt-4">
                                        <label className="block text-xs font-medium mb-2">পারিবারিক সম্পদ (স্থাবর ও অস্থাবর)</label>
                                        <div className="space-y-2">
                                            {Array.from({ length: 4 }).map((_, idx) => (
                                                <div key={idx} className="grid grid-cols-4 gap-2">
                                                    <input type="text" placeholder="স্থাবর পরিমাণ" value={data.family_assets?.[idx]?.fixed_quantity || ''} onChange={(e) => {
                                                        const assets = [...(data.family_assets || [])];
                                                        if (!assets[idx]) assets[idx] = {};
                                                        assets[idx].fixed_quantity = e.target.value;
                                                        setData('family_assets', assets);
                                                    }} className="border rounded px-2 py-1.5 text-sm" />
                                                    <input type="text" placeholder="স্থাবর মূল্য" value={data.family_assets?.[idx]?.fixed_value || ''} onChange={(e) => {
                                                        const assets = [...(data.family_assets || [])];
                                                        if (!assets[idx]) assets[idx] = {};
                                                        assets[idx].fixed_value = e.target.value;
                                                        setData('family_assets', assets);
                                                    }} className="border rounded px-2 py-1.5 text-sm" />
                                                    <input type="text" placeholder="অস্থাবর বিবরণ" value={data.family_assets?.[idx]?.movable_desc || ''} onChange={(e) => {
                                                        const assets = [...(data.family_assets || [])];
                                                        if (!assets[idx]) assets[idx] = {};
                                                        assets[idx].movable_desc = e.target.value;
                                                        setData('family_assets', assets);
                                                    }} className="border rounded px-2 py-1.5 text-sm" />
                                                    <input type="text" placeholder="অস্থাবর মূল্য" value={data.family_assets?.[idx]?.movable_value || ''} onChange={(e) => {
                                                        const assets = [...(data.family_assets || [])];
                                                        if (!assets[idx]) assets[idx] = {};
                                                        assets[idx].movable_value = e.target.value;
                                                        setData('family_assets', assets);
                                                    }} className="border rounded px-2 py-1.5 text-sm" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Signatures Page 1 */}
                                    <div className="mt-4 grid grid-cols-3 gap-2">
                                        <div>
                                            <label className="block text-xs font-medium mb-2">আবেদনকারীর স্বাক্ষর</label>
                                            {data.applicant_signature ? (
                                                <div className="relative">
                                                    <img src={data.applicant_signature} alt="Signature" className="w-full h-24 object-contain border rounded" />
                                                    <button onClick={() => removeImage('applicant_signature')} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded text-xs">X</button>
                                                </div>
                                            ) : (
                                                <div className="border-2 border-dashed rounded p-2 text-center">
                                                    <Upload className="w-6 h-6 mx-auto mb-1 text-gray-400" />
                                                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload('applicant_signature', e.target.files?.[0] || null)} className="hidden" id="applicant_signature" />
                                                    <label htmlFor="applicant_signature" className="cursor-pointer text-xs text-blue-600">Upload</label>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-2">অনুমোদনকারীর স্বাক্ষর</label>
                                            {data.approver_signature ? (
                                                <div className="relative">
                                                    <img src={data.approver_signature} alt="Signature" className="w-full h-24 object-contain border rounded" />
                                                    <button onClick={() => removeImage('approver_signature')} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded text-xs">X</button>
                                                </div>
                                            ) : (
                                                <div className="border-2 border-dashed rounded p-2 text-center">
                                                    <Upload className="w-6 h-6 mx-auto mb-1 text-gray-400" />
                                                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload('approver_signature', e.target.files?.[0] || null)} className="hidden" id="approver_signature" />
                                                    <label htmlFor="approver_signature" className="cursor-pointer text-xs text-blue-600">Upload</label>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Page 2: Project Profile */}
                                <div className="border-b pb-4">
                                    <h3 className="font-bold text-sm mb-4">পৃষ্ঠা ২: প্রকল্প প্রোফাইল</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium mb-1">সার্বক্ষণিক: বছর</label>
                                            <input type="text" value={data.entrepreneur_fulltime_years} onChange={(e) => setData('entrepreneur_fulltime_years', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">সার্বক্ষণিক: মাস</label>
                                            <input type="text" value={data.entrepreneur_fulltime_months} onChange={(e) => setData('entrepreneur_fulltime_months', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">খণ্ডকালীন: বছর</label>
                                            <input type="text" value={data.entrepreneur_parttime_years} onChange={(e) => setData('entrepreneur_parttime_years', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">খণ্ডকালীন: মাস</label>
                                            <input type="text" value={data.entrepreneur_parttime_months} onChange={(e) => setData('entrepreneur_parttime_months', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">ঋণ গ্রহণের অভিজ্ঞতা: বছর</label>
                                            <input type="text" value={data.loan_experience_years} onChange={(e) => setData('loan_experience_years', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">ঋণ গ্রহণের অভিজ্ঞতা: মাস</label>
                                            <input type="text" value={data.loan_experience_months} onChange={(e) => setData('loan_experience_months', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">মোট জনবল</label>
                                            <input type="text" value={data.project_manpower_total} onChange={(e) => setData('project_manpower_total', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">পরিবারের সদস্য</label>
                                            <input type="text" value={data.project_manpower_family} onChange={(e) => setData('project_manpower_family', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">বাইরের</label>
                                            <input type="text" value={data.project_manpower_outside} onChange={(e) => setData('project_manpower_outside', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">প্রশিক্ষিত</label>
                                            <input type="text" value={data.project_manpower_trained} onChange={(e) => setData('project_manpower_trained', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">কাঁচামাল ক্রয়ের স্থান</label>
                                            <input type="text" value={data.raw_material_purchase_location} onChange={(e) => setData('raw_material_purchase_location', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">পণ্য বিপণনের স্থান</label>
                                            <input type="text" value={data.product_marketing_location} onChange={(e) => setData('product_marketing_location', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">গত বছরের মূলধন</label>
                                            <input type="text" value={data.last_year_capital} onChange={(e) => setData('last_year_capital', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">গত বছরের বিক্রয়</label>
                                            <input type="text" value={data.last_year_sales} onChange={(e) => setData('last_year_sales', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">গত বছরের লাভ/ক্ষতি</label>
                                            <input type="text" value={data.last_year_profit_loss} onChange={(e) => setData('last_year_profit_loss', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">মোট কতবার ঋণ গ্রহণ করেছেন</label>
                                            <input type="text" value={data.total_loans_taken} onChange={(e) => setData('total_loans_taken', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                        </div>
                                    </div>
                                    
                                    {/* Last Three Loans Table */}
                                    <div className="mt-4">
                                        <label className="block text-xs font-medium mb-2">গত তিনবারের ঋণের তথ্য</label>
                                        <div className="space-y-2">
                                            {Array.from({ length: 3 }).map((_, idx) => (
                                                <div key={idx} className="grid grid-cols-5 gap-2">
                                                    <input type="text" placeholder="ঋণ নং" value={data.last_three_loans?.[idx]?.loan_number || ''} onChange={(e) => {
                                                        const loans = [...(data.last_three_loans || [])];
                                                        if (!loans[idx]) loans[idx] = {};
                                                        loans[idx].loan_number = e.target.value;
                                                        setData('last_three_loans', loans);
                                                    }} className="border rounded px-2 py-1.5 text-sm" />
                                                    <input type="date" placeholder="তারিখ" value={toInputDate(data.last_three_loans?.[idx]?.loan_date)} onChange={(e) => {
                                                        const loans = [...(data.last_three_loans || [])];
                                                        if (!loans[idx]) loans[idx] = {};
                                                        loans[idx].loan_date = e.target.value;
                                                        setData('last_three_loans', loans);
                                                    }} className="border rounded px-2 py-1.5 text-sm" />
                                                    <input type="text" placeholder="পরিমাণ" value={data.last_three_loans?.[idx]?.loan_amount || ''} onChange={(e) => {
                                                        const loans = [...(data.last_three_loans || [])];
                                                        if (!loans[idx]) loans[idx] = {};
                                                        loans[idx].loan_amount = e.target.value;
                                                        setData('last_three_loans', loans);
                                                    }} className="border rounded px-2 py-1.5 text-sm" />
                                                    <input type="text" placeholder="প্রকল্পের নাম" value={data.last_three_loans?.[idx]?.project_name || ''} onChange={(e) => {
                                                        const loans = [...(data.last_three_loans || [])];
                                                        if (!loans[idx]) loans[idx] = {};
                                                        loans[idx].project_name = e.target.value;
                                                        setData('last_three_loans', loans);
                                                    }} className="border rounded px-2 py-1.5 text-sm" />
                                                    <input type="text" placeholder="সঞ্চয় অবস্থা" value={data.last_three_loans?.[idx]?.savings_status || ''} onChange={(e) => {
                                                        const loans = [...(data.last_three_loans || [])];
                                                        if (!loans[idx]) loans[idx] = {};
                                                        loans[idx].savings_status = e.target.value;
                                                        setData('last_three_loans', loans);
                                                    }} className="border rounded px-2 py-1.5 text-sm" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Page 3: Investigation & Recommendation */}
                                <div className="border-b pb-4">
                                    <h3 className="font-bold text-sm mb-4">পৃষ্ঠা ৩: তদন্ত ও সুপারিশ</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-medium mb-1">তদন্তকারী অফিসারের নাম</label>
                                            <input type="text" value={data.investigating_officer_name} onChange={(e) => setData('investigating_officer_name', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">তদন্তকারী অফিসারের তারিখ</label>
                                            <input type="date" value={toInputDate(data.investigating_officer_signature_date)} onChange={(e) => setData('investigating_officer_signature_date', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">তদন্তকারী অফিসারের মন্তব্য</label>
                                            <textarea value={data.investigating_officer_comments} onChange={(e) => setData('investigating_officer_comments', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" rows={3} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-2">তদন্তকারী অফিসারের স্বাক্ষর</label>
                                            {data.investigating_officer_signature ? (
                                                <div className="relative">
                                                    <img src={data.investigating_officer_signature} alt="Signature" className="w-full h-24 object-contain border rounded" />
                                                    <button onClick={() => removeImage('investigating_officer_signature')} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded text-xs">X</button>
                                                </div>
                                            ) : (
                                                <div className="border-2 border-dashed rounded p-2 text-center">
                                                    <Upload className="w-6 h-6 mx-auto mb-1 text-gray-400" />
                                                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload('investigating_officer_signature', e.target.files?.[0] || null)} className="hidden" id="investigating_officer_signature" />
                                                    <label htmlFor="investigating_officer_signature" className="cursor-pointer text-xs text-blue-600">Upload</label>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">সুপারিশকারী অফিসারের নাম</label>
                                            <input type="text" value={data.recommending_officer_name} onChange={(e) => setData('recommending_officer_name', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">সুপারিশকারী অফিসারের তারিখ</label>
                                            <input type="date" value={toInputDate(data.recommending_officer_signature_date)} onChange={(e) => setData('recommending_officer_signature_date', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">সুপারিশকারী অফিসারের মন্তব্য</label>
                                            <textarea value={data.recommending_officer_comments} onChange={(e) => setData('recommending_officer_comments', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" rows={3} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-2">সুপারিশকারী অফিসারের স্বাক্ষর</label>
                                            {data.recommending_officer_signature ? (
                                                <div className="relative">
                                                    <img src={data.recommending_officer_signature} alt="Signature" className="w-full h-24 object-contain border rounded" />
                                                    <button onClick={() => removeImage('recommending_officer_signature')} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded text-xs">X</button>
                                                </div>
                                            ) : (
                                                <div className="border-2 border-dashed rounded p-2 text-center">
                                                    <Upload className="w-6 h-6 mx-auto mb-1 text-gray-400" />
                                                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload('recommending_officer_signature', e.target.files?.[0] || null)} className="hidden" id="recommending_officer_signature" />
                                                    <label htmlFor="recommending_officer_signature" className="cursor-pointer text-xs text-blue-600">Upload</label>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Page 4: Additional Details & Office Level */}
                                <div>
                                    <h3 className="font-bold text-sm mb-4">পৃষ্ঠা ৪: অতিরিক্ত তথ্য ও অফিস পর্যায়</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-medium mb-1">কর্মস্থলের নাম (চাকরিজীবীর ক্ষেত্রে)</label>
                                            <input type="text" value={data.employee_workplace_name} onChange={(e) => setData('employee_workplace_name', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium mb-1">মাসিক বেতন</label>
                                                <input type="text" value={data.employee_monthly_salary} onChange={(e) => setData('employee_monthly_salary', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">হাতে প্রাপ্তি</label>
                                                <input type="text" value={data.employee_received_in_hand} onChange={(e) => setData('employee_received_in_hand', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium mb-1">মাসিক আয় (প্রবাসী সদস্য)</label>
                                                <input type="text" value={data.expatriate_monthly_income} onChange={(e) => setData('expatriate_monthly_income', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">যে চ্যানেলে আসে</label>
                                                <input type="text" value={data.expatriate_channel} onChange={(e) => setData('expatriate_channel', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">তদন্তকারী অফিসারের পরিদর্শনোত্তর মন্তব্য</label>
                                            <textarea value={data.officer_post_inspection_comments} onChange={(e) => setData('officer_post_inspection_comments', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" rows={3} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-2">তদন্তকারী অফিসারের পরিদর্শনোত্তর স্বাক্ষর</label>
                                            {data.officer_post_inspection_signature ? (
                                                <div className="relative">
                                                    <img src={data.officer_post_inspection_signature} alt="Signature" className="w-full h-24 object-contain border rounded" />
                                                    <button onClick={() => removeImage('officer_post_inspection_signature')} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded text-xs">X</button>
                                                </div>
                                            ) : (
                                                <div className="border-2 border-dashed rounded p-2 text-center">
                                                    <Upload className="w-6 h-6 mx-auto mb-1 text-gray-400" />
                                                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload('officer_post_inspection_signature', e.target.files?.[0] || null)} className="hidden" id="officer_post_inspection_signature" />
                                                    <label htmlFor="officer_post_inspection_signature" className="cursor-pointer text-xs text-blue-600">Upload</label>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">শাখা ব্যবস্থাপকের পরিদর্শনোত্তর মন্তব্য</label>
                                            <textarea value={data.branch_manager_post_inspection_comments} onChange={(e) => setData('branch_manager_post_inspection_comments', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" rows={3} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-2">শাখা ব্যবস্থাপকের পরিদর্শনোত্তর স্বাক্ষর</label>
                                            {data.branch_manager_post_inspection_signature ? (
                                                <div className="relative">
                                                    <img src={data.branch_manager_post_inspection_signature} alt="Signature" className="w-full h-24 object-contain border rounded" />
                                                    <button onClick={() => removeImage('branch_manager_post_inspection_signature')} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded text-xs">X</button>
                                                </div>
                                            ) : (
                                                <div className="border-2 border-dashed rounded p-2 text-center">
                                                    <Upload className="w-6 h-6 mx-auto mb-1 text-gray-400" />
                                                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload('branch_manager_post_inspection_signature', e.target.files?.[0] || null)} className="hidden" id="branch_manager_post_inspection_signature" />
                                                    <label htmlFor="branch_manager_post_inspection_signature" className="cursor-pointer text-xs text-blue-600">Upload</label>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">চূড়ান্ত অনুমোদনকারীর মন্তব্য</label>
                                            <textarea value={data.final_approver_comments} onChange={(e) => setData('final_approver_comments', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" rows={3} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium mb-1">চূড়ান্ত অনুমোদিত ঋণের পরিমাণ (সংখ্যায়)</label>
                                                <input type="text" value={data.final_approved_loan_amount_digits} onChange={(e) => setData('final_approved_loan_amount_digits', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">চূড়ান্ত অনুমোদিত ঋণের পরিমাণ (কথায়)</label>
                                                <input type="text" value={data.final_approved_loan_amount_words} onChange={(e) => setData('final_approved_loan_amount_words', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-2">চূড়ান্ত অনুমোদনকারীর স্বাক্ষর</label>
                                            {data.final_approver_signature ? (
                                                <div className="relative">
                                                    <img src={data.final_approver_signature} alt="Signature" className="w-full h-24 object-contain border rounded" />
                                                    <button onClick={() => removeImage('final_approver_signature')} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded text-xs">X</button>
                                                </div>
                                            ) : (
                                                <div className="border-2 border-dashed rounded p-2 text-center">
                                                    <Upload className="w-6 h-6 mx-auto mb-1 text-gray-400" />
                                                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload('final_approver_signature', e.target.files?.[0] || null)} className="hidden" id="final_approver_signature" />
                                                    <label htmlFor="final_approver_signature" className="cursor-pointer text-xs text-blue-600">Upload</label>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT SIDE: PREVIEW */}
                        <div className="lg:sticky lg:top-4 lg:h-fit print:block print-container">
                            <div className="bg-white rounded-lg shadow-lg p-8 print:shadow-none print:p-6 print:rounded-none print:bg-white">
                                {renderLoanApplicationApprovalPreviewContent(data, branch, categoryName)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
