import React from 'react';
import { MemberAdmission } from '@/types/memberAdmission';
import { formatDate } from '@/utils/dateUtils';

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
    /** Compact layout for print (smaller fonts, no photo box size) */
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

/** Single row with label and value on dotted line (form style) */
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
        <div className={`flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2 print:flex-row print:items-baseline print:gap-1.5 ${className}`}>
            <span className="text-xs print:text-[14px] shrink-0">{label}</span>
            <span className="border-b border-dotted border-gray-700 flex-1 min-w-0 break-words text-xs print:text-[14px] print:leading-relaxed">
                {v}
            </span>
        </div>
    );
}

/** Two columns in one row */
function FormRow2({
    label1,
    value1,
    label2,
    value2,
}: {
    label1: string;
    value1: string | number;
    label2: string;
    value2: string | number;
}) {
    return (
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 print:flex-row print:gap-6">
            <div className="flex items-baseline gap-2 flex-1 min-w-0">
                <span className="text-sm shrink-0">{label1}</span>
                <span className="border-b border-dotted border-gray-700 flex-1 min-w-0 break-words">
                    {value1 != null && value1 !== '' ? String(value1) : ''}
                </span>
            </div>
            <div className="flex items-baseline gap-2 flex-1 min-w-0">
                <span className="text-sm shrink-0">{label2}</span>
                <span className="border-b border-dotted border-gray-700 flex-1 min-w-0 break-words">
                    {value2 != null && value2 !== '' ? String(value2) : ''}
                </span>
            </div>
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
    const isPrint = printMode === true;

    return (
        <div
            className={`bg-white text-gray-900 ${isPrint ? 'text-[11pt]' : 'text-sm'} w-full max-w-[210mm] mx-auto border-0 sm:border border-gray-400 form-print-document print:border print:pt-8 print:leading-relaxed overflow-hidden sm:overflow-visible`}
            style={{ fontFamily: 'Noto Sans Bengali, Arial, sans-serif' }}
        >
            {/* ========== HEADER ========== */}
            <header className="form-print-section p-3 sm:p-4 print:p-2 print:py-2 print:mb-3 mb-3 sm:mb-4">
                {/* Mobile header */}
                <div className="flex flex-col gap-3 sm:hidden print:hidden">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                            <img src="/logo.png" alt="Logo" className="h-11 w-11 object-contain shrink-0" />
                            <div className="flex flex-col gap-1 min-w-0">
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-[11px] text-gray-900 shrink-0">জরিপ:</span>
                                    <span className="border-b border-dotted border-gray-700 text-[11px] min-w-0 truncate">
                                        {formatDate(admission.survey_date)}
                                    </span>
                                </div>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-[11px] text-gray-900 shrink-0">ভর্তি:</span>
                                    <span className="border-b border-dotted border-gray-700 text-[11px] min-w-0 truncate">
                                        {formatDate(admission.admission_date)}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div
                            className="border border-gray-800 flex items-center justify-center bg-white overflow-hidden text-gray-600 text-[10px] font-medium shrink-0"
                            style={{ width: 64, height: 64 }}
                        >
                            {admission.customer_photo_path ? (
                                <img src={`/storage/${admission.customer_photo_path}`} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <span>ছবি</span>
                            )}
                        </div>
                    </div>
                    <div className="text-center">
                        <h1 className="text-xl font-bold text-gray-900">মৌসুমী</h1>
                        <p className="text-xs text-gray-900 mt-0.5">উকিলপাড়া, নওগাঁ।</p>
                        <div className="mt-2 bg-gray-900 text-white px-2 py-1.5 rounded">
                            <h2 className="font-bold text-xs m-0">জরিপ ও সদস্য ভর্তির আবেদন পত্র</h2>
                        </div>
                        <p className="text-[11px] text-gray-900 font-medium mt-1.5">
                            সদস্য নং: {admission.application_no}
                        </p>
                    </div>
                </div>

                {/* Desktop / Print header */}
                <div className="hidden sm:grid print:grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch w-full">
                    {/* Left: Logo and Dates */}
                    <div
                        className="flex flex-row items-center justify-self-start min-w-0"
                        style={{ minWidth: isPrint ? 200 : 210 }}
                    >
                        <img
                            src="/logo.png"
                            alt="Logo"
                            className="h-12 w-12 object-contain print:h-12 print:w-12"
                        />
                        <div className="flex flex-col justify-center items-start gap-1 min-w-[125px] ml-2">
                            <div className="flex items-baseline gap-2 justify-center">
                                <span className="text-xs text-gray-900 shrink-0">জরিপের তারিখ:</span>
                                <span className="border-b border-dotted border-gray-700 min-w-[68px] text-gray-900">
                                    {formatDate(admission.survey_date)}
                                </span>
                            </div>
                            <div className="flex items-baseline justify-center">
                                <span className="text-xs text-gray-900 shrink-0">ভর্তির তারিখ:</span>
                                <span className="border-b border-dotted border-gray-700 min-w-[60px] text-gray-900">
                                    {formatDate(admission.admission_date)}
                                </span>
                            </div>
                            {admission.is_legacy && (
                                <div className="flex items-baseline gap-2 justify-center">
                                    <span className="text-xs text-amber-800 shrink-0">সদস্য ধরন:</span>
                                    <span className="text-xs font-semibold text-amber-800">
                                        পুরাতন{admission.loan_dofa ? ` (দফা ${admission.loan_dofa})` : ''}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col items-center justify-center min-w-0 relative justify-self-center">
                        <div className="flex flex-col items-center text-center w-full max-w-full">
                            <h1 className="text-2xl font-bold text-gray-900 print:text-xl w-full text-center">মৌসুমী</h1>
                            <p className="text-sm text-gray-900 mt-0.5 w-full text-center">উকিলপাড়া, নওগাঁ।</p>
                            <div className="mt-2 w-full grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                                <div className="min-w-0" />
                                <div className="bg-gray-900 text-white px-2 py-1.5 print:py-2 flex items-center rounded whitespace-nowrap shrink-0">
                                    <h2 className="font-bold text-sm print:text-xs m-0">জরিপ ও সদস্য ভর্তির আবেদন পত্র</h2>
                                </div>
                                <div className="min-w-0 flex justify-end">
                                    <span className="text-xs text-gray-900 font-normal whitespace-nowrap">
                                        সদস্য নং: {admission.application_no}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div
                        className="border border-gray-800 flex items-center justify-center bg-white overflow-hidden text-gray-600 text-xs font-medium shrink-0 justify-self-end"
                        style={{ width: isPrint ? 72 : 88, height: isPrint ? 72 : 88 }}
                    >
                        {admission.customer_photo_path ? (
                            <img src={`/storage/${admission.customer_photo_path}`} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <span>ছবি</span>
                        )}
                    </div>
                </div>
            </header>

            {/* Declaration */}
            <div className="form-print-section px-4 py-2.5 print:py-1.5 print:px-2 ">
                <p className="text-xs leading-relaxed text-gray-800 print:text-sm print:leading-loose">
                    আমি নিম্ন স্বাক্ষরকারী মৌসুমী'র উদ্যোগে গঠিত{' '}
                    <span className="border-b border-dotted border-gray-700 px-2 inline-block min-w-[120px] text-center">
                        {admission.samity?.samity_name ?? ''}
                    </span>{' '}
                    সমিতির সদস্য হতে ইচ্ছুক। আমি অঙ্গীকার করছি যে, সমিতির সমস্ত নিয়ম-কানুন যথাযথভাবে মেনে চলব। নিম্নে আমার সম্পর্কে যে সমস্ত তথ্য ও জীবন বৃত্তান্ত দিয়েছি তা সম্পূর্ণ সত্য।
                </p>
            </div>

            {/* ========== SECTION: Personal (1–9) — ২ গ্রিড: বাম = বাংলা, ডান = ইংরেজি ========== */}
            <div className="form-print-section px-3 py-2 print:py-1.5 print:px-2 space-y-2 print:space-y-3 ">
                <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-x-8 gap-y-1.5 print:gap-y-2.5">
                    <FormRow label="1. Samity Name :" value={admission.samity?.samity_name ?? ''} />
                    <FormRow label="2. Member Category:" value={admission.member_category?.category_name ?? ''} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 print:gap-y-2.5">
                    {/* বাম কলাম — বাংলা */}
                    <div className="space-y-1.5 print:space-y-2">
                        <FormRow label="৩. আবেদনকারীর নাম (বাংলায়) :" value={admission.applicant_name_bn} />
                        <FormRow label="৪. পিতার নাম (বাংলায়) :" value={admission.father_name_bn} />
                        <FormRow label="৫. মাতার নাম (বাংলায়) :" value={admission.mother_name_bn} />
                        <FormRow label="৬. স্বামী/স্ত্রীর নাম (বাংলায়) :" value={str(admission.spouse_name_bn)} />
                    </div>
                    {/* ডান কলাম — ইংরেজি */}
                    <div className="space-y-1.5 print:space-y-2">
                        <FormRow label="Applicant's Name (English) :" value={admission.applicant_name_en} />
                        <FormRow label="Father's Name (English) :" value={admission.father_name_en} />
                        <FormRow label="Mother's Name (English) :" value={admission.mother_name_en} />
                        <FormRow label="Spouse Name (English) :" value={str(admission.spouse_name_en)} />
                    </div>
                </div>
                {/* ৭, ৮, ৯ — পুরো প্রস্থে এক লাইনে */}
                <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1.5 print:gap-y-2 mt-2 print:mt-2.5">
                    <FormRow label="৭. বৈবাহিক অবস্থা :" value={maritalLabels[admission.marital_status] || admission.marital_status} />
                    <FormRow label="৮. মোবাইল নং :" value={admission.mobile_number} />
                    <FormRow label="৯. বিকল্প মোবাইল নং :" value={str(admission.alternative_mobile)} />
                </div>
            </div>

            {/* ========== SECTION: Present Address (10) — ৩ কলাম গ্রিড (৬টা = ২ সারি) ========== */}
            <div className="form-print-section px-3 py-2 print:py-1.5 print:px-2 space-y-1.5 print:space-y-2.5 ">
                <p className="font-medium text-xs text-gray-700">10. Present Address (বর্তমান ঠিকানা):</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 print:grid-cols-3 gap-x-3 gap-y-1.5 print:gap-x-4 print:gap-y-2">
                    <FormRow label="বিভাগ:" value={admission.present_division} />
                    <FormRow label="জেলা:" value={admission.present_district} />
                    <FormRow label="উপজেলা:" value={admission.present_upazila} />
                    <FormRow label="ইউনিয়ন:" value={str(admission.present_union)} />
                    <FormRow label="গ্রাম/রাস্তা:" value={str(admission.present_village_road)} />
                    <FormRow label="পোস্ট কোড:" value={str(admission.present_post_code)} />
                </div>
            </div>

            {/* ========== SECTION: Permanent Address (11) — ৩ কলাম গ্রিড; same address থাকলে উপরে দেখানো ========== */}
            <div className="form-print-section px-3 py-2 print:py-1.5 print:px-2 space-y-1.5 print:space-y-2.5 ">
                <p className="font-medium text-xs text-gray-700">11. Permanent Address (স্থায়ী ঠিকানা):</p>
                {admission.permanent_address_same ? (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 print:grid-cols-3 gap-x-3 gap-y-1.5 print:gap-x-4 print:gap-y-2">
                            <FormRow label="বিভাগ:" value={admission.present_division} />
                            <FormRow label="জেলা:" value={admission.present_district} />
                            <FormRow label="উপজেলা:" value={admission.present_upazila} />
                            <FormRow label="ইউনিয়ন:" value={str(admission.present_union)} />
                            <FormRow label="গ্রাম/রাস্তা:" value={str(admission.present_village_road)} />
                            <FormRow label="পোস্ট কোড:" value={str(admission.present_post_code)} />
                        </div>
                    </>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 print:grid-cols-3 gap-x-3 gap-y-1.5 print:gap-x-4 print:gap-y-2">
                        <FormRow label="বিভাগ:" value={str(admission.permanent_division)} />
                        <FormRow label="জেলা:" value={str(admission.permanent_district)} />
                        <FormRow label="উপজেলা:" value={str(admission.permanent_upazila)} />
                        <FormRow label="ইউনিয়ন:" value={str(admission.permanent_union)} />
                        <FormRow label="গ্রাম/রাস্তা:" value={str(admission.permanent_village_road)} />
                        <FormRow label="পোস্ট কোড:" value={str(admission.permanent_post_code)} />
                    </div>
                )}
            </div>

            {/* ========== SECTION: Identity (12–15) ========== */}
            <div className="form-print-section px-3 py-2 print:py-1.5 print:px-2 space-y-1.5 print:space-y-2.5 ">
                <p className="font-medium text-xs text-gray-700">12. Identity Information:</p>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 flex-wrap print:flex-row print:gap-6">
                    <FormRow label="National ID No. :" value={str(admission.nid_number)} className="w-full sm:flex-1" />
                    <FormRow label="Smart Card No. :" value={str(admission.smart_card_number)} className="w-full sm:flex-1" />
                </div>
                <div className="mt-2 space-y-1">
                    <FormRow label="13. Other Identity Information: জন্ম সনদ নং (প্রযোজ্য ক্ষেত্রে):" value={str(admission.birth_certificate_number)} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-[auto_auto_1fr] print:grid-cols-[auto_auto_1fr] gap-x-4 gap-y-1.5 print:gap-x-6 print:gap-y-2 mt-1.5 print:mt-2 items-baseline">
                    <FormRow label="Date of Birth :" value={formatDate(admission.date_of_birth)} className="min-w-0" />
                    <FormRow label="Gender :" value={genderLabels[admission.gender] || admission.gender} className="min-w-0" />
                    <FormRow label="Family Members Mobile Number:" value={str(admission.family_member_mobile)} className="min-w-0" />
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 flex-wrap print:flex-row print:gap-6">
                    <FormRow label="14. Co-Applicant/Guarantor Name :" value={str(admission.guarantor_name)} className="w-full sm:flex-1" />
                    <FormRow label="Guarantor Mobile Number:" value={str(admission.guarantor_mobile)} className="w-full sm:flex-1" />
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 flex-wrap items-start sm:items-center mt-1 print:flex-row print:gap-6">
                    <FormRow label="15. TIN (ট্র্যাক্স সার্টিফিকেট নং)" value={str(admission.tin_number)} className="w-full sm:flex-1" />
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm">সদস্য কি এসএমএস সেবা নিতে চান?</span>
                        <span className="border-b border-dotted border-gray-700 min-w-[40px]">
                            {admission.want_sms_service ? 'হ্যাঁ' : 'না'}
                        </span>
                    </div>
                </div>
            </div>

            {/* ========== SECTION 16: Family table ========== */}
            <div className="form-print-section px-3 py-2 print:py-1.5 print:px-2 ">
                <p className="font-medium text-xs text-gray-700 mb-2">১৬. পরিবারের তথ্য:</p>
                <div className="overflow-x-auto -mx-1 px-1 print:overflow-visible print:mx-0 print:px-0">
                <table className="w-full min-w-[720px] print:min-w-0 border border-gray-600 border-collapse text-xs print:text-sm">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="border border-gray-600 px-2 py-1.5 w-10 text-center">ক্রঃ নং</th>
                            <th className="border border-gray-600 px-2 py-1.5 text-center">গ্রাহক ও পরিবারের অন্যান্য সদস্যের নাম</th>
                            <th className="border border-gray-600 px-2 py-1.5 text-center">পরিবার প্রধানের সঙ্গে গ্রাহকের সম্পর্ক</th>
                            <th className="border border-gray-600 px-2 py-1.5 w-14 text-center">লিঙ্গ</th>
                            <th className="border border-gray-600 px-2 py-1.5 text-center" colSpan={2}>বয়স</th>
                            <th className="border border-gray-600 px-2 py-1.5 text-center">বৈবাহিক অবস্থা</th>
                            <th className="border border-gray-600 px-2 py-1.5 text-center">শিক্ষাগত যোগ্যতা</th>
                            <th className="border border-gray-600 px-2 py-1.5 text-center">পেশা</th>
                            <th className="border border-gray-600 px-2 py-1.5 text-center">মাসিক আয় (টাকা)</th>
                        </tr>
                        <tr className="bg-gray-50">
                            <th className="border border-gray-600 px-2 py-1" colSpan={4} />
                            <th className="border border-gray-600 px-2 py-1 w-12 text-center">বছর</th>
                            <th className="border border-gray-600 px-2 py-1 w-12 text-center">মাস</th>
                            <th className="border border-gray-600 px-2 py-1" colSpan={3} />
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: 6 }, (_, i) => {
                            const m = admission.family_members?.[i];
                            const cellClass = 'border border-gray-600 px-2 py-1.5 text-center align-middle';
                            return (
                                <tr key={i}>
                                    <td className={cellClass}>{i + 1}</td>
                                    <td className={cellClass}>{m?.member_name ?? ''}</td>
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

            {/* Financial activity checkboxes + 17, 18 — print: কম গ্যাপ, এক সাইজ টেক্সট */}
            <div className="form-print-section px-3 py-2 print:py-1 print:px-2 space-y-1.5 print:space-y-1">
                <p className="font-medium text-xs print:text-[14px] text-gray-700">আর্থিক কর্মকাণ্ড সম্পর্কিত (প্রযোজ্য ক্ষেত্রে ✓ চিহ্ন দিন):</p>
                <div className="flex gap-6 flex-wrap print:gap-3">
                    <span className={`text-xs print:text-[14px] ${admission.business_details ? 'font-bold' : ''}`}>ক. ব্যবসা {admission.business_details ? '✓' : ''}</span>
                    <span className={`text-xs print:text-[14px] ${admission.job_details ? 'font-bold' : ''}`}>খ. চাকরি {admission.job_details ? '✓' : ''}</span>
                    <span className={`text-xs print:text-[14px] ${admission.other_income_details ? 'font-bold' : ''}`}>গ. অন্যান্য {admission.other_income_details ? '✓' : ''}</span>
                </div>
                <div className="flex gap-6 flex-wrap print:gap-3">
                    <FormRow label="১৭. মোট সম্পদের পরিমাণ:" value={formatAmount(admission.total_asset_value)} />
                    <FormRow label="১৮. বাড়ীর ধরণ:" value={str(admission.house_type)} />
                </div>
            </div>

            {/* ========== SECTION 19: Permanent assets (2nd page — উপরে কম গ্যাপ, লাইন থেকে লাইনে ফাঁক) ========== */}
            <div className="form-print-section form-print-page-break-before px-3 py-2 print:pt-2 print:pb-3 print:px-3 space-y-2 print:space-y-3 print:leading-[1.9]">
                <p className="font-medium text-xs print:text-[14px] text-gray-700 print:mb-2 print:leading-[1.9]">১৯. গ্রাহকের স্থায়ী সম্পদের বিবরণ:</p>
                <div>
                    <div className="flex items-center gap-4 flex-wrap mt-1 print:mt-1 print:mb-3 print:gap-3 print:leading-[1.9]">
                        <span className="text-xs print:text-[14px] flex items-center gap-1.5">
                            <span className="text-gray-600">(i) মোট ঘরের সংখ্যা:</span>
                            <span className="border border-gray-600 rounded min-w-[2rem] w-8 h-6 print:h-7 print:min-h-0 print:py-1 print:px-2 inline-flex items-center justify-center text-center text-xs print:text-[14px] bg-white leading-none">
                                {(admission.mud_house_count || 0) + (admission.tin_house_count || 0) + (admission.brick_house_count || 0) + (admission.semi_brick_house_count || 0) || ''}
                            </span>
                        </span>
                        <span className="text-xs print:text-[14px] flex items-center gap-1.5">
                            <span className="text-gray-600">ক) ছনের ঘর/মাটির ঘর</span>
                            <span className="border border-gray-600 rounded min-w-[2rem] w-8 h-6 print:h-7 print:min-h-0 print:py-1 print:px-2 inline-flex items-center justify-center text-center text-xs print:text-[14px] bg-white leading-none">
                                {num(admission.mud_house_count)}
                            </span>
                        </span>
                        <span className="text-xs print:text-[14px] flex items-center gap-1.5">
                            <span className="text-gray-600">খ) টিন/টালী</span>
                            <span className="border border-gray-600 rounded min-w-[2rem] w-8 h-6 print:h-7 print:min-h-0 print:py-1 print:px-2 inline-flex items-center justify-center text-center text-xs print:text-[14px] bg-white leading-none">
                                {num(admission.tin_house_count)}
                            </span>
                        </span>
                        <span className="text-xs print:text-[14px] flex items-center gap-1.5">
                            <span className="text-gray-600">গ) পাকা</span>
                            <span className="border border-gray-600 rounded min-w-[2rem] w-8 h-6 print:h-7 print:min-h-0 print:py-1 print:px-2 inline-flex items-center justify-center text-center text-xs print:text-[14px] bg-white leading-none">
                                {num(admission.brick_house_count)}
                            </span>
                        </span>
                        <span className="text-xs print:text-[14px] flex items-center gap-1.5">
                            <span className="text-gray-600">ঘ) আধা পাকা</span>
                            <span className="border border-gray-600 rounded min-w-[2rem] w-8 h-6 print:h-7 print:min-h-0 print:py-1 print:px-2 inline-flex items-center justify-center text-center text-xs print:text-[14px] bg-white leading-none">
                                {num(admission.semi_brick_house_count)}
                            </span>
                        </span>
                    </div>
                </div>
                <div className="print:mt-3 print:mb-3">
                    <p className="text-xs print:text-[14px] text-gray-600 print:mb-2 print:leading-[1.9]">(ii) গবাদি পশু-পাখির তথ্য (সংখ্যায়):</p>
                    <div className="flex items-center gap-3 flex-wrap mt-1 print:mt-1 print:mb-2 print:gap-3 print:leading-[1.9]">
                        <span className="text-xs print:text-[14px] flex items-center gap-1.5">
                            <span className="text-gray-600">ক) গরু/মহিষ</span>
                            <span className="border border-gray-600 rounded min-w-[2rem] w-8 h-6 print:h-7 print:min-h-0 print:py-1 print:px-2 inline-flex items-center justify-center text-center text-xs print:text-[14px] bg-white leading-none">{num(admission.cow_buffalo_count)}</span>
                        </span>
                        <span className="text-xs print:text-[14px] flex items-center gap-1.5">
                            <span className="text-gray-600">খ) ছাগল/ভেড়া</span>
                            <span className="border border-gray-600 rounded min-w-[2rem] w-8 h-6 print:h-7 print:min-h-0 print:py-1 print:px-2 inline-flex items-center justify-center text-center text-xs print:text-[14px] bg-white leading-none">{num(admission.goat_sheep_count)}</span>
                        </span>
                        <span className="text-xs print:text-[14px] flex items-center gap-1.5">
                            <span className="text-gray-600">গ) হাঁস-মুরগী</span>
                            <span className="border border-gray-600 rounded min-w-[2rem] w-8 h-6 print:h-7 print:min-h-0 print:py-1 print:px-2 inline-flex items-center justify-center text-center text-xs print:text-[14px] bg-white leading-none">{num(admission.duck_chicken_count)}</span>
                        </span>
                        <span className="text-xs print:text-[14px] flex items-center gap-1.5">
                            <span className="text-gray-600">ঘ) অন্যান্য</span>
                            <span className="border border-gray-600 rounded min-w-[2rem] w-8 h-6 print:h-7 print:min-h-0 print:py-1 print:px-2 inline-flex items-center justify-center text-center text-xs print:text-[14px] bg-white leading-none">{num(admission.other_livestock_count)}</span>
                        </span>
                    </div>
                </div>
                <div className="print:mt-3 print:mb-3">
                    <p className="text-xs print:text-[14px] text-gray-600 print:mb-2 print:leading-[1.9]">(iii) গ্রাহকের মালিকানাধীন মোট জমির পরিমাণ ও মূল্য (শতাংশে):</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 print:grid-cols-3 gap-x-4 gap-y-2 print:gap-x-3 print:gap-y-2.5 mt-1 print:mt-2 print:mb-2 w-full print:leading-[1.9]">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-xs print:text-[14px] text-gray-600 shrink-0">মোট</span>
                            <span className="border border-gray-600 rounded min-w-[3.5rem] w-14 h-6 print:h-7 print:min-h-0 print:py-1 print:px-2 inline-flex items-center justify-center text-center text-xs print:text-[14px] bg-white shrink-0 leading-none">{formatAmount(admission.total_land_amount ?? (Number(admission.cultivable_land_amount) || 0) + (Number(admission.non_cultivable_land_amount) || 0))}</span>
                            <span className="border border-gray-600 rounded min-w-0 flex-1 h-6 print:h-7 print:min-h-0 print:py-1 print:px-2 inline-flex items-center justify-center text-center text-xs print:text-[14px] bg-white px-1 leading-none">{formatAmount(admission.total_land_value ?? (Number(admission.cultivable_land_value) || 0) + (Number(admission.non_cultivable_land_value) || 0))}</span>
                        </div>
                        <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-xs print:text-[14px] text-gray-600 shrink-0">ক) আবাদযোগ্য</span>
                            <span className="border border-gray-600 rounded min-w-[3.5rem] w-14 h-6 print:h-7 print:min-h-0 print:py-1 print:px-2 inline-flex items-center justify-center text-center text-xs print:text-[14px] bg-white shrink-0 leading-none">{formatAmount(admission.cultivable_land_amount)}</span>
                            <span className="border border-gray-600 rounded min-w-0 flex-1 h-6 print:h-7 print:min-h-0 print:py-1 print:px-2 inline-flex items-center justify-center text-center text-xs print:text-[14px] bg-white px-1 leading-none">{formatAmount(admission.cultivable_land_value)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-xs print:text-[14px] text-gray-600 shrink-0">খ) অনাবাদী</span>
                            <span className="border border-gray-600 rounded min-w-[3.5rem] w-14 h-6 print:h-7 print:min-h-0 print:py-1 print:px-2 inline-flex items-center justify-center text-center text-xs print:text-[14px] bg-white shrink-0 leading-none">{formatAmount(admission.non_cultivable_land_amount)}</span>
                            <span className="border border-gray-600 rounded min-w-0 flex-1 h-6 print:h-7 print:min-h-0 print:py-1 print:px-2 inline-flex items-center justify-center text-center text-xs print:text-[14px] bg-white px-1 leading-none">{formatAmount(admission.non_cultivable_land_value)}</span>
                        </div>
                    </div>
                </div>
                <div className="print:mt-3 print:mb-3">
                    <p className="text-xs print:text-[14px] text-gray-600 print:mb-2 print:leading-[1.9]">গ) গ্রাহকের অন্যান্য মালিকানাধীন অন্যান্য অস্থায়ী সম্পদের তথ্য:</p>
                    <div className="overflow-x-auto -mx-1 px-1 print:overflow-visible print:mx-0 print:px-0">
                    <table className="w-full min-w-[420px] print:min-w-0 border border-gray-600 border-collapse text-xs print:text-[14px] print:leading-[1.9] mt-1 print:mt-2">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border border-gray-600 px-2 py-1.5 print:py-3 print:px-2.5 w-10 text-center">ক্র.নং.</th>
                                <th className="border border-gray-600 px-2 py-1.5 print:py-3 print:px-2.5 text-center">অস্থায়ী সম্পদের বিবরণ</th>
                                <th className="border border-gray-600 px-2 py-1.5 print:py-3 print:px-2.5 w-24 text-center">সংখ্যা/পরিমাণ</th>
                                <th className="border border-gray-600 px-2 py-1.5 print:py-3 print:px-2.5 w-28 text-center">সম্ভাব্য মূল্য</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Array.from({ length: 5 }, (_, i) => {
                                const a = admission.other_assets?.[i];
                                const cellClass = 'border border-gray-600 px-2 py-1.5 print:py-3 print:px-2.5 text-center align-middle';
                                return (
                                    <tr key={i}>
                                        <td className={`${cellClass} w-10`}>{i + 1}</td>
                                        <td className={cellClass}>{a?.asset_description ?? ''}</td>
                                        <td className={cellClass}>{a?.quantity_amount ?? ''}</td>
                                        <td className={cellClass}>{formatAmount(a?.estimated_value)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="bg-gray-50 font-medium">
                                <td className="border border-gray-600 px-2 py-1.5 print:py-3 print:px-2.5 text-center" colSpan={2}>মোট</td>
                                <td className="border border-gray-600 px-2 py-1.5 print:py-3 print:px-2.5 text-center">-</td>
                                <td className="border border-gray-600 px-2 py-1.5 print:py-3 print:px-2.5 text-center">
                                    {formatAmount(admission.other_assets?.reduce((s, a) => s + (Number(a.estimated_value) || 0), 0))}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                    </div>
                </div>
            </div>

            {/* ========== SECTION 20–23 (2nd page) ========== */}
            <div className="form-print-section px-3 py-2 print:pt-2 print:pb-3 print:px-3 space-y-1.5 print:space-y-2 print:leading-[1.9]">
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 flex-wrap print:flex-row print:gap-3 print:mb-1">
                    <FormRow label="২০. পরিবারের মোট মাসিক আয়:" value={formatAmount(admission.monthly_income)} className="w-full sm:flex-1" />
                    <FormRow label="মাসিক ব্যয়:" value={formatAmount(admission.monthly_expense)} className="w-full sm:flex-1" />
                    <FormRow label="সঞ্চয়:" value={formatAmount(admission.monthly_savings)} className="w-full sm:flex-1" />
                </div>
                <div className="flex flex-col sm:flex-row flex-wrap items-baseline gap-2 sm:gap-4 print:flex-row print:gap-3 print:mb-1">
                    <FormRow label="২১. সদস্য অন্তর্ভূক্তিকালীন কর্মকর্তার নাম:" value={str(admission.interviewer_name)} className="w-full sm:flex-1" />
                    <FormRow label="পিন নং:" value={str(admission.employee_name || (admission as any).surveyor_pin)} />
                </div>
                <FormRow label="২২. অন্যান্য সংস্থা হতে ঋণ গ্রহণের তথ্য:" value={str(admission.other_loan_info)} />
                <div className="mt-1 print:mt-3 print:mb-1">
                    <p className="text-xs print:text-[14px] text-gray-700 mb-0.5 print:mb-2 print:leading-[1.9]">২৩. তথ্য সংগ্রহকারীর মন্তব্য: উল্লিখিত পরিবার কি মৌসুমী ক্ষুদ্রঋণ কর্মসূচির গ্রাহক হওয়ার যোগ্য? (মন্তব্য লিখুন)</p>
                    <div className="border border-gray-600 h-[100px] min-h-[100px] print:min-h-[100px] print:h-auto overflow-hidden">
                        <div className="member-admission-comment-inner h-full w-full p-4 text-xs print:text-[14px] print:leading-[1.8] whitespace-pre-wrap overflow-auto box-border">
                            {str(admission.collector_comment)}
                        </div>
                    </div>
                </div>
            </div>

            {/* ========== DECLARATION & SIGNATURES (2nd page) ========== */}
            <div className="form-print-section form-print-signature-block px-3 py-4 print:pt-2 print:pb-3 print:px-3 space-y-4 print:space-y-3 print:leading-[1.9]">
                <p className="text-xs print:text-[14px] leading-relaxed">
                    উপরোক্ত তথ্য ও জীবন বৃত্তান্তের উপর ভিত্তি করে আমাকে সদস্যপদ প্রদান করার জন্য আবেদন করছি।
                </p>
                <div className="flex flex-wrap gap-x-8 gap-y-4 print:gap-x-6 print:gap-y-3">
                    <div className="flex items-baseline gap-2 print:gap-1.5 min-w-[180px]">
                        <span className="text-xs print:text-[14px] shrink-0">আবেদনকারীর স্বাক্ষর:</span>
                        <span className="border-b border-dotted border-gray-700 flex-1 min-h-[36px]">
                            {(admission.applicant_signature_path || (admission as any).applicant_signature) ? (
                                <img src={`/storage/${admission.applicant_signature_path || (admission as any).applicant_signature}`} alt="" className="h-8 object-contain" />
                            ) : null}
                        </span>
                    </div>
                    <div className="flex items-baseline gap-2 print:gap-1.5 shrink-0">
                        <span className="text-xs print:text-[14px]">সদস্য নং:</span>
                        <span className="border-b border-dotted border-gray-700 min-w-[80px] text-center">{admission.application_no}</span>
                    </div>
                </div>
                <div className="flex flex-wrap gap-x-8 gap-y-4 print:gap-x-6 print:gap-y-3">
                    <div className="flex items-baseline gap-2 print:gap-1.5 min-w-[180px]">
                        <span className="text-xs print:text-[14px] shrink-0">আবেদনকারীর নাম:</span>
                        <span className="border-b border-dotted border-gray-700 flex-1">{admission.applicant_name_bn}</span>
                    </div>
                    <div className="flex items-baseline gap-2 print:gap-1.5 shrink-0">
                        <span className="text-xs print:text-[14px]">সমিতির কোড নং:</span>
                        <span className="border-b border-dotted border-gray-700 min-w-[80px] text-center">{admission.samity?.samity_code ?? admission.samity?.id ?? ''}</span>
                    </div>
                </div>
                <div className="flex items-baseline gap-2 print:gap-1.5">
                    <span className="text-xs print:text-[14px] shrink-0">অভিভাবকের স্বাক্ষর:</span>
                    <span className="border-b border-dotted border-gray-700 flex-1 min-h-[36px] max-w-[220px]">
                        {(admission as any).guardian_signature_path ? (
                            <img src={`/storage/${(admission as any).guardian_signature_path}`} alt="" className="h-8 object-contain" />
                        ) : null}
                    </span>
                </div>
                <FormRow label="অভিভাবকের নাম:" value={str(admission.guardian_name)} />


                {/* অফিসারের স্বাক্ষর ও তারিখ | শাখা ব্যবস্থাপকের স্বাক্ষর ও তারিখ | হিসাবরক্ষকের স্বাক্ষর ও তারিখ — সিলের জায়গার জন্য একটু বেশি gap */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 print:gap-6 print:pt-6 pt-8 ">
                    {/* অফিসারের স্বাক্ষর ও তারিখ */}
                    <div className="p-4 print:p-5 flex flex-col min-h-[130px] print:min-h-[110px]">
                        <div className="flex-1 min-h-[52px] print:min-h-[44px] flex items-center justify-center overflow-hidden">
                            {(admission as any).surveyor_signature_path ? (
                                <img src={`/storage/${(admission as any).surveyor_signature_path}`} alt="" className="max-h-10 print:max-h-8 w-auto object-contain" />
                            ) : null}
                        </div>
                        <div className="pt-3 print:pt-2 border-t border-gray-200 text-left">
                            <p className="text-xs print:text-[14px] font-semibold text-gray-800">অফিসারের স্বাক্ষর ও তারিখ</p>
                            <p className="text-xs print:text-[14px] mt-1 text-gray-600">পিন: {(admission as any).surveyor_pin ?? '—'}</p>
                        </div>
                    </div>
                    {/* শাখা ব্যবস্থাপকের স্বাক্ষর ও তারিখ */}
                    <div className="p-4 print:p-5 flex flex-col min-h-[130px] print:min-h-[110px]">
                        <div className="flex-1 min-h-[52px] print:min-h-[44px] flex items-center justify-center overflow-hidden">
                            {(admission as any).submitted_by_signature_path ? (
                                <img src={`/storage/${(admission as any).submitted_by_signature_path}`} alt="" className="max-h-10 print:max-h-8 w-auto object-contain" />
                            ) : null}
                        </div>
                        <div className="pt-3 print:pt-2 border-t border-gray-200 text-left">
                            <p className="text-xs print:text-[14px] font-semibold text-gray-800">শাখা ব্যবস্থাপকের স্বাক্ষর ও তারিখ</p>
                            <p className="text-xs print:text-[14px] mt-1 text-gray-600">পিন: {(admission as any).submitted_by_pin ?? '—'}</p>
                        </div>
                    </div>
                    {/* হিসাবরক্ষকের স্বাক্ষর ও তারিখ */}
                    <div className="p-4 print:p-5 flex flex-col min-h-[130px] print:min-h-[110px] sm:col-span-1">
                        <div className="flex-1 min-h-[52px] print:min-h-[44px] flex items-center justify-center overflow-hidden">
                            {admission.approvals?.filter((a: any) => a.status === 'approved')[0]?.approver_signature ? (
                                <img src={`/storage/${admission.approvals.filter((a: any) => a.status === 'approved')[0].approver_signature}`} alt="" className="max-h-10 print:max-h-8 w-auto object-contain" />
                            ) : null}
                        </div>
                        <div className="pt-3 print:pt-2 border-t border-gray-200 text-left">
                            <p className="text-xs print:text-[14px] font-semibold text-gray-800">হিসাবরক্ষকের স্বাক্ষর ও তারিখ</p>
                            <p className="text-xs print:text-[14px] mt-1 text-gray-600">পিন: {(admission.approvals?.filter((a: any) => a.status === 'approved')[0] as any)?.approver_pin ?? '—'}</p>
                        </div>
                    </div>
                </div>
                {/* সব অনুমোদনকারীর স্বাক্ষর ও পিন */}
                {/* {admission.approvals && admission.approvals.filter((a: any) => a.status === 'approved').length > 0 && (
                    <div className="pt-3 border-t border-gray-400">
                        <p className="text-xs font-medium text-gray-700 mb-2">অনুমোদনকারীগণ (স্বাক্ষর ও পিন)</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {admission.approvals
                                .filter((a: any) => a.status === 'approved')
                                .map((approval: any) => (
                                    <div key={approval.id} className="text-center border border-gray-300 rounded p-2">
                                        <div className="min-h-[32px] flex items-center justify-center">
                                            {approval.approver_signature ? (
                                                <img
                                                    src={`/storage/${approval.approver_signature}`}
                                                    alt=""
                                                    className="h-10 object-contain mx-auto border border-gray-400"
                                                />
                                            ) : (
                                                <span className="border-b border-dotted border-gray-500 w-full min-h-[24px] block" />
                                            )}
                                        </div>
                                        <p className="text-xs font-medium mt-0.5">{approval.user?.name ?? '—'}</p>
                                        <p className="text-[10px] text-gray-600">পিন: {approval.approver_pin ?? '—'}</p>
                                        <p className="text-[10px] text-gray-500">{approval.level} | {approval.approved_at ? formatDate(approval.approved_at) : ''}</p>
                                    </div>
                                ))}
                        </div>
                    </div>
                )} */}
            </div>
        </div>
    );
}
