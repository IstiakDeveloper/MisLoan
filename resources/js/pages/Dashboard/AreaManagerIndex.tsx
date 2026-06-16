import React, { useState, useEffect } from 'react';
import AdminLayout from '@/layouts/admin-layout';
import { Head, Link, router } from '@inertiajs/react';
import { formatDate } from '@/utils/dateUtils';
import {
    Clock,
    CheckCircle2,
    XCircle,
    ArrowUpRight,
    TrendingUp,
    ShieldCheck,
    ChevronRight,
    BadgeAlert,
    Coins,
    FileSpreadsheet,
    Layers,
    ListFilter,
} from 'lucide-react';

interface BreakdownItem {
    id: number;
    name: string;
    code: string;
    total_items: number;
    approved_items: number;
    rejected_items: number;
    pending_items: number;
    forwarded_items: number;
}

interface StatCounts {
    total_count: number;
    pending_count: number;
    approved_count: number;
    rejected_count: number;
    forwarded_count: number;
}

interface ApproverStats {
    personal: StatCounts;
    jurisdiction: StatCounts;
}

interface PendingItem {
    review_id: number;
    member_name: string;
    member_code: string | null;
    branch_name: string;
    sheet_date: string;
}

interface DecisionItem {
    review_id: number;
    member_name: string;
    member_code: string | null;
    status: string;
    branch_name: string;
    decided_at: string;
}

interface Props {
    areaName: string;
    approverStats: ApproverStats;
    recentPending: PendingItem[];
    recentDecisions: DecisionItem[];
    breakdown: BreakdownItem[];
    period: 'today' | 'monthly' | 'date_to_date';
    dateFrom: string | null;
    dateTo: string | null;
}

export default function AreaManagerDashboard({
    areaName,
    approverStats,
    recentPending,
    recentDecisions,
    breakdown,
    period,
    dateFrom,
    dateTo,
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
        router.get(`/dashboard?${query}`);
    };

    const formatCurrency = (val?: number | null) => {
        if (val === undefined || val === null) return 'TK 0';
        return 'TK ' + Number(val).toLocaleString('en-US', { minimumFractionDigits: 0 });
    };

    const statusBadge = (status: string) => {
        switch (status) {
            case 'approved':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 size={10} /> Approved
                    </span>
                );
            case 'rejected':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        <XCircle size={10} /> Rejected
                    </span>
                );
            case 'forwarded':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                        <ArrowUpRight size={10} /> Forwarded
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock size={10} /> Pending
                    </span>
                );
        }
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
            <Head title="Area Manager Dashboard" />

            <div className="max-w-7xl mx-auto space-y-6 pb-12">
                {/* ── HEADER BANNER ──────────────────────────────────────── */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
                    <div className="space-y-1">
                        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                            <ShieldCheck size={12} /> Area: {areaName}
                        </div>
                        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Area Team-Based Approvals Control</h1>
                        <p className="text-xs text-slate-500">
                            Aggregate metrics and decision workflows for team-based loan sheets under your area.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1 px-2">
                            <span className="text-xs text-slate-500 font-medium">Period:</span>
                            <select
                                value={periodSelect}
                                onChange={(e) => setPeriodSelect(e.target.value as any)}
                                className="bg-transparent border-0 text-xs py-1 pl-1 pr-6 font-semibold text-slate-700 focus:ring-0 cursor-pointer"
                            >
                                <option value="today">Today</option>
                                <option value="monthly">This Month</option>
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
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 active:scale-98 transition-all shadow-sm"
                        >
                            <ListFilter size={14} />
                            Filter
                        </button>
                    </div>
                </div>

                {/* ── METRIC CARDS GRIDS (Personal & Territory) ────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Personal Queue Grid */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                            My Personal Action Queue
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white rounded-xl border border-slate-200/60 p-4 shadow-sm hover:shadow transition-shadow">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Assigned to Me</span>
                                <h4 className="text-xl font-black text-slate-800 mt-1">{approverStats.personal.total_count}</h4>
                            </div>
                            <div className="bg-white rounded-xl border border-slate-200/60 p-4 shadow-sm hover:shadow transition-shadow">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Awaiting My Decision</span>
                                <h4 className="text-xl font-black text-amber-600 mt-1">{approverStats.personal.pending_count}</h4>
                            </div>
                            <div className="bg-white rounded-xl border border-slate-200/60 p-4 shadow-sm hover:shadow transition-shadow">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Approved by Me</span>
                                <h4 className="text-xl font-black text-emerald-600 mt-1">{approverStats.personal.approved_count}</h4>
                            </div>
                            <div className="bg-white rounded-xl border border-slate-200/60 p-4 shadow-sm hover:shadow transition-shadow">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Rejected / Fwd by Me</span>
                                <h4 className="text-xl font-black text-rose-600 mt-1">
                                    {approverStats.personal.rejected_count + approverStats.personal.forwarded_count}
                                </h4>
                            </div>
                        </div>
                    </div>

                    {/* Overall Territory Grid */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                            Overall Territory Status (All Branches)
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white rounded-xl border border-slate-200/60 p-4 shadow-sm hover:shadow transition-shadow">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Territory Items</span>
                                <h4 className="text-xl font-black text-slate-800 mt-1">{approverStats.jurisdiction.total_count}</h4>
                            </div>
                            <div className="bg-white rounded-xl border border-slate-200/60 p-4 shadow-sm hover:shadow transition-shadow">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Overall Pending</span>
                                <h4 className="text-xl font-black text-amber-600 mt-1">{approverStats.jurisdiction.pending_count}</h4>
                            </div>
                            <div className="bg-white rounded-xl border border-slate-200/60 p-4 shadow-sm hover:shadow transition-shadow">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Overall Approved</span>
                                <h4 className="text-xl font-black text-emerald-600 mt-1">{approverStats.jurisdiction.approved_count}</h4>
                            </div>
                            <div className="bg-white rounded-xl border border-slate-200/60 p-4 shadow-sm hover:shadow transition-shadow">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Overall Rejected / Fwd</span>
                                <h4 className="text-xl font-black text-slate-700 mt-1">
                                    {approverStats.jurisdiction.rejected_count + approverStats.jurisdiction.forwarded_count}
                                </h4>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── BRANCH BREAKDOWN TABLE ──────────────────────────────── */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-200/60 bg-slate-50/50 flex items-center justify-between">
                        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <Layers size={16} className="text-blue-500" />
                            Branch Wise Items Status Breakdown ({periodLabel})
                        </h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    <th className="py-3 px-5">Branch Name</th>
                                    <th className="py-3 px-4 text-center">Total Items</th>
                                    <th className="py-3 px-4 text-center">Approved</th>
                                    <th className="py-3 px-4 text-center">Rejected</th>
                                    <th className="py-3 px-4 text-center">Pending</th>
                                    <th className="py-3 px-4 text-center">Forwarded</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                                {breakdown.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                                            No branch data recorded in this period.
                                        </td>
                                    </tr>
                                ) : (
                                    breakdown.map((row) => (
                                        <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-3 px-5 font-semibold text-slate-900">
                                                <Link
                                                    href={`/team-based-approvals/for-approver?branch_id=${row.id}&date_from=${fromDate || ''}&date_to=${toDate || ''}`}
                                                    className="text-blue-600 hover:text-blue-800 font-bold hover:underline"
                                                >
                                                    {row.name}
                                                </Link>
                                                <span className="text-[10px] text-slate-400 font-mono ml-2">({row.code})</span>
                                            </td>
                                            <td className="py-3 px-4 text-center font-bold text-slate-800 bg-slate-50/40">{row.total_items}</td>
                                            <td className="py-3 px-4 text-center font-bold text-emerald-600">{row.approved_items}</td>
                                            <td className="py-3 px-4 text-center font-bold text-rose-500">{row.rejected_items}</td>
                                            <td className="py-3 px-4 text-center font-bold text-amber-600">{row.pending_items}</td>
                                            <td className="py-3 px-4 text-center font-bold text-sky-600">{row.forwarded_items}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── TWO COLUMN LOWER PANELS ────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Pending Reviews */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-200/60 bg-slate-50/50 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <BadgeAlert size={16} className="text-amber-500" />
                                    <h2 className="text-sm font-bold text-slate-800">My Pending Action Queue (Latest 5)</h2>
                                </div>
                                <Link
                                    href="/team-based-approvals/for-approver?status=pending"
                                    className="text-xs text-blue-600 font-semibold hover:text-blue-700 transition-colors flex items-center gap-0.5"
                                >
                                    View All <ChevronRight size={14} />
                                </Link>
                            </div>

                            <div className="divide-y divide-slate-100">
                                {recentPending.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400">
                                        <p className="text-xs font-semibold">No pending reviews in your queue.</p>
                                    </div>
                                ) : (
                                    recentPending.map((item) => (
                                        <div
                                            key={item.review_id}
                                            className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/30 transition-colors"
                                        >
                                            <div className="min-w-0 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-slate-800 text-xs truncate">
                                                        {item.member_name}
                                                    </span>
                                                    {item.member_code && (
                                                        <span className="text-[9px] font-mono font-medium px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                                                            {item.member_code}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                                    <span className="text-slate-500">{item.branch_name}</span>
                                                    <span>•</span>
                                                    <span>Sheet Date: {item.sheet_date}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 flex-shrink-0">
                                                <button
                                                    onClick={() =>
                                                        router.get(
                                                            `/team-based-approvals/for-approver?search=${encodeURIComponent(
                                                                item.member_name,
                                                            )}&status=pending`,
                                                        )
                                                    }
                                                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all active:scale-95 shadow-sm"
                                                    title="Action review"
                                                >
                                                    <ChevronRight size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Decisions history */}
                    <div className="space-y-4">
                        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-200/60 bg-slate-50/50 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <TrendingUp size={16} className="text-blue-500" />
                                    <h2 className="text-sm font-bold text-slate-800">My Recent Decisions</h2>
                                </div>
                            </div>

                            <div className="divide-y divide-slate-100">
                                {recentDecisions.length === 0 ? (
                                    <div className="p-8 text-center text-slate-450">
                                        <p className="text-[11px]">No recent decisions logged.</p>
                                    </div>
                                ) : (
                                    recentDecisions.map((item) => (
                                        <div key={item.review_id} className="p-4 space-y-2">
                                            <div className="flex justify-between items-start gap-2">
                                                <div className="min-w-0">
                                                    <h4 className="font-semibold text-slate-800 text-xs truncate">
                                                        {item.member_name}
                                                    </h4>
                                                    <p className="text-[10px] text-slate-450 mt-0.5">{item.branch_name}</p>
                                                </div>
                                                {statusBadge(item.status)}
                                            </div>

                                            <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                                                <span className="text-[9px] text-slate-400">
                                                    {item.decided_at ? item.decided_at.split(' ')[0] : ''}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
