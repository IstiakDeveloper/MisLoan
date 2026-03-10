import { Head, router, usePage } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import React from 'react';

interface ItemRow {
    serial_no: number;
    member_name: string;
    member_code?: string | null;
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
}

export default function TeamBasedApprovalApproverIndex({ reviews, filters, branches, approverOptions, forwardToOptions = [] }: Props) {
    const currentStatus = filters.status ?? '';
    const currentBranchId = (filters.branch_id ?? '').toString();
    const currentApproverId = (filters.approver_id ?? '').toString();
    const currentFrom = filters.date_from || '';
    const currentTo = filters.date_to || '';

    const [openRowKey, setOpenRowKey] = React.useState<string | null>(null);
    const [decisionState, setDecisionState] = React.useState<{
        [key: number]: {
            decision: 'approved' | 'rejected';
            approved_amount: string;
            comments: string;
        };
    }>({});

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

    const applyFilter = (status: string, from: string, to: string, branchId: string, approverId: string) => {
        router.visit('/team-based-approvals/for-approver', {
            data: {
                status: status || undefined,
                date_from: from || undefined,
                date_to: to || undefined,
                branch_id: branchId || undefined,
                approver_id: approverId || undefined,
            },
            preserveScroll: true,
        });
    };

    const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStatus = e.target.value;
        applyFilter(newStatus, currentFrom, currentTo || currentFrom, currentBranchId, currentApproverId);
    };

    const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newBranchId = e.target.value;
        applyFilter(currentStatus, currentFrom, currentTo || currentFrom, newBranchId, currentApproverId);
    };

    const handleApproverChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newApproverId = e.target.value;
        applyFilter(currentStatus, currentFrom, currentTo || currentFrom, currentBranchId, newApproverId);
    };

    const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newFrom = e.target.value;
        applyFilter(currentStatus, newFrom, currentTo || newFrom, currentBranchId, currentApproverId);
    };

    const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTo = e.target.value;
        applyFilter(currentStatus, currentFrom || newTo, newTo, currentBranchId, currentApproverId);
    };

    const handleToggleAction = (reviewId: number, rowKey: string) => {
        setOpenRowKey((prev) => (prev === rowKey ? null : rowKey));
        setDecisionState((prev) => {
            if (prev[reviewId]) return prev;
            return {
                ...prev,
                [reviewId]: {
                    decision: 'approved',
                    approved_amount: '',
                    comments: '',
                },
            };
        });
    };

    const handleDecisionChange = (reviewId: number, value: 'approved' | 'rejected') => {
        setDecisionState((prev) => ({
            ...prev,
            [reviewId]: {
                ...(prev[reviewId] || { approved_amount: '', comments: '' }),
                decision: value,
            },
        }));
    };

    const handleAmountChange = (reviewId: number, value: string) => {
        setDecisionState((prev) => ({
            ...prev,
            [reviewId]: {
                ...(prev[reviewId] || { decision: 'approved', comments: '' }),
                approved_amount: value,
            },
        }));
    };

    const handleCommentsChange = (reviewId: number, value: string) => {
        setDecisionState((prev) => ({
            ...prev,
            [reviewId]: {
                ...(prev[reviewId] || { decision: 'approved', approved_amount: '' }),
                comments: value,
            },
        }));
    };

    const openEditModal = (reviewId: number, row: ItemRow & { review_id: number }) => {
        setEditModal({
            open: true,
            reviewId,
            row: { ...row },
        });
        setOpenRowKey(null);
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

            const isNumericField =
                field === 'savings_general' ||
                field === 'savings_other' ||
                field === 'savings_total' ||
                field === 'repaid_loan_amount' ||
                field === 'repaid_installment_no' ||
                field === 'other_institution_loan_amount' ||
                field === 'proposed_loan_amount' ||
                field === 'loan_term_years';

            const parsedValue = isNumericField ? (value === '' ? null : Number(value)) : value;

            const nextRow: ItemRow & { review_id: number } = {
                ...prev.row,
                [field]: parsedValue as any,
            };

            // Auto-calculate total savings inside modal
            if (field === 'savings_general' || field === 'savings_other') {
                const g = nextRow.savings_general ?? 0;
                const o = nextRow.savings_other ?? 0;
                const total = g + o;
                nextRow.savings_total = total > 0 ? total : null;
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

        const payload: any = {
            member_name: row.member_name,
            member_code: row.member_code ?? null,
            samity_number: row.samity_number ?? null,
            savings_general: row.savings_general ?? null,
            savings_other: row.savings_other ?? null,
            savings_total: row.savings_total ?? null,
            repaid_loan_amount: row.repaid_loan_amount ?? null,
            repaid_installment_no: row.repaid_installment_no ?? null,
            other_institution_loan_amount: row.other_institution_loan_amount ?? null,
            proposed_loan_amount: row.proposed_loan_amount ?? null,
            loan_term_years: row.loan_term_years ?? null,
            loan_type: row.loan_type ?? null,
            project_name: row.project_name ?? null,
        };

        router.post(`/team-based-approvals/reviews/${reviewId}/update-item`, payload, {
            preserveScroll: true,
            onSuccess: () => {
                closeEditModal();
                // Reload current filter to show fresh data
                applyFilter(currentStatus, currentFrom, currentTo || currentFrom, currentBranchId, currentApproverId);
            },
        });
    };

    const handleSubmitDecision = (review: ReviewRow) => {
        const state = decisionState[review.review_id] || {
            decision: 'approved' as const,
            approved_amount: '',
            comments: '',
        };

        const payload: any = {
            decision: state.decision,
            comments: state.comments || undefined,
        };

        if (state.decision === 'approved') {
            payload.approved_amount = state.approved_amount ? parseFloat(state.approved_amount) : undefined;
        }

        router.post(`/team-based-approvals/reviews/${review.review_id}/decide`, payload, {
            preserveScroll: true,
        });
    };

    const statusLabel: Record<string, string> = {
        pending: 'Pending',
        approved: 'Approved',
        rejected: 'Rejected',
        forwarded: 'Forwarded',
        under_review: 'Under Review',
        draft: 'Draft',
    };

    const statusClass: Record<string, string> = {
        pending: 'bg-yellow-50 text-yellow-800 border-yellow-200',
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
            forward_to_user_id: Number(forwardModal.forwardToUserId),
            comments: forwardModal.comments || undefined,
            approved_amount: approvedAmount,
        }, {
            preserveScroll: true,
            onSuccess: () => setForwardModal((p) => ({ ...p, open: false, sheetId: null, sheetLabel: '', reviewId: null, forwardToUserId: '', comments: '' })),
        });
    };

    const handlePrintPage = () => {
        if (typeof window !== 'undefined') {
            window.print();
        }
    };

    const formatDateOnly = (value?: string | null) => {
        if (!value) return '';
        // Expecting "YYYY-MM-DD HH:MM:SS" or ISO string; take only date part
        return value.split('T')[0].split(' ')[0];
    };

    const page = usePage<any>();
    const authUser = (page.props as any)?.auth?.user;

    const selectedBranch =
        currentBranchId && branches
            ? branches.find((b) => b.id.toString() === currentBranchId)
            : null;

    return (
        <AdminLayout>
            <Head title="Team Based Approvals - Approver">
                <style>{`
                    .approval-table-print-wrapper table { table-layout: fixed; }
                    .approval-table-print-wrapper th,
                    .approval-table-print-wrapper td {
                        overflow: hidden;
                        line-height: 1.25;
                        padding: 1px 1px;
                        font-size: 9px;
                        vertical-align: middle;
                        text-align: center;
                    }
                    .approval-table-print-wrapper thead th {
                        font-weight: 600;
                        white-space: normal;
                        padding: 1px 2px;
                    }
                    .approval-table-print-wrapper tbody td {
                        padding: 0 0;
                    }
                    /* সঞ্চয়ের তিনটা কলামকে আরও টাইট, center aligned ও ছোট width */
                    .approval-table-print-wrapper tbody td:nth-child(6),
                    .approval-table-print-wrapper tbody td:nth-child(7),
                    .approval-table-print-wrapper tbody td:nth-child(8) {
                        text-align: center;
                        padding: 0 0;
                        width: 4%;
                    }
                    @page { size: A4 landscape; margin: 0; }
                    @media print {
                        html, body { margin: 0 !important; padding: 0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        .approval-print-page { margin: 0 !important; padding: 0 !important; }
                        .approval-table-print-wrapper { overflow: visible !important; }
                        .approval-table-print-wrapper table { width: 100% !important; table-layout: fixed !important; font-size: 7pt !important; }
                        .approval-table-print-wrapper th,
                        .approval-table-print-wrapper td {
                            padding: 1px 2px !important;
                            font-size: 7pt !important;
                            line-height: 1.2 !important;
                        }
                        .approval-print-page { width: 100%; max-width: 100%; }
                        .approval-print-header .text-lg { font-size: 10pt !important; }
                        .approval-print-header .text-xs { font-size: 7pt !important; }
                        .approval-print-header .text-sm { font-size: 8pt !important; }
                    }
                `}</style>
            </Head>

            <div className="mx-auto py-4 sm:py-6 px-2 sm:px-4 print:py-0 print:px-0">
                {/* Print header - same as ApprovalIndex: logo left, org+title center; then branch/area/zone/tarikh row */}
                <div className="mb-4 approval-print-header">
                    <div className="flex items-start justify-between gap-4 mb-2 print:flex print:mb-1">
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
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-gray-700 mb-4">
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
                        <span><span className="font-semibold">তারিখ:</span> {currentTo || currentFrom || '-'}</span>
                    </div>
                    {authUser?.name && (
                        <p className="text-xs text-gray-600 mb-1 print:mb-0"><span className="font-semibold">অনুমোদনকারীর নাম:</span> {authUser.name}</p>
                    )}
                </div>

                {/* Filters - only visible on screen */}
                <div className="flex flex-col gap-2 mb-4 print:hidden">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Branch</span>
                            <select
                                value={currentBranchId}
                                onChange={handleBranchChange}
                                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs bg-white"
                            >
                                <option value="">All Branches</option>
                                {branches.map((branch) => (
                                    <option key={branch.id} value={branch.id}>
                                        {branch.name} {branch.code ? `(${branch.code})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Approver</span>
                            <select
                                value={currentApproverId}
                                onChange={handleApproverChange}
                                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs bg-white"
                            >
                                <option value="">All Approvers</option>
                                {approverOptions.map((opt) => (
                                    <option key={opt.id} value={opt.id}>
                                        {opt.name} ({opt.role_name})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Status</span>
                            <select
                                value={currentStatus}
                                onChange={handleStatusFilterChange}
                                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs bg-white"
                            >
                                <option value="">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center gap-2">
                        <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">From</span>
                            <input
                                type="date"
                                value={currentFrom}
                                onChange={handleFromChange}
                                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                            />
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">To</span>
                            <input
                                type="date"
                                value={currentTo}
                                onChange={handleToChange}
                                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={handlePrintPage}
                            className="col-span-2 sm:col-span-1 mt-auto px-4 py-1.5 rounded-md bg-gray-800 text-white text-xs font-medium hover:bg-black"
                        >
                            Print List
                        </button>
                    </div>
                </div>

                {/* ── MOBILE CARD VIEW ─────────────────────────────────── */}
                <div className="md:hidden flex flex-col gap-3 print:hidden">
                    {flatRows.length === 0 && (
                        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center text-sm text-gray-500">
                            আপনার জন্য কোনো Team Based আবেদন পাওয়া যায়নি।
                        </div>
                    )}
                    {flatRows.map((row, index) => {
                        const review = reviews.data.find((r) => r.review_id === row.review_id)!;
                        const rowKey = `${row.review_id}-${row.serial_no}-${index}`;
                        const isOpen = openRowKey === rowKey;
                        const state = decisionState[review.review_id];

                        return (
                            <div key={rowKey} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                                {/* Card header */}
                                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-gray-200">
                                    <div className="flex items-center gap-2">
                                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold">{index + 1}</span>
                                        <div>
                                            <p className="text-xs font-semibold text-gray-900 leading-tight">{row.member_name}</p>
                                            <p className="text-[10px] text-gray-500 leading-tight">{row.sheet_date || ''}{row.branch_name ? ` · ${row.branch_name}` : ''}</p>
                                        </div>
                                    </div>
                                    <div>
                                        {review.status === 'pending' && row.can_act ? (
                                            <button
                                                type="button"
                                                onClick={() => handleToggleAction(review.review_id, rowKey)}
                                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all ${
                                                    isOpen ? 'bg-slate-700 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
                                                }`}
                                            >
                                                {isOpen ? 'বন্ধ করুন' : 'সিদ্ধান্ত দিন'}
                                            </button>
                                        ) : (
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusClass[review.status] || statusClass.pending}`}>
                                                {statusLabel[review.status] || review.status}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Card body */}
                                <div className="px-3 py-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                                    {row.member_code && (
                                        <div><span className="text-gray-400">সদস্য নম্বর</span><p className="font-medium text-gray-800">{row.member_code}</p></div>
                                    )}
                                    {row.samity_number && (
                                        <div><span className="text-gray-400">সমিতি নম্বর</span><p className="font-medium text-gray-800">{row.samity_number}</p></div>
                                    )}
                                    <div><span className="text-gray-400">সঞ্চয় (সা/অ/মো)</span><p className="font-medium text-gray-800">{row.savings_general ?? '—'} / {row.savings_other ?? '—'} / {row.savings_total ?? '—'}</p></div>
                                    {row.repaid_loan_amount != null && (
                                        <div><span className="text-gray-400">পরিশোধিত মূল ঋণ</span><p className="font-medium text-gray-800">{row.repaid_loan_amount}{row.repaid_installment_no != null ? ` (${row.repaid_installment_no} দফা)` : ''}</p></div>
                                    )}
                                    {row.other_institution_loan_amount != null && (
                                        <div><span className="text-gray-400">অন্য সংস্থায় ঋণ</span><p className="font-medium text-gray-800 whitespace-pre-line">{String(row.other_institution_loan_amount)}</p></div>
                                    )}
                                    <div><span className="text-gray-400">প্রস্তাবিত ঋণ</span><p className="font-semibold text-blue-700">{row.proposed_loan_amount ?? '—'}</p></div>
                                    {row.loan_term_years != null && (
                                        <div><span className="text-gray-400">মেয়াদ</span><p className="font-medium text-gray-800">{row.loan_term_years} বছর</p></div>
                                    )}
                                    {row.loan_type && (
                                        <div><span className="text-gray-400">ঋণের ধরন</span><p className="font-medium text-gray-800">{row.loan_type}</p></div>
                                    )}
                                    {row.project_name && (
                                        <div className="col-span-2"><span className="text-gray-400">প্রকল্প</span><p className="font-medium text-gray-800">{row.project_name}</p></div>
                                    )}
                                    {row.approved_amount != null && (
                                        <div><span className="text-gray-400">অনুমোদিত ঋণ</span><p className="font-semibold text-green-700">৳ {row.approved_amount}</p></div>
                                    )}
                                    {((row.approvers && row.approvers.length > 0) || row.approver_name) && (
                                        <div><span className="text-gray-400">অনুমোদনকারী</span><p className="font-medium text-gray-800">{(row.approvers && row.approvers.length > 0 ? row.approvers.map((a) => a.approver_name).filter(Boolean).join(', ') : row.approver_name) || ''}{row.approver_role && !(row.approvers && row.approvers.length > 0) ? ` (${row.approver_role})` : ''}</p></div>
                                    )}
                                    {row.review_comments && (
                                        <div className="col-span-2"><span className="text-gray-400">মন্তব্য</span><p className="font-medium text-gray-800">{row.review_comments}</p></div>
                                    )}
                                    {((row.approvers && row.approvers.length > 0) || row.approver_signature || row.decided_at) && (
                                        <div className="col-span-2 flex flex-col gap-1.5">
                                            {(row.approvers && row.approvers.length > 0 ? row.approvers : [{ approver_signature: row.approver_signature, decided_at: row.decided_at, approver_name: row.approver_name }]).map((a, i) => (
                                                <div key={i} className="flex items-center gap-2">
                                                    {a.approver_signature && (
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
                                                                className="h-7 object-contain"
                                                                onError={(e) => {
                                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                                }}
                                                            />
                                                        </button>
                                                    )}
                                                    <span className="text-[10px] text-gray-500">{formatDateOnly(a.decided_at || '')}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Mobile action panel */}
                                {isOpen && review.status === 'pending' && (
                                    <div className="border-t border-blue-100 bg-gradient-to-b from-slate-50 to-blue-50 px-3 py-3">
                                        {/* Header row */}
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-1.5">
                                                <div className="flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-white text-[8px] font-bold">✓</div>
                                                <span className="text-[10px] font-semibold text-slate-700 uppercase tracking-wide">অনুমোদন সিদ্ধান্ত</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => openEditModal(review.review_id, { ...row, review_id: review.review_id })}
                                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-300 bg-white text-[10px] font-medium text-slate-600 hover:bg-slate-50 shadow-sm"
                                            >
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                                সম্পাদনা
                                            </button>
                                        </div>

                                        {/* Previous approver history (when forwarded / multi-step) */}
                                        {Array.isArray(row.approvers) && row.approvers.some((a) => a?.status && a.status !== 'pending') && (
                                            <div className="mb-3 rounded-lg border border-slate-200 bg-white/70 p-2">
                                                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">পূর্ববর্তী অনুমোদন</p>
                                                <div className="space-y-1">
                                                    {row.approvers
                                                        .filter((a) => a?.status && a.status !== 'pending')
                                                        .map((a, i) => (
                                                            <div key={`${a.approver_name || 'approver'}-${i}`} className="text-[11px] text-slate-700">
                                                                <span className="font-semibold">{a.approver_name || '—'}</span>
                                                                {a.approver_role ? <span className="text-slate-500"> ({a.approver_role})</span> : null}
                                                                <div className="text-slate-700">
                                                                    <span className="text-slate-500">অনুমোদিত ঋণ:</span>{' '}
                                                                    <span className="font-semibold">{a.approved_amount ?? '—'}</span>
                                                                    {a.decided_at ? <span className="text-slate-500"> · {a.decided_at}</span> : null}
                                                                </div>
                                                                {a.comments ? (
                                                                    <div className="text-slate-700 whitespace-pre-line">
                                                                        <span className="text-slate-500">মন্তব্য:</span> {a.comments}
                                                                    </div>
                                                                ) : null}
                                                            </div>
                                                        ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Decision toggle */}
                                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">সিদ্ধান্ত</p>
                                        <div className="flex gap-2 mb-3">
                                            <button
                                                type="button"
                                                onClick={() => handleDecisionChange(review.review_id, 'approved')}
                                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border-2 text-xs font-semibold transition-all ${(!state || state.decision === 'approved') ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-200 bg-white text-slate-500'}`}
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                                অনুমোদন
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDecisionChange(review.review_id, 'rejected')}
                                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border-2 text-xs font-semibold transition-all ${state?.decision === 'rejected' ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-500'}`}
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                                প্রত্যাখ্যান
                                            </button>
                                        </div>

                                        {/* Amount + comments */}
                                        <div className="flex flex-col gap-2 mb-3">
                                            {(!state || state.decision === 'approved') && (
                                                <div>
                                                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">অনুমোদিত ঋণ <span className="text-red-500">*</span></label>
                                                    <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white shadow-sm">
                                                        <span className="px-2.5 py-2 bg-slate-100 border-r border-slate-300 text-[10px] font-semibold text-slate-600 select-none">৳</span>
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            value={state?.approved_amount ?? ''}
                                                            onChange={(e) => handleAmountChange(review.review_id, e.target.value)}
                                                            placeholder="পরিমাণ লিখুন"
                                                            className="flex-1 px-2 py-2 text-xs outline-none bg-transparent text-slate-800 placeholder-slate-400"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                            <div>
                                                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                                                    মন্তব্য {state?.decision === 'rejected' && <span className="text-red-500">*</span>}
                                                </label>
                                                <textarea
                                                    rows={3}
                                                    value={state?.comments ?? ''}
                                                    onChange={(e) => handleCommentsChange(review.review_id, e.target.value)}
                                                    placeholder={state?.decision === 'rejected' ? 'প্রত্যাখ্যানের কারণ লিখুন...' : 'মন্তব্য লিখুন (ঐচ্ছিক)'}
                                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder-slate-400 bg-white shadow-sm resize-none focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                                                />
                                            </div>
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex gap-2">
                                            {(() => {
                                                const isApprove = !state || state.decision === 'approved';
                                                const isDisabled = isApprove ? !state?.approved_amount : !state?.comments;
                                                return (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (isApprove) setApproveChoiceModal({ open: true, review, row });
                                                            else handleSubmitDecision(review);
                                                        }}
                                                        disabled={isDisabled}
                                                        className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold shadow-sm transition-all ${isDisabled ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : isApprove ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-red-600 text-white hover:bg-red-700'}`}
                                                    >
                                                        {isApprove ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg> : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/></svg>}
                                                        {isApprove ? 'অনুমোদন দিন' : 'প্রত্যাখ্যান করুন'}
                                                    </button>
                                                );
                                            })()}
                                            <button
                                                type="button"
                                                onClick={() => setOpenRowKey(null)}
                                                className="inline-flex items-center justify-center gap-1 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 shadow-sm"
                                            >
                                                বাতিল
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* ── DESKTOP TABLE VIEW ────────────────────────────────── */}
                <div className="hidden md:block print:block bg-white shadow-sm border border-gray-200 rounded-lg overflow-x-auto approval-table-print-wrapper w-full approval-print-page">
                    <table className="w-full border-collapse table-fixed" style={{ tableLayout: 'fixed' }}>
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="border text-left" rowSpan={2}>ক্রম</th>
                                <th className="border text-left" rowSpan={2}>তারিখ</th>
                                <th className="border text-left" rowSpan={2}>শাখার নাম</th>
                                <th className="border text-left" rowSpan={2}>সদস্যের নাম</th>
                                <th className="border text-left" rowSpan={2}>সদস্য নম্বর</th>
                                <th className="border text-left" rowSpan={2}>সমিতি নম্বর</th>
                                <th className="border text-center" colSpan={3}>সঞ্চয়ের পরিমাণ</th>
                                <th className="border text-right" rowSpan={2}>পরিশোধিত ঋণ</th>
                                <th className="border text-center" rowSpan={2}>পরিশোধিত দফা</th>
                                <th className="border text-right" rowSpan={2}>অন্যান্য সংস্থায় ঋণ</th>
                                <th className="border text-right" rowSpan={2}>প্রস্তাবিত ঋণ</th>
                                <th className="border text-center" rowSpan={2}>মেয়াদ (বছর)</th>
                                <th className="border text-left" rowSpan={2}>ঋণের ধরন</th>
                                <th className="border text-left" rowSpan={2}>প্রকল্পের নাম</th>
                                <th className="border text-right" rowSpan={2}>অনুমোদিত ঋণ</th>
                        <th className="border text-left" rowSpan={2}>অনুমোদনকারী</th>
                                <th className="border text-left" rowSpan={2}>মন্তব্য</th>
                                <th className="border text-left" rowSpan={2}>অনুমোদনকারীর স্বাক্ষর / তারিখ</th>
                                <th className="border text-center" rowSpan={2}>Status</th>
                            </tr>
                            <tr>
                                <th className="border text-center">সাধারণ</th>
                                <th className="border text-center">অন্যান্য</th>
                                <th className="border text-center">মোট</th>
                            </tr>
                        </thead>
                        <tbody>
                            {flatRows.length === 0 && (
                                <tr>
                                    <td colSpan={20} className="border text-center text-gray-500 py-4">
                                        আপনার জন্য কোনো Team Based আবেদন পাওয়া যায়নি।
                                    </td>
                                </tr>
                            )}
                            {flatRows.map((row, index) => {
                                const review = reviews.data.find((r) => r.review_id === row.review_id)!;
                                const sheet = review.sheet;
                                const rowKey = `${row.review_id}-${row.serial_no}-${index}`;
                                const isOpen = openRowKey === rowKey;
                                const state = decisionState[review.review_id];

                                return (
                                    <React.Fragment key={`${row.review_id}-${row.serial_no}-${index}`}>
                                        <tr className="hover:bg-gray-50">
                                            <td className="border text-left">{index + 1}</td>
                                            <td className="border text-left">{row.sheet_date || '-'}</td>
                                            <td className="border text-left">{row.branch_name || '-'}</td>
                                            <td className="border text-left">{row.member_name}</td>
                                            <td className="border text-left">{row.member_code || ''}</td>
                                            <td className="border text-left">{row.samity_number || ''}</td>
                                            <td className="border text-center">{row.savings_general ?? ''}</td>
                                            <td className="border text-center">{row.savings_other ?? ''}</td>
                                            <td className="border text-center">{row.savings_total ?? ''}</td>
                                            <td className="border text-right">{row.repaid_loan_amount ?? ''}</td>
                                            <td className="border text-center">{row.repaid_installment_no ?? ''}</td>
                                            <td className="border text-right align-top">
                                                <span className="whitespace-pre-line block text-left">{row.other_institution_loan_amount ?? ''}</span>
                                            </td>
                                            <td className="border text-right">{row.proposed_loan_amount ?? ''}</td>
                                            <td className="border text-center">{row.loan_term_years ?? ''}</td>
                                            <td className="border text-left">{row.loan_type || ''}</td>
                                            <td className="border text-left">{row.project_name || ''}</td>
                                            <td className="border text-right">{row.approved_amount ?? ''}</td>
                                            <td className="border text-left">
                                                {row.approvers && row.approvers.length > 0 ? row.approvers.map((a) => a.approver_name).filter(Boolean).join(', ') : (row.approver_name ? `${row.approver_name}${row.approver_role ? ` (${row.approver_role})` : ''}` : '')}
                                            </td>
                                            <td className="border text-left">{row.review_comments || ''}</td>
                                            <td className="border text-left align-top">
                                                {(row.approvers && row.approvers.length > 0 ? row.approvers : [{ approver_signature: row.approver_signature, decided_at: row.decided_at, approver_name: row.approver_name }]).map((a, i) => (
                                                    <div key={i} className="flex flex-col items-center gap-0 py-0.5 border-b border-gray-100 last:border-0">
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
                                                                <span className="text-[10px] text-gray-700">{formatDateOnly(a.decided_at || '')}</span>
                                                            </>
                                                        ) : (
                                                            <span className="text-[10px] text-gray-500">{formatDateOnly(a.decided_at || '')}</span>
                                                        )}
                                                    </div>
                                                ))}
                                            </td>
                                            <td className="border text-center">
                                                {review.status === 'pending' && row.can_act ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleAction(review.review_id, rowKey)}
                                                        className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-blue-600 text-white hover:bg-blue-700"
                                                    >
                                                        Action
                                                    </button>
                                                ) : (
                                                    <span
                                                        className={`inline-flex items-center px-1.5 py-0.5 rounded border ${
                                                            statusClass[review.status] || statusClass.pending
                                                        }`}
                                                    >
                                                        {statusLabel[review.status] || review.status}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                        {isOpen && review.status === 'pending' && (
                                            <tr className="print:hidden">
                                                <td colSpan={20} className="border-b border-blue-100 bg-gradient-to-r from-slate-50 to-blue-50 p-0">
                                                    <div className="px-4 py-4">
                                                        {/* Panel header */}
                                                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200">
                                                            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-[9px] font-bold">✓</div>
                                                            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">অনুমোদন সিদ্ধান্ত</span>
                                                            <span className="text-[10px] text-slate-400 ml-1">— {row.member_name}</span>
                                                            <div className="ml-auto">
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        openEditModal(review.review_id, {
                                                                            ...row,
                                                                            review_id: review.review_id,
                                                                        })
                                                                    }
                                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-300 bg-white text-[10px] font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-400 shadow-sm transition-colors"
                                                                >
                                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                                                    সারি সম্পাদনা
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Previous approver history (when forwarded / multi-step) */}
                                                        {Array.isArray(row.approvers) && row.approvers.some((a) => a?.status && a.status !== 'pending') && (
                                                            <div className="mb-4 rounded-xl border border-slate-200 bg-white/70 p-3">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                                                                    <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">পূর্ববর্তী অনুমোদন</p>
                                                                </div>
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                    {row.approvers
                                                                        .filter((a) => a?.status && a.status !== 'pending')
                                                                        .map((a, i) => (
                                                                            <div key={`${a.approver_name || 'approver'}-${i}`} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                                                                                <div className="flex items-start justify-between gap-2">
                                                                                    <div className="min-w-0">
                                                                                        <p className="text-sm font-semibold text-slate-800 truncate">
                                                                                            {a.approver_name || '—'}
                                                                                        </p>
                                                                                        {a.approver_role ? (
                                                                                            <p className="text-xs text-slate-500">
                                                                                                {a.approver_role}
                                                                                            </p>
                                                                                        ) : null}
                                                                                    </div>
                                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                                                                        {a.status}
                                                                                    </span>
                                                                                </div>
                                                                                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                                                                                    <div className="rounded-md bg-slate-50 border border-slate-200 px-2 py-1.5">
                                                                                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">অনুমোদিত</p>
                                                                                        <p className="font-semibold text-green-700">
                                                                                            ৳ {a.approved_amount ?? '—'}
                                                                                        </p>
                                                                                    </div>
                                                                                    <div className="rounded-md bg-slate-50 border border-slate-200 px-2 py-1.5">
                                                                                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">তারিখ</p>
                                                                                        <p className="font-medium text-slate-700">
                                                                                            {a.decided_at ? formatDateOnly(a.decided_at) : '—'}
                                                                                        </p>
                                                                                    </div>
                                                                                </div>
                                                                                {a.comments ? (
                                                                                    <div className="mt-2 rounded-md bg-amber-50 border border-amber-200 px-2.5 py-2 text-xs text-amber-900 whitespace-pre-line">
                                                                                        <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700">মন্তব্য</span>
                                                                                        <div className="mt-0.5">{a.comments}</div>
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="mt-2 text-xs text-slate-500">
                                                                                        মন্তব্য: —
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div className="flex flex-col lg:flex-row gap-4">
                                                            {/* Decision selection */}
                                                            <div className="flex flex-col gap-2">
                                                                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">সিদ্ধান্ত নির্বাচন করুন</p>
                                                                <div className="flex gap-2">
                                                                    {/* Approve card */}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleDecisionChange(review.review_id, 'approved')}
                                                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 text-xs font-semibold transition-all ${
                                                                            (!state || state.decision === 'approved')
                                                                                ? 'border-green-500 bg-green-50 text-green-700 shadow-sm'
                                                                                : 'border-slate-200 bg-white text-slate-500 hover:border-green-300 hover:bg-green-50/50'
                                                                        }`}
                                                                    >
                                                                        <span className={`flex items-center justify-center w-4 h-4 rounded-full border-2 transition-all ${
                                                                            (!state || state.decision === 'approved')
                                                                                ? 'border-green-500 bg-green-500'
                                                                                : 'border-slate-300 bg-white'
                                                                        }`}>
                                                                            {(!state || state.decision === 'approved') && (
                                                                                <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
                                                                            )}
                                                                        </span>
                                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                                                        অনুমোদন
                                                                    </button>
                                                                    {/* Reject card */}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleDecisionChange(review.review_id, 'rejected')}
                                                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 text-xs font-semibold transition-all ${
                                                                            state?.decision === 'rejected'
                                                                                ? 'border-red-500 bg-red-50 text-red-700 shadow-sm'
                                                                                : 'border-slate-200 bg-white text-slate-500 hover:border-red-300 hover:bg-red-50/50'
                                                                        }`}
                                                                    >
                                                                        <span className={`flex items-center justify-center w-4 h-4 rounded-full border-2 transition-all ${
                                                                            state?.decision === 'rejected'
                                                                                ? 'border-red-500 bg-red-500'
                                                                                : 'border-slate-300 bg-white'
                                                                        }`}>
                                                                            {state?.decision === 'rejected' && (
                                                                                <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
                                                                            )}
                                                                        </span>
                                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                                                        প্রত্যাখ্যান
                                                                    </button>
                                                                </div>

                                                            </div>

                                                            {/* Amount + Comments — separate labeled fields */}
                                                            <div className="flex-1 flex items-start gap-3">
                                                                {(!state || state.decision === 'approved') && (
                                                                    <div className="flex flex-col gap-1">
                                                                        <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                                                                            অনুমোদিত ঋণ <span className="text-red-500">*</span>
                                                                        </label>
                                                                        <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white shadow-sm focus-within:border-green-400 focus-within:ring-1 focus-within:ring-green-200 transition-all w-44">
                                                                            <span className="flex items-center px-2.5 py-2 bg-slate-100 border-r border-slate-300 text-[10px] font-semibold text-slate-600 select-none">৳</span>
                                                                            <input
                                                                                type="number"
                                                                                min={0}
                                                                                value={state?.approved_amount ?? ''}
                                                                                onChange={(e) =>
                                                                                    handleAmountChange(review.review_id, e.target.value)
                                                                                }
                                                                                placeholder="পরিমাণ"
                                                                                className="flex-1 px-2 py-2 text-xs outline-none bg-transparent text-slate-800 placeholder-slate-400"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                <div className="flex flex-col gap-1 flex-1">
                                                                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                                                                        মন্তব্য {state?.decision === 'rejected' && <span className="text-red-500">*</span>}
                                                                    </label>
                                                                    <textarea
                                                                        rows={2}
                                                                        value={state?.comments ?? ''}
                                                                        onChange={(e) =>
                                                                            handleCommentsChange(review.review_id, e.target.value)
                                                                        }
                                                                        placeholder={state?.decision === 'rejected' ? 'প্রত্যাখ্যানের কারণ লিখুন...' : 'মন্তব্য লিখুন (ঐচ্ছিক)'}
                                                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder-slate-400 bg-white shadow-sm resize-none focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 transition-all"
                                                                    />
                                                                </div>
                                                            </div>

                                                            {/* Action buttons */}
                                                            <div className="flex flex-col justify-end gap-2 pt-5 lg:pt-0 lg:pb-0.5 self-end">
                                                                {(() => {
                                                                    const isApprove = !state || state.decision === 'approved';
                                                                    const isDisabled = isApprove ? !state?.approved_amount : !state?.comments;
                                                                    return (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                if (isApprove) setApproveChoiceModal({ open: true, review, row });
                                                                                else handleSubmitDecision(review);
                                                                            }}
                                                                            disabled={isDisabled}
                                                                            className={`inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-lg text-xs font-semibold shadow-sm transition-all ${
                                                                                isDisabled
                                                                                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                                                                    : isApprove
                                                                                    ? 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800'
                                                                                    : 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800'
                                                                            }`}
                                                                        >
                                                                            {isApprove ? (
                                                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                                                                            ) : (
                                                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/></svg>
                                                                            )}
                                                                            {isApprove ? 'অনুমোদন দিন' : 'প্রত্যাখ্যান করুন'}
                                                                        </button>
                                                                    );
                                                                })()}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setOpenRowKey(null)}
                                                                    className="inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-400 shadow-sm transition-all"
                                                                >
                                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                                                                    বাতিল
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
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
                        <div className="px-4 py-4 space-y-3 text-xs">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-gray-700 mb-1">সদস্যের নাম</label>
                                    <input
                                        type="text"
                                        value={editModal.row.member_name}
                                        onChange={(e) => handleEditModalChange('member_name', e.target.value)}
                                        className="w-full border border-gray-300 rounded-md px-2 py-1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-700 mb-1">সদস্য নম্বর</label>
                                    <input
                                        type="text"
                                        value={editModal.row.member_code || ''}
                                        onChange={(e) => handleEditModalChange('member_code', e.target.value)}
                                        className="w-full border border-gray-300 rounded-md px-2 py-1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-700 mb-1">সমিতি নম্বর</label>
                                    <input
                                        type="text"
                                        value={editModal.row.samity_number || ''}
                                        onChange={(e) => handleEditModalChange('samity_number', e.target.value)}
                                        className="w-full border border-gray-300 rounded-md px-2 py-1"
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <label className="block text-gray-700 mb-1">সঞ্চয় (সাধারণ)</label>
                                        <input
                                            type="number"
                                            value={editModal.row.savings_general ?? ''}
                                            onChange={(e) => handleEditModalChange('savings_general', e.target.value)}
                                            className="w-full border border-gray-300 rounded-md px-2 py-1"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 mb-1">সঞ্চয় (অন্যান্য)</label>
                                        <input
                                            type="number"
                                            value={editModal.row.savings_other ?? ''}
                                            onChange={(e) => handleEditModalChange('savings_other', e.target.value)}
                                            className="w-full border border-gray-300 rounded-md px-2 py-1"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 mb-1">সঞ্চয় (মোট)</label>
                                        <input
                                            type="number"
                                            value={editModal.row.savings_total ?? ''}
                                            onChange={(e) => handleEditModalChange('savings_total', e.target.value)}
                                            className="w-full border border-gray-300 rounded-md px-2 py-1"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-gray-700 mb-1">পরিশোধিত ঋণের পরিমাণ</label>
                                    <input
                                        type="number"
                                        value={editModal.row.repaid_loan_amount ?? ''}
                                        onChange={(e) => handleEditModalChange('repaid_loan_amount', e.target.value)}
                                        className="w-full border border-gray-300 rounded-md px-2 py-1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-700 mb-1">পরিশোধিত দফা নম্বর</label>
                                    <input
                                        type="number"
                                        value={editModal.row.repaid_installment_no ?? ''}
                                        onChange={(e) => handleEditModalChange('repaid_installment_no', e.target.value)}
                                        className="w-full border border-gray-300 rounded-md px-2 py-1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-700 mb-1">
                                        অন্যান্য সংস্থায় গ্রহণকৃত ঋণের পরিমাণ
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={editModal.row.other_institution_loan_amount ?? ''}
                                        onChange={(e) =>
                                            handleEditModalChange('other_institution_loan_amount', e.target.value)
                                        }
                                        placeholder="যেমন: আশা ৫০০০, ব্রাক ২০০০ (প্রতি লাইনে বা কমা দিয়ে)"
                                        className="w-full border border-gray-300 rounded-md px-2 py-1 resize-y"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-700 mb-1">প্রস্তাবিত ঋণের পরিমাণ</label>
                                    <input
                                        type="number"
                                        value={editModal.row.proposed_loan_amount ?? ''}
                                        onChange={(e) => handleEditModalChange('proposed_loan_amount', e.target.value)}
                                        className="w-full border border-gray-300 rounded-md px-2 py-1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-700 mb-1">ঋণের মেয়াদ (বছর)</label>
                                    <input
                                        type="number"
                                        step={0.5}
                                        value={editModal.row.loan_term_years ?? ''}
                                        onChange={(e) => handleEditModalChange('loan_term_years', e.target.value)}
                                        className="w-full border border-gray-300 rounded-md px-2 py-1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-700 mb-1">ঋণের ধরন</label>
                                    <input
                                        type="text"
                                        value={editModal.row.loan_type || ''}
                                        onChange={(e) => handleEditModalChange('loan_type', e.target.value)}
                                        className="w-full border border-gray-300 rounded-md px-2 py-1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-700 mb-1">প্রকল্পের নাম</label>
                                    <input
                                        type="text"
                                        value={editModal.row.project_name || ''}
                                        onChange={(e) => handleEditModalChange('project_name', e.target.value)}
                                        className="w-full border border-gray-300 rounded-md px-2 py-1"
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
                                    handleSubmitDecision(approveChoiceModal.review!);
                                    setApproveChoiceModal({ open: false, review: null, row: null });
                                    setOpenRowKey(null);
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
                                        setOpenRowKey(null);
                                        setForwardModal({
                                            open: true,
                                            sheetId: row.sheet_id,
                                            sheetLabel: `${row.sheet_date || ''} · ${row.branch_name || ''}`,
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
        </AdminLayout>
    );
}

