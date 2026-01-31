import React, { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import {
    Calendar,
    Users,
    CheckCircle,
    XCircle,
    Clock,
    AlertTriangle,
    Download,
    Printer,
} from 'lucide-react';
import { exportToExcel, printMembers } from '@/utils/exportUtils';

interface AdmissionMember {
    id: number;
    member_name: string;
    mobile?: string;
    status: string;
    society_name?: string;
    earning_person_occupation?: string;
    family_monthly_income?: string;
    guarantor_name?: string;
    guarantor_relation?: string;
    officer_name?: string;
    component_name?: string;
    branch_name?: string;
    residential_property?: string;
    cultivable_land?: string;
    total_land?: string;
    cattle_count?: number;
    goat_count?: number;
    poultry_count?: number;
    fixed_movable_assets_value?: string;
    remarks?: string;
    rejection_reason?: string;
    head_office_remarks?: string;
    head_office_decision?: string;
    member_admission?: {
        id: number;
        application_no: string;
        branch?: {
            name: string;
            area?: {
                name: string;
                zone?: {
                    name: string;
                };
            };
        };
    };
}

interface PaginatedData {
    data: AdmissionMember[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

interface Zone {
    id: number;
    name: string;
}

interface Area {
    id: number;
    name: string;
    zone_id: number;
}

interface Branch {
    id: number;
    name: string;
    area_id: number;
}

interface Props {
    members: PaginatedData;
    zones: Zone[];
    areas: Area[];
    branches: Branch[];
    filters?: {
        zone_id?: string;
        area_id?: string;
        branch_id?: string;
        status?: string;
        date?: string;
    };
}

export default function AdmissionSubmissions({
    members: initialMembers,
    zones,
    areas: initialAreas,
    branches: initialBranches,
    filters: initialFilters,
}: Props) {
    const [currentDate, setCurrentDate] = useState(initialFilters?.date || new Date().toISOString().split('T')[0]);
    const [filters, setFilters] = useState({
        zone_id: initialFilters?.zone_id || '',
        area_id: initialFilters?.area_id || '',
        branch_id: initialFilters?.branch_id || '',
        status: initialFilters?.status || '',
    });
    const [areas, setAreas] = useState<Area[]>(initialAreas);
    const [branches, setBranches] = useState<Branch[]>(initialBranches);

    const handleDateChange = (newDate: string) => {
        setCurrentDate(newDate);
        router.visit('/admission-submissions', {
            data: { date: newDate, ...filters },
            preserveScroll: true,
        });
    };

    const applyFilters = (newFilters: any) => {
        setFilters(newFilters);
        router.visit('/admission-submissions', {
            data: { date: currentDate, ...newFilters },
            preserveScroll: true,
        });
    };

    useEffect(() => {
        if (filters.zone_id) {
            fetch(`/organizations/zones/${filters.zone_id}/areas`)
                .then(res => res.json())
                .then(data => setAreas(data))
                .catch(err => console.error('Error fetching areas:', err));
        }
    }, [filters.zone_id]);

    useEffect(() => {
        if (filters.area_id) {
            fetch(`/organizations/areas/${filters.area_id}/branches`)
                .then(res => res.json())
                .then(data => setBranches(data))
                .catch(err => console.error('Error fetching branches:', err));
        }
    }, [filters.area_id]);

    const getFilterSummary = () => {
        let zone = zones.find(z => z.id.toString() === filters.zone_id)?.name || 'সকল';
        let area = initialAreas.find(a => a.id.toString() === filters.area_id)?.name || 'সকল';
        let branch = initialBranches.find(b => b.id.toString() === filters.branch_id)?.name || 'সকল';

        return { zone, area, branch };
    };

    const getSortedMembers = () => {
        let sorted = [...initialMembers.data];

        // Sort by branch name, then by member name
        sorted.sort((a, b) => {
            const branchA = a.member_admission?.branch?.name || '';
            const branchB = b.member_admission?.branch?.name || '';

            if (branchA !== branchB) {
                return branchA.localeCompare(branchB, 'bn');
            }
            return (a.member_name || '').localeCompare(b.member_name || '', 'bn');
        });

        return sorted;
    };

    const getStatusBadge = (status: string) => {
        const badges: Record<string, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
            pending: {
                bg: 'bg-yellow-100',
                text: 'text-yellow-800',
                icon: <Clock size={14} />,
                label: 'Pending',
            },
            issue: {
                bg: 'bg-orange-100',
                text: 'text-orange-800',
                icon: <AlertTriangle size={14} />,
                label: 'Issues',
            },
            approved: {
                bg: 'bg-green-100',
                text: 'text-green-800',
                icon: <CheckCircle size={14} />,
                label: 'Approved',
            },
            rejected: {
                bg: 'bg-red-100',
                text: 'text-red-800',
                icon: <XCircle size={14} />,
                label: 'Rejected',
            },
        };
        const badge = badges[status] || badges.pending;
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${badge.bg} ${badge.text}`}>
                {badge.icon}
                {badge.label}
            </span>
        );
    };

    return (
        <AdminLayout>
            <Head title="Member Admissions" />

            <div className="py-6">
                <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Header */}
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-3">
                            <h1 className="text-2xl font-bold text-gray-900">Member Admissions</h1>
                            <div className="flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-gray-400" />
                                <input
                                    type="date"
                                    value={currentDate}
                                    onChange={(e) => handleDateChange(e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                />
                                <button
                                    onClick={() => printMembers(initialMembers.data, currentDate, {
                                        zone: zones.find(z => z.id.toString() === filters.zone_id)?.name,
                                        area: initialAreas.find(a => a.id.toString() === filters.area_id)?.name,
                                        branch: initialBranches.find(b => b.id.toString() === filters.branch_id)?.name,
                                    })}
                                    className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                                    title="Print"
                                >
                                    <Printer size={16} />
                                </button>
                                <button
                                    onClick={() => exportToExcel(initialMembers.data, currentDate)}
                                    className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                                    title="Download Excel"
                                >
                                    <Download size={16} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="bg-white rounded-lg shadow-sm p-4 mb-4 border border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            {/* Zone Filter */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Zone</label>
                                <select
                                    value={filters.zone_id}
                                    onChange={(e) => applyFilters({ ...filters, zone_id: e.target.value, area_id: '', branch_id: '' })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                                >
                                    <option value="">All Zones</option>
                                    {zones.map((zone) => (
                                        <option key={zone.id} value={zone.id}>{zone.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Area Filter */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Area</label>
                                <select
                                    value={filters.area_id}
                                    onChange={(e) => applyFilters({ ...filters, area_id: e.target.value, branch_id: '' })}
                                    disabled={!filters.zone_id}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm disabled:bg-gray-100"
                                >
                                    <option value="">All Areas</option>
                                    {areas.map((area) => (
                                        <option key={area.id} value={area.id}>{area.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Branch Filter */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Branch</label>
                                <select
                                    value={filters.branch_id}
                                    onChange={(e) => applyFilters({ ...filters, branch_id: e.target.value })}
                                    disabled={!filters.area_id}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm disabled:bg-gray-100"
                                >
                                    <option value="">All Branches</option>
                                    {branches.map((branch) => (
                                        <option key={branch.id} value={branch.id}>{branch.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Status Filter */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    value={filters.status}
                                    onChange={(e) => applyFilters({ ...filters, status: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                                >
                                    <option value="">All Status</option>
                                    <option value="pending">Pending</option>
                                    <option value="approved">Approved</option>
                                    <option value="issue">Issues</option>
                                    <option value="rejected">Rejected</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Statistics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                        <div className="bg-white rounded-lg p-3 text-center border border-gray-200">
                            <p className="text-2xl font-bold text-gray-900">{initialMembers.total}</p>
                            <p className="text-xs text-gray-600 font-medium">মোট সদস্য</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 text-center border border-gray-200">
                            <p className="text-2xl font-bold text-green-600">{initialMembers.data.filter(m => m.status === 'approved').length}</p>
                            <p className="text-xs text-gray-600 font-medium">অনুমোদিত</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 text-center border border-gray-200">
                            <p className="text-2xl font-bold text-orange-600">{initialMembers.data.filter(m => m.status === 'issue').length}</p>
                            <p className="text-xs text-gray-600 font-medium">সমস্যা</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 text-center border border-gray-200">
                            <p className="text-2xl font-bold text-red-600">{initialMembers.data.filter(m => m.status === 'rejected').length}</p>
                            <p className="text-xs text-gray-600 font-medium">প্রত্যাখ্যাত</p>
                        </div>
                    </div>

                    {/* Filter Summary */}
                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-4 mb-4 border border-emerald-200">
                        <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                            <div>
                                <p className="text-xs font-semibold text-emerald-700 mb-1">অঞ্চল</p>
                                <p className="text-sm font-bold text-gray-900">{getFilterSummary().zone}</p>
                            </div>
                            {filters.zone_id && (
                                <div>
                                    <p className="text-xs font-semibold text-emerald-700 mb-1">এলাকা</p>
                                    <p className="text-sm font-bold text-gray-900">{getFilterSummary().area}</p>
                                </div>
                            )}
                            {filters.area_id && (
                                <div>
                                    <p className="text-xs font-semibold text-emerald-700 mb-1">শাখা</p>
                                    <p className="text-sm font-bold text-gray-900">{getFilterSummary().branch}</p>
                                </div>
                            )}
                            <div>
                                <p className="text-xs font-semibold text-emerald-700 mb-1">তারিখ</p>
                                <p className="text-sm font-bold text-gray-900">{currentDate}</p>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        {initialMembers.data.length === 0 ? (
                            <div className="text-center py-12">
                                <Users size={48} className="mx-auto text-gray-300 mb-4" />
                                <p className="text-gray-500 font-medium">No members found for this date</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-semibold text-gray-900 whitespace-nowrap">সদস্যের নাম</th>
                                            <th className="px-4 py-3 text-left font-semibold text-gray-900 whitespace-nowrap">মোবাইল</th>
                                            <th className="px-4 py-3 text-left font-semibold text-gray-900 whitespace-nowrap">শাখা</th>
                                            <th className="px-4 py-3 text-left font-semibold text-gray-900 whitespace-nowrap">সমিতি</th>
                                            <th className="px-4 py-3 text-left font-semibold text-gray-900 whitespace-nowrap">অফিসার</th>
                                            <th className="px-4 py-3 text-left font-semibold text-gray-900 whitespace-nowrap">উপাদান</th>
                                            <th className="px-4 py-3 text-left font-semibold text-gray-900 whitespace-nowrap">আবাসিক সম্পত্তি</th>
                                            <th className="px-4 py-3 text-left font-semibold text-gray-900 whitespace-nowrap">চাষযোগ্য ভূমি</th>
                                            <th className="px-4 py-3 text-left font-semibold text-gray-900 whitespace-nowrap">মোট ভূমি</th>
                                            <th className="px-4 py-3 text-left font-semibold text-gray-900 whitespace-nowrap">গবাদি পশু</th>
                                            <th className="px-4 py-3 text-left font-semibold text-gray-900 whitespace-nowrap">ছাগল</th>
                                            <th className="px-4 py-3 text-left font-semibold text-gray-900 whitespace-nowrap">হাঁস-মুরগি</th>
                                            <th className="px-4 py-3 text-left font-semibold text-gray-900 whitespace-nowrap">স্থির সম্পদ</th>
                                            <th className="px-4 py-3 text-left font-semibold text-gray-900 whitespace-nowrap">পেশা</th>
                                            <th className="px-4 py-3 text-left font-semibold text-gray-900 whitespace-nowrap">মাসিক আয়</th>
                                            <th className="px-4 py-3 text-left font-semibold text-gray-900 whitespace-nowrap">জামিনদার</th>
                                            <th className="px-4 py-3 text-left font-semibold text-gray-900 whitespace-nowrap">সম্পর্ক</th>
                                            <th className="px-4 py-3 text-left font-semibold text-gray-900 whitespace-nowrap">মন্তব্য</th>
                                            <th className="px-4 py-3 sticky right-0 bg-gray-50 font-semibold text-gray-900 whitespace-nowrap">অবস্থা</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {getSortedMembers().map((member) => (
                                            <tr key={member.id} className="hover:bg-gray-50 transition">
                                                <td className="px-4 py-3 text-gray-900 font-medium whitespace-nowrap">{member.member_name}</td>
                                                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{member.mobile || '-'}</td>
                                                <td className="px-4 py-3 font-semibold text-gray-900">{member.member_admission?.branch?.name || '-'}</td>
                                                <td className="px-4 py-3 text-gray-600">{member.society_name || '-'}</td>
                                                <td className="px-4 py-3 text-gray-600">{member.officer_name || '-'}</td>
                                                <td className="px-4 py-3 text-gray-600">{member.component_name || '-'}</td>
                                                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{member.residential_property || '-'}</td>
                                                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{member.cultivable_land || '-'}</td>
                                                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{member.total_land || '-'}</td>
                                                <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-center">{member.cattle_count || '0'}</td>
                                                <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-center">{member.goat_count || '0'}</td>
                                                <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-center">{member.poultry_count || '0'}</td>
                                                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{member.fixed_movable_assets_value || '-'}</td>
                                                <td className="px-4 py-3 text-gray-600">{member.earning_person_occupation || '-'}</td>
                                                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{member.family_monthly_income || '-'}</td>
                                                <td className="px-4 py-3 text-gray-600">{member.guarantor_name || '-'}</td>
                                                <td className="px-4 py-3 text-gray-600">{member.guarantor_relation || '-'}</td>
                                                <td className="px-4 py-3 text-gray-600 text-xs">{member.remarks || '-'}</td>
                                                <td className="px-4 py-3 sticky right-0 bg-white">{getStatusBadge(member.status)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
