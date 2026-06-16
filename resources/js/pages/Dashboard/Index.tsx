import React, { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { formatDate } from '@/utils/dateUtils';
import {
    Building2,
    MapPin,
    FileText,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    Calendar,
    UserPlus,
} from 'lucide-react';

interface Branch {
    id: number;
    name: string;
    code: string;
    area_id?: number;
    area?: { id: number; name: string; zone_id: number; zone?: { id: number; name: string } };
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
    zone_id?: number;
}

interface Stats {
    total_users: number;
    total_zones: number;
    total_areas: number;
    total_branches: number;
    total_roles: number;
    total_applications: number;
    pending_applications: number;
    approved_applications: number;
}

interface PeriodStats {
    loan_applications_submitted: number;
    member_admissions_submitted: number;
    approved: number;
    rejected: number;
    issues_pending: number;
}

interface BranchSummary {
    total_branches: number;
    submitted_in_period: number;
    pending_in_period: number;
    submitted_branches: Branch[];
    missing_branches: Branch[];
}

interface AccessibleData {
    zones?: Zone[];
    areas?: Area[];
    branches?: Branch[];
}

interface Props {
    stats: Stats;
    periodStats: PeriodStats;
    period: 'today' | 'monthly' | 'date_to_date';
    dateFrom: string | null;
    dateTo: string | null;
    branchSummary: BranchSummary;
    accessibleData: AccessibleData;
    dashboardType: string;
}

export default function Dashboard({
    stats,
    periodStats,
    period,
    dateFrom,
    dateTo,
    branchSummary,
    accessibleData,
}: Props) {
    const [periodSelect, setPeriodSelect] = useState<'today' | 'monthly' | 'date_to_date'>(period);
    const [fromDate, setFromDate] = useState(dateFrom ?? '');
    const [toDate, setToDate] = useState(dateTo ?? '');

    useEffect(() => {
        setPeriodSelect(period);
        setFromDate(dateFrom ?? '');
        setToDate(dateTo ?? '');
    }, [period, dateFrom, dateTo]);

    const applyFilter = () => {
        const params: Record<string, string> = { period: periodSelect };
        if (periodSelect === 'date_to_date' && fromDate && toDate) {
            params.from_date = fromDate;
            params.to_date = toDate;
        }
        const query = new URLSearchParams(params).toString();
        const url = query ? `/dashboard?${query}` : '/dashboard';
        router.get(url);
    };

    const periodLabel =
        period === 'today'
            ? 'Today'
            : period === 'monthly'
              ? 'This Month'
              : dateFrom && dateTo
                ? `${formatDate(dateFrom)} – ${formatDate(dateTo)}`
                : 'Period';

    return (
        <AdminLayout>
            <Head title="Head Office Dashboard" />

            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header + Period filter (same as Branch) */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">Head Office Dashboard</h1>
                        <p className="text-sm text-gray-500 mt-0.5">System overview and branch submission status</p>
                    </div>
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-600 whitespace-nowrap">Period:</label>
                            <select
                                value={periodSelect}
                                onChange={(e) => setPeriodSelect(e.target.value as 'today' | 'monthly' | 'date_to_date')}
                                className="rounded-lg border border-gray-300 text-sm py-2 pl-3 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="today">Today</option>
                                <option value="monthly">Monthly</option>
                                <option value="date_to_date">Date to Date</option>
                            </select>
                        </div>
                        {periodSelect === 'date_to_date' && (
                            <>
                                <input
                                    type="date"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                    className="rounded-lg border border-gray-300 text-sm py-2 px-3 focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="text-gray-400">–</span>
                                <input
                                    type="date"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                    className="rounded-lg border border-gray-300 text-sm py-2 px-3 focus:ring-2 focus:ring-blue-500"
                                />
                            </>
                        )}
                        <button
                            type="button"
                            onClick={applyFilter}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                            <Calendar size={16} />
                            Apply
                        </button>
                    </div>
                </div>

                {/* Branch submission summary: কত শাখা আজকে submit করছে, কত বাকি */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                                <Building2 size={20} className="text-slate-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-semibold text-gray-900">{branchSummary.total_branches}</p>
                                <p className="text-xs text-gray-500">Total branches</p>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-xl border border-emerald-200 p-5 shadow-sm bg-emerald-50/50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                                <CheckCircle size={20} className="text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-semibold text-gray-900">{branchSummary.submitted_in_period}</p>
                                <p className="text-xs text-gray-500">Submitted in period</p>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-xl border border-amber-200 p-5 shadow-sm bg-amber-50/50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                                <Clock size={20} className="text-amber-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-semibold text-gray-900">{branchSummary.pending_in_period}</p>
                                <p className="text-xs text-gray-500">Pending</p>
                            </div>
                        </div>
                    </div>
                </div>

                <p className="text-sm text-gray-500">
                    Statistics below for: <strong>{periodLabel}</strong>
                </p>

                {/* Period stats: loan apps, admissions, approved, rejected, issues */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                                <FileText size={20} className="text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-semibold text-gray-900">{periodStats.loan_applications_submitted}</p>
                                <p className="text-xs text-gray-500">Loan applications submitted</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center">
                                <UserPlus size={20} className="text-violet-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-semibold text-gray-900">{periodStats.member_admissions_submitted}</p>
                                <p className="text-xs text-gray-500">Member admissions submitted</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                                <CheckCircle size={20} className="text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-semibold text-gray-900">{periodStats.approved}</p>
                                <p className="text-xs text-gray-500">Approved</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                                <XCircle size={20} className="text-red-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-semibold text-gray-900">{periodStats.rejected}</p>
                                <p className="text-xs text-gray-500">Rejected</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                                <AlertCircle size={20} className="text-amber-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-semibold text-gray-900">{periodStats.issues_pending}</p>
                                <p className="text-xs text-gray-500">Issues pending</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Two columns: Branch lists + System summary */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Branches submitted vs missing */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-100">
                                <h2 className="text-sm font-semibold text-gray-900">Branches submitted in period</h2>
                            </div>
                            <div className="p-5 max-h-48 overflow-y-auto">
                                {branchSummary.submitted_branches.length === 0 ? (
                                    <p className="text-sm text-gray-500">None in this period.</p>
                                ) : (
                                    <ul className="space-y-1.5">
                                        {branchSummary.submitted_branches.map((b) => (
                                            <li key={b.id} className="flex items-center gap-2 text-sm">
                                                <CheckCircle size={14} className="text-emerald-600 flex-shrink-0" />
                                                <span className="font-medium text-gray-900">{b.name}</span>
                                                {b.area?.name && (
                                                    <span className="text-gray-500">· {b.area.name}</span>
                                                )}
                                                {b.area?.zone?.name && (
                                                    <span className="text-gray-400">· {b.area.zone.name}</span>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-100">
                                <h2 className="text-sm font-semibold text-gray-900">Branches not submitted</h2>
                            </div>
                            <div className="p-5 max-h-48 overflow-y-auto">
                                {branchSummary.missing_branches.length === 0 ? (
                                    <p className="text-sm text-emerald-600">All branches submitted.</p>
                                ) : (
                                    <ul className="space-y-1.5">
                                        {branchSummary.missing_branches.map((b) => (
                                            <li key={b.id} className="flex items-center gap-2 text-sm text-gray-600">
                                                <Clock size={14} className="text-amber-500 flex-shrink-0" />
                                                <span className="font-medium text-gray-800">{b.name}</span>
                                                {b.area?.name && (
                                                    <span className="text-gray-500">· {b.area.name}</span>
                                                )}
                                                {b.area?.zone?.name && (
                                                    <span className="text-gray-400">· {b.area.zone.name}</span>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right column: System summary */}
                    <div>
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                            <div className="px-5 py-4 border-b border-gray-100">
                                <h2 className="text-sm font-semibold text-gray-900">System summary</h2>
                            </div>
                            <div className="p-5 space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Total users</span>
                                    <span className="font-medium text-gray-900">{stats.total_users}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Zones / Areas</span>
                                    <span className="font-medium text-gray-900">{stats.total_zones} / {stats.total_areas}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Total applications</span>
                                    <span className="font-medium text-gray-900">{stats.total_applications}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Pending (all time)</span>
                                    <span className="font-medium text-amber-600">{stats.pending_applications}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Approved (all time)</span>
                                    <span className="font-medium text-emerald-600">{stats.approved_applications}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
