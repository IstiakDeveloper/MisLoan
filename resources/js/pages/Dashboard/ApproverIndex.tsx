import React from 'react';
import AdminLayout from '@/layouts/admin-layout';
import { Head, Link, router } from '@inertiajs/react';
import {
    Clock,
    CheckCircle2,
    XCircle,
    ArrowUpRight,
    TrendingUp,
    ShieldCheck,
    Briefcase,
    ChevronRight,
    BadgeAlert,
    Landmark,
} from 'lucide-react';

interface Stats {
    pending_count: number;
    approved_count: number;
    rejected_count: number;
    forwarded_count: number;
    total_count: number;
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
    stats: Stats;
    recentPending: PendingItem[];
    recentDecisions: DecisionItem[];
}

export default function ApproverDashboard({ stats, recentPending, recentDecisions }: Props) {
    const statusBadge = (status: string) => {
        switch (status) {
            case 'approved':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 size={12} /> Approved
                    </span>
                );
            case 'rejected':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                        <XCircle size={12} /> Rejected
                    </span>
                );
            case 'forwarded':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-sky-50 text-sky-700 border border-sky-200">
                        <ArrowUpRight size={12} /> Forwarded
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock size={12} /> Pending
                    </span>
                );
        }
    };

    return (
        <AdminLayout>
            <Head title="Approver Dashboard" />

            <div className="max-w-7xl mx-auto space-y-6 pb-12">
                {/* ── HEADER SECTION ─────────────────────────────────── */}
                <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-[10px] font-bold uppercase tracking-wider text-blue-700 border border-blue-100">
                            <ShieldCheck size={14} />
                            Approver Command Center
                        </div>
                        <h1 className="text-xl font-bold tracking-tight text-slate-800">Approver Dashboard</h1>
                        <p className="text-slate-500 text-xs font-medium max-w-xl">
                            Monitor and action team-based approval reviews. Use the quick queue below to easily make decisions.
                        </p>
                    </div>

                    <div className="flex-shrink-0 flex gap-3">
                        <Link
                            href="/team-based-approvals/for-approver"
                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-700 transition-all active:scale-95 shadow-sm"
                        >
                            <Briefcase size={16} />
                            Review Queue
                            <ChevronRight size={16} />
                        </Link>
                    </div>
                </div>

                {/* ── STATISTICS CARDS ─────────────────────────────────────── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {/* Stat: Pending */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-sm hover:shadow-md transition-all">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                                <Clock size={18} />
                            </div>
                            <div>
                                <p className="text-xl sm:text-2xl font-black text-slate-800 tabular-nums leading-none">
                                    {stats.pending_count}
                                </p>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">Pending Action</p>
                            </div>
                        </div>
                    </div>

                    {/* Stat: Approved */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-sm hover:shadow-md transition-all">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                <CheckCircle2 size={18} />
                            </div>
                            <div>
                                <p className="text-xl sm:text-2xl font-black text-slate-800 tabular-nums leading-none">
                                    {stats.approved_count}
                                </p>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">Approved Items</p>
                            </div>
                        </div>
                    </div>

                    {/* Stat: Forwarded */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-sm hover:shadow-md transition-all">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                                <ArrowUpRight size={18} />
                            </div>
                            <div>
                                <p className="text-xl sm:text-2xl font-black text-slate-800 tabular-nums leading-none">
                                    {stats.forwarded_count}
                                </p>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">Forwarded Items</p>
                            </div>
                        </div>
                    </div>

                    {/* Stat: Rejected */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-sm hover:shadow-md transition-all">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                                <XCircle size={18} />
                            </div>
                            <div>
                                <p className="text-xl sm:text-2xl font-black text-slate-800 tabular-nums leading-none">
                                    {stats.rejected_count}
                                </p>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">Rejected Items</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── TWO COLUMN MAIN PANEL ──────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left 2 Columns: Pending Approvals list */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden h-fit">
                            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <BadgeAlert size={18} className="text-amber-500" />
                                    <h2 className="text-sm font-bold text-slate-800">My Pending Action Queue (Latest 5)</h2>
                                </div>
                                <Link
                                    href="/team-based-approvals/for-approver?status=pending"
                                    className="text-xs text-blue-600 font-semibold hover:text-blue-700 transition-colors flex items-center gap-0.5"
                                >
                                    View All <ChevronRight size={14} />
                                </Link>
                            </div>

                            <div className="divide-y divide-slate-50">
                                {recentPending.length === 0 ? (
                                    <div className="p-8 text-center text-slate-500">
                                        <div className="w-10 h-10 mx-auto rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mb-3">
                                            <Clock size={20} />
                                        </div>
                                        <p className="text-sm font-medium">No pending reviews in your queue.</p>
                                    </div>
                                ) : (
                                    recentPending.map((item) => (
                                        <div
                                            key={item.review_id}
                                            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
                                        >
                                            <div className="min-w-0 space-y-1.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-slate-800 text-sm truncate">
                                                        {item.member_name}
                                                    </span>
                                                    {item.member_code && (
                                                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                                                            {item.member_code}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-x-2 text-xs font-medium text-slate-500">
                                                    <span className="flex items-center gap-1">
                                                        <Landmark size={12} className="text-slate-400" /> {item.branch_name}
                                                    </span>
                                                    <span className="text-slate-300">•</span>
                                                    <span>Date: {item.sheet_date}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 flex-shrink-0 self-end sm:self-center">
                                                <button
                                                    onClick={() =>
                                                        router.get(
                                                            `/team-based-approvals/for-approver?search=${encodeURIComponent(
                                                                item.member_name,
                                                            )}&status=pending`,
                                                        )
                                                    }
                                                    className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all active:scale-95 shadow-sm text-xs font-semibold"
                                                    title="Action review"
                                                >
                                                    Action <ChevronRight size={14} className="ml-1" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right 1 Column: Decision History */}
                    <div className="space-y-4">
                        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden h-fit sticky top-24">
                            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <TrendingUp size={18} className="text-blue-500" />
                                    <h2 className="text-sm font-bold text-slate-800">My Recent Decisions</h2>
                                </div>
                            </div>

                            <div className="divide-y divide-slate-50">
                                {recentDecisions.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400">
                                        <p className="text-xs font-medium">No recent decisions logged.</p>
                                    </div>
                                ) : (
                                    recentDecisions.map((item) => (
                                        <div key={item.review_id} className="p-4 space-y-2.5">
                                            <div className="flex justify-between items-start gap-2">
                                                <div className="min-w-0">
                                                    <h4 className="font-bold text-slate-800 text-xs truncate">
                                                        {item.member_name}
                                                    </h4>
                                                    <p className="text-[10px] font-medium text-slate-500 mt-0.5">{item.branch_name}</p>
                                                </div>
                                                {statusBadge(item.status)}
                                            </div>

                                            <div className="flex items-center justify-between pt-1">
                                                <span className="text-[10px] font-medium text-slate-400">
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
