import { Head, router, usePage } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import TeamBasedExportBar from '@/components/team-based/TeamBasedExportBar';
import TeamBasedDecisionModal, { type DecisionFormState } from '@/components/team-based/TeamBasedDecisionModal';
import React from 'react';
import { formatDate } from '@/utils/dateUtils';

function rowHasReviewHistory(row: {
    review_status?: string;
    status?: string;
    approvers?: { status?: string | null }[];
}): boolean {
    if (row.approvers?.some((a) => a.status && a.status !== 'pending')) {
        return true;
    }
    const status = String(row.review_status || row.status || '').toLowerCase();
    return status === 'approved' || status === 'rejected' || status === 'forwarded' || status === 'under_review';
}

// বাংলা সংখ্যাকে ইংরেজিতে রূপান্তর (সঞ্চয় ফিল্ডে হিসাবের জন্য)
function normalizeNumericInput(value: string): string {
    if (!value) return '';
    const banglaToEnglishMap: Record<string, string> = {
        '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
        '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
    };
    let result = '';
    for (const ch of value) {
        result += banglaToEnglishMap[ch] ?? ch;
    }
    return result.replace(/,/g, '');
}
function toNumber(value: string): number {
    const n = parseFloat(normalizeNumericInput(value));
    return Number.isFinite(n) ? n : 0;
}
/** কোনো অ্যামাউন্টে ডেসিমাল থাকবে না – রাউন্ড নম্বর রিটার্ন */
function formatAmount(val: number | string | null | undefined): string {
    if (val == null || val === '') return '';
    const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^\d.-]/g, ''));
    if (!Number.isFinite(n)) return String(val);
    return String(Math.round(n));
}

interface ItemRow {
    id?: number;
    serial_no: number;
    member_name: string;
    name_bn?: string | null;
    father_name?: string | null;
    mother_name?: string | null;
    spouse_name?: string | null;
    dob?: string | null;
    nid_number?: string | null;
    address?: string | null;
    member_code?: string | null;
    member_phone?: string | null;
    samity_number?: string | null;
    savings_general?: number | null;
    savings_other?: number | null;
    savings_total?: number | null;
    repaid_loan_amount?: string | number | null;
    repaid_installment_no?: string | number | null;
    other_institution_loan_amount?: string | null;
    proposed_loan_amount?: string | number | null;
    approved_amount?: number | null;
    loan_term_years?: number | null;
    loan_type?: string | null;
    project_name?: string | null;
}

function rowHasValue(
    row: ItemRow,
    pick: (r: ItemRow) => string | number | null | undefined,
): boolean {
    const v = pick(row);
    if (v == null) return false;
    if (typeof v === 'string') return v.trim().length > 0;
    if (typeof v === 'number') return Number.isFinite(v);
    return false;
}

function rowHasOtherInstitutionLoan(row: ItemRow): boolean {
    const v = row.other_institution_loan_amount;
    if (v == null) return false;
    return String(v).trim().length > 0;
}

function hasNumericishField(v: string | number | null | undefined): boolean {
    if (v == null) return false;
    if (typeof v === 'number') return Number.isFinite(v);
    return String(v).trim().length > 0;
}

interface SheetInfo {
    id: number;
    sheet_date: string | null;
    status: string;
    branch_name?: string | null;
    branch_code?: string | null;
    area_name?: string | null;
    zone_name?: string | null;
    items_count: number;
    proposed_total: number;
    items: ItemRow[];
}

interface ReviewRow {
    review_id: number;
    status: string;
    comments?: string | null;
    approver_signature?: string | null;
    decided_at?: string | null;
    can_act: boolean;
    approver_name?: string | null;
    approver_role?: string | null;
    sheet: SheetInfo;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedReviews {
    data: ReviewRow[];
    current_page: number;
    last_page: number;
    links: PaginationLink[];
    per_page?: number;
    total?: number;
}

interface BranchOption {
    id: number;
    name: string;
    code?: string | null;
}

interface Props {
    reviews: PaginatedReviews;
    filters: {
        status?: string;
        branch_id?: number | string;
        approver_id?: number | string;
        date_from?: string;
        date_to?: string;
        approval_flow?: string | null;
        per_page?: number;
    };
    branches: BranchOption[];
    approverOptions: {
        id: number;
        name: string;
        role_name: string;
    }[];
    forwardToOptions?: {
        id: number;
        name: string;
        role_name: string;
    }[];
    stats: {
        total: number;
        pending: number;
        approved: number;
        rejected: number;
        forwarded: number;
    };
}

export default function TeamBasedApprovalApproverIndex({ reviews, filters, branches, approverOptions, forwardToOptions = [], stats }: Props) {
    const currentStatus = filters.status ?? '';
    const currentBranchId = (filters.branch_id ?? '').toString();
    const currentApproverId = (filters.approver_id ?? '').toString();
    const currentFrom = filters.date_from || '';
    const currentTo = filters.date_to || '';
    const currentApprovalFlow = filters.approval_flow ?? '';
    const currentPerPage = filters.per_page ?? 20;

    const [decisionModal, setDecisionModal] = React.useState<{
        open: boolean;
        review: ReviewRow | null;
        row: any | null;
    }>({ open: false, review: null, row: null });
    const [decisionState, setDecisionState] = React.useState<Record<number, DecisionFormState>>({});

    const [editModal, setEditModal] = React.useState<{
        open: boolean;
        reviewId: number | null;
        row: (ItemRow & { review_id: number }) | null;
    }>({
        open: false,
        reviewId: null,
        row: null,
    });

    const [zoomSignatureUrl, setZoomSignatureUrl] = React.useState<string | null>(null);

    const [forwardModal, setForwardModal] = React.useState<{
        open: boolean;
        sheetId: number | null;
        sheetLabel: string;
        reviewId: number | null;
        forwardToUserId: string;
        comments: string;
    }>({
        open: false,
        sheetId: null,
        sheetLabel: '',
        reviewId: null,
        forwardToUserId: '',
        comments: '',
    });

    /** When user clicks "অনুমোদন দিন": show modal to choose "নিজে অনুমোদন" or "ফরওয়ার্ড" */
    const [approveChoiceModal, setApproveChoiceModal] = React.useState<{
        open: boolean;
        review: ReviewRow | null;
        row: (ItemRow & { review_id: number; sheet_id: number; sheet_date: string | null; branch_name?: string | null }) | null;
    }>({ open: false, review: null, row: null });

    const [showFiltersMobile, setShowFiltersMobile] = React.useState(false);
    const [selectedItemIds, setSelectedItemIds] = React.useState<number[]>([]);

    const getActiveFilterParams = (extra: Record<string, unknown> = {}) => ({
        status: currentStatus || undefined,
        date_from: currentFrom || undefined,
        date_to: currentTo || undefined,
        branch_id: currentBranchId || undefined,
        approver_id: currentApproverId || undefined,
        approval_flow: currentApprovalFlow || undefined,
        per_page: currentPerPage || undefined,
        page: reviews.current_page ?? 1,
        ...extra,
    });

    const applyFilter = (
        status: string,
        from: string,
        to: string,
        branchId: string,
        approverId: string,
        approvalFlow: string,
        perPage?: number,
        page?: number,
    ) => {
        router.get('/team-based-approvals/for-approver', getActiveFilterParams({
            status: status || undefined,
            date_from: from || undefined,
            date_to: to || undefined,
            branch_id: branchId || undefined,
            approver_id: approverId || undefined,
            approval_flow: approvalFlow || undefined,
            per_page: perPage ?? currentPerPage,
            page: page ?? reviews.current_page ?? 1,
        }), {
            preserveScroll: true,
            preserveState: true,
        });
    };

    const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newFrom = e.target.value;
        applyFilter(currentStatus, newFrom, currentTo, currentBranchId, currentApproverId, currentApprovalFlow, currentPerPage, 1);
    };

    const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTo = e.target.value;
        applyFilter(currentStatus, currentFrom, newTo, currentBranchId, currentApproverId, currentApprovalFlow, currentPerPage, 1);
    };

    const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStatus = e.target.value;
        applyFilter(newStatus, currentFrom, currentTo, currentBranchId, currentApproverId, currentApprovalFlow, currentPerPage, 1);
    };

    const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newBranchId = e.target.value;
        applyFilter(currentStatus, currentFrom, currentTo, newBranchId, currentApproverId, currentApprovalFlow, currentPerPage, 1);
    };

    const handleApproverChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newApproverId = e.target.value;
        applyFilter(currentStatus, currentFrom, currentTo, currentBranchId, newApproverId, currentApprovalFlow, currentPerPage, 1);
    };

    const handleApprovalFlowChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newFlow = e.target.value;
        applyFilter(currentStatus, currentFrom, currentTo, currentBranchId, currentApproverId, newFlow, currentPerPage, 1);
    };

    const handlePerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newPerPage = Number(e.target.value) || 20;
        applyFilter(currentStatus, currentFrom, currentTo, currentBranchId, currentApproverId, currentApprovalFlow, newPerPage, 1);
    };

    const goToPage = (page: number) => {
        if (page < 1 || page > (reviews.last_page ?? 1)) return;
        applyFilter(currentStatus, currentFrom, currentTo, currentBranchId, currentApproverId, currentApprovalFlow, currentPerPage, page);
    };

    const getPageNumbers = (): (number | 'ellipsis')[] => {
        const totalPages = reviews.last_page ?? 1;
        const current = reviews.current_page ?? 1;
        if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
        if (current <= 3) return [1, 2, 3, 4, 'ellipsis', totalPages];
        if (current >= totalPages - 2) return [1, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        return [1, 'ellipsis', current - 1, current, current + 1, 'ellipsis', totalPages];
    };

    const openDecisionModal = (review: ReviewRow, row: ItemRow & { review_id?: number }) => {
        setDecisionModal({ open: true, review, row });
    };

    const closeDecisionModal = () => {
        setDecisionModal({ open: false, review: null, row: null });
    };

    const handleRequestApprove = (formState: DecisionFormState) => {
        if (!decisionModal.review || !decisionModal.row) return;
        setDecisionState((prev) => ({
            ...prev,
            [decisionModal.review!.review_id]: formState,
        }));
        closeDecisionModal();
        setApproveChoiceModal({
            open: true,
            review: decisionModal.review,
            row: decisionModal.row,
        });
    };

    const handleSubmitReject = (formState: DecisionFormState) => {
        if (!decisionModal.review || !decisionModal.row) return;
        handleSubmitDecision(decisionModal.review, decisionModal.row, formState);
    };

    const openEditModal = (reviewId: number, row: ItemRow & { review_id: number }) => {
        setEditModal({
            open: true,
            reviewId,
            row: { ...row },
        });
        closeDecisionModal();
    };

    const closeEditModal = () => {
        setEditModal({
            open: false,
            reviewId: null,
            row: null,
        });
    };

    const handleEditModalChange = <K extends keyof ItemRow>(field: K, value: string) => {
        setEditModal((prev) => {
            if (!prev.row) return prev;

            // শুধু সঞ্চয় ও ঋণের মেয়াদ সংখ্যা; বাকি সব (নাম, কোড, পরিশোধিত ঋণ, প্রস্তাবিত ঋণ ইত্যাদি) স্ট্রিং — বাংলা লেখা যাবে
            const isSavingsOrTerm =
                field === 'savings_general' ||
                field === 'savings_other' ||
                field === 'savings_total' ||
                field === 'loan_term_years';

            let parsedValue: string | number | null;
            if (isSavingsOrTerm) {
                if (field === 'loan_term_years') {
                    parsedValue = value === '' ? null : Number(value);
                } else {
                    const normalized = normalizeNumericInput(value);
                    parsedValue = normalized === '' ? null : toNumber(normalized);
                }
            } else {
                parsedValue = value;
            }

            const nextRow: ItemRow & { review_id: number } = {
                ...prev.row,
                [field]: parsedValue as any,
            };

            if (field === 'savings_general' || field === 'savings_other') {
                const g = nextRow.savings_general ?? 0;
                const o = nextRow.savings_other ?? 0;
                nextRow.savings_total = g + o > 0 ? Math.round(g + o) : null;
            }

            return {
                ...prev,
                row: nextRow,
            };
        });
    };

    const handleEditModalSave = () => {
        if (!editModal.open || !editModal.reviewId || !editModal.row) {
            closeEditModal();
            return;
        }

        const { reviewId, row } = editModal;

        // Backend expects strings for repaid_*, proposed_loan_amount (ApprovalForm RowItem uses strings)
        const payload: any = {
            member_name: row.member_name || '',
            member_code: row.member_code ?? '',
            member_phone: row.member_phone ?? '',
            samity_number: row.samity_number ?? '',
            savings_general: row.savings_general != null ? Math.round(Number(row.savings_general)) : null,
            savings_other: row.savings_other != null ? Math.round(Number(row.savings_other)) : null,
            savings_total: row.savings_total != null ? Math.round(Number(row.savings_total)) : null,
            repaid_loan_amount: row.repaid_loan_amount != null ? String(row.repaid_loan_amount) : '',
            repaid_installment_no: row.repaid_installment_no != null ? String(row.repaid_installment_no) : '',
            other_institution_loan_amount: row.other_institution_loan_amount ?? '',
            proposed_loan_amount: row.proposed_loan_amount != null ? String(row.proposed_loan_amount) : '',
            loan_term_years: row.loan_term_years ?? null,
            loan_type: row.loan_type ?? '',
            project_name: row.project_name ?? '',
        };

        router.post(`/team-based-approvals/reviews/${reviewId}/update-item`, {
            ...payload,
            ...getActiveFilterParams(),
        }, {
            preserveScroll: true,
            onSuccess: () => closeEditModal(),
        });
    };

    const handleSubmitDecision = (review: ReviewRow, row: ItemRow, formState: DecisionFormState) => {
        const payload: Record<string, unknown> = {
            decision: formState.decision,
            comments: formState.comments || undefined,
        };

        if (formState.decision === 'approved') {
            payload.approved_amount = formState.approved_amount ? Math.round(parseFloat(formState.approved_amount)) : undefined;
        } else {
            payload.push_to_block_list = formState.push_to_block_list;
            if (formState.push_to_block_list) {
                const bl = formState.block_list;
                payload.block_list = {
                    name_bn: bl.name_bn || undefined,
                    father_name: bl.father_name || undefined,
                    mother_name: bl.mother_name || undefined,
                    spouse_name: bl.spouse_name || undefined,
                    dob: bl.dob || undefined,
                    nid_number: bl.nid_number,
                    phone_number: bl.phone_number?.replace(/\D/g, ''),
                    address: bl.address || undefined,
                };
            }
        }

        closeDecisionModal();

        router.post(`/team-based-approvals/reviews/${review.review_id}/decide`, {
            ...payload,
            ...getActiveFilterParams(),
        }, {
            preserveScroll: true,
            preserveState: true,
        });
    };

    const statusLabel: Record<string, string> = {
        pending: 'Pending',
        waiting: 'Waiting',
        approved: 'Approved',
        rejected: 'Rejected',
        forwarded: 'Forwarded',
        under_review: 'Under Review',
        draft: 'Draft',
    };

    const statusClass: Record<string, string> = {
        pending: 'bg-yellow-50 text-yellow-800 border-yellow-200',
        waiting: 'bg-amber-50 text-amber-800 border-amber-200',
        approved: 'bg-green-50 text-green-800 border-green-200',
        rejected: 'bg-red-50 text-red-800 border-red-200',
        forwarded: 'bg-slate-100 text-slate-700 border-slate-300',
        under_review: 'bg-blue-50 text-blue-800 border-blue-200',
        draft: 'bg-gray-50 text-gray-700 border-gray-200',
    };

    // Flatten all loans so approver can see each loan row separately
    const flatRows: (ItemRow & {
        review_id: number;
        sheet_id: number;
        sheet_date: string | null;
        branch_name?: string | null;
        branch_code?: string | null;
        review_status: string;
        review_comments?: string | null;
        approver_signature?: string | null;
        decided_at?: string | null;
        can_act: boolean;
        approver_name?: string | null;
        approver_role?: string | null;
        approvers?: { approver_name?: string | null; approver_role?: string | null; status?: string; approved_amount?: number | string | null; comments?: string | null; approver_signature?: string | null; decided_at?: string | null }[];
    })[] = [];

    reviews.data.forEach((review) => {
        const sheet = review.sheet;
        sheet.items.forEach((item, idx) => {
            const it = item as { approvers?: { approver_name?: string | null; approver_role?: string | null; status?: string; approved_amount?: number | string | null; comments?: string | null; approver_signature?: string | null; decided_at?: string | null }[] };
            flatRows.push({
                ...item,
                serial_no: item.serial_no || idx + 1,
                review_id: review.review_id,
                sheet_id: sheet.id,
                sheet_date: sheet.sheet_date,
                branch_name: sheet.branch_name,
                branch_code: sheet.branch_code,
                review_status: review.status,
                review_comments: review.comments,
                approver_signature: review.approver_signature,
                decided_at: review.decided_at,
                can_act: review.can_act,
                approver_name: review.approver_name,
                approver_role: review.approver_role,
                approvers: it.approvers ?? [],
            });
        });
    });

    type FlatRow = (typeof flatRows)[number];

    React.useEffect(() => {
        setSelectedItemIds([]);
    }, [reviews.data]);

    const isRowSelectableForHistoryClear = (row: FlatRow) =>
        Boolean(row.id) &&
        row.can_act &&
        row.review_status === 'pending' &&
        rowHasReviewHistory(row);

    const selectableItemIds = flatRows
        .filter(isRowSelectableForHistoryClear)
        .map((row) => row.id!)
        .filter((id, index, arr) => arr.indexOf(id) === index);

    const allSelectablePageSelected =
        selectableItemIds.length > 0 && selectableItemIds.every((id) => selectedItemIds.includes(id));
    const someSelectablePageSelected = selectableItemIds.some((id) => selectedItemIds.includes(id));

    const toggleSelectAllOnPage = () => {
        if (allSelectablePageSelected) {
            setSelectedItemIds((prev) => prev.filter((id) => !selectableItemIds.includes(id)));
            return;
        }
        setSelectedItemIds((prev) => [...new Set([...prev, ...selectableItemIds])]);
    };

    const toggleSelectItem = (itemId: number) => {
        setSelectedItemIds((prev) =>
            prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId],
        );
    };

    const handleClearReviewHistory = () => {
        if (selectedItemIds.length === 0) {
            return;
        }
        if (
            !confirm(
                `নির্বাচিত ${selectedItemIds.length} টি সারির অনুমোদন/ফরওয়ার্ড ইতিহাস মুছে ফেলতে চান? প্রাথমিক pending অবস্থায় ফিরে যাবে।`,
            )
        ) {
            return;
        }
        router.post(
            '/team-based-approvals/reviews/clear-history',
            {
                item_ids: selectedItemIds,
                ...getActiveFilterParams(),
            },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => setSelectedItemIds([]),
            },
        );
    };

    const colVis = React.useMemo(() => {
        const rows = flatRows as FlatRow[];
        if (rows.length === 0) {
            return {
                sheet_date: true,
                branch: true,
                member_code: true,
                member_phone: true,
                samity_number: true,
                savings_general: true,
                savings_other: true,
                savings_total: true,
                repaid_loan: true,
                repaid_installment: true,
                other_institution: true,
                proposed: true,
                term: true,
                loan_type: true,
                project: true,
                approved: true,
                approver: true,
                comments: true,
                signature: true,
            };
        }
        const any = (fn: (r: FlatRow) => boolean) => rows.some(fn);
        return {
            sheet_date: any((r) => r.sheet_date != null && String(r.sheet_date).trim().length > 0),
            branch: any(
                (r) =>
                    (r.branch_name != null && String(r.branch_name).trim().length > 0) ||
                    (r.branch_code != null && String(r.branch_code).trim().length > 0),
            ),
            member_code: any((r) => rowHasValue(r, (x) => x.member_code)),
            member_phone: any((r) => rowHasValue(r, (x) => x.member_phone)),
            samity_number: any((r) => rowHasValue(r, (x) => x.samity_number)),
            savings_general: any((r) => r.savings_general != null),
            savings_other: any((r) => r.savings_other != null),
            savings_total: any((r) => r.savings_total != null),
            repaid_loan: any((r) => hasNumericishField(r.repaid_loan_amount)),
            repaid_installment: any((r) => hasNumericishField(r.repaid_installment_no)),
            other_institution: any((r) => rowHasOtherInstitutionLoan(r)),
            proposed: any((r) => hasNumericishField(r.proposed_loan_amount)),
            term: any((r) => r.loan_term_years != null),
            loan_type: any((r) => rowHasValue(r, (x) => x.loan_type)),
            project: any((r) => rowHasValue(r, (x) => x.project_name)),
            approved: any((r) => r.approved_amount != null),
            approver: any((r) => {
                const n =
                    (r.approvers && r.approvers.length > 0
                        ? r.approvers.map((a) => a.approver_name).filter(Boolean).join(', ')
                        : null) ?? r.approver_name;
                return n != null && String(n).trim().length > 0;
            }),
            comments: any((r) => r.review_comments != null && String(r.review_comments).trim().length > 0),
            signature: any((r) => {
                if (r.approver_signature != null && String(r.approver_signature).trim().length > 0) return true;
                if (r.approvers?.some((a) => a.approver_signature && String(a.approver_signature).trim().length > 0))
                    return true;
                if (r.decided_at != null && String(r.decided_at).trim().length > 0) return true;
                if (r.approvers?.some((a) => a.decided_at != null && String(a.decided_at).trim().length > 0)) return true;
                return false;
            }),
        };
    }, [flatRows]);

    const savingsSubCount =
        (colVis.savings_general ? 1 : 0) + (colVis.savings_other ? 1 : 0) + (colVis.savings_total ? 1 : 0);
    const showSavingsGroup = savingsSubCount > 0;

    const visibleDataColCount =
        1 +
        1 +
        (colVis.sheet_date ? 1 : 0) +
        (colVis.branch ? 1 : 0) +
        1 +
        (colVis.member_code ? 1 : 0) +
        (colVis.member_phone ? 1 : 0) +
        (colVis.samity_number ? 1 : 0) +
        savingsSubCount +
        (colVis.repaid_loan ? 1 : 0) +
        (colVis.repaid_installment ? 1 : 0) +
        (colVis.other_institution ? 1 : 0) +
        (colVis.proposed ? 1 : 0) +
        (colVis.term ? 1 : 0) +
        (colVis.loan_type ? 1 : 0) +
        (colVis.project ? 1 : 0) +
        (colVis.approved ? 1 : 0) +
        (colVis.approver ? 1 : 0) +
        (colVis.comments ? 1 : 0) +
        (colVis.signature ? 1 : 0) +
        1;

    const headerRowSpan = showSavingsGroup ? 2 : 1;

    const openForwardModal = (sheetId: number, sheetLabel: string, reviewId: number) => {
        setForwardModal({
            open: true,
            sheetId,
            sheetLabel,
            reviewId,
            forwardToUserId: '',
            comments: '',
        });
    };

    const submitForward = () => {
        if (!forwardModal.sheetId || !forwardModal.forwardToUserId || !forwardModal.reviewId) return;

        const state = decisionState[forwardModal.reviewId] || {
            decision: 'approved' as const,
            approved_amount: '',
            comments: '',
        };

        const approvedAmount = state.approved_amount ? parseFloat(state.approved_amount) : NaN;
        if (!Number.isFinite(approvedAmount)) return;

        router.post(`/team-based-approvals/${forwardModal.sheetId}/forward`, {
            review_id: forwardModal.reviewId,
            forward_to_user_id: Number(forwardModal.forwardToUserId),
            comments: forwardModal.comments || undefined,
            approved_amount: approvedAmount,
            ...getActiveFilterParams(),
        }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => setForwardModal((p) => ({ ...p, open: false, sheetId: null, sheetLabel: '', reviewId: null, forwardToUserId: '', comments: '' })),
        });
    };

    const handlePrintPage = () => {
        if (typeof window !== 'undefined') {
            window.print();
        }
    };

    const page = usePage<any>();
    const authUser = (page.props as any)?.auth?.user;

    const selectedBranch =
        currentBranchId && branches
            ? branches.find((b) => b.id.toString() === currentBranchId)
            : null;

    const exportMeta = {
        filename: `team-based-approver-${currentTo || currentFrom || 'report'}.xlsx`,
        branchName: selectedBranch
            ? `${selectedBranch.name}${selectedBranch.code ? ` (${selectedBranch.code})` : ''}`
            : currentBranchId
            ? reviews.data[0]?.sheet?.branch_name ?? 'বহু শাখা'
            : 'All Branch',
        areaName: reviews.data[0]?.sheet?.area_name ?? undefined,
        zoneName: reviews.data[0]?.sheet?.zone_name ?? undefined,
        dateFrom: currentFrom || undefined,
        dateTo: currentTo || currentFrom || undefined,
        approverName: authUser?.name || undefined,
    };

    const exportFilterParams = {
        status: currentStatus || undefined,
        date_from: currentFrom || undefined,
        date_to: currentTo || undefined,
        branch_id: currentBranchId || undefined,
        approver_id: currentApproverId || undefined,
        approval_flow: currentApprovalFlow || undefined,
    };

    return (
        <AdminLayout>
            <Head title="Team Based Approvals - Approver">
                <style>{`
                    .approval-index-table-wrapper table { table-layout: auto; width: 100%; }
                    .approval-index-table-wrapper th {
                        font-size: 10px;
                        font-weight: 600;
                        color: #1e3a8a;
                        background: linear-gradient(to right, #eff6ff, #f8fafc) !important;
                        border-bottom: 1px solid #bfdbfe !important;
                        padding: 8px 6px !important;
                        white-space: normal;
                    }
                    .approval-index-table-wrapper td {
                        font-size: 10px;
                        line-height: 1.35;
                        padding: 7px 5px !important;
                        vertical-align: middle;
                        text-align: center;
                        border-bottom: 1px solid #e2e8f0;
                        color: #334155;
                    }
                    .approval-index-table-wrapper .approval-col-serial {
                        width: 1%;
                        max-width: 2rem;
                        white-space: nowrap;
                        font-size: 9px;
                        font-weight: 600;
                        color: #64748b;
                        padding-left: 4px;
                        padding-right: 4px;
                    }
                    .approval-index-table-wrapper .approval-col-comment {
                        min-width: 14rem;
                        width: auto;
                        white-space: normal;
                        word-break: break-word;
                    }
                    .approval-index-table-wrapper tbody td.approval-col-comment {
                        text-align: left;
                    }

                    /* Dynamically scale table content based on screen size */
                    @media (max-width: 1440px) {
                        .approval-index-table-wrapper th {
                            font-size: 9px;
                            padding: 6px 4px !important;
                        }
                        .approval-index-table-wrapper td {
                            font-size: 9px;
                            padding: 5px 3px !important;
                        }
                        .approval-index-table-wrapper td span.text-\\[9px\\] {
                            font-size: 8px !important;
                        }
                        .approval-index-table-wrapper td span.text-\\[10px\\],
                        .approval-index-table-wrapper td button.text-\\[10px\\] {
                            font-size: 8.5px !important;
                        }
                        .approval-index-table-wrapper .approval-col-serial {
                            font-size: 8px;
                        }
                        .approval-index-table-wrapper .approval-col-comment {
                            min-width: 10rem;
                        }
                    }
                    @media (max-width: 1280px) {
                        .approval-index-table-wrapper th {
                            font-size: 8px;
                            padding: 5px 3px !important;
                        }
                        .approval-index-table-wrapper td {
                            font-size: 8px;
                            padding: 4px 2px !important;
                        }
                        .approval-index-table-wrapper td span.text-\\[9px\\] {
                            font-size: 7.5px !important;
                        }
                        .approval-index-table-wrapper td span.text-\\[10px\\],
                        .approval-index-table-wrapper td button.text-\\[10px\\] {
                            font-size: 7.5px !important;
                        }
                        .approval-index-table-wrapper .approval-col-serial {
                            font-size: 7.5px;
                        }
                        .approval-index-table-wrapper .approval-col-comment {
                            min-width: 8rem;
                        }
                    }
                    @media (max-width: 1100px) {
                        .approval-index-table-wrapper th {
                            font-size: 7.5px;
                            padding: 4px 2px !important;
                        }
                        .approval-index-table-wrapper td {
                            font-size: 7.5px;
                            padding: 3.5px 1.5px !important;
                        }
                        .approval-index-table-wrapper td span.text-\\[9px\\] {
                            font-size: 7px !important;
                        }
                        .approval-index-table-wrapper td span.text-\\[10px\\],
                        .approval-index-table-wrapper td button.text-\\[10px\\] {
                            font-size: 7px !important;
                        }
                        .approval-index-table-wrapper .approval-col-serial {
                            font-size: 7px;
                        }
                        .approval-index-table-wrapper .approval-col-comment {
                            min-width: 7rem;
                        }
                    }

                    @page { size: legal landscape; margin: 5mm; }
                    @media print {
                        html, body { margin: 0 !important; padding: 0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff !important; }
                        .approval-index-print-page { margin: 0 !important; padding: 0 !important; background: transparent !important; }
                        .approval-index-table-wrapper {
                            overflow: visible !important;
                            background: transparent !important;
                            box-shadow: none !important;
                            border: none !important;
                        }
                        .approval-index-table-wrapper thead,
                        .approval-index-table-wrapper thead th {
                            background: transparent !important;
                            background-color: transparent !important;
                            color: #000 !important;
                            border: 1px solid #000 !important;
                        }
                        .approval-index-table-wrapper tbody tr {
                            background: transparent !important;
                        }
                        .approval-index-table-wrapper table { width: 100% !important; table-layout: auto !important; font-size: 7pt !important; }
                        .approval-index-table-wrapper .approval-col-comment {
                            width: auto !important;
                            min-width: 160px !important;
                            max-width: none !important;
                            white-space: normal !important;
                            word-break: break-word !important;
                        }
                        .approval-index-table-wrapper td.approval-col-comment span {
                            font-size: 8.5pt !important;
                            color: #000 !important;
                            font-weight: 600 !important;
                            line-height: 1.35 !important;
                        }
                        .approval-index-table-wrapper thead th {
                            padding: 2px 4px !important;
                            text-align: center !important;
                        }
                        .approval-index-table-wrapper tbody td {
                            padding: 6px 3px !important;
                            border: 1px solid #000 !important;
                        }
                        .approval-index-table-wrapper th,
                        .approval-index-table-wrapper td {
                            font-size: 7pt !important;
                            line-height: 1.2 !important;
                        }
                        .approval-index-print-page { width: 100%; max-width: 100%; }
                        .approval-index-print-header .text-lg { font-size: 10pt !important; }
                        .approval-index-print-header .text-xs { font-size: 7pt !important; }
                        .approval-index-print-header .text-sm { font-size: 8pt !important; }
                    }
                `}</style>
            </Head>

            <div className="mx-auto py-4 sm:py-6 px-2 sm:px-4 print:py-0 print:px-0 print:!m-0 print:max-w-none">
                {/* Print header - same as ApprovalIndex: logo left, org+title center; then branch/area/zone/tarikh row */}
                <div className="mb-4 print:mb-1 approval-index-print-header">
                    <div className="flex items-start justify-between gap-4 mb-2 print:flex print:mb-0.5">
                        <div className="flex-shrink-0">
                            <img
                                src="/logo.png"
                                alt="Logo"
                                className="w-12 h-12 object-contain"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }}
                            />
                        </div>
                        <div className="flex-1 text-center leading-tight">
                            <h1 className="text-lg font-bold text-gray-900">মৌসুমী</h1>
                            <p className="text-xs text-gray-700">উকিলপাড়া, নওগাঁ।</p>
                            <p className="text-sm font-semibold text-gray-900 mt-0.5">
                                মাসিক ঋণ যাচাই ও অনুমোদন সংক্রান্ত তথ্য।
                            </p>
                        </div>
                        <div className="flex-shrink-0 w-12" />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-gray-700 mb-4 print:mb-1">
                        <span>
                            <span className="font-semibold">শাখার নাম:</span>{' '}
                            {selectedBranch
                                ? `${selectedBranch.name}${selectedBranch.code ? ` (${selectedBranch.code})` : ''}`
                                : currentBranchId
                                ? reviews.data[0]?.sheet?.branch_name ?? 'বহু শাখা'
                                : 'All Branch'}
                        </span>
                        <span>
                            <span className="font-semibold">অঞ্চলের নাম:</span>{' '}
                            {reviews.data[0]?.sheet?.area_name ?? '-'}
                        </span>
                        <span>
                            <span className="font-semibold">জোনের নাম:</span>{' '}
                            {reviews.data[0]?.sheet?.zone_name ?? '-'}
                        </span>
                        <span>
                            <span className="font-semibold">তারিখ:</span>{' '}
                            {currentFrom && currentTo
                                ? `${formatDate(currentFrom)} – ${formatDate(currentTo)}`
                                : formatDate(currentFrom || currentTo, '-')}
                        </span>
                    </div>
                    {authUser?.name && (
                        <p className="text-xs text-gray-600 mb-1 print:mb-0"><span className="font-semibold">অনুমোদনকারীর নাম:</span> {authUser.name}</p>
                    )}
                </div>

                {/* Stats */}
                <div className="flex overflow-x-auto pb-2 gap-3 md:grid md:grid-cols-6 ho-teambased-stats print:hidden mb-4 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                    {[
                        { label: 'Total Members', value: stats.total, color: 'text-blue-600', bg: 'bg-blue-50/40 border-blue-100/70' },
                        { label: 'Pending', value: stats.pending, color: 'text-amber-600', bg: 'bg-amber-50/40 border-amber-100/70' },
                        { label: 'Waiting', value: stats.waiting || 0, color: 'text-orange-600', bg: 'bg-orange-50/40 border-orange-100/70' },
                        { label: 'Approved', value: stats.approved, color: 'text-green-600', bg: 'bg-green-50/40 border-green-100/70' },
                        { label: 'Rejected', value: stats.rejected, color: 'text-rose-600', bg: 'bg-rose-50/40 border-rose-100/70' },
                        { label: 'Forwarded', value: stats.forwarded, color: 'text-slate-600', bg: 'bg-slate-50/50 border-slate-100/70' },
                    ].map((stat, i) => (
                        <div key={i} className={`flex-shrink-0 w-32 md:w-auto p-4 rounded-xl border bg-white shadow-sm flex flex-col justify-between transition-all hover:shadow-md ${stat.bg}`}>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{stat.label}</span>
                            <span className={`text-xl md:text-2xl font-extrabold mt-1 leading-none ${stat.color}`}>{stat.value}</span>
                        </div>
                    ))}
                </div>

                {/* Filters - only visible on screen */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 mb-4 print:hidden shadow-sm">
                    {/* Mobile filter header toggle */}
                    <div 
                        className="flex md:hidden items-center justify-between cursor-pointer select-none"
                        onClick={() => setShowFiltersMobile(!showFiltersMobile)}
                    >
                        <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">ফিল্টার এবং অনুসন্ধান</span>
                            {(() => {
                                let activeCount = 0;
                                if (currentBranchId) activeCount++;
                                if (currentApproverId) activeCount++;
                                if (currentStatus) activeCount++;
                                if (currentApprovalFlow) activeCount++;
                                if (currentFrom) activeCount++;
                                if (currentTo) activeCount++;
                                if (activeCount > 0) {
                                    return (
                                        <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                            {activeCount}
                                        </span>
                                    );
                                }
                                return null;
                            })()}
                        </div>
                        <button type="button" className="text-slate-400 focus:outline-none">
                            {showFiltersMobile ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7"/></svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
                            )}
                        </button>
                    </div>

                    <div className={`${showFiltersMobile ? 'block' : 'hidden'} md:block mt-4 md:mt-0 space-y-4`}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Branch</span>
                                <select
                                    value={currentBranchId}
                                    onChange={handleBranchChange}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 transition-all text-slate-800"
                                >
                                    <option value="">All Branches</option>
                                    {branches.map((branch) => (
                                        <option key={branch.id} value={branch.id}>
                                            {branch.name} {branch.code ? `(${branch.code})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {approverOptions.length > 1 && (
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Approver</span>
                                    <select
                                        value={currentApproverId}
                                        onChange={handleApproverChange}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 transition-all text-slate-800"
                                    >
                                        <option value="">All Approvers</option>
                                        {approverOptions.map((opt) => (
                                            <option key={opt.id} value={opt.id}>
                                                {opt.name} ({opt.role_name})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</span>
                                <select
                                    value={currentStatus}
                                    onChange={handleStatusFilterChange}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 transition-all text-slate-800"
                                >
                                    <option value="">All Status</option>
                                    <option value="pending">Pending</option>
                                    <option value="waiting">Waiting</option>
                                    <option value="approved">Approved</option>
                                    <option value="rejected">Rejected</option>
                                    <option value="forwarded">Forwarded</option>
                                </select>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Per page</span>
                                <select
                                    value={currentPerPage}
                                    onChange={handlePerPageChange}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 transition-all text-slate-800"
                                >
                                    <option value="20">20</option>
                                    <option value="50">50</option>
                                    <option value="100">100</option>
                                    <option value="200">200</option>
                                    <option value="500">500</option>
                                </select>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Select type</span>
                                <select
                                    value={currentApprovalFlow}
                                    onChange={handleApprovalFlowChange}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 transition-all text-slate-800"
                                >
                                    <option value="">All</option>
                                    <option value="single">Single Approver</option>
                                    <option value="multiple">Multiple Approver</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-4 pt-1 border-t border-slate-200/50">
                            <div className="flex flex-wrap gap-3">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">From Date</span>
                                    <input
                                        type="date"
                                        value={currentFrom}
                                        onChange={handleFromChange}
                                        className="border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 transition-all text-slate-800"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">To Date</span>
                                    <input
                                        type="date"
                                        value={currentTo}
                                        onChange={handleToChange}
                                        className="border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 transition-all text-slate-800"
                                    />
                                </div>
                            </div>

                            <div className="flex items-end self-end gap-2">
                                <button
                                    type="button"
                                    onClick={handlePrintPage}
                                    className="px-5 py-2 rounded-lg bg-slate-800 text-white text-xs font-semibold hover:bg-slate-900 transition-all shadow-sm hover:shadow active:scale-[0.98]"
                                >
                                    Print List
                                </button>
                                <TeamBasedExportBar
                                    exportUrl="/team-based-approvals/for-approver/export"
                                    filterParams={exportFilterParams}
                                    totalCount={stats.total}
                                    colVisVariant="approver"
                                    meta={exportMeta}
                                    compact
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {selectedItemIds.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 print:hidden">
                        <p className="text-sm text-amber-900 font-medium">
                            {selectedItemIds.length} টি সারি নির্বাচিত
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => setSelectedItemIds([])}
                                className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                                Clear Selection
                            </button>
                            <button
                                type="button"
                                onClick={handleClearReviewHistory}
                                className="px-4 py-2 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 shadow-sm"
                            >
                                Remove Approval/Forward History
                            </button>
                        </div>
                    </div>
                )}

                {/* ── MOBILE CARD VIEW ─────────────────────────────────── */}
                <div className="md:hidden flex flex-col gap-4 print:hidden">
                    {flatRows.length === 0 && (
                        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500 shadow-sm">
                            আপনার জন্য কোনো Team Based আবেদন পাওয়া যায়নি।
                        </div>
                    )}
                    {flatRows.map((row, index) => {
                        const review = reviews.data.find((r) => r.review_id === row.review_id)!;
                        const rowKey = `${row.review_id}-${row.serial_no}-${index}`;
                        const rowSelectable = isRowSelectableForHistoryClear(row);
                        const rowSelected = row.id != null && selectedItemIds.includes(row.id);

                        return (
                            <div key={rowKey} className={`relative overflow-hidden bg-white border rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 ${rowSelected ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-100'}`}>
                                {/* Card header */}
                                <div className="flex items-center justify-between px-4 py-3 bg-slate-50/50 border-b border-slate-100">
                                    <div className="flex items-center gap-2.5">
                                        {rowSelectable && row.id != null ? (
                                            <input
                                                type="checkbox"
                                                checked={rowSelected}
                                                onChange={() => toggleSelectItem(row.id!)}
                                                className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                                                aria-label="Select row for history clear"
                                            />
                                        ) : (
                                            <span className="w-4" />
                                        )}
                                        <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold">{index + 1}</span>
                                        <div>
                                            <p className="text-xs font-bold text-slate-800 leading-tight">{row.member_name}</p>
                                            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                                                {formatDate(row.sheet_date, '')}
                                                {row.branch_name ? ` · ${row.branch_name}` : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <div>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border shadow-2xs ${statusClass[review.status] || statusClass.pending}`}>
                                            {statusLabel[review.status] || review.status}
                                        </span>
                                    </div>
                                </div>

                                {/* Card body */}
                                <div className="p-4 space-y-3.5">
                                    <div className="grid grid-cols-2 gap-3.5 text-xs">
                                        {row.member_code && (
                                            <div>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">সদস্য নম্বর</span>
                                                <p className="font-semibold text-slate-700 font-mono mt-0.5">{row.member_code}</p>
                                            </div>
                                        )}
                                        {row.member_phone && (
                                            <div>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">ফোন নম্বর</span>
                                                <a href={`tel:${row.member_phone}`} className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-800 mt-0.5 transition-colors">
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                                                    {row.member_phone}
                                                </a>
                                            </div>
                                        )}
                                        {row.samity_number && (
                                            <div>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">সমিতি নম্বর</span>
                                                <p className="font-semibold text-slate-700 mt-0.5">{row.samity_number}</p>
                                            </div>
                                        )}
                                        {row.loan_type && (
                                            <div>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">ঋণের ধরন</span>
                                                <p className="font-semibold text-slate-700 mt-0.5">{row.loan_type}</p>
                                            </div>
                                        )}
                                        {row.project_name && (
                                            <div className="col-span-2">
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">প্রকল্পের নাম</span>
                                                <p className="font-semibold text-slate-700 mt-0.5">{row.project_name}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Savings block */}
                                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">সঞ্চয়ের পরিমাণ</span>
                                        <div className="grid grid-cols-3 gap-2 text-center">
                                            <div className="bg-white rounded-lg p-2 border border-slate-100/50 shadow-2xs">
                                                <span className="text-[9px] text-slate-400 block font-semibold">সাধারণ</span>
                                                <span className="text-xs font-bold text-slate-700 mt-0.5 block">{formatAmount(row.savings_general) ? `৳${formatAmount(row.savings_general)}` : '—'}</span>
                                            </div>
                                            <div className="bg-white rounded-lg p-2 border border-slate-100/50 shadow-2xs">
                                                <span className="text-[9px] text-slate-400 block font-semibold">অন্যান্য</span>
                                                <span className="text-xs font-bold text-slate-700 mt-0.5 block">{formatAmount(row.savings_other) ? `৳${formatAmount(row.savings_other)}` : '—'}</span>
                                            </div>
                                            <div className="bg-blue-50/50 rounded-lg p-2 border border-blue-100/60 shadow-2xs">
                                                <span className="text-[9px] text-blue-600 block font-bold">মোট</span>
                                                <span className="text-xs font-extrabold text-blue-700 mt-0.5 block">{formatAmount(row.savings_total) ? `৳${formatAmount(row.savings_total)}` : '—'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Repaid Loan & Installment */}
                                    {row.repaid_loan_amount != null && (
                                        <div className="bg-amber-50/30 border border-amber-100 rounded-xl p-3 flex justify-between items-center text-xs">
                                            <div>
                                                <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider block mb-1">পরিশোধিত ঋণ</span>
                                                <span className="font-semibold text-slate-700">৳ {formatAmount(row.repaid_loan_amount) || row.repaid_loan_amount}</span>
                                            </div>
                                            {row.repaid_installment_no != null && (
                                                <div className="text-right">
                                                    <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider block mb-1">পরিশোধিত দফা</span>
                                                    <span className="font-semibold text-slate-700">{row.repaid_installment_no} দফা</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Other Institution Loan */}
                                    {row.other_institution_loan_amount != null && String(row.other_institution_loan_amount).trim().length > 0 && (
                                        <div className="bg-rose-50/30 border border-rose-100 rounded-xl p-3">
                                            <span className="text-[10px] text-rose-700 font-bold uppercase tracking-wider block mb-1">অন্যান্য সংস্থায় ঋণ</span>
                                            <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">{String(row.other_institution_loan_amount)}</p>
                                        </div>
                                    )}

                                    {/* Proposed Loan Details Box */}
                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50/40 border border-blue-100 rounded-xl p-3.5 flex justify-between items-center">
                                        <div>
                                            <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider block">প্রস্তাবিত ঋণ</span>
                                            <span className="text-base font-black text-indigo-700 mt-0.5 block">৳ {formatAmount(row.proposed_loan_amount) || '—'}</span>
                                        </div>
                                        {row.loan_term_years != null && (
                                            <div className="text-right">
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">ঋণের মেয়াদ</span>
                                                <span className="text-xs font-extrabold text-slate-700 mt-0.5 block">{row.loan_term_years} বছর</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Approved Loan Details Box */}
                                    {row.approved_amount != null && (
                                        <div className="bg-gradient-to-r from-green-50 to-emerald-50/40 border border-green-100 rounded-xl p-3.5 flex justify-between items-center animate-in fade-in duration-200">
                                            <div>
                                                <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider block">অনুমোদিত ঋণ</span>
                                                <span className="text-base font-black text-emerald-700 mt-0.5 block">৳ {formatAmount(row.approved_amount)}</span>
                                            </div>
                                            {row.approver_name && (
                                                <div className="text-right">
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">অনুমোদনকারী</span>
                                                    <span className="text-xs font-bold text-slate-700 mt-0.5 block">{row.approver_name}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Comments Box */}
                                    {row.review_comments && (
                                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">মন্তব্য</span>
                                            <p className="text-xs text-slate-700 leading-normal">{row.review_comments}</p>
                                        </div>
                                    )}

                                    {/* Signature History */}
                                    {((row.approvers && row.approvers.length > 0) || row.approver_signature || row.decided_at) && (
                                        <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-2 items-center">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">অনুমোদনকারীর স্বাক্ষর:</span>
                                            {(row.approvers && row.approvers.length > 0 ? row.approvers : [{ approver_signature: row.approver_signature, decided_at: row.decided_at, approver_name: row.approver_name }]).map((a, i) => (
                                                <div key={i} className="flex items-center gap-2 bg-slate-50/80 border border-slate-200 rounded-lg px-2 py-1 shadow-2xs">
                                                    {a.approver_signature ? (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setZoomSignatureUrl(
                                                                    a.approver_signature!.startsWith('http')
                                                                        ? a.approver_signature!
                                                                        : a.approver_signature!.startsWith('/storage/')
                                                                        ? a.approver_signature!
                                                                        : `/storage/${a.approver_signature!}`,
                                                                )
                                                            }
                                                            className="focus:outline-none hover:scale-105 transition-transform"
                                                            title="স্বাক্ষর বড় করে দেখুন"
                                                        >
                                                            <img
                                                                src={
                                                                    a.approver_signature.startsWith('http')
                                                                        ? a.approver_signature
                                                                        : a.approver_signature.startsWith('/storage/')
                                                                        ? a.approver_signature
                                                                        : `/storage/${a.approver_signature}`
                                                                }
                                                                alt="Signature"
                                                                className="h-6 object-contain"
                                                                onError={(e) => {
                                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                                }}
                                                            />
                                                        </button>
                                                    ) : null}
                                                    <div className="text-[9px] text-slate-500 leading-tight">
                                                        <p className="font-semibold text-slate-600">{a.approver_name || 'Approver'}</p>
                                                        <p>{formatDate(a.decided_at, '')}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Action Buttons for Pending / Waiting Review */}
                                    {(review.status === 'pending' || review.status === 'waiting') && row.can_act && (
                                        <div className="pt-3 border-t border-slate-100 flex gap-2.5">
                                            <button
                                                type="button"
                                                onClick={() => openEditModal(review.review_id, { ...row, review_id: review.review_id })}
                                                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all active:scale-[0.97]"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                                সম্পাদনা
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => openDecisionModal(review, row)}
                                                className="flex-[1.3] inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-sm hover:from-blue-700 hover:to-indigo-700 transition-all active:scale-[0.97]"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                                সিদ্ধান্ত দিন
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ── DESKTOP TABLE VIEW ────────────────────────────────── */}
                <div className="hidden md:block print:block bg-white border border-slate-200/80 rounded-2xl overflow-x-auto shadow-sm hover:shadow-md transition-shadow duration-300 approval-index-table-wrapper w-full approval-index-print-page print:bg-transparent print:shadow-none print:border-0 print:rounded-none">
                    <table className="w-full border-collapse">
                        <thead className="bg-gray-50 print:bg-transparent">
                            <tr>
                                <th className="border print:hidden w-8" rowSpan={headerRowSpan}>
                                    <input
                                        type="checkbox"
                                        checked={allSelectablePageSelected}
                                        ref={(el) => {
                                            if (el) {
                                                el.indeterminate = someSelectablePageSelected && !allSelectablePageSelected;
                                            }
                                        }}
                                        onChange={toggleSelectAllOnPage}
                                        disabled={selectableItemIds.length === 0}
                                        className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 disabled:opacity-40"
                                        aria-label="Select all rows on page"
                                    />
                                </th>
                                <th className="border approval-col-serial" rowSpan={headerRowSpan}>
                                    ক্র.
                                </th>
                                {colVis.sheet_date && (
                                    <th className="border" rowSpan={headerRowSpan}>
                                        তারিখ
                                    </th>
                                )}
                                {colVis.branch && (
                                    <th className="border" rowSpan={headerRowSpan}>
                                        শাখার নাম
                                    </th>
                                )}
                                <th className="border" rowSpan={headerRowSpan}>
                                    সদস্যের নাম
                                </th>
                                {colVis.member_code && (
                                    <th className="border" rowSpan={headerRowSpan}>
                                        সদস্য নম্বর
                                    </th>
                                )}
                                {colVis.member_phone && (
                                    <th className="border" rowSpan={headerRowSpan}>
                                        ফোন নম্বর
                                    </th>
                                )}
                                {colVis.samity_number && (
                                    <th className="border" rowSpan={headerRowSpan}>
                                        সমিতি নম্বর
                                    </th>
                                )}
                                {showSavingsGroup && (
                                    <th className="border text-center" colSpan={savingsSubCount}>
                                        সঞ্চয়ের পরিমাণ
                                    </th>
                                )}
                                {colVis.repaid_loan && (
                                    <th className="border" rowSpan={headerRowSpan}>
                                        পরিশোধিত ঋণ
                                    </th>
                                )}
                                {colVis.repaid_installment && (
                                    <th className="border" rowSpan={headerRowSpan}>
                                        পরিশোধিত দফা
                                    </th>
                                )}
                                {colVis.other_institution && (
                                    <th className="border whitespace-normal max-w-[14rem] px-2 py-1" rowSpan={headerRowSpan}>
                                        অন্যান্য সংস্থায় ঋণ
                                    </th>
                                )}
                                {colVis.proposed && (
                                    <th className="border" rowSpan={headerRowSpan}>
                                        প্রস্তাবিত ঋণ
                                    </th>
                                )}
                                {colVis.term && (
                                    <th className="border" rowSpan={headerRowSpan}>
                                        মেয়াদ (বছর)
                                    </th>
                                )}
                                {colVis.loan_type && (
                                    <th className="border" rowSpan={headerRowSpan}>
                                        ঋণের ধরন
                                    </th>
                                )}
                                {colVis.project && (
                                    <th className="border" rowSpan={headerRowSpan}>
                                        প্রকল্পের নাম
                                    </th>
                                )}
                                {colVis.approved && (
                                    <th className="border" rowSpan={headerRowSpan}>
                                        অনুমোদিত ঋণ
                                    </th>
                                )}
                                {colVis.approver && (
                                    <th className="border" rowSpan={headerRowSpan}>
                                        অনুমোদনকারী
                                    </th>
                                )}
                                {colVis.comments && (
                                    <th className="border approval-col-comment" rowSpan={headerRowSpan}>
                                        মন্তব্য
                                    </th>
                                )}
                                {colVis.signature && (
                                    <th className="border" rowSpan={headerRowSpan}>
                                        অনুমোদনকারীর স্বাক্ষর / তারিখ
                                    </th>
                                )}
                                <th className="border" rowSpan={headerRowSpan}>
                                    Status
                                </th>
                            </tr>
                            {showSavingsGroup && (
                                <tr>
                                    {colVis.savings_general && <th className="border">সাধারণ</th>}
                                    {colVis.savings_other && <th className="border">অন্যান্য</th>}
                                    {colVis.savings_total && <th className="border">মোট</th>}
                                </tr>
                            )}
                        </thead>
                        <tbody>
                            {flatRows.length === 0 && (
                                <tr>
                                    <td colSpan={visibleDataColCount} className="border text-center text-gray-500 py-4">
                                        আপনার জন্য কোনো Team Based আবেদন পাওয়া যায়নি।
                                    </td>
                                </tr>
                            )}
                            {flatRows.map((row, index) => {
                                const review = reviews.data.find((r) => r.review_id === row.review_id)!;
                                const rowSelectable = isRowSelectableForHistoryClear(row);
                                const rowSelected = row.id != null && selectedItemIds.includes(row.id);

                                return (
                                    <React.Fragment key={`${row.review_id}-${row.serial_no}-${index}`}>
                                        <tr className={`hover:bg-slate-50/50 print:hover:bg-transparent transition-colors ${rowSelected ? 'bg-amber-50/40' : ''}`}>
                                            <td className="border print:hidden">
                                                {rowSelectable && row.id != null ? (
                                                    <input
                                                        type="checkbox"
                                                        checked={rowSelected}
                                                        onChange={() => toggleSelectItem(row.id!)}
                                                        className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                                                        aria-label="Select row for history clear"
                                                    />
                                                ) : null}
                                            </td>
                                            <td className="border approval-col-serial">{index + 1}</td>
                                            {colVis.sheet_date && (
                                                <td className="border text-left whitespace-nowrap">{formatDate(row.sheet_date)}</td>
                                            )}
                                            {colVis.branch && (
                                                <td className="border text-left max-w-[10rem]">{row.branch_name || '-'}</td>
                                            )}
                                            <td className="border text-left max-w-[12rem] font-medium text-slate-800">{row.member_name}</td>
                                            {colVis.member_code && (
                                                <td className="border whitespace-nowrap font-mono">{row.member_code || ''}</td>
                                            )}
                                            {colVis.member_phone && (
                                                <td className="border whitespace-nowrap">{row.member_phone || ''}</td>
                                            )}
                                            {colVis.samity_number && (
                                                <td className="border whitespace-nowrap">{row.samity_number || ''}</td>
                                            )}
                                            {colVis.savings_general && (
                                                <td className="border whitespace-nowrap">{formatAmount(row.savings_general)}</td>
                                            )}
                                            {colVis.savings_other && (
                                                <td className="border whitespace-nowrap">{formatAmount(row.savings_other)}</td>
                                            )}
                                            {colVis.savings_total && (
                                                <td className="border whitespace-nowrap font-semibold text-slate-700">{formatAmount(row.savings_total)}</td>
                                            )}
                                            {colVis.repaid_loan && (
                                                <td className="border whitespace-nowrap font-mono">
                                                    {(formatAmount(row.repaid_loan_amount) || row.repaid_loan_amount) ?? ''}
                                                </td>
                                            )}
                                            {colVis.repaid_installment && (
                                                <td className="border whitespace-nowrap">{row.repaid_installment_no ?? ''}</td>
                                            )}
                                            {colVis.other_institution && (
                                                <td className="border align-top px-2 py-1.5 max-w-[14rem]">
                                                    <span className="whitespace-pre-line block text-left text-[9px] text-slate-500 leading-normal">
                                                        {row.other_institution_loan_amount ?? ''}
                                                    </span>
                                                </td>
                                            )}
                                            {colVis.proposed && (
                                                <td className="border whitespace-nowrap font-semibold text-slate-900">{formatAmount(row.proposed_loan_amount)}</td>
                                            )}
                                            {colVis.term && (
                                                <td className="border whitespace-nowrap">{row.loan_term_years ?? ''}</td>
                                            )}
                                            {colVis.loan_type && <td className="border text-left max-w-[8rem]">{row.loan_type || ''}</td>}
                                            {colVis.project && (
                                                <td className="border text-left max-w-[12rem]">{row.project_name || ''}</td>
                                            )}
                                            {colVis.approved && (
                                                <td className="border whitespace-nowrap font-semibold text-blue-700">{formatAmount(row.approved_amount)}</td>
                                            )}
                                            {colVis.approver && (
                                                <td className="border text-left max-w-[10rem]">
                                                    {row.approvers && row.approvers.length > 0
                                                        ? row.approvers.map((a) => a.approver_name).filter(Boolean).join(', ')
                                                        : row.approver_name
                                                        ? `${row.approver_name}${row.approver_role ? ` (${row.approver_role})` : ''}`
                                                        : ''}
                                                </td>
                                            )}
                                            {colVis.comments && (
                                                <td className="border approval-col-comment align-top">
                                                    <span className="whitespace-pre-line text-[9px] text-slate-500 leading-normal block text-left">{row.review_comments || ''}</span>
                                                </td>
                                            )}
                                            {colVis.signature && (
                                                <td className="border align-top whitespace-nowrap">
                                                    {(row.approvers && row.approvers.length > 0
                                                        ? row.approvers
                                                        : [
                                                              {
                                                                  approver_signature: row.approver_signature,
                                                                  decided_at: row.decided_at,
                                                                  approver_name: row.approver_name,
                                                              },
                                                          ]
                                                    ).map((a, i) => (
                                                        <div
                                                            key={i}
                                                            className="flex flex-col items-center gap-0 py-0.5 border-b border-gray-100 last:border-0"
                                                        >
                                                            {a.approver_signature ? (
                                                                <>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setZoomSignatureUrl(
                                                                                a.approver_signature!.startsWith('http')
                                                                                    ? a.approver_signature!
                                                                                    : a.approver_signature!.startsWith('/storage/')
                                                                                    ? a.approver_signature!
                                                                                    : `/storage/${a.approver_signature!}`,
                                                                            )
                                                                        }
                                                                        className="focus:outline-none hover:scale-105 transition-transform"
                                                                        title="স্বাক্ষর বড় করে দেখুন"
                                                                    >
                                                                        <img
                                                                            src={
                                                                                a.approver_signature.startsWith('http')
                                                                                    ? a.approver_signature
                                                                                    : a.approver_signature.startsWith('/storage/')
                                                                                    ? a.approver_signature
                                                                                    : `/storage/${a.approver_signature}`
                                                                            }
                                                                            alt="Signature"
                                                                            className="h-7 max-h-7 object-contain print:!h-7 print:!max-h-7"
                                                                            onError={(e) => {
                                                                                (e.target as HTMLImageElement).style.display = 'none';
                                                                            }}
                                                                        />
                                                                    </button>
                                                                    <span className="text-[9px] text-slate-500">
                                                                        {formatDate(a.decided_at, '')}
                                                                    </span>
                                                                </>
                                                            ) : (
                                                                <span className="text-[9px] text-slate-500">
                                                                    {formatDate(a.decided_at, '')}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </td>
                                            )}
                                            <td className="border px-2 py-1.5">
                                                {(review.status === 'pending' || review.status === 'waiting') && row.can_act ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => openDecisionModal(review, row)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm shadow-blue-500/20 active:scale-[0.98] print:hidden"
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                                        সিদ্ধান্ত
                                                    </button>
                                                ) : (
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider border ${statusClass[review.status] || 'bg-slate-100 text-slate-800 border-slate-200'}`}>
                                                        {statusLabel[review.status] || review.status}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <TeamBasedExportBar
                    exportUrl="/team-based-approvals/for-approver/export"
                    filterParams={exportFilterParams}
                    totalCount={stats.total}
                    colVisVariant="approver"
                    meta={exportMeta}
                />

                {/* Pagination - only when multiple pages */}
                {(reviews.last_page ?? 0) > 1 && (
                    <div className="mt-4 print:hidden flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border border-slate-200 bg-slate-50/30 rounded-2xl">
                        <p className="text-xs text-slate-600 order-2 sm:order-1 font-medium font-mono">
                            Showing <span className="text-slate-900 font-semibold">{(reviews.total ?? 0) === 0 ? '0' : (reviews.current_page - 1) * (reviews.per_page ?? 100) + 1}</span> to <span className="text-slate-900 font-semibold">{Math.min(reviews.current_page * (reviews.per_page ?? 100), reviews.total ?? 0)}</span> of <span className="text-slate-900 font-semibold">{reviews.total ?? 0}</span> items
                        </p>
                        <nav className="flex items-center gap-2 order-1 sm:order-2" aria-label="Pagination">
                            <button
                                type="button"
                                onClick={() => goToPage((reviews.current_page ?? 1) - 1)}
                                disabled={(reviews.current_page ?? 1) <= 1}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                            >
                                Previous
                            </button>
                            <div className="flex items-center gap-1">
                                {getPageNumbers().map((page, i) => {
                                    if (page === 'ellipsis') {
                                        return <span key={`ellipsis-${i}`} className="px-2 py-1.5 text-slate-400 text-xs">…</span>;
                                    }
                                    const isActive = page === reviews.current_page;
                                    return (
                                        <button
                                            key={page}
                                            type="button"
                                            onClick={() => goToPage(page)}
                                            className={`w-8 h-8 flex items-center justify-center text-xs font-semibold rounded-lg border transition-all ${
                                                isActive
                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20'
                                                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                                            }`}
                                        >
                                            {page}
                                        </button>
                                    );
                                })}
                            </div>
                            <button
                                type="button"
                                onClick={() => goToPage((reviews.current_page ?? 1) + 1)}
                                disabled={(reviews.current_page ?? 1) >= (reviews.last_page ?? 1)}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                            >
                                Next
                            </button>
                        </nav>
                    </div>
                )}
            </div>

            {editModal.open && editModal.row && (
                <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/40">
                    <div className="bg-white rounded-t-2xl sm:rounded-lg shadow-lg w-full sm:max-w-4xl sm:mx-4 max-h-[92vh] sm:max-h-[90vh] overflow-y-auto">
                        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-gray-900">
                                সারি সম্পাদনা করুন (সদস্য: {editModal.row.member_name})
                            </h2>
                            <button
                                type="button"
                                onClick={closeEditModal}
                                className="text-xs text-gray-500 hover:text-gray-800"
                            >
                                Close
                            </button>
                        </div>
                        <div className="p-3 sm:p-6 grid grid-cols-1 gap-3 text-sm">
                            <div className="grid grid-cols-1 gap-3">
                                <div>
                                    <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">সদস্যের নাম</label>
                                    <input
                                        type="text"
                                        value={editModal.row.member_name}
                                        onChange={(e) => handleEditModalChange('member_name', e.target.value)}
                                        placeholder="সদস্যের নাম"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">সদস্য নম্বর</label>
                                        <input
                                            type="text"
                                            value={editModal.row.member_code || ''}
                                            onChange={(e) => handleEditModalChange('member_code', e.target.value)}
                                            placeholder="কোড / ০ = নতুন"
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">ফোন নম্বর</label>
                                        <input
                                            type="text"
                                            value={editModal.row.member_phone || ''}
                                            onChange={(e) => handleEditModalChange('member_phone', e.target.value)}
                                            placeholder="সদস্যের ফোন"
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">সমিতি নম্বর</label>
                                        <input
                                            type="text"
                                            value={editModal.row.samity_number || ''}
                                            onChange={(e) => handleEditModalChange('samity_number', e.target.value)}
                                            placeholder="সমিতি নং"
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">সঞ্চয়</p>
                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <label className="block text-[10px] font-medium text-gray-600 mb-1">সাধারণ</label>
                                        <input
                                            type="text"
                                            value={editModal.row.savings_general ?? ''}
                                            onChange={(e) => handleEditModalChange('savings_general', e.target.value)}
                                            inputMode="decimal"
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-right bg-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-medium text-gray-600 mb-1">অন্যান্য</label>
                                        <input
                                            type="text"
                                            value={editModal.row.savings_other ?? ''}
                                            onChange={(e) => handleEditModalChange('savings_other', e.target.value)}
                                            inputMode="decimal"
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-right bg-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-medium text-gray-600 mb-1">মোট</label>
                                        <input
                                            type="text"
                                            value={editModal.row.savings_total ?? ''}
                                            onChange={(e) => handleEditModalChange('savings_total', e.target.value)}
                                            inputMode="decimal"
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-right bg-white"
                                        />
                                    </div>
                                </div>
                                <p className="text-[11px] text-gray-600 mt-2">
                                    টিপস: সাধারণ/অন্যান্য লিখলে মোট অটো হিসাব হবে।
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">পরিশোধিত মূল ঋণ</label>
                                    <input
                                        type="text"
                                        value={editModal.row.repaid_loan_amount != null ? String(editModal.row.repaid_loan_amount) : ''}
                                        onChange={(e) => handleEditModalChange('repaid_loan_amount', e.target.value)}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-right"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">পরিশোধিত দফা</label>
                                    <input
                                        type="text"
                                        value={editModal.row.repaid_installment_no != null ? String(editModal.row.repaid_installment_no) : ''}
                                        onChange={(e) => handleEditModalChange('repaid_installment_no', e.target.value)}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-right"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                    অন্যান্য সংস্থায় ঋণ (ঐচ্ছিক)
                                </label>
                                <textarea
                                    rows={3}
                                    value={editModal.row.other_institution_loan_amount ?? ''}
                                    onChange={(e) =>
                                        handleEditModalChange('other_institution_loan_amount', e.target.value)
                                    }
                                    placeholder="যেমন: আশা ৫০০০, ব্রাক ২০০০ (প্রতি লাইনে বা কমা দিয়ে)"
                                    title="একাধিক সংস্থা লিখতে প্রতি লাইনে বা কমা দিয়ে আলাদা করুন"
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm resize-y"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">প্রস্তাবিত ঋণ</label>
                                    <input
                                        type="text"
                                        value={editModal.row.proposed_loan_amount != null ? String(editModal.row.proposed_loan_amount) : ''}
                                        onChange={(e) => handleEditModalChange('proposed_loan_amount', e.target.value)}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-right"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">ঋণের মেয়াদ</label>
                                    <select
                                        value={editModal.row.loan_term_years != null ? String(editModal.row.loan_term_years) : ''}
                                        onChange={(e) => handleEditModalChange('loan_term_years', e.target.value)}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
                                    >
                                        <option value="">নির্বাচন</option>
                                        <option value="0.5">৬ মাস</option>
                                        <option value="1">১ বছর</option>
                                        <option value="1.5">১.৫ বছর</option>
                                        <option value="2">২ বছর</option>
                                        <option value="3">৩ বছর</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                <div>
                                    <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">ঋণের ধরন</label>
                                    <input
                                        type="text"
                                        value={editModal.row.loan_type || ''}
                                        onChange={(e) => handleEditModalChange('loan_type', e.target.value)}
                                        placeholder="ঋণের ধরন"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">প্রকল্পের নাম</label>
                                    <input
                                        type="text"
                                        value={editModal.row.project_name || ''}
                                        onChange={(e) => handleEditModalChange('project_name', e.target.value)}
                                        placeholder="প্রকল্পের নাম"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={closeEditModal}
                                className="inline-flex items-center px-3 py-1.5 rounded-md border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-100"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleEditModalSave}
                                className="inline-flex items-center px-3 py-1.5 rounded-md bg-blue-600 text-xs font-medium text-white hover:bg-blue-700"
                            >
                                Save changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Approve choice: নিজে অনুমোদন নাকি ফরওয়ার্ড */}
            {approveChoiceModal.open && approveChoiceModal.review && approveChoiceModal.row && (
                <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/50 p-2 sm:p-4">
                    <div
                        className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="border-b border-gray-200 px-4 py-3">
                            <h2 className="text-base font-semibold text-gray-900">অনুমোদন সিদ্ধান্ত</h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                নিচের যেকোনো একটি নির্বাচন করুন
                            </p>
                        </div>
                        <div className="p-4 flex flex-col gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    const saved = decisionState[approveChoiceModal.review!.review_id];
                                    if (!saved) return;
                                    handleSubmitDecision(approveChoiceModal.review!, approveChoiceModal.row!, saved);
                                    setApproveChoiceModal({ open: false, review: null, row: null });
                                }}
                                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                                আমি অনুমোদন দিলাম
                            </button>
                            {forwardToOptions.length > 0 ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        const row = approveChoiceModal.row!;
                                        const review = approveChoiceModal.review!;
                                        setApproveChoiceModal({ open: false, review: null, row: null });
                                        setForwardModal({
                                            open: true,
                                            sheetId: row.sheet_id,
                                            sheetLabel: `${formatDate(row.sheet_date, '')} · ${row.branch_name || ''}`,
                                            reviewId: review.review_id,
                                            forwardToUserId: '',
                                            comments: '',
                                        });
                                    }}
                                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-amber-400 bg-amber-50 text-amber-800 text-sm font-medium hover:bg-amber-100"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
                                    আমি অনুমোদন দিলাম, অন্য একজনেরও অনুমোদন লাগবে
                                </button>
                            ) : null}
                            <button
                                type="button"
                                onClick={() => setApproveChoiceModal({ open: false, review: null, row: null })}
                                className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                বাতিল
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Forward to Superior modal */}
            {forwardModal.open && (
                <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/50 p-2 sm:p-4">
                    <div
                        className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 rounded-t-2xl sm:rounded-t-xl">
                            <h2 className="text-base font-semibold text-gray-900">উর্ধ্বতনের কাছে ফরওয়ার্ড করুন</h2>
                            <p className="text-xs text-gray-500 mt-0.5">{forwardModal.sheetLabel}</p>
                        </div>
                        <div className="p-4 space-y-4">
                            <p className="text-sm text-gray-600">
                                এই শিটের সব পেন্ডিং আইটেম নির্বাচিত ব্যক্তির কাছে চলে যাবে। তারা অনুমোদন বা প্রত্যাখ্যান করতে পারবেন।
                            </p>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">উর্ধ্বতন নির্বাচন করুন <span className="text-red-500">*</span></label>
                                <select
                                    value={forwardModal.forwardToUserId}
                                    onChange={(e) => setForwardModal((p) => ({ ...p, forwardToUserId: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="">নির্বাচন করুন</option>
                                    {forwardToOptions.map((u) => (
                                        <option key={u.id} value={u.id}>
                                            {u.name} ({u.role_name})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">মন্তব্য (ঐচ্ছিক)</label>
                                <textarea
                                    rows={2}
                                    value={forwardModal.comments}
                                    onChange={(e) => setForwardModal((p) => ({ ...p, comments: e.target.value }))}
                                    placeholder="ফরওয়ার্ডের কারণ বা নির্দেশনা..."
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 p-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl sm:rounded-b-xl">
                            <button
                                type="button"
                                onClick={() => setForwardModal((p) => ({ ...p, open: false, sheetId: null, sheetLabel: '', reviewId: null, forwardToUserId: '', comments: '' }))}
                                className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                বাতিল
                            </button>
                            <button
                                type="button"
                                onClick={submitForward}
                                disabled={!forwardModal.forwardToUserId || !forwardModal.reviewId || !(decisionState[forwardModal.reviewId!]?.approved_amount)}
                                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
                                ফরওয়ার্ড সাবমিট
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {zoomSignatureUrl && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 print:hidden"
                    onClick={() => setZoomSignatureUrl(null)}
                >
                    <div
                        className="bg-white rounded-lg shadow-xl max-w-3xl w-[90%] max-h-[90vh] p-3 flex flex-col items-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={zoomSignatureUrl}
                            alt="Signature zoomed"
                            className="max-h-[75vh] w-auto object-contain"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => setZoomSignatureUrl(null)}
                            className="mt-3 inline-flex items-center px-3 py-1.5 rounded-md border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-100"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            <TeamBasedDecisionModal
                key={decisionModal.review?.review_id ?? 'closed'}
                open={decisionModal.open}
                review={decisionModal.review}
                row={decisionModal.row}
                authUsername={authUser?.username as string | undefined}
                branchCode={decisionModal.row?.branch_code ?? null}
                onClose={closeDecisionModal}
                onEdit={() => {
                    if (!decisionModal.review || !decisionModal.row) return;
                    openEditModal(decisionModal.review.review_id, {
                        ...decisionModal.row,
                        review_id: decisionModal.review.review_id,
                    });
                }}
                onRequestApprove={handleRequestApprove}
                onSubmitReject={handleSubmitReject}
            />
        </AdminLayout>
    );
}

