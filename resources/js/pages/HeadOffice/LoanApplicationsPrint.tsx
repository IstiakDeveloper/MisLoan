import { Head } from '@inertiajs/react';
import { useEffect } from 'react';

interface Branch {
    id: number;
    name: string;
    area?: {
        id: number;
        name: string;
        zone?: {
            id: number;
            name: string;
        };
    };
}

interface LoanProduct {
    id: number;
    product_name: string;
    product_name_bn: string;
}

interface LoanCategory {
    id: number;
    category_name: string;
    category_name_bn: string;
}

interface MemberAdmission {
    id: number;
    applicant_name_en: string;
    applicant_name_bn: string | null;
    mobile_number: string | null;
    nid_number: string | null;
    application_no: string;
}

interface LoanApplication {
    id: number;
    application_no: string;
    status: string;
    requested_amount: number;
    approved_amount: number | null;
    created_at: string;
    submitted_at: string | null;
    branch: Branch;
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

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            draft: 'Draft',
            submitted: 'Submitted',
            under_review: 'Under Review',
            pending_head_office: 'Pending HO',
            approved: 'Approved',
            rejected: 'Rejected',
            disbursed: 'Disbursed',
        };
        return labels[status] || status;
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '-';
        try {
            return new Date(dateString).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
            });
        } catch {
            return '-';
        }
    };

    const formatDateTime = (dateString: string | null) => {
        if (!dateString) return '-';
        try {
            return new Date(dateString).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
            });
        } catch {
            return '-';
        }
    };

    const formatAmount = (amount: number | null) => {
        if (!amount) return '-';
        return `৳${amount.toLocaleString('en-BD')}`;
    };

    const selectedZone = filters.zone_id ? zones.find(z => z.id === filters.zone_id) : null;
    const selectedArea = filters.area_id ? areas.find(a => a.id === filters.area_id) : null;
    const selectedBranch = filters.branch_id ? branches.find(b => b.id === filters.branch_id) : null;

    return (
        <>
            <Head title="Print Loan Applications">
                <style>{`
                    @page {
                        size: A4 landscape;
                        margin: 8mm 10mm;
                    }

                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }

                    body {
                        font-family: 'Arial', 'Calibri', sans-serif;
                        font-size: 8px;
                        line-height: 1.3;
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
                        margin-bottom: 6px;
                        border-bottom: 2px solid #000;
                        padding-bottom: 4px;
                    }

                    .print-header h1 {
                        font-size: 13px;
                        margin-bottom: 2px;
                        font-weight: bold;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }

                    .print-header h2 {
                        font-size: 10px;
                        margin-bottom: 2px;
                        font-weight: 600;
                    }

                    .filter-info {
                        font-size: 7.5px;
                        margin: 2px 0;
                        text-align: left;
                        display: flex;
                        flex-wrap: wrap;
                        gap: 8px;
                    }

                    .filter-info > div {
                        display: inline-block;
                    }

                    .filter-info strong {
                        font-weight: bold;
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
                        padding: 2px 3px;
                        text-align: left;
                        vertical-align: middle;
                        word-wrap: break-word;
                        overflow-wrap: break-word;
                    }

                    th {
                        background-color: #d9d9d9;
                        font-weight: bold;
                        font-size: 8px;
                        text-align: center;
                        padding: 3px 2px;
                    }

                    td {
                        font-size: 7.5px;
                    }

                    /* Column widths - optimized for landscape A4 */
                    th:nth-child(1), td:nth-child(1) { width: 4%; text-align: center; }  /* SL */
                    th:nth-child(2), td:nth-child(2) { width: 9%; }                       /* App No */
                    th:nth-child(3), td:nth-child(3) { width: 12%; }                      /* Applicant Name */
                    th:nth-child(4), td:nth-child(4) { width: 7%; text-align: center; }   /* Mobile */
                    th:nth-child(5), td:nth-child(5) { width: 10%; }                      /* Branch */
                    th:nth-child(6), td:nth-child(6) { width: 12%; }                       /* Product */
                    th:nth-child(7), td:nth-child(7) { width: 10%; }                       /* Category */
                    th:nth-child(8), td:nth-child(8) { width: 9%; text-align: right; }    /* Requested Amount */
                    th:nth-child(9), td:nth-child(9) { width: 9%; text-align: right; }    /* Approved Amount */
                    th:nth-child(10), td:nth-child(10) { width: 8%; text-align: center; } /* Status */
                    th:nth-child(11), td:nth-child(11) { width: 10%; text-align: center; } /* Submitted Date */

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

                    .status-draft {
                        color: #6b7280;
                    }

                    /* Footer Styles */
                    .print-footer {
                        margin-top: 6px;
                        padding-top: 3px;
                        border-top: 1px solid #333;
                        font-size: 6.5px;
                        text-align: center;
                        display: flex;
                        justify-content: space-between;
                    }

                    .print-footer div {
                        flex: 1;
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

                        tfoot {
                            display: table-footer-group;
                        }
                    }
                `}</style>
            </Head>

            <div className="print-container">
                {/* Header Section */}
                <div className="print-header">
                    <h1>Loan Application Report</h1>
                    <h2>Head Office - Complete List</h2>

                    {/* Filter Information */}
                    <div className="filter-info">
                        {selectedZone && (
                            <div>
                                <strong>Zone:</strong> {selectedZone.name}
                            </div>
                        )}
                        {selectedArea && (
                            <div>
                                <strong>Area:</strong> {selectedArea.name}
                            </div>
                        )}
                        {selectedBranch && (
                            <div>
                                <strong>Branch:</strong> {selectedBranch.name}
                            </div>
                        )}
                        {filters.status && (
                            <div>
                                <strong>Status:</strong> {getStatusLabel(filters.status)}
                            </div>
                        )}
                        {filters.date_from && filters.date_to && (
                            <div>
                                <strong>Date Range:</strong> {formatDate(filters.date_from)} to {formatDate(filters.date_to)}
                            </div>
                        )}
                        {filters.had_issues && (
                            <div>
                                <strong>Had Issues:</strong> {filters.had_issues === 'yes' ? 'Yes' : 'No'}
                            </div>
                        )}
                        {filters.search && (
                            <div>
                                <strong>Search:</strong> {filters.search}
                            </div>
                        )}
                        <div>
                            <strong>Total Records:</strong> {loans.length}
                        </div>
                        <div>
                            <strong>Printed:</strong> {formatDateTime(new Date().toISOString())}
                        </div>
                    </div>
                </div>

                {/* Main Table */}
                <table>
                    <thead>
                        <tr>
                            <th>SL</th>
                            <th>App No</th>
                            <th>Applicant Name</th>
                            <th>Mobile</th>
                            <th>Branch</th>
                            <th>Product</th>
                            <th>Category</th>
                            <th>Requested Amount</th>
                            <th>Approved Amount</th>
                            <th>Status</th>
                            <th>Submitted Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loans.map((loan, index) => (
                            <tr key={loan.id}>
                                <td>{index + 1}</td>
                                <td>{loan.application_no}</td>
                                <td>
                                    {loan.member_admission?.applicant_name_en || '-'}
                                    {loan.member_admission?.applicant_name_bn && (
                                        <div style={{ fontSize: '7px', color: '#666' }}>
                                            ({loan.member_admission.applicant_name_bn})
                                        </div>
                                    )}
                                </td>
                                <td>{loan.member_admission?.mobile_number || '-'}</td>
                                <td>{loan.branch?.name || '-'}</td>
                                <td>
                                    {loan.loan_product?.product_name_bn || loan.loan_product?.product_name || '-'}
                                </td>
                                <td>
                                    {loan.loan_category?.category_name_bn || loan.loan_category?.category_name || '-'}
                                </td>
                                <td>{formatAmount(loan.requested_amount)}</td>
                                <td>{formatAmount(loan.approved_amount)}</td>
                                <td className={`status-${loan.status.replace('_', '')}`}>
                                    {getStatusLabel(loan.status)}
                                </td>
                                <td>{formatDate(loan.submitted_at || loan.created_at)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Footer Section */}
                <div className="print-footer">
                    <div style={{ textAlign: 'left' }}>
                        Generated by: MIS Loan System
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        Page: ___ of ___
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        Date: {new Date().toLocaleDateString('en-GB')}
                    </div>
                </div>
            </div>
        </>
    );
}
