import { useEffect, useMemo, useState } from 'react';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import type { RequestPayload } from '@inertiajs/core';
import AdminLayout from '@/layouts/admin-layout';
import {
    Plus,
    Printer,
    Save,
    X,
    ArrowLeft,
    Check,
    CheckCircle2,
    Copy,
    Eye,
    EyeOff,
    Camera,
    User,
    Users,
    Calendar,
    Coins,
    Percent,
    Clock,
    Sparkles,
    AlertCircle,
    FileText,
    ShieldCheck,
    CreditCard,
    Phone,
    MapPin,
    Loader2,
    Building2,
    Trash2,
    Upload,
    TrendingUp,
    Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatBanglaNumber, formatDateBangla, todayIsoDate, toBanglaDigits } from '@/utils/dateUtils';
import { fileToCompressedDataUrl } from '@/utils/imageUpload';
import { withLiveMemberCode } from '@/utils/memberCodeUtils';
import { selfAge, selfEducation, selfOccupation } from '@/utils/memberFamilyInfo';
import { numberToWordsBangla } from '@/pages/Member/LoanApplications/Forms/ApprovalForm/PrintPreview';

/** কাগজের ফর্মে তিনটি প্রকল্প এক সাথে আছে; পণ্য অনুযায়ী একটি পূরণ হয়। */
export type ProfitSavingsScheme = 'voluntary' | 'monthly_profit' | 'double_profit';

export const PROFIT_SAVINGS_SCHEMES: Record<ProfitSavingsScheme, string> = {
    voluntary: 'স্বেচ্ছা সঞ্চয়',
    monthly_profit: 'মৌসুমী মাসিক মুনাফা প্রকল্প',
    double_profit: 'মৌসুমী দ্বিগুণ মুনাফা প্রকল্প',
};

interface ProfitSavingsFormData {
    scheme: ProfitSavingsScheme;

    // Header
    branch_name: string;
    application_date: string;
    applicant_photo: string | null;

    // Deposit & profit
    deposit_amount: number;
    deposit_amount_words: string;
    voluntary_rate: number;
    voluntary_monthly_profit: number;
    monthly_profit_rate: number;
    monthly_profit_amount: number;
    monthly_profit_term_label: string;
    double_profit_term_label: string;
    double_profit_maturity_amount: number;
    duration_months: number | null;

    // Member identity
    member_name: string;
    member_code: string;
    samity_code: string;
    father_husband_name: string;
    mother_name: string;

    // Address
    present_village: string;
    present_post_office: string;
    present_upazila: string;
    present_district: string;
    permanent_village: string;
    permanent_post_office: string;
    permanent_upazila: string;
    permanent_district: string;

    // Personal
    education: string;
    age: string;
    profession: string;
    nationality: string;
    marital_status: string;
    mobile_number: string;
    nid_number: string;

    // Family finance
    family_monthly_income: number;
    family_monthly_expense: number;
    family_monthly_surplus: number;

    // Nominees — signatures are taken by hand on the printed form
    nominees: Array<{
        name: string;
        relation: string;
        percentage: number;
        photo: string | null;
        nid_birth_registration: string;
    }>;

    applicant_name: string;
    applicant_sign_date: string;
}

interface Props {
    memberAdmission: any;
    savingsProduct: any;
    branch: any;
    existingApplication?: any;
    savedData?: any;
    onlyPreview?: boolean;
}

/** কাগজের ফর্মে ছাপানো দ্বিগুণ মুনাফার মেয়াদ: ৬ বছর ৫ মাস */
const DOUBLE_PROFIT_TERM_MONTHS = 77;

const DOUBLE_PROFIT_TERM_LABEL = '৬ বছর ৫ মাস';

const MARITAL_STATUS_BN: Record<string, string> = {
    single: 'অবিবাহিত',
    married: 'বিবাহিত',
    divorced: 'তালাকপ্রাপ্ত',
    widowed: 'বিধবা',
};

/** পণ্যের নাম/মেয়াদ দেখে কোন প্রকল্প তা ঠিক করা হয় */
export function schemeFromProduct(product: any): ProfitSavingsScheme {
    const name = `${product?.product_name ?? ''} ${product?.product_name_bn ?? ''}`.toLowerCase();
    if (name.includes('mdbs') || name.includes('double') || name.includes('দ্বিগুণ')) {
        return 'double_profit';
    }
    if (name.includes('mmbs') || name.includes('monthly') || name.includes('মাসিক মুনাফা')) {
        return 'monthly_profit';
    }

    return Number(product?.duration_months) >= 60 ? 'double_profit' : 'monthly_profit';
}

function monthsToBanglaTerm(months: number | null | undefined): string {
    const total = Number(months) || 0;
    if (total <= 0) {
        return '';
    }
    const years = Math.floor(total / 12);
    const rest = total % 12;

    return [
        years ? `${toBanglaDigits(years)} বছর` : '',
        rest ? `${toBanglaDigits(rest)} মাস` : '',
    ].filter(Boolean).join(' ');
}

/** Print/Preview view — স্বেচ্ছা সঞ্চয়/মাসিক মুনাফা/দ্বিগুণ মুনাফা প্রকল্পের আবেদনপত্র */
export function ProfitSavingsPrintView({ data }: { data: ProfitSavingsFormData }) {
    const d = (data || {}) as ProfitSavingsFormData;
    const money = (v: any) => (v != null && v !== '' && Number(v) > 0 ? formatBanglaNumber(Number(v)) : '');
    const str = (v: any) => (v != null && v !== '' ? String(v) : '');
    const line = 'border-b border-dotted border-gray-600 inline-block';
    const nominees = Array.isArray(d.nominees) ? d.nominees : [];
    const nomineeRowCount = Math.max(nominees.length, 1);

    return (
        <div className="bg-white border border-gray-300 p-4 rounded-lg" style={{ fontFamily: 'system-ui, Arial, sans-serif', fontSize: '12px', maxWidth: '100%' }}>
            {/* Header: org title forcefully centered on page | applicant photo on top right */}
            <div className="relative mb-3 flex flex-col items-center justify-center min-h-[130px] pt-1 text-center w-full">
                <div className="flex items-center justify-center gap-3 mb-1">
                    <img
                        src="/logo.png"
                        alt="মৌসুমী"
                        className="h-12 w-12 object-contain shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <div className="text-center">
                        <h1 className="font-black leading-tight text-black" style={{ fontSize: '22px' }}>মৌসুমী</h1>
                        <p className="leading-tight text-gray-800" style={{ fontSize: '12px' }}>উকিলপাড়া, নওগাঁ।</p>
                    </div>
                </div>
                <p className="mt-1 font-bold border border-gray-700 rounded-full px-4 py-0.5 inline-block" style={{ fontSize: '13px' }}>
                    স্বেচ্ছা সঞ্চয়/মাসিক মুনাফা/দ্বিগুণ মুনাফা প্রকল্পের আবেদনপত্র
                </p>
                <div className="absolute right-0 top-0 border-2 border-gray-700 p-2 text-center bg-white">
                    {d.applicant_photo ? (
                        <img src={d.applicant_photo} alt="আবেদনকারী" className="mx-auto" style={{ width: '92px', height: '110px', objectFit: 'cover', border: '1px solid #ccc' }} />
                    ) : (
                        <div className="mx-auto" style={{ width: '92px', height: '110px', border: '1px solid #ccc', backgroundColor: '#f5f5f5' }}></div>
                    )}
                </div>
            </div>

            <div className="space-y-1.5" style={{ fontSize: '12px' }}>
                <div className="flex justify-between gap-4">
                    <p>শাখার নাম: <span className={`${line} min-w-[160px]`}>{str(d.branch_name)}</span></p>
                    <p>আবেদনের তারিখ: <span className={`${line} min-w-[110px]`}>{formatDateBangla(d.application_date, '')}</span></p>
                </div>

                <p className="leading-relaxed">
                    জমার পরিমাণ: <span className={`${line} min-w-[90px]`}>{money(d.deposit_amount)}</span> টাকা
                    (কথায়: <span className={`${line} min-w-[200px]`}>{str(d.deposit_amount_words)}</span>),
                    স্বেচ্ছা সঞ্চয়ের বার্ষিক <span className={`${line} min-w-[42px] text-center`}>{toBanglaDigits(d.voluntary_rate)}</span>% হারে
                    মাসিক ভিত্তিতে প্রাপ্য: <span className={`${line} min-w-[80px]`}>{money(d.voluntary_monthly_profit)}</span> টাকা/
                    মৌসুমী মাসিক মুনাফা প্রকল্পের বার্ষিক <span className={`${line} min-w-[42px] text-center`}>{toBanglaDigits(d.monthly_profit_rate)}</span>% হারে
                    মাসিক ভিত্তিতে প্রাপ্য: <span className={`${line} min-w-[80px]`}>{money(d.monthly_profit_amount)}</span> টাকা,
                    মেয়াদ: <span className={`${line} min-w-[70px]`}>{str(d.monthly_profit_term_label)}</span>/
                    মৌসুমী দ্বিগুণ মুনাফা প্রকল্পের মেয়াদ <span className={`${line} min-w-[90px]`}>{str(d.double_profit_term_label)}</span> অন্তে
                    প্রাপ্য: <span className={`${line} min-w-[90px]`}>{money(d.double_profit_maturity_amount)}</span>
                </p>

                <div className="flex flex-wrap gap-x-4">
                    <p>সদস্যের নাম: <span className={`${line} min-w-[170px]`}>{str(d.member_name)}</span></p>
                    <p>সদস্য কোড নম্বর: <span className={`${line} min-w-[90px]`}>{str(d.member_code)}</span></p>
                    <p>সমিতি কোড নম্বর: <span className={`${line} min-w-[80px]`}>{str(d.samity_code)}</span></p>
                </div>
                <div className="flex flex-wrap gap-x-4">
                    <p>পিতা/স্বামী/অভিভাবকের নাম: <span className={`${line} min-w-[180px]`}>{str(d.father_husband_name)}</span></p>
                    <p>মাতার নাম: <span className={`${line} min-w-[160px]`}>{str(d.mother_name)}</span></p>
                </div>
                <p>
                    বর্তমান ঠিকানা: গ্রাম: <span className={`${line} min-w-[110px]`}>{str(d.present_village)}</span>
                    {' '}ডাকঘর: <span className={`${line} min-w-[100px]`}>{str(d.present_post_office)}</span>
                    {' '}উপজেলা: <span className={`${line} min-w-[100px]`}>{str(d.present_upazila)}</span>
                    {' '}জেলা: <span className={`${line} min-w-[100px]`}>{str(d.present_district)}</span>
                </p>
                <p>
                    স্থায়ী ঠিকানা: গ্রাম: <span className={`${line} min-w-[110px]`}>{str(d.permanent_village)}</span>
                    {' '}ডাকঘর: <span className={`${line} min-w-[100px]`}>{str(d.permanent_post_office)}</span>
                    {' '}উপজেলা: <span className={`${line} min-w-[100px]`}>{str(d.permanent_upazila)}</span>
                    {' '}জেলা: <span className={`${line} min-w-[100px]`}>{str(d.permanent_district)}</span>
                </p>
                <div className="flex flex-wrap gap-x-4">
                    <p>শিক্ষাগত যোগ্যতা: <span className={`${line} min-w-[130px]`}>{str(d.education)}</span></p>
                    <p>বয়স: <span className={`${line} min-w-[50px]`}>{toBanglaDigits(d.age)}</span></p>
                    <p>পেশা: <span className={`${line} min-w-[120px]`}>{str(d.profession)}</span></p>
                </div>
                <div className="flex flex-wrap gap-x-4">
                    <p>জাতীয়তা: <span className={`${line} min-w-[100px]`}>{str(d.nationality)}</span></p>
                    <p>বৈবাহিক অবস্থা: <span className={`${line} min-w-[100px]`}>{str(d.marital_status)}</span></p>
                    <p>মোবাইল নম্বর: <span className={`${line} min-w-[120px]`}>{toBanglaDigits(d.mobile_number)}</span></p>
                </div>
                <p>জাতীয় পরিচয় পত্র নম্বর: <span className={`${line} min-w-[200px]`}>{toBanglaDigits(d.nid_number)}</span></p>
                <p>
                    পরিবারের মাসিক আয়: <span className={`${line} min-w-[90px]`}>{money(d.family_monthly_income)}</span> টাকা,
                    {' '}মাসিক ব্যয়: <span className={`${line} min-w-[90px]`}>{money(d.family_monthly_expense)}</span> টাকা,
                    {' '}মাসিক উদ্বৃত্ত: <span className={`${line} min-w-[90px]`}>{money(d.family_monthly_surplus)}</span> টাকা
                </p>
            </div>

            <p className="mt-3 leading-relaxed" style={{ fontSize: '11px', textAlign: 'justify' }}>
                <span className="font-semibold">নমিনি সংক্রান্ত তথ্য:</span> উল্লেখ্য যে, আমার অবর্তমানে (মৃত্যুর পর) নিম্নলিখিত নমিনি/নমিনিগণ উপযুক্ত প্রমাণ পত্র (মৃত্যু সনদ) দাখিল সাপেক্ষে নিম্নোক্ত হারে জমাকৃত সঞ্চয় উত্তোলন করতে পারবেন।
            </p>

            <div className="mt-2">
                <table className="w-full border-collapse border border-gray-600" style={{ fontSize: '11px' }}>
                    <thead>
                        <tr className="text-center bg-gray-100">
                            <th className="border border-gray-600 px-1 py-1">ক্র.<br />নং</th>
                            <th className="border border-gray-600 px-1 py-1">নমিনি/নমিনিগণের নাম</th>
                            <th className="border border-gray-600 px-1 py-1">সম্পর্ক</th>
                            <th className="border border-gray-600 px-1 py-1">নমিনি/নমিনিগণের<br />স্বাক্ষর/টিপসহি</th>
                            <th className="border border-gray-600 px-1 py-1">প্রাপ্য অংশ<br />(%)</th>
                            <th className="border border-gray-600 px-1 py-1">নমিনি/নমিনিগণের ছবি</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: nomineeRowCount }).map((_, idx) => {
                            const nominee = nominees[idx];
                            return (
                                <tr key={idx}>
                                    <td className="border border-gray-600 px-1 py-2 text-center">{toBanglaDigits(idx + 1)}</td>
                                    <td className="border border-gray-600 px-1 py-2">{str(nominee?.name)}</td>
                                    <td className="border border-gray-600 px-1 py-2">{str(nominee?.relation)}</td>
                                    <td className="border border-gray-600 px-1 py-2"></td>
                                    <td className="border border-gray-600 px-1 py-2 text-center">
                                        {nominee?.percentage ? `${toBanglaDigits(nominee.percentage)}%` : ''}
                                    </td>
                                    <td className="border border-gray-600 px-1 py-1 text-center align-middle">
                                        {nominee?.photo ? (
                                            <img src={nominee.photo} alt={`নমিনি ${idx + 1}`} className="mx-auto" style={{ width: '38px', height: '48px', objectFit: 'cover', border: '1px solid #999' }} />
                                        ) : (
                                            <div className="mx-auto" style={{ width: '38px', height: '48px', border: '1px solid #ccc', backgroundColor: '#f5f5f5' }}></div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <p className="mt-3 leading-relaxed" style={{ fontSize: '10.5px', textAlign: 'justify' }}>
                <span className="font-semibold">অঙ্গীকার নামা (মৌসুমী মাসিক ও দ্বিগুণ মুনাফা প্রকল্পের ক্ষেত্রে প্রযোজ্য):</span> আমি স্বেচ্ছায়, সজ্ঞানে, সুস্থ মস্তিষ্কে কাহারো দ্বারা প্ররোচিত না হইয়া অঙ্গীকার করছি যে, মৌসুমী মাসিক মুনাফা প্রকল্পের জমাকৃত সঞ্চয় ১ (এক) বছর মেয়াদের পূর্বে অফিস থেকে উত্তোলন করবো না। বিশেষ ক্ষেত্রে মেয়াদের পূর্বে উত্তোলনের প্রয়োজন হলে সংস্থার নীতিমালা অনুযায়ী সাধারণ সঞ্চয়ের ৬% মোতাবেক লভ্যাংশ প্রাপ্য হবে। এক্ষেত্রে মাসিক ভিত্তিতে যে পরিমাণ লভ্যাংশ গ্রহণ করেছি তার মধ্যে অতিরিক্ত গ্রহণকৃত টাকা নগদে অফিসে ফেরত দিয়ে আমার জমাকৃত মূল টাকা ফেরত নিব। মৌসুমী দ্বিগুণ মুনাফা প্রকল্পের জমাকৃত সঞ্চয় ৬ বছর ৫ মাস মেয়াদের পূর্বে অফিস থেকে উত্তোলন করবো না। বিশেষ ক্ষেত্রে মেয়াদের পূর্বে উত্তোলনের প্রয়োজন হলে সংস্থার নীতিমালা অনুযায়ী সাধারণ সঞ্চয়ের ৬% মোতাবেক লভ্যাংশসহ আমার জমাকৃত মূল টাকা ফেরত নেওয়ার অঙ্গীকার করছি।
            </p>

            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2" style={{ fontSize: '12px' }}>
                <p>আবেদনকারীর নাম: <span className={`${line} min-w-[170px]`}>{str(d.applicant_name) || str(d.member_name)}</span></p>
                <p>স্বাক্ষর: <span className={`${line} min-w-[140px]`}>&nbsp;</span></p>
                <p>তারিখ: <span className={`${line} min-w-[100px]`}>{formatDateBangla(d.applicant_sign_date, '')}</span></p>
            </div>

            {/* Office signatures — signed and sealed by hand */}
            <div className="mt-8 grid grid-cols-3 gap-4" style={{ fontSize: '11px' }}>
                <div>
                    <div className="border-b border-gray-600 w-[140px]" style={{ height: '28px' }} />
                    <p className="mt-1">অফিসারের স্বাক্ষর ও সিল:</p>
                </div>
                <div className="text-center">
                    <div className="border-b border-gray-600 w-[140px] mx-auto" style={{ height: '28px' }} />
                    <p className="mt-1">হিসাবরক্ষকের স্বাক্ষর ও সিল:</p>
                </div>
                <div className="text-right">
                    <div className="border-b border-gray-600 w-[140px] ml-auto" style={{ height: '28px' }} />
                    <p className="mt-1">শাখা ব্যবস্থাপকের স্বাক্ষর ও সিল:</p>
                </div>
            </div>
        </div>
    );
}

export default function ProfitSavingsForm(props: Props) {
    if (props.onlyPreview && props.savedData) {
        return (
            <div className="print-container">
                <ProfitSavingsPrintView data={withLiveMemberCode(props.savedData, props.memberAdmission)} />
            </div>
        );
    }

    return <ProfitSavingsEditor {...props} />;
}

function ProfitSavingsEditor({ memberAdmission, savingsProduct, branch, existingApplication }: Props) {
    const [imagePreview, setImagePreview] = useState<Record<string, string>>({});
    const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
    const [showPreview, setShowPreview] = useState(false);

    const productRate = Number(savingsProduct?.interest_rate) || 0;
    const productMonths = Number(savingsProduct?.duration_months) || 0;
    const scheme: ProfitSavingsScheme = existingApplication?.form_data?.scheme ?? schemeFromProduct(savingsProduct);
    const income = Number(memberAdmission?.monthly_income) || 0;
    const expense = Number(memberAdmission?.monthly_expense) || 0;
    const productTermLabel = monthsToBanglaTerm(savingsProduct?.duration_months);

    const { data, setData, processing } = useForm<ProfitSavingsFormData>(withLiveMemberCode({
        scheme,

        branch_name: branch?.name || '',
        application_date: existingApplication?.account_opening_date || todayIsoDate(),
        applicant_photo: existingApplication?.applicant_photo || null,

        deposit_amount: Number(existingApplication?.deposit_amount) || 0,
        deposit_amount_words: '',
        voluntary_rate: scheme === 'voluntary' && productRate > 0 ? productRate : 11.4,
        voluntary_monthly_profit: 0,
        monthly_profit_rate: scheme === 'monthly_profit' && productRate > 0 ? productRate : 12,
        monthly_profit_amount: 0,
        monthly_profit_term_label: scheme === 'monthly_profit' && productTermLabel ? productTermLabel : '১ বছর',
        double_profit_term_label: scheme === 'double_profit' && productMonths >= 24 ? productTermLabel : DOUBLE_PROFIT_TERM_LABEL,
        double_profit_maturity_amount: 0,
        duration_months: existingApplication?.duration_months
            ?? (scheme === 'double_profit' && productMonths < 24 ? DOUBLE_PROFIT_TERM_MONTHS : productMonths || null),

        member_name: memberAdmission?.applicant_name_bn || memberAdmission?.applicant_name_en || '',
        member_code: memberAdmission?.application_no || '',
        samity_code: memberAdmission?.samity?.samity_code || '',
        father_husband_name: memberAdmission?.father_name_bn || memberAdmission?.spouse_name_bn || '',
        mother_name: memberAdmission?.mother_name_bn || '',

        present_village: memberAdmission?.present_village_road || '',
        present_post_office: memberAdmission?.present_union || memberAdmission?.present_post_code || '',
        present_upazila: memberAdmission?.present_upazila || '',
        present_district: memberAdmission?.present_district || '',
        permanent_village: memberAdmission?.permanent_village_road || memberAdmission?.present_village_road || '',
        permanent_post_office: memberAdmission?.permanent_union || memberAdmission?.permanent_post_code || memberAdmission?.present_union || '',
        permanent_upazila: memberAdmission?.permanent_upazila || memberAdmission?.present_upazila || '',
        permanent_district: memberAdmission?.permanent_district || memberAdmission?.present_district || '',

        education: selfEducation(memberAdmission),
        age: selfAge(memberAdmission),
        profession: existingApplication?.profession || selfOccupation(memberAdmission),
        nationality: 'বাংলাদেশী',
        marital_status: MARITAL_STATUS_BN[String(memberAdmission?.marital_status || '')] || '',
        mobile_number: memberAdmission?.mobile_number || '',
        nid_number: memberAdmission?.nid_number || '',

        family_monthly_income: income,
        family_monthly_expense: expense,
        family_monthly_surplus: Number(memberAdmission?.monthly_savings) || Math.max(income - expense, 0),

        nominees: (existingApplication?.nominee_info && existingApplication.nominee_info.length > 0)
            ? existingApplication.nominee_info.map((n: any) => ({
                name: n.name ?? '',
                relation: n.relation ?? '',
                percentage: Number(n.percentage) || 0,
                photo: n.photo ?? null,
                nid_birth_registration: n.nid ?? n.birth_registration_no ?? '',
            }))
            : [{ name: '', relation: '', percentage: 0, photo: null, nid_birth_registration: '' }],

        applicant_name: memberAdmission?.applicant_name_bn || memberAdmission?.applicant_name_en || '',
        applicant_sign_date: todayIsoDate(),
    }, memberAdmission));

    const pageProps = usePage().props as any;
    const backendErrors: Record<string, string> = pageProps?.errors || {};
    const errors = useMemo<Record<string, string>>(() => ({ ...localErrors, ...backendErrors }), [localErrors, backendErrors]);

    // Load saved draft data over the defaults
    useEffect(() => {
        if (existingApplication?.form_data) {
            setData((prev) => withLiveMemberCode({ ...prev, ...existingApplication.form_data }, memberAdmission));
        }
    }, [existingApplication?.id]);

    // Deposit drives the words and the profit/maturity amounts of the selected scheme
    useEffect(() => {
        const amount = Number(data.deposit_amount) || 0;
        const monthlyOf = (rate: number) => Math.round((amount * (Number(rate) || 0)) / 100 / 12);

        setData((prev) => ({
            ...prev,
            deposit_amount_words: amount > 0 ? `${numberToWordsBangla(amount)} টাকা` : '',
            voluntary_monthly_profit: prev.scheme === 'voluntary' ? monthlyOf(prev.voluntary_rate) : 0,
            monthly_profit_amount: prev.scheme === 'monthly_profit' ? monthlyOf(prev.monthly_profit_rate) : 0,
            double_profit_maturity_amount: prev.scheme === 'double_profit' ? amount * 2 : 0,
        }));
    }, [data.deposit_amount, data.scheme, data.voluntary_rate, data.monthly_profit_rate]);

    // The printed term always matches the term saved on the application
    useEffect(() => {
        const label = monthsToBanglaTerm(data.duration_months);
        if (!label) {
            return;
        }

        setData((prev) => ({
            ...prev,
            monthly_profit_term_label: prev.scheme === 'monthly_profit' ? label : prev.monthly_profit_term_label,
            double_profit_term_label: prev.scheme === 'double_profit' ? label : prev.double_profit_term_label,
        }));
    }, [data.duration_months, data.scheme]);

    const handleApplicantPhoto = async (file: File | null) => {
        if (!file) return;
        const result = await fileToCompressedDataUrl(file, { maxWidth: 800 });
        if (!result.ok) {
            alert(result.error);
            return;
        }
        setData('applicant_photo', result.dataUrl);
        setImagePreview((prev) => ({ ...prev, applicant_photo: result.dataUrl }));
    };

    const handleNomineePhoto = async (index: number, file: File | null) => {
        if (!file) return;
        const result = await fileToCompressedDataUrl(file, { maxWidth: 800 });
        if (!result.ok) {
            alert(result.error);
            return;
        }
        const updated = [...data.nominees];
        updated[index] = { ...updated[index], photo: result.dataUrl };
        setData('nominees', updated);
        setImagePreview((prev) => ({ ...prev, [`nominee_${index}_photo`]: result.dataUrl }));
    };

    const updateNominee = (index: number, field: 'name' | 'relation' | 'percentage' | 'nid_birth_registration', value: string) => {
        const updated = [...data.nominees];
        updated[index] = { ...updated[index], [field]: field === 'percentage' ? Number(value) : value };
        setData('nominees', updated);
    };

    const copyCurrentToPermanentAddress = () => {
        setData((prev) => ({
            ...prev,
            permanent_village: prev.present_village || '',
            permanent_post_office: prev.present_post_office || '',
            permanent_upazila: prev.present_upazila || '',
            permanent_district: prev.present_district || '',
        }));
    };

    const totalNomineePercentage = useMemo(() => {
        return (data.nominees || []).reduce((acc, curr) => acc + (Number(curr.percentage) || 0), 0);
    }, [data.nominees]);

    const maturityAmount = (): number => {
        if (data.scheme === 'double_profit') {
            return Number(data.double_profit_maturity_amount) || 0;
        }

        return 0;
    };

    const monthlyProfit = (): number => {
        if (data.scheme === 'voluntary') {
            return Number(data.voluntary_monthly_profit) || 0;
        }
        if (data.scheme === 'monthly_profit') {
            return Number(data.monthly_profit_amount) || 0;
        }

        return 0;
    };

    const validate = (): Record<string, string> => {
        const found: Record<string, string> = {};
        const min = Number(savingsProduct?.min_amount) || 0;
        const max = savingsProduct?.max_amount != null ? Number(savingsProduct.max_amount) : null;

        if (!data.deposit_amount || data.deposit_amount <= 0) {
            found.deposit_amount = 'জমার পরিমাণ দিন';
        } else if (data.deposit_amount < min) {
            found.deposit_amount = `সর্বনিম্ন জমা ৳${min.toLocaleString('bn-BD')}`;
        } else if (max != null && data.deposit_amount > max) {
            found.deposit_amount = `সর্বোচ্চ জমা ৳${max.toLocaleString('bn-BD')}`;
        }
        if (!data.member_name.trim()) {
            found.member_name = 'সদস্যের নাম দিন';
        }
        if (!data.nid_number.trim()) {
            found.nid_number = 'জাতীয় পরিচয় পত্র নম্বর দিন';
        }
        data.nominees.forEach((nominee, idx) => {
            if (nominee.name.trim() && !nominee.relation.trim()) {
                found[`nominee_${idx}_relation`] = `নমিনি ${idx + 1} এর সম্পর্ক দিন`;
            }
            if (nominee.name.trim() && !(nominee.percentage > 0)) {
                found[`nominee_${idx}_percentage`] = `নমিনি ${idx + 1} এর প্রাপ্য অংশ দিন`;
            }
        });

        setLocalErrors(found);

        return found;
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();

        const found = validate();
        if (Object.keys(found).length > 0) {
            alert(`অনুগ্রহ করে ঠিক করুন:\n\n${Object.values(found).join('\n')}`);
            const el = document.querySelector(`[data-field="${Object.keys(found)[0]}"]`);
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        const nomineeInfo = data.nominees
            .filter((n) => n.name.trim() !== '')
            .map((n) => ({
                name: n.name,
                relation: n.relation || '',
                mobile: '',
                nid: n.nid_birth_registration || '',
                birth_registration_no: n.nid_birth_registration || '',
                address: '',
                percentage: n.percentage || 0,
                photo: n.photo || null,
            }));

        const shared = {
            account_opening_date: data.application_date || null,
            deposit_amount: data.deposit_amount,
            monthly_installment: monthlyProfit(),
            maturity_amount: maturityAmount(),
            monthly_savings_amount: monthlyProfit(),
            duration_months: data.duration_months ?? savingsProduct?.duration_months ?? null,
            applicant_photo: data.applicant_photo || null,
            current_address: `${data.present_village}, ${data.present_post_office}, ${data.present_upazila}, ${data.present_district}`,
            permanent_address: `${data.permanent_village}, ${data.permanent_post_office}, ${data.permanent_upazila}, ${data.permanent_district}`,
            profession: data.profession || null,
            source_of_income: PROFIT_SAVINGS_SCHEMES[data.scheme],
            member_no: data.member_code || null,
            form_data: data,
            nominee_info: nomineeInfo,
        };

        if (existingApplication) {
            router.post(`/member/savings-applications/${existingApplication.id}/save-form`, shared as unknown as RequestPayload, {
                preserveScroll: true,
                onSuccess: () => setLocalErrors({}),
            });
            return;
        }

        router.post('/member/savings-applications', {
            ...shared,
            savings_product_id: savingsProduct.id,
            member_admission_id: memberAdmission.id,
            samity_id: memberAdmission.samity_id || null,
        } as unknown as RequestPayload, {
            preserveState: false,
            onSuccess: () => setLocalErrors({}),
        });
    };

    const fieldError = (key: string) => (errors[key] ? <p className="text-red-500 text-xs mt-1">{errors[key]}</p> : null);

    return (
        <AdminLayout>
            <Head title="স্বেচ্ছা সঞ্চয়/মাসিক মুনাফা/দ্বিগুণ মুনাফা প্রকল্পের আবেদনপত্র">
                <style>{`
                    @media print {
                        @page { size: A4; margin: 1cm; }
                        .savings-form-no-print { display: none !important; }
                        .savings-form-print-area {
                            display: block !important;
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                            max-width: 100%;
                            padding: 0;
                            margin: 0;
                            background: white;
                        }
                        .print-container { max-width: 100%; }
                        body { background: white; }
                    }
                `}</style>
            </Head>

            <div className="max-w-7xl mx-auto p-4 sm:p-6 pb-24 space-y-6">
                {/* ── TOP ACTION & HEADER BAR ─────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 savings-form-no-print">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => router.visit('/member/savings-applications')}
                            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition shadow-2xs"
                            title="তালিকায় ফিরে যান"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-bold font-mono">
                                    {savingsProduct?.product_code || 'PROFIT'}
                                </span>
                                <h1 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
                                    স্বেচ্ছা / মুনাফা সঞ্চয় আবেদনপত্র
                                </h1>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                                প্রকল্পের ধরন ও সঞ্চয়ের তথ্যাবলী পূরণ করুন
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                            type="button"
                            onClick={() => setShowPreview(!showPreview)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                        >
                            {showPreview ? (
                                <>
                                    <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                                    <span>প্রিভিউ লুকান</span>
                                </>
                            ) : (
                                <>
                                    <Eye className="w-3.5 h-3.5 text-purple-600" />
                                    <span>প্রিভিউ দেখুন</span>
                                </>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                        >
                            <Printer className="w-3.5 h-3.5 text-slate-600" />
                            <span>প্রিন্ট ফরম্যাট</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={processing}
                            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md shadow-purple-600/20 transition active:scale-95 disabled:opacity-50"
                        >
                            {processing ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>সংরক্ষণ হচ্ছে...</span>
                                </>
                            ) : (
                                <>
                                    <Save className="w-3.5 h-3.5" />
                                    <span>সংরক্ষণ করুন</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* ── MEMBER & PRODUCT SUMMARY HERO BAR ───────────────────────────── */}
                <div className="savings-form-no-print rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white p-5 sm:p-6 shadow-xl border border-slate-700/60">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                        <div className="flex items-center gap-4">
                            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-white font-black text-lg shrink-0 shadow-md">
                                {(memberAdmission?.applicant_name_bn || memberAdmission?.applicant_name_en || 'U').charAt(0)}
                            </div>
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-base sm:text-lg font-bold text-white">
                                        {memberAdmission?.applicant_name_bn || memberAdmission?.applicant_name_en}
                                    </h2>
                                    <span className="px-2 py-0.5 rounded-md bg-purple-500/30 text-purple-200 text-[10px] font-mono font-bold border border-purple-400/20">
                                        সদস্য নং: {memberAdmission?.application_no || data.member_code || '—'}
                                    </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300 mt-1">
                                    <span>NID: {memberAdmission?.nid_number || '—'}</span>
                                    <span>মোবাইল: {memberAdmission?.mobile_number || '—'}</span>
                                    {memberAdmission?.samity && (
                                        <span>সমিতি: {memberAdmission.samity.samity_name_bn || memberAdmission.samity.samity_name}</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-700/60 text-xs">
                            <div className="px-3 py-2 rounded-xl bg-white/10 border border-white/10">
                                <span className="text-[10px] text-slate-400 block">বর্তমান প্রকল্প</span>
                                <span className="font-bold text-purple-200 truncate block max-w-[170px]">
                                    {PROFIT_SAVINGS_SCHEMES[data.scheme]}
                                </span>
                            </div>
                            <div className="px-3 py-2 rounded-xl bg-white/10 border border-white/10">
                                <span className="text-[10px] text-slate-400 block">বার্ষিক হার</span>
                                <span className="font-bold text-emerald-300">
                                    {data.scheme === 'voluntary' ? `${data.voluntary_rate}%` : data.scheme === 'monthly_profit' ? `${data.monthly_profit_rate}%` : 'দ্বিগুণ মুনাফা'}
                                </span>
                            </div>
                            <div className="px-3 py-2 rounded-xl bg-white/10 border border-white/10">
                                <span className="text-[10px] text-slate-400 block">জমার সীমা</span>
                                <span className="font-bold text-amber-300">
                                    ৳{(Number(savingsProduct?.min_amount) || 0).toLocaleString('bn-BD')}
                                    {savingsProduct?.max_amount ? ` – ৳${Number(savingsProduct.max_amount).toLocaleString('bn-BD')}` : ''}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── BACKEND ERROR ALERT NOTIFICATION ────────────────────────────── */}
                {backendErrors && Object.keys(backendErrors).length > 0 && (
                    <div className="savings-form-no-print p-4 rounded-2xl bg-red-50/90 border border-red-200 text-red-900 shadow-sm animate-in fade-in">
                        <div className="flex items-center gap-2 mb-2 font-bold text-xs text-red-800">
                            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                            <span>আবেদনের তথ্যে কিছু ত্রুটি রয়েছে, অনুগ্রহ করে সংশোধন করুন:</span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                            {Object.entries(backendErrors).map(([key, value]: [string, any]) => (
                                <span key={key} className="px-2.5 py-1 rounded-lg bg-red-100/80 text-red-800 font-medium">
                                    {Array.isArray(value) ? value[0] : value}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                <form onSubmit={handleSave}>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-1">
                        {/* ── LEFT SIDE: INPUT FORM ───────────────────────────────────── */}
                        <div className="space-y-6 savings-form-no-print">
                            {/* SECTION 1: SCHEME & DEPOSIT CALCULATION */}
                            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-5">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-black text-xs border border-purple-100">
                                            ১
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900">
                                                সঞ্চয় প্রকল্প ও জমার হিসাব
                                            </h3>
                                            <p className="text-[11px] text-slate-400">
                                                প্রকল্পের ধরন, জমার পরিমাণ ও প্রাক্কলিত মুনাফা
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                        Scheme & Profit
                                    </span>
                                </div>

                                {/* Visual Scheme Selector (Pill Tabs) */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-2">
                                        প্রকল্পের ধরন নির্বাচন করুন
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                        {(['voluntary', 'monthly_profit', 'double_profit'] as ProfitSavingsScheme[]).map((schemeKey) => {
                                            const isSelected = data.scheme === schemeKey;
                                            return (
                                                <button
                                                    key={schemeKey}
                                                    type="button"
                                                    onClick={() => setData('scheme', schemeKey)}
                                                    className={`px-3 py-2.5 rounded-2xl text-xs font-bold border transition-all text-left ${
                                                        isSelected
                                                            ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-600/20'
                                                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                                                    }`}
                                                >
                                                    <span className="block truncate">{PROFIT_SAVINGS_SCHEMES[schemeKey]}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Dynamic Profit Calculation Highlight Card */}
                                <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-bold text-purple-900 flex items-center gap-1.5">
                                            <TrendingUp className="w-4 h-4 text-purple-600" />
                                            <span>প্রাক্কলিত হিসাব বিবরণী:</span>
                                        </span>
                                        <span className="font-bold text-purple-700">
                                            জমা: ৳{formatBanglaNumber(data.deposit_amount || 0)}
                                        </span>
                                    </div>

                                    <div className="pt-2 border-t border-purple-200/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                                        {data.scheme === 'voluntary' && (
                                            <>
                                                <span className="text-slate-600">বার্ষিক মুনাফার হার: <strong>{data.voluntary_rate}%</strong></span>
                                                <span className="text-emerald-700 font-bold">
                                                    মাসিক ভিত্তিতে প্রাপ্য: ৳{formatBanglaNumber(data.voluntary_monthly_profit)}
                                                </span>
                                            </>
                                        )}
                                        {data.scheme === 'monthly_profit' && (
                                            <>
                                                <span className="text-slate-600">
                                                    মেয়াদ: <strong>{data.monthly_profit_term_label}</strong> ({data.monthly_profit_rate}%)
                                                </span>
                                                <span className="text-emerald-700 font-bold">
                                                    প্রতি মাসে প্রাপ্য: ৳{formatBanglaNumber(data.monthly_profit_amount)}
                                                </span>
                                            </>
                                        )}
                                        {data.scheme === 'double_profit' && (
                                            <>
                                                <span className="text-slate-600">
                                                    মেয়াদ: <strong>{data.double_profit_term_label}</strong>
                                                </span>
                                                <span className="text-indigo-700 font-black">
                                                    মেয়াদ অন্তে প্রাপ্য: ৳{formatBanglaNumber(data.double_profit_maturity_amount)}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div data-field="deposit_amount">
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                            জমার পরিমাণ (৳) <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">৳</span>
                                            <input
                                                type="number"
                                                min={savingsProduct?.min_amount ?? 0}
                                                placeholder="জমার পরিমাণ লিখুন"
                                                value={data.deposit_amount || ''}
                                                onChange={(e) => setData('deposit_amount', e.target.value === '' ? 0 : Number(e.target.value))}
                                                className={`w-full pl-8 pr-3.5 py-2.5 bg-slate-50/70 border rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition ${
                                                    errors.deposit_amount ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
                                                }`}
                                            />
                                        </div>
                                        {fieldError('deposit_amount')}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                            আবেদনের তারিখ
                                        </label>
                                        <input
                                            type="date"
                                            value={data.application_date}
                                            onChange={(e) => setData('application_date', e.target.value)}
                                            className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition"
                                        />
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                            টাকার পরিমাণ (কথায়)
                                        </label>
                                        <input
                                            type="text"
                                            value={data.deposit_amount_words}
                                            readOnly
                                            placeholder="জমার অংক লিখলে কথায় অটোমেটিক তৈরি হবে"
                                            className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-700 cursor-not-allowed"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                            শাখার নাম
                                        </label>
                                        <input
                                            type="text"
                                            value={data.branch_name}
                                            onChange={(e) => setData('branch_name', e.target.value)}
                                            className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition"
                                        />
                                    </div>

                                    {data.scheme === 'voluntary' && (
                                        <>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                                    বার্ষিক মুনাফার হার (%)
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={data.voluntary_rate}
                                                    onChange={(e) => setData('voluntary_rate', Number(e.target.value))}
                                                    className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                                    মাসিক ভিত্তিতে প্রাপ্য (৳)
                                                </label>
                                                <input
                                                    type="number"
                                                    value={data.voluntary_monthly_profit}
                                                    onChange={(e) => setData('voluntary_monthly_profit', Number(e.target.value))}
                                                    className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:outline-none"
                                                />
                                            </div>
                                        </>
                                    )}

                                    {data.scheme === 'monthly_profit' && (
                                        <>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                                    বার্ষিক মুনাফার হার (%)
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={data.monthly_profit_rate}
                                                    onChange={(e) => setData('monthly_profit_rate', Number(e.target.value))}
                                                    className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                                    মাসিক ভিত্তিতে প্রাপ্য (৳)
                                                </label>
                                                <input
                                                    type="number"
                                                    value={data.monthly_profit_amount}
                                                    onChange={(e) => setData('monthly_profit_amount', Number(e.target.value))}
                                                    className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                                    মেয়াদ (মাস)
                                                </label>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    value={data.duration_months ?? ''}
                                                    onChange={(e) => setData('duration_months', e.target.value === '' ? null : Number(e.target.value))}
                                                    className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none"
                                                />
                                                <p className="text-[11px] text-slate-400 mt-1">ফর্মে লেখা হবে: {data.monthly_profit_term_label}</p>
                                            </div>
                                        </>
                                    )}

                                    {data.scheme === 'double_profit' && (
                                        <>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                                    দ্বিগুণ মুনাফার মেয়াদ (মাস)
                                                </label>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    value={data.duration_months ?? ''}
                                                    onChange={(e) => setData('duration_months', e.target.value === '' ? null : Number(e.target.value))}
                                                    className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none"
                                                />
                                                <p className="text-[11px] text-slate-400 mt-1">ফর্মে লেখা হবে: {data.double_profit_term_label}</p>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                                    মেয়াদ অন্তে প্রাপ্য (৳)
                                                </label>
                                                <input
                                                    type="number"
                                                    value={data.double_profit_maturity_amount}
                                                    onChange={(e) => setData('double_profit_maturity_amount', Number(e.target.value))}
                                                    className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:outline-none"
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* SECTION 2: APPLICANT PHOTO & PERSONAL INFO */}
                            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-5">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-black text-xs border border-purple-100">
                                            ২
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900">
                                                আবেদনকারী ও ব্যক্তিগত পরিচিতি
                                            </h3>
                                            <p className="text-[11px] text-slate-400">
                                                ছবি, নাম ও পারিবারিক তথ্যাবলী
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Applicant Photo Dropzone */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-2">
                                        আবেদনকারীর ছবি (পাসপোর্ট সাইজ)
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <div className="relative w-24 h-28 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/80 overflow-hidden flex items-center justify-center group shrink-0">
                                            {imagePreview.applicant_photo || data.applicant_photo ? (
                                                <>
                                                    <img
                                                        src={imagePreview.applicant_photo || data.applicant_photo || ''}
                                                        alt="আবেদনকারী"
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setData('applicant_photo', null);
                                                            setImagePreview((prev) => ({ ...prev, applicant_photo: '' }));
                                                        }}
                                                        className="absolute top-1 right-1 p-1 rounded-full bg-red-600 text-white shadow-xs opacity-80 hover:opacity-100 transition"
                                                        title="ছবি মুছুন"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </>
                                            ) : (
                                                <div className="text-center p-2">
                                                    <Camera className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                                                    <span className="text-[10px] text-slate-400 font-medium">ছবি নেই</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/70 text-slate-700 text-xs font-bold cursor-pointer transition">
                                                <Upload className="w-3.5 h-3.5" />
                                                <span>ছবি আপলোড করুন</span>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => handleApplicantPhoto(e.target.files?.[0] || null)}
                                                    className="hidden"
                                                />
                                            </label>
                                            <p className="text-[11px] text-slate-400 leading-relaxed">
                                                JPG বা PNG ফরম্যাটের পাসপোর্ট সাইজ ছবি নির্বাচন করুন।
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div data-field="member_name">
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                            সদস্যের নাম <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.member_name}
                                            onChange={(e) => setData('member_name', e.target.value)}
                                            className={`w-full px-3.5 py-2.5 bg-slate-50/70 border rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition ${
                                                errors.member_name ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
                                            }`}
                                        />
                                        {fieldError('member_name')}
                                    </div>

                                    <div data-field="nid_number">
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                            জাতীয় পরিচয় পত্র নম্বর (NID) <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.nid_number}
                                            onChange={(e) => setData('nid_number', e.target.value)}
                                            className={`w-full px-3.5 py-2.5 bg-slate-50/70 border rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition font-mono ${
                                                errors.nid_number ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
                                            }`}
                                        />
                                        {fieldError('nid_number')}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                            সদস্য কোড নম্বর
                                        </label>
                                        <input
                                            type="text"
                                            value={data.member_code}
                                            onChange={(e) => setData('member_code', e.target.value)}
                                            className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition font-mono"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                            সমিতি কোড নম্বর
                                        </label>
                                        <input
                                            type="text"
                                            value={data.samity_code}
                                            onChange={(e) => setData('samity_code', e.target.value)}
                                            className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition font-mono"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                            পিতা/স্বামী/অভিভাবকের নাম
                                        </label>
                                        <input
                                            type="text"
                                            value={data.father_husband_name}
                                            onChange={(e) => setData('father_husband_name', e.target.value)}
                                            className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                            মাতার নাম
                                        </label>
                                        <input
                                            type="text"
                                            value={data.mother_name}
                                            onChange={(e) => setData('mother_name', e.target.value)}
                                            className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                            মোবাইল নম্বর
                                        </label>
                                        <input
                                            type="text"
                                            value={data.mobile_number}
                                            onChange={(e) => setData('mobile_number', e.target.value)}
                                            className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                            শিক্ষাগত যোগ্যতা
                                        </label>
                                        <input
                                            type="text"
                                            value={data.education}
                                            onChange={(e) => setData('education', e.target.value)}
                                            className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                            বয়স
                                        </label>
                                        <input
                                            type="text"
                                            value={data.age}
                                            onChange={(e) => setData('age', e.target.value)}
                                            className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                            পেশা
                                        </label>
                                        <input
                                            type="text"
                                            value={data.profession}
                                            onChange={(e) => setData('profession', e.target.value)}
                                            className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                            জাতীয়তা
                                        </label>
                                        <input
                                            type="text"
                                            value={data.nationality}
                                            onChange={(e) => setData('nationality', e.target.value)}
                                            className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                            বৈবাহিক অবস্থা
                                        </label>
                                        <input
                                            type="text"
                                            value={data.marital_status}
                                            onChange={(e) => setData('marital_status', e.target.value)}
                                            className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 3: ADDRESS */}
                            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-black text-xs border border-purple-100">
                                            ৩
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900">
                                                ঠিকানা বিবরণী
                                            </h3>
                                            <p className="text-[11px] text-slate-400">
                                                বর্তমান ও স্থায়ী ঠিকানা
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Present Address */}
                                <div className="p-4 rounded-2xl bg-slate-50/60 border border-slate-200/80 space-y-3">
                                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                        <MapPin className="w-3.5 h-3.5 text-purple-600" />
                                        <span>বর্তমান ঠিকানা</span>
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                                        <div className="sm:col-span-2">
                                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">গ্রাম/রাস্তা</label>
                                            <input
                                                type="text"
                                                value={data.present_village}
                                                onChange={(e) => setData('present_village', e.target.value)}
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:border-purple-600 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">ডাকঘর</label>
                                            <input
                                                type="text"
                                                value={data.present_post_office}
                                                onChange={(e) => setData('present_post_office', e.target.value)}
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:border-purple-600 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">উপজেলা</label>
                                            <input
                                                type="text"
                                                value={data.present_upazila}
                                                onChange={(e) => setData('present_upazila', e.target.value)}
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:border-purple-600 focus:outline-none"
                                            />
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">জেলা</label>
                                            <input
                                                type="text"
                                                value={data.present_district}
                                                onChange={(e) => setData('present_district', e.target.value)}
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:border-purple-600 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Permanent Address */}
                                <div className="p-4 rounded-2xl bg-slate-50/60 border border-slate-200/80 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                            <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                                            <span>স্থায়ী ঠিকানা</span>
                                        </h4>
                                        <button
                                            type="button"
                                            onClick={copyCurrentToPermanentAddress}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition"
                                            title="বর্তমান ঠিকানার তথ্য এখানে বসান"
                                        >
                                            <Copy className="w-3 h-3" />
                                            <span>বর্তমান ঠিকানার অনুরূপ</span>
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                                        <div className="sm:col-span-2">
                                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">গ্রাম/রাস্তা</label>
                                            <input
                                                type="text"
                                                value={data.permanent_village}
                                                onChange={(e) => setData('permanent_village', e.target.value)}
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:border-purple-600 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">ডাকঘর</label>
                                            <input
                                                type="text"
                                                value={data.permanent_post_office}
                                                onChange={(e) => setData('permanent_post_office', e.target.value)}
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:border-purple-600 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">উপজেলা</label>
                                            <input
                                                type="text"
                                                value={data.permanent_upazila}
                                                onChange={(e) => setData('permanent_upazila', e.target.value)}
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:border-purple-600 focus:outline-none"
                                            />
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">জেলা</label>
                                            <input
                                                type="text"
                                                value={data.permanent_district}
                                                onChange={(e) => setData('permanent_district', e.target.value)}
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:border-purple-600 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 4: FAMILY FINANCIAL INFO */}
                            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-black text-xs border border-purple-100">
                                            ৪
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900">
                                                পারিবারিক আর্থিক বিবরণী
                                            </h3>
                                            <p className="text-[11px] text-slate-400">
                                                মাসিক আয়, ব্যয় ও সম্ভাব্য সঞ্চয় উদ্বৃত্ত
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                            পরিবারের মাসিক আয় (৳)
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">৳</span>
                                            <input
                                                type="number"
                                                value={data.family_monthly_income || ''}
                                                onChange={(e) => {
                                                    const value = Number(e.target.value) || 0;
                                                    setData((prev) => ({
                                                        ...prev,
                                                        family_monthly_income: value,
                                                        family_monthly_surplus: Math.max(value - prev.family_monthly_expense, 0),
                                                    }));
                                                }}
                                                className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                            পরিবারের মাসিক ব্যয় (৳)
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">৳</span>
                                            <input
                                                type="number"
                                                value={data.family_monthly_expense || ''}
                                                onChange={(e) => {
                                                    const value = Number(e.target.value) || 0;
                                                    setData((prev) => ({
                                                        ...prev,
                                                        family_monthly_expense: value,
                                                        family_monthly_surplus: Math.max(prev.family_monthly_income - value, 0),
                                                    }));
                                                }}
                                                className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                            মাসিক উদ্বৃত্ত (৳)
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">৳</span>
                                            <input
                                                type="number"
                                                value={data.family_monthly_surplus || ''}
                                                onChange={(e) => setData('family_monthly_surplus', Number(e.target.value) || 0)}
                                                className="w-full pl-8 pr-3.5 py-2.5 bg-emerald-50/60 border border-emerald-300 rounded-xl text-xs sm:text-sm font-black text-emerald-800 focus:bg-white focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 5: NOMINEES */}
                            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-5">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-black text-xs border border-purple-100">
                                            ৫
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900">
                                                নমিনি সংক্রান্ত তথ্যাবলী
                                            </h3>
                                            <p className="text-[11px] text-slate-400">
                                                উত্তোলনের অধিকারী ব্যক্তি(গণ) ও প্রাপ্য অংশ
                                            </p>
                                        </div>
                                    </div>

                                    {/* Share percentage tracker pill */}
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                                            totalNomineePercentage === 100
                                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                : totalNomineePercentage > 100
                                                    ? 'bg-red-50 text-red-800 border-red-200'
                                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                        }`}>
                                            মোট অংশ: {totalNomineePercentage}%
                                            {totalNomineePercentage === 100 ? ' (সম্পূর্ণ)' : ` (বাকি: ${Math.max(100 - totalNomineePercentage, 0)}%)`}
                                        </span>

                                        <button
                                            type="button"
                                            onClick={() => setData('nominees', [...data.nominees, { name: '', relation: '', percentage: 0, photo: null, nid_birth_registration: '' }])}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition shadow-2xs"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            <span>নমিনি যোগ</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {data.nominees.map((nominee, idx) => (
                                        <div key={idx} className="p-4 rounded-2xl bg-slate-50/50 border border-slate-200 space-y-3 relative group">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[11px] font-bold inline-flex items-center justify-center">
                                                        {idx + 1}
                                                    </span>
                                                    <h4 className="text-xs font-bold text-slate-800">
                                                        {idx === 0 ? 'প্রধান নমিনি' : `সহ-নমিনি (${idx + 1})`}
                                                    </h4>
                                                </div>

                                                {data.nominees.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setData('nominees', data.nominees.filter((_, i) => i !== idx))}
                                                        className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 hover:text-red-800 p-1 rounded-lg hover:bg-red-50 transition"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                        <span>মুছুন</span>
                                                    </button>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-600 mb-1">নাম</label>
                                                    <input
                                                        type="text"
                                                        value={nominee.name}
                                                        placeholder="নমিনির নাম লিখুন"
                                                        onChange={(e) => updateNominee(idx, 'name', e.target.value)}
                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:border-purple-600 focus:outline-none"
                                                    />
                                                </div>

                                                <div data-field={`nominee_${idx}_relation`}>
                                                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                                        সম্পর্ক {nominee.name && '*'}
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={nominee.relation}
                                                        placeholder="যেমন: স্বামী, স্ত্রী, পিতা, মাতা"
                                                        onChange={(e) => updateNominee(idx, 'relation', e.target.value)}
                                                        className={`w-full px-3 py-2 bg-white border rounded-xl text-xs font-medium focus:border-purple-600 focus:outline-none ${
                                                            errors[`nominee_${idx}_relation`] ? 'border-red-500' : 'border-slate-200'
                                                        }`}
                                                    />
                                                    {fieldError(`nominee_${idx}_relation`)}
                                                </div>

                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-600 mb-1">NID / জন্ম নিবন্ধন নং</label>
                                                    <input
                                                        type="text"
                                                        value={nominee.nid_birth_registration}
                                                        placeholder="NID বা জন্ম নিবন্ধন নম্বর"
                                                        onChange={(e) => updateNominee(idx, 'nid_birth_registration', e.target.value)}
                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:border-purple-600 focus:outline-none font-mono"
                                                    />
                                                </div>

                                                <div data-field={`nominee_${idx}_percentage`}>
                                                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                                        প্রাপ্য অংশ (%) {nominee.name && '*'}
                                                    </label>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            placeholder="যেমন: 100"
                                                            value={nominee.percentage || ''}
                                                            onChange={(e) => updateNominee(idx, 'percentage', e.target.value)}
                                                            className={`w-full pr-8 pl-3 py-2 bg-white border rounded-xl text-xs font-bold focus:border-purple-600 focus:outline-none ${
                                                                errors[`nominee_${idx}_percentage`] ? 'border-red-500' : 'border-slate-200'
                                                            }`}
                                                        />
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">%</span>
                                                    </div>
                                                    {fieldError(`nominee_${idx}_percentage`)}
                                                </div>

                                                <div className="sm:col-span-2 flex items-center gap-3 pt-1">
                                                    <div className="w-12 h-14 rounded-xl border border-dashed border-slate-300 bg-white overflow-hidden flex items-center justify-center shrink-0">
                                                        {imagePreview[`nominee_${idx}_photo`] || nominee.photo ? (
                                                            <img
                                                                src={imagePreview[`nominee_${idx}_photo`] || nominee.photo || ''}
                                                                alt={`নমিনি ${idx + 1}`}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <User className="w-5 h-5 text-slate-300" />
                                                        )}
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] font-bold cursor-pointer transition shadow-2xs">
                                                            <Camera className="w-3 h-3 text-slate-500" />
                                                            <span>স্ট্যাম্প ছবি আপলোড</span>
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                onChange={(e) => handleNomineePhoto(idx, e.target.files?.[0] || null)}
                                                                className="hidden"
                                                            />
                                                        </label>
                                                        <p className="text-[10px] text-slate-400">প্রতিটি নমিনির জন্য আলাদা স্ট্যাম্প সাইজ ছবি</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* SECTION 6: APPLICANT SIGNATURE & DATE */}
                            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-black text-xs border border-purple-100">
                                            ৬
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900">
                                                আবেদনকারীর প্রত্যয়ন
                                            </h3>
                                            <p className="text-[11px] text-slate-400">
                                                মুদ্রিত ফর্মে হাতে স্বাক্ষর করা হবে
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">আবেদনকারীর নাম</label>
                                        <input
                                            type="text"
                                            value={data.applicant_name}
                                            onChange={(e) => setData('applicant_name', e.target.value)}
                                            className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">স্বাক্ষরের তারিখ</label>
                                        <input
                                            type="date"
                                            value={data.applicant_sign_date}
                                            onChange={(e) => setData('applicant_sign_date', e.target.value)}
                                            className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* BOTTOM SUBMIT BUTTON */}
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl text-sm font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-600/25 transition active:scale-95 disabled:opacity-50"
                                >
                                    {processing ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>আবেদনপত্র সংরক্ষণ হচ্ছে...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            <span>আবেদনপত্র সংরক্ষণ করুন</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* ── RIGHT SIDE: LIVE PRINT PREVIEW ─────────────────────────── */}
                        <div className={`lg:sticky lg:top-4 lg:h-fit print:block print-container savings-form-print-area ${
                            showPreview ? 'block' : 'hidden lg:block'
                        }`}>
                            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-4 sm:p-5 print:shadow-none print:p-0 print:border-none print:rounded-none">
                                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2 savings-form-no-print">
                                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                        <Eye className="w-3.5 h-3.5 text-purple-600" />
                                        <span>লাইভ প্রিন্ট প্রিভিউ</span>
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-medium">কাগজের ফর্ম অনুসারে প্রদর্শিত</span>
                                </div>
                                <ProfitSavingsPrintView data={withLiveMemberCode(data, memberAdmission)} />
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
}
