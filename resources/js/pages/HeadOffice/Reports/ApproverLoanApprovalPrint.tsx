import { Head } from '@inertiajs/react';
import { useEffect, useState } from 'react';

interface ApprovalItem {
    id: number;
    loan_id: number;
    approval_date: string;
    approval_time: string;
    approved_at_raw: string;
    level: string;
    level_label: string;
    action_status?: 'approved' | 'rejected' | string;
    action_status_label?: string;
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
    approved_count?: number;
    approved_amount?: number;
    rejected_count?: number;
    rejected_amount?: number;
    total_amount: number;
}

interface DateSummaryItem {
    date: string;
    formatted_date: string;
    total_loans: number;
    approved_count?: number;
    approved_amount?: number;
    rejected_count?: number;
    rejected_amount?: number;
    total_amount: number;
    approvers: DateApproverBreakdown[];
}

interface ApproverSummaryItem {
    user_id: number;
    user_name: string;
    role_name: string;
    branch_name: string;
    total_loans: number;
    total_actions?: number;
    total_approvals?: number;
    approved_loans?: number;
    approved_amount?: number;
    reapprovals_count?: number;
    rejected_loans?: number;
    rejected_actions?: number;
    rejected_amount?: number;
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
        decision_status?: string;
        report_type?: string;
        zone_id: string;
        area_id: string;
        branch_id: string;
        search: string;
    };
    summary: {
        total_decisions?: number;
        total_loans: number;
        total_approvals?: number;
        approved_loans?: number;
        approved_actions?: number;
        approved_amount?: number;
        rejected_loans?: number;
        rejected_actions?: number;
        rejected_amount?: number;
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
    const initialReportType = (filters.report_type as 'approver_wise' | 'detailed' | 'date_wise' | 'all') || 'approver_wise';
    const [currentReportType, setCurrentReportType] = useState<'approver_wise' | 'detailed' | 'date_wise' | 'all'>(initialReportType);
    const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

    useEffect(() => {
        const timer = setTimeout(() => {
            window.print();
        }, 600);
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
        : 'সকল কর্মকর্তা (All Approvers)';

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
    const totalApprovedSum = approvals.reduce(
        (acc, curr) => acc + (curr.action_status === 'rejected' ? 0 : (Number(curr.approved_amount) || 0)),
        0
    );
    const approvedCount = approvals.filter((a) => a.action_status !== 'rejected').length;
    const rejectedCount = approvals.filter((a) => a.action_status === 'rejected').length;

    const decisionFilterText = matchDecisionFilter(filters.decision_status);

    function matchDecisionFilter(status?: string) {
        if (status === 'approved') return 'শুধুমাত্র অনুমোদিত (Approved Only)';
        if (status === 'rejected') return 'শুধুমাত্র বাতিল / প্রত্যাখ্যাত (Rejected Only)';
        return 'সকল সিদ্ধান্ত (অনুমোদিত ও বাতিল)';
    }

    const reportTitleText = () => {
        switch (currentReportType) {
            case 'approver_wise':
                return 'কর্মকর্তাভিত্তিক ঋণ সিদ্ধান্ত ও অনুমোদন সারসংক্ষেপ রিপোর্ট (Approver-wise Loan Decision Summary)';
            case 'detailed':
                return 'বিস্তারিত ঋণ সিদ্ধান্ত ও অনুমোদন তালিকা রিপোর্ট (Detailed Loan Decisions List)';
            case 'date_wise':
                return 'তারিখভিত্তিক ঋণ সিদ্ধান্ত ও অনুমোদন বিবরণী রিপোর্ট (Date-wise Loan Decision Summary)';
            case 'all':
                return 'কর্মকর্তাভিত্তিক ঋণ সিদ্ধান্ত ও অনুমোদন পূর্ণাঙ্গ রিপোর্ট (Complete Loan Decision Report)';
            default:
                return 'কর্মকর্তাভিত্তিক ঋণ সিদ্ধান্ত ও অনুমোদন রিপোর্ট';
        }
    };

    return (
        <div className="print-container">
            <Head title="কর্মকর্তাভিত্তিক ঋণ সিদ্ধান্ত ও অনুমোদন রিপোর্ট - প্রিন্ট" />

            <style>{`
                @page {
                    size: A4 ${orientation};
                    margin: ${orientation === 'portrait' ? '8mm 6mm' : '8mm 6mm'};
                }

                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }

                body {
                    font-family: 'SolaimanLipi', 'Kalpurush', 'Calibri', 'Arial', sans-serif;
                    font-size: ${orientation === 'portrait' ? '7.8px' : '8.5px'};
                    color: #0f172a;
                    background-color: #fff;
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
                    margin-bottom: 6px;
                    padding-bottom: 3px;
                }

                .print-header .org {
                    font-size: 14px;
                    font-weight: bold;
                    margin-bottom: 2px;
                    color: #1e3a8a;
                }

                .print-header .address {
                    font-size: 9px;
                    margin-bottom: 2px;
                    color: #475569;
                }

                .print-header .title {
                    font-size: 11.5px;
                    font-weight: bold;
                    margin-bottom: 3px;
                    text-decoration: underline;
                    color: #0f172a;
                }

                /* Metadata Table */
                .header-meta-table {
                    width: 100%;
                    margin: 3px auto 6px;
                    border: 1px solid #cbd5e1;
                    font-size: ${orientation === 'portrait' ? '7.5px' : '8.5px'};
                    border-collapse: collapse;
                    background-color: #f8fafc;
                }

                .header-meta-table td {
                    border: 0.5px solid #cbd5e1;
                    padding: 3px 5px;
                    vertical-align: middle;
                }

                .meta-label {
                    font-weight: bold;
                    color: #334155;
                    width: 16%;
                    background-color: #f1f5f9;
                }

                .meta-value {
                    font-weight: 600;
                    color: #0f172a;
                    width: 34%;
                }

                /* Section Heading */
                .section-heading {
                    font-size: 9.5px;
                    font-weight: bold;
                    color: #1e293b;
                    margin-top: 8px;
                    margin-bottom: 3px;
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
                    margin-top: 2px;
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
                    padding: ${orientation === 'portrait' ? '2.5px 2px' : '3.5px 3px'};
                    vertical-align: middle;
                    word-wrap: break-word;
                    overflow-wrap: break-word;
                    line-height: 1.15;
                }

                table.report-table th {
                    background-color: #e2e8f0 !important;
                    font-weight: bold;
                    font-size: ${orientation === 'portrait' ? '7.2px' : '8px'};
                    text-align: center;
                    color: #0f172a;
                }

                table.report-table td {
                    font-size: ${orientation === 'portrait' ? '7.2px' : '8px'};
                }

                table.report-table tbody tr:nth-child(even) td {
                    background-color: #f8fafc;
                }

                tr.rejected-row td {
                    background-color: #fff1f2 !important;
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
                    margin-top: 24px;
                    width: 100%;
                    display: flex;
                    justify-content: space-between;
                    font-size: ${orientation === 'portrait' ? '7.5px' : '8.5px'};
                    page-break-inside: avoid;
                }

                .sig-box {
                    width: ${orientation === 'portrait' ? '140px' : '170px'};
                    text-align: center;
                    border-top: 0.75px dashed #334155;
                    padding-top: 4px;
                    font-weight: 600;
                    color: #1e293b;
                }
            `}</style>

            {/* Print Controls (Hidden on Print) */}
            <div className="no-print p-3 mb-4 bg-slate-100 border border-slate-300 rounded-xl flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-700 mr-1">প্রিন্ট ভিউ নির্বাচন:</span>
                    <button
                        type="button"
                        onClick={() => setCurrentReportType('approver_wise')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                            currentReportType === 'approver_wise'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
                        }`}
                    >
                        কর্মকর্তাভিত্তিক সারসংক্ষেপ
                    </button>
                    <button
                        type="button"
                        onClick={() => setCurrentReportType('detailed')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                            currentReportType === 'detailed'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
                        }`}
                    >
                        বিস্তারিত ঋণ তালিকা
                    </button>
                    <button
                        type="button"
                        onClick={() => setCurrentReportType('date_wise')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                            currentReportType === 'date_wise'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
                        }`}
                    >
                        তারিখভিত্তিক সারসংক্ষেপ
                    </button>
                    <button
                        type="button"
                        onClick={() => setCurrentReportType('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                            currentReportType === 'all'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
                        }`}
                    >
                        সবগুলো একসাথে
                    </button>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-700 mr-1">পেজ ওরিয়েন্টেশন:</span>
                    <button
                        type="button"
                        onClick={() => setOrientation('portrait')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                            orientation === 'portrait'
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
                        }`}
                        title="খাড়া পেজ (A4 Portrait)"
                    >
                        খাড়া (Portrait - A4)
                    </button>
                    <button
                        type="button"
                        onClick={() => setOrientation('landscape')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                            orientation === 'landscape'
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
                        }`}
                        title="আড়াআড়ি পেজ (A4 Landscape)"
                    >
                        আড়াআড়ি (Landscape)
                    </button>

                    <button
                        onClick={() => window.print()}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow transition-colors cursor-pointer ml-2"
                    >
                        প্রিন্ট করুন / PDF
                    </button>
                    <button
                        onClick={() => window.close()}
                        className="px-3 py-1.5 bg-slate-300 hover:bg-slate-400 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
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
                        <h2 className="title">{reportTitleText()}</h2>
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
                            <td className="meta-label">সিদ্ধান্ত ফিল্টার:</td>
                            <td className="meta-value font-bold text-slate-800">{decisionFilterText}</td>
                        </tr>
                        <tr>
                            <td className="meta-label">অনুমোদিত ঋণ ও টাকা:</td>
                            <td className="meta-value">
                                <span className="font-bold text-emerald-800">
                                    {(summary.approved_loans ?? approvedCount)} টি অনুমোদিত
                                </span>{' '}
                                — টাকা: <span className="font-bold text-emerald-800">৳ {formatCurrency(summary.approved_amount ?? totalApprovedSum)}</span>
                            </td>
                            <td className="meta-label">বাতিলকৃত ঋণ:</td>
                            <td className="meta-value">
                                <span className="font-bold text-rose-700">
                                    {(summary.rejected_loans ?? rejectedCount)} টি বাতিল / প্রত্যাখ্যাত
                                </span>{' '}
                                {summary.rejected_amount ? `(৳ ${formatCurrency(summary.rejected_amount)})` : ''}
                            </td>
                        </tr>
                        <tr>
                            <td className="meta-label">মোট সিদ্ধান্ত কার্যক্রম:</td>
                            <td className="meta-value font-bold">
                                {summary.total_decisions ?? approvals.length} টি সিদ্ধান্ত ({summary.unique_approvers} জন কর্মকর্তা)
                            </td>
                            <td className="meta-label">প্রিন্ট তারিখ ও সময়:</td>
                            <td className="meta-value">{printed_at}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* SECTION 1: কর্মকর্তাভিত্তিক ঋণ মঞ্জুরী সারসংক্ষেপ (Approver-wise Summary Table) */}
            {(currentReportType === 'approver_wise' || currentReportType === 'all') && (
                <div style={{ marginTop: '8px' }}>
                    <div className="section-heading">
                        <span>কর্মকর্তাভিত্তিক ঋণ সিদ্ধান্ত ও অনুমোদন সারসংক্ষেপ (Approver-wise Summary)</span>
                        <span style={{ fontSize: '8px', fontWeight: 'normal', color: '#64748b' }}>
                            মোট কর্মকর্তা: {approver_summary.length} জন
                        </span>
                    </div>

                    <table className="report-table">
                        <thead>
                            <tr>
                                <th style={{ width: '3%' }}>ক্রঃ</th>
                                <th style={{ width: '16%' }}>কর্মকর্তার নাম ও আইডি</th>
                                <th style={{ width: '13%' }}>পদবী ও স্তর</th>
                                <th style={{ width: '14%' }}>কর্মস্থল / শাখা</th>
                                <th style={{ width: '9%' }}>অনুমোদিত ঋণ (টি)</th>
                                <th style={{ width: '8%' }}>পুনঃঅনুমোদন (টি)</th>
                                <th style={{ width: '9%' }}>বাতিলকৃত (টি)</th>
                                <th style={{ width: '8%' }}>মোট সিদ্ধান্ত</th>
                                <th style={{ width: '10%' }}>অনুমোদিত টাকা (৳)</th>
                                <th style={{ width: '10%' }}>গড় ঋণ (৳)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {approver_summary.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="text-center" style={{ padding: '15px' }}>
                                        কোনো কর্মকর্তার তথ্য পাওয়া যায়নি।
                                    </td>
                                </tr>
                            ) : (
                                approver_summary.map((item, idx) => {
                                    const appLoans = item.approved_loans ?? item.total_loans;
                                    const reapp = item.reapprovals_count ?? 0;
                                    const rejLoans = item.rejected_loans ?? 0;
                                    const totAct = item.total_actions ?? item.total_approvals ?? item.total_loans;
                                    const appAmt = item.approved_amount ?? item.total_amount;
                                    const avgAmt = appLoans > 0 ? appAmt / appLoans : 0;

                                    return (
                                        <tr key={item.user_id}>
                                            <td className="text-center">{idx + 1}</td>
                                            <td className="text-left font-bold">
                                                {item.user_name}
                                                <span style={{ fontSize: '7px', color: '#64748b', marginLeft: '4px' }}>
                                                    (#{item.user_id})
                                                </span>
                                            </td>
                                            <td className="text-left">{item.role_name}</td>
                                            <td className="text-left">{item.branch_name || 'হেড অফিস'}</td>
                                            <td className="text-center font-bold text-emerald-800">
                                                {appLoans} টি
                                            </td>
                                            <td className="text-center" style={{ color: reapp > 0 ? '#7c3aed' : '#64748b' }}>
                                                {reapp > 0 ? `${reapp} টি` : '—'}
                                            </td>
                                            <td className="text-center font-bold" style={{ color: rejLoans > 0 ? '#be123c' : '#64748b' }}>
                                                {rejLoans > 0 ? `${rejLoans} টি` : '০'}
                                            </td>
                                            <td className="text-center font-bold text-slate-800">{totAct} টি</td>
                                            <td className="text-right font-bold text-emerald-800">
                                                ৳ {formatCurrency(appAmt)}
                                            </td>
                                            <td className="text-right">
                                                ৳ {formatCurrency(avgAmt)}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}

                            {/* Totals Row */}
                            {approver_summary.length > 0 && (
                                <tr className="totals-row">
                                    <td colSpan={4} className="text-right font-bold" style={{ paddingRight: '8px' }}>
                                        সর্বমোট (মোট {approver_summary.length} জন কর্মকর্তা):
                                    </td>
                                    <td className="text-center font-bold text-emerald-950">
                                        {(summary.approved_loans ?? approver_summary.reduce((s, i) => s + (i.approved_loans ?? i.total_loans), 0))} টি
                                    </td>
                                    <td className="text-center font-bold text-purple-900">
                                        {approver_summary.reduce((s, i) => s + (i.reapprovals_count ?? 0), 0)} টি
                                    </td>
                                    <td className="text-center font-bold text-rose-900">
                                        {(summary.rejected_loans ?? approver_summary.reduce((s, i) => s + (i.rejected_loans ?? 0), 0))} টি
                                    </td>
                                    <td className="text-center font-bold">
                                        {(summary.total_decisions ?? summary.total_approvals ?? summary.total_loans)} টি
                                    </td>
                                    <td className="text-right font-bold text-emerald-950">
                                        ৳ {formatCurrency(summary.approved_amount ?? summary.total_amount)}
                                    </td>
                                    <td className="text-right font-bold">
                                        ৳ {formatCurrency(summary.average_amount)}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* SECTION 2: বিস্তারিত ঋণের তালিকা (Detailed Loans List) */}
            {(currentReportType === 'detailed' || currentReportType === 'all') && (
                <div style={{ marginTop: '14px' }}>
                    <div className="section-heading">
                        <span>বিস্তারিত ঋণ সিদ্ধান্তের তালিকা (Detailed Loan Decisions List)</span>
                        <span style={{ fontSize: '8px', fontWeight: 'normal', color: '#64748b' }}>
                            মোট রেকর্ড: {approvals.length} টি | অনুমোদিত: {approvedCount} টি | বাতিল: {rejectedCount} টি
                        </span>
                    </div>

                    <table className="report-table">
                        <thead>
                            <tr>
                                <th style={{ width: '3%' }}>ক্রঃ</th>
                                <th style={{ width: '9%' }}>তারিখ ও সময়</th>
                                <th style={{ width: '9%' }}>আবেদন নং</th>
                                <th style={{ width: '12%' }}>সদস্যের নাম ও কোড</th>
                                <th style={{ width: '8%' }}>মোবাইল নং</th>
                                <th style={{ width: '12%' }}>শাখা ও সমিতি</th>
                                <th style={{ width: '8%' }}>ঋণ স্কিম</th>
                                <th style={{ width: '7%' }}>চাহিত টাকা</th>
                                <th style={{ width: '7%' }}>অনুমোদিত টাকা</th>
                                <th style={{ width: '7%' }}>সিদ্ধান্ত</th>
                                <th style={{ width: '10%' }}>কর্মকর্তা ও স্তর</th>
                                <th style={{ width: '8%' }}>মন্তব্য / কারণ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {approvals.length === 0 ? (
                                <tr>
                                    <td colSpan={12} className="text-center" style={{ padding: '15px' }}>
                                        নির্বাচিত ফিল্টারে কোনো ঋণের সিদ্ধান্তের তথ্য পাওয়া যায়নি।
                                    </td>
                                </tr>
                            ) : (
                                approvals.map((item, index) => {
                                    const isRej = item.action_status === 'rejected';

                                    return (
                                        <tr key={item.id} className={isRej ? 'rejected-row' : ''}>
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
                                            <td className="text-right font-bold">
                                                {isRej ? (
                                                    <span style={{ color: '#be123c' }}>—</span>
                                                ) : (
                                                    <span style={{ color: '#047857' }}>৳ {formatCurrency(item.approved_amount)}</span>
                                                )}
                                            </td>
                                            <td className="text-center">
                                                {isRej ? (
                                                    <span style={{
                                                        backgroundColor: '#ffe4e6',
                                                        color: '#be123c',
                                                        padding: '1px 4px',
                                                        borderRadius: '3px',
                                                        fontWeight: 'bold',
                                                        fontSize: '7.5px',
                                                        border: '0.5px solid #fda4af',
                                                    }}>
                                                        বাতিল
                                                    </span>
                                                ) : (
                                                    <span style={{
                                                        backgroundColor: '#dcfce7',
                                                        color: '#15803d',
                                                        padding: '1px 4px',
                                                        borderRadius: '3px',
                                                        fontWeight: 'bold',
                                                        fontSize: '7.5px',
                                                        border: '0.5px solid #86efac',
                                                    }}>
                                                        অনুমোদিত
                                                    </span>
                                                )}
                                            </td>
                                            <td className="text-left">
                                                <div className="font-bold">{item.approver_name}</div>
                                                <div style={{ fontSize: '7px', color: '#0369a1' }}>
                                                    {item.approver_role} ({item.level_label})
                                                </div>
                                            </td>
                                            <td className="text-left" style={{ fontSize: '7.5px', color: isRej ? '#be123c' : '#334155' }}>
                                                {item.comments ? item.comments : '—'}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}

                            {/* Grand Totals */}
                            {approvals.length > 0 && (
                                <tr className="totals-row">
                                    <td colSpan={7} className="text-right font-bold" style={{ paddingRight: '8px' }}>
                                        সর্বমোট (মোট {approvals.length} টি সিদ্ধান্ত — অনুমোদিত: {approvedCount} টি, বাতিল: {rejectedCount} টি):
                                    </td>
                                    <td className="text-right font-bold">
                                        ৳ {formatCurrency(totalRequestedSum)}
                                    </td>
                                    <td className="text-right font-bold text-green-950">
                                        ৳ {formatCurrency(totalApprovedSum)}
                                    </td>
                                    <td colSpan={3}></td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* SECTION 3: তারিখভিত্তিক সারসংক্ষেপ (Date-wise Summary Table) */}
            {(currentReportType === 'date_wise' || currentReportType === 'all') && (
                <div style={{ marginTop: '14px' }}>
                    <div className="section-heading">
                        <span>তারিখ অনুযায়ী ঋণ অনুমোদন ও বাতিল বিবরণী (Date-wise Summary)</span>
                        <span style={{ fontSize: '8px', fontWeight: 'normal', color: '#64748b' }}>
                            মোট কার্যদিবস: {date_summary.length} দিন
                        </span>
                    </div>

                    <table className="report-table">
                        <thead>
                            <tr>
                                <th style={{ width: '4%' }}>ক্রঃ</th>
                                <th style={{ width: '12%' }}>তারিখ (Date)</th>
                                <th style={{ width: '10%' }}>অনুমোদিত ঋণ</th>
                                <th style={{ width: '12%' }}>অনুমোদিত টাকা (৳)</th>
                                <th style={{ width: '9%' }}>বাতিলকৃত ঋণ</th>
                                <th style={{ width: '9%' }}>মোট সিদ্ধান্ত</th>
                                <th style={{ width: '44%' }}>অনুমোদনকারী কর্মকর্তা ও ব্রেকডাউন</th>
                            </tr>
                        </thead>
                        <tbody>
                            {date_summary.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center" style={{ padding: '15px' }}>
                                        কোনো তারিখভিত্তিক তথ্য পাওয়া যায়নি।
                                    </td>
                                </tr>
                            ) : (
                                date_summary.map((dItem, idx) => (
                                    <tr key={dItem.date}>
                                        <td className="text-center">{idx + 1}</td>
                                        <td className="text-center font-bold">
                                            {dItem.formatted_date}
                                        </td>
                                        <td className="text-center font-bold text-emerald-800">
                                            {(dItem.approved_count ?? dItem.total_loans)} টি
                                        </td>
                                        <td className="text-right font-bold text-emerald-800">
                                            ৳ {formatCurrency(dItem.approved_amount ?? dItem.total_amount)}
                                        </td>
                                        <td className="text-center font-bold" style={{ color: (dItem.rejected_count ?? 0) > 0 ? '#be123c' : '#64748b' }}>
                                            {(dItem.rejected_count ?? 0) > 0 ? `${dItem.rejected_count} টি` : '০'}
                                        </td>
                                        <td className="text-center font-bold">{dItem.total_loans} টি</td>
                                        <td className="text-left" style={{ fontSize: '7.5px' }}>
                                            {dItem.approvers.map((ap) => (
                                                <div key={ap.user_id}>
                                                    <strong>{ap.user_name}</strong> ({ap.role_name}):{' '}
                                                    <span style={{ color: '#047857' }}>{(ap.approved_count ?? ap.loans_count)} টি অনুমোদন</span>{' '}
                                                    (৳ {formatCurrency(ap.approved_amount ?? ap.total_amount)})
                                                    {Boolean(ap.rejected_count && ap.rejected_count > 0) && (
                                                        <span style={{ color: '#be123c', fontWeight: 'bold' }}>
                                                            {' '}• {ap.rejected_count} টি বাতিল
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </td>
                                    </tr>
                                ))
                            )}

                            {/* Totals Row */}
                            {date_summary.length > 0 && (
                                <tr className="totals-row">
                                    <td colSpan={2} className="text-right font-bold" style={{ paddingRight: '8px' }}>
                                        সর্বমোট:
                                    </td>
                                    <td className="text-center font-bold text-emerald-950">
                                        {(summary.approved_loans ?? summary.total_loans)} টি
                                    </td>
                                    <td className="text-right font-bold text-emerald-950">
                                        ৳ {formatCurrency(summary.approved_amount ?? summary.total_amount)}
                                    </td>
                                    <td className="text-center font-bold text-rose-900">
                                        {(summary.rejected_loans ?? 0)} টি
                                    </td>
                                    <td className="text-center font-bold">
                                        {(summary.total_decisions ?? summary.total_loans)} টি
                                    </td>
                                    <td></td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Signature Section */}
            <div className="signature-section">
                <div className="sig-box">
                    প্রস্তুতকারীর স্বাক্ষর
                </div>
                <div className="sig-box">
                    যাচাইকারীর স্বাক্ষর
                </div>
                <div className="sig-box">
                    অনুমোদনকারী কর্মকর্তা / বিভাগীয় প্রধান
                </div>
            </div>
        </div>
    );
}
