import React, { useState } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Badge } from '@/components/ui/badge';
import {
    Search,
    Plus,
    Eye,
    Edit,
    Trash2,
    Send,
    Filter,
    ChevronLeft,
    ChevronRight,
    RotateCcw,
    Ban,
} from 'lucide-react';
import { MemberAdmission } from '@/types/memberAdmission';

interface Props {
    admissions: {
        data: MemberAdmission[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from: number;
        to: number;
    };
    filters: {
        status?: string;
        search?: string;
    };
    stats: {
        total: number;
        draft: number;
        submitted: number;
        under_review: number;
        approved: number;
        rejected: number;
        needs_revision?: number;
    };
}

export default function Index({ admissions, filters, stats }: Props) {
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showResubmitModal, setShowResubmitModal] = useState(false);
    const [selectedAdmission, setSelectedAdmission] = useState<MemberAdmission | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [revisionNote, setRevisionNote] = useState('');

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { variant: any; label: string }> = {
            draft: { variant: 'secondary', label: 'Draft' },
            submitted: { variant: 'default', label: 'Submitted' },
            under_review: { variant: 'default', label: 'Under Review' },
            pending_head_office: { variant: 'default', label: 'Pending HO' },
            approved: { variant: 'default', label: 'Approved' },
            rejected: { variant: 'destructive', label: 'Rejected' },
            needs_revision: { variant: 'default', label: 'Needs Revision' },
        };

        const config = variants[status] || { variant: 'secondary', label: status };
        return (
            <Badge
                variant={config.variant}
                className={
                    status === 'approved'
                        ? 'bg-green-500 hover:bg-green-600'
                        : status === 'under_review'
                        ? 'bg-yellow-500 hover:bg-yellow-600'
                        : status === 'submitted'
                        ? 'bg-blue-500 hover:bg-blue-600'
                        : status === 'pending_head_office'
                        ? 'bg-purple-500 hover:bg-purple-600'
                        : status === 'needs_revision'
                        ? 'bg-orange-500 hover:bg-orange-600'
                        : ''
                }
            >
                {config.label}
            </Badge>
        );
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/member-admissions',
            { search: searchQuery, status: statusFilter },
            { preserveState: true }
        );
    };

    const handleFilterChange = (status: string) => {
        setStatusFilter(status);
        router.get(
            '/member-admissions',
            { search: searchQuery, status: status },
            { preserveState: true }
        );
    };

    const handleDelete = (id: number, applicationNo: string) => {
        if (confirm(`Are you sure you want to delete application no ${applicationNo}?`)) {
            router.delete(`/member-admissions/${id}`);
        }
    };

    const handleSubmit = (id: number, applicationNo: string) => {
        if (confirm(`Are you sure you want to submit application no ${applicationNo}?`)) {
            router.patch(`/member-admissions/${id}/submit`);
        }
    };

    const openResubmitModal = (admission: MemberAdmission) => {
        setSelectedAdmission(admission);
        setRevisionNote('');
        setShowResubmitModal(true);
    };

    const handleResubmit = () => {
        if (!selectedAdmission || !revisionNote.trim()) {
            alert('Please provide revision details (কি পরিবর্তন করা হয়েছে তা লিখুন)');
            return;
        }
        router.patch(`/member-admissions/${selectedAdmission.id}/resubmit`, {
            revision_note: revisionNote,
        }, {
            onSuccess: () => {
                setShowResubmitModal(false);
                setSelectedAdmission(null);
                setRevisionNote('');
            },
        });
    };

    const openRejectModal = (admission: MemberAdmission) => {
        setSelectedAdmission(admission);
        setRejectionReason('');
        setShowRejectModal(true);
    };

    const handleReject = () => {
        if (!selectedAdmission || !rejectionReason.trim()) {
            alert('Please provide a rejection reason');
            return;
        }
        router.patch(`/member-admissions/${selectedAdmission.id}/reject`, {
            rejection_reason: rejectionReason,
        }, {
            onSuccess: () => {
                setShowRejectModal(false);
                setSelectedAdmission(null);
                setRejectionReason('');
            },
        });
    };

    const statCards = [
        { label: 'Total', count: stats.total, color: 'bg-blue-500', filter: '' },
        { label: 'Draft', count: stats.draft, color: 'bg-gray-500', filter: 'draft' },
        { label: 'Submitted', count: stats.submitted, color: 'bg-blue-500', filter: 'submitted' },
        {
            label: 'Under Review',
            count: stats.under_review,
            color: 'bg-yellow-500',
            filter: 'under_review',
        },
        {
            label: 'Needs Revision',
            count: stats.needs_revision || 0,
            color: 'bg-orange-500',
            filter: 'needs_revision',
        },
        { label: 'Approved', count: stats.approved, color: 'bg-green-500', filter: 'approved' },
        { label: 'Rejected', count: stats.rejected, color: 'bg-red-500', filter: 'rejected' },
    ];

    return (
        <AdminLayout>
            <Head title="Member Admission" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Member Admission</h1>
                        <p className="text-sm text-gray-600 mt-1">
                            Manage member admission applications
                        </p>
                    </div>
                    <Link
                        href="/member-admissions/create"
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        New Application
                    </Link>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {statCards.map((stat) => (
                        <button
                            key={stat.label}
                            onClick={() => handleFilterChange(stat.filter)}
                            className={`bg-white p-4 rounded-lg shadow-sm border transition-all hover:shadow-md ${
                                statusFilter === stat.filter
                                    ? 'border-blue-500 ring-2 ring-blue-200'
                                    : 'border-gray-200'
                            }`}
                        >
                            <div className={`${stat.color} w-12 h-12 rounded-lg flex items-center justify-center mb-2`}>
                                <span className="text-white text-xl font-bold">{stat.count}</span>
                            </div>
                            <p className="text-sm text-gray-600">{stat.label}</p>
                        </button>
                    ))}
                </div>

                {/* Search and Filter */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <form onSubmit={handleSearch} className="flex gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by Application No, Name, Mobile, NID..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Search
                        </button>
                        {(searchQuery || statusFilter) && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchQuery('');
                                    setStatusFilter('');
                                    router.get('/member-admissions');
                                }}
                                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                            >
                                Reset
                            </button>
                        )}
                    </form>
                </div>

                {/* Table */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Application No
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Applicant Name
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Mobile
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Branch
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Samity
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Category
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Date
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {admissions.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                                            No applications found
                                        </td>
                                    </tr>
                                ) : (
                                    admissions.data.map((admission) => (
                                        <tr
                                            key={admission.id}
                                            className="hover:bg-gray-50 transition-colors"
                                        >
                                            <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                                                {admission.application_no}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-sm">
                                                    <div className="font-medium text-gray-900">
                                                        {admission.applicant_name_en}
                                                    </div>
                                                    <div className="text-gray-500">
                                                        {admission.applicant_name_bn}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                {admission.mobile_number}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                {admission.branch?.name || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                {admission.samity?.samity_name || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                {admission.member_category?.category_name || '-'}
                                            </td>
                                            <td className="px-4 py-3">
                                                {getStatusBadge(admission.status)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                <div>
                                                    {new Date(admission.created_at).toLocaleDateString(
                                                        'bn-BD'
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <Link
                                                        href={`/member-admissions/${admission.id}`}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="View"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Link>
                                                    {(admission.status === 'draft' ||
                                                        admission.status === 'rejected') && (
                                                        <>
                                                            <Link
                                                                href={`/member-admissions/${admission.id}/edit`}
                                                                className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                                                                title="Edit"
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                            </Link>
                                                            {admission.status === 'draft' && (
                                                                <button
                                                                    onClick={() =>
                                                                        handleSubmit(
                                                                            admission.id,
                                                                            admission.application_no
                                                                        )
                                                                    }
                                                                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                                    title="Submit"
                                                                >
                                                                    <Send className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                                                    {admission.status === 'needs_revision' && (
                                                        <>
                                                            <button
                                                                onClick={() => openResubmitModal(admission)}
                                                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                                title="Resubmit to Head Office"
                                                            >
                                                                <RotateCcw className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => openRejectModal(admission)}
                                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                title="Reject Permanently"
                                                            >
                                                                <Ban className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                    {admission.status === 'draft' && (
                                                        <button
                                                            onClick={() =>
                                                                handleDelete(
                                                                    admission.id,
                                                                    admission.application_no
                                                                )
                                                            }
                                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {admissions.last_page > 1 && (
                        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                            <div className="text-sm text-gray-700">
                                Showing <span className="font-medium">{admissions.from}</span> to{' '}
                                <span className="font-medium">{admissions.to}</span> of{' '}
                                <span className="font-medium">{admissions.total}</span> results
                            </div>
                            <div className="flex gap-2">
                                <Link
                                    href={`/member-admissions?page=${admissions.current_page - 1}${
                                        searchQuery ? `&search=${searchQuery}` : ''
                                    }${statusFilter ? `&status=${statusFilter}` : ''}`}
                                    className={`px-3 py-1 rounded-lg border ${
                                        admissions.current_page === 1
                                            ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                                            : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                                    }`}
                                    preserveState
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </Link>
                                <span className="px-4 py-1 text-sm text-gray-700">
                                    Page {admissions.current_page} of {admissions.last_page}
                                </span>
                                <Link
                                    href={`/member-admissions?page=${admissions.current_page + 1}${
                                        searchQuery ? `&search=${searchQuery}` : ''
                                    }${statusFilter ? `&status=${statusFilter}` : ''}`}
                                    className={`px-3 py-1 rounded-lg border ${
                                        admissions.current_page === admissions.last_page
                                            ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                                            : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                                    }`}
                                    preserveState
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </Link>
                            </div>
                        </div>
                    )}
                </div>

                {/* Resubmit Modal */}
                {showResubmitModal && selectedAdmission && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                            <div className="p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                    Resubmit Application: {selectedAdmission.application_no}
                                </h3>
                                <p className="text-sm text-gray-600 mb-4">
                                    Please explain what changes you made (কি পরিবর্তন করেছেন তা বর্ণনা করুন)
                                </p>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Revision Details (সংশোধনের বিবরণ) *
                                    </label>
                                    <textarea
                                        value={revisionNote}
                                        onChange={(e) => setRevisionNote(e.target.value)}
                                        rows={5}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Describe what you changed or fixed..."
                                    />
                                </div>
                                {selectedAdmission.revision_comments && (
                                    <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                                        <p className="text-xs font-medium text-orange-800 mb-1">Head Office Issues:</p>
                                        <p className="text-sm text-orange-700">{selectedAdmission.revision_comments}</p>
                                    </div>
                                )}
                                <div className="flex gap-3 justify-end">
                                    <button
                                        onClick={() => {
                                            setShowResubmitModal(false);
                                            setSelectedAdmission(null);
                                            setRevisionNote('');
                                        }}
                                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleResubmit}
                                        className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                                    >
                                        Resubmit to Head Office
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Reject Modal */}
                {showRejectModal && selectedAdmission && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                            <div className="p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                    Reject Application: {selectedAdmission.application_no}
                                </h3>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Rejection Reason (প্রত্যাখ্যানের কারণ) *
                                    </label>
                                    <textarea
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        rows={4}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Enter reason for rejection..."
                                    />
                                </div>
                                <div className="flex gap-3 justify-end">
                                    <button
                                        onClick={() => {
                                            setShowRejectModal(false);
                                            setSelectedAdmission(null);
                                            setRejectionReason('');
                                        }}
                                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleReject}
                                        className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                                    >
                                        Reject Application
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
