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
    repaid_loan_amount?: number | null;
    repaid_installment_no?: number | null;
    other_institution_loan_amount?: number | null;
    proposed_loan_amount?: number | null;
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
}

export default function TeamBasedApprovalApproverIndex({ reviews, filters, branches, approverOptions }: Props) {
    const currentStatus = filters.status ?? '';
    const currentBranchId = (filters.branch_id ?? '').toString();
    const currentApproverId = (filters.approver_id ?? '').toString();
    const currentFrom = filters.date_from || '';
    const currentTo = filters.date_to || '';

    const [openRowKey, setOpenRowKey] = React.useState<string | null>(null);
    const [decisionState, setDecisionState] = React.useState<{
        [key: number]: { decision: 'approved' | 'rejected'; approved_amount: string; comments: string };
    }>({});

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

    const handleSubmitDecision = (review: ReviewRow) => {
        const state = decisionState[review.review_id] || {
            decision: 'approved' as const,
            approved_amount: '',
            comments: '',
        };

        const payload: Record<string, unknown> = {
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
        under_review: 'Under Review',
        draft: 'Draft',
    };

    const statusClass: Record<string, string> = {
        pending: 'bg-yellow-50 text-yellow-800 border-yellow-200',
        approved: 'bg-green-50 text-green-800 border-green-200',
        rejected: 'bg-red-50 text-red-800 border-red-200',
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
    })[] = [];

    reviews.data.forEach((review) => {
        const sheet = review.sheet;
        sheet.items.forEach((item, idx) => {
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
            });
        });
    });

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
                    @page { size: A4 landscape; margin: 6mm; }
                    @media print {
                        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
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

            <div className="mx-auto py-6 px-4">
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
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-600">Branch:</span>
                            <select
                                value={currentBranchId}
                                onChange={handleBranchChange}
                                className="border border-gray-300 rounded-md px-2 py-1 text-xs"
                            >
                                <option value="">All</option>
                                {branches.map((branch) => (
                                    <option key={branch.id} value={branch.id}>
                                        {branch.name} {branch.code ? `(${branch.code})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-600">Approver:</span>
                            <select
                                value={currentApproverId}
                                onChange={handleApproverChange}
                                className="border border-gray-300 rounded-md px-2 py-1 text-xs"
                            >
                                <option value="">All</option>
                                {approverOptions.map((opt) => (
                                    <option key={opt.id} value={opt.id}>
                                        {opt.name} ({opt.role_name})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-600">Status:</span>
                            <select
                                value={currentStatus}
                                onChange={handleStatusFilterChange}
                                className="border border-gray-300 rounded-md px-2 py-1 text-xs"
                            >
                                <option value="">All</option>
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-600">From:</span>
                            <input
                                type="date"
                                value={currentFrom}
                                onChange={handleFromChange}
                                className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                            />
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-600">To:</span>
                            <input
                                type="date"
                                value={currentTo}
                                onChange={handleToChange}
                                className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={handlePrintPage}
                            className="px-3 py-1.5 rounded-md bg-gray-800 text-white text-xs font-medium hover:bg-black"
                        >
                            Print List
                        </button>
                    </div>
                </div>

                <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden approval-table-print-wrapper w-full approval-print-page">
                    <table className="w-full border-collapse table-fixed" style={{ tableLayout: 'fixed' }}>
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="border text-left" rowSpan={2}>ক্রম</th>
                                <th className="border text-left" rowSpan={2}>তারিখ</th>
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
                                    <td colSpan={19} className="border text-center text-gray-500 py-4">
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
                                            <td className="border text-left">{row.member_name}</td>
                                            <td className="border text-left">{row.member_code || ''}</td>
                                            <td className="border text-left">{row.samity_number || ''}</td>
                                            <td className="border text-center">{row.savings_general ?? ''}</td>
                                            <td className="border text-center">{row.savings_other ?? ''}</td>
                                            <td className="border text-center">{row.savings_total ?? ''}</td>
                                            <td className="border text-right">{row.repaid_loan_amount ?? ''}</td>
                                            <td className="border text-center">{row.repaid_installment_no ?? ''}</td>
                                            <td className="border text-right">{row.other_institution_loan_amount ?? ''}</td>
                                            <td className="border text-right">{row.proposed_loan_amount ?? ''}</td>
                                            <td className="border text-center">{row.loan_term_years ?? ''}</td>
                                            <td className="border text-left">{row.loan_type || ''}</td>
                                            <td className="border text-left">{row.project_name || ''}</td>
                                            <td className="border text-right">{row.approved_amount ?? ''}</td>
                                            <td className="border text-left">
                                                {row.approver_name ? `${row.approver_name}${row.approver_role ? ` (${row.approver_role})` : ''}` : ''}
                                            </td>
                                            <td className="border text-left">{row.review_comments || ''}</td>
                                            <td className="border text-left">
                                                {row.approver_signature ? (
                                                    <div className="flex flex-col items-center gap-0">
                                                        <img
                                                            src={
                                                                row.approver_signature.startsWith('http')
                                                                    ? row.approver_signature
                                                                    : row.approver_signature.startsWith('/storage/')
                                                                    ? row.approver_signature
                                                                    : `/storage/${row.approver_signature}`
                                                            }
                                                            alt="Signature"
                                                            className="h-8 max-h-8 object-contain print:!h-8 print:!max-h-8"
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).style.display = 'none';
                                                            }}
                                                        />
                                                        <span className="text-gray-700 leading-tight">
                                                            {formatDateOnly(row.decided_at)}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-500">{formatDateOnly(row.decided_at)}</span>
                                                )}
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
                                            <tr>
                                                <td colSpan={19} className="px-3 py-3 border-b bg-gray-50">
                                                    <div className="flex flex-col md:flex-row md:items-end gap-3">
                                                        <div className="flex items-center gap-3">
                                                            <label className="flex items-center gap-1 text-xs text-gray-700">
                                                                <input
                                                                    type="radio"
                                                                    className="h-3 w-3"
                                                                    checked={(state?.decision || 'approved') === 'approved'}
                                                                    onChange={() =>
                                                                        handleDecisionChange(review.review_id, 'approved')
                                                                    }
                                                                />
                                                                <span>Approve</span>
                                                            </label>
                                                            <label className="flex items-center gap-1 text-xs text-gray-700">
                                                                <input
                                                                    type="radio"
                                                                    className="h-3 w-3"
                                                                    checked={state?.decision === 'rejected'}
                                                                    onChange={() =>
                                                                        handleDecisionChange(review.review_id, 'rejected')
                                                                    }
                                                                />
                                                                <span>Reject</span>
                                                            </label>
                                                        </div>

                                                        {(!state || state.decision === 'approved') && (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs text-gray-700 whitespace-nowrap">
                                                                    অনুমোদিত টাকার পরিমাণ:
                                                                </span>
                                                                <input
                                                                    type="number"
                                                                    min={0}
                                                                    value={state?.approved_amount ?? ''}
                                                                    onChange={(e) =>
                                                                        handleAmountChange(review.review_id, e.target.value)
                                                                    }
                                                                    className="border border-gray-300 rounded-md px-2 py-1 text-xs w-40"
                                                                />
                                                            </div>
                                                        )}

                                                        <div className="flex-1">
                                                            <textarea
                                                                rows={2}
                                                                value={state?.comments ?? ''}
                                                                onChange={(e) =>
                                                                    handleCommentsChange(review.review_id, e.target.value)
                                                                }
                                                                placeholder="মন্তব্য লিখুন (ঐচ্ছিক)"
                                                                className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs"
                                                            />
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSubmitDecision(review)}
                                                                disabled={
                                                                    (!state || state.decision === 'approved')
                                                                        ? !state?.approved_amount
                                                                        : !state?.comments
                                                                }
                                                                className={`inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium ${
                                                                    (!state || state.decision === 'approved')
                                                                        ? !state?.approved_amount
                                                                            ? 'bg-green-300 text-white cursor-not-allowed'
                                                                            : 'bg-green-600 text-white hover:bg-green-700'
                                                                        : !state?.comments
                                                                            ? 'bg-green-300 text-white cursor-not-allowed'
                                                                            : 'bg-green-600 text-white hover:bg-green-700'
                                                                }`}
                                                            >
                                                                Submit
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setOpenRowKey(null)}
                                                                className="inline-flex items-center px-3 py-1.5 rounded-md border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-100"
                                                            >
                                                                Cancel
                                                            </button>
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
        </AdminLayout>
    );
}

