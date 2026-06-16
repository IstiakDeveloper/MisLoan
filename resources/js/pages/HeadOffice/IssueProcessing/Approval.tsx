import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import AdminLayout from '@/layouts/admin-layout';
import { formatDate } from '@/utils/dateUtils';
import { ChevronRight, CheckCircle, Trophy, Mail, Calendar, ArrowLeft } from 'lucide-react';

interface Props {
    application: any;
    applicationType: string;
    resolvedIssuesCount: number;
    rejectedIssuesCount: number;
}

export default function ApprovalPage({
    application,
    applicationType,
    resolvedIssuesCount,
    rejectedIssuesCount,
}: Props) {
    const [loading, setLoading] = useState(false);
    const [approved, setApproved] = useState(false);

    const handleFinalApproval = async () => {
        setLoading(true);
        try {
            const response = await axios.post(`/issue-processing/${applicationType}/${application.id}/approve`, {}, {
                headers: {
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                }
            });

            if (response.data.success) {
                setApproved(true);
                setTimeout(() => {
                    router.visit('/issue-processing');
                }, 3000);
            }
        } catch (error) {
            console.error('Error approving:', error);
        } finally {
            setLoading(false);
        }
    };

    if (approved) {
        return (
            <AdminLayout>
                <Head title="অনুমোদন সম্পন্ন" />
                <div className="py-12">
                    <div className="max-w-2xl mx-auto px-4">
                        <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg shadow-lg p-12 text-center">
                            <Trophy className="w-20 h-20 mx-auto text-green-600 mb-4" />
                            <h1 className="text-4xl font-bold text-gray-900 mb-3">
                                🎉 সফলভাবে অনুমোদিত!
                            </h1>
                            <p className="text-xl text-gray-700 mb-8">
                                আবেদন #{application.application_no} চূড়ান্তভাবে অনুমোদিত হয়েছে।
                            </p>

                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="bg-white rounded-lg p-4 border-l-4 border-green-500">
                                    <p className="text-sm text-gray-600">সদস্য</p>
                                    <p className="text-2xl font-bold text-green-600">
                                        {application.members_count || 0}
                                    </p>
                                </div>
                                <div className="bg-white rounded-lg p-4 border-l-4 border-blue-500">
                                    <p className="text-sm text-gray-600">সমাধান করা সমস্যা</p>
                                    <p className="text-2xl font-bold text-blue-600">{resolvedIssuesCount}</p>
                                </div>
                            </div>

                            <p className="text-gray-600 mb-8">আপনি এখন শাখায় ফিরিয়ে পাঠাবেন...</p>

                            <button
                                onClick={() => router.visit('/issue-processing')}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                            >
                                ড্যাশবোর্ডে ফিরুন
                            </button>
                        </div>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <Head title="চূড়ান্ত অনুমোদন" />

            <div className="py-8">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
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
                                    ✅ Step 4: চূড়ান্ত অনুমোদন
                                </h1>
                            </div>
                            <p className="text-gray-600">সব সমস্যা সমাধান - এখন অনুমোদন করুন</p>
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
                                    <div className="flex items-center justify-center w-8 h-8 bg-green-600 text-white rounded-full font-bold">
                                        ✓
                                    </div>
                                    <span className="font-medium text-gray-900">Process</span>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                            <div className="flex-1">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full font-bold">
                                        4
                                    </div>
                                    <span className="font-medium text-gray-900">Approve</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg shadow-sm p-8 border border-green-200 mb-8">
                        <div className="flex items-start gap-6">
                            <Trophy className="w-16 h-16 text-green-600 flex-shrink-0 mt-2" />
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">সব প্রস্তুত!</h2>
                                <p className="text-gray-700 mb-4">
                                    আবেদন #{application.application_no} এর সব সমস্যা সমাধান হয়েছে। এখন
                                    চূড়ান্ত অনুমোদন প্রদান করুন এবং শাখায় ফিরিয়ে পাঠান।
                                </p>

                                <div className="grid grid-cols-3 gap-4 mt-6">
                                    <div className="bg-white rounded-lg p-4">
                                        <p className="text-sm text-gray-600 mb-1">সদস্য</p>
                                        <p className="text-3xl font-bold text-blue-600">
                                            {application.members_count || 0}
                                        </p>
                                    </div>
                                    <div className="bg-white rounded-lg p-4">
                                        <p className="text-sm text-gray-600 mb-1">সমাধান করা</p>
                                        <p className="text-3xl font-bold text-green-600">
                                            {resolvedIssuesCount}
                                        </p>
                                    </div>
                                    <div className="bg-white rounded-lg p-4">
                                        <p className="text-sm text-gray-600 mb-1">প্রত্যাখ্যাত</p>
                                        <p className="text-3xl font-bold text-red-600">
                                            {rejectedIssuesCount}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Application Details */}
                    <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">আবেদনের বিবরণ</h3>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <p className="text-sm text-gray-600">আবেদন নম্বর</p>
                                <p className="text-lg font-semibold text-gray-900">
                                    {application.application_no}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">ধরন</p>
                                <p className="text-lg font-semibold text-gray-900 capitalize">
                                    {applicationType === 'admission' ? 'ভর্তি' : 'ঋণ'}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">আবেদনের তারিখ</p>
                                <p className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    {formatDate(application.created_at)}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">অবস্থান</p>
                                <p className="text-lg font-semibold text-gray-900">
                                    {application.branch?.area?.zone?.name} - {application.branch?.area?.name}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Notification */}
                    <div className="bg-blue-50 rounded-lg p-6 border border-blue-200 mb-8 flex items-start gap-4">
                        <Mail className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                        <div>
                            <p className="font-semibold text-gray-900 mb-2">📧 ইমেইল বিজ্ঞপ্তি</p>
                            <p className="text-sm text-gray-700">
                                অনুমোদনের পর শাখা ম্যানেজার তাদের ইমেইলে বিজ্ঞপ্তি পাবেন। আবেদনটি পরবর্তী পর্যায়ে
                                চলে যাবে।
                            </p>
                        </div>
                    </div>

                    {/* Approval Button */}
                    <div className="flex gap-4">
                        <button
                            onClick={() => router.visit('/issue-processing')}
                            disabled={loading}
                            className="flex-1 px-6 py-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
                        >
                            বাতিল করুন
                        </button>
                        <button
                            onClick={handleFinalApproval}
                            disabled={loading}
                            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold text-lg"
                        >
                            <CheckCircle className="w-5 h-5" />
                            {loading ? 'প্রক্রিয়াধীন...' : '✅ চূড়ান্ত অনুমোদন দিন'}
                        </button>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
