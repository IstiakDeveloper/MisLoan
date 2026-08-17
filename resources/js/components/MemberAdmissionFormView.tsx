import React from 'react';
import { MemberAdmission } from '@/types/memberAdmission';
import { formatDate } from '@/utils/dateUtils';
import { useAutoFitPrint } from '@/hooks/useAutoFitPrint';

interface Props {
    admission: MemberAdmission & {
        customer_photo_path?: string | null;
        customer_nid_photo_path?: string | null;
        guardian_photo_path?: string | null;
        guardian_nid_photo_path?: string | null;
        applicant_signature_path?: string | null;
        guardian_signature_path?: string | null;
        employee_name?: string | null;
        surveyor_signature_path?: string | null;
        surveyor_pin?: string | null;
        submitted_by_signature_path?: string | null;
        submitted_by_pin?: string | null;
        createdBy?: { id: number; name: string } | null;
        submittedBy?: { id: number; name: string } | null;
        approvals?: Array<{
            id: number;
            user: { id: number; name: string };
            level: string;
            status: string;
            approver_signature?: string | null;
            approver_pin?: string | null;
            approved_at?: string;
        }>;
    };
    /** Compact layout for print */
    printMode?: boolean;
}

function num(v: number | null | undefined): string {
    if (v == null || v === undefined) return '';
    return String(v);
}

/** Amount: .00 দেখাবে না, শুধু অশূন্য দশমিক থাকলে (যেমন .25) দেখাবে */
function formatAmount(v: number | string | null | undefined): string {
    if (v == null || v === undefined) return '';
    const n = typeof v === 'string' ? parseFloat(v) : Number(v);
    if (Number.isNaN(n)) return '';
    if (Number.isInteger(n)) return String(n);
    return String(n).replace(/\.?0+$/, '');
}

function str(v: string | number | null | undefined): string {
    if (v == null || v === undefined) return '';
    return String(v);
}

/** Single row with label and value on dotted line (form style) with distinct breathing room */
function FormRow({
    label,
    value,
    className = '',
}: {
    label: string;
    value: string | number;
    className?: string;
}) {
    const v = value != null && value !== '' ? String(value) : '';
    return (
        <div className={`flex flex-wrap sm:flex-nowrap items-baseline sm:items-end gap-1.5 sm:gap-2 min-h-[30px] py-1 print:flex-nowrap print:items-end ${className}`}>
            <span className="text-[13.5px] print:text-[13px] font-bold shrink-0 text-gray-900 leading-normal pb-0.5">
                {label}
            </span>
            <span className="border-b border-dotted border-gray-600 flex-1 min-w-[80px] text-[13.5px] print:text-[13px] leading-relaxed font-medium text-gray-900 pb-0.5">
                {v || '\u00A0'}
            </span>
        </div>
    );
}

const maritalLabels: Record<string, string> = {
    single: 'অবিবাহিত',
    married: 'বিবাহিত',
    divorced: 'তালাকপ্রাপ্ত',
    widowed: 'বিধবা/বিধুর',
};

const genderLabels: Record<string, string> = {
    male: 'পুরুষ',
    female: 'মহিলা',
    other: 'অন্যান্য',
};

export default function MemberAdmissionFormView({ admission, printMode }: Props) {
    useAutoFitPrint([admission], '.member-admission-print');

    return (
        <div
            className="member-admission-print w-full max-w-[210mm] mx-auto text-gray-900"
            style={{ fontFamily: 'Kalpurush, "Noto Sans Bengali", Arial, sans-serif' }}
        >
            <style>{`
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 8mm 10mm;
                    }
                    body {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        background: #fff !important;
                    }
                    .print-page-sheet {
                        width: 100% !important;
                        max-width: 100% !important;
                        min-height: 278mm !important;
                        max-height: 278mm !important;
                        box-sizing: border-box !important;
                        page-break-after: always !important;
                        break-after: page !important;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                        overflow: hidden !important;
                        position: relative !important;
                        margin: 0 !important;
                        padding: 0 0 3mm 0 !important;
                        display: flex !important;
                        flex-direction: column !important;
                        justify-content: space-between !important;
                        background: #ffffff !important;
                        border: none !important;
                    }
                    .print-page-sheet:last-child {
                        page-break-after: auto !important;
                        break-after: auto !important;
                    }
                    .print-page-content {
                        width: 100% !important;
                        box-sizing: border-box !important;
                    }
                }
                @media screen {
                    .print-page-sheet {
                        min-height: auto;
                        margin-bottom: 24px;
                        box-sizing: border-box;
                        display: flex;
                        flex-direction: column;
                        justify-content: space-between;
                        background: #ffffff;
                    }
                }
            `}</style>

            {/* ==================== PAGE 1 (Sheet 1) ==================== */}
            <div
                className="print-page-sheet bg-white border border-gray-300 p-3.5 sm:p-8 pb-6 sm:pb-10 print:p-0 print:border-none text-[13.5px] print:text-[13px] leading-normal"
                data-print-page="1"
            >
                <div className="print-page-content flex flex-col justify-between h-full">
                    <div>
                        {/* Header */}
                        <header className="mb-5 pb-3.5 border-b-2 border-gray-700">
                            <div className="flex flex-col sm:grid sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center w-full gap-3 sm:gap-0 print:grid print:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
                                {/* Left: Logo and Dates */}
                                <div className="flex flex-row items-center justify-self-start min-w-0 sm:min-w-[210px]">
                                    <img
                                        src="/logo.png"
                                        alt="Logo"
                                        className="h-16 w-16 object-contain print:h-16 print:w-16"
                                        style={{ height: '70px', width: '70px' }}
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                    />
                                    <div className="flex flex-col justify-center items-start gap-1.5 ml-3">
                                        <div className="flex items-baseline gap-1.5 flex-wrap">
                                            <span className="text-[13px] print:text-[12.5px] font-bold text-gray-900 shrink-0">জরিপের তারিখ:</span>
                                            <span className="border-b border-dotted border-gray-700 min-w-[80px] text-[13px] print:text-[12.5px] text-gray-900 font-bold">
                                                {formatDate(admission.survey_date)}
                                            </span>
                                        </div>
                                        <div className="flex items-baseline gap-1.5 flex-wrap">
                                            <span className="text-[13px] print:text-[12.5px] font-bold text-gray-900 shrink-0">ভর্তির তারিখ:</span>
                                            <span className="border-b border-dotted border-gray-700 min-w-[80px] text-[13px] print:text-[12.5px] text-gray-900 font-bold">
                                                {formatDate(admission.admission_date)}
                                            </span>
                                        </div>
                                        {admission.is_legacy && (
                                            <div className="flex items-baseline gap-1.5 flex-wrap">
                                                <span className="text-[12.5px] print:text-[12px] font-bold text-amber-800 shrink-0">সদস্য ধরন:</span>
                                                <span className="text-[12.5px] print:text-[12px] font-bold text-amber-800">
                                                    পুরাতন{admission.loan_dofa ? ` (দফা ${admission.loan_dofa})` : ''}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Center: Title & Application No */}
                                <div className="flex flex-col items-center justify-center text-center px-2 sm:px-4 my-2 sm:my-0">
                                    <h1 className="text-3xl font-black text-gray-900 print:text-2xl leading-tight">মৌসুমী</h1>
                                    <p className="text-xs text-gray-800 leading-tight mt-0.5 font-bold">উকিলপাড়া, নওগাঁ।</p>
                                    <div className="mt-1.5 bg-gray-900 text-white px-4 py-1.5 flex items-center justify-center rounded">
                                        <h2 className="font-bold text-[13.5px] print:text-[13px] m-0 leading-none">জরিপ ও সদস্য ভর্তির আবেদন পত্র</h2>
                                    </div>
                                    <span className="text-[14.5px] print:text-[14px] text-gray-900 font-black mt-1.5">
                                        সদস্য নং: {admission.application_no}
                                    </span>
                                </div>

                                {/* Right: Photo Box */}
                                <div
                                    className="border-2 border-gray-800 flex items-center justify-center bg-white overflow-hidden text-gray-600 text-xs font-bold shrink-0 justify-self-end"
                                    style={{ width: 88, height: 88 }}
                                >
                                    {admission.customer_photo_path ? (
                                        <img src={`/storage/${admission.customer_photo_path}`} alt="Member" className="w-full h-full object-cover" />
                                    ) : (
                                        <span>ছবি</span>
                                    )}
                                </div>
                            </div>
                        </header>

                        {/* Declaration */}
                        <div className="mb-4 px-1">
                            <p className="text-[13.5px] print:text-[13px] leading-loose text-gray-800 font-normal">
                                আমি নিম্ন স্বাক্ষরকারী মৌসুমী'র উদ্যোগে গঠিত{' '}
                                <span className="border-b border-dotted border-gray-700 px-3 inline-block min-w-[140px] text-center font-bold">
                                    {admission.samity?.samity_name ?? ''}
                                </span>{' '}
                                সমিতির সদস্য হতে ইচ্ছুক। আমি অঙ্গীকার করছি যে, সমিতির সমস্ত নিয়ম-কানুন যথাযথভাবে মেনে চলব। নিম্নে আমার সম্পর্কে যে সমস্ত তথ্য ও জীবন বৃত্তান্ত দিয়েছি তা সম্পূর্ণ সত্য।
                            </p>
                        </div>

                        {/* Personal Info (1-9) with spacious vertical gaps */}
                        <div className="mb-4 space-y-3 sm:space-y-3.5">
                            <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-x-8 gap-y-2 sm:gap-y-3.5">
                                <FormRow label="1. Samity Name :" value={admission.samity?.samity_name ?? ''} />
                                <FormRow label="2. Member Category:" value={admission.member_category?.category_name ?? ''} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-x-8 gap-y-2 sm:gap-y-3.5">
                                <div className="space-y-2 sm:space-y-3">
                                    <FormRow label="৩. আবেদনকারীর নাম (বাংলায়) :" value={admission.applicant_name_bn} />
                                    <FormRow label="৪. পিতার নাম (বাংলায়) :" value={admission.father_name_bn} />
                                    <FormRow label="৫. মাতার নাম (বাংলায়) :" value={admission.mother_name_bn} />
                                    <FormRow label="৬. স্বামী/স্ত্রীর নাম (বাংলায়) :" value={str(admission.spouse_name_bn)} />
                                </div>
                                <div className="space-y-2 sm:space-y-3">
                                    <FormRow label="Applicant's Name (English) :" value={admission.applicant_name_en} />
                                    <FormRow label="Father's Name (English) :" value={admission.father_name_en} />
                                    <FormRow label="Mother's Name (English) :" value={admission.mother_name_en} />
                                    <FormRow label="Spouse Name (English) :" value={str(admission.spouse_name_en)} />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-x-5 gap-y-2 sm:gap-y-3 pt-1">
                                <FormRow label="৭. বৈবাহিক অবস্থা :" value={maritalLabels[admission.marital_status] || admission.marital_status} />
                                <FormRow label="৮. মোবাইল নং :" value={admission.mobile_number} />
                                <FormRow label="৯. বিকল্প মোবাইল নং :" value={str(admission.alternative_mobile)} />
                            </div>
                        </div>

                        {/* Present Address (10) */}
                        <div className="mb-4 space-y-2">
                            <p className="font-bold text-[14px] text-gray-900">10. Present Address (বর্তমান ঠিকানা):</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 print:grid-cols-3 gap-x-4 gap-y-2 sm:gap-y-3">
                                <FormRow label="বিভাগ:" value={admission.present_division} />
                                <FormRow label="জেলা:" value={admission.present_district} />
                                <FormRow label="উপজেলা:" value={admission.present_upazila} />
                                <FormRow label="ইউনিয়ন:" value={str(admission.present_union)} />
                                <FormRow label="গ্রাম/রাস্তা:" value={str(admission.present_village_road)} />
                                <FormRow label="পোস্ট কোড:" value={str(admission.present_post_code)} />
                            </div>
                        </div>

                        {/* Permanent Address (11) */}
                        <div className="mb-4 space-y-2">
                            <p className="font-bold text-[14px] text-gray-900">11. Permanent Address (স্থায়ী ঠিকানা):</p>
                            {admission.permanent_address_same ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 print:grid-cols-3 gap-x-4 gap-y-2 sm:gap-y-3">
                                    <FormRow label="বিভাগ:" value={admission.present_division} />
                                    <FormRow label="জেলা:" value={admission.present_district} />
                                    <FormRow label="উপজেলা:" value={admission.present_upazila} />
                                    <FormRow label="ইউনিয়ন:" value={str(admission.present_union)} />
                                    <FormRow label="গ্রাম/রাস্তা:" value={str(admission.present_village_road)} />
                                    <FormRow label="পোস্ট কোড:" value={str(admission.present_post_code)} />
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 print:grid-cols-3 gap-x-4 gap-y-2 sm:gap-y-3">
                                    <FormRow label="বিভাগ:" value={str(admission.permanent_division)} />
                                    <FormRow label="জেলা:" value={str(admission.permanent_district)} />
                                    <FormRow label="উপজেলা:" value={str(admission.permanent_upazila)} />
                                    <FormRow label="ইউনিয়ন:" value={str(admission.permanent_union)} />
                                    <FormRow label="গ্রাম/রাস্তা:" value={str(admission.permanent_village_road)} />
                                    <FormRow label="পোস্ট কোড:" value={str(admission.permanent_post_code)} />
                                </div>
                            )}
                        </div>

                        {/* Identity (12-15) */}
                        <div className="mb-4 space-y-3">
                            <p className="font-bold text-[14px] text-gray-900">12. Identity Information:</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-x-8 gap-y-2 sm:gap-y-3">
                                <FormRow label="National ID No. :" value={str(admission.nid_number)} />
                                <FormRow label="Smart Card No. :" value={str(admission.smart_card_number)} />
                            </div>
                            <FormRow label="13. Other Identity: জন্ম সনদ নং (প্রযোজ্য ক্ষেত্রে):" value={str(admission.birth_certificate_number)} />
                            <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-x-5 gap-y-2 sm:gap-y-3">
                                <FormRow label="Date of Birth :" value={formatDate(admission.date_of_birth)} />
                                <FormRow label="Gender :" value={genderLabels[admission.gender] || admission.gender} />
                                <FormRow label="Family Mobile:" value={str(admission.family_member_mobile)} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-x-8 gap-y-2 sm:gap-y-3">
                                <FormRow label="14. Co-Applicant/Guarantor :" value={str(admission.guarantor_name)} />
                                <FormRow label="Guarantor Mobile:" value={str(admission.guarantor_mobile)} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-x-8 gap-y-2 sm:gap-y-3 items-baseline">
                                <FormRow label="15. TIN (ট্যাক্স সার্টিফিকেট নং):" value={str(admission.tin_number)} />
                                <div className="flex items-center gap-2 py-1 flex-wrap">
                                    <span className="text-[14px] print:text-[13.5px] font-bold text-gray-900">সদস্য কি এসএমএস সেবা নিতে চান?</span>
                                    <span className="border-b border-dotted border-gray-700 min-w-[45px] text-center font-bold">
                                        {admission.want_sms_service ? 'হ্যাঁ' : 'না'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Family Table (16) */}
                        <div className="mb-4">
                            <p className="font-bold text-[14px] text-gray-900 mb-1.5">১৬. পরিবারের তথ্য:</p>
                            <div className="overflow-x-auto print:overflow-visible">
                                <table className="w-full min-w-[580px] print:min-w-0 border-collapse border border-gray-700 text-[13px] print:text-[12.5px]">
                                    <thead>
                                        <tr className="bg-gray-100 font-bold">
                                            <th className="border border-gray-700 px-2 py-2 w-10 text-center" rowSpan={2}>ক্রঃ</th>
                                            <th className="border border-gray-700 px-2 py-2 text-center" rowSpan={2}>গ্রাহক ও পরিবারের সদস্যের নাম</th>
                                            <th className="border border-gray-700 px-2 py-2 text-center" rowSpan={2}>সম্পর্ক</th>
                                            <th className="border border-gray-700 px-2 py-2 w-14 text-center" rowSpan={2}>লিঙ্গ</th>
                                            <th className="border border-gray-700 px-2 py-2 text-center" colSpan={2}>বয়স</th>
                                            <th className="border border-gray-700 px-2 py-2 text-center" rowSpan={2}>বৈবাহিক অবস্থা</th>
                                            <th className="border border-gray-700 px-2 py-2 text-center" rowSpan={2}>শিক্ষা</th>
                                            <th className="border border-gray-700 px-2 py-2 text-center" rowSpan={2}>পেশা</th>
                                            <th className="border border-gray-700 px-2 py-2 text-center" rowSpan={2}>মাসিক আয়</th>
                                        </tr>
                                        <tr className="bg-gray-50 font-bold">
                                            <th className="border border-gray-700 px-1.5 py-1 w-12 text-center">বছর</th>
                                            <th className="border border-gray-700 px-1.5 py-1 w-12 text-center">মাস</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Array.from({ length: 6 }, (_, i) => {
                                            const m = admission.family_members?.[i];
                                            const cellClass = 'border border-gray-700 px-2 py-1.5 text-center align-middle h-8 print:h-[28px]';
                                            return (
                                                <tr key={i}>
                                                    <td className={cellClass}>{i + 1}</td>
                                                    <td className={`${cellClass} text-left px-2.5 font-medium`}>{m?.member_name ?? ''}</td>
                                                    <td className={cellClass}>{m?.relation_with_head ?? ''}</td>
                                                    <td className={cellClass}>{m ? (genderLabels[m.gender] || m.gender) : ''}</td>
                                                    <td className={cellClass}>{m?.age_years ?? ''}</td>
                                                    <td className={cellClass}>{m?.age_months ?? ''}</td>
                                                    <td className={cellClass}>{m?.marital_status ? (maritalLabels[m.marital_status] || m.marital_status) : ''}</td>
                                                    <td className={cellClass}>{m?.education_level ?? ''}</td>
                                                    <td className={cellClass}>{m?.occupation ?? ''}</td>
                                                    <td className={cellClass}>{formatAmount(m?.monthly_income)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Financial Activities & 17, 18 */}
                        <div className="space-y-2.5 mt-2.5">
                            <div className="flex gap-7 items-center flex-wrap">
                                <span className="font-bold text-[14px] text-gray-900">আর্থিক কর্মকাণ্ড (✓ দিন):</span>
                                <span className={`text-[14px] ${admission.business_details ? 'font-bold' : ''}`}>ক. ব্যবসা {admission.business_details ? '✓' : ''}</span>
                                <span className={`text-[14px] ${admission.job_details ? 'font-bold' : ''}`}>খ. চাকরি {admission.job_details ? '✓' : ''}</span>
                                <span className={`text-[14px] ${admission.other_income_details ? 'font-bold' : ''}`}>গ. অন্যান্য {admission.other_income_details ? '✓' : ''}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-2.5">
                                <FormRow label="১৭. মোট সম্পদের পরিমাণ:" value={formatAmount(admission.total_asset_value)} />
                                <FormRow label="১৮. বাড়ীর ধরণ:" value={str(admission.house_type)} />
                            </div>
                        </div>
                    </div>

                    {/* Page 1 Footer */}
                    <div className="pt-3 pb-1 mt-auto border-t border-gray-400 flex justify-between items-center text-[12.5px] text-gray-600">
                        <span>সদস্য ভর্তি আবেদন - পাতা ১</span>
                        <span className="font-bold">১ / ২</span>
                    </div>
                </div>
            </div>

            {/* ==================== PAGE 2 (Sheet 2) ==================== */}
            <div
                className="print-page-sheet bg-white border border-gray-300 p-3.5 sm:p-8 pb-6 sm:pb-10 print:p-0 print:border-none text-[14px] print:text-[13.5px] leading-normal"
                data-print-page="2"
            >
                <div className="print-page-content flex flex-col justify-between h-full">
                    <div>
                        {/* Section 19: Permanent Assets Header */}
                        <div className="mb-6 space-y-4">
                            <p className="font-bold text-[16.5px] print:text-[16px] text-gray-900 border-b-2 border-gray-700 pb-2.5 mb-4">১৯. গ্রাহকের স্থায়ী সম্পদের বিবরণ:</p>
                            
                            {/* (i) House Counts */}
                            <div className="flex items-center gap-4 flex-wrap py-1">
                                <span className="text-[14px] font-bold text-gray-900">(i) মোট ঘর:</span>
                                <span className="border-2 border-gray-700 rounded px-3.5 py-1 text-center min-w-[42px] font-bold bg-white leading-none text-[14.5px]">
                                    {(admission.mud_house_count || 0) + (admission.tin_house_count || 0) + (admission.brick_house_count || 0) + (admission.semi_brick_house_count || 0) || ''}
                                </span>
                                <span className="text-[14px] text-gray-800 ml-2 font-medium">ক) মাটির:</span>
                                <span className="border border-gray-700 rounded px-3 py-1 text-center min-w-[34px] bg-white leading-none font-bold">{num(admission.mud_house_count)}</span>
                                <span className="text-[14px] text-gray-800 ml-2 font-medium">খ) টিন:</span>
                                <span className="border border-gray-700 rounded px-3 py-1 text-center min-w-[34px] bg-white leading-none font-bold">{num(admission.tin_house_count)}</span>
                                <span className="text-[14px] text-gray-800 ml-2 font-medium">গ) পাকা:</span>
                                <span className="border border-gray-700 rounded px-3 py-1 text-center min-w-[34px] bg-white leading-none font-bold">{num(admission.brick_house_count)}</span>
                                <span className="text-[14px] text-gray-800 ml-2 font-medium">ঘ) আধা পাকা:</span>
                                <span className="border border-gray-700 rounded px-3 py-1 text-center min-w-[34px] bg-white leading-none font-bold">{num(admission.semi_brick_house_count)}</span>
                            </div>

                            {/* (ii) Livestock */}
                            <div className="flex items-center gap-4 flex-wrap py-1">
                                <span className="text-[14px] font-bold text-gray-900">(ii) গবাদি পশু-পাখি:</span>
                                <span className="text-[14px] text-gray-800 font-medium">গরু/মহিষ:</span>
                                <span className="border border-gray-700 rounded px-3 py-1 text-center min-w-[34px] bg-white leading-none font-bold">{num(admission.cow_buffalo_count)}</span>
                                <span className="text-[14px] text-gray-800 ml-2 font-medium">ছাগল/ভেড়া:</span>
                                <span className="border border-gray-700 rounded px-3 py-1 text-center min-w-[34px] bg-white leading-none font-bold">{num(admission.goat_sheep_count)}</span>
                                <span className="text-[14px] text-gray-800 ml-2 font-medium">হাঁস-মুরগী:</span>
                                <span className="border border-gray-700 rounded px-3 py-1 text-center min-w-[34px] bg-white leading-none font-bold">{num(admission.duck_chicken_count)}</span>
                                <span className="text-[14px] text-gray-800 ml-2 font-medium">অন্যান্য:</span>
                                <span className="border border-gray-700 rounded px-3 py-1 text-center min-w-[34px] bg-white leading-none font-bold">{num(admission.other_livestock_count)}</span>
                            </div>

                            {/* (iii) Land Amount & Value */}
                            <div className="py-1">
                                <p className="text-[14px] font-bold text-gray-900 mb-2">(iii) মালিকানাধীন জমি ও মূল্য (শতাংশে):</p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-3 sm:gap-5">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[14px] text-gray-800 shrink-0 font-bold">মোট:</span>
                                        <span className="border border-gray-700 rounded px-3 py-1 text-center min-w-[55px] leading-none font-bold">{formatAmount(admission.total_land_amount ?? (Number(admission.cultivable_land_amount) || 0) + (Number(admission.non_cultivable_land_amount) || 0))}</span>
                                        <span className="border border-gray-700 rounded px-3 py-1 text-center flex-1 leading-none font-bold">{formatAmount(admission.total_land_value ?? (Number(admission.cultivable_land_value) || 0) + (Number(admission.non_cultivable_land_value) || 0))}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[14px] text-gray-800 shrink-0 font-bold">আবাদযোগ্য:</span>
                                        <span className="border border-gray-700 rounded px-3 py-1 text-center min-w-[55px] leading-none font-bold">{formatAmount(admission.cultivable_land_amount)}</span>
                                        <span className="border border-gray-700 rounded px-3 py-1 text-center flex-1 leading-none font-bold">{formatAmount(admission.cultivable_land_value)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[14px] text-gray-800 shrink-0 font-bold">অনাবাদী:</span>
                                        <span className="border border-gray-700 rounded px-3 py-1 text-center min-w-[55px] leading-none font-bold">{formatAmount(admission.non_cultivable_land_amount)}</span>
                                        <span className="border border-gray-700 rounded px-3 py-1 text-center flex-1 leading-none font-bold">{formatAmount(admission.non_cultivable_land_value)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* (iv) Other Movable Assets Table */}
                            <div className="pt-1">
                                <p className="text-[14px] font-bold text-gray-900 mb-2">গ) অন্যান্য অস্থায়ী সম্পদের বিবরণ:</p>
                                <div className="overflow-x-auto print:overflow-visible">
                                    <table className="w-full min-w-[500px] print:min-w-0 border-collapse border border-gray-700 text-[13px] print:text-[12.5px]">
                                        <thead>
                                            <tr className="bg-gray-100 font-bold">
                                                <th className="border border-gray-700 px-3 py-2 w-10 text-center">ক্রঃ</th>
                                                <th className="border border-gray-700 px-3 py-2 text-left">অস্থায়ী সম্পদের বিবরণ</th>
                                                <th className="border border-gray-700 px-3 py-2 w-36 text-center">সংখ্যা/পরিমাণ</th>
                                                <th className="border border-gray-700 px-3 py-2 w-40 text-center">সম্ভাব্য মূল্য</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Array.from({ length: 5 }, (_, i) => {
                                                const a = admission.other_assets?.[i];
                                                const cellClass = 'border border-gray-700 px-3 py-2 text-center align-middle h-8.5 print:h-[30px]';
                                                return (
                                                    <tr key={i}>
                                                        <td className={cellClass}>{i + 1}</td>
                                                        <td className={`${cellClass} text-left px-3.5 font-medium`}>{a?.asset_description ?? ''}</td>
                                                        <td className={cellClass}>{a?.quantity_amount ?? ''}</td>
                                                        <td className={cellClass}>{formatAmount(a?.estimated_value)}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot>
                                            <tr className="bg-gray-50 font-black">
                                                <td className="border border-gray-700 px-3 py-2 text-center" colSpan={2}>মোট</td>
                                                <td className="border border-gray-700 px-3 py-2 text-center">-</td>
                                                <td className="border border-gray-700 px-3 py-2 text-center">
                                                    {formatAmount(admission.other_assets?.reduce((s, a) => s + (Number(a.estimated_value) || 0), 0))}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Sections 20-23 */}
                        <div className="mb-6 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-y-3.5 gap-x-8">
                                <FormRow label="২০. মাসিক আয়:" value={formatAmount(admission.monthly_income)} />
                                <FormRow label="মাসিক ব্যয়:" value={formatAmount(admission.monthly_expense)} />
                                <FormRow label="সঞ্চয়:" value={formatAmount(admission.monthly_savings)} />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-y-3.5 gap-x-10">
                                <FormRow label="২১. কর্মকর্তার নাম:" value={str(admission.interviewer_name)} />
                                <FormRow label="পিন নং:" value={str(admission.employee_name || (admission as any).surveyor_pin)} />
                            </div>
                            <FormRow label="২২. অন্যান্য সংস্থা হতে ঋণ গ্রহণের তথ্য:" value={str(admission.other_loan_info)} />
                            <div className="pt-1">
                                <p className="font-bold text-[14px] text-gray-900 mb-1.5">২৩. তথ্য সংগ্রহকারীর মন্তব্য: পরিবার কি ঋণ কর্মসূচির যোগ্য?</p>
                                <div className="border border-gray-700 min-h-[120px] print:min-h-[110px] p-3.5 text-[13.5px] print:text-[13px] leading-relaxed break-words">
                                    {str(admission.collector_comment)}
                                </div>
                            </div>
                        </div>

                        {/* Declaration & Signatures */}
                        <div className="mt-5 space-y-4">
                            <p className="text-[13.5px] print:text-[13px] text-gray-800 leading-loose">
                                উপরোক্ত তথ্য ও জীবন বৃত্তান্তের উপর ভিত্তি করে আমাকে সদস্যপদ প্রদান করার জন্য আবেদন করছি।
                            </p>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-y-4 gap-x-14 items-end">
                                <div className="flex items-baseline gap-2 py-1">
                                    <span className="text-[14px] font-bold shrink-0">আবেদনকারীর স্বাক্ষর:</span>
                                    <span className="border-b border-dotted border-gray-700 flex-1 min-h-[46px] flex items-end">
                                        {(admission.applicant_signature_path || (admission as any).applicant_signature) ? (
                                            <img src={`/storage/${admission.applicant_signature_path || (admission as any).applicant_signature}`} alt="" className="h-10 object-contain" />
                                        ) : null}
                                    </span>
                                </div>
                                <div className="flex items-baseline gap-2 py-1">
                                    <span className="text-[14px] font-bold shrink-0">সদস্য নং:</span>
                                    <span className="border-b border-dotted border-gray-700 flex-1 text-center font-bold text-[14.5px]">{admission.application_no}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-y-4 gap-x-14 items-end">
                                <div className="flex items-baseline gap-2 py-1">
                                    <span className="text-[14px] font-bold shrink-0">আবেদনকারীর নাম:</span>
                                    <span className="border-b border-dotted border-gray-700 flex-1 font-bold text-[14.5px]">{admission.applicant_name_bn}</span>
                                </div>
                                <div className="flex items-baseline gap-2 py-1">
                                    <span className="text-[14px] font-bold shrink-0">সমিতির কোড নং:</span>
                                    <span className="border-b border-dotted border-gray-700 flex-1 text-center font-bold text-[14.5px]">{admission.samity?.samity_code ?? admission.samity?.id ?? ''}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-y-4 gap-x-14 items-end">
                                <div className="flex items-baseline gap-2 py-1">
                                    <span className="text-[14px] font-bold shrink-0">অভিভাবকের স্বাক্ষর:</span>
                                    <span className="border-b border-dotted border-gray-700 flex-1 min-h-[46px] flex items-end">
                                        {(admission as any).guardian_signature_path ? (
                                            <img src={`/storage/${(admission as any).guardian_signature_path}`} alt="" className="h-10 object-contain" />
                                        ) : null}
                                    </span>
                                </div>
                                <FormRow label="অভিভাবকের নাম:" value={str(admission.guardian_name)} />
                            </div>

                            {/* 3 Signature Boxes */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-6 sm:gap-10 pt-7">
                                {/* Officer Signature */}
                                <div className="text-center">
                                    <div className="border-b-2 border-dotted border-gray-700 flex items-end justify-center mb-1.5" style={{ height: '82px' }}>
                                        {(admission as any).surveyor_signature_path ? (
                                            <img src={`/storage/${(admission as any).surveyor_signature_path}`} alt="" className="max-h-14 w-auto object-contain" />
                                        ) : null}
                                    </div>
                                    <p className="text-[14px] font-bold text-gray-900">অফিসারের স্বাক্ষর ও তারিখ</p>
                                    <p className="text-[12.5px] text-gray-600 font-semibold mt-0.5">পিন: {(admission as any).surveyor_pin ?? '—'}</p>
                                </div>

                                {/* Branch Manager Signature */}
                                <div className="text-center">
                                    <div className="border-b-2 border-dotted border-gray-700 flex items-end justify-center mb-1.5" style={{ height: '82px' }}>
                                        {(admission as any).submitted_by_signature_path ? (
                                            <img src={`/storage/${(admission as any).submitted_by_signature_path}`} alt="" className="max-h-14 w-auto object-contain" />
                                        ) : null}
                                    </div>
                                    <p className="text-[14px] font-bold text-gray-900">শাখা ব্যবস্থাপকের স্বাক্ষর ও তারিখ</p>
                                    <p className="text-[12.5px] text-gray-600 font-semibold mt-0.5">পিন: {(admission as any).submitted_by_pin ?? '—'}</p>
                                </div>

                                {/* Accountant Signature */}
                                <div className="text-center">
                                    <div className="border-b-2 border-dotted border-gray-700 flex items-end justify-center mb-1.5" style={{ height: '82px' }}>
                                        {admission.approvals?.filter((a: any) => a.status === 'approved')[0]?.approver_signature ? (
                                            <img src={`/storage/${admission.approvals.filter((a: any) => a.status === 'approved')[0].approver_signature}`} alt="" className="max-h-14 w-auto object-contain" />
                                        ) : null}
                                    </div>
                                    <p className="text-[14px] font-bold text-gray-900">হিসাবরক্ষকের স্বাক্ষর ও তারিখ</p>
                                    <p className="text-[12.5px] text-gray-600 font-semibold mt-0.5">পিন: {(admission.approvals?.filter((a: any) => a.status === 'approved')[0] as any)?.approver_pin ?? '—'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Page 2 Footer */}
                    <div className="pt-3 pb-1 mt-auto border-t border-gray-400 flex justify-between items-center text-[12.5px] text-gray-600">
                        <span>সদস্য ভর্তি আবেদন - পাতা ২</span>
                        <span className="font-bold">২ / ২</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
