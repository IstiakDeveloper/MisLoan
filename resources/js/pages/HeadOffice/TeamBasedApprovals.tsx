import React, { useMemo, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { formatDate } from '@/utils/dateUtils';

/** কোনো অ্যামাউন্টে ডেসিমাল থাকবে না – রাউন্ড নম্বর রিটার্ন */
function formatAmount(val: number | string | null | undefined): string {
    if (val == null || val === '') return '';
    const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^\d.-]/g, ''));
    if (!Number.isFinite(n)) return String(val);
    return String(Math.round(n));
}

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
    member_phone?: string | null;
    samity_number?: string | null;
    savings_general?: number | null;
    savings_other?: number | null;
    savings_total?: number | null;
    repaid_loan_amount?: number | null;
    repaid_installment_no?: number | null;
    other_institution_loan_amount?: string | null;
    proposed_loan_amount?: number | null;
    approved_amount?: number | null;
    loan_term_years?: number | null;
    loan_type?: string | null;
    project_name?: string | null;
    status?: string;
    review_comments?: string | null;
    approver_signature?: string | null;
    decided_at?: string | null;
    approvers?: { approver_name?: string | null; approver_role?: string | null; status?: string; approver_signature?: string | null; decided_at?: string | null }[];
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
    per_page?: number;
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
        approver_id?: number | string;
        per_page?: number | string;
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
    approverOptions: { id: number; name: string; role_name: string }[];
}

export default function TeamBasedApprovals({ approvals, filters, stats, zones, areas, branches, approverOptions }: Props) {
    const [statusFilter, setStatusFilter] = useState(filters.status || '');
    const [search, setSearch] = useState(filters.search || '');
    const [zoneId, setZoneId] = useState((filters.zone_id ?? '').toString());
    const [areaId, setAreaId] = useState((filters.area_id ?? '').toString());
    const [branchId, setBranchId] = useState((filters.branch_id ?? '').toString());
    const [approverId, setApproverId] = useState((filters.approver_id ?? '').toString());
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');
    const [perPage, setPerPage] = useState((filters.per_page ?? 100).toString());
    const [zoomSignatureUrl, setZoomSignatureUrl] = useState<string | null>(null);

    // Sync state with props on update (especially when actions occur)
    React.useEffect(() => {
        setStatusFilter(filters.status || '');
        setSearch(filters.search || '');
        setZoneId((filters.zone_id ?? '').toString());
        setAreaId((filters.area_id ?? '').toString());
        setBranchId((filters.branch_id ?? '').toString());
        setApproverId((filters.approver_id ?? '').toString());
        setDateFrom(filters.date_from || '');
        setDateTo(filters.date_to || '');
        setPerPage((filters.per_page ?? 100).toString());
    }, [filters]);

    const getActiveParams = (extra = {}) => {
        return {
            status: statusFilter || undefined,
            search: search || undefined,
            zone_id: zoneId || undefined,
            area_id: areaId || undefined,
            branch_id: branchId || undefined,
            approver_id: approverId || undefined,
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
            per_page: perPage || undefined,
            ...extra,
        };
    };

    const applyFilters = () => {
        router.get('/head-office/team-based-approvals', getActiveParams({ page: 1 }), { preserveState: true });
    };

    const handleStatusChange = (status: string) => {
        setStatusFilter(status);
        router.get('/head-office/team-based-approvals', getActiveParams({ status: status || undefined, page: 1 }), { preserveState: true });
    };

    const handleZoneChange = (zone: string) => {
        setZoneId(zone);
        setAreaId('');
        setBranchId('');
        router.get('/head-office/team-based-approvals', getActiveParams({ zone_id: zone || undefined, area_id: undefined, branch_id: undefined, page: 1 }), { preserveState: true });
    };

    const handleAreaChange = (area: string) => {
        setAreaId(area);
        setBranchId('');
        router.get('/head-office/team-based-approvals', getActiveParams({ area_id: area || undefined, branch_id: undefined, page: 1 }), { preserveState: true });
    };

    const handleBranchChange = (branch: string) => {
        setBranchId(branch);
        router.get('/head-office/team-based-approvals', getActiveParams({ branch_id: branch || undefined, page: 1 }), { preserveState: true });
    };

    const handleApproverChange = (approver: string) => {
        setApproverId(approver);
        router.get('/head-office/team-based-approvals', getActiveParams({ approver_id: approver || undefined, page: 1 }), { preserveState: true });
    };

    const handlePerPageChange = (newPerPage: string) => {
        setPerPage(newPerPage);
        router.get('/head-office/team-based-approvals', getActiveParams({ per_page: newPerPage || undefined, page: 1 }), { preserveState: true });
    };

    const filteredAreas = areas.filter((a) => !zoneId || a.zone_id.toString() === zoneId);
    const filteredBranches = branches.filter(
        (b) => (!zoneId || filteredAreas.some((a) => a.id === b.area_id)) && (!areaId || b.area_id.toString() === areaId)
    );

    const handlePageChange = (page: number) => {
        if (page < 1 || page > approvals.last_page) return;
        router.get('/head-office/team-based-approvals', getActiveParams({ page }), { preserveState: true });
    };

    const perPageNum = approvals.per_page ?? 100;
    const from = approvals.total === 0 ? 0 : (approvals.current_page - 1) * perPageNum + 1;
    const to = Math.min(approvals.current_page * perPageNum, approvals.total);

    const getPageNumbers = (): (number | 'ellipsis')[] => {
        const totalPages = approvals.last_page;
        const current = approvals.current_page;
        if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
        if (current <= 3) return [1, 2, 3, 4, 'ellipsis', totalPages];
        if (current >= totalPages - 2) return [1, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        return [1, 'ellipsis', current - 1, current, current + 1, 'ellipsis', totalPages];
    };

    // approvals.data is already flat and contains the items themselves
    const flatRows: (ItemRow & {
        sheet_id: number;
        sheet_date: string | null;
        branch_name?: string | null;
        branch_code?: string | null;
        area_name?: string | null;
        zone_name?: string | null;
        approver_name?: string | null;
        status: string;
    })[] = approvals.data.map((item: any) => ({
        ...item,
        branch_name: item.branch?.name,
        branch_code: item.branch?.code,
        area_name: item.branch?.area_name,
        zone_name: item.branch?.zone_name,
    }));

    const colVis = useMemo(() => {
        type R = (typeof flatRows)[number];
        const rows = flatRows;
        if (rows.length === 0) {
            return {
                sheet_date: true,
                branch: true,
                area: true,
                zone: true,
                member_code: true,
                member_phone: true,
                samity_number: true,
                proposed: true,
                approved: true,
                loan_type: true,
                project: true,
                comments: true,
                signature: true,
                approver: true,
            };
        }
        const anyFn = (fn: (r: R) => boolean) => rows.some(fn);
        return {
            sheet_date: anyFn((r) => r.sheet_date != null && String(r.sheet_date).trim().length > 0),
            branch: anyFn(
                (r) =>
                    (r.branch_name != null && String(r.branch_name).trim().length > 0) ||
                    (r.branch_code != null && String(r.branch_code).trim().length > 0),
            ),
            area: anyFn((r) => r.area_name != null && String(r.area_name).trim().length > 0),
            zone: anyFn((r) => r.zone_name != null && String(r.zone_name).trim().length > 0),
            member_code: anyFn((r) => rowHasValue(r, (x) => x.member_code)),
            member_phone: anyFn((r) => rowHasValue(r, (x) => x.member_phone)),
            samity_number: anyFn((r) => rowHasValue(r, (x) => x.samity_number)),
            proposed: anyFn((r) => r.proposed_loan_amount != null),
            approved: anyFn((r) => r.approved_amount != null),
            loan_type: anyFn((r) => rowHasValue(r, (x) => x.loan_type)),
            project: anyFn((r) => rowHasValue(r, (x) => x.project_name)),
            comments: anyFn((r) => r.review_comments != null && String(r.review_comments).trim().length > 0),
            approver: anyFn((r) => {
                const n =
                    (r.approvers && r.approvers.length > 0
                        ? r.approvers.map((a) => a.approver_name).filter(Boolean).join(', ')
                        : null) ?? r.approver_name;
                return n != null && String(n).trim().length > 0;
            }),
            signature: anyFn((r) => {
                if (r.approver_signature != null && String(r.approver_signature).trim().length > 0) return true;
                if (r.approvers?.some((a) => a.approver_signature && String(a.approver_signature).trim().length > 0))
                    return true;
                if (r.decided_at != null && String(r.decided_at).trim().length > 0) return true;
                if (r.approvers?.some((a) => a.decided_at != null && String(a.decided_at).trim().length > 0)) return true;
                return false;
            }),
        };
    }, [flatRows]);

    const visibleDataColCount =
        1 +
        (colVis.sheet_date ? 1 : 0) +
        (colVis.branch ? 1 : 0) +
        (colVis.area ? 1 : 0) +
        (colVis.zone ? 1 : 0) +
        1 +
        (colVis.member_code ? 1 : 0) +
        (colVis.member_phone ? 1 : 0) +
        (colVis.samity_number ? 1 : 0) +
        (colVis.proposed ? 1 : 0) +
        (colVis.approved ? 1 : 0) +
        (colVis.loan_type ? 1 : 0) +
        (colVis.project ? 1 : 0) +
        (colVis.comments ? 1 : 0) +
        (colVis.signature ? 1 : 0) +
        1 +
        (colVis.approver ? 1 : 0) +
        1;

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
        router.delete(`/head-office/team-based-approvals/items/${itemId}`, {
            data: getActiveParams({ page: approvals.current_page }),
            preserveState: true,
            preserveScroll: true,
        });
    };

    return (
        <AdminLayout>
            <Head title="Head Office - Team Based Approvals">
                <style>{`
                    .approval-index-table-wrapper table { table-layout: auto; width: max(100%, max-content); }
                    .approval-index-table-wrapper th {
                        font-size: 10px;
                        font-weight: 600;
                        color: #1e3a8a;
                        background: linear-gradient(to right, #eff6ff, #f8fafc) !important;
                        border-bottom: 1px solid #bfdbfe !important;
                        padding: 10px 8px !important;
                        white-space: normal;
                    }
                    .approval-index-table-wrapper td {
                        font-size: 10px;
                        line-height: 1.35;
                        padding: 8px 6px !important;
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
                        .ho-teambased-filters { display: none !important; }
                    }
                `}</style>
            </Head>

            <div className="mx-auto py-6 px-4 space-y-4 approval-index-print-page print:py-0 print:px-0 print:!m-0 print:max-w-none">
                {/* Print-style header similar to branch ApprovalIndex */}
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
                            <span className="font-semibold">শাখার নাম:</span> {headerBranchName}
                        </span>
                        <span>
                            <span className="font-semibold">অঞ্চলের নাম:</span> {headerAreaName}
                        </span>
                        <span>
                            <span className="font-semibold">জোনের নাম:</span> {headerZoneName}
                        </span>
                        <span>
                            <span className="font-semibold">তারিখ:</span> {formatDate(dateTo || dateFrom, '-')}
                        </span>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 ho-teambased-stats print:hidden">
                    {[
                        { label: 'Total Members', value: stats.total, color: 'text-blue-600', bg: 'bg-blue-50/40 border-blue-100/70' },
                        { label: 'Draft', value: stats.draft, color: 'text-slate-600', bg: 'bg-slate-50/50 border-slate-100/70' },
                        { label: 'Pending', value: stats.pending, color: 'text-amber-600', bg: 'bg-amber-50/40 border-amber-100/70' },
                        { label: 'Approved', value: stats.approved, color: 'text-green-600', bg: 'bg-green-50/40 border-green-100/70' },
                        { label: 'Rejected', value: stats.rejected, color: 'text-rose-600', bg: 'bg-rose-50/40 border-rose-100/70' },
                    ].map((stat, i) => (
                        <div key={i} className={`p-4 rounded-xl border bg-white shadow-sm flex flex-col justify-between transition-all hover:shadow-md ${stat.bg}`}>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{stat.label}</span>
                            <span className={`text-2xl font-extrabold mt-1 leading-none ${stat.color}`}>{stat.value}</span>
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <div className="bg-slate-50/50 border border-slate-200/80 rounded-2xl p-4 space-y-4 ho-teambased-filters print:hidden shadow-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Search Member</span>
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') applyFilters(); }}
                                placeholder="Name / code / project"
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 transition-all placeholder:text-slate-400 text-slate-800"
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</span>
                            <select
                                value={statusFilter}
                                onChange={(e) => handleStatusChange(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 transition-all text-slate-800"
                            >
                                <option value="">All Statuses</option>
                                <option value="draft">Draft</option>
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </div>

                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Zone</span>
                            <select
                                value={zoneId}
                                onChange={(e) => handleZoneChange(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 transition-all text-slate-800"
                            >
                                <option value="">All Zones</option>
                                {zones.map((z) => (
                                    <option key={z.id} value={z.id}>{z.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Area</span>
                            <select
                                value={areaId}
                                onChange={(e) => handleAreaChange(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 transition-all text-slate-800"
                            >
                                <option value="">All Areas</option>
                                {areas
                                    .filter((a) => !zoneId || a.zone_id.toString() === zoneId)
                                    .map((a) => (
                                        <option key={a.id} value={a.id}>{a.name}</option>
                                    ))}
                            </select>
                        </div>

                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Branch</span>
                            <select
                                value={branchId}
                                onChange={(e) => handleBranchChange(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 transition-all text-slate-800"
                            >
                                <option value="">All Branches</option>
                                {branches
                                    .filter((b) => !areaId || b.area_id.toString() === areaId)
                                    .map((b) => (
                                        <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                                    ))}
                            </select>
                        </div>

                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Approver</span>
                            <select
                                value={approverId}
                                onChange={(e) => handleApproverChange(e.target.value)}
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
                    </div>

                    <div className="flex flex-wrap items-end justify-between gap-4 pt-1 border-t border-slate-200/50">
                        <div className="flex flex-wrap gap-3 items-center">
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">From Date</span>
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 transition-all text-slate-800"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">To Date</span>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 transition-all text-slate-800"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Per Page</span>
                                <select
                                    value={perPage}
                                    onChange={(e) => handlePerPageChange(e.target.value)}
                                    className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 transition-all text-slate-800"
                                >
                                    <option value="20">20</option>
                                    <option value="50">50</option>
                                    <option value="100">100</option>
                                    <option value="200">200</option>
                                    <option value="500">500</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={applyFilters}
                                className="px-5 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 shadow-sm hover:shadow active:scale-[0.98] transition-all"
                            >
                                Apply Filters
                            </button>
                            <button
                                type="button"
                                onClick={handlePrint}
                                className="px-5 py-2 rounded-lg bg-slate-800 text-white text-xs font-medium hover:bg-slate-900 shadow-sm hover:shadow active:scale-[0.98] transition-all"
                            >
                                Print List
                            </button>
                        </div>
                    </div>
                </div>

                {/* Table - flat list of all items (same behavior as branch ApprovalIndex) */}
                <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 approval-index-table-wrapper w-full print:bg-transparent print:shadow-none print:border-0 print:rounded-none">
                    <table className="w-full border-collapse">
                        <thead className="bg-gray-50 print:bg-transparent">
                            <tr>
                                <th className="border approval-col-serial">ক্র.</th>
                                {colVis.sheet_date && <th className="border">তারিখ</th>}
                                {colVis.branch && <th className="border">শাখা</th>}
                                {colVis.area && <th className="border">অঞ্চল</th>}
                                {colVis.zone && <th className="border">জোন</th>}
                                <th className="border">সদস্যের নাম</th>
                                {colVis.member_code && <th className="border">সদস্য নম্বর</th>}
                                {colVis.member_phone && <th className="border">ফোন নম্বর</th>}
                                {colVis.samity_number && <th className="border">সমিতি নম্বর</th>}
                                {colVis.proposed && <th className="border">প্রস্তাবিত ঋণ</th>}
                                {colVis.approved && <th className="border">অনুমোদিত ঋণ</th>}
                                {colVis.loan_type && <th className="border">ঋণের ধরন</th>}
                                {colVis.project && <th className="border">প্রকল্পের নাম</th>}
                                {colVis.comments && (
                                    <th className="border approval-col-comment">মন্তব্য</th>
                                )}
                                {colVis.signature && (
                                    <th className="border">অনুমোদনকারীর স্বাক্ষর / তারিখ</th>
                                )}
                                <th className="border">অবস্থা</th>
                                {colVis.approver && <th className="border">অনুমোদনকারী</th>}
                                <th className="border print:hidden">কর্ম</th>
                            </tr>
                        </thead>
                        <tbody>
                            {flatRows.length === 0 && (
                                <tr>
                                    <td colSpan={visibleDataColCount} className="border px-2 py-3 text-center text-gray-500">
                                        No Team Based items found for this filter.
                                    </td>
                                </tr>
                            )}
                            {flatRows.map((row, index) => (
                                <tr
                                    key={`${row.sheet_id}-${row.serial_no}-${index}`}
                                    className="hover:bg-slate-50/50 print:hover:bg-transparent transition-colors"
                                >
                                    <td className="border approval-col-serial">{index + 1}</td>
                                    {colVis.sheet_date && (
                                        <td className="border text-left whitespace-nowrap">{formatDate(row.sheet_date)}</td>
                                    )}
                                    {colVis.branch && (
                                        <td className="border text-left max-w-[10rem]">
                                            {row.branch_name} {row.branch_code ? `(${row.branch_code})` : ''}
                                        </td>
                                    )}
                                    {colVis.area && (
                                        <td className="border text-left max-w-[8rem]">{row.area_name || '-'}</td>
                                    )}
                                    {colVis.zone && (
                                        <td className="border text-left max-w-[8rem]">{row.zone_name || '-'}</td>
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
                                    {colVis.proposed && (
                                        <td className="border whitespace-nowrap font-semibold text-slate-900">{formatAmount(row.proposed_loan_amount)}</td>
                                    )}
                                    {colVis.approved && (
                                        <td className="border whitespace-nowrap font-semibold text-blue-700">{formatAmount(row.approved_amount)}</td>
                                    )}
                                    {colVis.loan_type && (
                                        <td className="border text-left max-w-[8rem]">{row.loan_type || ''}</td>
                                    )}
                                    {colVis.project && (
                                        <td className="border text-left max-w-[12rem]">{row.project_name || ''}</td>
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
                                                    className="flex flex-col items-center gap-0.5 py-0.5 border-b border-gray-100 last:border-0"
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
                                                                    className="h-6 max-h-6 object-contain print:!h-6 print:!max-h-6"
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
                                    <td className="border px-2 py-1">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider border ${statusClass[row.status] || 'bg-slate-100 text-slate-800 border-slate-200'}`}>
                                            {statusLabel[row.status] || row.status}
                                        </span>
                                    </td>
                                    {colVis.approver && (
                                        <td className="border text-left max-w-[10rem]">
                                            {row.approvers && row.approvers.length > 0
                                                ? row.approvers.map((a) => a.approver_name).filter(Boolean).join(', ')
                                                : row.approver_name || '-'}
                                        </td>
                                    )}
                                    <td className="border print:hidden">
                                        <div className="flex items-center justify-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => handleEditItem(row.id)}
                                                className="inline-flex items-center justify-center px-2 py-1 text-[10px] font-medium rounded-md border border-blue-200 text-blue-600 bg-blue-50/30 hover:bg-blue-600 hover:text-white transition-all shadow-sm hover:shadow"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteItem(row.id)}
                                                className="inline-flex items-center justify-center px-2 py-1 text-[10px] font-medium rounded-md border border-red-200 text-red-600 bg-red-50/30 hover:bg-red-600 hover:text-white transition-all shadow-sm hover:shadow"
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

                {/* Pagination - professional with page numbers */}
                {approvals.last_page > 1 && (
                    <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border border-slate-200 bg-slate-50/30 rounded-2xl print:hidden">
                        <p className="text-xs text-slate-600 order-2 sm:order-1 font-medium">
                            {approvals.total > 0 ? (
                                <>Showing <span className="text-slate-900 font-semibold">{from}</span> to <span className="text-slate-900 font-semibold">{to}</span> of <span className="text-slate-900 font-semibold">{approvals.total}</span> members</>
                            ) : (
                                <>No results</>
                            )}
                        </p>
                        <nav className="flex items-center gap-2 order-1 sm:order-2" aria-label="Pagination">
                            <button
                                type="button"
                                onClick={() => handlePageChange(approvals.current_page - 1)}
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
                                            onClick={() => handlePageChange(p)}
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
                                onClick={() => handlePageChange(approvals.current_page + 1)}
                                disabled={approvals.current_page >= approvals.last_page}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                            >
                                Next
                            </button>
                        </nav>
                    </div>
                )}
                {approvals.last_page <= 1 && approvals.total > 0 && (
                    <p className="text-xs text-slate-500 mt-2 font-medium">এই পাতায় {flatRows.length}টি আইটেম</p>
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

