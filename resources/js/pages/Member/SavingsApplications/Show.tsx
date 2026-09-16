import AdminLayout from '@/layouts/admin-layout';
import { formatDate } from '@/utils/dateUtils';
import { Head, Link, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    ArrowLeft,
    FileText,
    Send,
    Trash2,
    Edit,
    Printer,
    CheckCircle2,
    XCircle,
    User,
    CreditCard,
    Banknote,
    Calendar,
    Clock,
    Sparkles,
    ShieldCheck,
    PiggyBank,
    AlertCircle,
    MapPin,
    Building2,
    Users,
    Check,
    Activity,
    Info,
    Phone,
} from 'lucide-react';
import { SavingsApplicationPrintView } from './Forms/SavingsApplicationForm';
import { ProfitSavingsPrintView } from './Forms/ProfitSavingsForm';
import { PhoneCallLink } from '@/components/ui/PhoneCallLink';

/** Nominee from API (nominee_info) */
interface NomineeInfo {
    name?: string;
    relation?: string;
    percentage?: number;
    photo?: string | null;
    nid?: string;
    birth_registration_no?: string;
}

type ProductRelation = {
    id: number;
    product_name: string;
    product_name_bn?: string;
    product_code: string;
    min_amount: number;
    max_amount?: number;
    duration_months: number;
};

type MemberRelation = {
    id: number;
    application_no: string;
    applicant_name_en?: string;
    applicant_name_bn?: string;
    nid_number?: string;
    mobile_number?: string;
    father_name_bn?: string;
    father_name_en?: string;
    spouse_name_bn?: string;
    present_village_road?: string;
    present_union?: string;
    present_post_code?: string;
    present_upazila?: string;
    present_district?: string;
    permanent_village_road?: string;
    permanent_union?: string;
    permanent_post_code?: string;
    permanent_upazila?: string;
    permanent_district?: string;
    samity?: { samity_name: string; samity_name_bn?: string };
};

interface Application {
    id: number;
    application_no: string;
    status: string;
    deposit_amount: number;
    monthly_installment?: number;
    monthly_savings_amount?: number;
    maturity_amount?: number;
    maturity_date?: string;
    account_opening_date?: string;
    term_years?: number;
    duration_months?: number;
    account_no?: string;
    member_no?: string;
    applicant_photo?: string | null;
    current_address?: string | null;
    permanent_address?: string | null;
    profession?: string | null;
    source_of_income?: string | null;
    monthly_deposit_submission_date?: string | null;
    officer_pin?: string | null;
    accountant_pin?: string | null;
    branch_manager_pin?: string | null;
    nominee_info?: NomineeInfo[] | null;
    created_at: string;
    submitted_at?: string;
    form_data?: Record<string, unknown>;
    savingsProduct?: ProductRelation;
    savings_product?: ProductRelation;
    memberAdmission?: MemberRelation;
    member_admission?: MemberRelation;
    branch?: { name: string; address?: string; area?: { name: string } };
    samity?: { samity_name: string; samity_name_bn?: string };
}

interface Props {
    application: Application;
    formType?: string | null;
    fromHeadOffice?: boolean;
    backUrl?: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    draft: { label: 'Draft (খসড়া)', color: 'bg-slate-100 text-slate-800 border-slate-300', icon: AlertCircle },
    submitted: { label: 'Submitted (জমা হয়েছে)', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: Send },
    under_review: { label: 'Under Review (পর্যালোচনায়)', color: 'bg-amber-100 text-amber-800 border-amber-300', icon: Clock },
    approved: { label: 'Approved (অনুমোদিত)', color: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: CheckCircle2 },
    rejected: { label: 'Rejected (প্রত্যাখ্যাত)', color: 'bg-rose-100 text-rose-800 border-rose-300', icon: XCircle },
    active: { label: 'Active (সক্রিয়)', color: 'bg-purple-100 text-purple-800 border-purple-300', icon: Sparkles },
    matured: { label: 'Matured (পরিপক্ক)', color: 'bg-indigo-100 text-indigo-800 border-indigo-300', icon: ShieldCheck },
    closed: { label: 'Closed (বন্ধ)', color: 'bg-slate-200 text-slate-800 border-slate-300', icon: AlertCircle },
    cancelled: { label: 'Cancelled (বাতিল)', color: 'bg-rose-100 text-rose-800 border-rose-300', icon: XCircle },
};

const PIPELINE_STAGES = [
    { key: 'draft', label: 'খসড়া', desc: 'আবেদন তৈরি' },
    { key: 'submitted', label: 'জমা হয়েছে', desc: 'অনুমোদন অপেক্ষমাণ' },
    { key: 'approved', label: 'অনুমোদিত', desc: 'শাখা অনুমোদন' },
    { key: 'active', label: 'সক্রিয় / পরিপক্ক', desc: 'সঞ্চয় কার্যক্রম' },
];

/** Build print form data from application (same shape as Create form so print view is 100% accurate) */
function buildPrintData(application: Application): Record<string, unknown> {
    const app = application;
    const member = app.memberAdmission ?? app.member_admission;
    const product = app.savingsProduct ?? app.savings_product;
    const branch = app.branch;
    const formData = app.form_data as Record<string, unknown> | undefined;

    const emptyNominee = { name: '', relation: '', percentage: 0, photo: null, nid_birth_registration: '' };
    const nomineeList = Array.isArray(app.nominee_info) && app.nominee_info.length > 0
        ? app.nominee_info.map((n: NomineeInfo) => ({
            name: n.name ?? '',
            relation: n.relation ?? '',
            percentage: Number(n.percentage) || 0,
            photo: n.photo ?? null,
            nid_birth_registration: n.nid ?? n.birth_registration_no ?? '',
        }))
        : [emptyNominee];

    const base = {
        account_opening_date: app.account_opening_date || (formData?.account_opening_date as string) || '',
        monthly_savings_amount: app.monthly_savings_amount ?? app.deposit_amount ?? (formData?.monthly_savings_amount as number) ?? 0,
        term_years: app.term_years ?? (formData?.term_years as number) ?? null,
        account_no: app.account_no ?? (formData?.account_no as string) ?? '',
        member_no: app.member_no ?? member?.application_no ?? (formData?.member_no as string) ?? '',
        applicant_photo: app.applicant_photo ?? (formData?.applicant_photo as string) ?? null,
        applicant_name_bn: (formData?.applicant_name_bn as string) ?? member?.applicant_name_bn ?? '',
        applicant_name_en: (formData?.applicant_name_en as string) ?? member?.applicant_name_en ?? '',
        nid_number: (formData?.nid_number as string) ?? member?.nid_number ?? '',
        father_husband_guardian: (formData?.father_husband_guardian as string) ?? member?.father_name_bn ?? member?.spouse_name_bn ?? '',
        current_address_village: (formData?.current_address_village as string) ?? member?.present_village_road ?? '',
        current_address_post_office: (formData?.current_address_post_office as string) ?? member?.present_union ?? member?.present_post_code ?? '',
        current_address_upazila: (formData?.current_address_upazila as string) ?? member?.present_upazila ?? '',
        current_address_district: (formData?.current_address_district as string) ?? member?.present_district ?? '',
        permanent_address_village: (formData?.permanent_address_village as string) ?? member?.permanent_village_road ?? member?.present_village_road ?? '',
        permanent_address_post_office: (formData?.permanent_address_post_office as string) ?? member?.permanent_union ?? member?.permanent_post_code ?? member?.present_union ?? member?.present_post_code ?? '',
        permanent_address_upazila: (formData?.permanent_address_upazila as string) ?? member?.permanent_upazila ?? member?.present_upazila ?? '',
        permanent_address_district: (formData?.permanent_address_district as string) ?? member?.permanent_district ?? member?.present_district ?? '',
        profession: app.profession ?? (formData?.profession as string) ?? '',
        source_of_income: app.source_of_income ?? (formData?.source_of_income as string) ?? '',
        nominees: (formData?.nominees as typeof nomineeList) ?? nomineeList,
        nominee_nid_birth_registration: (formData?.nominee_nid_birth_registration as string) ?? '',
        monthly_deposit_submission_date: app.monthly_deposit_submission_date ?? (formData?.monthly_deposit_submission_date as string) ?? '',
        officer_pin: app.officer_pin ?? (formData?.officer_pin as string) ?? '',
        accountant_pin: app.accountant_pin ?? (formData?.accountant_pin as string) ?? '',
        branch_manager_pin: app.branch_manager_pin ?? (formData?.branch_manager_pin as string) ?? '',
        duration_months: app.duration_months ?? product?.duration_months ?? null,
        branch_name: (formData?.branch_name as string) ?? branch?.name ?? '',
        branch_address: (formData?.branch_address as string) ?? branch?.address ?? '',
        area_name: (formData?.area_name as string) ?? branch?.area?.name ?? '',
        samity_name: (formData?.samity_name as string)
            ?? member?.samity?.samity_name_bn
            ?? app.samity?.samity_name_bn
            ?? member?.samity?.samity_name
            ?? app.samity?.samity_name
            ?? '',
    };
    return base;
}

/** স্বেচ্ছা সঞ্চয়/মাসিক মুনাফা/দ্বিগুণ মুনাফা ফর্মের সংরক্ষিত তথ্য, ফাঁকা ঘর আবেদন থেকে পূরণ হয় */
function buildProfitPrintData(application: Application): Record<string, unknown> {
    const member = application.memberAdmission ?? application.member_admission;
    const branch = application.branch;
    const saved = (application.form_data ?? {}) as Record<string, unknown>;

    const nominees = Array.isArray(application.nominee_info)
        ? application.nominee_info.map((n: NomineeInfo) => ({
            name: n.name ?? '',
            relation: n.relation ?? '',
            percentage: Number(n.percentage) || 0,
            photo: n.photo ?? null,
            nid_birth_registration: n.nid ?? n.birth_registration_no ?? '',
        }))
        : [];

    return {
        branch_name: branch?.name ?? '',
        application_date: application.account_opening_date ?? application.created_at,
        applicant_photo: application.applicant_photo ?? null,
        deposit_amount: application.deposit_amount,
        member_name: member?.applicant_name_bn ?? member?.applicant_name_en ?? '',
        member_code: member?.application_no ?? '',
        nid_number: member?.nid_number ?? '',
        mobile_number: member?.mobile_number ?? '',
        profession: application.profession ?? '',
        ...saved,
        nominees: (saved.nominees as unknown[]) ?? (nominees.length > 0 ? nominees : undefined),
    };
}

export default function Show({ application, formType, fromHeadOffice = false, backUrl = '/member/savings-applications' }: Props) {
    const [activeTab, setActiveTab] = useState<'form' | 'details'>('form');

    const statusInfo = statusConfig[application.status] || statusConfig.draft;
    const StatusIcon = statusInfo.icon || AlertCircle;

    const canEdit = !fromHeadOffice && (application.status === 'draft' || application.status === 'rejected');
    const canDelete = !fromHeadOffice && (application.status === 'draft' || application.status === 'submitted');
    const canSubmit = !fromHeadOffice && (application.status === 'draft' || application.status === 'rejected');
    const canApprove = !fromHeadOffice && application.status === 'submitted';

    const product = application.savingsProduct ?? application.savings_product;
    const member = application.memberAdmission ?? application.member_admission;

    const isProfitSavings = formType === 'profit_savings';
    const printData = useMemo(
        () => (isProfitSavings ? buildProfitPrintData(application) : buildPrintData(application)),
        [application, isProfitSavings],
    );

    const formatAmount = (n: number) =>
        new Intl.NumberFormat('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

    const handleSubmit = () => {
        if (confirm('আবেদনটি জমা দিতে চান?')) {
            router.patch(`/member/savings-applications/${application.id}/submit`);
        }
    };

    const handleDelete = () => {
        if (confirm('এই আবেদনটি মুছে ফেলতে চান? এটি পুনরুদ্ধার করা যাবে না।')) {
            router.delete(`/member/savings-applications/${application.id}`, {
                preserveScroll: true,
            });
        }
    };

    const handlePrint = () => {
        window.print();
    };

    // Calculate duration display
    const durationMonths = application.duration_months ?? product?.duration_months;
    const durationYears = application.term_years ?? (durationMonths && durationMonths >= 12 ? Math.round(durationMonths / 12) : null);
    const durationLabel = durationYears ? `${durationYears} বছর` : (durationMonths ? `${durationMonths} মাস` : '—');

    // Stage tracking
    const getStageIndex = () => {
        switch (application.status) {
            case 'draft': return 0;
            case 'submitted':
            case 'under_review': return 1;
            case 'approved': return 2;
            case 'active':
            case 'matured':
            case 'closed': return 3;
            default: return 0;
        }
    };
    const activeStageIndex = getStageIndex();

    // Plain Bengali pending status guidance
    const getPendingStatusExplanation = () => {
        switch (application.status) {
            case 'draft':
                return {
                    title: 'বর্তমান অবস্থা: খসড়া (Draft)',
                    desc: 'আবেদনপত্রটি এখনও খসড়া অবস্থায় রয়েছে। প্রয়োজনীয় তথ্য যাচাই করে উপরের "জমা দিন" বাটনে ক্লিক করে শাখা ব্যবস্থাপকের অনুমোদনের জন্য প্রেরণ করুন।',
                    badgeColor: 'bg-slate-100 text-slate-800 border-slate-300',
                    cardBg: 'bg-slate-50 border-slate-200 text-slate-900',
                    iconColor: 'text-slate-600',
                };
            case 'submitted':
                return {
                    title: 'বর্তমান অবস্থা: জমা হয়েছে (Submitted - অনুমোদনের অপেক্ষায়)',
                    desc: 'আবেদনটি সফলভাবে জমা হয়েছে এবং শাখা ব্যবস্থাপকের অনুমোদনের জন্য অপেক্ষমাণ রয়েছে। অনুমোদন সম্পন্ন হলে সঞ্চয় হিসাব সক্রিয় হবে।',
                    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
                    cardBg: 'bg-blue-50/90 border-blue-200 text-blue-950',
                    iconColor: 'text-blue-600',
                };
            case 'under_review':
                return {
                    title: 'বর্তমান অবস্থা: পর্যালোচনাধীন (Under Review)',
                    desc: 'আবেদনপত্রটি কর্তৃপক্ষ কর্তৃক পর্যালোচনা করা হচ্ছে।',
                    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
                    cardBg: 'bg-amber-50/90 border-amber-200 text-amber-950',
                    iconColor: 'text-amber-600',
                };
            case 'approved':
                return {
                    title: 'সম্পন্ন অবস্থা: অনুমোদিত (Approved)',
                    desc: 'সঞ্চয় আবেদনটি অনুমোদিত হয়েছে। সদস্যের সঞ্চয় অ্যাকাউন্ট কার্যকর রয়েছে।',
                    badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
                    cardBg: 'bg-emerald-50/90 border-emerald-200 text-emerald-950',
                    iconColor: 'text-emerald-600',
                };
            case 'active':
                return {
                    title: 'সক্রিয় সঞ্চয় হিসাব (Active)',
                    desc: 'এই সঞ্চয় হিসাবটি সক্রিয় রয়েছে এবং সদস্য নিয়মিত কিস্তি সঞ্চয় জমা দিচ্ছেন।',
                    badgeColor: 'bg-purple-100 text-purple-900 border-purple-300',
                    cardBg: 'bg-purple-50/90 border-purple-200 text-purple-950',
                    iconColor: 'text-purple-600',
                };
            case 'matured':
                return {
                    title: 'মেয়াদোত্তীর্ণ / পরিপক্ক (Matured)',
                    desc: 'সঞ্চয় হিসাবটির মেয়াদ পূর্ণ হয়েছে। পলিসি অনুযায়ী লভ্যাংশসহ মূল টাকা ফেরত বা উত্তোলনের জন্য উপযুক্ত।',
                    badgeColor: 'bg-indigo-100 text-indigo-900 border-indigo-300',
                    cardBg: 'bg-indigo-50/90 border-indigo-200 text-indigo-950',
                    iconColor: 'text-indigo-600',
                };
            case 'rejected':
                return {
                    title: 'প্রত্যাখ্যাত বা বাতিল (Rejected)',
                    desc: 'কর্তৃপক্ষ কর্তৃক এই সঞ্চয় আবেদনটি প্রত্যাখ্যান করা হয়েছে।',
                    badgeColor: 'bg-rose-100 text-rose-900 border-rose-300',
                    cardBg: 'bg-rose-50/90 border-rose-200 text-rose-950',
                    iconColor: 'text-rose-600',
                };
            default:
                return {
                    title: `বর্তমান অবস্থা: ${statusInfo?.label || application.status}`,
                    desc: 'সঞ্চয় আবেদনের তথ্য সংরক্ষিত রয়েছে।',
                    badgeColor: 'bg-slate-100 text-slate-800 border-slate-300',
                    cardBg: 'bg-slate-50 border-slate-200 text-slate-900',
                    iconColor: 'text-slate-600',
                };
        }
    };

    const pendingStatusInfo = getPendingStatusExplanation();
    const memberName = member?.applicant_name_bn || member?.applicant_name_en || '—';

    return (
        <AdminLayout>
            <Head title={`Savings Application - ${application.application_no}`}>
                <style>{`
                    @media print {
                        @page { size: A4 portrait; margin: 5mm; }
                        html, body {
                            background: white !important;
                            color: black !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            height: auto !important;
                            overflow: visible !important;
                        }
                        body * { 
                            visibility: hidden !important; 
                        }
                        .savings-print-area,
                        .savings-print-area *,
                        .print-container,
                        .print-container *,
                        .printable-area,
                        .printable-area * { 
                            visibility: visible !important; 
                        }
                        .savings-print-area,
                        .print-container,
                        .printable-area {
                            position: absolute !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: 100% !important;
                            max-width: 100% !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            background: white !important;
                            box-shadow: none !important;
                            z-index: 999999 !important;
                            display: block !important;
                            overflow: visible !important;
                        }
                        .no-print, .print\\:hidden, nav, header, sidebar { 
                            display: none !important; 
                        }
                    }
                `}</style>
            </Head>

            <div className="py-3 sm:py-6 bg-slate-50/60 min-h-screen">
                <div className="mx-auto max-w-7xl px-2.5 sm:px-6 lg:px-8 space-y-3.5">
                    
                    {/* ── 1. HEADER BAR (BREADCRUMB, TITLE, BADGES & ACTIONS) ────────────────── */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-5 rounded-2xl shadow-xs border border-slate-200/80 print:hidden">
                        <div className="flex items-center gap-3">
                            <Link href={backUrl}>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl hover:bg-slate-100 transition shrink-0"
                                    title={fromHeadOffice ? 'তালিকায় ফিরে যান' : 'পেছনে যান'}
                                >
                                    <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" />
                                </Button>
                            </Link>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h2 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">
                                        সঞ্চয় আবেদন বিবরণ
                                    </h2>
                                    
                                    <Badge variant="outline" className="font-mono text-[11px] sm:text-xs text-indigo-700 bg-indigo-50 border-indigo-200 font-semibold px-2 py-0.5">
                                        আবেদন নং: {application.application_no || '—'}
                                    </Badge>

                                    {member?.application_no && (
                                        <Badge variant="outline" className="font-mono text-[11px] sm:text-xs text-blue-700 bg-blue-50 border-blue-200 font-semibold px-2 py-0.5">
                                            সদস্য কোড: {member.application_no}
                                        </Badge>
                                    )}

                                    <Badge className={`${statusInfo.color} text-[11px] sm:text-xs font-medium border px-2 py-0.5`}>
                                        <StatusIcon className="w-3 h-3 mr-1 inline" />
                                        {statusInfo.label}
                                    </Badge>
                                </div>
                                <p className="text-[11px] sm:text-xs text-slate-500 mt-1 font-medium break-words flex items-center gap-1.5 flex-wrap">
                                    <span>সদস্য: <span className="font-bold text-slate-800">{memberName}</span></span>
                                    {member?.mobile_number && (
                                        <>
                                            <span className="text-slate-300 mx-1">|</span>
                                            <PhoneCallLink
                                                phone={member.mobile_number}
                                                className="text-slate-600 hover:text-blue-600 text-[11px] sm:text-xs"
                                                iconClassName="w-3 h-3 text-blue-500"
                                            />
                                        </>
                                    )}
                                    {application.branch?.name && (
                                        <>
                                            <span className="text-slate-300 mx-1">|</span>
                                            <span>শাখা: <span className="font-medium text-slate-700">{application.branch.name}</span></span>
                                        </>
                                    )}
                                    {(application.samity?.samity_name_bn || member?.samity?.samity_name_bn || member?.samity?.samity_name) && (
                                        <>
                                            <span className="text-slate-300 mx-1">|</span>
                                            <span>সমিতি: <span className="font-medium text-slate-700">{application.samity?.samity_name_bn || member?.samity?.samity_name_bn || member?.samity?.samity_name}</span></span>
                                        </>
                                    )}
                                    <span className="text-slate-300 mx-1">|</span>
                                    <span>তারিখ: <span className="font-medium text-slate-700">{formatDate(application.created_at)}</span></span>
                                    {application.submitted_at && (
                                        <>
                                            <span className="text-slate-300 mx-1">|</span>
                                            <span>জমা: <span className="font-medium text-slate-700">{formatDate(application.submitted_at)}</span></span>
                                        </>
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Top Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                            <Button
                                onClick={handlePrint}
                                className="w-full sm:w-auto bg-slate-900 hover:bg-black text-white shadow-xs font-semibold rounded-xl text-xs sm:text-sm h-9 sm:h-10"
                                title="কাগজের আবেদনপত্র প্রিন্ট করুন"
                            >
                                <Printer className="w-4 h-4 mr-1.5" />
                                প্রিন্ট ফর্ম
                            </Button>

                            {canEdit && product?.id && member?.id && (
                                <Link href={`/member/savings-applications/create/${product.id}?member_id=${member.id}`}>
                                    <Button
                                        variant="outline"
                                        className="w-full sm:w-auto rounded-xl text-xs sm:text-sm h-9 sm:h-10 border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
                                    >
                                        <Edit className="w-4 h-4 mr-1.5 text-blue-600" />
                                        সম্পাদনা
                                    </Button>
                                </Link>
                            )}

                            {canSubmit && (
                                <Button
                                    onClick={handleSubmit}
                                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs font-semibold rounded-xl text-xs sm:text-sm h-9 sm:h-10"
                                >
                                    <Send className="w-4 h-4 mr-1.5" />
                                    জমা দিন
                                </Button>
                            )}

                            {canApprove && (
                                <>
                                    <Button
                                        onClick={() => {
                                            if (confirm('এই সঞ্চয় আবেদনটি অনুমোদন করতে চান?')) {
                                                router.patch(`/member/savings-applications/${application.id}/approve`);
                                            }
                                        }}
                                        className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs font-semibold rounded-xl text-xs sm:text-sm h-9 sm:h-10"
                                    >
                                        <CheckCircle2 className="w-4 h-4 mr-1.5" />
                                        অনুমোদন
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        onClick={() => {
                                            const reason = window.prompt('প্রত্যাখ্যানের কারণ লিখুন (ঐচ্ছিক):');
                                            if (reason !== null) {
                                                router.patch(`/member/savings-applications/${application.id}/reject`, { rejection_reason: reason || '' });
                                            }
                                        }}
                                        className="w-full sm:w-auto rounded-xl text-xs sm:text-sm h-9 sm:h-10 shadow-xs font-semibold"
                                    >
                                        <XCircle className="w-4 h-4 mr-1.5" />
                                        প্রত্যাখ্যান
                                    </Button>
                                </>
                            )}

                            {canDelete && (
                                <Button
                                    variant="outline"
                                    onClick={handleDelete}
                                    className="w-full sm:w-auto rounded-xl text-xs sm:text-sm h-9 sm:h-10 border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold"
                                >
                                    <Trash2 className="w-4 h-4 mr-1.5 text-rose-600" />
                                    মুছুন
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* ── 2. STATUS TRACKER & PIPELINE BANNER ─────────────────────────────────── */}
                    <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3.5 print:hidden">
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                                <span className="flex items-center gap-1.5 font-bold text-slate-800">
                                    <Activity className="w-4 h-4 text-indigo-600" /> সঞ্চয় আবেদনের পর্যায়ক্রমিক অগ্রগতি (Timeline Tracker)
                                </span>
                                <span>ধাপ {activeStageIndex + 1} / ৪</span>
                            </div>

                            <div className="overflow-x-auto pb-1 -mx-1 px-1">
                                <div className="flex items-center min-w-[500px] sm:min-w-0 justify-between relative">
                                    {/* Connecting Line */}
                                    <div className="absolute top-4 left-6 right-6 h-0.5 bg-slate-200 -z-0" />
                                    
                                    {PIPELINE_STAGES.map((stage, idx) => {
                                        const isCompleted = idx < activeStageIndex;
                                        const isCurrent = idx === activeStageIndex;
                                        return (
                                            <div key={stage.key} className="flex flex-col items-center relative z-10 text-center flex-1 px-1">
                                                <div 
                                                    className={[
                                                        'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 border-2',
                                                        isCompleted
                                                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                                            : isCurrent
                                                                ? 'bg-indigo-600 text-white border-indigo-200 ring-4 ring-indigo-100 shadow-md animate-pulse scale-105'
                                                                : 'bg-white text-slate-400 border-slate-300',
                                                    ].join(' ')}
                                                >
                                                    {isCompleted ? <Check className="w-4 h-4" /> : idx + 1}
                                                </div>
                                                <span className={`text-[11px] font-bold mt-1.5 ${isCurrent ? 'text-indigo-700 font-extrabold' : isCompleted ? 'text-slate-800' : 'text-slate-400'}`}>
                                                    {stage.label}
                                                </span>
                                                <span className="text-[10px] text-slate-400 hidden sm:inline">{stage.desc}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Plain Bengali Contextual Guidance Card */}
                        <div className={`p-3.5 sm:p-4 rounded-xl border flex items-start gap-3 transition shadow-2xs ${pendingStatusInfo.cardBg}`}>
                            <div className={`p-2 bg-white/90 rounded-xl shrink-0 shadow-xs ${pendingStatusInfo.iconColor}`}>
                                <Info className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                    <h4 className="text-sm font-bold text-slate-900">{pendingStatusInfo.title}</h4>
                                    <Badge className={`${pendingStatusInfo.badgeColor} font-mono text-[10px] px-2 py-0.2`}>
                                        {statusInfo?.label || application.status}
                                    </Badge>
                                </div>
                                <p className="text-xs text-slate-700 leading-relaxed">{pendingStatusInfo.desc}</p>
                            </div>
                        </div>
                    </div>

                    {/* ── 3. EXECUTIVE KPI SUMMARY RIBBON (4 CARDS) ───────────────────────────── */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 print:hidden">
                        {/* Member Info Card */}
                        <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-2.5 sm:gap-3">
                            <div className="p-2 sm:p-2.5 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                                <User className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-400">সদস্যের বিবরণ</p>
                                <p className="text-xs sm:text-sm font-bold text-slate-900 truncate" title={memberName}>{memberName}</p>
                                <p className="text-[10px] sm:text-xs text-slate-500 font-mono truncate mt-0.5">
                                    কোড: {member?.application_no || '—'}
                                </p>
                            </div>
                        </div>

                        {/* Product Info Card */}
                        <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-2.5 sm:gap-3">
                            <div className="p-2 sm:p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
                                <PiggyBank className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-400">সঞ্চয় প্রোডাক্ট</p>
                                <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                    {product?.product_name_bn || product?.product_name || '—'}
                                </p>
                                <p className="text-[10px] sm:text-xs text-slate-500 truncate">
                                    কোড: {product?.product_code || '—'}
                                </p>
                            </div>
                        </div>

                        {/* Deposit & Installment Card */}
                        <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-2.5 sm:gap-3">
                            <div className="p-2 sm:p-2.5 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
                                <Banknote className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-400">জমা ও কিস্তির পরিমাণ</p>
                                <p className="text-xs sm:text-sm font-bold text-emerald-700 truncate">
                                    ৳{formatAmount(application.deposit_amount)}
                                </p>
                                <p className="text-[10px] sm:text-xs text-slate-500 truncate">
                                    মাসিক কিস্তি: {application.monthly_installment || application.monthly_savings_amount
                                        ? `৳${formatAmount(Number(application.monthly_installment || application.monthly_savings_amount))}`
                                        : '—'}
                                </p>
                            </div>
                        </div>

                        {/* Term & Maturity Card */}
                        <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-2.5 sm:gap-3">
                            <div className="p-2 sm:p-2.5 bg-purple-50 text-purple-600 rounded-xl shrink-0">
                                <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-400">মেয়াদ ও পরিপক্কতা</p>
                                <p className="text-xs sm:text-sm font-bold text-purple-900 truncate">
                                    মেয়াদ: {durationLabel}
                                </p>
                                <p className="text-[10px] sm:text-xs text-slate-500 truncate">
                                    {application.maturity_amount ? `পরিপক্ক: ৳${formatAmount(application.maturity_amount)}` : (application.maturity_date ? formatDate(application.maturity_date) : '—')}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ── 4. TABS NAVIGATION ──────────────────────────────────────────────────── */}
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-2 print:hidden">
                        <button
                            type="button"
                            onClick={() => setActiveTab('form')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition shadow-2xs ${
                                activeTab === 'form'
                                    ? 'bg-indigo-600 text-white shadow-xs'
                                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                            }`}
                        >
                            <FileText className="w-4 h-4" />
                            <span>আবেদনপত্র ও প্রিন্ট প্রিভিউ</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('details')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition shadow-2xs ${
                                activeTab === 'details'
                                    ? 'bg-indigo-600 text-white shadow-xs'
                                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                            }`}
                        >
                            <User className="w-4 h-4" />
                            <span>সদস্য ও অ্যাকাউন্টের বিবরণ</span>
                        </button>
                    </div>

                    {/* ── 5. TAB CONTENT: APPLICATION FORM (PRINT & PREVIEW) ─────────────────── */}
                    <div className={activeTab === 'form' ? 'block' : 'hidden print:block'}>
                        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-3 sm:p-5 print:shadow-none print:p-0 print:border-none print:rounded-none">
                            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3 print:hidden">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                                        <Printer className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900">
                                            অফিসিয়াল সঞ্চয় আবেদনপত্র (A4 ফরম্যাট)
                                        </h3>
                                        <p className="text-[11px] text-slate-500">
                                            প্রিন্ট বাটনে ক্লিক করলে শুধুমাত্র কাগজের ফর্মটি স্ট্যান্ডার্ড A4 সাইজে প্রিন্ট হবে
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    onClick={handlePrint}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
                                >
                                    <Printer className="w-3.5 h-3.5 mr-1.5" />
                                    প্রিন্ট করুন
                                </Button>
                            </div>

                            {/* Printable Paper Area */}
                            <div className="savings-print-area max-w-[210mm] mx-auto p-2 sm:p-4 bg-white print:p-0">
                                {isProfitSavings ? (
                                    <ProfitSavingsPrintView data={printData as any} />
                                ) : (
                                    <SavingsApplicationPrintView data={printData as any} />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── 6. TAB CONTENT: MEMBER & ACCOUNT DETAILS ───────────────────────────── */}
                    <div className={activeTab === 'details' ? 'space-y-4' : 'hidden'}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Member Details */}
                            <Card className="rounded-2xl border-slate-200/80 shadow-xs">
                                <CardHeader className="pb-3 border-b border-slate-100">
                                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
                                        <User className="w-4 h-4 text-blue-600" />
                                        আবেদনকারীর ব্যক্তিগত তথ্য
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-3 space-y-2.5 text-xs">
                                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                                        <span className="text-slate-500">নাম (বাংলা):</span>
                                        <span className="font-bold text-slate-800">{member?.applicant_name_bn || '—'}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                                        <span className="text-slate-500">নাম (ইংরেজি):</span>
                                        <span className="font-medium text-slate-700">{member?.applicant_name_en || '—'}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                                        <span className="text-slate-500">পিতা/স্বামীর নাম:</span>
                                        <span className="font-medium text-slate-700">{member?.father_name_bn || member?.spouse_name_bn || '—'}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                                        <span className="text-slate-500">এনআইডি নম্বর:</span>
                                        <span className="font-mono font-medium text-slate-800">{member?.nid_number || '—'}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                                        <span className="text-slate-500">মোবাইল নম্বর:</span>
                                        <span className="font-medium text-slate-700">
                                            {member?.mobile_number ? (
                                                <PhoneCallLink phone={member.mobile_number} className="text-blue-600 font-mono text-xs" />
                                            ) : '—'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                                        <span className="text-slate-500">পেশা:</span>
                                        <span className="font-medium text-slate-700">{application.profession || '—'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">আয়ের উৎস:</span>
                                        <span className="font-medium text-slate-700">{application.source_of_income || '—'}</span>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Office & Account Info */}
                            <Card className="rounded-2xl border-slate-200/80 shadow-xs">
                                <CardHeader className="pb-3 border-b border-slate-100">
                                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
                                        <Building2 className="w-4 h-4 text-indigo-600" />
                                        অফিস ও অ্যাকাউন্ট সংক্রান্ত তথ্য
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-3 space-y-2.5 text-xs">
                                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                                        <span className="text-slate-500">হিসাব নং:</span>
                                        <span className="font-mono font-bold text-indigo-700">{application.account_no || '—'}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                                        <span className="text-slate-500">সদস্য নং:</span>
                                        <span className="font-mono font-bold text-blue-700">{application.member_no || member?.application_no || '—'}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                                        <span className="text-slate-500">হিসাব খোলার তারিখ:</span>
                                        <span className="font-medium text-slate-700">{application.account_opening_date ? formatDate(application.account_opening_date) : '—'}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                                        <span className="text-slate-500">মাসিক জমা জমার তারিখ:</span>
                                        <span className="font-medium text-slate-700">{application.monthly_deposit_submission_date ? formatDate(application.monthly_deposit_submission_date) : '—'}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                                        <span className="text-slate-500">অফিসার পিন (PIN):</span>
                                        <span className="font-mono font-medium text-slate-700">{application.officer_pin || '—'}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                                        <span className="text-slate-500">হিসাবরক্ষক পিন (PIN):</span>
                                        <span className="font-mono font-medium text-slate-700">{application.accountant_pin || '—'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">শাখা ব্যবস্থাপক পিন (PIN):</span>
                                        <span className="font-mono font-medium text-slate-700">{application.branch_manager_pin || '—'}</span>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Address Information */}
                            <Card className="rounded-2xl border-slate-200/80 shadow-xs">
                                <CardHeader className="pb-3 border-b border-slate-100">
                                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
                                        <MapPin className="w-4 h-4 text-emerald-600" />
                                        ঠিকানা সংক্রান্ত বিবরণ
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-3 space-y-3 text-xs">
                                    <div>
                                        <p className="font-bold text-slate-700 mb-1">বর্তমান ঠিকানা:</p>
                                        <p className="text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                                            {application.current_address || [
                                                member?.present_village_road ? `গ্রাম: ${member.present_village_road}` : '',
                                                member?.present_union ? `ডাকঘর/ইউনিয়ন: ${member.present_union}` : '',
                                                member?.present_upazila ? `উপজেলা: ${member.present_upazila}` : '',
                                                member?.present_district ? `জেলা: ${member.present_district}` : '',
                                            ].filter(Boolean).join(', ') || '—'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-700 mb-1">স্থায়ী ঠিকানা:</p>
                                        <p className="text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                                            {application.permanent_address || [
                                                member?.permanent_village_road ? `গ্রাম: ${member.permanent_village_road}` : '',
                                                member?.permanent_union ? `ডাকঘর/ইউনিয়ন: ${member.permanent_union}` : '',
                                                member?.permanent_upazila ? `উপজেলা: ${member.permanent_upazila}` : '',
                                                member?.permanent_district ? `জেলা: ${member.permanent_district}` : '',
                                            ].filter(Boolean).join(', ') || '—'}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Nominee Information */}
                            <Card className="rounded-2xl border-slate-200/80 shadow-xs">
                                <CardHeader className="pb-3 border-b border-slate-100">
                                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
                                        <Users className="w-4 h-4 text-purple-600" />
                                        নমিনি সংক্রান্ত তথ্য
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-3 text-xs">
                                    {Array.isArray(application.nominee_info) && application.nominee_info.length > 0 ? (
                                        <div className="space-y-2">
                                            {application.nominee_info.map((nom, idx) => (
                                                <div key={idx} className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 bg-slate-50">
                                                    {nom.photo ? (
                                                        <img
                                                            src={nom.photo}
                                                            alt={nom.name || 'নমিনি'}
                                                            className="w-10 h-12 object-cover rounded-lg border border-slate-200 shrink-0"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-12 rounded-lg bg-slate-200 flex items-center justify-center shrink-0 text-slate-400">
                                                            <User className="w-5 h-5" />
                                                        </div>
                                                    )}
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-bold text-slate-800 truncate">{nom.name || '—'}</p>
                                                        <p className="text-[11px] text-slate-500">সম্পর্ক: <span className="text-slate-700 font-medium">{nom.relation || '—'}</span></p>
                                                        <p className="text-[11px] text-slate-500">এনআইডি/জন্ম নিবন্ধন: <span className="font-mono text-slate-700">{nom.nid || nom.birth_registration_no || '—'}</span></p>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <Badge variant="outline" className="font-bold text-purple-700 bg-purple-50 border-purple-200">
                                                            {nom.percentage ? `${nom.percentage}%` : '—'}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-slate-400 text-center py-6">কোনো নমিনি তথ্য সংরক্ষিত নেই</p>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* ── 7. BOTTOM ACTION FOOTER (MIRRORED FOR ACCESSIBILITY) ───────────────── */}
                    <div className="no-print flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                        <div className="text-xs text-slate-500">
                            আবেদন আইডি: <span className="font-mono font-semibold text-slate-700">#{application.id}</span>
                            <span className="mx-2 text-slate-300">|</span>
                            স্ট্যাটাস: <span className="font-bold text-slate-800">{statusInfo.label}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {canEdit && product?.id && member?.id && (
                                <Link href={`/member/savings-applications/create/${product.id}?member_id=${member.id}`}>
                                    <Button variant="outline" size="sm" className="rounded-xl text-xs font-semibold">
                                        <Edit className="h-3.5 w-3.5 mr-1.5 text-blue-600" />
                                        সম্পাদনা (Edit)
                                    </Button>
                                </Link>
                            )}
                            {canSubmit && (
                                <Button size="sm" onClick={handleSubmit} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold">
                                    <Send className="h-3.5 w-3.5 mr-1.5" />
                                    জমা দিন (Submit)
                                </Button>
                            )}
                            {canApprove && (
                                <>
                                    <Button
                                        size="sm"
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold"
                                        onClick={() => {
                                            if (confirm('Approve this savings application?')) {
                                                router.patch(`/member/savings-applications/${application.id}/approve`);
                                            }
                                        }}
                                    >
                                        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                                        অনুমোদন (Approve)
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        className="rounded-xl text-xs font-semibold"
                                        onClick={() => {
                                            const reason = window.prompt('Rejection reason (optional):');
                                            if (reason !== null) {
                                                router.patch(`/member/savings-applications/${application.id}/reject`, { rejection_reason: reason || '' });
                                            }
                                        }}
                                    >
                                        <XCircle className="h-3.5 w-3.5 mr-1.5" />
                                        প্রত্যাখ্যান (Reject)
                                    </Button>
                                </>
                            )}
                            <Button variant="outline" size="sm" onClick={handlePrint} className="rounded-xl text-xs font-semibold" title="Print application form">
                                <Printer className="h-3.5 w-3.5 mr-1.5" />
                                প্রিন্ট ফর্ম
                            </Button>
                            {canDelete && (
                                <Button variant="destructive" size="sm" onClick={handleDelete} className="rounded-xl text-xs font-semibold">
                                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                                    মুছুন (Delete)
                                </Button>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </AdminLayout>
    );
}
