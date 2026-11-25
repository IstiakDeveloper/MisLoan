import { useState, useMemo } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { ComboSelect } from '@/components/ComboSelect';
import {
    AlertCircle,
    AlertOctagon,
    CheckCircle2,
    Clock,
    CreditCard,
    ExternalLink,
    Eye,
    Filter,
    Gift,
    Image as ImageIcon,
    Lock,
    Plus,
    Receipt,
    RefreshCw,
    Search,
    ShieldAlert,
    Unlock,
    UserCheck,
    UserX,
    Users,
    X,
    XCircle,
} from 'lucide-react';

interface FineUser {
    id: number;
    name: string;
    username: string;
    email: string;
    phone: string | null;
    is_blocked: boolean;
    branch?: {
        id: number;
        name?: string;
        code?: string;
        branch_name?: string;
        branch_code?: string;
    } | null;
    role?: {
        id: number;
        name: string;
    } | null;
}

interface FineRecord {
    id: number;
    tracking_id: string;
    type: 'self_correction' | 'head_office_penalty';
    category: string | null;
    mistake_details: string;
    correction_details: string | null;
    fine_amount: number;
    payment_method: string;
    payment_phone: string | null;
    transaction_id: string | null;
    screenshot_path: string | null;
    screenshot_url: string | null;
    status: 'pending_payment' | 'pending_review' | 'approved' | 'rejected' | 'resolved' | 'waived';
    is_user_blocked: boolean;
    admin_note: string | null;
    waive_reason?: string | null;
    waived_at?: string | null;
    created_at: string;
    user?: FineUser | null;
    creator?: { id: number; name: string } | null;
    resolver?: { id: number; name: string } | null;
    waiver?: { id: number; name: string } | null;
}

interface Props {
    fines: {
        data: FineRecord[];
        links: Array<{ url: string | null; label: string; active: boolean }>;
        current_page: number;
        last_page: number;
        total: number;
    };
    filters: {
        type?: string;
        status?: string;
        search?: string;
    };
    stats: {
        total_fines: number;
        pending_review: number;
        total_blocked_users: number;
        total_amount_collected: number;
        total_waived_count?: number;
        total_waived_amount?: number;
    };
    users: FineUser[];
    bkash: {
        number: string;
        type: string;
        account_name: string;
    };
    hrContact: {
        name: string;
        phone: string;
        whatsapp: string;
    };
}

export default function HeadOfficeFinesIndex({
    fines,
    filters,
    stats,
    users,
    bkash,
    hrContact,
}: Props) {
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [selectedType, setSelectedType] = useState(filters.type || '');
    const [selectedStatus, setSelectedStatus] = useState(filters.status || '');

    // Block User Modal State
    const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);

    // Status Update Modal State
    const [selectedFineForStatus, setSelectedFineForStatus] = useState<FineRecord | null>(null);
    const [statusAction, setStatusAction] = useState<'approved' | 'rejected' | 'resolved'>('approved');
    const [statusAdminNote, setStatusAdminNote] = useState('');

    // Waive Modal State
    const [selectedFineForWaive, setSelectedFineForWaive] = useState<FineRecord | null>(null);
    const [waiveReason, setWaiveReason] = useState('');
    const [isWaiving, setIsWaiving] = useState(false);

    // Unblock Modal State
    const [selectedUserForUnblock, setSelectedUserForUnblock] = useState<FineUser | null>(null);
    const [unblockAction, setUnblockAction] = useState<'resolve' | 'waive'>('resolve');
    const [unblockNote, setUnblockNote] = useState('');
    const [isUnblocking, setIsUnblocking] = useState(false);

    // Screenshot Modal
    const [previewScreenshotUrl, setPreviewScreenshotUrl] = useState<string | null>(null);

    // Form for Blocking User with Fine
    const blockForm = useForm({
        user_id: '',
        fine_amount: '500',
        mistake_details: '',
        admin_note: '',
    });

    const handleFilterChange = (newFilters: { search?: string; type?: string; status?: string }) => {
        router.get(
            '/head-office/fines',
            {
                search: newFilters.search !== undefined ? newFilters.search : searchQuery,
                type: newFilters.type !== undefined ? newFilters.type : selectedType,
                status: newFilters.status !== undefined ? newFilters.status : selectedStatus,
            },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleBlockSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        blockForm.post('/head-office/fines/block-user', {
            onSuccess: () => {
                setIsBlockModalOpen(false);
                blockForm.reset();
            },
        });
    };

    const handleWaiveSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFineForWaive) return;

        setIsWaiving(true);
        router.post(
            `/head-office/fines/${selectedFineForWaive.id}/waive`,
            {
                waive_reason: waiveReason,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setSelectedFineForWaive(null);
                    setWaiveReason('');
                    setIsWaiving(false);
                },
                onError: () => {
                    setIsWaiving(false);
                },
            }
        );
    };

    const handleUnblockSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUserForUnblock) return;

        setIsUnblocking(true);
        router.post(
            `/head-office/fines/users/${selectedUserForUnblock.id}/unblock`,
            {
                action: unblockAction,
                admin_note: unblockNote,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setSelectedUserForUnblock(null);
                    setUnblockNote('');
                    setIsUnblocking(false);
                },
                onError: () => {
                    setIsUnblocking(false);
                },
            }
        );
    };

    const handleUpdateStatusSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFineForStatus) return;

        router.patch(
            `/head-office/fines/${selectedFineForStatus.id}/status`,
            {
                status: statusAction,
                admin_note: statusAdminNote,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setSelectedFineForStatus(null);
                    setStatusAdminNote('');
                },
            }
        );
    };

    const userComboItems = useMemo(() => {
        return users.map((u) => {
            const branchStr = u.branch?.name || u.branch?.branch_name || '';
            const roleStr = u.role?.name || '';
            const label = `${u.name} (@${u.username})${branchStr ? ` — [${branchStr}]` : ''}${u.is_blocked ? ' (ইতিমধ্যে ব্লকড)' : ''}`;
            const keywords = `${u.name} ${u.username} ${u.phone ?? ''} ${branchStr} ${roleStr}`;
            return {
                value: String(u.id),
                label,
                keywords,
            };
        });
    }, [users]);

    const getStatusBadge = (status: FineRecord['status']) => {
        switch (status) {
            case 'pending_payment':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock className="w-3.5 h-3.5" />
                        পেমেন্ট অপেক্ষমাণ
                    </span>
                );
            case 'pending_review':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        <Clock className="w-3.5 h-3.5" />
                        পর্যালোচনায় অপেক্ষমাণ
                    </span>
                );
            case 'approved':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        অনুমোদিত
                    </span>
                );
            case 'resolved':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        মীমাংসিত
                    </span>
                );
            case 'rejected':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                        <XCircle className="w-3.5 h-3.5" />
                        বাতিল
                    </span>
                );
            case 'waived':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                        <Gift className="w-3.5 h-3.5" />
                        মওকুফকৃত (Waived)
                    </span>
                );
            default:
                return null;
        }
    };

    return (
        <AdminLayout>
            <Head title="হেড অফিস - জরিমানা ও পেনাল্টি ব্যবস্থাপনা" />

            <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                            <ShieldAlert className="w-7 h-7 text-rose-600" />
                            জরিমানা ও পেনাল্টি ব্যবস্থাপনা
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">
                            ইউজারদের ভুল সংশোধন আবেদন যাচাই এবং গুরুতর ভুলে জরিমানা ধার্যপূর্বক অ্যাকাউন্ট ব্লক বা আনব্লক করুন।
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsBlockModalOpen(true)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20 hover:shadow-lg transition-all"
                    >
                        <UserX className="w-4 h-4" />
                        ইউজারকে জরিমানা ও ব্লক করুন
                    </button>
                </div>

                {/* Metrics Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                            <Receipt className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-xs font-semibold text-slate-400 block uppercase">মোট রেকর্ড</span>
                            <span className="text-xl font-bold text-slate-800">{stats.total_fines}</span>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-xs font-semibold text-slate-400 block uppercase">অপেক্ষমাণ</span>
                            <span className="text-xl font-bold text-blue-600">{stats.pending_review}</span>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                            <Lock className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-xs font-semibold text-slate-400 block uppercase">ব্লকড ইউজার</span>
                            <span className="text-xl font-bold text-rose-600">{stats.total_blocked_users}</span>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                            <CreditCard className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-xs font-semibold text-slate-400 block uppercase">সংগৃহীত জরিমানা</span>
                            <span className="text-xl font-bold text-emerald-600">
                                ৳ {Number(stats.total_amount_collected).toLocaleString('en-US', { minimumFractionDigits: 0 })}
                            </span>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-purple-200/80 p-4 shadow-sm flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                            <Gift className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-xs font-semibold text-purple-600 block uppercase">মওকুফকৃত (Waived)</span>
                            <div className="text-xl font-bold text-purple-700">
                                ৳ {Number(stats.total_waived_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        {/* Search Input */}
                        <div className="md:col-span-2 relative">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleFilterChange({ search: searchQuery })}
                                placeholder="নাম, ইউজারনেম, ট্র্যাকিং কোড বা TrxID দিয়ে খুঁজুন..."
                                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                        </div>

                        {/* Type Filter */}
                        <div>
                            <select
                                value={selectedType}
                                onChange={(e) => {
                                    setSelectedType(e.target.value);
                                    handleFilterChange({ type: e.target.value });
                                }}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            >
                                <option value="">সকল ধরণের আবেদন</option>
                                <option value="self_correction">সেলফ কারেকশন (ইউজার)</option>
                                <option value="head_office_penalty">হেড অফিস জরিমানা (ব্লক)</option>
                            </select>
                        </div>

                        {/* Status Filter */}
                        <div>
                            <select
                                value={selectedStatus}
                                onChange={(e) => {
                                    setSelectedStatus(e.target.value);
                                    handleFilterChange({ status: e.target.value });
                                }}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            >
                                <option value="">সকল স্ট্যাটাস</option>
                                <option value="pending_review">পর্যালোচনায় অপেক্ষমাণ</option>
                                <option value="pending_payment">পেমেন্ট অপেক্ষমাণ</option>
                                <option value="approved">অনুমোদিত</option>
                                <option value="resolved">মীমাংসিত / সম্পন্ন</option>
                                <option value="waived">মওকুফকৃত (Waived)</option>
                                <option value="rejected">বাতিলকৃত</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/75 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                                    <th className="py-3.5 px-4">ইউজার ও শাখা</th>
                                    <th className="py-3.5 px-4">ট্র্যাকিং ও ধরণ</th>
                                    <th className="py-3.5 px-4">ভুলের বিবরণ ও সংশোধন</th>
                                    <th className="py-3.5 px-4">জরিমানা</th>
                                    <th className="py-3.5 px-4">বিকাশ পেমেন্ট প্রুফ</th>
                                    <th className="py-3.5 px-4">অ্যাকাউন্ট স্ট্যাটাস</th>
                                    <th className="py-3.5 px-4">আবেদন স্ট্যাটাস</th>
                                    <th className="py-3.5 px-4 text-right">অ্যাকশন</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                {fines.data.length > 0 ? (
                                    fines.data.map((fine) => (
                                        <tr key={fine.id} className="hover:bg-slate-50/60 transition-colors">
                                            {/* User & Branch */}
                                            <td className="py-3.5 px-4">
                                                <span className="font-bold text-slate-900 block">
                                                    {fine.user?.name || 'অজ্ঞাত ইউজার'}
                                                </span>
                                                <span className="text-xs text-slate-400 font-mono block">
                                                    @{fine.user?.username}
                                                </span>
                                                {fine.user?.branch && (
                                                    <span className="text-[11px] text-slate-500 block mt-0.5">
                                                        {fine.user.branch.name || fine.user.branch.branch_name}
                                                    </span>
                                                )}
                                            </td>

                                            {/* Tracking & Type */}
                                            <td className="py-3.5 px-4 whitespace-nowrap">
                                                <span className="font-mono font-bold text-slate-900 text-xs block">
                                                    {fine.tracking_id}
                                                </span>
                                                <span
                                                    className={`inline-block text-[10px] font-bold rounded px-1.5 py-0.5 mt-0.5 uppercase tracking-wide ${
                                                        fine.type === 'head_office_penalty'
                                                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                                                    }`}
                                                >
                                                    {fine.type === 'head_office_penalty'
                                                        ? 'হেড অফিস জরিমানা'
                                                        : 'সেলফ কারেকশন'}
                                                </span>
                                            </td>

                                            {/* Mistake Details */}
                                            <td className="py-3.5 px-4 max-w-xs">
                                                <span className="font-semibold text-slate-900 text-xs block truncate">
                                                    {fine.category || 'ভুলের বিবরণ'}
                                                </span>
                                                <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">
                                                    {fine.mistake_details}
                                                </p>
                                                {fine.correction_details && (
                                                    <p className="text-[11px] text-emerald-700 line-clamp-1 mt-0.5">
                                                        ঠিক করতে চায়: {fine.correction_details}
                                                    </p>
                                                )}
                                            </td>

                                            {/* Fine Amount */}
                                            <td className="py-3.5 px-4 whitespace-nowrap font-bold text-slate-900">
                                                ৳ {Number(fine.fine_amount).toLocaleString('en-US', { minimumFractionDigits: 0 })}
                                            </td>

                                            {/* Payment Proof */}
                                            <td className="py-3.5 px-4 whitespace-nowrap">
                                                {fine.payment_phone ? (
                                                    <div className="space-y-1">
                                                        <span className="font-mono text-xs text-slate-800 block">
                                                            {fine.payment_phone}
                                                        </span>
                                                        <span className="font-mono text-[11px] font-bold text-pink-700 bg-pink-50 px-1.5 py-0.5 rounded block w-fit">
                                                            {fine.transaction_id || 'N/A'}
                                                        </span>
                                                        {fine.screenshot_url && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setPreviewScreenshotUrl(fine.screenshot_url)}
                                                                className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-semibold"
                                                            >
                                                                <ImageIcon className="w-3 h-3" />
                                                                স্লিপ দেখুন
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-400 italic">পেমেন্ট নেই</span>
                                                )}
                                            </td>

                                            {/* User Block Status */}
                                            <td className="py-3.5 px-4 whitespace-nowrap">
                                                {fine.user?.is_blocked ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
                                                        <Lock className="w-3 h-3" />
                                                        ব্লকড
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        <Unlock className="w-3 h-3" />
                                                        সক্রিয়
                                                    </span>
                                                )}
                                            </td>

                                            {/* Status Badge */}
                                            <td className="py-3.5 px-4 whitespace-nowrap">
                                                {getStatusBadge(fine.status)}
                                            </td>

                                            {/* Actions */}
                                            <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-1">
                                                {/* If user is blocked, show Unblock button */}
                                                {fine.user?.is_blocked && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedUserForUnblock(fine.user!);
                                                            setUnblockAction('resolve');
                                                            setUnblockNote('');
                                                        }}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200"
                                                        title="ইউজারকে আনব্লক করুন"
                                                    >
                                                        <Unlock className="w-3.5 h-3.5" />
                                                        আনব্লক
                                                    </button>
                                                )}

                                                {/* Waive Button for any active/unwaived fine */}
                                                {fine.status !== 'waived' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedFineForWaive(fine);
                                                            setWaiveReason('');
                                                        }}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors border border-purple-200"
                                                        title="জরিমানা মওকুফ (Waive) করুন"
                                                    >
                                                        <Gift className="w-3.5 h-3.5" />
                                                        মওকুফ
                                                    </button>
                                                )}

                                                {/* If fine is pending review, show Approve / Reject */}
                                                {fine.status === 'pending_review' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedFineForStatus(fine);
                                                            setStatusAction('approved');
                                                        }}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                                                    >
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                        যাচাই
                                                    </button>
                                                )}

                                                {/* View Details */}
                                                <Link
                                                    href={`/fines/${fine.id}`}
                                                    className="inline-flex items-center justify-center p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                                                    title="বিস্তারিত দেখুন"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={8} className="py-12 text-center text-slate-400">
                                            <ShieldAlert className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                                            <p className="text-sm">কোনো জরিমানা বা পেনাল্টি রেকর্ড পাওয়া যায়নি।</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {fines.links && fines.links.length > 3 && (
                        <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-xs text-slate-500">
                                মোট {fines.total} টি রেকর্ডের মধ্যে পাতা {fines.current_page} এর {fines.last_page}
                            </span>
                            <div className="flex items-center gap-1">
                                {fines.links.map((link, idx) => (
                                    <Link
                                        key={idx}
                                        href={link.url || '#'}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                                            link.active
                                                ? 'bg-blue-600 text-white font-bold'
                                                : link.url
                                                ? 'text-slate-600 hover:bg-slate-100'
                                                : 'text-slate-300 cursor-not-allowed'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* MODAL: Block User with Fine */}
                {isBlockModalOpen && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
                            {/* Modal Header */}
                            <div className="bg-rose-50 border-b border-rose-100 p-5 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center">
                                        <UserX className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-rose-950">
                                            ইউজার জরিমানা ও অ্যাকাউন্ট ব্লক
                                        </h3>
                                        <p className="text-xs text-rose-700">
                                            ইউজার অবিলম্বে সিস্টেমে কাজ করা থেকে ব্লক হবে
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsBlockModalOpen(false)}
                                    className="p-1 rounded-lg text-rose-400 hover:text-rose-700 hover:bg-rose-100 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Modal Form */}
                            <form onSubmit={handleBlockSubmit} className="p-6 space-y-4">
                                {/* Select User */}
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold uppercase text-slate-700">
                                        ইউজার নির্বাচন করুন <span className="text-red-500">*</span>
                                    </label>
                                    <ComboSelect
                                        value={blockForm.data.user_id}
                                        onChange={(val) => blockForm.setData('user_id', val ? String(val) : '')}
                                        items={userComboItems}
                                        placeholder="নাম, ইউজারনেম বা ব্রাঞ্চ দিয়ে ইউজার খুঁজুন..."
                                        portal={true}
                                        clearable={true}
                                    />
                                    {blockForm.errors.user_id && (
                                        <p className="text-xs text-red-600 font-medium">{blockForm.errors.user_id}</p>
                                    )}
                                </div>

                                {/* Fine Amount */}
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold uppercase text-slate-700">
                                        জরিমানার পরিমাণ (টাকা) <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-400">৳</span>
                                        <input
                                            type="number"
                                            value={blockForm.data.fine_amount}
                                            onChange={(e) => blockForm.setData('fine_amount', e.target.value)}
                                            placeholder="500"
                                            className="w-full pl-8 pr-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                                        />
                                    </div>
                                    {blockForm.errors.fine_amount && (
                                        <p className="text-xs text-red-600">{blockForm.errors.fine_amount}</p>
                                    )}
                                </div>

                                {/* Reason / Mistake details */}
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold uppercase text-slate-700">
                                        স্থগিতাদেশ ও ভুলের কারণ (ইউজার স্ক্রিনে বড় করে দেখতে পাবে) <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={blockForm.data.mistake_details}
                                        onChange={(e) => blockForm.setData('mistake_details', e.target.value)}
                                        placeholder="যেমন: ফিল্ডে গ্রাহকের টাকা সময়মতো জমা না দেওয়া এবং তথ্যে গরমিলজনিত অপরাধ..."
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                                    />
                                    {blockForm.errors.mistake_details && (
                                        <p className="text-xs text-red-600">{blockForm.errors.mistake_details}</p>
                                    )}
                                </div>

                                {/* Admin Note */}
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold uppercase text-slate-700">
                                        অফিসিয়াল ইন্টারনাল নোট (ঐচ্ছিক)
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={blockForm.data.admin_note}
                                        onChange={(e) => blockForm.setData('admin_note', e.target.value)}
                                        placeholder="হেড অফিসের অভ্যন্তরীণ নথি ও রেফারেন্স..."
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                                    />
                                </div>

                                {/* Notice in modal */}
                                <div className="p-3 bg-rose-50/80 rounded-xl border border-rose-200/70 text-xs text-rose-900 font-medium">
                                    ⚠️ <strong>সতর্কতা:</strong> এই ইউজার অবিলম্বে সিস্টেমে ব্লক হবে এবং জরিমানা পরিশোধের পর HR এর সাথে যোগাযোগ করে আইডি সচল করতে হবে।
                                </div>

                                {/* Submit buttons */}
                                <div className="flex items-center justify-end gap-3 pt-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsBlockModalOpen(false)}
                                        className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                                    >
                                        বাতিল
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={blockForm.processing}
                                        className="px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-600/20 transition-all"
                                    >
                                        {blockForm.processing ? 'ব্লক করা হচ্ছে...' : 'জরিমানা ধার্য ও ব্লক করুন'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* MODAL: Update Status (Approve / Reject / Resolve) */}
                {selectedFineForStatus && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
                            <div className="bg-slate-50 border-b border-slate-100 p-5 flex items-center justify-between">
                                <div>
                                    <h3 className="text-base font-bold text-slate-900">
                                        আবেদন যাচাই ও নিষ্পত্তি
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        ট্র্যাকিং কোড: {selectedFineForStatus.tracking_id}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedFineForStatus(null)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleUpdateStatusSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                                        সিদ্ধান্ত নির্বাচন করুন
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setStatusAction('approved')}
                                            className={`p-2.5 rounded-xl text-xs font-bold text-center border transition-all ${
                                                statusAction === 'approved'
                                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                            }`}
                                        >
                                            অনুমোদন
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setStatusAction('resolved')}
                                            className={`p-2.5 rounded-xl text-xs font-bold text-center border transition-all ${
                                                statusAction === 'resolved'
                                                    ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                            }`}
                                        >
                                            নিষ্পত্তি
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setStatusAction('rejected')}
                                            className={`p-2.5 rounded-xl text-xs font-bold text-center border transition-all ${
                                                statusAction === 'rejected'
                                                    ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                            }`}
                                        >
                                            বাতিল
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold uppercase text-slate-700">
                                        মন্তব্য / অ্যাডমিন নোট
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={statusAdminNote}
                                        onChange={(e) => setStatusAdminNote(e.target.value)}
                                        placeholder="অনুমোদন বা বাতিলের কারণ লিখুন..."
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-3">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedFineForStatus(null)}
                                        className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                                    >
                                        বাতিল
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all"
                                    >
                                        সংরক্ষণ করুন
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* MODAL: Waive Fine */}
                {selectedFineForWaive && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
                            <div className="bg-purple-50 border-b border-purple-100 p-5 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center">
                                        <Gift className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-purple-950">
                                            জরিমানা মওকুফ (Waive Fine)
                                        </h3>
                                        <p className="text-xs text-purple-700">
                                            ট্র্যাকিং কোড: {selectedFineForWaive.tracking_id}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedFineForWaive(null)}
                                    className="p-1 rounded-lg text-purple-400 hover:text-purple-700 hover:bg-purple-100 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleWaiveSubmit} className="p-6 space-y-4">
                                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500 font-medium">ইউজার:</span>
                                        <span className="font-bold text-slate-800">
                                            {selectedFineForWaive.user?.name} (@{selectedFineForWaive.user?.username})
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500 font-medium">জরিমানার পরিমাণ:</span>
                                        <span className="font-bold text-purple-700 text-sm">
                                            ৳ {Number(selectedFineForWaive.fine_amount).toLocaleString('en-US')}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500 font-medium">বর্তমান স্ট্যাটাস:</span>
                                        <span className="font-medium text-slate-700">
                                            {selectedFineForWaive.status}
                                        </span>
                                    </div>
                                </div>

                                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 text-xs text-amber-900 leading-relaxed">
                                    💡 <strong>নোট:</strong> মওকুফ (Waive) করলে এই জরিমানার টাকা মোট আদায়কৃত হিসেবে যোগ হবে না এবং ইউজার যদি এই কারণে ব্লকড থাকে তবে স্বয়ংক্রিয়ভাবে আনব্লক হয়ে যাবে।
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold uppercase text-slate-700">
                                        মওকুফের কারণ / হেড অফিস নির্দেশিকা
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={waiveReason}
                                        onChange={(e) => setWaiveReason(e.target.value)}
                                        placeholder="মওকুফ করার কারণ বিস্তারিত লিখুন (যেমন: প্রথম বারের মতো ক্ষমাসুন্দর দৃষ্টিতে হেড অফিসের সিদ্ধান্তে মওকুফ)..."
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-3">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedFineForWaive(null)}
                                        className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                                    >
                                        বাতিল
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isWaiving}
                                        className="px-5 py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md transition-all"
                                    >
                                        {isWaiving ? 'মওকুফ করা হচ্ছে...' : 'জরিমানা মওকুফ নিশ্চিত করুন'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* MODAL: Unblock User (with Waive option) */}
                {selectedUserForUnblock && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
                            <div className="bg-emerald-50 border-b border-emerald-100 p-5 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                                        <Unlock className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-emerald-950">
                                            ইউজার আনব্লক করুন
                                        </h3>
                                        <p className="text-xs text-emerald-700">
                                            {selectedUserForUnblock.name} (@{selectedUserForUnblock.username})
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedUserForUnblock(null)}
                                    className="p-1 rounded-lg text-emerald-400 hover:text-emerald-700 hover:bg-emerald-100 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleUnblockSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-700 mb-2">
                                        আনব্লক করার পদ্ধতি নির্বাচন করুন
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setUnblockAction('resolve')}
                                            className={`p-3 rounded-xl text-left border transition-all ${
                                                unblockAction === 'resolve'
                                                    ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                                                    : 'bg-white border-slate-200 hover:bg-slate-50'
                                            }`}
                                        >
                                            <span className="block text-xs font-bold text-emerald-900">
                                                পেমেন্ট সাপেক্ষে
                                            </span>
                                            <span className="block text-[11px] text-slate-500 mt-0.5">
                                                জরিমানা পরিশোধ হয়েছে
                                            </span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setUnblockAction('waive')}
                                            className={`p-3 rounded-xl text-left border transition-all ${
                                                unblockAction === 'waive'
                                                    ? 'bg-purple-50 border-purple-500 ring-2 ring-purple-500/20'
                                                    : 'bg-white border-slate-200 hover:bg-slate-50'
                                            }`}
                                        >
                                            <span className="block text-xs font-bold text-purple-900">
                                                জরিমানা ছাড়া (Waive)
                                            </span>
                                            <span className="block text-[11px] text-slate-500 mt-0.5">
                                                জরিমানা মওকুফ করে ছাড়া
                                            </span>
                                        </button>
                                    </div>
                                </div>

                                {unblockAction === 'waive' ? (
                                    <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs text-purple-900 leading-relaxed">
                                        🎁 <strong>মওকুফ সুবিধা:</strong> ইউজারের উপর ধার্যকৃত জরিমানা সম্পূর্ণ বাতিল/মওকুফ হবে এবং মোট সংগৃহীত জরিমানার হিসাবে এই টাকা উঠবে না।
                                    </div>
                                ) : (
                                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 leading-relaxed">
                                        ✅ <strong>নিয়মিত আনব্লক:</strong> ইউজার জরিমানা পরিশোধ করেছে হিসেবে রেকর্ডটি নিষ্পন্ন (Resolved) হবে।
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold uppercase text-slate-700">
                                        মন্তব্য / আনব্লক করার নোট
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={unblockNote}
                                        onChange={(e) => setUnblockNote(e.target.value)}
                                        placeholder={
                                            unblockAction === 'waive'
                                                ? 'জরিমানা মওকুফপূর্বক ছেড়ে দেওয়ার কারণ লিখুন...'
                                                : 'পেমেন্ট ভেরিফাই করে আনব্লক করার বিবরণ লিখুন...'
                                        }
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-3">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedUserForUnblock(null)}
                                        className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                                    >
                                        বাতিল
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isUnblocking}
                                        className={`px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-md transition-all ${
                                            unblockAction === 'waive'
                                                ? 'bg-purple-600 hover:bg-purple-700'
                                                : 'bg-emerald-600 hover:bg-emerald-700'
                                        }`}
                                    >
                                        {isUnblocking
                                            ? 'প্রসেসিং হচ্ছে...'
                                            : unblockAction === 'waive'
                                            ? 'মওকুফ করে আনব্লক করুন'
                                            : 'আনব্লক নিশ্চিত করুন'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* MODAL: Fullscreen Image Preview */}
                {previewScreenshotUrl && (
                    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="relative max-w-3xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col">
                            <div className="flex items-center justify-between p-4 border-b border-slate-100">
                                <span className="text-sm font-bold text-slate-800">পেমেন্ট স্লিপ প্রিভিউ</span>
                                <button
                                    onClick={() => setPreviewScreenshotUrl(null)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-4 overflow-auto max-h-[80vh] flex items-center justify-center bg-slate-900/5">
                                <img
                                    src={previewScreenshotUrl}
                                    alt="Payment Slip"
                                    className="max-h-[75vh] w-auto object-contain rounded-lg"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
