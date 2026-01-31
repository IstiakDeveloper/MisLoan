import React, { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import AdminLayout from '@/layouts/admin-layout';
import {
    ChevronRight,
    MessageCircle,
    CheckCircle,
    XCircle,
    ArrowLeft,
    Loader,
} from 'lucide-react';

interface IssueMessage {
    user_id: number;
    user_name: string;
    message: string;
    type: string;
    created_at: string;
}

interface IssueData {
    id: number;
    issue_type: string;
    issue_description: string;
    severity: string;
    status: string;
    messages: IssueMessage[];
}

interface MemberIssues {
    member_name: string;
    issues: IssueData[];
}

interface Props {
    application: any;
    applicationType: string;
    issues: IssueData[];
    issuesByMember: Record<string, MemberIssues>;
    openIssuesCount: number;
    resolvedIssuesCount: number;
    rejectedIssuesCount: number;
}

const severityColors: Record<string, string> = {
    critical: 'bg-red-100 text-red-800 border-red-300',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    info: 'bg-blue-100 text-blue-800 border-blue-300',
};

export default function ProcessIssues({
    application,
    applicationType,
    issues: initialIssues,
    issuesByMember: initialIssuesByMember,
    openIssuesCount: initialOpenCount,
    resolvedIssuesCount: initialResolvedCount,
    rejectedIssuesCount: initialRejectedCount,
}: Props) {
    const [issues, setIssues] = useState(initialIssues);
    const [issuesByMember, setIssuesByMember] = useState(initialIssuesByMember);
    const [openIssuesCount, setOpenIssuesCount] = useState(initialOpenCount);
    const [resolvedIssuesCount, setResolvedIssuesCount] = useState(initialResolvedCount);
    const [rejectedIssuesCount, setRejectedIssuesCount] = useState(initialRejectedCount);
    const [selectedIssue, setSelectedIssue] = useState<IssueData | null>(
        initialIssues.find((i) => i.status === 'open') || initialIssues[0] || null
    );
    const [comment, setComment] = useState('');
    const [resolutionNotes, setResolutionNotes] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'open' | 'resolved' | 'rejected'>('open');
    const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

    // Auto-refresh issues every 3 seconds
    useEffect(() => {
        if (!autoRefreshEnabled) return;

        const interval = setInterval(async () => {
            try {
                const response = await axios.get(`/issue-processing/application/${application.id}/issues`, {
                    params: { type: applicationType }
                });
                if (response.data) {
                    setIssues(response.data.issues);
                    setIssuesByMember(response.data.issuesByMember);
                    setOpenIssuesCount(response.data.openIssuesCount);
                    setResolvedIssuesCount(response.data.resolvedIssuesCount);
                    setRejectedIssuesCount(response.data.rejectedIssuesCount);

                    // Update selected issue if it's no longer found
                    const updatedSelected = response.data.issues.find((i: IssueData) => i.id === selectedIssue?.id);
                    if (!updatedSelected && response.data.issues.length > 0) {
                        setSelectedIssue(response.data.issues[0]);
                    } else if (updatedSelected) {
                        setSelectedIssue(updatedSelected);
                    }
                }
            } catch (error) {
                console.error('Auto refresh error:', error);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [application.id, applicationType, autoRefreshEnabled, selectedIssue?.id]);

    const handleResolve = async () => {
        if (!selectedIssue || !resolutionNotes.trim()) return;

        setLoading(true);
        try {
            const response = await axios.patch(`/issue-processing/issue/${selectedIssue.id}/resolve`, {
                notes: resolutionNotes,
            }, {
                headers: {
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                }
            });

            if (response.data.success) {
                setResolutionNotes('');
                setAutoRefreshEnabled(true);
                // Auto-refresh will handle the update
            }
        } catch (error) {
            console.error('Error resolving issue:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleReject = async () => {
        if (!selectedIssue || !rejectionReason.trim()) return;

        setLoading(true);
        try {
            const response = await axios.patch(`/issue-processing/issue/${selectedIssue.id}/reject`, {
                reason: rejectionReason,
            }, {
                headers: {
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                }
            });

            if (response.data.success) {
                setRejectionReason('');
                setAutoRefreshEnabled(true);
                // Auto-refresh will handle the update
            }
        } catch (error) {
            console.error('Error rejecting issue:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddComment = async () => {
        if (!selectedIssue || !comment.trim()) return;

        setLoading(true);
        try {
            const response = await axios.post(`/issue-processing/issue/${selectedIssue.id}/comment`, {
                message: comment,
            }, {
                headers: {
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                }
            });

            if (response.data.success) {
                setComment('');
                setAutoRefreshEnabled(true);
                // Auto-refresh will handle the update
            }
        } catch (error) {
            console.error('Error adding comment:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredIssues = issues.filter((i) => {
        if (activeTab === 'open') return i.status === 'open';
        if (activeTab === 'resolved') return i.status === 'resolved';
        if (activeTab === 'rejected') return i.status === 'rejected';
        return true;
    });

    return (
        <AdminLayout>
            <Head title={`Process Issues - ${application.application_no}`} />

            <div className="py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <button
                                    onClick={() => router.visit('/issue-processing')}
                                    className="text-gray-600 hover:text-gray-900 transition-colors"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                                <h1 className="text-3xl font-bold text-gray-900">
                                    ⚙️ Step 3: Process Issues
                                </h1>
                            </div>
                            <p className="text-gray-600">Resolve issues one by one</p>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-8 bg-white rounded-lg shadow-sm p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-8 h-8 bg-green-600 text-white rounded-full font-bold">
                                        ✓
                                    </div>
                                    <span className="font-medium text-gray-900">Check</span>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                            <div className="flex-1">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-8 h-8 bg-green-600 text-white rounded-full font-bold">
                                        ✓
                                    </div>
                                    <span className="font-medium text-gray-900">Report</span>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                            <div className="flex-1">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full font-bold">
                                        3
                                    </div>
                                    <span className="font-medium text-gray-900">Process</span>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                            <div className="flex-1">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-8 h-8 bg-gray-300 text-gray-600 rounded-full font-bold">
                                        4
                                    </div>
                                    <span className="text-gray-600">Approve</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 mb-8">
                        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-red-500">
                            <p className="text-sm text-gray-600">খোলা</p>
                            <p className="text-3xl font-bold text-red-600">{openIssuesCount}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-green-500">
                            <p className="text-sm text-gray-600">সমাধান করা</p>
                            <p className="text-3xl font-bold text-green-600">{resolvedIssuesCount}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-yellow-500">
                            <p className="text-sm text-gray-600">প্রত্যাখ্যাত</p>
                            <p className="text-3xl font-bold text-yellow-600">{rejectedIssuesCount}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        {/* Issues List */}
                        <div>
                            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                                {/* Tabs */}
                                <div className="flex border-b border-gray-200">
                                    <button
                                        onClick={() => setActiveTab('open')}
                                        className={`flex-1 px-4 py-3 font-medium text-sm transition-colors ${
                                            activeTab === 'open'
                                                ? 'bg-red-50 text-red-600 border-b-2 border-red-500'
                                                : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                    >
                                        খোলা ({openIssuesCount})
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('resolved')}
                                        className={`flex-1 px-4 py-3 font-medium text-sm transition-colors ${
                                            activeTab === 'resolved'
                                                ? 'bg-green-50 text-green-600 border-b-2 border-green-500'
                                                : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                    >
                                        সমাধান ({resolvedIssuesCount})
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('rejected')}
                                        className={`flex-1 px-4 py-3 font-medium text-sm transition-colors ${
                                            activeTab === 'rejected'
                                                ? 'bg-yellow-50 text-yellow-600 border-b-2 border-yellow-500'
                                                : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                    >
                                        প্রত্যাখ্যাত ({rejectedIssuesCount})
                                    </button>
                                </div>

                                {/* Issues */}
                                <div className="divide-y divide-gray-200">
                                    {filteredIssues.length === 0 ? (
                                        <div className="p-4 text-center text-gray-500">
                                            কোনো সমস্যা নেই
                                        </div>
                                    ) : (
                                        filteredIssues.map((issue) => (
                                            <button
                                                key={issue.id}
                                                onClick={() => setSelectedIssue(issue)}
                                                className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                                                    selectedIssue?.id === issue.id ? 'bg-blue-50' : ''
                                                } ${severityColors[issue.severity]}`}
                                            >
                                                <p className="font-medium capitalize text-sm">
                                                    {issue.issue_type.replace(/_/g, ' ')}
                                                </p>
                                                <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                                    {issue.issue_description}
                                                </p>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Issue Details */}
                        <div className="lg:col-span-2">
                            {selectedIssue ? (
                                <div className="bg-white rounded-lg shadow-sm p-6">
                                    <div className="mb-6">
                                        <div className="flex items-start justify-between mb-4">
                                            <div>
                                                <h2 className="text-lg font-semibold text-gray-900 capitalize">
                                                    {selectedIssue.issue_type.replace(/_/g, ' ')}
                                                </h2>
                                                <p className="text-gray-600 text-sm mt-1">
                                                    {selectedIssue.issue_description}
                                                </p>
                                            </div>
                                            <span
                                                className={`px-3 py-1 rounded-full text-xs font-semibold ${severityColors[selectedIssue.severity]}`}
                                            >
                                                {selectedIssue.severity}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Messages */}
                                    {selectedIssue.messages && selectedIssue.messages.length > 0 && (
                                        <div className="mb-6 pb-6 border-b">
                                            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                                <MessageCircle className="w-4 h-4" />
                                                মন্তব্য ও আলোচনা
                                            </h3>
                                            <div className="space-y-3 max-h-48 overflow-y-auto">
                                                {selectedIssue.messages.map((msg, idx) => (
                                                    <div key={idx} className="bg-gray-50 p-3 rounded-lg text-sm">
                                                        <p className="font-medium text-gray-900">{msg.user_name}</p>
                                                        <p className="text-gray-700 mt-1">{msg.message}</p>
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            {new Date(msg.created_at).toLocaleString('bn-BD')}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    {selectedIssue.status === 'open' && (
                                        <div className="space-y-4">
                                            {/* Resolve */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-900 mb-2">
                                                    ✅ সমাধান করুন
                                                </label>
                                                <textarea
                                                    value={resolutionNotes}
                                                    onChange={(e) => setResolutionNotes(e.target.value)}
                                                    placeholder="সমাধানের বিবরণ লিখুন..."
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                                                    rows={3}
                                                />
                                                <button
                                                    onClick={handleResolve}
                                                    disabled={loading || !resolutionNotes.trim()}
                                                    className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                                                >
                                                    {loading && <Loader className="w-4 h-4 animate-spin" />}
                                                    <CheckCircle className="w-4 h-4" />
                                                    সমাধান করুন
                                                </button>
                                            </div>

                                            {/* Reject */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-900 mb-2">
                                                    ❌ শাখায় ফেরত পাঠান
                                                </label>
                                                <textarea
                                                    value={rejectionReason}
                                                    onChange={(e) => setRejectionReason(e.target.value)}
                                                    placeholder="কেন ফেরত পাঠাচ্ছেন তা ব্যাখ্যা করুন..."
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                                                    rows={3}
                                                />
                                                <button
                                                    onClick={handleReject}
                                                    disabled={loading || !rejectionReason.trim()}
                                                    className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                                                >
                                                    {loading && <Loader className="w-4 h-4 animate-spin" />}
                                                    <XCircle className="w-4 h-4" />
                                                    ফেরত পাঠান
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {selectedIssue.status !== 'open' && (
                                        <div className={`p-4 rounded-lg text-center font-semibold ${
                                            selectedIssue.status === 'resolved'
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                            {selectedIssue.status === 'resolved'
                                                ? '✅ সমাধান করা হয়েছে'
                                                : '❌ প্রত্যাখ্যাত করা হয়েছে'}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                                    <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4 opacity-50" />
                                    <p className="text-gray-600">সব সমস্যা সমাধান হয়েছে!</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Approval Action */}
                    {openIssuesCount === 0 && (
                        <div className="bg-green-50 rounded-lg shadow-sm p-6 border border-green-200 text-center">
                            <CheckCircle className="w-12 h-12 mx-auto text-green-600 mb-3" />
                            <h3 className="text-xl font-bold text-gray-900 mb-2">সব সমস্যা সমাধান হয়েছে!</h3>
                            <p className="text-gray-600 mb-4">এখন চূড়ান্ত অনুমোদনে এগিয়ে যান।</p>
                            <button
                                onClick={() => router.visit(`/issue-processing/${applicationType}/${application.id}/approval`)}
                                className="inline-flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold text-lg"
                            >
                                ✅ চূড়ান্ত অনুমোদন
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
