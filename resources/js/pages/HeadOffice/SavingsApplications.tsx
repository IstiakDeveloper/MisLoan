import React, { useState, useEffect } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Search, Filter, ChevronLeft, ChevronRight, FileText, X, Landmark, Eye } from 'lucide-react';

interface Zone {
    id: number;
    name: string;
}

interface Area {
    id: number;
    name: string;
    zone_id: number;
    zone?: Zone;
}

interface Branch {
    id: number;
    name: string;
    area_id: number;
    area?: { id: number; name: string; zone?: Zone };
}

interface BranchSummaryItem {
    branch_id: number;
    branch_name: string;
    area_name: string;
    zone_name: string;
    count: number;
}

interface SavingsApplication {
    id: number;
    application_no: string;
    status: string;
    deposit_amount: number;
    monthly_installment?: number;
    monthly_savings_amount?: number;
    maturity_amount?: number;
    duration_months?: number;
    created_at: string;
    submitted_at?: string | null;
    reviewed_at?: string | null;
    branch?: { id: number; name: string; area?: { name: string; zone?: { name: string } } };
    savings_product?: {
        id: number;
        product_name: string;
        product_name_bn?: string;
        product_code: string;
    };
    savingsProduct?: {
        id: number;
        product_name: string;
        product_name_bn?: string;
        product_code: string;
    };
    member_admission?: {
        id: number;
        applicant_name_en?: string;
        applicant_name_bn?: string;
        application_no?: string;
        nid_number?: string;
        mobile_number?: string;
    };
    memberAdmission?: {
        id: number;
        applicant_name_en?: string;
        applicant_name_bn?: string;
        application_no?: string;
        nid_number?: string;
        mobile_number?: string;
    };
}

interface Props {
    applications: {
        data: SavingsApplication[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from?: number;
        to?: number;
        links?: Array<{ url: string | null; label: string; active: boolean }>;
    };
    filters: {
        status?: string;
        search?: string;
        zone_id?: number | string;
        area_id?: number | string;
        branch_id?: number | string;
        date_from?: string;
        date_to?: string;
    };
    stats: {
        total: number;
        draft: number;
        submitted: number;
        under_review: number;
        approved: number;
        rejected: number;
        active: number;
        matured: number;
    };
    branchSummary: BranchSummaryItem[];
    zones: Zone[];
    areas: Area[];
    branches: Branch[];
}

const statusLabels: Record<string, { label: string; color: string }> = {
    draft: { label: 'Draft (খসড়া)', color: 'bg-gray-100 text-gray-800' },
    submitted: { label: 'Submitted (জমা)', color: 'bg-blue-100 text-blue-800' },
    under_review: { label: 'Under Review (পর্যালোচনায়)', color: 'bg-yellow-100 text-yellow-800' },
    approved: { label: 'Approved (অনুমোদিত)', color: 'bg-green-100 text-green-800' },
    rejected: { label: 'Rejected (প্রত্যাখ্যাত)', color: 'bg-red-100 text-red-800' },
    active: { label: 'Active (সক্রিয়)', color: 'bg-purple-100 text-purple-800' },
    matured: { label: 'Matured (পরিপক্ক)', color: 'bg-indigo-100 text-indigo-800' },
    closed: { label: 'Closed (বন্ধ)', color: 'bg-gray-100 text-gray-800' },
    cancelled: { label: 'Cancelled (বাতিল)', color: 'bg-red-100 text-red-800' },
};

export default function SavingsApplications({
    applications,
    filters,
    stats,
    branchSummary,
    zones,
    areas,
    branches,
}: Props) {
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');
    const today = new Date().toISOString().split('T')[0];
    const [dateFrom, setDateFrom] = useState(filters.date_from || today);
    const [dateTo, setDateTo] = useState(filters.date_to || today);
    const [selectedZone, setSelectedZone] = useState((filters.zone_id ?? '').toString());
    const [selectedArea, setSelectedArea] = useState((filters.area_id ?? '').toString());
    const [selectedBranch, setSelectedBranch] = useState((filters.branch_id ?? '').toString());

    const [filteredAreas, setFilteredAreas] = useState<Area[]>(areas);
    const [filteredBranches, setFilteredBranches] = useState<Branch[]>(branches);

    useEffect(() => {
        if (selectedZone) {
            setFilteredAreas(areas.filter((a) => a.zone_id.toString() === selectedZone));
            if (selectedArea && !areas.find((a) => a.id.toString() === selectedArea && a.zone_id.toString() === selectedZone)) {
                setSelectedArea('');
            }
        } else {
            setFilteredAreas(areas);
        }
    }, [selectedZone, areas]);

    useEffect(() => {
        if (selectedArea) {
            setFilteredBranches(branches.filter((b) => b.area_id.toString() === selectedArea));
            if (selectedBranch && !branches.find((b) => b.id.toString() === selectedBranch && b.area_id.toString() === selectedArea)) {
                setSelectedBranch('');
            }
        } else if (selectedZone) {
            const zoneAreaIds = filteredAreas.map((a) => a.id);
            setFilteredBranches(branches.filter((b) => zoneAreaIds.includes(b.area_id)));
        } else {
            setFilteredBranches(branches);
        }
    }, [selectedArea, selectedZone, filteredAreas, branches]);

    const buildParams = (overrides: Record<string, string | number | undefined> = {}) => {
        const p: Record<string, string> = {
            date_from: dateFrom,
            date_to: dateTo,
            search: searchQuery,
            status: statusFilter,
            zone_id: selectedZone,
            area_id: selectedArea,
            branch_id: selectedBranch,
            ...overrides,
        };
        return Object.fromEntries(Object.entries(p).filter(([, v]) => v !== '' && v !== undefined));
    };

    const applyFilters = () => {
        router.get('/head-office/savings-applications', buildParams(), { preserveState: true });
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const handleFilterChange = (status: string) => {
        setStatusFilter(status);
        router.get('/head-office/savings-applications', buildParams({ status }), { preserveState: true });
    };

    const clearFilters = () => {
        setSearchQuery('');
        setStatusFilter('');
        setSelectedZone('');
        setSelectedArea('');
        setSelectedBranch('');
        setDateFrom(today);
        setDateTo(today);
        router.get('/head-office/savings-applications', { date_from: today, date_to: today }, { preserveState: true });
    };

    const paginationUrl = (page: number) => {
        const params = new URLSearchParams(buildParams() as any);
        params.set('page', String(page));
        return `/head-office/savings-applications?${params.toString()}`;
    };

    const statCards = [
        { label: 'Total (মোট)', count: stats.total, filter: '', color: 'bg-blue-500' },
        { label: 'Draft (খসড়া)', count: stats.draft, filter: 'draft', color: 'bg-gray-500' },
        { label: 'Submitted (জমা)', count: stats.submitted, filter: 'submitted', color: 'bg-blue-500' },
        { label: 'Approved (অনুমোদিত)', count: stats.approved, filter: 'approved', color: 'bg-green-500' },
        { label: 'Rejected (প্রত্যাখ্যাত)', count: stats.rejected, filter: 'rejected', color: 'bg-red-500' },
        { label: 'Active (সক্রিয়)', count: stats.active, filter: 'active', color: 'bg-purple-500' },
        { label: 'Matured (পরিপক্ক)', count: stats.matured, filter: 'matured', color: 'bg-indigo-500' },
    ];

    return (
        <AdminLayout>
            <Head title="Savings Applications - Head Office" />

            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Landmark className="w-7 h-7 text-indigo-600" />
                        Savings Applications (সঞ্চয় আবেদন - হেড অফিস)
                    </h1>
                    <p className="text-sm text-gray-600 mt-1">
                        All branch savings applications — filter by date and branch
                    </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    {statCards.map((stat) => (
                        <button
                            key={stat.label}
                            onClick={() => handleFilterChange(stat.filter)}
                            className={`bg-white p-4 rounded-lg shadow-sm border transition-all hover:shadow-md ${
                                statusFilter === stat.filter ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-200'
                            }`}
                        >
                            <div className={`text-2xl font-bold text-gray-900`}>{stat.count}</div>
                            <div className="text-xs text-gray-600 mt-1">{stat.label}</div>
                        </button>
                    ))}
                </div>

                {/* Branch summary */}
                {branchSummary.length > 0 && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <h2 className="px-4 py-3 text-sm font-semibold text-gray-800 border-b bg-gray-50">
                            Savings by Branch (শাখা অনুযায়ী)
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Zone</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Area</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Branch</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Count</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {branchSummary.map((row) => (
                                        <tr key={row.branch_id} className="hover:bg-gray-50">
                                            <td className="px-4 py-2 text-sm text-gray-900">{row.zone_name}</td>
                                            <td className="px-4 py-2 text-sm text-gray-900">{row.area_name}</td>
                                            <td className="px-4 py-2 text-sm font-medium text-gray-900">{row.branch_name}</td>
                                            <td className="px-4 py-2 text-sm text-gray-900 text-right">{row.count}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Filters */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
                    <form onSubmit={handleSearch} className="space-y-2">
                        <div className="flex flex-wrap gap-2 items-end">
                            <div className="flex-1 min-w-[180px]">
                                <div className="relative">
                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Application no, name, mobile, NID, product..."
                                        className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                            </div>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                            />
                            <span className="text-gray-500 text-sm">to</span>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                            />
                            <select
                                value={selectedZone}
                                onChange={(e) => setSelectedZone(e.target.value)}
                                className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                            >
                                <option value="">All Zones</option>
                                {zones.map((z) => (
                                    <option key={z.id} value={z.id}>{z.name}</option>
                                ))}
                            </select>
                            <select
                                value={selectedArea}
                                onChange={(e) => setSelectedArea(e.target.value)}
                                className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                            >
                                <option value="">All Areas</option>
                                {filteredAreas.map((a) => (
                                    <option key={a.id} value={a.id}>{a.name}</option>
                                ))}
                            </select>
                            <select
                                value={selectedBranch}
                                onChange={(e) => setSelectedBranch(e.target.value)}
                                className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                            >
                                <option value="">All Branches</option>
                                {filteredBranches.map((b) => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                            >
                                <option value="">All Status</option>
                                {Object.entries(statusLabels).map(([k, v]) => (
                                    <option key={k} value={k}>{v.label}</option>
                                ))}
                            </select>
                            <button
                                type="submit"
                                className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center gap-1"
                            >
                                <Filter className="w-3 h-3" />
                                Filter
                            </button>
                            {(searchQuery || statusFilter || selectedZone || selectedArea || selectedBranch || dateFrom !== today || dateTo !== today) && (
                                <button type="button" onClick={clearFilters} className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 flex items-center gap-1">
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
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Application No</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Member</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Deposit</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Maturity</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {applications.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                                            <FileText className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                                            No savings applications found for this filter
                                        </td>
                                    </tr>
                                ) : (
                                    applications.data.map((app) => {
                                        const statusInfo = statusLabels[app.status] || statusLabels.draft;
                                        return (
                                            <tr key={app.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                    <Link href={`/head-office/savings-applications/${app.id}`} className="text-blue-600 hover:text-blue-800 hover:underline">
                                                        {app.application_no}
                                                    </Link>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-sm text-gray-900">
                                                        {(app.member_admission ?? app.memberAdmission)?.applicant_name_bn || (app.member_admission ?? app.memberAdmission)?.applicant_name_en || '—'}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {(app.member_admission ?? app.memberAdmission)?.application_no && `Member: ${(app.member_admission ?? app.memberAdmission)?.application_no}`}
                                                        {(app.member_admission ?? app.memberAdmission)?.mobile_number && ` | ${(app.member_admission ?? app.memberAdmission)?.mobile_number}`}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900">{app.branch?.name || '—'}</td>
                                                <td className="px-4 py-3 text-sm text-gray-900">
                                                    {(app.savings_product ?? app.savingsProduct)?.product_name_bn || (app.savings_product ?? app.savingsProduct)?.product_name || '—'}
                                                    {(app.savings_product ?? app.savingsProduct)?.product_code && (
                                                        <span className="text-xs text-gray-500 block">{(app.savings_product ?? app.savingsProduct)?.product_code}</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                                    ৳{Number(app.deposit_amount || 0).toLocaleString('en-BD')}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                                    {app.maturity_amount ? `৳${Number(app.maturity_amount).toLocaleString('en-BD')}` : '—'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${statusInfo.color}`}>
                                                        {statusInfo.label}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                    {new Date(app.created_at).toLocaleDateString('bn-BD')}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <Link
                                                        href={`/head-office/savings-applications/${app.id}`}
                                                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded border border-indigo-200"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                        View
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {applications.last_page > 1 && (
                        <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-between">
                            <div className="text-sm text-gray-700">
                                Showing <span className="font-medium">{applications.from}</span> - <span className="font-medium">{applications.to}</span> of <span className="font-medium">{applications.total}</span>
                            </div>
                            <div className="flex gap-2">
                                <Link
                                    href={paginationUrl(applications.current_page - 1)}
                                    preserveState
                                    className={`px-3 py-1 rounded border ${
                                        applications.current_page <= 1 ? 'border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                                    }`}
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </Link>
                                <span className="px-4 py-1 text-sm text-gray-700">
                                    Page {applications.current_page} / {applications.last_page}
                                </span>
                                <Link
                                    href={paginationUrl(applications.current_page + 1)}
                                    preserveState
                                    className={`px-3 py-1 rounded border ${
                                        applications.current_page >= applications.last_page
                                            ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                                            : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                                    }`}
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
