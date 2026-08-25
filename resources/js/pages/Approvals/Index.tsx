import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { SmartDateInput } from '@/components/ui/SmartDateInput';
import { formatDate } from '@/utils/dateUtils';
import { formatBranchLabel, keepListFilters, sortBranchesByCode } from '@/utils/branchLabel';
import { formatCurrency } from '@/utils/formatAmount';
import AutoFitTableContainer from '@/components/AutoFitTableContainer';
import {
    CheckCircle2,
    XCircle,
    RotateCcw,
    Eye,
    Edit3,
    MessageSquare,
    Search,
    Building2,
    Users,
    Clock,
    AlertCircle,
    X,
    Copy,
    Check,
    ArrowUpRight,
    Coins,
    AlertTriangle,
    RefreshCw,
    ShieldCheck,
    UserCheck,
} from 'lucide-react';

interface EscalationApprover {
    id: number;
    name: string;
    email: string;
    level: string;
    role_name: string;
}

interface Approval {
    id: number;
    member_admission_id: number;
    application_no: string;
    applicant_name: string;
    applicant_name_bn: string;
    branch_name: string;
    branch_id?: number;
    branch_code?: string;
    samity_name: string;
    submitted_at: string;
    level: string;
    sequence: number;
    revision_count: number;
    revision_comments: string | null;
    status: string;
    requested_loan_amount?: number;
    escalation_approvers?: EscalationApprover[];
    block_list?: BlockListFields;
}

interface LoanApproval {
    id: number;
    loan_application_id: number;
    application_no: string;
    applicant_name: string;
    applicant_name_bn: string;
    branch_name: string;
    branch_id?: number;
    branch_code?: string;
    requested_amount: number;
    submitted_at: string;
    level: string;
    sequence?: number;
    escalation_approvers?: EscalationApprover[];
    block_list?: BlockListFields;
}

interface BlockListFields {
    name_bn?: string;
    father_name?: string;
    mother_name?: string;
    spouse_name?: string;
    dob?: string;
    nid_number?: string;
    phone_number?: string;
    address?: string;
}

function toEnglishDigits(value: string): string {
    const banglaToEnglishMap: Record<string, string> = {
        '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
        '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
    };
    let result = '';
    for (const ch of value) {
        result += banglaToEnglishMap[ch] ?? ch;
    }
    return result.replace(/[^0-9]/g, '');
}

function validateNid(value: string): string | null {
    if (!value.trim()) return 'NID নম্বর প্রয়োজন';
    if (value.length < 10 || value.length > 17) return 'NID ১০–১৭ অঙ্কের হতে হবে';
    return null;
}

function validatePhone(value: string): string | null {
    if (!value.trim()) return 'ফোন নম্বর প্রয়োজন';
    if (value.length < 10) return `আরও ${10 - value.length} অঙ্ক লিখুন (মোট ১০–১৪)`;
    if (value.length > 14) return 'সর্বোচ্চ ১৪ অঙ্ক';
    return null;
}

function validateRejectComments(value: string): string | null {
    if (!value.trim()) return 'প্রত্যাখ্যানের কারণ লিখুন';
    return null;
}

function isValidDate(day: number, month: number, year: number): boolean {
    if (year < 1900 || year > 2100) return false;
    if (month < 1 || month > 12) return false;
    const daysInMonth = new Date(year, month, 0).getDate();
    return day >= 1 && day <= daysInMonth;
}

function validateDob(value: string | undefined | null): string | null {
    if (!value) return null;
    if (value.includes('/')) {
        const digits = value.replace(/\D/g, '');
        if (digits.length < 8) return 'পূর্ণাঙ্গ তারিখ লিখুন (দিন/মাস/বছর)';
        const day = parseInt(digits.slice(0, 2), 10);
        const month = parseInt(digits.slice(2, 4), 10);
        const year = parseInt(digits.slice(4, 8), 10);
        if (!isValidDate(day, month, year)) return 'সঠিক তারিখ লিখুন (দিন/মাস/বছর)';
    }
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (match) {
        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const day = parseInt(match[3], 10);
        if (isValidDate(day, month, year)) return null;
    }
    return 'সঠিক তারিখ লিখুন (দিন/মাস/বছর)';
}

function FieldError({ message }: { message?: string | null }) {
    if (!message) return null;
    return <p className="mt-1 text-[11px] font-medium text-rose-600">{message}</p>;
}

function emptyBlockList(): BlockListFields {
    return {
        name_bn: '',
        father_name: '',
        mother_name: '',
        spouse_name: '',
        dob: '',
        nid_number: '',
        phone_number: '',
        address: '',
    };
}

function buildBlockListFromAdmission(approval?: Approval | null): BlockListFields {
    const bl = approval?.block_list;
    return {
        name_bn: bl?.name_bn ?? '',
        father_name: bl?.father_name ?? '',
        mother_name: bl?.mother_name ?? '',
        spouse_name: bl?.spouse_name ?? '',
        dob: bl?.dob ?? '',
        nid_number: toEnglishDigits(bl?.nid_number ?? ''),
        phone_number: toEnglishDigits(bl?.phone_number ?? ''),
        address: bl?.address ?? '',
    };
}

function buildBlockListFromLoan(approval?: LoanApproval | null): BlockListFields {
    const bl = approval?.block_list;
    return {
        name_bn: bl?.name_bn ?? '',
        father_name: bl?.father_name ?? '',
        mother_name: bl?.mother_name ?? '',
        spouse_name: bl?.spouse_name ?? '',
        dob: bl?.dob ?? '',
        nid_number: toEnglishDigits(bl?.nid_number ?? ''),
        phone_number: toEnglishDigits(bl?.phone_number ?? ''),
        address: bl?.address ?? '',
    };
}

async function fetchBlockListUsernameVerify(
    branchCode?: string | null,
): Promise<{ ok: boolean; message: string }> {
    const params = new URLSearchParams();
    if (branchCode?.trim()) {
        params.set('branch_code', branchCode.trim());
    }
    const qs = params.toString();
    const res = await fetch(
        `/team-based-approvals/block-list/verify${qs ? `?${qs}` : ''}`,
        {
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
            credentials: 'same-origin',
        },
    );
    if (!res.ok) {
        return { ok: false, message: 'Block list username যাচাই করা যায়নি।' };
    }
    const data = await res.json();
    return {
        ok: Boolean(data.ok),
        message:
            typeof data.message === 'string'
                ? data.message
                : 'Username block list-এ পাওয়া যায়নি।',
    };
}

interface ZoneOption {
    id: number;
    name: string;
    code?: string;
}

interface AreaOption {
    id: number;
    name: string;
    code?: string;
    zone_id: number;
}

interface BranchOption {
    id: number;
    name: string;
    code?: string;
    area_id: number;
}

interface Props {
    approvals: Approval[];
    loanApprovals?: LoanApproval[];
    zones?: ZoneOption[];
    areas?: AreaOption[];
    branches?: BranchOption[];
    filters?: {
        zone_id?: string;
        area_id?: string;
        branch_id?: string;
    };
}

export default function Index({
    approvals = [],
    loanApprovals = [],
    zones = [],
    areas = [],
    branches = [],
    filters = {},
}: Props) {
    const page = usePage() as {
        url: string;
        props: {
            auth?: { user?: { username?: string | null; name?: string; role?: { name: string } } };
            flash?: { error?: string | null; success?: string | null };
            errors?: Record<string, string>;
        };
    };
    const authUsername = page.props.auth?.user?.username ?? '';
    const pageUrl = page.url;

    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'admissions' | 'loans'>('all');

    const [selectedZone, setSelectedZone] = useState(filters?.zone_id || '');
    const [selectedArea, setSelectedArea] = useState(filters?.area_id || '');
    const [selectedBranch, setSelectedBranch] = useState(filters?.branch_id || '');

    const [copiedAppNo, setCopiedAppNo] = useState<string | null>(null);

    // Revision notes popup modal
    const [revisionModalData, setRevisionModalData] = useState<{
        applicant_name: string;
        application_no: string;
        revision_count: number;
        revision_comments: string | null;
    } | null>(null);

    useEffect(() => {
        setSelectedZone(filters?.zone_id ? String(filters.zone_id) : '');
        setSelectedArea(filters?.area_id ? String(filters.area_id) : '');
        setSelectedBranch(filters?.branch_id ? String(filters.branch_id) : '');
    }, [filters?.zone_id, filters?.area_id, filters?.branch_id]);

    const filteredAreas = useMemo(() => {
        if (!selectedZone) return areas;
        return areas.filter((a) => String(a.zone_id) === String(selectedZone));
    }, [areas, selectedZone]);

    const filteredBranches = useMemo(() => {
        let list = branches;
        if (selectedZone) {
            const areaIds = new Set(filteredAreas.map((a) => String(a.id)));
            list = list.filter((b) => areaIds.has(String(b.area_id)));
        }
        if (selectedArea) {
            list = list.filter((b) => String(b.area_id) === String(selectedArea));
        }
        return sortBranchesByCode(list);
    }, [branches, selectedZone, selectedArea, filteredAreas]);

    const handleLocationFilterChange = (zoneVal: string, areaVal: string, branchVal: string) => {
        setSelectedZone(zoneVal);
        setSelectedArea(areaVal);
        setSelectedBranch(branchVal);

        const params: Record<string, string> = {};
        if (zoneVal) params.zone_id = zoneVal;
        if (areaVal) params.area_id = areaVal;
        if (branchVal) params.branch_id = branchVal;

        router.get('/approvals', params, { preserveState: true, preserveScroll: true });
    };

    const hasActiveFilters = Boolean(selectedZone || selectedArea || selectedBranch || searchQuery);

    const resetFilters = () => {
        setSelectedZone('');
        setSelectedArea('');
        setSelectedBranch('');
        setSearchQuery('');
        router.get('/approvals', {}, { preserveState: true, preserveScroll: true });
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedAppNo(text);
        setTimeout(() => setCopiedAppNo(null), 2000);
    };

    // Member Admission Modals state
    const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
    const [action, setAction] = useState<'approve' | 'reject' | 'return' | 'forward' | null>(null);
    const [comments, setComments] = useState('');
    const [forwardToUserId, setForwardToUserId] = useState<string>('');
    const [showModal, setShowModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pushToBlockList, setPushToBlockList] = useState(true);
    const [admissionBlockList, setAdmissionBlockList] = useState<BlockListFields>(emptyBlockList);
    const [admissionBlockErrors, setAdmissionBlockErrors] = useState<Record<string, string | null>>({});
    const [commentsError, setCommentsError] = useState<string | null>(null);
    const [serverError, setServerError] = useState<string | null>(null);
    const [usernameVerifying, setUsernameVerifying] = useState(false);
    const [usernameVerified, setUsernameVerified] = useState(false);
    const [usernameVerifyError, setUsernameVerifyError] = useState<string | null>(null);
    const [checkingUsername, setCheckingUsername] = useState(false);

    // Loan Modals state
    const [selectedLoanApproval, setSelectedLoanApproval] = useState<LoanApproval | null>(null);
    const [loanAction, setLoanAction] = useState<'approve' | 'reject' | 'forward' | null>(null);
    const [loanComments, setLoanComments] = useState('');
    const [loanApprovedAmount, setLoanApprovedAmount] = useState('');
    const [loanForwardToUserId, setLoanForwardToUserId] = useState<string>('');
    const [showLoanModal, setShowLoanModal] = useState(false);
    const [loanPushToBlockList, setLoanPushToBlockList] = useState(false);
    const [loanBlockList, setLoanBlockList] = useState<BlockListFields>(emptyBlockList);
    const [loanBlockErrors, setLoanBlockErrors] = useState<Record<string, string | null>>({});
    const [loanCommentsError, setLoanCommentsError] = useState<string | null>(null);
    const [loanServerError, setLoanServerError] = useState<string | null>(null);
    const [loanUsernameVerifying, setLoanUsernameVerifying] = useState(false);
    const [loanUsernameVerified, setLoanUsernameVerified] = useState(false);
    const [loanUsernameVerifyError, setLoanUsernameVerifyError] = useState<string | null>(null);
    const [checkingLoanUsername, setCheckingLoanUsername] = useState(false);

    // Search Filtering
    const filteredApprovals = useMemo(() => {
        if (!searchQuery.trim()) return approvals;
        const q = searchQuery.toLowerCase().trim();
        return approvals.filter(
            (a) =>
                a.application_no?.toLowerCase().includes(q) ||
                a.applicant_name?.toLowerCase().includes(q) ||
                a.applicant_name_bn?.toLowerCase().includes(q) ||
                a.branch_name?.toLowerCase().includes(q) ||
                a.samity_name?.toLowerCase().includes(q)
        );
    }, [approvals, searchQuery]);

    const filteredLoanApprovals = useMemo(() => {
        if (!searchQuery.trim()) return loanApprovals;
        const q = searchQuery.toLowerCase().trim();
        return loanApprovals.filter(
            (l) =>
                l.application_no?.toLowerCase().includes(q) ||
                l.applicant_name?.toLowerCase().includes(q) ||
                l.applicant_name_bn?.toLowerCase().includes(q) ||
                l.branch_name?.toLowerCase().includes(q)
        );
    }, [loanApprovals, searchQuery]);

    // Financial Metrics Calculation
    const totalLoanRequestedAmount = useMemo(() => {
        return loanApprovals.reduce((acc, curr) => acc + (Number(curr.requested_amount) || 0), 0);
    }, [loanApprovals]);

    const resetAdmissionBlockList = () => {
        setPushToBlockList(true);
        setAdmissionBlockList(emptyBlockList());
        setAdmissionBlockErrors({});
        setCommentsError(null);
        setServerError(null);
        setUsernameVerified(false);
        setUsernameVerifyError(null);
        setUsernameVerifying(false);
        setCheckingUsername(false);
    };

    const closeAdmissionModal = () => {
        setShowModal(false);
        setSelectedApproval(null);
        setAction(null);
        setComments('');
        setForwardToUserId('');
        resetAdmissionBlockList();
        setIsSubmitting(false);
    };

    const applyServerErrors = (errors: Record<string, string | string[]>) => {
        const pick = (key: string): string | null => {
            const value = errors[key];
            if (Array.isArray(value)) return value[0] ?? null;
            return typeof value === 'string' ? value : null;
        };
        setCommentsError(pick('comments'));
        setAdmissionBlockErrors((prev) => ({
            ...prev,
            nid_number: pick('block_list.nid_number') ?? prev.nid_number,
            phone_number: pick('block_list.phone_number') ?? prev.phone_number,
            dob: pick('block_list.dob') ?? prev.dob,
        }));
        const first = Object.values(errors).flat().find((v) => typeof v === 'string' && v.trim());
        if (typeof first === 'string') {
            setServerError(first);
        }
    };

    const handleAction = (approval: Approval, actionType: 'approve' | 'reject' | 'return' | 'forward') => {
        const isBranch = approval.level === 'branch';
        const amount = Number(approval.requested_loan_amount || 0);

        if (actionType === 'approve' && isBranch && amount >= 70000) {
            setSelectedApproval(approval);
            setAction('forward');
            setComments('');
            setCommentsError(null);
            setServerError(null);
            setForwardToUserId('');
            resetAdmissionBlockList();
            setShowModal(true);
            return;
        }

        setSelectedApproval(approval);
        setAction(actionType);
        setComments('');
        setCommentsError(null);
        setServerError(null);
        setForwardToUserId('');
        if (actionType === 'reject') {
            const bl = buildBlockListFromAdmission(approval);
            setPushToBlockList(true);
            setAdmissionBlockList(bl);
            setAdmissionBlockErrors({
                nid_number: validateNid(bl.nid_number ?? ''),
                phone_number: validatePhone(bl.phone_number ?? ''),
                dob: validateDob(bl.dob),
            });
            setUsernameVerified(false);
            setUsernameVerifyError(null);
        } else {
            resetAdmissionBlockList();
        }
        setShowModal(true);
    };

    const submitAction = () => {
        if (!selectedApproval || !action) return;
        if (action === 'forward' && !forwardToUserId) {
            alert('অনুগ্রহ করে ফরওয়ার্ড করার জন্য একজন অনুমোদনকারী কর্মকর্তা নির্বাচন করুন।');
            return;
        }

        if (action === 'reject' && !validateAdmissionReject()) {
            return;
        }

        setIsSubmitting(true);
        setServerError(null);

        if (action === 'forward') {
            router.patch(
                `/approvals/${selectedApproval.id}/forward`,
                {
                    forward_to_user_id: forwardToUserId,
                    comments,
                },
                {
                    ...keepListFilters,
                    onSuccess: (visit) => {
                        const flashError = (visit.props as { flash?: { error?: string | null } }).flash?.error;
                        if (flashError) {
                            setServerError(flashError);
                            setIsSubmitting(false);
                            return;
                        }
                        closeAdmissionModal();
                    },
                    onError: (errors) => {
                        applyServerErrors(errors);
                        setIsSubmitting(false);
                    },
                }
            );
            return;
        }

        const routes = {
            approve: `/approvals/${selectedApproval.id}/approve`,
            reject: `/approvals/${selectedApproval.id}/reject`,
            return: `/approvals/${selectedApproval.id}/return-to-branch`,
        };

        const payload: Record<string, unknown> = { comments };
        if (action === 'reject') {
            payload.push_to_block_list = pushToBlockList;
            if (pushToBlockList) {
                payload.block_list = {
                    name_bn: admissionBlockList.name_bn || undefined,
                    father_name: admissionBlockList.father_name || undefined,
                    mother_name: admissionBlockList.mother_name || undefined,
                    spouse_name: admissionBlockList.spouse_name || undefined,
                    dob: admissionBlockList.dob || undefined,
                    nid_number: admissionBlockList.nid_number,
                    phone_number: (admissionBlockList.phone_number ?? '').replace(/\D/g, ''),
                    address: admissionBlockList.address || undefined,
                };
            }
        }

        router.patch(routes[action as keyof typeof routes], payload, {
            ...keepListFilters,
            onSuccess: (visit) => {
                const flashError = (visit.props as { flash?: { error?: string | null } }).flash?.error;
                if (flashError) {
                    setServerError(flashError);
                    setIsSubmitting(false);
                    return;
                }
                closeAdmissionModal();
            },
            onError: (errors) => {
                applyServerErrors(errors);
                setIsSubmitting(false);
            },
        });
    };

    const resetLoanBlockList = () => {
        setLoanPushToBlockList(false);
        setLoanBlockList(emptyBlockList());
        setLoanBlockErrors({});
        setLoanCommentsError(null);
        setLoanServerError(null);
        setLoanUsernameVerified(false);
        setLoanUsernameVerifyError(null);
        setLoanUsernameVerifying(false);
        setCheckingLoanUsername(false);
    };

    const handleLoanAction = (loanApproval: LoanApproval, actionType: 'approve' | 'reject' | 'forward') => {
        const isBranch = loanApproval.level === 'branch';
        const amount = Number(loanApproval.requested_amount || 0);

        if (actionType === 'approve' && isBranch && amount >= 70000) {
            setSelectedLoanApproval(loanApproval);
            setLoanAction('forward');
            setLoanComments('');
            setLoanCommentsError(null);
            setLoanServerError(null);
            setLoanApprovedAmount('');
            setLoanForwardToUserId('');
            resetLoanBlockList();
            setShowLoanModal(true);
            return;
        }

        setSelectedLoanApproval(loanApproval);
        setLoanAction(actionType);
        setLoanComments('');
        setLoanCommentsError(null);
        setLoanServerError(null);
        setLoanApprovedAmount(
            actionType === 'approve' && loanApproval.requested_amount != null
                ? String(Math.round(Number(loanApproval.requested_amount)))
                : ''
        );
        setLoanForwardToUserId('');
        if (actionType === 'reject') {
            const bl = buildBlockListFromLoan(loanApproval);
            setLoanPushToBlockList(false);
            setLoanBlockList(bl);
            setLoanBlockErrors({
                nid_number: validateNid(bl.nid_number ?? ''),
                phone_number: validatePhone(bl.phone_number ?? ''),
                dob: validateDob(bl.dob),
            });
            setLoanUsernameVerified(false);
            setLoanUsernameVerifyError(null);
        } else {
            resetLoanBlockList();
        }
        setShowLoanModal(true);
    };

    const resetLoanModal = () => {
        setShowLoanModal(false);
        setSelectedLoanApproval(null);
        setLoanAction(null);
        setLoanComments('');
        setLoanApprovedAmount('');
        setLoanForwardToUserId('');
        resetLoanBlockList();
        setIsSubmitting(false);
    };

    const applyLoanServerErrors = (errors: Record<string, string | string[]>) => {
        const pick = (key: string): string | null => {
            const value = errors[key];
            if (Array.isArray(value)) return value[0] ?? null;
            return typeof value === 'string' ? value : null;
        };
        setLoanCommentsError(pick('comments'));
        setLoanBlockErrors((prev) => ({
            ...prev,
            nid_number: pick('block_list.nid_number') ?? prev.nid_number,
            phone_number: pick('block_list.phone_number') ?? prev.phone_number,
            dob: pick('block_list.dob') ?? prev.dob,
        }));
        const first = Object.values(errors).flat().find((v) => typeof v === 'string' && v.trim());
        if (typeof first === 'string') {
            setLoanServerError(first);
        }
    };

    const verifyLoanBlockListUsername = useCallback(async () => {
        if (!authUsername?.trim()) {
            setLoanUsernameVerified(false);
            setLoanUsernameVerifyError('Username সেট করা নেই');
            return;
        }
        if (!selectedLoanApproval?.branch_code?.trim()) {
            setLoanUsernameVerified(false);
            setLoanUsernameVerifyError('শাখার code পাওয়া যায়নি। Block list যাচাই করা যায়নি।');
            return;
        }
        setLoanUsernameVerifying(true);
        setLoanUsernameVerifyError(null);
        setLoanUsernameVerified(false);
        try {
            const result = await fetchBlockListUsernameVerify(selectedLoanApproval.branch_code);
            if (result.ok) {
                setLoanUsernameVerified(true);
                setLoanUsernameVerifyError(null);
            } else {
                setLoanUsernameVerified(false);
                setLoanUsernameVerifyError(result.message);
            }
        } catch {
            setLoanUsernameVerified(false);
            setLoanUsernameVerifyError('Block list API-তে সংযোগ করা যায়নি।');
        } finally {
            setLoanUsernameVerifying(false);
        }
    }, [authUsername, selectedLoanApproval?.branch_code]);

    useEffect(() => {
        if (loanAction !== 'reject' || !loanPushToBlockList || !showLoanModal) {
            setLoanUsernameVerified(false);
            return;
        }
        verifyLoanBlockListUsername();
    }, [loanAction, loanPushToBlockList, showLoanModal, verifyLoanBlockListUsername]);

    const getLoanUsernameError = (): string | null => {
        if (loanAction !== 'reject' || !loanPushToBlockList) return null;
        if (!authUsername?.trim()) return 'Username সেট করা নেই';
        if (!selectedLoanApproval?.branch_code?.trim()) return 'শাখার code পাওয়া যায়নি';
        if (loanUsernameVerifying) return 'Username যাচাই হচ্ছে...';
        if (loanUsernameVerifyError) return loanUsernameVerifyError;
        if (!loanUsernameVerified) return 'Username block list-এ যাচাই করুন';
        return null;
    };

    const handleRefreshLoanUsername = () => {
        setCheckingLoanUsername(true);
        router.get(pageUrl, {}, {
            preserveScroll: true,
            preserveState: true,
            onFinish: () => {
                setCheckingLoanUsername(false);
                if (loanAction === 'reject' && loanPushToBlockList) {
                    verifyLoanBlockListUsername();
                }
            },
        });
    };

    const setLoanBlockField = (key: keyof BlockListFields, value: string) => {
        setLoanBlockList((prev) => ({ ...prev, [key]: value }));
    };

    const validateLoanReject = (): boolean => {
        const commentErr = validateRejectComments(loanComments);
        setLoanCommentsError(commentErr);

        if (!loanPushToBlockList) {
            return !commentErr;
        }

        const nextErrors: Record<string, string | null> = {
            nid_number: validateNid(loanBlockList.nid_number ?? ''),
            phone_number: validatePhone(loanBlockList.phone_number ?? ''),
            dob: validateDob(loanBlockList.dob),
        };
        setLoanBlockErrors(nextErrors);

        const usernameErr = getLoanUsernameError();
        if (usernameErr && usernameErr !== 'Username যাচাই হচ্ছে...') {
            setLoanUsernameVerifyError(usernameErr);
        }

        const hasFieldError = Object.values(nextErrors).some(Boolean);
        if (commentErr || hasFieldError || usernameErr) {
            const problems = [
                commentErr,
                usernameErr && usernameErr !== 'Username যাচাই হচ্ছে...' ? usernameErr : null,
                nextErrors.nid_number,
                nextErrors.phone_number,
                nextErrors.dob,
            ].filter(Boolean) as string[];
            if (problems.length > 0) {
                setLoanServerError(problems[0]);
            }
            return false;
        }
        return true;
    };

    const verifyBlockListUsername = useCallback(async () => {
        if (!authUsername?.trim()) {
            setUsernameVerified(false);
            setUsernameVerifyError('Username সেট করা নেই');
            return;
        }
        if (!selectedApproval?.branch_code?.trim()) {
            setUsernameVerified(false);
            setUsernameVerifyError('শাখার code পাওয়া যায়নি। Block list যাচাই করা যায়নি।');
            return;
        }
        setUsernameVerifying(true);
        setUsernameVerifyError(null);
        setUsernameVerified(false);
        try {
            const result = await fetchBlockListUsernameVerify(selectedApproval.branch_code);
            if (result.ok) {
                setUsernameVerified(true);
                setUsernameVerifyError(null);
            } else {
                setUsernameVerified(false);
                setUsernameVerifyError(result.message);
            }
        } catch {
            setUsernameVerified(false);
            setUsernameVerifyError('Block list API-তে সংযোগ করা যায়নি।');
        } finally {
            setUsernameVerifying(false);
        }
    }, [authUsername, selectedApproval?.branch_code]);

    useEffect(() => {
        if (action !== 'reject' || !pushToBlockList || !showModal) {
            setUsernameVerified(false);
            return;
        }
        verifyBlockListUsername();
    }, [action, pushToBlockList, showModal, verifyBlockListUsername]);

    const getUsernameError = (): string | null => {
        if (action !== 'reject' || !pushToBlockList) return null;
        if (!authUsername?.trim()) return 'Username সেট করা নেই';
        if (!selectedApproval?.branch_code?.trim()) return 'শাখার code পাওয়া যায়নি';
        if (usernameVerifying) return 'Username যাচাই হচ্ছে...';
        if (usernameVerifyError) return usernameVerifyError;
        if (!usernameVerified) return 'Username block list-এ যাচাই করুন';
        return null;
    };

    const handleRefreshUsername = () => {
        setCheckingUsername(true);
        router.get(pageUrl, {}, {
            preserveScroll: true,
            preserveState: true,
            onFinish: () => {
                setCheckingUsername(false);
                if (action === 'reject' && pushToBlockList) {
                    verifyBlockListUsername();
                }
            },
        });
    };

    const setAdmissionBlockField = (key: keyof BlockListFields, value: string) => {
        setAdmissionBlockList((prev) => ({ ...prev, [key]: value }));
    };

    const validateAdmissionReject = (): boolean => {
        const commentErr = validateRejectComments(comments);
        setCommentsError(commentErr);

        if (!pushToBlockList) {
            return !commentErr;
        }

        const nextErrors: Record<string, string | null> = {
            nid_number: validateNid(admissionBlockList.nid_number ?? ''),
            phone_number: validatePhone(admissionBlockList.phone_number ?? ''),
            dob: validateDob(admissionBlockList.dob),
        };
        setAdmissionBlockErrors(nextErrors);

        const usernameErr = getUsernameError();
        if (usernameErr && usernameErr !== 'Username যাচাই হচ্ছে...') {
            setUsernameVerifyError(usernameErr);
        }

        const hasFieldError = Object.values(nextErrors).some(Boolean);
        if (commentErr || hasFieldError || usernameErr) {
            const problems = [
                commentErr,
                usernameErr && usernameErr !== 'Username যাচাই হচ্ছে...' ? usernameErr : null,
                nextErrors.nid_number,
                nextErrors.phone_number,
                nextErrors.dob,
            ].filter(Boolean) as string[];
            if (problems.length > 0) {
                setServerError(problems[0]);
            }
            return false;
        }
        return true;
    };

    const submitLoanAction = () => {
        if (!selectedLoanApproval || !loanAction) return;

        if (loanAction === 'forward' && !loanForwardToUserId) {
            alert('অনুগ্রহ করে ফরওয়ার্ড করার জন্য একজন অনুমোদনকারী নির্বাচন করুন।');
            return;
        }

        if (loanAction === 'reject' && !validateLoanReject()) {
            return;
        }

        if (loanAction === 'approve') {
            const amount = Number(loanApprovedAmount);
            if (!loanApprovedAmount.trim() || Number.isNaN(amount) || amount <= 0) {
                alert('সঠিক ও চূড়ান্ত অনুমোদিত ঋণের পরিমাণ দিন।');
                return;
            }
        }

        setIsSubmitting(true);
        setLoanServerError(null);

        if (loanAction === 'forward') {
            router.patch(
                `/approvals/loan/${selectedLoanApproval.id}/forward`,
                {
                    forward_to_user_id: loanForwardToUserId,
                    comments: loanComments,
                },
                {
                    ...keepListFilters,
                    onSuccess: (visit) => {
                        const flashError = (visit.props as { flash?: { error?: string | null } }).flash?.error;
                        if (flashError) {
                            setLoanServerError(flashError);
                            setIsSubmitting(false);
                            return;
                        }
                        resetLoanModal();
                    },
                    onError: (errors) => {
                        applyLoanServerErrors(errors);
                        setIsSubmitting(false);
                    },
                }
            );
            return;
        }

        const payload: Record<string, unknown> = { comments: loanComments };
        if (loanAction === 'approve') {
            payload.approved_amount = Math.round(Number(loanApprovedAmount));
        } else if (loanAction === 'reject') {
            payload.push_to_block_list = loanPushToBlockList;
            if (loanPushToBlockList) {
                payload.block_list = {
                    name_bn: loanBlockList.name_bn || undefined,
                    father_name: loanBlockList.father_name || undefined,
                    mother_name: loanBlockList.mother_name || undefined,
                    spouse_name: loanBlockList.spouse_name || undefined,
                    dob: loanBlockList.dob || undefined,
                    nid_number: loanBlockList.nid_number,
                    phone_number: (loanBlockList.phone_number ?? '').replace(/\D/g, ''),
                    address: loanBlockList.address || undefined,
                };
            }
        }

        router.patch(
            `/approvals/loan/${selectedLoanApproval.id}/${loanAction}`,
            payload,
            {
                ...keepListFilters,
                onSuccess: (visit) => {
                    const flashError = (visit.props as { flash?: { error?: string | null } }).flash?.error;
                    if (flashError) {
                        setLoanServerError(flashError);
                        setIsSubmitting(false);
                        return;
                    }
                    resetLoanModal();
                },
                onError: (errors) => {
                    applyLoanServerErrors(errors);
                    setIsSubmitting(false);
                },
            }
        );
    };

    const getLevelBadge = (level: string) => {
        const badges: Record<string, { bg: string; text: string; border: string; label: string }> = {
            branch: {
                bg: 'bg-blue-50',
                border: 'border-blue-200',
                text: 'text-blue-700',
                label: 'শাখা',
            },
            area: {
                bg: 'bg-emerald-50',
                border: 'border-emerald-200',
                text: 'text-emerald-700',
                label: 'অঞ্চল',
            },
            zone: {
                bg: 'bg-purple-50',
                border: 'border-purple-200',
                text: 'text-purple-700',
                label: 'জোন',
            },
            head_office: {
                bg: 'bg-rose-50',
                border: 'border-rose-200',
                text: 'text-rose-700',
                label: 'হেড অফিস',
            },
        };
        const config = badges[level as keyof typeof badges] || {
            bg: 'bg-slate-50',
            border: 'border-slate-200',
            text: 'text-slate-700',
            label: level,
        };

        return (
            <span
                className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-semibold ${config.bg} ${config.border} ${config.text}`}
            >
                {config.label}
            </span>
        );
    };

    const getInitials = (name: string) => {
        if (!name) return 'AP';
        return name
            .split(' ')
            .map((n) => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
    };

    const isHeadOffice = (level: string) => level === 'head_office';
    const totalCount = approvals.length + loanApprovals.length;
    const totalFilteredCount = filteredApprovals.length + filteredLoanApprovals.length;

    return (
        <AdminLayout>
            <Head title="Pending Approvals | অপেক্ষমান অনুমোদন" />

            <div className="max-w-[1600px] mx-auto space-y-3 p-3 md:p-4 pb-16">
                {/* ── UNIFIED COMPACT HEADER & FILTER CONTAINER ──────────────── */}
                <div className="bg-white rounded-xl border border-slate-200/90 p-3 sm:p-3.5 shadow-xs space-y-2.5">
                    {/* Top Row: Title, Counter Badges, Tabs & Refresh */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
                        {/* Title & Summary Badges */}
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                                    <ShieldCheck className="w-4 h-4" />
                                </div>
                                <h1 className="text-base font-extrabold tracking-tight text-slate-900">
                                    অপেক্ষমান অনুমোদন
                                </h1>
                            </div>

                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                <Clock className="w-3 h-3 text-amber-600" />
                                {totalCount} টি মুলতবি
                            </span>

                            {totalLoanRequestedAmount > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                    <Coins className="w-3 h-3 text-emerald-600" />
                                    ঋণ দাবি: ৳ {formatCurrency(totalLoanRequestedAmount)}
                                </span>
                            )}
                        </div>

                        {/* Right: Quick Tab Switcher & Refresh */}
                        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
                            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-bold">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('all')}
                                    className={`px-2.5 py-1 rounded-md transition ${
                                        activeTab === 'all'
                                            ? 'bg-white text-slate-900 shadow-2xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    সব ({totalCount})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('admissions')}
                                    className={`px-2.5 py-1 rounded-md transition ${
                                        activeTab === 'admissions'
                                            ? 'bg-white text-blue-700 shadow-2xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    ভর্তি ({approvals.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('loans')}
                                    className={`px-2.5 py-1 rounded-md transition ${
                                        activeTab === 'loans'
                                            ? 'bg-white text-emerald-700 shadow-2xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    ঋণ ({loanApprovals.length})
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={() => router.reload()}
                                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 shadow-2xs transition"
                                title="রিফ্রেশ করুন"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Bottom Row: Search & Location Filters in 1 Clean Compact Bar */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2">
                        {/* Search Input */}
                        <div className="lg:col-span-4 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="আবেদন নং, নাম, সমিতি বা শাখা খুঁজুন..."
                                className="w-full h-8.5 pl-8 pr-7 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Zone Filter */}
                        {zones.length > 0 && (
                            <div className="lg:col-span-2">
                                <select
                                    value={selectedZone}
                                    onChange={(e) => handleLocationFilterChange(e.target.value, '', '')}
                                    className="h-8.5 w-full border border-slate-300 rounded-lg px-2.5 text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
                                >
                                    <option value="">সকল জোন ({zones.length})</option>
                                    {zones.map((z) => (
                                        <option key={z.id} value={z.id}>
                                            {z.name} {z.code ? `(${z.code})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Area Filter */}
                        {areas.length > 0 && (
                            <div className="lg:col-span-2">
                                <select
                                    value={selectedArea}
                                    onChange={(e) => handleLocationFilterChange(selectedZone, e.target.value, '')}
                                    className="h-8.5 w-full border border-slate-300 rounded-lg px-2.5 text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
                                >
                                    <option value="">সকল অঞ্চল ({filteredAreas.length})</option>
                                    {filteredAreas.map((a) => (
                                        <option key={a.id} value={a.id}>
                                            {a.name} {a.code ? `(${a.code})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Branch Filter */}
                        {branches.length > 0 && (
                            <div className="lg:col-span-3">
                                <select
                                    value={selectedBranch}
                                    onChange={(e) => handleLocationFilterChange(selectedZone, selectedArea, e.target.value)}
                                    className="h-8.5 w-full border border-slate-300 rounded-lg px-2.5 text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
                                >
                                    <option value="">সকল শাখা ({filteredBranches.length})</option>
                                    {filteredBranches.map((b) => (
                                        <option key={b.id} value={b.id}>
                                            {formatBranchLabel(b)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Reset Filter Button */}
                        {hasActiveFilters && (
                            <div className="lg:col-span-1 flex items-center">
                                <button
                                    type="button"
                                    onClick={resetFilters}
                                    className="h-8.5 w-full inline-flex items-center justify-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
                                    title="ফিল্টার রিসেট"
                                >
                                    <RotateCcw className="w-3 h-3" />
                                    রিসেট
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── EMPTY STATE VIEW ────────────────────────────────────── */}
                {totalCount === 0 || totalFilteredCount === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-xs">
                        <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 border border-emerald-100">
                            {totalCount === 0 ? <CheckCircle2 className="w-6 h-6" /> : <Search className="w-6 h-6 text-slate-400" />}
                        </div>
                        <h3 className="text-sm font-bold text-slate-900">
                            {totalCount === 0 ? 'সব আবেদন সম্পন্ন হয়েছে!' : 'কোনো আবেদন মেলেনি'}
                        </h3>
                        <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                            {totalCount === 0
                                ? 'এই মুহূর্তে আপনার জন্য অনুমোদনের অপেক্ষায় কোনো মুলতবি আবেদন নেই।'
                                : 'বর্তমান ফিল্টারের সাথে কোনো আবেদন খুঁজে পাওয়া যায়নি।'}
                        </p>
                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={resetFilters}
                                className="mt-3.5 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 text-white px-3.5 py-1.5 text-xs font-bold hover:bg-slate-800 transition"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                ফিল্টার রিসেট করুন
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        {/* ── MEMBER ADMISSION APPROVALS SECTION ────────────────── */}
                        {(activeTab === 'all' || activeTab === 'admissions') && filteredApprovals.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                        সদস্য ভর্তি আবেদন
                                    </h2>
                                    <span className="px-1.5 py-0.2 rounded text-[11px] font-bold bg-blue-100 text-blue-800">
                                        {filteredApprovals.length}
                                    </span>
                                </div>

                                {/* MOBILE CARDS VIEW (md:hidden) */}
                                <div className="md:hidden flex flex-col gap-2.5">
                                    {filteredApprovals.map((approval) => (
                                        <div
                                            key={approval.id}
                                            className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs space-y-2.5"
                                        >
                                            {/* Card Top Header */}
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                                        {getInitials(approval.applicant_name)}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-slate-900 text-xs leading-snug">
                                                            {approval.applicant_name}
                                                        </h3>
                                                        {approval.applicant_name_bn && (
                                                            <p className="text-[11px] text-slate-500">
                                                                {approval.applicant_name_bn}
                                                            </p>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => copyToClipboard(approval.application_no)}
                                                            className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-600 bg-slate-100 hover:bg-slate-200 px-1.5 py-0.2 rounded border border-slate-200 mt-0.5"
                                                        >
                                                            {copiedAppNo === approval.application_no ? (
                                                                <>
                                                                    <Check className="w-2.5 h-2.5 text-emerald-600" />
                                                                    <span className="text-emerald-700 font-sans">কপি হয়েছে</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <span>{approval.application_no}</span>
                                                                    <Copy className="w-2.5 h-2.5 text-slate-400" />
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="shrink-0">{getLevelBadge(approval.level)}</div>
                                            </div>

                                            {/* Info Grid */}
                                            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100 text-[11px]">
                                                <div>
                                                    <span className="text-[9px] font-bold uppercase text-slate-400 block">শাখা ও সমিতি</span>
                                                    <p className="font-semibold text-slate-800 truncate">{approval.branch_name}</p>
                                                    <p className="text-slate-500 truncate">{approval.samity_name}</p>
                                                </div>
                                                <div>
                                                    <span className="text-[9px] font-bold uppercase text-slate-400 block">তারিখ ও রিভিশন</span>
                                                    <p className="text-slate-700">{formatDate(approval.submitted_at)}</p>
                                                    {approval.revision_count > 0 ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => setRevisionModalData(approval)}
                                                            className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-200 mt-0.5"
                                                        >
                                                            <span>Rev {approval.revision_count}</span>
                                                            <MessageSquare className="w-2.5 h-2.5" />
                                                        </button>
                                                    ) : (
                                                        <span className="text-slate-400">-</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-100">
                                                <button
                                                    onClick={() => router.visit(`/member-admissions/${approval.member_admission_id}`)}
                                                    className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200"
                                                >
                                                    <Eye className="w-3.5 h-3.5 text-slate-500" /> বিবরণ
                                                </button>
                                                <button
                                                    onClick={() => router.visit(`/member-admissions/${approval.member_admission_id}/edit`)}
                                                    className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200"
                                                >
                                                    <Edit3 className="w-3.5 h-3.5 text-blue-600" /> এডিট
                                                </button>
                                                <button
                                                    onClick={() => handleAction(approval, 'approve')}
                                                    className="inline-flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700"
                                                >
                                                    <CheckCircle2 className="w-3.5 h-3.5" /> অনুমোদন
                                                </button>
                                                <button
                                                    onClick={() => handleAction(approval, 'reject')}
                                                    className="inline-flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700"
                                                >
                                                    <XCircle className="w-3.5 h-3.5" /> বাতিল
                                                </button>
                                                {isHeadOffice(approval.level) && (
                                                    <button
                                                        onClick={() => handleAction(approval, 'return')}
                                                        className="col-span-2 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200"
                                                    >
                                                        <RotateCcw className="w-3.5 h-3.5 text-amber-700" /> শাখায় ফেরত
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* DESKTOP TABLE VIEW (hidden md:block) */}
                                <div className="hidden md:block">
                                    <AutoFitTableContainer
                                        minWidth={1050}
                                        storageKey="approvals_admission_table"
                                        title="সদস্য ভর্তি অনুমোদন তালিকা"
                                        subtitle={`(মোট ${filteredApprovals.length} টি)`}
                                    >
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                                    <th className="py-2.5 px-3.5">আবেদন নং</th>
                                                    <th className="py-2.5 px-3.5">আবেদনকারী</th>
                                                    <th className="py-2.5 px-3.5">শাখা ও সমিতি</th>
                                                    <th className="py-2.5 px-3.5">লেভেল</th>
                                                    <th className="py-2.5 px-3.5">রিভিশন</th>
                                                    <th className="py-2.5 px-3.5">জমার তারিখ</th>
                                                    <th className="py-2.5 px-3.5 text-right">পদক্ষেপ</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 text-xs">
                                                {filteredApprovals.map((approval) => (
                                                    <tr key={approval.id} className="hover:bg-slate-50/80 transition-colors group">
                                                        <td className="py-2.5 px-3.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => copyToClipboard(approval.application_no)}
                                                                className="inline-flex items-center gap-1 font-mono font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded border border-slate-200 transition"
                                                                title="কপি করতে ক্লিক করুন"
                                                            >
                                                                {copiedAppNo === approval.application_no ? (
                                                                    <>
                                                                        <Check className="w-3 h-3 text-emerald-600" />
                                                                        <span className="text-emerald-700 font-sans text-[10px]">কপি</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <span>{approval.application_no}</span>
                                                                        <Copy className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                                                                    </>
                                                                )}
                                                            </button>
                                                        </td>
                                                        <td className="py-2.5 px-3.5">
                                                            <div className="font-bold text-slate-900">{approval.applicant_name}</div>
                                                            {approval.applicant_name_bn && (
                                                                <div className="text-[11px] text-slate-500">
                                                                    {approval.applicant_name_bn}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="py-2.5 px-3.5 space-y-0.5">
                                                            <div className="font-semibold text-slate-800 flex items-center gap-1">
                                                                <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                                                                <span>{approval.branch_name}</span>
                                                            </div>
                                                            <div className="text-slate-500 text-[11px] flex items-center gap-1">
                                                                <Users className="w-3 h-3 text-slate-400 shrink-0" />
                                                                <span>{approval.samity_name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-2.5 px-3.5">{getLevelBadge(approval.level)}</td>
                                                        <td className="py-2.5 px-3.5">
                                                            {approval.revision_count > 0 ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setRevisionModalData(approval)}
                                                                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold bg-amber-100 text-amber-900 rounded border border-amber-200 hover:bg-amber-200 transition"
                                                                    title="রিভিশন নোট দেখুন"
                                                                >
                                                                    <span>Rev: {approval.revision_count}</span>
                                                                    <MessageSquare className="w-3 h-3 text-amber-700" />
                                                                </button>
                                                            ) : (
                                                                <span className="text-xs text-slate-400 font-medium">-</span>
                                                            )}
                                                        </td>
                                                        <td className="py-2.5 px-3.5 text-slate-600">
                                                            {formatDate(approval.submitted_at)}
                                                        </td>
                                                        <td className="py-2.5 px-3.5 text-right">
                                                            <div className="flex items-center justify-end gap-1">
                                                                <button
                                                                    onClick={() => router.visit(`/member-admissions/${approval.member_admission_id}`)}
                                                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded border border-slate-200 transition"
                                                                    title="বিস্তারিত দেখুন"
                                                                >
                                                                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                                                                    <span>দেখুন</span>
                                                                </button>
                                                                <button
                                                                    onClick={() => router.visit(`/member-admissions/${approval.member_admission_id}/edit`)}
                                                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded transition"
                                                                    title="সম্পাদনা করুন"
                                                                >
                                                                    <Edit3 className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleAction(approval, 'approve')}
                                                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-2xs transition active:scale-95"
                                                                    title="অনুমোদন করুন"
                                                                >
                                                                    <CheckCircle2 className="w-3 h-3" />
                                                                    <span>অনুমোদন</span>
                                                                </button>
                                                                <button
                                                                    onClick={() => handleAction(approval, 'reject')}
                                                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded border border-rose-200 transition active:scale-95"
                                                                    title="বাতিল করুন"
                                                                >
                                                                    <XCircle className="w-3 h-3" />
                                                                    <span>বাতিল</span>
                                                                </button>
                                                                {isHeadOffice(approval.level) && (
                                                                    <button
                                                                        onClick={() => handleAction(approval, 'return')}
                                                                        className="p-1 text-amber-700 hover:bg-amber-50 rounded transition"
                                                                        title="শাখায় ফেরত পাঠান"
                                                                    >
                                                                        <RotateCcw className="w-3.5 h-3.5" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </AutoFitTableContainer>
                                </div>
                            </div>
                        )}

                        {/* ── LOAN APPROVALS SECTION ────────────────────────────── */}
                        {(activeTab === 'all' || activeTab === 'loans') && filteredLoanApprovals.length > 0 && (
                            <div className="space-y-2 pt-1">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                        ঋণ আবেদন যাচাই ও অনুমোদন
                                    </h2>
                                    <span className="px-1.5 py-0.2 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                        {filteredLoanApprovals.length}
                                    </span>
                                </div>

                                {/* MOBILE CARDS VIEW FOR LOAN APPROVALS (md:hidden) */}
                                <div className="md:hidden flex flex-col gap-2.5">
                                    {filteredLoanApprovals.map((la) => {
                                        const isHighAmount = la.level === 'branch' && Number(la.requested_amount || 0) >= 70000;
                                        return (
                                            <div
                                                key={la.id}
                                                className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs space-y-2.5"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <button
                                                            type="button"
                                                            onClick={() => copyToClipboard(la.application_no)}
                                                            className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-600 bg-slate-100 hover:bg-slate-200 px-1.5 py-0.2 rounded border border-slate-200"
                                                        >
                                                            {copiedAppNo === la.application_no ? (
                                                                <>
                                                                    <Check className="w-2.5 h-2.5 text-emerald-600" />
                                                                    <span className="text-emerald-700 font-sans">কপি</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <span>{la.application_no}</span>
                                                                    <Copy className="w-2.5 h-2.5 text-slate-400" />
                                                                </>
                                                            )}
                                                        </button>
                                                        <h3 className="font-bold text-slate-900 text-xs mt-0.5">
                                                            {la.applicant_name_bn || la.applicant_name}
                                                        </h3>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-[9px] font-bold uppercase text-slate-400 block">
                                                            আবেদনকৃত ঋণ
                                                        </span>
                                                        <span className="text-sm font-extrabold text-emerald-700 tabular-nums">
                                                            ৳ {Number(la.requested_amount).toLocaleString('bn-BD')}
                                                        </span>
                                                    </div>
                                                </div>

                                                {isHighAmount && (
                                                    <div className="flex items-center gap-1 p-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[10px] font-semibold">
                                                        <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                                                        <span>৭০,০০০+ টাকার ঋণ: উচ্চতর অনুমোদন প্রয়োজন</span>
                                                    </div>
                                                )}

                                                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100 text-[11px]">
                                                    <div>
                                                        <span className="text-[9px] font-bold uppercase text-slate-400 block">শাখা</span>
                                                        <p className="font-semibold text-slate-800 truncate">{la.branch_name}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-[9px] font-bold uppercase text-slate-400 block">তারিখ</span>
                                                        <p className="text-slate-700">{la.submitted_at ? formatDate(la.submitted_at) : '-'}</p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-100">
                                                    <button
                                                        onClick={() => router.visit(`/member/loan-applications/${la.loan_application_id}`)}
                                                        className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200"
                                                    >
                                                        <Eye className="w-3.5 h-3.5 text-slate-500" /> দেখুন
                                                    </button>
                                                    <button
                                                        onClick={() => handleLoanAction(la, 'approve')}
                                                        className={`inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold text-white ${
                                                            isHighAmount ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'
                                                        }`}
                                                    >
                                                        {isHighAmount ? <ArrowUpRight className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                                                        <span>{isHighAmount ? 'ফরওয়ার্ড' : 'অনুমোদন'}</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleLoanAction(la, 'reject')}
                                                        className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200"
                                                    >
                                                        <XCircle className="w-3 h-3" /> বাতিল
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* DESKTOP TABLE VIEW FOR LOAN APPROVALS (hidden md:block) */}
                                <div className="hidden md:block">
                                    <AutoFitTableContainer
                                        minWidth={1100}
                                        storageKey="approvals_loan_table"
                                        title="ঋণ আবেদন অনুমোদন তালিকা"
                                        subtitle={`(মোট ${filteredLoanApprovals.length} টি)`}
                                    >
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                                    <th className="py-2.5 px-3.5">আবেদন নং</th>
                                                    <th className="py-2.5 px-3.5">আবেদনকারী</th>
                                                    <th className="py-2.5 px-3.5">শাখা</th>
                                                    <th className="py-2.5 px-3.5 text-right">আবেদনকৃত পরিমাণ</th>
                                                    <th className="py-2.5 px-3.5">জমার তারিখ</th>
                                                    <th className="py-2.5 px-3.5 text-right">পদক্ষেপ</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 text-xs">
                                                {filteredLoanApprovals.map((la) => {
                                                    const isHighAmount = la.level === 'branch' && Number(la.requested_amount || 0) >= 70000;
                                                    return (
                                                        <tr key={la.id} className="hover:bg-slate-50/80 transition-colors group">
                                                            <td className="py-2.5 px-3.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => copyToClipboard(la.application_no)}
                                                                    className="inline-flex items-center gap-1 font-mono font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded border border-slate-200 transition"
                                                                    title="কপি করতে ক্লিক করুন"
                                                                >
                                                                    {copiedAppNo === la.application_no ? (
                                                                        <>
                                                                            <Check className="w-3 h-3 text-emerald-600" />
                                                                            <span className="text-emerald-700 font-sans text-[10px]">কপি</span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <span>{la.application_no}</span>
                                                                            <Copy className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                                                                        </>
                                                                    )}
                                                                </button>
                                                            </td>
                                                            <td className="py-2.5 px-3.5">
                                                                <div className="font-bold text-slate-900">
                                                                    {la.applicant_name_bn || la.applicant_name}
                                                                </div>
                                                                {la.applicant_name_bn && la.applicant_name !== la.applicant_name_bn && (
                                                                    <div className="text-[11px] text-slate-500 font-medium">
                                                                        {la.applicant_name}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="py-2.5 px-3.5">
                                                                <div className="font-semibold text-slate-800 flex items-center gap-1">
                                                                    <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                                                                    <span>{la.branch_name}</span>
                                                                </div>
                                                            </td>
                                                            <td className="py-2.5 px-3.5 text-right">
                                                                <div className="inline-flex flex-col items-end">
                                                                    <span className="font-extrabold text-slate-900 tabular-nums">
                                                                        ৳ {Number(la.requested_amount).toLocaleString('bn-BD')}
                                                                    </span>
                                                                    {isHighAmount && (
                                                                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1 py-0.2 rounded mt-0.5">
                                                                            <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                                                                            উচ্চতর অনুমোদন
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="py-2.5 px-3.5 text-slate-600">
                                                                {la.submitted_at ? formatDate(la.submitted_at) : '-'}
                                                            </td>
                                                            <td className="py-2.5 px-3.5 text-right">
                                                                <div className="flex items-center justify-end gap-1">
                                                                    <button
                                                                        onClick={() => router.visit(`/member/loan-applications/${la.loan_application_id}`)}
                                                                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded border border-slate-200 transition"
                                                                        title="বিস্তারিত দেখুন"
                                                                    >
                                                                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                                                                        <span>দেখুন</span>
                                                                    </button>

                                                                    <button
                                                                        onClick={() => handleLoanAction(la, 'approve')}
                                                                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white rounded shadow-2xs transition active:scale-95 ${
                                                                            isHighAmount
                                                                                ? 'bg-blue-600 hover:bg-blue-700'
                                                                                : 'bg-emerald-600 hover:bg-emerald-700'
                                                                        }`}
                                                                        title={isHighAmount ? 'উচ্চতর অনুমোদনে ফরওয়ার্ড' : 'ঋণ অনুমোদন করুন'}
                                                                    >
                                                                        {isHighAmount ? (
                                                                            <>
                                                                                <ArrowUpRight className="w-3 h-3" />
                                                                                <span>ফরওয়ার্ড</span>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <CheckCircle2 className="w-3 h-3" />
                                                                                <span>অনুমোদন</span>
                                                                            </>
                                                                        )}
                                                                    </button>

                                                                    <button
                                                                        onClick={() => handleLoanAction(la, 'reject')}
                                                                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded border border-rose-200 transition active:scale-95"
                                                                        title="ঋণ আবেদন প্রত্যাখ্যান করুন"
                                                                    >
                                                                        <XCircle className="w-3 h-3" />
                                                                        <span>বাতিল</span>
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </AutoFitTableContainer>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ── REVISION DETAILS MODAL ────────────────────────────────────── */}
            {revisionModalData && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl p-5 max-w-lg w-full shadow-2xl border border-slate-200 space-y-3.5">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                                    <MessageSquare className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">রিভিশন ইতিহাস ও মন্তব্য</h3>
                                    <p className="text-[11px] text-slate-500">মোট রিভিশন: {revisionModalData.revision_count} বার</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setRevisionModalData(null)}
                                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1 text-xs">
                            <p className="text-slate-600 font-medium">
                                আবেদন নম্বর: <strong className="font-mono text-blue-700">{revisionModalData.application_no}</strong>
                            </p>
                            <p className="text-slate-600 font-medium">
                                সদস্য নাম: <strong className="text-slate-900">{revisionModalData.applicant_name}</strong>
                            </p>
                        </div>

                        <div className="space-y-1">
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                মন্তব্যসমূহ
                            </label>
                            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950 font-medium leading-relaxed max-h-52 overflow-y-auto whitespace-pre-wrap">
                                {revisionModalData.revision_comments || 'কোনো মন্তব্য পাওয়া যায়নি।'}
                            </div>
                        </div>

                        <div className="flex justify-end pt-1">
                            <button
                                type="button"
                                onClick={() => setRevisionModalData(null)}
                                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
                            >
                                বন্ধ করুন
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MEMBER ADMISSION ACTION MODAL ───────────────────────────── */}
            {showModal && selectedApproval && action && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto animate-in fade-in duration-200">
                    <div className={`bg-white rounded-2xl p-5 w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 space-y-3.5 ${action === 'reject' ? 'max-w-xl' : 'max-w-md'}`}>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                            <div className="flex items-center gap-2">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                                    action === 'approve'
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : action === 'reject'
                                          ? 'bg-rose-100 text-rose-700'
                                          : action === 'forward'
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'bg-amber-100 text-amber-700'
                                }`}>
                                    {action === 'approve' && <CheckCircle2 className="w-4 h-4" />}
                                    {action === 'reject' && <XCircle className="w-4 h-4" />}
                                    {action === 'forward' && <ArrowUpRight className="w-4 h-4" />}
                                    {action === 'return' && <RotateCcw className="w-4 h-4" />}
                                </div>
                                <h3 className="text-sm font-bold text-slate-900">
                                    {action === 'approve' && 'সদস্য ভর্তি অনুমোদন'}
                                    {action === 'reject' && 'সদস্য ভর্তি বাতিল ও ব্লক লিস্ট'}
                                    {action === 'return' && 'শাখায় ফেরত পাঠান'}
                                    {action === 'forward' && 'উচ্চতর কর্মকর্তা নির্বাচন ও ফরওয়ার্ড'}
                                </h3>
                            </div>
                            <button
                                onClick={closeAdmissionModal}
                                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Summary Pill Box */}
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1 text-xs">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500">আবেদন নম্বর:</span>
                                <strong className="font-mono text-blue-700 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                                    {selectedApproval.application_no}
                                </strong>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500">আবেদনকারী:</span>
                                <strong className="text-slate-900">{selectedApproval.applicant_name}</strong>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500">শাখা ও সমিতি:</span>
                                <span className="text-slate-800 font-semibold">{selectedApproval.branch_name} · {selectedApproval.samity_name}</span>
                            </div>
                            {selectedApproval.branch_code ? (
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500">শাখা কোড:</span>
                                    <strong className="font-mono text-slate-800">{selectedApproval.branch_code}</strong>
                                </div>
                            ) : null}
                            {selectedApproval.requested_loan_amount ? (
                                <div className="flex justify-between items-center pt-1 border-t border-slate-200/60">
                                    <span className="text-slate-500">ঋণ চাহিদা:</span>
                                    <strong className="text-emerald-700 font-bold">
                                        ৳ {Number(selectedApproval.requested_loan_amount).toLocaleString('bn-BD')}
                                    </strong>
                                </div>
                            ) : null}
                        </div>

                        {/* Forward Specific Selection */}
                        {action === 'forward' && (
                            <div className="space-y-2">
                                <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                                    <p className="font-bold flex items-center gap-1">
                                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                        <span>উচ্চতর কর্মকর্তা নির্বাচন প্রয়োজন</span>
                                    </p>
                                    <p className="text-[11px] leading-relaxed text-amber-800">
                                        ঋণ চাহিদা <strong>৳ {Number(selectedApproval.requested_loan_amount || 0).toLocaleString('bn-BD')}</strong> (৭০,০০০ টাকা বা তার বেশি)। পরবর্তী কর্মকর্তা নির্বাচন করুন।
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                        কর্মকর্তা <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        value={forwardToUserId}
                                        onChange={(e) => setForwardToUserId(e.target.value)}
                                        className="w-full border border-slate-300 rounded-xl px-2.5 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-900 font-semibold transition"
                                    >
                                        <option value="">-- কর্মকর্তা নির্বাচন করুন --</option>
                                        {(selectedApproval.escalation_approvers ?? []).map((u) => (
                                            <option key={u.id} value={u.id}>
                                                {u.name} ({u.role_name || u.level})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        {action === 'reject' && (() => {
                            const usernameErr = getUsernameError();
                            const problems = [
                                serverError,
                                commentsError,
                                pushToBlockList ? usernameErr : null,
                                pushToBlockList ? admissionBlockErrors.nid_number : null,
                                pushToBlockList ? admissionBlockErrors.phone_number : null,
                                pushToBlockList ? admissionBlockErrors.dob : null,
                                pushToBlockList && !selectedApproval.branch_code ? 'শাখার code নেই — block list যাচাই করা যায়নি' : null,
                            ].filter((item, index, arr): item is string => Boolean(item) && arr.indexOf(item) === index);
                            return problems.length > 0 ? (
                                <div className="rounded-xl border border-rose-300 bg-rose-50 p-3">
                                    <p className="text-xs font-bold text-rose-800">প্রত্যাখ্যান করা যাচ্ছে না — সমস্যা:</p>
                                    <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-[11px] font-medium text-rose-700">
                                        {problems.map((problem) => (
                                            <li key={problem}>{problem}</li>
                                        ))}
                                    </ul>
                                </div>
                            ) : null;
                        })()}

                        <div className="space-y-1">
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                মন্তব্য {action !== 'approve' && action !== 'forward' && <span className="text-rose-500">*</span>}
                            </label>
                            <textarea
                                value={comments}
                                onChange={(e) => {
                                    setComments(e.target.value);
                                    if (action === 'reject') {
                                        setCommentsError(validateRejectComments(e.target.value));
                                    }
                                }}
                                rows={3}
                                className={`w-full border rounded-xl p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-900 transition ${
                                    commentsError ? 'border-rose-400' : 'border-slate-300'
                                }`}
                                placeholder={action === 'forward' ? 'ঐচ্ছিক মন্তব্য লিখুন...' : action === 'reject' ? 'প্রত্যাখ্যানের কারণ লিখুন...' : 'এখানে বিস্তারিত মন্তব্য লিখুন...'}
                                required={action !== 'approve' && action !== 'forward'}
                            />
                            <FieldError message={commentsError} />
                        </div>

                        {action === 'reject' && (
                            <div className="space-y-2.5">
                                <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
                                    <input
                                        type="checkbox"
                                        checked={pushToBlockList}
                                        onChange={(e) => {
                                            setPushToBlockList(e.target.checked);
                                            setServerError(null);
                                        }}
                                        className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                                    />
                                    <div>
                                        <p className="text-xs font-bold text-slate-900">Block List-এ যোগ করুন</p>
                                        <p className="text-[10px] text-slate-500">আনচেক করলে শুধুমাত্র সদস্য আবেদন বাতিল হবে</p>
                                    </div>
                                </label>

                                {pushToBlockList && (
                                    <div className="space-y-2.5 rounded-xl border border-rose-200/80 bg-gradient-to-br from-rose-50/80 via-white to-orange-50/40 p-3">
                                        <div className={`rounded-xl border p-3 ${getUsernameError() ? 'border-rose-300 bg-rose-50/80' : usernameVerified ? 'border-emerald-300 bg-emerald-50/60' : 'border-slate-200 bg-white'}`}>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="flex-1 text-xs text-slate-500">
                                                    {authUsername.trim() ? (
                                                        <>
                                                            Block list Username:{' '}
                                                            <span className={`font-semibold ${usernameVerified ? 'text-emerald-700' : getUsernameError() ? 'text-rose-700' : 'text-slate-700'}`}>
                                                                {authUsername}
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <span className="font-semibold text-rose-600">Username সেট করা নেই</span>
                                                    )}
                                                    <span className="text-slate-400">
                                                        {' '}· শাখা {selectedApproval.branch_name}
                                                        {selectedApproval.branch_code ? ` (${selectedApproval.branch_code})` : ' (কোড নেই)'}
                                                    </span>
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (!checkingUsername && !usernameVerifying) {
                                                            handleRefreshUsername();
                                                        }
                                                    }}
                                                    disabled={checkingUsername || usernameVerifying}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-600 disabled:opacity-60"
                                                >
                                                    {checkingUsername || usernameVerifying ? 'যাচাই...' : 'যাচাই করুন'}
                                                </button>
                                            </div>
                                            <FieldError message={getUsernameError()} />
                                            {usernameVerified && !getUsernameError() && (
                                                <p className="mt-1 text-[11px] font-medium text-emerald-700">
                                                    Block list-এ username ও শাখা মিলেছে
                                                </p>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                            <div className="sm:col-span-2">
                                                <label className="text-[10px] font-bold text-slate-600 uppercase">
                                                    NID <span className="text-rose-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    value={admissionBlockList.nid_number ?? ''}
                                                    onChange={(e) => {
                                                        const v = toEnglishDigits(e.target.value);
                                                        setAdmissionBlockField('nid_number', v);
                                                        setAdmissionBlockErrors((prev) => ({
                                                            ...prev,
                                                            nid_number: validateNid(v),
                                                        }));
                                                    }}
                                                    placeholder="শুধু সংখ্যা"
                                                    className={`mt-0.5 w-full border rounded-lg px-2.5 py-1.5 text-xs bg-white outline-none ${admissionBlockErrors.nid_number ? 'border-rose-400' : 'border-slate-300'}`}
                                                />
                                                <FieldError message={admissionBlockErrors.nid_number} />
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-bold text-slate-600 uppercase">
                                                    ফোন <span className="text-rose-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    value={admissionBlockList.phone_number ?? ''}
                                                    onChange={(e) => {
                                                        const v = toEnglishDigits(e.target.value);
                                                        setAdmissionBlockField('phone_number', v);
                                                        setAdmissionBlockErrors((prev) => ({
                                                            ...prev,
                                                            phone_number: validatePhone(v),
                                                        }));
                                                    }}
                                                    placeholder="01XXXXXXXXX"
                                                    className={`mt-0.5 w-full border rounded-lg px-2.5 py-1.5 text-xs bg-white outline-none ${admissionBlockErrors.phone_number ? 'border-rose-400' : 'border-slate-300'}`}
                                                />
                                                <FieldError message={admissionBlockErrors.phone_number} />
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-bold text-slate-600 uppercase">নাম (বাংলা)</label>
                                                <input
                                                    type="text"
                                                    value={admissionBlockList.name_bn ?? ''}
                                                    onChange={(e) => setAdmissionBlockField('name_bn', e.target.value)}
                                                    className="mt-0.5 w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white outline-none"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-bold text-slate-600 uppercase">জন্ম তারিখ</label>
                                                <SmartDateInput
                                                    value={admissionBlockList.dob}
                                                    onChange={(v) => {
                                                        setAdmissionBlockField('dob', v);
                                                        setAdmissionBlockErrors((prev) => ({
                                                            ...prev,
                                                            dob: validateDob(v),
                                                        }));
                                                    }}
                                                    className="mt-0.5"
                                                    error={admissionBlockErrors.dob}
                                                />
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-bold text-slate-600 uppercase">পিতার নাম</label>
                                                <input
                                                    type="text"
                                                    value={admissionBlockList.father_name ?? ''}
                                                    onChange={(e) => setAdmissionBlockField('father_name', e.target.value)}
                                                    className="mt-0.5 w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white outline-none"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-bold text-slate-600 uppercase">মাতার নাম</label>
                                                <input
                                                    type="text"
                                                    value={admissionBlockList.mother_name ?? ''}
                                                    onChange={(e) => setAdmissionBlockField('mother_name', e.target.value)}
                                                    className="mt-0.5 w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white outline-none"
                                                />
                                            </div>

                                            <div className="sm:col-span-2">
                                                <label className="text-[10px] font-bold text-slate-600 uppercase">ঠিকানা</label>
                                                <textarea
                                                    rows={1.5}
                                                    value={admissionBlockList.address ?? ''}
                                                    onChange={(e) => setAdmissionBlockField('address', e.target.value)}
                                                    className="mt-0.5 w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white outline-none resize-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                                type="button"
                                onClick={closeAdmissionModal}
                                className="px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                            >
                                বাতিল
                            </button>
                            <button
                                type="button"
                                onClick={submitAction}
                                disabled={isSubmitting || (action === 'forward' && !forwardToUserId)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed ${
                                    action === 'approve'
                                        ? 'bg-emerald-600 hover:bg-emerald-700'
                                        : action === 'reject'
                                          ? 'bg-rose-600 hover:bg-rose-700'
                                          : action === 'forward'
                                            ? 'bg-blue-600 hover:bg-blue-700'
                                            : 'bg-amber-600 hover:bg-amber-700'
                                }`}
                            >
                                {isSubmitting
                                    ? 'প্রসেসিং...'
                                    : action === 'reject'
                                      ? pushToBlockList
                                        ? 'প্রত্যাখ্যান ও Block List'
                                        : 'শুধু প্রত্যাখ্যান'
                                      : 'নিশ্চিত করুন'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── LOAN ACTION MODAL ────────────────────────────────────────── */}
            {showLoanModal && selectedLoanApproval && loanAction && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl p-5 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 space-y-3.5">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                            <div className="flex items-center gap-2">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                                    loanAction === 'approve'
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : loanAction === 'forward'
                                          ? 'bg-blue-100 text-blue-700'
                                          : 'bg-rose-100 text-rose-700'
                                }`}>
                                    {loanAction === 'approve' && <CheckCircle2 className="w-4 h-4" />}
                                    {loanAction === 'forward' && <ArrowUpRight className="w-4 h-4" />}
                                    {loanAction === 'reject' && <XCircle className="w-4 h-4" />}
                                </div>
                                <h3 className="text-sm font-bold text-slate-900">
                                    {loanAction === 'approve'
                                        ? 'ঋণ আবেদন অনুমোদন'
                                        : loanAction === 'forward'
                                          ? 'উচ্চতর অনুমোদনকারীর নিকট ফরওয়ার্ড'
                                          : 'ঋণ আবেদন প্রত্যাখ্যান'}
                                </h3>
                            </div>
                            <button
                                onClick={resetLoanModal}
                                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Server Error */}
                        {loanServerError && (
                            <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700 flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                                <span>{loanServerError}</span>
                            </div>
                        )}

                        {/* Summary Box */}
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1 text-xs">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500">আবেদন নম্বর:</span>
                                <strong className="font-mono text-emerald-700 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                                    {selectedLoanApproval.application_no}
                                </strong>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500">আবেদনকারী:</span>
                                <strong className="text-slate-900">{selectedLoanApproval.applicant_name_bn || selectedLoanApproval.applicant_name}</strong>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500"> শাখা:</span>
                                <span className="text-slate-800 font-semibold">{selectedLoanApproval.branch_name}</span>
                            </div>
                            <div className="flex justify-between items-center pt-1 border-t border-slate-200/60">
                                <span className="text-slate-500">আবেদনকৃত পরিমাণ:</span>
                                <strong className="text-slate-900 font-extrabold">
                                    ৳ {Number(selectedLoanApproval.requested_amount).toLocaleString('bn-BD')}
                                </strong>
                            </div>
                        </div>

                        {/* Escalation Approver for Forward */}
                        {loanAction === 'forward' && (
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                    কর্মকর্তা নির্বাচন <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={loanForwardToUserId}
                                    onChange={(e) => setLoanForwardToUserId(e.target.value)}
                                    className="w-full border border-slate-300 rounded-xl px-2.5 py-2 text-xs bg-white text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
                                >
                                    <option value="">নির্বাচন করুন...</option>
                                    {selectedLoanApproval.escalation_approvers?.map((approver) => (
                                        <option key={approver.id} value={approver.id}>
                                            {approver.name} ({approver.role_name || approver.level})
                                        </option>
                                    ))}
                                </select>
                                <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">
                                    ৭০,০০০ টাকা বা তার বেশি ঋণের জন্য উচ্চতর কর্মকর্তার কাছে ফরওয়ার্ড করা হচ্ছে।
                                </p>
                            </div>
                        )}

                        {/* Approval Amount Input */}
                        {loanAction === 'approve' && (
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                    চূড়ান্ত অনুমোদিত ঋণের পরিমাণ (সংখ্যায়) <span className="text-rose-500">*</span>
                                </label>
                                <div className="flex items-center overflow-hidden rounded-xl border border-slate-300 bg-white focus-within:ring-1 focus-within:ring-emerald-500 focus-within:border-emerald-500 transition">
                                    <span className="px-3 text-xs font-bold text-slate-600 bg-slate-50 border-r border-slate-200 self-stretch flex items-center">৳</span>
                                    <input
                                        type="number"
                                        min={1}
                                        step={1}
                                        value={loanApprovedAmount}
                                        onChange={(e) => setLoanApprovedAmount(e.target.value)}
                                        className="w-full p-2.5 text-xs font-bold text-slate-900 outline-none"
                                        placeholder="অনুমোদিত পরিমাণ লিখুন"
                                    />
                                </div>
                                <div className="flex items-center justify-between text-[11px] text-slate-500">
                                    <span>আবেদনকৃত: ৳ {Number(selectedLoanApproval.requested_amount).toLocaleString('bn-BD')}</span>
                                    <button
                                        type="button"
                                        onClick={() => setLoanApprovedAmount(String(Math.round(Number(selectedLoanApproval.requested_amount))))}
                                        className="text-emerald-700 font-bold hover:underline"
                                    >
                                        পূর্ণ পরিমাণ সেট করুন
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Comments Area */}
                        <div className="space-y-1">
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                মন্তব্য {loanAction === 'reject' && <span className="text-rose-500">*</span>}
                            </label>
                            <textarea
                                value={loanComments}
                                onChange={(e) => {
                                    setLoanComments(e.target.value);
                                    if (loanCommentsError) {
                                        setLoanCommentsError(validateRejectComments(e.target.value));
                                    }
                                }}
                                rows={2.5}
                                className={`w-full border rounded-xl p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-900 transition ${
                                    loanCommentsError ? 'border-rose-400' : 'border-slate-300'
                                }`}
                                placeholder={loanAction === 'approve' ? 'ঐচ্ছিক মন্তব্য লিখুন...' : 'প্রত্যাখ্যানের কারণ উল্লেখ করুন...'}
                                required={loanAction === 'reject'}
                            />
                            <FieldError message={loanCommentsError} />
                        </div>

                        {/* Block List Section for Loan Rejection */}
                        {loanAction === 'reject' && (
                            <div className="space-y-2.5">
                                <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
                                    <input
                                        type="checkbox"
                                        checked={loanPushToBlockList}
                                        onChange={(e) => {
                                            setLoanPushToBlockList(e.target.checked);
                                            setLoanServerError(null);
                                        }}
                                        className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                                    />
                                    <div>
                                        <p className="text-xs font-bold text-slate-900">Block List-এ যোগ করুন</p>
                                        <p className="text-[10px] text-slate-500">চেক করলে সদস্যকে Block Register-এ যোগ করা হবে (ডিফল্ট আনচেক)</p>
                                    </div>
                                </label>

                                {loanPushToBlockList && (
                                    <div className="space-y-2.5 rounded-xl border border-rose-200/80 bg-gradient-to-br from-rose-50/80 via-white to-orange-50/40 p-3">
                                        <div className={`rounded-xl border p-3 ${getLoanUsernameError() ? 'border-rose-300 bg-rose-50/80' : loanUsernameVerified ? 'border-emerald-300 bg-emerald-50/60' : 'border-slate-200 bg-white'}`}>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="flex-1 text-xs text-slate-500">
                                                    {authUsername.trim() ? (
                                                        <>
                                                            Block list Username:{' '}
                                                            <span className={`font-semibold ${loanUsernameVerified ? 'text-emerald-700' : getLoanUsernameError() ? 'text-rose-700' : 'text-slate-700'}`}>
                                                                {authUsername}
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <span className="font-semibold text-rose-600">Username সেট করা নেই</span>
                                                    )}
                                                    <span className="text-slate-400">
                                                        {' '}· শাখা {selectedLoanApproval.branch_name}
                                                        {selectedLoanApproval.branch_code ? ` (${selectedLoanApproval.branch_code})` : ' (কোড নেই)'}
                                                    </span>
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (!checkingLoanUsername && !loanUsernameVerifying) {
                                                            handleRefreshLoanUsername();
                                                        }
                                                    }}
                                                    disabled={checkingLoanUsername || loanUsernameVerifying}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-600 disabled:opacity-60"
                                                >
                                                    {checkingLoanUsername || loanUsernameVerifying ? 'যাচাই...' : 'যাচাই করুন'}
                                                </button>
                                            </div>
                                            <FieldError message={getLoanUsernameError()} />
                                            {loanUsernameVerified && !getLoanUsernameError() && (
                                                <p className="mt-1 text-[11px] font-medium text-emerald-700">
                                                    Block list-এ username ও শাখা মিলেছে
                                                </p>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                            <div className="sm:col-span-2">
                                                <label className="text-[10px] font-bold text-slate-600 uppercase">
                                                    NID <span className="text-rose-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    value={loanBlockList.nid_number ?? ''}
                                                    onChange={(e) => {
                                                        const v = toEnglishDigits(e.target.value);
                                                        setLoanBlockField('nid_number', v);
                                                        setLoanBlockErrors((prev) => ({
                                                            ...prev,
                                                            nid_number: validateNid(v),
                                                        }));
                                                    }}
                                                    placeholder="শুধু সংখ্যা"
                                                    className={`mt-0.5 w-full border rounded-lg px-2.5 py-1.5 text-xs bg-white outline-none ${loanBlockErrors.nid_number ? 'border-rose-400' : 'border-slate-300'}`}
                                                />
                                                <FieldError message={loanBlockErrors.nid_number} />
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-bold text-slate-600 uppercase">
                                                    ফোন <span className="text-rose-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    value={loanBlockList.phone_number ?? ''}
                                                    onChange={(e) => {
                                                        const v = toEnglishDigits(e.target.value);
                                                        setLoanBlockField('phone_number', v);
                                                        setLoanBlockErrors((prev) => ({
                                                            ...prev,
                                                            phone_number: validatePhone(v),
                                                        }));
                                                    }}
                                                    placeholder="01XXXXXXXXX"
                                                    className={`mt-0.5 w-full border rounded-lg px-2.5 py-1.5 text-xs bg-white outline-none ${loanBlockErrors.phone_number ? 'border-rose-400' : 'border-slate-300'}`}
                                                />
                                                <FieldError message={loanBlockErrors.phone_number} />
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-bold text-slate-600 uppercase">নাম (বাংলা)</label>
                                                <input
                                                    type="text"
                                                    value={loanBlockList.name_bn ?? ''}
                                                    onChange={(e) => setLoanBlockField('name_bn', e.target.value)}
                                                    className="mt-0.5 w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white outline-none"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-bold text-slate-600 uppercase">জন্ম তারিখ</label>
                                                <SmartDateInput
                                                    value={loanBlockList.dob}
                                                    onChange={(v) => {
                                                        setLoanBlockField('dob', v);
                                                        setLoanBlockErrors((prev) => ({
                                                            ...prev,
                                                            dob: validateDob(v),
                                                        }));
                                                    }}
                                                    className="mt-0.5"
                                                    error={loanBlockErrors.dob}
                                                />
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-bold text-slate-600 uppercase">পিতার নাম</label>
                                                <input
                                                    type="text"
                                                    value={loanBlockList.father_name ?? ''}
                                                    onChange={(e) => setLoanBlockField('father_name', e.target.value)}
                                                    className="mt-0.5 w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white outline-none"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-bold text-slate-600 uppercase">মাতার নাম</label>
                                                <input
                                                    type="text"
                                                    value={loanBlockList.mother_name ?? ''}
                                                    onChange={(e) => setLoanBlockField('mother_name', e.target.value)}
                                                    className="mt-0.5 w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white outline-none"
                                                />
                                            </div>

                                            <div className="sm:col-span-2">
                                                <label className="text-[10px] font-bold text-slate-600 uppercase">ঠিকানা</label>
                                                <textarea
                                                    rows={1.5}
                                                    value={loanBlockList.address ?? ''}
                                                    onChange={(e) => setLoanBlockField('address', e.target.value)}
                                                    className="mt-0.5 w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white outline-none resize-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                                type="button"
                                onClick={resetLoanModal}
                                className="px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                            >
                                বাতিল
                            </button>
                            <button
                                type="button"
                                onClick={submitLoanAction}
                                disabled={
                                    isSubmitting ||
                                    (loanAction === 'approve' && !loanApprovedAmount.trim()) ||
                                    (loanAction === 'forward' && !loanForwardToUserId)
                                }
                                className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed ${
                                    loanAction === 'approve'
                                        ? 'bg-emerald-600 hover:bg-emerald-700'
                                        : loanAction === 'forward'
                                          ? 'bg-blue-600 hover:bg-blue-700'
                                          : 'bg-rose-600 hover:bg-rose-700'
                                }`}
                            >
                                {isSubmitting
                                    ? 'প্রসেসিং...'
                                    : loanAction === 'approve'
                                      ? 'অনুমোদন করুন'
                                      : loanAction === 'forward'
                                        ? 'ফরওয়ার্ড করুন'
                                        : loanPushToBlockList
                                          ? 'প্রত্যাখ্যান ও Block List'
                                          : 'শুধু প্রত্যাখ্যান'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
