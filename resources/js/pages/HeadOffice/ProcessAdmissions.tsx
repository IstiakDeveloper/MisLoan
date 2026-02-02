import React, { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Search, Calendar, FileText, CheckCircle, AlertCircle, X, Eye, UserPlus, XCircle } from 'lucide-react';

interface Issue {
    id: number;
    issue_description: string;
    reporter: {
        name: string;
    };
    created_at: string;
}

interface Admission {
    id: number;
    application_no: string;
    applicant_name_en: string;
    applicant_name_bn: string;
    nid_number?: string;
    mobile_number: string;
    submitted_at: string;
    revision_count?: number;
    revision_comments?: string;
    branch: {
        name: string;
    };
    samity: {
        samity_name: string;
    };
    member_category: {
        category_name: string;
    };
    issues: Issue[];
}

interface Props {
    admissions: {
        data: Admission[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    filters: {
        date: string;
        search?: string;
    };
}

export default function ProcessAdmissions({ admissions, filters }: Props) {
    const [selectedAdmission, setSelectedAdmission] = useState<Admission | null>(null);
    const [showIssueModal, setShowIssueModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');

    const { data, setData, post, processing, reset, errors } = useForm({
        issue_description: '',
    });

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        router.get('/head-office/process-admissions', {
            date: e.target.value,
            search: filters.search,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        router.get('/head-office/process-admissions', {
            date: filters.date,
            search: formData.get('search'),
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const openIssueModal = (admission: Admission) => {
        setSelectedAdmission(admission);
        setShowIssueModal(true);
        reset();
    };

    const closeIssueModal = () => {
        setShowIssueModal(false);
        setSelectedAdmission(null);
        reset();
    };

    const handleSaveIssue = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAdmission) return;

        post(`/head-office/admissions/${selectedAdmission.id}/issue`, {
            preserveScroll: true,
            onSuccess: () => {
                closeIssueModal();
            },
        });
    };

    const handleApproveAll = () => {
        if (confirm(`Are you sure you want to approve all admissions for ${filters.date}?\n\nAdmissions with issues will be returned to branch.`)) {
            router.post('/head-office/admissions/approve-all', {
                date: filters.date,
            }, {
                preserveScroll: true,
            });
        }
    };

    const handleApproveSingle = (admission: Admission) => {
        if (admission.issues.length > 0) {
            alert('Cannot approve admission with pending issues! Please resolve or remove issues first.');
            return;
        }

        if (confirm(`Approve admission ${admission.application_no}?`)) {
            router.patch(`/head-office/admissions/${admission.id}/approve`, {}, {
                preserveScroll: true,
            });
        }
    };

    const handleDeleteIssue = (issueId: number) => {
        if (confirm('Delete this issue?')) {
            router.delete(`/head-office/issues/${issueId}`, {
                preserveScroll: true,
            });
        }
    };

    const openViewModal = (admission: Admission) => {
        setSelectedAdmission(admission);
        setShowViewModal(true);
    };

    const closeViewModal = () => {
        setShowViewModal(false);
        setSelectedAdmission(null);
    };

    const openRejectModal = (admission: Admission) => {
        setSelectedAdmission(admission);
        setRejectionReason('');
        setShowRejectModal(true);
    };

    const closeRejectModal = () => {
        setShowRejectModal(false);
        setSelectedAdmission(null);
        setRejectionReason('');
    };

    const handleReject = () => {
        if (!selectedAdmission || !rejectionReason.trim()) {
            alert('Please provide a rejection reason');
            return;
        }
        router.patch(`/head-office/admissions/${selectedAdmission.id}/reject`, {
            rejection_reason: rejectionReason,
        }, {
            onSuccess: () => {
                closeRejectModal();
            },
        });
    };

    return (
        <AdminLayout>
            <Head title="Process Admissions" />

            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <UserPlus className="w-8 h-8 text-blue-600" />
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Process Admissions</h1>
                            <p className="text-sm text-gray-600">Review and approve pending member admissions</p>
                        </div>
                    </div>
                    <button
                        onClick={handleApproveAll}
                        className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                        <CheckCircle className="w-5 h-5" />
                        Approve All
                    </button>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Date Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Calendar className="w-4 h-4 inline mr-2" />
                                Date (তারিখ)
                            </label>
                            <input
                                type="date"
                                value={filters.date}
                                onChange={handleDateChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        {/* Search */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Search className="w-4 h-4 inline mr-2" />
                                Search (খুঁজুন)
                            </label>
                            <form onSubmit={handleSearch}>
                                <input
                                    type="text"
                                    name="search"
                                    defaultValue={filters.search}
                                    placeholder="Name, NID, Phone, Application No..."
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </form>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="mt-4 flex items-center gap-4 text-sm">
                        <span className="text-gray-700">
                            <strong>Total:</strong> {admissions.total}
                        </span>
                        <span className="text-orange-600">
                            <strong>With Issues:</strong> {admissions.data.filter(a => a.issues.length > 0).length}
                        </span>
                        <span className="text-green-600">
                            <strong>No Issues:</strong> {admissions.data.filter(a => a.issues.length === 0).length}
                        </span>
                    </div>
                </div>

                {/* Admissions Table */}
                <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                    {admissions.data.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <UserPlus className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                            <p className="text-lg font-medium">No admissions found</p>
                            <p className="text-sm">Try changing the date or search filter</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">App No</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Applicant</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">NID/Phone</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch/Samity</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issues</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {admissions.data.map((admission) => (
                                        <tr key={admission.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                <div className="flex items-center gap-2">
                                                    <span>{admission.application_no}</span>
                                                    {admission.revision_count && admission.revision_count > 0 && (
                                                        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full font-medium">
                                                            Rev {admission.revision_count}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                <div>
                                                    <p className="font-medium text-gray-900">{admission.applicant_name_en}</p>
                                                    <p className="text-gray-600">{admission.applicant_name_bn}</p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700">
                                                <div>
                                                    {admission.nid_number && <p>NID: {admission.nid_number}</p>}
                                                    <p>{admission.mobile_number}</p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700">
                                                <div>
                                                    <p className="font-medium">{admission.branch.name}</p>
                                                    <p className="text-xs text-gray-600">{admission.samity.samity_name}</p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                {new Date(admission.submitted_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3">
                                                {admission.issues.length > 0 ? (
                                                    <div className="flex flex-col gap-1">
                                                        {admission.issues.map((issue) => (
                                                            <div key={issue.id} className="flex items-start gap-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs">
                                                                <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-orange-800 line-clamp-2">{issue.issue_description}</p>
                                                                    <p className="text-orange-600 text-xs mt-1">By: {issue.reporter.name}</p>
                                                                </div>
                                                                <button
                                                                    onClick={() => handleDeleteIssue(issue.id)}
                                                                    className="text-red-600 hover:text-red-800"
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                                                        <CheckCircle className="w-3 h-3" />
                                                        No Issues
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => openViewModal(admission)}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                                                        title="View Details"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => openIssueModal(admission)}
                                                        className="px-3 py-1.5 bg-orange-600 text-white text-sm rounded hover:bg-orange-700"
                                                    >
                                                        যাচাই
                                                    </button>
                                                    <button
                                                        onClick={() => handleApproveSingle(admission)}
                                                        disabled={admission.issues.length > 0}
                                                        className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => openRejectModal(admission)}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                                                        title="Reject"
                                                    >
                                                        <XCircle className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {admissions.last_page > 1 && (
                        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                            <div className="text-sm text-gray-700">
                                Showing page {admissions.current_page} of {admissions.last_page}
                            </div>
                            <div className="flex gap-2">
                                {admissions.current_page > 1 && (
                                    <button
                                        onClick={() => router.get(`/head-office/admission-members?page=${admissions.current_page - 1}&date=${filters.date}&search=${filters.search || ''}`)}
                                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                                    >
                                        Previous
                                    </button>
                                )}
                                {admissions.current_page < admissions.last_page && (
                                    <button
                                        onClick={() => router.get(`/head-office/admission-members?page=${admissions.current_page + 1}&date=${filters.date}&search=${filters.search || ''}`)}
                                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                    >
                                        Next
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Issue Modal */}
            {showIssueModal && selectedAdmission && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">যাচাই/Report Issue</h3>
                                <p className="text-sm text-gray-600">{selectedAdmission.application_no} - {selectedAdmission.applicant_name_en}</p>
                            </div>
                            <button
                                onClick={closeIssueModal}
                                className="p-2 hover:bg-gray-100 rounded-full"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveIssue} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Issue Description (সমস্যার বিবরণ) <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={data.issue_description}
                                    onChange={(e) => setData('issue_description', e.target.value)}
                                    rows={6}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Describe the issue found in this admission..."
                                    required
                                />
                                {errors.issue_description && (
                                    <p className="text-sm text-red-600 mt-1">{errors.issue_description}</p>
                                )}
                            </div>

                            {/* Existing Issues */}
                            {selectedAdmission.issues.length > 0 && (
                                <div className="border-t pt-4">
                                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Existing Issues:</h4>
                                    <div className="space-y-2">
                                        {selectedAdmission.issues.map((issue) => (
                                            <div key={issue.id} className="p-3 bg-gray-50 border border-gray-200 rounded text-sm">
                                                <p className="text-gray-900">{issue.issue_description}</p>
                                                <p className="text-xs text-gray-600 mt-1">
                                                    By: {issue.reporter.name} on {new Date(issue.created_at).toLocaleString()}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button
                                    type="button"
                                    onClick={closeIssueModal}
                                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                                >
                                    {processing ? 'Saving...' : 'Save Issue'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Details Modal */}
            {showViewModal && selectedAdmission && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-900">Admission Details</h3>
                            <button
                                onClick={closeViewModal}
                                className="p-2 hover:bg-gray-100 rounded-full"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-600">Application No</p>
                                    <p className="font-medium">{selectedAdmission.application_no}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Branch</p>
                                    <p className="font-medium">{selectedAdmission.branch.name}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Samity</p>
                                    <p className="font-medium">{selectedAdmission.samity.samity_name}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Category</p>
                                    <p className="font-medium">{selectedAdmission.member_category.category_name}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Applicant (English)</p>
                                    <p className="font-medium">{selectedAdmission.applicant_name_en}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Applicant (Bangla)</p>
                                    <p className="font-medium">{selectedAdmission.applicant_name_bn}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">NID</p>
                                    <p className="font-medium">{selectedAdmission.nid_number || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Mobile</p>
                                    <p className="font-medium">{selectedAdmission.mobile_number}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Submitted At</p>
                                    <p className="font-medium">{new Date(selectedAdmission.submitted_at).toLocaleString()}</p>
                                </div>
                                {selectedAdmission.revision_count && selectedAdmission.revision_count > 0 && (
                                    <div className="col-span-2">
                                        <p className="text-sm text-gray-600 mb-1">Revision Count</p>
                                        <p className="font-medium text-orange-600">
                                            {selectedAdmission.revision_count} time(s) revised
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Revision History */}
                            {selectedAdmission.revision_comments && (
                                <div className="border border-orange-200 bg-orange-50 rounded-lg p-4">
                                    <h4 className="text-sm font-semibold text-orange-800 mb-2 flex items-center gap-2">
                                        <FileText className="w-4 h-4" />
                                        Revision History (সংশোধন ইতিহাস)
                                    </h4>
                                    <div className="text-sm text-orange-900 whitespace-pre-wrap">
                                        {selectedAdmission.revision_comments}
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-center gap-3 pt-4 border-t">
                                <a
                                    href={`/head-office/admissions/${selectedAdmission.id}`}
                                    target="_blank"
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    View Full Details
                                </a>
                                <button
                                    onClick={closeViewModal}
                                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && selectedAdmission && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-md w-full">
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
                                    rows={5}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                    placeholder="Enter reason for rejection..."
                                />
                            </div>
                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={closeRejectModal}
                                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleReject}
                                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                                >
                                    Reject Application
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
