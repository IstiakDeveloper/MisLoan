import { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import {
    ArrowLeft,
    CheckCircle2,
    Clock,
    CreditCard,
    ExternalLink,
    FileText,
    Image as ImageIcon,
    Receipt,
    ShieldAlert,
    User,
    X,
    XCircle,
} from 'lucide-react';

interface FineDetail {
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
    status: 'pending_payment' | 'pending_review' | 'approved' | 'rejected' | 'resolved';
    is_user_blocked: boolean;
    admin_note: string | null;
    created_at: string;
    user?: {
        id: number;
        name: string;
        username: string;
        branch?: {
            id?: number;
            name?: string;
            code?: string;
            branch_name?: string;
            branch_code?: string;
        } | null;
    } | null;
    creator?: {
        id: number;
        name: string;
    } | null;
    resolver?: {
        id: number;
        name: string;
    } | null;
}

interface Props {
    fine: FineDetail;
    bkash: {
        number: string;
        type: string;
        account_name: string;
    };
    isHeadOffice: boolean;
}

export default function Show({ fine, bkash, isHeadOffice }: Props) {
    const [showImageModal, setShowImageModal] = useState(false);

    const getStatusBadge = (status: FineDetail['status']) => {
        switch (status) {
            case 'pending_payment':
                return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock className="w-3.5 h-3.5" />
                        পেমেন্ট অপেক্ষমাণ
                    </span>
                );
            case 'pending_review':
                return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        <Clock className="w-3.5 h-3.5" />
                        পর্যালোচনায় অপেক্ষমাণ
                    </span>
                );
            case 'approved':
                return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        অনুমোদিত ও সংশোধিত
                    </span>
                );
            case 'resolved':
                return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        মীমাংসিত / সম্পন্ন
                    </span>
                );
            case 'rejected':
                return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                        <XCircle className="w-3.5 h-3.5" />
                        বাতিলকৃত
                    </span>
                );
            default:
                return null;
        }
    };

    return (
        <AdminLayout>
            <Head title={`আবেদন বিবরণ - ${fine.tracking_id}`} />

            <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
                {/* Back and Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
                    <div className="flex items-center gap-3">
                        <Link
                            href={isHeadOffice ? '/head-office/fines' : '/fines'}
                            className="inline-flex items-center justify-center p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-mono">
                                    {fine.tracking_id}
                                </h1>
                                {getStatusBadge(fine.status)}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                                আবেদনের তারিখ: {new Date(fine.created_at).toLocaleString('bn-BD', { dateStyle: 'long', timeStyle: 'short' })}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {isHeadOffice && (
                            <Link
                                href="/head-office/fines"
                                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
                            >
                                হেড অফিস তালিকায় ফিরুন
                            </Link>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left 2 Cols: Mistake & Correction info */}
                    <div className="md:col-span-2 space-y-6">
                        {/* Mistake Details Card */}
                        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-4">
                            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-blue-600" />
                                ভুল ও সংশোধনের তথ্য
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <span className="text-xs text-slate-400 font-semibold block">বিষয় / ক্যাটাগরি</span>
                                    <p className="text-base font-semibold text-slate-900 mt-0.5">
                                        {fine.category || 'সাধারণ ভুল'}
                                    </p>
                                </div>

                                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60">
                                    <span className="text-xs text-red-600 font-bold block mb-1">
                                        কি কি ভুল হয়েছে (Mistake Details):
                                    </span>
                                    <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                                        {fine.mistake_details}
                                    </p>
                                </div>

                                {fine.correction_details && (
                                    <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/60">
                                        <span className="text-xs text-emerald-800 font-bold block mb-1">
                                            কি কি ঠিক করতে হবে (Required Correction):
                                        </span>
                                        <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                                            {fine.correction_details}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Admin / Resolution Note */}
                        {fine.admin_note && (
                            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-2">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    হেড অফিস / অ্যাডমিন নোট
                                </h3>
                                <p className="text-sm text-slate-800 bg-slate-50 p-4 rounded-xl border border-slate-200/60 whitespace-pre-wrap">
                                    {fine.admin_note}
                                </p>
                                {fine.resolver && (
                                    <p className="text-xs text-slate-400 text-right">
                                        যাচাইকারী: <strong className="text-slate-600">{fine.resolver.name}</strong>
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right Col: Payment & Status Summary */}
                    <div className="space-y-6">
                        {/* Payment Card */}
                        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-4">
                            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                                <CreditCard className="w-4 h-4 text-pink-600" />
                                বিকাশ পেমেন্ট তথ্য
                            </h2>

                            <div className="space-y-3">
                                <div>
                                    <span className="text-xs text-slate-400 block">জরিমানার পরিমাণ</span>
                                    <span className="text-2xl font-black text-slate-900">
                                        ৳ {Number(fine.fine_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>

                                <div className="border-t border-slate-100 pt-3 space-y-2">
                                    <div>
                                        <span className="text-xs text-slate-400 block">প্রেরক বিকাশ নম্বর</span>
                                        <span className="text-sm font-mono font-bold text-slate-900">
                                            {fine.payment_phone || 'N/A'}
                                        </span>
                                    </div>

                                    <div>
                                        <span className="text-xs text-slate-400 block">বিকাশ TrxID</span>
                                        <span className="text-sm font-mono font-bold text-pink-700 bg-pink-50 px-2 py-0.5 rounded-md inline-block">
                                            {fine.transaction_id || 'N/A'}
                                        </span>
                                    </div>
                                </div>

                                {/* Screenshot Thumbnail */}
                                {fine.screenshot_url && (
                                    <div className="border-t border-slate-100 pt-3">
                                        <span className="text-xs text-slate-400 block mb-2 font-semibold">
                                            পেমেন্ট স্লিপের স্ক্রিনশট
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setShowImageModal(true)}
                                            className="group relative block w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-50 hover:opacity-95 transition-all"
                                        >
                                            <img
                                                src={fine.screenshot_url}
                                                alt="Payment Slip"
                                                className="w-full h-36 object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-semibold gap-1.5">
                                                <ImageIcon className="w-4 h-4" />
                                                বড় করে দেখুন
                                            </div>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* User & Creator info (if Head office viewing) */}
                        {isHeadOffice && fine.user && (
                            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-3">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5" />
                                    সংশ্লিষ্ট ব্যবহারকারী
                                </h3>
                                <div className="space-y-1">
                                    <p className="text-sm font-bold text-slate-900">{fine.user.name}</p>
                                    <p className="text-xs text-slate-500 font-mono">@{fine.user.username}</p>
                                    {fine.user.branch && (
                                        <p className="text-xs text-slate-600 mt-1">
                                            শাখা: {fine.user.branch.name || fine.user.branch.branch_name} {fine.user.branch.code || fine.user.branch.branch_code ? `(${fine.user.branch.code || fine.user.branch.branch_code})` : ''}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Screenshot Full Image Modal */}
                {showImageModal && fine.screenshot_url && (
                    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="relative max-w-3xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col">
                            <div className="flex items-center justify-between p-4 border-b border-slate-100">
                                <span className="text-sm font-bold text-slate-800">
                                    পেমেন্ট স্লিপ - {fine.tracking_id}
                                </span>
                                <button
                                    onClick={() => setShowImageModal(false)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-4 overflow-auto max-h-[80vh] flex items-center justify-center bg-slate-900/5">
                                <img
                                    src={fine.screenshot_url}
                                    alt="Payment Slip Full"
                                    className="max-h-[75vh] w-auto object-contain rounded-lg shadow-sm"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
