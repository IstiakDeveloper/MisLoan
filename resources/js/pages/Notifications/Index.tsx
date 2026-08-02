import React from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import {
    Bell,
    Check,
    CheckCheck,
    ChevronLeft,
    ChevronRight,
    ExternalLink,
    FileText,
    Info,
} from 'lucide-react';

interface NotificationItem {
    id: number;
    type: string;
    title: string;
    message: string;
    action_url: string | null;
    is_read: boolean;
    created_at: string;
    data?: {
        details?: Record<string, string>;
    } | null;
}

interface Props {
    notifications: {
        data: NotificationItem[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from: number;
        to: number;
    };
    filter: 'all' | 'unread';
    unreadCount: number;
}

export default function Index({ notifications, filter, unreadCount }: Props) {
    const handleFilterChange = (newFilter: 'all' | 'unread') => {
        router.get('/notifications', { filter: newFilter }, { preserveState: true });
    };

    const handleMarkAsRead = (id: number, actionUrl?: string | null) => {
        router.patch(`/notifications/${id}/read`, {}, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                if (actionUrl) {
                    router.visit(actionUrl);
                }
            },
        });
    };

    const handleMarkAllRead = () => {
        router.post('/notifications/mark-all-read', {}, {
            preserveScroll: true,
            preserveState: true,
        });
    };

    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleString('bn-BD', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return dateString;
        }
    };

    return (
        <AdminLayout>
            <Head title="নোটিফিকেশন তালিকা" />

            <div className="max-w-5xl mx-auto space-y-6 pb-12">
                {/* Header Title Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-xs border border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                            <Bell className="w-6 h-6 stroke-[1.75]" />
                        </div>
                        <div>
                            <h1 className="text-xl font-extrabold text-slate-800">নোটিফিকেশন সেন্টার</h1>
                            <p className="text-xs font-medium text-slate-500 mt-0.5">
                                আপনার প্রাপ্ত সমস্ত নোটিফিকেশন ও আপডেটের তালিকা
                            </p>
                        </div>
                    </div>

                    {unreadCount > 0 && (
                        <button
                            type="button"
                            onClick={handleMarkAllRead}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs transition-all duration-200 border border-blue-200/50 shadow-xs self-start sm:self-auto"
                        >
                            <CheckCheck className="w-4 h-4" />
                            সব নোটিফিকেশন পঠিত হিসেবে চিহ্নিত করুন
                        </button>
                    )}
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center justify-between bg-white p-2 rounded-2xl shadow-xs border border-slate-100">
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => handleFilterChange('all')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                                filter === 'all'
                                    ? 'bg-slate-900 text-white shadow-sm'
                                    : 'text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            সকল ({notifications.total})
                        </button>
                        <button
                            type="button"
                            onClick={() => handleFilterChange('unread')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                                filter === 'unread'
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            অপঠিত ({unreadCount})
                        </button>
                    </div>

                    <span className="text-xs text-slate-400 font-medium px-3 hidden sm:inline">
                        প্রদর্শিত: {notifications.from || 0} - {notifications.to || 0} (মোট {notifications.total})
                    </span>
                </div>

                {/* Notification List */}
                <div className="bg-white rounded-2xl shadow-xs border border-slate-100 overflow-hidden divide-y divide-slate-100">
                    {notifications.data.length === 0 ? (
                        <div className="py-16 text-center text-slate-400">
                            <Info className="w-12 h-12 mx-auto mb-3 opacity-40 text-slate-400" />
                            <p className="text-sm font-bold text-slate-600">কোনো নোটিফিকেশন পাওয়া যায়নি</p>
                            <p className="text-xs text-slate-400 mt-1">
                                {filter === 'unread'
                                    ? 'আপনার কোনো অপঠিত নোটিফিকেশন নেই।'
                                    : 'এখনও আপনার কোনো নোটিফিকেশন জমা হয়নি।'}
                            </p>
                        </div>
                    ) : (
                        notifications.data.map((item) => (
                            <div
                                key={item.id}
                                className={`group p-5 transition-all duration-200 ${
                                    !item.is_read ? 'bg-blue-50/30' : 'bg-white hover:bg-slate-50/50'
                                }`}
                            >
                                <div className="flex items-start gap-4">
                                    <div
                                        className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 ${
                                            !item.is_read
                                                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                                : 'bg-slate-100 text-slate-500'
                                        }`}
                                    >
                                        <FileText className="w-5 h-5 stroke-[1.75]" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                                                    {item.title}
                                                </h3>
                                                {!item.is_read && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                                                        নতুন
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-xs font-semibold text-slate-400">
                                                {formatDate(item.created_at)}
                                            </span>
                                        </div>

                                        <p className="text-xs text-slate-600 leading-relaxed font-normal mb-3">
                                            {item.message}
                                        </p>

                                        {/* Details summary table if available */}
                                        {item.data?.details && Object.keys(item.data.details).length > 0 && (
                                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 mb-3 max-w-lg">
                                                <div className="grid grid-cols-2 gap-2 text-xs">
                                                    {Object.entries(item.data.details).map(([key, val]) => (
                                                        <div key={key} className="min-w-0">
                                                            <span className="text-slate-400 font-medium block text-[10px]">
                                                                {key}
                                                            </span>
                                                            <span className="font-bold text-slate-800 truncate block">
                                                                {val}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex items-center gap-3 mt-2">
                                            {item.action_url && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleMarkAsRead(item.id, item.action_url)}
                                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                                                >
                                                    বিস্তারিত দেখুন
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                </button>
                                            )}

                                            {!item.is_read && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleMarkAsRead(item.id, null)}
                                                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors"
                                                >
                                                    <Check className="w-3.5 h-3.5" />
                                                    পঠিত হিসেবে চিহ্নিত করুন
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Pagination */}
                {notifications.last_page > 1 && (
                    <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-xs border border-slate-100">
                        <span className="text-xs font-semibold text-slate-500">
                            পৃষ্ঠা {notifications.current_page} এর {notifications.last_page}
                        </span>

                        <div className="flex items-center gap-2">
                            {notifications.current_page > 1 && (
                                <Link
                                    href={`/notifications?filter=${filter}&page=${notifications.current_page - 1}`}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    পূর্ববর্তী
                                </Link>
                            )}

                            {notifications.current_page < notifications.last_page && (
                                <Link
                                    href={`/notifications?filter=${filter}&page=${notifications.current_page + 1}`}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                    পরবর্তী
                                    <ChevronRight className="w-4 h-4" />
                                </Link>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
