import { Link, router, usePage } from '@inertiajs/react';
import { Bell, CheckCheck, ExternalLink, FileText, Info } from 'lucide-react';
import React, { useEffect, useId, useRef, useState } from 'react';

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
    const { notifications = [], unreadNotificationsCount = 0 } =
        usePage<PageProps>().props;
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelId = useId();

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        function handleEscape(event: KeyboardEvent) {
            if (
                event.key === 'Escape' &&
                dropdownRef.current?.contains(document.activeElement)
            ) {
                setIsOpen(false);
                triggerRef.current?.focus();
            }
        }
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, []);

    const handleMarkAsRead = (
        e: React.MouseEvent,
        notification: NotificationItem,
    ) => {
        e.preventDefault();
        e.stopPropagation();

        if (!notification.is_read) {
            router.patch(
                `/notifications/${notification.id}/read`,
                {},
                {
                    preserveScroll: true,
                    preserveState: true,
                },
            );
        }

        setIsOpen(false);

        if (notification.action_url) {
            router.visit(notification.action_url);
        }
    };

    const handleMarkAllRead = (e: React.MouseEvent) => {
        e.preventDefault();
        router.post(
            '/notifications/mark-all-read',
            {},
            {
                preserveScroll: true,
                preserveState: true,
            },
        );
    };

    const formatTimeAgo = (dateString: string) => {
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffInSeconds = Math.floor(
                (now.getTime() - date.getTime()) / 1000,
            );

            if (diffInSeconds < 60) return 'মাত্র এখন';
            if (diffInSeconds < 3600)
                return `${Math.floor(diffInSeconds / 60)} মি. আগে`;
            if (diffInSeconds < 86400)
                return `${Math.floor(diffInSeconds / 3600)} ঘণ্টা আগে`;
            return `${Math.floor(diffInSeconds / 86400)} দিন আগে`;
        } catch {
            return '';
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`relative flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 ${
                    isOpen
                        ? 'bg-brand-soft text-brand-dark shadow-sm'
                        : 'bg-slate-100/90 text-slate-700 hover:bg-brand-softer hover:text-brand'
                }`}
                title="Notifications"
                aria-label="Notifications"
                aria-expanded={isOpen}
                aria-controls={isOpen ? panelId : undefined}
            >
                <Bell className="h-4.5 w-4.5 stroke-[1.75]" />
                {unreadNotificationsCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] animate-pulse items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-extrabold text-white shadow-xs">
                        {unreadNotificationsCount > 99
                            ? '99+'
                            : unreadNotificationsCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div
                    id={panelId}
                    role="region"
                    aria-label="Notifications"
                    className="fixed top-16 right-4 z-50 mt-2 w-[calc(100vw-2rem)] max-w-sm animate-in overflow-hidden rounded-2xl border border-slate-100/90 bg-white shadow-2xl duration-150 fade-in slide-in-from-top-2 sm:absolute sm:top-full sm:right-0 sm:w-96"
                >
                    <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/90 px-3.5 py-2.5">
                        <div className="flex items-center gap-2">
                            <Bell className="h-4 w-4 text-brand" />
                            <h3 className="text-xs font-bold text-slate-800">
                                নোটিফিকেশন
                            </h3>
                            {unreadNotificationsCount > 0 && (
                                <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-bold text-brand-dark">
                                    {unreadNotificationsCount} নতুন
                                </span>
                            )}
                        </div>
                        {unreadNotificationsCount > 0 && (
                            <button
                                type="button"
                                onClick={handleMarkAllRead}
                                className="flex items-center gap-1 text-[11px] font-bold text-brand transition-colors hover:text-brand-dark hover:underline"
                            >
                                <CheckCheck className="h-3.5 w-3.5" />
                                সব পঠিত করুন
                            </button>
                        )}
                    </div>

                    <div className="max-h-[380px] divide-y divide-slate-50 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="py-8 text-center text-slate-400">
                                <Info className="mx-auto mb-2 h-8 w-8 opacity-50" />
                                <p className="text-xs font-medium">
                                    কোনো নোটিফিকেশন নেই
                                </p>
                            </div>
                        ) : (
                            notifications.map((item) => (
                                <div
                                    key={item.id}
                                    onClick={(e) => handleMarkAsRead(e, item)}
                                    className={`group flex cursor-pointer items-start gap-3 p-3.5 transition-all duration-150 ${
                                        !item.is_read
                                            ? 'bg-brand-softer/80 font-semibold hover:bg-brand-softer'
                                            : 'opacity-90 hover:bg-slate-50'
                                    }`}
                                >
                                    <div className="mt-0.5 flex-shrink-0">
                                        <div
                                            className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                                                !item.is_read
                                                    ? 'bg-brand-soft text-brand-dark'
                                                    : 'bg-slate-100 text-slate-500'
                                            }`}
                                        >
                                            {item.type ===
                                            'member_admission' ? (
                                                <FileText className="h-4 w-4 stroke-[1.75]" />
                                            ) : (
                                                <Bell className="h-4 w-4 stroke-[1.75]" />
                                            )}
                                        </div>
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="mb-1 flex items-center justify-between gap-1">
                                            <h4 className="truncate text-[12px] font-bold text-slate-800 transition-colors group-hover:text-brand">
                                                {item.title}
                                            </h4>
                                            <span className="text-[10px] font-medium whitespace-nowrap text-slate-400">
                                                {formatTimeAgo(item.created_at)}
                                            </span>
                                        </div>
                                        <p className="line-clamp-2 text-[11px] leading-relaxed font-normal text-slate-600">
                                            {item.message}
                                        </p>
                                    </div>

                                    {!item.is_read && (
                                        <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-brand" />
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    <div className="border-t border-slate-100 bg-slate-50/80 p-2.5 text-center">
                        <Link
                            href="/notifications"
                            onClick={() => setIsOpen(false)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-brand transition-colors hover:text-brand-dark"
                        >
                            সকল নোটিফিকেশন দেখুন
                            <ExternalLink className="h-3 w-3" />
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
