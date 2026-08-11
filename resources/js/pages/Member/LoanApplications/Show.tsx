import AdminLayout from '@/layouts/admin-layout';
import { formatDate, formatDateTime } from '@/utils/dateUtils';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useState, useRef } from 'react';
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
    Send,
    MessageSquare,
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
    editable_form_ids?: number[];
    form_saved?: Record<number, boolean>;
    all_forms_complete?: boolean;
    disburse_forms_complete?: boolean;
    can_submit?: boolean;
    can_disburse?: boolean;
    member_admission_status?: string;
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
    issues?: LoanApplicationIssue[];
}

interface LoanApplicationIssue {
    id: number;
    issue_description: string;
    status: string;
    response_message?: string | null;
    created_at: string;
    responded_at?: string | null;
    reporter?: { id: number; name: string };
    responder?: { id: number; name: string };
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
    routes: {
        index: string;
        edit: string;
        print: string;
        submit: string;
        disburse?: string;
    };
}

const FORM_ROUTES: Record<number, string> = {
    1: 'loan-agreement',
    2: 'guarantor-commitment',
    3: 'death-risk-fund',
    4: 'field-investigation',
    5: 'loan-application-approval',
};

const statusConfig = {
    draft: { label: 'খসড়া', color: 'bg-gray-100 text-gray-800', icon: AlertCircle },
    submitted: { label: 'জমা হয়েছে', color: 'bg-blue-100 text-blue-800', icon: Clock },
    under_review: { label: 'পর্যালোচনা', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    ready_for_head_office: { label: 'শাখা অনুমোদিত', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2 },
    pending_head_office: { label: 'হেড অফিসে প্রেরিত', color: 'bg-indigo-100 text-indigo-800', icon: Clock },
    approved: { label: 'অনুমোদিত', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
    pending_disbursement: { label: 'বিতরণের অপেক্ষায়', color: 'bg-amber-100 text-amber-800', icon: Clock },
    rejected: { label: 'প্রত্যাখ্যাত', color: 'bg-red-100 text-red-800', icon: XCircle },
    disbursed: { label: 'বিতরণ হয়েছে', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2 },
    cancelled: { label: 'বাতিল', color: 'bg-gray-100 text-gray-800', icon: XCircle },
};

export default function Show({ application, routes }: Props) {
    const pageAuth = usePage().props.auth as { user?: { role?: { name: string } } } | undefined;
    const isFieldOfficer = pageAuth?.user?.role?.name === 'field_officer';
    const isBranchUser = pageAuth?.user?.role?.name === 'branch_user';
    const isBranchManager = pageAuth?.user?.role?.name === 'branch_manager';
    const canRespondToIssues = isBranchUser || isBranchManager;
    const [selectedIssueId, setSelectedIssueId] = useState<number | null>(null);
    const [issueAction, setIssueAction] = useState<'resolve' | 'reject' | null>(null);
    const resolveForm = useForm({ response_message: '' });
    const rejectForm = useForm({ response_message: '' });
    const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const initialStep = Number(searchParams.get('step') || '');
    const [selectedFormId, setSelectedFormId] = useState<number | null>(Number.isFinite(initialStep) && initialStep > 0 ? initialStep : null);
    const formPrintRef = useRef<HTMLDivElement>(null);
    const disburseMode = searchParams.get('action') === 'disburse' && application.status === 'pending_disbursement' && isBranchUser;

    const buildFormUrl = (formId: number) => {
        const route = FORM_ROUTES[formId];
        if (!route) return '#';
        const params = new URLSearchParams({
            amount: String(application.requested_amount),
        });
        const memberId = application.member_admission?.id;
        if (memberId) params.set('member_id', String(memberId));
        const productId = (application as LoanApplication & { loan_product_id?: number }).loan_product_id;
        const categoryId = (application as LoanApplication & { loan_category_id?: number }).loan_category_id;
        if (productId) params.set('product_id', String(productId));
        if (categoryId) params.set('category_id', String(categoryId));
        if (disburseMode) {
            params.set('return', 'disburse');
            params.set('application_id', String(application.id));
        }
        return `/member/loan-applications/forms/${route}?${params.toString()}`;
    };

    const buildDisburseStepUrl = (formId: number) => `/member/loan-applications/${application.id}?action=disburse&step=${formId}`;

    const editableFormIds = (application.editable_form_ids ?? []).filter(
        (id) => !(application.form_saved?.[id])
    );

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

    const StatusIcon = statusConfig[application.status as keyof typeof statusConfig]?.icon || AlertCircle;
    const statusInfo = statusConfig[application.status as keyof typeof statusConfig];
    const issues = application.issues ?? [];
    const pendingIssues = issues.filter((issue) => issue.status === 'pending');
    const disburseStepFormIds = disburseMode ? visibleFormIds : [];
    const currentStepIndex = selectedFormId ? disburseStepFormIds.indexOf(selectedFormId) : -1;
    const currentStepNumber = currentStepIndex >= 0 ? currentStepIndex + 1 : 0;
    const isCurrentFormSaved = selectedFormId ? (application.form_saved?.[selectedFormId] === true) : false;
    const isCurrentFormEditable = selectedFormId ? editableFormIds.includes(selectedFormId) : false;
    const disburseAmount = application.status === 'pending_disbursement' && application.approved_amount != null
        ? application.approved_amount
        : application.requested_amount;

    useEffect(() => {
        if (disburseMode && disburseStepFormIds.length > 0 && !selectedFormId) {
            const firstPendingEditable = disburseStepFormIds.find((id) => editableFormIds.includes(id) && !(application.form_saved?.[id]));
            setSelectedFormId(firstPendingEditable ?? disburseStepFormIds[0]);
        }
    }, [application.form_saved, disburseMode, disburseStepFormIds, editableFormIds, selectedFormId]);

    const openIssueAction = (issueId: number, action: 'resolve' | 'reject') => {
        setSelectedIssueId(issueId);
        setIssueAction(action);
        resolveForm.reset();
        rejectForm.reset();
    };

    const closeIssueAction = () => {
        setSelectedIssueId(null);
        setIssueAction(null);
        resolveForm.reset();
        rejectForm.reset();
    };

    const submitIssueAction = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedIssueId || !issueAction) return;

        const form = issueAction === 'resolve' ? resolveForm : rejectForm;
        const path = issueAction === 'resolve' ? 'resolve' : 'reject';

        form.post(`/member/loan-applications/${application.id}/issues/${selectedIssueId}/${path}`, {
            preserveScroll: true,
            onSuccess: () => closeIssueAction(),
        });
    };

    return (
        <AdminLayout>
            <Head title={`ঋণ আবেদন - ${application.application_no}`}>
                <style>{`
                    @media print {
                        @page { size: A4 portrait; margin: 6mm; }
                        body * { visibility: hidden !important; }
                        .form-print-area, .form-print-area * { visibility: visible !important; }
                        .form-print-area {
                            position: absolute !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: 100% !important;
                            max-width: 100% !important;
                            padding: 0 !important;
                            margin: 0 !important;
                            background: white !important;
                            box-shadow: none !important;
                            font-size: 11pt !important;
                            line-height: 1.35 !important;
                        }
                        /* Agrosor / A4 form pages: fill printable area, no double margin */
                        .form-print-area .agrosor-a4-page {
                            width: 100% !important;
                            max-width: 100% !important;
                            min-height: auto !important;
                            margin: 0 !important;
                            padding: 4mm 5mm !important;
                            border: none !important;
                            box-shadow: none !important;
                        }
                        .form-print-area .agrosor-a4-page + .agrosor-a4-page {
                            page-break-before: always;
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
                                <h2 className="text-2xl font-bold text-gray-900">{disburseMode ? 'ঋণ বিতরণ' : 'ঋণ আবেদন বিবরণ'}</h2>
                                <p className="text-gray-600">আবেদন নং: {application.application_no}</p>
                            </div>
                        </div>
                        {!disburseMode && <div className="flex gap-2 print:hidden">
                            {application.status === 'draft' && (
                                <>
                                    <Link href={routes.edit}>
                                        <Button variant="outline">
                                            <Edit className="w-4 h-4 mr-2" />
                                            সম্পাদনা
                                        </Button>
                                    </Link>
                                    {application.all_forms_complete && (
                                        application.can_submit ? (
                                            <Button
                                                onClick={() => {
                                                    if (confirm('ঋণ আবেদনটি শাখা ব্যবস্থাপকের কাছে জমা দিতে চান?')) {
                                                        router.patch(routes.submit);
                                                    }
                                                }}
                                            >
                                                <Send className="w-4 h-4 mr-2" />
                                                সাবমিট করুন
                                            </Button>
                                        ) : (
                                            <Button disabled variant="outline" title="সদস্য ভর্তি অনুমোদিত হলে জমা দেওয়া যাবে">
                                                <Send className="w-4 h-4 mr-2" />
                                                সাবমিট (ভর্তি অনুমোদন অপেক্ষমান)
                                            </Button>
                                        )
                                    )}
                                </>
                            )}
                            {application.status === 'ready_for_head_office' && isBranchUser && (
                                <Button
                                    onClick={() => {
                                        if (confirm('শাখা অনুমোদিত ঋণ আবেদনটি Head Office এ পাঠাতে চান?')) {
                                            router.patch(`/member/loan-applications/${application.id}/send-to-head-office`);
                                        }
                                    }}
                                >
                                    <Send className="w-4 h-4 mr-2" />
                                    Head Office এ পাঠান
                                </Button>
                            )}
                            {application.status === 'pending_disbursement' && isBranchUser && routes.disburse && (
                                application.can_disburse ? (
                                    <Button
                                        onClick={() => {
                                            if (confirm('ঋণ বিতরণ করতে চান?')) {
                                                router.patch(routes.disburse!);
                                            }
                                        }}
                                    >
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        বিতরণ করুন
                                    </Button>
                                ) : (
                                    <Button disabled variant="outline" title="বিতরণের আগে ফর্ম ২ ও ৩ পূরণ করুন">
                                        <Clock className="w-4 h-4 mr-2" />
                                        বিতরণ (ফর্ম ২+৩ বাকি)
                                    </Button>
                                )
                            )}
                            <Button variant="outline" onClick={() => window.print()}>
                                <Printer className="w-4 h-4 mr-2" />
                                প্রিন্ট
                            </Button>
                        </div>}
                    </div>

                    {/* Status Card */}
                    {!disburseMode && <Card className="mb-6 border-l-4 border-l-primary">
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
                                        {application.member_admission_status && application.member_admission_status !== 'approved' && application.status === 'draft' && (
                                            <p className="text-sm text-amber-700 mt-1">
                                                সদস্য ভর্তি এখনো অনুমোদিত হয়নি — ফর্ম পূরণ করতে পারবেন, তবে জমা দেওয়া যাবে না।
                                            </p>
                                        )}
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
                    </Card>}

                    {!disburseMode && pendingIssues.length > 0 && (
                        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-700" />
                            <div>
                                <p className="font-bold">হেড অফিস থেকে {pendingIssues.length} টি সমস্যা পাঠানো হয়েছে</p>
                                <p className="text-amber-800 mt-1">
                                    নিচে সমস্যার বিবরণ দেখুন, প্রয়োজনীয় সংশোধন করুন, তারপর উত্তর দিন। সব পেন্ডিং সমস্যা সমাধান না হলে হেড অফিস অনুমোদন দেবে না।
                                </p>
                            </div>
                        </div>
                    )}

                    {disburseMode && selectedFormId !== null && (
                        <Card className="mb-6 border-l-4 border-l-emerald-600">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-emerald-800">
                                    <CheckCircle2 className="w-5 h-5" />
                                    ধাপ {currentStepNumber} / {disburseStepFormIds.length} - {FORM_NAMES[selectedFormId] || `ফর্ম ${selectedFormId}`}
                                </CardTitle>
                                <CardDescription>
                                    আগের ফর্মগুলো শুধু preview/print করুন। যেগুলো বাকি আছে সেগুলো পূরণ করে পরের ধাপে যান।
                                </CardDescription>
                            </CardHeader>
                            <CardContent />
                        </Card>
                    )}

                    {!disburseMode && issues.length > 0 && (
                        <Card className="mb-6 border-amber-200">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-amber-800">
                                    <AlertCircle className="w-5 h-5" />
                                    হেড অফিস থেকে পাঠানো সমস্যা ও শাখার উত্তর
                                </CardTitle>
                                <CardDescription>
                                    {canRespondToIssues
                                        ? 'পেন্ডিং সমস্যায় উত্তর দিন — সংশোধন সম্পন্ন হলে "সমাধান করেছি" বেছে উত্তর লিখুন।'
                                        : 'সমস্যা দেখে প্রয়োজনীয় ফর্ম/তথ্য সংশোধন করুন। উত্তর দিতে শাখা ব্যবহারকারী বা শাখা ব্যবস্থাপককে জানান।'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {issues.map((issue) => (
                                    <div
                                        key={issue.id}
                                        className={`p-4 border rounded-lg text-sm ${
                                            issue.status === 'pending'
                                                ? 'bg-amber-50 border-amber-200'
                                                : issue.status === 'resolved'
                                                  ? 'bg-green-50 border-green-200'
                                                  : 'bg-red-50 border-red-200'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-3 mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-gray-900">হেড অফিসের সমস্যা</span>
                                                <Badge
                                                    className={
                                                        issue.status === 'pending'
                                                            ? 'bg-amber-200 text-amber-800'
                                                            : issue.status === 'resolved'
                                                              ? 'bg-green-200 text-green-800'
                                                              : 'bg-red-200 text-red-800'
                                                    }
                                                >
                                                    {issue.status === 'pending'
                                                        ? 'পেন্ডিং'
                                                        : issue.status === 'resolved'
                                                          ? 'সমাধান করা হয়েছে'
                                                          : 'প্রত্যাখ্যান করা হয়েছে'}
                                                </Badge>
                                            </div>
                                            <span className="text-xs text-gray-500 whitespace-nowrap">
                                                {formatDateTime(issue.created_at)}
                                            </span>
                                        </div>
                                        <p className="text-gray-900 whitespace-pre-wrap">{issue.issue_description}</p>
                                        <p className="text-xs text-gray-600 mt-2">
                                            রিপোর্টার: {issue.reporter?.name || 'হেড অফিস'}
                                        </p>

                                        {issue.response_message && (
                                            <div className="mt-3 p-3 rounded bg-blue-50 border border-blue-200">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <MessageSquare className="w-4 h-4 text-blue-700" />
                                                    <span className="font-semibold text-blue-900">শাখার উত্তর</span>
                                                </div>
                                                <p className="text-blue-900 whitespace-pre-wrap">{issue.response_message}</p>
                                                {issue.responder && (
                                                    <p className="text-xs text-blue-700 mt-2">
                                                        — {issue.responder.name}
                                                        {issue.responded_at && `, ${formatDateTime(issue.responded_at)}`}
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {issue.status === 'pending' && canRespondToIssues && (
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                <Button
                                                    size="sm"
                                                    onClick={() => openIssueAction(issue.id, 'resolve')}
                                                >
                                                    <CheckCircle2 className="w-4 h-4 mr-1" />
                                                    সমাধান করেছি — উত্তর দিন
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="border-red-200 text-red-700 hover:bg-red-50"
                                                    onClick={() => openIssueAction(issue.id, 'reject')}
                                                >
                                                    <XCircle className="w-4 h-4 mr-1" />
                                                    সমস্যা অস্বীকার করুন
                                                </Button>
                                            </div>
                                        )}

                                        {issue.status === 'pending' && !issue.response_message && !canRespondToIssues && (
                                            <p className="mt-3 text-xs text-gray-600 italic">
                                                শাখা থেকে এখনও উত্তর পাওয়া যায়নি
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {!disburseMode && editableFormIds.length > 0 && (
                        <Card className="mb-6 border-l-4 border-l-amber-500">
                            <CardHeader>
                                <CardTitle className="text-base">পূরণ করতে হবে</CardTitle>
                                <CardDescription>
                                    {application.status === 'pending_disbursement'
                                        ? 'বিতরণের আগে নিচের ফর্মগুলো পূরণ করুন'
                                        : isBranchManager
                                          ? 'অনুমোদন/ফরওয়ার্ডের আগে প্রয়োজনীয় ফর্ম পূরণ করুন'
                                          : 'প্রয়োজনীয় ফর্ম পূরণ করুন'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-wrap gap-2">
                                {editableFormIds.map((id) => (
                                    <Link key={id} href={buildFormUrl(id)}>
                                        <Button variant="outline">
                                            <FileText className="w-4 h-4 mr-2" />
                                            {FORM_NAMES[id] || `ফর্ম ${id}`} পূরণ করুন
                                        </Button>
                                    </Link>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {/* শুধু সেভকৃত ফর্ম - সাবমিটের আগে/অ্যাপ্রুভার/সুপার অ্যাডমিন সবার জন্য একই ভিউ */}
                    {(savedFormIds.length > 0 || (disburseMode && selectedFormId !== null)) && (
                        <Card className="mb-6 border-l-4 border-l-green-600">
                            <CardHeader>
                                <CardTitle className="text-base">{disburseMode ? (FORM_NAMES[selectedFormId || 0] || 'বর্তমান ধাপ') : 'সেভকৃত ফর্ম'}</CardTitle>
                                <CardDescription>
                                    {disburseMode
                                        ? 'এই ফর্মের full preview নিচে দেখুন।'
                                        : 'যে ফর্মে ডেটা সেভ আছে সেটা বাটনে ক্লিক করে দেখুন ও প্রিন্ট করুন'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {!disburseMode && (
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
                                )}
                                {selectedFormId !== null && (
                                    <div className="rounded-lg border bg-gray-50/50 p-4">
                                        <div className="mb-3 flex items-center justify-between print:hidden">
                                            <span className="font-semibold text-gray-700">{FORM_NAMES[selectedFormId]}</span>
                                            <div className="flex gap-2">
                                                {isCurrentFormSaved && (
                                                    <Button variant="outline" size="sm" onClick={printFormContent}>
                                                        <Printer className="w-4 h-4 mr-2" />
                                                        প্রিন্ট
                                                    </Button>
                                                )}
                                                {disburseMode && currentStepIndex === disburseStepFormIds.length - 1 && routes.disburse && (
                                                    application.can_disburse ? (
                                                        <Button
                                                            onClick={() => {
                                                                if (confirm('সব প্রয়োজনীয় ফর্ম পূরণ হয়েছে। এখন ঋণ বিতরণ করতে চান?')) {
                                                                    router.patch(routes.disburse);
                                                                }
                                                            }}
                                                        >
                                                            <CheckCircle2 className="w-4 h-4 mr-2" />
                                                            Submit & Disburse
                                                        </Button>
                                                    ) : (
                                                        <Button disabled variant="outline" title="ফর্ম ২ ও ৩ পূরণ না হওয়া পর্যন্ত বিতরণ হবে না">
                                                            <Clock className="w-4 h-4 mr-2" />
                                                            ফর্ম ২+৩ বাকি
                                                        </Button>
                                                    )
                                                )}
                                                {disburseMode && currentStepIndex < disburseStepFormIds.length - 1 && (
                                                    <Button onClick={() => setSelectedFormId(disburseStepFormIds[currentStepIndex + 1])}>
                                                        Next
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                        {disburseMode && !isCurrentFormSaved && selectedFormId === 2 ? (
                                            <GuarantorCommitment
                                                embedded
                                                saveButtonLabel={currentStepIndex === disburseStepFormIds.length - 1 ? 'Save & Submit' : 'Save & Next'}
                                                afterSaveUrl={currentStepIndex < disburseStepFormIds.length - 1 ? buildDisburseStepUrl(disburseStepFormIds[currentStepIndex + 1]) : buildDisburseStepUrl(selectedFormId)}
                                                member={application.member_admission}
                                                loanProduct={application.loan_product}
                                                loanCategory={application.loan_category}
                                                requestedAmount={disburseAmount}
                                                branch={application.branch}
                                                existingApplication={application}
                                                savedData={application.guarantor_info}
                                            />
                                        ) : disburseMode && !isCurrentFormSaved && selectedFormId === 3 ? (
                                            <DeathRiskFund
                                                embedded
                                                saveButtonLabel={currentStepIndex === disburseStepFormIds.length - 1 ? 'Save & Submit' : 'Save & Next'}
                                                afterSaveUrl={currentStepIndex < disburseStepFormIds.length - 1 ? buildDisburseStepUrl(disburseStepFormIds[currentStepIndex + 1]) : buildDisburseStepUrl(selectedFormId)}
                                                member={application.member_admission}
                                                loanProduct={application.loan_product}
                                                loanCategory={application.loan_category}
                                                requestedAmount={disburseAmount}
                                                branch={application.branch}
                                                existingApplication={application}
                                                savedData={application.nominee_info}
                                            />
                                        ) : (
                                        <div ref={formPrintRef} className="form-print-area space-y-3 text-sm">
                                            {selectedFormId === 1 && application.loan_agreement_data && (
                                                <LoanAgreement
                                                    onlyPreview
                                                    savedData={application.loan_agreement_data}
                                                    member={application.member_admission}
                                                    loanProduct={application.loan_product}
                                                    loanCategory={application.loan_category}
                                                    requestedAmount={disburseAmount}
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
                                                    requestedAmount={disburseAmount}
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
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {!disburseMode && savedFormIds.length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-6">
                            এই আবেদনের জন্য এখনও কোন ফর্ম সেভ নেই। সম্পাদনা থেকে ফর্ম পূরণ ও সেভ করুন।
                        </p>
                    )}
                </div>
            </div>

            {issueAction && selectedIssueId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
                        <div className="border-b px-5 py-4">
                            <h3 className="text-lg font-bold text-gray-900">
                                {issueAction === 'resolve' ? 'সমস্যা সমাধানের উত্তর' : 'সমস্যা অস্বীকারের উত্তর'}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                                কী সংশোধন করেছেন বা কেন সমস্যা মানছেন না — বিস্তারিত লিখুন (কমপক্ষে ১০ অক্ষর)।
                            </p>
                        </div>
                        <form onSubmit={submitIssueAction} className="p-5 space-y-4">
                            <textarea
                                value={issueAction === 'resolve' ? resolveForm.data.response_message : rejectForm.data.response_message}
                                onChange={(e) =>
                                    issueAction === 'resolve'
                                        ? resolveForm.setData('response_message', e.target.value)
                                        : rejectForm.setData('response_message', e.target.value)
                                }
                                rows={5}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                                placeholder="উত্তর লিখুন..."
                                required
                                minLength={10}
                            />
                            {(issueAction === 'resolve' ? resolveForm.errors.response_message : rejectForm.errors.response_message) && (
                                <p className="text-xs text-red-600">
                                    {issueAction === 'resolve'
                                        ? resolveForm.errors.response_message
                                        : rejectForm.errors.response_message}
                                </p>
                            )}
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={closeIssueAction}>
                                    বাতিল
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={issueAction === 'resolve' ? resolveForm.processing : rejectForm.processing}
                                >
                                    {issueAction === 'resolve' ? 'সমাধান সংরক্ষণ' : 'অস্বীকার সংরক্ষণ'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </AdminLayout>
    );
}
