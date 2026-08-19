import React from 'react';
import {
    Send,
    AlertCircle,
    Calendar,
    ArrowRight,
    Clock,
    X,
    Users,
    FileCheck2,
    ShieldAlert,
} from 'lucide-react';

export interface HoAdmissionItem {
    id: number;
    application_no: string;
    applicant_name?: string;
    branch_name?: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isLoading?: boolean;
    items: HoAdmissionItem[];
}

export default function SendAdmissionToHoModal({
    isOpen,
    onClose,
    onConfirm,
    isLoading = false,
    items,
}: Props) {
    if (!isOpen) return null;

    const count = items.length;
    const today = new Date();
    const formattedToday = today.toLocaleDateString('bn-BD', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const formattedTomorrow = tomorrow.toLocaleDateString('bn-BD', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 duration-200">
                {/* 1. Modal Header */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3.5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-xs shrink-0">
                            <Send className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                                সদস্য ভর্তি হেড অফিসে প্রেরণ নিশ্চিতকরণ
                            </h3>
                            <p className="text-xs text-slate-500 font-medium">
                                হেড অফিস অনুমোদন ও ঋণ আবেদন সমন্বয় যাচাই
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* 2. Core Business Rule Warning Box */}
                <div className="p-4 bg-amber-50/90 border border-amber-200/90 rounded-2xl space-y-2 text-amber-950 shadow-2xs">
                    <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase tracking-wide">
                        <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
                        <span>জরুরি জ্ঞাতব্য ও ব্যবসায়িক নিয়মাবলী</span>
                    </div>
                    <p className="text-xs leading-relaxed font-semibold text-amber-900">
                        আজকের তারিখে অনুমোদনের জন্য প্রেরিত সদস্য ভর্তির আবেদনগুলোর ভিত্তিতে <span className="underline decoration-amber-500 font-bold">আগামী কার্যদিবসে (আগামীকাল)</span> তাদের ঋণ আবেদন কার্যক্রম পরিচালিত হবে।
                    </p>
                    <div className="pt-1.5 border-t border-amber-200/60 flex items-center gap-2 text-[11px] text-amber-800 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>আজকের ভর্তি প্রেরণ (<strong className="font-bold">{formattedToday}</strong>)</span>
                        <ArrowRight className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>আগামীকাল ঋণ কার্যকর (<strong className="font-bold">{formattedTomorrow}</strong>)</span>
                    </div>
                </div>

                {/* 3. Selected Items Preview Summary */}
                <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                        <span className="flex items-center gap-1.5">
                            <FileCheck2 className="w-4 h-4 text-purple-600" />
                            <span>নির্বাচিত আবেদনসমূহ:</span>
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold text-[11px]">
                            {count} টি আবেদন
                        </span>
                    </div>

                    {/* Scrollable list of items */}
                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 mt-2">
                        {items.map((item, idx) => (
                            <div
                                key={item.id || idx}
                                className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/90 text-xs shadow-2xs"
                            >
                                <div className="min-w-0 pr-2">
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-[10px] border border-blue-100">
                                            {item.application_no}
                                        </span>
                                        <span className="font-bold text-slate-800 truncate">
                                            {item.applicant_name || 'সদস্য আবেদন'}
                                        </span>
                                    </div>
                                </div>
                                {item.branch_name && (
                                    <span className="text-[10px] text-slate-500 font-medium shrink-0">
                                        {item.branch_name}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* 4. Question & Confirmation */}
                <p className="text-xs text-slate-600 font-medium text-center">
                    আপনি কি নিশ্চিত যে এই আবেদনগুলো আগামীকালের ঋণের সাপেক্ষে আজই হেড অফিসে পাঠাতে চান?
                </p>

                {/* 5. Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition"
                    >
                        বাতিল / পরে পাঠাবো
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-purple-600 rounded-xl hover:bg-purple-700 shadow-md shadow-purple-500/20 transition active:scale-95 disabled:opacity-50"
                    >
                        <Send className="w-3.5 h-3.5" />
                        <span>{isLoading ? 'পাঠানো হচ্ছে...' : 'হ্যাঁ, হেড অফিসে পাঠান'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
