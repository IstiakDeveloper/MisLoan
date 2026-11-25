import { Head, Link } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import {
    AlertCircle,
    CheckCircle2,
    Clock,
    CreditCard,
    ExternalLink,
    FileText,
    Gift,
    Plus,
    Receipt,
    ShieldAlert,
    XCircle,
} from 'lucide-react';

interface FineItem {
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
    resolver?: {
        id: number;
        name: string;
    } | null;
    waiver?: {
        id: number;
        name: string;
    } | null;
}

interface Props {
    fines: {
        data: FineItem[];
        links: Array<{ url: string | null; label: string; active: boolean }>;
        current_page: number;
        last_page: number;
        total: number;
    };
    stats: {
        total: number;
        pending: number;
        approved: number;
        resolved: number;
    };
    bkash: {
        number: string;
        type: string;
        account_name: string;
    };
}

export default function Index({ fines, stats }: Props) {
    const getStatusBadge = (status: FineItem['status']) => {
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
                        অনুমোদিত ও সংশোধিত
                    </span>
                );
            case 'resolved':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        মীমাংসিত / সম্পন্ন
                    </span>
                );
            case 'waived':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                        <Gift className="w-3.5 h-3.5" />
                        মওকুফকৃত (Waived)
                    </span>
                );
            case 'rejected':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
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
            <Head title="আমার জরিমানা ও ভুল সংশোধনের ইতিহাস" />

            <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                            <Receipt className="w-7 h-7 text-blue-600" />
                            ভুল সংশোধন ও জরিমানা হিস্ট্রি
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">
                            আপনার কাজের ভুল সংশোধনের জন্য প্রেরিত আবেদন এবং জরিমানার স্ট্যাটাস এখানে দেখতে পাবেন।
                        </p>
                    </div>

                    <Link
                        href="/fines/create"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 hover:shadow-lg transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        নতুন ভুল সংশোধন আবেদন
                    </Link>
                </div>

                {/* Metric Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-xs font-semibold text-slate-400 block uppercase">
                                সর্বমোট আবেদন
                            </span>
                            <span className="text-xl font-bold text-slate-800">{stats.total}</span>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-xs font-semibold text-slate-400 block uppercase">
                                অপেক্ষমাণ
                            </span>
                            <span className="text-xl font-bold text-blue-600">{stats.pending}</span>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-xs font-semibold text-slate-400 block uppercase">
                                অনুমোদিত
                            </span>
                            <span className="text-xl font-bold text-emerald-600">{stats.approved}</span>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                            <CreditCard className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-xs font-semibold text-slate-400 block uppercase">
                                মীমাংসিত
                            </span>
                            <span className="text-xl font-bold text-teal-600">{stats.resolved}</span>
                        </div>
                    </div>
                </div>

                {/* Fines Table */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/75 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                                    <th className="py-3.5 px-4">ট্র্যাকিং কোড ও ধরণ</th>
                                    <th className="py-3.5 px-4">বিষয় ও ভুলের বিবরণ</th>
                                    <th className="py-3.5 px-4">জরিমানা (টাকা)</th>
                                    <th className="py-3.5 px-4">বিকাশ পেমেন্ট তথ্য</th>
                                    <th className="py-3.5 px-4">স্ট্যাটাস</th>
                                    <th className="py-3.5 px-4 text-right">অ্যাকশন</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                {fines.data.length > 0 ? (
                                    fines.data.map((fine) => (
                                        <tr key={fine.id} className="hover:bg-slate-50/60 transition-colors">
                                            {/* Tracking & Type */}
                                            <td className="py-3.5 px-4">
                                                <span className="font-mono font-bold text-slate-900 block">
                                                    {fine.tracking_id}
                                                </span>
                                                <span
                                                    className={`inline-block text-[11px] font-semibold rounded-md px-1.5 py-0.5 mt-0.5 ${
                                                        fine.type === 'head_office_penalty'
                                                            ? 'bg-rose-100 text-rose-800'
                                                            : 'bg-slate-100 text-slate-600'
                                                    }`}
                                                >
                                                    {fine.type === 'head_office_penalty'
                                                        ? 'হেড অফিস জরিমানা'
                                                        : 'সেলফ কারেকশন'}
                                                </span>
                                            </td>

                                            {/* Details */}
                                            <td className="py-3.5 px-4 max-w-xs">
                                                <span className="font-semibold text-slate-900 block truncate">
                                                    {fine.category || 'সাধারণ ভুল'}
                                                </span>
                                                <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                                                    {fine.mistake_details}
                                                </p>
                                            </td>

                                            {/* Fine Amount */}
                                            <td className="py-3.5 px-4 font-bold text-slate-900">
                                                ৳ {Number(fine.fine_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </td>

                                            {/* Payment Info */}
                                            <td className="py-3.5 px-4">
                                                {fine.payment_phone ? (
                                                    <div>
                                                        <span className="font-mono text-xs text-slate-800 block">
                                                            {fine.payment_phone}
                                                        </span>
                                                        <span className="font-mono text-[11px] font-semibold text-pink-700 block">
                                                            TrxID: {fine.transaction_id || 'N/A'}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-400 italic">পেমেন্ট অমীমাংসিত</span>
                                                )}
                                            </td>

                                            {/* Status Badge */}
                                            <td className="py-3.5 px-4">
                                                {getStatusBadge(fine.status)}
                                            </td>

                                            {/* Action Button */}
                                            <td className="py-3.5 px-4 text-right">
                                                <Link
                                                    href={`/fines/${fine.id}`}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                                                >
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                    বিস্তারিত
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="py-12 text-center text-slate-400">
                                            <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                                            <p className="text-sm">কোনো জরিমানা বা ভুল সংশোধনের আবেদন পাওয়া যায়নি।</p>
                                            <Link
                                                href="/fines/create"
                                                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline mt-2"
                                            >
                                                + নতুন আবেদন করুন
                                            </Link>
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
            </div>
        </AdminLayout>
    );
}
