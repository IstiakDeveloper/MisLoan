import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import AdminLayout from '@/layouts/admin-layout';
import {
    Calendar,
    Users,
    AlertTriangle,
    CheckCircle,
    Clock,
    XCircle,
    Eye,
} from 'lucide-react';

interface MemberStats {
    total: number;
    pending: number;
    issue: number;
    approved: number;
    rejected: number;
    head_office_reviewed: number;
}

interface AdmissionSummary {
    id: number;
    application_no: string;
    total_members: number;
    status: string;
    submitted_at: string;
    member_stats: MemberStats;
}

interface DateGroup {
    date: string;
    total_members: number;
    admissions: AdmissionSummary[];
}

export default function AdmissionByDateView() {
    const [admissions, setAdmissions] = useState<DateGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchAdmissionsByDate();
    }, []);

    const fetchAdmissionsByDate = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/admissions/api/by-date');
            if (response.data.success) {
                setAdmissions(response.data.data);
            }
        } catch (err) {
            setError('ডেটা লোড করতে সমস্যা হয়েছে');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const badges: Record<string, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
            pending: {
                bg: 'bg-yellow-100',
                text: 'text-yellow-800',
                icon: <Clock size={16} />,
                label: 'পেন্ডিং',
            },
            issue: {
                bg: 'bg-orange-100',
                text: 'text-orange-800',
                icon: <AlertTriangle size={16} />,
                label: 'সমস্যা',
            },
            approved: {
                bg: 'bg-green-100',
                text: 'text-green-800',
                icon: <CheckCircle size={16} />,
                label: 'অনুমোদিত',
            },
            rejected: {
                bg: 'bg-red-100',
                text: 'text-red-800',
                icon: <XCircle size={16} />,
                label: 'প্রত্যাখ্যাত',
            },
        };
        const badge = badges[status] || badges.pending;
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                {badge.icon}
                {badge.label}
            </span>
        );
    };

    if (loading) {
        return (
            <AdminLayout>
                <Head title="ভর্তি - তারিখ অনুযায়ী" />
                <div className="py-6">
                    <div className="max-w-6xl mx-auto px-4">
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="mt-4 text-gray-600">লোড হচ্ছে...</p>
                        </div>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <Head title="ভর্তি - তারিখ অনুযায়ী" />

            <div className="py-6">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900">সদস্য ভর্তি - তারিখ অনুযায়ী</h1>
                        <p className="text-gray-600 mt-2">প্রতিটি তারিখে জমা দেওয়া ভর্তি এবং তাদের স্ট্যাটাস</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                            <p className="text-red-800">{error}</p>
                        </div>
                    )}

                    {admissions.length === 0 ? (
                        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600">কোনো ভর্তি পাওয়া যায়নি</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {admissions.map((dateGroup, idx) => (
                                <div key={idx} className="bg-white rounded-lg shadow-md overflow-hidden">
                                    {/* Date Header */}
                                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Calendar className="w-6 h-6 text-white" />
                                                <div>
                                                    <h2 className="text-lg font-bold text-white">{dateGroup.date}</h2>
                                                    <p className="text-blue-100 text-sm">মোট {dateGroup.total_members} জন সদস্য</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-bold text-white">{dateGroup.admissions.length}</p>
                                                <p className="text-blue-100 text-xs">ভর্তি</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Admissions List */}
                                    <div className="divide-y">
                                        {dateGroup.admissions.map((admission) => (
                                            <div key={admission.id} className="p-6">
                                                <div className="mb-4">
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div>
                                                            <h3 className="text-lg font-semibold text-gray-900">
                                                                {admission.application_no}
                                                            </h3>
                                                            <p className="text-sm text-gray-600">সময়: {admission.submitted_at}</p>
                                                        </div>
                                                        {getStatusBadge(admission.status)}
                                                    </div>
                                                </div>

                                                {/* Member Statistics */}
                                                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-4">
                                                    <div className="bg-blue-50 rounded p-3 text-center">
                                                        <p className="text-2xl font-bold text-blue-600">{admission.member_stats.total}</p>
                                                        <p className="text-xs text-gray-600 mt-1">মোট</p>
                                                    </div>
                                                    <div className="bg-yellow-50 rounded p-3 text-center">
                                                        <p className="text-2xl font-bold text-yellow-600">{admission.member_stats.pending}</p>
                                                        <p className="text-xs text-gray-600 mt-1">পেন্ডিং</p>
                                                    </div>
                                                    <div className="bg-orange-50 rounded p-3 text-center">
                                                        <p className="text-2xl font-bold text-orange-600">{admission.member_stats.issue}</p>
                                                        <p className="text-xs text-gray-600 mt-1">সমস্যা</p>
                                                    </div>
                                                    <div className="bg-green-50 rounded p-3 text-center">
                                                        <p className="text-2xl font-bold text-green-600">{admission.member_stats.approved}</p>
                                                        <p className="text-xs text-gray-600 mt-1">অনুমোদিত</p>
                                                    </div>
                                                    <div className="bg-red-50 rounded p-3 text-center">
                                                        <p className="text-2xl font-bold text-red-600">{admission.member_stats.rejected}</p>
                                                        <p className="text-xs text-gray-600 mt-1">প্রত্যাখ্যাত</p>
                                                    </div>
                                                    <div className="bg-purple-50 rounded p-3 text-center">
                                                        <p className="text-2xl font-bold text-purple-600">
                                                            {admission.member_stats.head_office_reviewed}
                                                        </p>
                                                        <p className="text-xs text-gray-600 mt-1">যাচাইকৃত</p>
                                                    </div>
                                                </div>

                                                {/* Action Button */}
                                                <div className="mt-4">
                                                    <a
                                                        href={`/admissions/${admission.id}`}
                                                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                                                    >
                                                        <Eye size={16} />
                                                        বিবরণ দেখুন
                                                    </a>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
