import React, { useState, useEffect } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Badge } from '@/components/ui/badge';
import {
    Search,
    Eye,
    Filter,
    ChevronLeft,
    ChevronRight,
    UserPlus,
    PlayCircle,
    Trash2,
    FileText,
    X,
    Printer,
    CheckCircle,
    Circle,
} from 'lucide-react';
import { MemberAdmission } from '@/types/memberAdmission';

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
    zone?: Zone;
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

interface Props {
    admissions: {
        data: MemberAdmission[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from: number;
        to: number;
    };
    filters: {
        status?: string;
        search?: string;
        zone_id?: number;
        area_id?: number;
        branch_id?: number;
        date_from?: string;
        date_to?: string;
        had_issues?: string;
        printed?: string;
    };
    stats: {
        total: number;
        draft: number;
        submitted: number;
        under_review: number;
        pending_head_office: number;
        approved: number;
        rejected: number;
        needs_revision: number;
    };
    zones: Zone[];
    areas: Area[];
    branches: Branch[];
}

export default function AdmissionMembers({ admissions, filters, stats, zones, areas, branches }: Props) {
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedAdmission, setSelectedAdmission] = useState<MemberAdmission | null>(null);
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [markAsPrintedCheckbox, setMarkAsPrintedCheckbox] = useState(false);

    // Date filters - default to current date
    const today = new Date().toISOString().split('T')[0];
    const [dateFrom, setDateFrom] = useState(filters.date_from || today);
    const [dateTo, setDateTo] = useState(filters.date_to || today);

    // Organizational filters
    const [selectedZone, setSelectedZone] = useState(filters.zone_id?.toString() || '');
    const [selectedArea, setSelectedArea] = useState(filters.area_id?.toString() || '');
    const [selectedBranch, setSelectedBranch] = useState(filters.branch_id?.toString() || '');
    const [hadIssues, setHadIssues] = useState(filters.had_issues || '');
    const [printedFilter, setPrintedFilter] = useState(filters.printed || '');

    // Filtered lists for cascading dropdowns
    const [filteredAreas, setFilteredAreas] = useState<Area[]>(areas);
    const [filteredBranches, setFilteredBranches] = useState<Branch[]>(branches);

    // Cascading logic for Zone -> Area -> Branch
    useEffect(() => {
        if (selectedZone) {
            const filtered = areas.filter(area => area.zone_id.toString() === selectedZone);
            setFilteredAreas(filtered);

            // Clear area if it doesn't belong to selected zone
            if (selectedArea && !filtered.find(a => a.id.toString() === selectedArea)) {
                setSelectedArea('');
            }
        } else {
            setFilteredAreas(areas);
        }
    }, [selectedZone, areas]);

    useEffect(() => {
        if (selectedArea) {
            const filtered = branches.filter(branch => branch.area_id.toString() === selectedArea);
            setFilteredBranches(filtered);

            // Clear branch if it doesn't belong to selected area
            if (selectedBranch && !filtered.find(b => b.id.toString() === selectedBranch)) {
                setSelectedBranch('');
            }
        } else if (selectedZone) {
            // Show all branches from all areas in selected zone
            const zoneAreaIds = filteredAreas.map(a => a.id);
            const filtered = branches.filter(branch => zoneAreaIds.includes(branch.area_id));
            setFilteredBranches(filtered);
        } else {
            setFilteredBranches(branches);
        }
    }, [selectedArea, selectedZone, filteredAreas, branches]);

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { variant: any; label: string }> = {
            draft: { variant: 'secondary', label: 'Draft' },
            submitted: { variant: 'default', label: 'Submitted' },
            under_review: { variant: 'default', label: 'Under Review' },
            pending_head_office: { variant: 'default', label: 'Pending HO' },
            approved: { variant: 'default', label: 'Approved' },
            rejected: { variant: 'destructive', label: 'Rejected' },
            needs_revision: { variant: 'default', label: 'Needs Revision' },
        };

        const config = variants[status] || { variant: 'secondary', label: status };
        return (
            <Badge
                variant={config.variant}
                className={
                    status === 'approved'
                        ? 'bg-green-500 hover:bg-green-600'
                        : status === 'under_review'
                        ? 'bg-yellow-500 hover:bg-yellow-600'
                        : status === 'submitted'
                        ? 'bg-blue-500 hover:bg-blue-600'
                        : status === 'pending_head_office'
                        ? 'bg-purple-500 hover:bg-purple-600'
                        : status === 'needs_revision'
                        ? 'bg-orange-500 hover:bg-orange-600'
                        : ''
                }
            >
                {config.label}
            </Badge>
        );
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const applyFilters = () => {
        router.get(
            '/head-office/admission-members',
            {
                search: searchQuery,
                status: statusFilter,
                zone_id: selectedZone,
                area_id: selectedArea,
                branch_id: selectedBranch,
                date_from: dateFrom,
                date_to: dateTo,
                had_issues: hadIssues,
                printed: printedFilter,
            },
            { preserveState: true }
        );
    };

    const handleFilterChange = (status: string) => {
        setStatusFilter(status);
        router.get(
            '/head-office/admission-members',
            {
                search: searchQuery,
                status: status,
                zone_id: selectedZone,
                area_id: selectedArea,
                branch_id: selectedBranch,
                date_from: dateFrom,
                date_to: dateTo,
                had_issues: hadIssues,
                printed: printedFilter,
            },
            { preserveState: true }
        );
    };

    const clearFilters = () => {
        setSearchQuery('');
        setStatusFilter('');
        setSelectedZone('');
        setSelectedArea('');
        setSelectedBranch('');
        setDateFrom(today);
        setDateTo(today);
        setHadIssues('');
        setPrintedFilter('');
        router.get('/head-office/admission-members', { date_from: today, date_to: today }, { preserveState: true });
    };

    const getPrintParams = () => {
        const params: Record<string, string> = {};
        if (searchQuery) params.search = searchQuery;
        if (statusFilter) params.status = statusFilter;
        if (selectedZone) params.zone_id = selectedZone;
        if (selectedArea) params.area_id = selectedArea;
        if (selectedBranch) params.branch_id = selectedBranch;
        if (dateFrom) params.date_from = dateFrom;
        if (dateTo) params.date_to = dateTo;
        if (hadIssues) params.had_issues = hadIssues;
        if (printedFilter) params.printed = printedFilter;
        return params;
    };

    const handlePrint = () => {
        setShowPrintModal(true);
    };

    const handlePrintConfirm = () => {
        const params = getPrintParams();
        const printUrl = `/head-office/admission-members/print?${new URLSearchParams(params).toString()}`;
        window.open(printUrl, '_blank');
        if (markAsPrintedCheckbox) {
            router.post('/head-office/admission-members/mark-printed', params, { preserveScroll: true });
        }
        setShowPrintModal(false);
        setMarkAsPrintedCheckbox(false);
    };

    const handleDelete = (id: number, applicationNo: string) => {
        if (confirm(`Are you sure you want to delete application ${applicationNo}?`)) {
            router.delete(`/head-office/admissions/${id}`, {
                preserveScroll: true,
            });
        }
    };

    const openHistoryModal = (admission: MemberAdmission) => {
        setSelectedAdmission(admission);
        setShowHistoryModal(true);
    };

    const closeHistoryModal = () => {
        setShowHistoryModal(false);
        setSelectedAdmission(null);
    };

    const statCards = [
        { label: 'Total', count: stats.total, color: 'bg-blue-500', filter: '' },
        { label: 'Draft', count: stats.draft, color: 'bg-gray-500', filter: 'draft' },
        { label: 'Submitted', count: stats.submitted, color: 'bg-blue-500', filter: 'submitted' },
        {
            label: 'Under Review',
            count: stats.under_review,
            color: 'bg-yellow-500',
            filter: 'under_review',
        },
        {
            label: 'Pending HO',
            count: stats.pending_head_office,
            color: 'bg-purple-500',
            filter: 'pending_head_office',
        },
        {
            label: 'Needs Revision',
            count: stats.needs_revision || 0,
            color: 'bg-orange-500',
            filter: 'needs_revision',
        },
        { label: 'Approved', count: stats.approved, color: 'bg-green-500', filter: 'approved' },
        { label: 'Rejected', count: stats.rejected, color: 'bg-red-500', filter: 'rejected' },
    ];

    return (
        <AdminLayout>
            <Head title="Admission Members" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Admission Members</h1>
                        <p className="text-sm text-gray-600 mt-1">
                            All member admission applications from all branches
                        </p>
                    </div>
                    <Link
                        href="/head-office/process-admissions"
                        className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                    >
                        <PlayCircle className="w-5 h-5" />
                        Process Admissions
                    </Link>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                    {statCards.map((stat) => (
                        <button
                            key={stat.label}
                            onClick={() => handleFilterChange(stat.filter)}
                            className={`bg-white p-4 rounded-lg shadow-sm border transition-all hover:shadow-md ${
                                statusFilter === stat.filter
                                    ? 'border-blue-500 ring-2 ring-blue-200'
                                    : 'border-gray-200'
                            }`}
                        >
                            <div className={`text-2xl font-bold ${stat.color.replace('bg-', 'text-')}`}>
                                {stat.count}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">{stat.label}</div>
                        </button>
                    ))}
                </div>

                {/* Search & Filter */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
                    <form onSubmit={handleSearch} className="space-y-2">
                        {/* Compact Single Row Filters */}
                        <div className="flex flex-wrap gap-2 items-end">
                            <div className="flex-1 min-w-[200px]">
                                <div className="relative">
                                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search..."
                                        className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <select
                                value={selectedZone}
                                onChange={(e) => setSelectedZone(e.target.value)}
                                className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">All Zones</option>
                                {zones.map((zone) => (
                                    <option key={zone.id} value={zone.id.toString()}>
                                        {zone.name}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={selectedArea}
                                onChange={(e) => setSelectedArea(e.target.value)}
                                disabled={!selectedZone && filteredAreas.length === 0}
                                className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                            >
                                <option value="">All Areas</option>
                                {filteredAreas.map((area) => (
                                    <option key={area.id} value={area.id.toString()}>
                                        {area.name}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={selectedBranch}
                                onChange={(e) => setSelectedBranch(e.target.value)}
                                disabled={!selectedZone && !selectedArea && filteredBranches.length === 0}
                                className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                            >
                                <option value="">All Branches</option>
                                {filteredBranches.map((branch) => (
                                    <option key={branch.id} value={branch.id.toString()}>
                                        {branch.name}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">All Status</option>
                                <option value="draft">Draft</option>
                                <option value="submitted">Submitted</option>
                                <option value="under_review">Under Review</option>
                                <option value="pending_head_office">Pending HO</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                                <option value="needs_revision">Needs Revision</option>
                            </select>
                            <select
                                value={hadIssues}
                                onChange={(e) => setHadIssues(e.target.value)}
                                className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">All</option>
                                <option value="yes">Had Issues</option>
                                <option value="no">Direct Approved</option>
                            </select>
                            <select
                                value={printedFilter}
                                onChange={(e) => setPrintedFilter(e.target.value)}
                                className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">Print: All</option>
                                <option value="yes">Printed</option>
                                <option value="no">Not Printed</option>
                            </select>
                            <button
                                type="submit"
                                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
                            >
                                <Filter className="w-3 h-3" />
                                Apply
                            </button>
                            <button
                                type="button"
                                onClick={handlePrint}
                                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-1"
                            >
                                <Printer className="w-3 h-3" />
                                Print
                            </button>
                            {(searchQuery || statusFilter || selectedZone || selectedArea || selectedBranch || hadIssues || printedFilter || dateFrom !== today || dateTo !== today) && (
                                <button
                                    type="button"
                                    onClick={clearFilters}
                                    className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors flex items-center gap-1"
                                >
                                    <X className="w-3 h-3" />
                                    Clear
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* Table */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Application No
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Applicant (আবেদনকারী)
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Mobile
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Branch (শাখা)
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Samity (সমিতি)
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Category
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        প্রিন্ট
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Submitted
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {admissions.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                                            No admissions found
                                        </td>
                                    </tr>
                                ) : (
                                    admissions.data.map((admission) => (
                                        <tr key={admission.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                {admission.application_no}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {admission.applicant_name_en}
                                                    </div>
                                                    <div className="text-gray-500">
                                                        {admission.applicant_name_bn}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                {admission.mobile_number}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                {admission.branch?.name || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                {admission.samity?.samity_name || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                {admission.member_category?.category_name || '-'}
                                            </td>
                                            <td className="px-4 py-3">
                                                {getStatusBadge(admission.status)}
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                {admission.printed_at ? (
                                                    <span className="inline-flex items-center gap-1 text-green-700" title="প্রিন্ট সম্পন্ন">
                                                        <CheckCircle className="w-4 h-4 shrink-0" />
                                                        প্রিন্ট সম্পন্ন
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-gray-500" title="অপ্রিন্টেড">
                                                        <Circle className="w-4 h-4 shrink-0" />
                                                        অপ্রিন্টেড
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                <div>
                                                    {admission.submitted_at
                                                        ? new Date(admission.submitted_at).toLocaleDateString('bn-BD')
                                                        : '-'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-2">
                                                    <a
                                                        href={`/head-office/admissions/${admission.id}`}
                                                        target="_blank"
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="View"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </a>
                                                    {admission.status === 'approved' && admission.revision_count && admission.revision_count > 0 && (
                                                        <button
                                                            onClick={() => openHistoryModal(admission)}
                                                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                            title="View History"
                                                        >
                                                            <FileText className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {(admission.status === 'draft' || admission.status === 'submitted') && (
                                                        <button
                                                            onClick={() =>
                                                                handleDelete(
                                                                    admission.id,
                                                                    admission.application_no
                                                                )
                                                            }
                                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {admissions.last_page > 1 && (
                        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                            <div className="text-sm text-gray-700">
                                Showing <span className="font-medium">{admissions.from}</span> to{' '}
                                <span className="font-medium">{admissions.to}</span> of{' '}
                                <span className="font-medium">{admissions.total}</span> results
                            </div>
                            <div className="flex gap-2">
                                <Link
                                    href={`/head-office/admission-members?page=${admissions.current_page - 1}${
                                        searchQuery ? `&search=${searchQuery}` : ''
                                    }${statusFilter ? `&status=${statusFilter}` : ''}${printedFilter ? `&printed=${printedFilter}` : ''}`}
                                    className={`px-3 py-1 rounded-lg border ${
                                        admissions.current_page === 1
                                            ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                                            : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                                    }`}
                                    preserveState
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </Link>
                                <span className="px-4 py-1 text-sm text-gray-700">
                                    Page {admissions.current_page} of {admissions.last_page}
                                </span>
                                <Link
                                    href={`/head-office/admission-members?page=${admissions.current_page + 1}${
                                        searchQuery ? `&search=${searchQuery}` : ''
                                    }${statusFilter ? `&status=${statusFilter}` : ''}${printedFilter ? `&printed=${printedFilter}` : ''}`}
                                    className={`px-3 py-1 rounded-lg border ${
                                        admissions.current_page === admissions.last_page
                                            ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                                            : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                                    }`}
                                    preserveState
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </Link>
                            </div>
                        </div>
                    )}
                </div>

                {/* Print Modal */}
                {showPrintModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">প্রিন্ট</h3>
                            <p className="text-sm text-gray-600 mb-4">
                                বর্তমান ফিল্টার অনুযায়ী তালিকা প্রিন্ট করা হবে। প্রিন্টের পর নিচের চেকবক্স চিহ্নিত করলে এই তালিকার সব রেকর্ড <strong>প্রিন্ট সম্পন্ন</strong> হিসেবে নোট থাকবে (লিস্টে প্রিন্ট সম্পন্ন/অপ্রিন্টেড দেখা যাবে)।
                            </p>
                            <label className="flex items-center gap-2 cursor-pointer mb-6">
                                <input
                                    type="checkbox"
                                    checked={markAsPrintedCheckbox}
                                    onChange={(e) => setMarkAsPrintedCheckbox(e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                />
                                <span className="text-sm font-medium text-gray-700">প্রিন্ট সম্পন্ন চিহ্নিত করুন</span>
                            </label>
                            <div className="flex gap-3 justify-end">
                                <button
                                    type="button"
                                    onClick={() => { setShowPrintModal(false); setMarkAsPrintedCheckbox(false); }}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                                >
                                    বাতিল
                                </button>
                                <button
                                    type="button"
                                    onClick={handlePrintConfirm}
                                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 flex items-center gap-1"
                                >
                                    <Printer className="w-4 h-4" />
                                    প্রিন্ট
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* History Modal */}
                {showHistoryModal && selectedAdmission && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Revision History</h3>
                                    <p className="text-sm text-gray-600">
                                        {selectedAdmission.application_no} - {selectedAdmission.applicant_name_en}
                                    </p>
                                </div>
                                <button
                                    onClick={closeHistoryModal}
                                    className="p-2 hover:bg-gray-100 rounded-full"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                {/* Revision Count Badge */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-blue-600" />
                                        <span className="text-sm font-medium text-gray-700">Total Revisions:</span>
                                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                                            {selectedAdmission.revision_count}
                                        </span>
                                    </div>
                                    <span className="text-xs text-gray-500">
                                        Status: <span className="font-semibold text-green-600">Approved</span>
                                    </span>
                                </div>

                                {/* Revision Comments */}
                                {selectedAdmission.revision_comments ? (
                                    <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                                        <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                                            <FileText className="w-4 h-4" />
                                            Complete Revision Timeline (সংশোধন টাইমলাইন)
                                        </h4>
                                        <div className="space-y-4">
                                            {selectedAdmission.revision_comments.split('\n\n').map((comment, index) => {
                                                const isHeadOffice = comment.includes('Head Office') || comment.includes('Issue');
                                                const isBranch = comment.includes('Branch Revision Note');

                                                return (
                                                    <div
                                                        key={index}
                                                        className={`p-3 rounded-lg ${
                                                            isHeadOffice
                                                                ? 'bg-orange-50 border border-orange-200'
                                                                : isBranch
                                                                ? 'bg-green-50 border border-green-200'
                                                                : 'bg-gray-50 border border-gray-200'
                                                        }`}
                                                    >
                                                        <div className="flex items-start gap-2">
                                                            <div className="flex-shrink-0 mt-1">
                                                                {isHeadOffice ? (
                                                                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                                                ) : isBranch ? (
                                                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                                ) : (
                                                                    <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                                                                )}
                                                            </div>
                                                            <div className="flex-1">
                                                                <p className={`text-sm whitespace-pre-wrap ${
                                                                    isHeadOffice
                                                                        ? 'text-orange-900'
                                                                        : isBranch
                                                                        ? 'text-green-900'
                                                                        : 'text-gray-900'
                                                                }`}>
                                                                    {comment.trim()}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                                        <p>No revision history available</p>
                                    </div>
                                )}
                            </div>

                            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
                                <button
                                    onClick={closeHistoryModal}
                                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
