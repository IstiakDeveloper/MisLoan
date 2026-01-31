import React, { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import AdminLayout from '@/layouts/admin-layout';
import {
    Search,
    Calendar,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Clock,
    Send,
    Filter,
    Users,
    MessageSquare,
    Plus,
    Printer,
    X,
    Eye,
    Download,
} from 'lucide-react';

interface Issue {
    id: number;
    issue_type: string;
    issue_description: string;
    severity: string;
    status: string;
    created_at: string;
    resolution_notes?: string;
}

interface Member {
    id: number;
    serial_no?: number;
    loan_type?: string;
    somiti_name?: string;
    somiti_code?: string;
    member_name: string;
    member_code?: string;
    member_mobile?: string;
    mobile?: string; // alias
    general_savings?: number;
    total_savings?: number;
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
    status: string;
    application_no: string;
    branch_name?: string;
    zone_name?: string;
    area_name?: string;
    issues: Issue[];
}

interface Stats {
    total: number;
    pending: number;
    issue: number;
    approved: number;
    rejected: number;
}

interface Props {
    members: Member[];
    selectedDate: string;
    statusFilter: string;
    searchQuery: string;
    stats: Stats;
}

export default function LoanIndex({
    members: initialMembers,
    selectedDate,
    statusFilter,
    searchQuery,
    stats: initialStats,
}: Props) {
    const [currentDate, setCurrentDate] = useState(selectedDate);
    const [currentStatus, setCurrentStatus] = useState(statusFilter);
    const [search, setSearch] = useState(searchQuery);
    const [members, setMembers] = useState(initialMembers || []);
    const [stats, setStats] = useState<Stats>(initialStats || {
        total: 0,
        pending: 0,
        issue: 0,
        approved: 0,
        rejected: 0,
    });
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);
    const [viewMember, setViewMember] = useState<Member | null>(null);
    const [responseText, setResponseText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [flashMessage, setFlashMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

    // Auto-refresh every 3 seconds
    useEffect(() => {
        if (!autoRefreshEnabled) return;

        const interval = setInterval(async () => {
            try {
                const response = await axios.get('/loan/api/data', {
                    params: {
                        date: currentDate,
                        status: currentStatus,
                        search,
                    }
                });
                if (response.data.members) {
                    setMembers(response.data.members);
                    setStats(response.data.stats);
                }
            } catch (error) {
                console.error('Auto refresh error:', error);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [currentDate, currentStatus, search, autoRefreshEnabled]);

    const showFlash = (type: 'success' | 'error', message: string) => {
        setFlashMessage({ type, message });
        setTimeout(() => setFlashMessage(null), 5000);
    };

    const handleDateChange = (newDate: string) => {
        setCurrentDate(newDate);
        router.visit('/loan', {
            data: { date: newDate, status: currentStatus, search },
            preserveScroll: true,
        });
    };

    const handleStatusChange = (newStatus: string) => {
        setCurrentStatus(newStatus);
        router.visit('/loan', {
            data: { date: currentDate, status: newStatus, search },
            preserveScroll: true,
        });
    };

    const handleSearch = () => {
        router.visit('/loan', {
            data: { date: currentDate, status: currentStatus, search },
            preserveScroll: true,
        });
    };

    const handleMemberClick = (member: Member) => {
        setSelectedMember(member);
        setResponseText('');
    };

    const handleSubmitResponse = (action: 'resolve' | 'reject') => {
        if (!selectedMember || !responseText.trim()) {
            showFlash('error', 'Please enter a reason');
            return;
        }

        setIsSubmitting(true);

        const endpoint = action === 'resolve'
            ? `/loan/member/${selectedMember.id}/resolve-issue`
            : `/loan/member/${selectedMember.id}/reject-issue`;

        axios.post(endpoint, { response: responseText })
            .then((response) => {
                if (response.data.success) {
                    showFlash('success', action === 'resolve' ? 'Response submitted successfully' : 'Rejected successfully');
                    setSelectedMember(null);
                    setResponseText('');
                    setAutoRefreshEnabled(true);
                    // Auto-refresh will handle the update
                } else {
                    showFlash('error', response.data.message);
                }
            })
            .catch((error) => {
                showFlash('error', error.response?.data?.message || error.message);
            })
            .finally(() => {
                setIsSubmitting(false);
            });
    };

    const formatCurrency = (amount: number | undefined) => {
        if (!amount) return '-';
        return new Intl.NumberFormat('en-BD', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    };

    const handleViewMember = (member: Member, e: React.MouseEvent) => {
        e.stopPropagation();
        setViewMember(member);
    };

    const getStatusBadge = (status: string) => {
        const badges: Record<string, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
            pending: {
                bg: 'bg-yellow-100',
                text: 'text-yellow-800',
                icon: <Clock size={14} />,
                label: 'Pending',
            },
            issue: {
                bg: 'bg-orange-100',
                text: 'text-orange-800',
                icon: <AlertTriangle size={14} />,
                label: 'Has Issues',
            },
            approved: {
                bg: 'bg-green-100',
                text: 'text-green-800',
                icon: <CheckCircle size={14} />,
                label: 'Approved',
            },
            rejected: {
                bg: 'bg-red-100',
                text: 'text-red-800',
                icon: <XCircle size={14} />,
                label: 'Rejected',
            },
        };
        const badge = badges[status] || badges.pending;
        return (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                {badge.icon}
                {badge.label}
            </span>
        );
    };

    return (
        <AdminLayout>
            <Head title="Loan Members" />

            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Loan Members</h1>
                    <p className="text-gray-600">Manage and track all loan member applications</p>
                </div>
                <button
                    onClick={() => router.visit('/loan/upload')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-medium"
                >
                    <Plus size={20} />
                    New Loan
                </button>
            </div>

            {/* Flash Message */}
            {flashMessage && (
                <div className={`mb-6 rounded-lg p-4 flex items-center justify-between ${
                    flashMessage.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' :
                    'bg-red-50 border border-red-200 text-red-800'
                }`}>
                    <div className="flex items-center gap-2">
                        {flashMessage.type === 'success' && <CheckCircle className="w-5 h-5" />}
                        {flashMessage.type === 'error' && <AlertTriangle className="w-5 h-5" />}
                        <span className="font-medium">{flashMessage.message}</span>
                    </div>
                    <button onClick={() => setFlashMessage(null)} className="p-1 hover:bg-black/10 rounded">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Date Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                        <input
                            type="date"
                            value={currentDate}
                            onChange={(e) => handleDateChange(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>

                    {/* Status Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                        <select
                            value={currentStatus}
                            onChange={(e) => handleStatusChange(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                            <option value="">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="issue">Has Issues</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                        </select>
                    </div>

                    {/* Search */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                        <input
                            type="text"
                            placeholder="Name or Mobile..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>

                    {/* Search Button */}
                    <div className="flex items-end">
                        <button
                            onClick={handleSearch}
                            className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-2"
                        >
                            <Search className="w-5 h-5" />
                            Search
                        </button>
                    </div>
                </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow-sm p-4 text-center border border-gray-200">
                    <Users className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                    <p className="text-xs text-gray-600">Total</p>
                </div>
                <div className="bg-orange-50 rounded-lg shadow-sm p-4 text-center border-2 border-orange-200">
                    <AlertTriangle className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-orange-600">{stats.issue}</p>
                    <p className="text-xs text-gray-600">Issues</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-4 text-center border border-gray-200">
                    <Clock className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                    <p className="text-xs text-gray-600">Pending</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-4 text-center border border-gray-200">
                    <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">{stats.approved}</p>
                    <p className="text-xs text-gray-600">Approved</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-4 text-center border border-gray-200">
                    <XCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">{stats.rejected}</p>
                    <p className="text-xs text-gray-600">Rejected</p>
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Members List */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                        <div className="px-4 py-3 border-b border-gray-200">
                            <h2 className="font-semibold text-gray-900">
                                Member List ({members.length})
                            </h2>
                        </div>

                        {members.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                                <p>No members found</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-200">
                                {members.map((member) => (
                                    <div
                                        key={member.id}
                                        onClick={() => handleMemberClick(member)}
                                        className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-gray-900">{member.member_name}</h3>
                                                <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                                                    <span>📱 {member.mobile || member.member_mobile}</span>
                                                    <span>📋 {member.application_no}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={(e) => handleViewMember(member, e)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                    title="View Details"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                <div className="flex flex-col items-end gap-2">
                                                    {getStatusBadge(member.status)}
                                                    {member.issues?.length > 0 && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                            <AlertTriangle size={12} />
                                                            {member.issues.length} Issue
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Issue Details & Response */}
                <div className="lg:col-span-1">
                    {selectedMember ? (
                        <div className="bg-white rounded-lg shadow-sm sticky top-4 border border-gray-200">
                            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                                <h3 className="font-semibold text-gray-900">
                                    {selectedMember.member_name}
                                </h3>
                                <p className="text-sm text-gray-600">{selectedMember.mobile}</p>
                            </div>

                            <div className="p-4">
                                {/* Current Status */}
                                <div className="mb-4">
                                    <span className="text-sm text-gray-600">Current Status:</span>
                                    <div className="mt-1">{getStatusBadge(selectedMember.status)}</div>
                                </div>

                                {/* Issues List */}
                                {selectedMember.issues.length > 0 && (
                                    <div className="mb-4">
                                        <h4 className="text-sm font-semibold text-gray-700 mb-2">
                                            Issue Details:
                                        </h4>
                                        <div className="space-y-2">
                                            {selectedMember.issues.map((issue) => (
                                                <div
                                                    key={issue.id}
                                                    className={`p-3 border rounded-lg ${
                                                        issue.status === 'resolved' ? 'bg-green-50 border-green-200' :
                                                        issue.status === 'rejected' ? 'bg-red-50 border-red-200' :
                                                        'bg-orange-50 border-orange-200'
                                                    }`}
                                                >
                                                    <p className="text-sm text-gray-800 font-medium">
                                                        {issue.issue_description}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        {issue.created_at}
                                                    </p>

                                                    {/* Show resolution response if available */}
                                                    {issue.resolution_notes && (
                                                        <div className="mt-2 pt-2 border-t border-gray-300">
                                                            <p className="text-xs font-semibold text-gray-700">
                                                                {issue.status === 'resolved' ? '✓ সমাধান:' : '✗ প্রত্যাখ্যান:'}
                                                            </p>
                                                            <p className="text-xs text-gray-700 mt-1">
                                                                {issue.resolution_notes}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Response Form - Only for issue status */}
                                {selectedMember.status === 'issue' && (
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-700 mb-2">
                                            Submit Response:
                                        </h4>
                                        <textarea
                                            value={responseText}
                                            onChange={(e) => setResponseText(e.target.value)}
                                            placeholder="Explain the resolution or rejection..."
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm mb-3"
                                            rows={4}
                                        />

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleSubmitResponse('resolve')}
                                                disabled={isSubmitting}
                                                className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 text-sm font-medium flex items-center justify-center gap-1"
                                            >
                                                <CheckCircle size={16} />
                                                Resolve
                                            </button>
                                            <button
                                                onClick={() => handleSubmitResponse('reject')}
                                                disabled={isSubmitting}
                                                className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium flex items-center justify-center gap-1"
                                            >
                                                <XCircle size={16} />
                                                Reject
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Status Messages */}
                                {selectedMember.status === 'approved' && (
                                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                                        <p className="text-sm font-medium text-green-800">✅ Approved</p>
                                    </div>
                                )}
                                {selectedMember.status === 'rejected' && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-center">
                                        <p className="text-sm font-medium text-red-800">❌ Rejected</p>
                                    </div>
                                )}
                                {selectedMember.status === 'pending' && (
                                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                                        <p className="text-sm font-medium text-yellow-800">⏳ Pending Review</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg shadow-sm p-8 text-center border border-gray-200 text-gray-500">
                            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p>Select a member to view details</p>
                        </div>
                    )}
                </div>
            </div>

            {/* View Member Details Modal */}
            {viewMember && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-emerald-500 to-teal-500 text-white flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold">{viewMember.member_name}</h2>
                                <p className="text-emerald-100 text-sm">
                                    {viewMember.application_no} | {viewMember.member_code || 'N/A'}
                                </p>
                            </div>
                            <button
                                onClick={() => setViewMember(null)}
                                className="p-2 hover:bg-white/20 rounded-lg transition"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                <div className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-xs text-gray-500 mb-1">ক্রমিক নং</p>
                                    <p className="font-semibold text-gray-900">{viewMember.serial_no || '-'}</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-xs text-gray-500 mb-1">ঋণের ধরন</p>
                                    <p className="font-semibold text-gray-900">{viewMember.loan_type || '-'}</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-xs text-gray-500 mb-1">মোবাইল</p>
                                    <p className="font-semibold text-gray-900">{viewMember.mobile || viewMember.member_mobile || '-'}</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-xs text-gray-500 mb-1">অবস্থা</p>
                                    {getStatusBadge(viewMember.status)}
                                </div>
                            </div>

                            {/* Somiti Info */}
                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-2">সমিতি তথ্য</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-500">সমিতির নাম</p>
                                        <p className="font-medium text-gray-900">{viewMember.somiti_name || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">সমিতি কোড</p>
                                        <p className="font-medium text-gray-900">{viewMember.somiti_code || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">শাখা</p>
                                        <p className="font-medium text-gray-900">{viewMember.branch_name || '-'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Savings Info */}
                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-2">সঞ্চয় তথ্য</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-blue-50 rounded-lg p-3">
                                        <p className="text-xs text-blue-600">সাধারণ সঞ্চয়</p>
                                        <p className="text-lg font-bold text-blue-700">৳ {formatCurrency(viewMember.general_savings)}</p>
                                    </div>
                                    <div className="bg-blue-50 rounded-lg p-3">
                                        <p className="text-xs text-blue-600">মোট সঞ্চয়</p>
                                        <p className="text-lg font-bold text-blue-700">৳ {formatCurrency(viewMember.total_savings)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Last Paid Loan Info */}
                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-2">সর্বশেষ পরিশোধিত ঋণের তথ্য</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-500">মূল ঋণ</p>
                                        <p className="font-medium text-gray-900">৳ {formatCurrency(viewMember.principal_amount)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">কত কিস্তিতে পরিশোধ করা হয়েছে</p>
                                        <p className="font-medium text-gray-900">{viewMember.paid_installment_count || '-'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Current Distribution Info */}
                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-2">বর্তমান বিতরণ সংক্রান্ত তথ্য</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <div className="bg-emerald-50 rounded-lg p-3">
                                        <p className="text-xs text-emerald-600">অনুমোদিত ঋণের পরিমাণ</p>
                                        <p className="text-lg font-bold text-emerald-700">৳ {formatCurrency(viewMember.approved_loan_amount)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">কিস্তির বৃদ্ধির হার</p>
                                        <p className="font-medium text-gray-900">{viewMember.installment_increment_rate || '-'}%</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">ঋণের মেয়াদ</p>
                                        <p className="font-medium text-gray-900">{viewMember.loan_duration || '-'} মাস</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">দফা নং</p>
                                        <p className="font-medium text-gray-900">{viewMember.phase_no || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">প্রকল্পের নাম</p>
                                        <p className="font-medium text-gray-900">{viewMember.project_name || '-'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Team Based Info */}
                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-2">টিম ভিত্তিক তথ্য</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-500">ঋণ ছাড়ের/অনুমোদনের তারিখ</p>
                                        <p className="font-medium text-gray-900">
                                            {viewMember.loan_release_or_approval_date
                                                ? new Date(viewMember.loan_release_or_approval_date).toLocaleDateString('bn-BD')
                                                : '-'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">ঋণ বিতরণের নতুন তারিখ</p>
                                        <p className="font-medium text-gray-900">
                                            {viewMember.loan_distribution_date
                                                ? new Date(viewMember.loan_distribution_date).toLocaleDateString('bn-BD')
                                                : '-'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">ছাড়কারী/অনুমোদনকারী</p>
                                        <p className="font-medium text-gray-900">{viewMember.approved_by || '-'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Remarks */}
                            {viewMember.remarks && (
                                <div className="mb-6">
                                    <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-2">মন্তব্য</h3>
                                    <p className="text-gray-700 bg-gray-50 rounded-lg p-3">{viewMember.remarks}</p>
                                </div>
                            )}

                            {/* Issues */}
                            {viewMember.issues && viewMember.issues.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-semibold text-red-700 mb-3 border-b border-red-200 pb-2">
                                        সমস্যাসমূহ ({viewMember.issues.length})
                                    </h3>
                                    <div className="space-y-2">
                                        {viewMember.issues.map((issue) => (
                                            <div
                                                key={issue.id}
                                                className={`p-3 border rounded-lg ${
                                                    issue.status === 'resolved' ? 'bg-green-50 border-green-200' :
                                                    issue.status === 'rejected' ? 'bg-red-50 border-red-200' :
                                                    'bg-orange-50 border-orange-200'
                                                }`}
                                            >
                                                <p className="text-sm text-gray-800 font-medium">{issue.issue_description}</p>
                                                <p className="text-xs text-gray-500 mt-1">{issue.created_at}</p>
                                                {issue.resolution_notes && (
                                                    <p className="text-xs text-gray-700 mt-2 pt-2 border-t border-gray-300">
                                                        <strong>{issue.status === 'resolved' ? '✓ সমাধান:' : '✗ প্রত্যাখ্যান:'}</strong> {issue.resolution_notes}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                            <button
                                onClick={() => setViewMember(null)}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
                            >
                                বন্ধ করুন
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
