import { Head } from '@inertiajs/react';
import { useEffect } from 'react';
import { formatDate } from '@/utils/dateUtils';

interface Branch {
    id: number;
    name: string;
    code?: string;
    area?: {
        id: number;
        name: string;
        zone?: {
            id: number;
            name: string;
        };
    };
}

interface Samity {
    id: number;
    samity_name: string;
    samity_name_bn?: string;
}

interface LoanProduct {
    id: number;
    product_name: string;
    product_name_bn?: string;
}

interface LoanCategory {
    id: number;
    category_name: string;
    category_name_bn?: string;
}

interface MemberAdmission {
    id: number;
    applicant_name_en: string;
    applicant_name_bn: string | null;
    mobile_number: string | null;
    nid_number: string | null;
    application_no: string;
    is_legacy?: boolean | number;
    loan_dofa?: number | string | null;
}

interface LoanApplication {
    id: number;
    application_no: string;
    status: string;
    requested_amount: number;
    approved_amount: number | null;
    savings_amount?: number | string | null;
    savings_general?: number | null;
    savings_other?: number | null;
    savings_total?: number | null;
    general_savings_percent?: number | null;
    business_plan?: any;
    asset_info?: any;
    created_at: string;
    submitted_at: string | null;
    branch: Branch;
    samity?: Samity;
    loan_product?: LoanProduct;
    loan_category?: LoanCategory;
    member_admission?: MemberAdmission;
}

interface Filters {
    search?: string;
    status?: string;
    zone_id?: number;
    area_id?: number;
    branch_id?: number;
    date_from?: string;
    date_to?: string;
    had_issues?: string;
}

interface Zone {
    id: number;
    name: string;
}

interface Area {
    id: number;
    name: string;
}

interface Props {
    loans: LoanApplication[];
    filters: Filters;
    zones: Zone[];
    areas: Area[];
    branches: Branch[];
}

export default function LoanApplicationsPrint({ loans, filters, zones, areas, branches }: Props) {
    useEffect(() => {
        // Auto print when page loads, with small delay to ensure content is rendered
        const timer = setTimeout(() => {
            window.print();
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    const statusLabels: Record<string, string> = {
        draft: 'খসড়া',
        submitted: 'জমা',
        under_review: 'পর্যালোচনায়',
        pending_head_office: 'হেড অফিসে',
        approved: 'অনুমোদিত',
        rejected: 'প্রত্যাখ্যাত',
        needs_revision: 'সংশোধন',
        disbursed: 'বিতরণকৃত',
    };

    const getStatusLabel = (status: string) => {
        return statusLabels[status] || status;
    };

    const formatAmount = (amount: number | string | null | undefined) => {
        if (!amount || Number(amount) === 0) return '—';
        return `৳${Number(amount).toLocaleString('bn-BD')}`;
    };

    // Calculate General Savings and % of requested loan
    const formatGeneralSavings = (loan: LoanApplication) => {
        let general = loan.savings_general;
        if (general === undefined || general === null) {
            // fallback extraction
            const bp = typeof loan.business_plan === 'object' && loan.business_plan !== null ? loan.business_plan : {};
            const ai = typeof loan.asset_info === 'object' && loan.asset_info !== null ? loan.asset_info : {};
            general = Number(bp.general_savings_amount ?? ai.general_savings_amount ?? ai.savings_amount ?? loan.savings_amount ?? 0);
        }

        const requested = Number(loan.requested_amount || 0);
        if (general <= 0) return '—';

        const percent = requested > 0 ? ((general / requested) * 100).toFixed(1).replace(/\.0$/, '') : '0';
        return `৳${Number(general).toLocaleString('bn-BD')} (${percent}%)`;
    };

    // Calculate Total Savings
    const formatTotalSavings = (loan: LoanApplication) => {
        let total = loan.savings_total;
        if (total === undefined || total === null) {
            // fallback extraction
            const bp = typeof loan.business_plan === 'object' && loan.business_plan !== null ? loan.business_plan : {};
            const ai = typeof loan.asset_info === 'object' && loan.asset_info !== null ? loan.asset_info : {};
            const general = Number(bp.general_savings_amount ?? ai.general_savings_amount ?? ai.savings_amount ?? loan.savings_amount ?? 0);
            const other = Number(
                (!emptyCheck(bp.is_against_savings) ? (bp.against_savings_amount ?? 0) : 0) +
                (!emptyCheck(ai.is_against_savings) ? (ai.against_savings_amount ?? 0) : 0)
            );
            total = general + other;
        }

        if (!total || Number(total) === 0) return '—';
        return `৳${Number(total).toLocaleString('bn-BD')}`;
    };

    const emptyCheck = (v: any) => v === true || v === 'true' || v === 1 || v === '1';

    const selectedZone = filters.zone_id ? zones.find((z) => z.id === filters.zone_id) : null;
    const selectedArea = filters.area_id ? areas.find((a) => a.id === filters.area_id) : null;
    const selectedBranch = filters.branch_id ? branches.find((b) => b.id === filters.branch_id) : null;

    // হেডারে ফিল্টার অনুযায়ী দেখান: ব্রাঞ্চ সিলেক্ট থাকলে সেই শাখা (ও তার অঞ্চল/জোন), অন্যথায় অঞ্চল/জোন ফিল্টার বা "সকল"
    const branchName = selectedBranch
        ? selectedBranch.name
        : selectedArea
        ? 'সকল শাখা (অঞ্চল)'
        : selectedZone
        ? 'সকল শাখা (জোন)'
        : 'সকল শাখা';
    const areaName = selectedBranch?.area?.name ?? (selectedArea ? selectedArea.name : selectedZone ? 'সকল অঞ্চল' : 'সকল অঞ্চল');
    const zoneName = selectedBranch?.area?.zone?.name ?? (selectedZone ? selectedZone.name : 'সকল জোন');
    const reportDate =
        filters.date_from && filters.date_to
            ? `${formatDate(filters.date_from)} - ${formatDate(filters.date_to)}`
            : filters.date_to
            ? formatDate(filters.date_to)
            : formatDate(new Date());

    return (
        <>
            <Head title="ঋণ আবেদন যাচাই ও অনুমোদন সংক্রান্ত তথ্য - প্রিন্ট">
                <style>{`
                    @page {
                        size: A4 landscape;
                        margin: 8mm 8mm;
                    }

                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }

                    body {
                        font-family: 'SolaimanLipi', 'Kalpurush', 'Calibri', 'Arial', sans-serif;
                        font-size: 8.5px;
                        line-height: 1.3;
                        color: #000;
                        print-color-adjust: exact;
                        -webkit-print-color-adjust: exact;
                    }

                    .print-container {
                        width: 100%;
                        max-width: 100%;
                    }

                    /* Header Styles - matching AdmissionMembersPrint */
                    .print-header {
                        text-align: center;
                        margin-bottom: 6px;
                        padding-bottom: 4px;
                    }

                    .print-header .org {
                        font-size: 14px;
                        font-weight: bold;
                        margin-bottom: 2px;
                    }

                    .print-header .address {
                        font-size: 10px;
                        margin-bottom: 4px;
                    }

                    .print-header .title {
                        font-size: 12px;
                        font-weight: bold;
                        margin-bottom: 6px;
                        text-decoration: underline;
                    }

                    .header-filter-table {
                        width: auto;
                        margin: 6px auto 0;
                        border: none;
                        font-size: 9px;
                    }

                    .header-filter-table td {
                        border: none;
                        padding: 1px 8px 1px 2px;
                        vertical-align: middle;
                    }

                    .header-filter-label {
                        font-weight: 600;
                        color: #374151;
                        white-space: nowrap;
                    }

                    .header-filter-value {
                        max-width: 150px;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    }

                    /* Table Styles */
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 4px;
                    }

                    thead {
                        display: table-header-group;
                    }

                    tbody {
                        display: table-row-group;
                    }

                    th, td {
                        border: 0.5px solid #333;
                        padding: 3.5px 3px;
                        text-align: center;
                        vertical-align: middle;
                        word-wrap: break-word;
                        overflow-wrap: break-word;
                    }

                    th {
                        background-color: #e5e7eb;
                        font-weight: bold;
                        font-size: 8.5px;
                        text-align: center;
                    }

                    td {
                        font-size: 8px;
                    }

                    /* Column widths - optimized for landscape A4 with both general and total savings */
                    .col-sl { width: 3%; text-align: center; }
                    .col-member-no { width: 8%; font-family: monospace; font-weight: bold; }
                    .col-member-name { width: 12%; text-align: left; }
                    .col-mobile { width: 7.5%; text-align: center; }
                    .col-branch { width: 8.5%; text-align: left; }
                    .col-samity { width: 8.5%; text-align: left; }
                    .col-product { width: 11%; text-align: left; }
                    .col-requested { width: 9%; text-align: right; font-weight: bold; }
                    .col-gen-savings { width: 10.5%; text-align: center; font-weight: 600; }
                    .col-tot-savings { width: 8%; text-align: right; font-weight: 600; }
                    .col-approved { width: 8.5%; text-align: right; }
                    .col-status { width: 6.5%; text-align: center; }
                    .col-date { width: 7.5%; text-align: center; }

                    /* Status Colors */
                    .status-approved {
                        color: #059669;
                        font-weight: bold;
                    }

                    .status-disbursed {
                        color: #10b981;
                        font-weight: bold;
                    }

                    .status-rejected {
                        color: #dc2626;
                        font-weight: bold;
                    }

                    .status-pending, .status-under_review, .status-pending_head_office {
                        color: #d97706;
                        font-weight: 600;
                    }

                    /* Print-specific rules */
                    @media print {
                        body {
                            print-color-adjust: exact;
                            -webkit-print-color-adjust: exact;
                        }

                        table {
                            page-break-inside: auto;
                        }

                        tr {
                            page-break-inside: avoid;
                            page-break-after: auto;
                        }

                        thead {
                            display: table-header-group;
                        }
                    }
                `}</style>
            </Head>

            <div className="print-container">
                {/* হেডার - ফিল্টার অনুযায়ী শাখা/অঞ্চল/জোন */}
                <div className="print-header">
                    <p className="org">মৌসুমী</p>
                    <p className="address">উকিলপাড়া, নওগাঁ।</p>
                    <p className="title">ঋণ আবেদন যাচাই ও অনুমোদন সংক্রান্ত তথ্য।</p>
                    <table className="header-filter-table">
                        <tbody>
                            <tr>
                                <td className="header-filter-label">শাখার নাম:</td>
                                <td className="header-filter-value">{branchName}</td>
                                <td className="header-filter-label">অঞ্চলের নাম:</td>
                                <td className="header-filter-value">{areaName}</td>
                                <td className="header-filter-label">জোনের নাম:</td>
                                <td className="header-filter-value">{zoneName}</td>
                                <td className="header-filter-label">তারিখ:</td>
                                <td className="header-filter-value">{reportDate}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Main Table */}
                <table>
                    <thead>
                        <tr>
                            <th className="col-sl">ক্র. নং</th>
                            <th className="col-member-no">সদস্য নং</th>
                            <th className="col-member-name">সদস্যের নাম</th>
                            <th className="col-mobile">মোবাইল</th>
                            <th className="col-branch">শাখা</th>
                            <th className="col-samity">সমিতি</th>
                            <th className="col-product">পণ্য ও ক্যাটাগরি</th>
                            <th className="col-requested">চাহিদাকৃত ঋণ</th>
                            <th className="col-gen-savings">সাধারণ সঞ্চয় (% সহ)</th>
                            <th className="col-tot-savings">মোট সঞ্চয়</th>
                            <th className="col-approved">অনুমোদিত ঋণ</th>
                            <th className="col-status">স্ট্যাটাস</th>
                            <th className="col-date">তারিখ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loans.length === 0 ? (
                            <tr>
                                <td colSpan={13} style={{ textAlign: 'center', padding: '12px' }}>
                                    কোনো ঋণ আবেদন পাওয়া যায়নি
                                </td>
                            </tr>
                        ) : (
                            loans.map((loan, index) => (
                                <tr key={loan.id}>
                                    <td className="col-sl">{index + 1}</td>
                                    <td className="col-member-no">
                                        {loan.member_admission?.application_no || loan.application_no}
                                    </td>
                                    <td className="col-member-name">
                                        <div style={{ fontWeight: 'bold' }}>
                                            <span>{loan.member_admission?.applicant_name_bn || loan.member_admission?.applicant_name_en || '—'}</span>
                                            {loan.member_admission?.is_legacy ? (
                                                <span style={{ fontSize: '7.5px', color: '#b45309', marginLeft: '4px', fontWeight: 'bold' }}>
                                                    (দফা: {loan.member_admission?.loan_dofa ?? loan.asset_info?.loan_round ?? 1})
                                                </span>
                                            ) : (
                                                <span style={{ fontSize: '7.5px', color: '#047857', marginLeft: '4px', fontWeight: 'bold' }}>
                                                    (নতুন)
                                                </span>
                                            )}
                                        </div>
                                        {loan.member_admission?.applicant_name_bn && loan.member_admission?.applicant_name_en && (
                                            <div style={{ fontSize: '7px', color: '#555' }}>
                                                {loan.member_admission.applicant_name_en}
                                            </div>
                                        )}
                                    </td>
                                    <td className="col-mobile">{loan.member_admission?.mobile_number || '—'}</td>
                                    <td className="col-branch">{loan.branch?.name || '—'}</td>
                                    <td className="col-samity">{loan.samity?.samity_name || '—'}</td>
                                    <td className="col-product">
                                        <div style={{ fontWeight: '600' }}>
                                            {loan.loan_product?.product_name_bn || loan.loan_product?.product_name || '—'}
                                        </div>
                                        {(loan.loan_category?.category_name_bn || loan.loan_category?.category_name) && (
                                            <div style={{ fontSize: '7px', color: '#555' }}>
                                                {loan.loan_category?.category_name_bn || loan.loan_category?.category_name}
                                            </div>
                                        )}
                                    </td>
                                    <td className="col-requested">{formatAmount(loan.requested_amount)}</td>
                                    <td className="col-gen-savings">
                                        {formatGeneralSavings(loan)}
                                    </td>
                                    <td className="col-tot-savings">
                                        {formatTotalSavings(loan)}
                                    </td>
                                    <td className="col-approved">{formatAmount(loan.approved_amount)}</td>
                                    <td className={`col-status status-${loan.status.replace('_', '')}`}>
                                        {getStatusLabel(loan.status)}
                                    </td>
                                    <td className="col-date">{formatDate(loan.submitted_at || loan.created_at)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </>
    );
}
