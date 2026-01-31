import React from 'react';
import AdminLayout from '@/layouts/admin-layout';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Download, FileText, Building2, User, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';

interface LoanMember {
    id: number;
    serial_no: string;
    member_name: string;
    somiti_name?: string;
    somiti_code?: string;
    member_code?: string;
    member_mobile?: string;
    general_member?: boolean;
    total_member?: number;
    principal_amount?: number;
    paid_installment_count?: number;
    approved_loan_amount?: number;
    installment_increment_rate?: number;
    loan_duration?: number;
    phase_no?: number;
    project_name?: string;
    loan_release_or_approval_date?: string;
    loan_distribution_date?: string;
    approved_by?: string;
    remarks?: string;
    status?: string;
}

interface Branch {
    id: number;
    name: string;
    code: string;
}

interface User {
    id: number;
    name: string;
    email: string;
}

interface LoanApplication {
    id: number;
    application_no: string;
    branch_id: number;
    branch: Branch;
    submitted_by: number;
    submittedBy: User;
    reviewed_by?: number;
    reviewedBy?: User;
    excel_file_path: string;
    excel_file_name: string;
    total_members: number;
    status: 'pending' | 'approved' | 'rejected';
    submitted_at: string;
    reviewed_at?: string;
    branch_remarks?: string;
    hq_remarks?: string;
    loan_members: LoanMember[];
    created_at: string;
    updated_at: string;
}

interface Props {
    application: LoanApplication;
}

const statusConfig = {
    pending: { label: 'Pending', icon: Clock, color: 'text-yellow-700 bg-yellow-100 border-yellow-200' },
    approved: { label: 'Approved', icon: CheckCircle, color: 'text-green-700 bg-green-100 border-green-200' },
    rejected: { label: 'Rejected', icon: XCircle, color: 'text-red-700 bg-red-100 border-red-200' },
};

export default function Show({ application }: Props) {
    const getStatusBadge = (status: string) => {
        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
        const Icon = config.icon;
        return (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${config.color}`}>
                <Icon size={14} />
                {config.label}
            </span>
        );
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('en-GB');
        } catch {
            return dateString;
        }
    };

    const formatCurrency = (amount: string | number) => {
        const num = typeof amount === 'string' ? parseFloat(amount) : amount;
        return new Intl.NumberFormat('en-BD', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(num);
    };

    const totalLoanAmount = application.loan_members.reduce((sum, member) => {
        return sum + (member.approved_loan_amount || 0);
    }, 0);

    return (
        <AdminLayout>
            <Head title={`Loan Application - ${application.application_no}`} />

            {/* Header */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/loan"
                            className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            <ArrowLeft size={20} className="text-gray-600" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-1">Loan Application Details</h1>
                            <p className="text-gray-600">Application No: {application.application_no}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {getStatusBadge(application.status)}
                        <a
                            href={`/storage/${application.excel_file_path}`}
                            download={application.excel_file_name}
                            target="_blank"
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            <Download size={18} />
                            Download Excel
                        </a>
                    </div>
                </div>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow-sm p-4">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                            <Building2 size={20} className="text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Branch</p>
                            <p className="font-semibold text-gray-900">{application.branch.name}</p>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500">Code: {application.branch.code}</p>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-4">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                            <User size={20} className="text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Submitted By</p>
                            <p className="font-semibold text-gray-900">{application.submittedBy?.name || 'N/A'}</p>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500">{application.submittedBy?.email || '-'}</p>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-4">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                            <FileText size={20} className="text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Total Members</p>
                            <p className="font-semibold text-gray-900">{application.total_members}</p>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500">Loan applicants</p>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-4">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                            <Calendar size={20} className="text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Submitted Date</p>
                            <p className="font-semibold text-gray-900">{formatDate(application.submitted_at)}</p>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500">Total Amount: ৳{formatCurrency(totalLoanAmount)}</p>
                </div>
            </div>

            {/* Remarks */}
            {(application.branch_remarks || application.hq_remarks) && (
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Remarks</h2>
                    <div className="space-y-4">
                        {application.branch_remarks && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-sm font-medium text-blue-900 mb-1">Branch Remarks:</p>
                                <p className="text-sm text-blue-800">{application.branch_remarks}</p>
                            </div>
                        )}
                        {application.hq_remarks && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <p className="text-sm font-medium text-green-900 mb-1">HQ Remarks:</p>
                                <p className="text-sm text-green-800">{application.hq_remarks}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Loan Members Table */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Loan Members ({application.loan_members.length})</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Serial</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Member Name</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Father Name</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Village</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Mobile</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Committee</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Loan Amount</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Duration</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Purpose</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Installment</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Approved By</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Approval Date</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Guarantor</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Disbursement</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {application.loan_members.length === 0 ? (
                                <tr>
                                    <td colSpan={14} className="px-6 py-12 text-center">
                                        <FileText size={48} className="mx-auto text-gray-400 mb-4" />
                                        <p className="text-gray-600">No loan members found</p>
                                    </td>
                                </tr>
                            ) : (
                                application.loan_members.map((member) => (
                                    <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{member.serial_no}</td>
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{member.member_name}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700">{member.somiti_name || '-'}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700">{member.member_code || '-'}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700">{member.member_mobile || '-'}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700">{member.project_name || '-'}</td>
                                        <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">
                                            ৳{formatCurrency(member.approved_loan_amount || 0)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-center text-gray-700">
                                            {member.loan_duration ? `${member.loan_duration}` : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700">{member.phase_no || '-'}</td>
                                        <td className="px-4 py-3 text-sm text-right text-gray-700">
                                            {member.loan_distribution_date ? new Date(member.loan_distribution_date).toLocaleDateString('bn-BD') : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            {member.approved_by ? (
                                                <div>
                                                    <p className="font-medium text-gray-900">{member.approved_by_name}</p>
                                                    {member.approved_by_designation && (
                                                        <p className="text-xs text-gray-500">{member.approved_by_designation}</p>
                                                    )}
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700">{member.approval_date || '-'}</td>
                                        <td className="px-4 py-3 text-sm">
                                            {member.guarantor_name ? (
                                                <div>
                                                    <p className="font-medium text-gray-900">{member.guarantor_name}</p>
                                                    {member.guarantor_relation && (
                                                        <p className="text-xs text-gray-500">({member.guarantor_relation})</p>
                                                    )}
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700">{member.disbursement_date || '-'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AdminLayout>
    );
}
