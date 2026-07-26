import React, { useState, useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { formatDate } from '@/utils/dateUtils';
import {
    CheckCircle,
    XCircle,
    RotateCcw,
    Eye,
    Edit,
    MessageSquare,
    Share2,
    Search,
    ShieldCheck,
    Building2,
    Users,
    Clock,
    User,
    FileText,
    Sparkles,
    AlertCircle,
    ArrowUpRight,
    Filter,
    X,
} from 'lucide-react';

interface EscalationApprover {
    id: number;
    name: string;
    email: string;
    level: string;
    role_name: string;
}

interface Approval {
    id: number;
    member_admission_id: number;
    application_no: string;
    applicant_name: string;
    applicant_name_bn: string;
    branch_name: string;
    branch_id?: number;
    samity_name: string;
    submitted_at: string;
    level: string;
    sequence: number;
    revision_count: number;
    revision_comments: string | null;
    status: string;
    requested_loan_amount?: number;
    escalation_approvers?: EscalationApprover[];
}

interface LoanApproval {
    id: number;
    loan_application_id: number;
    application_no: string;
    applicant_name: string;
    applicant_name_bn: string;
    branch_name: string;
    requested_amount: number;
    submitted_at: string;
    level: string;
}

interface Props {
    approvals: Approval[];
    loanApprovals?: LoanApproval[];
}

export default function Index({ approvals = [], loanApprovals = [] }: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'admissions' | 'loans'>('all');

    const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
    const [action, setAction] = useState<'approve' | 'reject' | 'return' | 'forward' | null>(null);
    const [comments, setComments] = useState('');
    const [forwardToUserId, setForwardToUserId] = useState<string>('');
    const [showModal, setShowModal] = useState(false);

    const [selectedLoanApproval, setSelectedLoanApproval] = useState<LoanApproval | null>(null);
    const [loanAction, setLoanAction] = useState<'approve' | 'reject' | null>(null);
    const [loanComments, setLoanComments] = useState('');
    const [showLoanModal, setShowLoanModal] = useState(false);

    // Search Filtering
    const filteredApprovals = useMemo(() => {
        if (!searchQuery.trim()) return approvals;
        const q = searchQuery.toLowerCase();
        return approvals.filter(
            (a) =>
                a.application_no?.toLowerCase().includes(q) ||
                a.applicant_name?.toLowerCase().includes(q) ||
                a.applicant_name_bn?.toLowerCase().includes(q) ||
                a.branch_name?.toLowerCase().includes(q) ||
                a.samity_name?.toLowerCase().includes(q)
        );
    }, [approvals, searchQuery]);

    const filteredLoanApprovals = useMemo(() => {
        if (!searchQuery.trim()) return loanApprovals;
        const q = searchQuery.toLowerCase();
        return loanApprovals.filter(
            (l) =>
                l.application_no?.toLowerCase().includes(q) ||
                l.applicant_name?.toLowerCase().includes(q) ||
                l.applicant_name_bn?.toLowerCase().includes(q) ||
                l.branch_name?.toLowerCase().includes(q)
        );
    }, [loanApprovals, searchQuery]);

    const handleAction = (approval: Approval, actionType: 'approve' | 'reject' | 'return' | 'forward') => {
        const isBranch = approval.level === 'branch';
        const amount = Number(approval.requested_loan_amount || 0);

        if (actionType === 'approve' && isBranch && amount > 70000) {
            setSelectedApproval(approval);
            setAction('forward');
            setComments('');
            setForwardToUserId('');
            setShowModal(true);
            return;
        }

        setSelectedApproval(approval);
        setAction(actionType);
        setComments('');
        setForwardToUserId('');
        setShowModal(true);
    };

    const submitAction = () => {
        if (!selectedApproval || !action) return;
        if (action === 'forward' && !forwardToUserId) {
            alert('অনুগ্রহ করে ফরওয়ার্ড করার জন্য একজন অনুমোদনকারী নির্বাচন করুন।');
            return;
        }

        if (action === 'forward') {
            router.patch(
                `/approvals/${selectedApproval.id}/forward`,
                {
                    forward_to_user_id: forwardToUserId,
                    comments,
                },
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        setShowModal(false);
                        setSelectedApproval(null);
                        setAction(null);
                        setComments('');
                        setForwardToUserId('');
                    },
                }
            );
            return;
        }

        const routes = {
            approve: `/approvals/${selectedApproval.id}/approve`,
            reject: `/approvals/${selectedApproval.id}/reject`,
            return: `/approvals/${selectedApproval.id}/return-to-branch`,
        };

        router.patch(routes[action as keyof typeof routes], { comments }, {
            preserveScroll: true,
            onSuccess: () => {
                setShowModal(false);
                setSelectedApproval(null);
                setAction(null);
                setComments('');
            },
        });
    };

    const handleLoanAction = (loanApproval: LoanApproval, actionType: 'approve' | 'reject') => {
        setSelectedLoanApproval(loanApproval);
        setLoanAction(actionType);
        setLoanComments('');
        setShowLoanModal(true);
    };

    const submitLoanAction = () => {
        if (!selectedLoanApproval || !loanAction) return;
        if (loanAction === 'reject' && !loanComments.trim()) {
            alert('প্রত্যাখ্যানের জন্য মন্তব্য দিন।');
            return;
        }
        router.patch(
            `/approvals/loan/${selectedLoanApproval.id}/${loanAction}`,
            { comments: loanComments },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setShowLoanModal(false);
                    setSelectedLoanApproval(null);
                    setLoanAction(null);
                    setLoanComments('');
                },
            }
        );
    };

    const getLevelBadge = (level: string) => {
        const badges: Record<string, { bg: string; text: string; dot: string; label: string }> = {
            branch: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500', label: 'Branch (শাখা)' },
            area: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Area (অঞ্চল)' },
            zone: { bg: 'bg-purple-50 border-purple-200', text: 'text-purple-700', dot: 'bg-purple-500', label: 'Zone (জোন)' },
            head_office: { bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700', dot: 'bg-rose-500', label: 'Head Office (হেড অফিস)' },
        };
        const config = badges[level as keyof typeof badges] || {
            bg: 'bg-slate-50 border-slate-200',
            text: 'text-slate-700',
            dot: 'bg-slate-400',
            label: level,
        };

        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold tracking-wide uppercase ${config.bg} ${config.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                {config.label}
            </span>
        );
    };

    const getInitials = (name: string) => {
        if (!name) return 'AP';
        return name
            .split(' ')
            .map((n) => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
    };

    const isHeadOffice = (level: string) => level === 'head_office';
    const isBranchLevel = (level: string) => level === 'branch';

    const totalCount = approvals.length + loanApprovals.length;
    const revCount = approvals.filter((a) => a.revision_count > 0).length;

    return (
        <AdminLayout>
            <Head title="Pending Approvals Command Center" />

            <div className="max-w-7xl mx-auto space-y-6 py-4 px-3 sm:px-6 pb-16">
                {/* ── 1. HERO HEADER BANNER ────────────────────────────────────────── */}
                <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-6 sm:p-8 shadow-xl border border-slate-800">
                    <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-gradient-to-tr from-blue-600/30 to-purple-600/20 blur-3xl pointer-events-none" />
                    <div className="absolute right-1/3 -top-12 w-48 h-48 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-2 max-w-2xl">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold backdrop-blur-md">
                                <ShieldCheck className="w-4 h-4 text-blue-400" />
                                <span>Approval Management System</span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                                অপেক্ষমান অনুমোদন (Pending Approvals)
                            </h1>
                            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                                সদস্য ভর্তি ও ঋণ আবেদনসমূহ যাচাই করুন এবং অত্যন্ত দ্রুত সিদ্ধান্ত বা ফরওয়ার্ড সম্পন্ন করুন।
                            </p>
                        </div>

                        {/* Quick KPI Badge Group */}
                        <div className="flex flex-wrap gap-2.5 sm:gap-3 shrink-0">
                            <div className="bg-slate-800/80 border border-slate-700/80 backdrop-blur-md px-4 py-3 rounded-2xl flex flex-col items-center justify-center min-w-[90px]">
                                <span className="text-2xl sm:text-3xl font-black text-amber-400 leading-none">{totalCount}</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">মোট পেন্ডিং</span>
                            </div>
                            <div className="bg-slate-800/80 border border-slate-700/80 backdrop-blur-md px-4 py-3 rounded-2xl flex flex-col items-center justify-center min-w-[90px]">
                                <span className="text-2xl sm:text-3xl font-black text-blue-400 leading-none">{approvals.length}</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">সদস্য ভর্তি</span>
                            </div>
                            <div className="bg-slate-800/80 border border-slate-700/80 backdrop-blur-md px-4 py-3 rounded-2xl flex flex-col items-center justify-center min-w-[90px]">
                                <span className="text-2xl sm:text-3xl font-black text-emerald-400 leading-none">{loanApprovals.length}</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">ঋণ আবেদন</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── 2. SEARCH & NAVIGATION TABS ─────────────────────────────────── */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                        {/* Tab Switcher */}
                        <div className="inline-flex p-1 bg-slate-100/80 rounded-xl gap-1 border border-slate-200/50 self-start">
                            <button
                                type="button"
                                onClick={() => setActiveTab('all')}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                                    activeTab === 'all'
                                        ? 'bg-white text-slate-900 shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                সব আবেদন ({totalCount})
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('admissions')}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                                    activeTab === 'admissions'
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                সদস্য ভর্তি ({approvals.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('loans')}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                                    activeTab === 'loans'
                                        ? 'bg-emerald-600 text-white shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                ঋণ আবেদন ({loanApprovals.length})
                            </button>
                        </div>

                        {/* Search Input Box */}
                        <div className="relative flex-grow max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="আবেদন নং, নাম, শাখা বা সমিতি খুঁজুন..."
                                className="w-full pl-9 pr-9 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50 transition-all"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── 3. EMPTY STATE ─────────────────────────────────────────────── */}
                {totalCount === 0 || (filteredApprovals.length === 0 && filteredLoanApprovals.length === 0) ? (
                    <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-sm max-w-2xl mx-auto my-8">
                        <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-inner">
                            <CheckCircle className="w-10 h-10" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">কোনো অপেক্ষমান আবেদন নেই</h3>
                        <p className="text-slate-500 text-sm max-w-md mx-auto">
                            {searchQuery
                                ? 'আপনার সার্চ ফিল্টারের সাথে কোনো আবেদন মেইল করেনি। রিসেট করে আবার চেষ্টা করুন।'
                                : 'আপনার অনুমোদনের অপেক্ষায় এই মুহূর্তে কোনো আবেদন নেই। সব কাজ সম্পন্ন হয়েছে!'}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* ── 4. MEMBER ADMISSION APPROVALS SECTION ─────────────────────── */}
                        {(activeTab === 'all' || activeTab === 'admissions') && filteredApprovals.length > 0 && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-blue-600" />
                                        <h2 className="text-base sm:text-lg font-bold text-slate-900">
                                            সদস্য ভর্তি আবেদন ({filteredApprovals.length})
                                        </h2>
                                    </div>
                                </div>

                                {/* MOBILE CARDS VIEW (md:hidden) */}
                                <div className="md:hidden flex flex-col gap-4">
                                    {filteredApprovals.map((approval) => (
                                        <div
                                            key={approval.id}
                                            className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all p-4 space-y-4 relative overflow-hidden"
                                        >
                                            {/* Card Top Strip Accent */}
                                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />

                                            {/* Applicant Header */}
                                            <div className="flex items-start justify-between gap-3 pt-1">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-sm">
                                                        {getInitials(approval.applicant_name)}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-slate-900 text-sm leading-snug">
                                                            {approval.applicant_name}
                                                        </h3>
                                                        {approval.applicant_name_bn && (
                                                            <p className="text-xs text-slate-500 font-medium">
                                                                {approval.applicant_name_bn}
                                                            </p>
                                                        )}
                                                        <span className="inline-block text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 mt-1">
                                                            {approval.application_no}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="shrink-0">{getLevelBadge(approval.level)}</div>
                                            </div>

                                            {/* Details Info Grid */}
                                            <div className="grid grid-cols-2 gap-3 bg-slate-50/70 p-3 rounded-xl border border-slate-100 text-xs">
                                                <div className="space-y-0.5">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                                        <Building2 className="w-3 h-3 text-slate-400" /> শাখা
                                                    </span>
                                                    <p className="font-semibold text-slate-800 truncate">{approval.branch_name}</p>
                                                </div>

                                                <div className="space-y-0.5">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                                        <Users className="w-3 h-3 text-slate-400" /> সমিতি
                                                    </span>
                                                    <p className="font-semibold text-slate-800 truncate">{approval.samity_name}</p>
                                                </div>

                                                <div className="space-y-0.5">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                                        <Clock className="w-3 h-3 text-slate-400" /> জমার তারিখ
                                                    </span>
                                                    <p className="font-semibold text-slate-700">{formatDate(approval.submitted_at)}</p>
                                                </div>

                                                <div className="space-y-0.5">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                                        <AlertCircle className="w-3 h-3 text-slate-400" /> রিভিশন
                                                    </span>
                                                    {approval.revision_count > 0 ? (
                                                        <div className="flex items-center gap-1">
                                                            <span className="px-2 py-0.5 text-[10px] bg-amber-100 text-amber-800 rounded font-bold border border-amber-200">
                                                                Rev: {approval.revision_count}
                                                            </span>
                                                            {approval.revision_comments && (
                                                                <button
                                                                    onClick={() => alert(approval.revision_comments)}
                                                                    className="text-blue-600 p-0.5"
                                                                >
                                                                    <MessageSquare className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <p className="text-slate-500 font-medium">-</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Action Buttons Toolbar */}
                                            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
                                                <button
                                                    onClick={() => router.visit(`/member-admissions/${approval.member_admission_id}`)}
                                                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors active:scale-95"
                                                >
                                                    <Eye className="w-3.5 h-3.5 text-slate-600" /> দেখুন
                                                </button>
                                                <button
                                                    onClick={() => router.visit(`/member-admissions/${approval.member_admission_id}/edit`)}
                                                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors active:scale-95"
                                                >
                                                    <Edit className="w-3.5 h-3.5 text-blue-600" /> এডিট
                                                </button>
                                                <button
                                                    onClick={() => handleAction(approval, 'approve')}
                                                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 transition-all shadow-sm active:scale-95"
                                                >
                                                    <CheckCircle className="w-3.5 h-3.5" /> অনুমোদন
                                                </button>
                                                <button
                                                    onClick={() => handleAction(approval, 'reject')}
                                                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 transition-all shadow-sm active:scale-95"
                                                >
                                                    <XCircle className="w-3.5 h-3.5" /> বাতিল
                                                </button>
                                                {isHeadOffice(approval.level) && (
                                                    <button
                                                        onClick={() => handleAction(approval, 'return')}
                                                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 transition-all active:scale-95"
                                                    >
                                                        <RotateCcw className="w-3.5 h-3.5" /> Return to Branch
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* DESKTOP TABLE VIEW (hidden md:block) */}
                                <div className="hidden md:block bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                                <th className="py-3.5 px-4">আবেদন নং</th>
                                                <th className="py-3.5 px-4">আবেদনকারী</th>
                                                <th className="py-3.5 px-4">শাখা</th>
                                                <th className="py-3.5 px-4">সমিতি</th>
                                                <th className="py-3.5 px-4">লেভেল</th>
                                                <th className="py-3.5 px-4">রিভিশন</th>
                                                <th className="py-3.5 px-4">জমার তারিখ</th>
                                                <th className="py-3.5 px-4 text-right">অ্যাকশন</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-sm">
                                            {filteredApprovals.map((approval) => (
                                                <tr key={approval.id} className="hover:bg-slate-50/60 transition-colors group">
                                                    <td className="py-4 px-4 font-mono font-bold text-blue-700 text-xs">
                                                        {approval.application_no}
                                                    </td>
                                                    <td className="py-4 px-4">
                                                        <div className="font-bold text-slate-800">{approval.applicant_name}</div>
                                                        {approval.applicant_name_bn && (
                                                            <div className="text-xs text-slate-500 font-medium">
                                                                {approval.applicant_name_bn}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="py-4 px-4 font-medium text-slate-700">{approval.branch_name}</td>
                                                    <td className="py-4 px-4 font-medium text-slate-700">{approval.samity_name}</td>
                                                    <td className="py-4 px-4">{getLevelBadge(approval.level)}</td>
                                                    <td className="py-4 px-4">
                                                        {approval.revision_count > 0 ? (
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="px-2.5 py-0.5 text-xs font-bold bg-amber-100 text-amber-800 rounded-md border border-amber-200">
                                                                    Rev: {approval.revision_count}
                                                                </span>
                                                                {approval.revision_comments && (
                                                                    <button
                                                                        onClick={() => alert(approval.revision_comments)}
                                                                        className="text-blue-600 hover:text-blue-800 p-1"
                                                                        title="রিভিশন মন্তব্য দেখুন"
                                                                    >
                                                                        <MessageSquare className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-slate-400 font-medium">-</span>
                                                        )}
                                                    </td>
                                                    <td className="py-4 px-4 text-xs font-medium text-slate-500">
                                                        {formatDate(approval.submitted_at)}
                                                    </td>
                                                    <td className="py-4 px-4 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <button
                                                                onClick={() => router.visit(`/member-admissions/${approval.member_admission_id}`)}
                                                                className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                                title="বিবরণ দেখুন"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => router.visit(`/member-admissions/${approval.member_admission_id}/edit`)}
                                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                                title="সম্পাদনা করুন"
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleAction(approval, 'approve')}
                                                                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                                title="অনুমোদন করুন"
                                                            >
                                                                <CheckCircle className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleAction(approval, 'reject')}
                                                                className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                                title="বাতিল করুন"
                                                            >
                                                                <XCircle className="w-4 h-4" />
                                                            </button>
                                                            {isHeadOffice(approval.level) && (
                                                                <button
                                                                    onClick={() => handleAction(approval, 'return')}
                                                                    className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                                                    title="শাখায় ফেরত পাঠান"
                                                                >
                                                                    <RotateCcw className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* ── 5. LOAN APPROVALS SECTION ───────────────────────────────────── */}
                        {(activeTab === 'all' || activeTab === 'loans') && filteredLoanApprovals.length > 0 && (
                            <div className="space-y-4 pt-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-emerald-600" />
                                        <h2 className="text-base sm:text-lg font-bold text-slate-900">
                                            ঋণ আবেদন অনুমোদন ({filteredLoanApprovals.length})
                                        </h2>
                                    </div>
                                </div>

                                {/* MOBILE CARDS VIEW FOR LOAN APPROVALS (md:hidden) */}
                                <div className="md:hidden flex flex-col gap-4">
                                    {filteredLoanApprovals.map((la) => (
                                        <div
                                            key={la.id}
                                            className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all p-4 space-y-4 relative overflow-hidden"
                                        >
                                            {/* Card Top Accent */}
                                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-600" />

                                            <div className="flex items-start justify-between gap-3 pt-1">
                                                <div>
                                                    <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                                        {la.application_no}
                                                    </span>
                                                    <h3 className="font-bold text-slate-900 text-base mt-1">
                                                        {la.applicant_name_bn || la.applicant_name}
                                                    </h3>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">আবেদনকৃত ঋণ</span>
                                                    <span className="text-base font-black text-emerald-600">
                                                        ৳{Number(la.requested_amount).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 bg-slate-50/70 p-3 rounded-xl border border-slate-100 text-xs">
                                                <div>
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">শাখার নাম</span>
                                                    <p className="font-semibold text-slate-800 mt-0.5">{la.branch_name}</p>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">জমার তারিখ</span>
                                                    <p className="font-semibold text-slate-700 mt-0.5">
                                                        {la.submitted_at ? formatDate(la.submitted_at) : '-'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                                                <button
                                                    onClick={() => router.visit(`/member/loan-applications/${la.loan_application_id}`)}
                                                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors active:scale-95"
                                                >
                                                    <Eye className="w-3.5 h-3.5 text-slate-600" /> দেখুন
                                                </button>
                                                <button
                                                    onClick={() => handleLoanAction(la, 'approve')}
                                                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 transition-all shadow-sm active:scale-95"
                                                >
                                                    <CheckCircle className="w-3.5 h-3.5" /> অনুমোদন
                                                </button>
                                                <button
                                                    onClick={() => handleLoanAction(la, 'reject')}
                                                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 transition-all shadow-sm active:scale-95"
                                                >
                                                    <XCircle className="w-3.5 h-3.5" /> প্রত্যাখ্যান
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* DESKTOP TABLE VIEW FOR LOAN APPROVALS (hidden md:block) */}
                                <div className="hidden md:block bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                                <th className="py-3.5 px-4">আবেদন নং</th>
                                                <th className="py-3.5 px-4">আবেদনকারী</th>
                                                <th className="py-3.5 px-4">শাখা</th>
                                                <th className="py-3.5 px-4 text-right">আবেদনকৃত পরিমাণ</th>
                                                <th className="py-3.5 px-4">জমার তারিখ</th>
                                                <th className="py-3.5 px-4 text-right">অ্যাকশন</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-sm">
                                            {filteredLoanApprovals.map((la) => (
                                                <tr key={la.id} className="hover:bg-slate-50/60 transition-colors">
                                                    <td className="py-4 px-4 font-mono font-bold text-emerald-700 text-xs">
                                                        {la.application_no}
                                                    </td>
                                                    <td className="py-4 px-4 font-bold text-slate-800">
                                                        {la.applicant_name_bn || la.applicant_name}
                                                    </td>
                                                    <td className="py-4 px-4 font-medium text-slate-700">{la.branch_name}</td>
                                                    <td className="py-4 px-4 text-right font-black text-slate-900">
                                                        ৳{Number(la.requested_amount).toLocaleString()}
                                                    </td>
                                                    <td className="py-4 px-4 text-xs font-medium text-slate-500">
                                                        {la.submitted_at ? formatDate(la.submitted_at) : '-'}
                                                    </td>
                                                    <td className="py-4 px-4 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <button
                                                                onClick={() => router.visit(`/member/loan-applications/${la.loan_application_id}`)}
                                                                className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                                title="বিবরণ দেখুন"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleLoanAction(la, 'approve')}
                                                                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                                title="অনুমোদন করুন"
                                                            >
                                                                <CheckCircle className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleLoanAction(la, 'reject')}
                                                                className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                                title="প্রত্যাখ্যান করুন"
                                                            >
                                                                <XCircle className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ── 6. MEMBER ADMISSION ACTION MODAL ────────────────────────────────────── */}
            {showModal && selectedApproval && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="text-lg font-bold text-slate-900">
                                {action === 'approve' && 'আবেদন অনুমোদন'}
                                {action === 'reject' && 'আবেদন বাতিল'}
                                {action === 'return' && 'শাখায় ফেরত পাঠান'}
                                {action === 'forward' && 'উচ্চতর অনুমোদনকারী নির্বাচন ও অনুমোদন'}
                            </h3>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-1 text-xs">
                            <p className="text-slate-500 font-medium">
                                আবেদন নম্বর: <strong className="text-blue-700 font-mono">{selectedApproval.application_no}</strong>
                            </p>
                            <p className="text-slate-500 font-medium">
                                আবেদনকারী: <strong className="text-slate-800">{selectedApproval.applicant_name}</strong>
                            </p>
                            {selectedApproval.requested_loan_amount && (
                                <p className="text-slate-500 font-medium">
                                    ঋণ চাহিদা: <strong className="text-slate-900">৳{Number(selectedApproval.requested_loan_amount).toLocaleString()}</strong>
                                </p>
                            )}
                        </div>

                        {action === 'forward' && (
                            <div className="space-y-3">
                                <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200/80 text-xs text-amber-900 space-y-1">
                                    <p className="font-bold flex items-center gap-1.5">
                                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                                        <span>উচ্চতর অনুমোদনকারী নির্বাচন বাধ্যতামূলক</span>
                                    </p>
                                    <p className="text-[11px] leading-relaxed">
                                        এই আবেদনের ঋণ চাহিদা <strong>৳{Number(selectedApproval.requested_loan_amount || 0).toLocaleString()}</strong> (৭০,০০০ টাকার বেশি)। শাখা ব্যবস্থাপকের সরাসরি অনুমোদনের পরিবর্তে পরবর্তী অনুমোদনকারী কর্মকর্তা নির্বাচন করতে হবে।
                                    </p>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                        অনুমোদনকারী কর্মকর্তা নির্বাচন করুন <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={forwardToUserId}
                                        onChange={(e) => setForwardToUserId(e.target.value)}
                                        className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 font-semibold"
                                    >
                                        <option value="">-- কর্মকর্তা নির্বাচন করুন --</option>
                                        {(selectedApproval.escalation_approvers ?? []).map((u) => (
                                            <option key={u.id} value={u.id}>
                                                {u.name} ({u.role_name || u.level})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                মন্তব্য / কারণ {action !== 'approve' && action !== 'forward' && <span className="text-red-500">*</span>}
                            </label>
                            <textarea
                                value={comments}
                                onChange={(e) => setComments(e.target.value)}
                                rows={4}
                                className="w-full border border-slate-300 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
                                placeholder={action === 'forward' ? 'ঐচ্ছিক মন্তব্য লিখুন...' : 'এখানে বিস্তারিত মন্তব্য লিখুন...'}
                                required={action !== 'approve' && action !== 'forward'}
                            />
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                            >
                                বাতিল
                            </button>
                            <button
                                type="button"
                                onClick={submitAction}
                                disabled={
                                    (action !== 'approve' && action !== 'forward' && !comments.trim()) ||
                                    (action === 'forward' && !forwardToUserId)
                                }
                                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition"
                            >
                                নিশ্চিত করুন
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── 7. LOAN ACTION MODAL ────────────────────────────────────────────────── */}
            {showLoanModal && selectedLoanApproval && loanAction && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="text-lg font-bold text-slate-900">
                                {loanAction === 'approve' ? 'ঋণ আবেদন অনুমোদন' : 'ঋণ আবেদন প্রত্যাখ্যান'}
                            </h3>
                            <button
                                onClick={() => setShowLoanModal(false)}
                                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-1 text-xs">
                            <p className="text-slate-500 font-medium">
                                আবেদন নম্বর: <strong className="text-emerald-700 font-mono">{selectedLoanApproval.application_no}</strong>
                            </p>
                            <p className="text-slate-500 font-medium">
                                আবেদনকারী: <strong className="text-slate-800">{selectedLoanApproval.applicant_name_bn || selectedLoanApproval.applicant_name}</strong>
                            </p>
                            <p className="text-slate-500 font-medium">
                                পরিমাণ: <strong className="text-slate-900">৳{Number(selectedLoanApproval.requested_amount).toLocaleString()}</strong>
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                মন্তব্য {loanAction === 'reject' && <span className="text-red-500">*</span>}
                            </label>
                            <textarea
                                value={loanComments}
                                onChange={(e) => setLoanComments(e.target.value)}
                                rows={4}
                                className="w-full border border-slate-300 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
                                placeholder={loanAction === 'approve' ? 'ঐচ্ছিক মন্তব্য লিখুন...' : 'প্রত্যাখ্যানের কারণ লিখুন...'}
                                required={loanAction === 'reject'}
                            />
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowLoanModal(false)}
                                className="px-4 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                            >
                                বাতিল
                            </button>
                            <button
                                type="button"
                                onClick={submitLoanAction}
                                className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm transition ${
                                    loanAction === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                                }`}
                            >
                                {loanAction === 'approve' ? 'অনুমোদন করুন' : 'প্রত্যাখ্যান করুন'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
