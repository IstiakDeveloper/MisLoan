import { Head } from '@inertiajs/react';
import { useEffect } from 'react';
import { formatDate, formatDateTime } from '@/utils/dateUtils';

interface Column {
    key: string;
    code: string;
    label: string;
}

interface Counts {
    total: number;
    [key: string]: number;
}

interface ReportRow extends Counts {
    serial: number;
    branch_id: number;
    branch_name: string;
    branch_code?: string | null;
    area_name: string;
    zone_name: string;
}

interface OrgOption {
    id: number | string;
    name: string;
    code?: string | null;
    zone_id?: number | string | null;
    area_id?: number | string | null;
}

interface Filters {
    date_from: string;
    date_to: string;
    zone_id: string;
    area_id: string;
    branch_id: string;
}

interface Props {
    rows: ReportRow[];
    totals: Counts;
    columns: Column[];
    filters: Filters;
    zones: OrgOption[];
    areas: OrgOption[];
    branches: OrgOption[];
    printed_at: string;
}

export default function BranchLoanPendingPrint({
    rows,
    totals,
    columns,
    filters,
    zones,
    areas,
    branches,
    printed_at,
}: Props) {
    useEffect(() => {
        const timer = setTimeout(() => {
            window.print();
        }, 500);

        return () => clearTimeout(timer);
    }, []);

    const zoneName = filters.zone_id
        ? zones.find((zone) => String(zone.id) === filters.zone_id)?.name || 'সকল জোন'
        : 'সকল জোন';
    const areaName = filters.area_id
        ? areas.find((area) => String(area.id) === filters.area_id)?.name || 'সকল অঞ্চল'
        : 'সকল অঞ্চল';
    const selectedBranch = filters.branch_id
        ? branches.find((branch) => String(branch.id) === filters.branch_id)
        : null;
    const branchName = selectedBranch
        ? `${selectedBranch.name}${selectedBranch.code ? ` (${selectedBranch.code})` : ''}`
        : 'সকল শাখা';
    const reportDate =
        filters.date_from && filters.date_to
            ? filters.date_from === filters.date_to
                ? formatDate(filters.date_from)
                : `${formatDate(filters.date_from)} - ${formatDate(filters.date_to)}`
            : formatDate(new Date());

    return (
        <div className="print-container">
            <Head title="শাখাভিত্তিক পেন্ডিং ঋণ রিপোর্ট - প্রিন্ট" />

            <style>{`
                @page {
                    size: A4 landscape;
                    margin: 8mm 7mm;
                }

                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }

                body {
                    font-family: 'SolaimanLipi', 'Kalpurush', 'Calibri', 'Arial', sans-serif;
                    font-size: 9px;
                    line-height: 1.3;
                    color: #000;
                    background: #fff;
                    print-color-adjust: exact;
                    -webkit-print-color-adjust: exact;
                }

                .no-print {
                    display: block;
                }

                @media print {
                    .no-print {
                        display: none !important;
                    }
                }

                .print-header {
                    text-align: center;
                    margin-bottom: 6px;
                }

                .print-header .org {
                    font-size: 16px;
                    font-weight: bold;
                }

                .print-header .address {
                    font-size: 10px;
                    margin-bottom: 2px;
                }

                .print-header .title {
                    font-size: 13px;
                    font-weight: bold;
                    text-decoration: underline;
                    margin-top: 2px;
                }

                .header-meta-table {
                    width: 100%;
                    margin-top: 4px;
                    border-collapse: collapse;
                    font-size: 10px;
                }

                .header-meta-table td {
                    border: none;
                    padding: 1px 4px;
                }

                .meta-left { text-align: left; width: 33%; }
                .meta-center { text-align: center; width: 34%; }
                .meta-right { text-align: right; width: 33%; }

                table.main-report-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 4px;
                }

                table.main-report-table thead {
                    display: table-header-group;
                }

                table.main-report-table th,
                table.main-report-table td {
                    border: 0.6px solid #222;
                    padding: 3px 2px;
                    vertical-align: middle;
                    word-wrap: break-word;
                }

                table.main-report-table th {
                    background: #e5e7eb !important;
                    font-size: 8px;
                    text-align: center;
                }

                table.main-report-table td {
                    font-size: 8px;
                    text-align: center;
                }

                table.main-report-table td.name {
                    text-align: left;
                    padding-left: 4px;
                }

                table.main-report-table tr.total td {
                    font-weight: bold;
                    background: #f3f4f6 !important;
                }

                .legend {
                    margin-top: 6px;
                    font-size: 8px;
                    line-height: 1.45;
                }

                .legend strong {
                    font-weight: bold;
                }

                .print-footer {
                    margin-top: 8px;
                    display: flex;
                    justify-content: space-between;
                    font-size: 8px;
                }
            `}</style>

            <div className="no-print mb-3 flex items-center justify-between rounded-lg border border-slate-300 bg-slate-100 p-3">
                <div className="text-xs font-bold text-slate-800">শাখাভিত্তিক পেন্ডিং ঋণ রিপোর্ট</div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="rounded bg-blue-600 px-3 py-1 text-xs font-bold text-white hover:bg-blue-700"
                    >
                        প্রিন্ট করুন
                    </button>
                    <button
                        type="button"
                        onClick={() => window.close()}
                        className="rounded bg-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-400"
                    >
                        বন্ধ করুন
                    </button>
                </div>
            </div>

            <div className="print-header">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', minHeight: '48px' }}>
                    <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)' }}>
                        <img
                            src="/logo.png"
                            alt="মৌসুমী"
                            style={{ height: '42px', width: 'auto', objectFit: 'contain' }}
                            onError={(event) => {
                                (event.target as HTMLImageElement).style.display = 'none';
                            }}
                        />
                    </div>
                    <div>
                        <p className="org">মৌসুমী</p>
                        <p className="address">উকিলপাড়া, নওগাঁ।</p>
                        <p className="title">শাখাভিত্তিক পেন্ডিং ঋণ রিপোর্ট</p>
                    </div>
                </div>
                <table className="header-meta-table">
                    <tbody>
                        <tr>
                            <td className="meta-left">জোন: <strong>{zoneName}</strong></td>
                            <td className="meta-center">তারিখ: <strong>{reportDate}</strong></td>
                            <td className="meta-right">অঞ্চল: <strong>{areaName}</strong></td>
                        </tr>
                        <tr>
                            <td className="meta-left">শাখা: <strong>{branchName}</strong></td>
                            <td className="meta-center">শাখা সংখ্যা: <strong>{rows.length}</strong></td>
                            <td className="meta-right">মোট পেন্ডিং: <strong>{totals.total}</strong></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <table className="main-report-table">
                <thead>
                    <tr>
                        <th style={{ width: '3%' }}>ক্রঃ</th>
                        <th style={{ width: '9%' }}>জোন</th>
                        <th style={{ width: '9%' }}>অঞ্চল</th>
                        <th style={{ width: '16%' }}>শাখা</th>
                        {columns.map((column) => (
                            <th key={column.key} title={column.label}>
                                {column.code}
                            </th>
                        ))}
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length + 5}>কোনো শাখা পাওয়া যায়নি।</td>
                        </tr>
                    ) : (
                        rows.map((row) => (
                            <tr key={row.branch_id}>
                                <td>{row.serial}</td>
                                <td className="name">{row.zone_name || '—'}</td>
                                <td className="name">{row.area_name || '—'}</td>
                                <td className="name">
                                    {row.branch_name}
                                    {row.branch_code ? ` (${row.branch_code})` : ''}
                                </td>
                                {columns.map((column) => (
                                    <td key={column.key}>{row[column.key] ?? 0}</td>
                                ))}
                                <td>{row.total}</td>
                            </tr>
                        ))
                    )}
                    {rows.length > 0 && (
                        <tr className="total">
                            <td colSpan={4} style={{ textAlign: 'right', paddingRight: '6px' }}>
                                মোট
                            </td>
                            {columns.map((column) => (
                                <td key={column.key}>{totals[column.key] ?? 0}</td>
                            ))}
                            <td>{totals.total}</td>
                        </tr>
                    )}
                </tbody>
            </table>

            <p className="legend">
                {columns.map((column, index) => (
                    <span key={column.key}>
                        {index > 0 ? '  |  ' : ''}
                        <strong>{column.code}</strong> = {column.label}
                    </span>
                ))}
            </p>
            <div className="print-footer">
                <span>প্রিন্ট: {formatDateTime(printed_at)}</span>
                <span>একটি ঋণ একটি কলামে। Total = কলামের যোগফল।</span>
            </div>
        </div>
    );
}
