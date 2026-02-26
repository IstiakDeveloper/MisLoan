import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { CheckCircle, XCircle, RotateCcw, Eye, MessageSquare, Share2 } from 'lucide-react';

interface EscalationApprover {
    id: number;
    name: string;
    email: string;
    level: string;
    role_name: string;
}

interface Approval {
    id: number;
    member_admission_id: number;
    application_no: string;
    applicant_name: string;
    applicant_name_bn: string;
    branch_name: string;
    branch_id?: number;
    samity_name: string;
    submitted_at: string;
    level: string;
    sequence: number;
    revision_count: number;
    revision_comments: string | null;
    status: string;
    escalation_approvers?: EscalationApprover[];
}

interface LoanApproval {
    id: number;
    loan_application_id: number;
    application_no: string;
    applicant_name: string;
    applicant_name_bn: string;
    branch_name: string;
    requested_amount: number;
    submitted_at: string;
    level: string;
}

interface Props {
    approvals: Approval[];
    loanApprovals?: LoanApproval[];
}

export default function Index({ approvals, loanApprovals = [] }: Props) {
    const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
    const [action, setAction] = useState<'approve' | 'reject' | 'return' | 'forward' | null>(null);
    const [comments, setComments] = useState('');
    const [forwardToUserId, setForwardToUserId] = useState<string>('');
    const [showModal, setShowModal] = useState(false);

    const [selectedLoanApproval, setSelectedLoanApproval] = useState<LoanApproval | null>(null);
    const [loanAction, setLoanAction] = useState<'approve' | 'reject' | null>(null);
    const [loanComments, setLoanComments] = useState('');
    const [showLoanModal, setShowLoanModal] = useState(false);

    const handleAction = (approval: Approval, actionType: 'approve' | 'reject' | 'return' | 'forward') => {
        setSelectedApproval(approval);
        setAction(actionType);
        setComments('');
        setForwardToUserId('');
        setShowModal(true);
    };

    const submitAction = () => {
        if (!selectedApproval || !action) return;
        if (action === 'forward' && !forwardToUserId) {
            alert('Please select an approver to forward to.');
            return;
        }

        if (action === 'forward') {
            router.patch(`/approvals/${selectedApproval.id}/forward`, {
                forward_to_user_id: forwardToUserId,
                comments,
            }, {
                preserveScroll: true,
                onSuccess: () => {
                    setShowModal(false);
                    setSelectedApproval(null);
                    setAction(null);
                    setComments('');
                    setForwardToUserId('');
                },
            });
            return;
        }

        const routes = {
            approve: `/approvals/${selectedApproval.id}/approve`,
            reject: `/approvals/${selectedApproval.id}/reject`,
            return: `/approvals/${selectedApproval.id}/return-to-branch`,
        };

        router.patch(routes[action as keyof typeof routes], { comments }, {
            preserveScroll: true,
            onSuccess: () => {
                setShowModal(false);
                setSelectedApproval(null);
                setAction(null);
                setComments('');
            },
        });
    };

    const handleLoanAction = (loanApproval: LoanApproval, actionType: 'approve' | 'reject') => {
        setSelectedLoanApproval(loanApproval);
        setLoanAction(actionType);
        setLoanComments('');
        setShowLoanModal(true);
    };

    const submitLoanAction = () => {
        if (!selectedLoanApproval || !loanAction) return;
        if (loanAction === 'reject' && !loanComments.trim()) {
            alert('প্রত্যাখ্যানের জন্য মন্তব্য দিন।');
            return;
        }
        router.patch(`/approvals/loan/${selectedLoanApproval.id}/${loanAction}`, { comments: loanComments }, {
            preserveScroll: true,
            onSuccess: () => {
                setShowLoanModal(false);
                setSelectedLoanApproval(null);
                setLoanAction(null);
                setLoanComments('');
            },
        });
    };

    const getLevelBadge = (level: string) => {
        const colors = {
            branch: 'bg-blue-100 text-blue-800',
            area: 'bg-green-100 text-green-800',
            zone: 'bg-purple-100 text-purple-800',
            head_office: 'bg-red-100 text-red-800',
        };
        return colors[level as keyof typeof colors] || 'bg-gray-100 text-gray-800';
    };

    const isHeadOffice = (level: string) => level === 'head_office';
    const isBranchLevel = (level: string) => level === 'branch';

    return (
        <AdminLayout>
            <Head title="Pending Approvals" />

            <div className="p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Pending Approvals (অপেক্ষমান অনুমোদন)</h1>
                    <p className="text-gray-600 mt-1">Review and approve member admission applications</p>
                </div>

                {approvals.length === 0 && loanApprovals.length === 0 ? (
                    <div className="bg-white rounded-lg shadow p-8 text-center">
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pending Approvals</h3>
                        <p className="text-gray-600">You have no applications waiting for your approval.</p>
                    </div>
                ) : (
                    <>
                    {approvals.length > 0 && (
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Application No
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Applicant (আবেদনকারী)
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Branch (শাখা)
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Samity (সমিতি)
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Level
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Revision
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Submitted
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {approvals.map((approval) => (
                                    <tr key={approval.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{approval.application_no}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{approval.applicant_name}</div>
                                            <div className="text-sm text-gray-500">{approval.applicant_name_bn}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {approval.branch_name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {approval.samity_name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getLevelBadge(approval.level)}`}>
                                                {approval.level}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {approval.revision_count > 0 ? (
                                                <div className="flex items-center gap-1">
                                                    <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                                                        Rev: {approval.revision_count}
                                                    </span>
                                                    {approval.revision_comments && (
                                                        <button
                                                            onClick={() => alert(approval.revision_comments)}
                                                            className="text-blue-600 hover:text-blue-800"
                                                            title="View comments"
                                                        >
                                                            <MessageSquare className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-500">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(approval.submitted_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => router.visit(`/member-admissions/${approval.member_admission_id}`)}
                                                    className="text-blue-600 hover:text-blue-900"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleAction(approval, 'approve')}
                                                    className="text-green-600 hover:text-green-900"
                                                    title="Approve"
                                                >
                                                    <CheckCircle className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleAction(approval, 'reject')}
                                                    className="text-red-600 hover:text-red-900"
                                                    title="Reject"
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                </button>
                                                {isBranchLevel(approval.level) && (approval.escalation_approvers?.length ?? 0) > 0 && (
                                                    <button
                                                        onClick={() => handleAction(approval, 'forward')}
                                                        className="text-indigo-600 hover:text-indigo-900"
                                                        title="Forward to Area/Zone/ADMF/DMF/ED"
                                                    >
                                                        <Share2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {isHeadOffice(approval.level) && (
                                                    <button
                                                        onClick={() => handleAction(approval, 'return')}
                                                        className="text-yellow-600 hover:text-yellow-900"
                                                        title="Return to Branch"
                                                    >
                                                        <RotateCcw className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    )}

                {/* Loan Approvals Section */}
                {loanApprovals.length > 0 && (
                    <div className="mt-8">
                        <h2 className="text-lg font-bold text-gray-900 mb-3">ঋণ আবেদন অনুমোদন (Loan Approvals)</h2>
                        <div className="bg-white rounded-lg shadow overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">আবেদন নং</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">আবেদনকারী</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">শাখা</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">পরিমাণ</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">জমার তারিখ</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">অ্যাকশন</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {loanApprovals.map((la) => (
                                        <tr key={la.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{la.application_no}</td>
                                            <td className="px-6 py-4 text-sm">
                                                <div>{la.applicant_name_bn || la.applicant_name}</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-900">{la.branch_name}</td>
                                            <td className="px-6 py-4 text-sm">৳{Number(la.requested_amount).toLocaleString()}</td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {la.submitted_at ? new Date(la.submitted_at).toLocaleDateString('bn-BD') : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => router.visit(`/member/loan-applications/${la.loan_application_id}`)}
                                                        className="text-blue-600 hover:text-blue-900"
                                                        title="View"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleLoanAction(la, 'approve')}
                                                        className="text-green-600 hover:text-green-900"
                                                        title="অনুমোদন"
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleLoanAction(la, 'reject')}
                                                        className="text-red-600 hover:text-red-900"
                                                        title="প্রত্যাখ্যান"
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
                    </div>
                )}
                    </>
                )}
            </div>

            {/* Action Modal */}
            {showModal && selectedApproval && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold mb-4">
                            {action === 'approve' && 'Approve Application'}
                            {action === 'reject' && 'Reject Application'}
                            {action === 'return' && 'Return to Branch'}
                            {action === 'forward' && 'Forward to Approver'}
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Application: <strong>{selectedApproval.application_no}</strong>
                            <br />
                            Applicant: <strong>{selectedApproval.applicant_name}</strong>
                        </p>
                        {action === 'forward' && (
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Select approver (Area Manager, Zone Manager, ADMF, DMF, ED)
                                </label>
                                <select
                                    value={forwardToUserId}
                                    onChange={(e) => setForwardToUserId(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">-- Select approver --</option>
                                    {(selectedApproval.escalation_approvers ?? []).map((u) => (
                                        <option key={u.id} value={u.id}>
                                            {u.name} ({u.role_name || u.level})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Comments {action !== 'approve' && action !== 'forward' && <span className="text-red-500">*</span>}
                            </label>
                            <textarea
                                value={comments}
                                onChange={(e) => setComments(e.target.value)}
                                rows={4}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder={action === 'forward' ? 'Optional comment...' : 'Add your comments...'}
                                required={action !== 'approve' && action !== 'forward'}
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={submitAction}
                                disabled={
                                    (action !== 'approve' && action !== 'forward' && !comments.trim()) ||
                                    (action === 'forward' && !forwardToUserId)
                                }
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Loan Action Modal */}
            {showLoanModal && selectedLoanApproval && loanAction && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold mb-4">
                            {loanAction === 'approve' ? 'ঋণ আবেদন অনুমোদন' : 'ঋণ আবেদন প্রত্যাখ্যান'}
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                            আবেদন নং: <strong>{selectedLoanApproval.application_no}</strong>
                            <br />
                            আবেদনকারী: <strong>{selectedLoanApproval.applicant_name_bn || selectedLoanApproval.applicant_name}</strong>
                        </p>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                মন্তব্য {loanAction === 'reject' && <span className="text-red-500">*</span>}
                            </label>
                            <textarea
                                value={loanComments}
                                onChange={(e) => setLoanComments(e.target.value)}
                                rows={4}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder={loanAction === 'approve' ? 'ঐচ্ছিক মন্তব্য...' : 'প্রত্যাখ্যানের কারণ লিখুন...'}
                                required={loanAction === 'reject'}
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowLoanModal(false)}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                            >
                                বাতিল
                            </button>
                            <button
                                onClick={submitLoanAction}
                                className={`px-4 py-2 rounded-lg text-white ${loanAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                            >
                                {loanAction === 'approve' ? 'অনুমোদন' : 'প্রত্যাখ্যান'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
