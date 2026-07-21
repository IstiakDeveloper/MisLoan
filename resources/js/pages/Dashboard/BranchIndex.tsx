import React, { useState, useEffect } from 'react';
import AdminLayout from '@/layouts/admin-layout';
import { formatDate } from '@/utils/dateUtils';
import { Head, router } from '@inertiajs/react';
import {
    Building2,
    FileSpreadsheet,
    UserPlus,
    CheckCircle,
    XCircle,
    AlertCircle,
    Calendar,
    Send,
    CircleSlash,
    Check,
} from 'lucide-react';

interface MyBranch {
    id: number;
    name: string;
    code: string;
    area_id: number;
    area: {
        id: number;
        name: string;
        code: string;
        zone_id: number;
        zone: { id: number; name: string; code: string };
    };
}

interface PeriodStats {
    loan_applications_submitted: number;
    member_admissions_submitted: number;
    approved: number;
    rejected: number;
    issues_count: number;
}

interface TodayBadges {
    today_admission_submitted: boolean;
    today_loan_submitted: boolean;
    today_admission_count: number;
    today_loan_count: number;
}

interface Props {
    stats: { my_branches: number };
    periodStats: PeriodStats;
    todayBadges: TodayBadges;
    period: 'today' | 'monthly' | 'date_to_date';
    dateFrom: string | null;
    dateTo: string | null;
    myBranches: MyBranch[];
    dashboardType: string;
    teamBasedStats?: {
        draft_count: number;
        pending_count: number;
        approved_count: number;
        rejected_count: number;
    };
}

export default function BranchDashboard({
    stats,
    periodStats,
    todayBadges,
    period,
    dateFrom,
    dateTo,
    myBranches,
    teamBasedStats,
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

    const hasData = periodStats && Object.keys(periodStats).length > 0;

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
            <Head title="Branch Dashboard" />

            <div className="max-w-7xl mx-auto space-y-6 pb-12">
                {/* Header */}
                <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Branch Dashboard</h1>
                        <p className="text-xs text-slate-500 font-medium">
                            {stats.my_branches} {stats.my_branches === 1 ? 'Branch' : 'Branches'} assigned
                        </p>
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

                {/* Today badges */}
                <div className="flex flex-wrap gap-4">
                    <div
                        className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm shadow-sm ${
                            todayBadges.today_admission_submitted
                                ? 'bg-emerald-50/50 border-emerald-200 text-emerald-800'
                                : 'bg-white border-slate-200 text-slate-500'
                        }`}
                    >
                        <UserPlus size={16} className={todayBadges.today_admission_submitted ? "text-emerald-600" : "text-slate-400"} />
                        <span className="text-xs font-semibold">Today's admissions</span>
                        <div className="pl-3 ml-1 border-l border-current/10 flex items-center gap-1.5">
                            {todayBadges.today_admission_submitted ? (
                                <>
                                    <Check size={14} className="text-emerald-600 stroke-[3]" />
                                    {todayBadges.today_admission_count > 0 && (
                                        <span className="text-xs font-bold tabular-nums">
                                            {todayBadges.today_admission_count}
                                        </span>
                                    )}
                                </>
                            ) : (
                                <>
                                    <CircleSlash size={14} className="text-slate-400" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">None</span>
                                </>
                            )}
                        </div>
                    </div>
                    
                    <div
                        className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm shadow-sm ${
                            todayBadges.today_loan_submitted
                                ? 'bg-emerald-50/50 border-emerald-200 text-emerald-800'
                                : 'bg-white border-slate-200 text-slate-500'
                        }`}
                    >
                        <Send size={16} className={todayBadges.today_loan_submitted ? "text-emerald-600" : "text-slate-400"} />
                        <span className="text-xs font-semibold">Today's loans</span>
                        <div className="pl-3 ml-1 border-l border-current/10 flex items-center gap-1.5">
                            {todayBadges.today_loan_submitted ? (
                                <>
                                    <Check size={14} className="text-emerald-600 stroke-[3]" />
                                    {todayBadges.today_loan_count > 0 && (
                                        <span className="text-xs font-bold tabular-nums">
                                            {todayBadges.today_loan_count}
                                        </span>
                                    )}
                                </>
                            ) : (
                                <>
                                    <CircleSlash size={14} className="text-slate-400" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">None</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Period label */}
                <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                    Statistics below for: <span className="font-bold text-slate-700">{periodLabel}</span>
                </p>

                {/* Stat cards */}
                {hasData && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                                    <FileSpreadsheet size={18} className="text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-slate-800">{periodStats.loan_applications_submitted}</p>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">Loans Submitted</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
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
                                <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
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
                                <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                                    <AlertCircle size={18} className="text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-slate-800">{periodStats.issues_count}</p>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">Issues Pending</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                                    <XCircle size={18} className="text-rose-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-slate-800">{periodStats.rejected}</p>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">Rejected</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {!hasData && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                        <p className="text-sm font-medium text-slate-500">No data available for this branch in the selected period.</p>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Team Based Approvals Stats */}
                    {teamBasedStats && (
                        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden h-fit">
                            <div className="px-5 py-4 border-b border-slate-100">
                                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                    Team-Based Approvals Status
                                </h2>
                            </div>
                            <div className="p-5 grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Draft</span>
                                    <h3 className="text-2xl font-bold text-slate-800 mt-1">{teamBasedStats.draft_count}</h3>
                                    <p className="text-xs text-slate-500 font-medium mt-1">Awaiting corrections</p>
                                </div>
                                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Submitted</span>
                                    <h3 className="text-2xl font-bold text-amber-600 mt-1">{teamBasedStats.pending_count}</h3>
                                    <p className="text-xs text-slate-500 font-medium mt-1">Awaiting approval</p>
                                </div>
                                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Approved</span>
                                    <h3 className="text-2xl font-bold text-emerald-600 mt-1">{teamBasedStats.approved_count}</h3>
                                    <p className="text-xs text-slate-500 font-medium mt-1">Successfully approved</p>
                                </div>
                                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rejected</span>
                                    <h3 className="text-2xl font-bold text-rose-600 mt-1">{teamBasedStats.rejected_count}</h3>
                                    <p className="text-xs text-slate-500 font-medium mt-1">Returned/Rejected</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* My branch(es) */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden h-fit">
                        <div className="px-5 py-4 border-b border-slate-100">
                            <h2 className="text-sm font-bold text-slate-800">
                                Assigned Branches
                            </h2>
                        </div>
                        <div className="p-5">
                            {!myBranches || myBranches.length === 0 ? (
                                <p className="text-sm text-slate-500 text-center py-6">No branch assigned.</p>
                            ) : (
                                <div className="space-y-3">
                                    {myBranches.map((branch) => (
                                        <div
                                            key={branch.id}
                                            className="flex items-center gap-4 p-4 rounded-xl border border-slate-200/60 bg-white shadow-sm"
                                        >
                                            <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                                                <Building2 size={20} className="text-blue-600" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold text-slate-800">{branch.name}</p>
                                                    {branch.code && (
                                                        <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                                                            {branch.code}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-500 mt-1 font-medium flex flex-wrap items-center gap-1.5">
                                                    <span>{branch.area?.zone?.name}</span>
                                                    <span className="text-slate-300">/</span>
                                                    <span>{branch.area?.name}</span>
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}

