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
    excel_row_number?: number;
    branch_name?: string;
    officer_name?: string;
    component_name?: string;
    society_name?: string;
    member_name: string;
    mobile?: string;
    nid_front_image?: string;
    nid_back_image?: string;
    residential_property?: number;
    cultivable_land?: number;
    total_land?: number;
    cattle_count?: number;
    goat_count?: number;
    poultry_count?: number;
    fixed_movable_assets_value?: number;
    earning_person_occupation?: string;
    family_monthly_income?: number;
    guarantor_name?: string;
    guarantor_relation?: string;
    remarks?: string;
    status: string;
    application_no: string;
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

export default function AdmissionIndex({
    members: initialMembers,
    selectedDate,
    statusFilter,
    searchQuery,
    stats: initialStats,
}: Props) {
    const [currentDate, setCurrentDate] = useState(selectedDate);
    const [currentStatus, setCurrentStatus] = useState(statusFilter);
    const [search, setSearch] = useState(searchQuery);
    const [members, setMembers] = useState(initialMembers);
    const [stats, setStats] = useState(initialStats);
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
                const response = await axios.get('/admissions/api/data', {
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
        router.visit('/admissions', {
            data: { date: newDate, status: currentStatus, search },
            preserveScroll: true,
        });
    };

    const handleStatusChange = (newStatus: string) => {
        setCurrentStatus(newStatus);
        router.visit('/admissions', {
            data: { date: currentDate, status: newStatus, search },
            preserveScroll: true,
        });
    };

    const handleSearch = () => {
        router.visit('/admissions', {
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
            ? `/admissions/member/${selectedMember.id}/resolve-issue`
            : `/admissions/member/${selectedMember.id}/reject-issue`;

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

    const handlePrint = () => {
        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Member Admission Report - ${currentDate}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h1 { font-size: 20px; margin-bottom: 5px; }
                    h2 { font-size: 14px; color: #666; margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
                    th { background-color: #f5f5f5; font-weight: bold; }
                    .stats { display: flex; gap: 20px; margin-bottom: 20px; }
                    .stat-box { padding: 10px; border: 1px solid #ddd; border-radius: 4px; text-align: center; }
                    .stat-value { font-size: 24px; font-weight: bold; }
                    .stat-label { font-size: 11px; color: #666; }
                    .status-pending { color: #b45309; }
                    .status-approved { color: #16a34a; }
                    .status-rejected { color: #dc2626; }
                    .status-issue { color: #ea580c; }
                    @media print { body { padding: 0; } }
                </style>
            </head>
            <body>
                <h1>Member Admission Report</h1>
                <h2>Date: ${currentDate} | Branch: ${members[0]?.branch_name || 'N/A'}</h2>

                <div class="stats">
                    <div class="stat-box">
                        <div class="stat-value">${stats.total}</div>
                        <div class="stat-label">Total</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value">${stats.pending}</div>
                        <div class="stat-label">Pending</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value">${stats.issue}</div>
                        <div class="stat-label">Issues</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value">${stats.approved}</div>
                        <div class="stat-label">Approved</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value">${stats.rejected}</div>
                        <div class="stat-label">Rejected</div>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Member Name</th>
                            <th>Mobile</th>
                            <th>Application No</th>
                            <th>Status</th>
                            <th>Issues</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${members.map((member, index) => `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${member.member_name}</td>
                                <td>${member.mobile}</td>
                                <td>${member.application_no}</td>
                                <td class="status-${member.status}">${
                                    member.status === 'pending' ? 'Pending' :
                                    member.status === 'approved' ? 'Approved' :
                                    member.status === 'rejected' ? 'Rejected' :
                                    member.status === 'issue' ? 'Has Issues' : member.status
                                }</td>
                                <td>${member.issues.length > 0 ? member.issues.map(i => i.issue_description).join(', ') : '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <p style="margin-top: 30px; font-size: 11px; color: #666;">
                    Generated on: ${new Date().toLocaleString()}
                </p>
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(printContent);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 250);
        }
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
            <Head title="Member Admissions" />

            <div className="py-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Flash Message */}
                    {flashMessage && (
                        <div className={`mb-4 rounded-lg p-4 flex items-center justify-between ${
                            flashMessage.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' :
                            'bg-red-50 border border-red-200 text-red-800'
                        }`}>
                            <div className="flex items-center gap-2">
                                {flashMessage.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                                <span className="font-medium">{flashMessage.message}</span>
                            </div>
                            <button onClick={() => setFlashMessage(null)} className="p-1 hover:bg-black/10 rounded">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {/* Header */}
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Member Admissions</h1>
                            <p className="text-gray-600 mt-1">View today's admissions and issues</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handlePrint}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
                            >
                                <Printer size={20} />
                                Print
                            </button>
                            <button
                                onClick={() => router.visit('/admissions/create')}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-medium"
                            >
                                <Plus size={20} />
                                New Admission
                            </button>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {/* Date Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Date
                                </label>
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-gray-400" />
                                    <input
                                        type="date"
                                        value={currentDate}
                                        onChange={(e) => handleDateChange(e.target.value)}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            {/* Status Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Status
                                </label>
                                <div className="flex items-center gap-2">
                                    <Filter className="w-5 h-5 text-gray-400" />
                                    <select
                                        value={currentStatus}
                                        onChange={(e) => handleStatusChange(e.target.value)}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                    >
                                        <option value="">All</option>
                                        <option value="issue">Has Issues</option>
                                        <option value="pending">Pending</option>
                                        <option value="approved">Approved</option>
                                        <option value="rejected">Rejected</option>
                                    </select>
                                </div>
                            </div>

                            {/* Search */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Search
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                        placeholder="Name or mobile..."
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                    />
                                    <button
                                        onClick={handleSearch}
                                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                                    >
                                        <Search className="w-5 h-5" />
                                    </button>
                                </div>
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
                                    <div className="text-center py-12">
                                        <Users size={48} className="mx-auto text-gray-300 mb-4" />
                                        <p className="text-gray-500">No members found for this date</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-100">
                                        {members.map((member) => (
                                            <div
                                                key={member.id}
                                                onClick={() => handleMemberClick(member)}
                                                className={`p-4 cursor-pointer transition-colors ${
                                                    selectedMember?.id === member.id
                                                        ? 'bg-emerald-50 border-l-4 border-emerald-500'
                                                        : member.status === 'issue'
                                                        ? 'bg-orange-50 hover:bg-orange-100 border-l-4 border-orange-400'
                                                        : 'hover:bg-gray-50'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3">
                                                            <span className="font-semibold text-gray-900">
                                                                {member.member_name}
                                                            </span>
                                                            {getStatusBadge(member.status)}
                                                        </div>
                                                        <div className="text-sm text-gray-600 mt-1">
                                                            {member.mobile} | {member.application_no}
                                                        </div>
                                                        {member.issues.length > 0 && (
                                                            <div className="mt-2 flex items-center gap-2 text-orange-600">
                                                                <MessageSquare size={14} />
                                                                <span className="text-sm font-medium">
                                                                    {member.issues.length} issue(s)
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={(e) => handleViewMember(member, e)}
                                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                            title="View Details"
                                                        >
                                                            <Eye size={18} />
                                                        </button>
                                                        {member.status === 'issue' && (
                                                            <AlertTriangle className="w-6 h-6 text-orange-500" />
                                                        )}
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
                                                    placeholder="Enter correction details or rejection reason..."
                                                    rows={4}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                                                />

                                                <div className="flex gap-2 mt-3">
                                                    <button
                                                        onClick={() => handleSubmitResponse('resolve')}
                                                        disabled={isSubmitting || !responseText.trim()}
                                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
                                                    >
                                                        <Send size={16} />
                                                        Submit Correction
                                                    </button>
                                                    <button
                                                        onClick={() => handleSubmitResponse('reject')}
                                                        disabled={isSubmitting || !responseText.trim()}
                                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
                                                    >
                                                        <XCircle size={16} />
                                                        Reject
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Info for non-issue status */}
                                        {selectedMember.status !== 'issue' && (
                                            <div className="text-center py-4 text-gray-500">
                                                <p className="text-sm">
                                                    {selectedMember.status === 'approved' && 'This member has been approved'}
                                                    {selectedMember.status === 'pending' && 'This member is under review'}
                                                    {selectedMember.status === 'rejected' && 'This member has been rejected'}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white rounded-lg shadow-sm p-8 text-center border border-gray-200">
                                    <MessageSquare size={48} className="mx-auto text-gray-300 mb-4" />
                                    <p className="text-gray-500">
                                        Select a member to view details
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
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
                                    {viewMember.application_no} | {viewMember.mobile || 'N/A'}
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
                                    <p className="text-xs text-gray-500 mb-1">এক্সেল সারি নং</p>
                                    <p className="font-semibold text-gray-900">{viewMember.excel_row_number || '-'}</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-xs text-gray-500 mb-1">শাখার নাম</p>
                                    <p className="font-semibold text-gray-900">{viewMember.branch_name || '-'}</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-xs text-gray-500 mb-1">মোবাইল</p>
                                    <p className="font-semibold text-gray-900">{viewMember.mobile || '-'}</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-xs text-gray-500 mb-1">অবস্থা</p>
                                    {getStatusBadge(viewMember.status)}
                                </div>
                            </div>

                            {/* Location Info */}
                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-2">অবস্থান তথ্য</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-500">জোন</p>
                                        <p className="font-medium text-gray-900">{viewMember.zone_name || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">এরিয়া</p>
                                        <p className="font-medium text-gray-900">{viewMember.area_name || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">শাখা</p>
                                        <p className="font-medium text-gray-900">{viewMember.branch_name || '-'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Officer & Society Info */}
                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-2">কর্মকর্তা ও সমিতি তথ্য</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-500">কর্মকর্তার নাম</p>
                                        <p className="font-medium text-gray-900">{viewMember.officer_name || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">কম্পোনেন্টের নাম</p>
                                        <p className="font-medium text-gray-900">{viewMember.component_name || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">সমিতির নাম</p>
                                        <p className="font-medium text-gray-900">{viewMember.society_name || '-'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Land & Property Info */}
                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-2">জমি ও সম্পত্তি তথ্য</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <div className="bg-blue-50 rounded-lg p-3">
                                        <p className="text-xs text-blue-600">বসতবাড়ির জমি (শতাংশ)</p>
                                        <p className="text-lg font-bold text-blue-700">{viewMember.residential_property || '-'}</p>
                                    </div>
                                    <div className="bg-blue-50 rounded-lg p-3">
                                        <p className="text-xs text-blue-600">আবাদযোগ্য জমি (শতাংশ)</p>
                                        <p className="text-lg font-bold text-blue-700">{viewMember.cultivable_land || '-'}</p>
                                    </div>
                                    <div className="bg-blue-50 rounded-lg p-3">
                                        <p className="text-xs text-blue-600">মোট জমি (শতাংশ)</p>
                                        <p className="text-lg font-bold text-blue-700">{viewMember.total_land || '-'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Livestock Info */}
                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-2">গবাদি পশু ও হাঁস-মুরগি</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <div className="bg-green-50 rounded-lg p-3">
                                        <p className="text-xs text-green-600">গরু/মহিষ সংখ্যা</p>
                                        <p className="text-lg font-bold text-green-700">{viewMember.cattle_count || '-'}</p>
                                    </div>
                                    <div className="bg-green-50 rounded-lg p-3">
                                        <p className="text-xs text-green-600">ছাগল/ভেড়া সংখ্যা</p>
                                        <p className="text-lg font-bold text-green-700">{viewMember.goat_count || '-'}</p>
                                    </div>
                                    <div className="bg-green-50 rounded-lg p-3">
                                        <p className="text-xs text-green-600">হাঁস-মুরগি সংখ্যা</p>
                                        <p className="text-lg font-bold text-green-700">{viewMember.poultry_count || '-'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Income & Assets Info */}
                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-2">আয় ও সম্পদ তথ্য</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <div className="bg-emerald-50 rounded-lg p-3">
                                        <p className="text-xs text-emerald-600">স্থায়ী/অস্থায়ী সম্পদের মূল্য</p>
                                        <p className="text-lg font-bold text-emerald-700">৳ {formatCurrency(viewMember.fixed_movable_assets_value)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">উপার্জনকারীর পেশা</p>
                                        <p className="font-medium text-gray-900">{viewMember.earning_person_occupation || '-'}</p>
                                    </div>
                                    <div className="bg-emerald-50 rounded-lg p-3">
                                        <p className="text-xs text-emerald-600">পরিবারের মাসিক আয়</p>
                                        <p className="text-lg font-bold text-emerald-700">৳ {formatCurrency(viewMember.family_monthly_income)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Guarantor Info */}
                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-2">জামিনদার তথ্য</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-500">জামিনদারের নাম</p>
                                        <p className="font-medium text-gray-900">{viewMember.guarantor_name || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">সম্পর্ক</p>
                                        <p className="font-medium text-gray-900">{viewMember.guarantor_relation || '-'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* NID Images */}
                            {(viewMember.nid_front_image || viewMember.nid_back_image) && (
                                <div className="mb-6">
                                    <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-2">এনআইডি ছবি</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        {viewMember.nid_front_image && (
                                            <div>
                                                <p className="text-xs text-gray-500 mb-2">সামনের দিক</p>
                                                <img
                                                    src={`/storage/${viewMember.nid_front_image}`}
                                                    alt="NID Front"
                                                    className="w-full rounded-lg border border-gray-200"
                                                />
                                            </div>
                                        )}
                                        {viewMember.nid_back_image && (
                                            <div>
                                                <p className="text-xs text-gray-500 mb-2">পেছনের দিক</p>
                                                <img
                                                    src={`/storage/${viewMember.nid_back_image}`}
                                                    alt="NID Back"
                                                    className="w-full rounded-lg border border-gray-200"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

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
