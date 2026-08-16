import React, { useState, useRef, useEffect } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { formatDate, formatDateTime } from '@/utils/dateUtils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, User, Banknote, AlertCircle, CheckCircle, XCircle, Printer, Clock, MessageSquare, Wrench } from 'lucide-react';
import GuarantorCommitment from '../Member/LoanApplications/Forms/GuarantorCommitment';
import DeathRiskFund from '../Member/LoanApplications/Forms/DeathRiskFund';
import LoanAgreement from '../Member/LoanApplications/Forms/LoanAgreement';
import FieldInvestigation from '../Member/LoanApplications/Forms/FieldInvestigation';
import LoanApplicationApproval from '../Member/LoanApplications/Forms/LoanApplicationApproval';
import HeadOfficeModificationModal, { useCanHeadOfficeModify } from '@/components/HeadOfficeModificationModal';
import { PhoneCallLink } from '@/components/ui/PhoneCallLink';

interface Loan {
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
    loan_agreement_data?: any;
    asset_info?: any;
    business_plan?: any;
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
    submittedBy: {
        id: number;
        name: string;
    };
    issues: Array<{
        id: number;
        issue_description: string;
        reporter: { name: string };
        created_at: string;
        status: string;
        response_message?: string;
        responded_at?: string;
        responder?: {
            id: number;
            name: string;
        };
    }>;
    approvals?: Array<any>;
}

interface Props {
    loan: Loan;
    flash?: { success?: string; error?: string };
}

const FORM_NAMES: Record<number, string> = {
    1: 'ঋণ চুক্তি পত্র',
    2: 'জামিনদার/দায়িত্ব গ্রহণকারীর অঙ্গীকার নামা',
    3: 'মৃত্যুঝুঁকি তহবিল আবেদন',
    4: 'সরেজমিন তদন্ত প্রতিবেদন',
    5: 'আবেদন ও অনুমোদনপত্র',
};

const FORM_FILLERS: Record<number, string> = {
    1: 'ফিল্ড অফিসার / শাখা ব্যবহারকারী',
    2: 'শাখা ব্যবহারকারী (বিতরণের আগে)',
    3: 'শাখা ব্যবহারকারী (বিতরণের আগে)',
    4: 'শাখা ব্যবস্থাপক',
    5: 'ফিল্ড অফিসার / শাখা ব্যবহারকারী',
};

const statusConfig = {
    draft: { label: 'খসড়া', color: 'bg-gray-100 text-gray-800', icon: AlertCircle },
    pending: { label: 'অপেক্ষমাণ', color: 'bg-amber-100 text-amber-800', icon: Clock },
    submitted: { label: 'জমা হয়েছে', color: 'bg-blue-100 text-blue-800', icon: Clock },
    under_review: { label: 'পর্যালোচনা', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    ready_for_head_office: { label: 'শাখা অনুমোদিত', color: 'bg-indigo-100 text-indigo-800', icon: Clock },
    pending_head_office: { label: 'হেড অফিসে প্রেরিত', color: 'bg-indigo-100 text-indigo-800', icon: Clock },
    approved: { label: 'অনুমোদিত', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    pending_disbursement: { label: 'বিতরণের অপেক্ষায়', color: 'bg-amber-100 text-amber-800', icon: Clock },
    rejected: { label: 'প্রত্যাখ্যাত', color: 'bg-red-100 text-red-800', icon: XCircle },
    disbursed: { label: 'বিতরণ হয়েছে', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle },
    cancelled: { label: 'বাতিল', color: 'bg-gray-100 text-gray-800', icon: XCircle },
    needs_correction: { label: 'সংশোধন প্রয়োজন', color: 'bg-orange-100 text-orange-800', icon: AlertCircle },
};

export default function LoanApplicationShow({ loan, flash }: Props) {
    const canModify = useCanHeadOfficeModify();
    const [showIssueModal, setShowIssueModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showModificationModal, setShowModificationModal] = useState(false);
    const [selectedFormId, setSelectedFormId] = useState<number | null>(null);
    const [printBlank, setPrintBlank] = useState(false);
    const formPrintRef = useRef<HTMLDivElement>(null);

    const { data, setData, post, processing, reset } = useForm({
        issue_description: '',
    });

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

    const visibleFormIds = loan.visible_form_ids || [1, 2, 3, 4, 5];
    
    const savedFormIds = visibleFormIds.filter((id) => {
        if (loan.form_saved?.[id] !== true) return false;
        switch (id) {
            case 1:
                return hasMeaningfulData(loan.loan_agreement_data);
            case 2:
                return hasMeaningfulData(loan.guarantor_info);
            case 3:
                return hasMeaningfulData(loan.nominee_info);
            case 4:
                return hasMeaningfulData(loan.asset_info);
            case 5:
                return hasMeaningfulData(loan.business_plan);
            default:
                return false;
        }
    });

    useEffect(() => {
        if (selectedFormId == null && visibleFormIds.length > 0) {
            setSelectedFormId(visibleFormIds[0]);
        }
    }, [selectedFormId, visibleFormIds]);

    useEffect(() => {
        setPrintBlank(false);
    }, [selectedFormId]);

    const printFormContent = () => {
        if (!formPrintRef.current || !selectedFormId) return;
        window.print();
    };

    const handleSubmitIssue = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/head-office/loans/${loan.id}/issue`, {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                setShowIssueModal(false);
            },
        });
    };

    const handleApprove = () => {
        const pendingIssues = loan.issues?.filter(issue => issue.status === 'pending') || [];
        if (pendingIssues.length > 0) {
            alert('পেন্ডিং সমস্যা থাকলে অনুমোদন করা যাবে না।');
            return;
        }
        if (confirm('এই ঋণ আবেদন অনুমোদন করবেন?')) {
            router.patch(`/head-office/loans/${loan.id}/approve`, {}, { preserveScroll: true });
        }
    };

    const handleReject = (reason: string) => {
        if (!reason.trim()) {
            alert('প্রত্যাখ্যানের কারণ লিখুন।');
            return;
        }
        router.patch(`/head-office/loans/${loan.id}/reject`, {
            rejection_reason: reason,
        }, {
            preserveScroll: true,
            onSuccess: () => setShowRejectModal(false),
        });
    };

    const statusInfo = statusConfig[loan.status as keyof typeof statusConfig] || {
        label: loan.status || 'খসড়া',
        color: 'bg-gray-100 text-gray-800',
        icon: AlertCircle,
    };
    const StatusIcon = statusInfo.icon || AlertCircle;
    const memberNo = loan.member_admission?.application_no || loan.application_no;

    return (
        <AdminLayout>
            <Head title={`ঋণ আবেদন - ${memberNo}`}>
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
                        .form-print-area, 
                        .form-print-area *, 
                        .print-container, 
                        .print-container *, 
                        .printable-area, 
                        .printable-area *,
                        .agrosor-a4-page,
                        .agrosor-a4-page *,
                        #issues-print-area, 
                        #issues-print-area * { 
                            visibility: visible !important;
                            font-family: Kalpurush, Arial, sans-serif !important;
                        }
                        .form-print-area .font-mono,
                        .form-print-area .font-mono *,
                        .print-container .font-mono,
                        .print-container .font-mono * {
                            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
                        }
                        .form-print-area, 
                        .print-container, 
                        .printable-area,
                        #issues-print-area {
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
                        .print\\:hidden, nav, header, sidebar { 
                            display: none !important; 
                        }
                    }
                `}</style>
            </Head>

            <div className="py-6">
                <div className="mx-auto max-w-6xl sm:px-6 lg:px-8">
                    {/* Flash Messages */}
                    {flash?.success && (
                        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
                            {flash.success}
                        </div>
                    )}
                    {flash?.error && (
                        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                            {flash.error}
                        </div>
                    )}

                    {/* Header */}
                    <div className="mb-6 flex items-center justify-between print:flex print:justify-center">
                        <div className="flex items-center gap-4 print:gap-0">
                            <Button variant="outline" size="icon" onClick={() => router.visit('/head-office/loan-applications')} className="print:hidden">
                                <ArrowLeft className="w-4 h-4" />
                            </Button>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">ঋণ আবেদন বিবরণ</h2>
                                <p className="text-gray-600">সদস্য নং: {memberNo}</p>
                            </div>
                        </div>
                        <div className="flex gap-2 print:hidden">
                            {canModify && loan.status !== 'draft' && loan.status !== 'disbursed' && loan.status !== 'cancelled' && (
                                <Button
                                    variant="outline"
                                    onClick={() => setShowModificationModal(true)}
                                    className="border-slate-300"
                                >
                                    <Wrench className="w-4 h-4 mr-2" />
                                    Modification
                                </Button>
                            )}
                            <Button 
                                variant="outline" 
                                onClick={() => setShowIssueModal(true)}
                                disabled={loan.status === 'approved' || loan.status === 'disbursed'}
                                title={loan.status === 'approved' || loan.status === 'disbursed' ? 'অনুমোদিত আবেদনে সমস্যা পাঠানো যাবে না' : ''}
                            >
                                <AlertCircle className="w-4 h-4 mr-2" />
                                সমস্যা লিখে পাঠান
                            </Button>
                            {loan.issues?.filter(issue => issue.status === 'pending').length === 0 && loan.status === 'pending_head_office' && (
                                <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700">
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    অনুমোদন
                                </Button>
                            )}
                            {loan.status === 'pending_head_office' && (
                                <Button variant="destructive" onClick={() => setShowRejectModal(true)}>
                                    <XCircle className="w-4 h-4 mr-2" />
                                    প্রত্যাখ্যান
                                </Button>
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
                                            আবেদনের তারিখ: {formatDate(loan.created_at)}
                                        </p>
                                        {loan.submitted_at && (
                                            <p className="text-sm text-gray-600">
                                                জমা দেওয়ার তারিখ: {formatDate(loan.submitted_at)}
                                            </p>
                                        )}
                                        {loan.reviewed_at && (
                                            <p className="text-sm text-gray-600">
                                                পর্যালোচনার তারিখ: {formatDate(loan.reviewed_at)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-gray-600">ফর্ম টাইপ</p>
                                    <Badge variant="outline" className="text-lg">
                                        {loan.form_type === 1 ? 'সাপ্তাহিক/সুফলন' : 'বড় ঋণ'}
                                    </Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Basic Info Cards */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="w-5 h-5" /> সদস্যের তথ্য
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <p><span className="text-gray-600">সদস্য নং:</span> <span className="font-mono font-semibold">{memberNo || '-'}</span></p>
                                <p><span className="text-gray-600">নাম:</span> {loan.member_admission?.applicant_name_bn || loan.member_admission?.applicant_name_en || '-'}</p>
                                <p><span className="text-gray-600">NID:</span> {loan.member_admission?.nid_number || loan.member_admission?.nid_no || '-'}</p>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-gray-600">মোবাইল:</span>
                                    <PhoneCallLink
                                        phone={loan.member_admission?.mobile_number || loan.member_admission?.mobile_no}
                                        className="font-mono font-semibold text-blue-700"
                                        iconClassName="w-3.5 h-3.5 text-blue-500"
                                    />
                                </div>
                                <p><span className="text-gray-600">ঠিকানা:</span> {loan.member_admission?.present_village_road || loan.member_admission?.present_address_en || '-'}</p>
                                {loan.submittedBy && (
                                    <p><span className="text-gray-600">আবেদনকারী:</span> {loan.submittedBy.name}</p>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Banknote className="w-5 h-5" /> ঋণ বিবরণ
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <p><span className="text-gray-600">ক্যাটাগরি:</span> {loan.loan_category?.category_name_bn || loan.loan_category?.category_name || '-'}</p>
                                <p><span className="text-gray-600">পণ্য:</span> {loan.loan_product?.product_name_bn || loan.loan_product?.product_name || '-'}</p>
                                <p><span className="text-gray-600">আবেদিত পরিমাণ:</span> ৳{Number(loan.requested_amount).toLocaleString('bn-BD')}</p>
                                {loan.approved_amount && (
                                    <p><span className="text-gray-600">অনুমোদিত পরিমাণ:</span> ৳{Number(loan.approved_amount).toLocaleString('bn-BD')}</p>
                                )}
                                <p><span className="text-gray-600">শাখা:</span> {loan.branch?.name || '-'}</p>
                                {loan.samity && (
                                    <p><span className="text-gray-600">সমিতি:</span> {loan.samity.samity_name_bn || loan.samity.samity_name || '-'}</p>
                                )}
                                <p><span className="text-gray-600">জমার তারিখ:</span> {loan.submitted_at ? formatDate(loan.submitted_at) : '-'}</p>
                                {loan.purpose_of_loan && (
                                    <p><span className="text-gray-600">ঋণের উদ্দেশ্য:</span> {loan.purpose_of_loan}</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Issues Card */}
                    {loan.issues && loan.issues.length > 0 && (
                        <Card className="mb-6 border-amber-200 print:border-gray-300">
                            <CardHeader className="print:border-b print:pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2 text-amber-800 print:text-gray-900">
                                        <AlertCircle className="w-5 h-5" /> হেড অফিস থেকে পাঠানো সমস্যা ও শাখার উত্তর
                                    </CardTitle>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => {
                                            const printContent = document.getElementById('issues-print-area');
                                            if (printContent) {
                                                const printWindow = window.open('', '_blank');
                                                if (printWindow) {
                                                    printWindow.document.write(`
                                                        <html>
                                                            <head>
                                                                <title>সমস্যা ও উত্তর - ${memberNo}</title>
                                                                <style>
                                                                    body { font-family: 'Kalpurush', Arial, sans-serif; padding: 20px; }
                                                                    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px; }
                                                                    .issue-item { margin-bottom: 25px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
                                                                    .issue-question { background: #fef3c7; padding: 12px; border-radius: 5px; margin-bottom: 10px; }
                                                                    .issue-response { background: #d1fae5; padding: 12px; border-radius: 5px; margin-top: 10px; }
                                                                    .status-badge { display: inline-block; padding: 4px 8px; border-radius: 3px; font-size: 12px; margin-left: 10px; }
                                                                    .pending { background: #fef3c7; color: #92400e; }
                                                                    .resolved { background: #d1fae5; color: #065f46; }
                                                                    .rejected { background: #fee2e2; color: #991b1b; }
                                                                    .meta { font-size: 11px; color: #666; margin-top: 5px; }
                                                                </style>
                                                            </head>
                                                            <body>
                                                                <div class="header">
                                                                    <h1>ঋণ আবেদন সমস্যা ও উত্তর</h1>
                                                                    <p>সদস্য নং: ${memberNo}</p>
                                                                    <p>তারিখ: ${formatDate(new Date())}</p>
                                                                </div>
                                                                ${Array.from(printContent.children).map((item: any) => item.outerHTML).join('')}
                                                            </body>
                                                        </html>
                                                    `);
                                                    printWindow.document.close();
                                                    printWindow.print();
                                                }
                                            }
                                        }}
                                        className="print:hidden"
                                    >
                                        <Printer className="w-4 h-4 mr-2" />
                                        প্রিন্ট
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div id="issues-print-area" className="space-y-4">
                                    {loan.issues.map((issue) => (
                                        <div 
                                            key={issue.id} 
                                            className={`p-4 border rounded-lg text-sm print:break-inside-avoid ${
                                                issue.status === 'pending' 
                                                    ? 'bg-amber-50 border-amber-200' 
                                                    : issue.status === 'resolved'
                                                    ? 'bg-green-50 border-green-200'
                                                    : 'bg-red-50 border-red-200'
                                            }`}
                                        >
                                            {/* Issue Question */}
                                            <div className={`p-3 rounded mb-3 ${
                                                issue.status === 'pending' 
                                                    ? 'bg-amber-100' 
                                                    : issue.status === 'resolved'
                                                    ? 'bg-green-100'
                                                    : 'bg-red-100'
                                            }`}>
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <AlertCircle className={`w-4 h-4 ${
                                                                issue.status === 'pending' 
                                                                    ? 'text-amber-700' 
                                                                    : issue.status === 'resolved'
                                                                    ? 'text-green-700'
                                                                    : 'text-red-700'
                                                            }`} />
                                                            <span className={`font-semibold ${
                                                                issue.status === 'pending' 
                                                                    ? 'text-amber-900' 
                                                                    : issue.status === 'resolved'
                                                                    ? 'text-green-900'
                                                                    : 'text-red-900'
                                                            }`}>
                                                                হেড অফিস থেকে পাঠানো সমস্যা
                                                            </span>
                                                            <Badge className={`${
                                                                issue.status === 'pending' 
                                                                    ? 'bg-amber-200 text-amber-800' 
                                                                    : issue.status === 'resolved'
                                                                    ? 'bg-green-200 text-green-800'
                                                                    : 'bg-red-200 text-red-800'
                                                            }`}>
                                                                {issue.status === 'pending' ? 'পেন্ডিং' : issue.status === 'resolved' ? 'সমাধান করা হয়েছে' : 'প্রত্যাখ্যান করা হয়েছে'}
                                                            </Badge>
                                                        </div>
                                                        <p className={`${
                                                            issue.status === 'pending' 
                                                                ? 'text-amber-900' 
                                                                : issue.status === 'resolved'
                                                                ? 'text-green-900'
                                                                : 'text-red-900'
                                                        }`}>
                                                            {issue.issue_description}
                                                        </p>
                                                        <p className={`text-xs mt-2 ${
                                                            issue.status === 'pending' 
                                                                ? 'text-amber-700' 
                                                                : issue.status === 'resolved'
                                                                ? 'text-green-700'
                                                                : 'text-red-700'
                                                        }`}>
                                                            — {issue.reporter?.name}, {formatDateTime(issue.created_at)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Branch Response */}
                                            {issue.response_message && (
                                                <div className="p-3 rounded bg-blue-50 border border-blue-200">
                                                    <div className="flex items-center gap-2 mb-2">
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

                                            {/* No Response Message */}
                                            {!issue.response_message && issue.status === 'pending' && (
                                                <div className="p-2 bg-gray-100 rounded text-xs text-gray-600 italic">
                                                    শাখা থেকে এখনও উত্তর পাওয়া যায়নি
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Forms hub — all visible forms, one-at-a-time print (data or blank) */}
                    <Card className="mb-6 border-l-4 border-l-indigo-600">
                        <CardHeader>
                            <CardTitle className="text-base">ফর্মসমূহ</CardTitle>
                            <CardDescription>
                                প্রতিটি ফর্মে কে পূরণ করেন লেখা আছে। একটা করে প্রিন্ট করুন।
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 print:hidden">
                                {visibleFormIds.map((id) => {
                                    const saved = savedFormIds.includes(id);
                                    const selected = selectedFormId === id;
                                    return (
                                        <button
                                            key={id}
                                            type="button"
                                            onClick={() => setSelectedFormId(id)}
                                            className={[
                                                'text-left rounded-xl border-2 p-3 transition shadow-sm',
                                                selected
                                                    ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-200'
                                                    : saved
                                                      ? 'border-emerald-200 bg-emerald-50/40 hover:border-emerald-400'
                                                      : 'border-amber-200 bg-amber-50/50 hover:border-amber-300',
                                            ].join(' ')}
                                        >
                                            <div className="flex items-start gap-2">
                                                <FileText className={`w-5 h-5 shrink-0 mt-0.5 ${selected ? 'text-indigo-600' : 'text-gray-500'}`} />
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <span className="font-bold text-sm text-gray-900">
                                                            {FORM_NAMES[id] || `ফর্ম ${id}`}
                                                        </span>
                                                        {saved ? (
                                                            <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">সেভ আছে</Badge>
                                                        ) : (
                                                            <Badge className="bg-amber-100 text-amber-800 text-[10px]">বাকি</Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-600 mt-1">
                                                        <span className="font-semibold text-gray-800">পূরণ করেন:</span>{' '}
                                                        {FORM_FILLERS[id] || '—'}
                                                    </p>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                            {selectedFormId !== null && (
                                <div className="rounded-lg border bg-gray-50/50 p-4">
                                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 print:hidden">
                                        <div>
                                            <span className="font-semibold text-gray-700">{FORM_NAMES[selectedFormId]}</span>
                                            <p className="text-xs text-gray-600 mt-1">
                                                পূরণ করেন: <strong>{FORM_FILLERS[selectedFormId]}</strong>
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            {savedFormIds.includes(selectedFormId) && (
                                                <Button
                                                    variant={printBlank ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => setPrintBlank((v) => !v)}
                                                >
                                                    ব্ল্যাংক প্রিন্ট মোড
                                                </Button>
                                            )}
                                            <Button variant="outline" size="sm" onClick={printFormContent}>
                                                <Printer className="w-4 h-4 mr-2" />
                                                প্রিন্ট
                                            </Button>
                                        </div>
                                    </div>
                                    <div ref={formPrintRef} className="form-print-area space-y-3 text-sm">
                                        {(() => {
                                            const admissionOnly = printBlank || !savedFormIds.includes(selectedFormId);
                                            const data = admissionOnly
                                                ? undefined
                                                : selectedFormId === 1
                                                  ? loan.loan_agreement_data
                                                  : selectedFormId === 2
                                                    ? loan.guarantor_info
                                                    : selectedFormId === 3
                                                      ? loan.nominee_info
                                                      : selectedFormId === 4
                                                        ? loan.asset_info
                                                        : loan.business_plan;
                                            const common = {
                                                onlyPreview: true as const,
                                                savedData: data,
                                                member: loan.member_admission,
                                                loanProduct: loan.loan_product,
                                                loanCategory: loan.loan_category,
                                                requestedAmount: loan.approved_amount != null && Number(loan.approved_amount) > 0 ? Number(loan.approved_amount) : Number(loan.requested_amount),
                                                branch: loan.branch,
                                            };
                                            if (selectedFormId === 1) return <LoanAgreement {...common} />;
                                            if (selectedFormId === 2) return <GuarantorCommitment {...common} />;
                                            if (selectedFormId === 3) return <DeathRiskFund {...common} />;
                                            if (selectedFormId === 4) return <FieldInvestigation {...common} />;
                                            if (selectedFormId === 5) return <LoanApplicationApproval {...common} />;
                                            return null;
                                        })()}
                                    </div>
                                </div>
                            )}
                            {visibleFormIds.length === 0 && (
                                <p className="text-sm text-gray-500 text-center py-4">এই আবেদনের জন্য কোনো ফর্ম নেই।</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Issue Modal */}
            {showIssueModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
                        <div className="px-6 py-4 border-b">
                            <h3 className="text-lg font-bold">সমস্যা লিখে পাঠান</h3>
                            <p className="text-sm text-gray-600">সমস্যা বিস্তারিত লিখুন। শাখা দেখে সংশোধন করবে।</p>
                        </div>
                        <form onSubmit={handleSubmitIssue} className="p-6">
                            <textarea
                                value={data.issue_description}
                                onChange={(e) => setData('issue_description', e.target.value)}
                                rows={4}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="সমস্যার বিবরণ..."
                                required
                            />
                            <div className="mt-4 flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => { setShowIssueModal(false); reset(); }}>
                                    বাতিল
                                </Button>
                                <Button type="submit" disabled={processing}>
                                    {processing ? 'পাঠানো হচ্ছে...' : 'পাঠান'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <RejectModal
                        onClose={() => setShowRejectModal(false)}
                        onConfirm={handleReject}
                    />
                </div>
            )}
            <HeadOfficeModificationModal
                open={showModificationModal}
                onClose={() => setShowModificationModal(false)}
                entityType="loan"
                target={{
                    id: loan.id,
                    applicationNo: memberNo,
                    applicantName: loan.member_admission?.applicant_name_bn || loan.member_admission?.applicant_name_en,
                    status: loan.status,
                }}
            />
        </AdminLayout>
    );
}

function RejectModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: (reason: string) => void }) {
    const [reason, setReason] = useState('');
    return (
        <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b">
                <h3 className="text-lg font-bold text-red-700">ঋণ আবেদন প্রত্যাখ্যান</h3>
                <p className="text-sm text-gray-600">প্রত্যাখ্যানের কারণ লিখুন (বাধ্যতামূলক)।</p>
            </div>
            <div className="p-6">
                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                    placeholder="কারণ..."
                />
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>বাতিল</Button>
                <Button variant="destructive" onClick={() => onConfirm(reason)}>প্রত্যাখ্যান নিশ্চিত করুন</Button>
            </div>
        </div>
    );
}
