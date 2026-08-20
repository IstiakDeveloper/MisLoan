import { useEffect, useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Save, Printer, Eye, Upload, X, ArrowLeft } from 'lucide-react';
import { formatDateBangla } from '@/utils/dateUtils';
import { numberToWordsBangla } from './ApprovalForm/PrintPreview';
import { afterLoanFormSaveUrl } from '@/utils/loanFormNavigation';
import { useAutoFitPrint } from '@/hooks/useAutoFitPrint';
import { withLiveMemberCode } from '@/utils/memberCodeUtils';

interface DeathRiskFundData {
    // Branch & Date
    branch_name: string;
    date: string;

    // Photos
    loan_recipient_photo: string | null;
    guardian_photo: string | null;

    // Section 1: Loan Recipient Information (from MemberAdmission)
    loan_recipient_name: string;
    loan_recipient_code1: string; // Member code
    loan_recipient_code2: string; // Same as member code (from admission)
    samity_name: string;
    village: string;
    post_office: string; // From member present_post_code
    upazila: string;
    district: string;
    age: number;
    nid_number: string;
    mobile_number: string;
    component_name: string; // External
    loan_sanction_date: string; // External
    loan_amount_received: number; // External
    loan_amount_words: string; // External
    loan_term: string; // External

    // Section 2: Guardian/Family Primary Earner Information
    guardian_name: string; // From MemberAdmission
    guardian_age: number;
    relationship_with_recipient: string; // Select
    guardian_village: string;
    guardian_post_office: string;
    guardian_upazila: string;
    guardian_district: string;
    guardian_nid: string;
    guardian_mobile: string;
    guardian_profession: string;

    // Signatures — print/preview blank lines only (no digital upload)
    loan_recipient_signature: string | null;
    guardian_signature: string | null;
    officer_signature: string | null;
    accountant_signature: string | null;
    branch_manager_signature: string | null;
}

interface Props {
    member: any;
    loanProduct: any;
    loanCategory: any;
    requestedAmount: number;
    branch?: any;
    existingApplication?: any;
    savedData?: DeathRiskFundData;
    onlyPreview?: boolean;
    embedded?: boolean;
    afterSaveUrl?: string;
    saveButtonLabel?: string;
    isLegacy?: boolean;
}

/** Module-level so Show page can use with savedData for onlyPreview */
function renderDeathRiskFundPreviewPart(partNumber: 1 | 2, formData: any) {
    const isPart1 = partNumber === 1;
    const showDeclaration = isPart1;
    const d = formData || {};

    // Helper to get image URL (data URL, absolute, or /storage/ path)
    const getImageUrl = (url: string | null | undefined) => {
        if (!url) return null;
        if (url.startsWith('data:') || url.startsWith('http') || url.startsWith('/')) return url;
        return `/storage/${url}`;
    };

    return (
        <div className={`half-page-form bg-white border border-gray-400 p-3 ${isPart1 ? 'mb-2' : ''}`} style={{ fontSize: '12px', lineHeight: 1.35, fontFamily: 'Kalpurush, "Noto Sans Bengali", Arial, sans-serif' }}>
            {/* Header */}
            <div className="mb-2 border-b-2 border-gray-600 pb-1.5">
                <div className="flex items-center justify-between">
                    {/* Left: Photos for Part 1 or empty placeholder for Part 2 */}
                    {isPart1 ? (
                        <div className="flex gap-2 items-end">
                            <div className="border border-gray-600 p-0.5 text-center bg-white">
                                {getImageUrl(d.loan_recipient_photo) ? (
                                    <img src={getImageUrl(d.loan_recipient_photo)!} alt="Loan Recipient" style={{ width: '42px', height: '52px', objectFit: 'cover', display: 'block' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                ) : (
                                    <div style={{ width: '42px', height: '52px', backgroundColor: '#f3f4f6', border: '1px dashed #9ca3af' }} />
                                )}
                                <p className="text-[8.5px] font-bold text-gray-700 mt-0.5 leading-none">আবেদনকারী</p>
                            </div>
                            <div className="border border-gray-600 p-0.5 text-center bg-white">
                                {getImageUrl(d.guardian_photo) ? (
                                    <img src={getImageUrl(d.guardian_photo)!} alt="Guardian" style={{ width: '42px', height: '52px', objectFit: 'cover', display: 'block' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                ) : (
                                    <div style={{ width: '42px', height: '52px', backgroundColor: '#f3f4f6', border: '1px dashed #9ca3af' }} />
                                )}
                                <p className="text-[8.5px] font-bold text-gray-700 mt-0.5 leading-none">জামিনদার</p>
                            </div>
                        </div>
                    ) : <div className="w-24" />}

                    {/* Center: Org & Title */}
                    <div className="text-center flex-1 px-3">
                        <div className="flex items-center justify-center gap-2">
                            <img src="/logo.png" alt="Logo" style={{ height: '36px', width: '36px', objectFit: 'contain' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            <h1 className="font-black text-[18px] text-gray-900 leading-none">মৌসুমী</h1>
                        </div>
                        <p className="font-bold text-[13px] text-gray-900 leading-tight mt-1">মৃত্যুজনিত ঋণঝুঁকি তহবিলে অন্তর্ভুক্তির আবেদনপত্র</p>
                        <p className="font-bold text-gray-700 text-[11px] mt-0.5">
                            {isPart1 ? 'প্রথম অংশ (প্রোফাইলে সংযুক্ত করতে হবে)' : 'দ্বিতীয় অংশ (পাশবইয়ে সংযুক্ত করতে হবে)'}
                        </p>
                    </div>

                    {/* Right: Branch & Date */}
                    <div className="text-right text-[11.5px] font-bold text-gray-900 shrink-0">
                        <p className="mb-1">শাখা: <span className="border-b border-dotted border-gray-700 inline-block min-w-[75px] text-center">{d.branch_name || ''}</span></p>
                        <p>তারিখ: <span className="border-b border-dotted border-gray-700 inline-block min-w-[70px] text-center">{formatDateBangla(d.date) || ''}</span></p>
                    </div>
                </div>
            </div>

            {/* Section 1: Loan Recipient Information (Multi-column) */}
            <div className="mb-2">
                <h3 className="font-bold mb-1 text-[12.5px] text-gray-900 border-b border-gray-400 pb-0.5">১। ঋণ গ্রহীতার তথ্য:</h3>
                <div className="space-y-1 text-[12px] print:text-[11.8px]">
                    {/* Row 1: নাম + সদস্য কোড */}
                    <div className="flex gap-2 items-baseline">
                        <span className="shrink-0 font-bold">ঋণ গ্রহীতার নাম:</span>
                        <span className="border-b border-dotted border-gray-700 flex-1 min-h-[17px] font-medium">{d.loan_recipient_name || ''}</span>
                        <span className="shrink-0 font-bold ml-2">কোড নং:</span>
                        <span className="border-b border-dotted border-gray-700 w-36 shrink-0 min-h-[17px] font-medium text-center">{d.loan_recipient_code1 || d.loan_recipient_code2 || ''}</span>
                    </div>
                    {/* Row 2: সমিতির নাম + গ্রাম + পোস্ট */}
                    <div className="flex gap-2 items-baseline">
                        <span className="shrink-0 font-bold">সমিতির নাম:</span>
                        <span className="border-b border-dotted border-gray-700 flex-1 min-h-[17px] font-medium">{d.samity_name || ''}</span>
                        <span className="shrink-0 font-bold ml-2">গ্রাম:</span>
                        <span className="border-b border-dotted border-gray-700 w-36 shrink-0 min-h-[17px] font-medium">{d.village || ''}</span>
                        <span className="shrink-0 font-bold ml-2">পোস্ট:</span>
                        <span className="border-b border-dotted border-gray-700 w-24 shrink-0 min-h-[17px] font-medium">{d.post_office || ''}</span>
                    </div>
                    {/* Row 3: উপজেলা + জেলা + বয়স */}
                    <div className="flex gap-2 items-baseline">
                        <span className="shrink-0 font-bold">উপজেলা:</span>
                        <span className="border-b border-dotted border-gray-700 flex-1 min-h-[17px] font-medium">{d.upazila || ''}</span>
                        <span className="shrink-0 font-bold ml-2">জেলা:</span>
                        <span className="border-b border-dotted border-gray-700 w-36 shrink-0 min-h-[17px] font-medium">{d.district || ''}</span>
                        <span className="shrink-0 font-bold ml-2">বয়স:</span>
                        <span className="border-b border-dotted border-gray-700 w-24 shrink-0 min-h-[17px] font-medium text-center">{d.age != null && d.age !== '' ? `${d.age} বছর` : ''}</span>
                    </div>
                    {/* Row 4: জাতীয় পরিচয়পত্র + মোবাইল */}
                    <div className="flex gap-2 items-baseline">
                        <span className="shrink-0 font-bold">জাতীয় পরিচয়পত্র নং:</span>
                        <span className="border-b border-dotted border-gray-700 flex-1 min-h-[17px] font-medium">{d.nid_number || ''}</span>
                        <span className="shrink-0 font-bold ml-2">মোবাইল নং:</span>
                        <span className="border-b border-dotted border-gray-700 w-48 shrink-0 min-h-[17px] font-medium">{d.mobile_number || ''}</span>
                    </div>
                    {/* Row 5: কম্পোনেন্ট + ঋণ গ্রহণের তারিখ + মেয়াদ */}
                    <div className="flex gap-2 items-baseline">
                        <span className="shrink-0 font-bold">কম্পোনেন্ট:</span>
                        <span className="border-b border-dotted border-gray-700 flex-1 min-h-[17px] font-medium">{d.component_name || ''}</span>
                        <span className="shrink-0 font-bold ml-2">ঋণ গ্রহণের তারিখ:</span>
                        <span className="border-b border-dotted border-gray-700 w-32 shrink-0 min-h-[17px] font-medium text-center">{formatDateBangla(d.loan_sanction_date) || ''}</span>
                        <span className="shrink-0 font-bold ml-2">মেয়াদ:</span>
                        <span className="border-b border-dotted border-gray-700 w-24 shrink-0 min-h-[17px] font-medium text-center">{d.loan_term || ''}</span>
                    </div>
                    {/* Row 6: গ্রহণকৃত ঋণের পরিমাণ + কথায় */}
                    <div className="flex gap-2 items-baseline">
                        <span className="shrink-0 font-bold">ঋণের পরিমাণ:</span>
                        <span className="border-b border-dotted border-gray-700 w-36 shrink-0 min-h-[17px] font-medium text-center">{d.loan_amount_received ?? ''}</span>
                        <span className="shrink-0 font-bold ml-2">কথায়:</span>
                        <span className="border-b border-dotted border-gray-700 flex-1 min-h-[17px] font-medium">{d.loan_amount_words || ''}</span>
                    </div>
                </div>
            </div>

            {/* Section 2: Guardian Information (Multi-column) */}
            <div className="mb-2">
                <h3 className="font-bold mb-1 text-[12.5px] text-gray-900 border-b border-gray-400 pb-0.5">২। অভিভাবক/পরিবারের প্রধান উপার্জনকারী ব্যক্তির তথ্য:</h3>
                <div className="space-y-1 text-[12px] print:text-[11.8px]">
                    {/* Row 1: নাম + বয়স + সম্পর্ক */}
                    <div className="flex gap-2 items-baseline">
                        <span className="shrink-0 font-bold">অভিভাবক/প্রধান উপার্জনকারী:</span>
                        <span className="border-b border-dotted border-gray-700 flex-1 min-h-[17px] font-medium">{d.guardian_name || ''}</span>
                        <span className="shrink-0 font-bold ml-2">বয়স:</span>
                        <span className="border-b border-dotted border-gray-700 w-24 shrink-0 min-h-[17px] font-medium text-center">{d.guardian_age ? `${d.guardian_age} বছর` : ''}</span>
                        <span className="shrink-0 font-bold ml-2">সম্পর্ক:</span>
                        <span className="border-b border-dotted border-gray-700 w-32 shrink-0 min-h-[17px] font-medium text-center">{d.relationship_with_recipient || ''}</span>
                    </div>
                    {/* Row 2: গ্রাম + পোস্ট + উপজেলা + জেলা */}
                    <div className="flex gap-2 items-baseline">
                        <span className="shrink-0 font-bold">গ্রাম:</span>
                        <span className="border-b border-dotted border-gray-700 flex-1 min-h-[17px] font-medium">{d.guardian_village || ''}</span>
                        <span className="shrink-0 font-bold ml-2">পোস্ট:</span>
                        <span className="border-b border-dotted border-gray-700 w-24 shrink-0 min-h-[17px] font-medium">{d.guardian_post_office || ''}</span>
                        <span className="shrink-0 font-bold ml-2">উপজেলা:</span>
                        <span className="border-b border-dotted border-gray-700 w-32 shrink-0 min-h-[17px] font-medium">{d.guardian_upazila || ''}</span>
                        <span className="shrink-0 font-bold ml-2">জেলা:</span>
                        <span className="border-b border-dotted border-gray-700 w-32 shrink-0 min-h-[17px] font-medium">{d.guardian_district || ''}</span>
                    </div>
                    {/* Row 3: জাতীয় পরিচয়পত্র + মোবাইল + পেশা */}
                    <div className="flex gap-2 items-baseline">
                        <span className="shrink-0 font-bold">জাতীয় পরিচয়পত্র নং:</span>
                        <span className="border-b border-dotted border-gray-700 flex-1 min-h-[17px] font-medium">{d.guardian_nid || ''}</span>
                        <span className="shrink-0 font-bold ml-2">মোবাইল:</span>
                        <span className="border-b border-dotted border-gray-700 w-36 shrink-0 min-h-[17px] font-medium">{d.guardian_mobile || ''}</span>
                        <span className="shrink-0 font-bold ml-2">পেশা:</span>
                        <span className="border-b border-dotted border-gray-700 w-32 shrink-0 min-h-[17px] font-medium">{d.guardian_profession || ''}</span>
                    </div>
                </div>
            </div>

            {/* Declaration (only Part 1) */}
            {showDeclaration && (
                <div className="mb-2 leading-relaxed p-1.5 bg-gray-50 border border-gray-300 rounded text-[11px]">
                    <p className="font-bold mb-0.5 text-[11.5px] text-gray-900">ঘোষণা:</p>
                    <p style={{ marginBottom: 0, lineHeight: 1.25 }} className="text-gray-800">আমরা এই মর্মে ঘোষণা করছি যে, উপরিল্লিখিত সকল তথ্য সঠিক ও সত্য। আমরা ঋণঝুঁকি তহবিলের সকল নিয়মাবলি ও শর্তাবলি মেনে এবং বুঝে স্বাক্ষর করছি। অনুগ্রহপূর্বক আমাদেরকে ঋণঝুঁকি তহবিলের সদস্য হিসেবে অর্ন্তভুক্ত করলে বাধিত হব।</p>
                </div>
            )}

            {/* Signatures */}
            <div className="mt-2 pt-1 border-t border-gray-300 space-y-1.5 text-[11px]">
                <div className="flex gap-6">
                    <div className="flex-1">
                        <p className="mb-0.5 font-bold text-gray-900">ঋণ গ্রহীতার স্বাক্ষর:</p>
                        <div className="border-b border-dotted border-gray-700" style={{ height: '24px', minHeight: '24px' }}>
                            {getImageUrl(d.loan_recipient_signature) && (
                                <img src={getImageUrl(d.loan_recipient_signature)!} alt="Signature" style={{ height: '22px', objectFit: 'contain', display: 'block' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            )}
                        </div>
                    </div>
                    {isPart1 ? (
                        <div className="flex-1">
                            <p className="mb-0.5 font-bold text-gray-900">অভিভাবক/জামিনদারের স্বাক্ষর:</p>
                            <div className="border-b border-dotted border-gray-700" style={{ height: '24px', minHeight: '24px' }}>
                                {getImageUrl(d.guardian_signature) && (
                                    <img src={getImageUrl(d.guardian_signature)!} alt="Signature" style={{ height: '22px', objectFit: 'contain', display: 'block' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                )}
                            </div>
                        </div>
                    ) : <div className="flex-1" />}
                </div>
                <div className="flex gap-6 pt-1">
                    <div className="flex-1">
                        <p className="mb-0.5 font-bold text-gray-900">অফিসারের স্বাক্ষর ও সিল:</p>
                        <div className="border-b border-dotted border-gray-700" style={{ height: '24px', minHeight: '24px' }}>
                            {getImageUrl(d.officer_signature) && (
                                <img src={getImageUrl(d.officer_signature)!} alt="Signature" style={{ height: '22px', objectFit: 'contain', display: 'block' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            )}
                        </div>
                    </div>
                    <div className="flex-1">
                        <p className="mb-0.5 font-bold text-gray-900">হিসাবরক্ষকের স্বাক্ষর ও সিল:</p>
                        <div className="border-b border-dotted border-gray-700" style={{ height: '24px', minHeight: '24px' }}>
                            {getImageUrl(d.accountant_signature) && (
                                <img src={getImageUrl(d.accountant_signature)!} alt="Signature" style={{ height: '22px', objectFit: 'contain', display: 'block' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            )}
                        </div>
                    </div>
                    <div className="flex-1">
                        <p className="mb-0.5 font-bold text-gray-900">শাখা ব্যবস্থাপকের স্বাক্ষর ও সিল:</p>
                        <div className="border-b border-dotted border-gray-700" style={{ height: '24px', minHeight: '24px' }}>
                            {getImageUrl(d.branch_manager_signature) && (
                                <img src={getImageUrl(d.branch_manager_signature)!} alt="Signature" style={{ height: '22px', objectFit: 'contain', display: 'block' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const calculateAge = (dateOfBirth: string | null): number => {
    if (!dateOfBirth) return 0;
    const birth = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
};

function buildDeathRiskFundDefaults(
    member: any,
    loanProduct: any,
    loanCategory: any,
    requestedAmount: number,
    branch?: any,
): DeathRiskFundData {
    const memberPhotoUrl = member?.customer_photo_path
        ? member.customer_photo_path.startsWith('http')
            ? member.customer_photo_path
            : `/storage/${member.customer_photo_path}`
        : null;
    const guardianPhotoUrl = member?.guardian_photo_path
        ? member.guardian_photo_path.startsWith('http')
            ? member.guardian_photo_path
            : `/storage/${member.guardian_photo_path}`
        : null;
    const amount = Number(requestedAmount) || 0;
    const words = amount > 0 ? numberToWordsBangla(amount) : '';
    return {
        branch_name: branch?.name || '',
        date: new Date().toISOString().split('T')[0],
        loan_recipient_photo: memberPhotoUrl,
        guardian_photo: guardianPhotoUrl,
        loan_recipient_name: member?.applicant_name_bn || member?.applicant_name_en || '',
        loan_recipient_code1: member?.application_no || '',
        loan_recipient_code2: member?.application_no || '',
        samity_name: member?.samity?.samity_name_bn || member?.samity?.samity_name || '',
        village: member?.present_village_road || member?.permanent_village_road || '',
        post_office: member?.present_post_code || member?.permanent_post_code || '',
        upazila: member?.present_upazila || member?.permanent_upazila || '',
        district: member?.present_district || member?.permanent_district || '',
        age: calculateAge(member?.date_of_birth),
        nid_number: member?.nid_number || '',
        mobile_number: member?.mobile_number || '',
        component_name: loanCategory?.category_name_bn || loanCategory?.category_name || '',
        loan_sanction_date: new Date().toISOString().split('T')[0],
        loan_amount_received: amount,
        loan_amount_words: words ? words + ' টাকা' : '',
        loan_term: loanProduct?.duration_months ? `${loanProduct.duration_months} মাস` : '',
        guardian_name: member?.guardian_name || '',
        guardian_age: 0,
        relationship_with_recipient: '',
        guardian_village: member?.permanent_village_road || member?.present_village_road || '',
        guardian_post_office: member?.permanent_post_code || member?.present_post_code || '',
        guardian_upazila: member?.permanent_upazila || member?.present_upazila || '',
        guardian_district: member?.permanent_district || member?.present_district || '',
        guardian_nid: '',
        guardian_mobile: member?.guarantor_mobile || '',
        guardian_profession: '',
        loan_recipient_signature: null,
        guardian_signature: null,
        officer_signature: null,
        accountant_signature: null,
        branch_manager_signature: null,
    };
}

function resolveBackUrl(
    afterSaveUrl: string | undefined,
    isLegacy: boolean,
    member: any,
    loanProduct: any,
    loanCategory: any,
    requestedAmount: number,
    existingApplication?: any,
) {
    if (typeof window !== 'undefined') {
        const currentParams = new URLSearchParams(window.location.search);
        if (currentParams.get('return') === 'disburse' && currentParams.get('application_id')) {
            return `/member/loan-applications/${currentParams.get('application_id')}?action=disburse`;
        }
    }
    return afterLoanFormSaveUrl({
        afterSaveUrl,
        existingApplication,
        isLegacy,
        member,
        loanProduct,
        loanCategory,
        requestedAmount,
        formId: 3,
    });
}

function DeathRiskFundOnlyPreview({ member, loanProduct, loanCategory, requestedAmount, branch, savedData }: any) {
    const baseAmount = Number(requestedAmount) || 0;
    const defaults = buildDeathRiskFundDefaults(member, loanProduct, loanCategory, requestedAmount, branch);
    const previewData = withLiveMemberCode(
        savedData && Object.keys(savedData).length > 0
            ? {
                ...defaults,
                ...savedData,
                ...(baseAmount > 0 ? {
                    loan_amount_received: defaults.loan_amount_received,
                    loan_amount_words: defaults.loan_amount_words,
                } : {}),
            }
            : defaults,
        member,
    );

    useAutoFitPrint([previewData], '.death-risk-print');

    return (
        <div className="print-container death-risk-print max-w-[210mm] mx-auto bg-white">
            <div className="bg-white rounded-lg shadow-lg p-2 print:shadow-none print:p-0 print:rounded-none print:bg-white">
                <div className="space-y-1 print:space-y-0.5">
                    {renderDeathRiskFundPreviewPart(1, previewData)}
                    <div className="border-t border-dashed border-gray-400 my-1 print:my-0.5" />
                    {renderDeathRiskFundPreviewPart(2, previewData)}
                </div>
            </div>
        </div>
    );
}

export default function DeathRiskFund({
    member,
    loanProduct,
    loanCategory,
    requestedAmount,
    branch,
    existingApplication,
    savedData,
    onlyPreview,
    embedded = false,
    afterSaveUrl,
    saveButtonLabel,
    isLegacy = false,
}: Props) {
    if (onlyPreview) {
        return (
            <DeathRiskFundOnlyPreview
                member={member}
                loanProduct={loanProduct}
                loanCategory={loanCategory}
                requestedAmount={requestedAmount}
                branch={branch}
                savedData={savedData}
            />
        );
    }
    const [errors, setErrors] = useState<Record<string, string>>({});

    useAutoFitPrint([member, loanProduct, loanCategory, requestedAmount, branch], '.death-risk-print');

    const memberAge = calculateAge(member?.date_of_birth);

    // Load photos from MemberAdmission if available
    const memberPhotoUrl = member?.customer_photo_path
        ? (member.customer_photo_path.startsWith('http') ? member.customer_photo_path : `/storage/${member.customer_photo_path}`)
        : null;
    const guardianPhotoUrl = member?.guardian_photo_path
        ? (member.guardian_photo_path.startsWith('http') ? member.guardian_photo_path : `/storage/${member.guardian_photo_path}`)
        : null;

    const baseAmount = Number(requestedAmount) || 0;
    const initialWords = baseAmount > 0 ? numberToWordsBangla(baseAmount) + ' টাকা' : '';

    const { data, setData, processing } = useForm<DeathRiskFundData>({
        branch_name: branch?.name || '',
        date: new Date().toISOString().split('T')[0],

        // Photos - prioritize savedData, then MemberAdmission, then null
        loan_recipient_photo: savedData?.loan_recipient_photo || memberPhotoUrl || null,
        guardian_photo: savedData?.guardian_photo || guardianPhotoUrl || null,

        // Loan Recipient Info (auto-filled from MemberAdmission)
        loan_recipient_name: member?.applicant_name_bn || '',
        loan_recipient_code1: member?.application_no || '',
        loan_recipient_code2: member?.application_no || '', // From member code
        samity_name: member?.samity?.samity_name_bn || member?.samity?.samity_name || '',
        village: member?.present_village_road || member?.permanent_village_road || '',
        post_office: member?.present_post_code || member?.permanent_post_code || '',
        upazila: member?.present_upazila || member?.permanent_upazila || '',
        district: member?.present_district || member?.permanent_district || '',
        age: memberAge,
        nid_number: member?.nid_number || '',
        mobile_number: member?.mobile_number || '',
        component_name: loanCategory?.category_name_bn || loanCategory?.category_name || '', // External
        loan_sanction_date: new Date().toISOString().split('T')[0], // External
        loan_amount_received: baseAmount, // External
        loan_amount_words: initialWords, // Will be auto-calculated
        loan_term: loanProduct?.duration_months ? `${loanProduct.duration_months} মাস` : '', // External

        // Guardian Info
        guardian_name: member?.guardian_name || '',
        guardian_age: 0,
        relationship_with_recipient: '',
        guardian_village: member?.permanent_village_road || member?.present_village_road || '',
        guardian_post_office: member?.permanent_post_code || member?.present_post_code || '',
        guardian_upazila: member?.permanent_upazila || member?.present_upazila || '',
        guardian_district: member?.permanent_district || member?.present_district || '',
        guardian_nid: '',
        guardian_mobile: member?.guarantor_mobile || '',
        guardian_profession: '',

        // Signatures — blank lines only on print/preview (no digital upload)
        loan_recipient_signature: null,
        guardian_signature: null,
        officer_signature: null,
        accountant_signature: null,
        branch_manager_signature: null,
    });

    // Auto-calculate loan amount in words (same as ApprovalForm page 4)
    useEffect(() => {
        if (data.loan_amount_received > 0) {
            const words = numberToWordsBangla(data.loan_amount_received);
            setData('loan_amount_words', words ? words + ' টাকা' : '');
        }
    }, [data.loan_amount_received]);

    // Auto-update loan amount when requestedAmount prop updates
    useEffect(() => {
        if (baseAmount > 0) {
            const words = numberToWordsBangla(baseAmount);
            setData(prev => ({
                ...prev,
                loan_amount_received: baseAmount,
                loan_amount_words: words ? words + ' টাকা' : '',
            }));
        }
    }, [baseAmount]);

    // Load saved data if exists, but preserve photos from MemberAdmission if not in savedData
    useEffect(() => {
        if (savedData) {
            const effectiveAmount = baseAmount > 0 ? baseAmount : (Number(savedData.loan_amount_received) || 0);
            const effectiveWords = effectiveAmount > 0 ? numberToWordsBangla(effectiveAmount) + ' টাকা' : (savedData.loan_amount_words || '');
            setData(prev => withLiveMemberCode({
                ...prev,
                ...savedData,
                // Keep photos from MemberAdmission if not in savedData
                loan_recipient_photo: savedData.loan_recipient_photo || memberPhotoUrl || prev.loan_recipient_photo,
                guardian_photo: savedData.guardian_photo || guardianPhotoUrl || prev.guardian_photo,
                ...(baseAmount > 0 ? {
                    loan_amount_received: effectiveAmount,
                    loan_amount_words: effectiveWords,
                } : {}),
            }, member));
        } else if (memberPhotoUrl || guardianPhotoUrl) {
            // If no saved data but photos exist in MemberAdmission, load them
            setData(prev => ({
                ...prev,
                loan_recipient_photo: memberPhotoUrl || prev.loan_recipient_photo,
                guardian_photo: guardianPhotoUrl || prev.guardian_photo,
            }));
        }
    }, [savedData, baseAmount, memberPhotoUrl, guardianPhotoUrl]);

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

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        // Required fields validation
        if (!data.loan_recipient_code2?.trim()) {
            newErrors.loan_recipient_code2 = 'ঋণ কোড নম্বর আবশ্যক';
        }
        if (!data.post_office?.trim()) {
            newErrors.post_office = 'পোস্ট কোড আবশ্যক';
        }
        if (!data.component_name?.trim()) {
            newErrors.component_name = 'কম্পোনেন্টের নাম আবশ্যক';
        }
        if (!data.loan_sanction_date) {
            newErrors.loan_sanction_date = 'ঋণ গ্রহণের তারিখ আবশ্যক';
        }
        if (!data.loan_amount_received || data.loan_amount_received <= 0) {
            newErrors.loan_amount_received = 'গ্রহণকৃত ঋণের পরিমাণ আবশ্যক';
        }
        if (!data.loan_term?.trim()) {
            newErrors.loan_term = 'ঋণের মেয়াদ আবশ্যক';
        }
        if (!data.guardian_name?.trim()) {
            newErrors.guardian_name = 'অভিভাবকের নাম আবশ্যক';
        }
        if (!data.guardian_age || data.guardian_age <= 0) {
            newErrors.guardian_age = 'অভিভাবকের বয়স আবশ্যক';
        }
        if (!data.relationship_with_recipient?.trim()) {
            newErrors.relationship_with_recipient = 'সম্পর্ক আবশ্যক';
        }
        if (!data.guardian_village?.trim()) {
            newErrors.guardian_village = 'অভিভাবকের গ্রাম আবশ্যক';
        }
        if (!data.guardian_post_office?.trim()) {
            newErrors.guardian_post_office = 'অভিভাবকের পোস্ট কোড আবশ্যক';
        }
        if (!data.guardian_upazila?.trim()) {
            newErrors.guardian_upazila = 'অভিভাবকের উপজেলা আবশ্যক';
        }
        if (!data.guardian_district?.trim()) {
            newErrors.guardian_district = 'অভিভাবকের জেলা আবশ্যক';
        }
        if (!data.guardian_nid?.trim()) {
            newErrors.guardian_nid = 'অভিভাবকের NID আবশ্যক';
        }
        if (!data.guardian_mobile?.trim()) {
            newErrors.guardian_mobile = 'অভিভাবকের মোবাইল আবশ্যক';
        }
        if (!data.guardian_profession?.trim()) {
            newErrors.guardian_profession = 'প্রধান পেশা আবশ্যক';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSaveDraft = () => {
        // Soft draft: incomplete forms can still be saved. Strict checks only for auto-disburse.
        let autoDisburse = false;
        if (typeof window !== 'undefined') {
            const currentParams = new URLSearchParams(window.location.search);
            if (currentParams.get('action') === 'disburse' && currentParams.get('step') === '3' && existingApplication?.id) {
                autoDisburse = true;
            }
        }
        if (autoDisburse && !validateForm()) {
            alert('বিতরণের আগে অনুগ্রহ করে সকল আবশ্যক ক্ষেত্র পূরণ করুন');
            return;
        }

        const payload: any = { loan_product_id: loanProduct.id, loan_category_id: loanCategory.id, requested_amount: requestedAmount, form_data: data, draft: 1 };
        if (isLegacy) payload.legacy = 1; else payload.member_id = member?.id;
        if (existingApplication?.id) {
            payload.application_id = existingApplication.id;
        }
        if (autoDisburse && existingApplication?.id) {
            payload.auto_disburse = 1;
        }
        router.post(
            '/member/loan-applications/forms/death-risk-fund/save-draft',
            payload,
            {
                onSuccess: () => {
                    if (autoDisburse) {
                        return;
                    }
                    router.visit(
                        resolveBackUrl(
                            afterSaveUrl,
                            isLegacy,
                            member,
                            loanProduct,
                            loanCategory,
                            requestedAmount,
                            existingApplication,
                        ),
                    );
                },
                onError: (errors) => {
                    console.error('Save draft error:', errors);
                    alert('খসড়া সার্ভারে সেভ হয়নি — আপনার ফর্মের তথ্য হারায়নি। আবার চেষ্টা করুন।');
                },
            }
        );
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank', 'width=900,height=1200');
        if (!printWindow) {
            window.print();
            return;
        }

        const headHtml = document.head.innerHTML;
        const printContainer = document.querySelector('.print-container') as HTMLElement | null;

        if (!printContainer) {
            window.print();
            return;
        }

        printWindow.document.open();
        printWindow.document.write(`
            <html>
                <head>
                    ${headHtml}
                    <style>
                        @page {
                            size: A4 portrait;
                            margin: 4mm 6mm;
                        }
                        @media print {
                            html, body {
                                margin: 0;
                                padding: 0;
                                background: white;
                            }
                            .page-break {
                                page-break-before: always;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="print-container">
                        ${printContainer.innerHTML}
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 300);
    };

    const renderPreviewPart = (partNumber: 1 | 2) => renderDeathRiskFundPreviewPart(partNumber, data);

    const _renderPreviewPartOriginal = (partNumber: 1 | 2) => {
        const isPart1 = partNumber === 1;
        const showDeclaration = isPart1;

        return (
            <div className={`half-page-form bg-white border border-gray-300 p-1.5 ${isPart1 ? 'mb-0.5' : ''}`} style={{ minHeight: '48vh', fontSize: '11px' }}>
                {/* Header Section */}
                <div className="mb-1 border-b-2 border-gray-400 pb-0.5">
                    {/* Centered Logo and Title */}
                    <div className="flex flex-col items-center justify-center mb-1">
                        <div className="flex items-center gap-2">
                            <img
                                src="/logo.png"
                                alt="Logo"
                                className="h-12 w-12 object-contain print:h-10 print:w-10"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }}
                            />
                            <div className="text-center">
                                <h1 className="text-base font-bold leading-tight print:text-sm">মৌসুমী</h1>
                                <p className="text-[9px] leading-tight print:text-[8px]">মৃত্যুজনিত ঋণঝুঁকি তহবিলে অন্তর্ভুক্তির আবেদনপত্র</p>
                                <p className="text-[9px] font-semibold mt-0.5 text-gray-700 print:text-[8px]">
                                    {isPart1 ? 'প্রথম অংশ (প্রোফাইলে সংযুক্ত করতে হবে)' : 'দ্বিতীয় অংশ (পাশবইয়ে সংযুক্ত করতে হবে)'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Bottom: Photos (only Part 1), Branch, Date */}
                    <div className="flex items-center justify-between">
                        {isPart1 && (
                            <div className="flex gap-1">
                                <div className="border border-gray-400 p-0.5">
                                    {data.loan_recipient_photo ? (
                                        <img src={data.loan_recipient_photo} alt="Loan Recipient" className="w-14 h-18 object-cover" />
                                    ) : (
                                        <div className="w-14 h-18 bg-gray-100 border border-dashed"></div>
                                    )}
                                </div>
                                <div className="border border-gray-400 p-0.5">
                                    {data.guardian_photo ? (
                                        <img src={data.guardian_photo} alt="Guardian" className="w-14 h-18 object-cover" />
                                    ) : (
                                        <div className="w-14 h-18 bg-gray-100 border border-dashed"></div>
                                    )}
                                </div>
                            </div>
                        )}
                        {!isPart1 && <div></div>}
                        <div className="text-[9px] text-right">
                            <p className="mb-0.5">শাখা: <span className="border-b border-dotted border-gray-600 inline-block min-w-[70px]">{data.branch_name}</span></p>
                            <p>তারিখ: <span className="border-b border-dotted border-gray-600 inline-block min-w-[60px]">{formatDateBangla(data.date)}</span></p>
                        </div>
                    </div>
                </div>

                {/* Section 1: Loan Recipient Information */}
                <div className="mb-1" style={{ fontSize: '10px' }}>
                    <h3 className="font-bold mb-0.5" style={{ fontSize: '10px' }}>১। ঋণ গ্রহীতার তথ্য:</h3>
                    <div className="space-y-0.5">
                        <div className="flex gap-1 items-baseline">
                            <span className="w-28 flex-shrink-0">ঋণ গ্রহীতার নাম:</span>
                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{data.loan_recipient_name || ''}</span>
                        </div>
                        <div className="flex gap-1 items-baseline">
                            <span className="w-28 flex-shrink-0">কোড নম্বর:</span>
                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{data.loan_recipient_code1 || ''}</span>
                            <span className="w-28 flex-shrink-0 ml-1.5">কোড নম্বর:</span>
                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{data.loan_recipient_code2 || ''}</span>
                        </div>
                        <div className="flex gap-1 items-baseline">
                            <span className="w-28 flex-shrink-0">সমিতির নাম:</span>
                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{data.samity_name || ''}</span>
                        </div>
                        <div className="flex gap-1 items-baseline">
                            <span className="w-28 flex-shrink-0">গ্রাম:</span>
                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{data.village || ''}</span>
                            <span className="w-20 flex-shrink-0 ml-1.5">পোস্ট কোড:</span>
                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{data.post_office || ''}</span>
                        </div>
                        <div className="flex gap-1 items-baseline">
                            <span className="w-20 flex-shrink-0">উপজেলা:</span>
                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{data.upazila || ''}</span>
                            <span className="w-20 flex-shrink-0 ml-1.5">জেলা:</span>
                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{data.district || ''}</span>
                        </div>
                        <div className="flex gap-1 items-baseline">
                            <span className="w-28 flex-shrink-0">বয়স:</span>
                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{data.age || ''}</span>
                            <span className="w-36 flex-shrink-0 ml-1.5">জাতীয় পরিচয়পত্র নম্বর:</span>
                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{data.nid_number || ''}</span>
                        </div>
                        <div className="flex gap-1 items-baseline">
                            <span className="w-28 flex-shrink-0">মোবাইল নম্বর:</span>
                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{data.mobile_number || ''}</span>
                        </div>
                        <div className="flex gap-1 items-baseline">
                            <span className="w-28 flex-shrink-0">কম্পোনেন্টের নাম:</span>
                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{data.component_name || ''}</span>
                        </div>
                        <div className="flex gap-1 items-baseline">
                            <span className="w-28 flex-shrink-0">ঋণ গ্রহণের তারিখ:</span>
                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{formatDateBangla(data.loan_sanction_date) || ''}</span>
                        </div>
                        <div className="flex gap-1 items-baseline">
                            <span className="w-36 flex-shrink-0">গ্রহণকৃত ঋণের পরিমাণ:</span>
                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{data.loan_amount_received || ''}</span>
                            <span className="w-16 flex-shrink-0 ml-1.5">কথায়:</span>
                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{data.loan_amount_words || ''}</span>
                        </div>
                        <div className="flex gap-1 items-baseline">
                            <span className="w-28 flex-shrink-0">ঋণের মেয়াদ:</span>
                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{data.loan_term || ''}</span>
                        </div>
                    </div>
                </div>

                {/* Section 2: Guardian Information */}
                <div className="mb-1" style={{ fontSize: '10px' }}>
                    <h3 className="font-bold mb-0.5" style={{ fontSize: '10px' }}>২। অভিভাবক/পরিবারের প্রধান উপার্জনকারী ব্যক্তির তথ্য:</h3>
                    <div className="space-y-0.5">
                        <div className="flex gap-1 items-baseline">
                            <span className="w-44 flex-shrink-0">অভিভাবক/পরিবারের প্রধান উপার্জনকারী ব্যক্তির নাম:</span>
                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{data.guardian_name || ''}</span>
                        </div>
                        <div className="flex gap-1 items-baseline">
                            <span className="w-20 flex-shrink-0">বয়স:</span>
                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{data.guardian_age || ''}</span>
                            <span className="w-36 flex-shrink-0 ml-1.5">ঋণ গ্রহীতার সাথে সম্পর্ক:</span>
                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{data.relationship_with_recipient || ''}</span>
                        </div>
                        <div className="flex gap-1 items-baseline">
                            <span className="w-20 flex-shrink-0">গ্রাম:</span>
                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{data.guardian_village || ''}</span>
                            <span className="w-20 flex-shrink-0 ml-1.5">পোস্ট কোড:</span>
                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{data.guardian_post_office || ''}</span>
                        </div>
                        <div className="flex gap-1 items-baseline">
                            <span className="w-20 flex-shrink-0">উপজেলা:</span>
                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{data.guardian_upazila || ''}</span>
                            <span className="w-20 flex-shrink-0 ml-1.5">জেলা:</span>
                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{data.guardian_district || ''}</span>
                        </div>
                        <div className="flex gap-1 items-baseline">
                            <span className="w-36 flex-shrink-0">জাতীয় পরিচয়পত্র নম্বর:</span>
                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{data.guardian_nid || ''}</span>
                        </div>
                        <div className="flex gap-1 items-baseline">
                            <span className="w-28 flex-shrink-0">মোবাইল নম্বর:</span>
                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{data.guardian_mobile || ''}</span>
                        </div>
                        <div className="flex gap-1 items-baseline">
                            <span className="w-28 flex-shrink-0">প্রধান পেশা:</span>
                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{data.guardian_profession || ''}</span>
                        </div>
                    </div>
                </div>

                {/* Declaration (only Part 1) */}
                {showDeclaration && (
                    <div className="mb-1 leading-relaxed p-0.5 bg-gray-50 border border-gray-300" style={{ fontSize: '9px' }}>
                        <p className="font-semibold mb-0.5" style={{ fontSize: '10px' }}>ঘোষণা:</p>
                        <p>আমরা এই মর্মে ঘোষণা করছি যে, উপরিল্লিখিত সকল তথ্য সঠিক ও সত্য। আমরা ঋণঝুঁকি তহবিলের সকল নিয়মাবলি ও শর্তাবলি মেনে এবং বুঝে স্বাক্ষর করছি। অনুগ্রহপূর্বক আমাদেরকে ঋণঝুঁকি তহবিলের সদস্য হিসেবে অর্ন্তভুক্ত করলে বাধিত হব।</p>
                    </div>
                )}

                {/* Signatures */}
                <div className="mt-1 space-y-0.5" style={{ fontSize: '9px' }}>
                    <div className="flex gap-1.5">
                        <div className="flex-1">
                            <p className="mb-0.5">ঋণ গ্রহীতার স্বাক্ষর:</p>
                            <div className="border-b border-dotted border-gray-600 h-4">
                                {data.loan_recipient_signature && (
                                    <img src={data.loan_recipient_signature} alt="Signature" className="h-3.5 object-contain" />
                                )}
                            </div>
                        </div>
                        {isPart1 && (
                            <div className="flex-1">
                                <p className="mb-0.5">অভিভাবক/পরিবারের প্রধান উপার্জনকারীর স্বাক্ষর:</p>
                                <div className="border-b border-dotted border-gray-600 h-4">
                                    {data.guardian_signature && (
                                        <img src={data.guardian_signature} alt="Signature" className="h-3.5 object-contain" />
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-1.5">
                        <div className="flex-1">
                            <p className="mb-0.5">অফিসারের স্বাক্ষর ও সিল:</p>
                            <div className="border-b border-dotted border-gray-600 h-4">
                                {data.officer_signature && (
                                    <img src={data.officer_signature} alt="Signature" className="h-3.5 object-contain" />
                                )}
                            </div>
                        </div>
                        <div className="flex-1">
                            <p className="mb-0.5">হিসাবরক্ষকের স্বাক্ষর ও সিল:</p>
                            <div className="border-b border-dotted border-gray-600 h-4">
                                {data.accountant_signature && (
                                    <img src={data.accountant_signature} alt="Signature" className="h-3.5 object-contain" />
                                )}
                            </div>
                        </div>
                    </div>
                    <div>
                        <p className="mb-0.5">অনুমোদনকারী শাখাব্যবস্থাপকের স্বাক্ষর ও সিল:</p>
                        <div className="border-b border-dotted border-gray-600 h-4 w-1/2">
                            {data.branch_manager_signature && (
                                <img src={data.branch_manager_signature} alt="Signature" className="h-3.5 object-contain" />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderFormPart = (partNumber: 1 | 2) => {
        const isPart1 = partNumber === 1;
        const showDeclaration = isPart1;

        return (
            <div className="bg-white rounded-lg shadow-sm p-4 border">
                <h2 className="text-lg font-bold mb-4 text-center print:hidden">
                    ফর্ম পূরণ করুন (একবার পূরণ করলে ২টি কপিতে একই তথ্য যাবে)
                </h2>

                {/* Header Section */}
                <div className="mb-4 border-b pb-3">
                    <div className="flex flex-col items-center justify-center mb-3">
                        <div className="flex items-center gap-3">
                            <img
                                src="/logo.png"
                                alt="Logo"
                                className="h-16 w-16 object-contain"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }}
                            />
                            <div className="text-center">
                                <h1 className="text-xl font-bold">মৌসুমী</h1>
                                <p className="text-sm">মৃত্যুজনিত ঋণঝুঁকি তহবিলে অন্তর্ভুক্তির আবেদনপত্র</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex gap-2 flex-wrap items-start">
                            {data.loan_recipient_photo ? (
                                <div className="relative text-center">
                                    <img src={data.loan_recipient_photo} alt="Loan Recipient" className="w-20 h-24 object-cover border rounded" />
                                    <button type="button" onClick={() => removeImage('loan_recipient_photo')} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1">
                                        <X className="w-3 h-3" />
                                    </button>
                                    <p className="text-[10px] text-gray-600 mt-1">আবেদনকারীর ছবি</p>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center w-24 h-28 bg-gray-100 border-2 border-dashed border-gray-300 rounded cursor-pointer hover:bg-gray-200">
                                    <Upload className="w-6 h-6 text-gray-500 mb-1" />
                                    <span className="text-[10px] text-center text-gray-600 px-1">আবেদনকারীর ছবি</span>
                                    <span className="text-[9px] text-gray-500">(Loan Recipient)</span>
                                    <input type="file" accept="image/png,image/jpg,image/jpeg" className="hidden" onChange={(e) => handleImageUpload('loan_recipient_photo', e.target.files?.[0] || null)} />
                                </label>
                            )}
                            {data.guardian_photo ? (
                                <div className="relative text-center">
                                    <img src={data.guardian_photo} alt="Guardian" className="w-20 h-24 object-cover border rounded" />
                                    <button type="button" onClick={() => removeImage('guardian_photo')} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1">
                                        <X className="w-3 h-3" />
                                    </button>
                                    <p className="text-[10px] text-gray-600 mt-1">জামিনদার/অভিভাবকের ছবি</p>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center w-24 h-28 bg-gray-100 border-2 border-dashed border-gray-300 rounded cursor-pointer hover:bg-gray-200">
                                    <Upload className="w-6 h-6 text-gray-500 mb-1" />
                                    <span className="text-[10px] text-center text-gray-600 px-1">জামিনদার/অভিভাবকের ছবি</span>
                                    <span className="text-[9px] text-gray-500">(Guardian)</span>
                                    <input type="file" accept="image/png,image/jpg,image/jpeg" className="hidden" onChange={(e) => handleImageUpload('guardian_photo', e.target.files?.[0] || null)} />
                                </label>
                            )}
                        </div>
                        <div className="text-sm text-right">
                            <p>শাখা: <span className="border-b border-dotted border-gray-600 inline-block min-w-[100px]">{data.branch_name}</span></p>
                            <p className="mt-1">তারিখ: <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px]">{formatDateBangla(data.date)}</span></p>
                        </div>
                    </div>
                </div>

                {/* Section 1: Loan Recipient Information */}
                <div className="mb-4">
                    <h3 className="font-bold mb-2">১। ঋণ গ্রহীতার তথ্য:</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <label className="block text-xs mb-1">ঋণ গ্রহীতার নাম:</label>
                            <input
                                type="text"
                                value={data.loan_recipient_name}
                                onChange={(e) => setData('loan_recipient_name', e.target.value)}
                                className="w-full px-2 py-1 border rounded"
                            />
                        </div>
                        <div>
                            <label className="block text-xs mb-1">কোড নম্বর (সদস্য):</label>
                            <input
                                type="text"
                                value={data.loan_recipient_code1}
                                onChange={(e) => setData('loan_recipient_code1', e.target.value)}
                                className="w-full px-2 py-1 border rounded"
                                placeholder="সদস্য কোড"
                            />
                        </div>
                        <div>
                            <label className="block text-xs mb-1">
                                কোড নম্বর (ঋণ): <span className="text-red-600">*</span>
                            </label>
                            <input
                                type="text"
                                value={data.loan_recipient_code2}
                                onChange={(e) => {
                                    setData('loan_recipient_code2', e.target.value);
                                    if (errors.loan_recipient_code2) {
                                        setErrors(prev => {
                                            const newErrors = { ...prev };
                                            delete newErrors.loan_recipient_code2;
                                            return newErrors;
                                        });
                                    }
                                }}
                                className={`w-full px-2 py-1 border rounded ${errors.loan_recipient_code2 ? 'border-red-500 bg-red-50' : ''}`}
                                placeholder="সদস্য কোড নম্বর"
                            />
                            {errors.loan_recipient_code2 && (
                                <p className="text-xs text-red-600 mt-0.5">{errors.loan_recipient_code2}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs mb-1">সমিতির নাম:</label>
                            <input
                                type="text"
                                value={data.samity_name}
                                onChange={(e) => setData('samity_name', e.target.value)}
                                className="w-full px-2 py-1 border rounded"
                            />
                        </div>
                        <div>
                            <label className="block text-xs mb-1">গ্রাম:</label>
                            <input
                                type="text"
                                value={data.village}
                                onChange={(e) => setData('village', e.target.value)}
                                className="w-full px-2 py-1 border rounded"
                            />
                        </div>
                        <div>
                            <label className="block text-xs mb-1">
                                পোস্ট কোড: <span className="text-red-600">*</span>
                            </label>
                            <input
                                type="text"
                                value={data.post_office}
                                onChange={(e) => {
                                    setData('post_office', e.target.value);
                                    if (errors.post_office) {
                                        setErrors(prev => {
                                            const newErrors = { ...prev };
                                            delete newErrors.post_office;
                                            return newErrors;
                                        });
                                    }
                                }}
                                className={`w-full px-2 py-1 border rounded ${errors.post_office ? 'border-red-500 bg-red-50' : ''}`}
                                placeholder="পোস্ট কোড"
                            />
                            {errors.post_office && (
                                <p className="text-xs text-red-600 mt-0.5">{errors.post_office}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs mb-1">উপজেলা:</label>
                            <input
                                type="text"
                                value={data.upazila}
                                onChange={(e) => setData('upazila', e.target.value)}
                                className="w-full px-2 py-1 border rounded"
                            />
                        </div>
                        <div>
                            <label className="block text-xs mb-1">জেলা:</label>
                            <input
                                type="text"
                                value={data.district}
                                onChange={(e) => setData('district', e.target.value)}
                                className="w-full px-2 py-1 border rounded"
                            />
                        </div>
                        <div>
                            <label className="block text-xs mb-1">বয়স:</label>
                            <input
                                type="number"
                                value={data.age}
                                onChange={(e) => setData('age', parseInt(e.target.value))}
                                className="w-full px-2 py-1 border rounded"
                            />
                        </div>
                        <div>
                            <label className="block text-xs mb-1">জাতীয় পরিচয়পত্র নম্বর:</label>
                            <input
                                type="text"
                                value={data.nid_number}
                                onChange={(e) => setData('nid_number', e.target.value)}
                                className="w-full px-2 py-1 border rounded"
                            />
                        </div>
                        <div>
                            <label className="block text-xs mb-1">মোবাইল নম্বর:</label>
                            <input
                                type="text"
                                value={data.mobile_number}
                                onChange={(e) => setData('mobile_number', e.target.value)}
                                className="w-full px-2 py-1 border rounded"
                            />
                        </div>
                        <div>
                            <label className="block text-xs mb-1">
                                কম্পোনেন্টের নাম: <span className="text-red-600">*</span>
                            </label>
                            <input
                                type="text"
                                value={data.component_name}
                                onChange={(e) => {
                                    setData('component_name', e.target.value);
                                    if (errors.component_name) {
                                        setErrors(prev => {
                                            const newErrors = { ...prev };
                                            delete newErrors.component_name;
                                            return newErrors;
                                        });
                                    }
                                }}
                                className={`w-full px-2 py-1 border rounded ${errors.component_name ? 'border-red-500 bg-red-50' : ''}`}
                            />
                            {errors.component_name && (
                                <p className="text-xs text-red-600 mt-0.5">{errors.component_name}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs mb-1">
                                ঋণ গ্রহণের তারিখ: <span className="text-red-600">*</span>
                            </label>
                            <input
                                type="date"
                                value={data.loan_sanction_date}
                                onChange={(e) => {
                                    setData('loan_sanction_date', e.target.value);
                                    if (errors.loan_sanction_date) {
                                        setErrors(prev => {
                                            const newErrors = { ...prev };
                                            delete newErrors.loan_sanction_date;
                                            return newErrors;
                                        });
                                    }
                                }}
                                className={`w-full px-2 py-1 border rounded ${errors.loan_sanction_date ? 'border-red-500 bg-red-50' : ''}`}
                            />
                            {errors.loan_sanction_date && (
                                <p className="text-xs text-red-600 mt-0.5">{errors.loan_sanction_date}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs mb-1">
                                গ্রহণকৃত ঋণের পরিমাণ: <span className="text-red-600">*</span>
                            </label>
                            <input
                                type="number"
                                value={data.loan_amount_received}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    const num = parseFloat(v);
                                    setData('loan_amount_received', isNaN(num) ? 0 : num);
                                    const words = numberToWordsBangla(v);
                                    setData('loan_amount_words', words ? words + ' টাকা' : '');
                                    if (errors.loan_amount_received) {
                                        setErrors(prev => {
                                            const newErrors = { ...prev };
                                            delete newErrors.loan_amount_received;
                                            return newErrors;
                                        });
                                    }
                                }}
                                className={`w-full px-2 py-1 border rounded ${errors.loan_amount_received ? 'border-red-500 bg-red-50' : ''}`}
                            />
                            {errors.loan_amount_received && (
                                <p className="text-xs text-red-600 mt-0.5">{errors.loan_amount_received}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs mb-1">কথায়:</label>
                            <input
                                type="text"
                                value={data.loan_amount_words}
                                readOnly
                                placeholder="কথায় অটো আসবে"
                                className="w-full px-2 py-1 border rounded bg-gray-100 text-gray-700 cursor-not-allowed"
                            />
                        </div>
                        <div>
                            <label className="block text-xs mb-1">
                                ঋণের মেয়াদ: <span className="text-red-600">*</span>
                            </label>
                            <input
                                type="text"
                                value={data.loan_term}
                                onChange={(e) => {
                                    setData('loan_term', e.target.value);
                                    if (errors.loan_term) {
                                        setErrors(prev => {
                                            const newErrors = { ...prev };
                                            delete newErrors.loan_term;
                                            return newErrors;
                                        });
                                    }
                                }}
                                placeholder="যেমন: ১২ মাস"
                                className={`w-full px-2 py-1 border rounded ${errors.loan_term ? 'border-red-500 bg-red-50' : ''}`}
                            />
                            {errors.loan_term && (
                                <p className="text-xs text-red-600 mt-0.5">{errors.loan_term}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Section 2: Guardian Information */}
                <div className="mb-4">
                    <h3 className="font-bold mb-2">২। অভিভাবক/পরিবারের প্রধান উপার্জনকারী ব্যক্তির তথ্য:</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <label className="block text-xs mb-1">
                                নাম: <span className="text-red-600">*</span>
                            </label>
                            <input
                                type="text"
                                value={data.guardian_name}
                                onChange={(e) => {
                                    setData('guardian_name', e.target.value);
                                    if (errors.guardian_name) {
                                        setErrors(prev => {
                                            const newErrors = { ...prev };
                                            delete newErrors.guardian_name;
                                            return newErrors;
                                        });
                                    }
                                }}
                                className={`w-full px-2 py-1 border rounded ${errors.guardian_name ? 'border-red-500 bg-red-50' : ''}`}
                                placeholder="অভিভাবকের নাম"
                            />
                            {errors.guardian_name && (
                                <p className="text-xs text-red-600 mt-0.5">{errors.guardian_name}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs mb-1">
                                বয়স: <span className="text-red-600">*</span>
                            </label>
                            <input
                                type="number"
                                value={data.guardian_age}
                                onChange={(e) => {
                                    setData('guardian_age', parseInt(e.target.value));
                                    if (errors.guardian_age) {
                                        setErrors(prev => {
                                            const newErrors = { ...prev };
                                            delete newErrors.guardian_age;
                                            return newErrors;
                                        });
                                    }
                                }}
                                className={`w-full px-2 py-1 border rounded ${errors.guardian_age ? 'border-red-500 bg-red-50' : ''}`}
                            />
                            {errors.guardian_age && (
                                <p className="text-xs text-red-600 mt-0.5">{errors.guardian_age}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs mb-1">
                                ঋণ গ্রহীতার সাথে সম্পর্ক: <span className="text-red-600">*</span>
                            </label>
                            <select
                                value={data.relationship_with_recipient}
                                onChange={(e) => {
                                    setData('relationship_with_recipient', e.target.value);
                                    if (errors.relationship_with_recipient) {
                                        setErrors(prev => {
                                            const newErrors = { ...prev };
                                            delete newErrors.relationship_with_recipient;
                                            return newErrors;
                                        });
                                    }
                                }}
                                className={`w-full px-2 py-1 border rounded ${errors.relationship_with_recipient ? 'border-red-500 bg-red-50' : ''}`}
                            >
                                <option value="">সম্পর্ক নির্বাচন করুন</option>
                                <option value="পিতা">পিতা</option>
                                <option value="মাতা">মাতা</option>
                                <option value="স্বামী">স্বামী</option>
                                <option value="স্ত্রী">স্ত্রী</option>
                                <option value="পুত্র">পুত্র</option>
                                <option value="কন্যা">কন্যা</option>
                                <option value="ভাই">ভাই</option>
                                <option value="বোন">বোন</option>
                                <option value="অন্যান্য">অন্যান্য</option>
                            </select>
                            {errors.relationship_with_recipient && (
                                <p className="text-xs text-red-600 mt-0.5">{errors.relationship_with_recipient}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs mb-1">
                                গ্রাম: <span className="text-red-600">*</span>
                            </label>
                            <input
                                type="text"
                                value={data.guardian_village}
                                onChange={(e) => {
                                    setData('guardian_village', e.target.value);
                                    if (errors.guardian_village) {
                                        setErrors(prev => {
                                            const newErrors = { ...prev };
                                            delete newErrors.guardian_village;
                                            return newErrors;
                                        });
                                    }
                                }}
                                className={`w-full px-2 py-1 border rounded ${errors.guardian_village ? 'border-red-500 bg-red-50' : ''}`}
                            />
                            {errors.guardian_village && (
                                <p className="text-xs text-red-600 mt-0.5">{errors.guardian_village}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs mb-1">
                                পোস্ট কোড: <span className="text-red-600">*</span>
                            </label>
                            <input
                                type="text"
                                value={data.guardian_post_office}
                                onChange={(e) => {
                                    setData('guardian_post_office', e.target.value);
                                    if (errors.guardian_post_office) {
                                        setErrors(prev => {
                                            const newErrors = { ...prev };
                                            delete newErrors.guardian_post_office;
                                            return newErrors;
                                        });
                                    }
                                }}
                                className={`w-full px-2 py-1 border rounded ${errors.guardian_post_office ? 'border-red-500 bg-red-50' : ''}`}
                            />
                            {errors.guardian_post_office && (
                                <p className="text-xs text-red-600 mt-0.5">{errors.guardian_post_office}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs mb-1">
                                উপজেলা: <span className="text-red-600">*</span>
                            </label>
                            <input
                                type="text"
                                value={data.guardian_upazila}
                                onChange={(e) => {
                                    setData('guardian_upazila', e.target.value);
                                    if (errors.guardian_upazila) {
                                        setErrors(prev => {
                                            const newErrors = { ...prev };
                                            delete newErrors.guardian_upazila;
                                            return newErrors;
                                        });
                                    }
                                }}
                                className={`w-full px-2 py-1 border rounded ${errors.guardian_upazila ? 'border-red-500 bg-red-50' : ''}`}
                            />
                            {errors.guardian_upazila && (
                                <p className="text-xs text-red-600 mt-0.5">{errors.guardian_upazila}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs mb-1">
                                জেলা: <span className="text-red-600">*</span>
                            </label>
                            <input
                                type="text"
                                value={data.guardian_district}
                                onChange={(e) => {
                                    setData('guardian_district', e.target.value);
                                    if (errors.guardian_district) {
                                        setErrors(prev => {
                                            const newErrors = { ...prev };
                                            delete newErrors.guardian_district;
                                            return newErrors;
                                        });
                                    }
                                }}
                                className={`w-full px-2 py-1 border rounded ${errors.guardian_district ? 'border-red-500 bg-red-50' : ''}`}
                            />
                            {errors.guardian_district && (
                                <p className="text-xs text-red-600 mt-0.5">{errors.guardian_district}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs mb-1">
                                জাতীয় পরিচয়পত্র নম্বর: <span className="text-red-600">*</span>
                            </label>
                            <input
                                type="text"
                                value={data.guardian_nid}
                                onChange={(e) => {
                                    setData('guardian_nid', e.target.value);
                                    if (errors.guardian_nid) {
                                        setErrors(prev => {
                                            const newErrors = { ...prev };
                                            delete newErrors.guardian_nid;
                                            return newErrors;
                                        });
                                    }
                                }}
                                className={`w-full px-2 py-1 border rounded ${errors.guardian_nid ? 'border-red-500 bg-red-50' : ''}`}
                            />
                            {errors.guardian_nid && (
                                <p className="text-xs text-red-600 mt-0.5">{errors.guardian_nid}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs mb-1">
                                মোবাইল নম্বর: <span className="text-red-600">*</span>
                            </label>
                            <input
                                type="text"
                                value={data.guardian_mobile}
                                onChange={(e) => {
                                    setData('guardian_mobile', e.target.value);
                                    if (errors.guardian_mobile) {
                                        setErrors(prev => {
                                            const newErrors = { ...prev };
                                            delete newErrors.guardian_mobile;
                                            return newErrors;
                                        });
                                    }
                                }}
                                className={`w-full px-2 py-1 border rounded ${errors.guardian_mobile ? 'border-red-500 bg-red-50' : ''}`}
                            />
                            {errors.guardian_mobile && (
                                <p className="text-xs text-red-600 mt-0.5">{errors.guardian_mobile}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs mb-1">
                                প্রধান পেশা: <span className="text-red-600">*</span>
                            </label>
                            <input
                                type="text"
                                value={data.guardian_profession}
                                onChange={(e) => {
                                    setData('guardian_profession', e.target.value);
                                    if (errors.guardian_profession) {
                                        setErrors(prev => {
                                            const newErrors = { ...prev };
                                            delete newErrors.guardian_profession;
                                            return newErrors;
                                        });
                                    }
                                }}
                                placeholder="যেমন: কৃষি, ব্যবসা"
                                className={`w-full px-2 py-1 border rounded ${errors.guardian_profession ? 'border-red-500 bg-red-50' : ''}`}
                            />
                            {errors.guardian_profession && (
                                <p className="text-xs text-red-600 mt-0.5">{errors.guardian_profession}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Declaration (only in Part 1) */}
                {showDeclaration && (
                    <div className="mb-4 p-3 bg-gray-50 border rounded">
                        <p className="text-sm leading-relaxed">
                            <strong>ঘোষণা:</strong> আমরা এই মর্মে ঘোষণা করছি যে, উপরিল্লিখিত সকল তথ্য সঠিক ও সত্য। আমরা ঋণঝুঁকি তহবিলের সকল নিয়মাবলি ও শর্তাবলি মেনে এবং বুঝে স্বাক্ষর করছি। অনুগ্রহপূর্বক আমাদেরকে ঋণঝুঁকি তহবিলের সদস্য হিসেবে অর্ন্তভুক্ত করলে বাধিত হব।
                        </p>
                    </div>
                )}
            </div>
        );
    };

    const pageContent = (
        <>
            <Head title="মৃত্যুজনিত ঋণঝুঁকি তহবিলে অন্তর্ভুক্তির আবেদন পত্র">
                <style>{`
                    @media print {
                        @page {
                            size: A4 portrait;
                            margin: 4mm 6mm;
                        }
                        html, body, #app {
                            margin: 0 !important;
                            padding: 0 !important;
                            background: white !important;
                        }
                        body * {
                            visibility: hidden !important;
                        }
                        .print-container,
                        .print-container * {
                            visibility: visible !important;
                        }
                        nav, header, aside, .sidebar, [role="navigation"],
                        .print\\:hidden {
                            display: none !important;
                        }
                        .print-container {
                            position: absolute !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: 100% !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            page-break-after: avoid !important;
                            break-after: avoid !important;
                        }
                        /* Two copies on one A4 page (top & bottom) */
                        .half-page-form {
                            page-break-inside: avoid !important;
                            break-inside: avoid !important;
                            border: 1px solid #4b5563 !important;
                            padding: 6px 10px !important;
                        }
                        .border-dotted {
                            border-style: dotted !important;
                        }
                        .page-break {
                            page-break-before: auto !important;
                            break-before: auto !important;
                        }
                    }
                `}</style>
            </Head>

            <div className="max-w-[1600px] mx-auto p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-4 print:hidden">
                    {!embedded && <div className="flex items-center gap-3">
                        <button
                            onClick={() =>
                                router.visit(
                                    resolveBackUrl(
                                        afterSaveUrl,
                                        isLegacy,
                                        member,
                                        loanProduct,
                                        loanCategory,
                                        requestedAmount,
                                        existingApplication,
                                    ),
                                )
                            }
                            className="flex items-center gap-2 px-3 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back
                        </button>
                        <div>
                            <h1 className="text-lg font-bold">মৃত্যুজনিত ঋণঝুঁকি তহবিলে অন্তর্ভুক্তির আবেদন পত্র</h1>
                            <p className="text-xs text-gray-600">Form পূরণ করুন এবং সংরক্ষণ করুন।</p>
                            {existingApplication && (
                                <p className="text-xs text-blue-600 mt-1">
                                    ✓ Draft সংরক্ষিত আছে - আবেদন নং: {existingApplication.application_no || 'Pending'}
                                </p>
                            )}
                        </div>
                    </div>}
                    <div className="flex gap-2">
                        <button
                            onClick={handleSaveDraft}
                            disabled={processing}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" />
                            {processing ? 'সংরক্ষণ হচ্ছে...' : (saveButtonLabel || 'সংরক্ষণ করুন')}
                        </button>
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700"
                        >
                            <Printer className="w-4 h-4" />
                            Print
                        </button>
                    </div>
                </div>

                {/* Form Content - Left: Input, Right: Preview */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 print:grid-cols-1">
                    {/* LEFT SIDE: INPUT FORM (Common for both copies) */}
                    <div className="space-y-4 print:hidden">
                        {/* Single Input Form - same data for both copies */}
                        {renderFormPart(1)}
                    </div>

                    {/* RIGHT SIDE: PREVIEW */}
                    <div className="lg:sticky lg:top-4 lg:h-fit print:block print-container death-risk-print">
                        <div className="bg-white rounded-lg shadow-lg p-3 print:shadow-none print:p-0 print:rounded-none print:bg-white">
                            <h3 className="text-sm font-bold mb-2 print:hidden">Preview (2 Copies on A4)</h3>
                            <div className="space-y-1 print:space-y-0.5">
                                {/* Same A4 page e 2 copy (top & bottom) - Preview mode with dotted lines */}
                                {renderPreviewPart(1)}
                                <div className="border-t border-dashed border-gray-400 my-1 print:my-0.5"></div>
                                {renderPreviewPart(2)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );

    return embedded ? pageContent : <AdminLayout>{pageContent}</AdminLayout>;
}
