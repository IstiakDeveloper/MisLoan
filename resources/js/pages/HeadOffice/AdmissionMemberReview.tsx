import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import AdminLayout from '@/layouts/admin-layout';
import {
    CheckCircle,
    AlertTriangle,
    XCircle,
    Send,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';

interface Member {
    id: number;
    member_name: string;
    mobile: string;
    status: string;
    head_office_decision: string;
    head_office_status_label: string;
    head_office_reviewed_at?: string;
    head_office_remarks?: string;
    branch_correction_remarks?: string;
    branch_feedback_at?: string;
    head_office_reviewed_by?: string;
}

interface Props {
    member: Member;
    admission_id: string;
}

export default function HeadOfficeMemberReview({ member, admission_id }: Props) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [expandedSection, setExpandedSection] = useState<'info' | 'review' | 'history' | null>('info');
    const [selectedAction, setSelectedAction] = useState<'approve' | 'correct' | 'reject' | null>(null);
    const [remarks, setRemarks] = useState('');

    const handleApprove = async () => {
        if (!remarks.trim()) {
            alert('অনুগ্রহ করে মন্তব্য লিখুন');
            return;
        }

        try {
            setIsProcessing(true);
            const response = await axios.post(`/head-office/admissions/member/${member.id}/approve`, {
                remarks,
            });

            if (response.data.success) {
                alert('সদস্য অনুমোদিত হয়েছে');
                setRemarks('');
                setSelectedAction(null);
                window.location.reload();
            }
        } catch (error) {
            alert('ত্রুটি: অনুমোদন ব্যর্থ হয়েছে');
            console.error(error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRequestCorrection = async () => {
        if (!remarks.trim()) {
            alert('অনুগ্রহ করে কারণ লিখুন');
            return;
        }

        try {
            setIsProcessing(true);
            const response = await axios.post(`/head-office/admissions/member/${member.id}/request-correction`, {
                remarks,
            });

            if (response.data.success) {
                alert('সংশোধনের জন্য অনুরোধ পাঠানো হয়েছে');
                setRemarks('');
                setSelectedAction(null);
                window.location.reload();
            }
        } catch (error) {
            alert('ত্রুটি: অনুরোধ ব্যর্থ হয়েছে');
            console.error(error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!remarks.trim()) {
            alert('অনুগ্রহ করে কারণ লিখুন');
            return;
        }

        try {
            setIsProcessing(true);
            const response = await axios.post(`/head-office/admissions/member/${member.id}/reject`, {
                remarks,
            });

            if (response.data.success) {
                alert('সদস্য প্রত্যাখ্যান করা হয়েছে');
                setRemarks('');
                setSelectedAction(null);
                window.location.reload();
            }
        } catch (error) {
            alert('ত্রুটি: প্রত্যাখ্যান ব্যর্থ হয়েছে');
            console.error(error);
        } finally {
            setIsProcessing(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved':
                return 'text-green-600';
            case 'rejected':
                return 'text-red-600';
            case 'needs_correction':
                return 'text-orange-600';
            default:
                return 'text-yellow-600';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'approved':
                return <CheckCircle size={20} className="text-green-600" />;
            case 'rejected':
                return <XCircle size={20} className="text-red-600" />;
            case 'needs_correction':
                return <AlertTriangle size={20} className="text-orange-600" />;
            default:
                return null;
        }
    };

    return (
        <AdminLayout>
            <Head title={`রিভিউ - ${member.member_name}`} />

            <div className="py-6">
                <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Header */}
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-gray-900">{member.member_name}</h1>
                        <p className="text-gray-600 mt-1">মোবাইল: {member.mobile}</p>
                    </div>

                    {/* Current Status */}
                    {member.head_office_reviewed_at && (
                        <div className={`bg-white rounded-lg shadow-sm p-4 mb-6 border-l-4 ${getStatusColor(member.head_office_decision).replace('text-', 'border-')}`}>
                            <div className="flex items-start gap-3">
                                <div className="pt-1">{getStatusIcon(member.head_office_decision)}</div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-900 mb-2">
                                        বর্তমান স্ট্যাটাস: {member.head_office_status_label}
                                    </h3>
                                    <p className="text-sm text-gray-600 mb-2">
                                        যাচাই করেছেন: {member.head_office_reviewed_by}
                                    </p>
                                    <p className="text-sm text-gray-600 mb-2">
                                        তারিখ: {new Date(member.head_office_reviewed_at).toLocaleString('bn-BD')}
                                    </p>
                                    {member.head_office_remarks && (
                                        <p className="text-sm bg-gray-50 p-2 rounded mt-2 text-gray-700">
                                            {member.head_office_remarks}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Sections */}
                    <div className="space-y-4">
                        {/* Member Info Section */}
                        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                            <button
                                onClick={() => setExpandedSection(expandedSection === 'info' ? null : 'info')}
                                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
                            >
                                <h2 className="font-semibold text-gray-900">সদস্যের তথ্য</h2>
                                {expandedSection === 'info' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </button>
                            {expandedSection === 'info' && (
                                <div className="px-6 py-4 border-t">
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-sm text-gray-600">নাম</label>
                                            <p className="font-semibold text-gray-900">{member.member_name}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm text-gray-600">মোবাইল</label>
                                            <p className="font-semibold text-gray-900">{member.mobile}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm text-gray-600">স্ট্যাটাস</label>
                                            <p className="font-semibold text-gray-900">{member.status}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Review History Section */}
                        {member.branch_feedback_at && (
                            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                                <button
                                    onClick={() => setExpandedSection(expandedSection === 'history' ? null : 'history')}
                                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
                                >
                                    <h2 className="font-semibold text-gray-900">শাখার প্রতিক্রিয়া</h2>
                                    {expandedSection === 'history' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </button>
                                {expandedSection === 'history' && (
                                    <div className="px-6 py-4 border-t">
                                        <div className="bg-blue-50 p-3 rounded mb-2">
                                            <p className="text-sm text-gray-600 mb-1">
                                                তারিখ: {new Date(member.branch_feedback_at).toLocaleString('bn-BD')}
                                            </p>
                                            <p className="text-gray-700">{member.branch_correction_remarks}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Review Section */}
                        {!member.head_office_reviewed_at && (
                            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                                <button
                                    onClick={() => setExpandedSection(expandedSection === 'review' ? null : 'review')}
                                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
                                >
                                    <h2 className="font-semibold text-gray-900">সিদ্ধান্ত নিন</h2>
                                    {expandedSection === 'review' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </button>
                                {expandedSection === 'review' && (
                                    <div className="px-6 py-6 border-t space-y-4">
                                        {/* Action Buttons */}
                                        <div className="grid grid-cols-3 gap-2 mb-6">
                                            <button
                                                onClick={() => {
                                                    setSelectedAction('approve');
                                                    setRemarks('');
                                                }}
                                                className={`px-4 py-2 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                                                    selectedAction === 'approve'
                                                        ? 'bg-green-600 text-white'
                                                        : 'bg-green-50 text-green-700 hover:bg-green-100'
                                                }`}
                                            >
                                                <CheckCircle size={18} />
                                                অনুমোদন
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedAction('correct');
                                                    setRemarks('');
                                                }}
                                                className={`px-4 py-2 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                                                    selectedAction === 'correct'
                                                        ? 'bg-orange-600 text-white'
                                                        : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                                                }`}
                                            >
                                                <AlertTriangle size={18} />
                                                সংশোধন
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedAction('reject');
                                                    setRemarks('');
                                                }}
                                                className={`px-4 py-2 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                                                    selectedAction === 'reject'
                                                        ? 'bg-red-600 text-white'
                                                        : 'bg-red-50 text-red-700 hover:bg-red-100'
                                                }`}
                                            >
                                                <XCircle size={18} />
                                                প্রত্যাখ্যান
                                            </button>
                                        </div>

                                        {/* Remarks Input */}
                                        {selectedAction && (
                                            <div className="space-y-3">
                                                <label className="block">
                                                    <span className="text-sm font-medium text-gray-700 mb-2 block">মন্তব্য</span>
                                                    <textarea
                                                        value={remarks}
                                                        onChange={(e) => setRemarks(e.target.value)}
                                                        placeholder={
                                                            selectedAction === 'approve'
                                                                ? 'অনুমোদনের মন্তব্য লিখুন...'
                                                                : selectedAction === 'correct'
                                                                ? 'সংশোধনের কারণ লিখুন...'
                                                                : 'প্রত্যাখ্যানের কারণ লিখুন...'
                                                        }
                                                        rows={4}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    />
                                                </label>

                                                <button
                                                    onClick={() => {
                                                        if (selectedAction === 'approve') handleApprove();
                                                        else if (selectedAction === 'correct') handleRequestCorrection();
                                                        else if (selectedAction === 'reject') handleReject();
                                                    }}
                                                    disabled={isProcessing || !remarks.trim()}
                                                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition flex items-center justify-center gap-2"
                                                >
                                                    <Send size={18} />
                                                    {isProcessing ? 'প্রক্রিয়াধীন...' : 'নিশ্চিত করুন'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Back Button */}
                    <button
                        onClick={() => window.history.back()}
                        className="mt-6 px-4 py-2 text-gray-600 hover:text-gray-900 font-medium"
                    >
                        ← ফিরে যান
                    </button>
                </div>
            </div>
        </AdminLayout>
    );
}
