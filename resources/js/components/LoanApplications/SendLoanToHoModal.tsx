import React from 'react';
import {
    Send,
    AlertCircle,
    Calendar,
    ArrowRight,
    Clock,
    X,
    CreditCard,
    FileCheck2,
    ShieldAlert,
} from 'lucide-react';

export interface HoLoanItem {
    id: number;
    application_no: string;
    applicant_name?: string;
    branch_name?: string;
    amount?: number | null;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isLoading?: boolean;
    items: HoLoanItem[];
}

export default function SendLoanToHoModal({
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

    const totalAmount = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

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
                                ঋণ আবেদন হেড অফিসে প্রেরণ নিশ্চিতকরণ
                            </h3>
                            <p className="text-xs text-slate-500 font-medium">
                                হেড অফিস চূড়ান্ত অনুমোদন ও বিতরণ প্রক্রিয়া
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
                        <Clock className="w-4 h-4 shrink-0 text-amber-600 stroke-[2.5]" />
                        <span>জরুরি সময়সীমা ও ব্যবসায়িক নিয়মাবলী</span>
                    </div>
                    <p className="text-xs leading-relaxed font-semibold text-amber-900">
                        ঋণ আবেদনসমূহ <span className="underline decoration-amber-500 font-bold">অবশ্যই দুপুর ২:০০ টার মধ্যে</span> হেড অফিসে পাঠাতে হবে, যাতে একই কার্যদিবসে যথাসময়ে যাচাই, অনুমোদন ও তহবিল প্রস্তুতি সম্পন্ন করা যায়।
                    </p>
                    <div className="pt-1.5 border-t border-amber-200/60 flex items-center justify-between text-[11px] text-amber-800 font-medium">
                        <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>প্রেরণের তারিখ: <strong className="font-bold">{formattedToday}</strong></span>
                        </div>
                        <span className="font-bold text-amber-900 bg-amber-200/70 px-2 py-0.5 rounded">
                            সময়সীমা: ২:০০ PM
                        </span>
                    </div>
                </div>

                {/* 3. Selected Items Preview Summary */}
                <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                        <span className="flex items-center gap-1.5">
                            <FileCheck2 className="w-4 h-4 text-purple-600" />
                            <span>নির্বাচিত ঋণ আবেদনসমূহ:</span>
                        </span>
                        <div className="flex items-center gap-2">
                            {totalAmount > 0 && (
                                <span className="text-xs font-black text-slate-800">
                                    মোট: ৳ {totalAmount.toLocaleString()}
                                </span>
                            )}
                            <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold text-[11px]">
                                {count} টি
                            </span>
                        </div>
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
                                            {item.applicant_name || 'ঋণ আবেদন'}
                                        </span>
                                    </div>
                                    {item.branch_name && (
                                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                                            {item.branch_name}
                                        </p>
                                    )}
                                </div>
                                {item.amount && (
                                    <span className="text-xs font-bold text-slate-800 shrink-0">
                                        ৳ {Number(item.amount).toLocaleString()}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* 4. Question & Confirmation */}
                <p className="text-xs text-slate-600 font-medium text-center">
                    আপনি কি নিশ্চিত যে এই আবেদনগুলো চূড়ান্ত অনুমোদনের জন্য আজই হেড অফিসে পাঠাতে চান?
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
