import React, { useState, useEffect } from 'react';
import AdminLayout from '@/layouts/admin-layout';
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
}

export default function BranchDashboard({
    stats,
    periodStats,
    todayBadges,
    period,
    dateFrom,
    dateTo,
    myBranches,
}: Props) {
    const [periodSelect, setPeriodSelect] = useState<'today' | 'monthly' | 'date_to_date'>(period);
    const [fromDate, setFromDate] = useState(dateFrom ?? '');
    const [toDate, setToDate] = useState(dateTo ?? '');

    // Sync filter state from props when they change (e.g. after Apply)
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
            ? 'Today (আজ)'
            : period === 'monthly'
              ? 'This month (এই মাসে)'
              : dateFrom && dateTo
                ? `${dateFrom} – ${dateTo}`
                : 'Period';

    return (
        <AdminLayout>
            <Head title="Branch Dashboard" />

            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header + Period filter */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">Branch Dashboard</h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {stats.my_branches} {stats.my_branches === 1 ? 'Branch' : 'Branches'} assigned
                        </p>
                    </div>

                    <div className="flex flex-wrap items-end gap-3">
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-600 whitespace-nowrap">Period (পিরিয়ড):</label>
                            <select
                                value={periodSelect}
                                onChange={(e) => setPeriodSelect(e.target.value as 'today' | 'monthly' | 'date_to_date')}
                                className="rounded-lg border border-gray-300 text-sm py-2 pl-3 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="today">Today (আজ)</option>
                                <option value="monthly">Monthly (মাসিক)</option>
                                <option value="date_to_date">Date to date (তারিখ থেকে তারিখ)</option>
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
                            Apply (দেখুন)
                        </button>
                    </div>
                </div>

                {/* Today badges – Check = পঠানো হয়েছে, CircleSlash + নাই = পঠানো হয়নি */}
                <div className="flex flex-wrap gap-4">
                    <div
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${
                            todayBadges.today_admission_submitted
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                : 'bg-gray-50 border-gray-200 text-gray-500'
                        }`}
                    >
                        <UserPlus size={20} className="flex-shrink-0" />
                        <span className="text-sm font-medium">
                            Today&apos;s admissions submitted (আজকের অ্যাডমিশন পঠানো)
                        </span>
                        <span className="flex items-center gap-1.5 flex-shrink-0" title={todayBadges.today_admission_submitted ? 'পঠানো হয়েছে' : 'পঠানো হয়নি'}>
                            {todayBadges.today_admission_submitted ? (
                                <>
                                    <Check size={20} strokeWidth={2.5} className="text-emerald-600" />
                                    {todayBadges.today_admission_count > 0 && (
                                        <span className="text-sm font-semibold text-emerald-600 tabular-nums">
                                            {todayBadges.today_admission_count}
                                        </span>
                                    )}
                                </>
                            ) : (
                                <>
                                    <CircleSlash size={20} strokeWidth={2} className="text-gray-500" />
                                    <span className="text-xs font-medium text-gray-500">নাই</span>
                                </>
                            )}
                        </span>
                    </div>
                    <div
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${
                            todayBadges.today_loan_submitted
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                : 'bg-gray-50 border-gray-200 text-gray-500'
                        }`}
                    >
                        <Send size={20} className="flex-shrink-0" />
                        <span className="text-sm font-medium">
                            Today&apos;s loans submitted (আজকের লোন পঠানো)
                        </span>
                        <span className="flex items-center gap-1.5 flex-shrink-0" title={todayBadges.today_loan_submitted ? 'পঠানো হয়েছে' : 'পঠানো হয়নি'}>
                            {todayBadges.today_loan_submitted ? (
                                <>
                                    <Check size={20} strokeWidth={2.5} className="text-emerald-600" />
                                    {todayBadges.today_loan_count > 0 && (
                                        <span className="text-sm font-semibold text-emerald-600 tabular-nums">
                                            {todayBadges.today_loan_count}
                                        </span>
                                    )}
                                </>
                            ) : (
                                <>
                                    <CircleSlash size={20} strokeWidth={2} className="text-gray-500" />
                                    <span className="text-xs font-medium text-gray-500">নাই</span>
                                </>
                            )}
                        </span>
                    </div>
                </div>

                {/* Period label */}
                <p className="text-sm text-gray-500">
                    Statistics below for: <strong>{periodLabel}</strong>
                </p>

                {/* Stat cards */}
                {hasData && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                                    <FileSpreadsheet size={20} className="text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-semibold text-gray-900">
                                        {periodStats.loan_applications_submitted}
                                    </p>
                                    <p className="text-xs text-gray-500">Loan applications submitted (লোন আবেদন পঠানো)</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center">
                                    <UserPlus size={20} className="text-violet-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-semibold text-gray-900">
                                        {periodStats.member_admissions_submitted}
                                    </p>
                                    <p className="text-xs text-gray-500">Member admissions submitted (মেম্বার অ্যাডমিশন পঠানো)</p>
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
                                    <p className="text-xs text-gray-500">Approved (অনুমোদন)</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                                    <AlertCircle size={20} className="text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-semibold text-gray-900">{periodStats.issues_count}</p>
                                    <p className="text-xs text-gray-500">Issues pending (সমস্যা)</p>
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
                                    <p className="text-xs text-gray-500">Rejected (রিজেক্ট)</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {!hasData && (
                    <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500 text-sm">
                        No data for this branch. (এই শাখার জন্য কোনো ডেটা নেই।)
                    </div>
                )}

                {/* My branch(es) – Zone, Area & Branch name only */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100">
                        <h2 className="text-sm font-semibold text-gray-900">
                            My branch (আমার শাখা) – Zone, Area & Branch
                        </h2>
                    </div>
                    <div className="p-5">
                        {!myBranches || myBranches.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-6">No branch assigned.</p>
                        ) : (
                            <div className="space-y-4">
                                {myBranches.map((branch) => (
                                    <div
                                        key={branch.id}
                                        className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 bg-blue-50/50"
                                    >
                                        <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                            <Building2 size={24} className="text-blue-600" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-semibold text-gray-900">{branch.name}</p>
                                            {branch.code && (
                                                <p className="text-xs text-gray-500 mt-0.5">Code: {branch.code}</p>
                                            )}
                                            <p className="text-sm text-gray-600 mt-1.5">
                                                <span className="font-medium text-gray-700">{branch.area?.zone?.name}</span>
                                                <span className="mx-1.5 text-gray-400">→</span>
                                                <span className="font-medium text-gray-700">{branch.area?.name}</span>
                                                <span className="mx-1.5 text-gray-400">→</span>
                                                <span className="font-medium text-gray-700">{branch.name}</span>
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
