import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import AdminLayout from '@/layouts/admin-layout';
import {
    CheckCircle,
    AlertTriangle,
    XCircle,
    Clock,
    Eye,
    Filter,
} from 'lucide-react';

interface Member {
    id: number;
    member_name: string;
    mobile: string;
    status: string;
    head_office_decision: string;
    head_office_status_label: string;
    head_office_reviewed_at?: string;
    head_office_reviewed_by?: string;
}

interface AdmissionDetail {
    id: number;
    application_no: string;
    total_members: number;
    branch_name: string;
    submitted_at: string;
    reviewed_at: string;
    members: Member[];
}

interface Props {
    admission: AdmissionDetail;
}

export default function HeadOfficeAdmissionDetail({ admission }: Props) {
    const [members, setMembers] = useState<Member[]>(admission.members || []);
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState<string>('');

    useEffect(() => {
        // Filter members based on status and search
        let filtered = admission.members;

        if (statusFilter) {
            filtered = filtered.filter(m =>
                statusFilter === 'reviewed'
                    ? m.head_office_reviewed_at
                    : m.head_office_decision === statusFilter
            );
        }

        if (searchQuery) {
            filtered = filtered.filter(m =>
                m.member_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                m.mobile.includes(searchQuery)
            );
        }

        setMembers(filtered);
    }, [statusFilter, searchQuery]);

    const getDecisionBadge = (decision: string, reviewed_at: string | undefined) => {
        if (!reviewed_at) {
            return (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                    <Clock size={14} />
                    পেন্ডিং
                </span>
            );
        }

        const badges: Record<string, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
            approved: {
                bg: 'bg-green-100',
                text: 'text-green-800',
                icon: <CheckCircle size={14} />,
                label: 'অনুমোদিত',
            },
            rejected: {
                bg: 'bg-red-100',
                text: 'text-red-800',
                icon: <XCircle size={14} />,
                label: 'প্রত্যাখ্যাত',
            },
            needs_correction: {
                bg: 'bg-orange-100',
                text: 'text-orange-800',
                icon: <AlertTriangle size={14} />,
                label: 'সংশোধন প্রয়োজন',
            },
        };

        const badge = badges[decision] || badges.approved;
        return (
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                {badge.icon}
                {badge.label}
            </span>
        );
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved':
                return 'bg-green-50 border-l-4 border-green-600';
            case 'issue':
                return 'bg-orange-50 border-l-4 border-orange-600';
            case 'rejected':
                return 'bg-red-50 border-l-4 border-red-600';
            case 'pending':
                return 'bg-yellow-50 border-l-4 border-yellow-600';
            default:
                return 'bg-gray-50 border-l-4 border-gray-600';
        }
    };

    const pendingCount = admission.members.filter(m => !m.head_office_reviewed_at).length;
    const approvedCount = admission.members.filter(m => m.head_office_decision === 'approved').length;
    const rejectedCount = admission.members.filter(m => m.head_office_decision === 'rejected').length;
    const correctionCount = admission.members.filter(m => m.head_office_decision === 'needs_correction').length;

    return (
        <AdminLayout>
            <Head title={`ভর্তি - ${admission.application_no}`} />

            <div className="py-6">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Header */}
                    <div className="mb-6">
                        <h1 className="text-3xl font-bold text-gray-900">{admission.application_no}</h1>
                        <p className="text-gray-600 mt-1">{admission.branch_name} - জমা দেওয়া হয়েছে {new Date(admission.submitted_at).toLocaleDateString('bn-BD')}</p>
                    </div>

                    {/* Statistics */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                        <div className="bg-white rounded-lg shadow-sm p-4 text-center">
                            <p className="text-2xl font-bold text-blue-600">{admission.total_members}</p>
                            <p className="text-xs text-gray-600 mt-1">মোট সদস্য</p>
                        </div>
                        <div className="bg-yellow-50 rounded-lg shadow-sm p-4 text-center border-2 border-yellow-200">
                            <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
                            <p className="text-xs text-gray-600 mt-1">পেন্ডিং</p>
                        </div>
                        <div className="bg-green-50 rounded-lg shadow-sm p-4 text-center border-2 border-green-200">
                            <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
                            <p className="text-xs text-gray-600 mt-1">অনুমোদিত</p>
                        </div>
                        <div className="bg-orange-50 rounded-lg shadow-sm p-4 text-center border-2 border-orange-200">
                            <p className="text-2xl font-bold text-orange-600">{correctionCount}</p>
                            <p className="text-xs text-gray-600 mt-1">সংশোধন</p>
                        </div>
                        <div className="bg-red-50 rounded-lg shadow-sm p-4 text-center border-2 border-red-200">
                            <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
                            <p className="text-xs text-gray-600 mt-1">প্রত্যাখ্যাত</p>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    স্ট্যাটাস
                                </label>
                                <div className="flex items-center gap-2">
                                    <Filter className="w-5 h-5 text-gray-400" />
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">সব</option>
                                        <option value="reviewed">যাচাইকৃত</option>
                                        <option value="approved">অনুমোদিত</option>
                                        <option value="rejected">প্রত্যাখ্যাত</option>
                                        <option value="needs_correction">সংশোধন প্রয়োজন</option>
                                    </select>
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    খুঁজুন (নাম বা মোবাইল)
                                </label>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="সদস্যের নাম বা মোবাইল নম্বর..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Members List */}
                    <div className="space-y-3">
                        {members.length === 0 ? (
                            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                                <p className="text-gray-600">কোনো সদস্য পাওয়া যায়নি</p>
                            </div>
                        ) : (
                            members.map((member) => (
                                <div
                                    key={member.id}
                                    className={`rounded-lg shadow-sm p-4 ${getStatusColor(member.status)}`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-gray-900">{member.member_name}</h3>
                                            <p className="text-sm text-gray-600 mt-1">মোবাইল: {member.mobile}</p>
                                            {member.head_office_reviewed_at && (
                                                <p className="text-xs text-gray-500 mt-1">
                                                    যাচাই: {new Date(member.head_office_reviewed_at).toLocaleString('bn-BD')} by {member.head_office_reviewed_by}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {getDecisionBadge(member.head_office_decision, member.head_office_reviewed_at)}
                                            <a
                                                href={`/head-office/admissions/member/${member.id}/review`}
                                                className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                                            >
                                                <Eye size={16} />
                                                রিভিউ
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            ))
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
