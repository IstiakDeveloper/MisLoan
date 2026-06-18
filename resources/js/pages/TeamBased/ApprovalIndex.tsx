import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { formatDate, formatDateTime } from '@/utils/dateUtils';
import React from 'react';

/** কোনো অ্যামাউন্টে ডেসিমাল থাকবে না – রাউন্ড নম্বর রিটার্ন */
function formatAmount(val: number | string | null | undefined): string {
    if (val == null || val === '') return '';
    const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^\d.-]/g, ''));
    if (!Number.isFinite(n)) return String(val);
    return String(Math.round(n));
}

interface ItemRow {
    serial_no: number;
    member_name: string;
    member_code?: string | null;
    member_phone?: string | null;
    samity_number?: string | null;
    savings_general?: number | null;
    savings_other?: number | null;
    savings_total?: number | null;
    repaid_loan_amount?: number | null;
    repaid_installment_no?: number | null;
    other_institution_loan_amount?: string | null;
    proposed_loan_amount?: number | null;
    loan_term_years?: number | null;
    loan_type?: string | null;
    project_name?: string | null;
    // Per-loan approval info (from review)
    status?: string;
    approved_amount?: number | null;
    review_comments?: string | null;
    approver_signature?: string | null;
    decided_at?: string | null;
    approvers?: { approver_name?: string | null; approver_role?: string | null; status?: string; approver_signature?: string | null; decided_at?: string | null }[];
}

interface ApprovalRow {
    id: number;
    sheet_date: string | null;
    status: string;
    created_at?: string | null;
    approver_name?: string | null;
    items: ItemRow[];
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedApprovals {
    data: ApprovalRow[];
    current_page: number;
    last_page: number;
    total?: number;
    per_page?: number;
    links: PaginationLink[];
}

interface Props {
    approvals: PaginatedApprovals;
    filters: {
        date_from: string;
        date_to: string;
        approver_id?: string;
        status?: string;
        per_page?: string | number;
    };
    draftCount: number;
    approverOptions: { id: number; name: string; role_name: string }[];
    branch: {
        name: string;
        code: string;
        area_name?: string | null;
        zone_name?: string | null;
    };
}

const statusLabel: Record<string, string> = {
    draft: 'Draft',
    pending: 'Pending',
    under_review: 'Under Review',
    approved: 'Approved',
    rejected: 'Rejected',
};

const statusClass: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700 border-gray-200',
    pending: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    under_review: 'bg-blue-50 text-blue-800 border-blue-200',
    approved: 'bg-green-50 text-green-800 border-green-200',
    rejected: 'bg-red-50 text-red-800 border-red-200',
};

const statusFilterOptions: { value: string; label: string }[] = [
    { value: '', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'under_review', label: 'Under Review' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
];

/** Row has non-empty display value for a column (numbers: 0 counts as data). */
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

export default function TeamBasedApprovalIndex({ approvals, filters, draftCount, approverOptions, branch }: Props) {
    const currentFrom = filters.date_from || '';
    const currentTo = filters.date_to || '';
    const currentApprover = filters.approver_id || '';
    const currentStatus = filters.status || '';
    const currentPerPage = filters.per_page || 100;
    const [filterFrom, setFilterFrom] = React.useState(currentFrom);
    const [filterTo, setFilterTo] = React.useState(currentTo);
    const [filterApprover, setFilterApprover] = React.useState(currentApprover);
    const [filterStatus, setFilterStatus] = React.useState(currentStatus);
    const [filterPerPage, setFilterPerPage] = React.useState(currentPerPage.toString());

    React.useEffect(() => {
        setFilterFrom(currentFrom);
        setFilterTo(currentTo);
        setFilterApprover(currentApprover);
        setFilterStatus(currentStatus);
        setFilterPerPage(currentPerPage.toString());
    }, [currentFrom, currentTo, currentApprover, currentStatus, currentPerPage]);

    const applyFilter = (from: string, to: string, approverId: string, status: string, perPageVal: string | number, page?: number) => {
        router.visit('/team-based-approvals', {
            data: {
                date_from: from,
                date_to: to,
                approver_id: approverId || undefined,
                status: status || undefined,
                per_page: perPageVal || undefined,
                page: page || undefined,
            },
            preserveScroll: true,
        });
    };

    const goToPage = (page: number) => {
        if (page < 1 || page > approvals.last_page) return;
        applyFilter(filterFrom, filterTo || filterFrom, filterApprover, filterStatus, filterPerPage, page);
    };

    const perPage = approvals.per_page ?? 100;
    const total = approvals.total ?? 0;
    const from = total === 0 ? 0 : (approvals.current_page - 1) * perPage + 1;
    const to = Math.min(approvals.current_page * perPage, total);

    const getPageNumbers = (): (number | 'ellipsis')[] => {
        const totalPages = approvals.last_page;
        const current = approvals.current_page;
        if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
        if (current <= 3) return [1, 2, 3, 4, 'ellipsis', totalPages];
        if (current >= totalPages - 2) return [1, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        return [1, 'ellipsis', current - 1, current, current + 1, 'ellipsis', totalPages];
    };

    const submitFilters = () => {
        const from = filterFrom || '';
        const to = filterTo || filterFrom || '';
        applyFilter(from, to, filterApprover, filterStatus, filterPerPage, 1);
    };

    const handleFilterKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            submitFilters();
        }
    };

    const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFilterFrom(e.target.value);
    };

    const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFilterTo(e.target.value);
    };

    const handleApproverChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const v = e.target.value;
        setFilterApprover(v);
        applyFilter(filterFrom, filterTo || filterFrom, v, filterStatus, filterPerPage, 1);
    };

    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const v = e.target.value;
        setFilterStatus(v);
        applyFilter(filterFrom, filterTo || filterFrom, filterApprover, v, filterPerPage, 1);
    };

    const handlePerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const v = e.target.value;
        setFilterPerPage(v);
        applyFilter(filterFrom, filterTo || filterFrom, filterApprover, filterStatus, v, 1);
    };

    // approvals.data is already flat and contains the items themselves
    const flatRows: (ItemRow & {
        sheet_id: number;
        sheet_date: string | null;
        approver_name?: string | null;
        status: string;
        created_at?: string | null;
    })[] = approvals.data as any;

    type FlatRow = (typeof flatRows)[number];

    const colVis = React.useMemo(() => {
        const rows = flatRows as FlatRow[];
        if (rows.length === 0) {
            return {
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
                comments: true,
                approver: true,
                signature: true,
            };
        }
        const any = (fn: (r: FlatRow) => boolean) => rows.some(fn);
        return {
            member_code: any((r) => rowHasValue(r, (x) => x.member_code)),
            member_phone: any((r) => rowHasValue(r, (x) => x.member_phone)),
            samity_number: any((r) => rowHasValue(r, (x) => x.samity_number)),
            savings_general: any((r) => r.savings_general != null),
            savings_other: any((r) => r.savings_other != null),
            savings_total: any((r) => r.savings_total != null),
            repaid_loan: any((r) => r.repaid_loan_amount != null),
            repaid_installment: any((r) => r.repaid_installment_no != null),
            other_institution: any((r) => rowHasOtherInstitutionLoan(r)),
            proposed: any((r) => r.proposed_loan_amount != null),
            term: any((r) => r.loan_term_years != null),
            loan_type: any((r) => rowHasValue(r, (x) => x.loan_type)),
            project: any((r) => rowHasValue(r, (x) => x.project_name)),
            approved: any((r) => r.approved_amount != null),
            comments: any((r) => rowHasValue(r, (x) => x.review_comments)),
            approver: any((r) => {
                const n =
                    (r.approvers && r.approvers.length > 0
                        ? r.approvers.map((a) => a.approver_name).filter(Boolean).join(', ')
                        : null) ?? r.approver_name;
                return n != null && String(n).trim().length > 0;
            }),
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
        2 + // ক্র + নাম
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
        (colVis.comments ? 1 : 0) +
        (colVis.approver ? 1 : 0) +
        (colVis.signature ? 1 : 0) +
        1; // Status (screen)

    const headerRowSpan = showSavingsGroup ? 2 : 1;

    const [zoomSignatureUrl, setZoomSignatureUrl] = React.useState<string | null>(null);

    const handlePrintPage = () => {
        if (typeof window !== 'undefined') {
            window.print();
        }
    };

    return (
        <AdminLayout>
            <Head title="Team Based Loan Approvals">
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

                    /* Legal size – প্রিন্টে মার্জিন কম */
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

            <div className="mx-auto py-6 px-4 print:py-0 print:px-0 print:!m-0 print:max-w-none">
                {/* Print header - matches formal document: logo left, org+title center, date right; then branch/area/zone row */}
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

                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-gray-700 mb-4 print:mb-1">
                        <span><span className="font-semibold">শাখার নাম:</span> {branch.name}</span>
                        <span><span className="font-semibold">অঞ্চলের নাম:</span> {branch.area_name || '-'}</span>
                        <span><span className="font-semibold">জোনের নাম:</span> {branch.zone_name || '-'}</span>
                        <span><span className="font-semibold">তারিখ:</span> {formatDate(currentTo || currentFrom, '-')}</span>
                    </div>
                </div>

                {/* Filters - only visible on screen */}
                <div className="bg-slate-50/50 border border-slate-200/80 rounded-2xl p-4 space-y-4 mb-4 print:hidden shadow-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">From Date</span>
                            <input
                                type="date"
                                value={filterFrom}
                                onChange={handleFromChange}
                                onKeyDown={handleFilterKeyDown}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 transition-all text-slate-800"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">To Date</span>
                            <input
                                type="date"
                                value={filterTo}
                                onChange={handleToChange}
                                onKeyDown={handleFilterKeyDown}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 transition-all text-slate-800"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Approver</span>
                            <select
                                value={filterApprover}
                                onChange={handleApproverChange}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 transition-all text-slate-800"
                            >
                                <option value="">All Approvers</option>
                                {approverOptions.map((u) => (
                                    <option key={u.id} value={u.id}>
                                        {u.name} ({u.role_name})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</span>
                            <select
                                value={filterStatus}
                                onChange={handleStatusChange}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 transition-all text-slate-800"
                            >
                                {statusFilterOptions.map((s) => (
                                    <option key={s.value} value={s.value}>
                                        {s.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Per Page</span>
                            <select
                                value={filterPerPage}
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
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 pt-1 border-t border-slate-200/50">
                        <div className="flex flex-wrap gap-2">
                            <Link
                                href="/team-based-approvals/drafts"
                                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border border-amber-300 text-amber-700 bg-amber-50/50 hover:bg-amber-500 hover:text-white transition-all shadow-sm active:scale-[0.98]"
                            >
                                <span>Draft List</span>
                                {draftCount > 0 && (
                                    <span className="inline-flex items-center justify-center min-w-[18px] h-4 px-1.5 rounded-full bg-amber-600 text-white text-[9px] font-bold">
                                        {draftCount}
                                    </span>
                                )}
                            </Link>
                            <Link
                                href="/team-based-approvals/create"
                                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-all shadow-sm hover:shadow active:scale-[0.98]"
                            >
                                New Form
                            </Link>
                        </div>

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={submitFilters}
                                className="px-5 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-all shadow-sm hover:shadow active:scale-[0.98]"
                            >
                                Apply Filters
                            </button>
                            <button
                                type="button"
                                onClick={handlePrintPage}
                                className="px-5 py-2 rounded-lg bg-slate-800 text-white text-xs font-medium hover:bg-slate-900 transition-all shadow-sm hover:shadow active:scale-[0.98]"
                            >
                                Print List
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── MOBILE CARD VIEW ─────────────────────────────────── */}
                <div className="md:hidden flex flex-col gap-3 print:hidden">
                    {flatRows.length === 0 && (
                        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center text-sm text-gray-500">
                            কোনো Team Based তথ্য পাওয়া যায়নি।
                        </div>
                    )}

                    {flatRows.map((row, idx) => (
                        <div key={`${row.sheet_id}-${idx}`} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                            <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-gray-200">
                                <div className="flex items-center gap-2">
                                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold">
                                        {idx + 1}
                                    </span>
                                    <div>
                                        <p className="text-xs font-semibold text-gray-900 leading-tight">{row.member_name}</p>
                                        <p className="text-[10px] text-gray-500 leading-tight">
                                            {formatDate(row.sheet_date, '')}{row.created_at ? ` · ${formatDateTime(row.created_at, '')}` : ''}
                                        </p>
                                    </div>
                                </div>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusClass[row.status] || statusClass.draft}`}>
                                    {statusLabel[row.status] || row.status}
                                </span>
                            </div>

                            <div className="px-3 py-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                                {row.member_code && (
                                    <div>
                                        <span className="text-gray-400">সদস্য নম্বর</span>
                                        <p className="font-medium text-gray-800">{row.member_code}</p>
                                    </div>
                                )}
                                {row.member_phone && (
                                    <div>
                                        <span className="text-gray-400">ফোন নম্বর</span>
                                        <p className="font-medium text-gray-800">{row.member_phone}</p>
                                    </div>
                                )}
                                {row.samity_number && (
                                    <div>
                                        <span className="text-gray-400">সমিতি নম্বর</span>
                                        <p className="font-medium text-gray-800">{row.samity_number}</p>
                                    </div>
                                )}
                                <div>
                                    <span className="text-gray-400">সঞ্চয় (সা/অ/মো)</span>
                                    <p className="font-medium text-gray-800">
                                        {formatAmount(row.savings_general) || '—'} / {formatAmount(row.savings_other) || '—'} / {formatAmount(row.savings_total) || '—'}
                                    </p>
                                </div>
                                {row.repaid_loan_amount != null && (
                                    <div>
                                        <span className="text-gray-400">পরিশোধিত মূল ঋণ</span>
                                        <p className="font-medium text-gray-800">
                                            {formatAmount(row.repaid_loan_amount) || row.repaid_loan_amount}{row.repaid_installment_no != null ? ` (${row.repaid_installment_no} দফা)` : ''}
                                        </p>
                                    </div>
                                )}
                                {row.other_institution_loan_amount != null && (
                                    <div className="col-span-2">
                                        <span className="text-gray-400">অন্যান্য সংস্থায় ঋণ</span>
                                        <p className="font-medium text-gray-800 whitespace-pre-line">{String(row.other_institution_loan_amount)}</p>
                                    </div>
                                )}
                                <div>
                                    <span className="text-gray-400">প্রস্তাবিত ঋণ</span>
                                    <p className="font-semibold text-blue-700">{formatAmount(row.proposed_loan_amount) || '—'}</p>
                                </div>
                                {row.loan_term_years != null && (
                                    <div>
                                        <span className="text-gray-400">মেয়াদ</span>
                                        <p className="font-medium text-gray-800">{row.loan_term_years} বছর</p>
                                    </div>
                                )}
                                {row.loan_type && (
                                    <div>
                                        <span className="text-gray-400">ঋণের ধরন</span>
                                        <p className="font-medium text-gray-800">{row.loan_type}</p>
                                    </div>
                                )}
                                {row.project_name && (
                                    <div className="col-span-2">
                                        <span className="text-gray-400">প্রকল্প</span>
                                        <p className="font-medium text-gray-800">{row.project_name}</p>
                                    </div>
                                )}
                                {row.approved_amount != null && (
                                    <div>
                                        <span className="text-gray-400">অনুমোদিত ঋণ</span>
                                        <p className="font-semibold text-green-700">৳ {formatAmount(row.approved_amount)}</p>
                                    </div>
                                )}
                                {((row.approvers && row.approvers.length > 0) || row.approver_name) && (
                                    <div className={row.review_comments ? '' : 'col-span-2'}>
                                        <span className="text-gray-400">অনুমোদনকারী</span>
                                        <p className="font-medium text-gray-800">
                                            {(row.approvers && row.approvers.length > 0
                                                ? row.approvers.map((a) => a.approver_name).filter(Boolean).join(', ')
                                                : row.approver_name) || ''}
                                        </p>
                                    </div>
                                )}
                                {row.review_comments && (
                                    <div className="col-span-2">
                                        <span className="text-gray-400">মন্তব্য</span>
                                        <p className="font-medium text-gray-800 whitespace-pre-line">{row.review_comments}</p>
                                    </div>
                                )}
                                {((row.approvers && row.approvers.length > 0) || row.approver_signature || row.decided_at) && (
                                    <div className="col-span-2 flex flex-col gap-1.5">
                                        {(row.approvers && row.approvers.length > 0 ? row.approvers : [{ approver_signature: row.approver_signature, decided_at: row.decided_at }]).map((a, i) => (
                                            <div key={i} className="flex items-center gap-2">
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
                                                            className="h-7 object-contain"
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).style.display = 'none';
                                                            }}
                                                        />
                                                    </button>
                                                ) : null}
                                                <span className="text-[10px] text-gray-500">{formatDate(a.decided_at, '')}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── DESKTOP TABLE VIEW ────────────────────────────────── */}
                <div className="hidden md:block print:block bg-white border border-slate-200/80 rounded-2xl overflow-x-auto shadow-sm hover:shadow-md transition-shadow duration-300 approval-index-table-wrapper w-full approval-index-print-page print:bg-transparent print:shadow-none print:border-0 print:rounded-none">
                    <table className="w-full border-collapse">
                        <thead className="bg-gray-50 print:bg-transparent">
                            <tr>
                                <th className="border approval-col-serial" rowSpan={headerRowSpan}>
                                    ক্র.
                                </th>
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
                                        পরিশোধিত মূল ঋণের পরিমাণ
                                    </th>
                                )}
                                {colVis.repaid_installment && (
                                    <th className="border" rowSpan={headerRowSpan}>
                                        পরি: দফা নম্বর
                                    </th>
                                )}
                                {colVis.other_institution && (
                                    <th className="border px-2 py-1 whitespace-normal max-w-[14rem]" rowSpan={headerRowSpan}>
                                        অন্যান্য সংস্থায় গ্রহণকৃত ঋণের পরিমাণ
                                    </th>
                                )}
                                {colVis.proposed && (
                                    <th className="border" rowSpan={headerRowSpan}>
                                        প্রস্তাবিত ঋণের পরিমাণ
                                    </th>
                                )}
                                {colVis.term && (
                                    <th className="border" rowSpan={headerRowSpan}>
                                        ঋণের মেয়াদ (বছর)
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
                                {colVis.comments && (
                                    <th className="border approval-col-comment" rowSpan={headerRowSpan}>
                                        মন্তব্য
                                    </th>
                                )}
                                {colVis.approver && (
                                    <th className="border" rowSpan={headerRowSpan}>
                                        অনুমোদনকারী
                                    </th>
                                )}
                                {colVis.signature && (
                                    <th className="border" rowSpan={headerRowSpan}>
                                        অনুমোদনকারীর স্বাক্ষর / তারিখ
                                    </th>
                                )}
                                <th className="border print:hidden" rowSpan={headerRowSpan}>
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
                                        কোনো Team Based তথ্য পাওয়া যায়নি।
                                    </td>
                                </tr>
                            )}
                            {flatRows.map((row, idx) => (
                                <tr key={`${row.sheet_id}-${idx}`} className="hover:bg-slate-50/50 print:hover:bg-transparent transition-colors">
                                    <td className="border approval-col-serial">{idx + 1}</td>
                                    <td className="border text-left max-w-[12rem] font-medium text-slate-800">{row.member_name}</td>
                                    {colVis.member_code && <td className="border whitespace-nowrap font-mono">{row.member_code || ''}</td>}
                                    {colVis.member_phone && <td className="border whitespace-nowrap">{row.member_phone || ''}</td>}
                                    {colVis.samity_number && <td className="border whitespace-nowrap">{row.samity_number || ''}</td>}
                                    {colVis.savings_general && <td className="border whitespace-nowrap">{formatAmount(row.savings_general)}</td>}
                                    {colVis.savings_other && <td className="border whitespace-nowrap">{formatAmount(row.savings_other)}</td>}
                                    {colVis.savings_total && <td className="border whitespace-nowrap font-semibold text-slate-700">{formatAmount(row.savings_total)}</td>}
                                    {colVis.repaid_loan && (
                                        <td className="border whitespace-nowrap">
                                            {(formatAmount(row.repaid_loan_amount) || row.repaid_loan_amount) ?? ''}
                                        </td>
                                    )}
                                    {colVis.repaid_installment && (
                                        <td className="border whitespace-nowrap">{row.repaid_installment_no ?? ''}</td>
                                    )}
                                    {colVis.other_institution && (
                                        <td className="border align-top px-2 py-1.5 max-w-[14rem]">
                                            <span className="whitespace-pre-line block text-left text-[9px] text-slate-500 leading-normal">{row.other_institution_loan_amount ?? ''}</span>
                                        </td>
                                    )}
                                    {colVis.proposed && (
                                        <td className="border whitespace-nowrap font-semibold text-slate-900">{formatAmount(row.proposed_loan_amount)}</td>
                                    )}
                                    {colVis.term && <td className="border whitespace-nowrap">{row.loan_term_years ?? ''}</td>}
                                    {colVis.loan_type && <td className="border">{row.loan_type || ''}</td>}
                                    {colVis.project && (
                                        <td className="border text-left max-w-[12rem]">{row.project_name || ''}</td>
                                    )}
                                    {colVis.approved && (
                                        <td className="border whitespace-nowrap font-semibold text-blue-700">{formatAmount(row.approved_amount)}</td>
                                    )}
                                    {colVis.comments && (
                                        <td className="border approval-col-comment align-top">
                                            <span className="whitespace-pre-line text-[9px] text-slate-500 leading-normal block text-left">{row.review_comments || ''}</span>
                                        </td>
                                    )}
                                    {colVis.approver && (
                                        <td className="border text-left max-w-[10rem]">
                                            {(row.approvers && row.approvers.length > 0
                                                ? row.approvers.map((a) => a.approver_name).filter(Boolean).join(', ')
                                                : null) ?? row.approver_name ?? ''}
                                        </td>
                                    )}
                                    {colVis.signature && (
                                        <td className="border align-top whitespace-nowrap">
                                            {(row.approvers && row.approvers.length > 0
                                                ? row.approvers
                                                : [{ approver_signature: row.approver_signature, decided_at: row.decided_at }]
                                            ).map((a, i) => (
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
                                                            <span className="text-[9px] text-slate-500">{formatDate(a.decided_at, '')}</span>
                                                        </>
                                                    ) : (
                                                        <span className="text-[9px] text-slate-500">{formatDate(a.decided_at, '')}</span>
                                                    )}
                                                </div>
                                            ))}
                                        </td>
                                    )}
                                    <td className="border print:hidden px-2 py-1">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider border ${statusClass[row.status] || 'bg-slate-100 text-slate-800 border-slate-200'}`}>
                                            {statusLabel[row.status] || row.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination - only when multiple pages */}
                {approvals.last_page > 1 && (
                    <div className="mt-4 print:hidden flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border border-slate-200 bg-slate-50/30 rounded-2xl">
                        <p className="text-xs text-slate-600 order-2 sm:order-1 font-medium">
                            {total > 0 ? (
                                <>Showing <span className="text-slate-900 font-semibold">{from}</span> to <span className="text-slate-900 font-semibold">{to}</span> of <span className="text-slate-900 font-semibold">{total}</span> members</>
                            ) : (
                                <>No results</>
                            )}
                        </p>
                        <nav className="flex items-center gap-2 order-1 sm:order-2" aria-label="Pagination">
                            <button
                                type="button"
                                onClick={() => goToPage(approvals.current_page - 1)}
                                disabled={approvals.current_page <= 1}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                            >
                                Previous
                            </button>
                            <div className="flex items-center gap-1">
                                {getPageNumbers().map((p, i) =>
                                    p === 'ellipsis' ? (
                                        <span key={`ellipsis-${i}`} className="px-2 py-1.5 text-slate-400 text-xs">…</span>
                                    ) : (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => goToPage(p)}
                                            className={`w-8 h-8 flex items-center justify-center text-xs font-semibold rounded-lg border transition-all ${
                                                approvals.current_page === p
                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20'
                                                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                                            }`}
                                        >
                                            {p}
                                        </button>
                                    )
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => goToPage(approvals.current_page + 1)}
                                disabled={approvals.current_page >= approvals.last_page}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                            >
                                Next
                            </button>
                        </nav>
                    </div>
                )}
            </div>

            {zoomSignatureUrl && (
                <div
                    className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 print:hidden"
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

