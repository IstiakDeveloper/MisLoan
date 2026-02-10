import AdminLayout from '@/layouts/admin-layout';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    User,
    Banknote,
    Calendar,
    FileText,
    Users,
    Shield,
    Heart,
    TrendingUp,
    CheckCircle2,
    Clock,
    XCircle,
    AlertCircle,
    Printer,
    Edit,
    ArrowLeft,
    Send
} from 'lucide-react';

interface LoanApplication {
    id: number;
    application_no: string;
    form_type: number;
    status: string;
    requested_amount: number;
    approved_amount: number | null;
    installment_amount: number | null;
    number_of_installments: number;
    repayment_frequency: string;
    loan_term_months: number;
    proposed_start_date: string;
    approved_start_date: string | null;
    purpose_of_loan: string;
    repayment_source: string | null;
    monthly_income: number | null;
    monthly_expense: number | null;
    family_members: Array<any> | null;
    guarantor_info: any | null;
    guarantors_list: Array<any> | null;
    nominee_info: any | null;
    income_sources: Array<any> | null;
    has_savings_account: boolean;
    savings_amount: number | null;
    savings_account_type: string | null;
    other_loan_amount: number;
    created_at: string;
    submitted_at: string | null;
    reviewed_at: string | null;
    member_admission: {
        id: number;
        application_no: string;
        applicant_name_en?: string;
        applicant_name_bn?: string;
        member_name_en?: string;
        member_name_bn?: string;
        father_name_en?: string;
        mother_name_en?: string;
        nid_number?: string;
        nid_no?: string;
        mobile_number?: string;
        mobile_no?: string;
        present_village_road?: string;
        present_address_en?: string;
    };
    visible_form_ids?: number[];
    form_saved?: Record<number, boolean>;
    all_forms_complete?: boolean;
    availableApprovers?: Array<{ id: number; name: string; email: string; level?: string; role?: { name: string } }>;
    loan_product: {
        product_name: string;
        product_name_bn: string;
        product_code: string;
        interest_rate: number;
        installment_type: string;
    };
    loan_category: {
        category_name: string;
        category_name_bn: string;
        category_code: string;
    };
    branch: {
        name: string;
        code?: string;
        branch_name?: string;
        branch_name_bn?: string;
    };
    samity: {
        samity_name: string;
        samity_name_bn: string;
    } | null;
}

const FORM_NAMES: Record<number, string> = {
    1: 'ঋণ চুক্তি পত্র',
    2: 'জামিনদার/দায়িত্ব গ্রহণকারীর অঙ্গীকার নামা',
    3: 'মৃত্যুঝুঁকি তহবিল আবেদন',
    4: 'সরেজমিন তদন্ত প্রতিবেদন',
    5: 'আবেদন ও অনুমোদনপত্র',
};

interface Props {
    application: LoanApplication;
    availableApprovers?: Array<{ id: number; name: string; email: string; level?: string; role?: { name: string } }>;
    routes: {
        index: string;
        edit: string;
        print: string;
        submit: string;
    };
}

const statusConfig = {
    draft: { label: 'খসড়া', color: 'bg-gray-100 text-gray-800', icon: AlertCircle },
    submitted: { label: 'জমা হয়েছে', color: 'bg-blue-100 text-blue-800', icon: Clock },
    under_review: { label: 'পর্যালোচনা', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    pending_head_office: { label: 'হেড অফিসে প্রেরিত', color: 'bg-indigo-100 text-indigo-800', icon: Clock },
    approved: { label: 'অনুমোদিত', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
    rejected: { label: 'প্রত্যাখ্যাত', color: 'bg-red-100 text-red-800', icon: XCircle },
    disbursed: { label: 'বিতরণ হয়েছে', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2 },
    cancelled: { label: 'বাতিল', color: 'bg-gray-100 text-gray-800', icon: XCircle },
};

export default function Show({ application, availableApprovers = [], routes }: Props) {
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [selectedApprovers, setSelectedApprovers] = useState<number[]>([]);
    const [submitting, setSubmitting] = useState(false);

    const ma = application.member_admission;
    const memberNameEn = ma?.applicant_name_en ?? ma?.member_name_en ?? '';
    const memberNameBn = ma?.applicant_name_bn ?? ma?.member_name_bn ?? '';
    const nid = ma?.nid_number ?? ma?.nid_no ?? '';
    const mobile = ma?.mobile_number ?? ma?.mobile_no ?? '';
    const address = ma?.present_village_road ?? ma?.present_address_en ?? '';
    const formatAmount = (amount: number | null) => {
        if (!amount) return 'N/A';
        return new Intl.NumberFormat('bn-BD', {
            style: 'currency',
            currency: 'BDT',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (date: string | null) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('bn-BD', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const StatusIcon = statusConfig[application.status as keyof typeof statusConfig]?.icon || AlertCircle;
    const statusInfo = statusConfig[application.status as keyof typeof statusConfig];

    return (
        <AdminLayout>
            <Head title={`ঋণ আবেদন - ${application.application_no}`} />

            <div className="py-6">
                <div className="mx-auto max-w-6xl sm:px-6 lg:px-8">
                    {/* Header - hide actions when printing */}
                    <div className="mb-6 flex items-center justify-between print:flex print:justify-center">
                        <div className="flex items-center gap-4 print:gap-0">
                            <Link href={routes.index} className="print:hidden">
                                <Button variant="outline" size="icon">
                                    <ArrowLeft className="w-4 h-4" />
                                </Button>
                            </Link>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">ঋণ আবেদন বিবরণ</h2>
                                <p className="text-gray-600">আবেদন নং: {application.application_no}</p>
                            </div>
                        </div>
                        <div className="flex gap-2 print:hidden">
                            {application.status === 'draft' && (
                                <>
                                    <Link href={routes.edit}>
                                        <Button variant="outline">
                                            <Edit className="w-4 h-4 mr-2" />
                                            সম্পাদনা
                                        </Button>
                                    </Link>
                                    {application.all_forms_complete && (
                                        <Button onClick={() => setShowSubmitModal(true)}>
                                            <Send className="w-4 h-4 mr-2" />
                                            সাবমিট করুন
                                        </Button>
                                    )}
                                </>
                            )}
                            <Button variant="outline" onClick={() => window.print()}>
                                <Printer className="w-4 h-4 mr-2" />
                                প্রিন্ট
                            </Button>
                        </div>
                    </div>

                    {/* Status Card */}
                    <Card className="mb-6 border-l-4 border-l-primary">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-primary/10 rounded-full">
                                        <StatusIcon className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <Badge className={statusInfo.color + ' mb-2'}>
                                            <StatusIcon className="w-3 h-3 mr-1" />
                                            {statusInfo.label}
                                        </Badge>
                                        <p className="text-sm text-gray-600">
                                            আবেদনের তারিখ: {formatDate(application.created_at)}
                                        </p>
                                        {application.submitted_at && (
                                            <p className="text-sm text-gray-600">
                                                জমা দেওয়ার তারিখ: {formatDate(application.submitted_at)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-gray-600">ফর্ম টাইপ</p>
                                    <Badge variant="outline" className="text-lg">
                                        {application.form_type === 1 ? 'সাপ্তাহিক/সুফলন' : 'বড় ঋণ'}
                                    </Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Form completion status (for draft) */}
                    {application.status === 'draft' && application.visible_form_ids && (
                        <Card className="mb-6 border-l-4 border-l-blue-500">
                            <CardHeader>
                                <CardTitle className="text-base">ফর্মের অবস্থা</CardTitle>
                                <CardDescription>
                                    {application.all_forms_complete
                                        ? 'সব প্রয়োজনীয় ফর্ম সেভ আছে। সাবমিট করতে পারবেন।'
                                        : 'নিচের ফর্মগুলো পূরণ ও সেভ করুন তারপর সাবমিট করতে পারবেন।'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {application.visible_form_ids.map((formId) => {
                                        const saved = application.form_saved?.[formId];
                                        return (
                                            <Badge
                                                key={formId}
                                                variant={saved ? 'default' : 'secondary'}
                                                className={saved ? 'bg-green-600' : 'bg-amber-100 text-amber-800'}
                                            >
                                                {saved && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                                {FORM_NAMES[formId] || `ফর্ম ${formId}`}: {saved ? 'সেভ আছে' : 'বাকি'}
                                            </Badge>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main Content */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Member Information */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <User className="w-5 h-5" />
                                        সদস্যের তথ্য
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-600">নাম (বাংলা)</p>
                                            <p className="font-semibold">{memberNameBn}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Name (English)</p>
                                            <p className="font-semibold">{memberNameEn}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">পিতার নাম</p>
                                            <p className="font-semibold">{ma?.father_name_en ?? ''}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">মাতার নাম</p>
                                            <p className="font-semibold">{ma?.mother_name_en ?? ''}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">NID নং</p>
                                            <p className="font-semibold font-mono">{nid}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">মোবাইল নং</p>
                                            <p className="font-semibold font-mono">{mobile}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-sm text-gray-600">ঠিকানা</p>
                                            <p className="font-semibold">{address}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Loan Details */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Banknote className="w-5 h-5" />
                                        ঋণ বিবরণ
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-600">ঋণ ক্যাটেগরি</p>
                                            <p className="font-semibold">{application.loan_category.category_name_bn}</p>
                                            <p className="text-xs text-gray-500">{application.loan_category.category_code}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">ঋণ পণ্য</p>
                                            <p className="font-semibold">{application.loan_product.product_name_bn}</p>
                                            <p className="text-xs text-gray-500">{application.loan_product.product_code}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">আবেদিত পরিমাণ</p>
                                            <p className="font-semibold text-lg text-primary">
                                                {formatAmount(application.requested_amount)}
                                            </p>
                                        </div>
                                        {application.approved_amount && (
                                            <div>
                                                <p className="text-sm text-gray-600">অনুমোদিত পরিমাণ</p>
                                                <p className="font-semibold text-lg text-green-600">
                                                    {formatAmount(application.approved_amount)}
                                                </p>
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm text-gray-600">কিস্তির ধরন</p>
                                            <p className="font-semibold">
                                                {application.repayment_frequency === 'weekly' ? 'সাপ্তাহিক' : 'মাসিক'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">কিস্তি সংখ্যা</p>
                                            <p className="font-semibold">{application.number_of_installments} টি</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">ঋণের মেয়াদ</p>
                                            <p className="font-semibold">{application.loan_term_months} মাস</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">সুদের হার</p>
                                            <p className="font-semibold">{application.loan_product.interest_rate}%</p>
                                        </div>
                                        {application.installment_amount && (
                                            <div>
                                                <p className="text-sm text-gray-600">কিস্তির পরিমাণ</p>
                                                <p className="font-semibold">{formatAmount(application.installment_amount)}</p>
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm text-gray-600">প্রস্তাবিত শুরুর তারিখ</p>
                                            <p className="font-semibold">{formatDate(application.proposed_start_date)}</p>
                                        </div>
                                    </div>

                                    <Separator />

                                    <div>
                                        <p className="text-sm text-gray-600 mb-2">ঋণের উদ্দেশ্য</p>
                                        <p className="text-sm bg-gray-50 p-3 rounded">{application.purpose_of_loan}</p>
                                    </div>

                                    {application.repayment_source && (
                                        <div>
                                            <p className="text-sm text-gray-600 mb-2">পরিশোধের উৎস</p>
                                            <p className="text-sm bg-gray-50 p-3 rounded">{application.repayment_source}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Financial Information */}
                            {(application.monthly_income || application.monthly_expense) && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <TrendingUp className="w-5 h-5" />
                                            আর্থিক তথ্য
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-3 gap-4">
                                            {application.monthly_income && (
                                                <div>
                                                    <p className="text-sm text-gray-600">মাসিক আয়</p>
                                                    <p className="font-semibold text-green-600">
                                                        {formatAmount(application.monthly_income)}
                                                    </p>
                                                </div>
                                            )}
                                            {application.monthly_expense && (
                                                <div>
                                                    <p className="text-sm text-gray-600">মাসিক ব্যয়</p>
                                                    <p className="font-semibold text-red-600">
                                                        {formatAmount(application.monthly_expense)}
                                                    </p>
                                                </div>
                                            )}
                                            {application.monthly_income && application.monthly_expense && (
                                                <div>
                                                    <p className="text-sm text-gray-600">উদ্বৃত্ত</p>
                                                    <p className="font-semibold text-blue-600">
                                                        {formatAmount(application.monthly_income - application.monthly_expense)}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {application.income_sources && application.income_sources.length > 0 && (
                                            <div className="mt-4">
                                                <p className="text-sm text-gray-600 mb-2">আয়ের উৎস</p>
                                                <div className="space-y-2">
                                                    {application.income_sources.map((source: any, index: number) => (
                                                        <div key={index} className="flex justify-between text-sm bg-gray-50 p-2 rounded">
                                                            <span>{source.source}</span>
                                                            <span className="font-semibold">{formatAmount(source.amount)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Family Members */}
                            {application.family_members && application.family_members.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Users className="w-5 h-5" />
                                            পরিবারের সদস্য
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="p-2 text-left">নাম</th>
                                                        <th className="p-2 text-left">সম্পর্ক</th>
                                                        <th className="p-2 text-left">বয়স</th>
                                                        <th className="p-2 text-left">পেশা</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y">
                                                    {application.family_members.map((member: any, index: number) => (
                                                        <tr key={index}>
                                                            <td className="p-2">{member.name}</td>
                                                            <td className="p-2">{member.relation}</td>
                                                            <td className="p-2">{member.age}</td>
                                                            <td className="p-2">{member.occupation}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Guarantor Information */}
                            {application.guarantor_info && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Shield className="w-5 h-5" />
                                            জামিনদারের তথ্য
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-sm text-gray-600">নাম</p>
                                                <p className="font-semibold">{application.guarantor_info.name}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-600">পিতার নাম</p>
                                                <p className="font-semibold">{application.guarantor_info.father_name}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-600">NID নং</p>
                                                <p className="font-semibold font-mono">{application.guarantor_info.nid}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-600">মোবাইল নং</p>
                                                <p className="font-semibold font-mono">{application.guarantor_info.mobile}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-600">সম্পর্ক</p>
                                                <p className="font-semibold">{application.guarantor_info.relation}</p>
                                            </div>
                                            <div className="col-span-2">
                                                <p className="text-sm text-gray-600">ঠিকানা</p>
                                                <p className="font-semibold">{application.guarantor_info.address}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Nominee Information */}
                            {application.nominee_info && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Heart className="w-5 h-5" />
                                            মনোনীত ব্যক্তির তথ্য
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-sm text-gray-600">নাম</p>
                                                <p className="font-semibold">{application.nominee_info.name}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-600">পিতার নাম</p>
                                                <p className="font-semibold">{application.nominee_info.father_name}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-600">মোবাইল নং</p>
                                                <p className="font-semibold font-mono">{application.nominee_info.mobile}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-600">সম্পর্ক</p>
                                                <p className="font-semibold">{application.nominee_info.relation}</p>
                                            </div>
                                            <div className="col-span-2">
                                                <p className="text-sm text-gray-600">ঠিকানা</p>
                                                <p className="font-semibold">{application.nominee_info.address}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Branch & Samity */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">শাখা ও সমিতি</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div>
                                        <p className="text-sm text-gray-600">শাখা</p>
                                        <p className="font-semibold">{application.branch.branch_name_bn ?? application.branch.name}</p>
                                    </div>
                                    {application.samity && (
                                        <div>
                                            <p className="text-sm text-gray-600">সমিতি</p>
                                            <p className="font-semibold">{application.samity.samity_name_bn}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Savings Information */}
                            {application.has_savings_account && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">সঞ্চয় হিসাব</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        <div className="flex items-center gap-2 text-green-600">
                                            <CheckCircle2 className="w-4 h-4" />
                                            <span className="font-semibold">হ্যাঁ, সঞ্চয় হিসাব আছে</span>
                                        </div>
                                        {application.savings_amount && (
                                            <div>
                                                <p className="text-sm text-gray-600">সঞ্চয়ের পরিমাণ</p>
                                                <p className="font-semibold">{formatAmount(application.savings_amount)}</p>
                                            </div>
                                        )}
                                        {application.savings_account_type && (
                                            <div>
                                                <p className="text-sm text-gray-600">হিসাবের ধরন</p>
                                                <p className="font-semibold">{application.savings_account_type}</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Other Loans */}
                            {application.other_loan_amount > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">অন্যান্য ঋণ</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div>
                                            <p className="text-sm text-gray-600">বর্তমান ঋণের পরিমাণ</p>
                                            <p className="font-semibold text-orange-600">
                                                {formatAmount(application.other_loan_amount)}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Submit modal: approver selection */}
            {showSubmitModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                        <div className="px-6 py-4 border-b">
                            <h3 className="text-lg font-bold">সাবমিট করুন</h3>
                            <p className="text-sm text-gray-600">এই এরিয়া/জোনের যেকোনো অ্যাপ্রুভার সিলেক্ট করুন। সাবমিটের পর আর সম্পাদনা করা যাবে না।</p>
                        </div>
                        <div className="p-6 space-y-4 max-h-80 overflow-y-auto">
                            {availableApprovers.length === 0 ? (
                                <p className="text-sm text-amber-600">কোন অ্যাপ্রুভার পাওয়া যাচ্ছে না। দয়া করে অ্যাডমিনের সাথে যোগাযোগ করুন।</p>
                            ) : (
                                availableApprovers.map((user) => (
                                    <label key={user.id} className="flex items-center gap-3 p-2 rounded border hover:bg-gray-50 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedApprovers.includes(user.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedApprovers((prev) => [...prev, user.id]);
                                                } else {
                                                    setSelectedApprovers((prev) => prev.filter((id) => id !== user.id));
                                                }
                                            }}
                                            className="w-4 h-4 rounded border-gray-300"
                                        />
                                        <div>
                                            <p className="font-medium">{user.name}</p>
                                            <p className="text-xs text-gray-500">{user.role?.name ?? user.level ?? ''} {user.email}</p>
                                        </div>
                                    </label>
                                ))
                            )}
                        </div>
                        <div className="px-6 py-4 border-t flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setShowSubmitModal(false)}>বাতিল</Button>
                            <Button
                                disabled={selectedApprovers.length === 0 || submitting}
                                onClick={() => {
                                    setSubmitting(true);
                                    router.patch(routes.submit, {
                                        selected_approvers: selectedApprovers,
                                    }, {
                                        preserveScroll: true,
                                        onFinish: () => setSubmitting(false),
                                        onSuccess: () => setShowSubmitModal(false),
                                    });
                                }}
                            >
                                {submitting ? 'সাবমিট হচ্ছে...' : 'সাবমিট করুন'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
