import { Head } from '@inertiajs/react';
import { useEffect } from 'react';
import { formatDate } from '@/utils/dateUtils';

interface Zone {
    id: number | string;
    name: string;
}

interface Area {
    id: number | string;
    name: string;
    zone_id?: number | string;
}

interface Branch {
    id: number | string;
    name: string;
    code?: string;
    area_id?: number | string;
}

interface Guarantor {
    name: string;
    mobile: string;
    relation?: string;
    nid?: string;
    source?: string;
}

interface Informant {
    name: string;
    mobile: string;
    relation?: string;
    address?: string;
    source?: string;
}

interface LoanReportItem {
    id: number;
    application_no: string;
    loan_number: string;
    date: string;
    member_code: string;
    borrower_name: string;
    borrower_mobile: string;
    amount: number;
    status: string;
    status_label: string;
    product_name: string;
    branch_name: string;
    branch_code?: string;
    area_name: string;
    zone_name: string;
    samity_name: string;
    samity_code?: string;
    guarantors: Guarantor[];
    informants: Informant[];
}

interface Filters {
    date_from?: string;
    date_to?: string;
    min_amount?: number;
    status?: string;
    zone_id?: string | number;
    area_id?: string | number;
    branch_id?: string | number;
}

interface Props {
    loans: LoanReportItem[];
    filters: Filters;
    summary: {
        total_loans: number;
        total_amount: number;
    };
    zones?: Zone[];
    areas?: Area[];
    branches?: Branch[];
    printed_at: string;
}

export default function GuarantorInformantPrint({
    loans,
    filters,
    summary,
    zones = [],
    areas = [],
    branches = [],
    printed_at,
}: Props) {
    useEffect(() => {
        const timer = setTimeout(() => {
            window.print();
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    const formatAmount = (val: number | string | null | undefined) => {
        if (!val || Number(val) === 0) return '—';
        return Number(val).toLocaleString('bn-BD');
    };

    const filterZoneId = filters.zone_id ? String(filters.zone_id) : '';
    const filterAreaId = filters.area_id ? String(filters.area_id) : '';
    const filterBranchId = filters.branch_id ? String(filters.branch_id) : '';

    const selectedBranch = filterBranchId
        ? branches.find((b) => String(b.id) === filterBranchId) || null
        : null;

    const selectedArea = filterAreaId
        ? areas.find((a) => String(a.id) === filterAreaId) || null
        : (selectedBranch?.area_id ? areas.find((a) => String(a.id) === String(selectedBranch.area_id)) : null);

    const selectedZone = filterZoneId
        ? zones.find((z) => String(z.id) === filterZoneId) || null
        : (selectedArea?.zone_id ? zones.find((z) => String(z.id) === String(selectedArea.zone_id)) : null);

    const branchName = selectedBranch 
        ? `${selectedBranch.name}${selectedBranch.code ? ` (${selectedBranch.code})` : ''}` 
        : 'সকল শাখা';

    const areaName = selectedArea 
        ? selectedArea.name 
        : 'সকল অঞ্চল';

    const zoneName = selectedZone 
        ? selectedZone.name 
        : 'সকল জোন';

    const fromDateStr = filters.date_from ? formatDate(filters.date_from) : '';
    const toDateStr = filters.date_to ? formatDate(filters.date_to) : '';
    const reportDate =
        fromDateStr && toDateStr
            ? (fromDateStr === toDateStr ? fromDateStr : `${fromDateStr} - ${toDateStr}`)
            : toDateStr || fromDateStr || formatDate(new Date());

    return (
        <div className="print-container">
            <Head title="ঋণ জামিনদার ও তথ্য প্রদানকারী সংক্রান্ত তথ্য - প্রিন্ট" />

            <style>{`
                @page {
                    size: A4 landscape;
                    margin: 6mm 6mm;
                }

                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }

                body {
                    font-family: 'SolaimanLipi', 'Kalpurush', 'Calibri', 'Arial', sans-serif;
                    font-size: 8px;
                    line-height: 1.25;
                    color: #000;
                    print-color-adjust: exact;
                    -webkit-print-color-adjust: exact;
                    background: #fff;
                }

                .no-print {
                    display: block;
                }

                @media print {
                    .no-print {
                        display: none !important;
                    }
                }

                /* Header Styles */
                .print-header {
                    text-align: center;
                    margin-bottom: 5px;
                    padding-bottom: 3px;
                }

                .print-header .org {
                    font-size: 14px;
                    font-weight: bold;
                    margin-bottom: 2px;
                }

                .print-header .address {
                    font-size: 9.5px;
                    margin-bottom: 3px;
                }

                .print-header .title {
                    font-size: 11.5px;
                    font-weight: bold;
                    margin-bottom: 5px;
                    text-decoration: underline;
                }

                .header-meta-table {
                    width: 100%;
                    margin: 4px auto 2px;
                    border: none;
                    font-size: 9px;
                    border-collapse: collapse;
                }

                .header-meta-table td {
                    border: none;
                    padding: 2px 4px;
                    vertical-align: middle;
                }

                .meta-left {
                    text-align: left;
                    width: 33.33%;
                }

                .meta-center {
                    text-align: center;
                    width: 33.34%;
                }

                .meta-right {
                    text-align: right;
                    width: 33.33%;
                }

                .header-filter-label {
                    font-weight: 600;
                    color: #374151;
                }

                .header-filter-value {
                    color: #111827;
                    font-weight: bold;
                }

                /* Table Styles */
                table.main-report-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 3px;
                }

                table.main-report-table thead {
                    display: table-header-group;
                }

                table.main-report-table tbody {
                    display: table-row-group;
                }

                table.main-report-table th, 
                table.main-report-table td {
                    border: 0.5px solid #333;
                    padding: 3px 2px;
                    vertical-align: top;
                    word-wrap: break-word;
                    overflow-wrap: break-word;
                    line-height: 1.2;
                }

                table.main-report-table th {
                    background-color: #e5e7eb !important;
                    font-weight: bold;
                    font-size: 8px;
                    text-align: center !important;
                    vertical-align: middle;
                }

                table.main-report-table td {
                    font-size: 7.5px;
                }

                /* Signature block */
                .signature-section {
                    margin-top: 25px;
                    width: 100%;
                    display: flex;
                    justify-content: space-between;
                    font-size: 8.5px;
                    page-break-inside: avoid;
                }

                .sig-box {
                    width: 130px;
                    text-align: center;
                    border-top: 0.5px dashed #333;
                    padding-top: 3px;
                }
            `}</style>

            {/* Print Controls (Hidden on paper) */}
            <div className="no-print p-3 mb-3 bg-slate-100 border border-slate-300 rounded-lg flex items-center justify-between">
                <div className="text-xs font-bold text-slate-800">
                    Guarantor & Informant Report (হেড অফিস প্রিন্ট ভিউ)
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => window.print()}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700"
                    >
                        প্রিন্ট করুন
                    </button>
                    <button
                        onClick={() => window.close()}
                        className="px-3 py-1 bg-slate-300 text-slate-700 rounded text-xs font-semibold hover:bg-slate-400"
                    >
                        বন্ধ করুন
                    </button>
                </div>
            </div>

            {/* Header: Organization Info & Title (Matching LoanApplicationsPrint) */}
            <div className="print-header">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', minHeight: '48px', marginBottom: '2px' }}>
                    <div style={{ position: 'absolute', left: '0', top: '50%', transform: 'translateY(-50%)' }}>
                        <img
                            src="/logo.png"
                            alt="মৌসুমী"
                            style={{ height: '42px', width: 'auto', objectFit: 'contain' }}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <p className="org">মৌসুমী</p>
                        <p className="address">উকিলপাড়া, নওগাঁ।</p>
                        <p className="title">ঋণ জামিনদার ও তথ্য প্রদানকারী সংক্রান্ত তথ্য</p>
                    </div>
                </div>

                {/* 3-Column Metadata Row */}
                <table className="header-meta-table">
                    <tbody>
                        <tr>
                            <td className="meta-left">
                                <span className="header-filter-label">অঞ্চলের নাম: </span>
                                <span className="header-filter-value">{areaName}</span>
                            </td>
                            <td className="meta-center">
                                <span className="header-filter-label">তারিখ: </span>
                                <span className="header-filter-value">{reportDate}</span>
                            </td>
                            <td className="meta-right">
                                <span className="header-filter-label">জোনের নাম: </span>
                                <span className="header-filter-value">{zoneName}</span>
                            </td>
                        </tr>
                        <tr>
                            <td className="meta-left">
                                <span className="header-filter-label">শাখার নাম: </span>
                                <span className="header-filter-value">{branchName}</span>
                            </td>
                            <td className="meta-center">
                                <span className="header-filter-label">মোট ঋণ সংখ্যা: </span>
                                <span className="header-filter-value">{summary.total_loans.toLocaleString('bn-BD')} টি</span>
                            </td>
                            <td className="meta-right">
                                <span className="header-filter-label">মোট টাকার পরিমাণ: </span>
                                <span className="header-filter-value">{formatAmount(summary.total_amount)} /-</span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Main Data Table */}
            <table className="main-report-table">
                <thead>
                    <tr>
                        <th style={{ width: '2.5%' }}>ক্রঃ</th>
                        <th style={{ width: '5.5%' }}>নম্বর</th>
                        <th style={{ width: '5.5%' }}>তারিখ</th>
                        <th style={{ width: '5.5%' }}>মেম্বার কোড</th>
                        <th style={{ width: '13%' }}>ঋণ গ্রহীতার নাম ও মোবাইল</th>
                        <th style={{ width: '6.5%' }}>শাখা</th>
                        <th style={{ width: '8.5%' }}>সমিতির নাম</th>
                        <th style={{ width: '7%' }}>ঋণের পরিমাণ (৳)</th>
                        <th style={{ width: '23%' }}>জামিনদারদের তথ্য (নাম, মোবাইল, সম্পর্ক ও NID)</th>
                        <th style={{ width: '23%' }}>তথ্য প্রদানকারীদের তথ্য (নাম, মোবাইল, সম্পর্ক ও ঠিকানা)</th>
                    </tr>
                </thead>
                <tbody>
                    {loans.length === 0 ? (
                        <tr>
                            <td colSpan={10} style={{ textAlign: 'center', padding: '15px' }}>
                                কোনো ঋণ আবেদন পাওয়া যায়নি।
                            </td>
                        </tr>
                    ) : (
                        loans.map((loan, idx) => (
                            <tr key={loan.id}>
                                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                                    {(idx + 1).toLocaleString('bn-BD')}
                                </td>
                                <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 'bold' }}>
                                    {loan.loan_number}
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                    {loan.date}
                                </td>
                                <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 'bold' }}>
                                    {loan.member_code}
                                </td>
                                <td style={{ textAlign: 'left' }}>
                                    <div style={{ fontWeight: 'bold' }}>{loan.borrower_name}</div>
                                    {loan.borrower_mobile && (
                                        <div style={{ fontSize: '7px', fontFamily: 'monospace' }}>
                                            {loan.borrower_mobile}
                                        </div>
                                    )}
                                </td>
                                <td style={{ textAlign: 'left' }}>
                                    {loan.branch_name}
                                </td>
                                <td style={{ textAlign: 'left' }}>
                                    {loan.samity_name}
                                    {loan.samity_code && <span style={{ fontSize: '6.5px' }}> ({loan.samity_code.slice(-4)})</span>}
                                </td>
                                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                                    {formatAmount(loan.amount)}
                                </td>

                                {/* Guarantors */}
                                <td style={{ textAlign: 'left', padding: '2px 4px' }}>
                                    {loan.guarantors.length === 0 ? (
                                        <span style={{ color: '#9ca3af' }}>—</span>
                                    ) : (
                                        loan.guarantors.map((g, gIdx) => (
                                            <div key={gIdx} style={{ marginBottom: '2px', borderBottom: loan.guarantors.length > 1 && gIdx < loan.guarantors.length - 1 ? '0.5px dotted #cbd5e1' : 'none', paddingBottom: '1px' }}>
                                                <div style={{ fontWeight: 'bold' }}>
                                                    {gIdx + 1}. {g.name}
                                                    {g.relation && <span style={{ fontWeight: 'normal', color: '#4b5563' }}> ({g.relation})</span>}
                                                </div>
                                                {g.mobile && (
                                                    <div style={{ fontFamily: 'monospace', fontSize: '7px' }}>
                                                        মোবা: {g.mobile}
                                                    </div>
                                                )}
                                                {g.nid && (
                                                    <div style={{ fontSize: '6.5px', color: '#6b7280' }}>
                                                        NID: {g.nid}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </td>

                                {/* Informants */}
                                <td style={{ textAlign: 'left', padding: '2px 4px' }}>
                                    {loan.informants.length === 0 ? (
                                        <span style={{ color: '#9ca3af' }}>—</span>
                                    ) : (
                                        loan.informants.map((inf, iIdx) => (
                                            <div key={iIdx} style={{ marginBottom: '2px', borderBottom: loan.informants.length > 1 && iIdx < loan.informants.length - 1 ? '0.5px dotted #cbd5e1' : 'none', paddingBottom: '1px' }}>
                                                <div style={{ fontWeight: 'bold' }}>
                                                    {iIdx + 1}. {inf.name}
                                                    {inf.relation && <span style={{ fontWeight: 'normal', color: '#4b5563' }}> ({inf.relation})</span>}
                                                </div>
                                                {inf.mobile && (
                                                    <div style={{ fontFamily: 'monospace', fontSize: '7px' }}>
                                                        মোবা: {inf.mobile}
                                                    </div>
                                                )}
                                                {inf.address && (
                                                    <div style={{ fontSize: '6.5px', color: '#6b7280' }}>
                                                        ঠিকানা: {inf.address}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
                {loans.length > 0 && (
                    <tfoot>
                        <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold' }}>
                            <td colSpan={7} style={{ textAlign: 'right', padding: '4px' }}>
                                সর্বমোট (Grand Total):
                            </td>
                            <td style={{ textAlign: 'right', padding: '4px', fontWeight: 'bold' }}>
                                {formatAmount(summary.total_amount)}
                            </td>
                            <td colSpan={2} style={{ textAlign: 'left', padding: '4px' }}>
                                মোট ঋণ সংখ্যা: {summary.total_loans.toLocaleString('bn-BD')} টি
                            </td>
                        </tr>
                    </tfoot>
                )}
            </table>

            {/* Signature Section */}
            <div className="signature-section">
                <div className="sig-box">প্রস্তুতকারীর স্বাক্ষর</div>
                <div className="sig-box">যাচাইকারীর স্বাক্ষর</div>
                <div className="sig-box">শাখা / হেড অফিস কর্মকর্তা</div>
            </div>
        </div>
    );
}
