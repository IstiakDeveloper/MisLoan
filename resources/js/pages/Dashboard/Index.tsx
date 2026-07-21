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

            <div className="max-w-7xl mx-auto space-y-6 pb-12">
                {/* Header */}
                <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Head Office Dashboard</h1>
                        <p className="text-xs text-slate-500 font-medium">System overview and branch submission status</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1 px-2">
                            <span className="text-xs text-slate-500 font-medium">Period:</span>
                            <select
                                value={periodSelect}
                                onChange={(e) => setPeriodSelect(e.target.value as 'today' | 'monthly' | 'date_to_date')}
                                className="bg-transparent border-0 text-xs py-1 pl-1 pr-6 font-semibold text-slate-700 focus:ring-0 cursor-pointer"
                            >
                                <option value="today">Today</option>
                                <option value="monthly">Monthly</option>
                                <option value="date_to_date">Custom Range</option>
                            </select>
                        </div>
                        {periodSelect === 'date_to_date' && (
                            <div className="flex items-center gap-2">
                                <input
                                    type="date"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                    className="rounded-xl border border-slate-200 text-xs py-1.5 px-2.5 text-slate-600 focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="text-slate-400 text-xs">–</span>
                                <input
                                    type="date"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                    className="rounded-xl border border-slate-200 text-xs py-1.5 px-2.5 text-slate-600 focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={applyFilter}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-sm"
                        >
                            <Calendar size={14} />
                            Apply
                        </button>
                    </div>
                </div>

                {/* Branch submission summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                                <Building2 size={20} className="text-slate-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-800">{branchSummary.total_branches}</p>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">Total branches</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                                <CheckCircle size={20} className="text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-emerald-700">{branchSummary.submitted_in_period}</p>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">Submitted in period</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                                <Clock size={20} className="text-amber-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-amber-700">{branchSummary.pending_in_period}</p>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">Pending</p>
                            </div>
                        </div>
                    </div>
                </div>

                <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                    Statistics below for: <span className="font-bold text-slate-700">{periodLabel}</span>
                </p>

                {/* Period stats */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                                <FileText size={18} className="text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-800">{periodStats.loan_applications_submitted}</p>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">Loans Submitted</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0">
                                <UserPlus size={18} className="text-violet-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-800">{periodStats.member_admissions_submitted}</p>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">Admissions</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                                <CheckCircle size={18} className="text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-800">{periodStats.approved}</p>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">Approved</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                                <XCircle size={18} className="text-rose-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-800">{periodStats.rejected}</p>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">Rejected</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                                <AlertCircle size={18} className="text-amber-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-800">{periodStats.issues_pending}</p>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">Issues pending</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Two columns: Branch lists + System summary */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Branches submitted vs missing */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden h-fit">
                            <div className="px-5 py-4 border-b border-slate-100">
                                <h2 className="text-sm font-bold text-slate-800">Branches submitted in period</h2>
                            </div>
                            <div className="p-5 max-h-60 overflow-y-auto custom-scrollbar">
                                {branchSummary.submitted_branches.length === 0 ? (
                                    <p className="text-sm text-slate-500 text-center py-4">None in this period.</p>
                                ) : (
                                    <ul className="space-y-3">
                                        {branchSummary.submitted_branches.map((b) => (
                                            <li key={b.id} className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 text-sm pb-2 border-b border-slate-50 last:border-0 last:pb-0">
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle size={16} className="text-emerald-600 shrink-0" />
                                                    <span className="font-bold text-slate-800">{b.name}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 pl-6 sm:pl-0 text-xs font-medium text-slate-500">
                                                    {b.area?.name && (
                                                        <>
                                                            <span className="hidden sm:inline text-slate-300">•</span>
                                                            <span>{b.area.name}</span>
                                                        </>
                                                    )}
                                                    {b.area?.zone?.name && (
                                                        <>
                                                            <span className="text-slate-300">•</span>
                                                            <span>{b.area.zone.name}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                        
                        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden h-fit">
                            <div className="px-5 py-4 border-b border-slate-100">
                                <h2 className="text-sm font-bold text-slate-800">Branches not submitted</h2>
                            </div>
                            <div className="p-5 max-h-60 overflow-y-auto custom-scrollbar">
                                {branchSummary.missing_branches.length === 0 ? (
                                    <p className="text-sm font-semibold text-emerald-600 text-center py-4">All branches submitted.</p>
                                ) : (
                                    <ul className="space-y-3">
                                        {branchSummary.missing_branches.map((b) => (
                                            <li key={b.id} className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 text-sm pb-2 border-b border-slate-50 last:border-0 last:pb-0">
                                                <div className="flex items-center gap-2">
                                                    <Clock size={16} className="text-amber-500 shrink-0" />
                                                    <span className="font-bold text-slate-800">{b.name}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 pl-6 sm:pl-0 text-xs font-medium text-slate-500">
                                                    {b.area?.name && (
                                                        <>
                                                            <span className="hidden sm:inline text-slate-300">•</span>
                                                            <span>{b.area.name}</span>
                                                        </>
                                                    )}
                                                    {b.area?.zone?.name && (
                                                        <>
                                                            <span className="text-slate-300">•</span>
                                                            <span>{b.area.zone.name}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right column: System summary */}
                    <div>
                        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden h-fit sticky top-24">
                            <div className="px-5 py-4 border-b border-slate-100">
                                <h2 className="text-sm font-bold text-slate-800">System summary</h2>
                            </div>
                            <div className="p-5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total users</span>
                                    <span className="font-bold text-slate-800 tabular-nums">{stats.total_users}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Zones / Areas</span>
                                    <span className="font-bold text-slate-800 tabular-nums">{stats.total_zones} / {stats.total_areas}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total applications</span>
                                    <span className="font-bold text-slate-800 tabular-nums">{stats.total_applications}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending (all time)</span>
                                    <span className="font-bold text-amber-600 tabular-nums">{stats.pending_applications}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Approved (all time)</span>
                                    <span className="font-bold text-emerald-600 tabular-nums">{stats.approved_applications}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
