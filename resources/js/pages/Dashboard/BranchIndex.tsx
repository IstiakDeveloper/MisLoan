import React from 'react';
import AdminLayout from '@/layouts/admin-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Building2, FileSpreadsheet, Clock, CheckCircle, XCircle, AlertCircle, TrendingUp, Calendar, User, DollarSign } from 'lucide-react';

interface Branch {
    id: number;
    name: string;
    code: string;
    area: {
        name: string;
        zone: {
            name: string;
        };
    };
}

interface LoanApplication {
    id: number;
    application_no: string;
    branch: {
        id: number;
        name: string;
    };
    submitted_by: {
        id: number;
        name: string;
    };
    member_admission?: {
        member_name_bn: string;
    };
    status: string;
    requested_amount: number;
    submitted_at: string;
}

interface Props {
    stats: {
        my_branches: number;
        total_applications: number;
        pending_applications: number;
        approved_applications: number;
        rejected_applications: number;
        under_review_applications: number;
        total_loan_amount: number;
    };
    recentApplications: LoanApplication[];
    accessibleData: {
        branches: Branch[];
    };
    dashboardType: string;
}

const statusConfig = {
    pending: { label: 'Pending', icon: Clock, color: 'text-yellow-700 bg-yellow-100 border-yellow-200' },
    under_review: { label: 'Under Review', icon: AlertCircle, color: 'text-blue-700 bg-blue-100 border-blue-200' },
    approved: { label: 'Approved', icon: CheckCircle, color: 'text-green-700 bg-green-100 border-green-200' },
    rejected: { label: 'Rejected', icon: XCircle, color: 'text-red-700 bg-red-100 border-red-200' },
    needs_correction: { label: 'Needs Correction', icon: AlertCircle, color: 'text-orange-700 bg-orange-100 border-orange-200' },
};

export default function BranchDashboard({ stats, recentApplications, accessibleData }: Props) {
    const getStatusBadge = (status: string) => {
        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
        const Icon = config.icon;
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.color}`}>
                <Icon size={12} />
                {config.label}
            </span>
        );
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-BD', {
            style: 'currency',
            currency: 'BDT',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <AdminLayout>
            <Head title="Branch Dashboard" />

            {/* Welcome Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 mb-6 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold mb-2">Branch Dashboard</h1>
                        <p className="text-blue-100">
                            Managing {stats.my_branches} {stats.my_branches === 1 ? 'Branch' : 'Branches'}
                        </p>
                    </div>
                    <Link
                        href="/loan/upload"
                        className="px-4 py-2 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
                    >
                        Upload New Application
                    </Link>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            <FileSpreadsheet size={24} className="text-blue-600" />
                        </div>
                        <TrendingUp className="text-blue-500" size={20} />
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{stats.total_applications}</p>
                    <p className="text-sm text-gray-600 mt-1">Total Applications</p>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-yellow-500">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                            <Clock size={24} className="text-yellow-600" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{stats.pending_applications}</p>
                    <p className="text-sm text-gray-600 mt-1">Pending Review</p>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                            <CheckCircle size={24} className="text-green-600" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{stats.approved_applications}</p>
                    <p className="text-sm text-gray-600 mt-1">Approved</p>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-purple-500">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                            <DollarSign size={24} className="text-purple-600" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.total_loan_amount)}</p>
                    <p className="text-sm text-gray-600 mt-1">Total Approved Amount</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Applications */}
                <div className="lg:col-span-2 bg-white rounded-lg shadow-sm">
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">Recent Loan Applications</h2>
                    </div>
                    <div className="p-6">
                        {recentApplications.length === 0 ? (
                            <div className="text-center py-8">
                                <FileSpreadsheet size={48} className="mx-auto text-gray-400 mb-3" />
                                <p className="text-gray-600 mb-3">No applications yet</p>
                                <Link
                                    href="/member/loan-applications/create"
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Create First Application
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {recentApplications.map((app) => (
                                    <Link
                                        key={app.id}
                                        href={`/member/loan-applications/${app.id}`}
                                        className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1">
                                                <p className="font-semibold text-gray-900">{app.application_no}</p>
                                                <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                                                    <span className="flex items-center gap-1">
                                                        <Building2 size={14} />
                                                        {app.branch.name}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <User size={14} />
                                                        {app.submitted_by.name}
                                                    </span>
                                                </div>
                                            </div>
                                            {getStatusBadge(app.status)}
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="flex items-center gap-1 text-gray-600">
                                                <DollarSign size={14} />
                                                ৳{app.requested_amount.toLocaleString()}
                                            </span>
                                            <span className="flex items-center gap-1 text-gray-500">
                                                <Calendar size={14} />
                                                {new Date(app.submitted_at).toLocaleDateString('en-GB')}
                                            </span>
                                        </div>
                                    </Link>
                                ))}
                                <Link
                                    href="/member/loan-applications"
                                    className="block text-center py-2 text-blue-600 hover:text-blue-700 font-medium"
                                >
                                    View All Applications →
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

                {/* My Branches */}
                <div className="bg-white rounded-lg shadow-sm">
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">My Branches</h2>
                    </div>
                    <div className="p-6">
                        {accessibleData.branches.length === 0 ? (
                            <p className="text-center text-gray-500 py-8">No branches assigned</p>
                        ) : (
                            <div className="space-y-3">
                                {accessibleData.branches.map((branch) => (
                                    <div
                                        key={branch.id}
                                        className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <Building2 size={20} className="text-blue-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-gray-900 truncate">{branch.name}</p>
                                                <p className="text-xs text-gray-500 mt-0.5">Code: {branch.code}</p>
                                                <p className="text-xs text-gray-600 mt-1">
                                                    {branch.area.name} • {branch.area.zone.name}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Stats Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                <div className="bg-white rounded-lg shadow-sm p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">{stats.under_review_applications}</p>
                    <p className="text-sm text-gray-600 mt-1">Under Review</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-4 text-center">
                    <p className="text-2xl font-bold text-red-600">{stats.rejected_applications}</p>
                    <p className="text-sm text-gray-600 mt-1">Rejected</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">
                        {stats.total_applications > 0
                            ? Math.round((stats.approved_applications / stats.total_applications) * 100)
                            : 0}%
                    </p>
                    <p className="text-sm text-gray-600 mt-1">Approval Rate</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-4 text-center">
                    <p className="text-2xl font-bold text-purple-600">{stats.my_branches}</p>
                    <p className="text-sm text-gray-600 mt-1">My Branches</p>
                </div>
            </div>
        </AdminLayout>
    );
}
