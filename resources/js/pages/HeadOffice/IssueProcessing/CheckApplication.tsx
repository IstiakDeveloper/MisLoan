import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { formatDate } from '@/utils/dateUtils';
import {
    ChevronRight,
    MapPin,
    Users,
    Calendar,
    ArrowLeft,
} from 'lucide-react';

interface Member {
    id: number;
    member_name: string;
    mobile?: string;
    society_name?: string;
    family_monthly_income?: string;
}

interface Application {
    id: number;
    application_no: string;
    branch: {
        name: string;
        area: {
            name: string;
            zone: {
                name: string;
            };
        };
    };
    total_members: number;
    admission_members?: Member[];
    loan_members?: Member[];
    submitted_by?: {
        name: string;
    };
    submitted_at: string;
}

interface Props {
    application: Application;
    applicationType: string;
}

export default function CheckApplication({ application, applicationType }: Props) {
    const members = applicationType === 'admission' ? application.admission_members : application.loan_members;

    const handleNext = () => {
        router.visit(`/issue-processing/${applicationType}/${application.id}/report`);
    };

    return (
        <AdminLayout>
            <Head title={`Check - ${application.application_no}`} />

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
                                    📋 Step 1: Check Application
                                </h1>
                            </div>
                            <p className="text-gray-600">Review all application details before reporting issues</p>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-8 bg-white rounded-lg shadow-sm p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full font-bold">
                                        1
                                    </div>
                                    <span className="font-medium text-gray-900">Check</span>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                            <div className="flex-1">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-8 h-8 bg-gray-300 text-gray-600 rounded-full font-bold">
                                        2
                                    </div>
                                    <span className="text-gray-600">Report</span>
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

                    {/* Application Details */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        {/* Main Info */}
                        <div className="lg:col-span-2">
                            <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
                                {/* Header */}
                                <div className="border-b pb-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-600">আবেদন নং</p>
                                            <p className="text-2xl font-bold text-gray-900">{application.application_no}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">প্রকার</p>
                                            <p className="text-2xl font-bold text-gray-900 capitalize">
                                                {applicationType === 'admission' ? '👥 Member Admission' : '💰 Loan Application'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Location Info */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <MapPin className="w-5 h-5" />
                                        অবস্থান
                                    </h3>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-600">জোন</p>
                                            <p className="font-medium text-gray-900">{application.branch.area.zone.name}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">এরিয়া</p>
                                            <p className="font-medium text-gray-900">{application.branch.area.name}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">শাখা</p>
                                            <p className="font-medium text-gray-900">{application.branch.name}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Submission Info */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <Calendar className="w-5 h-5" />
                                        জমা দেওয়ার তথ্য
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-600">তারিখ</p>
                                            <p className="font-medium text-gray-900">
                                                {formatDate(application.submitted_at)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">জমা দেওয়ার ব্যক্তি</p>
                                            <p className="font-medium text-gray-900">{application.submitted_by?.name}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Summary Card */}
                        <div>
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-sm p-6 border border-blue-200 sticky top-20">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <Users className="w-5 h-5" />
                                    সারাংশ
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">মোট সদস্য</span>
                                        <span className="text-2xl font-bold text-blue-600">{application.total_members}</span>
                                    </div>
                                    <div className="pt-3 border-t border-blue-200">
                                        <p className="text-sm text-gray-600 mb-2">পরবর্তী ধাপ:</p>
                                        <button
                                            onClick={handleNext}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                        >
                                            সমস্যা রিপোর্ট করুন
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Members Preview */}
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">সদস্য তালিকা</h3>
                        <div className="space-y-3">
                            {members?.map((member, idx) => (
                                <div
                                    key={member.id}
                                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    <div>
                                        <p className="font-medium text-gray-900">
                                            {idx + 1}. {member.member_name}
                                        </p>
                                        {member.mobile && (
                                            <p className="text-sm text-gray-600">{member.mobile}</p>
                                        )}
                                    </div>
                                    {member.family_monthly_income && (
                                        <p className="text-sm font-medium text-gray-700">
                                            ৳{parseFloat(member.family_monthly_income).toLocaleString()}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
