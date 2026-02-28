import React from 'react';
import { MemberAdmission } from '@/types/memberAdmission';

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

function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    try {
        return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
        return '';
    }
}

function num(v: number | null | undefined): string {
    if (v == null || v === undefined) return '';
    return String(v);
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
        <div className={`flex items-baseline gap-2 ${className}`}>
            <span className="text-sm shrink-0">{label}</span>
            <span className="border-b border-dotted border-gray-700 flex-1 min-w-0 overflow-hidden text-ellipsis">
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
        <div className="flex gap-6">
            <div className="flex items-baseline gap-2 flex-1">
                <span className="text-sm shrink-0">{label1}</span>
                <span className="border-b border-dotted border-gray-700 flex-1 min-w-0">
                    {value1 != null && value1 !== '' ? String(value1) : ''}
                </span>
            </div>
            <div className="flex items-baseline gap-2 flex-1">
                <span className="text-sm shrink-0">{label2}</span>
                <span className="border-b border-dotted border-gray-700 flex-1 min-w-0">
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
            className={`bg-white text-gray-900 ${isPrint ? 'text-[11pt]' : 'text-sm'} max-w-[210mm] mx-auto border border-gray-400 form-print-document print:pt-8`}
            style={{ fontFamily: 'Noto Sans Bengali, Arial, sans-serif' }}
        >
            {/* ========== HEADER (প্রথম ছবি A–Z): লোগো | তারিখ | মাঝে মৌসুমী+ঠিকানা | ডানে ছবি বক্স (উপরেই); নিচে কালো বার + সদস্য নং ========== */}
            <header className="form-print-section p-4 print:p-2 print:py-2 print:mb-3 mb-4">
                <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch w-full">
                    {/* Left: Logo and Dates */}
                    <div
                        className="flex flex-row items-center justify-self-start min-w-0"
                        style={{ minWidth: isPrint ? 200 : 210 }}
                    >
                        {/* Left: Logo */}
                        <img
                            src="/logo.png"
                            alt="Logo"
                            className="h-12 w-12 object-contain print:h-12 print:w-12"
                        />
                        {/* Right: Dates Centered Vertically */}
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
                        </div>
                    </div>

                    {/* Middle: মৌসুমী + ঠিকানা + টাইটেল বার একই সেন্টার অক্ষে; সদস্য নং আলাদা ডানে */}
                    <div className="flex flex-col items-center justify-center min-w-0 relative justify-self-center">
                        <div className="flex flex-col items-center text-center w-full max-w-full">
                            <h1 className="text-2xl font-bold text-gray-900 print:text-xl w-full text-center">মৌসুমী</h1>
                            <p className="text-sm text-gray-900 mt-0.5 w-full text-center">উকিলপাড়া, নওগাঁ।</p>
                            {/* Title bar: আগের জায়গায় (মাঝে সেন্টার); সদস্য নং ডানে আলাদা */}
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

                    {/* Right: Photo box */}
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
            <div className="form-print-section px-4 py-2.5 print:py-1.5 print:px-2 border-b border-gray-600">
                <p className="text-xs leading-relaxed text-gray-800 print:text-sm print:leading-loose">
                    আমি নিম্ন স্বাক্ষরকারী মৌসুমী'র উদ্যোগে গঠিত{' '}
                    <span className="border-b border-dotted border-gray-700 px-2 inline-block min-w-[120px] text-center">
                        {admission.samity?.samity_name ?? ''}
                    </span>{' '}
                    সমিতির সদস্য হতে ইচ্ছুক। আমি অঙ্গীকার করছি যে, সমিতির সমস্ত নিয়ম-কানুন যথাযথভাবে মেনে চলব। নিম্নে আমার সম্পর্কে যে সমস্ত তথ্য ও জীবন বৃত্তান্ত দিয়েছি তা সম্পূর্ণ সত্য।
                </p>
            </div>

            {/* ========== SECTION: Personal (1–9) — form layout: 1 & 2 side by side; 3–6 Bengali then English below; 7, 8 & 9 ========== */}
            <div className="form-print-section px-3 py-2 print:py-1.5 print:px-2 space-y-2 print:space-y-3 border-b border-gray-500">
                <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 print:gap-y-2.5">
                    <FormRow label="1. Samity Name :" value={admission.samity?.samity_name ?? ''} />
                    <FormRow label="2. Member Category:" value={admission.member_category?.category_name ?? ''} />
                </div>
                <div className="space-y-0.5">
                    <FormRow label="3. Applicant's Name (বাংলায়) :" value={admission.applicant_name_bn} />
                    <FormRow label="(English):" value={admission.applicant_name_en} />
                </div>
                <div className="space-y-0.5">
                    <FormRow label="4. Father's Name (বাংলায়) :" value={admission.father_name_bn} />
                    <FormRow label="(English):" value={admission.father_name_en} />
                </div>
                <div className="space-y-0.5">
                    <FormRow label="5. Mother's Name (বাংলায়) :" value={admission.mother_name_bn} />
                    <FormRow label="(English):" value={admission.mother_name_en} />
                </div>
                <div className="space-y-0.5">
                    <FormRow label="6. Spouse Name (বাংলায়) :" value={str(admission.spouse_name_bn)} />
                    <FormRow label="(English):" value={str(admission.spouse_name_en)} />
                </div>
                <FormRow label="৭. বৈবাহিক অবস্থা:" value={maritalLabels[admission.marital_status] || admission.marital_status} />
                <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">
                    <FormRow label="৮. মোবাইল নং:" value={admission.mobile_number} />
                    <FormRow label="৯. বিকল্প মোবাইল নং:" value={str(admission.alternative_mobile)} />
                </div>
            </div>

            {/* ========== SECTION: Present Address (10) ========== */}
            <div className="form-print-section px-3 py-2 print:py-1.5 print:px-2 space-y-1.5 print:space-y-2.5 border-b border-gray-500">
                <p className="font-medium text-xs text-gray-700">10. Present Address (বর্তমান ঠিকানা):</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                    <FormRow label="বিভাগ:" value={admission.present_division} />
                    <FormRow label="জেলা :" value={admission.present_district} />
                    <FormRow label="উপজেলা:" value={admission.present_upazila} />
                    <FormRow label="ইউনিয়ন:" value={str(admission.present_union)} />
                    <FormRow label="গ্রাম/রাস্তা:" value={str(admission.present_village_road)} className="col-span-2" />
                    <FormRow label="পোস্ট কোড:" value={str(admission.present_post_code)} />
                </div>
            </div>

            {/* ========== SECTION: Permanent Address (11) ========== */}
            <div className="form-print-section px-3 py-2 print:py-1.5 print:px-2 space-y-1.5 print:space-y-2.5 border-b border-gray-500">
                <p className="font-medium text-xs text-gray-700">11. Permanent Address (স্থায়ী ঠিকানা):</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                    <FormRow label="বিভাগ:" value={admission.permanent_address_same ? 'বর্তমান ঠিকানার সাথে একই' : str(admission.permanent_division)} />
                    <FormRow label="জেলা:" value={admission.permanent_address_same ? '' : str(admission.permanent_district)} />
                    <FormRow label="উপজেলা:" value={admission.permanent_address_same ? '' : str(admission.permanent_upazila)} />
                    <FormRow label="ইউনিয়ন:" value={admission.permanent_address_same ? '' : str(admission.permanent_union)} />
                    <FormRow label="গ্রাম/রাস্তা:" value={admission.permanent_address_same ? '' : str(admission.permanent_village_road)} className="col-span-2" />
                    <FormRow label="পোস্ট কোড:" value={admission.permanent_address_same ? '' : str(admission.permanent_post_code)} />
                </div>
            </div>

            {/* ========== SECTION: Identity (12–15) ========== */}
            <div className="form-print-section px-3 py-2 print:py-1.5 print:px-2 space-y-1.5 print:space-y-2.5 border-b border-gray-500">
                <p className="font-medium text-xs text-gray-700">12. Identity Information:</p>
                <div className="flex gap-6 flex-wrap">
                    <FormRow label="National ID No. :" value={str(admission.nid_number)} />
                    <FormRow label="Smart Card No. :" value={str(admission.smart_card_number)} />
                </div>
                <div className="mt-2 space-y-1">
                    <FormRow label="13. Other Identity Information: জন্ম সনদ নং (প্রযোজ্য ক্ষেত্রে):" value={str(admission.birth_certificate_number)} />
                    <FormRow label="Date of Birth :" value={formatDate(admission.date_of_birth)} />
                    <FormRow label="Gender :" value={genderLabels[admission.gender] || admission.gender} />
                    <FormRow label="Family Members Mobile Number:" value={str(admission.family_member_mobile)} />
                </div>
                <div className="flex gap-6 flex-wrap">
                    <FormRow label="14. Co-Applicant/Guarantor Name :" value={str(admission.guarantor_name)} />
                    <FormRow label="Guarantor Mobile Number:" value={str(admission.guarantor_mobile)} />
                </div>
                <div className="flex gap-6 flex-wrap items-center mt-1">
                    <FormRow label="15. TIN (ট্র্যাক্স সার্টিফিকেট নং)" value={str(admission.tin_number)} />
                    <div className="flex items-center gap-2">
                        <span className="text-sm">সদস্য কি এসএমএস সেবা নিতে চান?</span>
                        <span className="border-b border-dotted border-gray-700 min-w-[40px]">
                            {admission.want_sms_service ? 'হ্যাঁ' : 'না'}
                        </span>
                    </div>
                </div>
            </div>

            {/* ========== SECTION 16: Family table ========== */}
            <div className="form-print-section px-3 py-2 print:py-1.5 print:px-2 border-b border-gray-500">
                <p className="font-medium text-xs text-gray-700 mb-2">১৬. পরিবারের তথ্য:</p>
                <table className="w-full border border-gray-600 border-collapse text-xs print:text-sm">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="border border-gray-600 px-1 py-0.5 print:px-2 print:py-1.5 w-8">ক্রঃ নং</th>
                            <th className="border border-gray-600 px-1 py-0.5 print:px-2 print:py-1.5">গ্রাহক ও পরিবারের অন্যান্য সদস্যের নাম</th>
                            <th className="border border-gray-600 px-1 py-0.5 print:px-2 print:py-1.5">পরিবার প্রধানের সঙ্গে গ্রাহকের সম্পর্ক</th>
                            <th className="border border-gray-600 px-1 py-0.5 print:px-2 print:py-1.5 w-14">লিঙ্গ</th>
                            <th className="border border-gray-600 px-1 py-0.5 print:px-2 print:py-1.5" colSpan={2}>
                                বয়স
                            </th>
                            <th className="border border-gray-600 px-1 py-0.5 print:px-2 print:py-1.5">বৈবাহিক অবস্থা</th>
                            <th className="border border-gray-600 px-1 py-0.5 print:px-2 print:py-1.5">শিক্ষাগত যোগ্যতা</th>
                            <th className="border border-gray-600 px-1 py-0.5 print:px-2 print:py-1.5">পেশা</th>
                            <th className="border border-gray-600 px-1 py-0.5 print:px-2 print:py-1.5">মাসিক আয় (টাকা)</th>
                        </tr>
                        <tr className="bg-gray-50">
                            <th className="border border-gray-600 px-1 py-0.5 print:px-2 print:py-1" colSpan={4} />
                            <th className="border border-gray-600 px-1 py-0.5 print:px-2 print:py-1 w-10">বছর</th>
                            <th className="border border-gray-600 px-1 py-0.5 print:px-2 print:py-1 w-10">মাস</th>
                            <th className="border border-gray-600 px-1 py-0.5 print:px-2 print:py-1" colSpan={3} />
                        </tr>
                    </thead>
                    <tbody>
                        {(admission.family_members && admission.family_members.length > 0)
                            ? admission.family_members.map((m, i) => (
                                  <tr key={i}>
                                      <td className="border border-gray-600 px-1 py-0.5 print:px-2 print:py-1 text-center">{i + 1}</td>
                                      <td className="border border-gray-600 px-1 py-0.5 print:px-2 print:py-1">{m.member_name}</td>
                                      <td className="border border-gray-600 px-1 py-0.5 print:px-2 print:py-1">{m.relation_with_head}</td>
                                      <td className="border border-gray-600 px-1 py-0.5 print:px-2 print:py-1">{genderLabels[m.gender] || m.gender}</td>
                                      <td className="border border-gray-600 px-1 py-0.5 print:px-2 print:py-1 text-center">{m.age_years ?? ''}</td>
                                      <td className="border border-gray-600 px-1 py-0.5 print:px-2 print:py-1 text-center">{m.age_months ?? ''}</td>
                                      <td className="border border-gray-600 px-1 py-0.5 print:px-2 print:py-1">{(m as any).marital_status ?? ''}</td>
                                      <td className="border border-gray-600 px-1 py-0.5 print:px-2 print:py-1">{m.education_level ?? ''}</td>
                                      <td className="border border-gray-600 px-1 py-0.5 print:px-2 print:py-1">{m.occupation ?? ''}</td>
                                      <td className="border border-gray-600 px-1 py-0.5 print:px-2 print:py-1 text-right">{m.monthly_income ?? ''}</td>
                                  </tr>
                              ))
                            : (
                                  <tr>
                                      <td colSpan={10} className="border border-gray-600 px-1 py-2 print:py-3 text-gray-500">
                                          -
                                      </td>
                                  </tr>
                            )}
                    </tbody>
                </table>
            </div>

            {/* Financial activity checkboxes + 17, 18 */}
            <div className="form-print-section px-3 py-2 print:py-1.5 print:px-2 border-b border-gray-500 space-y-1.5 print:space-y-2.5">
                <p className="font-medium text-xs text-gray-700">আর্থিক কর্মকাণ্ড সম্পর্কিত (প্রযোজ্য ক্ষেত্রে ✓ চিহ্ন দিন):</p>
                <div className="flex gap-6 flex-wrap">
                    <span className={admission.business_details ? 'font-bold' : ''}>ক. ব্যবসা {admission.business_details ? '✓' : ''}</span>
                    <span className={admission.job_details ? 'font-bold' : ''}>খ. চাকরি {admission.job_details ? '✓' : ''}</span>
                    <span className={admission.other_income_details ? 'font-bold' : ''}>গ. অন্যান্য {admission.other_income_details ? '✓' : ''}</span>
                </div>
                <div className="flex gap-6 flex-wrap">
                    <FormRow label="১৭. মোট সম্পদের পরিমাণ:" value={admission.total_asset_value != null ? String(admission.total_asset_value) : ''} />
                    <FormRow label="১৮. বাড়ীর ধরণ:" value={str(admission.house_type)} />
                </div>
            </div>

            {/* ========== SECTION 19: Permanent assets (page break before so ১–১৮ on first page) ========== */}
            <div className="form-print-section form-print-page-break-before px-3 py-2 print:py-2 border-b border-gray-500 space-y-2 print:space-y-3">
                <p className="font-medium text-xs text-gray-700">১৯. গ্রাহকের স্থায়ী সম্পদের বিবরণ:</p>
                <div>
                    <p className="text-xs text-gray-600">(i) মোট ঘরের সংখ্যা:</p>
                    <div className="flex items-center gap-3 flex-wrap mt-0.5">
                        <span className="border-b border-dotted border-gray-700 min-w-[40px] inline-block text-center px-1">
                            {(admission.mud_house_count || 0) + (admission.tin_house_count || 0) + (admission.brick_house_count || 0) + (admission.semi_brick_house_count || 0) || ''}
                        </span>
                        <span className="text-xs">ক) ছনের ঘর/মাটির ঘর {((admission.mud_house_count || 0) > 0) ? '✓' : ''}</span>
                        <span className="text-xs">খ) টিন/টালী {((admission.tin_house_count || 0) > 0) ? '✓' : ''}</span>
                        <span className="text-xs">গ) পাকা {((admission.brick_house_count || 0) > 0) ? '✓' : ''}</span>
                        <span className="text-xs">ঘ) আধা পাকা {((admission.semi_brick_house_count || 0) > 0) ? '✓' : ''}</span>
                    </div>
                </div>
                <div>
                    <p className="text-xs text-gray-600">(ii) গবাদি পশু-পাখির তথ্য (সংখ্যায়):</p>
                    <div className="flex gap-4 flex-wrap items-baseline mt-0.5">
                        <span className="text-xs">ক) গরু/মহিষ: <span className="border-b border-dotted border-gray-700 min-w-[28px] inline-block text-center">{num(admission.cow_buffalo_count)}</span></span>
                        <span className="text-xs">খ) ছাগল/ভেড়া: <span className="border-b border-dotted border-gray-700 min-w-[28px] inline-block text-center">{num(admission.goat_sheep_count)}</span></span>
                        <span className="text-xs">গ) হাঁস-মুরগী: <span className="border-b border-dotted border-gray-700 min-w-[28px] inline-block text-center">{num(admission.duck_chicken_count)}</span></span>
                        <span className="text-xs">ঘ) অন্যান্য উল্লেখ করুন: <span className="border-b border-dotted border-gray-700 min-w-[40px] inline-block">{str(admission.other_livestock)}</span> <span className="border-b border-dotted border-gray-700 min-w-[28px] inline-block text-center">{num(admission.other_livestock_count)}</span></span>
                    </div>
                </div>
                <div>
                    <p className="text-xs text-gray-600">(iii) গ্রাহকের মালিকানাধীন মোট জমির পরিমাণ ও মূল্য (শতাংশে):</p>
                    <div className="flex gap-6 flex-wrap mt-0.5">
                        <FormRow label="ক) আবাদযোগ্য জমির পরিমাণ ও মূল্য:" value={`${num(admission.cultivable_land_amount)} / ${num(admission.cultivable_land_value)}`} />
                        <FormRow label="খ) অনাবাদী জমির পরিমাণ:" value={`${num(admission.non_cultivable_land_amount)} / ${num(admission.non_cultivable_land_value)}`} />
                    </div>
                </div>
                <div>
                    <p className="text-xs text-gray-600">(iv) গ্রাহকের অন্যান্য মালিকানাধীন অন্যান্য অস্থায়ী সম্পদের তথ্য:</p>
                    <table className="w-full border border-gray-600 border-collapse text-xs mt-1">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border border-gray-600 px-1 py-0.5 w-8">ক্র.নং.</th>
                                <th className="border border-gray-600 px-1 py-0.5">অস্থায়ী সম্পদের বিবরণ</th>
                                <th className="border border-gray-600 px-1 py-0.5 w-20">সংখ্যা/পরিমাণ</th>
                                <th className="border border-gray-600 px-1 py-0.5 w-24">সম্ভাব্য মূল্য</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(admission.other_assets && admission.other_assets.length > 0)
                                ? admission.other_assets.map((a, i) => (
                                      <tr key={i}>
                                          <td className="border border-gray-600 px-1 py-0.5 text-center">{i + 1}</td>
                                          <td className="border border-gray-600 px-1 py-0.5">{a.asset_description}</td>
                                          <td className="border border-gray-600 px-1 py-0.5 text-right">{a.quantity_amount ?? ''}</td>
                                          <td className="border border-gray-600 px-1 py-0.5 text-right">{a.estimated_value ?? ''}</td>
                                      </tr>
                                  ))
                                : (
                                      <tr>
                                          <td colSpan={4} className="border border-gray-600 px-1 py-2 text-gray-500">-</td>
                                      </tr>
                                  )}
                        </tbody>
                        <tfoot>
                            <tr className="bg-gray-50 font-medium">
                                <td className="border border-gray-600 px-1 py-0.5" colSpan={2}>মোট</td>
                                <td className="border border-gray-600 px-1 py-0.5 text-right">-</td>
                                <td className="border border-gray-600 px-1 py-0.5 text-right">
                                    {admission.other_assets?.reduce((s, a) => s + (Number(a.estimated_value) || 0), 0) ?? ''}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* ========== SECTION 20–23 ========== */}
            <div className="form-print-section px-3 py-2 print:py-1.5 print:px-2 border-b border-gray-500 space-y-1.5 print:space-y-2.5">
                <div className="flex gap-6 flex-wrap">
                    <FormRow label="২০. পরিবারের মোট মাসিক আয়:" value={admission.monthly_income != null ? String(admission.monthly_income) : ''} />
                    <FormRow label="মাসিক ব্যয়:" value={admission.monthly_expense != null ? String(admission.monthly_expense) : ''} />
                    <FormRow label="সঞ্চয়:" value={admission.monthly_savings != null ? String(admission.monthly_savings) : ''} />
                </div>
                <div className="flex flex-wrap items-baseline gap-4">
                    <FormRow label="২১. গ্রাহক অন্তর্ভূক্তিকালীন কর্মকর্তার নাম:" value={str(admission.employee_name || admission.interviewer_name)} />
                    <FormRow label="পিন নং:" value={str((admission as any).surveyor_pin)} />
                </div>
                <FormRow label="২২. অন্যান্য সংস্থা হতে ঋণ গ্রহণের তথ্য:" value={str(admission.other_loan_info)} />
                <div className="mt-1">
                    <p className="text-xs text-gray-700 mb-0.5">২৩. তথ্য সংগ্রহকারীর মন্তব্য: উল্লিখিত পরিবার কি মৌসুমী ক্ষুদ্রঋণ কর্মসূচির গ্রাহক হওয়ার যোগ্য? (মন্তব্য লিখুন)</p>
                    <div className="border border-gray-600 min-h-[50px] p-1.5 text-xs whitespace-pre-wrap">
                        {str(admission.collector_comment)}
                    </div>
                </div>
            </div>

            {/* ========== DECLARATION & SIGNATURES (signature/seal এর জন্য একটু বেশি gap) ========== */}
            <div className="form-print-section form-print-signature-block px-3 py-4 print:py-3 print:px-2 border-t-2 border-gray-800 space-y-4 print:space-y-5">
                <p className="text-xs leading-relaxed">
                    উপরোক্ত তথ্য ও জীবন বৃত্তান্তের উপর ভিত্তি করে আমাকে সদস্যপদ প্রদান করার জন্য আবেদন করছি।
                </p>
                <div className="flex flex-wrap gap-x-8 gap-y-4">
                    <div className="flex items-baseline gap-2 min-w-[180px]">
                        <span className="text-xs shrink-0">আবেদনকারীর স্বাক্ষর:</span>
                        <span className="border-b border-dotted border-gray-700 flex-1 min-h-[36px]">
                            {(admission.applicant_signature_path || (admission as any).applicant_signature) ? (
                                <img src={`/storage/${admission.applicant_signature_path || (admission as any).applicant_signature}`} alt="" className="h-8 object-contain" />
                            ) : null}
                        </span>
                    </div>
                    <div className="flex items-baseline gap-2 shrink-0">
                        <span className="text-xs">সদস্য নং:</span>
                        <span className="border-b border-dotted border-gray-700 min-w-[80px] text-center">{admission.application_no}</span>
                    </div>
                </div>
                <div className="flex flex-wrap gap-x-8 gap-y-4">
                    <div className="flex items-baseline gap-2 min-w-[180px]">
                        <span className="text-xs shrink-0">আবেদনকারীর নাম:</span>
                        <span className="border-b border-dotted border-gray-700 flex-1">{admission.applicant_name_bn}</span>
                    </div>
                    <div className="flex items-baseline gap-2 shrink-0">
                        <span className="text-xs">সমিতির কোড নং:</span>
                        <span className="border-b border-dotted border-gray-700 min-w-[80px] text-center">{admission.samity?.samity_code ?? admission.samity?.id ?? ''}</span>
                    </div>
                </div>
                <div className="flex items-baseline gap-2">
                    <span className="text-xs shrink-0">অভিভাবকের স্বাক্ষর:</span>
                    <span className="border-b border-dotted border-gray-700 flex-1 min-h-[36px] max-w-[220px]">
                        {(admission as any).guardian_signature_path ? (
                            <img src={`/storage/${(admission as any).guardian_signature_path}`} alt="" className="h-8 object-contain" />
                        ) : null}
                    </span>
                </div>
                <FormRow label="অভিভাবকের নাম:" value={str(admission.guardian_name)} />
                {/* অফিসারের স্বাক্ষর ও তারিখ | শাখা ব্যবস্থাপকের স্বাক্ষর ও তারিখ | হিসাবরক্ষকের স্বাক্ষর ও তারিখ — সিলের জায়গার জন্য একটু বেশি gap */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-6 border-t border-gray-600">
                    <div className="text-center border border-gray-300 rounded p-3">
                        <p className="text-xs font-medium">অফিসারের স্বাক্ষর ও তারিখ</p>
                        <div className="min-h-[40px] mt-1 flex items-center justify-center">
                            {(admission as any).surveyor_signature_path ? (
                                <img src={`/storage/${(admission as any).surveyor_signature_path}`} alt="" className="h-8 object-contain" />
                            ) : (
                                <span className="border-b border-dotted border-gray-500 w-full min-h-[24px] block" />
                            )}
                        </div>
                        <p className="text-xs mt-1">পিন: {(admission as any).surveyor_pin ?? '—'}</p>
                        {/* <p className="text-[10px] text-gray-600 mt-0.5">{(admission as any).createdBy?.name ?? admission.employee_name ?? admission.interviewer_name ?? '—'}</p> */}
                    </div>
                    <div className="text-center border border-gray-300 rounded p-3">
                        <p className="text-xs font-medium">শাখা ব্যবস্থাপকের স্বাক্ষর ও তারিখ</p>
                        <div className="min-h-[40px] mt-1 flex items-center justify-center">
                            {(admission as any).submitted_by_signature_path ? (
                                <img src={`/storage/${(admission as any).submitted_by_signature_path}`} alt="" className="h-8 object-contain" />
                            ) : (
                                <span className="border-b border-dotted border-gray-500 w-full min-h-[24px] block" />
                            )}
                        </div>
                        <p className="text-xs mt-1">পিন: {(admission as any).submitted_by_pin ?? '—'}</p>
                        {/* <p className="text-[10px] text-gray-600 mt-0.5">{(admission as any).submittedBy?.name ?? '—'}</p> */}
                    </div>
                    <div className="text-center border border-gray-300 rounded p-3 sm:col-span-1">
                        <p className="text-xs font-medium">হিসাবরক্ষকের স্বাক্ষর ও তারিখ</p>
                        {admission.approvals && admission.approvals.filter((a: any) => a.status === 'approved').length > 0 ? (
                            (() => {
                                const first = admission.approvals!.filter((a: any) => a.status === 'approved')[0];
                                return (
                                    <>
                                        <div className="min-h-[40px] mt-1 flex items-center justify-center">
                                            {first.approver_signature ? (
                                                <img src={`/storage/${first.approver_signature}`} alt="" className="h-8 object-contain" />
                                            ) : (
                                                <span className="border-b border-dotted border-gray-500 w-full min-h-[24px] block" />
                                            )}
                                        </div>
                                        <p className="text-xs mt-1">পিন: {first.approver_pin ?? '—'}</p>
                                        {/* <p className="text-[10px] text-gray-600 mt-0.5">{first.user?.name ?? '—'}</p> */}
                                        {/* <p className="text-[10px] text-gray-500">{first.approved_at ? formatDate(first.approved_at) : ''}</p> */}
                                    </>
                                );
                            })()
                        ) : (
                            <>
                                <span className="border-b border-dotted border-gray-500 w-full min-h-[40px] block mt-1" />
                                <p className="text-xs mt-1">পিন: —</p>
                            </>
                        )}
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
