import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { formatDate } from '@/utils/dateUtils';
import { BarChart3, Calendar, ChevronDown, ChevronRight, ClipboardCheck } from 'lucide-react';

interface Zone {
    id: number;
    name: string;
}

interface UserRow {
    user_id: number;
    user_name: string;
    role_name: string | null;
    pending: number;
    waiting: number;
    approved: number;
    forwarded: number;
    rejected: number;
    total: number;
}

interface ZoneReport {
    zone_id: number;
    zone_name: string;
    pending: number;
    waiting: number;
    approved: number;
    forwarded: number;
    rejected: number;
    total: number;
    users: UserRow[];
}

interface GrandTotals {
    pending: number;
    waiting: number;
    approved: number;
    forwarded: number;
    rejected: number;
    total: number;
}

interface Props {
    zoneReports: ZoneReport[];
    grandTotals: GrandTotals;
    filters: {
        zone_id?: number | string;
        date_from?: string;
        date_to?: string;
    };
    zones: Zone[];
}

export default function TeamBasedApprovalReport({ zoneReports, grandTotals, filters, zones }: Props) {
    const { auth } = usePage<{ auth: { user: { role?: { name?: string }; has_all_access?: boolean } } }>().props;
    const roleName = auth?.user?.role?.name || '';
    const isEdUser = roleName === 'ed';
    const approvalsListHref = isEdUser ? '/team-based-approvals/for-approver' : '/head-office/team-based-approvals';
    const approvalsListLabel = isEdUser ? 'My Approvals' : 'Approvals List';
    const [zoneId, setZoneId] = useState((filters.zone_id ?? '').toString());
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');
    const [expandedZones, setExpandedZones] = useState<Record<number, boolean>>(() => {
        const initial: Record<number, boolean> = {};
        zoneReports.forEach((z) => {
            if (z.total > 0) {
                initial[z.zone_id] = true;
            }
        });
        return initial;
    });

    const applyFilters = () => {
        router.get(
            '/head-office/team-based-approvals/report',
            {
                zone_id: zoneId || undefined,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
            },
            { preserveState: true },
        );
    };

    const clearFilters = () => {
        setZoneId('');
        setDateFrom('');
        setDateTo('');
        router.get('/head-office/team-based-approvals/report', {}, { preserveState: true });
    };

    const toggleZone = (id: number) => {
        setExpandedZones((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const selectedZoneName = zones.find((z) => z.id.toString() === zoneId)?.name;
    const filterSummaryParts: string[] = [];
    if (selectedZoneName) filterSummaryParts.push(`জোন: ${selectedZoneName}`);
    if (dateFrom) filterSummaryParts.push(`তারিখ থেকে: ${formatDate(dateFrom)}`);
    if (dateTo) filterSummaryParts.push(`তারিখ পর্যন্ত: ${formatDate(dateTo)}`);
    const filterSummary = filterSummaryParts.length > 0 ? filterSummaryParts.join(' | ') : 'সব জোন, সব তারিখ';

    const handlePrint = () => {
        if (typeof window !== 'undefined') {
            window.print();
        }
    };

    return (
        <AdminLayout>
            <Head title="Head Office - Team Based Approval Report">
                <style>{`
                    @page {
                        size: A4 portrait;
                        margin: 8mm 10mm;
                    }
                    @media print {
                        html, body {
                            margin: 0 !important;
                            padding: 0 !important;
                            background: #fff !important;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                        .no-print { display: none !important; }
                        .tba-report-print-root {
                            padding: 0 !important;
                            margin: 0 !important;
                            max-width: 100% !important;
                            width: 100% !important;
                            font-size: 8pt !important;
                            line-height: 1.25 !important;
                            color: #111 !important;
                        }
                        .tba-report-print-root * {
                            box-shadow: none !important;
                        }
                        .tba-report-print-header h1 {
                            font-size: 11pt !important;
                            margin: 0 0 2px !important;
                        }
                        .tba-report-print-header p {
                            font-size: 7.5pt !important;
                            margin: 0 !important;
                        }
                        .tba-report-print-meta {
                            font-size: 7pt !important;
                            margin-bottom: 6px !important;
                            padding-bottom: 4px !important;
                            border-bottom: 1px solid #ccc !important;
                        }
                        .tba-report-stats {
                            display: grid !important;
                            grid-template-columns: repeat(5, 1fr) !important;
                            gap: 4px !important;
                            margin-bottom: 8px !important;
                        }
                        .tba-report-stat-card {
                            padding: 4px 6px !important;
                            border-radius: 3px !important;
                        }
                        .tba-report-stat-card p:first-child {
                            font-size: 6pt !important;
                            margin: 0 !important;
                        }
                        .tba-report-stat-card p:last-child {
                            font-size: 10pt !important;
                            margin: 1px 0 0 !important;
                            font-weight: 700 !important;
                        }
                        .tba-report-zone-block {
                            margin-bottom: 6px !important;
                            border: 1px solid #ddd !important;
                            border-radius: 0 !important;
                            page-break-inside: auto;
                        }
                        .tba-report-zone-head {
                            padding: 4px 6px !important;
                            background: #f3f4f6 !important;
                            border-bottom: 1px solid #ddd !important;
                            display: flex !important;
                            justify-content: space-between !important;
                            align-items: center !important;
                            gap: 6px !important;
                            page-break-after: avoid;
                            break-after: avoid;
                        }
                        .tba-report-zone-head .zone-title {
                            font-size: 8.5pt !important;
                            font-weight: 600 !important;
                        }
                        .tba-report-zone-counts {
                            gap: 3px !important;
                            font-size: 6.5pt !important;
                        }
                        .tba-report-zone-counts span {
                            padding: 1px 4px !important;
                            border-radius: 2px !important;
                        }
                        .tba-report-table-wrap {
                            overflow: visible !important;
                            padding: 0 !important;
                        }
                        .tba-report-table {
                            width: 100% !important;
                            table-layout: fixed !important;
                            font-size: 7pt !important;
                            border-collapse: collapse !important;
                            page-break-inside: auto;
                        }
                        .tba-report-table thead {
                            display: table-header-group;
                        }
                        .tba-report-table tr {
                            page-break-inside: avoid;
                            break-inside: avoid;
                        }
                        .tba-report-table th,
                        .tba-report-table td {
                            padding: 2px 3px !important;
                            font-size: 7pt !important;
                            line-height: 1.2 !important;
                            border: 1px solid #ddd !important;
                            vertical-align: middle !important;
                            word-wrap: break-word !important;
                            overflow-wrap: break-word !important;
                        }
                        .tba-report-table th {
                            background: #f3f4f6 !important;
                            font-weight: 600 !important;
                            text-align: center !important;
                        }
                        .tba-report-table th:nth-child(1),
                        .tba-report-table th:nth-child(2),
                        .tba-report-table td:nth-child(1),
                        .tba-report-table td:nth-child(2) {
                            text-align: left !important;
                        }
                        .tba-report-table th:nth-child(1) { width: 28%; }
                        .tba-report-table th:nth-child(2) { width: 18%; }
                        .tba-report-table th:nth-child(n+3) { width: 9%; }
                        .tba-report-table tfoot td {
                            background: #f9fafb !important;
                            font-weight: 600 !important;
                        }
                        .tba-report-count-badge {
                            font-size: 7pt !important;
                            padding: 0 3px !important;
                            min-width: auto !important;
                            border-radius: 2px !important;
                        }
                        .tba-report-section-title {
                            font-size: 8.5pt !important;
                            padding: 4px 6px !important;
                            margin: 0 !important;
                        }
                        .tba-report-main-card {
                            border: none !important;
                            box-shadow: none !important;
                            overflow: visible !important;
                        }
                    }
                `}</style>
            </Head>

            <div className="tba-report-print-root p-6 space-y-6 print:p-0 print:space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-4 print:mb-1">
                    <div className="flex items-center gap-3 tba-report-print-header">
                        <BarChart3 className="w-8 h-8 text-blue-600 no-print" />
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 print:text-base">Team Based Approval Report</h1>
                            <p className="text-sm text-gray-600 print:text-xs">
                                জোন অনুযায়ী ও ব্যবহারকারী অনুযায়ী Pending / Approved সংখ্যা
                                {!isEdUser && ' (Head Office / SuperAdmin / ED)'}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 no-print">
                        <Link
                            href={approvalsListHref}
                            className="px-4 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                        >
                            {approvalsListLabel}
                        </Link>
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-900"
                        >
                            Print
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow border p-4 no-print">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Zone (জোন)</label>
                            <select
                                value={zoneId}
                                onChange={(e) => setZoneId(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">সব জোন</option>
                                {zones.map((z) => (
                                    <option key={z.id} value={z.id}>
                                        {z.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Calendar className="w-4 h-4 inline mr-1" />
                                তারিখ থেকে
                            </label>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Calendar className="w-4 h-4 inline mr-1" />
                                তারিখ পর্যন্ত
                            </label>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="flex items-end gap-2">
                            <button
                                type="button"
                                onClick={applyFilters}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                Filter
                            </button>
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                </div>

                <div className="hidden print:block tba-report-print-meta text-xs text-gray-600">
                    <span className="font-semibold">ফিল্টার:</span> {filterSummary}
                    <span className="mx-2">|</span>
                    <span className="font-semibold">মোট রেকর্ড:</span> {grandTotals.total}
                </div>

                <div className="tba-report-stats grid grid-cols-2 md:grid-cols-6 gap-4 print:gap-1">
                    <StatCard label="Pending" value={grandTotals.pending} color="yellow" />
                    <StatCard label="Waiting" value={grandTotals.waiting} color="orange" />
                    <StatCard label="Approved" value={grandTotals.approved} color="green" />
                    <StatCard label="Forwarded" value={grandTotals.forwarded} color="blue" />
                    <StatCard label="Rejected" value={grandTotals.rejected} color="red" />
                    <StatCard label="Total" value={grandTotals.total} color="gray" />
                </div>

                <div className="tba-report-main-card bg-white rounded-lg shadow border overflow-hidden">
                    <div className="px-4 py-3 border-b bg-gray-50 flex items-center gap-2 print:py-1 print:px-2">
                        <ClipboardCheck className="w-5 h-5 text-blue-600 no-print" />
                        <h2 className="tba-report-section-title font-semibold text-gray-900">জোন ভিত্তিক সারাংশ</h2>
                    </div>

                    {zoneReports.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">কোনো ডেটা পাওয়া যায়নি</div>
                    ) : (
                        <div className="divide-y">
                            {zoneReports.map((zone) => (
                                <div key={zone.zone_id} className="tba-report-zone-block">
                                    <button
                                        type="button"
                                        onClick={() => toggleZone(zone.zone_id)}
                                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 text-left no-print"
                                    >
                                        <div className="flex items-center gap-2">
                                            {expandedZones[zone.zone_id] ? (
                                                <ChevronDown className="w-4 h-4 text-gray-500" />
                                            ) : (
                                                <ChevronRight className="w-4 h-4 text-gray-500" />
                                            )}
                                            <span className="font-medium text-gray-900">{zone.zone_name}</span>
                                        </div>
                                        <ZoneCounts zone={zone} />
                                    </button>

                                    <div className="hidden print:flex tba-report-zone-head">
                                        <span className="zone-title">{zone.zone_name}</span>
                                        <ZoneCounts zone={zone} />
                                    </div>

                                    <div
                                        className={`px-4 pb-4 print:px-0 print:pb-0 ${expandedZones[zone.zone_id] ? '' : 'hidden print:block'}`}
                                    >
                                            <div className="tba-report-table-wrap overflow-x-auto">
                                                <table className="tba-report-table min-w-full text-sm">
                                                    <thead>
                                                        <tr className="bg-gray-100 text-gray-700">
                                                            <th className="px-3 py-2 text-left">ব্যবহারকারী</th>
                                                            <th className="px-3 py-2 text-left">ভূমিকা</th>
                                                            <th className="px-3 py-2 text-center">Pending</th>
                                                            <th className="px-3 py-2 text-center">Waiting</th>
                                                            <th className="px-3 py-2 text-center">Approved</th>
                                                            <th className="px-3 py-2 text-center">Forwarded</th>
                                                            <th className="px-3 py-2 text-center">Rejected</th>
                                                            <th className="px-3 py-2 text-center">মোট</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {zone.users.length === 0 ? (
                                                            <tr>
                                                                <td colSpan={8} className="px-3 py-4 text-center text-gray-500">
                                                                    এই জোনে কোনো রিভিউ নেই
                                                                </td>
                                                            </tr>
                                                        ) : (
                                                            zone.users.map((user) => (
                                                                <tr key={user.user_id} className="border-t">
                                                                    <td className="px-3 py-2">{user.user_name}</td>
                                                                    <td className="px-3 py-2 text-gray-600">{user.role_name || '-'}</td>
                                                                    <td className="px-3 py-2 text-center">
                                                                        <CountBadge value={user.pending} tone="yellow" />
                                                                    </td>
                                                                    <td className="px-3 py-2 text-center">
                                                                        <CountBadge value={user.waiting} tone="orange" />
                                                                    </td>
                                                                    <td className="px-3 py-2 text-center">
                                                                        <CountBadge value={user.approved} tone="green" />
                                                                    </td>
                                                                    <td className="px-3 py-2 text-center">
                                                                        <CountBadge value={user.forwarded} tone="blue" />
                                                                    </td>
                                                                    <td className="px-3 py-2 text-center">
                                                                        <CountBadge value={user.rejected} tone="red" />
                                                                    </td>
                                                                    <td className="px-3 py-2 text-center font-medium">{user.total}</td>
                                                                </tr>
                                                            ))
                                                        )}
                                                    </tbody>
                                                    {zone.users.length > 0 && (
                                                        <tfoot>
                                                            <tr className="bg-gray-50 font-medium border-t">
                                                                <td className="px-3 py-2" colSpan={2}>
                                                                    জোন মোট
                                                                </td>
                                                                <td className="px-3 py-2 text-center">{zone.pending}</td>
                                                                <td className="px-3 py-2 text-center">{zone.waiting}</td>
                                                                <td className="px-3 py-2 text-center">{zone.approved}</td>
                                                                <td className="px-3 py-2 text-center">{zone.forwarded}</td>
                                                                <td className="px-3 py-2 text-center">{zone.rejected}</td>
                                                                <td className="px-3 py-2 text-center">{zone.total}</td>
                                                            </tr>
                                                        </tfoot>
                                                    )}
                                                </table>
                                            </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}

function StatCard({ label, value, color }: { label: string; value: number; color: 'yellow' | 'green' | 'blue' | 'red' | 'gray' | 'orange' }) {
    const colors = {
        yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
        orange: 'bg-orange-50 border-orange-200 text-orange-800',
        green: 'bg-green-50 border-green-200 text-green-800',
        blue: 'bg-blue-50 border-blue-200 text-blue-800',
        red: 'bg-red-50 border-red-200 text-red-800',
        gray: 'bg-gray-50 border-gray-200 text-gray-800',
    };

    return (
        <div className={`tba-report-stat-card rounded-lg border p-4 ${colors[color]}`}>
            <p className="text-xs uppercase tracking-wide opacity-80">{label}</p>
            <p className="text-2xl font-bold mt-1 print:text-base">{value}</p>
        </div>
    );
}

function ZoneCounts({ zone }: { zone: ZoneReport }) {
    return (
        <div className="tba-report-zone-counts flex flex-wrap gap-2 text-xs">
            <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-800">Pending: {zone.pending}</span>
            <span className="px-2 py-1 rounded bg-orange-100 text-orange-800">Waiting: {zone.waiting}</span>
            <span className="px-2 py-1 rounded bg-green-100 text-green-800">Approved: {zone.approved}</span>
            <span className="px-2 py-1 rounded bg-blue-100 text-blue-800">Forwarded: {zone.forwarded}</span>
            <span className="px-2 py-1 rounded bg-red-100 text-red-800">Rejected: {zone.rejected}</span>
            <span className="px-2 py-1 rounded bg-gray-100 text-gray-800">মোট: {zone.total}</span>
        </div>
    );
}

function CountBadge({ value, tone }: { value: number; tone: 'yellow' | 'green' | 'blue' | 'red' | 'orange' }) {
    if (value === 0) {
        return <span className="text-gray-400">0</span>;
    }

    const tones = {
        yellow: 'bg-yellow-100 text-yellow-800',
        orange: 'bg-orange-100 text-orange-800',
        green: 'bg-green-100 text-green-800',
        blue: 'bg-blue-100 text-blue-800',
        red: 'bg-red-100 text-red-800',
    };

    return <span className={`tba-report-count-badge inline-block min-w-[1.5rem] px-2 py-0.5 rounded ${tones[tone]}`}>{value}</span>;
}
