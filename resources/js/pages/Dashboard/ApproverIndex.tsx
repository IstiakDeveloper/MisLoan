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
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 size={12} /> Approved
                    </span>
                );
            case 'rejected':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        <XCircle size={12} /> Rejected
                    </span>
                );
            case 'forwarded':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                        <ArrowUpRight size={12} /> Forwarded
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock size={12} /> Pending
                    </span>
                );
        }
    };

    return (
        <AdminLayout>
            <Head title="Approver Dashboard" />

            <div className="max-w-7xl mx-auto space-y-6 pb-12">
                {/* ── HERO BANNER SECTION ─────────────────────────────────── */}
                <div className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 rounded-3xl p-6 md:p-8 text-white shadow-xl">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl -translate-y-12 translate-x-12 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-2xl translate-y-12 -translate-x-12 pointer-events-none" />

                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-medium border border-white/20">
                                <ShieldCheck size={14} className="text-blue-200" />
                                Approver Command Center
                            </div>
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Approver Dashboard</h1>
                            <p className="text-blue-100/90 text-sm max-w-xl">
                                Monitor and action team-based approval reviews. Use the quick queue below to easily make decisions.
                            </p>
                        </div>

                        <div className="flex-shrink-0 flex gap-3">
                            <Link
                                href="/team-based-approvals/for-approver"
                                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white text-blue-700 text-sm font-semibold hover:bg-blue-50 transition-all active:scale-[0.98] shadow-md hover:shadow-lg"
                            >
                                <Briefcase size={16} />
                                Review Queue
                                <ChevronRight size={16} />
                            </Link>
                        </div>
                    </div>
                </div>

                {/* ── STATISTICS CARDS ─────────────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    {/* Stat: Pending */}
                    <div className="group bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-300 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full group-hover:scale-110 transition-transform duration-300 -z-0 pointer-events-none" />
                        <div className="relative z-10 flex items-start justify-between">
                            <div className="space-y-1.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Action</span>
                                <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight leading-none">
                                    {stats.pending_count}
                                </h3>
                                <p className="text-xs text-amber-600 font-semibold pt-1">Awaiting decision</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-inner group-hover:bg-amber-100 transition-colors">
                                <Clock size={22} className="stroke-[2.5]" />
                            </div>
                        </div>
                    </div>

                    {/* Stat: Approved */}
                    <div className="group bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all duration-300 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full group-hover:scale-110 transition-transform duration-300 -z-0 pointer-events-none" />
                        <div className="relative z-10 flex items-start justify-between">
                            <div className="space-y-1.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Approved Items</span>
                                <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight leading-none">
                                    {stats.approved_count}
                                </h3>
                                <p className="text-xs text-emerald-600 font-semibold pt-1">Decided as approved</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner group-hover:bg-emerald-100 transition-colors">
                                <CheckCircle2 size={22} className="stroke-[2.5]" />
                            </div>
                        </div>
                    </div>

                    {/* Stat: Forwarded */}
                    <div className="group bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md hover:border-sky-200 transition-all duration-300 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-sky-50 rounded-bl-full group-hover:scale-110 transition-transform duration-300 -z-0 pointer-events-none" />
                        <div className="relative z-10 flex items-start justify-between">
                            <div className="space-y-1.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-medium">Forwarded Items</span>
                                <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight leading-none">
                                    {stats.forwarded_count}
                                </h3>
                                <p className="text-xs text-sky-600 font-semibold pt-1">Sent to higher level</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shadow-inner group-hover:bg-sky-100 transition-colors">
                                <ArrowUpRight size={22} className="stroke-[2.5]" />
                            </div>
                        </div>
                    </div>

                    {/* Stat: Rejected */}
                    <div className="group bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md hover:border-rose-200 transition-all duration-300 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-bl-full group-hover:scale-110 transition-transform duration-300 -z-0 pointer-events-none" />
                        <div className="relative z-10 flex items-start justify-between">
                            <div className="space-y-1.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rejected Items</span>
                                <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight leading-none">
                                    {stats.rejected_count}
                                </h3>
                                <p className="text-xs text-rose-600 font-semibold pt-1">Returned/Rejected</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-inner group-hover:bg-rose-100 transition-colors">
                                <XCircle size={22} className="stroke-[2.5]" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── TWO COLUMN MAIN PANEL ──────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left 2 Columns: Pending Approvals list */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-200/60 bg-slate-50/50 flex items-center justify-between">
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

                            <div className="divide-y divide-slate-100">
                                {recentPending.length === 0 ? (
                                    <div className="p-8 text-center text-slate-500">
                                        <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                                            <Clock size={22} />
                                        </div>
                                        <p className="text-sm font-medium">No pending reviews in your queue.</p>
                                    </div>
                                ) : (
                                    recentPending.map((item) => (
                                        <div
                                            key={item.review_id}
                                            className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
                                        >
                                            <div className="min-w-0 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-slate-800 text-sm truncate">
                                                        {item.member_name}
                                                    </span>
                                                    {item.member_code && (
                                                        <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                                                            {item.member_code}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-400">
                                                    <span className="flex items-center gap-1 text-slate-500">
                                                        <Landmark size={12} /> {item.branch_name}
                                                    </span>
                                                    <span>•</span>
                                                    <span>Date: {item.sheet_date}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 flex-shrink-0">
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
                                                    <ChevronRight size={18} />
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
                        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-200/60 bg-slate-50/50 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <TrendingUp size={18} className="text-blue-500" />
                                    <h2 className="text-sm font-bold text-slate-800">My Recent Decisions</h2>
                                </div>
                            </div>

                            <div className="divide-y divide-slate-100">
                                {recentDecisions.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400">
                                        <p className="text-xs">No recent decisions logged.</p>
                                    </div>
                                ) : (
                                    recentDecisions.map((item) => (
                                        <div key={item.review_id} className="p-4 space-y-2">
                                            <div className="flex justify-between items-start gap-2">
                                                <div className="min-w-0">
                                                    <h4 className="font-semibold text-slate-800 text-xs truncate">
                                                        {item.member_name}
                                                    </h4>
                                                    <p className="text-[10px] text-slate-400 mt-0.5">{item.branch_name}</p>
                                                </div>
                                                {statusBadge(item.status)}
                                            </div>

                                            <div className="flex items-center justify-between pt-1 border-t border-slate-50">
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
