import { Head } from '@inertiajs/react';
import { useEffect } from 'react';

interface ApprovalItem {
    id: number;
    loan_id: number;
    approval_date: string;
    approval_time: string;
    approved_at_raw: string;
    level: string;
    level_label: string;
    comments: string | null;
    approver_id: number;
    approver_name: string;
    approver_role: string;
    application_no: string;
    member_name: string;
    member_code: string;
    member_mobile: string;
    product_name: string;
    product_code: string;
    category_name: string;
    branch_name: string;
    branch_code: string;
    area_name: string;
    zone_name: string;
    samity_name: string;
    requested_amount: number;
    approved_amount: number;
    loan_status: string;
    loan_status_label: string;
}

interface DateApproverBreakdown {
    user_id: number;
    user_name: string;
    role_name: string;
    loans_count: number;
    total_amount: number;
}

interface DateSummaryItem {
    date: string;
    formatted_date: string;
    total_loans: number;
    total_amount: number;
    approvers: DateApproverBreakdown[];
}

interface ApproverSummaryItem {
    user_id: number;
    user_name: string;
    role_name: string;
    branch_name: string;
    total_loans: number;
    total_amount: number;
}

interface ZoneOption {
    id: number | string;
    name: string;
}

interface AreaOption {
    id: number | string;
    name: string;
    zone_id?: number | string;
}

interface BranchOption {
    id: number | string;
    name: string;
    code?: string;
    area_id?: number | string;
}

interface Props {
    approvals: ApprovalItem[];
    filters: {
        date_from: string;
        date_to: string;
        user_id: string;
        zone_id: string;
        area_id: string;
        branch_id: string;
        search: string;
    };
    summary: {
        total_loans: number;
        total_amount: number;
        unique_approvers: number;
        average_amount: number;
    };
    selected_approver?: {
        id: number;
        name: string;
        email: string;
        role_name: string;
        branch_name: string;
    } | null;
    date_summary: DateSummaryItem[];
    approver_summary: ApproverSummaryItem[];
    zones: ZoneOption[];
    areas: AreaOption[];
    branches: BranchOption[];
    printed_at: string;
}

export default function ApproverLoanApprovalPrint({
    approvals = [],
    filters,
    summary,
    selected_approver,
    date_summary = [],
    approver_summary = [],
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

    const formatCurrency = (amount: number | string | null | undefined) => {
        if (!amount || Number(amount) === 0) return '০.০০';
        return Number(amount).toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    const selectedBranch = filters.branch_id
        ? branches.find((b) => String(b.id) === String(filters.branch_id))
        : null;

    const selectedArea = filters.area_id
        ? areas.find((a) => String(a.id) === String(filters.area_id))
        : (selectedBranch?.area_id ? areas.find((a) => String(a.id) === String(selectedBranch.area_id)) : null);

    const selectedZone = filters.zone_id
        ? zones.find((z) => String(z.id) === String(filters.zone_id))
        : (selectedArea?.zone_id ? zones.find((z) => String(z.id) === String(selectedArea.zone_id)) : null);

    const branchName = selectedBranch
        ? `${selectedBranch.name}${selectedBranch.code ? ` (${selectedBranch.code})` : ''}`
        : 'সকল শাখা';

    const areaName = selectedArea ? selectedArea.name : 'সকল অঞ্চল';
    const zoneName = selectedZone ? selectedZone.name : 'সকল জোন';

    const approverDisplayName = selected_approver
        ? `${selected_approver.name} (${selected_approver.role_name})`
        : 'সকল অনুমোদক (All Approvers)';

    const formatDateDMY = (dateStr: string) => {
        if (!dateStr) return '';
        try {
            const parts = dateStr.split('-');
            if (parts.length === 3) {
                return `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
            return dateStr;
        } catch {
            return dateStr;
        }
    };

    const totalRequestedSum = approvals.reduce((acc, curr) => acc + (Number(curr.requested_amount) || 0), 0);
    const totalApprovedSum = approvals.reduce((acc, curr) => acc + (Number(curr.approved_amount) || 0), 0);

    return (
        <div className="print-container">
            <Head title="অনুমোদকভিত্তিক ঋণ অনুমোদন রিপোর্ট - প্রিন্ট" />

            <style>{`
                @page {
                    size: A4 landscape;
                    margin: 8mm 6mm;
                }

                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }

                body {
                    font-family: 'SolaimanLipi', 'Kalpurush', 'Calibri', 'Arial', sans-serif;
                    font-size: 8.5px;
                    line-height: 1.25;
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

                /* Header */
                .print-header {
                    text-align: center;
                    margin-bottom: 8px;
                    padding-bottom: 4px;
                }

                .print-header .org {
                    font-size: 15px;
                    font-weight: bold;
                    margin-bottom: 2px;
                    color: #1e3a8a;
                }

                .print-header .address {
                    font-size: 10px;
                    margin-bottom: 3px;
                    color: #475569;
                }

                .print-header .title {
                    font-size: 12.5px;
                    font-weight: bold;
                    margin-bottom: 4px;
                    text-decoration: underline;
                    color: #0f172a;
                }

                /* Metadata Table */
                .header-meta-table {
                    width: 100%;
                    margin: 4px auto 8px;
                    border: 1px solid #cbd5e1;
                    font-size: 8.5px;
                    border-collapse: collapse;
                    background-color: #f8fafc;
                }

                .header-meta-table td {
                    border: 0.5px solid #cbd5e1;
                    padding: 4px 6px;
                    vertical-align: middle;
                }

                .meta-label {
                    font-weight: bold;
                    color: #334155;
                    width: 14%;
                    background-color: #f1f5f9;
                }

                .meta-value {
                    font-weight: 600;
                    color: #0f172a;
                    width: 36%;
                }

                /* Section Heading */
                .section-heading {
                    font-size: 10px;
                    font-weight: bold;
                    color: #1e293b;
                    margin-top: 10px;
                    margin-bottom: 4px;
                    padding-bottom: 2px;
                    border-bottom: 1.5px solid #0284c7;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                /* Tables */
                table.report-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 3px;
                    page-break-inside: auto;
                }

                table.report-table thead {
                    display: table-header-group;
                }

                table.report-table tr {
                    page-break-inside: avoid;
                    page-break-after: auto;
                }

                table.report-table th, 
                table.report-table td {
                    border: 0.5px solid #475569;
                    padding: 3.5px 3px;
                    vertical-align: middle;
                    word-wrap: break-word;
                    overflow-wrap: break-word;
                    line-height: 1.2;
                }

                table.report-table th {
                    background-color: #e2e8f0 !important;
                    font-weight: bold;
                    font-size: 8px;
                    text-align: center;
                    color: #0f172a;
                }

                table.report-table td {
                    font-size: 8px;
                }

                table.report-table tbody tr:nth-child(even) td {
                    background-color: #f8fafc;
                }

                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .text-left { text-align: left; }
                .font-bold { font-weight: bold; }

                /* Total Row */
                tr.totals-row td {
                    background-color: #e2e8f0 !important;
                    font-weight: bold;
                    border-top: 1.5px solid #0f172a;
                    border-bottom: 1.5px solid #0f172a;
                }

                /* Signature Block */
                .signature-section {
                    margin-top: 32px;
                    width: 100%;
                    display: flex;
                    justify-content: space-between;
                    font-size: 8.5px;
                    page-break-inside: avoid;
                }

                .sig-box {
                    width: 170px;
                    text-align: center;
                    border-top: 0.75px dashed #334155;
                    padding-top: 4px;
                    font-weight: 600;
                    color: #1e293b;
                }
            `}</style>

            {/* Print Controls (Hidden on Print) */}
            <div className="no-print p-3 mb-4 bg-slate-100 border border-slate-300 rounded-lg flex items-center justify-between shadow-sm">
                <div>
                    <span className="text-sm font-bold text-slate-800">
                        অনুমোদকভিত্তিক ঋণ অনুমোদন রিপোর্ট (A4 ল্যান্ডস্কেপ প্রিন্ট ভিউ)
                    </span>
                    <span className="ml-3 text-xs text-slate-500">
                        মোট রেকর্ড: {approvals.length} টি | প্রিন্ট তৈরি: {printed_at}
                    </span>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => window.print()}
                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold shadow transition-colors"
                    >
                        প্রিন্ট করুন / PDF ডাউনলোড
                    </button>
                    <button
                        onClick={() => window.close()}
                        className="px-3 py-1.5 bg-slate-300 hover:bg-slate-400 text-slate-700 rounded text-xs font-semibold transition-colors"
                    >
                        বন্ধ করুন
                    </button>
                </div>
            </div>

            {/* Header: Organization Info & Title */}
            <div className="print-header">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', minHeight: '52px', marginBottom: '3px' }}>
                    <div style={{ position: 'absolute', left: '0', top: '50%', transform: 'translateY(-50%)' }}>
                        <img
                            src="/logo.png"
                            alt="মৌসুমী"
                            style={{ height: '44px', width: 'auto', objectFit: 'contain' }}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <h1 className="org">মৌসুমী</h1>
                        <p className="address">উকিলপাড়া, নওগাঁ।</p>
                        <h2 className="title">অনুমোদকভিত্তিক ঋণ অনুমোদন রিপোর্ট (Approver Loan Approval Report)</h2>
                    </div>
                </div>

                {/* Metadata Table */}
                <table className="header-meta-table">
                    <tbody>
                        <tr>
                            <td className="meta-label">তারিখ পরিসীমা:</td>
                            <td className="meta-value font-mono">
                                {formatDateDMY(filters.date_from)} হতে {formatDateDMY(filters.date_to)}
                            </td>
                            <td className="meta-label">অনুমোদক / কর্মকর্তা:</td>
                            <td className="meta-value">{approverDisplayName}</td>
                        </tr>
                        <tr>
                            <td className="meta-label">জোন / অঞ্চল / শাখা:</td>
                            <td className="meta-value">
                                জোন: {zoneName} | অঞ্চল: {areaName} | শাখা: {branchName}
                            </td>
                            <td className="meta-label">অনুমোদন সংখ্যা ও মোট টাকা:</td>
                            <td className="meta-value">
                                <span className="font-bold text-blue-900">{summary.total_loans} টি ঋণ</span> — মোট টাকা:{' '}
                                <span className="font-bold text-green-800">৳ {formatCurrency(summary.total_amount)}</span>
                            </td>
                        </tr>
                        <tr>
                            <td className="meta-label">গড় ঋণ অনুমোদন:</td>
                            <td className="meta-value">৳ {formatCurrency(summary.average_amount)}</td>
                            <td className="meta-label">প্রিন্ট তারিখ ও সময়:</td>
                            <td className="meta-value">{printed_at}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* বিস্তারিত অনুমোদিত ঋণের তালিকা (Detailed Loan Approvals List) */}
            <div style={{ marginTop: '8px' }}>
                <div className="section-heading">
                    <span>অনুমোদিত ঋণের বিস্তারিত তালিকা (Detailed Approved Loans List)</span>
                    <span style={{ fontSize: '8px', fontWeight: 'normal', color: '#64748b' }}>
                        সর্বমোট ঋণ: {approvals.length} টি
                    </span>
                </div>

                <table className="report-table">
                    <thead>
                        <tr>
                            <th style={{ width: '3%' }}>ক্রঃ</th>
                            <th style={{ width: '9%' }}>অনুমোদনের তারিখ ও সময়</th>
                            <th style={{ width: '9%' }}>আবেদন নং</th>
                            <th style={{ width: '13%' }}>সদস্যের নাম ও কোড</th>
                            <th style={{ width: '8%' }}>মোবাইল নং</th>
                            <th style={{ width: '13%' }}>শাখা ও সমিতি</th>
                            <th style={{ width: '9%' }}>ঋণ স্কিম</th>
                            <th style={{ width: '7%' }}>চাহিত টাকা</th>
                            <th style={{ width: '8%' }}>অনুমোদিত টাকা</th>
                            <th style={{ width: '11%' }}>অনুমোদক ও পদবী</th>
                            <th style={{ width: '10%' }}>মন্তব্য / নোট</th>
                        </tr>
                    </thead>
                    <tbody>
                        {approvals.length === 0 ? (
                            <tr>
                                <td colSpan={11} className="text-center" style={{ padding: '15px' }}>
                                    নির্বাচিত ফিল্টারে কোনো অনুমোদিত ঋণের তথ্য পাওয়া যায়নি।
                                </td>
                            </tr>
                        ) : (
                            approvals.map((item, index) => (
                                <tr key={item.id}>
                                    <td className="text-center">{index + 1}</td>
                                    <td className="text-center">
                                        <div className="font-bold">{item.approval_date}</div>
                                        <div style={{ fontSize: '7px', color: '#64748b' }}>{item.approval_time}</div>
                                    </td>
                                    <td className="text-center font-bold">{item.application_no}</td>
                                    <td className="text-left">
                                        <div className="font-bold">{item.member_name}</div>
                                        <div style={{ fontSize: '7px', color: '#475569' }}>কোড: {item.member_code}</div>
                                    </td>
                                    <td className="text-center">{item.member_mobile || '—'}</td>
                                    <td className="text-left">
                                        <div className="font-bold">{item.branch_name}</div>
                                        <div style={{ fontSize: '7px', color: '#475569' }}>{item.samity_name}</div>
                                    </td>
                                    <td className="text-left">
                                        <div>{item.product_name}</div>
                                        <div style={{ fontSize: '7px', color: '#64748b' }}>{item.category_name}</div>
                                    </td>
                                    <td className="text-right">৳ {formatCurrency(item.requested_amount)}</td>
                                    <td className="text-right font-bold text-green-900">
                                        ৳ {formatCurrency(item.approved_amount)}
                                    </td>
                                    <td className="text-left">
                                        <div className="font-bold">{item.approver_name}</div>
                                        <div style={{ fontSize: '7px', color: '#0369a1' }}>
                                            {item.approver_role} ({item.level_label})
                                        </div>
                                    </td>
                                    <td className="text-left" style={{ fontSize: '7.5px' }}>
                                        {item.comments ? item.comments : '—'}
                                    </td>
                                </tr>
                            ))
                        )}

                        {/* Grand Totals */}
                        {approvals.length > 0 && (
                            <tr className="totals-row">
                                <td colSpan={7} className="text-right font-bold" style={{ paddingRight: '8px' }}>
                                    সর্বমোট (Grand Total - {approvals.length} টি ঋণ):
                                </td>
                                <td className="text-right font-bold">
                                    ৳ {formatCurrency(totalRequestedSum)}
                                </td>
                                <td className="text-right font-bold text-green-950">
                                    ৳ {formatCurrency(totalApprovedSum)}
                                </td>
                                <td colSpan={2}></td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Signature Section */}
            <div className="signature-section">
                <div className="sig-box">
                    প্রস্তুতকারীর স্বাক্ষর
                </div>
                <div className="sig-box">
                    যাচাইকারীর স্বাক্ষর
                </div>
                <div className="sig-box">
                    অনুমোদনকারী কর্মকর্তা / শাখা প্রধান
                </div>
            </div>
        </div>
    );
}
