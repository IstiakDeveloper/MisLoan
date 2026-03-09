import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';

interface Zone {
    id: number;
    name: string;
}

interface Area {
    id: number;
    name: string;
    zone_id: number;
    zone?: Zone;
}

interface Branch {
    id: number;
    name: string;
    code: string;
    area_id: number;
    area?: {
        id: number;
        name: string;
        zone: Zone;
    };
}

interface ItemRow {
    id: number;
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
    status?: string;
    review_comments?: string | null;
    approver_signature?: string | null;
    decided_at?: string | null;
}

interface ApprovalRow {
    id: number;
    sheet_date: string | null;
    status: string;
    branch: {
        name?: string | null;
        code?: string | null;
        area_name?: string | null;
        zone_name?: string | null;
    };
    items_count: number;
    proposed_total: number;
    approved_total_amount?: number | null;
    creator_name?: string | null;
    approver_name?: string | null;
    items: ItemRow[];
}

interface PaginatedApprovals {
    data: ApprovalRow[];
    current_page: number;
    last_page: number;
    total: number;
}

interface Props {
    approvals: PaginatedApprovals;
    filters: {
        status?: string;
        search?: string;
        zone_id?: number | string;
        area_id?: number | string;
        branch_id?: number | string;
        date_from?: string;
        date_to?: string;
    };
    stats: {
        total: number;
        draft: number;
        pending: number;
        approved: number;
        rejected: number;
    };
    zones: Zone[];
    areas: Area[];
    branches: Branch[];
}

export default function TeamBasedApprovals({ approvals, filters, stats, zones, areas, branches }: Props) {
    const [statusFilter, setStatusFilter] = useState(filters.status || '');
    const [search, setSearch] = useState(filters.search || '');
    const [zoneId, setZoneId] = useState((filters.zone_id ?? '').toString());
    const [areaId, setAreaId] = useState((filters.area_id ?? '').toString());
    const [branchId, setBranchId] = useState((filters.branch_id ?? '').toString());
    const [dateFrom, setDateFrom] = useState(filters.date_from || new Date().toISOString().slice(0, 10));
    const [dateTo, setDateTo] = useState(filters.date_to || new Date().toISOString().slice(0, 10));
    const [zoomSignatureUrl, setZoomSignatureUrl] = useState<string | null>(null);

    const applyFilters = () => {
        router.get(
            '/head-office/team-based-approvals',
            {
                status: statusFilter || undefined,
                search: search || undefined,
                zone_id: zoneId || undefined,
                area_id: areaId || undefined,
                branch_id: branchId || undefined,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
            },
            { preserveState: true }
        );
    };

    const filteredAreas = areas.filter((a) => !zoneId || a.zone_id.toString() === zoneId);
    const filteredBranches = branches.filter(
        (b) => (!zoneId || filteredAreas.some((a) => a.id === b.area_id)) && (!areaId || b.area_id.toString() === areaId)
    );

    const handlePageChange = (page: number) => {
        router.get(
            '/head-office/team-based-approvals',
            {
                page,
                status: statusFilter || undefined,
                search: search || undefined,
                zone_id: zoneId || undefined,
                area_id: areaId || undefined,
                branch_id: branchId || undefined,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
            },
            { preserveState: true }
        );
    };

    // Flatten all items (similar to branch TeamBased ApprovalIndex)
    const flatRows: (ItemRow & {
        sheet_id: number;
        sheet_date: string | null;
        branch_name?: string | null;
        branch_code?: string | null;
        area_name?: string | null;
        zone_name?: string | null;
        approver_name?: string | null;
        status: string;
    })[] = [];

    approvals.data.forEach((sheet) => {
        sheet.items.forEach((item, idx) => {
            flatRows.push({
                ...item,
                serial_no: item.serial_no || idx + 1,
                sheet_id: sheet.id,
                sheet_date: sheet.sheet_date,
                branch_name: sheet.branch.name,
                branch_code: sheet.branch.code,
                area_name: sheet.branch.area_name,
                zone_name: sheet.branch.zone_name,
                approver_name: sheet.approver_name,
                status: item.status || sheet.status,
            });
        });
    });

    const selectedBranchObj = branches.find((b) => b.id.toString() === branchId);
    const headerBranchName = selectedBranchObj
        ? `${selectedBranchObj.name} (${selectedBranchObj.code})`
        : 'All Branch';
    const headerAreaName =
        selectedBranchObj?.area?.name ||
        areas.find((a) => a.id.toString() === areaId)?.name ||
        '-';
    const headerZoneName =
        selectedBranchObj?.area?.zone?.name ||
        zones.find((z) => z.id.toString() === zoneId)?.name ||
        '-';

    const statusLabel: Record<string, string> = {
        draft: 'Draft',
        pending: 'Pending',
        approved: 'Approved',
        rejected: 'Rejected',
        under_review: 'Under Review',
    };

    const statusClass: Record<string, string> = {
        draft: 'bg-gray-100 text-gray-700 border-gray-200',
        pending: 'bg-yellow-50 text-yellow-800 border-yellow-200',
        approved: 'bg-green-50 text-green-800 border-green-200',
        rejected: 'bg-red-50 text-red-800 border-red-200',
        under_review: 'bg-blue-50 text-blue-800 border-blue-200',
    };

    const handlePrint = () => {
        if (typeof window !== 'undefined') {
            window.print();
        }
    };

    const handleEditItem = (itemId: number) => {
        router.get(`/head-office/team-based-approvals/items/${itemId}/edit`);
    };

    const handleDeleteItem = (itemId: number) => {
        if (!confirm('আপনি কি নিশ্চিত যে এই লোন সারিটি মুছে ফেলতে চান?')) {
            return;
        }
        router.delete(`/head-office/team-based-approvals/items/${itemId}`);
    };

    return (
        <AdminLayout>
            <Head title="Head Office - Team Based Approvals">
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
                    @page { size: A4 landscape; margin: 6mm; }
                    @media print {
                        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
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
                        .ho-teambased-filters { display: none !important; }
                    }
                `}</style>
            </Head>

            <div className="mx-auto py-6 px-4 space-y-4 approval-index-print-page">
                {/* Print-style header similar to branch ApprovalIndex */}
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
                        <div className="flex-shrink-0 w-12" />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-gray-700 mb-4">
                        <span>
                            <span className="font-semibold">শাখার নাম:</span> {headerBranchName}
                        </span>
                        <span>
                            <span className="font-semibold">অঞ্চলের নাম:</span> {headerAreaName}
                        </span>
                        <span>
                            <span className="font-semibold">জোনের নাম:</span> {headerZoneName}
                        </span>
                        <span>
                            <span className="font-semibold">তারিখ:</span> {dateTo || dateFrom || '-'}
                        </span>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 ho-teambased-stats">
                    <div className="bg-white border rounded-md px-3 py-2">
                        <div className="text-xs text-gray-500">Total</div>
                        <div className="text-lg font-semibold text-gray-900">{stats.total}</div>
                    </div>
                    <div className="bg-white border rounded-md px-3 py-2">
                        <div className="text-xs text-gray-500">Draft</div>
                        <div className="text-lg font-semibold text-gray-900">{stats.draft}</div>
                    </div>
                    <div className="bg-white border rounded-md px-3 py-2">
                        <div className="text-xs text-gray-500">Pending</div>
                        <div className="text-lg font-semibold text-gray-900">{stats.pending}</div>
                    </div>
                    <div className="bg-white border rounded-md px-3 py-2">
                        <div className="text-xs text-gray-500">Approved</div>
                        <div className="text-lg font-semibold text-gray-900">{stats.approved}</div>
                    </div>
                    <div className="bg-white border rounded-md px-3 py-2">
                        <div className="text-xs text-gray-500">Rejected</div>
                        <div className="text-lg font-semibold text-gray-900">{stats.rejected}</div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white border rounded-md p-3 space-y-2 ho-teambased-filters">
                    <div className="flex flex-wrap gap-2 items-center">
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Member name / code / project"
                            className="border border-gray-300 rounded-md px-2 py-1 text-xs min-w-[180px]"
                        />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="border border-gray-300 rounded-md px-2 py-1 text-xs"
                        >
                            <option value="">All Status</option>
                            <option value="draft">Draft</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                        </select>
                        <select
                            value={zoneId}
                            onChange={(e) => {
                                setZoneId(e.target.value);
                                setAreaId('');
                                setBranchId('');
                            }}
                            className="border border-gray-300 rounded-md px-2 py-1 text-xs"
                        >
                            <option value="">All Zones</option>
                            {zones.map((z) => (
                                <option key={z.id} value={z.id}>
                                    {z.name}
                                </option>
                            ))}
                        </select>
                        <select
                            value={areaId}
                            onChange={(e) => {
                                setAreaId(e.target.value);
                                setBranchId('');
                            }}
                            className="border border-gray-300 rounded-md px-2 py-1 text-xs"
                        >
                            <option value="">All Areas</option>
                            {areas
                                .filter((a) => !zoneId || a.zone_id.toString() === zoneId)
                                .map((a) => (
                                    <option key={a.id} value={a.id}>
                                        {a.name}
                                    </option>
                                ))}
                        </select>
                        <select
                            value={branchId}
                            onChange={(e) => setBranchId(e.target.value)}
                            className="border border-gray-300 rounded-md px-2 py-1 text-xs"
                        >
                            <option value="">All Branches</option>
                            {branches
                                .filter((b) => !areaId || b.area_id.toString() === areaId)
                                .map((b) => (
                                    <option key={b.id} value={b.id}>
                                        {b.name} ({b.code})
                                    </option>
                                ))}
                        </select>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                        <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-600">From:</span>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="border border-gray-300 rounded-md px-2 py-1 text-xs"
                            />
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-600">To:</span>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="border border-gray-300 rounded-md px-2 py-1 text-xs"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={applyFilters}
                            className="px-3 py-1.5 rounded-md bg-gray-800 text-white text-xs font-medium hover:bg-black"
                        >
                            Apply
                        </button>
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="px-3 py-1.5 rounded-md bg-gray-600 text-white text-xs font-medium hover:bg-black"
                        >
                            Print
                        </button>
                    </div>
                </div>

                {/* Table - flat list of all items (similar layout to branch ApprovalIndex) */}
                <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden approval-index-table-wrapper w-full">
                    <table className="w-full border-collapse table-fixed" style={{ tableLayout: 'fixed' }}>
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="border px-2 py-1 text-left">ক্রম</th>
                                <th className="border px-2 py-1 text-left">তারিখ</th>
                                <th className="border px-2 py-1 text-left">শাখা</th>
                                <th className="border px-2 py-1 text-left">অঞ্চল</th>
                                <th className="border px-2 py-1 text-left">জোন</th>
                                <th className="border px-2 py-1 text-left">সদস্যের নাম</th>
                                <th className="border px-2 py-1 text-left">সদস্য নম্বর</th>
                                <th className="border px-2 py-1 text-left">সমিতি নম্বর</th>
                                <th className="border px-2 py-1 text-right">প্রস্তাবিত ঋণ</th>
                                <th className="border px-2 py-1 text-right">অনুমোদিত ঋণ</th>
                                <th className="border px-2 py-1 text-left">ঋণের ধরন</th>
                                <th className="border px-2 py-1 text-left">প্রকল্পের নাম</th>
                                <th className="border px-2 py-1 text-left">মন্তব্য</th>
                                <th className="border px-2 py-1 text-left">অনুমোদনকারীর স্বাক্ষর / তারিখ</th>
                                <th className="border px-2 py-1 text-center">অবস্থা</th>
                                <th className="border px-2 py-1 text-left">অনুমোদনকারী</th>
                                <th className="border px-2 py-1 text-center">কর্ম</th>
                            </tr>
                        </thead>
                        <tbody>
                            {flatRows.length === 0 && (
                                <tr>
                                    <td colSpan={14} className="border px-2 py-3 text-center text-gray-500">
                                        No Team Based items found for this filter.
                                    </td>
                                </tr>
                            )}
                            {flatRows.map((row, index) => (
                                <tr key={`${row.sheet_id}-${row.serial_no}-${index}`} className="hover:bg-gray-50">
                                    <td className="border px-2 py-1">{index + 1}</td>
                                    <td className="border px-2 py-1">{row.sheet_date || '-'}</td>
                                    <td className="border px-2 py-1">
                                        {row.branch_name} {row.branch_code ? `(${row.branch_code})` : ''}
                                    </td>
                                    <td className="border px-2 py-1">{row.area_name || '-'}</td>
                                    <td className="border px-2 py-1">{row.zone_name || '-'}</td>
                                    <td className="border px-2 py-1">{row.member_name}</td>
                                    <td className="border px-2 py-1">{row.member_code || ''}</td>
                                    <td className="border px-2 py-1">{row.samity_number || ''}</td>
                                    <td className="border px-2 py-1 text-right">{row.proposed_loan_amount ?? ''}</td>
                                    <td className="border px-2 py-1 text-right">{row.approved_amount ?? ''}</td>
                                    <td className="border px-2 py-1">{row.loan_type || ''}</td>
                                    <td className="border px-2 py-1">{row.project_name || ''}</td>
                                    <td className="border px-2 py-1">{row.review_comments || ''}</td>
                                    <td className="border px-2 py-1">
                                        {row.approver_signature ? (
                                            <div className="flex flex-col items-start gap-0.5">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setZoomSignatureUrl(
                                                            row.approver_signature!.startsWith('http')
                                                                ? row.approver_signature!
                                                                : row.approver_signature!.startsWith('/storage/')
                                                                ? row.approver_signature!
                                                                : `/storage/${row.approver_signature!}`,
                                                        )
                                                    }
                                                    className="focus:outline-none hover:scale-105 transition-transform"
                                                    title="স্বাক্ষর বড় করে দেখুন"
                                                >
                                                    <img
                                                        src={
                                                            row.approver_signature.startsWith('http')
                                                                ? row.approver_signature
                                                                : row.approver_signature.startsWith('/storage/')
                                                                ? row.approver_signature
                                                                : `/storage/${row.approver_signature}`
                                                        }
                                                        alt="Signature"
                                                        className="h-6 max-h-6 object-contain"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).style.display = 'none';
                                                        }}
                                                    />
                                                </button>
                                                <span>{row.decided_at || ''}</span>
                                            </div>
                                        ) : (
                                            <span>{row.decided_at || ''}</span>
                                        )}
                                    </td>
                                    <td className="border px-2 py-1 text-center capitalize">{row.status}</td>
                                    <td className="border px-2 py-1">{row.approver_name || '-'}</td>
                                    <td className="border px-2 py-1 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => handleEditItem(row.id)}
                                                className="px-2 py-0.5 text-[11px] rounded border border-blue-500 text-blue-600 hover:bg-blue-50"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteItem(row.id)}
                                                className="px-2 py-0.5 text-[11px] rounded border border-red-500 text-red-600 hover:bg-red-50"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination summary (item-wise for current page) */}
                <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>
                        এই পাতায় {flatRows.length}টি আইটেম দেখানো হচ্ছে
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            disabled={approvals.current_page <= 1}
                            onClick={() => handlePageChange(approvals.current_page - 1)}
                            className="px-2 py-1 border rounded disabled:opacity-50"
                        >
                            Prev
                        </button>
                        <span>
                            Page {approvals.current_page} of {approvals.last_page}
                        </span>
                        <button
                            type="button"
                            disabled={approvals.current_page >= approvals.last_page}
                            onClick={() => handlePageChange(approvals.current_page + 1)}
                            className="px-2 py-1 border rounded disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
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

