import { Head, Link, router } from '@inertiajs/react';
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
    links: PaginationLink[];
}

interface Props {
    approvals: PaginatedApprovals;
    filters: {
        date_from: string;
        date_to: string;
        approver_id?: string;
        status?: string;
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

export default function TeamBasedApprovalIndex({ approvals, filters, draftCount, approverOptions, branch }: Props) {
    const currentFrom = filters.date_from || '';
    const currentTo = filters.date_to || '';
    const currentApprover = filters.approver_id || '';
    const currentStatus = filters.status || '';
    const [filterFrom, setFilterFrom] = React.useState(currentFrom);
    const [filterTo, setFilterTo] = React.useState(currentTo);
    const [filterApprover, setFilterApprover] = React.useState(currentApprover);
    const [filterStatus, setFilterStatus] = React.useState(currentStatus);

    React.useEffect(() => {
        setFilterFrom(currentFrom);
        setFilterTo(currentTo);
        setFilterApprover(currentApprover);
        setFilterStatus(currentStatus);
    }, [currentFrom, currentTo, currentApprover, currentStatus]);

    const applyFilter = (from: string, to: string, approverId: string, status: string) => {
        router.visit('/team-based-approvals', {
            data: {
                date_from: from,
                date_to: to,
                approver_id: approverId || undefined,
                status: status || undefined,
            },
            preserveScroll: true,
        });
    };

    const submitFilters = () => {
        const from = filterFrom || '';
        const to = filterTo || filterFrom || '';
        applyFilter(from, to, filterApprover, filterStatus);
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
        setFilterApprover(e.target.value);
    };

    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setFilterStatus(e.target.value);
    };

    // Flatten all sheet items into a single list so that
    // every loan row shows in index (ধলাও দেখাবে)
    const flatRows: (ItemRow & {
        sheet_id: number;
        sheet_date: string | null;
        approver_name?: string | null;
        status: string;
        created_at?: string | null;
    })[] = [];

    approvals.data.forEach((sheet) => {
        sheet.items.forEach((item, idx) => {
            flatRows.push({
                ...item,
                serial_no: item.serial_no || idx + 1,
                sheet_id: sheet.id,
                sheet_date: sheet.sheet_date,
                approver_name: sheet.approver_name,
                status: item.status || sheet.status,
                created_at: sheet.created_at,
            });
        });
    });

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
                    .approval-index-table-wrapper table { table-layout: fixed; }
                    .approval-index-table-wrapper th,
                    .approval-index-table-wrapper td {
                        overflow: hidden;
                        line-height: 1.25;
                        padding: 1px 1px;
                        font-size: 9px;
                        vertical-align: middle;
                        text-align: center;
                    }
                    .approval-index-table-wrapper thead th {
                        font-weight: 600;
                        white-space: normal;
                        padding: 1px 2px;
                    }
                    .approval-index-table-wrapper tbody td {
                        padding: 8px 4px;
                    }
                    @page { size: A4 landscape; margin: 0; }
                    @media print {
                        html, body { margin: 0 !important; padding: 0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        .approval-index-print-page { margin: 0 !important; padding: 0 !important; }
                        .approval-index-table-wrapper { overflow: visible !important; }
                        .approval-index-table-wrapper table { width: 100% !important; table-layout: fixed !important; font-size: 7pt !important; }
                        .approval-index-table-wrapper thead th {
                            padding: 2px 4px !important;
                        }
                        .approval-index-table-wrapper tbody td {
                            padding: 8px 4px !important;
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

            <div className="mx-auto py-6 px-4 print:py-0 print:px-0">
                {/* Print header - matches formal document: logo left, org+title center, date right; then branch/area/zone row */}
                <div className="mb-4 approval-index-print-header">
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

                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-gray-700 mb-4">
                        <span><span className="font-semibold">শাখার নাম:</span> {branch.name}</span>
                        <span><span className="font-semibold">অঞ্চলের নাম:</span> {branch.area_name || '-'}</span>
                        <span><span className="font-semibold">জোনের নাম:</span> {branch.zone_name || '-'}</span>
                        <span><span className="font-semibold">তারিখ:</span> {currentTo || currentFrom || '-'}</span>
                    </div>
                </div>

                {/* Filters - only visible on screen */}
                <div className="flex flex-col gap-2 mb-4 print:hidden">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">From</span>
                            <input
                                type="date"
                                value={filterFrom}
                                onChange={handleFromChange}
                                onKeyDown={handleFilterKeyDown}
                                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm bg-white"
                            />
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">To</span>
                            <input
                                type="date"
                                value={filterTo}
                                onChange={handleToChange}
                                onKeyDown={handleFilterKeyDown}
                                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm bg-white"
                            />
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Approver</span>
                            <select
                                value={filterApprover}
                                onChange={handleApproverChange}
                                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs bg-white"
                            >
                                <option value="">All Approvers</option>
                                {approverOptions.map((u) => (
                                    <option key={u.id} value={u.id}>
                                        {u.name} ({u.role_name})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
                        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-end">
                            <div className="col-span-2 sm:col-span-1 flex flex-col gap-0.5 min-w-[180px]">
                                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Status</span>
                                <select
                                    value={filterStatus}
                                    onChange={handleStatusChange}
                                    className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs bg-white"
                                >
                                    {statusFilterOptions.map((s) => (
                                        <option key={s.value} value={s.value}>
                                            {s.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <Link
                                href="/team-based-approvals/drafts"
                                className="col-span-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium border border-amber-500 text-amber-700 hover:bg-amber-50"
                            >
                                <span>Draft List</span>
                                {draftCount > 0 && (
                                    <span className="inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded-full bg-amber-600 text-white text-[10px] font-semibold">
                                        {draftCount}
                                    </span>
                                )}
                            </Link>
                            <Link
                                href="/team-based-approvals/create"
                                className="col-span-1 inline-flex items-center justify-center px-3 py-1.5 rounded-md bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
                            >
                                New Form
                            </Link>
                        </div>

                        <div className="grid grid-cols-2 sm:flex sm:items-end gap-2">
                            <button
                                type="button"
                                onClick={submitFilters}
                                className="px-4 py-1.5 rounded-md bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
                            >
                                Apply Filter
                            </button>
                            <button
                                type="button"
                                onClick={handlePrintPage}
                                className="px-4 py-1.5 rounded-md bg-gray-800 text-white text-xs font-medium hover:bg-black"
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
                                            {row.sheet_date || ''}{row.created_at ? ` · ${row.created_at}` : ''}
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
                                {row.samity_number && (
                                    <div>
                                        <span className="text-gray-400">সমিতি নম্বর</span>
                                        <p className="font-medium text-gray-800">{row.samity_number}</p>
                                    </div>
                                )}
                                <div>
                                    <span className="text-gray-400">সঞ্চয় (সা/অ/মো)</span>
                                    <p className="font-medium text-gray-800">
                                        {row.savings_general ?? '—'} / {row.savings_other ?? '—'} / {row.savings_total ?? '—'}
                                    </p>
                                </div>
                                {row.repaid_loan_amount != null && (
                                    <div>
                                        <span className="text-gray-400">পরিশোধিত মূল ঋণ</span>
                                        <p className="font-medium text-gray-800">
                                            {row.repaid_loan_amount}{row.repaid_installment_no != null ? ` (${row.repaid_installment_no} দফা)` : ''}
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
                                    <p className="font-semibold text-blue-700">{row.proposed_loan_amount ?? '—'}</p>
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
                                        <p className="font-semibold text-green-700">৳ {row.approved_amount}</p>
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
                                                <span className="text-[10px] text-gray-500">{a.decided_at || ''}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── DESKTOP TABLE VIEW ────────────────────────────────── */}
                <div className="hidden md:block print:block bg-white shadow-sm border border-gray-200 rounded-lg overflow-x-auto approval-index-table-wrapper w-full approval-index-print-page">
                    <table className="w-full border-collapse table-fixed" style={{ tableLayout: 'fixed' }}>
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="border" rowSpan={2}>ক্র. নং</th>
                                <th className="border" rowSpan={2}>সদস্যের নাম</th>
                                <th className="border" rowSpan={2}>সদস্য নম্বর</th>
                                <th className="border" rowSpan={2}>সমিতি নম্বর</th>
                                <th className="border text-center" colSpan={3}>সঞ্চয়ের পরিমাণ</th>
                                <th className="border" rowSpan={2}>পরিশোধিত মূল ঋণের পরিমাণ</th>
                                <th className="border" rowSpan={2}>পরি: দফা নম্বর</th>
                                <th className="border" rowSpan={2}>অন্যান্য সংস্থায় গ্রহণকৃত ঋণের পরিমাণ</th>
                                <th className="border" rowSpan={2}>প্রস্তাবিত ঋণের পরিমাণ</th>
                                <th className="border" rowSpan={2}>ঋণের মেয়াদ (বছর)</th>
                                <th className="border" rowSpan={2}>ঋণের ধরন</th>
                                <th className="border" rowSpan={2}>প্রকল্পের নাম</th>
                                <th className="border" rowSpan={2}>অনুমোদঙ্কা ঋণ</th>
                                <th className="border" rowSpan={2}>মন্তব্য</th>
                                <th className="border" rowSpan={2}>অনুমোদনকারী</th>
                                <th className="border" rowSpan={2}>অনুমোদনকারীর স্বাক্ষর / তারিখ</th>
                                <th className="border print:hidden" rowSpan={2}>Status</th>
                            </tr>
                            <tr>
                                <th className="border">সাধারণ</th>
                                <th className="border">অন্যান্য</th>
                                <th className="border">মোট</th>
                            </tr>
                        </thead>
                        <tbody>
                            {flatRows.length === 0 && (
                                <tr>
                                    <td colSpan={19} className="border text-center text-gray-500 py-4">
                                        কোনো Team Based তথ্য পাওয়া যায়নি।
                                    </td>
                                </tr>
                            )}
                            {flatRows.map((row, idx) => (
                                <tr key={`${row.sheet_id}-${idx}`} className="hover:bg-gray-50">
                                    <td className="border">{idx + 1}</td>
                                    <td className="border">{row.member_name}</td>
                                    <td className="border">{row.member_code || ''}</td>
                                    <td className="border">{row.samity_number || ''}</td>
                                    <td className="border">{row.savings_general ?? ''}</td>
                                    <td className="border">{row.savings_other ?? ''}</td>
                                    <td className="border">{row.savings_total ?? ''}</td>
                                    <td className="border">{row.repaid_loan_amount ?? ''}</td>
                                    <td className="border">{row.repaid_installment_no ?? ''}</td>
                                    <td className="border align-top">
                                    <span className="whitespace-pre-line block text-left">{row.other_institution_loan_amount ?? ''}</span>
                                </td>
                                    <td className="border">{row.proposed_loan_amount ?? ''}</td>
                                    <td className="border">{row.loan_term_years ?? ''}</td>
                                    <td className="border">{row.loan_type || ''}</td>
                                    <td className="border">{row.project_name || ''}</td>
                                    <td className="border">{row.approved_amount ?? ''}</td>
                                    <td className="border">{row.review_comments || ''}</td>
                                    <td className="border">{(row.approvers && row.approvers.length > 0 ? row.approvers.map((a) => a.approver_name).filter(Boolean).join(', ') : null) ?? row.approver_name ?? ''}</td>
                                    <td className="border align-top">
                                        {(row.approvers && row.approvers.length > 0 ? row.approvers : [{ approver_signature: row.approver_signature, decided_at: row.decided_at }]).map((a, i) => (
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
                                                        <span className="text-[10px] text-gray-700">{a.decided_at || ''}</span>
                                                    </>
                                                ) : (
                                                    <span className="text-[10px] text-gray-500">{a.decided_at || ''}</span>
                                                )}
                                            </div>
                                        ))}
                                    </td>
                                    <td className="border print:hidden">
                                        <span
                                            className={`inline-flex items-center px-1.5 py-0.5 rounded border ${
                                                statusClass[row.status] || statusClass.draft
                                            }`}
                                        >
                                            {statusLabel[row.status] || row.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
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

