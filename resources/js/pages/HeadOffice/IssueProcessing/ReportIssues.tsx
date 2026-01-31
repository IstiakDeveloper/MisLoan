import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import {
    ChevronRight,
    AlertCircle,
    CheckCircle,
    ArrowLeft,
    Zap,
} from 'lucide-react';

interface Issue {
    type: string;
    description: string;
    severity: string;
}

interface MemberIssues {
    member_name: string;
    issues: Issue[];
}

interface Props {
    application: any;
    applicationType: string;
    issuesDetected: Record<string, MemberIssues>;
    totalMembers: number;
    membersWithIssues: number;
}

const severityColors: Record<string, { bg: string; text: string; icon: string }> = {
    critical: { bg: 'bg-red-100', text: 'text-red-800', icon: '🔴' },
    warning: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '🟡' },
    info: { bg: 'bg-blue-100', text: 'text-blue-800', icon: '🔵' },
};

export default function ReportIssues({
    application,
    applicationType,
    issuesDetected,
    totalMembers,
    membersWithIssues,
}: Props) {
    const hasIssues = membersWithIssues > 0;

    const handleNext = () => {
        router.visit(`/issue-processing/${applicationType}/${application.id}/process`);
    };

    return (
        <AdminLayout>
            <Head title={`Report Issues - ${application.application_no}`} />

            <div className="py-8">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
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
                                    🔍 Step 2: Report Issues
                                </h1>
                            </div>
                            <p className="text-gray-600">Issues automatically detected and recorded</p>
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
                                    <div className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full font-bold">
                                        2
                                    </div>
                                    <span className="font-medium text-gray-900">Report</span>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                            <div className="flex-1">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-8 h-8 bg-gray-300 text-gray-600 rounded-full font-bold">
                                        3
                                    </div>
                                    <span className="text-gray-600">Process</span>
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

                    {/* Summary Cards */}
                    <div className="grid grid-cols-3 gap-4 mb-8">
                        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-500">
                            <p className="text-sm text-gray-600">মোট সদস্য</p>
                            <p className="text-3xl font-bold text-gray-900">{totalMembers}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-yellow-500">
                            <p className="text-sm text-gray-600">সমস্যা সহ</p>
                            <p className="text-3xl font-bold text-gray-900">{membersWithIssues}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-green-500">
                            <p className="text-sm text-gray-600">পরিষ্কার</p>
                            <p className="text-3xl font-bold text-gray-900">{totalMembers - membersWithIssues}</p>
                        </div>
                    </div>

                    {/* Issues Report */}
                    {hasIssues ? (
                        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
                            <div className="flex items-center gap-3 mb-6">
                                <AlertCircle className="w-6 h-6 text-red-500" />
                                <h2 className="text-xl font-semibold text-gray-900">
                                    {membersWithIssues} টি সদস্যের সমস্যা রয়েছে
                                </h2>
                            </div>

                            <div className="space-y-6">
                                {Object.entries(issuesDetected).map(([memberId, memberData]) => (
                                    <div
                                        key={memberId}
                                        className="border-l-4 border-red-500 pl-4 py-4"
                                    >
                                        <h3 className="font-semibold text-gray-900 mb-3">
                                            {memberData.member_name}
                                        </h3>

                                        <div className="space-y-2">
                                            {memberData.issues.map((issue, idx) => {
                                                const colors = severityColors[issue.severity] || severityColors.info;
                                                return (
                                                    <div
                                                        key={idx}
                                                        className={`${colors.bg} ${colors.text} px-4 py-3 rounded-lg`}
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <span className="text-lg flex-shrink-0">{colors.icon}</span>
                                                            <div>
                                                                <p className="font-medium capitalize">
                                                                    {issue.type.replace(/_/g, ' ')}
                                                                </p>
                                                                <p className="text-sm opacity-90">
                                                                    {issue.description}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-green-50 rounded-lg shadow-sm p-8 text-center border border-green-200 mb-8">
                            <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">সবকিছু ঠিক আছে!</h2>
                            <p className="text-gray-600">কোনো সমস্যা সনাক্ত করা হয়নি। সরাসরি অনুমোদনে এগিয়ে যান।</p>
                        </div>
                    )}

                    {/* Next Steps */}
                    <div className="bg-blue-50 rounded-lg shadow-sm p-6 border border-blue-200">
                        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Zap className="w-5 h-5 text-blue-600" />
                            পরবর্তী ধাপ
                        </h3>
                        <p className="text-gray-700 mb-4">
                            {hasIssues
                                ? 'পরবর্তী ধাপে যান যেখানে প্রতিটি সমস্যা সমাধান করতে পারবেন।'
                                : 'সমস্ত সদস্য স্বয়ংক্রিয়ভাবে অনুমোদিত হবে।'}
                        </p>
                        <button
                            onClick={handleNext}
                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                            {hasIssues ? 'সমস্যা প্রক্রিয়া করুন' : 'অনুমোদনে যান'}
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
