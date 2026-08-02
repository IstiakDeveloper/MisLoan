import React, { useState, useRef, useEffect } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import { Bell, Check, CheckCheck, ExternalLink, Info, ShieldAlert, FileText } from 'lucide-react';

interface NotificationItem {
    id: number;
    type: string;
    title: string;
    message: string;
    action_url: string | null;
    is_read: boolean;
    created_at: string;
}

interface PageProps extends Record<string, unknown> {
    notifications?: NotificationItem[];
    unreadNotificationsCount?: number;
}

export default function NotificationBell() {
    const { notifications = [], unreadNotificationsCount = 0 } = usePage<PageProps>().props;
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMarkAsRead = (e: React.MouseEvent, notification: NotificationItem) => {
        e.preventDefault();
        e.stopPropagation();

        if (!notification.is_read) {
            router.patch(`/notifications/${notification.id}/read`, {}, {
                preserveScroll: true,
                preserveState: true,
            });
        }

        setIsOpen(false);

        if (notification.action_url) {
            router.visit(notification.action_url);
        }
    };

    const handleMarkAllRead = (e: React.MouseEvent) => {
        e.preventDefault();
        router.post('/notifications/mark-all-read', {}, {
            preserveScroll: true,
            preserveState: true,
        });
    };

    const formatTimeAgo = (dateString: string) => {
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

            if (diffInSeconds < 60) return 'মাত্র এখন';
            if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} মি. আগে`;
            if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} ঘণ্টা আগে`;
            return `${Math.floor(diffInSeconds / 86400)} দিন আগে`;
        } catch {
            return '';
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`relative flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200 ${
                    isOpen
                        ? 'bg-blue-100 text-blue-700 shadow-sm'
                        : 'bg-slate-100/90 text-slate-700 hover:bg-blue-50 hover:text-blue-600'
                }`}
                title="Notifications"
                aria-label="Notifications"
            >
                <Bell className="w-4.5 h-4.5 stroke-[1.75]" />
                {unreadNotificationsCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-extrabold text-white shadow-xs animate-pulse">
                        {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-50/80 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <Bell className="w-4 h-4 text-blue-600" />
                            <h3 className="text-xs font-bold text-slate-800">নোটিফিকেশন</h3>
                            {unreadNotificationsCount > 0 && (
                                <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    {unreadNotificationsCount} নতুন
                                </span>
                            )}
                        </div>
                        {unreadNotificationsCount > 0 && (
                            <button
                                type="button"
                                onClick={handleMarkAllRead}
                                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline transition-colors"
                            >
                                <CheckCheck className="w-3.5 h-3.5" />
                                সব পঠিত করুন
                            </button>
                        )}
                    </div>

                    <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-50">
                        {notifications.length === 0 ? (
                            <div className="py-8 text-center text-slate-400">
                                <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p className="text-xs font-medium">কোনো নোটিফিকেশন নেই</p>
                            </div>
                        ) : (
                            notifications.map((item) => (
                                <div
                                    key={item.id}
                                    onClick={(e) => handleMarkAsRead(e, item)}
                                    className={`group flex items-start gap-3 p-3.5 cursor-pointer transition-all duration-150 ${
                                        !item.is_read
                                            ? 'bg-blue-50/40 hover:bg-blue-50/70 font-semibold'
                                            : 'hover:bg-slate-50 opacity-90'
                                    }`}
                                >
                                    <div className="mt-0.5 flex-shrink-0">
                                        <div
                                            className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                                                !item.is_read
                                                    ? 'bg-blue-100 text-blue-700'
                                                    : 'bg-slate-100 text-slate-500'
                                            }`}
                                        >
                                            {item.type === 'member_admission' ? (
                                                <FileText className="w-4 h-4 stroke-[1.75]" />
                                            ) : (
                                                <Bell className="w-4 h-4 stroke-[1.75]" />
                                            )}
                                        </div>
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-1 mb-1">
                                            <h4 className="text-[12px] font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                                                {item.title}
                                            </h4>
                                            <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                                                {formatTimeAgo(item.created_at)}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed font-normal">
                                            {item.message}
                                        </p>
                                    </div>

                                    {!item.is_read && (
                                        <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-2.5 bg-slate-50/80 border-t border-slate-100 text-center">
                        <Link
                            href="/notifications"
                            onClick={() => setIsOpen(false)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                        >
                            সকল নোটিফিকেশন দেখুন
                            <ExternalLink className="w-3 h-3" />
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
