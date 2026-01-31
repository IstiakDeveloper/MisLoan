import React, { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import AdminLayout from '@/layouts/admin-layout';
import { Save, Send, AlertCircle, CheckCircle, Trash2, X, Eye, XCircle, Check } from 'lucide-react';
import { useFetchData } from '@/hooks/useAutoRefresh';

interface Member {
    id: number;
    member_name: string;
    mobile: string;
    nid: string;
    status: string;
    application_no?: string;
    branch_name?: string;
    member_admission_id?: number;
    issues?: Issue[];
}

interface Issue {
    id: number;
    issue_type: string;
    issue_description: string;
    severity: string;
    status: string;
    messages?: Message[];
}

interface Message {
    id: number;
    message_type: string;
    content: string;
    created_by_id: number;
    created_at: string;
    user_name?: string;
}

interface SavedIssue {
    memberId: number;
    memberName: string;
    issueText: string;
    applicationNo: string;
    serial: number;
}

interface Props {
    members: Member[];
    selectedDate: string;
    applicationType: string;
}

const Dashboard = ({ members: initialMembers, selectedDate, applicationType }: Props) => {
    const [searchText, setSearchText] = useState('');
    const [currentDate, setCurrentDate] = useState(selectedDate);
    const [currentType, setCurrentType] = useState(applicationType);
    const [members, setMembers] = useState(initialMembers);
    const [savedIssues, setSavedIssues] = useState<SavedIssue[]>([]);
    const [flashMessage, setFlashMessage] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
    const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

    // Auto-refresh members every 3 seconds
    useEffect(() => {
        if (!autoRefreshEnabled) return;

        const interval = setInterval(async () => {
            try {
                const response = await axios.get('/issue-processing/members', {
                    params: {
                        date: currentDate,
                        type: currentType,
                    }
                });
                if (response.data.members) {
                    setMembers(response.data.members);
                }
            } catch (error) {
                console.error('Auto refresh error:', error);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [currentDate, currentType, autoRefreshEnabled]);

    // Modal states
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);
    const [memberIssues, setMemberIssues] = useState<Issue[]>([]);
    const [issueText, setIssueText] = useState('');
    const [isLoadingIssues, setIsLoadingIssues] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reject modal states
    const [rejectMember, setRejectMember] = useState<Member | null>(null);
    const [rejectReason, setRejectReason] = useState('');

    // Show flash message
    const showFlash = (type: 'success' | 'error' | 'info', message: string) => {
        setFlashMessage({ type, message });
        setTimeout(() => setFlashMessage(null), 5000);
    };

    // Filter members based on search
    const filteredMembers = members.filter((m) =>
        m.member_name.toLowerCase().includes(searchText.toLowerCase()) ||
        m.mobile.includes(searchText) ||
        m.nid?.includes(searchText)
    );

    // Open detail modal and fetch issues
    const openMemberDetail = async (member: Member) => {
        setSelectedMember(member);
        setIssueText('');
        setIsLoadingIssues(true);

        try {
            const response = await axios.get(`/issue-processing/member/${member.id}/issues`, {
                params: {
                    type: currentType,
                    application_id: member.member_admission_id
                }
            });
            setMemberIssues(response.data.issues || []);
        } catch (error) {
            console.error('Error fetching issues:', error);
            setMemberIssues([]);
        } finally {
            setIsLoadingIssues(false);
        }
    };

    const closeMemberDetail = () => {
        setSelectedMember(null);
        setMemberIssues([]);
        setIssueText('');
    };

    const handleSaveIssue = () => {
        if (!selectedMember || !issueText.trim()) return;

        // Check if this member already has a saved issue
        const memberAlreadySaved = savedIssues.some(issue => issue.memberId === selectedMember.id);

        if (memberAlreadySaved) {
            showFlash('error', 'এই সদস্যের জন্য ইতিমধ্যে সমস্যা সংরক্ষণ করা হয়েছে');
            return;
        }

        const newIssue: SavedIssue = {
            memberId: selectedMember.id,
            memberName: selectedMember.member_name,
            issueText: issueText,
            applicationNo: selectedMember.application_no || '',
            serial: savedIssues.length + 1,
        };

        setSavedIssues([...savedIssues, newIssue]);
        setIssueText('');
        closeMemberDetail();
        showFlash('success', `Issue saved for: ${selectedMember.member_name}`);
    };

    const handleRemoveIssue = (memberId: number) => {
        const filtered = savedIssues.filter((issue) => issue.memberId !== memberId);
        const renumbered = filtered.map((issue, index) => ({
            ...issue,
            serial: index + 1,
        }));
        setSavedIssues(renumbered);
        showFlash('info', 'Issue removed');
    };

    const handleDateChange = (newDate: string) => {
        setCurrentDate(newDate);
        router.visit('/issue-processing', {
            data: {
                date: newDate,
                type: currentType,
            },
            preserveScroll: true,
        });
    };

    const handleTypeChange = (newType: string) => {
        setCurrentType(newType);
        router.visit('/issue-processing', {
            data: {
                date: currentDate,
                type: newType,
            },
            preserveScroll: true,
        });
    };

    const handleSubmit = () => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        const issuesData = savedIssues.map((issue) => ({
            member_id: issue.memberId,
            issue_text: issue.issueText,
        }));

        const payload = {
            issues: issuesData,
            date: currentDate,
            type: currentType,
        };

        axios.post('/issue-processing/submit-batch', payload)
            .then((response) => {
                const data = response.data;
                if (data.success) {
                    showFlash('success', `Submission successful! ${data.processed_issues} issues recorded, ${data.auto_approved} members auto-approved.`);
                    setSavedIssues([]);
                    // Immediately fetch fresh data
                    axios.get('/issue-processing/members', {
                        params: {
                            date: currentDate,
                            type: currentType,
                        }
                    }).then(res => {
                        if (res.data.members) {
                            setMembers(res.data.members);
                        }
                    }).catch(err => console.error('Refresh error:', err));
                } else {
                    showFlash('error', data.message || 'Unknown error');
                }
            })
            .catch((error) => {
                const message = error.response?.data?.message || error.message;
                showFlash('error', `Submission failed: ${message}`);
            })
            .finally(() => {
                setIsSubmitting(false);
            });
    };

    // Approve all without issues
    const handleApproveAll = () => {
        if (isSubmitting) return;

        const pendingCount = filteredMembers.filter(m => m.status === 'pending').length;
        if (pendingCount === 0) {
            showFlash('info', 'No pending members to approve');
            return;
        }

        setIsSubmitting(true);

        const payload = {
            issues: [],
            date: currentDate,
            type: currentType,
        };

        axios.post('/issue-processing/submit-batch', payload)
            .then((response) => {
                const data = response.data;
                if (data.success) {
                    showFlash('success', `${data.auto_approved} members approved successfully!`);
                    // Immediately fetch fresh data
                    axios.get('/issue-processing/members', {
                        params: {
                            date: currentDate,
                            type: currentType,
                        }
                    }).then(res => {
                        if (res.data.members) {
                            setMembers(res.data.members);
                        }
                    }).catch(err => console.error('Refresh error:', err));
                } else {
                    showFlash('error', data.message || 'Unknown error');
                }
            })
            .catch((error) => {
                const message = error.response?.data?.message || error.message;
                showFlash('error', `Approval failed: ${message}`);
            })
            .finally(() => {
                setIsSubmitting(false);
            });
    };

    // Reject single member
    const handleReject = () => {
        if (!rejectMember || !rejectReason.trim()) return;
        setIsSubmitting(true);

        axios.post(`/issue-processing/reject-member`, {
            member_id: rejectMember.id,
            reason: rejectReason,
            type: currentType,
        })
            .then((response) => {
                if (response.data.success) {
                    showFlash('success', `${rejectMember.member_name} rejected successfully`);
                    setRejectMember(null);
                    setRejectReason('');
                    // Immediately fetch fresh data
                    axios.get('/issue-processing/members', {
                        params: {
                            date: currentDate,
                            type: currentType,
                        }
                    }).then(res => {
                        if (res.data.members) {
                            setMembers(res.data.members);
                        }
                    }).catch(err => console.error('Refresh error:', err));
                } else {
                    showFlash('error', response.data.message || 'Rejection failed');
                }
            })
            .catch((error) => {
                showFlash('error', error.response?.data?.message || 'Rejection failed');
            })
            .finally(() => {
                setIsSubmitting(false);
            });
    };

    // Approve single member
    const handleApproveSingle = (member: Member) => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        axios.post(`/issue-processing/approve-member`, {
            member_id: member.id,
            type: currentType,
        })
            .then((response) => {
                if (response.data.success) {
                    showFlash('success', `${member.member_name} approved successfully`);
                    // Immediately fetch fresh data
                    axios.get('/issue-processing/members', {
                        params: {
                            date: currentDate,
                            type: currentType,
                        }
                    }).then(res => {
                        if (res.data.members) {
                            setMembers(res.data.members);
                        }
                    }).catch(err => console.error('Refresh error:', err));
                } else {
                    showFlash('error', response.data.message || 'Approval failed');
                }
            })
            .catch((error) => {
                showFlash('error', error.response?.data?.message || 'Approval failed');
            })
            .finally(() => {
                setIsSubmitting(false);
            });
    };

    return (
        <AdminLayout>
            <Head title="Issue Processing" />

            <div className="py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Flash Message */}
                    {flashMessage && (
                        <div className={`mb-6 rounded-lg p-4 flex items-center justify-between ${
                            flashMessage.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' :
                            flashMessage.type === 'error' ? 'bg-red-50 border border-red-200 text-red-800' :
                            'bg-blue-50 border border-blue-200 text-blue-800'
                        }`}>
                            <div className="flex items-center gap-2">
                                {flashMessage.type === 'success' && <CheckCircle className="w-5 h-5" />}
                                {flashMessage.type === 'error' && <AlertCircle className="w-5 h-5" />}
                                {flashMessage.type === 'info' && <AlertCircle className="w-5 h-5" />}
                                <span className="font-medium">{flashMessage.message}</span>
                            </div>
                            <button onClick={() => setFlashMessage(null)} className="p-1 hover:bg-black/10 rounded">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {/* Header */}
                    <div className="mb-6">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            Issue Processing
                        </h1>
                        <p className="text-gray-600">Review submissions and approve or report issues</p>
                    </div>

                    {/* Filter Options */}
                    <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            {/* Date Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Date
                                </label>
                                <input
                                    type="date"
                                    value={currentDate}
                                    onChange={(e) => handleDateChange(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                />
                            </div>

                            {/* Type Selector */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Type
                                </label>
                                <select
                                    value={currentType}
                                    onChange={(e) => handleTypeChange(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                >
                                    <option value="admission">Member Admission</option>
                                    <option value="loan">Loan Application</option>
                                </select>
                            </div>

                            {/* Search */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Search
                                </label>
                                <input
                                    type="text"
                                    value={searchText}
                                    onChange={(e) => setSearchText(e.target.value)}
                                    placeholder="Name / Mobile / NID..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                />
                            </div>

                            {/* Total Members */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Total
                                </label>
                                <div className="px-3 py-2 bg-emerald-50 rounded-lg text-center">
                                    <span className="text-2xl font-bold text-emerald-600">{filteredMembers.length}</span>
                                    <p className="text-xs text-gray-600">Results</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    {filteredMembers.length > 0 && savedIssues.length === 0 && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6 flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-emerald-800">Quick Action</h3>
                                <p className="text-sm text-emerald-700">Approve all pending members without issues</p>
                            </div>
                            <button
                                onClick={handleApproveAll}
                                disabled={isSubmitting}
                                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium text-white transition-colors ${
                                    isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'
                                }`}
                            >
                                <CheckCircle className="w-5 h-5" />
                                {isSubmitting ? 'Processing...' : 'Approve All'}
                            </button>
                        </div>
                    )}

                    {/* Members List */}
                    <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
                        {filteredMembers.length === 0 ? (
                            <div className="p-12 text-center">
                                <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-600 font-medium text-lg">No members found for this date</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">#</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Member Name</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Mobile</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Branch</th>
                                            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Branch Feedback</th>
                                            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {filteredMembers.map((member, index) => (
                                            <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 text-sm font-medium text-gray-700">
                                                    {index + 1}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <p className="font-medium text-gray-900">{member.member_name}</p>
                                                        <p className="text-xs text-gray-500">{member.application_no}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-700">{member.mobile}</td>
                                                <td className="px-6 py-4 text-sm text-gray-700">{member.branch_name || '-'}</td>
                                                <td className="px-6 py-4 text-center">
                                                    {member.status === 'approved' ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                                            <CheckCircle className="w-3 h-3" />
                                                            Approved
                                                        </span>
                                                    ) : member.status === 'rejected' ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                                                            <XCircle className="w-3 h-3" />
                                                            Rejected
                                                        </span>
                                                    ) : member.status === 'issue' ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                                                            <AlertCircle className="w-3 h-3" />
                                                            Has Issues
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                                                            <AlertCircle className="w-3 h-3" />
                                                            Pending
                                                        </span>
                                                    )}
                                                </td>
                                                {/* Branch Feedback Column */}
                                                <td className="px-6 py-4 text-sm">
                                                    {member.issues && member.issues.length > 0 ? (
                                                        <div className="space-y-1">
                                                            {member.issues.map((issue) => (
                                                                issue.messages && issue.messages.length > 0 && (
                                                                    <div key={issue.id} className="bg-blue-50 border border-blue-200 rounded p-2 text-xs">
                                                                        {issue.messages.map((msg) => (
                                                                            <div key={msg.id}>
                                                                                <p className="font-medium text-blue-900">
                                                                                    {msg.user_name}:
                                                                                    <span className="text-blue-700 ml-1">
                                                                                        ({msg.message_type === 'branch_response' ? 'Response' :
                                                                                          msg.message_type === 'branch_rejection' ? 'Rejection' : 'Comment'})
                                                                                    </span>
                                                                                </p>
                                                                                <p className="text-gray-700 mt-1 line-clamp-2">{msg.content}</p>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400 text-xs">-</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => openMemberDetail(member)}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-xs"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                            View
                                                        </button>
                                                        {member.status === 'pending' && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleApproveSingle(member)}
                                                                    disabled={isSubmitting}
                                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors font-medium text-xs disabled:opacity-50"
                                                                >
                                                                    <Check className="w-3.5 h-3.5" />
                                                                    Approve
                                                                </button>
                                                                <button
                                                                    onClick={() => setRejectMember(member)}
                                                                    disabled={isSubmitting}
                                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium text-xs disabled:opacity-50"
                                                                >
                                                                    <XCircle className="w-3.5 h-3.5" />
                                                                    Reject
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Saved Issues Summary */}
                    {savedIssues.length > 0 && (
                        <div className="mt-8 bg-amber-50 rounded-lg p-6 border border-amber-200">
                            <div className="flex items-center gap-2 mb-4">
                                <AlertCircle className="w-5 h-5 text-amber-600" />
                                <h3 className="font-semibold text-gray-900">
                                    Saved Issues ({savedIssues.length})
                                </h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                {savedIssues.map((issue) => (
                                    <div key={issue.memberId} className="bg-white rounded-lg p-4 border border-amber-100 shadow-sm">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="inline-flex items-center justify-center w-6 h-6 bg-amber-600 text-white rounded-full font-bold text-xs">
                                                        {issue.serial}
                                                    </span>
                                                    <span className="font-medium text-gray-900 text-sm">{issue.memberName}</span>
                                                </div>
                                                <p className="text-xs text-gray-700 bg-gray-50 p-2 rounded border border-gray-200 line-clamp-2">
                                                    {issue.issueText}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveIssue(issue.memberId)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition-colors font-medium text-white ${
                                    isSubmitting
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : 'bg-emerald-600 hover:bg-emerald-700'
                                }`}
                            >
                                <Send className="w-5 h-5" />
                                {isSubmitting ? 'Submitting...' : `Submit ${savedIssues.length} Issue(s)`}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Detail Modal */}
            {selectedMember && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 flex items-center justify-between text-white sticky top-0 z-10">
                            <div>
                                <h2 className="text-xl font-bold">{selectedMember.member_name}</h2>
                                <p className="text-emerald-100 text-sm">{selectedMember.application_no}</p>
                            </div>
                            <button
                                onClick={closeMemberDetail}
                                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 space-y-6">
                            {/* Member Info Card */}
                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-500 font-medium">Mobile</p>
                                        <p className="font-semibold text-gray-900">{selectedMember.mobile}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 font-medium">NID</p>
                                        <p className="font-semibold text-gray-900">{selectedMember.nid || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 font-medium">Branch</p>
                                        <p className="font-semibold text-gray-900">{selectedMember.branch_name || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 font-medium">Status</p>
                                        <div className="mt-1">
                                            {selectedMember.status === 'approved' ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                                    <CheckCircle className="w-3 h-3" />
                                                    Approved
                                                </span>
                                            ) : selectedMember.status === 'issue' ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                                                    <AlertCircle className="w-3 h-3" />
                                                    Has Issues
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                                                    <AlertCircle className="w-3 h-3" />
                                                    Pending
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Existing Issues */}
                            {isLoadingIssues ? (
                                <div className="text-center py-6">
                                    <div className="inline-flex items-center gap-2 text-gray-600">
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-600 border-t-transparent"></div>
                                        Loading issues...
                                    </div>
                                </div>
                            ) : memberIssues.length > 0 ? (
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-gray-900">Existing Issues & Feedback</h3>
                                    {memberIssues.map((issue) => (
                                        <div key={issue.id} className={`rounded-lg p-4 border-l-4 ${
                                            issue.severity === 'critical' ? 'border-red-500 bg-red-50' :
                                            issue.severity === 'warning' ? 'border-yellow-500 bg-yellow-50' :
                                            'border-blue-500 bg-blue-50'
                                        }`}>
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <p className="font-medium text-gray-900">{issue.issue_type}</p>
                                                    <p className="text-sm text-gray-700 mt-1">{issue.issue_description}</p>
                                                </div>
                                                <span className={`text-xs font-medium px-2 py-1 rounded ${
                                                    issue.status === 'resolved' ? 'bg-green-100 text-green-700' :
                                                    issue.status === 'open' ? 'bg-red-100 text-red-700' :
                                                    'bg-gray-100 text-gray-700'
                                                }`}>
                                                    {issue.status === 'resolved' ? 'Resolved' :
                                                     issue.status === 'open' ? 'Open' : issue.status}
                                                </span>
                                            </div>

                                            {/* Branch Feedback */}
                                            {issue.messages && issue.messages.length > 0 && (
                                                <div className="mt-3 pt-3 border-t border-gray-300 space-y-2">
                                                    <p className="text-xs font-medium text-gray-600">Branch Feedback:</p>
                                                    {issue.messages.map((msg) => (
                                                        <div key={msg.id} className="bg-white rounded p-3 text-sm border border-gray-200">
                                                            <div className="flex justify-between items-start mb-1">
                                                                <p className="font-medium text-gray-900">
                                                                    {msg.user_name || 'User'}
                                                                    <span className="text-xs text-gray-500 ml-2 font-normal">
                                                                        ({msg.message_type === 'correction' ? 'Correction' :
                                                                          msg.message_type === 'approval' ? 'Approval' :
                                                                          msg.message_type === 'branch_response' ? 'Response' :
                                                                          msg.message_type === 'branch_rejection' ? 'Rejection' : 'Comment'})
                                                                    </span>
                                                                </p>
                                                                <p className="text-xs text-gray-500">
                                                                    {new Date(msg.created_at).toLocaleDateString()}
                                                                </p>
                                                            </div>
                                                            <p className="text-gray-700">{msg.content}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-green-50 rounded-lg p-4 border border-green-200 text-center">
                                    <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                                    <p className="text-green-700 font-medium">No issues found for this member</p>
                                </div>
                            )}

                            {/* New Issue Form */}
                            {selectedMember.status !== 'approved' && (
                                <div className="border-t border-gray-200 pt-6">
                                    <h3 className="font-semibold text-gray-900 mb-4">Report New Issue</h3>
                                    <textarea
                                        value={issueText}
                                        onChange={(e) => setIssueText(e.target.value)}
                                        placeholder="Describe the issue (optional)..."
                                        rows={4}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                                    />
                                    <div className="flex gap-3 mt-4">
                                        <button
                                            onClick={handleSaveIssue}
                                            disabled={!issueText.trim()}
                                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors font-medium ${
                                                issueText.trim()
                                                    ? 'bg-amber-600 text-white hover:bg-amber-700'
                                                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                            }`}
                                        >
                                            <Save className="w-5 h-5" />
                                            Save Issue
                                        </button>
                                        <button
                                            onClick={closeMemberDetail}
                                            className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {rejectMember && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
                        <div className="bg-red-600 px-6 py-4 flex items-center justify-between text-white rounded-t-xl">
                            <div>
                                <h2 className="text-lg font-bold">Reject Member</h2>
                                <p className="text-red-100 text-sm">{rejectMember.member_name}</p>
                            </div>
                            <button
                                onClick={() => { setRejectMember(null); setRejectReason(''); }}
                                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Rejection Reason <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="Enter reason for rejection..."
                                    rows={4}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleReject}
                                    disabled={!rejectReason.trim() || isSubmitting}
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors font-medium ${
                                        rejectReason.trim() && !isSubmitting
                                            ? 'bg-red-600 text-white hover:bg-red-700'
                                            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                    }`}
                                >
                                    <XCircle className="w-5 h-5" />
                                    {isSubmitting ? 'Rejecting...' : 'Confirm Reject'}
                                </button>
                                <button
                                    onClick={() => { setRejectMember(null); setRejectReason(''); }}
                                    className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default Dashboard;
