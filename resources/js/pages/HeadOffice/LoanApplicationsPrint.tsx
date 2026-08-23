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
    zone?: Zone;
}

interface Branch {
    id: number | string;
    name: string;
    code?: string;
    area_id?: number | string;
    area?: Area;
}

interface Samity {
    id: number;
    samity_name: string;
    samity_name_bn?: string;
    samity_code?: string;
    code?: string;
}

interface LoanProduct {
    id: number;
    product_name: string;
    product_name_bn?: string;
    duration_months?: number;
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
    project_name?: string | null;
}

interface UserRef {
    id: number;
    name: string;
}

interface ApprovalRecord {
    id: number;
    user?: UserRef;
    approved_at?: string;
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
    business_plan?: any;
    asset_info?: any;
    created_at: string;
    submitted_at: string | null;
    reviewed_at?: string | null;
    disbursed_at?: string | null;
    repayment_frequency?: string | null;
    loan_term_months?: number | null;
    number_of_installments?: number | null;
    purpose_of_loan?: string | null;
    project_name?: string | null;
    branch: Branch;
    samity?: Samity;
    loan_product?: LoanProduct;
    loan_category?: LoanCategory;
    member_admission?: MemberAdmission;
    submittedBy?: UserRef;
    reviewedBy?: UserRef;
    approvals?: ApprovalRecord[];
    legacy_member_snapshot?: any;
}

interface Filters {
    search?: string;
    status?: string;
    zone_id?: number | string;
    area_id?: number | string;
    branch_id?: number | string;
    date_from?: string;
    date_to?: string;
    had_issues?: string;
    printed?: string;
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

    const formatSamityNameWithCode = (samity?: Samity | null) => {
        if (!samity) return '—';
        const name = samity.samity_name_bn || samity.samity_name || '';
        const fullCode = String(samity.samity_code || samity.code || '').trim();
        const shortCode = fullCode.length > 4 ? fullCode.slice(-4) : fullCode;
        if (name && shortCode) {
            return `${name} (${shortCode})`;
        }
        return name || shortCode || '—';
    };

    const formatAmount = (amount: number | string | null | undefined) => {
        if (!amount || Number(amount) === 0) return '—';
        return Number(amount).toLocaleString('bn-BD');
    };

    const formatDurationBengali = (months?: number | null) => {
        if (!months || Number(months) <= 0) return '';
        const m = Number(months);
        if (m === 12) return '১ বছর';
        if (m === 24) return '২ বছর';
        if (m === 36) return '৩ বছর';
        if (m === 48) return '৪ বছর';
        if (m === 60) return '৫ বছর';
        return `${m} মাস`;
    };

    const getFrequencyBengali = (loan: LoanApplication) => {
        const freq = String(loan.repayment_frequency || '').toLowerCase().trim();
        if (freq === 'monthly' || freq === 'মাসিক') return 'মাসিক';
        if (freq === 'weekly' || freq === 'সাপ্তাহিক') return 'সাপ্তাহিক';
        if (freq === 'fortnightly' || freq === 'পাক্ষিক') return 'পাক্ষিক';
        if (freq === 'one_time' || freq === 'lump_sum' || freq === 'bullet' || freq === 'এককালীন') return 'এককালীন';

        const cat = String(loan.loan_category?.category_name_bn || loan.loan_category?.category_name || '').toLowerCase();
        if (cat.includes('মাসিক') || cat.includes('monthly')) return 'মাসিক';
        if (cat.includes('সাপ্তাহিক') || cat.includes('weekly')) return 'সাপ্তাহিক';
        if (cat.includes('সুফলন') || cat.includes('এককালীন')) return 'এককালীন';
        return '';
    };

    const formatLoanCategoryTerm = (loan: LoanApplication) => {
        const product = loan.loan_product?.product_name_bn || loan.loan_product?.product_name || '';
        const category = loan.loan_category?.category_name_bn || loan.loan_category?.category_name || '';

        // If product already contains duration / terms in its name (e.g. 'বুনিয়াদ সাপ্তাহিক (১ বছর মেয়াদী)')
        if (product && (product.includes('(') || product.includes('বছর') || product.includes('মাস') || product.includes('মেয়াদী'))) {
            return product;
        }

        if (category && (category.includes('(') || category.includes('বছর') || category.includes('মাস') || category.includes('মেয়াদী'))) {
            return category;
        }

        const name = product || category || 'ঋণ';
        const months = loan.loan_term_months || loan.loan_product?.duration_months;
        const durationStr = formatDurationBengali(months) || (loan.number_of_installments ? `${loan.number_of_installments} কিস্তি` : '');
        const freqStr = getFrequencyBengali(loan);

        const details = [durationStr, freqStr].filter(Boolean).join(' ');

        if (name && details) {
            return `${name} (${details})`;
        }
        return name || details || '—';
    };

    const getMemberName = (loan: LoanApplication) => {
        return (
            loan.member_admission?.applicant_name_bn ||
            loan.member_admission?.applicant_name_en ||
            loan.legacy_member_snapshot?.applicant_name_bn ||
            loan.legacy_member_snapshot?.applicant_name_en ||
            '—'
        );
    };

    const getDofa = (loan: LoanApplication) => {
        const bp = typeof loan.business_plan === 'object' && loan.business_plan !== null ? loan.business_plan : {};
        const ai = typeof loan.asset_info === 'object' && loan.asset_info !== null ? loan.asset_info : {};
        const snap = typeof loan.legacy_member_snapshot === 'object' && loan.legacy_member_snapshot !== null ? loan.legacy_member_snapshot : {};

        const dofaVal =
            loan.member_admission?.loan_dofa ??
            snap.loan_dofa ??
            ai.loan_round ??
            bp.loan_round ??
            ai.current_loan_round ??
            bp.current_loan_round;

        if (dofaVal !== undefined && dofaVal !== null && dofaVal !== '') {
            const num = Number(dofaVal);
            return isNaN(num) ? String(dofaVal) : num.toLocaleString('bn-BD');
        }

        const isLegacy = loan.member_admission?.is_legacy ?? (loan.legacy_member_snapshot != null);
        if (isLegacy) {
            return '১';
        }
        return '১';
    };

    const getMemberShortCode = (loan: LoanApplication) => {
        const code = String(loan.member_admission?.application_no || loan.application_no || '').trim();
        if (!code) return '—';
        return code.length > 5 ? code.slice(-5) : code;
    };

    const getMobile = (loan: LoanApplication) => {
        return loan.member_admission?.mobile_number || loan.legacy_member_snapshot?.mobile_number || '—';
    };

    const getGeneralSavings = (loan: LoanApplication) => {
        let general = loan.savings_general;
        if (general === undefined || general === null) {
            const bp = typeof loan.business_plan === 'object' && loan.business_plan !== null ? loan.business_plan : {};
            const ai = typeof loan.asset_info === 'object' && loan.asset_info !== null ? loan.asset_info : {};
            general = Number(bp.general_savings_amount ?? ai.general_savings_amount ?? null);
            if (general === null || isNaN(general) || general === 0) {
                general = Number(ai.savings_amount ?? loan.savings_amount ?? bp.savings_amount ?? 0);
            }
        }
        if (!general || Number(general) === 0) return '—';
        return Number(general).toLocaleString('bn-BD');
    };

    const getTotalSavings = (loan: LoanApplication) => {
        let total = loan.savings_total;
        if (total === undefined || total === null) {
            const bp = typeof loan.business_plan === 'object' && loan.business_plan !== null ? loan.business_plan : {};
            const ai = typeof loan.asset_info === 'object' && loan.asset_info !== null ? loan.asset_info : {};
            const general = Number(bp.general_savings_amount ?? ai.general_savings_amount ?? 0);
            const other = (Boolean(bp.is_against_savings) ? Number(bp.against_savings_amount || 0) : 0)
                + (Boolean(ai.is_against_savings) ? Number(ai.against_savings_amount || 0) : 0);
            const explicitTotal = Number(
                bp.savings_amount ??
                ai.savings_amount ??
                loan.savings_amount ??
                bp.total_savings ??
                ai.total_savings ??
                bp.movable_savings ??
                ai.movable_savings ??
                0
            );
            total = Math.max(explicitTotal || 0, (general || 0) + (other || 0));
        }
        if (!total || Number(total) === 0) return '—';
        return Number(total).toLocaleString('bn-BD');
    };

    const getLastRepaidLoanAmount = (loan: LoanApplication) => {
        const bp = typeof loan.business_plan === 'object' && loan.business_plan !== null ? loan.business_plan : {};
        const ai = typeof loan.asset_info === 'object' && loan.asset_info !== null ? loan.asset_info : {};
        const snap = typeof loan.legacy_member_snapshot === 'object' && loan.legacy_member_snapshot !== null
            ? loan.legacy_member_snapshot
            : {};

        const val =
            bp.last_repaid_loan_amount ??
            bp.principal_amount ??
            bp.previous_loan_amount ??
            bp.repaid_loan_amount ??
            ai.last_repaid_loan_amount ??
            ai.principal_amount ??
            ai.previous_loan_amount ??
            snap.last_repaid_loan_amount ??
            snap.principal_amount ??
            snap.previous_loan_amount ??
            (loan as any).principal_amount ??
            (loan as any).last_repaid_loan_amount ??
            (loan as any).previous_loan_amount;

        if (val === undefined || val === null || val === '' || Number(val) === 0) {
            return '—';
        }
        return Number(val).toLocaleString('bn-BD');
    };

    const getLoanTerm = (loan: LoanApplication) => {
        const months = loan.loan_term_months || loan.loan_product?.duration_months;
        if (months) return `${months} মাস`;
        if (loan.number_of_installments) return `${loan.number_of_installments} কিস্তি`;
        return '—';
    };

    const getProjectName = (loan: LoanApplication) => {
        const bp = typeof loan.business_plan === 'object' && loan.business_plan !== null ? loan.business_plan : {};
        return (
            loan.project_name ||
            loan.member_admission?.project_name ||
            bp.project_name ||
            bp.business_name ||
            loan.purpose_of_loan ||
            '—'
        );
    };

    const getApprovalDate = (loan: LoanApplication) => {
        if (loan.reviewed_at) return formatDate(loan.reviewed_at);
        const lastApproval = loan.approvals && loan.approvals.length > 0 ? loan.approvals[loan.approvals.length - 1] : null;
        if (lastApproval?.approved_at) return formatDate(lastApproval.approved_at);
        if (loan.status === 'approved' || loan.status === 'disbursed') {
            return formatDate(loan.submitted_at || loan.created_at);
        }
        return '—';
    };

    const getDisbursementDate = (loan: LoanApplication) => {
        if (loan.disbursed_at) return formatDate(loan.disbursed_at);
        if (loan.status === 'disbursed') return formatDate(loan.submitted_at || loan.created_at);
        return '—';
    };

    const getApproverName = (loan: LoanApplication) => {
        if (loan.reviewedBy?.name) return loan.reviewedBy.name;
        const lastApproval = loan.approvals && loan.approvals.length > 0 ? loan.approvals[loan.approvals.length - 1] : null;
        if (lastApproval?.user?.name) return lastApproval.user.name;
        if (loan.submittedBy?.name && (loan.status === 'approved' || loan.status === 'disbursed')) {
            return loan.submittedBy.name;
        }
        if (loan.status === 'approved' || loan.status === 'disbursed') return 'হেড অফিস';
        return '—';
    };

    const filterZoneId = filters.zone_id ? String(filters.zone_id) : '';
    const filterAreaId = filters.area_id ? String(filters.area_id) : '';
    const filterBranchId = filters.branch_id ? String(filters.branch_id) : '';

    const selectedBranch = filterBranchId
        ? branches.find((b) => String(b.id) === filterBranchId) || (loans.length > 0 && String(loans[0]?.branch?.id) === filterBranchId ? loans[0].branch : null)
        : null;

    const selectedArea = filterAreaId
        ? areas.find((a) => String(a.id) === filterAreaId) || (selectedBranch?.area ?? null)
        : (selectedBranch?.area ?? (selectedBranch?.area_id ? areas.find((a) => String(a.id) === String(selectedBranch.area_id)) : null));

    const selectedZone = filterZoneId
        ? zones.find((z) => String(z.id) === filterZoneId) || (selectedArea?.zone ?? selectedBranch?.area?.zone ?? null)
        : (selectedBranch?.area?.zone ?? selectedArea?.zone ?? (selectedArea?.zone_id ? zones.find((z) => String(z.id) === String(selectedArea.zone_id)) : null));

    const areaName = selectedArea ? selectedArea.name : 'সকল অঞ্চল';
    const zoneName = selectedZone ? selectedZone.name : 'সকল জোন';
    const fromDateStr = filters.date_from ? formatDate(filters.date_from) : '';
    const toDateStr = filters.date_to ? formatDate(filters.date_to) : '';
    const reportDate =
        fromDateStr && toDateStr
            ? (fromDateStr === toDateStr ? fromDateStr : `${fromDateStr} - ${toDateStr}`)
            : toDateStr || fromDateStr || formatDate(new Date());

    return (
        <>
            <Head title="ঋণ আবেদন যাচাই ও অনুমোদন সংক্রান্ত তথ্য - প্রিন্ট">
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
                    }

                    .print-container {
                        width: 100%;
                        max-width: 100%;
                    }

                    /* Header Styles */
                    .print-header {
                        text-align: center;
                        margin-bottom: 5px;
                        padding-bottom: 3px;
                    }

                    .print-header .org {
                        font-size: 13px;
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
                        font-size: 9.5px;
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
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 3px;
                    }

                    thead {
                        display: table-header-group;
                    }

                    tbody {
                        display: table-row-group;
                    }

                    th, td {
                        border: 0.5px solid #333;
                        padding: 3px 2px;
                        text-align: center;
                        vertical-align: middle;
                        word-wrap: break-word;
                        overflow-wrap: break-word;
                        line-height: 1.2;
                    }

                    th {
                        background-color: #e5e7eb;
                        font-weight: bold;
                        font-size: 8px;
                        text-align: center !important;
                        vertical-align: middle;
                    }

                    td {
                        font-size: 7.5px;
                    }

                    /* Column widths - 18 columns for A4 Landscape */
                    .col-sl { width: 2.2%; }
                    .col-branch { width: 5.5%; }
                    .col-type { width: 8.3%; }
                    .col-samity { width: 6.5%; }
                    .col-member-name { width: 7.5%; }
                    .col-dofa { width: 2.5%; }
                    .col-member-code { width: 4.5%; }
                    .col-mobile { width: 5.5%; }
                    .col-savings-general { width: 4.5%; }
                    .col-savings-total { width: 4.5%; }
                    .col-requested { width: 6%; }
                    .col-approved { width: 5.5%; }
                    .col-term { width: 4%; }
                    .col-project { width: 6.5%; }
                    .col-approval-date { width: 5.5%; }
                    .col-disburse-date { width: 5.5%; }
                    .col-approver { width: 7%; }
                    .col-remarks { width: 13%; }

                    td.col-sl { text-align: center; }
                    td.col-branch { text-align: left; }
                    td.col-type { text-align: left; }
                    td.col-samity { text-align: left; }
                    td.col-member-name { text-align: left; }
                    td.col-dofa { text-align: center; font-weight: bold; }
                    td.col-member-code { text-align: center; font-family: monospace; font-weight: bold; font-size: 7px; }
                    td.col-mobile { text-align: center; font-size: 7px; }
                    td.col-savings-general { text-align: right; }
                    td.col-savings-total { text-align: right; font-weight: 600; }
                    td.col-requested { text-align: right; font-weight: bold; }
                    td.col-approved { text-align: right; font-weight: bold; }
                    td.col-term { text-align: center; }
                    td.col-project { text-align: left; }
                    td.col-approval-date { text-align: center; font-size: 7px; }
                    td.col-disburse-date { text-align: center; font-size: 7px; }
                    td.col-approver { text-align: center; }
                    td.col-remarks { text-align: center; }

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
                {/* হেডার - উপরে বামে লোগো, মাঝে টাইটেল ও তথ্য */}
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
                            <p className="title">ঋণ আবেদন যাচাই ও অনুমোদন সংক্রান্ত তথ্য।</p>
                        </div>
                    </div>
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
                        </tbody>
                    </table>
                </div>

                {/* Main Table - 18 Columns */}
                <table>
                    <thead>
                        <tr>
                            <th className="col-sl">ক্র. নং</th>
                            <th className="col-branch">শাখার নাম</th>
                            <th className="col-type">ঋণের ধরন</th>
                            <th className="col-samity">সমিতির নাম (কোড)</th>
                            <th className="col-member-name">সদস্যের নাম</th>
                            <th className="col-dofa">দফা</th>
                            <th className="col-member-code">সদস্য কোড</th>
                            <th className="col-mobile">মোবাইল নাম্বার</th>
                            <th className="col-savings-general">সাধারণ সঞ্চয়</th>
                            <th className="col-savings-total">মোট সঞ্চয়</th>
                            <th className="col-requested">সর্বশেষ পরিশোধিত ঋণ</th>
                            <th className="col-approved">অনুমোদিত ঋণের পরিমাণ</th>
                            <th className="col-term">ঋণের মেয়াদ</th>
                            <th className="col-project">প্রকল্পের নাম</th>
                            <th className="col-approval-date">অনুমোদনের তারিখ</th>
                            <th className="col-disburse-date">বিতরনের তারিখ</th>
                            <th className="col-approver">অনুমোদন কর্মকর্তার নাম</th>
                            <th className="col-remarks">মন্তব্য</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loans.length === 0 ? (
                            <tr>
                                <td colSpan={18} style={{ textAlign: 'center', padding: '12px' }}>
                                    কোনো ঋণ আবেদন পাওয়া যায়নি
                                </td>
                            </tr>
                        ) : (
                            loans.map((loan, index) => {
                                return (
                                    <tr key={loan.id}>
                                        <td className="col-sl">{index + 1}</td>
                                        <td className="col-branch">{loan.branch?.name || '—'}</td>
                                        <td className="col-type">{formatLoanCategoryTerm(loan)}</td>
                                        <td className="col-samity">{formatSamityNameWithCode(loan.samity)}</td>
                                        <td className="col-member-name">
                                            <span style={{ fontWeight: 'bold' }}>{getMemberName(loan)}</span>
                                        </td>
                                        <td className="col-dofa">{getDofa(loan)}</td>
                                        <td className="col-member-code">{getMemberShortCode(loan)}</td>
                                        <td className="col-mobile">{getMobile(loan)}</td>
                                        <td className="col-savings-general">{getGeneralSavings(loan)}</td>
                                        <td className="col-savings-total">{getTotalSavings(loan)}</td>
                                        <td className="col-requested">{getLastRepaidLoanAmount(loan)}</td>
                                        <td className="col-approved">{loan.approved_amount ? formatAmount(loan.approved_amount) : '—'}</td>
                                        <td className="col-term">{getLoanTerm(loan)}</td>
                                        <td className="col-project">{getProjectName(loan)}</td>
                                        <td className="col-approval-date">{getApprovalDate(loan)}</td>
                                        <td className="col-disburse-date">{getDisbursementDate(loan)}</td>
                                        <td className="col-approver">{getApproverName(loan)}</td>
                                        <td className="col-remarks"></td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </>
    );
}
