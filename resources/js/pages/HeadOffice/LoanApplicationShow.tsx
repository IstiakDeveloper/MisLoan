import React, { useState, useRef, useEffect } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { formatDate, formatDateTime } from '@/utils/dateUtils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    ArrowLeft,
    FileText,
    User,
    Banknote,
    AlertCircle,
    CheckCircle2,
    XCircle,
    Printer,
    Clock,
    MessageSquare,
    Wrench,
    CreditCard,
    Check,
    Activity,
    Info,
    ShieldCheck,
    FileCheck,
    Lock,
    Edit,
    X,
} from 'lucide-react';
import GuarantorCommitment from '../Member/LoanApplications/Forms/GuarantorCommitment';
import DeathRiskFund from '../Member/LoanApplications/Forms/DeathRiskFund';
import LoanAgreement from '../Member/LoanApplications/Forms/LoanAgreement';
import FieldInvestigation from '../Member/LoanApplications/Forms/FieldInvestigation';
import LoanApplicationApproval from '../Member/LoanApplications/Forms/LoanApplicationApproval';
import HeadOfficeModificationModal, { useCanHeadOfficeModify } from '@/components/HeadOfficeModificationModal';
import SuperAdminDeletePinModal from '@/components/SuperAdminDeletePinModal';
import { PhoneCallLink } from '@/components/ui/PhoneCallLink';
import { toEnglishDigits, formatBranchCode, parseMemberCode } from '@/utils/memberCodeUtils';

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
    member_admission?: {
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
        samity?: {
            id?: number;
            samity_name?: string;
            samity_name_bn?: string;
        };
    };
    memberAdmission?: any;
    visible_form_ids?: number[];
    superadmin_can_pin_edit?: boolean;
    superadmin_edit_unlocked?: boolean;
    form_saved?: Record<number, boolean>;
    loan_agreement_data?: any;
    asset_info?: any;
    business_plan?: any;
    loan_product?: {
        product_name: string;
        product_name_bn: string;
        product_code: string;
        interest_rate: number;
        installment_type: string;
    };
    loanProduct?: any;
    loan_category?: {
        category_name: string;
        category_name_bn: string;
        category_code: string;
    };
    loanCategory?: any;
    branch?: {
        name: string;
        code?: string;
        branch_name?: string;
        branch_name_bn?: string;
    };
    samity?: {
        samity_name: string;
        samity_name_bn: string;
    } | null;
    submittedBy?: {
        id: number;
        name: string;
    } | null;
    submitted_by?: {
        id: number;
        name: string;
    } | null;
    issues?: Array<{
        id: number;
        issue_description: string;
        reporter?: { name: string };
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

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    draft: { label: 'খসড়া', color: 'bg-slate-100 text-slate-800 border-slate-300', icon: AlertCircle },
    pending: { label: 'অপেক্ষমাণ', color: 'bg-amber-100 text-amber-800 border-amber-300', icon: Clock },
    submitted: { label: 'জমা হয়েছে', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: Clock },
    under_review: { label: 'শাখা পর্যালোচনা', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Clock },
    ready_for_head_office: { label: 'শাখা অনুমোদিত', color: 'bg-indigo-100 text-indigo-800 border-indigo-300', icon: Clock },
    pending_head_office: { label: 'হেড অফিসে প্রেরিত', color: 'bg-indigo-100 text-indigo-800 border-indigo-300', icon: Clock },
    approved: { label: 'অনুমোদিত', color: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle2 },
    pending_disbursement: { label: 'বিতরণের অপেক্ষায়', color: 'bg-amber-100 text-amber-800 border-amber-300', icon: Clock },
    rejected: { label: 'প্রত্যাখ্যাত', color: 'bg-rose-100 text-rose-800 border-rose-300', icon: XCircle },
    disbursed: { label: 'বিতরণ হয়েছে', color: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: CheckCircle2 },
    cancelled: { label: 'বাতিল', color: 'bg-slate-100 text-slate-800 border-slate-300', icon: XCircle },
    needs_correction: { label: 'সংশোধন প্রয়োজন', color: 'bg-orange-100 text-orange-800 border-orange-300', icon: AlertCircle },
};

/** Workflow stage pipeline mapping */
const PIPELINE_STAGES = [
    { key: 'draft', label: '১. ফর্ম পূরণ', desc: 'খসড়া প্রস্তুতি' },
    { key: 'branch', label: '২. শাখা পর্যালোচনা', desc: 'শাখা অনুমোদন' },
    { key: 'head_office', label: '৩. হেড অফিস', desc: 'এইচও পর্যালোচনা' },
    { key: 'disbursement', label: '৪. বিতরণ অপেক্ষা', desc: 'অনুমোদন প্রাপ্ত' },
    { key: 'disbursed', label: '৫. বিতরণ সম্পন্ন', desc: 'ঋণ বিতরণ' },
];

export default function LoanApplicationShow({ loan, flash }: Props) {
    const canModify = useCanHeadOfficeModify();
    const [showIssueModal, setShowIssueModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showModificationModal, setShowModificationModal] = useState(false);
    const [pinModalOpen, setPinModalOpen] = useState(false);
    const [pinProcessing, setPinProcessing] = useState(false);
    const [selectedFormId, setSelectedFormId] = useState<number | null>(null);
    const [printBlank, setPrintBlank] = useState(false);
    const [activeTab, setActiveTab] = useState<'forms' | 'details' | 'issues'>('forms');
    const formPrintRef = useRef<HTMLDivElement>(null);

    const { data, setData, post, processing, reset } = useForm({
        issue_description: '',
    });

    const memberAdmission = loan.member_admission || loan.memberAdmission;
    const branchPrefix = formatBranchCode(loan.branch?.code || '0001');
    const memberNo = memberAdmission?.application_no || '';
    const parsedCode = parseMemberCode(memberNo, branchPrefix);
    const memberName =
        memberAdmission?.applicant_name_bn ||
        memberAdmission?.applicant_name_en ||
        memberAdmission?.member_name_bn ||
        memberAdmission?.member_name_en ||
        '-';

    // Member Code Update Modal State (10-digit policy: 4-digit branch code + 6-digit serial)
    const [memberCodeModalOpen, setMemberCodeModalOpen] = useState(false);
    const [serialInput, setSerialInput] = useState<string>(parsedCode.serial);
    const [submittingMemberCode, setSubmittingMemberCode] = useState(false);

    useEffect(() => {
        const p = parseMemberCode(memberNo, branchPrefix);
        setSerialInput(p.serial);
    }, [memberNo, branchPrefix]);

    const handleMemberCodeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const cleanSerial = toEnglishDigits(serialInput).replace(/\D/g, '');
        if (!cleanSerial) return;
        const fullCode = `${branchPrefix}${cleanSerial.padStart(6, '0')}`;
        setSubmittingMemberCode(true);
        router.patch(
            `/member/loan-applications/${loan.id}/update-member-code`,
            { member_code: fullCode },
            {
                preserveScroll: true,
                onFinish: () => {
                    setSubmittingMemberCode(false);
                    setMemberCodeModalOpen(false);
                },
            }
        );
    };

    const confirmSuperAdminUnlock = (pin: string) => {
        setPinProcessing(true);
        router.post(
            `/member/loan-applications/${loan.id}/unlock-edit`,
            { pin },
            {
                onFinish: () => setPinProcessing(false),
                onSuccess: () => setPinModalOpen(false),
            },
        );
    };

    // Helper function to recursively check if data has meaningful content
    const hasMeaningfulData = (val: any): boolean => {
        if (val === null || val === undefined || val === '') return false;
        
        if (typeof val === 'string') {
            const trimmed = val.trim();
            return trimmed !== '' && trimmed !== 'null' && trimmed !== '{}' && trimmed !== '[]' && trimmed.length >= 3;
        }
        
        if (Array.isArray(val)) {
            if (val.length === 0) return false;
            return val.some(item => hasMeaningfulData(item));
        }
        
        if (typeof val === 'object') {
            const keys = Object.keys(val);
            if (keys.length === 0) return false;
            return keys.some(key => {
                const item = val[key];
                if (item === null || item === undefined || item === '') return false;
                if (typeof item === 'string' && item.trim() === '') return false;
                if (Array.isArray(item) && item.length === 0) return false;
                if (typeof item === 'object' && Object.keys(item).length === 0) return false;
                return hasMeaningfulData(item);
            });
        }
        
        return true;
    };

    const visibleFormIds = loan.visible_form_ids || [1, 2, 3, 4, 5];
    
    const isFormSaved = (id: number): boolean => {
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
    };

    const savedFormIds = visibleFormIds.filter((id) => isFormSaved(id));
    const savedFormCount = savedFormIds.length;
    const totalFormCount = visibleFormIds.length;
    const progressPercent = totalFormCount > 0 ? Math.round((savedFormCount / totalFormCount) * 100) : 0;

    useEffect(() => {
        if (selectedFormId == null && visibleFormIds.length > 0) {
            setSelectedFormId(visibleFormIds[0]);
        }
    }, [selectedFormId, visibleFormIds]);

    // Top-Level Dedicated Print Portal Setup (Guarantees zero blank print output)
    useEffect(() => {
        const handleBeforePrint = () => {
            let portal = document.getElementById('dedicated-print-portal');
            if (!portal) {
                portal = document.createElement('div');
                portal.id = 'dedicated-print-portal';
                document.body.appendChild(portal);
            }
            const sourceEl = formPrintRef.current || document.querySelector('.form-print-area') || document.querySelector('.print-container') || document.querySelector('.printable-area');
            if (sourceEl) {
                portal.innerHTML = sourceEl.innerHTML;
                document.body.classList.add('is-printing-document');
            }
        };

        const handleAfterPrint = () => {
            document.body.classList.remove('is-printing-document');
            const portal = document.getElementById('dedicated-print-portal');
            if (portal) portal.innerHTML = '';
        };

        window.addEventListener('beforeprint', handleBeforePrint);
        window.addEventListener('afterprint', handleAfterPrint);

        return () => {
            window.removeEventListener('beforeprint', handleBeforePrint);
            window.removeEventListener('afterprint', handleAfterPrint);
        };
    }, [activeTab, selectedFormId]);

    const executeDedicatedPrint = (elementToPrint?: HTMLElement | null) => {
        let portal = document.getElementById('dedicated-print-portal');
        if (!portal) {
            portal = document.createElement('div');
            portal.id = 'dedicated-print-portal';
            document.body.appendChild(portal);
        }

        const sourceEl = elementToPrint || formPrintRef.current || document.querySelector('.form-print-area') || document.querySelector('.print-container') || document.querySelector('.printable-area') || document.getElementById('issues-print-area');
        if (sourceEl) {
            portal.innerHTML = sourceEl.innerHTML;
            document.body.classList.add('is-printing-document');
        }

        const cleanup = () => {
            document.body.classList.remove('is-printing-document');
            if (portal) portal.innerHTML = '';
            window.removeEventListener('afterprint', cleanup);
        };

        window.addEventListener('afterprint', cleanup);

        setTimeout(() => {
            window.print();
            setTimeout(cleanup, 1200);
        }, 100);
    };

    const printFormContent = () => {
        if (activeTab !== 'forms') {
            setActiveTab('forms');
            setTimeout(() => executeDedicatedPrint(formPrintRef.current), 200);
        } else {
            executeDedicatedPrint(formPrintRef.current);
        }
    };

    const handleTopPrintClick = () => {
        if (activeTab === 'forms') {
            printFormContent();
        } else if (activeTab === 'details') {
            const detailsEl = document.querySelector('.printable-area') as HTMLElement;
            executeDedicatedPrint(detailsEl);
        } else if (activeTab === 'issues') {
            const issuesEl = document.getElementById('issues-print-area') as HTMLElement;
            executeDedicatedPrint(issuesEl);
        } else {
            printFormContent();
        }
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

    const issues = loan.issues ?? [];
    const pendingIssues = issues.filter((issue) => issue.status === 'pending');
    const unansweredIssues = issues.filter((issue) => issue.status === 'pending' && !issue.response_message);
    const hasRepliedIssues = issues.some((issue) => Boolean(issue.response_message));

    const handleApprove = () => {
        const unansweredIssuesList = loan.issues?.filter(issue => issue.status === 'pending' && !issue.response_message) || [];
        if (unansweredIssuesList.length > 0) {
            alert('জোন থেকে ব্যাখ্যা/জবাব না পাওয়া পর্যন্ত অনুমোদন করা যাবে না।');
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
        color: 'bg-slate-100 text-slate-800 border-slate-300',
        icon: AlertCircle,
    };
    const StatusIcon = statusInfo.icon || AlertCircle;
    
    const loanProduct = loan.loan_product || loan.loanProduct;
    const loanCategory = loan.loan_category || loan.loanCategory;
    const applicant = loan.submittedBy || loan.submitted_by;

    /** Calculate stage index for timeline pipeline */
    const getStageIndex = () => {
        switch (loan.status) {
            case 'draft':
                return 0;
            case 'submitted':
            case 'under_review':
            case 'ready_for_head_office':
                return 1;
            case 'pending_head_office':
            case 'needs_correction':
                return 2;
            case 'approved':
            case 'pending_disbursement':
                return 3;
            case 'disbursed':
                return 4;
            default:
                return 0;
        }
    };
    const activeStageIndex = getStageIndex();

    /** Get rich plain Bengali explanation of current pending state for Head Office */
    const getPendingStatusExplanation = () => {
        if (unansweredIssues.length > 0) {
            return {
                title: 'পেন্ডিং অবস্থা: হেড অফিসের পর্যবেক্ষণ/সমস্যা প্রেরিত',
                desc: `হেড অফিস থেকে ${unansweredIssues.length} টি সমস্যা/পর্যবেক্ষণ পাঠানো হয়েছে। জোন থেকে উত্তর দেওয়ার পর পুনরায় অনুমোদন করা যাবে।`,
                badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
                cardBg: 'bg-rose-50/90 border-rose-200 text-rose-950',
                iconColor: 'text-rose-600',
            };
        }
        if (pendingIssues.length > 0) {
            return {
                title: 'পেন্ডিং অবস্থা: জোনাল ব্যাখ্যা প্রাপ্ত — অনুমোদনের জন্য প্রস্তুত',
                desc: 'আপত্তির প্রেক্ষিতে জোনাল ম্যানেজারের ব্যাখ্যা পাওয়া গেছে। পর্যালোচনা করে এখন অনুমোদন সম্পন্ন করতে পারেন।',
                badgeColor: 'bg-sky-100 text-sky-800 border-sky-300',
                cardBg: 'bg-sky-50/90 border-sky-200 text-sky-950',
                iconColor: 'text-sky-600',
            };
        }
        switch (loan.status) {
            case 'draft':
                return {
                    title: 'পেন্ডিং অবস্থা: খসড়া — শাখা পর্যায়ে পূরণাধীন',
                    desc: 'আবেদনটি বর্তমানে শাখায় খসড়া অবস্থায় আছে এবং হেড অফিসে জমা দেওয়া হয়নি।',
                    badgeColor: 'bg-slate-100 text-slate-800 border-slate-300',
                    cardBg: 'bg-slate-50 border-slate-200 text-slate-900',
                    iconColor: 'text-slate-600',
                };
            case 'submitted':
            case 'under_review':
                return {
                    title: 'পেন্ডিং অবস্থা: শাখা ব্যবস্থাপকের পর্যালোচনাধীন',
                    desc: 'আবেদনটি বর্তমানে শাখা ব্যবস্থাপক কর্তৃক অনুমোদনের অপেক্ষায় রয়েছে। শাখা অনুমোদিত হলে হেড অফিসে আসবে।',
                    badgeColor: 'bg-yellow-100 text-yellow-900 border-yellow-300',
                    cardBg: 'bg-yellow-50/90 border-yellow-200 text-yellow-950',
                    iconColor: 'text-yellow-600',
                };
            case 'ready_for_head_office':
                return {
                    title: 'পেন্ডিং অবস্থা: শাখা অনুমোদিত — হেড অফিসে পাঠানো বাকি',
                    desc: 'শাখা থেকে আবেদনটি অনুমোদিত হয়েছে এবং হেড অফিসে পাঠানোর প্রক্রিয়ায় রয়েছে।',
                    badgeColor: 'bg-indigo-100 text-indigo-900 border-indigo-300',
                    cardBg: 'bg-indigo-50/90 border-indigo-200 text-indigo-950',
                    iconColor: 'text-indigo-600',
                };
            case 'pending_head_office':
                return {
                    title: 'পেন্ডিং অবস্থা: হেড অফিসে চূড়ান্ত অনুমোদনের জন্য অপেক্ষমাণ',
                    desc: 'আবেদনটি যাচাই-বাছাই করুন। তথ্য সঠিক থাকলে "অনুমোদন" বাটনে ক্লিক করুন, অথবা ত্রুটি থাকলে "সমস্যা লিখে পাঠান"।',
                    badgeColor: 'bg-indigo-100 text-indigo-900 border-indigo-300',
                    cardBg: 'bg-indigo-50/90 border-indigo-200 text-indigo-950',
                    iconColor: 'text-indigo-600',
                };
            case 'approved':
            case 'pending_disbursement':
                return {
                    title: 'অনুমোদিত অবস্থা: হেড অফিস কর্তৃক ঋণ অনুমোদিত — বিতরণ অপেক্ষমাণ',
                    desc: 'হেড অফিস থেকে আবেদনটি অনুমোদিত হয়েছে। শাখা পর্যায়ে বিতরণ প্রক্রিয়া সম্পন্ন হবে।',
                    badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
                    cardBg: 'bg-emerald-50/90 border-emerald-200 text-emerald-950',
                    iconColor: 'text-emerald-600',
                };
            case 'disbursed':
                return {
                    title: 'সম্পন্ন অবস্থা: ঋণ সফলভাবে বিতরণ করা হয়েছে',
                    desc: 'এই আবেদনের সকল প্রক্রিয়া ও অর্থ বিতরণ সফলভাবে সম্পন্ন হয়েছে।',
                    badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
                    cardBg: 'bg-emerald-50/90 border-emerald-200 text-emerald-950',
                    iconColor: 'text-emerald-600',
                };
            case 'rejected':
                return {
                    title: 'বর্তমান অবস্থা: ঋণ আবেদনটি প্রত্যাখ্যাত/বাতিল',
                    desc: 'আবেদনটি হেড অফিস বা কর্তৃপক্ষ কর্তৃক বাতিল ঘোষণা করা হয়েছে।',
                    badgeColor: 'bg-rose-100 text-rose-900 border-rose-300',
                    cardBg: 'bg-rose-50/90 border-rose-200 text-rose-950',
                    iconColor: 'text-rose-600',
                };
            default:
                return {
                    title: `বর্তমান অবস্থা: ${statusInfo?.label || loan.status}`,
                    desc: 'আবেদনের কাজ প্রক্রিয়াধীন রয়েছে।',
                    badgeColor: 'bg-slate-100 text-slate-800 border-slate-300',
                    cardBg: 'bg-slate-50 border-slate-200 text-slate-900',
                    iconColor: 'text-slate-600',
                };
        }
    };

    const pendingStatusInfo = getPendingStatusExplanation();

    const renderFormPreview = (formId: number, isBlank: boolean) => {
        const data = isBlank
            ? undefined
            : formId === 1
              ? loan.loan_agreement_data
              : formId === 2
                ? loan.guarantor_info
                : formId === 3
                  ? loan.nominee_info
                  : formId === 4
                    ? loan.asset_info
                    : loan.business_plan;
        
        const previewAmount = loan.approved_amount != null && Number(loan.approved_amount) > 0 
            ? Number(loan.approved_amount) 
            : Number(loan.requested_amount);

        const common = {
            onlyPreview: true as const,
            embedded: true as const,
            savedData: data,
            existingApplication: loan,
            member: memberAdmission,
            loanProduct: loanProduct,
            loanCategory: loanCategory,
            requestedAmount: previewAmount,
            branch: loan.branch,
        };

        switch (formId) {
            case 1:
                return <LoanAgreement {...common} />;
            case 2:
                return <GuarantorCommitment {...common} />;
            case 3:
                return <DeathRiskFund {...common} />;
            case 4:
                return <FieldInvestigation {...common} />;
            case 5:
                return <LoanApplicationApproval {...common} />;
            default:
                return null;
        }
    };

    const selectedSaved = selectedFormId !== null && isFormSaved(selectedFormId);
    const useBlankPreview = printBlank || !selectedSaved;

    return (
        <AdminLayout>
            <Head title={`ঋণ আবেদন - ${memberNo}`}>
                <style>{`
                    @media print {
                        @page { size: A4 portrait; margin: 10mm 12mm; }
                        html, body {
                            background: white !important;
                            color: black !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            height: auto !important;
                            overflow: visible !important;
                        }
                        
                        body.is-printing-document > *:not(#dedicated-print-portal) {
                            display: none !important;
                        }

                        #dedicated-print-portal {
                            display: block !important;
                            visibility: visible !important;
                            position: absolute !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: 100% !important;
                            max-width: 100% !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            background: white !important;
                            box-shadow: none !important;
                            z-index: 9999999 !important;
                        }

                        #dedicated-print-portal,
                        #dedicated-print-portal * {
                            visibility: visible !important;
                            font-family: Kalpurush, Arial, sans-serif !important;
                        }

                        #dedicated-print-portal .font-mono,
                        #dedicated-print-portal .font-mono * {
                            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
                        }

                        body:not(.is-printing-document) body * { 
                            visibility: hidden !important; 
                        }
                        body:not(.is-printing-document) .form-print-area, 
                        body:not(.is-printing-document) .form-print-area *, 
                        body:not(.is-printing-document) .print-container, 
                        body:not(.is-printing-document) .print-container *, 
                        body:not(.is-printing-document) .printable-area, 
                        body:not(.is-printing-document) .printable-area *,
                        body:not(.is-printing-document) #issues-print-area, 
                        body:not(.is-printing-document) #issues-print-area * { 
                            visibility: visible !important; 
                            font-family: Kalpurush, Arial, sans-serif !important;
                        }
                        body:not(.is-printing-document) .form-print-area .font-mono,
                        body:not(.is-printing-document) .print-container .font-mono {
                            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
                        }
                        body:not(.is-printing-document) .form-print-area, 
                        body:not(.is-printing-document) .print-container, 
                        body:not(.is-printing-document) .printable-area,
                        body:not(.is-printing-document) #issues-print-area {
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
                        }

                        .print\\:hidden, nav, header, sidebar { 
                            display: none !important; 
                        }
                    }
                `}</style>
            </Head>

            <div className="py-3 sm:py-6 bg-slate-50/60 min-h-screen">
                <div className="mx-auto max-w-7xl px-2.5 sm:px-6 lg:px-8 space-y-3.5">
                    
                    {/* Flash Messages */}
                    {flash?.success && (
                        <div className="p-3.5 sm:p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-2xs">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            {flash.success}
                        </div>
                    )}
                    {flash?.error && (
                        <div className="p-3.5 sm:p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-2xs">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                            {flash.error}
                        </div>
                    )}

                    {/* Header Bar - Fully Mobile Responsive */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-5 rounded-2xl shadow-xs border border-slate-200/80 print:hidden">
                        <div className="flex items-center gap-3">
                            <Link href="/head-office/loan-applications">
                                <Button variant="outline" size="icon" className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl hover:bg-slate-100 transition shrink-0">
                                    <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" />
                                </Button>
                            </Link>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h2 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">ঋণ আবেদন হাব</h2>
                                    
                                    <Badge variant="outline" className="font-mono text-[11px] sm:text-xs text-indigo-700 bg-indigo-50 border-indigo-200 font-semibold px-2 py-0.5">
                                        আবেদন নং: {loan.application_no || '-'}
                                    </Badge>

                                    <Badge className={`${statusInfo?.color || 'bg-slate-100 text-slate-800'} text-[11px] sm:text-xs font-medium border px-2 py-0.5`}>
                                        <StatusIcon className="w-3 h-3 mr-1 inline" />
                                        {statusInfo?.label || loan.status}
                                    </Badge>
                                </div>
                                <p className="text-[11px] sm:text-xs text-slate-500 mt-1 font-medium break-words flex items-center gap-1.5 flex-wrap">
                                    <span>মেম্বার কোড: <span className="font-mono font-bold text-blue-700">{memberNo || '-'}</span></span>
                                    {loan.status !== 'disbursed' && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const p = parseMemberCode(memberNo, branchPrefix);
                                                setSerialInput(p.serial);
                                                setMemberCodeModalOpen(true);
                                            }}
                                            className="inline-flex items-center gap-1 text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200 font-semibold cursor-pointer transition shadow-2xs"
                                            title="ঋণ বিতরণের পূর্বে মেম্বার কোড পরিবর্তন করুন"
                                        >
                                            <Edit className="w-3 h-3 text-indigo-600" /> কোড পরিবর্তন
                                        </button>
                                    )}
                                    <span className="text-slate-300 mx-1">|</span>
                                    <span>সদস্য: <span className="font-bold text-slate-800">{memberName || '-'}</span></span>
                                    <span className="text-slate-300 mx-1">|</span>
                                    <span>শাখা: <span className="font-medium text-slate-700">{loan.branch?.name || '-'}</span></span>
                                    {loan.created_at && (
                                        <>
                                            <span className="text-slate-300 mx-1">|</span>
                                            <span>আবেদন: <span className="font-medium text-slate-700">{formatDate(loan.created_at)}</span></span>
                                        </>
                                    )}
                                    {loan.submitted_at && (
                                        <>
                                            <span className="text-slate-300 mx-1">|</span>
                                            <span>জমা: <span className="font-medium text-slate-700">{formatDate(loan.submitted_at)}</span></span>
                                        </>
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Primary Action Buttons Bar */}
                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                            {loan.superadmin_can_pin_edit && (
                                <Button
                                    className="rounded-xl text-xs sm:text-sm h-9 sm:h-10 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs font-semibold"
                                    onClick={() => {
                                        if (loan.superadmin_edit_unlocked) {
                                            router.visit(`/member/loan-applications/${loan.id}`);
                                            return;
                                        }
                                        setPinModalOpen(true);
                                    }}
                                >
                                    <Lock className="w-3.5 h-3.5 mr-1.5" />
                                    {loan.superadmin_edit_unlocked ? 'ফর্ম এডিট করুন' : 'PIN দিয়ে ফর্ম এডিট'}
                                </Button>
                            )}
                            {canModify && loan.status !== 'draft' && loan.status !== 'disbursed' && loan.status !== 'cancelled' && (
                                <Button
                                    variant="outline"
                                    onClick={() => setShowModificationModal(true)}
                                    className="rounded-xl text-xs sm:text-sm h-9 sm:h-10 border-slate-300 hover:bg-slate-100"
                                >
                                    <Wrench className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                                    Modification
                                </Button>
                            )}

                            <Button 
                                variant="outline" 
                                onClick={() => setShowIssueModal(true)}
                                disabled={loan.status === 'approved' || loan.status === 'disbursed'}
                                title={loan.status === 'approved' || loan.status === 'disbursed' ? 'অনুমোদিত আবেদনে সমস্যা পাঠানো যাবে না' : ''}
                                className="rounded-xl text-xs sm:text-sm h-9 sm:h-10 border-amber-300 bg-amber-50/50 text-amber-900 hover:bg-amber-100/80"
                            >
                                <AlertCircle className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                                সমস্যা লিখে পাঠান
                            </Button>

                            {loan.status === 'pending_head_office' && (
                                <>
                                    {unansweredIssues.length === 0 && (
                                        <Button 
                                            onClick={handleApprove} 
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs font-bold rounded-xl text-xs sm:text-sm h-9 sm:h-10"
                                        >
                                            <CheckCircle2 className="w-4 h-4 mr-1.5" />
                                            অনুমোদন করুন
                                        </Button>
                                    )}
                                    <Button 
                                        variant="destructive" 
                                        onClick={() => setShowRejectModal(true)}
                                        className="rounded-xl text-xs sm:text-sm h-9 sm:h-10"
                                    >
                                        <XCircle className="w-4 h-4 mr-1.5" />
                                        প্রত্যাখ্যান
                                    </Button>
                                </>
                            )}

                            <Button 
                                variant="outline" 
                                onClick={handleTopPrintClick}
                                className="rounded-xl text-xs sm:text-sm h-9 sm:h-10 hover:bg-slate-100"
                            >
                                <Printer className="w-3.5 h-3.5 mr-1.5 text-slate-700" />
                                প্রিন্ট
                            </Button>
                        </div>
                    </div>

                    {/* APPLICATION LIFECYCLE PIPELINE STEPPER & PENDING STATUS HIGHLIGHT */}
                    <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3.5 print:hidden">
                        
                        {/* Status Pipeline Stepper */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                                <span className="flex items-center gap-1.5 font-bold text-slate-800">
                                    <Activity className="w-4 h-4 text-indigo-600" /> ঋণের পর্যায়ক্রমিক প্রক্রিয়া (Timeline Tracker)
                                </span>
                                <span>ধাপ {activeStageIndex + 1} / ৫</span>
                            </div>

                            <div className="overflow-x-auto pb-1 -mx-1 px-1">
                                <div className="flex items-center min-w-[580px] sm:min-w-0 justify-between relative">
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

                        {/* Clear Plain Bengali Pending Status Callout Card */}
                        <div className={`p-3.5 sm:p-4 rounded-xl border flex items-start gap-3 transition shadow-2xs ${pendingStatusInfo.cardBg}`}>
                            <div className={`p-2 bg-white/90 rounded-xl shrink-0 shadow-xs ${pendingStatusInfo.iconColor}`}>
                                <Info className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                    <h4 className="text-sm font-bold text-slate-900">{pendingStatusInfo.title}</h4>
                                    <Badge className={`${pendingStatusInfo.badgeColor} font-mono text-[10px] px-2 py-0.2`}>
                                        {statusInfo?.label || loan.status}
                                    </Badge>
                                </div>
                                <p className="text-xs text-slate-700 leading-relaxed">{pendingStatusInfo.desc}</p>

                                {loan.status === 'pending_head_office' && unansweredIssues.length === 0 && (
                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                        <Button
                                            size="sm"
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs"
                                            onClick={handleApprove}
                                        >
                                            <ShieldCheck className="w-4 h-4 mr-1" />
                                            এখান থেকেই আবেদনটি অনুমোদন করুন
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="border-amber-300 bg-white text-amber-900 hover:bg-amber-50 rounded-lg text-xs font-semibold"
                                            onClick={() => setShowIssueModal(true)}
                                        >
                                            <AlertCircle className="w-3.5 h-3.5 mr-1 text-amber-600" />
                                            পর্যবেক্ষণ / সমস্যা পাঠান
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Executive Summary Metrics Ribbon */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 print:hidden">
                        <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-2.5 sm:gap-3">
                            <div className="p-2 sm:p-2.5 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                                <User className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-400">সদস্যের নাম</p>
                                <p className="text-xs sm:text-sm font-bold text-slate-900 truncate" title={memberName}>{memberName}</p>
                                <div className="flex items-center gap-1 mt-0.5">
                                    <PhoneCallLink
                                        phone={memberAdmission?.mobile_number || memberAdmission?.mobile_no}
                                        className="font-mono text-[11px] text-blue-700 font-semibold truncate"
                                        iconClassName="w-3 h-3 text-blue-500"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-2.5 sm:gap-3">
                            <div className="p-2 sm:p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
                                <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-400">ঋণ প্রোডাক্ট</p>
                                <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                    {loanProduct?.product_name_bn || loanProduct?.product_name || '-'}
                                </p>
                                <p className="text-[10px] sm:text-xs text-slate-500 truncate">
                                    {loanCategory?.category_name_bn || loanCategory?.category_name || '-'}
                                </p>
                            </div>
                        </div>

                        <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-2.5 sm:gap-3">
                            <div className="p-2 sm:p-2.5 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
                                <Banknote className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-400">আবেদিত / অনুমোদিত</p>
                                <p className="text-xs sm:text-sm font-bold text-emerald-700 truncate">
                                    ৳{Number(loan.requested_amount || 0).toLocaleString('bn-BD')}
                                </p>
                                {loan.approved_amount != null && (
                                    <p className="text-[10px] sm:text-xs text-slate-500 truncate">
                                        অনুমোদিত: ৳{Number(loan.approved_amount).toLocaleString('bn-BD')}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-2.5 sm:gap-3">
                            <div className="p-2 sm:p-2.5 bg-amber-50 text-amber-600 rounded-xl shrink-0">
                                <FileCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between text-[10px] sm:text-xs mb-1">
                                    <span className="font-semibold text-slate-600">ফর্ম সম্পন্ন</span>
                                    <span className="font-bold text-amber-700">{savedFormCount}/{totalFormCount}</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-1.5 sm:h-2 overflow-hidden">
                                    <div 
                                        className="bg-amber-500 h-full rounded-full transition-all duration-300"
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Urgent Action Banner for Pending Issues */}
                    {pendingIssues.length > 0 && (
                        <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-3.5 sm:p-4 text-xs sm:text-sm text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 print:hidden shadow-xs">
                            <div className="flex items-start gap-2.5">
                                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-amber-600 mt-0.5" />
                                <div>
                                    <p className="font-bold text-amber-900">হেড অফিস থেকে {pendingIssues.length} টি সমস্যা পাঠানো হয়েছে</p>
                                    <p className="text-xs text-amber-800 mt-0.5">
                                        শাখা থেকে এখনও সমাধান বা উত্তর পাওয়া যায়নি।
                                    </p>
                                </div>
                            </div>
                            <Button 
                                size="sm" 
                                className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white shrink-0 rounded-xl text-xs font-semibold"
                                onClick={() => setActiveTab('issues')}
                            >
                                <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                                সমস্যা দেখুন ({pendingIssues.length})
                            </Button>
                        </div>
                    )}

                    {/* Navigation Tabs Bar */}
                    <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden print:hidden">
                        <div className="flex border-b border-slate-200 bg-slate-50/50 p-1 sm:p-1.5 gap-1 overflow-x-auto">
                            <button
                                type="button"
                                onClick={() => setActiveTab('forms')}
                                className={[
                                    'flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition whitespace-nowrap flex-1 sm:flex-initial justify-center',
                                    activeTab === 'forms'
                                        ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80 font-bold'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60',
                                ].join(' ')}
                            >
                                <FileText className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${activeTab === 'forms' ? 'text-indigo-600' : 'text-slate-400'}`} />
                                📄 ঋণ আবেদন ফর্মসমূহ
                                <Badge className={`ml-1 text-[10px] ${activeTab === 'forms' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-700'}`}>
                                    {savedFormCount}/{totalFormCount}
                                </Badge>
                            </button>

                            <button
                                type="button"
                                onClick={() => setActiveTab('details')}
                                className={[
                                    'flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition whitespace-nowrap flex-1 sm:flex-initial justify-center',
                                    activeTab === 'details'
                                        ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80 font-bold'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60',
                                ].join(' ')}
                            >
                                <User className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${activeTab === 'details' ? 'text-indigo-600' : 'text-slate-400'}`} />
                                👤 সদস্য ও ঋণ বিস্তারিত
                            </button>

                            <button
                                type="button"
                                onClick={() => setActiveTab('issues')}
                                className={[
                                    'flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition whitespace-nowrap flex-1 sm:flex-initial justify-center',
                                    activeTab === 'issues'
                                        ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80 font-bold'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60',
                                ].join(' ')}
                            >
                                <MessageSquare className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${activeTab === 'issues' ? 'text-indigo-600' : 'text-slate-400'}`} />
                                💬 সমস্যা ও পর্যবেক্ষণ
                                {issues.length > 0 && (
                                    <Badge className={`ml-1 text-[10px] ${pendingIssues.length > 0 ? 'bg-amber-500 text-white animate-pulse' : 'bg-slate-200 text-slate-700'}`}>
                                        {pendingIssues.length > 0 ? `${pendingIssues.length} পেন্ডিং` : issues.length}
                                    </Badge>
                                )}
                            </button>
                        </div>

                        {/* TAB 1: FORMS WORKSPACE */}
                        {activeTab === 'forms' && (
                            <div className="p-3.5 sm:p-6 space-y-4">
                                
                                {/* Form Selector Pills */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">ফর্ম নির্বাচন করুন</p>
                                        <p className="text-[10px] sm:text-xs text-slate-500">সবুজ = সেভকৃত ডাটা আছে</p>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-2.5">
                                        {visibleFormIds.map((id) => {
                                            const saved = isFormSaved(id);
                                            const selected = selectedFormId === id;

                                            return (
                                                <button
                                                    key={id}
                                                    type="button"
                                                    onClick={() => setSelectedFormId(id)}
                                                    className={[
                                                        'text-left rounded-xl p-2.5 sm:p-3 border text-xs transition flex flex-col justify-between relative overflow-hidden',
                                                        selected
                                                            ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-300/60 shadow-xs'
                                                            : saved
                                                                ? 'border-emerald-200 bg-emerald-50/40 hover:border-emerald-400'
                                                                : 'border-slate-200 bg-white hover:border-slate-300',
                                                    ].join(' ')}
                                                >
                                                    <div className="flex items-start justify-between gap-1 mb-1 sm:mb-1.5">
                                                        <span className="font-bold text-slate-900 line-clamp-1 text-[11px] sm:text-xs">
                                                            {FORM_NAMES[id] || `ফর্ম ${id}`}
                                                        </span>
                                                        {saved ? (
                                                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[9px] sm:text-[10px] shrink-0 font-medium px-1 sm:px-1.5">
                                                                <Check className="w-2.5 h-2.5 mr-0.5 inline" /> সেভ
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="text-[9px] sm:text-[10px] text-slate-500 shrink-0 px-1 sm:px-1.5">
                                                                খসড়া
                                                            </Badge>
                                                        )}
                                                    </div>

                                                    <p className="text-[10px] sm:text-[11px] text-slate-500 mt-auto line-clamp-1">
                                                        <span className="font-semibold text-slate-700">দায়িত্ব:</span> {FORM_FILLERS[id]}
                                                    </p>

                                                    {selected && (
                                                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600" />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Active Form Control & Viewer Container */}
                                {selectedFormId !== null && (
                                    <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
                                        
                                        {/* Form Toolbar */}
                                        <div className="bg-slate-50/80 px-3.5 sm:px-6 py-3 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                                                        {FORM_NAMES[selectedFormId]}
                                                    </h3>
                                                    {useBlankPreview ? (
                                                        <Badge variant="outline" className="text-[10px] sm:text-xs border-slate-300 bg-white text-slate-700">
                                                            ভর্তি তথ্যসহ টেমপ্লেট
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-emerald-100 text-emerald-800 text-[10px] sm:text-xs border-emerald-200">
                                                            সেভকৃত ডাটা
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                                                    পূরণ করেন: <strong className="text-slate-700">{FORM_FILLERS[selectedFormId]}</strong>
                                                </p>
                                            </div>

                                            {/* Action buttons inside form toolbar */}
                                            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                                                {selectedSaved && (
                                                    <Button
                                                        variant={printBlank ? 'default' : 'outline'}
                                                        size="sm"
                                                        className="rounded-xl text-xs flex-1 sm:flex-initial"
                                                        onClick={() => setPrintBlank((v) => !v)}
                                                    >
                                                        {printBlank ? 'সেভকৃত প্রিভিউ' : 'ব্ল্যাংক প্রিন্ট মোড'}
                                                    </Button>
                                                )}

                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="rounded-xl text-xs flex-1 sm:flex-initial hover:bg-slate-100"
                                                    onClick={printFormContent}
                                                >
                                                    <Printer className="w-3.5 h-3.5 mr-1.5" />
                                                    এই ফর্ম প্রিন্ট
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Form Document Preview Container */}
                                        <div className="p-1 sm:p-6 bg-slate-100/30 overflow-x-auto">
                                            <div ref={formPrintRef} className="form-print-area print-container printable-area space-y-3 text-sm min-w-full overflow-x-auto">
                                                {renderFormPreview(selectedFormId, useBlankPreview)}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {visibleFormIds.length === 0 && (
                                    <div className="text-center py-12 text-slate-500 text-sm">
                                        এই আবেদনের জন্য কোনো ফর্ম প্রযোজ্য নয়।
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB 2: MEMBER & LOAN DETAILS OVERVIEW */}
                        {activeTab === 'details' && (
                            <div className="printable-area p-3.5 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                                <Card className="border-slate-200/80 shadow-xs rounded-2xl overflow-hidden">
                                    <CardHeader className="bg-slate-50/60 pb-3 border-b">
                                        <CardTitle className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                                            <User className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" /> সদস্যের বিস্তারিত তথ্য
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-3.5 sm:p-4 space-y-2.5 sm:space-y-3 text-xs sm:text-sm">
                                        <div className="flex justify-between py-1.5 border-b border-slate-100">
                                            <span className="text-slate-500">মেম্বার কোড:</span>
                                            <span className="font-mono font-bold text-indigo-700">{memberNo || '-'}</span>
                                        </div>
                                        <div className="flex justify-between py-1.5 border-b border-slate-100">
                                            <span className="text-slate-500">নাম (বাংলা/ইংরেজি):</span>
                                            <span className="font-semibold text-slate-900">{memberName}</span>
                                        </div>
                                        <div className="flex justify-between py-1.5 border-b border-slate-100">
                                            <span className="text-slate-500">জাতীয় পরিচয়পত্র (NID):</span>
                                            <span className="font-semibold text-slate-900">{memberAdmission?.nid_number || memberAdmission?.nid_no || '-'}</span>
                                        </div>
                                        <div className="flex justify-between py-1.5 border-b border-slate-100">
                                            <span className="text-slate-500">মোবাইল নম্বর:</span>
                                            <PhoneCallLink
                                                phone={memberAdmission?.mobile_number || memberAdmission?.mobile_no}
                                                className="font-mono font-semibold text-blue-700"
                                                iconClassName="w-3.5 h-3.5 text-blue-500"
                                            />
                                        </div>
                                        <div className="flex justify-between py-1.5 border-b border-slate-100">
                                            <span className="text-slate-500">বর্তমান ঠিকানা:</span>
                                            <span className="font-medium text-slate-800 text-right max-w-[200px] sm:max-w-[240px]">
                                                {memberAdmission?.present_village_road || memberAdmission?.present_address_en || '-'}
                                            </span>
                                        </div>
                                        {applicant && (
                                            <div className="flex justify-between py-1.5">
                                                <span className="text-slate-500">জমা প্রদানকারী:</span>
                                                <span className="font-semibold text-slate-900">{applicant.name}</span>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                <Card className="border-slate-200/80 shadow-xs rounded-2xl overflow-hidden">
                                    <CardHeader className="bg-slate-50/60 pb-3 border-b">
                                        <CardTitle className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                                            <Banknote className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" /> ঋণ বিবরণ ও শর্তাবলী
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-3.5 sm:p-4 space-y-2.5 sm:space-y-3 text-xs sm:text-sm">
                                        <div className="flex justify-between py-1.5 border-b border-slate-100">
                                            <span className="text-slate-500">আবেদন নং:</span>
                                            <span className="font-mono font-bold text-indigo-700">{loan.application_no || '-'}</span>
                                        </div>
                                        <div className="flex justify-between py-1.5 border-b border-slate-100">
                                            <span className="text-slate-500">ঋণ ক্যাটাগরি:</span>
                                            <span className="font-semibold text-slate-900">
                                                {loanCategory?.category_name_bn || loanCategory?.category_name || '-'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between py-1.5 border-b border-slate-100">
                                            <span className="text-slate-500">ঋণ পণ্য:</span>
                                            <span className="font-semibold text-slate-900">
                                                {loanProduct?.product_name_bn || loanProduct?.product_name || '-'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between py-1.5 border-b border-slate-100">
                                            <span className="text-slate-500">আবেদিত ঋণ পরিমাণ:</span>
                                            <span className="font-bold text-slate-900">৳{Number(loan.requested_amount || 0).toLocaleString('bn-BD')}</span>
                                        </div>
                                        {loan.approved_amount != null && (
                                            <div className="flex justify-between py-1.5 border-b border-slate-100">
                                                <span className="text-slate-500">অনুমোদিত পরিমাণ:</span>
                                                <span className="font-bold text-emerald-700">৳{Number(loan.approved_amount).toLocaleString('bn-BD')}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between py-1.5 border-b border-slate-100">
                                            <span className="text-slate-500">শাখা:</span>
                                            <span className="font-semibold text-slate-900">{loan.branch?.name || '-'}</span>
                                        </div>
                                        {(loan.samity || memberAdmission?.samity) && (
                                            <div className="flex justify-between py-1.5 border-b border-slate-100">
                                                <span className="text-slate-500">সমিতি:</span>
                                                <span className="font-semibold text-slate-900">
                                                    {loan.samity?.samity_name_bn || loan.samity?.samity_name || memberAdmission?.samity?.samity_name_bn || memberAdmission?.samity?.samity_name || '-'}
                                                </span>
                                            </div>
                                        )}
                                        {loan.purpose_of_loan && (
                                            <div className="flex justify-between py-1.5">
                                                <span className="text-slate-500">ঋণের উদ্দেশ্য:</span>
                                                <span className="font-semibold text-slate-900 text-right max-w-[200px] sm:max-w-[240px]">{loan.purpose_of_loan}</span>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* TAB 3: ISSUES & INQUIRIES WORKSPACE */}
                        {activeTab === 'issues' && (
                            <div className="p-3.5 sm:p-6 space-y-4">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                    <div>
                                        <h3 className="font-bold text-slate-900 text-sm sm:text-base">হেড অফিস পর্যবেক্ষণ ও সমস্যা ট্র্যাকার</h3>
                                        <p className="text-xs text-slate-500">হেড অফিস থেকে উত্থাপিত সমস্যা এবং শাখা থেকে প্রদত্ত উত্তর</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            onClick={() => setShowIssueModal(true)}
                                            disabled={loan.status === 'approved' || loan.status === 'disbursed'}
                                            className="rounded-xl text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-xs"
                                        >
                                            <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
                                            নতুন সমস্যা লিখুন
                                        </Button>
                                    </div>
                                </div>

                                {issues.length === 0 ? (
                                    <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                        <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                                        <p className="font-bold text-slate-700 text-sm">কোনো সমস্যা বা পর্যবেক্ষণ নেই</p>
                                        <p className="text-xs text-slate-500 mt-1">আবেদনটিতে কোনো ত্রুটি পাওয়া গেলে উপরে "নতুন সমস্যা লিখুন" বাটনে ক্লিক করুন।</p>
                                    </div>
                                ) : (
                                    <div id="issues-print-area" className="space-y-3">
                                        {issues.map((issue) => (
                                            <div 
                                                key={issue.id} 
                                                className={`p-4 border rounded-2xl text-xs sm:text-sm shadow-2xs ${
                                                    issue.status === 'pending' 
                                                        ? 'bg-amber-50/80 border-amber-200' 
                                                        : issue.status === 'resolved'
                                                        ? 'bg-emerald-50/80 border-emerald-200'
                                                        : 'bg-rose-50/80 border-rose-200'
                                                }`}
                                            >
                                                {/* Issue Question */}
                                                <div className={`p-3.5 rounded-xl mb-3 ${
                                                    issue.status === 'pending' 
                                                        ? 'bg-amber-100/90' 
                                                        : issue.status === 'resolved'
                                                        ? 'bg-emerald-100/90'
                                                        : 'bg-rose-100/90'
                                                }`}>
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                                                <AlertCircle className={`w-4 h-4 ${
                                                                    issue.status === 'pending' 
                                                                        ? 'text-amber-700' 
                                                                        : issue.status === 'resolved'
                                                                        ? 'text-emerald-700'
                                                                        : 'text-rose-700'
                                                                }`} />
                                                                <span className={`font-bold ${
                                                                    issue.status === 'pending' 
                                                                        ? 'text-amber-950' 
                                                                        : issue.status === 'resolved'
                                                                        ? 'text-emerald-950'
                                                                        : 'text-rose-950'
                                                                }`}>
                                                                    হেড অফিস বার্তা
                                                                </span>
                                                                <Badge className={`${
                                                                    issue.status === 'pending' 
                                                                        ? 'bg-amber-200 text-amber-900 border-amber-300' 
                                                                        : issue.status === 'resolved'
                                                                        ? 'bg-emerald-200 text-emerald-900 border-emerald-300'
                                                                        : 'bg-rose-200 text-rose-900 border-rose-300'
                                                                } text-[10px]`}>
                                                                    {issue.status === 'pending' ? 'পেন্ডিং' : issue.status === 'resolved' ? 'সমাধান করা হয়েছে' : 'প্রত্যাখ্যাত'}
                                                                </Badge>
                                                            </div>
                                                            <p className={`${
                                                                issue.status === 'pending' 
                                                                    ? 'text-amber-950' 
                                                                    : issue.status === 'resolved'
                                                                    ? 'text-emerald-950'
                                                                    : 'text-rose-950'
                                                            } leading-relaxed`}>
                                                                {issue.issue_description}
                                                            </p>
                                                            <p className={`text-[11px] mt-2 font-medium ${
                                                                issue.status === 'pending' 
                                                                    ? 'text-amber-800' 
                                                                    : issue.status === 'resolved'
                                                                    ? 'text-emerald-800'
                                                                    : 'text-rose-800'
                                                            }`}>
                                                                — {issue.reporter?.name || 'হেড অফিস কর্মকর্তা'}, {formatDateTime(issue.created_at)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Branch Response */}
                                                {issue.response_message ? (
                                                    <div className="p-3.5 rounded-xl bg-blue-50/90 border border-blue-200">
                                                        <div className="flex items-center gap-2 mb-1.5">
                                                            <MessageSquare className="w-4 h-4 text-blue-700" />
                                                            <span className="font-bold text-blue-950">শাখার উত্তর</span>
                                                        </div>
                                                        <p className="text-blue-950 whitespace-pre-wrap leading-relaxed">{issue.response_message}</p>
                                                        {issue.responder && (
                                                            <p className="text-[11px] font-medium text-blue-700 mt-2">
                                                                — {issue.responder.name}
                                                                {issue.responded_at && `, ${formatDateTime(issue.responded_at)}`}
                                                            </p>
                                                        )}
                                                    </div>
                                                ) : issue.status === 'pending' && (
                                                    <div className="p-2.5 bg-white/80 rounded-xl text-xs text-slate-500 italic border border-slate-200/60">
                                                        শাখা থেকে এখনও কোনো উত্তর পাওয়া যায়নি।
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Issue Modal */}
            {showIssueModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">সমস্যা লিখে পাঠান</h3>
                                <p className="text-xs text-slate-500">সমস্যার বিবরণ লিখুন। শাখা এটি দেখে সংশোধন করবে।</p>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 rounded-full text-slate-400 hover:text-slate-600"
                                onClick={() => { setShowIssueModal(false); reset(); }}
                            >
                                <XCircle className="w-5 h-5" />
                            </Button>
                        </div>
                        <form onSubmit={handleSubmitIssue} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    সমস্যার বিবরণ <span className="text-rose-500">*</span>
                                </label>
                                <textarea
                                    value={data.issue_description}
                                    onChange={(e) => setData('issue_description', e.target.value)}
                                    rows={4}
                                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                                    placeholder="এখানে সমস্যার বিস্তারিত বিবরণ লিখুন..."
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    className="rounded-xl text-xs"
                                    onClick={() => { setShowIssueModal(false); reset(); }}
                                >
                                    বাতিল
                                </Button>
                                <Button 
                                    type="submit" 
                                    disabled={processing}
                                    className="rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs"
                                >
                                    {processing ? 'পাঠানো হচ্ছে...' : 'পাঠান'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
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
                    applicantName: memberName,
                    status: loan.status,
                }}
            />
            <SuperAdminDeletePinModal
                open={pinModalOpen}
                title="ফর্ম এডিট আনলক করুন"
                description="যেকোনো অবস্থার ঋণ আবেদন সম্পাদনা করতে SuperAdmin PIN দিন। এই PIN .env এর SUPERADMIN_DELETE_PIN।"
                processing={pinProcessing}
                onClose={() => setPinModalOpen(false)}
                onConfirm={confirmSuperAdminUnlock}
                confirmLabel="এডিট আনলক"
                processingLabel="যাচাই হচ্ছে..."
                pinLabel="SuperAdmin PIN"
                accent="indigo"
            />

            {/* Member Code Update Modal */}
            {memberCodeModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 print:hidden">
                    <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
                        <div className="border-b px-5 py-4 bg-slate-50 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <Edit className="w-5 h-5 text-indigo-600" /> মেম্বার কোড আপডেট (১০ ডিজিট)
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">প্রথম ৪ ডিজিট শাখা কোড অপরিবর্তনীয়, শেষের ৬ ডিজিট মেম্বার সিরিয়াল।</p>
                            </div>
                            <button type="button" onClick={() => setMemberCodeModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleMemberCodeSubmit} className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">মেম্বার কোড / সিরিয়াল (Member Serial):</label>
                                <div className="flex items-stretch rounded-xl border border-slate-300 overflow-hidden focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 bg-white shadow-xs">
                                    <div className="flex items-center gap-1 bg-slate-100 px-3.5 py-2 border-r border-slate-300 text-xs font-mono font-bold text-slate-600 select-none shrink-0" title="শাখা কোড (অপরিবর্তনীয়)">
                                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                                        <span>{branchPrefix}</span>
                                    </div>
                                    <input
                                        type="text"
                                        value={serialInput}
                                        onChange={(e) => setSerialInput(toEnglishDigits(e.target.value).replace(/\D/g, '').slice(0, 6))}
                                        onBlur={() => {
                                            if (serialInput) setSerialInput(serialInput.padStart(6, '0'));
                                        }}
                                        maxLength={6}
                                        className="w-full border-0 px-3.5 py-2 text-sm font-mono font-bold text-indigo-700 focus:outline-hidden focus:ring-0"
                                        placeholder="000065"
                                        required
                                        autoFocus
                                    />
                                </div>
                                <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 flex-wrap gap-1">
                                    <span>পূর্ণাঙ্গ কোড: <span className="font-mono font-bold text-blue-700">{branchPrefix}{serialInput ? serialInput.padStart(6, '0') : '000001'}</span></span>
                                    <span className="text-[10px] text-slate-400">(যেমন: 65 লিখলে হবে {branchPrefix}000065)</span>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t">
                                <button type="button" className="px-4 py-2 rounded-xl text-xs border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer" onClick={() => setMemberCodeModalOpen(false)}>
                                    বাতিল
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                                    disabled={submittingMemberCode || !serialInput}
                                >
                                    {submittingMemberCode ? 'আপডেট হচ্ছে...' : 'কোড আপডেট করুন'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}

function RejectModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: (reason: string) => void }) {
    const [reason, setReason] = useState('');
    return (
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-rose-100 bg-rose-50/50 flex items-center justify-between">
                <div>
                    <h3 className="text-base font-bold text-rose-800 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-rose-600" /> ঋণ আবেদন প্রত্যাখ্যান
                    </h3>
                    <p className="text-xs text-rose-700/80">প্রত্যাখ্যানের কারণ লিখুন (বাধ্যতামূলক)।</p>
                </div>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-full text-rose-400 hover:text-rose-600"
                    onClick={onClose}
                >
                    <XCircle className="w-5 h-5" />
                </Button>
            </div>
            <div className="p-6 space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                        প্রত্যাখ্যানের কারণ <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition"
                        placeholder="কি কারণে আবেদনটি বাতিল বা প্রত্যাখ্যান করা হচ্ছে তা উল্লেখ করুন..."
                        required
                    />
                </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
                <Button variant="outline" className="rounded-xl text-xs" onClick={onClose}>
                    বাতিল
                </Button>
                <Button 
                    variant="destructive" 
                    className="rounded-xl text-xs font-bold shadow-xs bg-rose-600 hover:bg-rose-700" 
                    onClick={() => onConfirm(reason)}
                >
                    প্রত্যাখ্যান নিশ্চিত করুন
                </Button>
            </div>
        </div>
    );
}
