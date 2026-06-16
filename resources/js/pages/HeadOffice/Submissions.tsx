import React, { useState } from 'react';
import AdminLayout from '@/layouts/admin-layout';
import { formatDate, formatDateTime } from '@/utils/dateUtils';
import { Head, Link, router } from '@inertiajs/react';
import {
    FileSpreadsheet,
    Download,
    Filter,
    CheckCircle,
    XCircle,
    Clock,
    Mail,
    Calendar,
    ChevronDown,
    Printer,
    Users,
} from 'lucide-react';

interface LoanMember {
    id: number;
    serial_no: number;
    loan_type?: string; // ঋণের ধরন
    somiti_name?: string; // সমিতির নাম
    somiti_code?: string; // সমিতি কোড
    member_name: string; // সদস্যের নাম
    member_code?: string; // সদস্য কোড
    member_mobile?: string; // সদস্য মোবাইল নম্বর
    general_savings?: number; // সাধারণ সঞ্চয়
    total_savings?: number; // মোট সঞ্চয়
    principal_amount?: number; // মূল ঋণ (সর্বশেষ পরিশোধিত)
    paid_installment_count?: number; // কত কিস্তিতে পরিশোধ করা হয়েছে
    approved_loan_amount?: number; // অনুমোদিত ঋণের পরিমাণ
    installment_increment_rate?: number; // ঋণের কিস্তির বৃদ্ধির হার
    loan_duration?: number; // ঋণের মেয়াদ
    phase_no?: number; // দফা নং
    project_name?: string; // প্রকল্পের নাম
    loan_release_or_approval_date?: string; // ঋণ ছাড়ের/অনুমোদনের তারিখ
    loan_distribution_date?: string; // ঋণ বিতরণের নতুন তারিখ
    approved_by?: string; // ছাড়কারী/অনুমোদনকারী কর্মকর্তার নাম
    remarks?: string; // মন্তব্য
    status?: string;
}

interface Zone {
    id: number;
    name: string;
    code: string;
}

interface Area {
    id: number;
    name: string;
    code: string;
    zone_id: number;
}

interface Branch {
    id: number;
    name: string;
    code: string;
    area_id: number;
    area?: {
        id: number;
        name: string;
        zone: Zone;
    };
}

interface User {
    id: number;
    name: string;
}

interface LoanApplication {
    id: number;
    application_no: string;
    branch: Branch;
    submittedBy?: User;
    total_members: number;
    status: string;
    submitted_at: string;
    reviewed_at?: string;
    loan_members: LoanMember[];
}

interface PaginatedApplications {
    data: LoanApplication[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: any[];
}

interface Props {
    applications: PaginatedApplications;
    zones: Zone[];
    areas: Area[];
    branches: Branch[];
    unreadCount: number;
    filters: {
        zone_id?: string;
        area_id?: string;
        branch_id?: string;
        status?: string;
        date?: string;
    };
}

const statusConfig = {
    pending: { label: 'Pending', icon: Clock, color: 'text-yellow-700 bg-yellow-100 border-yellow-200' },
    approved: { label: 'Approved', icon: CheckCircle, color: 'text-green-700 bg-green-100 border-green-200' },
    rejected: { label: 'Rejected', icon: XCircle, color: 'text-red-700 bg-red-100 border-red-200' },
};

export default function Submissions({ applications, zones, areas, branches, unreadCount, filters }: Props) {
    const [showFilters, setShowFilters] = useState(false);
    const [selectedZone, setSelectedZone] = useState(filters.zone_id || '');
    const [selectedArea, setSelectedArea] = useState(filters.area_id || '');
    const [selectedBranch, setSelectedBranch] = useState(filters.branch_id || '');
    const [selectedStatus, setSelectedStatus] = useState(filters.status || '');
    const [selectedDate, setSelectedDate] = useState(filters.date || new Date().toISOString().split('T')[0]);

    const filteredAreas = selectedZone
        ? areas.filter(a => a.zone_id === parseInt(selectedZone))
        : areas;

    const filteredBranches = selectedArea
        ? branches.filter(b => b.area_id === parseInt(selectedArea))
        : branches;

    const hasActiveFilter = selectedZone || selectedArea || selectedBranch || selectedStatus;

    const applyFilters = (newFilters: any) => {
        setSelectedZone(newFilters.zone_id || selectedZone);
        setSelectedArea(newFilters.area_id || selectedArea);
        setSelectedBranch(newFilters.branch_id || selectedBranch);
        setSelectedStatus(newFilters.status || selectedStatus);

        router.get('/submissions', {
            zone_id: newFilters.zone_id || selectedZone,
            area_id: newFilters.area_id || selectedArea,
            branch_id: newFilters.branch_id || selectedBranch,
            status: newFilters.status || selectedStatus,
            date: selectedDate,
        }, { preserveState: true });
    };

    const clearFilters = () => {
        setSelectedZone('');
        setSelectedArea('');
        setSelectedBranch('');
        setSelectedStatus('');
        setSelectedDate(new Date().toISOString().split('T')[0]);
        router.get('/submissions');
    };

    const handleDateChange = (date: string) => {
        setSelectedDate(date);
        router.get('/submissions', {
            zone_id: selectedZone,
            area_id: selectedArea,
            branch_id: selectedBranch,
            status: selectedStatus,
            date: date,
        }, { preserveState: true });
    };

    const getFilterSummary = () => {
        let zone = zones.find(z => z.id.toString() === selectedZone)?.name || 'সকল';
        let area = areas.find(a => a.id.toString() === selectedArea)?.name || 'সকল';
        let branch = branches.find(b => b.id.toString() === selectedBranch)?.name || 'সকল';
        return { zone, area, branch };
    };

    const getSortedApplications = () => {
        let sorted = [...applications.data];
        sorted.sort((a, b) => {
            const branchA = a.branch.name || '';
            const branchB = b.branch.name || '';
            if (branchA !== branchB) {
                return branchA.localeCompare(branchB, 'bn');
            }
            return (a.application_no || '').localeCompare(b.application_no || '', 'bn');
        });
        return sorted;
    };

    const exportExcel = () => {
        window.location.href = `/submissions/export/excel?${new URLSearchParams({
            zone_id: selectedZone,
            area_id: selectedArea,
            branch_id: selectedBranch,
            status: selectedStatus,
            date: selectedDate,
        }).toString()}`;
    };

    const handlePrint = () => {
        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Loan Submissions Report - ${selectedDate}</title>
                <style>
                    @page { size: landscape; margin: 5mm; }
                    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 5px; font-size: 8px; font-weight: 600; }
                    h1 { font-size: 14px; margin-bottom: 3px; text-align: center; }
                    h2 { font-size: 10px; color: #666; margin-bottom: 8px; text-align: center; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { border: 1px solid #999; padding: 3px 4px; text-align: left; font-weight: 600; }
                    th { background-color: #FFFF00; font-size: 7px; }
                    td { font-size: 7px; }
                    .text-right { text-align: right; }
                    .text-center { text-align: center; }
                    .unread { background-color: #f0f9ff; }
                    @media print {
                        body { padding: 0; font-weight: 600; }
                        @page { size: landscape; margin: 5mm; }
                    }
                </style>
            </head>
            <body>
                <h1>ঋণ আবেদন রিপোর্ট</h1>
                <h2>তারিখ: ${selectedDate} | মোট আবেদন: ${applications.total} | মোট সদস্য: ${applications.data.reduce((sum, app) => sum + app.loan_members.length, 0)}</h2>

                <table>
                    <thead>
                        <tr>
                            <th>আবেদন নং</th>
                            <th>অঞ্চল</th>
                            <th>এলাকা</th>
                            <th>শাখা</th>
                            <th>ক্রমিক</th>
                            <th>ঋণের ধরন</th>
                            <th>সমিতির নাম</th>
                            <th>সমিতি কোড</th>
                            <th>সদস্যের নাম</th>
                            <th>সদস্য কোড</th>
                            <th>মোবাইল</th>
                            <th class="text-right">সাধারণ সঞ্চয়</th>
                            <th class="text-right">মোট সঞ্চয়</th>
                            <th class="text-right">মূল ঋণ</th>
                            <th class="text-center">কিস্তি সংখ্যা</th>
                            <th class="text-right">অনুমোদিত ঋণ</th>
                            <th class="text-center">কিস্তি হার</th>
                            <th class="text-center">মেয়াদ</th>
                            <th class="text-center">দফা নং</th>
                            <th>প্রকল্প</th>
                            <th>ছাড়ের তারিখ</th>
                            <th>বিতরণ তারিখ</th>
                            <th>ছাড়কারী নাম</th>
                            <th>মন্তব্য</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${getSortedApplications().flatMap((app) =>
                            app.loan_members.map((member) => `
                                <tr class="${!app.reviewed_at ? 'unread' : ''}">
                                    <td>${app.application_no}</td>
                                    <td>${app.branch.area?.zone?.name || '-'}</td>
                                    <td>${app.branch.area?.name || '-'}</td>
                                    <td>${app.branch.name || '-'}</td>
                                    <td>${member.serial_no}</td>
                                    <td>${member.loan_type || '-'}</td>
                                    <td>${member.somiti_name || '-'}</td>
                                    <td>${member.somiti_code || '-'}</td>
                                    <td>${member.member_name}</td>
                                    <td>${member.member_code || '-'}</td>
                                    <td>${member.member_mobile || '-'}</td>
                                    <td class="text-right">${member.general_savings ? formatCurrency(member.general_savings) : '-'}</td>
                                    <td class="text-right">${member.total_savings ? formatCurrency(member.total_savings) : '-'}</td>
                                    <td class="text-right">${member.principal_amount ? formatCurrency(member.principal_amount) : '-'}</td>
                                    <td class="text-center">${member.paid_installment_count || '-'}</td>
                                    <td class="text-right">${member.approved_loan_amount ? formatCurrency(member.approved_loan_amount) : '-'}</td>
                                    <td class="text-center">${member.installment_increment_rate || '-'}</td>
                                    <td class="text-center">${member.loan_duration || '-'}</td>
                                    <td class="text-center">${member.phase_no || '-'}</td>
                                    <td>${member.project_name || '-'}</td>
                                    <td>${member.loan_release_or_approval_date ? formatDate(member.loan_release_or_approval_date) : '-'}</td>
                                    <td>${member.loan_distribution_date ? formatDate(member.loan_distribution_date) : '-'}</td>
                                    <td>${member.approved_by || '-'}</td>
                                    <td>${member.remarks || '-'}</td>
                                </tr>
                            `)
                        ).join('')}
                    </tbody>
                </table>
                <p style="margin-top: 15px; font-size: 9px; color: #666;">Generated on: ${formatDateTime(new Date())}</p>
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(printContent);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 250);
        }
    };

    const getStatusBadge = (status: string) => {
        const normalizedStatus = (status || 'pending').toLowerCase();
        const config = statusConfig[normalizedStatus as keyof typeof statusConfig] || statusConfig.pending;
        const Icon = config.icon;
        return (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${config.color}`}>
                <Icon size={14} />
                {config.label}
            </span>
        );
    };

    const formatCurrency = (amount: string | number) => {
        const num = typeof amount === 'string' ? parseFloat(amount) : amount;
        return new Intl.NumberFormat('en-BD', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(num);
    };

    // Calculate total members
    const totalMembers = applications.data.reduce((sum, app) => sum + app.loan_members.length, 0);

    return (
        <AdminLayout>
            <Head title="Loan Submissions" />

            <div className="py-6">
                <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Header */}
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-3">
                            <h1 className="text-2xl font-bold text-gray-900">Loan Submissions</h1>
                            <div className="flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-gray-400" />
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => handleDateChange(e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                />
                                <button
                                    onClick={handlePrint}
                                    className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                                    title="Print"
                                >
                                    <Printer size={16} />
                                </button>
                                <button
                                    onClick={exportExcel}
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
                                    value={selectedZone}
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
                                    value={selectedArea}
                                    onChange={(e) => applyFilters({ ...filters, area_id: e.target.value, branch_id: '' })}
                                    disabled={!selectedZone}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm disabled:bg-gray-100"
                                >
                                    <option value="">All Areas</option>
                                    {filteredAreas.map((area) => (
                                        <option key={area.id} value={area.id}>{area.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Branch Filter */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Branch</label>
                                <select
                                    value={selectedBranch}
                                    onChange={(e) => applyFilters({ ...filters, branch_id: e.target.value })}
                                    disabled={!selectedArea}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm disabled:bg-gray-100"
                                >
                                    <option value="">All Branches</option>
                                    {filteredBranches.map((branch) => (
                                        <option key={branch.id} value={branch.id}>{branch.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Status Filter */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    value={selectedStatus}
                                    onChange={(e) => applyFilters({ ...filters, status: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                                >
                                    <option value="">All Status</option>
                                    <option value="pending">Pending</option>
                                    <option value="approved">Approved</option>
                                    <option value="rejected">Rejected</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Statistics */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                        <div className="bg-white rounded-lg p-3 text-center border border-gray-200">
                            <p className="text-2xl font-bold text-gray-900">{applications.total}</p>
                            <p className="text-xs text-gray-600 font-medium">মোট আবেদন</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 text-center border border-gray-200">
                            <p className="text-2xl font-bold text-gray-900">{totalMembers}</p>
                            <p className="text-xs text-gray-600 font-medium">মোট সদস্য</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 text-center border border-gray-200">
                            <p className="text-2xl font-bold text-blue-600">{unreadCount}</p>
                            <p className="text-xs text-gray-600 font-medium">অপঠিত</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 text-center border border-gray-200">
                            <p className="text-2xl font-bold text-green-600">{applications.data.filter(a => a.status === 'approved').length}</p>
                            <p className="text-xs text-gray-600 font-medium">অনুমোদিত</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 text-center border border-gray-200">
                            <p className="text-2xl font-bold text-red-600">{applications.data.filter(a => a.status === 'rejected').length}</p>
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
                            {selectedZone && (
                                <div>
                                    <p className="text-xs font-semibold text-emerald-700 mb-1">এলাকা</p>
                                    <p className="text-sm font-bold text-gray-900">{getFilterSummary().area}</p>
                                </div>
                            )}
                            {selectedArea && (
                                <div>
                                    <p className="text-xs font-semibold text-emerald-700 mb-1">শাখা</p>
                                    <p className="text-sm font-bold text-gray-900">{getFilterSummary().branch}</p>
                                </div>
                            )}
                            <div>
                                <p className="text-xs font-semibold text-emerald-700 mb-1">তারিখ</p>
                                <p className="text-sm font-bold text-gray-900">{selectedDate}</p>
                            </div>
                        </div>
                    </div>

                    {/* Applications List */}
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                        {applications.data.length === 0 ? (
                            <div className="text-center py-16">
                                <FileSpreadsheet size={64} className="mx-auto text-gray-300 mb-4" />
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Submissions Found</h3>
                                <p className="text-gray-600">No submissions for {selectedDate}. Try selecting a different date.</p>
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                                            <tr>
                                                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">আবেদন নং</th>
                                                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">অঞ্চল</th>
                                                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">এলাকা</th>
                                                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">শাখা</th>
                                                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">ক্রমিক</th>
                                                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">ঋণের ধরন</th>
                                                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">সমিতির নাম</th>
                                                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">সমিতি কোড</th>
                                                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">সদস্যের নাম</th>
                                                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">সদস্য কোড</th>
                                                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">মোবাইল</th>
                                                <th className="px-3 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">সাধারণ সঞ্চয়</th>
                                                <th className="px-3 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">মোট সঞ্চয়</th>
                                                <th className="px-3 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">মূল ঋণ</th>
                                                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">কিস্তি সংখ্যা</th>
                                                <th className="px-3 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">অনুমোদিত ঋণ</th>
                                                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">কিস্তি হার</th>
                                                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">মেয়াদ</th>
                                                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">দফা নং</th>
                                                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">প্রকল্প</th>
                                                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">ছাড়ের তারিখ</th>
                                                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">বিতরণ তারিখ</th>
                                                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">ছাড়কারী নাম</th>
                                                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">মন্তব্য</th>
                                                <th className="sticky right-0 bg-gray-50 px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-l border-gray-200">অবস্থা</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {getSortedApplications().flatMap((app) =>
                                                app.loan_members.map((member, memberIndex) => (
                                                    <tr
                                                        key={`${app.id}-${member.id}`}
                                                        className={`hover:bg-gray-50 transition-colors ${!app.reviewed_at ? 'bg-emerald-50/50' : ''}`}
                                                    >
                                                        <td className="px-3 py-3">
                                                            <div className="flex items-center gap-2">
                                                                {!app.reviewed_at && memberIndex === 0 && (
                                                                    <Mail size={14} className="text-emerald-600 flex-shrink-0" />
                                                                )}
                                                                <span className="text-sm font-medium text-emerald-600">
                                                                    {app.application_no}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-3 text-sm text-gray-700">
                                                            {app.branch.area?.zone.name || '-'}
                                                        </td>
                                                        <td className="px-3 py-3 text-sm text-gray-700">
                                                            {app.branch.area?.name || '-'}
                                                        </td>
                                                        <td className="px-3 py-3 text-sm text-gray-700">
                                                            {app.branch.name || '-'}
                                                        </td>
                                                        <td className="px-3 py-3 text-sm text-gray-700">
                                                            {member.serial_no}
                                                        </td>
                                                        <td className="px-3 py-3 text-sm text-gray-700">
                                                            {member.loan_type || '-'}
                                                        </td>
                                                        <td className="px-3 py-3 text-sm text-gray-700">
                                                            {member.somiti_name || '-'}
                                                        </td>
                                                        <td className="px-3 py-3 text-sm text-gray-700">
                                                            {member.somiti_code || '-'}
                                                        </td>
                                                        <td className="px-3 py-3 text-sm font-medium text-gray-900">
                                                            {member.member_name}
                                                        </td>
                                                        <td className="px-3 py-3 text-sm text-gray-700">
                                                            {member.member_code || '-'}
                                                        </td>
                                                        <td className="px-3 py-3 text-sm text-gray-700">
                                                            {member.member_mobile || '-'}
                                                        </td>
                                                        <td className="px-3 py-3 text-sm text-right text-gray-700">
                                                            {member.general_savings ? formatCurrency(member.general_savings) : '-'}
                                                        </td>
                                                        <td className="px-3 py-3 text-sm text-right text-gray-700">
                                                            {member.total_savings ? formatCurrency(member.total_savings) : '-'}
                                                        </td>
                                                        <td className="px-3 py-3 text-sm text-right text-gray-700">
                                                            {member.principal_amount ? formatCurrency(member.principal_amount) : '-'}
                                                        </td>
                                                        <td className="px-3 py-3 text-sm text-gray-700 text-center">
                                                            {member.paid_installment_count || '-'}
                                                        </td>
                                                        <td className="px-3 py-3 text-sm text-right font-semibold text-emerald-600">
                                                            {member.approved_loan_amount ? formatCurrency(member.approved_loan_amount) : '-'}
                                                        </td>
                                                        <td className="px-3 py-3 text-sm text-gray-700 text-center">
                                                            {member.installment_increment_rate || '-'}
                                                        </td>
                                                        <td className="px-3 py-3 text-sm text-gray-700 text-center">
                                                            {member.loan_duration || '-'}
                                                        </td>
                                                        <td className="px-3 py-3 text-sm text-gray-700 text-center">
                                                            {member.phase_no || '-'}
                                                        </td>
                                                        <td className="px-3 py-3 text-sm text-gray-700">
                                                            {member.project_name || '-'}
                                                        </td>
                                                        <td className="px-3 py-3 text-sm text-gray-700">
                                                            {member.loan_release_or_approval_date ? formatDate(member.loan_release_or_approval_date) : '-'}
                                                        </td>
                                                        <td className="px-3 py-3 text-sm text-gray-700">
                                                            {member.loan_distribution_date ? formatDate(member.loan_distribution_date) : '-'}
                                                        </td>
                                                        <td className="px-3 py-3 text-sm text-gray-700">
                                                            {member.approved_by || '-'}
                                                        </td>
                                                        <td className="px-3 py-3 text-sm text-gray-600 max-w-xs truncate" title={member.remarks || ''}>
                                                            {member.remarks || '-'}
                                                        </td>
                                                        <td className="sticky right-0 bg-white px-3 py-3 border-l border-gray-200">
                                                            {getStatusBadge(member.status || 'pending')}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */}
                                {applications.last_page > 1 && (
                                    <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                                        <p className="text-sm text-gray-600">
                                            Showing {(applications.current_page - 1) * applications.per_page + 1} to{' '}
                                            {Math.min(applications.current_page * applications.per_page, applications.total)} of{' '}
                                            {applications.total} results
                                        </p>
                                        <div className="flex gap-2">
                                            {applications.links.map((link, index) => (
                                                link.url && (
                                                    <Link
                                                        key={index}
                                                        href={link.url}
                                                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                                            link.active
                                                                ? 'bg-emerald-600 text-white'
                                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                        }`}
                                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                                    />
                                                )
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
