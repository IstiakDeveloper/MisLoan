import AdminLayout from '@/layouts/admin-layout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    FileText,
    CheckCircle2,
    Clock,
    XCircle,
    AlertCircle,
    Printer,
    Edit,
    ArrowLeft,
    Send
} from 'lucide-react';
import GuarantorCommitment from './Forms/GuarantorCommitment';
import DeathRiskFund from './Forms/DeathRiskFund';
import LoanAgreement from './Forms/LoanAgreement';
import FieldInvestigation from './Forms/FieldInvestigation';
import LoanApplicationApproval from './Forms/LoanApplicationApproval';

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
    loan_agreement_data?: any;
    asset_info?: any;
    business_plan?: any;
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
    const pageAuth = usePage().props.auth as { user?: { role?: { name: string } } } | undefined;
    const isFieldOfficer = pageAuth?.user?.role?.name === 'field_officer';
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [selectedApprovers, setSelectedApprovers] = useState<number[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [selectedFormId, setSelectedFormId] = useState<number | null>(null);
    const formPrintRef = useRef<HTMLDivElement>(null);

    // Helper function to recursively check if data has meaningful content
    const hasMeaningfulData = (data: any): boolean => {
        if (data === null || data === undefined || data === '') return false;
        
        if (typeof data === 'string') {
            const trimmed = data.trim();
            return trimmed !== '' && trimmed !== 'null' && trimmed !== '{}' && trimmed !== '[]' && trimmed.length >= 3;
        }
        
        if (Array.isArray(data)) {
            if (data.length === 0) return false;
            return data.some(item => hasMeaningfulData(item));
        }
        
        if (typeof data === 'object') {
            const keys = Object.keys(data);
            if (keys.length === 0) return false;
            // Check if at least one value has meaningful content
            return keys.some(key => {
                const value = data[key];
                if (value === null || value === undefined || value === '') return false;
                if (typeof value === 'string' && value.trim() === '') return false;
                if (Array.isArray(value) && value.length === 0) return false;
                if (typeof value === 'object' && Object.keys(value).length === 0) return false;
                // Recursively check nested structures
                return hasMeaningfulData(value);
            });
        }
        
        // For other types (numbers, booleans), consider them meaningful
        return true;
    };

    // শুধু সেই ফর্মগুলো দেখাও যেগুলো এই loan application এর জন্য required (visible_form_ids)
    // এবং সেভ করা হয়েছে (form_saved flag + meaningful data)
    // Create page-এ যেভাবে visible forms নির্ধারণ করা হয়, Show page-এও একইভাবে
    const visibleFormIds = application.visible_form_ids || [1, 2, 3, 4, 5]; // Fallback to all if not provided
    
    const savedFormIds = visibleFormIds.filter((id) => {
        // First check: form must be in visible_form_ids (required for this loan)
        if (!visibleFormIds.includes(id)) return false;
        
        // Second check: backend flag must be true
        if (application.form_saved?.[id] !== true) return false;
        
        // Third check: verify actual data exists with meaningful content
        switch (id) {
            case 1:
                return hasMeaningfulData(application.loan_agreement_data);
            case 2:
                return hasMeaningfulData(application.guarantor_info);
            case 3:
                return hasMeaningfulData(application.nominee_info);
            case 4:
                return hasMeaningfulData(application.asset_info);
            case 5:
                return hasMeaningfulData(application.business_plan);
            default:
                return false;
        }
    });

    const printFormContent = () => {
        if (!formPrintRef.current || !selectedFormId) return;
        // একই পেজ থেকে প্রিন্ট = দেখতে যেমন, প্রিন্টও তেমন (WYSIWYG)। প্রিন্ট CSS শুধু ফর্মটুকু দেখায়।
        window.print();
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
            <Head title={`ঋণ আবেদন - ${application.application_no}`}>
                <style>{`
                    @media print {
                        @page { size: A4; margin: 15mm; }
                        body * { visibility: hidden !important; }
                        .form-print-area, .form-print-area * { visibility: visible !important; }
                        .form-print-area {
                            position: absolute !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: 100% !important;
                            max-width: 100% !important;
                            padding: 12mm !important;
                            margin: 0 !important;
                            background: white !important;
                            box-shadow: none !important;
                            font-size: 11pt !important;
                            line-height: 1.35 !important;
                        }
                    }
                `}</style>
            </Head>

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
                                    {application.all_forms_complete && !isFieldOfficer && (
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

                    {/* শুধু সেভকৃত ফর্ম - সাবমিটের আগে/অ্যাপ্রুভার/সুপার অ্যাডমিন সবার জন্য একই ভিউ */}
                    {savedFormIds.length > 0 && (
                        <Card className="mb-6 border-l-4 border-l-green-600">
                            <CardHeader>
                                <CardTitle className="text-base">সেভকৃত ফর্ম</CardTitle>
                                <CardDescription>যে ফর্মে ডেটা সেভ আছে সেটা বাটনে ক্লিক করে দেখুন ও প্রিন্ট করুন</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex flex-wrap gap-2">
                                    {savedFormIds.map((id) => (
                                        <Button
                                            key={id}
                                            variant={selectedFormId === id ? 'default' : 'outline'}
                                            onClick={() => setSelectedFormId(selectedFormId === id ? null : id)}
                                        >
                                            <FileText className="w-4 h-4 mr-2" />
                                            {FORM_NAMES[id] || `ফর্ম ${id}`}
                                        </Button>
                                    ))}
                                </div>
                                {selectedFormId !== null && (
                                    <div className="rounded-lg border bg-gray-50/50 p-4">
                                        <div className="mb-3 flex items-center justify-between print:hidden">
                                            <span className="font-semibold text-gray-700">{FORM_NAMES[selectedFormId]}</span>
                                            <Button variant="outline" size="sm" onClick={printFormContent}>
                                                <Printer className="w-4 h-4 mr-2" />
                                                প্রিন্ট
                                            </Button>
                                        </div>
                                        <div ref={formPrintRef} className="form-print-area space-y-3 text-sm">
                                            {selectedFormId === 1 && application.loan_agreement_data && (
                                                <LoanAgreement
                                                    onlyPreview
                                                    savedData={application.loan_agreement_data}
                                                    member={application.member_admission}
                                                    loanProduct={application.loan_product}
                                                    loanCategory={application.loan_category}
                                                    requestedAmount={application.requested_amount}
                                                    branch={application.branch}
                                                />
                                            )}
                                            {selectedFormId === 2 && application.guarantor_info && (
                                                <GuarantorCommitment
                                                    onlyPreview
                                                    savedData={application.guarantor_info}
                                                    member={application.member_admission}
                                                    loanProduct={application.loan_product}
                                                    loanCategory={application.loan_category}
                                                    requestedAmount={application.requested_amount}
                                                    branch={application.branch}
                                                />
                                            )}
                                            {selectedFormId === 3 && application.nominee_info && (
                                                <DeathRiskFund
                                                    onlyPreview
                                                    savedData={application.nominee_info}
                                                    member={application.member_admission}
                                                    loanProduct={application.loan_product}
                                                    loanCategory={application.loan_category}
                                                    requestedAmount={application.requested_amount}
                                                    branch={application.branch}
                                                />
                                            )}
                                            {selectedFormId === 4 && application.asset_info && (
                                                <FieldInvestigation
                                                    onlyPreview
                                                    savedData={application.asset_info}
                                                    member={application.member_admission}
                                                    loanProduct={application.loan_product}
                                                    loanCategory={application.loan_category}
                                                    requestedAmount={application.requested_amount}
                                                    branch={application.branch}
                                                />
                                            )}
                                            {selectedFormId === 5 && application.business_plan && (
                                                <LoanApplicationApproval
                                                    onlyPreview
                                                    savedData={application.business_plan}
                                                    member={application.member_admission}
                                                    loanProduct={application.loan_product}
                                                    loanCategory={application.loan_category}
                                                    requestedAmount={application.requested_amount}
                                                    branch={application.branch}
                                                />
                                            )}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {savedFormIds.length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-6">
                            এই আবেদনের জন্য এখনও কোন ফর্ম সেভ নেই। সম্পাদনা থেকে ফর্ম পূরণ ও সেভ করুন।
                        </p>
                    )}
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
