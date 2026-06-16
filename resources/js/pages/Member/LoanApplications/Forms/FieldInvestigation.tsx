import { useEffect, useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { formatDateBangla } from '@/utils/dateUtils';
import { Save, Printer, Eye, Upload, X, ArrowLeft } from 'lucide-react';
import GeneralSavingsSection, { getRequiredSavingsPercent } from '@/components/LoanApplications/GeneralSavingsSection';

interface FieldInvestigationData {
    branch_name: string;
    branch_address: string;
    field_visit_date: string;
    loan_disbursement_date: string;
    member_name: string;
    member_no: string;
    samity_name: string;
    samity_code: string;
    nid_number: string;
    member_mobile: string;
    information_provider_name: string;
    information_provider_mobile: string;
    relationship_with_member: string;
    main_profession: string;
    family_members_count: number;
    earning_members_count: number;
    previous_loan_amount: number;
    current_loan_demand: number;
    own_land_amount: string;
    mortgaged_land_amount: string;
    land_value: number;
    house_type: string;
    room_count: number;
    has_tubewell: boolean;
    has_latrine: boolean;
    cow_count: number;
    buffalo_count: number;
    goat_count: number;
    sheep_count: number;
    duck_chicken_count: number;
    primary_school_count: number;
    secondary_school_count: number;
    college_count: number;
    madrasah_count: number;
    university_count: number;
    savings_amount: number;
    house_identification: string;
    other_organization_loans: string;
    previous_repayment_type: string;
    general_savings_default_count: number;
    emergency_savings_default_count: number;
    term_savings_default_count: number;
    term_savings_due_installments: number;
    term_savings_due_amount: number;
    comments: string;
    member_signature: string | null;
    branch_manager_signature: string | null;
    general_savings_product_id?: number | null;
    general_savings_amount?: number;
    is_against_savings?: boolean;
    against_savings_product_id?: number | null;
    against_savings_amount?: number;
    /** দফা (১ম=1, ২য়=2, ৩য়+=3,4,5...) */
    loan_round?: number;
}

interface Props {
    member: any;
    loanProduct: any;
    loanCategory: any;
    requestedAmount: number;
    branch?: any;
    existingApplication?: any;
    savedData?: FieldInvestigationData;
    onlyPreview?: boolean;
    savingsProducts?: Array<{ id: number; product_code: string; product_name: string; product_name_bn: string | null }>;
    loanRound?: number;
    isLegacy?: boolean;
}

const dofaLabel = (round: number | undefined): string => {
    if (round == null || round < 1) return '১ম দফা';
    const labels: Record<number, string> = { 1: '১ম দফা', 2: '২য় দফা', 3: '৩য় দফা', 4: '৪র্থ দফা', 5: '৫ম দফা', 6: '৬ষ্ঠ দফা', 7: '৭ম দফা', 8: '৮ম দফা', 9: '৯ম দফা', 10: '১০ম দফা' };
    return labels[round] || `${round}তম দফা`;
};

/** Module-level: full preview with given data (for onlyPreview on Show page) */
function renderFieldInvestigationPreviewContent(formData: any) {
    const d = formData || {};
    return (
        <div className="bg-white border border-gray-300 p-4 print:p-2" style={{ fontSize: '11px' }}>
            <div className="flex flex-col items-center justify-center mb-3 border-b-2 border-gray-400 pb-2">
                <div className="flex items-center justify-center gap-3 mb-1">
                    <img src="/logo.png" alt="Logo" className="h-16 w-16 object-contain print:h-14 print:w-14" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    <div className="text-center">
                        <h1 className="text-lg font-bold leading-tight print:text-base">মৌসুমী</h1>
                        <p className="text-xs leading-tight print:text-[10px]">{d.branch_address}</p>
                        <p className="text-xs leading-tight print:text-[10px]">ঋণ কর্মসূচি</p>
                    </div>
                </div>
            </div>
            <h2 className="text-center font-bold mb-3 print:mb-2" style={{ fontSize: '14px' }}>
                <span className="print:text-[12px]">সমিতিতে ঋণ আবেদন অনুযায়ী শাখা ব্যবস্থাপক কর্তৃক সদস্যের বাড়ি সরেজমিনে তদন্ত প্রতিবেদন</span>
            </h2>
            <div className="mb-2" style={{ fontSize: '10px' }}>
                <div className="space-y-0.5">
                    <div className="flex gap-1 items-baseline">
                        <span className="w-32 flex-shrink-0">সদস্য নাম:</span>
                        <span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{d.member_name || ''}</span>
                        <span className="w-24 flex-shrink-0 ml-2">সদস্য নং:</span>
                        <span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{d.member_no || ''}</span>
                    </div>
                    <div className="flex gap-1 items-baseline">
                        <span className="w-32 flex-shrink-0">সমিতির নাম:</span>
                        <span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{d.samity_name || ''}</span>
                        <span className="w-28 flex-shrink-0 ml-2">সমিতি কোড নং:</span>
                        <span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{d.samity_code || ''}</span>
                    </div>
                    <div className="flex gap-1 items-baseline">
                        <span className="w-36 flex-shrink-0">জাতীয় পরিচয়পত্র নং:</span>
                        <span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{d.nid_number || ''}</span>
                        <span className="w-32 flex-shrink-0 ml-2">সদস্যের মোবাইল নং:</span>
                        <span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{d.member_mobile || ''}</span>
                    </div>
                    <div className="flex gap-1 items-baseline">
                        <span className="w-40 flex-shrink-0">তথ্য প্রদানকারীর নাম:</span>
                        <span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{d.information_provider_name || ''}</span>
                        <span className="w-24 flex-shrink-0 ml-2">মোবাইল নং:</span>
                        <span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{d.information_provider_mobile || ''}</span>
                    </div>
                    <div className="flex gap-1 items-baseline">
                        <span className="w-40 flex-shrink-0">সদস্যের সাথে সম্পর্ক:</span>
                        <span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{d.relationship_with_member || ''}</span>
                    </div>
                </div>
            </div>
            <div className="mb-2">
                <table className="w-full border-collapse border border-gray-600" style={{ fontSize: '9px' }}>
                    <thead>
                        <tr>
                            <th className="border border-gray-600 px-1 py-0.5 w-8">ক্রঃ নং</th>
                            <th className="border border-gray-600 px-1 py-0.5">বিবরণ</th>
                            <th className="border border-gray-600 px-1 py-0.5 w-48">পরিমাণ/সংখ্যা</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="border border-gray-600 px-1 py-0.5 text-center">১</td>
                            <td className="border border-gray-600 px-1 py-0.5">মূল পেশা, পরিবারের লোক সংখ্যা ও উপার্জনকারী সংখ্যা</td>
                            <td className="border border-gray-600 px-1 py-0.5">
                                <div className="space-y-0.5">
                                    <div className="flex gap-1"><span className="w-20">পেশা:</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[10px]">{d.main_profession || ''}</span></div>
                                    <div className="flex gap-1"><span className="w-20">লোক সংখ্যা:</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[10px]">{d.family_members_count ?? ''}</span><span className="w-24 ml-1">উপার্জনকারী:</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[10px]">{d.earning_members_count ?? ''}</span></div>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td className="border border-gray-600 px-1 py-0.5 text-center">২</td>
                            <td className="border border-gray-600 px-1 py-0.5">বিগত দফায় পরিশোধিত ঋণের পরিমাণ ও বর্তমান ঋণের চাহিদা</td>
                            <td className="border border-gray-600 px-1 py-0.5">
                                <div className="space-y-0.5">
                                    <div className="flex gap-1"><span className="w-20">পরিশোধিত:</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[10px]">{d.previous_loan_amount ?? ''}</span></div>
                                    <div className="flex gap-1"><span className="w-20">বর্তমান চাহিদা:</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[10px]">{d.current_loan_demand ?? ''}</span></div>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td className="border border-gray-600 px-1 py-0.5 text-center">৩</td>
                            <td className="border border-gray-600 px-1 py-0.5">নিজস্ব জমির পরিমাণ ও বন্ধকী জমির পরিমান এবং মূল্য</td>
                            <td className="border border-gray-600 px-1 py-0.5">
                                <div className="space-y-0.5">
                                    <div className="flex gap-1"><span className="w-16">নিজস্ব:</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[10px]">{d.own_land_amount || ''}</span></div>
                                    <div className="flex gap-1"><span className="w-16">বন্ধকী:</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[10px]">{d.mortgaged_land_amount || ''}</span></div>
                                    <div className="flex gap-1"><span className="w-16">মূল্য:</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[10px]">{d.land_value ?? ''}</span></div>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td className="border border-gray-600 px-1 py-0.5 text-center">৪</td>
                            <td className="border border-gray-600 px-1 py-0.5">বাড়ীর ধরণ ও ঘরের সংখ্যা (টিক চিহ্ন দিন)</td>
                            <td className="border border-gray-600 px-1 py-0.5">
                                <div className="space-y-0.5">
                                    <div className="flex gap-1"><span className="w-32">ধরণ:</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[10px]">{d.house_type || ''}</span></div>
                                    <div className="flex gap-1"><span className="w-32">ছাপড়া/টিন/মাটি/পাকা-ঘরের সংখ্যা:</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[10px]">{d.room_count ?? ''}</span></div>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td className="border border-gray-600 px-1 py-0.5 text-center">৫</td>
                            <td className="border border-gray-600 px-1 py-0.5">নিজস্ব টিউবওয়েল ও স্বাস্থ্যসম্মত পায়খানা আছে কি-না (টিক চিহ্ন দিন)</td>
                            <td className="border border-gray-600 px-1 py-0.5">
                                <div className="space-y-0.5">
                                    <div className="flex gap-2 items-center">
                                        <span>টিউবওয়েল-</span>
                                        <span className="border border-gray-600 w-3 h-3 inline-block">{d.has_tubewell ? '✓' : ''}</span><span>হ্যাঁ</span>
                                        <span className="border border-gray-600 w-3 h-3 inline-block ml-2">{!d.has_tubewell ? '✓' : ''}</span><span>না</span>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        <span>স্বাস্থ্যসম্মত পায়খানা-</span>
                                        <span className="border border-gray-600 w-3 h-3 inline-block">{d.has_latrine ? '✓' : ''}</span><span>হ্যাঁ</span>
                                        <span className="border border-gray-600 w-3 h-3 inline-block ml-2">{!d.has_latrine ? '✓' : ''}</span><span>না</span>
                                    </div>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td className="border border-gray-600 px-1 py-0.5 text-center">৬</td>
                            <td className="border border-gray-600 px-1 py-0.5">গবাদি পশুর সংখ্যা (গরু, মহিষ, ছাগল, ভেড়া ইত্যাদি)</td>
                            <td className="border border-gray-600 px-1 py-0.5">
                                <div className="grid grid-cols-3 gap-1">
                                    <div className="flex gap-1"><span className="w-12">গরু-</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[10px]">{d.cow_count ?? ''}</span></div>
                                    <div className="flex gap-1"><span className="w-12">মহিষ-</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[10px]">{d.buffalo_count ?? ''}</span></div>
                                    <div className="flex gap-1"><span className="w-12">ছাগল-</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[10px]">{d.goat_count ?? ''}</span></div>
                                    <div className="flex gap-1"><span className="w-12">ভেড়া-</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[10px]">{d.sheep_count ?? ''}</span></div>
                                    <div className="flex gap-1"><span className="w-16">হাঁস-মুরগী-</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[10px]">{d.duck_chicken_count ?? ''}</span></div>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td className="border border-gray-600 px-1 py-0.5 text-center">৭</td>
                            <td className="border border-gray-600 px-1 py-0.5">স্কুলে/কলেজে পড়ে এমন ছেলে-মেয়ের সংখ্যা</td>
                            <td className="border border-gray-600 px-1 py-0.5">
                                <div className="grid grid-cols-3 gap-1">
                                    <div className="flex gap-1"><span className="w-20">প্রাথমিক স্কুল-</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[10px]">{d.primary_school_count ?? ''}</span></div>
                                    <div className="flex gap-1"><span className="w-20">মাধ্যমিক স্কুল-</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[10px]">{d.secondary_school_count ?? ''}</span></div>
                                    <div className="flex gap-1"><span className="w-16">কলেজ-</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[10px]">{d.college_count ?? ''}</span></div>
                                    <div className="flex gap-1"><span className="w-16">মাদ্রাসা-</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[10px]">{d.madrasah_count ?? ''}</span></div>
                                    <div className="flex gap-1"><span className="w-20">বিশ্ববিদ্যালয়-</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[10px]">{d.university_count ?? ''}</span></div>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td className="border border-gray-600 px-1 py-0.5 text-center">৮</td>
                            <td className="border border-gray-600 px-1 py-0.5">সাধারণ সঞ্চয় (দফা ও পরিমাণ)</td>
                            <td className="border border-gray-600 px-1 py-0.5">
                                <div className="space-y-0.5">
                                    <div className="flex gap-1"><span className="w-28">ঋণের দফা:</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[10px]">{dofaLabel(d.loan_round)}</span></div>
                                    <div className="flex gap-1"><span className="w-28">সাধারণ সঞ্চয় পরিমাণ (৳):</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[10px]">{d.general_savings_amount ?? d.savings_amount ?? ''}</span></div>
                                    <div className="flex gap-1"><span className="w-28">সঞ্চয়ের বিপরিতে:</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[10px]">{d.is_against_savings ? 'হ্যাঁ' : 'না'}</span></div>
                                    {d.is_against_savings && (
                                        <>
                                            <div className="flex gap-1"><span className="w-28">বিপরিতে সঞ্চয় পরিমাণ (৳):</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[10px]">{d.against_savings_amount ?? ''}</span></div>
                                        </>
                                    )}
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td className="border border-gray-600 px-1 py-0.5 text-center">৯</td>
                            <td className="border border-gray-600 px-1 py-0.5">সদস্যের বাড়ী চেনার নির্দেশনা</td>
                            <td className="border border-gray-600 px-1 py-0.5"><div className="border-b border-dotted border-gray-600 min-h-[30px]">{d.house_identification || ''}</div></td>
                        </tr>
                        <tr>
                            <td className="border border-gray-600 px-1 py-0.5 text-center">১০</td>
                            <td className="border border-gray-600 px-1 py-0.5">অন্যান্য সংস্থা হতে ঋণ গ্রহণের তথ্য</td>
                            <td className="border border-gray-600 px-1 py-0.5"><div className="border-b border-dotted border-gray-600 min-h-[30px]">{d.other_organization_loans || ''}</div></td>
                        </tr>
                        <tr>
                            <td className="border border-gray-600 px-1 py-0.5 text-center">১১</td>
                            <td className="border border-gray-600 px-1 py-0.5">বিগত দফার পরিশোধের ধরণ (টিক চিহ্ন দিন)</td>
                            <td className="border border-gray-600 px-1 py-0.5">
                                <div className="space-y-0.5">
                                    <div className="flex gap-2 items-center"><span className="border border-gray-600 w-3 h-3 inline-block">{d.previous_repayment_type === 'installment' ? '✓' : ''}</span><span>কিস্তিতে পরিশোধ করেছেন</span></div>
                                    <div className="flex gap-2 items-center"><span className="border border-gray-600 w-3 h-3 inline-block">{d.previous_repayment_type === 'savings_adjustment' ? '✓' : ''}</span><span>সঞ্চয়ের সাথে সমন্বয় করেছেন</span></div>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td className="border border-gray-600 px-1 py-0.5 text-center">১২</td>
                            <td className="border border-gray-600 px-1 py-0.5">গত ৬ মাসে/১ বছরে কতবার সঞ্চয় খেলাপী করেছেন</td>
                            <td className="border border-gray-600 px-1 py-0.5">
                                <div className="space-y-0.5">
                                    <div className="flex gap-1"><span className="w-20">সাধারণ:</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[10px]">{d.general_savings_default_count ?? ''}</span></div>
                                    <div className="flex gap-1"><span className="w-20">আপদকালীন:</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[10px]">{d.emergency_savings_default_count ?? ''}</span></div>
                                    <div className="flex gap-1"><span className="w-20">মেয়াদী:</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[10px]">{d.term_savings_default_count ?? ''}</span></div>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td className="border border-gray-600 px-1 py-0.5 text-center">১৩</td>
                            <td className="border border-gray-600 px-1 py-0.5">বর্তমানে সদস্যের মেয়াদী সঞ্চয়ের কয়টি কিস্তি বাঁকী আছে</td>
                            <td className="border border-gray-600 px-1 py-0.5">
                                <div className="space-y-0.5">
                                    <div className="flex gap-1"><span className="w-24">কিস্তি সংখ্যা:</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[10px]">{d.term_savings_due_installments ?? ''}</span></div>
                                    <div className="flex gap-1"><span className="w-24">টাকার পরিমাণ:</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[10px]">{d.term_savings_due_amount ?? ''}</span></div>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div className="mb-2 flex gap-4" style={{ fontSize: '10px' }}>
                <div className="flex gap-1 items-baseline">
                    <span className="w-40">সরেজমিনে পরিদর্শনের তারিখ:</span>
                    <span className="border-b border-dotted border-gray-600 flex-1 min-w-[100px]">{formatDateBangla(d.field_visit_date) || ''}</span>
                </div>
                <div className="flex gap-1 items-baseline">
                    <span className="w-32">ঋণ প্রদানের তারিখ:</span>
                    <span className="border-b border-dotted border-gray-600 flex-1 min-w-[100px]">{formatDateBangla(d.loan_disbursement_date) || ''}</span>
                </div>
            </div>
            <div className="mb-2" style={{ fontSize: '10px' }}>
                <p className="font-bold mb-0.5">মন্তব্য:</p>
                <div className="border border-gray-600 min-h-[40px] p-1">{d.comments || ''}</div>
            </div>
            <div className="flex gap-4 mt-2" style={{ fontSize: '10px' }}>
                <div className="flex-1">
                    <p className="mb-0.5">সদস্য/তথ্য প্রদানকারীর স্বাক্ষর:</p>
                    <div className="border-b border-dotted border-gray-600 h-6">
                        {d.member_signature && <img src={d.member_signature} alt="Signature" className="h-5 object-contain" />}
                    </div>
                </div>
                <div className="flex-1">
                    <p className="mb-0.5">শাখা ব্যবস্থাপকের স্বাক্ষর ও সিল:</p>
                    <div className="border-b border-dotted border-gray-600 h-6">
                        {d.branch_manager_signature && <img src={d.branch_manager_signature} alt="Signature" className="h-5 object-contain" />}
                    </div>
                </div>
            </div>
            <p className="text-center mt-2 text-[9px] italic">নোট: প্রতিবেদনটি ঋণ আবেদনের সাথে সংযুক্ত করে সংরক্ষণ করতে হবে।</p>
        </div>
    );
}

function formSelectionUrl(isLegacy: boolean, member: any, loanProduct: any, loanCategory: any, requestedAmount: number) {
    const params = new URLSearchParams({ loan_product_id: String(loanProduct.id), loan_category_id: String(loanCategory.id), requested_amount: String(requestedAmount) });
    if (isLegacy) params.set('legacy', '1'); else params.set('member_id', String(member?.id ?? ''));
    return `/member/loan-applications/form-selection?${params.toString()}`;
}

export default function FieldInvestigation({
    member,
    loanProduct,
    loanCategory,
    savingsProducts = [],
    loanRound = 1,
    requestedAmount,
    branch,
    existingApplication,
    savedData,
    onlyPreview,
    isLegacy = false,
}: Props) {
    if (onlyPreview && savedData) {
        return (
            <div className="print-container">
                {renderFieldInvestigationPreviewContent(savedData)}
            </div>
        );
    }
    
    const [showPreview, setShowPreview] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const { data, setData, processing } = useForm<FieldInvestigationData>({
        branch_name: branch?.name || '',
        branch_address: branch?.address || '',
        field_visit_date: new Date().toISOString().split('T')[0],
        loan_disbursement_date: '',
        member_name: member?.applicant_name_bn || member?.applicant_name_en || '',
        member_no: member?.application_no || '',
        samity_name: member?.samity?.samity_name_bn || member?.samity?.samity_name || '',
        samity_code: member?.samity?.samity_code || member?.samity?.id?.toString() || '',
        nid_number: member?.nid_number || '',
        member_mobile: member?.mobile_number || '',
        information_provider_name: '',
        information_provider_mobile: '',
        relationship_with_member: '',
        main_profession: '',
        family_members_count: 0,
        earning_members_count: 0,
        previous_loan_amount: 0,
        current_loan_demand: requestedAmount || 0,
        own_land_amount: '',
        mortgaged_land_amount: '',
        land_value: 0,
        house_type: '',
        room_count: 0,
        has_tubewell: false,
        has_latrine: false,
        cow_count: 0,
        buffalo_count: 0,
        goat_count: 0,
        sheep_count: 0,
        duck_chicken_count: 0,
        primary_school_count: 0,
        secondary_school_count: 0,
        college_count: 0,
        madrasah_count: 0,
        university_count: 0,
        savings_amount: 0,
        house_identification: '',
        other_organization_loans: '',
        previous_repayment_type: '',
        general_savings_default_count: 0,
        emergency_savings_default_count: 0,
        term_savings_default_count: 0,
        term_savings_due_installments: 0,
        term_savings_due_amount: 0,
        comments: '',
        member_signature: null,
        branch_manager_signature: null,
        general_savings_product_id: null,
        general_savings_amount: 0,
        is_against_savings: false,
        against_savings_product_id: null,
        against_savings_amount: 0,
        loan_round: loanRound,
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
            '/member/loan-applications/forms/field-investigation/save-draft',
            payload,
            {
                onSuccess: () => {
                    alert('সরেজমিনে তদন্ত প্রতিবেদন ড্রাফট হিসেবে সংরক্ষিত হয়েছে।');
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
            <Head title="সরেজমিনে তদন্ত প্রতিবেদন">
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
                                <h2 className="text-lg font-bold">সমিতিতে ঋণ আবেদন অনুযায়ী শাখা ব্যবস্থাপক কর্তৃক সদস্যের বাড়ি সরেজমিনে তদন্ত প্রতিবেদন</h2>
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
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">শাখার নাম</label>
                                    <input
                                        type="text"
                                        value={data.branch_name}
                                        onChange={(e) => setData('branch_name', e.target.value)}
                                        className="w-full border rounded px-3 py-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">শাখার ঠিকানা</label>
                                    <input
                                        type="text"
                                        value={data.branch_address}
                                        onChange={(e) => setData('branch_address', e.target.value)}
                                        className="w-full border rounded px-3 py-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">সরেজমিনে পরিদর্শনের তারিখ</label>
                                    <input
                                        type="date"
                                        value={data.field_visit_date}
                                        onChange={(e) => setData('field_visit_date', e.target.value)}
                                        className="w-full border rounded px-3 py-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">ঋণ প্রদানের তারিখ</label>
                                    <input
                                        type="date"
                                        value={data.loan_disbursement_date}
                                        onChange={(e) => setData('loan_disbursement_date', e.target.value)}
                                        className="w-full border rounded px-3 py-2"
                                    />
                                </div>
                            </div>

                            {/* Member Info */}
                            <div className="border-t pt-4">
                                <h3 className="font-semibold mb-4">সদস্যের তথ্য</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">সদস্য নাম</label>
                                        <input
                                            type="text"
                                            value={data.member_name}
                                            onChange={(e) => setData('member_name', e.target.value)}
                                            className="w-full border rounded px-3 py-2"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">সদস্য নং</label>
                                        <input
                                            type="text"
                                            value={data.member_no}
                                            onChange={(e) => setData('member_no', e.target.value)}
                                            className="w-full border rounded px-3 py-2"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">সমিতির নাম</label>
                                        <input
                                            type="text"
                                            value={data.samity_name}
                                            onChange={(e) => setData('samity_name', e.target.value)}
                                            className="w-full border rounded px-3 py-2"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">সমিতি কোড নং</label>
                                        <input
                                            type="text"
                                            value={data.samity_code}
                                            onChange={(e) => setData('samity_code', e.target.value)}
                                            className="w-full border rounded px-3 py-2"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">জাতীয় পরিচয়পত্র নং</label>
                                        <input
                                            type="text"
                                            value={data.nid_number}
                                            onChange={(e) => setData('nid_number', e.target.value)}
                                            className="w-full border rounded px-3 py-2"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">সদস্যের মোবাইল নং</label>
                                        <input
                                            type="text"
                                            value={data.member_mobile}
                                            onChange={(e) => setData('member_mobile', e.target.value)}
                                            className="w-full border rounded px-3 py-2"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Information Provider */}
                            <div className="border-t pt-4">
                                <h3 className="font-semibold mb-4">তথ্য প্রদানকারীর তথ্য</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">তথ্য প্রদানকারীর নাম</label>
                                        <input
                                            type="text"
                                            value={data.information_provider_name}
                                            onChange={(e) => setData('information_provider_name', e.target.value)}
                                            className="w-full border rounded px-3 py-2"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">মোবাইল নং</label>
                                        <input
                                            type="text"
                                            value={data.information_provider_mobile}
                                            onChange={(e) => setData('information_provider_mobile', e.target.value)}
                                            className="w-full border rounded px-3 py-2"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium mb-1">সদস্যের সাথে সম্পর্ক</label>
                                        <input
                                            type="text"
                                            value={data.relationship_with_member}
                                            onChange={(e) => setData('relationship_with_member', e.target.value)}
                                            className="w-full border rounded px-3 py-2"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Table Data */}
                            <div className="border-t pt-4">
                                <h3 className="font-semibold mb-4">তদন্ত তথ্য</h3>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">মূল পেশা</label>
                                            <input
                                                type="text"
                                                value={data.main_profession}
                                                onChange={(e) => setData('main_profession', e.target.value)}
                                                className="w-full border rounded px-3 py-2"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">পরিবারের লোক সংখ্যা</label>
                                            <input
                                                type="number"
                                                value={data.family_members_count}
                                                onChange={(e) => setData('family_members_count', parseInt(e.target.value) || 0)}
                                                className="w-full border rounded px-3 py-2"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">উপার্জনকারী সংখ্যা</label>
                                            <input
                                                type="number"
                                                value={data.earning_members_count}
                                                onChange={(e) => setData('earning_members_count', parseInt(e.target.value) || 0)}
                                                className="w-full border rounded px-3 py-2"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">বিগত দফায় পরিশোধিত ঋণের পরিমাণ</label>
                                            <input
                                                type="number"
                                                value={data.previous_loan_amount}
                                                onChange={(e) => setData('previous_loan_amount', parseFloat(e.target.value) || 0)}
                                                className="w-full border rounded px-3 py-2"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">বর্তমান ঋণের চাহিদা</label>
                                            <input
                                                type="number"
                                                value={data.current_loan_demand}
                                                onChange={(e) => setData('current_loan_demand', parseFloat(e.target.value) || 0)}
                                                className="w-full border rounded px-3 py-2"
                                            />
                                        </div>
                                    </div>

                                    {/* Land Info */}
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">নিজস্ব জমির পরিমাণ</label>
                                            <input
                                                type="text"
                                                value={data.own_land_amount}
                                                onChange={(e) => setData('own_land_amount', e.target.value)}
                                                className="w-full border rounded px-3 py-2"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">বন্ধকী জমির পরিমাণ</label>
                                            <input
                                                type="text"
                                                value={data.mortgaged_land_amount}
                                                onChange={(e) => setData('mortgaged_land_amount', e.target.value)}
                                                className="w-full border rounded px-3 py-2"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">জমির মূল্য</label>
                                            <input
                                                type="number"
                                                value={data.land_value}
                                                onChange={(e) => setData('land_value', parseFloat(e.target.value) || 0)}
                                                className="w-full border rounded px-3 py-2"
                                            />
                                        </div>
                                    </div>

                                    {/* House Info */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">বাড়ীর ধরণ</label>
                                            <input
                                                type="text"
                                                value={data.house_type}
                                                onChange={(e) => setData('house_type', e.target.value)}
                                                className="w-full border rounded px-3 py-2"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">ঘরের সংখ্যা</label>
                                            <input
                                                type="number"
                                                value={data.room_count}
                                                onChange={(e) => setData('room_count', parseInt(e.target.value) || 0)}
                                                className="w-full border rounded px-3 py-2"
                                            />
                                        </div>
                                        <div>
                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={data.has_tubewell}
                                                    onChange={(e) => setData('has_tubewell', e.target.checked)}
                                                    className="w-4 h-4"
                                                />
                                                <span>নিজস্ব টিউবওয়েল আছে</span>
                                            </label>
                                        </div>
                                        <div>
                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={data.has_latrine}
                                                    onChange={(e) => setData('has_latrine', e.target.checked)}
                                                    className="w-4 h-4"
                                                />
                                                <span>স্বাস্থ্যসম্মত পায়খানা আছে</span>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Livestock */}
                                    <div className="grid grid-cols-5 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">গরু</label>
                                            <input
                                                type="number"
                                                value={data.cow_count}
                                                onChange={(e) => setData('cow_count', parseInt(e.target.value) || 0)}
                                                className="w-full border rounded px-3 py-2"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">মহিষ</label>
                                            <input
                                                type="number"
                                                value={data.buffalo_count}
                                                onChange={(e) => setData('buffalo_count', parseInt(e.target.value) || 0)}
                                                className="w-full border rounded px-3 py-2"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">ছাগল</label>
                                            <input
                                                type="number"
                                                value={data.goat_count}
                                                onChange={(e) => setData('goat_count', parseInt(e.target.value) || 0)}
                                                className="w-full border rounded px-3 py-2"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">ভেড়া</label>
                                            <input
                                                type="number"
                                                value={data.sheep_count}
                                                onChange={(e) => setData('sheep_count', parseInt(e.target.value) || 0)}
                                                className="w-full border rounded px-3 py-2"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">হাঁস-মুরগী</label>
                                            <input
                                                type="number"
                                                value={data.duck_chicken_count}
                                                onChange={(e) => setData('duck_chicken_count', parseInt(e.target.value) || 0)}
                                                className="w-full border rounded px-3 py-2"
                                            />
                                        </div>
                                    </div>

                                    {/* Education */}
                                    <div className="grid grid-cols-5 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">প্রাথমিক স্কুল</label>
                                            <input
                                                type="number"
                                                value={data.primary_school_count}
                                                onChange={(e) => setData('primary_school_count', parseInt(e.target.value) || 0)}
                                                className="w-full border rounded px-3 py-2"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">মাধ্যমিক স্কুল</label>
                                            <input
                                                type="number"
                                                value={data.secondary_school_count}
                                                onChange={(e) => setData('secondary_school_count', parseInt(e.target.value) || 0)}
                                                className="w-full border rounded px-3 py-2"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">কলেজ</label>
                                            <input
                                                type="number"
                                                value={data.college_count}
                                                onChange={(e) => setData('college_count', parseInt(e.target.value) || 0)}
                                                className="w-full border rounded px-3 py-2"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">মাদ্রাসা</label>
                                            <input
                                                type="number"
                                                value={data.madrasah_count}
                                                onChange={(e) => setData('madrasah_count', parseInt(e.target.value) || 0)}
                                                className="w-full border rounded px-3 py-2"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">বিশ্ববিদ্যালয়</label>
                                            <input
                                                type="number"
                                                value={data.university_count}
                                                onChange={(e) => setData('university_count', parseInt(e.target.value) || 0)}
                                                className="w-full border rounded px-3 py-2"
                                            />
                                        </div>
                                    </div>

                                    {/* Savings Information: সাধারণ সঞ্চয় (G.Savings 21.01 + দফা অনুযায়ী %) */}
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
                                                setData(key as any, value);
                                                if (key === 'general_savings_amount' && (typeof value === 'number' || value === '')) {
                                                    setData('savings_amount', typeof value === 'number' ? value : 0);
                                                }
                                            }}
                                            errors={errors}
                                        />
                                    </div>

                                    {/* Other Fields */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">বিগত দফার পরিশোধের ধরণ</label>
                                            <select
                                                value={data.previous_repayment_type}
                                                onChange={(e) => setData('previous_repayment_type', e.target.value)}
                                                className="w-full border rounded px-3 py-2"
                                            >
                                                <option value="">নির্বাচন করুন</option>
                                                <option value="installment">কিস্তিতে পরিশোধ করেছেন</option>
                                                <option value="savings_adjustment">সঞ্চয়ের সাথে সমন্বয় করেছেন</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">সদস্যের বাড়ী চেনার নির্দেশনা</label>
                                        <textarea
                                            value={data.house_identification}
                                            onChange={(e) => setData('house_identification', e.target.value)}
                                            className="w-full border rounded px-3 py-2"
                                            rows={3}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">অন্যান্য সংস্থা হতে ঋণ গ্রহণের তথ্য</label>
                                        <textarea
                                            value={data.other_organization_loans}
                                            onChange={(e) => setData('other_organization_loans', e.target.value)}
                                            className="w-full border rounded px-3 py-2"
                                            rows={3}
                                        />
                                    </div>

                                    {/* Savings Default */}
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">সাধারণ সঞ্চয় খেলাপী</label>
                                            <input
                                                type="number"
                                                value={data.general_savings_default_count}
                                                onChange={(e) => setData('general_savings_default_count', parseInt(e.target.value) || 0)}
                                                className="w-full border rounded px-3 py-2"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">আপদকালীন সঞ্চয় খেলাপী</label>
                                            <input
                                                type="number"
                                                value={data.emergency_savings_default_count}
                                                onChange={(e) => setData('emergency_savings_default_count', parseInt(e.target.value) || 0)}
                                                className="w-full border rounded px-3 py-2"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">মেয়াদী সঞ্চয় খেলাপী</label>
                                            <input
                                                type="number"
                                                value={data.term_savings_default_count}
                                                onChange={(e) => setData('term_savings_default_count', parseInt(e.target.value) || 0)}
                                                className="w-full border rounded px-3 py-2"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">মেয়াদী সঞ্চয় বাঁকী কিস্তি</label>
                                            <input
                                                type="number"
                                                value={data.term_savings_due_installments}
                                                onChange={(e) => setData('term_savings_due_installments', parseInt(e.target.value) || 0)}
                                                className="w-full border rounded px-3 py-2"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">মেয়াদী সঞ্চয় বাঁকী টাকা</label>
                                            <input
                                                type="number"
                                                value={data.term_savings_due_amount}
                                                onChange={(e) => setData('term_savings_due_amount', parseFloat(e.target.value) || 0)}
                                                className="w-full border rounded px-3 py-2"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">মন্তব্য</label>
                                        <textarea
                                            value={data.comments}
                                            onChange={(e) => setData('comments', e.target.value)}
                                            className="w-full border rounded px-3 py-2"
                                            rows={4}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Signatures */}
                            <div className="border-t pt-4">
                                <h3 className="font-semibold mb-4">স্বাক্ষর</h3>
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">সদস্য/তথ্য প্রদানকারীর স্বাক্ষর</label>
                                        {data.member_signature ? (
                                            <div className="relative">
                                                <img src={data.member_signature} alt="Signature" className="w-full h-32 object-contain border rounded" />
                                                <button
                                                    onClick={() => removeImage('member_signature')}
                                                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="border-2 border-dashed rounded p-4 text-center">
                                                <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => handleImageUpload('member_signature', e.target.files?.[0] || null)}
                                                    className="hidden"
                                                    id="member_signature"
                                                />
                                                <label htmlFor="member_signature" className="cursor-pointer text-sm text-blue-600">
                                                    স্বাক্ষর আপলোড করুন
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">শাখা ব্যবস্থাপকের স্বাক্ষর ও সিল</label>
                                        {data.branch_manager_signature ? (
                                            <div className="relative">
                                                <img src={data.branch_manager_signature} alt="Signature" className="w-full h-32 object-contain border rounded" />
                                                <button
                                                    onClick={() => removeImage('branch_manager_signature')}
                                                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="border-2 border-dashed rounded p-4 text-center">
                                                <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => handleImageUpload('branch_manager_signature', e.target.files?.[0] || null)}
                                                    className="hidden"
                                                    id="branch_manager_signature"
                                                />
                                                <label htmlFor="branch_manager_signature" className="cursor-pointer text-sm text-blue-600">
                                                    স্বাক্ষর আপলোড করুন
                                                </label>
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
                                {renderFieldInvestigationPreviewContent(data)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
