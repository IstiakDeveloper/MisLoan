import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { formatDateTime } from '@/utils/dateUtils';
import { Bell, ArrowLeft, ExternalLink, Calendar, FileText } from 'lucide-react';

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
    notification: NotificationItem;
}

export default function Show({ notification }: Props) {
    const formatDate = (dateString: string) => formatDateTime(dateString);

    return (
        <AdminLayout>
            <Head title={notification.title} />

            <div className="max-w-3xl mx-auto space-y-6 pb-12">
                {/* Navigation Back */}
                <div className="flex items-center justify-between">
                    <Link
                        href="/notifications"
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        সকল নোটিফিকেশনে ফিরে যান
                    </Link>
                </div>

                {/* Detail Card */}
                <div className="bg-white rounded-2xl shadow-xs border border-slate-100 p-6 md:p-8 space-y-6">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                            <FileText className="w-6 h-6 stroke-[1.75]" />
                        </div>

                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>{formatDate(notification.created_at)}</span>
                            </div>
                            <h1 className="text-lg font-extrabold text-slate-800 leading-snug">
                                {notification.title}
                            </h1>
                        </div>
                    </div>

                    <div className="border-t border-b border-slate-100 py-5">
                        <p className="text-sm text-slate-700 leading-relaxed font-normal">
                            {notification.message}
                        </p>
                    </div>

                    {/* Key Details if available */}
                    {notification.data?.details && Object.keys(notification.data.details).length > 0 && (
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-3">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                আবেদনের বিস্তারিত তথ্য
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                {Object.entries(notification.data.details).map(([key, val]) => (
                                    <div key={key} className="bg-white p-3 rounded-xl border border-slate-100 shadow-2xs">
                                        <span className="text-slate-400 font-medium block text-[11px]">
                                            {key}
                                        </span>
                                        <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                                            {val}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {notification.action_url && (
                        <div className="pt-2 flex justify-end">
                            <Link
                                href={notification.action_url}
                                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all transform hover:scale-[1.02]"
                            >
                                সংশ্লিষ্ট আবেদন খুলুন
                                <ExternalLink className="w-4 h-4" />
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
