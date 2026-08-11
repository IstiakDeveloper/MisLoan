import AdminLayout from '@/layouts/admin-layout';
import { formatDate } from '@/utils/dateUtils';
import { Head, Link, router } from '@inertiajs/react';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, Send, Trash2, Edit, Printer, CheckCircle, XCircle } from 'lucide-react';
import { SavingsApplicationPrintView } from './Forms/SavingsApplicationForm';

/** Nominee from API (nominee_info) */
interface NomineeInfo {
    name?: string;
    relation?: string;
    signature?: string | null;
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
    present_post_code?: string;
    present_upazila?: string;
    present_district?: string;
    permanent_village_road?: string;
    permanent_post_code?: string;
    permanent_upazila?: string;
    permanent_district?: string;
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
    account_no?: string;
    member_no?: string;
    applicant_photo?: string | null;
    current_address?: string | null;
    permanent_address?: string | null;
    profession?: string | null;
    source_of_income?: string | null;
    monthly_deposit_submission_date?: string | null;
    applicant_signature?: string | null;
    officer_signature?: string | null;
    officer_pin?: string | null;
    accountant_signature?: string | null;
    accountant_pin?: string | null;
    branch_manager_signature?: string | null;
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
    fromHeadOffice?: boolean;
    backUrl?: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
    draft: { label: 'Draft (খসড়া)', color: 'bg-gray-100 text-gray-800' },
    submitted: { label: 'Submitted (জমা হয়েছে)', color: 'bg-blue-100 text-blue-700' },
    under_review: { label: 'Under Review (পর্যালোচনায়)', color: 'bg-yellow-100 text-yellow-800' },
    approved: { label: 'Approved (অনুমোদিত)', color: 'bg-green-100 text-green-800' },
    rejected: { label: 'Rejected (প্রত্যাখ্যাত)', color: 'bg-red-100 text-red-800' },
    active: { label: 'Active (সক্রিয়)', color: 'bg-purple-100 text-purple-800' },
    matured: { label: 'Matured (পরিপক্ক)', color: 'bg-indigo-100 text-indigo-800' },
    closed: { label: 'Closed (বন্ধ)', color: 'bg-gray-100 text-gray-800' },
    cancelled: { label: 'Cancelled (বাতিল)', color: 'bg-red-100 text-red-800' },
};

/** Build print form data from application (same shape as Create form so print view is 100% accurate) */
function buildPrintData(application: Application): Record<string, unknown> {
    const app = application;
    const member = app.memberAdmission ?? app.member_admission;
    const branch = app.branch;
    const formData = app.form_data as Record<string, unknown> | undefined;

    const emptyNominee = { name: '', relation: '', signature: null, percentage: 0, photo: null, nid_birth_registration: '' };
    const nomineeList = Array.isArray(app.nominee_info) && app.nominee_info.length > 0
        ? app.nominee_info.map((n: NomineeInfo) => ({
            name: n.name ?? '',
            relation: n.relation ?? '',
            signature: n.signature ?? null,
            percentage: Number(n.percentage) || 0,
            photo: n.photo ?? null,
            nid_birth_registration: n.nid ?? n.birth_registration_no ?? '',
        }))
        : [emptyNominee, emptyNominee, emptyNominee];
    while (nomineeList.length < 3) nomineeList.push(emptyNominee);

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
        current_address_post_office: (formData?.current_address_post_office as string) ?? member?.present_post_code ?? '',
        current_address_upazila: (formData?.current_address_upazila as string) ?? member?.present_upazila ?? '',
        current_address_district: (formData?.current_address_district as string) ?? member?.present_district ?? '',
        permanent_address_village: (formData?.permanent_address_village as string) ?? member?.permanent_village_road ?? member?.present_village_road ?? '',
        permanent_address_post_office: (formData?.permanent_address_post_office as string) ?? member?.permanent_post_code ?? member?.present_post_code ?? '',
        permanent_address_upazila: (formData?.permanent_address_upazila as string) ?? member?.permanent_upazila ?? member?.present_upazila ?? '',
        permanent_address_district: (formData?.permanent_address_district as string) ?? member?.permanent_district ?? member?.present_district ?? '',
        profession: app.profession ?? (formData?.profession as string) ?? '',
        source_of_income: app.source_of_income ?? (formData?.source_of_income as string) ?? '',
        nominees: (formData?.nominees as typeof nomineeList) ?? nomineeList,
        nominee_nid_birth_registration: (formData?.nominee_nid_birth_registration as string) ?? '',
        monthly_deposit_submission_date: app.monthly_deposit_submission_date ?? (formData?.monthly_deposit_submission_date as string) ?? '',
        applicant_signature: app.applicant_signature ?? (formData?.applicant_signature as string) ?? null,
        officer_signature: app.officer_signature ?? (formData?.officer_signature as string) ?? null,
        officer_pin: app.officer_pin ?? (formData?.officer_pin as string) ?? '',
        accountant_signature: app.accountant_signature ?? (formData?.accountant_signature as string) ?? null,
        accountant_pin: app.accountant_pin ?? (formData?.accountant_pin as string) ?? '',
        branch_manager_signature: app.branch_manager_signature ?? (formData?.branch_manager_signature as string) ?? null,
        branch_manager_pin: app.branch_manager_pin ?? (formData?.branch_manager_pin as string) ?? '',
        branch_name: (formData?.branch_name as string) ?? branch?.name ?? '',
        branch_address: (formData?.branch_address as string) ?? branch?.address ?? '',
        area_name: (formData?.area_name as string) ?? branch?.area?.name ?? '',
    };
    return base;
}

export default function Show({ application, fromHeadOffice = false, backUrl = '/member/savings-applications' }: Props) {
    const statusInfo = statusConfig[application.status] || statusConfig.draft;
    const canEdit = !fromHeadOffice && (application.status === 'draft' || application.status === 'rejected');
    const canDelete = !fromHeadOffice && (application.status === 'draft' || application.status === 'submitted');
    const canSubmit = !fromHeadOffice && (application.status === 'draft' || application.status === 'rejected');
    const canApprove = !fromHeadOffice && application.status === 'submitted';

    const product = application.savingsProduct ?? application.savings_product;
    const member = application.memberAdmission ?? application.member_admission;

    const printData = useMemo(() => buildPrintData(application), [application]);

    const formatAmount = (n: number) =>
        new Intl.NumberFormat('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

    const handleSubmit = () => {
        if (confirm('Submit this application?')) {
            router.patch(`/member/savings-applications/${application.id}/submit`);
        }
    };

    const handleDelete = () => {
        if (confirm('Delete this application?')) {
            router.delete(`/member/savings-applications/${application.id}`, {
                preserveScroll: true,
            });
        }
    };

    const handlePrint = () => {
        window.print();
    };

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
                        .printable-area *,
                        .agrosor-a4-page,
                        .agrosor-a4-page * { 
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

            <div className="max-w-4xl mx-auto p-6">
                <div className="no-print mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href={backUrl}>
                            <Button variant="outline" size="icon" title={fromHeadOffice ? 'Back to list' : 'Back'}>
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Savings Application (সঞ্চয় আবেদন)</h1>
                            <p className="text-sm text-gray-600">Application No: {application.application_no}</p>
                        </div>
                    </div>
                    <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                </div>

                <Card className="no-print mb-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Details (বিবরণ)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-gray-500">Product (পণ্য)</span>
                                <p className="font-medium">
                                    {product?.product_name_bn || product?.product_name || '—'}
                                </p>
                                {product?.product_code && (
                                    <p className="text-xs text-gray-500">Code: {product.product_code}</p>
                                )}
                            </div>
                            <div>
                                <span className="text-gray-500">Member (সদস্য)</span>
                                <p className="font-medium">
                                    {member?.applicant_name_bn || member?.applicant_name_en || '—'}
                                </p>
                                {member?.application_no && (
                                    <p className="text-xs text-gray-500">Member No: {member.application_no}</p>
                                )}
                            </div>
                            <div>
                                <span className="text-gray-500">Deposit Amount (জমার পরিমাণ)</span>
                                <p className="font-medium">৳{formatAmount(application.deposit_amount)}</p>
                            </div>
                            <div>
                                <span className="text-gray-500">Monthly Installment (মাসিক কিস্তি)</span>
                                <p className="font-medium">
                                    {application.monthly_installment || application.monthly_savings_amount
                                        ? `৳${formatAmount(Number(application.monthly_installment || application.monthly_savings_amount))}`
                                        : '—'}
                                </p>
                            </div>
                            <div>
                                <span className="text-gray-500">Maturity Amount (পরিপক্কতা পরিমাণ)</span>
                                <p className="font-medium">
                                    {application.maturity_amount ? `৳${formatAmount(application.maturity_amount)}` : '—'}
                                </p>
                            </div>
                            <div>
                                <span className="text-gray-500">Maturity Date (পরিপক্কতা তারিখ)</span>
                                <p className="font-medium">
                                    {application.maturity_date
                                        ? formatDate(application.maturity_date)
                                        : '—'}
                                </p>
                            </div>
                            <div>
                                <span className="text-gray-500">Created At (তৈরির তারিখ)</span>
                                <p className="font-medium">{formatDate(application.created_at)}</p>
                            </div>
                            {application.submitted_at && (
                                <div>
                                    <span className="text-gray-500">Submitted At (জমার তারিখ)</span>
                                    <p className="font-medium">{formatDate(application.submitted_at)}</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Same form as Create — this block is the only content when printing */}
                <Card className="mb-6">
                    <CardHeader className="no-print">
                        <CardTitle>Application Form (আবেদনপত্র - এই অংশ প্রিন্টে দেখা যাবে)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 print:p-0">
                        <div className="savings-print-area p-6 print:p-0">
                            <SavingsApplicationPrintView data={printData as any} />
                        </div>
                    </CardContent>
                </Card>

                <div className="no-print flex flex-wrap gap-2">
                    {canEdit && product?.id && member?.id && (
                        <Link
                            href={`/member/savings-applications/create/${product.id}?member_id=${member.id}`}
                        >
                            <Button variant="outline">
                                <Edit className="h-4 w-4 mr-2" />
                                Edit (সম্পাদনা)
                            </Button>
                        </Link>
                    )}
                    {canSubmit && (
                        <Button onClick={handleSubmit}>
                            <Send className="h-4 w-4 mr-2" />
                            Submit (জমা দিন)
                        </Button>
                    )}
                    {canApprove && (
                        <>
                            <Button
                                onClick={() => {
                                    if (confirm('Approve this savings application?')) {
                                        router.patch(`/member/savings-applications/${application.id}/approve`);
                                    }
                                }}
                            >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve (অনুমোদন)
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => {
                                    const reason = window.prompt('Rejection reason (optional):');
                                    if (reason !== null) {
                                        router.patch(`/member/savings-applications/${application.id}/reject`, { rejection_reason: reason || '' });
                                    }
                                }}
                            >
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject (প্রত্যাখ্যান)
                            </Button>
                        </>
                    )}
                    <Button variant="outline" onClick={handlePrint} title="Print application form (আবেদনপত্র প্রিন্ট)">
                        <Printer className="h-4 w-4 mr-2" />
                        Print Form
                    </Button>
                    {canDelete && (
                        <Button variant="destructive" onClick={handleDelete}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete (মুছুন)
                        </Button>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
