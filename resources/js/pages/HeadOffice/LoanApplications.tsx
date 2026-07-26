import React, { useState, useEffect } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { formatDate } from '@/utils/dateUtils';
import { Badge } from '@/components/ui/badge';
import {
    Search,
    Eye,
    Pencil,
    CalendarDays,
    Filter,
    ChevronLeft,
    ChevronRight,
    PlayCircle,
    Trash2,
    FileText,
    X,
    Printer,
} from 'lucide-react';

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

interface LoanApplication {
    id: number;
    application_no: string;
    status: string;
    requested_amount: number;
    approved_amount: number | null;
    created_at: string;
    submitted_at: string | null;
    branch?: {
        id: number;
        name: string;
        area?: {
            id: number;
            name: string;
            zone?: Zone;
        };
    };
    loan_product?: {
        id: number;
        product_name: string;
        product_name_bn: string;
    };
    loan_category?: {
        id: number;
        category_name: string;
        category_name_bn: string;
    };
    member_admission?: {
        id: number;
        applicant_name_en: string;
        applicant_name_bn: string;
        mobile_number: string;
        nid_number: string;
        application_no: string;
    };
    samity?: {
        samity_name: string;
        samity_name_bn: string;
    };
}

interface Props {
    loans: {
        data: LoanApplication[];
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
    };
    stats: {
        total: number;
        draft: number;
        submitted: number;
        under_review: number;
        pending_head_office: number;
        approved: number;
        rejected: number;
        disbursed: number;
    };
    zones: Zone[];
    areas: Area[];
    branches: Branch[];
}

export default function LoanApplications({ loans, filters, stats, zones, areas, branches }: Props) {
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedLoan, setSelectedLoan] = useState<LoanApplication | null>(null);

    // Date filters - default to the current month (1st .. today)
    const today = new Date().toISOString().split('T')[0];
    const monthStart = `${today.slice(0, 7)}-01`;
    const [dateFrom, setDateFrom] = useState(filters.date_from || monthStart);
    const [dateTo, setDateTo] = useState(filters.date_to || today);
    const isTodayFilter = dateFrom === today && dateTo === today;

    // Organizational filters
    const [selectedZone, setSelectedZone] = useState(filters.zone_id?.toString() || '');
    const [selectedArea, setSelectedArea] = useState(filters.area_id?.toString() || '');
    const [selectedBranch, setSelectedBranch] = useState(filters.branch_id?.toString() || '');
    const [hadIssues, setHadIssues] = useState(filters.had_issues || '');

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
            disbursed: { variant: 'default', label: 'Disbursed' },
        };

        const config = variants[status] || { variant: 'secondary', label: status };
        return (
            <Badge
                variant={config.variant}
                className={
                    status === 'approved'
                        ? 'bg-green-500 hover:bg-green-600'
                        : status === 'disbursed'
                        ? 'bg-emerald-500 hover:bg-emerald-600'
                        : status === 'under_review'
                        ? 'bg-yellow-500 hover:bg-yellow-600'
                        : status === 'submitted'
                        ? 'bg-blue-500 hover:bg-blue-600'
                        : status === 'pending_head_office'
                        ? 'bg-purple-500 hover:bg-purple-600'
                        : status === 'rejected'
                        ? 'bg-red-500 hover:bg-red-600'
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
            '/head-office/loan-applications',
            {
                search: searchQuery,
                status: statusFilter,
                zone_id: selectedZone,
                area_id: selectedArea,
                branch_id: selectedBranch,
                date_from: dateFrom,
                date_to: dateTo,
                had_issues: hadIssues,
            },
            { preserveState: true }
        );
    };

    const handleFilterChange = (status: string) => {
        setStatusFilter(status);
        router.get(
            '/head-office/loan-applications',
            {
                search: searchQuery,
                status: status,
                zone_id: selectedZone,
                area_id: selectedArea,
                branch_id: selectedBranch,
                date_from: dateFrom,
                date_to: dateTo,
                had_issues: hadIssues,
            },
            { preserveState: true }
        );
    };

    const handleTodayFilter = () => {
        setDateFrom(today);
        setDateTo(today);
        router.get(
            '/head-office/loan-applications',
            {
                search: searchQuery,
                status: statusFilter,
                zone_id: selectedZone,
                area_id: selectedArea,
                branch_id: selectedBranch,
                date_from: today,
                date_to: today,
                had_issues: hadIssues,
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
        setDateFrom(monthStart);
        setDateTo(today);
        setHadIssues('');
        router.get('/head-office/loan-applications', { date_from: monthStart, date_to: today }, { preserveState: true });
    };

    const getFilterParams = () => {
        const params = new URLSearchParams();
        if (searchQuery) params.append('search', searchQuery);
        if (statusFilter) params.append('status', statusFilter);
        if (selectedZone) params.append('zone_id', selectedZone);
        if (selectedArea) params.append('area_id', selectedArea);
        if (selectedBranch) params.append('branch_id', selectedBranch);
        if (dateFrom) params.append('date_from', dateFrom);
        if (dateTo) params.append('date_to', dateTo);
        if (hadIssues) params.append('had_issues', hadIssues);
        return params;
    };

    const handlePrint = () => {
        const printUrl = `/head-office/loan-applications/print?${getFilterParams().toString()}`;
        window.open(printUrl, '_blank');
    };

    const buildPageUrl = (page: number) => {
        const params = getFilterParams();
        params.set('page', String(page));
        return `/head-office/loan-applications?${params.toString()}`;
    };

    const handleDelete = (id: number, applicationNo: string) => {
        if (confirm(`Are you sure you want to delete loan application ${applicationNo}?`)) {
            router.delete(`/head-office/loans/${id}`, {
                preserveScroll: true,
            });
        }
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
        { label: 'Approved', count: stats.approved, color: 'bg-green-500', filter: 'approved' },
        { label: 'Rejected', count: stats.rejected, color: 'bg-red-500', filter: 'rejected' },
        { label: 'Disbursed', count: stats.disbursed, color: 'bg-emerald-500', filter: 'disbursed' },
    ];

    return (
        <AdminLayout>
            <Head title="Loan Applications" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Loan Applications</h1>
                        <p className="text-sm text-gray-600 mt-1">
                            All loan applications from all branches
                        </p>
                    </div>
                    <Link
                        href="/head-office/process-loans"
                        className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                    >
                        <PlayCircle className="w-5 h-5" />
                        Process Loans
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
                                        placeholder="Search by application no, name, mobile, NID..."
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
                            <button
                                type="button"
                                onClick={handleTodayFilter}
                                title="শুধু আজকের ডেটা"
                                className={`px-3 py-1.5 text-sm rounded border transition-colors flex items-center gap-1 ${
                                    isTodayFilter
                                        ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                <CalendarDays className="w-3 h-3" />
                                Today
                            </button>
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
                                <option value="disbursed">Disbursed</option>
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
                            {(searchQuery || statusFilter || selectedZone || selectedArea || selectedBranch || hadIssues || dateFrom !== monthStart || dateTo !== today) && (
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
                                        Product
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Category
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Amount
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
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
                                {loans.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                                            No loan applications found
                                        </td>
                                    </tr>
                                ) : (
                                    loans.data.map((loan) => (
                                        <tr key={loan.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                {loan.application_no}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {loan.member_admission?.applicant_name_en || '-'}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {loan.member_admission?.applicant_name_bn || '-'}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                {loan.member_admission?.mobile_number || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                {loan.branch?.name || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                {loan.loan_product?.product_name_bn || loan.loan_product?.product_name || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                {loan.loan_category?.category_name_bn || loan.loan_category?.category_name || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                <div>
                                                    <div className="font-medium">৳{loan.requested_amount?.toLocaleString() || '0'}</div>
                                                    {loan.approved_amount && (
                                                        <div className="text-xs text-gray-500">
                                                            Approved: ৳{loan.approved_amount.toLocaleString()}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                {getStatusBadge(loan.status)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                <div>
                                                    {loan.submitted_at
                                                        ? formatDate(loan.submitted_at)
                                                        : '-'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Link
                                                        href={`/head-office/loans/${loan.id}`}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="View"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Link>
                                                    <Link
                                                        href={`/member/loan-applications/${loan.id}/edit`}
                                                        className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </Link>
                                                    {(loan.status === 'draft' || loan.status === 'submitted') && (
                                                        <button
                                                            onClick={() =>
                                                                handleDelete(
                                                                    loan.id,
                                                                    loan.application_no
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
                    {loans.last_page > 1 && (
                        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                            <div className="text-sm text-gray-700">
                                Showing <span className="font-medium">{loans.from}</span> to{' '}
                                <span className="font-medium">{loans.to}</span> of{' '}
                                <span className="font-medium">{loans.total}</span> results
                            </div>
                            <div className="flex gap-2">
                                <Link
                                    href={buildPageUrl(loans.current_page - 1)}
                                    className={`px-3 py-1 rounded-lg border ${
                                        loans.current_page === 1
                                            ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                                            : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                                    }`}
                                    preserveState
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </Link>
                                <span className="px-4 py-1 text-sm text-gray-700">
                                    Page {loans.current_page} of {loans.last_page}
                                </span>
                                <Link
                                    href={buildPageUrl(loans.current_page + 1)}
                                    className={`px-3 py-1 rounded-lg border ${
                                        loans.current_page === loans.last_page
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
            </div>
        </AdminLayout>
    );
}
