import { useEffect, useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { formatDateBangla } from '@/utils/dateUtils';
import { Save, Printer, Eye, ArrowLeft, ClipboardList } from 'lucide-react';
import GeneralSavingsSection, { getRequiredSavingsPercent } from '@/components/LoanApplications/GeneralSavingsSection';
import { afterLoanFormSaveUrl } from '@/utils/loanFormNavigation';
import { useAutoFitPrint, triggerPrintWithAutoFit } from '@/hooks/useAutoFitPrint';

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

/** NID or Smart Card from member admission (whichever is filled) */
function resolveMemberIdentityNumber(member: any): string {
    const candidates = [
        member?.nid_number,
        member?.nid_no,
        member?.national_id,
        member?.smart_card_number,
        member?.smart_card_no,
        member?.smartcard_number,
    ];
    for (const v of candidates) {
        if (v != null && String(v).trim() !== '') return String(v).trim();
    }
    return '';
}

/** Module-level: full preview with given data (for onlyPreview on Show page) */
export function FieldInvestigationPrintView({ formData }: { formData: any }) {
    useAutoFitPrint([formData], '.print-container');
    return renderFieldInvestigationPreviewContent(formData);
}

function renderFieldInvestigationPreviewContent(formData: any) {
    const d = formData || {};
    return (
        <div
            className="print-page-sheet bg-white border border-gray-300 p-6 print:p-0 print:border-none text-[13px] print:text-[12.5px] leading-snug"
            style={{ fontFamily: 'Kalpurush, Arial, sans-serif', color: '#000' }}
        >
            <div className="print-page-content flex flex-col justify-between h-full">
                <div>
                    {/* Header */}
                    <div className="flex flex-col items-center justify-center mb-2 border-b-2 border-gray-400 pb-1.5">
                        <div className="flex items-center justify-center gap-3 mb-0.5">
                            <img src="/logo.png" alt="Logo" className="h-14 w-14 object-contain print:h-14 print:w-14" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            <div className="text-center">
                                <h1 className="text-lg font-bold leading-tight print:text-lg">মৌসুমী</h1>
                                <p className="text-xs leading-tight print:text-[11px]">{d.branch_address}</p>
                                <p className="text-xs leading-tight print:text-[11px]">ঋণ কর্মসূচি</p>
                            </div>
                        </div>
                    </div>
                    <h2 className="text-center font-bold mb-2 print:mb-1.5 text-[13.5px] print:text-[13px]">
                        <span>সমিতিতে ঋণ আবেদন অনুযায়ী শাখা ব্যবস্থাপক কর্তৃক সদস্যের বাড়ি সরেজমিনে তদন্ত প্রতিবেদন</span>
                    </h2>
                    
                    {/* Member and Informant Info */}
                    <div className="mb-2 text-[13px] print:text-[12.5px] space-y-1">
                        <div className="flex gap-1 items-baseline">
                            <span className="w-32 flex-shrink-0">সদস্যের নাম:</span>
                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[14px] font-semibold">{d.member_name || ''}</span>
                            <span className="w-24 flex-shrink-0 ml-2">সদস্য নং:</span>
                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[14px] font-semibold">{d.member_no || ''}</span>
                        </div>
                        <div className="flex gap-1 items-baseline">
                            <span className="w-32 flex-shrink-0">সমিতির নাম:</span>
                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[14px]">{d.samity_name || ''}</span>
                            <span className="w-28 flex-shrink-0 ml-2">সমিতি কোড নং:</span>
                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[14px]">{d.samity_code || ''}</span>
                        </div>
                        <div className="flex gap-1 items-baseline">
                            <span className="w-40 flex-shrink-0">NID / স্মার্ট কার্ড নং:</span>
                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[14px] font-mono text-[12px]">{d.nid_number || ''}</span>
                            <span className="w-32 flex-shrink-0 ml-2">মোবাইল নং:</span>
                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[14px] font-mono text-[12px]">{d.member_mobile || ''}</span>
                        </div>
                        <div className="flex gap-1 items-baseline">
                            <span className="w-40 flex-shrink-0">তথ্য প্রদানকারীর নাম:</span>
                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[14px]">{d.information_provider_name || ''}</span>
                            <span className="w-24 flex-shrink-0 ml-2">মোবাইল নং:</span>
                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[14px] font-mono text-[12px]">{d.information_provider_mobile || ''}</span>
                        </div>
                        <div className="flex gap-1 items-baseline">
                            <span className="w-40 flex-shrink-0">সদস্যের সাথে সম্পর্ক:</span>
                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[14px]">{d.relationship_with_member || ''}</span>
                        </div>
                    </div>

                    {/* 13-row Investigation Table */}
                    <div className="mb-2">
                        <table className="w-full border-collapse border border-gray-600 text-[12px] print:text-[11.5px]">
                            <thead>
                                <tr className="bg-gray-50 font-semibold">
                                    <th className="border border-gray-600 px-1.5 py-1 w-8 text-center">ক্রঃ</th>
                                    <th className="border border-gray-600 px-1.5 py-1 text-left">বিবরণ</th>
                                    <th className="border border-gray-600 px-1.5 py-1 w-64">পরিমাণ/সংখ্যা</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="border border-gray-600 px-1.5 py-0.5 text-center font-bold">১</td>
                                    <td className="border border-gray-600 px-1.5 py-0.5">মূল পেশা, পরিবারের লোক সংখ্যা ও উপার্জনকারী সংখ্যা</td>
                                    <td className="border border-gray-600 px-1.5 py-0.5">
                                        <div className="space-y-0.5">
                                            <div className="flex gap-1"><span className="w-16">পেশা:</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{d.main_profession || ''}</span></div>
                                            <div className="flex gap-1"><span className="w-16">লোক সংখ্যা:</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{d.family_members_count ?? ''}</span><span className="w-20 ml-1">উপার্জনকারী:</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{d.earning_members_count ?? ''}</span></div>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border border-gray-600 px-1.5 py-0.5 text-center font-bold">২</td>
                                    <td className="border border-gray-600 px-1.5 py-0.5">বিগত দফায় পরিশোধিত ঋণের পরিমাণ ও বর্তমান ঋণের চাহিদা</td>
                                    <td className="border border-gray-600 px-1.5 py-0.5">
                                        <div className="space-y-0.5">
                                            <div className="flex gap-1"><span className="w-16">পরিশোধিত:</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{d.previous_loan_amount ?? ''}</span></div>
                                            <div className="flex gap-1"><span className="w-16">বর্তমান চাহিদা:</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px] font-semibold">{d.current_loan_demand ?? ''}</span></div>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border border-gray-600 px-1.5 py-0.5 text-center font-bold">৩</td>
                                    <td className="border border-gray-600 px-1.5 py-0.5">নিজস্ব জমির পরিমাণ ও বন্ধকী জমির পরিমান এবং মূল্য</td>
                                    <td className="border border-gray-600 px-1.5 py-0.5">
                                        <div className="space-y-0.5">
                                            <div className="flex gap-1"><span className="w-14">নিজস্ব:</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{d.own_land_amount || ''}</span></div>
                                            <div className="flex gap-1"><span className="w-14">বন্ধকী:</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{d.mortgaged_land_amount || ''}</span></div>
                                            <div className="flex gap-1"><span className="w-14">মূল্য:</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{d.land_value ?? ''}</span></div>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border border-gray-600 px-1.5 py-0.5 text-center font-bold">৪</td>
                                    <td className="border border-gray-600 px-1.5 py-0.5">বাড়ীর ধরণ ও ঘরের সংখ্যা (টিক চিহ্ন দিন)</td>
                                    <td className="border border-gray-600 px-1.5 py-0.5">
                                        <div className="space-y-0.5">
                                            <div className="flex gap-1"><span className="w-28">ধরণ:</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{d.house_type || ''}</span></div>
                                            <div className="flex gap-1"><span className="w-28">ঘরের সংখ্যা:</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{d.room_count ?? ''}</span></div>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border border-gray-600 px-1.5 py-0.5 text-center font-bold">৫</td>
                                    <td className="border border-gray-600 px-1.5 py-0.5">টিউবওয়েল ও স্বাস্থ্যসম্মত পায়খানা আছে কি-না</td>
                                    <td className="border border-gray-600 px-1.5 py-0.5">
                                        <div className="space-y-0.5">
                                            <div className="flex gap-2 items-center">
                                                <span>টিউবওয়েল:</span>
                                                <span className="border border-gray-600 w-3.5 h-3.5 inline-flex items-center justify-center text-[11px]">{d.has_tubewell ? '✓' : ''}</span><span>হ্যাঁ</span>
                                                <span className="border border-gray-600 w-3.5 h-3.5 inline-flex items-center justify-center text-[11px] ml-1">{!d.has_tubewell ? '✓' : ''}</span><span>না</span>
                                            </div>
                                            <div className="flex gap-2 items-center">
                                                <span>স্বাস্থ্যসম্মত পায়খানা:</span>
                                                <span className="border border-gray-600 w-3.5 h-3.5 inline-flex items-center justify-center text-[11px]">{d.has_latrine ? '✓' : ''}</span><span>হ্যাঁ</span>
                                                <span className="border border-gray-600 w-3.5 h-3.5 inline-flex items-center justify-center text-[11px] ml-1">{!d.has_latrine ? '✓' : ''}</span><span>না</span>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border border-gray-600 px-1.5 py-0.5 text-center font-bold">৬</td>
                                    <td className="border border-gray-600 px-1.5 py-0.5">গবাদি পশুর সংখ্যা (গরু, মহিষ, ছাগল, হাঁস-মুরগী)</td>
                                    <td className="border border-gray-600 px-1.5 py-0.5">
                                        <div className="grid grid-cols-3 gap-1">
                                            <div className="flex gap-1"><span className="w-10">গরু-</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{d.cow_count ?? ''}</span></div>
                                            <div className="flex gap-1"><span className="w-10">মহিষ-</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{d.buffalo_count ?? ''}</span></div>
                                            <div className="flex gap-1"><span className="w-10">ছাগল-</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{d.goat_count ?? ''}</span></div>
                                            <div className="flex gap-1"><span className="w-10">ভেড়া-</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{d.sheep_count ?? ''}</span></div>
                                            <div className="flex gap-1 col-span-2"><span className="w-16">হাঁস-মুরগী-</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{d.duck_chicken_count ?? ''}</span></div>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border border-gray-600 px-1.5 py-0.5 text-center font-bold">৭</td>
                                    <td className="border border-gray-600 px-1.5 py-0.5">স্কুলে/কলেজে পড়ে এমন ছেলে-মেয়ের সংখ্যা</td>
                                    <td className="border border-gray-600 px-1.5 py-0.5">
                                        <div className="grid grid-cols-3 gap-1">
                                            <div className="flex gap-1"><span className="w-14">প্রাথমিক-</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{d.primary_school_count ?? ''}</span></div>
                                            <div className="flex gap-1"><span className="w-14">মাধ্যমিক-</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{d.secondary_school_count ?? ''}</span></div>
                                            <div className="flex gap-1"><span className="w-12">কলেজ-</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{d.college_count ?? ''}</span></div>
                                            <div className="flex gap-1"><span className="w-12">মাদ্রাসা-</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{d.madrasah_count ?? ''}</span></div>
                                            <div className="flex gap-1 col-span-2"><span className="w-16">বিশ্ববিদ্যালয়-</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{d.university_count ?? ''}</span></div>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border border-gray-600 px-1.5 py-0.5 text-center font-bold">৮</td>
                                    <td className="border border-gray-600 px-1.5 py-0.5">সাধারণ সঞ্চয় (দফা ও পরিমাণ)</td>
                                    <td className="border border-gray-600 px-1.5 py-0.5">
                                        <div className="space-y-0.5">
                                            <div className="flex gap-1"><span className="w-28">ঋণের দফা:</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{dofaLabel(d.loan_round)}</span></div>
                                            <div className="flex gap-1"><span className="w-28">মোট সঞ্চয়:</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{d.savings_amount ?? ''}</span></div>
                                            <div className="flex gap-1"><span className="w-28">সাধারণ সঞ্চয়:</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{d.general_savings_amount ?? ''}</span></div>
                                            <div className="flex gap-1"><span className="w-28">সঞ্চয়ের বিপরীতে:</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{d.is_against_savings ? 'হ্যাঁ' : 'না'}</span></div>
                                            {d.is_against_savings && (
                                                <div className="flex gap-1"><span className="w-28">বিপরীতে সঞ্চয়:</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{d.against_savings_amount ?? ''}</span></div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border border-gray-600 px-1.5 py-0.5 text-center font-bold">৯</td>
                                    <td className="border border-gray-600 px-1.5 py-0.5">সদস্যের বাড়ী চেনার নির্দেশনা</td>
                                    <td className="border border-gray-600 px-1.5 py-0.5"><div className="border-b border-dotted border-gray-600 min-h-[26px] break-words">{d.house_identification || ''}</div></td>
                                </tr>
                                <tr>
                                    <td className="border border-gray-600 px-1.5 py-0.5 text-center font-bold">১০</td>
                                    <td className="border border-gray-600 px-1.5 py-0.5">অন্যান্য সংস্থা হতে ঋণ গ্রহণের তথ্য</td>
                                    <td className="border border-gray-600 px-1.5 py-0.5"><div className="border-b border-dotted border-gray-600 min-h-[26px] break-words">{d.other_organization_loans || ''}</div></td>
                                </tr>
                                <tr>
                                    <td className="border border-gray-600 px-1.5 py-0.5 text-center font-bold">১১</td>
                                    <td className="border border-gray-600 px-1.5 py-0.5">বিগত দফার পরিশোধের ধরণ (টিক চিহ্ন দিন)</td>
                                    <td className="border border-gray-600 px-1.5 py-0.5">
                                        <div className="space-y-0.5">
                                            <div className="flex gap-2 items-center"><span className="border border-gray-600 w-3.5 h-3.5 inline-flex items-center justify-center text-[11px]">{d.previous_repayment_type === 'installment' ? '✓' : ''}</span><span>কিস্তিতে পরিশোধ করেছেন</span></div>
                                            <div className="flex gap-2 items-center"><span className="border border-gray-600 w-3.5 h-3.5 inline-flex items-center justify-center text-[11px]">{d.previous_repayment_type === 'savings_adjustment' ? '✓' : ''}</span><span>সঞ্চয়ের সাথে সমন্বয় করেছেন</span></div>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border border-gray-600 px-1.5 py-0.5 text-center font-bold">১২</td>
                                    <td className="border border-gray-600 px-1.5 py-0.5">গত ৬ মাসে/১ বছরে কতবার সঞ্চয় খেলাপী করেছেন</td>
                                    <td className="border border-gray-600 px-1.5 py-0.5">
                                        <div className="space-y-0.5">
                                            <div className="flex gap-1"><span className="w-18">সাধারণ:</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{d.general_savings_default_count ?? ''}</span></div>
                                            <div className="flex gap-1"><span className="w-18">আপদকালীন:</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{d.emergency_savings_default_count ?? ''}</span></div>
                                            <div className="flex gap-1"><span className="w-18">মেয়াদী:</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{d.term_savings_default_count ?? ''}</span></div>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border border-gray-600 px-1.5 py-0.5 text-center font-bold">১৩</td>
                                    <td className="border border-gray-600 px-1.5 py-0.5">বর্তমানে সদস্যের মেয়াদী সঞ্চয়ের কয়টি কিস্তি বাকী আছে</td>
                                    <td className="border border-gray-600 px-1.5 py-0.5">
                                        <div className="space-y-0.5">
                                            <div className="flex gap-1"><span className="w-22">কিস্তি সংখ্যা:</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{d.term_savings_due_installments ?? ''}</span></div>
                                            <div className="flex gap-1"><span className="w-22">টাকার পরিমাণ:</span><span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{d.term_savings_due_amount ?? ''}</span></div>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Investigation and Disbursement Dates */}
                    <div className="mb-2 flex gap-6 text-[13px] print:text-[12.5px]">
                        <div className="flex gap-1 items-baseline">
                            <span className="w-40 font-medium">পরিদর্শনের তারিখ:</span>
                            <span className="border-b border-dotted border-gray-600 flex-1 min-w-[90px] font-semibold">{formatDateBangla(d.field_visit_date) || ''}</span>
                        </div>
                        <div className="flex gap-1 items-baseline">
                            <span className="w-36 font-medium">ঋণ প্রদানের তারিখ:</span>
                            <span className="border-b border-dotted border-gray-600 flex-1 min-w-[90px] font-semibold">{formatDateBangla(d.loan_disbursement_date) || ''}</span>
                        </div>
                    </div>

                    {/* Comments Box */}
                    <div className="mb-2 text-[13px] print:text-[12.5px]">
                        <p className="font-bold mb-0.5">মন্তব্য:</p>
                        <div className="border border-gray-600 min-h-[42px] p-2 break-words leading-relaxed text-[12px]">{d.comments || ''}</div>
                    </div>

                    {/* Signatures */}
                    <div className="flex gap-6 mt-3 text-[13px] print:text-[12.5px]">
                        <div className="flex-1 text-center">
                            <div className="border-b border-dotted border-gray-600 h-8 flex items-end justify-center mb-1">
                                {d.member_signature && <img src={d.member_signature} alt="Signature" className="h-7 object-contain" />}
                            </div>
                            <p className="font-semibold">সদস্য/তথ্য প্রদানকারীর স্বাক্ষর</p>
                        </div>
                        <div className="flex-1 text-center">
                            <div className="border-b border-dotted border-gray-600 h-8 flex items-end justify-center mb-1">
                                {d.branch_manager_signature && <img src={d.branch_manager_signature} alt="Signature" className="h-7 object-contain" />}
                            </div>
                            <p className="font-semibold">শাখা ব্যবস্থাপকের স্বাক্ষর ও সিল</p>
                        </div>
                    </div>
                </div>

                {/* Footer Note */}
                <p className="text-center mt-2 text-[11px] text-gray-600 italic">নোট: প্রতিবেদনটি ঋণ আবেদনের সাথে সংযুক্ত করে সংরক্ষণ করতে হবে।</p>
            </div>
        </div>
    );
}

function buildFieldInvestigationDefaults(
    member: any,
    requestedAmount: number,
    branch?: any,
    loanRound = 1,
): FieldInvestigationData {
    return {
        branch_name: branch?.name || '',
        branch_address: branch?.address || '',
        field_visit_date: new Date().toISOString().split('T')[0],
        loan_disbursement_date: '',
        member_name: member?.applicant_name_bn || member?.applicant_name_en || '',
        member_no: member?.application_no || '',
        samity_name: member?.samity?.samity_name_bn || member?.samity?.samity_name || '',
        samity_code: member?.samity?.samity_code || member?.samity?.id?.toString() || '',
        nid_number: resolveMemberIdentityNumber(member),
        member_mobile: member?.mobile_number || '',
        information_provider_name: '',
        information_provider_mobile: '',
        relationship_with_member: '',
        main_profession: member?.business_details || member?.job_details || member?.other_income_details || '',
        family_members_count: (member?.family_members?.length ?? member?.familyMembers?.length ?? 0) || 0,
        earning_members_count: 0,
        previous_loan_amount: 0,
        current_loan_demand: requestedAmount || 0,
        own_land_amount:
            member?.total_land_amount != null && Number(member.total_land_amount) > 0
                ? String(member.total_land_amount)
                : member?.cultivable_land_amount != null && Number(member.cultivable_land_amount) > 0
                  ? String(member.cultivable_land_amount)
                  : '',
        mortgaged_land_amount: '',
        land_value:
            member?.total_land_value != null && Number(member.total_land_value) > 0
                ? Number(member.total_land_value)
                : member?.cultivable_land_value != null
                  ? Number(member.cultivable_land_value)
                  : 0,
        house_type: member?.house_type || '',
        room_count:
            (member?.brick_house_count || 0) +
            (member?.semi_brick_house_count || 0) +
            (member?.tin_house_count || 0) +
            (member?.mud_house_count || 0),
        has_tubewell: false,
        has_latrine: false,
        cow_count: member?.cow_buffalo_count || 0,
        buffalo_count: 0,
        goat_count: member?.goat_sheep_count || 0,
        sheep_count: 0,
        duck_chicken_count: member?.duck_chicken_count || 0,
        primary_school_count: 0,
        secondary_school_count: 0,
        college_count: 0,
        madrasah_count: 0,
        university_count: 0,
        savings_amount: 0,
        house_identification: '',
        other_organization_loans: member?.other_loan_info || '',
        previous_repayment_type: '',
        general_savings_default_count: 0,
        emergency_savings_default_count: 0,
        term_savings_default_count: 0,
        term_savings_due_installments: 0,
        term_savings_due_amount: 0,
        comments: member?.collector_comment || '',
        member_signature: member?.applicant_signature_path || null,
        branch_manager_signature: null,
        general_savings_product_id: null,
        general_savings_amount: 0,
        is_against_savings: false,
        against_savings_product_id: null,
        against_savings_amount: 0,
        loan_round: loanRound,
    };
}

function resolveBackUrl(
    isLegacy: boolean,
    member: any,
    loanProduct: any,
    loanCategory: any,
    requestedAmount: number,
    existingApplication?: any,
) {
    return afterLoanFormSaveUrl({
        existingApplication,
        isLegacy,
        member,
        loanProduct,
        loanCategory,
        requestedAmount,
        formId: 4,
    });
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
    const resumeParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const isResumeApproval = !!resumeParams?.get('resume_approval_id');
    if (onlyPreview) {
        const defaults = buildFieldInvestigationDefaults(member, requestedAmount, branch, loanRound);
        const previewData =
            savedData && Object.keys(savedData).length > 0
                ? { ...defaults, ...savedData }
                : defaults;
        if (!String(previewData.nid_number || '').trim()) {
            previewData.nid_number = resolveMemberIdentityNumber(member);
        }
        return (
            <div className="print-container">
                <FieldInvestigationPrintView formData={previewData} />
            </div>
        );
    }
    
    const [showPreview, setShowPreview] = useState(true);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const inputClass = 'w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all';
    const labelClass = 'block text-[11px] font-semibold text-gray-700 mb-0.5';
    const sectionClass = 'bg-white rounded-xl shadow-sm p-4 border border-gray-200 space-y-3';
    const rowBadge = (n: string) => (
        <span className="w-5 h-5 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">{n}</span>
    );

    const { data, setData, processing } = useForm<FieldInvestigationData>({
        branch_name: branch?.name || '',
        branch_address: branch?.address || '',
        field_visit_date: new Date().toISOString().split('T')[0],
        loan_disbursement_date: '',
        member_name: member?.applicant_name_bn || member?.applicant_name_en || '',
        member_no: member?.application_no || '',
        samity_name: member?.samity?.samity_name_bn || member?.samity?.samity_name || '',
        samity_code: member?.samity?.samity_code || member?.samity?.id?.toString() || '',
        nid_number: resolveMemberIdentityNumber(member),
        member_mobile: member?.mobile_number || '',
        information_provider_name: '',
        information_provider_mobile: '',
        relationship_with_member: '',
        main_profession: member?.business_details || member?.job_details || member?.other_income_details || '',
        family_members_count: (member?.family_members?.length ?? member?.familyMembers?.length ?? 0) || 0,
        earning_members_count: 0,
        previous_loan_amount: 0,
        current_loan_demand: requestedAmount || 0,
        own_land_amount: member?.total_land_amount != null && Number(member.total_land_amount) > 0 ? String(member.total_land_amount) : (member?.cultivable_land_amount != null && Number(member.cultivable_land_amount) > 0 ? String(member.cultivable_land_amount) : ''),
        mortgaged_land_amount: '',
        land_value: member?.total_land_value != null && Number(member.total_land_value) > 0 ? Number(member.total_land_value) : (member?.cultivable_land_value != null ? Number(member.cultivable_land_value) : 0),
        house_type: member?.house_type || '',
        room_count: (member?.brick_house_count || 0) + (member?.semi_brick_house_count || 0) + (member?.tin_house_count || 0) + (member?.mud_house_count || 0),
        has_tubewell: false,
        has_latrine: false,
        cow_count: member?.cow_buffalo_count || 0,
        buffalo_count: 0,
        goat_count: member?.goat_sheep_count || 0,
        sheep_count: 0,
        duck_chicken_count: member?.duck_chicken_count || 0,
        primary_school_count: 0,
        secondary_school_count: 0,
        college_count: 0,
        madrasah_count: 0,
        university_count: 0,
        savings_amount: 0,
        house_identification: '',
        other_organization_loans: member?.other_loan_info || '',
        previous_repayment_type: '',
        general_savings_default_count: 0,
        emergency_savings_default_count: 0,
        term_savings_default_count: 0,
        term_savings_due_installments: 0,
        term_savings_due_amount: 0,
        comments: member?.collector_comment || '',
        member_signature: member?.applicant_signature_path || null,
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
            setData((prev) => {
                const merged = { ...prev, ...savedData };
                // Older drafts may have blank nid — fill from admission (NID or smart card)
                if (!String(merged.nid_number || '').trim()) {
                    merged.nid_number = resolveMemberIdentityNumber(member);
                }
                return merged;
            });
            setShowPreview(true);
        }
    }, [savedData]);

    // Keep identity number from admission when still empty
    useEffect(() => {
        const fromAdmission = resolveMemberIdentityNumber(member);
        if (fromAdmission && !String(data.nid_number || '').trim()) {
            setData('nid_number', fromAdmission);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [member?.nid_number, member?.smart_card_number, member?.nid_no]);

    const handleSaveDraft = () => {
        const resumeApprovalId = resumeParams?.get('resume_approval_id');
        const effectiveDofa = data.loan_round != null && data.loan_round >= 1 ? data.loan_round : loanRound;
        const requiredPercent = getRequiredSavingsPercent(loanProduct?.installment_type, effectiveDofa, !!data.is_against_savings, loanProduct?.duration_months);
        const minSavings = Math.ceil((requestedAmount * requiredPercent) / 100);
        const generalAmount = Number(data.general_savings_amount) || 0;

        // Soft draft: savings minimum only blocks when resuming approval; otherwise warn
        if (generalAmount < minSavings) {
            const msg = `সাধারণ সঞ্চয় সর্বনিম্ন ${requiredPercent}% (৳${minSavings.toLocaleString('bn-BD')}) থাকা উচিত।`;
            if (resumeApprovalId) {
                setErrors({ general_savings_amount: msg });
                return;
            }
            const ok = confirm(`${msg}\nতবুও খসড়া সেভ করবেন? পরে সংশোধন করতে পারবেন।`);
            if (!ok) {
                setErrors({ general_savings_amount: msg });
                return;
            }
        }
        setErrors({});
        const payload: any = { loan_product_id: loanProduct.id, loan_category_id: loanCategory.id, requested_amount: requestedAmount, form_data: { ...data } as any, draft: 1 };
        if (isLegacy) payload.legacy = 1; else payload.member_id = member?.id;
        if (resumeApprovalId) {
            payload.resume_approval_id = resumeApprovalId;
            payload.resume_approved_amount = resumeParams?.get('resume_approved_amount') || '';
            payload.resume_comments = resumeParams?.get('resume_comments') || '';
        }
        router.post(
            '/member/loan-applications/forms/field-investigation/save-draft',
            payload,
            {
                preserveScroll: true,
                onSuccess: () => {
                    if (resumeApprovalId) {
                        return;
                    }
                    alert('সরেজমিনে তদন্ত প্রতিবেদন খসড়া হিসেবে সংরক্ষিত হয়েছে।');
                    router.visit(resolveBackUrl(isLegacy, member, loanProduct, loanCategory, requestedAmount, existingApplication));
                },
                onError: (errs) => {
                    console.error('Save draft error:', errs);
                    alert('খসড়া সার্ভারে সেভ হয়নি — আপনার ফর্মের তথ্য হারায়নি। আবার চেষ্টা করুন।');
                },
            }
        );
    };

    const handlePrint = () => {
        triggerPrintWithAutoFit('.print-container');
    };

    return (
        <AdminLayout>
            <Head title="সরেজমিনে তদন্ত প্রতিবেদন">
                <style>{`
                    @media print {
                        @page { size: A4 portrait; margin: 8mm 10mm; }
                        body * { visibility: hidden !important; }
                        .print-container, .print-container * { visibility: visible !important; }
                        .print-container {
                            position: absolute !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: 100% !important;
                            max-width: 100% !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            background: #ffffff !important;
                        }
                        .print-page-sheet {
                            width: 100% !important;
                            max-width: 100% !important;
                            min-height: 278mm !important;
                            max-height: 278mm !important;
                            box-sizing: border-box !important;
                            page-break-after: avoid !important;
                            break-after: avoid !important;
                            page-break-inside: avoid !important;
                            break-inside: avoid !important;
                            overflow: hidden !important;
                            position: relative !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            display: flex !important;
                            flex-direction: column !important;
                            justify-content: space-between !important;
                            background: #ffffff !important;
                        }
                        .print-page-content {
                            width: 100% !important;
                            box-sizing: border-box !important;
                        }
                    }
                    @media screen {
                        .print-page-sheet {
                            min-height: 297mm;
                            box-sizing: border-box;
                            display: flex;
                            flex-direction: column;
                            justify-content: space-between;
                        }
                    }
                `}</style>
            </Head>
            <div className="py-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Header */}
                    <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() =>
                                    router.visit(
                                        resolveBackUrl(isLegacy, member, loanProduct, loanCategory, requestedAmount, existingApplication),
                                    )
                                }
                                className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back
                            </button>
                            <div>
                                <h2 className="text-base md:text-lg font-bold flex items-center gap-2">
                                    <ClipboardList className="w-5 h-5 text-indigo-600" />
                                    সমিতিতে ঋণ আবেদন অনুযায়ী শাখা ব্যবস্থাপক কর্তৃক সদস্যের বাড়ি সরেজমিনে তদন্ত প্রতিবেদন
                                </h2>
                                <p className="text-xs text-gray-600">
                                    {isResumeApproval
                                        ? 'প্রিন্ট প্রিভিউ অনুযায়ী ফর্ম পূরণ করুন। Approve চাপলেই ফর্ম সংরক্ষণ ও ঋণ অনুমোদন একসাথে হবে।'
                                        : 'প্রিন্ট প্রিভিউ অনুযায়ী ফর্ম পূরণ করুন এবং ড্রাফট সংরক্ষণ করুন।'}
                                </p>
                                {existingApplication && (
                                    <p className="text-xs text-emerald-600 font-semibold mt-1">
                                        ✓ Draft সংরক্ষিত — আবেদন নং: {existingApplication.application_no || 'Pending'}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => setShowPreview(!showPreview)}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700"
                            >
                                <Eye className="w-4 h-4" />
                                {showPreview ? 'প্রিভিউ বন্ধ' : 'প্রিভিউ দেখুন'}
                            </button>
                            {showPreview && (
                                <button
                                    onClick={handlePrint}
                                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700"
                                >
                                    <Printer className="w-4 h-4" />
                                    Print
                                </button>
                            )}
                            <button
                                onClick={handleSaveDraft}
                                disabled={processing}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                <Save className="w-4 h-4" />
                                {processing ? (isResumeApproval ? 'অনুমোদন হচ্ছে...' : 'সংরক্ষণ হচ্ছে...') : (isResumeApproval ? 'Approve' : 'ড্রাফট সংরক্ষণ')}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-1">
                        {/* LEFT: INPUT FORM — প্রিন্ট প্রিভিউ অনুযায়ী ক্রম */}
                        <div className="space-y-4 print:hidden">
                            {/* শাখার তথ্য (প্রিভিউ হেডারে দেখায়) */}
                            <div className={sectionClass}>
                                <h3 className="text-sm font-bold text-gray-800 border-b pb-2">শাখার তথ্য (প্রিভিউ হেডার)</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className={labelClass}>শাখার নাম</label>
                                        <input type="text" value={data.branch_name} onChange={(e) => setData('branch_name', e.target.value)} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className={labelClass}>শাখার ঠিকানা (প্রিভিউতে দেখায়)</label>
                                        <input type="text" value={data.branch_address} onChange={(e) => setData('branch_address', e.target.value)} className={inputClass} />
                                    </div>
                                </div>
                            </div>

                            {/* সদস্য ও তথ্য প্রদানকারীর তথ্য */}
                            <div className={sectionClass}>
                                <h3 className="text-sm font-bold text-gray-800 border-b pb-2">সদস্য ও তথ্য প্রদানকারীর তথ্য</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className={labelClass}>সদস্য নাম</label>
                                        <input type="text" value={data.member_name} onChange={(e) => setData('member_name', e.target.value)} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className={labelClass}>সদস্য নং</label>
                                        <input type="text" value={data.member_no} onChange={(e) => setData('member_no', e.target.value)} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className={labelClass}>সমিতির নাম</label>
                                        <input type="text" value={data.samity_name} onChange={(e) => setData('samity_name', e.target.value)} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className={labelClass}>সমিতি কোড নং</label>
                                        <input type="text" value={data.samity_code} onChange={(e) => setData('samity_code', e.target.value)} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className={labelClass}>জাতীয় পরিচয়পত্র / স্মার্ট কার্ড নং</label>
                                        <input type="text" value={data.nid_number} onChange={(e) => setData('nid_number', e.target.value)} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className={labelClass}>সদস্যের মোবাইল নং</label>
                                        <input type="text" value={data.member_mobile} onChange={(e) => setData('member_mobile', e.target.value)} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className={labelClass}>তথ্য প্রদানকারীর নাম</label>
                                        <input type="text" value={data.information_provider_name} onChange={(e) => setData('information_provider_name', e.target.value)} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className={labelClass}>তথ্য প্রদানকারীর মোবাইল নং</label>
                                        <input type="text" value={data.information_provider_mobile} onChange={(e) => setData('information_provider_mobile', e.target.value)} className={inputClass} />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className={labelClass}>সদস্যের সাথে সম্পর্ক</label>
                                        <input type="text" value={data.relationship_with_member} onChange={(e) => setData('relationship_with_member', e.target.value)} className={inputClass} />
                                    </div>
                                </div>
                            </div>

                            {/* তদন্ত তথ্য — টেবিল (ক্রঃ নং ১–১৩) */}
                            <div className={sectionClass}>
                                <h3 className="text-sm font-bold text-gray-800 border-b pb-2">তদন্ত তথ্য (প্রিন্ট টেবিল অনুযায়ী)</h3>
                                <div className="space-y-3">
                                    {/* ১ */}
                                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                                        <div className="flex items-start gap-2">
                                            {rowBadge('১')}
                                            <p className="text-[11px] font-semibold text-gray-700 flex-1">মূল পেশা, পরিবারের লোক সংখ্যা ও উপার্জনকারী সংখ্যা</p>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pl-7">
                                            <div>
                                                <label className={labelClass}>পেশা</label>
                                                <input type="text" value={data.main_profession} onChange={(e) => setData('main_profession', e.target.value)} className={inputClass} />
                                            </div>
                                            <div>
                                                <label className={labelClass}>লোক সংখ্যা</label>
                                                <input type="number" min={0} value={data.family_members_count || ''} onChange={(e) => setData('family_members_count', parseInt(e.target.value) || 0)} className={inputClass} />
                                            </div>
                                            <div>
                                                <label className={labelClass}>উপার্জনকারী</label>
                                                <input type="number" min={0} value={data.earning_members_count || ''} onChange={(e) => setData('earning_members_count', parseInt(e.target.value) || 0)} className={inputClass} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* ২ */}
                                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                                        <div className="flex items-start gap-2">
                                            {rowBadge('২')}
                                            <p className="text-[11px] font-semibold text-gray-700 flex-1">বিগত দফায় পরিশোধিত ঋণের পরিমাণ ও বর্তমান ঋণের চাহিদা</p>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-7">
                                            <div>
                                                <label className={labelClass}>পরিশোধিত (৳)</label>
                                                <input type="number" min={0} value={data.previous_loan_amount || ''} onChange={(e) => setData('previous_loan_amount', parseFloat(e.target.value) || 0)} className={inputClass} />
                                            </div>
                                            <div>
                                                <label className={labelClass}>বর্তমান চাহিদা (৳)</label>
                                                <input type="number" min={0} value={data.current_loan_demand || ''} onChange={(e) => setData('current_loan_demand', parseFloat(e.target.value) || 0)} className={inputClass} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* ৩ */}
                                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                                        <div className="flex items-start gap-2">
                                            {rowBadge('৩')}
                                            <p className="text-[11px] font-semibold text-gray-700 flex-1">নিজস্ব জমির পরিমাণ ও বন্ধকী জমির পরিমান এবং মূল্য</p>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pl-7">
                                            <div>
                                                <label className={labelClass}>নিজস্ব</label>
                                                <input type="text" value={data.own_land_amount} onChange={(e) => setData('own_land_amount', e.target.value)} className={inputClass} />
                                            </div>
                                            <div>
                                                <label className={labelClass}>বন্ধকী</label>
                                                <input type="text" value={data.mortgaged_land_amount} onChange={(e) => setData('mortgaged_land_amount', e.target.value)} className={inputClass} />
                                            </div>
                                            <div>
                                                <label className={labelClass}>মূল্য (৳)</label>
                                                <input type="number" min={0} value={data.land_value || ''} onChange={(e) => setData('land_value', parseFloat(e.target.value) || 0)} className={inputClass} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* ৪ */}
                                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                                        <div className="flex items-start gap-2">
                                            {rowBadge('৪')}
                                            <p className="text-[11px] font-semibold text-gray-700 flex-1">বাড়ীর ধরণ ও ঘরের সংখ্যা (টিক চিহ্ন দিন)</p>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-7">
                                            <div>
                                                <label className={labelClass}>ধরণ</label>
                                                <input type="text" value={data.house_type} onChange={(e) => setData('house_type', e.target.value)} className={inputClass} placeholder="ছাপড়া/টিন/মাটি/পাকা" />
                                            </div>
                                            <div>
                                                <label className={labelClass}>ছাপড়া/টিন/মাটি/পাকা-ঘরের সংখ্যা</label>
                                                <input type="number" min={0} value={data.room_count || ''} onChange={(e) => setData('room_count', parseInt(e.target.value) || 0)} className={inputClass} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* ৫ */}
                                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                                        <div className="flex items-start gap-2">
                                            {rowBadge('৫')}
                                            <p className="text-[11px] font-semibold text-gray-700 flex-1">নিজস্ব টিউবওয়েল ও স্বাস্থ্যসম্মত পায়খানা আছে কি-না (টিক চিহ্ন দিন)</p>
                                        </div>
                                        <div className="pl-7 space-y-2">
                                            <div className="flex flex-wrap items-center gap-4">
                                                <span className="text-[11px] font-semibold text-gray-600">টিউবওয়েল:</span>
                                                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                                                    <input type="radio" name="has_tubewell" checked={data.has_tubewell === true} onChange={() => setData('has_tubewell', true)} className="text-indigo-600" />
                                                    হ্যাঁ
                                                </label>
                                                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                                                    <input type="radio" name="has_tubewell" checked={data.has_tubewell === false} onChange={() => setData('has_tubewell', false)} className="text-indigo-600" />
                                                    না
                                                </label>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-4">
                                                <span className="text-[11px] font-semibold text-gray-600">স্বাস্থ্যসম্মত পায়খানা:</span>
                                                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                                                    <input type="radio" name="has_latrine" checked={data.has_latrine === true} onChange={() => setData('has_latrine', true)} className="text-indigo-600" />
                                                    হ্যাঁ
                                                </label>
                                                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                                                    <input type="radio" name="has_latrine" checked={data.has_latrine === false} onChange={() => setData('has_latrine', false)} className="text-indigo-600" />
                                                    না
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ৬ */}
                                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                                        <div className="flex items-start gap-2">
                                            {rowBadge('৬')}
                                            <p className="text-[11px] font-semibold text-gray-700 flex-1">গবাদি পশুর সংখ্যা (গরু, মহিষ, ছাগল, ভেড়া ইত্যাদি)</p>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pl-7">
                                            {([
                                                ['cow_count', 'গরু'],
                                                ['buffalo_count', 'মহিষ'],
                                                ['goat_count', 'ছাগল'],
                                                ['sheep_count', 'ভেড়া'],
                                                ['duck_chicken_count', 'হাঁস-মুরগী'],
                                            ] as const).map(([key, lbl]) => (
                                                <div key={key}>
                                                    <label className={labelClass}>{lbl}</label>
                                                    <input type="number" min={0} value={data[key] || ''} onChange={(e) => setData(key, parseInt(e.target.value) || 0)} className={inputClass} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* ৭ */}
                                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                                        <div className="flex items-start gap-2">
                                            {rowBadge('৭')}
                                            <p className="text-[11px] font-semibold text-gray-700 flex-1">স্কুলে/কলেজে পড়ে এমন ছেলে-মেয়ের সংখ্যা</p>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pl-7">
                                            {([
                                                ['primary_school_count', 'প্রাথমিক স্কুল'],
                                                ['secondary_school_count', 'মাধ্যমিক স্কুল'],
                                                ['college_count', 'কলেজ'],
                                                ['madrasah_count', 'মাদ্রাসা'],
                                                ['university_count', 'বিশ্ববিদ্যালয়'],
                                            ] as const).map(([key, lbl]) => (
                                                <div key={key}>
                                                    <label className={labelClass}>{lbl}</label>
                                                    <input type="number" min={0} value={data[key] || ''} onChange={(e) => setData(key, parseInt(e.target.value) || 0)} className={inputClass} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* ৮ */}
                                    <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200 space-y-2">
                                        <div className="flex items-start gap-2">
                                            {rowBadge('৮')}
                                            <p className="text-[11px] font-semibold text-gray-700 flex-1">সাধারণ সঞ্চয় (দফা ও পরিমাণ)</p>
                                        </div>
                                        <div className="pl-7">
                                            <GeneralSavingsSection
                                                savingsProducts={savingsProducts}
                                                loanProduct={loanProduct}
                                                requestedAmount={requestedAmount}
                                                loanRound={loanRound}
                                                showDofaSelector
                                                compact
                                                data={{
                                                    savings_amount: data.savings_amount,
                                                    general_savings_product_id: data.general_savings_product_id,
                                                    general_savings_amount: data.general_savings_amount,
                                                    is_against_savings: data.is_against_savings,
                                                    against_savings_product_id: data.against_savings_product_id,
                                                    against_savings_amount: data.against_savings_amount,
                                                    loan_round: data.loan_round,
                                                }}
                                                setData={(key, value) => {
                                                    setData(key as any, value);
                                                }}
                                                errors={errors}
                                            />
                                        </div>
                                    </div>

                                    {/* ৯ */}
                                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                                        <div className="flex items-start gap-2">
                                            {rowBadge('৯')}
                                            <p className="text-[11px] font-semibold text-gray-700 flex-1">সদস্যের বাড়ী চেনার নির্দেশনা</p>
                                        </div>
                                        <div className="pl-7">
                                            <textarea value={data.house_identification} onChange={(e) => setData('house_identification', e.target.value)} className={inputClass} rows={3} />
                                        </div>
                                    </div>

                                    {/* ১০ */}
                                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                                        <div className="flex items-start gap-2">
                                            {rowBadge('১০')}
                                            <p className="text-[11px] font-semibold text-gray-700 flex-1">অন্যান্য সংস্থা হতে ঋণ গ্রহণের তথ্য</p>
                                        </div>
                                        <div className="pl-7">
                                            <textarea value={data.other_organization_loans} onChange={(e) => setData('other_organization_loans', e.target.value)} className={inputClass} rows={3} />
                                        </div>
                                    </div>

                                    {/* ১১ */}
                                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                                        <div className="flex items-start gap-2">
                                            {rowBadge('১১')}
                                            <p className="text-[11px] font-semibold text-gray-700 flex-1">বিগত দফার পরিশোধের ধরণ (টিক চিহ্ন দিন)</p>
                                        </div>
                                        <div className="pl-7 space-y-1.5">
                                            <label className="flex items-center gap-2 text-xs cursor-pointer">
                                                <input type="radio" name="previous_repayment_type" checked={data.previous_repayment_type === 'installment'} onChange={() => setData('previous_repayment_type', 'installment')} className="text-indigo-600" />
                                                কিস্তিতে পরিশোধ করেছেন
                                            </label>
                                            <label className="flex items-center gap-2 text-xs cursor-pointer">
                                                <input type="radio" name="previous_repayment_type" checked={data.previous_repayment_type === 'savings_adjustment'} onChange={() => setData('previous_repayment_type', 'savings_adjustment')} className="text-indigo-600" />
                                                সঞ্চয়ের সাথে সমন্বয় করেছেন
                                            </label>
                                        </div>
                                    </div>

                                    {/* ১২ */}
                                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                                        <div className="flex items-start gap-2">
                                            {rowBadge('১২')}
                                            <p className="text-[11px] font-semibold text-gray-700 flex-1">গত ৬ মাসে/১ বছরে কতবার সঞ্চয় খেলাপী করেছেন</p>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pl-7">
                                            <div>
                                                <label className={labelClass}>সাধারণ</label>
                                                <input type="number" min={0} value={data.general_savings_default_count || ''} onChange={(e) => setData('general_savings_default_count', parseInt(e.target.value) || 0)} className={inputClass} />
                                            </div>
                                            <div>
                                                <label className={labelClass}>আপদকালীন</label>
                                                <input type="number" min={0} value={data.emergency_savings_default_count || ''} onChange={(e) => setData('emergency_savings_default_count', parseInt(e.target.value) || 0)} className={inputClass} />
                                            </div>
                                            <div>
                                                <label className={labelClass}>মেয়াদী</label>
                                                <input type="number" min={0} value={data.term_savings_default_count || ''} onChange={(e) => setData('term_savings_default_count', parseInt(e.target.value) || 0)} className={inputClass} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* ১৩ */}
                                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                                        <div className="flex items-start gap-2">
                                            {rowBadge('১৩')}
                                            <p className="text-[11px] font-semibold text-gray-700 flex-1">বর্তমানে সদস্যের মেয়াদী সঞ্চয়ের কয়টি কিস্তি বাঁকী আছে</p>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-7">
                                            <div>
                                                <label className={labelClass}>কিস্তি সংখ্যা</label>
                                                <input type="number" min={0} value={data.term_savings_due_installments || ''} onChange={(e) => setData('term_savings_due_installments', parseInt(e.target.value) || 0)} className={inputClass} />
                                            </div>
                                            <div>
                                                <label className={labelClass}>টাকার পরিমাণ (৳)</label>
                                                <input type="number" min={0} value={data.term_savings_due_amount || ''} onChange={(e) => setData('term_savings_due_amount', parseFloat(e.target.value) || 0)} className={inputClass} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* তারিখ ও মন্তব্য (প্রিভিউ শেষে) */}
                            <div className={sectionClass}>
                                <h3 className="text-sm font-bold text-gray-800 border-b pb-2">তারিখ ও মন্তব্য</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className={labelClass}>সরেজমিনে পরিদর্শনের তারিখ</label>
                                        <input type="date" value={data.field_visit_date} onChange={(e) => setData('field_visit_date', e.target.value)} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className={labelClass}>ঋণ প্রদানের তারিখ</label>
                                        <input type="date" value={data.loan_disbursement_date} onChange={(e) => setData('loan_disbursement_date', e.target.value)} className={inputClass} />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className={labelClass}>মন্তব্য</label>
                                        <textarea value={data.comments} onChange={(e) => setData('comments', e.target.value)} className={inputClass} rows={4} />
                                    </div>
                                </div>
                            </div>

                            <div className={sectionClass}>
                                <h3 className="text-sm font-bold text-gray-800 mb-1">স্বাক্ষর সংক্রান্ত নির্দেশনা</h3>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    সদস্য/তথ্য প্রদানকারী ও শাখা ব্যবস্থাপকের স্বাক্ষরের স্থান প্রিন্ট প্রিভিউতে দেওয়া আছে। ফর্ম প্রিন্ট করে ফিজিক্যাল পেপারে স্বাক্ষর গ্রহণ করুন।
                                </p>
                            </div>
                        </div>

                        {/* RIGHT: LIVE PREVIEW */}
                        {showPreview ? (
                            <div className="lg:sticky lg:top-4 lg:h-fit print-container">
                                <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                                    <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white px-4 py-2.5 flex justify-between items-center print:hidden">
                                        <span className="text-xs font-bold flex items-center gap-1.5">
                                            <Eye className="w-4 h-4 text-emerald-400" />
                                            সরেজমিন তদন্ত প্রতিবেদন — প্রিন্ট প্রিভিউ
                                        </span>
                                        <button type="button" onClick={handlePrint} className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded font-semibold flex items-center gap-1">
                                            <Printer className="w-3.5 h-3.5" />
                                            প্রিন্ট
                                        </button>
                                    </div>
                                    <div className="p-4 md:p-6 print:p-0">
                                        <FieldInvestigationPrintView formData={data} />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-[400px] bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 print:hidden">
                                <div className="text-center p-6">
                                    <Eye className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                                    <p className="text-sm text-gray-500">প্রিভিউ দেখতে উপরের &quot;প্রিভিউ দেখুন&quot; বাটনে ক্লিক করুন</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
