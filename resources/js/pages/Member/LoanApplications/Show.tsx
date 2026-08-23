import AdminLayout from '@/layouts/admin-layout';
import { formatDate, formatDateTime } from '@/utils/dateUtils';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    ArrowUpRight,
    MessageSquare,
    User,
    Banknote,
    FileCheck,
    CreditCard,
    Check,
    Activity,
    Info,
    ShieldCheck,
    ZoomIn,
    ZoomOut,
    Smartphone,
    Monitor,
    MoveHorizontal,
    RotateCcw,
    Lock,
    X,
} from 'lucide-react';
import SuperAdminDeletePinModal from '@/components/SuperAdminDeletePinModal';
import { toEnglishDigits, formatBranchCode, parseMemberCode } from '@/utils/memberCodeUtils';
import GuarantorCommitment from './Forms/GuarantorCommitment';
import DeathRiskFund from './Forms/DeathRiskFund';
import LoanAgreement from './Forms/LoanAgreement';
import FieldInvestigation from './Forms/FieldInvestigation';
import LoanApplicationApproval from './Forms/LoanApplicationApproval';
import SendLoanToHoModal from '@/components/LoanApplications/SendLoanToHoModal';

interface LoanApplication {
    id: number;
    application_no: string;
    form_type: number | string;
    status: string;
    requested_amount: number;
    approved_amount: number | null;
    disbursed_amount?: number | null;
    disbursed_at?: string | null;
    disbursement_method?: string | null;
    disbursement_reference?: string | null;
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
    loan_product_id?: number;
    loan_category_id?: number;
    pending_approval_id?: number | null;
    can_branch_approve?: boolean;
    must_forward_approval?: boolean;
    escalation_approvers?: Array<{
        id: number;
        name: string;
        email?: string;
        level?: string;
        role_name?: string;
    }>;
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
        smart_card_number?: string;
        mobile_number?: string;
        mobile_no?: string;
        present_village_road?: string;
        present_address_en?: string;
    };
    submitted_by?: { id: number; name: string } | null;
    submittedBy?: { id: number; name: string } | null;
    visible_form_ids?: number[];
    editable_form_ids?: number[];
    superadmin_can_pin_edit?: boolean;
    superadmin_edit_unlocked?: boolean;
    form_saved?: Record<number, boolean>;
    all_forms_complete?: boolean;
    disburse_forms_complete?: boolean;
    can_submit?: boolean;
    can_disburse?: boolean;
    member_admission_status?: string;
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

/** Who is responsible for filling each form */
const FORM_FILLERS: Record<number, string> = {
    1: 'ফিল্ড অফিসার / শাখা ব্যবহারকারী (বিতরণের আগে)',
    2: 'শাখা ব্যবহারকারী (বিতরণের আগে)',
    3: 'শাখা ব্যবহারকারী (বিতরণের আগে)',
    4: 'শাখা ব্যবস্থাপক / শাখা ব্যবহারকারী (বিতরণের আগে)',
    5: 'ফিল্ড অফিসার / শাখা ব্যবহারকারী (বিতরণের আগে)',
};

interface LoanProductOption {
    id: number;
    loan_category_id: number;
    product_name: string;
    product_name_bn?: string;
    product_code?: string;
    interest_rate?: number;
    duration_months?: number;
    installment_type?: string;
    number_of_installments?: number;
    min_amount?: number;
    max_amount?: number;
    is_active?: boolean;
}

interface LoanCategoryOption {
    id: number;
    category_name: string;
    category_name_bn?: string;
    category_code?: string;
    is_active?: boolean;
    loan_products?: LoanProductOption[];
}

interface Props {
    application: LoanApplication;
    routes: {
        index: string;
        edit: string;
        print: string;
        submit: string;
        disburse?: string;
        updateLoanProduct?: string;
    };
    categories?: LoanCategoryOption[];
}

const FORM_ROUTES: Record<number, string> = {
    1: 'loan-agreement',
    2: 'guarantor-commitment',
    3: 'death-risk-fund',
    4: 'field-investigation',
    5: 'loan-application-approval',
};

const statusConfig = {
    draft: { label: 'খসড়া', color: 'bg-slate-100 text-slate-800 border-slate-300', icon: AlertCircle },
    pending: { label: 'অপেক্ষমাণ', color: 'bg-amber-100 text-amber-800 border-amber-300', icon: Clock },
    submitted: { label: 'জমা হয়েছে', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: Clock },
    under_review: { label: 'শাখা পর্যালোচনা', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Clock },
    ready_for_head_office: { label: 'শাখা অনুমোদিত', color: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: CheckCircle2 },
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

export default function Show({ application, routes, categories = [] }: Props) {
    const pageAuth = usePage().props.auth as { user?: { role?: { name: string } } } | undefined;
    const isBranchUser = pageAuth?.user?.role?.name === 'branch_user';
    const isBranchManager = pageAuth?.user?.role?.name === 'branch_manager' || pageAuth?.user?.role?.name === 'super_admin';
    const canRespondToIssues = isBranchUser || isBranchManager;
    const showBranchApproveButton = isBranchManager &&
        !!application.can_branch_approve &&
        !!application.pending_approval_id &&
        (application.status === 'submitted' || application.status === 'under_review');
    const mustForwardApproval = showBranchApproveButton && !!application.must_forward_approval;
    const escalationApprovers = application.escalation_approvers ?? [];

    const [selectedIssueId, setSelectedIssueId] = useState<number | null>(null);
    const [issueAction, setIssueAction] = useState<'resolve' | 'reject' | null>(null);
    const resolveForm = useForm({ response_message: '' });
    const rejectForm = useForm({ response_message: '' });

    // Branch Approval Modal State
    const [approveModalOpen, setApproveModalOpen] = useState(false);
    const [approvalAmount, setApprovalAmount] = useState<string>(String(application.requested_amount || ''));
    const [approvalComments, setApprovalComments] = useState<string>('');
    const [forwardToUserId, setForwardToUserId] = useState<string>('');
    const [submittingApproval, setSubmittingApproval] = useState(false);

    // Member Code Update Modal State (10-digit policy: 4-digit branch code + 6-digit serial)
    const branchPrefix = formatBranchCode(
        application.branch?.code || '0001'
    );
    const parsedCode = parseMemberCode(application.member_admission?.application_no, branchPrefix);
    const [memberCodeModalOpen, setMemberCodeModalOpen] = useState(false);
    const [serialInput, setSerialInput] = useState<string>(parsedCode.serial);
    const [submittingMemberCode, setSubmittingMemberCode] = useState(false);

    useEffect(() => {
        const p = parseMemberCode(application.member_admission?.application_no, branchPrefix);
        setSerialInput(p.serial);
    }, [application.member_admission?.application_no, branchPrefix]);

    // Loan Product Change Modal State
    const [loanProductModalOpen, setLoanProductModalOpen] = useState(false);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
        String(application.loan_category_id || (application as any).loan_category?.id || '')
    );
    const [selectedProductId, setSelectedProductId] = useState<string>(
        String(application.loan_product_id || (application as any).loan_product?.id || '')
    );
    const [submittingLoanProduct, setSubmittingLoanProduct] = useState(false);

    useEffect(() => {
        setSelectedCategoryId(String(application.loan_category_id || (application as any).loan_category?.id || ''));
        setSelectedProductId(String(application.loan_product_id || (application as any).loan_product?.id || ''));
    }, [application.loan_category_id, application.loan_product_id]);

    const openLoanProductModal = () => {
        setSelectedCategoryId(String(application.loan_category_id || (application as any).loan_category?.id || ''));
        setSelectedProductId(String(application.loan_product_id || (application as any).loan_product?.id || ''));
        setLoanProductModalOpen(true);
    };

    const handleCategoryChange = (catId: string) => {
        setSelectedCategoryId(catId);
        const cat = categories.find((c) => String(c.id) === catId);
        const firstProd = cat?.loan_products?.[0];
        setSelectedProductId(firstProd ? String(firstProd.id) : '');
    };

    const modalActiveCategory = categories.find((c) => String(c.id) === String(selectedCategoryId));
    const modalCategoryProducts = modalActiveCategory?.loan_products || [];
    const modalActiveProduct = modalCategoryProducts.find((p) => String(p.id) === String(selectedProductId));

    const handleLoanProductSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCategoryId || !selectedProductId) return;
        setSubmittingLoanProduct(true);
        router.patch(
            `/member/loan-applications/${application.id}/update-loan-product`,
            {
                loan_category_id: selectedCategoryId,
                loan_product_id: selectedProductId,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setLoanProductModalOpen(false);
                },
                onFinish: () => {
                    setSubmittingLoanProduct(false);
                },
            }
        );
    };

    // Disbursement Modal State
    const maxDisburseAmount =
        application.approved_amount != null && Number(application.approved_amount) > 0
            ? Number(application.approved_amount)
            : Number(application.requested_amount || 0);

    const [disburseModalOpen, setDisburseModalOpen] = useState(false);
    const [disburseAmount, setDisburseAmount] = useState<string>(
        String(application.disbursed_amount || maxDisburseAmount || '')
    );
    const [disbursementMethod, setDisbursementMethod] = useState<string>(application.disbursement_method || 'cash');
    const [disbursementReference, setDisbursementReference] = useState<string>(application.disbursement_reference || '');
    const [submittingDisburse, setSubmittingDisburse] = useState(false);
    const [disburseError, setDisburseError] = useState<string | null>(null);
    const [pinModalOpen, setPinModalOpen] = useState(false);
    const [pinProcessing, setPinProcessing] = useState(false);

    const confirmSuperAdminUnlock = (pin: string) => {
        setPinProcessing(true);
        router.post(
            `/member/loan-applications/${application.id}/unlock-edit`,
            { pin },
            {
                preserveScroll: true,
                onFinish: () => setPinProcessing(false),
                onSuccess: () => setPinModalOpen(false),
            },
        );
    };

    const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const initialForm = Number(searchParams.get('form') || searchParams.get('step') || '');
    const initialTabParam = searchParams.get('tab');

    const [activeTab, setActiveTab] = useState<'forms' | 'details' | 'issues'>(
        initialTabParam === 'details' || initialTabParam === 'issues'
            ? initialTabParam
            : 'forms'
    );

    const [selectedFormId, setSelectedFormId] = useState<number | null>(
        Number.isFinite(initialForm) && initialForm > 0 ? initialForm : null,
    );
    const [fillMode, setFillMode] = useState(false);
    const [printBlank, setPrintBlank] = useState(false);
    const formPrintRef = useRef<HTMLDivElement>(null);

    // Responsive Document Viewer Scaling State
    const previewContainerRef = useRef<HTMLDivElement>(null);
    const previewDocRef = useRef<HTMLDivElement>(null);
    const [previewScaleMode, setPreviewScaleMode] = useState<'fit' | '100' | 'custom'>('fit');
    const [zoomLevel, setZoomLevel] = useState<number>(100);
    const [computedScale, setComputedScale] = useState<number>(1);
    const [scaledContainerHeight, setScaledContainerHeight] = useState<number | undefined>(undefined);

    const visibleFormIds = application.visible_form_ids || [1, 2, 3, 4, 5];
    const fillableFormIds = application.editable_form_ids ?? [];
    const formSaved = application.form_saved ?? {};

    const effectiveBaseAmount =
        application.disbursed_amount != null && Number(application.disbursed_amount) > 0
            ? application.disbursed_amount
            : (application.approved_amount != null && Number(application.approved_amount) > 0
                ? application.approved_amount
                : application.requested_amount);

    const buildFormUrl = (formId: number) => {
        const route = FORM_ROUTES[formId];
        if (!route) return '#';
        const params = new URLSearchParams({
            amount: String(effectiveBaseAmount),
        });
        const memberId = application.member_admission?.id;
        if (memberId) params.set('member_id', String(memberId));
        if (application.loan_product_id) params.set('product_id', String(application.loan_product_id));
        if (application.loan_category_id) params.set('category_id', String(application.loan_category_id));
        params.set('application_id', String(application.id));
        return `/member/loan-applications/forms/${route}?${params.toString()}`;
    };

    const hasMeaningfulData = (data: any): boolean => {
        if (data === null || data === undefined || data === '') return false;
        if (typeof data === 'string') {
            const trimmed = data.trim();
            return trimmed !== '' && trimmed !== 'null' && trimmed !== '{}' && trimmed !== '[]' && trimmed.length >= 3;
        }
        if (Array.isArray(data)) {
            if (data.length === 0) return false;
            return data.some((item) => hasMeaningfulData(item));
        }
        if (typeof data === 'object') {
            const keys = Object.keys(data);
            if (keys.length === 0) return false;
            return keys.some((key) => hasMeaningfulData(data[key]));
        }
        return true;
    };

    const isFormSaved = (id: number) => {
        if (formSaved[id] === true) return true;
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
    };

    const formDataFor = (id: number) => {
        switch (id) {
            case 1:
                return application.loan_agreement_data;
            case 2:
                return application.guarantor_info;
            case 3:
                return application.nominee_info;
            case 4:
                return application.asset_info;
            case 5:
                return application.business_plan;
            default:
                return null;
        }
    };

    const previewAmount = Number(effectiveBaseAmount);

    const canFillSelected = selectedFormId != null && fillableFormIds.includes(selectedFormId);
    const selectedSaved = selectedFormId != null && isFormSaved(selectedFormId);
    const useBlankPreview = printBlank || !selectedSaved;
    const showEmbeddedFill =
        fillMode &&
        canFillSelected &&
        selectedFormId != null &&
        (selectedFormId === 2 || selectedFormId === 3);

    useEffect(() => {
        if (selectedFormId == null && visibleFormIds.length > 0) {
            const firstPending = visibleFormIds.find((id) => fillableFormIds.includes(id) && !isFormSaved(id));
            setSelectedFormId(firstPending ?? visibleFormIds[0]);
        }
    }, []);

    useEffect(() => {
        setFillMode(false);
        setPrintBlank(false);
    }, [selectedFormId]);

    // Responsive Document Auto-Fitting and Zoom Calculation for Mobile & Tablet screens
    useEffect(() => {
        const container = previewContainerRef.current;
        const doc = previewDocRef.current;
        if (!container || !doc) return;

        const calculateScale = () => {
            if (typeof window !== 'undefined' && window.matchMedia('print').matches) {
                setComputedScale(1);
                setScaledContainerHeight(undefined);
                return;
            }

            const containerWidth = container.clientWidth || window.innerWidth;
            // Standard A4 width is ~794px
            const docNaturalWidth = Math.max(doc.scrollWidth, doc.offsetWidth, 794);
            const docNaturalHeight = Math.max(doc.scrollHeight, doc.offsetHeight, 1);

            // Container width available minus responsive padding
            const usableWidth = Math.max(containerWidth - 12, 260);
            const autoFitScale = Math.min(1, usableWidth / docNaturalWidth);

            let finalScale = 1;
            if (previewScaleMode === 'fit') {
                finalScale = Math.max(0.28, autoFitScale);
            } else if (previewScaleMode === '100') {
                finalScale = 1;
            } else {
                finalScale = Math.max(0.3, Math.min(2.0, zoomLevel / 100));
            }

            setComputedScale(finalScale);
            if (finalScale < 0.999) {
                setScaledContainerHeight(docNaturalHeight * finalScale + 24);
            } else {
                setScaledContainerHeight(undefined);
            }
        };

        const ro = new ResizeObserver(() => calculateScale());
        ro.observe(container);
        ro.observe(doc);
        window.addEventListener('resize', calculateScale);
        calculateScale();
        const t1 = setTimeout(calculateScale, 60);
        const t2 = setTimeout(calculateScale, 250);

        return () => {
            ro.disconnect();
            window.removeEventListener('resize', calculateScale);
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, [selectedFormId, activeTab, previewScaleMode, zoomLevel, fillMode, printBlank]);

    // Top-Level Dedicated Print Portal Setup (Guarantees zero blank print output)
    useEffect(() => {
        const handleBeforePrint = () => {
            let portal = document.getElementById('dedicated-print-portal');
            if (!portal) {
                portal = document.createElement('div');
                portal.id = 'dedicated-print-portal';
                document.body.appendChild(portal);
            }
            const sourceEl = formPrintRef.current || document.querySelector('.form-print-area') || document.querySelector('.print-container');
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
    }, []);

    const executeDedicatedPrint = () => {
        let portal = document.getElementById('dedicated-print-portal');
        if (!portal) {
            portal = document.createElement('div');
            portal.id = 'dedicated-print-portal';
            document.body.appendChild(portal);
        }

        const sourceEl = formPrintRef.current || document.querySelector('.form-print-area') || document.querySelector('.print-container');
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
            setTimeout(executeDedicatedPrint, 200);
        } else {
            executeDedicatedPrint();
        }
    };

    const handleBranchApprovalSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const approvalId = application.pending_approval_id;
        if (!approvalId) {
            alert('অনুমোদন আইডি পাওয়া যায়নি।');
            return;
        }
        if (mustForwardApproval) {
            if (!forwardToUserId) {
                alert('উচ্চতর কর্মকর্তা নির্বাচন করুন।');
                return;
            }
            setSubmittingApproval(true);
            router.patch(
                `/approvals/loan/${approvalId}/forward`,
                {
                    forward_to_user_id: forwardToUserId,
                    comments: approvalComments,
                },
                {
                    preserveScroll: true,
                    onFinish: () => {
                        setSubmittingApproval(false);
                        setApproveModalOpen(false);
                    },
                }
            );
            return;
        }
        setSubmittingApproval(true);
        router.patch(
            `/approvals/loan/${approvalId}/approve`,
            {
                approved_amount: approvalAmount,
                comments: approvalComments,
            },
            {
                preserveScroll: true,
                onFinish: () => {
                    setSubmittingApproval(false);
                    setApproveModalOpen(false);
                },
            }
        );
    };

    const handleMemberCodeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const cleanSerial = toEnglishDigits(serialInput).replace(/\D/g, '');
        if (!cleanSerial) return;
        const fullCode = `${branchPrefix}${cleanSerial.padStart(6, '0')}`;
        setSubmittingMemberCode(true);
        router.patch(
            `/member/loan-applications/${application.id}/update-member-code`,
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

    const [showLoanHoModal, setShowLoanHoModal] = useState(false);
    const [isSendingLoanToHo, setIsSendingLoanToHo] = useState(false);

    const handleConfirmSendLoanToHo = () => {
        setIsSendingLoanToHo(true);
        router.patch(
            `/member/loan-applications/${application.id}/send-to-head-office`,
            {},
            {
                preserveScroll: true,
                onFinish: () => {
                    setIsSendingLoanToHo(false);
                    setShowLoanHoModal(false);
                },
            }
        );
    };

    const handleDisburseSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const amt = parseFloat(disburseAmount);
        if (isNaN(amt) || amt <= 0) {
            setDisburseError('অনুগ্রহ করে সঠিক বিতরণ পরিমাণ লিখুন।');
            return;
        }
        setDisburseError(null);
        setSubmittingDisburse(true);
        router.patch(
            routes.disburse!,
            {
                disbursed_amount: amt,
                disbursement_method: disbursementMethod,
                disbursement_reference: disbursementReference.trim() || undefined,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setDisburseModalOpen(false);
                },
                onError: (errs) => {
                    if (errs.error) {
                        setDisburseError(errs.error);
                    } else if (errs.disbursed_amount) {
                        setDisburseError(errs.disbursed_amount);
                    }
                },
                onFinish: () => {
                    setSubmittingDisburse(false);
                },
            }
        );
    };

    const statusInfo = statusConfig[application.status as keyof typeof statusConfig] || {
        label: application.status || 'খসড়া',
        color: 'bg-slate-100 text-slate-800 border-slate-300',
        icon: AlertCircle,
    };
    const StatusIcon = statusInfo.icon || AlertCircle;
    const issues = application.issues ?? [];
    const pendingIssues = issues.filter((issue) => issue.status === 'pending');
    const applicant = application.submittedBy || application.submitted_by;
    const memberName =
        application.member_admission?.applicant_name_bn ||
        application.member_admission?.applicant_name_en ||
        application.member_admission?.member_name_bn ||
        '-';

    const savedFormCount = visibleFormIds.filter((id) => isFormSaved(id)).length;
    const totalFormCount = visibleFormIds.length;
    const progressPercent = totalFormCount > 0 ? Math.round((savedFormCount / totalFormCount) * 100) : 0;

    /** Calculate stage index for timeline pipeline */
    const getStageIndex = () => {
        switch (application.status) {
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

    /** Get rich plain Bengali explanation of current pending state */
    const getPendingStatusExplanation = () => {
        if (pendingIssues.length > 0) {
            return {
                title: 'পেন্ডিং অবস্থা: হেড অফিসের সংশোধন নির্দেশ',
                desc: `হেড অফিস থেকে ${pendingIssues.length} টি নির্দেশ/সমস্যা পাঠানো হয়েছে। অনুগ্রহ করে সমস্যা ট্যাবে উত্তর দিন।`,
                badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
                cardBg: 'bg-rose-50/90 border-rose-200 text-rose-950',
                iconColor: 'text-rose-600',
            };
        }
        switch (application.status) {
            case 'draft':
                if (savedFormCount < totalFormCount) {
                    return {
                        title: 'পেন্ডিং অবস্থা: খসড়া — প্রয়োজনীয় ফর্ম পূরণ বাকি',
                        desc: `আবেদনের ${totalFormCount - savedFormCount} টি ফর্ম পূরণ করা বাকি আছে। নিচে ফর্ম নির্বাচন করে তথ্য সংরক্ষণ করুন।`,
                        badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
                        cardBg: 'bg-amber-50/90 border-amber-300/80 text-amber-950',
                        iconColor: 'text-amber-600',
                    };
                }
                if (!application.can_submit) {
                    return {
                        title: 'পেন্ডিং অবস্থা: সদস্য ভর্তি অনুমোদন অপেক্ষমাণ',
                        desc: 'সদস্যের ভর্তি প্রক্রিয়া হেড অফিসে অনুমোদিত হওয়ার পর এই ঋণ আবেদনটি সাবমিট করা যাবে।',
                        badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
                        cardBg: 'bg-amber-50/90 border-amber-300/80 text-amber-950',
                        iconColor: 'text-amber-600',
                    };
                }
                return {
                    title: 'পেন্ডিং অবস্থা: শাখা সাবমিটের জন্য প্রস্তুত',
                    desc: 'সকল ফর্ম সংরক্ষণ সম্পন্ন হয়েছে। উপরের "সাবমিট করুন" বাটনে ক্লিক করে শাখা ব্যবস্থাপকের কাছে জমা দিন।',
                    badgeColor: 'bg-blue-100 text-blue-900 border-blue-300',
                    cardBg: 'bg-blue-50/90 border-blue-200 text-blue-950',
                    iconColor: 'text-blue-600',
                };
            case 'submitted':
            case 'under_review':
                return {
                    title: mustForwardApproval
                        ? 'পেন্ডিং অবস্থা: ৭০,০০০ টাকা বা বেশি — উচ্চতর কর্মকর্তার কাছে ফরওয়ার্ড করতে হবে'
                        : 'পেন্ডিং অবস্থা: শাখা ব্যবস্থাপকের পর্যালোচনাধীন',
                    desc: mustForwardApproval
                        ? 'এই ঋণের পরিমাণ ৭০,০০০ টাকা বা তার বেশি। শাখা ব্যবস্থাপক সরাসরি অনুমোদন করতে পারবেন না — Area/Zone/ADMF/DMF/ED নির্বাচন করে ফরওয়ার্ড করুন।'
                        : 'আবেদনটি বর্তমানে শাখা ব্যবস্থাপক কর্তৃক পর্যালোচনার অপেক্ষায় রয়েছে। শাখা ব্যবস্থাপক নিচে থেকে আবেদনটি পর্যালোচনা ও অনুমোদন করতে পারবেন।',
                    badgeColor: 'bg-yellow-100 text-yellow-900 border-yellow-300',
                    cardBg: 'bg-yellow-50/90 border-yellow-200 text-yellow-950',
                    iconColor: 'text-yellow-600',
                };
            case 'ready_for_head_office':
                return {
                    title: 'পেন্ডিং অবস্থা: শাখা অনুমোদিত — হেড অফিসে পাঠানো প্রয়োজন',
                    desc: 'শাখা থেকে আবেদনটি অনুমোদিত হয়েছে। "Head Office এ পাঠান" বাটনে ক্লিক করে পাঠিয়ে দিন।',
                    badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
                    cardBg: 'bg-emerald-50/90 border-emerald-200 text-emerald-950',
                    iconColor: 'text-emerald-600',
                };
            case 'pending_head_office':
                return {
                    title: 'পেন্ডিং অবস্থা: হেড অফিসে অনুমোদনের জন্য পেন্ডিং',
                    desc: 'আবেদনটি Head Office এ প্রেরিত হয়েছে এবং মূল অনুমোদন পর্যালোচনার জন্য অপেক্ষমাণ রয়েছে।',
                    badgeColor: 'bg-indigo-100 text-indigo-900 border-indigo-300',
                    cardBg: 'bg-indigo-50/90 border-indigo-200 text-indigo-950',
                    iconColor: 'text-indigo-600',
                };
            case 'approved':
            case 'pending_disbursement':
                if (!application.can_disburse) {
                    return {
                        title: 'পেন্ডিং অবস্থা: বিতরণের পূর্বে জামিনদার ও মৃত্যুঝুঁকি ফর্ম পূরণ বাকি',
                        desc: 'ঋণ অনুমোদিত হয়েছে, তবে বিতরণ করার পূর্বে ফর্ম ২ (জামিনদার) ও ফর্ম ৩ (মৃত্যুঝুঁকি) সেভ করতে হবে।',
                        badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
                        cardBg: 'bg-amber-50/90 border-amber-300/80 text-amber-950',
                        iconColor: 'text-amber-600',
                    };
                }
                return {
                    title: 'পেন্ডিং অবস্থা: ঋণ বিতরণ অপেক্ষমাণ (প্রস্তুত)',
                    desc: 'সকল প্রয়োজনীয় শর্ত ও ফর্ম সম্পন্ন হয়েছে। "বিতরণ করুন" বাটনে ক্লিক করে সদস্যকে অর্থ বিতরণ করুন।',
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
                    title: 'বর্তমান অবস্থা: আবেদনটি প্রত্যাখ্যাত বা বাতিল',
                    desc: 'কর্তৃপক্ষ কর্তৃক ঋণ আবেদনটি বাতিল ঘোষণা করা হয়েছে।',
                    badgeColor: 'bg-rose-100 text-rose-900 border-rose-300',
                    cardBg: 'bg-rose-50/90 border-rose-200 text-rose-950',
                    iconColor: 'text-rose-600',
                };
            default:
                return {
                    title: `বর্তমান অবস্থা: ${statusInfo?.label || application.status}`,
                    desc: 'আবেদনের কাজ প্রক্রিয়াধীন রয়েছে।',
                    badgeColor: 'bg-slate-100 text-slate-800 border-slate-300',
                    cardBg: 'bg-slate-50 border-slate-200 text-slate-900',
                    iconColor: 'text-slate-600',
                };
        }
    };

    const pendingStatusInfo = getPendingStatusExplanation();

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

    const renderFormPreview = (formId: number, admissionTemplate: boolean) => {
        const saved = admissionTemplate ? null : formDataFor(formId);
        const common = {
            onlyPreview: true as const,
            embedded: true as const,
            savedData: saved || undefined,
            existingApplication: application,
            member: application.member_admission,
            loanProduct: application.loan_product,
            loanCategory: application.loan_category,
            requestedAmount: previewAmount,
            branch: application.branch,
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

    return (
        <AdminLayout>
            <Head title={`ঋণ আবেদন - ${application.application_no}`}>
                <style>{`
                    @media screen {
                        .responsive-doc-viewport {
                            -webkit-overflow-scrolling: touch;
                        }
                        .responsive-doc-viewport::-webkit-scrollbar {
                            height: 6px;
                            width: 6px;
                        }
                        .responsive-doc-viewport::-webkit-scrollbar-thumb {
                            background: #cbd5e1;
                            border-radius: 4px;
                        }
                    }

                    @media print {
                        @page { size: A4 portrait; margin: 12mm 15mm; }
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

                        #dedicated-print-portal .agrosor-a4-page {
                            width: 100% !important;
                            max-width: 100% !important;
                            min-height: auto !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            border: none !important;
                            box-shadow: none !important;
                            background: white !important;
                            visibility: visible !important;
                        }

                        #dedicated-print-portal .agrosor-a4-page + .agrosor-a4-page {
                            page-break-before: always;
                        }

                        .responsive-doc-viewport {
                            height: auto !important;
                            overflow: visible !important;
                            padding: 0 !important;
                            margin: 0 !important;
                            background: white !important;
                        }

                        .responsive-doc-scaler,
                        .form-print-area,
                        .print-container {
                            transform: none !important;
                            width: 100% !important;
                            min-width: 0 !important;
                            max-width: 100% !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            box-shadow: none !important;
                        }

                        body:not(.is-printing-document) body * { 
                            visibility: hidden !important; 
                        }
                        body:not(.is-printing-document) .form-print-area, 
                        body:not(.is-printing-document) .form-print-area *, 
                        body:not(.is-printing-document) .print-container, 
                        body:not(.is-printing-document) .print-container * { 
                            visibility: visible !important; 
                        }
                        body:not(.is-printing-document) .form-print-area, 
                        body:not(.is-printing-document) .print-container {
                            position: absolute !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: 100% !important;
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
                    
                    {/* Header Bar - Fully Mobile Responsive */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-5 rounded-2xl shadow-xs border border-slate-200/80 print:hidden">
                        <div className="flex items-center gap-3">
                            <Link href={routes.index}>
                                <Button variant="outline" size="icon" className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl hover:bg-slate-100 transition shrink-0">
                                    <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" />
                                </Button>
                            </Link>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h2 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">ঋণ আবেদন হাব</h2>
                                    
                                    <Badge variant="outline" className="font-mono text-[11px] sm:text-xs text-indigo-700 bg-indigo-50 border-indigo-200 font-semibold px-2 py-0.5">
                                        আবেদন নং: {application.application_no || '-'}
                                    </Badge>

                                    <Badge className={`${statusInfo?.color || 'bg-slate-100 text-slate-800'} text-[11px] sm:text-xs font-medium border px-2 py-0.5`}>
                                        <StatusIcon className="w-3 h-3 mr-1 inline" />
                                        {statusInfo?.label || application.status}
                                    </Badge>
                                </div>
                                <p className="text-[11px] sm:text-xs text-slate-500 mt-1 font-medium break-words flex items-center gap-1.5 flex-wrap">
                                    <span>মেম্বার কোড: <span className="font-mono font-bold text-blue-700">{application.member_admission?.application_no || '-'}</span></span>
                                    {application.status !== 'disbursed' && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const p = parseMemberCode(application.member_admission?.application_no, branchPrefix);
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
                                    <span>সদস্য: <span className="font-bold text-slate-800">{application.member_admission?.applicant_name_bn || application.member_admission?.applicant_name_en || application.member_admission?.member_name_bn || application.member_admission?.member_name_en || '-'}</span></span>
                                    <span className="text-slate-300 mx-1">|</span>
                                    <span>আবেদন: <span className="font-medium text-slate-700">{formatDate(application.created_at)}</span></span>
                                    {application.submitted_at && (
                                        <>
                                            <span className="text-slate-300 mx-1">|</span>
                                            <span>জমা: <span className="font-medium text-slate-700">{formatDate(application.submitted_at)}</span></span>
                                        </>
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Primary Action Buttons Bar */}
                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                            
                            {application.superadmin_can_pin_edit && !application.superadmin_edit_unlocked && (
                                <Button
                                    className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs font-semibold rounded-xl text-xs sm:text-sm h-9 sm:h-10"
                                    onClick={() => setPinModalOpen(true)}
                                >
                                    <Lock className="w-4 h-4 mr-1.5" />
                                    PIN দিয়ে ফর্ম এডিট
                                </Button>
                            )}
                            {application.superadmin_can_pin_edit && application.superadmin_edit_unlocked && (
                                <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-[11px] sm:text-xs font-medium">
                                    <Lock className="w-3 h-3 mr-1 inline" />
                                    এডিট আনলক
                                </Badge>
                            )}

                            {/* Branch Manager Approval Action Button */}
                            {showBranchApproveButton && (
                                <Button
                                    className={`w-full sm:w-auto text-white shadow-xs font-bold rounded-xl text-xs sm:text-sm h-9 sm:h-10 animate-pulse ${
                                        mustForwardApproval
                                            ? 'bg-blue-600 hover:bg-blue-700'
                                            : 'bg-emerald-600 hover:bg-emerald-700'
                                    }`}
                                    onClick={() => {
                                        setForwardToUserId('');
                                        setApproveModalOpen(true);
                                    }}
                                >
                                    {mustForwardApproval ? (
                                        <>
                                            <ArrowUpRight className="w-4 h-4 mr-1.5" />
                                            ফরওয়ার্ড করুন
                                        </>
                                    ) : (
                                        <>
                                            <ShieldCheck className="w-4 h-4 mr-1.5" />
                                            শাখা অনুমোদন করুন
                                        </>
                                    )}
                                </Button>
                            )}

                            {application.status === 'draft' && application.all_forms_complete && (
                                application.can_submit ? (
                                    <Button
                                        className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs font-semibold rounded-xl text-xs sm:text-sm h-9 sm:h-10"
                                        onClick={() => {
                                            if (confirm('ঋণ আবেদনটি শাখা ব্যবস্থাপকের কাছে জমা দিতে চান?')) {
                                                router.patch(routes.submit);
                                            }
                                        }}
                                    >
                                        <Send className="w-4 h-4 mr-1.5" />
                                        সাবমিট করুন
                                    </Button>
                                ) : (
                                    <Button disabled variant="outline" className="w-full sm:w-auto rounded-xl text-xs h-9 sm:h-10" title="সদস্য ভর্তি অনুমোদিত হলে জমা দেওয়া যাবে">
                                        <Send className="w-4 h-4 mr-1.5" />
                                        সাবমিট (ভর্তি অনুমোদন অপেক্ষমান)
                                    </Button>
                                )
                            )}
                            {application.status === 'ready_for_head_office' && isBranchUser && (
                                <Button
                                    className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs font-semibold rounded-xl text-xs sm:text-sm h-9 sm:h-10"
                                    onClick={() => setShowLoanHoModal(true)}
                                >
                                    <Send className="w-4 h-4 mr-1.5" />
                                    Head Office এ পাঠান
                                </Button>
                            )}
                            {application.status === 'pending_disbursement' && isBranchUser && routes.disburse && (
                                application.can_disburse ? (
                                    <Button
                                        className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs font-semibold rounded-xl text-xs sm:text-sm h-9 sm:h-10"
                                        onClick={() => {
                                            setDisburseAmount(String(application.disbursed_amount || maxDisburseAmount));
                                            setDisburseError(null);
                                            setDisburseModalOpen(true);
                                        }}
                                    >
                                        <CheckCircle2 className="w-4 h-4 mr-1.5" />
                                        বিতরণ করুন
                                    </Button>
                                ) : (
                                    <Button disabled variant="outline" className="w-full sm:w-auto rounded-xl text-xs h-9 sm:h-10" title="বিতরণের আগে ফর্ম ২ ও ৩ পূরণ করুন">
                                        <Clock className="w-4 h-4 mr-1.5" />
                                        বিতরণ (ফর্ম ২+৩ বাকি)
                                    </Button>
                                )
                            )}
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
                                        {statusInfo?.label || application.status}
                                    </Badge>
                                </div>
                                <p className="text-xs text-slate-700 leading-relaxed">{pendingStatusInfo.desc}</p>

                                {showBranchApproveButton && (
                                    <div className="mt-2.5">
                                        <Button
                                            size="sm"
                                            className={`text-white font-bold rounded-lg text-xs ${
                                                mustForwardApproval
                                                    ? 'bg-blue-600 hover:bg-blue-700'
                                                    : 'bg-emerald-600 hover:bg-emerald-700'
                                            }`}
                                            onClick={() => {
                                                setForwardToUserId('');
                                                setApproveModalOpen(true);
                                            }}
                                        >
                                            {mustForwardApproval ? (
                                                <>
                                                    <ArrowUpRight className="w-4 h-4 mr-1" />
                                                    এখান থেকেই ফরওয়ার্ড করুন
                                                </>
                                            ) : (
                                                <>
                                                    <ShieldCheck className="w-4 h-4 mr-1" />
                                                    এখান থেকেই শাখা অনুমোদন করুন
                                                </>
                                            )}
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
                                <p className="text-[10px] sm:text-xs text-slate-500 font-mono truncate mt-0.5">আবেদন নং: {application.application_no || '-'}</p>
                            </div>
                        </div>

                        <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-2.5 sm:gap-3">
                            <div className="p-2 sm:p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
                                <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1">
                                    <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-400">ঋণ প্রোডাক্ট</p>
                                    {application.status !== 'disbursed' && (isBranchUser || isBranchManager) && (
                                        <button
                                            type="button"
                                            onClick={openLoanProductModal}
                                            className="inline-flex items-center gap-1 text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200 font-semibold cursor-pointer transition shadow-2xs"
                                            title="ঋণ প্রোডাক্ট পরিবর্তন করুন"
                                        >
                                            <Edit className="w-2.5 h-2.5 text-indigo-600" /> পরিবর্তন
                                        </button>
                                    )}
                                </div>
                                <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                    {application.loan_product?.product_name_bn || application.loan_product?.product_name || '-'}
                                </p>
                                <p className="text-[10px] sm:text-xs text-slate-500 truncate">
                                    {application.loan_category?.category_name_bn || application.loan_category?.category_name || '-'}
                                </p>
                            </div>
                        </div>

                        <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-2.5 sm:gap-3">
                            <div className={`p-2 sm:p-2.5 ${application.status === 'disbursed' ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-50 text-emerald-600'} rounded-xl shrink-0`}>
                                <Banknote className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                    {application.status === 'disbursed' ? 'বিতরণকৃত ঋণ' : 'আবেদিত / অনুমোদিত'}
                                </p>
                                <p className="text-xs sm:text-sm font-bold text-emerald-700 truncate">
                                    ৳{Number(application.disbursed_amount ?? application.approved_amount ?? application.requested_amount ?? 0).toLocaleString('bn-BD')}
                                </p>
                                {application.status === 'disbursed' && application.approved_amount != null && (
                                    <p className="text-[10px] sm:text-xs text-slate-500 truncate">
                                        অনুমোদিত ছিল: ৳{Number(application.approved_amount).toLocaleString('bn-BD')}
                                    </p>
                                )}
                                {application.status !== 'disbursed' && application.approved_amount != null && (
                                    <p className="text-[10px] sm:text-xs text-slate-500 truncate">
                                        অনুমোদিত: ৳{Number(application.approved_amount).toLocaleString('bn-BD')}
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

                    {/* Urgent Action Banner */}
                    {pendingIssues.length > 0 && (
                        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 sm:p-4 text-xs sm:text-sm text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 print:hidden shadow-xs">
                            <div className="flex items-start gap-2.5">
                                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-amber-600 mt-0.5" />
                                <div>
                                    <p className="font-bold text-amber-900">হেড অফিস থেকে {pendingIssues.length} টি সমস্যা/নির্দেশ পাঠানো হয়েছে</p>
                                    <p className="text-xs text-amber-800 mt-0.5">
                                        অনুগ্রহ করে নিচের সমস্যা ট্যাবে গিয়ে সমাধান করুন।
                                    </p>
                                </div>
                            </div>
                            <Button 
                                size="sm" 
                                className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white shrink-0 rounded-lg text-xs"
                                onClick={() => setActiveTab('issues')}
                            >
                                সমস্যা সমাধান করুন ({pendingIssues.length})
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
                                💬 হেড অফিস বার্তা
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
                                {application.superadmin_can_pin_edit && !application.superadmin_edit_unlocked && (
                                    <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <p className="text-xs sm:text-sm text-indigo-900">
                                            সুপার অ্যাডমিন হিসেবে যেকোনো অবস্থায় ঋণের ফর্ম এডিট করতে <strong>SUPERADMIN_DELETE_PIN</strong> দিন।
                                        </p>
                                        <Button
                                            size="sm"
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs shrink-0"
                                            onClick={() => setPinModalOpen(true)}
                                        >
                                            <Lock className="w-3.5 h-3.5 mr-1.5" />
                                            PIN দিন
                                        </Button>
                                    </div>
                                )}
                                
                                {/* Form Selector Pills */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">ফর্ম নির্বাচন করুন</p>
                                        <p className="text-[10px] sm:text-xs text-slate-500">হলুদ চিহ্নিত = এখন পূরণ জরুরি</p>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-2.5">
                                        {visibleFormIds.map((id) => {
                                            const saved = isFormSaved(id);
                                            const canFill = fillableFormIds.includes(id);
                                            const urgent = canFill && !saved;
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
                                                            : urgent
                                                                ? 'border-amber-400 bg-amber-50/80 ring-2 ring-amber-300/50 hover:bg-amber-100/60'
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
                                                        ) : urgent ? (
                                                            <Badge className="bg-amber-500 text-white text-[9px] sm:text-[10px] shrink-0 animate-pulse font-medium px-1 sm:px-1.5">
                                                                জরুরি
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
                                                    পূরণ করবেন: <strong className="text-slate-700">{FORM_FILLERS[selectedFormId]}</strong>
                                                </p>
                                            </div>

                                            {/* Action buttons inside form toolbar */}
                                            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                                                {selectedSaved && (
                                                    <Button
                                                        variant={printBlank ? 'default' : 'outline'}
                                                        size="sm"
                                                        className="rounded-lg text-xs flex-1 sm:flex-initial"
                                                        onClick={() => {
                                                            setPrintBlank((v) => !v);
                                                            setFillMode(false);
                                                        }}
                                                    >
                                                        {printBlank ? 'সেভকৃত প্রিভিউ' : 'ব্ল্যাংক প্রিন্ট মোড'}
                                                    </Button>
                                                )}

                                                {!showEmbeddedFill && (
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        className="rounded-lg text-xs flex-1 sm:flex-initial"
                                                        onClick={printFormContent}
                                                    >
                                                        <Printer className="w-3.5 h-3.5 mr-1.5" />
                                                        প্রিন্ট
                                                    </Button>
                                                )}

                                                {canFillSelected && !showEmbeddedFill && (
                                                    selectedFormId === 2 || selectedFormId === 3 ? (
                                                        <Button
                                                            size="sm"
                                                            className={`rounded-lg text-xs flex-1 sm:flex-initial ${!selectedSaved ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                                                            onClick={() => {
                                                                setPrintBlank(false);
                                                                setFillMode(true);
                                                            }}
                                                        >
                                                            <Edit className="w-3.5 h-3.5 mr-1.5" />
                                                            {selectedSaved ? 'আপডেট করুন' : 'এখন পূরণ করুন'}
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            className={`rounded-lg text-xs flex-1 sm:flex-initial ${!selectedSaved ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                                                            onClick={() => router.visit(buildFormUrl(selectedFormId))}
                                                        >
                                                            <Edit className="w-3.5 h-3.5 mr-1.5" />
                                                            {selectedSaved ? 'আপডেট করুন' : 'এখন পূরণ করুন'}
                                                        </Button>
                                                    )
                                                )}

                                                {showEmbeddedFill && (
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        className="rounded-lg text-xs w-full sm:w-auto"
                                                        onClick={() => setFillMode(false)}
                                                    >
                                                        প্রিভিউ দেখুন
                                                    </Button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Embedded Editor or Form Document Preview */}
                                        {showEmbeddedFill && selectedFormId === 2 ? (
                                            <div className="p-3 sm:p-6 bg-slate-50/50">
                                                <GuarantorCommitment
                                                    embedded
                                                    saveButtonLabel="সংরক্ষণ করুন"
                                                    afterSaveUrl={`/member/loan-applications/${application.id}?form=2`}
                                                    member={application.member_admission}
                                                    loanProduct={application.loan_product}
                                                    loanCategory={application.loan_category}
                                                    requestedAmount={previewAmount}
                                                    branch={application.branch}
                                                    existingApplication={application}
                                                    savedData={application.guarantor_info}
                                                />
                                            </div>
                                        ) : showEmbeddedFill && selectedFormId === 3 ? (
                                            <div className="p-3 sm:p-6 bg-slate-50/50">
                                                <DeathRiskFund
                                                    embedded
                                                    saveButtonLabel="সংরক্ষণ করুন"
                                                    afterSaveUrl={`/member/loan-applications/${application.id}?form=3`}
                                                    member={application.member_admission}
                                                    loanProduct={application.loan_product}
                                                    loanCategory={application.loan_category}
                                                    requestedAmount={previewAmount}
                                                    branch={application.branch}
                                                    existingApplication={application}
                                                    savedData={application.nominee_info}
                                                />
                                            </div>
                                        ) : (
                                            <div>
                                                {/* Mobile / Screen Document Viewer Controller Bar */}
                                                <div className="bg-slate-100/90 border-b border-slate-200 px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-xs print:hidden">
                                                    <div className="flex items-center gap-1.5 sm:gap-2">
                                                        <span className="font-bold text-slate-700 text-[11px] sm:text-xs">ভিউ মোড:</span>
                                                        <div className="inline-flex rounded-lg bg-white p-0.5 border border-slate-200 shadow-2xs">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setPreviewScaleMode('fit');
                                                                }}
                                                                className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition ${
                                                                    previewScaleMode === 'fit'
                                                                        ? 'bg-indigo-600 text-white shadow-2xs'
                                                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                                                }`}
                                                                title="স্ক্রিনের প্রস্থ অনুযায়ী সম্পূর্ণ ফর্ম ফিট করুন"
                                                            >
                                                                <Smartphone className="w-3.5 h-3.5" />
                                                                <span>মোবাইল ফিট</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setPreviewScaleMode('100');
                                                                    setZoomLevel(100);
                                                                }}
                                                                className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition ${
                                                                    previewScaleMode === '100'
                                                                        ? 'bg-indigo-600 text-white shadow-2xs'
                                                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                                                }`}
                                                                title="প্রকৃত ১০০% প্রিন্ট সাইজে দেখুন"
                                                            >
                                                                <Monitor className="w-3.5 h-3.5" />
                                                                <span>১০০% সাইজ</span>
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Zoom Controls & Touch Hint */}
                                                    <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
                                                        {computedScale > 0.99 && (
                                                            <span className="text-[10px] sm:text-[11px] text-slate-500 hidden md:inline-flex items-center gap-1 mr-1">
                                                                <MoveHorizontal className="w-3 h-3 text-slate-400" /> ডানে-বামে স্ক্রল করা যাবে
                                                            </span>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setPreviewScaleMode('custom');
                                                                setZoomLevel((z) => Math.max(35, Math.round((computedScale * 100) - 10)));
                                                            }}
                                                            className="p-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                                                            title="জুম আউট"
                                                        >
                                                            <ZoomOut className="w-3.5 h-3.5" />
                                                        </button>
                                                        <span className="font-mono text-[11px] font-bold text-slate-700 min-w-[44px] text-center bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-2xs">
                                                            {Math.round(computedScale * 100)}%
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setPreviewScaleMode('custom');
                                                                setZoomLevel((z) => Math.min(160, Math.round((computedScale * 100) + 10)));
                                                            }}
                                                            className="p-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                                                            title="জুম ইন"
                                                        >
                                                            <ZoomIn className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Scaled Responsive Document Preview Area */}
                                                <div
                                                    ref={previewContainerRef}
                                                    className="responsive-doc-viewport p-2 sm:p-5 bg-slate-100/50 overflow-x-auto overflow-y-hidden relative flex justify-center print:p-0 print:m-0 print:bg-white print:overflow-visible print:h-auto print:block"
                                                    style={{
                                                        height: scaledContainerHeight ? `${scaledContainerHeight}px` : 'auto',
                                                    }}
                                                >
                                                    <div
                                                        ref={previewDocRef}
                                                        style={{
                                                            width: '794px',
                                                            minWidth: '794px',
                                                            transform: computedScale < 0.999 || previewScaleMode === 'custom' ? `scale(${computedScale})` : 'none',
                                                            transformOrigin: 'top center',
                                                        }}
                                                        className="responsive-doc-scaler form-print-area print-container printable-area shadow-xs rounded-lg overflow-visible bg-white print:shadow-none print:rounded-none print:transform-none print:w-full print:min-w-0 print:m-0 print:p-0"
                                                    >
                                                        <div ref={formPrintRef}>
                                                            {renderFormPreview(selectedFormId, useBlankPreview)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB 2: MEMBER & LOAN DETAILS OVERVIEW */}
                        {activeTab === 'details' && (
                            <div className="printable-area p-3.5 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                                <Card className="border-slate-200/80 shadow-xs">
                                    <CardHeader className="bg-slate-50/60 pb-3 border-b flex flex-row items-center justify-between">
                                        <CardTitle className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                                            <User className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" /> সদস্যের বিস্তারিত তথ্য
                                        </CardTitle>
                                        {application.status !== 'disbursed' && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-xs h-8 border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-semibold"
                                                onClick={() => {
                                                    const p = parseMemberCode(application.member_admission?.application_no, branchPrefix);
                                                    setSerialInput(p.serial);
                                                    setMemberCodeModalOpen(true);
                                                }}
                                            >
                                                <Edit className="w-3.5 h-3.5 mr-1" /> মেম্বার কোড পরিবর্তন
                                            </Button>
                                        )}
                                    </CardHeader>
                                    <CardContent className="p-3.5 sm:p-4 space-y-2.5 sm:space-y-3 text-xs sm:text-sm">
                                        <div className="flex justify-between py-1.5 border-b border-slate-100">
                                            <span className="text-slate-500">মেম্বার কোড:</span>
                                            <span className="font-mono font-bold text-indigo-700">{application.member_admission?.application_no || '-'}</span>
                                        </div>
                                        <div className="flex justify-between py-1.5 border-b border-slate-100">
                                            <span className="text-slate-500">নাম (বাংলা/ইংরেজি):</span>
                                            <span className="font-semibold text-slate-900">{memberName}</span>
                                        </div>
                                        <div className="flex justify-between py-1.5 border-b border-slate-100">
                                            <span className="text-slate-500">জাতীয় পরিচয়পত্র (NID):</span>
                                            <span className="font-semibold text-slate-900">{application.member_admission?.nid_number || application.member_admission?.nid_no || '-'}</span>
                                        </div>
                                        <div className="flex justify-between py-1.5 border-b border-slate-100">
                                            <span className="text-slate-500">মোবাইল নম্বর:</span>
                                            <span className="font-semibold text-slate-900">{application.member_admission?.mobile_number || application.member_admission?.mobile_no || '-'}</span>
                                        </div>
                                        <div className="flex justify-between py-1.5 border-b border-slate-100">
                                            <span className="text-slate-500">বর্তমান ঠিকানা:</span>
                                            <span className="font-medium text-slate-800 text-right max-w-[200px] sm:max-w-[240px]">
                                                {application.member_admission?.present_village_road || application.member_admission?.present_address_en || '-'}
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

                                <Card className="border-slate-200/80 shadow-xs">
                                    <CardHeader className="bg-slate-50/60 pb-3 border-b flex flex-row items-center justify-between">
                                        <CardTitle className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                                            <Banknote className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" /> ঋণ বিবরণ ও শর্তাবলী
                                        </CardTitle>
                                        {application.status !== 'disbursed' && (isBranchUser || isBranchManager) && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-xs h-8 border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-semibold"
                                                onClick={openLoanProductModal}
                                            >
                                                <Edit className="w-3.5 h-3.5 mr-1" /> ঋণ প্রোডাক্ট পরিবর্তন
                                            </Button>
                                        )}
                                    </CardHeader>
                                    <CardContent className="p-3.5 sm:p-4 space-y-2.5 sm:space-y-3 text-xs sm:text-sm">
                                        <div className="flex justify-between py-1.5 border-b border-slate-100">
                                            <span className="text-slate-500">আবেদন নং:</span>
                                            <span className="font-mono font-bold text-indigo-700">{application.application_no || '-'}</span>
                                        </div>
                                        <div className="flex justify-between py-1.5 border-b border-slate-100">
                                            <span className="text-slate-500">ঋণ ক্যাটাগরি:</span>
                                            <span className="font-semibold text-slate-900">
                                                {application.loan_category?.category_name_bn || application.loan_category?.category_name || '-'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between py-1.5 border-b border-slate-100">
                                            <span className="text-slate-500">ঋণ পণ্য:</span>
                                            <span className="font-semibold text-slate-900">
                                                {application.loan_product?.product_name_bn || application.loan_product?.product_name || '-'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between py-1.5 border-b border-slate-100">
                                            <span className="text-slate-500">আবেদিত ঋণ পরিমাণ:</span>
                                            <span className="font-bold text-slate-900">৳{Number(application.requested_amount || 0).toLocaleString('bn-BD')}</span>
                                        </div>
                                        {application.approved_amount != null && (
                                            <div className="flex justify-between py-1.5 border-b border-slate-100">
                                                <span className="text-slate-500">অনুমোদিত পরিমাণ:</span>
                                                <span className="font-bold text-emerald-700">৳{Number(application.approved_amount).toLocaleString('bn-BD')}</span>
                                            </div>
                                        )}
                                        {application.disbursed_amount != null && (
                                            <div className="flex justify-between py-1.5 border-b border-slate-100 bg-emerald-50/70 px-2 rounded-lg -mx-2">
                                                <span className="font-semibold text-emerald-900">প্রকৃত বিতরণ পরিমাণ:</span>
                                                <span className="font-black text-emerald-700">৳{Number(application.disbursed_amount).toLocaleString('bn-BD')}</span>
                                            </div>
                                        )}
                                        {application.disbursement_method && (
                                            <div className="flex justify-between py-1.5 border-b border-slate-100">
                                                <span className="text-slate-500">বিতরণ মাধ্যম:</span>
                                                <span className="font-semibold text-slate-800 uppercase">{application.disbursement_method}</span>
                                            </div>
                                        )}
                                        {application.disbursement_reference && (
                                            <div className="flex justify-between py-1.5 border-b border-slate-100">
                                                <span className="text-slate-500">রেফারেন্স / ভাউচার নং:</span>
                                                <span className="font-mono text-slate-800">{application.disbursement_reference}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between py-1.5 border-b border-slate-100">
                                            <span className="text-slate-500">শাখা:</span>
                                            <span className="font-semibold text-slate-900">{application.branch?.name || '-'}</span>
                                        </div>
                                        {application.samity && (
                                            <div className="flex justify-between py-1.5 border-b border-slate-100">
                                                <span className="text-slate-500">সমিতি:</span>
                                                <span className="font-semibold text-slate-900">
                                                    {application.samity.samity_name_bn || application.samity.samity_name || '-'}
                                                </span>
                                            </div>
                                        )}
                                        {application.purpose_of_loan && (
                                            <div className="flex justify-between py-1.5">
                                                <span className="text-slate-500">ঋণের উদ্দেশ্য:</span>
                                                <span className="font-medium text-slate-800 text-right max-w-[200px] sm:max-w-[240px]">{application.purpose_of_loan}</span>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* TAB 3: HEAD OFFICE ISSUES & FEEDBACK */}
                        {activeTab === 'issues' && (
                            <div className="printable-area p-3.5 sm:p-6 space-y-4">
                                {issues.length === 0 ? (
                                    <div className="text-center py-12 bg-slate-50/50 rounded-xl border border-dashed border-slate-300">
                                        <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                                        <p className="font-semibold text-slate-700">কোনো সমস্যা বা বার্তা পাওয়া যায়নি</p>
                                        <p className="text-xs text-slate-500 mt-1">হেড অফিস থেকে কোনো ফিডব্যাক বা সংশোধন নির্দেশ থাকলে তা এখানে দেখাবে।</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {issues.map((issue) => (
                                            <div
                                                key={issue.id}
                                                className={`p-3.5 sm:p-4 rounded-xl border text-xs sm:text-sm transition shadow-xs ${
                                                    issue.status === 'pending'
                                                        ? 'bg-amber-50/80 border-amber-200'
                                                        : issue.status === 'resolved'
                                                          ? 'bg-emerald-50/50 border-emerald-200'
                                                          : 'bg-rose-50/50 border-rose-200'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-3 mb-2">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-bold text-slate-900">হেড অফিসের নির্দেশ/সমস্যা</span>
                                                        <Badge
                                                            className={
                                                                issue.status === 'pending'
                                                                    ? 'bg-amber-200 text-amber-900 border-amber-300'
                                                                    : issue.status === 'resolved'
                                                                      ? 'bg-emerald-200 text-emerald-900 border-emerald-300'
                                                                      : 'bg-rose-200 text-rose-900 border-rose-300'
                                                            }
                                                        >
                                                            {issue.status === 'pending'
                                                                ? 'পেন্ডিং'
                                                                : issue.status === 'resolved'
                                                                  ? 'সমাধান করা হয়েছে'
                                                                  : 'প্রত্যাখ্যান করা হয়েছে'}
                                                        </Badge>
                                                    </div>
                                                    <span className="text-[11px] text-slate-500 font-mono whitespace-nowrap">
                                                        {formatDateTime(issue.created_at)}
                                                    </span>
                                                </div>

                                                <p className="text-slate-800 whitespace-pre-wrap bg-white/70 p-3 rounded-lg border border-slate-200/50">{issue.issue_description}</p>
                                                <p className="text-xs text-slate-500 mt-2">
                                                    প্রেরক: <span className="font-semibold text-slate-700">{issue.reporter?.name || 'হেড অফিস'}</span>
                                                </p>

                                                {issue.response_message && (
                                                    <div className="mt-3 p-3 rounded-lg bg-indigo-50/80 border border-indigo-200/80">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <MessageSquare className="w-4 h-4 text-indigo-700" />
                                                            <span className="font-bold text-indigo-900">শাখার উত্তর</span>
                                                        </div>
                                                        <p className="text-indigo-950 whitespace-pre-wrap">{issue.response_message}</p>
                                                    </div>
                                                )}

                                                {issue.status === 'pending' && canRespondToIssues && (
                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs" onClick={() => openIssueAction(issue.id, 'resolve')}>
                                                            <CheckCircle2 className="w-4 h-4 mr-1" />
                                                            সমাধান করেছি — উত্তর দিন
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="border-rose-200 text-rose-700 hover:bg-rose-50 rounded-lg text-xs"
                                                            onClick={() => openIssueAction(issue.id, 'reject')}
                                                        >
                                                            <XCircle className="w-4 h-4 mr-1" />
                                                            সমস্যা অস্বীকার করুন
                                                        </Button>
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

            {/* Branch Manager Approval / Forward Modal */}
            {approveModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 print:hidden">
                    <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
                        <div className="border-b px-5 py-4 bg-slate-50 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    {mustForwardApproval ? (
                                        <>
                                            <ArrowUpRight className="w-5 h-5 text-blue-600" /> উচ্চতর কর্মকর্তার কাছে ফরওয়ার্ড
                                        </>
                                    ) : (
                                        <>
                                            <ShieldCheck className="w-5 h-5 text-emerald-600" /> ঋণ আবেদন শাখা অনুমোদন
                                        </>
                                    )}
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">আবেদন নং: {application.application_no}</p>
                            </div>
                            <button type="button" onClick={() => setApproveModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleBranchApprovalSubmit} className="p-5 space-y-4">
                            {mustForwardApproval ? (
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        কর্মকর্তা নির্বাচন <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        value={forwardToUserId}
                                        onChange={(e) => setForwardToUserId(e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm bg-white font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-xs"
                                        required
                                    >
                                        <option value="">নির্বাচন করুন...</option>
                                        {escalationApprovers.map((approver) => (
                                            <option key={approver.id} value={approver.id}>
                                                {approver.name} ({approver.role_name || approver.level})
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2 mt-2">
                                        ৭০,০০০ টাকা বা তার বেশি ঋণ সরাসরি অনুমোদন করা যাবে না। Area / Zone / ADMF / DMF / ED নির্বাচন করে ফরওয়ার্ড করুন।
                                    </p>
                                    {escalationApprovers.length === 0 && (
                                        <p className="text-[11px] text-rose-700 mt-1">কোনো উচ্চতর কর্মকর্তা পাওয়া যায়নি। ইউজার সেটিংস যাচাই করুন।</p>
                                    )}
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">অনুমোদিত ঋণের পরিমাণ (টাকা):</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={approvalAmount}
                                        onChange={(e) => setApprovalAmount(e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-bold text-emerald-700 shadow-xs"
                                        required
                                    />
                                    <p className="text-[11px] text-slate-500 mt-1">আবেদিত পরিমাণ: ৳{Number(application.requested_amount || 0).toLocaleString('bn-BD')}</p>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">শাখা ব্যবস্থাপকের মন্তব্য (ঐচ্ছিক):</label>
                                <textarea
                                    value={approvalComments}
                                    onChange={(e) => setApprovalComments(e.target.value)}
                                    rows={3}
                                    className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-xs"
                                    placeholder={mustForwardApproval ? 'ঐচ্ছিক মন্তব্য লিখুন...' : 'অনুমোদন সংক্রান্ত মন্তব্য লিখুন...'}
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t">
                                <Button type="button" variant="outline" className="rounded-xl text-xs" onClick={() => setApproveModalOpen(false)}>
                                    বাতিল
                                </Button>
                                <Button
                                    type="submit"
                                    className={`text-white rounded-xl text-xs font-bold shadow-xs ${
                                        mustForwardApproval
                                            ? 'bg-blue-600 hover:bg-blue-700'
                                            : 'bg-emerald-600 hover:bg-emerald-700'
                                    }`}
                                    disabled={submittingApproval || (mustForwardApproval && !forwardToUserId)}
                                >
                                    {submittingApproval
                                        ? (mustForwardApproval ? 'ফরওয়ার্ড হচ্ছে...' : 'অনুমোদন হচ্ছে...')
                                        : (mustForwardApproval ? 'ফরওয়ার্ড নিশ্চিত করুন' : 'অনুমোদন নিশ্চিত করুন')}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Issue Resolution Modal */}
            {issueAction && selectedIssueId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 print:hidden">
                    <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
                        <div className="border-b px-5 py-4 bg-slate-50">
                            <h3 className="text-lg font-bold text-slate-900">
                                {issueAction === 'resolve' ? 'সমস্যা সমাধানের উত্তর' : 'সমস্যা অস্বীকারের উত্তর'}
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
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
                                className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-xs"
                                placeholder="এখানে আপনার উত্তর লিখুন..."
                                required
                                minLength={10}
                            />
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" className="rounded-xl" onClick={closeIssueAction}>
                                    বাতিল
                                </Button>
                                <Button
                                    type="submit"
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
                                    disabled={issueAction === 'resolve' ? resolveForm.processing : rejectForm.processing}
                                >
                                    {issueAction === 'resolve' ? 'সমাধান সংরক্ষণ' : 'অস্বীকার সংরক্ষণ'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Disbursement Confirmation Modal */}
            {disburseModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 print:hidden">
                    <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
                        <div className="border-b px-5 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-200" /> ঋণ বিতরণ নিশ্চিতকরণ
                                </h3>
                                <p className="text-xs text-emerald-100 mt-0.5">আবেদন নং: {application.application_no}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDisburseModalOpen(false)}
                                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
                            >
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleDisburseSubmit} className="p-5 space-y-4">
                            {/* Member & Approved Info summary box */}
                            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2 text-xs">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500 font-medium">সদস্যের নাম:</span>
                                    <span className="font-bold text-slate-800">{memberName}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500 font-medium">অনুমোদিত ঋণ পরিমাণ:</span>
                                    <span className="font-bold text-emerald-700 text-sm">
                                        ৳{maxDisburseAmount.toLocaleString('bn-BD')}
                                    </span>
                                </div>
                            </div>

                            {/* Disbursed Amount Input */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    প্রকৃত বিতরণকৃত ঋণের পরিমাণ (টাকা): <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">৳</span>
                                    <input
                                        type="number"
                                        min="1"
                                        step="any"
                                        value={disburseAmount}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setDisburseAmount(val);
                                            const num = parseFloat(val);
                                            if (!isNaN(num) && num <= 0) {
                                                setDisburseError('বিতরণকৃত ঋণের পরিমাণ অন্তত ১ টাকা হতে হবে।');
                                            } else {
                                                setDisburseError(null);
                                            }
                                        }}
                                        className="w-full rounded-xl border border-slate-300 pl-8 pr-3.5 py-2.5 text-base focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 font-black text-emerald-700 shadow-xs"
                                        placeholder="টাকার পরিমাণ লিখুন"
                                        required
                                    />
                                </div>
                                {parseFloat(disburseAmount) > maxDisburseAmount && (
                                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                                        <span>অনুমোদিত পরিমাণের চেয়ে <strong>৳{(parseFloat(disburseAmount) - maxDisburseAmount).toLocaleString('bn-BD')}</strong> বেশি বিতরণ করা হচ্ছে।</span>
                                    </div>
                                )}
                                {disburseError ? (
                                    <p className="text-xs text-rose-600 font-semibold mt-1.5 flex items-center gap-1">
                                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                        {disburseError}
                                    </p>
                                ) : (
                                    <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                                        💡 সদস্য কম বা বেশি টাকা নিতে চাইলে এখানে পরিমাণ পরিবর্তন করুন। এটি সেভ হলে সংশ্লিষ্ট সকল ফর্ম ও কিস্তির হিসাব স্বয়ংক্রিয়ভাবে আপডেট হবে।
                                    </p>
                                )}
                            </div>

                            {/* Disbursement Method & Reference */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">বিতরণ মাধ্যম:</label>
                                    <select
                                        value={disbursementMethod}
                                        onChange={(e) => setDisbursementMethod(e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-white"
                                    >
                                        <option value="cash">নগদ (Cash)</option>
                                        <option value="bank">ব্যাংক একাউন্ট (Bank)</option>
                                        <option value="bkash">বিকাশ (bKash)</option>
                                        <option value="nagad">নগদ (Nagad)</option>
                                        <option value="other">অন্যান্য (Other)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">ভাউচার / চেক / রেফারেন্স নং:</label>
                                    <input
                                        type="text"
                                        value={disbursementReference}
                                        onChange={(e) => setDisbursementReference(e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                                        placeholder="ঐচ্ছিক রেফারেন্স"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="rounded-xl text-xs"
                                    onClick={() => setDisburseModalOpen(false)}
                                    disabled={submittingDisburse}
                                >
                                    বাতিল
                                </Button>
                                <Button
                                    type="submit"
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs px-4"
                                    disabled={submittingDisburse || !!disburseError || !disburseAmount || parseFloat(disburseAmount) <= 0}
                                >
                                    {submittingDisburse ? 'বিতরণ হচ্ছে...' : 'বিতরণ নিশ্চিত করুন'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
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

            {/* Loan Product Change Modal */}
            {loanProductModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 print:hidden">
                    <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
                        <div className="border-b px-5 py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold flex items-center gap-2">
                                    <CreditCard className="w-5 h-5 text-indigo-200" /> ঋণ প্রোডাক্ট ও ক্যাটাগরি পরিবর্তন
                                </h3>
                                <p className="text-xs text-indigo-100 mt-0.5">আবেদন নং: {application.application_no}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setLoanProductModalOpen(false)}
                                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleLoanProductSubmit} className="p-5 space-y-4">
                            {/* Current Product Info Banner */}
                            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-1 text-xs">
                                <p className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">বর্তমান প্রোডাক্ট ও ক্যাটাগরি</p>
                                <p className="font-bold text-slate-800 text-sm">
                                    {application.loan_product?.product_name_bn || application.loan_product?.product_name || '-'}
                                    <span className="text-xs font-normal text-slate-500 ml-1.5">
                                        ({application.loan_category?.category_name_bn || application.loan_category?.category_name || '-'})
                                    </span>
                                </p>
                            </div>

                            {/* Loan Category Select */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    ঋণ ক্যাটাগরি নির্বাচন করুন: <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={selectedCategoryId}
                                    onChange={(e) => handleCategoryChange(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm bg-white font-semibold focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-xs cursor-pointer"
                                    required
                                >
                                    <option value="">ক্যাটাগরি নির্বাচন করুন...</option>
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.category_name_bn || cat.category_name} {cat.category_code ? `(${cat.category_code})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Loan Product Select */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    নতুন ঋণ প্রোডাক্ট নির্বাচন করুন: <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={selectedProductId}
                                    onChange={(e) => setSelectedProductId(e.target.value)}
                                    disabled={!selectedCategoryId || modalCategoryProducts.length === 0}
                                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm bg-white font-bold text-indigo-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-xs disabled:bg-slate-100 disabled:text-slate-400 cursor-pointer"
                                    required
                                >
                                    <option value="">
                                        {modalCategoryProducts.length === 0 ? 'এই ক্যাটাগরিতে কোনো সক্রিয় প্রোডাক্ট নেই' : 'প্রোডাক্ট নির্বাচন করুন...'}
                                    </option>
                                    {modalCategoryProducts.map((prod) => (
                                        <option key={prod.id} value={prod.id}>
                                            {prod.product_name_bn || prod.product_name} {prod.product_code ? `[${prod.product_code}]` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Selected Product Specs Preview */}
                            {modalActiveProduct && (
                                <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-xl p-3.5 space-y-2 text-xs text-indigo-950 animate-in fade-in duration-100">
                                    <p className="font-bold text-indigo-900 text-xs flex items-center gap-1.5">
                                        <Info className="w-4 h-4 text-indigo-600" /> নতুন প্রোডাক্টের বিবরণ ও শর্তাবলী:
                                    </p>
                                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-indigo-200/60 text-[11px]">
                                        <div>
                                            <span className="text-slate-500 font-medium">কিস্তির ধরন:</span>{' '}
                                            <span className="font-bold text-slate-800">
                                                {modalActiveProduct.installment_type === 'weekly' ? 'সাপ্তাহিক (Weekly)' : modalActiveProduct.installment_type === 'monthly' ? 'মাসিক (Monthly)' : modalActiveProduct.installment_type || '-'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 font-medium">মেয়াদ:</span>{' '}
                                            <span className="font-bold text-slate-800">{modalActiveProduct.duration_months || 12} মাস</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 font-medium">মোট কিস্তি:</span>{' '}
                                            <span className="font-bold text-slate-800">{modalActiveProduct.number_of_installments || '-'} টি</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 font-medium">সুদের হার:</span>{' '}
                                            <span className="font-bold text-emerald-700">{modalActiveProduct.interest_rate || 0}%</span>
                                        </div>
                                    </div>
                                    {Number(modalActiveProduct.max_amount || 0) > 0 && (
                                        <p className="text-[10px] text-slate-600 mt-1">
                                            ঋণ সীমা: ৳{Number(modalActiveProduct.min_amount || 0).toLocaleString('bn-BD')} হতে ৳{Number(modalActiveProduct.max_amount || 0).toLocaleString('bn-BD')} পর্যন্ত
                                        </p>
                                    )}
                                </div>
                            )}

                            <p className="text-[11px] text-slate-500 leading-relaxed">
                                💡 প্রোডাক্ট পরিবর্তন করলে আবেদনপত্রের কিস্তির ধরন, মেয়াদ এবং সংশ্লিষ্ট ফর্মগুলোর প্রোডাক্ট রেফারেন্স তথ্য স্বয়ংক্রিয়ভাবে আপডেট হবে।
                            </p>

                            <div className="flex justify-end gap-2 pt-3 border-t">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="rounded-xl text-xs"
                                    onClick={() => setLoanProductModalOpen(false)}
                                    disabled={submittingLoanProduct}
                                >
                                    বাতিল
                                </Button>
                                <Button
                                    type="submit"
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs px-4"
                                    disabled={submittingLoanProduct || !selectedCategoryId || !selectedProductId || (String(selectedProductId) === String(application.loan_product_id) && String(selectedCategoryId) === String(application.loan_category_id))}
                                >
                                    {submittingLoanProduct ? 'পরিবর্তন হচ্ছে...' : 'প্রোডাক্ট পরিবর্তন করুন'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Head Office Dispatch Confirmation / Warning Modal */}
            <SendLoanToHoModal
                isOpen={showLoanHoModal}
                onClose={() => {
                    if (!isSendingLoanToHo) {
                        setShowLoanHoModal(false);
                    }
                }}
                onConfirm={handleConfirmSendLoanToHo}
                isLoading={isSendingLoanToHo}
                items={[
                    {
                        id: application.id,
                        application_no: application.application_no,
                        applicant_name:
                            application.member_admission?.applicant_name_bn ||
                            application.member_admission?.applicant_name_en ||
                            application.member_admission?.member_name_bn ||
                            application.member_admission?.member_name_en ||
                            'সদস্য',
                        branch_name: application.branch?.name,
                        amount: application.requested_amount || application.approved_amount,
                    },
                ]}
            />
        </AdminLayout>
    );
}
