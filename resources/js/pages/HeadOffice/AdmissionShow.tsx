import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { ArrowLeft, FileSpreadsheet, Users, AlertCircle, CheckCircle, XCircle, Building2, MapPin } from 'lucide-react';

interface AdmissionMember {
    id: number;
    member_name: string;
    mobile: string;
    branch_name?: string;
    officer_name?: string;
    component_name?: string;
    society_name?: string;
    residential_property?: string;
    cultivable_land?: string;
    total_land?: string;
    cattle_count?: number;
    goat_count?: number;
    poultry_count?: number;
    fixed_movable_assets_value?: string;
    earning_person_occupation?: string;
    family_monthly_income?: string;
    guarantor_name?: string;
    guarantor_relation?: string;
    remarks?: string;
    nid_front_image?: string;
    nid_back_image?: string;
    status: string;
    excel_row_number?: number;
}

interface MemberAdmission {
    id: number;
    application_no: string;
    total_members: number;
    status: string;
    submitted_at?: string;
    reviewed_at?: string;
    created_at: string;
    excel_file_name: string;
    branch?: {
        name: string;
        area?: {
            name: string;
            zone?: {
                name: string;
            };
        };
    };
    submitted_by?: {
        name: string;
    };
    admission_members?: AdmissionMember[];
}

interface Props {
    admission: MemberAdmission;
}

export default function AdmissionShow({ admission }: Props) {
    const getStatusBadge = (status: string) => {
        const badges: { [key: string]: { bg: string; text: string; icon: React.ReactNode; label: string } } = {
            pending: {
                bg: 'bg-yellow-100',
                text: 'text-yellow-800',
                icon: <AlertCircle size={14} />,
                label: 'Pending'
            },
            under_review: {
                bg: 'bg-blue-100',
                text: 'text-blue-800',
                icon: <FileSpreadsheet size={14} />,
                label: 'Under Review'
            },
            approved: {
                bg: 'bg-green-100',
                text: 'text-green-800',
                icon: <CheckCircle size={14} />,
                label: 'Approved'
            },
            rejected: {
                bg: 'bg-red-100',
                text: 'text-red-800',
                icon: <XCircle size={14} />,
                label: 'Rejected'
            },
            needs_correction: {
                bg: 'bg-orange-100',
                text: 'text-orange-800',
                icon: <AlertCircle size={14} />,
                label: 'Needs Correction'
            },
        };
        const badge = badges[status] || badges.pending;
        return (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                {badge.icon}
                {badge.label}
            </span>
        );
    };

    return (
        <AdminLayout>
            <Head title={`Admission ${admission.application_no}`} />

            <div className="py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Header */}
                    <div className="mb-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link
                                href="/admission-submissions"
                                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <ArrowLeft size={18} />
                                Back
                            </Link>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">
                                    {admission.application_no}
                                </h1>
                                <p className="text-gray-600 mt-1">
                                    আবেদনের বিস্তারিত তথ্য
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Admission Info */}
                    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">জোন</p>
                                <p className="font-semibold text-gray-900 flex items-center gap-2">
                                    <MapPin size={16} className="text-purple-600" />
                                    {admission.branch?.area?.zone?.name || 'N/A'}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600 mb-1">এরিয়া</p>
                                <p className="font-semibold text-gray-900 flex items-center gap-2">
                                    <MapPin size={16} className="text-indigo-600" />
                                    {admission.branch?.area?.name || 'N/A'}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600 mb-1">শাখা</p>
                                <p className="font-semibold text-gray-900 flex items-center gap-2">
                                    <Building2 size={16} className="text-blue-600" />
                                    {admission.branch?.name || 'N/A'}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600 mb-1">মোট সদস্য</p>
                                <p className="font-semibold text-gray-900 flex items-center gap-2">
                                    <Users size={16} className="text-green-600" />
                                    {admission.total_members}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600 mb-1">অবস্থা</p>
                                <p className="font-semibold text-gray-900">
                                    {getStatusBadge(admission.status)}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600 mb-1">জমার তারিখ</p>
                                <p className="font-semibold text-gray-900">
                                    {admission.submitted_at
                                        ? new Date(admission.submitted_at).toLocaleDateString('bn-BD', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })
                                        : 'N/A'}
                                </p>
                            </div>
                        </div>
                        {admission.submitted_by && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                                <p className="text-sm text-gray-600">
                                    জমা দিয়েছেন: <span className="font-semibold text-gray-900">{admission.submitted_by.name}</span>
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Members List */}
                    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                            <h2 className="text-lg font-semibold text-gray-900">সদস্যদের তথ্য</h2>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">ক্রমিক</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">সদস্যের নাম</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">মোবাইল</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">শাখা নাম</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">সমিতি</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">বসতবাড়ী</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">আবাদী</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">মোট জমি</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">গরু</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">ছাগল</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">হাঁস</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">সম্পদ মূল্য</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">পেশা</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">আয়</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">জামিনদার</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">মন্তব্য</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {(admission.admission_members || []).map((member, index) => (
                                        <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 text-sm text-gray-700">
                                                {member.excel_row_number || index + 1}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                {member.member_name}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700">
                                                {member.mobile}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700">
                                                {member.branch_name || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700">
                                                {member.society_name || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700">
                                                {member.residential_property || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700">
                                                {member.cultivable_land || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700">
                                                {member.total_land || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-center text-gray-700">
                                                {member.cattle_count || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-center text-gray-700">
                                                {member.goat_count || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-center text-gray-700">
                                                {member.poultry_count || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right text-gray-700">
                                                {member.fixed_movable_assets_value || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700">
                                                {member.earning_person_occupation || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right text-gray-700">
                                                {member.family_monthly_income || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700">
                                                <div>
                                                    <p className="font-medium">{member.guarantor_name || '-'}</p>
                                                    <p className="text-xs text-gray-500">{member.guarantor_relation || ''}</p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700">
                                                {member.remarks || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                            <p className="text-sm text-gray-600">
                                মোট: <span className="font-semibold text-gray-900">{admission.total_members}</span> জন সদস্য
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
